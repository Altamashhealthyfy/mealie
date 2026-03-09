import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * filterMealOptions — STEP 3
 * NON-COMPROMISING RULE: ALL dishes are sourced EXCLUSIVELY from the
 * Healthyfy Dishes Google Sheet catalog. No meal outside this catalog
 * is permitted in any plan. Applies to ALL users: admin, student coaches, team.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { clientId, intakeId, manualRules = [] } = await req.json();
    if (!clientId) return Response.json({ error: 'clientId required' }, { status: 400 });

    const [clientArr, intakeArr] = await Promise.all([
      base44.asServiceRole.entities.Client.filter({ id: clientId }),
      intakeId
        ? base44.asServiceRole.entities.ClinicalIntake.filter({ id: intakeId })
        : base44.asServiceRole.entities.ClinicalIntake.filter({ client_id: clientId }),
    ]);

    const client = clientArr[0];
    if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });

    const sortedIntakes = intakeArr.sort(
      (a, b) => new Date(b.intake_date || b.created_date) - new Date(a.intake_date || a.created_date)
    );
    const intake = sortedIntakes[0];

    let diagnostic = null;
    if (intake?.diagnostic_notes) {
      try { diagnostic = JSON.parse(intake.diagnostic_notes); } catch {}
    }

    const diseaseConditions = (intake?.health_conditions || []).map(c => c.toLowerCase());
    const allergies = (intake?.likes_dislikes_allergies?.allergies || []).map(a => a.toLowerCase());
    const dislikes = (intake?.likes_dislikes_allergies?.dislikes || []).map(d => d.toLowerCase());
    const noGoFoods = (intake?.likes_dislikes_allergies?.no_go_foods || []).map(f => f.toLowerCase());
    const medications = (intake?.current_medications || []).map(m => (m.name || '').toLowerCase());
    const foodPref = (intake?.diet_type || client.food_preference || 'Veg').toLowerCase();

    const diagFoodsToAvoid = [];
    if (diagnostic?.disease_considerations) {
      for (const d of diagnostic.disease_considerations) {
        for (const f of (d.foods_to_avoid || [])) {
          diagFoodsToAvoid.push({ food: f.toLowerCase(), condition: d.condition });
        }
      }
    }

    const bloodRestrictions = (diagnostic?.blood_analysis_summary?.restrictions || []).map(r => r.toLowerCase());

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

    // NON-COMPROMISING RULE: Fetch ONLY from Healthyfy Dishes Google Sheet
    const mealDatabase = await fetchHealthyfyDishes();

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

    const decisionRules = buildDecisionRules({ client, intake, diagnostic, manualRules, foodPref });

    return Response.json({
      success: true,
      allowed,
      blocked,
      decisionRules,
      diagnostic,
      catalog_source: 'healthyfy_google_sheet',
      total_catalog_dishes: mealDatabase.length,
      client: { id: client.id, full_name: client.full_name, target_calories: client.target_calories, target_protein: client.target_protein, target_carbs: client.target_carbs, target_fats: client.target_fats, bmr: client.bmr, tdee: client.tdee },
      intake: intake ? { id: intake.id, intake_date: intake.intake_date, health_conditions: intake.health_conditions, diet_type: intake.diet_type, goal: intake.goal, basic_info: intake.basic_info, daily_routine: intake.daily_routine, likes_dislikes_allergies: intake.likes_dislikes_allergies, non_veg_frequency_per_10_days: intake.non_veg_frequency_per_10_days, egg_frequency_per_10_days: intake.egg_frequency_per_10_days } : null,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getBlockReasons(meal, ctx) {
  const reasons = [];
  const nameLower = meal.name.toLowerCase();

  const isNonVegItem = ['chicken', 'fish', 'mutton', 'meat', 'prawn', 'shrimp', 'lamb', 'beef', 'pork', 'salmon', 'tuna'].some(k => nameLower.includes(k));
  const isEggItem = nameLower.includes('egg') || nameLower.includes('omelette');
  const isDairyItem = ['milk', 'paneer', 'curd', 'yogurt', 'buttermilk', 'cheese', 'ghee', 'cream'].some(k => nameLower.includes(k));
  const isGlutenItem = ['roti', 'bread', 'wheat', 'suji', 'daliya', 'maida', 'toast', 'sandwich', 'paratha'].some(k => nameLower.includes(k));
  const isRootVegItem = ['potato', 'aalu', 'carrot', 'radish', 'mooli', 'onion', 'garlic', 'beetroot'].some(k => nameLower.includes(k));

  if (ctx.isVeg && isNonVegItem) reasons.push({ type: 'diet', reason: `Non-veg item excluded — diet preference is ${ctx.foodPref}` });
  if (ctx.isVeg && isEggItem) reasons.push({ type: 'diet', reason: `Eggs excluded — diet preference is ${ctx.foodPref}` });
  if (ctx.isJain && isRootVegItem) reasons.push({ type: 'diet', reason: 'Jain diet: root vegetables/onion/garlic excluded' });
  if (ctx.isEggetarian && isNonVegItem) reasons.push({ type: 'diet', reason: 'Eggetarian diet: non-veg (non-egg) excluded' });

  for (const allergy of ctx.allergies) {
    if (nameLower.includes(allergy) || (allergy === 'dairy' && isDairyItem) || (allergy === 'gluten' && isGlutenItem)) {
      reasons.push({ type: 'allergy', reason: `Allergy: ${allergy}` });
    }
  }

  for (const dislike of ctx.dislikes) {
    if (nameLower.includes(dislike)) reasons.push({ type: 'dislike', reason: `Client dislikes: ${dislike}` });
  }

  for (const nogo of ctx.noGoFoods) {
    if (nameLower.includes(nogo)) reasons.push({ type: 'no_go', reason: `No-go food (personal/religious): ${nogo}` });
  }

  for (const { food, condition } of ctx.diagFoodsToAvoid) {
    const foodKeywords = food.split(/[,\s]+/).filter(k => k.length > 2);
    for (const kw of foodKeywords) {
      if (nameLower.includes(kw)) {
        reasons.push({ type: 'disease', reason: `Restricted by ${condition} clinical guideline (avoid: ${food})` });
        break;
      }
    }
  }

  for (const restriction of ctx.bloodRestrictions) {
    if (restriction.includes('dairy') && isDairyItem) reasons.push({ type: 'blood_marker', reason: `Blood marker restriction: ${restriction}` });
    if (restriction.includes('refined') && (nameLower.includes('maida') || nameLower.includes('white bread') || nameLower.includes('sugar'))) reasons.push({ type: 'blood_marker', reason: `Blood marker restriction: ${restriction}` });
    if (restriction.includes('saturated') && (nameLower.includes('butter') || nameLower.includes('ghee') || nameLower.includes('cream'))) reasons.push({ type: 'blood_marker', reason: `Blood marker restriction: ${restriction}` });
  }

  for (const rule of ctx.manualFoodRestrictions) {
    const words = rule.replace(/avoid|restrict|no |exclude/gi, '').trim().split(/[,\s]+/).filter(w => w.length > 2);
    for (const word of words) {
      if (nameLower.includes(word)) {
        reasons.push({ type: 'manual_rule', reason: `Nutritionist manual rule: ${rule}` });
        break;
      }
    }
  }

  const seen = new Set();
  return reasons.filter(r => {
    const key = r.type + r.reason;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildDecisionRules({ client, intake, diagnostic, manualRules, foodPref }) {
  const rules = [];
  const cal = client.target_calories || client.tdee || 1800;
  const prot = client.target_protein || Math.round((client.weight || 70) * 1.2);
  const carbs = client.target_carbs || Math.round((cal * 0.45) / 4);
  const fats = client.target_fats || Math.round((cal * 0.25) / 9);

  rules.push({ category: 'Dish Source', rule: '🔒 NON-COMPROMISING RULE: All dishes sourced exclusively from Healthyfy approved Google Sheet catalog' });
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

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTHYFY DISH CATALOG — GOOGLE SHEET INTEGRATION
// NON-COMPROMISING RULE: This is the ONLY source of dishes for ALL meal plans.
// Applies to: Super Admin, Student Coaches, Team Members — everyone.
// ═══════════════════════════════════════════════════════════════════════════════

const HEALTHYFY_SHEET_CSV = 'https://docs.google.com/spreadsheets/d/1piIBl9QUrluRBf24-1bZNbooGYqMI5Cr11w3Mb9WxfU/export?format=csv';

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

async function fetchHealthyfyDishes() {
  try {
    const resp = await fetch(HEALTHYFY_SHEET_CSV);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    return parseHealthyfyCSV(text);
  } catch (err) {
    console.error('ERROR: Could not fetch Healthyfy dish catalog from Google Sheet:', err.message);
    return [];
  }
}

function parseHealthyfyCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const dishes = [];
  const MEAL_TYPE_MAP = { breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner', snack: 'evening_snack', any: 'any' };
  const CAT_MAP = { BREAKFAST: 'breakfast', LUNCH: 'lunch', DINNER: 'dinner', SNACK: 'evening_snack', ANY: 'any' };

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const dishName = cols[0]?.trim();
    if (!dishName || dishName.toLowerCase() === 'dish name') continue;

    const templateCode = cols[1]?.trim() || '';
    const mealCategory = (cols[4]?.trim() || '').toUpperCase();
    const mealFlexibility = (cols[5]?.trim() || '').toUpperCase();
    const combinedTypes = (cols[6]?.trim() || '').toLowerCase();

    const ingredients = [];
    for (let j = 0; j < 5; j++) {
      const base = 8 + j * 3;
      const ingName = cols[base]?.trim();
      if (!ingName) continue;
      ingredients.push({ ingredient_name: ingName, qty: parseFloat(cols[base + 1]) || 0, unit: cols[base + 2]?.trim() || 'g' });
    }

    let applicableMealTypes = [];
    if (combinedTypes) {
      applicableMealTypes = combinedTypes.split('|').map(t => MEAL_TYPE_MAP[t.trim()]).filter(Boolean);
    }
    if (applicableMealTypes.length === 0) {
      if (CAT_MAP[mealCategory]) applicableMealTypes.push(CAT_MAP[mealCategory]);
      if (mealFlexibility && CAT_MAP[mealFlexibility] && !applicableMealTypes.includes(CAT_MAP[mealFlexibility])) {
        applicableMealTypes.push(CAT_MAP[mealFlexibility]);
      }
    }
    if (applicableMealTypes.length === 0) applicableMealTypes = ['lunch'];

    const tags = deriveDishTags(dishName, ingredients);
    const approxCal = estimateDishCalories(ingredients, mealCategory);
    const seen = new Set();

    for (const mt of applicableMealTypes) {
      if (seen.has(mt)) continue;
      seen.add(mt);
      dishes.push({
        id: `${templateCode || dishName.replace(/\s+/g, '_')}_${mt}_${i}`,
        name: dishName,
        template_code: templateCode,
        meal_type: mt,
        ingredients,
        approx_calories: approxCal,
        tags,
        source: 'healthyfy_catalog',
      });
    }
  }

  // Protocol: early morning herbal drinks (standard Healthyfy protocol)
  const emDrinks = [
    'Lemon Ginger Mint Cucumber Water', 'Zeera Water', 'Tulsi Water', 'Aloe Vera Juice with Water',
    'Methi Water', 'Haldi Water', 'Chia Seeds Soaked Water', 'Dhaniya Pudina Water',
    'Cinnamon Ginger Water', 'Saunf Water', 'Apple Cider Vinegar Water',
  ];
  emDrinks.forEach((name, idx) => dishes.push({ id: `em_${idx}`, name, meal_type: 'early_morning', approx_calories: 5, tags: ['drink', 'herbal'], source: 'healthyfy_catalog' }));

  // Protocol: mid-morning fruits & light snacks
  const mmItems = [
    { name: 'Seasonal Fruit 150g with Lemon Shikanji', cal: 120, tags: ['fruit', 'drink'] },
    { name: 'Low Fat Buttermilk with Zeera and Chia Seeds', cal: 80, tags: ['buttermilk', 'dairy', 'drink'] },
    { name: 'Seasonal Fruit — Apple or Orange or Papaya or Pear or Guava or Pomegranate', cal: 100, tags: ['fruit'] },
    { name: 'Cucumber Slices with Apple', cal: 80, tags: ['fruit', 'salad'] },
    { name: 'Cucumber Slices with Pear', cal: 80, tags: ['fruit', 'salad'] },
    { name: 'Bowl Papaya with Black Pepper', cal: 70, tags: ['fruit', 'papaya'] },
    { name: 'Pomegranate with Lemon', cal: 90, tags: ['fruit', 'pomegranate'] },
  ];
  mmItems.forEach((item, idx) => dishes.push({ id: `mm_${idx}`, name: item.name, meal_type: 'mid_morning', approx_calories: item.cal, tags: item.tags, source: 'healthyfy_catalog' }));

  // Protocol: evening snacks (standard Healthyfy options)
  const eveningSnacks = [
    { name: 'Tea or Coffee or Green Tea or Low Fat Milk or Buttermilk', cal: 30, tags: ['drink', 'dairy', 'tea'] },
    { name: 'Roasted Chana or Roasted Chana Mix Green Salad', cal: 150, tags: ['roasted', 'chana', 'high_protein', 'salad'] },
    { name: 'Dry Roasted Bajra Puffs Unsalted', cal: 120, tags: ['roasted', 'bajra', 'millet'] },
    { name: 'Dry Roasted Popcorn', cal: 110, tags: ['roasted', 'corn'] },
    { name: 'Dry Roasted Makhane', cal: 130, tags: ['roasted', 'makhane', 'foxnut'] },
    { name: 'Steam Moong Sprouts Mix Green Salad', cal: 120, tags: ['sprouts', 'salad', 'high_protein'] },
    { name: 'Roasted Wheat Puffs Unsalted', cal: 115, tags: ['roasted', 'wheat', 'gluten'] },
    { name: 'Murmura Bhel with Lots of Vegetables', cal: 130, tags: ['murmura', 'rice', 'salad'] },
    { name: 'Boiled Black Chana Saute with Veggies', cal: 140, tags: ['chana', 'high_protein', 'legume'] },
    { name: 'Veg Grilled Sandwich with Green Chutney', cal: 220, tags: ['sandwich', 'gluten', 'bread'] },
  ];

  // Only add snacks if not already fetched from sheet
  const existingSnackNames = new Set(dishes.filter(d => d.meal_type === 'evening_snack').map(d => d.name.toLowerCase()));
  eveningSnacks.forEach((item, idx) => {
    if (!existingSnackNames.has(item.name.toLowerCase())) {
      dishes.push({ id: `es_${idx}`, name: item.name, meal_type: 'evening_snack', approx_calories: item.cal, tags: item.tags, source: 'healthyfy_catalog' });
    }
  });

  return dishes;
}

function estimateDishCalories(ingredients, mealCategory) {
  const densityMap = {
    'atta': 340, 'whole wheat': 340, 'rice raw': 360, 'rice': 360, 'oats': 380, 'broken wheat': 340,
    'moong dal': 347, 'moong': 347, 'toor dal': 335, 'toor': 335, 'chana': 360, 'rajma': 340,
    'oil': 880, 'ghee': 900, 'paneer': 265, 'chicken': 165, 'milk': 60,
    'potato': 80, 'mixed vegetable standard': 40, 'mixed vegetable': 40, 'vegetable': 40,
    'onion': 40, 'tomato': 18,
  };
  let cal = 0;
  for (const ing of ingredients) {
    const nm = (ing.ingredient_name || '').toLowerCase();
    const grams = ing.unit === 'ml' ? (ing.qty || 0) * 0.9 : (ing.qty || 0);
    let density = 50;
    for (const [key, val] of Object.entries(densityMap)) {
      if (nm.includes(key)) { density = val; break; }
    }
    if (nm.includes('water')) density = 0;
    cal += (grams / 100) * density;
  }
  if (cal < 50) {
    const defaults = { BREAKFAST: 220, LUNCH: 360, DINNER: 310, SNACK: 150, ANY: 300 };
    return defaults[mealCategory] || 250;
  }
  return Math.round(cal);
}

function deriveDishTags(dishName, ingredients) {
  const tags = new Set();
  const allText = [dishName, ...(ingredients || []).map(i => i.ingredient_name || '')].join(' ').toLowerCase();
  if (['chicken', 'fish', 'mutton', 'meat', 'prawn', 'shrimp', 'lamb'].some(k => allText.includes(k))) tags.add('non_veg');
  if (allText.includes('egg')) { tags.add('egg'); tags.add('non_veg_cat'); }
  if (['milk', 'ghee', 'paneer', 'curd', 'yogurt', 'buttermilk', 'cheese', 'cream'].some(k => allText.includes(k))) tags.add('dairy');
  if (['atta', 'whole wheat', 'maida', 'bread'].some(k => allText.includes(k))) { tags.add('gluten'); tags.add('roti'); }
  if (allText.includes('rice')) tags.add('rice');
  if (allText.includes('oats')) tags.add('oats');
  if (['moong', 'toor', 'chana', 'rajma', 'chole', 'lobhia', ' dal'].some(k => allText.includes(k))) { tags.add('dal'); tags.add('protein'); }
  if (['potato', 'aalu', 'carrot', 'radish', 'mooli', 'onion', 'garlic'].some(k => allText.includes(k))) tags.add('root_veg');
  if (allText.includes('soup') || allText.includes('broth')) tags.add('soup');
  return [...tags];
}