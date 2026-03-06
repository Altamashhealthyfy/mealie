import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      clientId, duration = 7, adaptFromFeedback = false,
      overrideGoal, overrideCalories, overrideProtein, overrideCarbs, overrideFats,
      additionalRestrictions = [], additionalAllergies = [],
      additionalConditions = [], mealFrequency = 5,
      snackPreference = 'light', cuisineNotes = '',
      focusAreas = []
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

    const goal = overrideGoal || client.goal;
    const targetCal = overrideCalories || client.target_calories || client.tdee || 1800;
    const targetProtein = overrideProtein || client.target_protein || Math.round(client.weight * 1.6) || 120;
    const targetCarbs = overrideCarbs || client.target_carbs || Math.round((targetCal * 0.45) / 4);
    const targetFats = overrideFats || client.target_fats || Math.round((targetCal * 0.25) / 9);

    const allRestrictions = [...(client.dietary_restrictions || []), ...additionalRestrictions];
    const allAllergies = [...(clinical?.allergies || []), ...additionalAllergies];
    const allConditions = [...(clinical?.medical_conditions || []), ...additionalConditions];
    const allMeds = clinical?.current_medications || [];

    // Standard meal pattern for all clients
    const mealTypes = ['early_morning', 'breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner'];

    const progressContext = adaptFromFeedback && recentLogs.length > 0
      ? `RECENT PROGRESS (last ${recentLogs.length} logs):
${recentLogs.map(l => `  ${l.date}: weight=${l.weight || 'N/A'}kg, adherence=${l.meal_adherence || 'N/A'}%, symptoms=${l.symptoms?.join(', ') || 'none'}`).join('\n')}
Food patterns: ${recentFoodLogs.slice(0, 6).map(f => f.meal_name || f.meal_type).join(', ') || 'N/A'}
→ If adherence < 70%, simplify portions and prefer quicker meals. Avoid foods linked to reported symptoms.`
      : '';

    const mealOptions = {
      early_morning: [
        "1Liter water + 2 small lemon slices + 1 inch ginger grated + 10-12 mint leaves + 1 small cucumber slice [Mix night before]",
        "1Glass zeera water [1spoon zeera seeds overnight soaked in 1glass boiled water next morning consume, Luke warm]",
        "1Glass tulsi water [10-12 tulsi leaves boiled in 1 glass water till 1 cup consume, may add lemon for taste]",
        "30ml aloe Vera juice with 70 ml water",
        "1Glass methi water [1spoon methi seeds + 2glasses of water > boiled till 1glass overnight soaked next morning consume luke warm]",
        "1Glass Haldi water [½ Teaspoon haldi powder + ½ inch grated ginger + 1Glass Luke warm water]",
        "1Tablespoon chia seeds overnight soaked in 1glass water next morning consume",
        "1Glass dhaniya pudina water [1tea spoon dhaniya seeds + 10-12 mint leaves 2glasses of water > boiled till 1glass consume luke warm]",
        "1Glass cinnamon ginger water [pinch of cinnamon + 1Glass Luke warm water]",
        "1Glass saunf water [1spoon saunf seeds + 2glasses of water > boiled till 1glass overnight soaked next morning consume luke warm]",
        "1Glass A.C.V. [20ml apple cider vinegar + 1glass water]"
      ],
      breakfast_cereal: [
        "3 Table spoons muesli without nuts with milk",
        "3 tablespoon wheat flakes with milk without sugar",
        "Oats with milk",
        "Wheat daliya with milk"
      ],
      breakfast_poha: [
        "1Small bowl vegetable poha mix 1ice cube size paneer homemade + veggies",
        "1Small bowl vegetable poha mix 2 spoons of steam sprouts",
        "1Small bowl vegetable poha mix nutreela",
        "1medium bowl vegetable bread Poha [3:1] + green chutney"
      ],
      breakfast_nonveg: [
        "3 Eggs white mix veggies omelette or scrambled with 1whole wheat toast",
        "2-3 boiled egg white with veggies",
        "Chicken salami sandwich with g. chutney"
      ],
      breakfast_daliya: [
        "1bowl veg oats [3:1] with green chutney",
        "1bowl vegetable wheat daliya [3:1]+ g. chutney",
        "1bowl vegetable ragi daliya [3:1] + g. chutney",
        "1bowl vegetable bajra daliya [3:1] + g. chutney",
        "1bowl vegetable barley daliya [3:1] + g. chutney",
        "1bowl vegetable upma[3:1]+ g.chutney"
      ],
      breakfast_sandwich: [
        "1-2 Aata bread veg sandwich with green chutney",
        "1-2 Paneer sandwiches with green chutney",
        "1Spoon Peanut butter with chia seeds sandwich [2spoon peanut butter spread on 2slices of whole wheat bread, add strawberries slices banana slices /apple slices + sprinkle 1spoon chia seeds]",
        "1-2 Soya veg sandwich with g. chutney",
        "1-2 Aalu veg sandwich with g. chutney"
      ],
      breakfast_stuffed_roti: [
        "1-2 Veg stuffed roti [lauki + green chilli + coriander leaves]",
        "1-2 Veg stuffed roti [Spinach /methi + green chilli + onion]",
        "1-2 Veg stuffed roti [onion + green chilli + coriander leaves]",
        "1-2 Veg stuffed roti [Paneer + onion + green chilli + coriander leaves]",
        "1-2 Veg stuffed roti [Radish + coriander leaves]",
        "1-2 Veg stuffed roti [soya bean /nutreela + onion + green chilli + coriander leaves]",
        "1-2 Veg stuffed roti [carrot +onion + green chilli + coriander leaves]"
      ],
      breakfast_cheela: [
        "1-2 besan cheela veg mix with g. chutney",
        "1-2 Suji cheela veg mix with g. chutney",
        "1-2 Veg uttapam with g. chutney",
        "1-2 Ragi cheela veg mix with g. chutney",
        "1-2 Moong dal cheela veg mix with g. chutney",
        "1-2 Chana dal cheela veg mix with g. chutney"
      ],
      breakfast_chholes: [
        "1bowl steam moong sprouts mix green salad",
        "1Bowl soya bean sprouts with green salad",
        "1Bowl boiled black chana saute with lots of veggies",
        "1Bowl lobhia saute with lots of veggies"
      ],
      breakfast_smoothies: [
        "1 bowl fruit yogurt [yogurt + apple + 1spoon chia seeds]",
        "1 bowl of plain yogurt with fruit [no mango] banana once a week add 1 spoon roasted flax seeds",
        "1Bowl smoothies [1Glass milk + 2spoon oats+ 1table spoon chia seeds + ½ apple Or ½ banana > grind]",
        "1 glass APPLE shake /BANANA shake [Once a week]"
      ],
      breakfast_idli: [
        "2-3Rava idli veg stuffed with g. chutney",
        "2-3Moong dal idli veg stuffed with g. chutney",
        "2-3Besan idli veg stuffed with g. chutney",
        "2-3Oats mix rava mix veggies idli with g. chutney",
        "2-3 Fermented idli veg stuffed with g. chutney"
      ],
      midmorning: [
        "1 Seasonal fruit [150gm] > AFTER 1HOUR > 1 glass lemon shikanji",
        "1 Glass low fat buttermilk mix roasted zeera powder + 1 spoon roasted chia / flax seeds",
        "1SEASONAL FRUIT [1Apple /1Orange / Mausambi /1Bowl papaya /1pear/ 1guava/ 1 pomegranate with 2-3 drops of lemon]",
        "2 slices cucumber + 1 apple",
        "2 slices cucumber + 1 pear",
        "1 bowl papaya [2 slices of papaya with black pepper]",
        "1Pomegranate with 2-3 drops of lemon"
      ],
      lunch_base: "Daily: 1Full plate/bowl green salad (steamed / Grated Raw) + 1medium bowl of low fat buttermilk",
      lunch_roti_veg: [
        "1-2 roti bran mix / jawar + 1bowl lauki veg",
        "1-2 roti bran mix / jawar + 1bowl tori veg",
        "1-2 roti bran mix / jawar + 1bowl parwar veg",
        "1-2 roti bran mix / jawar + 1bowl bhindi veg",
        "1-2 roti bran mix / jawar + 1bowl kaddu veg",
        "1-2 roti bran mix / jawar + 1bowl Spinach veg",
        "1-2 roti bran mix / jawar + 1bowl brinjal bharta",
        "1-2 roti bran mix / jawar + 1bowl capsicum potato veg",
        "1-2 roti bran mix / jawar + 1bowl beans potato veg",
        "1-2 roti bran mix / jawar + 1bowl nutreela capsicum veg",
        "1-2 Roti bran mix / jawar + 1bowl Methi aalu veg",
        "1-2 Roti bran mix / jawar + 1bowl cauliflower aalu veg",
        "1-2 Roti bran mix / jawar + 1bowl matter mushroom veg",
        "1-2 Roti bran mix / jawar + 1bowl saag veg",
        "1-2 Roti bran mix / jawar + 1bowl paneer veg bhurji [homemade paneer]",
        "1-2 Roti bran mix / jawar + 1bowl spring onion aalu veg",
        "1-2 Roti bran mix / jawar + 1bowl beans yellow moong dal veg",
        "1-2 Roti bran mix / jawar + 1bowl carrot peas veg",
        "1-2 Roti bran mix / jawar + 1bowl mix veg",
        "1-2 Roti bran mix / jawar + 1bowl mooli bhurji",
        "1-2 Roti bran mix / jawar + 1bowl Capsicum paneer veg",
        "1-2 Roti bran mix / jawar + 1bowl brinjal potato veg",
        "1-2 Roti bran mix / jawar + 1bowl cabbage peas veg"
      ],
      lunch_dal: [
        "1-2 Roti bran mix / jawar + 1bowl yellow moong dal",
        "1-2 Roti bran mix/ jawar + 1bowl arher dal",
        "1-2 Roti bran mix / jawar + 1bowl masoor dal",
        "1-2 Roti bran mix/ jawar + 1bowl chana dal",
        "1-2 Roti bran mix / jawar / small bowl steam rice + 1bowl chhole",
        "1-2 Roti bran mix / jawar / small bowl steam rice + 1bowl black chana",
        "1-2 Roti bran mix / jawar / small bowl steam rice + 1bowl rajhma",
        "1-2 Roti bran mix / jawar / small bowl steam rice + 1bowl lobhia",
        "1-2 Roti bran mix / jawar / small bowl steam rice + 1bowl soyabean",
        "1-2 Roti bran mix / jawar /small bowl steam rice + 1bowl kadhi without pakrori",
        "1-2Roti bran mix / jawar + 1bowl gatte veg without fried"
      ],
      lunch_nonveg: [
        "1medium bowl chicken biryani [no leg pieces] homemade with low fat buttermilk",
        "1bowl fish curry with steam rice",
        "4-5 pieces of fish[steam/grilled]with grilled veggies /1-2 roti wheat /tandoori roti /buttermilk",
        "2Pieces of grilled chicken [100gm][no leg pieces] with g. chutney + buttermilk",
        "2Egg white curry with steam rice /1-2 roti bran mix"
      ],
      evening: [
        "1Cup tea / 1Cup black coffee / Black tea / Green tea / 1Cup low fat milk / 1cup low fat buttermilk",
        "One handful of Roasted chana or roasted chana mix green salad [twice-thrice a week]",
        "Dry roasted bajra puffs unsalted [twice a week]",
        "Dry roasted popcorn [twice-thrice a week]",
        "Dry roasted makhane [twice-thrice a week]",
        "1Smal bowl steam moong sprouts mix green salad [once -twice a week]",
        "Roasted wheat puffs unsalted [twice-thrice a week]",
        "1Small bowl murmura bhel with lots of vegetables [once a week]",
        "1Small bowl boiled black chana saute with veggies [once -twice a week]",
        "1Veg grilled sandwich with g. chutney [once a week]"
      ],
      dinner_soup: [
        "1Bowl mix veg soup [250ml]",
        "Tomato soup [250ml]",
        "Cabbage soup [250ml]",
        "Mushroom soup [250ml]",
        "French beans tomato soup [250ml]",
        "Broccoli peas soup [250ml]",
        "Spinach soup [250ml]",
        "Chicken soup / chicken broth [250ml]"
      ],
      dinner_base: "1BOWL SOUP[250ml] + Full bowl of green salad chopped or grated[raw/steam]"
    };

    const kbContext = buildKBSection();

    const prompt = `You are a senior clinical dietitian creating a personalized ${duration}-day meal plan. Be thorough, specific, and clinically sound.
${kbContext}

═══ CLIENT PROFILE ═══
Name: ${client.full_name} | Age: ${client.age || 'N/A'} | Gender: ${client.gender || 'N/A'}
Height: ${client.height || 'N/A'} cm | Weight: ${client.weight || 'N/A'} kg | Target: ${client.target_weight || 'N/A'} kg
BMR: ${client.bmr || 'N/A'} | TDEE: ${client.tdee || 'N/A'}
Activity: ${client.activity_level?.replace(/_/g, ' ') || 'moderately active'}

═══ GOALS & TARGETS ═══
Primary Goal: ${goal?.replace(/_/g, ' ') || 'general health'}
Focus Areas: ${focusAreas.length ? focusAreas.join(', ') : 'balanced nutrition'}
Daily Calories: ${targetCal} kcal
Protein Target: ${targetProtein}g | Carbs Target: ${targetCarbs}g | Fats Target: ${targetFats}g

═══ DIETARY PROFILE ═══
Food Preference: ${client.food_preference || 'mixed'} (STRICT - never violate this)
Regional Cuisine: ${client.regional_preference || 'all'} ${cuisineNotes ? `| Extra notes: ${cuisineNotes}` : ''}
Restrictions: ${allRestrictions.length ? allRestrictions.join(', ') : 'none'}
ALLERGIES (CRITICAL - never include): ${allAllergies.length ? allAllergies.join(', ') : 'none'}
Snack Preference: ${snackPreference}

═══ MEDICAL CONDITIONS ═══
${allConditions.length ? allConditions.map(c => `  • ${c}`).join('\n') : '  • None'}
Medications: ${allMeds.length ? allMeds.join(', ') : 'none'}
${allConditions.includes('diabetes') || allConditions.includes('type2_diabetes') ? '→ Low glycemic index foods, avoid refined sugars, monitor carb distribution' : ''}
${allConditions.includes('hypertension') ? '→ Low sodium (<1500mg/day), DASH diet principles' : ''}
${allConditions.includes('pcos') ? '→ Anti-inflammatory foods, low GI, balance hormones' : ''}
${allConditions.includes('hypothyroidism') ? '→ Include selenium, zinc; limit goitrogens in raw form' : ''}
${allConditions.includes('kidney_disease') ? '→ Strict phosphorus/potassium/sodium control' : ''}

${progressContext}

═══ INSTRUCTIONS ═══
1. Generate exactly ${duration} days × 6 meals/sections (early_morning, breakfast, mid_morning, lunch, evening_snack, dinner)
2. Each meal MUST include: name, items array, portion_sizes array (same length as items), calories, protein, carbs, fats, fiber, rationale (explain WHY this benefits this client specifically)
3. SELECT MEALS ONLY FROM THE APPROVED OPTIONS LIST provided above
4. Never repeat same main dish within 3 consecutive days
5. Daily total calories = ${targetCal} kcal (±80 kcal max) across ALL meals including herbal drink
6. Macro targets: Protein=${targetProtein}g, Carbs=${targetCarbs}g, Fats=${targetFats}g (±15%)
7. 100% Indian meals only - all options are authentic Indian cuisine
8. Post-dinner: SAME herbal beverage for all ${duration} days (no rotation)
9. Day summaries with total macros for each day
10. Nutritional strategy explaining adaptation for client's specific goal & conditions

═══ APPROVED MEAL OPTIONS (USE THESE EXCLUSIVELY) ═══
RULE 1 - USE ONLY FROM APPROVED OPTIONS LIST: All meals MUST be selected from the meal options provided below. NEVER create custom meals not in this list. Reference the mealOptions by category when generating each meal.

APPROVED MEAL CATEGORIES:
  • Early Morning (11 options): Lemon-ginger-mint water, Zeera water, Tulsi water, Aloe vera juice, Methi water, Haldi water, Chia seeds, Dhaniya pudina water, Cinnamon ginger water, Saunf water, Apple cider vinegar water
  • Breakfast (6+ categories): Cereals, Poha, Non-veg (egg white options), Daliya, Sandwich, Stuffed roti, Cheela, Chholes, Smoothies, Idli
  • Midmorning (7 options): Seasonal fruits, Buttermilk with zeera/seeds, Fruit combinations with cucumber/lemon
  • Lunch (Daily base): Green salad + low fat buttermilk + CHOOSE 1 BELOW:
    - Roti with vegetable curry (lauki, tori, bhindi, kaddu, spinach, brinjal, capsicum-potato, beans-potato, methi-aalu, cauliflower-aalu, matter-mushroom, saag, paneer bhurji, spring onion-aalu, mooli bhurji, brinjal-potato, cabbage-peas)
    - Roti with dal (yellow moong, arher, masoor, chana dal, gatte veg)
    - Rice with legumes (chhole, black chana, rajhma, lobhia, soyabean, kadhi)
    - Non-veg (chicken biryani, fish curry, grilled fish, grilled chicken, egg white curry)
  • Evening Snack (10 options): Tea/Coffee + optional snacks (roasted chana, bajra puffs, popcorn, makhane, moong sprouts, wheat puffs, murmura bhel, black chana saute, grilled sandwich)
  • Dinner (Daily base): Soup [250ml] + green salad + SAME OPTIONS AS LUNCH above

RULE 2 - MEAL SEQUENCE (STRICT — EXACT ORDER EVERY DAY):
  1. Early Morning: Choose 1 water/drink from early_morning options list
  2. Breakfast: Choose 1 option from breakfast categories (cereal, poha, non-veg, daliya, sandwich, stuffed roti, cheela, chholes, smoothies, idli)
  3. Mid Morning: Choose 1 option from midmorning options list
  4. Lunch: Green salad + low fat buttermilk (daily base) + 1 roti/dal OR 1 roti/veg OR 1 non-veg option
  5. Evening Snack: Tea/coffee + optional snack if needed (roasted chana, bajra puffs, popcorn, makhane, moong sprouts, wheat puffs, murmura bhel, black chana saute, grilled sandwich)
  6. Dinner: Soup [250ml] + green salad (daily base) + 1 roti/dal OR 1 roti/veg OR 1 non-veg option
  Present in this exact sequence. NEVER add bedtime or post-dinner meal. NO variations from this order.

RULE 3 - NO POST-DINNER MEAL: Day ends with dinner. Do NOT include post-dinner as a separate meal section. Herbal drinks can be part of evening snack or after dinner as per client preference, but NOT as a separate tracked meal.

RULE 4 - NO BEDTIME OR POST-DINNER MEAL (ABSOLUTE): 
  Day ends with dinner meal. Do NOT create "bedtime" or "post-dinner" meal sections.
  NO night milk for ANY client, especially weight loss clients.
  NO milk-based beverages after dinner.

RULE 5 - WEIGHT LOSS DIET MODIFICATIONS (goal = weight_loss):
  a) PRE-MEAL WATER: Add explicitly in lunch & dinner meals: "Drink 1 glass plain water 30 minutes before this meal"
  b) NO PALAK PANEER: Never include "palak paneer" in ANY meal for weight loss clients (from lunch_roti_veg options)
  c) NO NIGHT MILK: Strictly no milk, yogurt, or dairy after dinner for weight loss clients
  d) ALCOHOL-FREE: No wines, beers, or alcohol
  e) Light, high-protein dinners: Prefer fish curry, grilled chicken, egg white curry options

RULE 6 - NON-VEG OPTIONS (ONLY if food_preference is non_veg or eggetarian):
  DINNER (2-3 days/week max): Grilled chicken with vegetables (no masala curry). NO fried, NO heavy gravy.
  LUNCH (2-3 days/week): Chicken breast curry (light gravy, minimal oil) with roti OR grilled fish with vegetables
  BREAKFAST/EARLY MORNING: Boiled eggs, egg omelette, egg salad with vegetables, egg bhurji
  
  EGG WHITE RULE (MANDATORY): If medical conditions include "diabetes" OR "hyperlipidemia" OR "dyslipidemia" OR "high_cholesterol":
    → Use ONLY egg whites in ALL egg preparations (omelette, boiled, bhurji, curry)
    → Write "Egg White Omelette", "Boiled Egg Whites", "Egg White Bhurji with Veggies", NEVER whole egg
    → Egg whites are higher protein, lower cholesterol
  
  GRILLED FISH OPTION: Include grilled fish (2-3 days/week) in lunch/dinner for non-veg clients
  
  Keep non-veg simple: Max one non-veg protein source per day (egg OR chicken OR fish, not multiple)

RULE 7 - NO FRUITS AT NIGHT: 
  Fruits ONLY at breakfast, mid-morning, or evening snack.
  NEVER in dinner or post-dinner. No fruit juices either.

RULE 8 - RICE vs ROTI BALANCE:
  If rice (chawal) is at lunch, dinner must be roti/paratha/bajra/jowar based.
  Never rice in both lunch and dinner same day.

RULE 9 - MEAL PATTERN CONSISTENCY (CRITICAL):
  Maintain the exact sequence for all clients: Early Morning → Breakfast → Mid Morning → Lunch → Evening Snack → Dinner.
  No variations, no bedtime/post-dinner sections. This consistency helps clients build habit and maintain adherence.

RULE 10 - STRICT CALORIE COMPLIANCE: 
  Total daily calories (all meals + herbal drink) MUST NOT exceed ${targetCal} kcal
  Daily range: ${targetCal - 100} to ${targetCal} kcal
  Herbal drink = ~0-5 kcal
  Count accurately, never exceed.

Be practical, use real Indian/regional food names, realistic portions.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          plan_name: { type: "string" },
          overview: { type: "string" },
          nutritional_strategy: { type: "string" },
          daily_calorie_target: { type: "number" },
          macro_targets: {
            type: "object",
            properties: {
              protein_g: { type: "number" },
              carbs_g: { type: "number" },
              fats_g: { type: "number" },
              fiber_g: { type: "number" }
            }
          },
          key_foods_included: { type: "array", items: { type: "string" } },
          foods_avoided: { type: "array", items: { type: "string" } },
          meals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day: { type: "number" },
                meal_type: { type: "string" },
                meal_name: { type: "string" },
                suggested_time: { type: "string" },
                items: { type: "array", items: { type: "string" } },
                portion_sizes: { type: "array", items: { type: "string" } },
                calories: { type: "number" },
                protein: { type: "number" },
                carbs: { type: "number" },
                fats: { type: "number" },
                fiber: { type: "number" },
                nutritional_tip: { type: "string" },
                disease_rationale: { type: "string" },
                rationale: { type: "string" }
              }
            }
          },
          day_summaries: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day: { type: "number" },
                total_calories: { type: "number" },
                total_protein: { type: "number" },
                total_carbs: { type: "number" },
                total_fats: { type: "number" },
                notes: { type: "string" }
              }
            }
          },
          coach_notes: { type: "string" }
        }
      }
    });

    // ─── RECALCULATE NUTRITION FROM DATABASE (mathematically exact) ───
    // Fetch all recipe templates and ingredients from DB for cross-referencing
    const [allRecipes, allIngredients] = await Promise.all([
      base44.asServiceRole.entities.RecipeTemplate.list(),
      base44.asServiceRole.entities.NutritionalIngredient.list(),
    ]);

    // Build a lookup map: template_code → recipe
    const recipeMap = {};
    for (const r of allRecipes) {
      if (r.template_code) recipeMap[r.template_code.toUpperCase()] = r;
      if (r.dish_name) recipeMap[r.dish_name.toUpperCase()] = r;
    }

    // Build ingredient lookup map
    const ingredientMap = {};
    for (const ing of allIngredients) {
      ingredientMap[ing.ingredient_name.toLowerCase()] = ing;
    }

    function calcNutritionFromIngredients(ingredients) {
      let kcal = 0, protein = 0, carbs = 0, fat = 0, fibre = 0;
      for (const ing of (ingredients || [])) {
        const dbEntry = ingredientMap[ing.ingredient_name?.toLowerCase()];
        if (!dbEntry) continue;
        let grams = ing.qty || 0;
        if (ing.unit === 'ml' && dbEntry.density_g_per_ml) grams = ing.qty * dbEntry.density_g_per_ml;
        const factor = grams / 100;
        kcal    += (dbEntry.kcal_100g || 0) * factor;
        protein += (dbEntry.protein_100g || 0) * factor;
        carbs   += (dbEntry.carbs_100g || 0) * factor;
        fat     += (dbEntry.fat_100g || 0) * factor;
        fibre   += (dbEntry.fibre_100g || 0) * factor;
      }
      return { kcal, protein_g: protein, carbs_g: carbs, fat_g: fat, fibre_g: fibre };
    }

    // Enrich each AI meal with verified nutrition from DB where possible
    const enrichedMeals = aiResponse.meals.map(meal => {
      // Try to find matching recipe by meal_name
      const mealNameKey = (meal.meal_name || '').toUpperCase();
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
        };
      }

      // If no DB match, keep AI values but flag them
      return { ...meal, nutrition_source: 'ai_estimated' };
    });

    // Recalculate day summaries from enriched meals
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
      const existing = aiResponse.day_summaries?.find(s => s.day === day) || {};
      recalculatedDaySummaries.push({
        ...existing,
        day,
        total_calories: Math.round(totals.calories),
        total_protein: Math.round(totals.protein),
        total_carbs: Math.round(totals.carbs),
        total_fats: Math.round(totals.fats),
      });
    }

    // ─── BUILD KB SNAPSHOT FOR AUDIT TRAIL ───
    const kbSnapshot = knowledgeBase.map(doc => ({
      kb_id: doc.id,
      name: doc.name,
      category: doc.category,
      version_label: doc.version || '',
      version_number: doc.version_number || 1,
      ai_instruction: doc.ai_instruction || '',
      description: doc.description || '',
    }));

    // Save to DB
    const mealPlan = await base44.asServiceRole.entities.MealPlan.create({
      client_id: clientId,
      name: aiResponse.plan_name || `AI Meal Plan – ${new Date().toLocaleDateString()}`,
      duration,
      meal_pattern: 'daily',
      target_calories: aiResponse.daily_calorie_target || targetCal,
      food_preference: client.food_preference,
      regional_preference: client.regional_preference,
      meals: enrichedMeals,
      active: true,
      plan_tier: 'basic',
      kb_snapshot: kbSnapshot,
      kb_snapshot_generated_at: new Date().toISOString(),
    });

    // Notify client
    await base44.asServiceRole.entities.Notification.create({
      user_email: client.email,
      type: 'meal_plan',
      title: '🎉 New AI Meal Plan Ready!',
      message: `Your personalized ${duration}-day meal plan "${mealPlan.name}" has been created.`,
      priority: 'high',
      link: '/MyAssignedMealPlan',
      read: false,
    }).catch(() => {});

    return Response.json({
      success: true,
      mealPlan: { id: mealPlan.id, name: mealPlan.name, duration, meals: aiResponse.meals.length },
      overview: aiResponse.overview,
      nutritional_strategy: aiResponse.nutritional_strategy,
      macro_targets: aiResponse.macro_targets,
      key_foods_included: aiResponse.key_foods_included,
      foods_avoided: aiResponse.foods_avoided,
      day_summaries: recalculatedDaySummaries,
      coach_notes: aiResponse.coach_notes,
      meals: enrichedMeals,
    });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});