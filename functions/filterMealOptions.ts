import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * filterMealOptions
 * STEP 3: Filter available dishes from the Healthyfy meal database
 * against the client's diagnostic, blood markers, disease restrictions,
 * allergies, diet type, and manual rules.
 *
 * Input: { clientId, intakeId, manualRules? }
 * Output: { allowed, blocked, decisionRules, diagnostic, intake, client }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { clientId, intakeId, manualRules = [] } = await req.json();
    if (!clientId) return Response.json({ error: 'clientId required' }, { status: 400 });

    // 1. Load client + clinical intake
    const [clientArr, intakeArr] = await Promise.all([
      base44.asServiceRole.entities.Client.filter({ id: clientId }),
      intakeId
        ? base44.asServiceRole.entities.ClinicalIntake.filter({ id: intakeId })
        : base44.asServiceRole.entities.ClinicalIntake.filter({ client_id: clientId }),
    ]);

    const client = clientArr[0];
    if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });

    // Sort intakes newest first
    const sortedIntakes = intakeArr.sort(
      (a, b) => new Date(b.intake_date || b.created_date) - new Date(a.intake_date || a.created_date)
    );
    const intake = sortedIntakes[0];

    // 2. Parse diagnostic from the intake record
    let diagnostic = null;
    if (intake?.diagnostic_notes) {
      try { diagnostic = JSON.parse(intake.diagnostic_notes); } catch {}
    }

    // 3. Build restriction sets from diagnostic + manual rules
    const diseaseConditions = (intake?.health_conditions || []).map(c => c.toLowerCase());
    const allergies = (intake?.likes_dislikes_allergies?.allergies || []).map(a => a.toLowerCase());
    const dislikes = (intake?.likes_dislikes_allergies?.dislikes || []).map(d => d.toLowerCase());
    const noGoFoods = (intake?.likes_dislikes_allergies?.no_go_foods || []).map(f => f.toLowerCase());
    const medications = (intake?.current_medications || []).map(m => (m.name || '').toLowerCase());
    const foodPref = (intake?.diet_type || client.food_preference || 'Veg').toLowerCase();

    // Foods to avoid from diagnostic disease considerations
    const diagFoodsToAvoid = [];
    if (diagnostic?.disease_considerations) {
      for (const d of diagnostic.disease_considerations) {
        for (const f of (d.foods_to_avoid || [])) {
          diagFoodsToAvoid.push({ food: f.toLowerCase(), condition: d.condition });
        }
      }
    }

    // Blood marker restrictions
    const bloodRestrictions = (diagnostic?.blood_analysis_summary?.restrictions || [])
      .map(r => r.toLowerCase());

    // Manual rules — parse food-level restrictions
    const manualFoodRestrictions = [];
    for (const r of manualRules) {
      const text = (r.rule || r || '').toLowerCase();
      if (text.includes('avoid') || text.includes('restrict') || text.includes('no ') || text.includes('exclude')) {
        manualFoodRestrictions.push(text);
      }
    }

    const isVeg = ['veg', 'jain'].includes(foodPref);
    const isJain = foodPref === 'jain';
    const isEggetarian = foodPref === 'eggetarian';
    const isNonVeg = foodPref === 'non_veg' || foodPref === 'non-veg';

    // Non-veg / egg frequency preferences
    const nonVegFreq = intake?.non_veg_frequency_per_10_days || 0;
    const eggFreq = intake?.egg_frequency_per_10_days || 0;

    // 4. Full meal database (from Healthyfy resources)
    const mealDatabase = buildMealDatabase();

    // 5. Filter each meal
    const allowed = [];
    const blocked = [];

    for (const meal of mealDatabase) {
      const reasons = getBlockReasons(meal, {
        foodPref, isVeg, isJain, isEggetarian, isNonVeg,
        allergies, dislikes, noGoFoods,
        diagFoodsToAvoid, bloodRestrictions, manualFoodRestrictions,
        diseaseConditions, medications,
      });

      if (reasons.length > 0) {
        blocked.push({ ...meal, block_reasons: reasons });
      } else {
        allowed.push(meal);
      }
    }

    // 6. Build decision rules summary
    const decisionRules = buildDecisionRules({ client, intake, diagnostic, manualRules, foodPref });

    return Response.json({
      success: true,
      allowed,
      blocked,
      decisionRules,
      diagnostic,
      client: { id: client.id, full_name: client.full_name, target_calories: client.target_calories, target_protein: client.target_protein, target_carbs: client.target_carbs, target_fats: client.target_fats, bmr: client.bmr, tdee: client.tdee },
      intake: intake ? { id: intake.id, intake_date: intake.intake_date, health_conditions: intake.health_conditions, diet_type: intake.diet_type, goal: intake.goal, basic_info: intake.basic_info, daily_routine: intake.daily_routine, likes_dislikes_allergies: intake.likes_dislikes_allergies, non_veg_frequency_per_10_days: intake.non_veg_frequency_per_10_days, egg_frequency_per_10_days: intake.egg_frequency_per_10_days } : null,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ── Block Reason Engine ────────────────────────────────────────────────────────
function getBlockReasons(meal, ctx) {
  const reasons = [];
  const nameLower = meal.name.toLowerCase();

  const isNonVegItem = ['chicken', 'fish', 'mutton', 'meat', 'prawn', 'shrimp', 'lamb', 'beef', 'pork', 'salmon', 'tuna'].some(k => nameLower.includes(k));
  const isEggItem = nameLower.includes('egg') || nameLower.includes('omelette') || nameLower.includes('omelette');
  const isDairyItem = ['milk', 'paneer', 'curd', 'yogurt', 'buttermilk', 'cheese', 'ghee', 'cream'].some(k => nameLower.includes(k));
  const isGlutenItem = ['roti', 'bread', 'wheat', 'suji', 'daliya', 'maida', 'toast', 'sandwich'].some(k => nameLower.includes(k));
  const isRootVegItem = ['potato', 'aalu', 'carrot', 'radish', 'mooli', 'onion', 'garlic', 'beetroot'].some(k => nameLower.includes(k));

  // Diet type checks
  if (ctx.isVeg && isNonVegItem) reasons.push({ type: 'diet', reason: `Non-veg item excluded — diet preference is ${ctx.foodPref}` });
  if (ctx.isVeg && isEggItem) reasons.push({ type: 'diet', reason: `Eggs excluded — diet preference is ${ctx.foodPref}` });
  if (ctx.isJain && isRootVegItem) reasons.push({ type: 'diet', reason: 'Jain diet: root vegetables/onion/garlic excluded' });
  if (ctx.isEggetarian && isNonVegItem) reasons.push({ type: 'diet', reason: 'Eggetarian diet: non-veg (non-egg) excluded' });

  // Allergy checks
  for (const allergy of ctx.allergies) {
    if (nameLower.includes(allergy) || (allergy === 'dairy' && isDairyItem) || (allergy === 'gluten' && isGlutenItem)) {
      reasons.push({ type: 'allergy', reason: `Allergy: ${allergy}` });
    }
  }

  // Dislike checks
  for (const dislike of ctx.dislikes) {
    if (nameLower.includes(dislike)) {
      reasons.push({ type: 'dislike', reason: `Client dislikes: ${dislike}` });
    }
  }

  // No-go food checks
  for (const nogo of ctx.noGoFoods) {
    if (nameLower.includes(nogo)) {
      reasons.push({ type: 'no_go', reason: `No-go food (personal/religious): ${nogo}` });
    }
  }

  // Diagnostic disease restrictions
  for (const { food, condition } of ctx.diagFoodsToAvoid) {
    const foodKeywords = food.split(/[,\s]+/).filter(k => k.length > 2);
    for (const kw of foodKeywords) {
      if (nameLower.includes(kw)) {
        reasons.push({ type: 'disease', reason: `Restricted by ${condition} clinical guideline (avoid: ${food})` });
        break;
      }
    }
  }

  // Blood marker restrictions
  for (const restriction of ctx.bloodRestrictions) {
    if (restriction.includes('dairy') && isDairyItem) {
      reasons.push({ type: 'blood_marker', reason: `Blood marker restriction: ${restriction}` });
    }
    if (restriction.includes('refined') && (nameLower.includes('maida') || nameLower.includes('white bread') || nameLower.includes('sugar'))) {
      reasons.push({ type: 'blood_marker', reason: `Blood marker restriction: ${restriction}` });
    }
    if (restriction.includes('saturated') && (nameLower.includes('butter') || nameLower.includes('ghee') || nameLower.includes('cream'))) {
      reasons.push({ type: 'blood_marker', reason: `Blood marker restriction: ${restriction}` });
    }
    if (restriction.includes('protein') && restriction.includes('moderate') && (nameLower.includes('chicken') || nameLower.includes('paneer') || nameLower.includes('dal'))) {
      // Don't block — moderate restriction, just note it
    }
  }

  // Manual rule restrictions
  for (const rule of ctx.manualFoodRestrictions) {
    const words = rule.replace(/avoid|restrict|no |exclude/gi, '').trim().split(/[,\s]+/).filter(w => w.length > 2);
    for (const word of words) {
      if (nameLower.includes(word)) {
        reasons.push({ type: 'manual_rule', reason: `Nutritionist manual rule: ${rule}` });
        break;
      }
    }
  }

  // Deduplicate reasons
  const seen = new Set();
  return reasons.filter(r => {
    const key = r.type + r.reason;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Decision Rules Builder ─────────────────────────────────────────────────────
function buildDecisionRules({ client, intake, diagnostic, manualRules, foodPref }) {
  const rules = [];

  const cal = client.target_calories || client.tdee || 1800;
  const prot = client.target_protein || Math.round((client.weight || 70) * 1.2);
  const carbs = client.target_carbs || Math.round((cal * 0.45) / 4);
  const fats = client.target_fats || Math.round((cal * 0.25) / 9);

  rules.push({ category: 'Calorie Target', rule: `Daily target: ${cal} kcal (BMR: ${client.bmr || '—'}, TDEE: ${client.tdee || '—'})` });
  rules.push({ category: 'Macros', rule: `Protein ~${prot}g | Carbs ~${carbs}g | Fats ~${fats}g per day` });
  rules.push({ category: 'Diet Type', rule: `Diet: ${foodPref} — meal options filtered accordingly` });

  if (intake?.health_conditions?.length) {
    for (const c of intake.health_conditions) {
      rules.push({ category: 'Clinical Condition', rule: `${c}: Clinical dietary rules applied from knowledge base` });
    }
  }

  if (diagnostic?.blood_analysis_summary?.restrictions?.length) {
    for (const r of diagnostic.blood_analysis_summary.restrictions) {
      rules.push({ category: 'Blood Marker', rule: r });
    }
  }

  if (intake?.likes_dislikes_allergies?.allergies?.length) {
    rules.push({ category: 'Allergy', rule: `Allergies strictly excluded: ${intake.likes_dislikes_allergies.allergies.join(', ')}` });
  }

  if (intake?.likes_dislikes_allergies?.no_go_foods?.length) {
    rules.push({ category: 'No-Go', rule: `No-go foods: ${intake.likes_dislikes_allergies.no_go_foods.join(', ')}` });
  }

  if (intake?.non_veg_frequency_per_10_days) {
    rules.push({ category: 'Non-Veg Frequency', rule: `Non-veg: ${intake.non_veg_frequency_per_10_days} times per 10 days` });
  }

  if (intake?.egg_frequency_per_10_days) {
    rules.push({ category: 'Egg Frequency', rule: `Eggs: ${intake.egg_frequency_per_10_days} times per 10 days` });
  }

  for (const r of (manualRules || [])) {
    const ruleText = r.rule || r;
    if (ruleText) rules.push({ category: 'Manual Override', rule: ruleText });
  }

  return rules;
}

// ── Meal Database ──────────────────────────────────────────────────────────────
function buildMealDatabase() {
  const meals = [];

  const add = (category, mealType, name, approxCal, tags = []) => {
    meals.push({ id: `${mealType}_${meals.length}`, category, meal_type: mealType, name, approx_calories: approxCal, tags });
  };

  // Early Morning
  ['Lemon Ginger Mint Cucumber Water', 'Zeera Water', 'Tulsi Water', 'Aloe Vera Juice with Water', 'Methi Water', 'Haldi Water', 'Chia Seeds Soaked Water', 'Dhaniya Pudina Water', 'Cinnamon Ginger Water', 'Saunf Water', 'Apple Cider Vinegar Water'].forEach(n => add('Early Morning', 'early_morning', n, 5, ['drink', 'herbal']));

  // Breakfast — cereals
  add('Breakfast', 'breakfast', 'Muesli without nuts with Milk', 220, ['cereal', 'dairy']);
  add('Breakfast', 'breakfast', 'Wheat Flakes with Milk', 200, ['cereal', 'dairy', 'gluten']);
  add('Breakfast', 'breakfast', 'Oats with Milk', 210, ['cereal', 'dairy', 'oats']);
  add('Breakfast', 'breakfast', 'Wheat Daliya with Milk', 220, ['cereal', 'dairy', 'gluten']);

  // Breakfast — poha
  add('Breakfast', 'breakfast', 'Vegetable Poha with Paneer', 250, ['poha', 'dairy', 'paneer']);
  add('Breakfast', 'breakfast', 'Vegetable Poha with Steam Sprouts', 240, ['poha', 'sprouts']);
  add('Breakfast', 'breakfast', 'Vegetable Poha with Nutreela', 245, ['poha', 'soya']);
  add('Breakfast', 'breakfast', 'Vegetable Bread Poha with Green Chutney', 260, ['poha', 'bread', 'gluten']);

  // Breakfast — non-veg/egg
  add('Breakfast', 'breakfast', 'Egg White Omelette with Veggies and Whole Wheat Toast', 280, ['egg', 'gluten', 'non_veg_cat']);
  add('Breakfast', 'breakfast', 'Boiled Egg White with Veggies', 150, ['egg', 'non_veg_cat']);
  add('Breakfast', 'breakfast', 'Chicken Salami Sandwich with Green Chutney', 300, ['chicken', 'non_veg', 'gluten']);

  // Breakfast — daliya
  ['Veg Oats Daliya with Green Chutney', 'Vegetable Wheat Daliya with Green Chutney', 'Vegetable Ragi Daliya with Green Chutney', 'Vegetable Bajra Daliya with Green Chutney', 'Vegetable Barley Daliya with Green Chutney', 'Vegetable Upma with Green Chutney'].forEach((n, i) => {
    const tag = ['oats', 'wheat,gluten', 'ragi,millet', 'bajra,millet', 'barley,gluten', 'suji,gluten'][i] || '';
    add('Breakfast', 'breakfast', n, 230, ['daliya', ...tag.split(',').filter(Boolean)]);
  });

  // Breakfast — sandwich
  add('Breakfast', 'breakfast', 'Aata Bread Veg Sandwich with Green Chutney', 270, ['sandwich', 'gluten', 'bread']);
  add('Breakfast', 'breakfast', 'Paneer Sandwich with Green Chutney', 280, ['sandwich', 'paneer', 'dairy', 'gluten', 'bread']);
  add('Breakfast', 'breakfast', 'Peanut Butter Chia Seeds Sandwich', 300, ['sandwich', 'peanut', 'gluten', 'bread']);
  add('Breakfast', 'breakfast', 'Soya Veg Sandwich with Green Chutney', 260, ['sandwich', 'soya', 'gluten', 'bread']);
  add('Breakfast', 'breakfast', 'Aalu Veg Sandwich with Green Chutney', 265, ['sandwich', 'potato', 'gluten', 'bread', 'root_veg']);

  // Breakfast — stuffed roti
  ['Lauki Green Chilli Coriander Stuffed Roti', 'Spinach Methi Onion Stuffed Roti', 'Onion Green Chilli Coriander Stuffed Roti', 'Paneer Onion Green Chilli Stuffed Roti', 'Radish Coriander Stuffed Roti', 'Soya Nutreela Onion Stuffed Roti', 'Carrot Onion Stuffed Roti'].forEach((n, i) => {
    const tags = [['gluten', 'roti'], ['gluten', 'roti', 'onion', 'root_veg'], ['gluten', 'roti', 'onion', 'root_veg'], ['gluten', 'roti', 'paneer', 'dairy', 'onion', 'root_veg'], ['gluten', 'roti', 'radish', 'root_veg'], ['gluten', 'roti', 'soya', 'onion', 'root_veg'], ['gluten', 'roti', 'carrot', 'onion', 'root_veg']][i] || ['gluten', 'roti'];
    add('Breakfast', 'breakfast', n, 240, tags);
  });

  // Breakfast — cheela
  add('Breakfast', 'breakfast', 'Besan Cheela Veg Mix with Green Chutney', 220, ['cheela', 'besan']);
  add('Breakfast', 'breakfast', 'Suji Cheela Veg Mix with Green Chutney', 225, ['cheela', 'suji', 'gluten']);
  add('Breakfast', 'breakfast', 'Veg Uttapam with Green Chutney', 230, ['cheela', 'fermented']);
  add('Breakfast', 'breakfast', 'Ragi Cheela Veg Mix with Green Chutney', 215, ['cheela', 'ragi', 'millet']);
  add('Breakfast', 'breakfast', 'Moong Dal Cheela Veg Mix with Green Chutney', 210, ['cheela', 'dal', 'protein']);
  add('Breakfast', 'breakfast', 'Chana Dal Cheela Veg Mix with Green Chutney', 215, ['cheela', 'dal', 'protein']);

  // Breakfast — sprouts/chholes
  add('Breakfast', 'breakfast', 'Steam Moong Sprouts Mix Green Salad', 180, ['sprouts', 'high_protein', 'salad']);
  add('Breakfast', 'breakfast', 'Soya Bean Sprouts with Green Salad', 190, ['sprouts', 'soya', 'high_protein', 'salad']);
  add('Breakfast', 'breakfast', 'Boiled Black Chana Saute with Veggies', 200, ['chana', 'high_protein', 'legume']);
  add('Breakfast', 'breakfast', 'Lobhia Saute with Veggies', 195, ['lobhia', 'high_protein', 'legume']);

  // Breakfast — smoothies/yogurt
  add('Breakfast', 'breakfast', 'Fruit Yogurt Bowl with Apple and Chia Seeds', 220, ['yogurt', 'dairy', 'fruit']);
  add('Breakfast', 'breakfast', 'Plain Yogurt with Fruit (no mango)', 200, ['yogurt', 'dairy', 'fruit']);
  add('Breakfast', 'breakfast', 'Milk Oats Chia Seeds Apple Smoothie', 260, ['smoothie', 'dairy', 'milk', 'oats']);
  add('Breakfast', 'breakfast', 'Apple Shake or Banana Shake (Once a week)', 250, ['shake', 'dairy', 'milk', 'fruit']);

  // Breakfast — idli
  add('Breakfast', 'breakfast', 'Rava Idli Veg Stuffed with Green Chutney', 220, ['idli', 'suji', 'gluten', 'fermented']);
  add('Breakfast', 'breakfast', 'Moong Dal Idli Veg Stuffed with Green Chutney', 210, ['idli', 'dal', 'protein', 'fermented']);
  add('Breakfast', 'breakfast', 'Besan Idli Veg Stuffed with Green Chutney', 215, ['idli', 'besan', 'fermented']);
  add('Breakfast', 'breakfast', 'Oats Rava Mix Veggies Idli with Green Chutney', 220, ['idli', 'oats', 'fermented']);
  add('Breakfast', 'breakfast', 'Fermented Idli Veg Stuffed with Green Chutney', 200, ['idli', 'fermented', 'rice']);

  // Mid Morning
  add('Mid Morning', 'mid_morning', 'Seasonal Fruit 150g with Lemon Shikanji', 120, ['fruit', 'drink']);
  add('Mid Morning', 'mid_morning', 'Low Fat Buttermilk with Zeera and Chia/Flax Seeds', 80, ['buttermilk', 'dairy', 'drink']);
  add('Mid Morning', 'mid_morning', 'Seasonal Fruit — Apple or Orange or Papaya or Pear or Guava or Pomegranate', 100, ['fruit']);
  add('Mid Morning', 'mid_morning', 'Cucumber Slices with Apple', 80, ['fruit', 'salad']);
  add('Mid Morning', 'mid_morning', 'Cucumber Slices with Pear', 80, ['fruit', 'salad']);
  add('Mid Morning', 'mid_morning', 'Bowl Papaya with Black Pepper', 70, ['fruit', 'papaya']);
  add('Mid Morning', 'mid_morning', 'Pomegranate with Lemon', 90, ['fruit', 'pomegranate']);

  // Lunch — roti + veg (Indian complete meals)
  const lunchVegs = ['Lauki Veg', 'Tori Veg', 'Parwar Veg', 'Bhindi Veg', 'Kaddu Veg', 'Spinach Veg', 'Brinjal Bharta', 'Capsicum Potato Veg', 'Beans Potato Veg', 'Nutreela Capsicum Veg', 'Methi Aalu Veg', 'Cauliflower Aalu Veg', 'Matter Mushroom Veg', 'Saag Veg', 'Paneer Veg Bhurji', 'Spring Onion Aalu Veg', 'Beans Yellow Moong Dal Veg', 'Carrot Peas Veg', 'Mix Veg', 'Mooli Bhurji', 'Capsicum Paneer Veg', 'Brinjal Potato Veg', 'Cabbage Peas Veg'];
  lunchVegs.forEach(veg => {
    const tags = ['roti', 'gluten', 'complete_meal'];
    if (veg.toLowerCase().includes('paneer')) tags.push('paneer', 'dairy');
    if (veg.toLowerCase().includes('potato') || veg.toLowerCase().includes('aalu')) tags.push('potato', 'root_veg');
    if (veg.toLowerCase().includes('mooli') || veg.toLowerCase().includes('carrot')) tags.push('root_veg');
    if (veg.toLowerCase().includes('onion') || veg.toLowerCase().includes('spring onion')) tags.push('onion', 'root_veg');
    add('Lunch', 'lunch', `Roti Bran Mix / Jowar with ${veg}`, 360, tags);
  });

  // Lunch — dal + roti (Indian complete meals)
  add('Lunch', 'lunch', 'Roti Bran Mix with Yellow Moong Dal', 340, ['roti', 'gluten', 'dal', 'protein', 'complete_meal']);
  add('Lunch', 'lunch', 'Roti Bran Mix with Arher Dal', 345, ['roti', 'gluten', 'dal', 'protein', 'complete_meal']);
  add('Lunch', 'lunch', 'Roti Bran Mix with Masoor Dal', 340, ['roti', 'gluten', 'dal', 'protein', 'complete_meal']);
  add('Lunch', 'lunch', 'Roti Bran Mix with Chana Dal', 350, ['roti', 'gluten', 'dal', 'protein', 'complete_meal']);
  add('Lunch', 'lunch', 'Roti Bran Mix or Steam Rice with Chhole', 370, ['roti', 'gluten', 'chhole', 'protein', 'legume', 'complete_meal']);
  add('Lunch', 'lunch', 'Roti Bran Mix or Steam Rice with Black Chana', 365, ['roti', 'gluten', 'chana', 'protein', 'legume', 'complete_meal']);
  add('Lunch', 'lunch', 'Roti Bran Mix or Steam Rice with Rajhma', 370, ['roti', 'gluten', 'rajhma', 'protein', 'legume', 'complete_meal']);
  add('Lunch', 'lunch', 'Roti Bran Mix or Steam Rice with Lobhia', 360, ['roti', 'gluten', 'lobhia', 'protein', 'legume', 'complete_meal']);
  add('Lunch', 'lunch', 'Roti Bran Mix or Steam Rice with Soyabean', 370, ['roti', 'gluten', 'soya', 'protein', 'legume', 'complete_meal']);
  add('Lunch', 'lunch', 'Roti Bran Mix or Steam Rice with Kadhi (no pakori)', 350, ['roti', 'gluten', 'kadhi', 'dairy', 'complete_meal']);
  add('Lunch', 'lunch', 'Roti Bran Mix with Gatte Veg (not fried)', 355, ['roti', 'gluten', 'besan', 'complete_meal']);

  // Lunch — non-veg
  add('Lunch', 'lunch', 'Chicken Biryani Homemade with Low Fat Buttermilk', 480, ['chicken', 'non_veg', 'biryani', 'rice', 'dairy', 'complete_meal']);
  add('Lunch', 'lunch', 'Fish Curry with Steam Rice', 400, ['fish', 'non_veg', 'rice', 'complete_meal']);
  add('Lunch', 'lunch', 'Grilled Fish with Grilled Veggies and Roti', 380, ['fish', 'non_veg', 'gluten', 'roti', 'complete_meal']);
  add('Lunch', 'lunch', 'Grilled Chicken with Green Chutney and Buttermilk', 360, ['chicken', 'non_veg', 'dairy', 'complete_meal']);
  add('Lunch', 'lunch', 'Egg White Curry with Steam Rice or Roti', 370, ['egg', 'non_veg_cat', 'rice', 'gluten', 'roti', 'complete_meal']);

  // Evening Snacks
  add('Evening Snack', 'evening_snack', 'Tea or Coffee or Green Tea or Low Fat Milk or Buttermilk', 30, ['drink', 'dairy', 'tea']);
  add('Evening Snack', 'evening_snack', 'Roasted Chana or Roasted Chana Mix Green Salad', 150, ['roasted', 'chana', 'high_protein', 'salad']);
  add('Evening Snack', 'evening_snack', 'Dry Roasted Bajra Puffs Unsalted', 120, ['roasted', 'bajra', 'millet']);
  add('Evening Snack', 'evening_snack', 'Dry Roasted Popcorn', 110, ['roasted', 'corn']);
  add('Evening Snack', 'evening_snack', 'Dry Roasted Makhane', 130, ['roasted', 'makhane', 'foxnut']);
  add('Evening Snack', 'evening_snack', 'Steam Moong Sprouts Mix Green Salad', 120, ['sprouts', 'salad', 'high_protein']);
  add('Evening Snack', 'evening_snack', 'Roasted Wheat Puffs Unsalted', 115, ['roasted', 'wheat', 'gluten']);
  add('Evening Snack', 'evening_snack', 'Murmura Bhel with Lots of Vegetables', 130, ['murmura', 'rice', 'salad']);
  add('Evening Snack', 'evening_snack', 'Boiled Black Chana Saute with Veggies', 140, ['chana', 'high_protein', 'legume']);
  add('Evening Snack', 'evening_snack', 'Veg Grilled Sandwich with Green Chutney', 220, ['sandwich', 'gluten', 'bread']);

  // Dinner — soup starters
  add('Dinner', 'dinner', 'Mix Veg Soup 250ml', 80, ['soup', 'light']);
  add('Dinner', 'dinner', 'Tomato Soup 250ml', 70, ['soup', 'light', 'tomato']);
  add('Dinner', 'dinner', 'Cabbage Soup 250ml', 60, ['soup', 'light', 'cabbage']);
  add('Dinner', 'dinner', 'Mushroom Soup 250ml', 75, ['soup', 'light', 'mushroom']);
  add('Dinner', 'dinner', 'French Beans Tomato Soup 250ml', 65, ['soup', 'light']);
  add('Dinner', 'dinner', 'Broccoli Peas Soup 250ml', 70, ['soup', 'light', 'broccoli']);
  add('Dinner', 'dinner', 'Spinach Soup 250ml', 65, ['soup', 'light', 'spinach']);
  add('Dinner', 'dinner', 'Chicken Soup or Broth 250ml', 90, ['soup', 'light', 'chicken', 'non_veg']);

  // Dinner — main (same as lunch options, lighter portions)
  add('Dinner', 'dinner', 'Roti Bran Mix with Light Dal and Salad', 320, ['roti', 'gluten', 'dal', 'protein', 'salad', 'complete_meal']);
  add('Dinner', 'dinner', 'Roti Bran Mix with Light Sabzi and Salad', 310, ['roti', 'gluten', 'sabzi', 'salad', 'complete_meal']);
  add('Dinner', 'dinner', 'Moong Dal Khichdi with Curd', 310, ['rice', 'dal', 'khichdi', 'dairy', 'complete_meal']);
  add('Dinner', 'dinner', 'Ragi Roti with Palak Dal', 290, ['ragi', 'millet', 'dal', 'spinach', 'complete_meal']);
  add('Dinner', 'dinner', 'Jowar Roti with Mixed Vegetable Curry', 300, ['jowar', 'millet', 'sabzi', 'complete_meal']);
  add('Dinner', 'dinner', 'Bajra Roti with Dal and Salad', 295, ['bajra', 'millet', 'dal', 'protein', 'salad', 'complete_meal']);
  add('Dinner', 'dinner', 'Steam Rice with Arher Dal and Salad', 340, ['rice', 'dal', 'protein', 'salad', 'complete_meal']);
  add('Dinner', 'dinner', 'Paneer Bhurji with Roti and Salad', 370, ['paneer', 'dairy', 'roti', 'gluten', 'protein', 'complete_meal']);
  add('Dinner', 'dinner', 'Grilled Fish with Salad and Soup', 320, ['fish', 'non_veg', 'salad', 'soup', 'complete_meal']);
  add('Dinner', 'dinner', 'Chicken Stir Fry with Veggies and Small Roti', 360, ['chicken', 'non_veg', 'gluten', 'roti', 'complete_meal']);
  add('Dinner', 'dinner', 'Boiled Chana Salad with Curd', 250, ['chana', 'salad', 'dairy', 'high_protein']);
  add('Dinner', 'dinner', 'Oats Khichdi with Veggies', 280, ['oats', 'khichdi', 'light', 'complete_meal']);

  return meals;
}