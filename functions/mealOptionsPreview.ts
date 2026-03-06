import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      clientId,
      additionalRestrictions = [],
      additionalAllergies = [],
      additionalConditions = [],
      overrideGoal,
      overrideCalories,
      overrideProtein,
      overrideCarbs,
      overrideFats,
      focusAreas = [],
      cuisineNotes = '',
    } = body;

    if (!clientId) return Response.json({ error: 'Client ID required' }, { status: 400 });

    const [clientArr, clinicalArr] = await Promise.all([
      base44.asServiceRole.entities.Client.filter({ id: clientId }),
      base44.asServiceRole.entities.ClinicalIntake.filter({ client_id: clientId }),
    ]);

    const client = clientArr[0];
    if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });

    const clinical = clinicalArr[0];

    const goal = overrideGoal || client.goal;
    const targetCal = overrideCalories || client.target_calories || client.tdee || 1800;
    const targetProtein = overrideProtein || client.target_protein || Math.round((client.weight || 70) * 1.6);
    const targetCarbs = overrideCarbs || client.target_carbs || Math.round((targetCal * 0.45) / 4);
    const targetFats = overrideFats || client.target_fats || Math.round((targetCal * 0.25) / 9);

    const allRestrictions = [...(client.dietary_restrictions || []), ...additionalRestrictions];
    const allAllergies = [...(clinical?.likes_dislikes_allergies?.allergies || []), ...additionalAllergies];

    const foodPref = client.food_preference || 'mixed';
    const isVeg = ['veg', 'jain'].includes(foodPref);
    const isEggetarian = foodPref === 'eggetarian';
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
        if (r.includes('gluten') && (optLower.includes('roti') || optLower.includes('bread') || optLower.includes('wheat') || optLower.includes('suji') || optLower.includes('daliya'))) return 'Restriction: gluten-free';
        if (r.includes('jain') && (optLower.includes('onion') || optLower.includes('garlic') || optLower.includes('aalu') || optLower.includes('potato') || optLower.includes('carrot') || optLower.includes('radish'))) return 'Jain diet: no root vegetables/onion/garlic';
      }
      if (isJain && (optLower.includes('onion') || optLower.includes('garlic') || optLower.includes('aalu') || optLower.includes('potato') || optLower.includes('carrot') || optLower.includes('radish') || optLower.includes('mooli'))) {
        return 'Jain diet: root vegetables/onion/garlic excluded';
      }
      return null;
    }

    function isNonVeg(option) {
      const optLower = option.toLowerCase();
      return optLower.includes('chicken') || optLower.includes('fish') || optLower.includes('mutton') || optLower.includes('meat') || optLower.includes('prawn') || optLower.includes('shrimp');
    }
    function isEgg(option) {
      return option.toLowerCase().includes('egg');
    }

    function getDietExclusionReason(option) {
      if (isNonVeg(option)) {
        if (isVeg) return `Diet preference: ${foodPref} (non-veg excluded)`;
        if (isEggetarian) return `Diet preference: eggetarian (non-veg excluded)`;
      }
      if (isEgg(option)) {
        if (isVeg && !isEggetarian) return `Diet preference: ${foodPref} (eggs excluded)`;
        if (isJain) return `Diet preference: jain (eggs excluded)`;
      }
      return null;
    }

    const mealOptions = {
      early_morning: [
        "1Liter water + 2 small lemon slices + 1 inch ginger grated + 10-12 mint leaves + 1 small cucumber slice [Mix night before]",
        "1Glass zeera water",
        "1Glass tulsi water",
        "30ml aloe Vera juice with 70 ml water",
        "1Glass methi water",
        "1Glass Haldi water",
        "1Tablespoon chia seeds overnight soaked in 1glass water",
        "1Glass dhaniya pudina water",
        "1Glass cinnamon ginger water",
        "1Glass saunf water",
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
        "1Spoon Peanut butter with chia seeds sandwich",
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
        "1 bowl of plain yogurt with fruit [no mango]",
        "1Bowl smoothies [1Glass milk + 2spoon oats + 1table spoon chia seeds + ½ apple Or ½ banana]",
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
        "1 SEASONAL FRUIT [1Apple /1Orange / Mausambi /1Bowl papaya /1pear/ 1guava/ 1 pomegranate with 2-3 drops of lemon]",
        "2 slices cucumber + 1 apple",
        "2 slices cucumber + 1 pear",
        "1 bowl papaya [2 slices of papaya with black pepper]",
        "1Pomegranate with 2-3 drops of lemon"
      ],
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
        "1-2 Roti bran mix / jawar + 1bowl paneer veg bhurji",
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
        "4-5 pieces of fish[steam/grilled]with grilled veggies /1-2 roti",
        "2Pieces of grilled chicken [100gm] with g. chutney + buttermilk",
        "2Egg white curry with steam rice /1-2 roti bran mix"
      ],
      evening: [
        "1Cup tea / 1Cup black coffee / Green tea / 1Cup low fat milk / 1cup low fat buttermilk",
        "One handful of Roasted chana or roasted chana mix green salad",
        "Dry roasted bajra puffs unsalted",
        "Dry roasted popcorn",
        "Dry roasted makhane",
        "1Small bowl steam moong sprouts mix green salad",
        "Roasted wheat puffs unsalted",
        "1Small bowl murmura bhel with lots of vegetables",
        "1Small bowl boiled black chana saute with veggies",
        "1Veg grilled sandwich with g. chutney"
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
    };

    function analyzeCategory(label, options) {
      const available = [];
      const excluded = [];
      for (const opt of options) {
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

    const mealOptionAnalysis = [
      analyzeCategory('Early Morning Drinks', mealOptions.early_morning),
      analyzeCategory('Breakfast: Cereals', mealOptions.breakfast_cereal),
      analyzeCategory('Breakfast: Poha', mealOptions.breakfast_poha),
      analyzeCategory('Breakfast: Non-Veg / Eggs', mealOptions.breakfast_nonveg),
      analyzeCategory('Breakfast: Daliya', mealOptions.breakfast_daliya),
      analyzeCategory('Breakfast: Sandwich', mealOptions.breakfast_sandwich),
      analyzeCategory('Breakfast: Stuffed Roti', mealOptions.breakfast_stuffed_roti),
      analyzeCategory('Breakfast: Cheela', mealOptions.breakfast_cheela),
      analyzeCategory('Breakfast: Chholes / Sprouts', mealOptions.breakfast_chholes),
      analyzeCategory('Breakfast: Smoothies', mealOptions.breakfast_smoothies),
      analyzeCategory('Breakfast: Idli', mealOptions.breakfast_idli),
      analyzeCategory('Mid Morning Snacks', mealOptions.midmorning),
      analyzeCategory('Lunch: Roti + Veg', mealOptions.lunch_roti_veg),
      analyzeCategory('Lunch: Dal Options', mealOptions.lunch_dal),
      analyzeCategory('Lunch: Non-Veg', mealOptions.lunch_nonveg),
      analyzeCategory('Evening Snacks', mealOptions.evening),
      analyzeCategory('Dinner: Soups', mealOptions.dinner_soup),
    ];

    const allConditions = [...(clinical?.health_conditions || []), ...additionalConditions];

    const decisionRules = [
      { rule: `Daily calorie target: ${targetCal} kcal (BMR: ${client.bmr || 'N/A'}, TDEE: ${client.tdee || 'N/A'}, Goal: ${(goal || client.goal || 'N/A').replace(/_/g, ' ')})`, category: 'Calorie Target' },
      { rule: `Macros: Protein ~${targetProtein}g | Carbs ~${targetCarbs}g | Fats ~${targetFats}g`, category: 'Macros' },
      { rule: `Diet type: ${foodPref.charAt(0).toUpperCase() + foodPref.slice(1)} — Meal options selected accordingly`, category: 'Diet Type' },
      ...(allConditions.length > 0 ? allConditions.map(c => ({ rule: `${c}: Applied clinical dietary rules for this condition`, category: 'Medical Condition' })) : []),
      ...(allAllergies.length > 0 ? [{ rule: `Allergies strictly avoided: ${allAllergies.join(', ')}`, category: 'Allergy' }] : []),
      ...(allRestrictions.length > 0 ? [{ rule: `Dietary restrictions applied: ${allRestrictions.join(', ')}`, category: 'Restriction' }] : []),
      ...(focusAreas.length > 0 ? [{ rule: `Nutrition focus areas: ${focusAreas.join(', ')}`, category: 'Focus' }] : []),
      ...(cuisineNotes ? [{ rule: `Cuisine notes: ${cuisineNotes}`, category: 'Cuisine' }] : []),
    ];

    return Response.json({
      success: true,
      decision_rules: decisionRules,
      meal_option_analysis: mealOptionAnalysis,
      food_preference: foodPref,
      client_name: client.full_name,
    });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});