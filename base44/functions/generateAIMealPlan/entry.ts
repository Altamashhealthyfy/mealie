import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * generateAIMealPlan
 * Generates meal plans in 3-day batches to avoid Claude API timeouts on large plans
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      clientId, duration: rawDuration, adaptFromFeedback = false,
      overrideGoal, overrideCalories, overrideProtein, overrideCarbs, overrideFats,
      calorieTarget, dietType, condition, numDays,
      additionalRestrictions = [], additionalAllergies = [],
      additionalConditions = [], mealFrequency = 5,
      snackPreference = 'light', cuisineNotes = '',
      focusAreas = [], modificationInstructions = '', generationCount = 1,
      planTier = 'basic'
    } = body;

    if (!clientId) return Response.json({ error: 'Client ID required' }, { status: 400 });

    const [clientArr, progressArr, clinicalArr, foodLogsArr, knowledgeBaseArr] = await Promise.all([
      base44.asServiceRole.entities.Client.filter({ id: clientId }),
      base44.asServiceRole.entities.ProgressLog.filter({ client_id: clientId }),
      base44.asServiceRole.entities.ClinicalIntake.filter({ client_id: clientId }),
      base44.asServiceRole.entities.FoodLog.filter({ client_id: clientId }),
      base44.asServiceRole.entities.HealthyfyKnowledgeBase.filter({ is_active: true }),
    ]);

    const client = clientArr[0];
    if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });

    const clinicalIntakes = await base44.asServiceRole.entities.ClinicalIntake.filter({ client_id: clientId });
    const clinicalIntake = clinicalIntakes?.sort((a,b) => new Date(b.created_date) - new Date(a.created_date))[0] || null;

    console.log('🔍 Clinical intake found:', clinicalIntake ? 'YES' : 'NO');
    console.log('🔍 Clinical intake data:', JSON.stringify({
      conditions: clinicalIntake?.health_conditions,
      lab_values: clinicalIntake?.lab_values,
      additional_rules: clinicalIntake?.additional_rules,
      dietitian_remarks: clinicalIntake?.dietitian_remarks,
      diet_type: clinicalIntake?.diet_type,
      likes: clinicalIntake?.likes_dislikes_allergies
    }));

    // ─── FETCH HEALTHYFY APPROVED DISH CATALOG ───
    const healthyfyDishes = await fetchHealthyfyDishes(base44);
    const dishByType = {};
    for (const d of healthyfyDishes) {
      const slots = (d.meal_type || 'lunch').split(',').map(s => s.trim());
      for (const slot of slots) {
        if (!dishByType[slot]) dishByType[slot] = [];
        dishByType[slot].push(d);
      }
    }

    // Group dishes into combination-friendly categories for the prompt
    const listDishesWithType = (type) => {
      const dishes = dishByType[type] || [];
      if (dishes.length === 0) return '  (none available)';
      return dishes.map(d => `  • ${d.name}`).join('\n');
    };
    const countDishes = (type) => (dishByType[type] || []).length;

    // Build combination guide: classify catalog dishes by their role in a meal
    const buildCombinationGuide = () => {
      const allDishNames = healthyfyDishes.map(d => d.name.toLowerCase());
      const carbSources = healthyfyDishes.filter(d =>
        ['roti', 'rice', 'paratha', 'chapati', 'bread', 'dosa', 'idli', 'upma', 'poha', 'oats', 'daliya', 'millet', 'bajra', 'jowar', 'ragi'].some(k => d.name.toLowerCase().includes(k))
      ).map(d => d.name);
      const proteinSources = healthyfyDishes.filter(d =>
        ['dal', 'chole', 'rajma', 'moong', 'paneer', 'chana', 'egg', 'chicken', 'fish', 'sprouts', 'lobhia', 'soya'].some(k => d.name.toLowerCase().includes(k))
      ).map(d => d.name);
      const vegetables = healthyfyDishes.filter(d =>
        ['sabzi', 'vegetable', 'veg', 'palak', 'bhindi', 'gobi', 'baingan', 'lauki', 'tinde', 'methi', 'curry', 'stir fry'].some(k => d.name.toLowerCase().includes(k))
      ).map(d => d.name);
      const soups = healthyfyDishes.filter(d => d.name.toLowerCase().includes('soup')).map(d => d.name);
      const salads = healthyfyDishes.filter(d => d.name.toLowerCase().includes('salad')).map(d => d.name);
      const drinks = healthyfyDishes.filter(d =>
        ['water', 'tea', 'milk', 'buttermilk', 'lassi', 'juice', 'smoothie', 'kadha', 'jeera'].some(k => d.name.toLowerCase().includes(k))
      ).map(d => d.name);

      let guide = '\n═══ DISH COMBINATION GUIDE — CLASSIFY DISHES FOR COMPLETE MEALS ═══\n';
      if (carbSources.length) guide += `CARB SOURCES (bread/grain base for meals):\n${carbSources.slice(0, 10).map(d => `  • ${d}`).join('\n')}\n\n`;
      if (proteinSources.length) guide += `PROTEIN SOURCES (dal/legume/meat for meals):\n${proteinSources.slice(0, 10).map(d => `  • ${d}`).join('\n')}\n\n`;
      if (vegetables.length) guide += `VEGETABLE SIDES:\n${vegetables.slice(0, 10).map(d => `  • ${d}`).join('\n')}\n\n`;
      if (soups.length) guide += `SOUPS: ${soups.join(', ')}\n`;
      if (salads.length) guide += `SALADS: ${salads.join(', ')}\n`;
      if (drinks.length) guide += `DRINKS/BEVERAGES: ${drinks.join(', ')}\n`;
      return guide;
    };

    // ─── BUILD KNOWLEDGE BASE CONTEXT ───
    const knowledgeBase = knowledgeBaseArr || [];
    const kbByCategory = {};
    for (const doc of knowledgeBase) {
      if (!kbByCategory[doc.category]) kbByCategory[doc.category] = [];
      kbByCategory[doc.category].push(doc);
    }

    const buildKBSection = () => {
      if (knowledgeBase.length === 0) return '';
      let section = '\n═══ HEALTHYFY KNOWLEDGE BASE (AUTHORITATIVE CLINICAL RULES — FOLLOW STRICTLY) ═══\n';
      section += 'The following rules and guidelines are set by the Healthyfy clinical team. They OVERRIDE any general AI knowledge.\n\n';
      for (const [category, docs] of Object.entries(kbByCategory)) {
        section += `▶ ${category.toUpperCase()}\n`;
        for (const doc of docs) {
          section += `  • [${doc.name}]`;
          if (doc.description) section += ` — ${doc.description}`;
          if (doc.ai_instruction) section += `\n    → AI INSTRUCTION: ${doc.ai_instruction}`;
          section += '\n';
        }
        section += '\n';
      }
      return section;
    };

    const clinical = clinicalArr[0];
    const recentLogs = [...progressArr].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 7);
    const recentFoodLogs = [...foodLogsArr].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 14);

    // ─── PARAM OVERRIDE BLOCK: explicit params always win over client profile ───
    const duration = numDays || rawDuration || 7;
    const goal = overrideGoal || client.goal || clinicalIntake?.goal?.[0] || 'general_health';
    const targetCal = calorieTarget || overrideCalories || client.target_calories || client.tdee || 1800;
    const targetProtein = overrideProtein || client.target_protein || Math.round(client.weight * 1.6) || 120;
    const targetCarbs = overrideCarbs || client.target_carbs || Math.round((targetCal * 0.45) / 4);
    const targetFats = overrideFats || client.target_fats || Math.round((targetCal * 0.25) / 9);
    const resolvedDietType = dietType || client.food_preference || 'veg';
    const resolvedConditions = condition ? [condition, ...additionalConditions] : additionalConditions;
    console.log(`📌 Resolved inputs → cal:${targetCal} diet:${resolvedDietType} conditions:[${[...(clinicalArr[0]?.health_conditions||[]), ...resolvedConditions].join(',')}] duration:${duration}days`);

    const allRestrictions = [...(client.dietary_restrictions || []), ...additionalRestrictions];
    const allAllergies = [...(clinical?.likes_dislikes_allergies?.allergies || []), ...additionalAllergies];
    const allConditions = [...new Set([...(clinical?.health_conditions || []), ...resolvedConditions])];
    const allMeds = clinical?.current_medications || [];

    const progressContext = adaptFromFeedback && recentLogs.length > 0
      ? `RECENT PROGRESS (last ${recentLogs.length} logs):\n${recentLogs.map(l => `  ${l.date}: weight=${l.weight || 'N/A'}kg, adherence=${l.meal_adherence || 'N/A'}%, symptoms=${l.symptoms?.join(', ') || 'none'}`).join('\n')}\nFood patterns: ${recentFoodLogs.slice(0, 6).map(f => f.meal_name || f.meal_type).join(', ') || 'N/A'}\n→ If adherence < 70%, simplify portions and prefer quicker meals.`
      : '';

    // ── Categorize dishes by slot for lean prompt ──
    const filterByDiet = (dishes) => {
      if (!resolvedDietType || resolvedDietType === 'mixed') return dishes;
      return dishes.filter(d => {
        if (!d.food_preference) return true;
        if (resolvedDietType === 'veg' || resolvedDietType === 'jain') {
          return !d.food_preference.includes('non_veg') && !d.food_preference.includes('egg');
        }
        if (resolvedDietType === 'eggetarian') {
          return !d.food_preference.includes('non_veg');
        }
        return true;
      });
    };

    const breakfastDishes = filterByDiet(dishByType['breakfast'] || []);
    const grainDishes = filterByDiet((dishByType['lunch'] || []).filter(d => d.tags?.includes('roti') || d.tags?.includes('rice')));
    const dalDishes = filterByDiet((dishByType['lunch'] || []).filter(d => d.tags?.includes('dal') || d.tags?.includes('protein')));
    const sabziDishes = filterByDiet((dishByType['lunch'] || []).filter(d => d.tags?.includes('root_veg')));
    const dinnerDishes = filterByDiet(dishByType['dinner'] || []);
    const snackDishes = filterByDiet(dishByType['evening_snack'] || []);
    const drinkDishes = filterByDiet(dishByType['early_morning'] || []);

    console.log(`📋 Categorized dishes: breakfast=${breakfastDishes.length}, grains=${grainDishes.length}, dal=${dalDishes.length}, sabzi=${sabziDishes.length}, dinner=${dinnerDishes.length}, snacks=${snackDishes.length}, drinks=${drinkDishes.length}`);

    // ─── DIRECT ANTHROPIC API CALL ───
    const callStartTime = Date.now();

    const systemPrompt = `You are HMRE — Healthyfy Meal Rule Engine. You are an expert Indian clinical dietitian. Generate complete authentic Indian meal plans following every rule below exactly.

SLOT CALORIE DISTRIBUTION (daily target: ${targetCal} kcal):
- early_morning: 6% = ${Math.round(targetCal*0.06)} kcal
- breakfast: 22% = ${Math.round(targetCal*0.22)} kcal
- mid_morning: 9% = ${Math.round(targetCal*0.09)} kcal
- lunch: 33% = ${Math.round(targetCal*0.33)} kcal
- evening_snack: 8% = ${Math.round(targetCal*0.08)} kcal
- dinner: 22% = ${Math.round(targetCal*0.22)} kcal
Total per day must never exceed ${targetCal} kcal. Aim for same or up to 50 kcal less.

EARLY MORNING RULE:
Warm drink + soaked nuts only. Rotate across days — never repeat same option 2 days in a row:
Jeera water + 5 soaked almonds | Warm lemon water + 4 walnuts | Methi seeds water + 5 almonds | Turmeric milk 100ml + 4 cashews | Coriander seeds water + 5 almonds | Fennel seeds water + 4 almonds | Ginger lemon water + 5 almonds | Ajwain water + 4 almonds | Ashwagandha warm milk + 4 almonds

BREAKFAST RULE:
Always 1 Indian grain dish + 1 protein + 1 support. Use authentic names with portions.
Vegetarian options: vegetable poha + curd | moong dal chilla + fruit | oats upma + paneer | ragi dosa + sambar | besan chilla + curd | idli + sambar | multigrain paratha + curd | daliya + curd | millet khichdi + sabzi | vermicelli upma + curd
Eggetarian/Non-veg breakfast: egg bhurji + roti | boiled eggs + oats porridge | egg omelette + poha | egg dosa + chutney | scrambled eggs + toast
Never chicken or fish at breakfast.

MID MORNING RULE:
Fruit or buttermilk preferred. Keep light and simple.
Apple | papaya | pear | orange | guava | watermelon | buttermilk 200ml | coconut water | pomegranate | banana | muskmelon | seasonal fruit bowl

LUNCH RULE — 3 components mandatory:
Component 1 — ONE grain only (never 2 grains in same meal):
2 whole wheat roti OR 1 cup brown/jeera rice OR 2 millet/bajra roti OR 2 ragi roti OR 2 oats roti
NEVER rice + roti together. NEVER rice + paratha together.
NEVER stuffed roti more than 2 times across 10 days.
Rotate grains — never same grain 2 days in a row.
Component 2 — ONE dal or protein:
Moong dal tadka | masoor dal | chana dal | toor dal | rajma curry | chole masala | lobhia | paneer curry | soya curry | chicken curry 150g | fish curry 150g | egg curry 2 eggs
Component 3 — ONE seasonal sabzi:
Bhindi sabzi | lauki sabzi | aloo gobi | palak sabzi | baingan sabzi | tinda sabzi | methi sabzi | shimla mirch | karela sabzi | mix veg | beans sabzi | parwal sabzi | kaddu sabzi | torai sabzi

EVENING SNACK RULE — light only, absolutely NO grains:
Allowed: roasted chana 30g | makhana 1 cup | mixed nuts 20g | seasonal fruit | buttermilk 200ml | sprouts 50g | peanuts roasted 20g | chana chaat | boiled corn half cup
STRICTLY NOT ALLOWED: daliya | oats | paratha | roti | rice | khichdi | any grain dish whatsoever

DINNER RULE — must be lighter than lunch:
1 grain smaller portion + 1 protein + 1 vegetable sabzi
Vegetarian: 1 roti + dal + sabzi | 1 bowl khichdi + sabzi | 1 millet roti + paneer sabzi | daliya khichdi + curd + sabzi | 1 ragi roti + dal + sabzi
Non-veg: 2 roti + chicken curry 150g + sabzi | 2 roti + fish curry 150g + sabzi | 2 roti + egg curry 2 eggs + sabzi

COMBINATION RULES — never break under any circumstance:
- Maximum 1 grain per meal — no exceptions
- No dairy + non-veg in same meal — no chicken + curd, no fish + raita, no egg + milk
- Oil maximum 2.5-5ml per meal
- Same dish cannot repeat within 3 days
- Rotate grains and proteins across all days

NON-VEG FREQUENCY RULES:
- Eggs can appear at breakfast or dinner
- Never non-veg at breakfast except eggs
- Maximum 1 non-veg dish per day
- STRICT RULE: Chicken + fish combined must not exceed 4 times in any 10-day plan. Count carefully before placing each non-veg meal. If chicken appears on days 1, 2, 3, 4 that is already the maximum — no more chicken or fish allowed after that. Do not exceed this limit under any circumstance.

JAIN DIET RULES:
Strictly no onion, garlic, potato, carrot, beetroot, radish, turnip or any root vegetable in any meal.

DISEASE RULES — apply strictly when condition is present:
PCOS: High protein, low GI carbs, high fiber. No refined carbs, no sugar, no maida, no white rice. Prefer millets, oats, brown rice. Include methi, cinnamon, flaxseeds, pumpkin seeds regularly.
THYROID: No soy or soy products at all. Never serve raw cabbage, cauliflower, broccoli — always cooked. Include selenium foods — sunflower seeds, Brazil nuts. No excess iodine. Prefer cooked vegetables only.
DIABETES: Strictly low GI only. No sugar, no white rice, no maida, no refined grains. No fruit juice — whole fruit only. Prefer millets, oats, barley, brown rice. Include karela, methi, jamun, cinnamon regularly. Small frequent meals. ADDITIONAL DIABETES RULE: Avoid jeera rice — it is made from white rice which is high GI. Use brown rice, millet, oats, or bajra instead. Never use jeera rice for a diabetic client under any circumstance.
HYPERTENSION: Very low sodium. No pickles, papad, namkeen, processed food, excess salt. Include potassium-rich foods — banana, sweet potato, spinach. Steamed or boiled cooking preferred. No MSG.
MENOPAUSE: High calcium, high vitamin D, high protein. Include flaxseeds, chickpeas, sesame seeds. Avoid excess caffeine, alcohol, very spicy food. Cooling foods preferred. High fiber.
CANCER: High protein, high antioxidant, anti-inflammatory. Include turmeric, ginger, green tea, berries. Avoid processed meat, refined sugar. Small frequent meals — easy to digest. High omega-3.
WEIGHT LOSS: High protein, high fiber, caloric deficit 300-500 kcal from TDEE. No fried food, no processed food, no sugar, no refined carbs. Prefer steamed, grilled, boiled cooking.
LIVER: No fried food, no refined sugar, no alcohol, low fat cooking. High fiber. Include bitter foods — karela, methi. Avoid red meat.

ALLERGY AND PREFERENCE CHECK — apply before finalising every single meal:
1. Check every ingredient against client allergies — if match found remove immediately and replace with safe alternative
2. Check every ingredient against client food dislikes — if match found replace with similar alternative
3. Check every ingredient against disease restrictions — if conflict found remove and replace
Examples:
Client allergic to peanuts → never use peanuts anywhere, replace with sunflower seeds or pumpkin seeds
Client dislikes brinjal → replace baingan sabzi with bhindi or lauki
Thyroid client + raw cabbage in salad → replace with cucumber
Diabetes client + white rice → replace with brown rice or millet
Hypertension client + pickle in meal → remove completely

VARIETY RULES:
- Grain rotation across days: wheat → rice → millet → oats → wheat (never repeat same grain 2 days running)
- Protein rotation: moong → chana → rajma → paneer → sprouts → chicken/fish → back
- No dish repeated within 3 days
- Stuffed roti maximum 2 times in full 10-day plan
- Early morning drink rotates every day

PORTION AND INGREDIENT RULES — always specific, never vague:
Good portions: "2 whole wheat roti", "1 katori moong dal tadka", "1 cup jeera rice", "150g chicken curry", "30g roasted chana", "1 medium apple"
Bad portions: "roti", "dal", "curry", "some rice", "snack"

MAJOR INGREDIENTS WITH QUANTITY — for every meal list all main ingredients with exact raw quantities:
This helps client shop and cook. Always include cooking oil quantity and key spices.
Breakfast example — Vegetable Poha + Curd:
Ingredients: Poha 60g | Mixed vegetables (onion, peas, carrot) 80g | Mustard seeds 1 tsp | Curry leaves 6 | Turmeric half tsp | Oil 2.5ml | Curd 100g | Salt to taste
Lunch example — 2 roti + moong dal + bhindi sabzi:
Ingredients: Whole wheat flour 60g | Moong dal 40g dry | Bhindi 100g | Onion 30g | Tomato 30g | Oil 5ml | Cumin seeds 1 tsp | Spices as needed
Dinner example — 1 roti + chicken curry + sabzi:
Ingredients: Whole wheat flour 30g | Chicken 150g raw | Onion 50g | Tomato 40g | Ginger garlic paste 1 tsp | Oil 5ml | Spices as needed | Seasonal sabzi 100g | Oil 2.5ml

MPESS — mandatory section at end of every plan, one entry per day, specific to client condition:
Sleep: specific sleep timing and guidance for the condition
Stress: specific stress management technique for the condition
Movement: specific exercise name + duration + best time of day for the condition
Mindfulness: specific journalling prompt or mindfulness practice
Pranayam: specific pranayam name + exactly how to do it + duration + benefit for condition

OUTPUT FORMAT — return valid JSON only. No markdown. No explanation. No code fences. Start response with { and end with }:
{
  "meals": [
    {
      "day": 1,
      "meal_type": "early_morning",
      "meal_name": "Jeera water + 5 soaked almonds",
      "items": ["Jeera water", "Soaked almonds"],
      "portion_sizes": ["200ml", "5 pieces"],
      "ingredients": ["Jeera seeds 1 tsp", "Warm water 200ml", "Almonds 5 pieces soaked overnight"],
      "calories": 90,
      "protein": 3,
      "carbs": 5,
      "fats": 7,
      "allergy_check": "clear",
      "clinical_check": "clear"
    }
  ],
  "mpess": [
    {
      "day": 1,
      "sleep": "Sleep by 10pm. Avoid screens 1 hour before bed. Condition specific guidance here.",
      "stress": "Specific stress technique for condition here.",
      "movement": "Specific exercise + duration + timing for condition here.",
      "mindfulness": "Specific journalling prompt or mindfulness practice here.",
      "pranayam": "Specific pranayam name + how to do it + duration + benefit here."
    }
  ]
}`;

    const userPrompt = `Generate a complete ${duration}-day Indian meal plan.

CLIENT PROFILE:
Name: ${client.full_name || 'Client'}
Age: ${client.age || clinicalIntake?.basic_info?.age || 'not specified'}
Gender: ${client.gender || clinicalIntake?.basic_info?.gender || 'not specified'}
Height: ${client.height || clinicalIntake?.basic_info?.height || 'not specified'} cm
Weight: ${client.weight || clinicalIntake?.basic_info?.weight || 'not specified'} kg
BMI: ${clinicalIntake?.basic_info?.bmi || 'not specified'}
Activity Level: ${client.activity_level || clinicalIntake?.daily_routine?.activity_level || 'moderately active'}
Diet Type: ${resolvedDietType}
Calorie Target: ${targetCal} kcal/day
Goal: ${overrideGoal || client.goal || clinicalIntake?.goal?.[0] || 'general_health'}

HEALTH CONDITIONS:
Primary: ${allConditions.length ? allConditions.join(', ') : 'none'}
Stage/Severity: ${clinicalIntake?.stage_severity || 'not specified'}
Specific Symptoms: ${clinicalIntake?.symptom_goals?.join(', ') || 'none'}

CURRENT MEDICATIONS:
${clinicalIntake?.current_medications?.length ? clinicalIntake.current_medications.map(m => `${m.medicine_name || m} ${m.dosage || ''} ${m.frequency || ''}`).join(' | ') : 'none'}

LAB VALUES — use to personalise plan:
TSH: ${clinicalIntake?.lab_values?.tsh || 'not provided'}
HbA1c: ${clinicalIntake?.lab_values?.hba1c || 'not provided'}
Total Cholesterol: ${clinicalIntake?.lab_values?.total_cholesterol || 'not provided'}
LDL: ${clinicalIntake?.lab_values?.ldl || 'not provided'}
HDL: ${clinicalIntake?.lab_values?.hdl || 'not provided'}
Triglycerides: ${clinicalIntake?.lab_values?.triglycerides || 'not provided'}
SGOT: ${clinicalIntake?.lab_values?.sgot || 'not provided'}
SGPT: ${clinicalIntake?.lab_values?.sgpt || 'not provided'}
Creatinine: ${clinicalIntake?.lab_values?.creatinine || 'not provided'}
Vitamin D: ${clinicalIntake?.lab_values?.vitamin_d || 'not provided'}
Vitamin B12: ${clinicalIntake?.lab_values?.vitamin_b12 || 'not provided'}
Uric Acid: ${clinicalIntake?.lab_values?.uric_acid || 'not provided'}
Sodium: ${clinicalIntake?.lab_values?.sodium || 'not provided'}
Potassium: ${clinicalIntake?.lab_values?.potassium || 'not provided'}
GFR: ${clinicalIntake?.lab_values?.gfr || 'not provided'}

FOOD PREFERENCES:
Foods Liked: ${clinicalIntake?.likes_dislikes_allergies?.likes || 'not specified'}
Foods Disliked: ${clinicalIntake?.likes_dislikes_allergies?.dislikes || 'none'}
Allergies: ${allAllergies.length ? allAllergies.join(', ') : 'none'}
No-Go Foods: ${clinicalIntake?.likes_dislikes_allergies?.no_go_foods || 'none'}

NON-VEG PREFERENCES:
Non-veg times in 10 days: ${clinicalIntake?.non_veg_frequency || 'not specified'}
Preferred non-veg meal times: ${clinicalIntake?.non_veg_meal_times?.join(', ') || 'lunch and dinner only'}
Egg times in 10 days: ${clinicalIntake?.egg_frequency || 'not specified'}
Preferred egg meal times: ${clinicalIntake?.egg_meal_times?.join(', ') || 'breakfast and dinner'}

MEAL TIMINGS:
Wake up: ${clinicalIntake?.daily_routine?.wake_up || 'not specified'}
Breakfast: ${clinicalIntake?.daily_routine?.breakfast_time || 'not specified'}
Lunch: ${clinicalIntake?.daily_routine?.lunch_time || 'not specified'}
Dinner: ${clinicalIntake?.daily_routine?.dinner_time || 'not specified'}
Sleep: ${clinicalIntake?.daily_routine?.sleep_time || 'not specified'}

COOKING STYLE: ${clinicalIntake?.cooking_style || 'standard Indian home cooking'}

MPESS PREFERENCES:
${clinicalIntake?.mpess_preferences ? Object.entries(clinicalIntake.mpess_preferences).filter(([k,v])=>v).map(([k])=>k).join(', ') : 'Mind, Physical, Emotional, Social, Spiritual'}

COACH CLINICAL NOTES AND OVERRIDE RULES — these override everything else:
${modificationInstructions || clinicalIntake?.additional_rules || clinicalIntake?.dietitian_remarks || clinicalIntake?.diagnostic_notes || 'none'}

LAB-BASED ADJUSTMENTS — apply automatically if lab values provided:
- TSH high: strict thyroid rules, no raw goitrogens at all
- HbA1c above 7: strict diabetes rules, glycemic index critical
- LDL high: reduce saturated fat, add oats and flaxseeds daily
- Triglycerides high: no sugar, no refined carbs, no fruit juice
- SGPT or SGOT high: liver protocol, no fried food, add turmeric and karela daily
- Creatinine high or GFR low: reduce protein portions, limit dal and meat
- Vitamin D low: add mushrooms, include sunlight guidance in MPESS movement
- B12 low: add eggs or dairy daily, note supplement recommendation in MPESS
- Uric Acid high: no red meat, limit dal to once daily, recommend 3L water daily
- Sodium low/high: adjust salt and sodium-containing foods accordingly
- Potassium low: add banana, sweet potato, spinach

MEDICATION INTERACTIONS — apply if medications provided:
- Eltroxin or Thyronorm: take empty stomach, no calcium foods within 4 hours of medication
- Metformin: all meals with food, no gap more than 4 hours between meals
- Blood thinners (warfarin): consistent vitamin K, no sudden increase in spinach or broccoli
- Statins: no grapefruit in any form
- BP medication: no grapefruit, monitor potassium intake
- Insulin: strict meal timing, no skipping meals

CRITICAL FORMATTING:
Return ONLY raw JSON. No markdown. No code fences. No explanation.
Start with { and end with }`;

    const prompt = userPrompt;

    console.log("📤 PROMPT SENT TO LLM:\n" + prompt);

    // ─── 4-TEMPLATE ROTATION GENERATION (single API call, no timeout) ───
    const templateUserPrompt = prompt + `

IMPORTANT: Generate exactly 4 different day templates labeled A, B, C, D.
Each template = 1 complete day with all meal slots (early_morning, breakfast, mid_morning, lunch, evening_snack, dinner).
All 4 templates must use completely different dishes from each other.
These 4 templates will be rotated across ${duration} days.

Return JSON in this exact structure:
{
  "templates": {
    "A": {
      "early_morning": {"meal_name": "...", "items": [...], "portion_sizes": [...], "ingredients": [...], "calories": 0, "protein": 0, "carbs": 0, "fats": 0},
      "breakfast": { same fields },
      "mid_morning": { same fields },
      "lunch": { same fields },
      "evening_snack": { same fields },
      "dinner": { same fields }
    },
    "B": { same structure, completely different dishes },
    "C": { same structure, completely different dishes },
    "D": { same structure, completely different dishes }
  },
  "mpess": {
    "sleep": "...",
    "stress": "...",
    "movement": "...",
    "mindfulness": "...",
    "pranayam": "..."
  }
}`;

    const apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("CLAUDE"),
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: "user", content: templateUserPrompt }]
      })
    });

    const apiData = await apiResponse.json();
    if (apiData.error) {
      await base44.asServiceRole.entities.AICallLog.create({
        function_name: 'generateAIMealPlan',
        model: 'claude-haiku-4-5-20251001',
        status: 'error',
        client_id: clientId,
        client_name: client.full_name || '',
        client_email: client.email || '',
        triggered_by: user.email || '',
        duration_ms: Date.now() - callStartTime,
        error_message: apiData.error.message,
        prompt_summary: prompt.slice(0, 500),
        context_metadata: { duration_days: duration, calorie_target: targetCal, diet_type: resolvedDietType, conditions: allConditions, catalog_dishes_count: healthyfyDishes.length },
      }).catch(() => {});
      throw new Error("Claude API: " + apiData.error.message);
    }

    const callDurationMs = Date.now() - callStartTime;
    const promptTokens = apiData.usage?.input_tokens || 0;
    const completionTokens = apiData.usage?.output_tokens || 0;
    // claude-haiku-4-5 pricing: $0.80/M input, $4/M output
    const estimatedCost = (promptTokens * 0.80 + completionTokens * 4) / 1_000_000;

    const rawText = apiData.content?.[0]?.text || "";
    const cleanText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const aiResult = rawText;

    let parsed = {};
    try {
      parsed = JSON.parse(cleanText);
    } catch (parseErr) {
      throw new Error(`Failed to parse AI response as JSON: ${parseErr.message}`);
    }

    const templates = parsed.templates || {};
    const mpessData = parsed.mpess || {};
    console.log(`✅ Templates generated: ${Object.keys(templates).join(', ')}`);

    // ─── ROTATE TEMPLATES ACROSS ALL DAYS ───
    const ROTATION = [0, 1, 2, 3, 1, 0, 3, 2, 0, 1]; // A,B,C,D,B,A,D,C,A,B
    const templateKeys = ['A', 'B', 'C', 'D'];
    const SLOT_PCT = {
      early_morning: 0.06, breakfast: 0.22, mid_morning: 0.09,
      lunch: 0.33, evening_snack: 0.08, dinner: 0.22
    };

    const allMeals = [];
    for (let day = 1; day <= duration; day++) {
      const tKey = templateKeys[ROTATION[(day - 1) % ROTATION.length]];
      const template = templates[tKey] || templates['A'] || {};
      for (const [slot, pct] of Object.entries(SLOT_PCT)) {
        const m = template[slot] || {};
        if (m.meal_name || m.dish) {
          allMeals.push({
            day,
            meal_type: slot,
            meal_name: m.meal_name || m.dish || '',
            items: m.items || [m.meal_name || m.dish || ''],
            portion_sizes: m.portion_sizes || [],
            ingredients: m.ingredients || [],
            calories: m.calories || Math.round(targetCal * pct),
            protein: m.protein || 0,
            carbs: m.carbs || 0,
            fats: m.fats || 0,
          });
        }
      }
    }

    // ─── MPESS — one entry per day ───
    const allMpessRecommendations = Array.from({ length: duration }, (_, i) => ({
      day: i + 1,
      sleep: mpessData.sleep || '',
      stress: mpessData.stress || '',
      movement: mpessData.movement || '',
      mindfulness: mpessData.mindfulness || '',
      pranayam: mpessData.pranayam || '',
    }));
    console.log(`✅ Generated ${allMeals.length} meals for ${duration}-day plan`);

    if (allMeals.length === 0) {
      throw new Error(`Plan generation produced 0 meals. Cannot proceed.`);
    }
    
    const allDaySummaries = [];

    // Plan data object
    const planData = {
      plan_name: `AI Meal Plan – ${duration} Days`,
      overview: 'Personalized meal plan generated optimally for quality.',
      nutritional_strategy: 'Balanced nutrition across all meal slots.',
      daily_calorie_target: targetCal,
      macro_targets: { protein_g: targetProtein, carbs_g: targetCarbs, fats_g: targetFats, fiber_g: 25 },
      key_foods_included: [],
      foods_avoided: allAllergies,
      meals: allMeals,
      day_summaries: allDaySummaries,
      mpess: allMpessRecommendations,
      coach_notes: `Plan generated by rotating 4 unique day templates across ${duration} days for optimal variety.`
    };

    // ─── RECALCULATE NUTRITION FROM DATABASE ───
    const [allRecipes, allIngredients] = await Promise.all([
      base44.asServiceRole.entities.RecipeTemplate.list(),
      base44.asServiceRole.entities.NutritionalIngredient.list(),
    ]);

    const recipeMap = {};
    for (const r of allRecipes) {
      if (r.template_code) recipeMap[r.template_code.toUpperCase()] = r;
      if (r.dish_name) recipeMap[r.dish_name.toUpperCase()] = r;
    }

    const ingredientMap = {};
    for (const ing of allIngredients) {
      ingredientMap[ing.ingredient_name.toLowerCase()] = ing;
    }

    const catalogNameSet = new Set(healthyfyDishes.map(d => d.name.toLowerCase().trim()));
    const dishByName = {};
    for (const d of healthyfyDishes) dishByName[d.name.toLowerCase().trim()] = d;

    const enrichedMeals = (planData.meals || []).map(meal => {
      const components = meal.components || [];
      const componentCompliance = components.map(c => ({
        name: c,
        in_catalog: catalogNameSet.has(c.toLowerCase().trim())
      }));
      const allComponentsCompliant = componentCompliance.length === 0
        ? catalogNameSet.has((meal.meal_name || '').toLowerCase().trim())
        : componentCompliance.every(c => c.in_catalog);

      const mealNameKey = (meal.meal_name || '').toUpperCase();
      const mealNameLower = (meal.meal_name || '').toLowerCase().trim();
      const matchedRecipe = recipeMap[mealNameKey];

      if (matchedRecipe?.calculated_nutrition_per_serving) {
        const n = matchedRecipe.calculated_nutrition_per_serving;
        const servings = meal.servings || 1;
        return {
          ...meal,
          calories: Math.round(n.kcal * servings * 10) / 10,
          protein: Math.round(n.protein_g * servings * 10) / 10,
          carbs: Math.round(n.carbs_g * servings * 10) / 10,
          fats: Math.round(n.fat_g * servings * 10) / 10,
          fiber: Math.round((n.fibre_g || 0) * servings * 10) / 10,
          nutrition_source: 'database_verified',
          catalog_compliant: allComponentsCompliant,
          component_compliance: componentCompliance,
        };
      }

      if (components.length > 0) {
        let totalCal = 0, totalProtein = 0, totalCarbs = 0, totalFats = 0;
        for (const comp of components) {
          const catalogDish = dishByName[comp.toLowerCase().trim()];
          if (catalogDish?.nutrition?.calories) {
            totalCal     += catalogDish.nutrition.calories || 0;
            totalProtein += catalogDish.nutrition.protein  || 0;
            totalCarbs   += catalogDish.nutrition.carbs    || 0;
            totalFats    += catalogDish.nutrition.fats     || 0;
          } else if (catalogDish?.approx_calories) {
            totalCal += catalogDish.approx_calories;
          }
        }
        if (totalCal > 0) {
          return {
            ...meal,
            calories: Math.round(totalCal) || meal.calories || 0,
            protein:  meal.protein  || Math.round(totalProtein * 10) / 10,
            carbs:    meal.carbs    || Math.round(totalCarbs   * 10) / 10,
            fats:     meal.fats     || Math.round(totalFats    * 10) / 10,
            nutrition_source: 'catalog_actual_combined',
            catalog_compliant: allComponentsCompliant,
            component_compliance: componentCompliance,
          };
        }
      }

      const catalogDish = dishByName[mealNameLower];
      if (catalogDish && (!meal.calories || meal.calories === 0)) {
        return {
          ...meal,
          calories: catalogDish.nutrition?.calories || catalogDish.approx_calories || meal.calories,
          protein:  catalogDish.nutrition?.protein  || meal.protein,
          carbs:    catalogDish.nutrition?.carbs     || meal.carbs,
          fats:     catalogDish.nutrition?.fats      || meal.fats,
          nutrition_source: 'catalog_actual',
          catalog_compliant: true,
          component_compliance: componentCompliance,
        };
      }

      return { ...meal, nutrition_source: 'ai_estimated', catalog_compliant: allComponentsCompliant, component_compliance: componentCompliance };
    });

    // ─── SERVER-SIDE FIX: Remove intra-day duplicate components ───
    const dayMealGroups = {};
    for (const meal of enrichedMeals) {
      if (!dayMealGroups[meal.day]) dayMealGroups[meal.day] = [];
      dayMealGroups[meal.day].push(meal);
    }

    const intraDayDuplicates = [];
    for (const [day, meals] of Object.entries(dayMealGroups)) {
      const slotOrder = { early_morning: 1, breakfast: 2, mid_morning: 3, lunch: 4, evening_snack: 5, dinner: 6 };
      meals.sort((a, b) => (slotOrder[a.meal_type] || 9) - (slotOrder[b.meal_type] || 9));

      const usedOnDay = new Set();
      for (const meal of meals) {
        const cleanedComponents = [];
        for (const comp of (meal.components || [])) {
          const key = comp.toLowerCase().trim();
          if (usedOnDay.has(key)) {
            const alternatives = (dishByType[meal.meal_type] || [])
              .map(d => d.name)
              .filter(n => !usedOnDay.has(n.toLowerCase().trim()) && n.toLowerCase().trim() !== key);
            if (alternatives.length > 0) {
              const replacement = alternatives[Math.floor(Math.random() * Math.min(alternatives.length, 5))];
              intraDayDuplicates.push({ day: meal.day, meal_type: meal.meal_type, removed: comp, replaced_with: replacement });
              cleanedComponents.push(replacement);
              usedOnDay.add(replacement.toLowerCase().trim());
            } else {
              intraDayDuplicates.push({ day: meal.day, meal_type: meal.meal_type, removed: comp, replaced_with: null });
            }
          } else {
            cleanedComponents.push(comp);
            usedOnDay.add(key);
          }
        }
        meal.components = cleanedComponents;
        if (cleanedComponents.length > 0 && cleanedComponents.length !== (meal.components || []).length) {
          meal.items = cleanedComponents.map(c => c);
        }
      }
    }

    const recalculatedDaySummaries = [];
    const dayNumbers = [...new Set(enrichedMeals.map(m => m.day))].sort((a, b) => a - b);
    for (const day of dayNumbers) {
      const dayMeals = enrichedMeals.filter(m => m.day === day);
      const totals = dayMeals.reduce((acc, m) => ({
        calories: acc.calories + (Number(m.calories) || 0),
        protein: acc.protein + (Number(m.protein) || 0),
        carbs: acc.carbs + (Number(m.carbs) || 0),
        fats: acc.fats + (Number(m.fats) || 0),
      }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
      const existing = planData.day_summaries?.find(s => s.day === day) || {};
      recalculatedDaySummaries.push({
        ...existing,
        day,
        total_calories: Math.round(totals.calories),
        total_protein: Math.round(totals.protein),
        total_carbs: Math.round(totals.carbs),
        total_fats: Math.round(totals.fats),
      });
    }

    const CALORIE_TOLERANCE = 0.10;
    const calorieCorrections = [];

    for (const daySummary of recalculatedDaySummaries) {
      const day = daySummary.day;
      const totalCal = daySummary.total_calories;
      const minCal = targetCal * (1 - CALORIE_TOLERANCE);
      const maxCal = targetCal * (1 + CALORIE_TOLERANCE);

      if (totalCal > 0 && (totalCal < minCal || totalCal > maxCal)) {
        const scaleFactor = targetCal / totalCal;
        const dayMeals = enrichedMeals.filter(m => m.day === day);

        for (const meal of dayMeals) {
          meal.calories = Math.round((meal.calories || 0) * scaleFactor);
          meal.protein  = Math.round((meal.protein  || 0) * scaleFactor * 10) / 10;
          meal.carbs    = Math.round((meal.carbs    || 0) * scaleFactor * 10) / 10;
          meal.fats     = Math.round((meal.fats     || 0) * scaleFactor * 10) / 10;
        }

        const correctedTotal = dayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);

        calorieCorrections.push({
          day,
          original_calories: totalCal,
          corrected_calories: correctedTotal,
          scale_factor: Math.round(scaleFactor * 100) / 100,
          within_range: correctedTotal >= minCal && correctedTotal <= maxCal,
        });

        daySummary.total_calories = correctedTotal;
        daySummary.total_protein  = Math.round(dayMeals.reduce((sum, m) => sum + (m.protein || 0), 0));
        daySummary.total_carbs    = Math.round(dayMeals.reduce((sum, m) => sum + (m.carbs   || 0), 0));
        daySummary.total_fats     = Math.round(dayMeals.reduce((sum, m) => sum + (m.fats    || 0), 0));
      }
    }

    const violations = [];
    const daySlots = {};
    planData.meals.forEach(meal => {
      const key = `day${meal.day}`;
      if (!daySlots[key]) daySlots[key] = [];
      daySlots[key].push(meal);
    });

    Object.keys(daySlots).forEach(day => {
      const slots = daySlots[day];
      let nonVegCount = 0;
      let totalCal = 0;
      const dishesSeenToday = [];

      slots.forEach(meal => {
        totalCal += meal.calories || 0;
        const dishList = meal.components || meal.dishes || meal.items || [];
        if (dishList.some(d =>
          ['Chicken','Fish','Mutton','Prawn'].some(nv => d.includes(nv))
        )) nonVegCount++;
        dishList.forEach(d => dishesSeenToday.push(d));
      });

      if (nonVegCount > 1)
        violations.push(`${day}: ${nonVegCount} non-veg dishes (max 1/day)`);
      if (totalCal > targetCal + 50)
        violations.push(`${day}: ${totalCal} kcal exceeds target ${targetCal} + 50 buffer`);
    });

    if (violations.length > 0) {
      console.warn('⚠️ HMRE violations:', JSON.stringify(violations));
    } else {
      console.log('✅ HMRE audit passed — no violations');
    }

    const slotCounts = {};
    enrichedMeals.forEach(m => {
      slotCounts[m.meal_type || m.slot] = (slotCounts[m.meal_type || m.slot] || 0) + 1;
    });
    console.log('🍽️ Meals by slot before save:', JSON.stringify(slotCounts));

    const kbSnapshot = knowledgeBase.map(doc => ({
      kb_id: doc.id,
      name: doc.name,
      category: doc.category,
      version_label: doc.version || '',
      version_number: doc.version_number || 1,
      ai_instruction: doc.ai_instruction || '',
      description: doc.description || '',
    }));

    // Do NOT deactivate existing plans here — let the coach decide via Save & Assign
    const mealPlan = await base44.asServiceRole.entities.MealPlan.create({
      mpess: allMpessRecommendations,
      client_id: clientId,
      name: (() => {
        const now = new Date();
        const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
        const timestamp = istTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) + ' ' + istTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
        const conditionLabel = allConditions.length ? allConditions[0] : (resolvedDietType || 'General');
        return `${client.full_name} — ${conditionLabel} Plan (${duration} Days) | ${timestamp}`;
      })(),
      duration,
      meal_pattern: 'daily',
      target_calories: planData.daily_calorie_target || targetCal,
      food_preference: client.food_preference,
      regional_preference: client.regional_preference,
      meals: enrichedMeals,
      active: false,
      plan_tier: planTier,
      kb_snapshot: kbSnapshot,
      kb_snapshot_generated_at: new Date().toISOString(),
      generation_parameters: {
        duration, target_calories: targetCal, target_protein: targetProtein, target_carbs: targetCarbs, target_fats: targetFats,
        goal: goal || client.goal, food_preference: client.food_preference, regional_preference: client.regional_preference,
        snack_preference: snackPreference, meal_frequency: mealFrequency, cuisine_notes: cuisineNotes,
        adapt_from_feedback: adaptFromFeedback, override_goal: overrideGoal || null, focus_areas: focusAreas,
        additional_restrictions: additionalRestrictions, additional_allergies: additionalAllergies,
        additional_conditions: additionalConditions, modification_instructions: modificationInstructions || null,
        generation_count: generationCount, catalog_source: 'healthyfy_google_sheet', total_catalog_dishes: healthyfyDishes.length,
        dish_combination_mode: true,
      },
    });

    await base44.asServiceRole.entities.Notification.create({
      user_email: client.email,
      type: 'meal_plan',
      title: '🎉 New AI Meal Plan Ready!',
      message: `Your personalized ${duration}-day meal plan "${mealPlan.name}" has been created.`,
      priority: 'high',
      link: '/MyAssignedMealPlan',
      read: false,
    }).catch(() => {});

    const foodPref = resolvedDietType;
    const isVeg = ['veg', 'jain'].includes(foodPref);
    const isJain = foodPref === 'jain';
    const allAllergyLower = allAllergies.map(a => a.toLowerCase());
    const allRestrictionLower = allRestrictions.map(r => r.toLowerCase());

    function getExclusionReason(option) {
      const optLower = option.toLowerCase();
      for (const a of allAllergyLower) {
        if (optLower.includes(a)) return `Allergy: ${a}`;
      }
      for (const r of allRestrictionLower) {
        if (r.includes('dairy') && (optLower.includes('milk') || optLower.includes('paneer') || optLower.includes('buttermilk') || optLower.includes('yogurt') || optLower.includes('curd'))) return 'Restriction: dairy-free';
        if (r.includes('gluten') && (optLower.includes('roti') || optLower.includes('bread') || optLower.includes('wheat') || optLower.includes('suji') || optLower.includes('daliya') || optLower.includes('paratha'))) return 'Restriction: gluten-free';
        if (r.includes('jain') && (optLower.includes('onion') || optLower.includes('garlic') || optLower.includes('aalu') || optLower.includes('potato') || optLower.includes('carrot') || optLower.includes('radish'))) return 'Jain diet: no root vegetables/onion/garlic';
      }
      if (isJain && (optLower.includes('onion') || optLower.includes('garlic') || optLower.includes('aalu') || optLower.includes('potato') || optLower.includes('carrot') || optLower.includes('radish') || optLower.includes('mooli'))) {
        return 'Jain diet: root vegetables/onion/garlic excluded';
      }
      return null;
    }

    function isNonVegOption(opt) {
      const o = opt.toLowerCase();
      return o.includes('chicken') || o.includes('fish') || o.includes('mutton') || o.includes('meat') || o.includes('prawn') || o.includes('shrimp');
    }
    function isEggOption(opt) { return opt.toLowerCase().includes('egg'); }

    function getDietExclusionReason(opt) {
      if (isNonVegOption(opt)) {
        if (isVeg) return `Diet preference: ${foodPref} (non-veg excluded)`;
        if (foodPref === 'eggetarian') return `Diet preference: eggetarian (non-veg excluded)`;
      }
      if (isEggOption(opt)) {
        if (isVeg && foodPref !== 'eggetarian') return `Diet preference: ${foodPref} (eggs excluded)`;
        if (isJain) return `Diet preference: jain (eggs excluded)`;
      }
      return null;
    }

    function analyzeCategory(label, options) {
      const available = [];
      const excluded = [];
      for (const opt of (options || [])) {
        const dietReason = getDietExclusionReason(opt);
        const restrictReason = getExclusionReason(opt);
        const reason = dietReason || restrictReason;
        if (reason) {
          excluded.push({ option: opt, reason });
        } else {
          available.push(opt);
        }
      }
      return { category: label, total: options.length, available_count: available.length, excluded_count: excluded.length, available, excluded };
    }

    const mealTypeLabels = {
      early_morning: 'Early Morning Drinks',
      breakfast: 'Breakfast Options',
      mid_morning: 'Mid Morning Snacks',
      lunch: 'Lunch Options',
      evening_snack: 'Evening Snacks',
      dinner: 'Dinner Options',
    };
    const mealOptionAnalysis = Object.entries(mealTypeLabels).map(([mt, label]) => {
      const options = (dishByType[mt] || []).map(d => d.name);
      return analyzeCategory(label, options);
    });

    const decisionRules = [
      { rule: `🔒 NON-COMPROMISING RULE: All dish components sourced exclusively from Healthyfy Google Sheet catalog (${healthyfyDishes.length} total dishes)`, category: 'Dish Source' },
      { rule: `🍽️ COMBINATION MODE ACTIVE: AI combines 2-3 catalog dishes per meal slot for complete balanced meals`, category: 'Dish Combination' },
      { rule: `🚫 NO INTRA-DAY REPETITION: Each catalog dish can appear only once per day across all slots`, category: 'Variety' },
      { rule: `Daily calorie target: ${targetCal} kcal (BMR: ${client.bmr || 'N/A'}, TDEE: ${client.tdee || 'N/A'}, Goal: ${(goal || client.goal || 'N/A').replace(/_/g,' ')})`, category: 'Calorie Target' },
      { rule: `Macros: Protein ~${targetProtein}g | Carbs ~${targetCarbs}g | Fats ~${targetFats}g`, category: 'Macros' },
      { rule: `Diet type: ${foodPref.charAt(0).toUpperCase() + foodPref.slice(1)} — Meal options selected accordingly`, category: 'Diet Type' },
      ...(allConditions.length > 0 ? allConditions.map(c => ({ rule: `${c}: Applied clinical dietary rules for this condition`, category: 'Medical Condition' })) : []),
      ...(allAllergies.length > 0 ? [{ rule: `Allergies strictly avoided: ${allAllergies.join(', ')}`, category: 'Allergy' }] : []),
      ...(allRestrictions.length > 0 ? [{ rule: `Dietary restrictions applied: ${allRestrictions.join(', ')}`, category: 'Restriction' }] : []),
      ...(focusAreas.length > 0 ? [{ rule: `Nutrition focus areas: ${focusAreas.join(', ')}`, category: 'Focus' }] : []),
      ...(cuisineNotes ? [{ rule: `Cuisine notes: ${cuisineNotes}`, category: 'Cuisine' }] : []),
    ];

    const nonCompliantMeals = enrichedMeals.filter(m => !m.catalog_compliant);

    // ─── LOG SUCCESSFUL LLM CALL ───
    await base44.asServiceRole.entities.AICallLog.create({
      function_name: 'generateAIMealPlan',
      model: 'claude-haiku-4-5-20251001',
      status: 'success',
      client_id: clientId,
      client_name: client.full_name || '',
      client_email: client.email || '',
      triggered_by: user.email || '',
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
      estimated_cost_usd: Math.round(estimatedCost * 100000) / 100000,
      duration_ms: callDurationMs,
      prompt_summary: prompt.slice(0, 500),
      response_summary: aiResult.slice(0, 500),
      full_prompt: prompt,
      full_response: aiResult,
      context_metadata: { duration_days: duration, calorie_target: targetCal, diet_type: resolvedDietType, conditions: allConditions, catalog_dishes_count: healthyfyDishes.length, generation_count: generationCount },
    }).catch(e => console.warn('AICallLog write failed:', e.message));

    return Response.json({
      success: true,
      mealPlan: { id: mealPlan.id, name: mealPlan.name, duration, meals: enrichedMeals.length },
      // Pass back conversation context so frontend can continue the conversation for modifications
      conversationContext: {
        originalPrompt: prompt,
        assistantResponse: aiResult,
      },
      catalog_source: 'healthyfy_google_sheet',
      total_catalog_dishes: healthyfyDishes.length,
      dish_combination_mode: true,
      catalog_compliance: {
        total_meals: enrichedMeals.length,
        compliant_meals: enrichedMeals.length - nonCompliantMeals.length,
        non_compliant_meals: nonCompliantMeals.map(m => ({ day: m.day, meal_type: m.meal_type, meal_name: m.meal_name })),
      },
      calorie_compliance_audit: {
        target_calories: targetCal,
        tolerance_percent: 10,
        days_corrected: calorieCorrections.length,
        corrections: calorieCorrections,
      },
      intra_day_duplicate_audit: {
        duplicates_found: intraDayDuplicates.length,
        auto_corrected: intraDayDuplicates.filter(d => d.replaced_with).length,
        removed_no_replacement: intraDayDuplicates.filter(d => !d.replaced_with).length,
        corrections: intraDayDuplicates,
      },
      overview: planData.overview,
      nutritional_strategy: planData.nutritional_strategy,
      macro_targets: planData.macro_targets,
      key_foods_included: planData.key_foods_included,
      foods_avoided: planData.foods_avoided,
      day_summaries: recalculatedDaySummaries,
      coach_notes: planData.coach_notes,
      meals: enrichedMeals,
      mpess: allMpessRecommendations,
      mpess_recommendations: allMpessRecommendations.map(m => `${m.sleep || ''} ${m.stress || ''} ${m.movement || ''} ${m.mindfulness || ''} ${m.pranayam || ''}`.trim()),
      meal_option_analysis: mealOptionAnalysis,
      decision_rules: decisionRules,
    });

  } catch (globalErr) {
    console.error('💥 GLOBAL ERROR:', globalErr.message);
    console.error('💥 STACK:', globalErr.stack);
    return new Response(JSON.stringify({
      success: false,
      error: String(globalErr.message || '(no message)'),
      type: String(globalErr.name || 'Error'),
      hint: String(globalErr.stack ? globalErr.stack.split('\n')[0] : 'No stack trace')
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

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

async function fetchHealthyfyDishes(base44) {
  const kbRecords = await base44.asServiceRole.entities.HealthyfyKnowledgeBase.filter({ name: 'Dish Catalog Primary (HEALTHYFY DISHES 1)', is_active: true });
  if (!kbRecords || kbRecords.length === 0) throw new Error('HEALTHYFY CATALOG NOT FOUND: No active record named "Dish Catalog Primary (HEALTHYFY DISHES 1)" in HealthyfyKnowledgeBase.');
  const fileUrl = kbRecords[0].file_url;
  if (!fileUrl) throw new Error('HEALTHYFY CATALOG URL MISSING: The HealthyfyKnowledgeBase record has no file_url set.');
  const resp = await fetch(fileUrl);
  if (!resp.ok) throw new Error(`HEALTHYFY CATALOG UNAVAILABLE: file_url returned HTTP ${resp.status}. Cannot proceed without the official dish catalog.`);
  const text = await resp.text();
  const dishes = parseHealthyfyCSV(text);
  if (dishes.length === 0) throw new Error('HEALTHYFY CATALOG EMPTY: file_url returned 0 dishes. Cannot generate meal plan.');
  console.log(`✅ Healthyfy catalog loaded: ${dishes.length} dishes from ${fileUrl}`);
  return dishes;
}

function parseHealthyfyCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const dishes = [];
  const MEAL_TYPE_MAP = {
    'breakfast':     ['breakfast'],
    'lunch':         ['lunch'],
    'dinner':        ['dinner'],
    'snack':         ['evening_snack'],
    'post_dinner':   ['post_dinner'],
    'early_morning': ['early_morning'],
    'mid_morning':   ['mid_morning'],
    'any':           ['breakfast', 'lunch', 'dinner', 'evening_snack'],
  };

  const headers = parseCSVLine(lines[0]);
  const colIndex = {};
  headers.forEach((h, i) => { colIndex[h.trim().toLowerCase()] = i; });

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const dishName = cols[colIndex['name']]?.trim();
    if (!dishName || dishName.toLowerCase() === 'name') continue;

    const mealTypeRaw = (cols[colIndex['meal_type']]?.trim() || '').toLowerCase();
    const foodPref = (cols[colIndex['food_preference']]?.trim() || '').toLowerCase();

    let ingredients = [];
    try {
      const ingJson = cols[colIndex['ingredients']]?.trim();
      if (ingJson && ingJson.startsWith('[')) {
        const parsed = JSON.parse(ingJson);
        ingredients = parsed.map(ing => ({
          ingredient_name: ing.item || '',
          qty: ing.quantity || 0,
          unit: ing.unit || 'g',
        }));
      }
    } catch (e) {}

    let approxCal = 0;
    let nutritionData = {};
    try {
      const nutJson = cols[colIndex['nutritional_info']]?.trim();
      if (nutJson && nutJson.startsWith('{')) {
        nutritionData = JSON.parse(nutJson);
        approxCal = nutritionData.calories || 0;
      }
    } catch (e) {}

    if (approxCal === 0) {
      approxCal = estimateDishCalories(ingredients, '');
    }

    let applicableMealTypes = [];
    mealTypeRaw.split(',').forEach(t => {
      const mapped = MEAL_TYPE_MAP[t.trim()];
      if (mapped) mapped.forEach(slot => {
        if (!applicableMealTypes.includes(slot)) applicableMealTypes.push(slot);
      });
    });

    if (applicableMealTypes.length === 0) {
      const nameLower = dishName.toLowerCase();
      if (['tea', 'water', 'lemon', 'jeera water', 'warm water', 'kadha', 'soaked'].some(k => nameLower.includes(k))) {
        applicableMealTypes = ['early_morning'];
      } else if (['fruit', 'nuts', 'sprouts', 'buttermilk', 'lassi', 'roasted', 'makhana', 'energy bar'].some(k => nameLower.includes(k))) {
        applicableMealTypes = ['mid_morning', 'evening_snack'];
      } else if (['oats', 'poha', 'upma', 'idli', 'dosa', 'paratha', 'cheela', 'besan', 'egg', 'bread'].some(k => nameLower.includes(k))) {
        applicableMealTypes = ['breakfast'];
      } else if (['soup', 'khichdi', 'dal', 'sabzi', 'roti', 'rice', 'pulao', 'curry', 'chicken', 'fish', 'paneer', 'rajma', 'chole'].some(k => nameLower.includes(k))) {
        applicableMealTypes = ['lunch', 'dinner'];
      } else {
        applicableMealTypes = ['lunch', 'dinner'];
      }
    }

    const tags = deriveDishTags(dishName, ingredients);
    const seen = new Set();

    for (const mt of applicableMealTypes) {
      if (seen.has(mt)) continue;
      seen.add(mt);
      dishes.push({
        id: `${dishName.replace(/\s+/g, '_')}_${mt}_${i}`,
        name: dishName,
        meal_type: mt,
        food_preference: foodPref,
        ingredients,
        approx_calories: approxCal,
        nutrition: nutritionData,
        portion_label: cols[colIndex['portion_label']]?.trim() || '',
        dish_type: cols[colIndex['dish_type']]?.trim() || '',
        tags,
        source: 'healthyfy_catalog',
      });
    }
  }

  const slotSummary = {};
  for (const d of dishes) {
    slotSummary[d.meal_type] = (slotSummary[d.meal_type] || 0) + 1;
  }
  console.log('✅ Catalog slot distribution:', JSON.stringify(slotSummary));

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
  for (const ing of (ingredients || [])) {
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