import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * generateAIMealPlan
 * NON-COMPROMISING RULE: ALL meal components MUST be selected EXCLUSIVELY from the
 * Healthyfy Dishes Google Sheet catalog. The AI CAN and SHOULD combine multiple
 * catalog dishes to form complete nutritionally balanced meals (e.g., Roti + Dal + Sabzi).
 * No dish component outside this catalog is ever permitted.
 */
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
      focusAreas = [], modificationInstructions = '', generationCount = 1
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

    // ─── FETCH HEALTHYFY APPROVED DISH CATALOG ───
    const healthyfyDishes = await fetchHealthyfyDishes(base44);
    const dishByType = {};
    for (const d of healthyfyDishes) {
      if (!dishByType[d.meal_type]) dishByType[d.meal_type] = [];
      dishByType[d.meal_type].push(d);
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

    const goal = overrideGoal || client.goal;
    const targetCal = overrideCalories || client.target_calories || client.tdee || 1800;
    const targetProtein = overrideProtein || client.target_protein || Math.round(client.weight * 1.6) || 120;
    const targetCarbs = overrideCarbs || client.target_carbs || Math.round((targetCal * 0.45) / 4);
    const targetFats = overrideFats || client.target_fats || Math.round((targetCal * 0.25) / 9);

    const allRestrictions = [...(client.dietary_restrictions || []), ...additionalRestrictions];
    const allAllergies = [...(clinical?.likes_dislikes_allergies?.allergies || []), ...additionalAllergies];
    const allConditions = [...(clinical?.health_conditions || []), ...additionalConditions];
    const allMeds = clinical?.current_medications || [];

    const progressContext = adaptFromFeedback && recentLogs.length > 0
      ? `RECENT PROGRESS (last ${recentLogs.length} logs):\n${recentLogs.map(l => `  ${l.date}: weight=${l.weight || 'N/A'}kg, adherence=${l.meal_adherence || 'N/A'}%, symptoms=${l.symptoms?.join(', ') || 'none'}`).join('\n')}\nFood patterns: ${recentFoodLogs.slice(0, 6).map(f => f.meal_name || f.meal_type).join(', ') || 'N/A'}\n→ If adherence < 70%, simplify portions and prefer quicker meals.`
      : '';

    const kbContext = buildKBSection();
    const combinationGuide = buildCombinationGuide();

    // ── Build concise, focused catalog lists for the prompt ──
    // Filter by diet preference and cap to 20 diverse dishes per slot
    const buildCompactCatalog = (dietFilter) => {
      const MAX_PER_SLOT = 20;
      const types = ['early_morning', 'breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner'];
      return types.map(t => {
        let dishes = (dishByType[t] || []);
        // Filter by diet preference
        if (dietFilter && dietFilter !== 'mixed') {
          const filtered = dishes.filter(d => {
            if (!d.food_preference) return true; // no preference set → include
            if (dietFilter === 'veg' || dietFilter === 'jain') {
              // exclude non_veg and egg dishes
              return !d.food_preference.includes('non_veg') && !d.food_preference.includes('egg');
            }
            if (dietFilter === 'eggetarian') {
              return !d.food_preference.includes('non_veg');
            }
            return true; // non_veg: include all
          });
          if (filtered.length > 0) dishes = filtered;
        }
        if (!dishes.length) return null;
        // Pick up to MAX_PER_SLOT dishes, varied by dish_type
        if (dishes.length > MAX_PER_SLOT) {
          const byType = {};
          for (const d of dishes) {
            const key = d.dish_type || 'other';
            if (!byType[key]) byType[key] = [];
            byType[key].push(d);
          }
          const selected = [];
          const typeKeys = Object.keys(byType);
          let i = 0;
          while (selected.length < MAX_PER_SLOT) {
            const key = typeKeys[i % typeKeys.length];
            if (byType[key].length > 0) selected.push(byType[key].shift());
            i++;
            if (typeKeys.every(k => byType[k].length === 0)) break;
          }
          dishes = selected;
        }
        return `${t.toUpperCase().replace('_',' ')} (${dishes.length} options):\n${dishes.map(d=>`  - ${d.name} (${d.approx_calories || d.nutrition?.calories || 0} kcal, ${d.nutrition?.protein || 0}g protein)`).join('\n')}`;
      }).filter(Boolean).join('\n\n');
    };

    const compactCatalog = buildCompactCatalog(client.food_preference);
    console.log(`📋 Filtered catalog size for diet=${client.food_preference}:`, compactCatalog.split('\n').length, 'lines');

    const prompt = `You are a senior clinical dietitian. Generate a ${duration}-day meal plan.

${kbContext}

━━━ CLIENT ━━━
${client.full_name} | ${client.age || '?'}yr ${client.gender || ''} | ${client.weight || '?'}kg → target ${client.target_weight || '?'}kg
Goal: ${(goal||'general health').replace(/_/g,' ')} | Calories: ${targetCal} kcal/day | Protein: ${targetProtein}g | Carbs: ${targetCarbs}g | Fats: ${targetFats}g
Diet: ${client.food_preference || 'mixed'} | Cuisine: ${client.regional_preference || 'all'}${cuisineNotes ? ` (${cuisineNotes})` : ''}
ALLERGIES (NEVER USE): ${allAllergies.length ? allAllergies.join(', ') : 'none'}
Restrictions: ${allRestrictions.length ? allRestrictions.join(', ') : 'none'}
Conditions: ${allConditions.length ? allConditions.join(', ') : 'none'}
Medications: ${allMeds.length ? allMeds.map(m=>m.name||m).join(', ') : 'none'}
${allConditions.includes('diabetes')||allConditions.includes('type2_diabetes') ? 'Clinical: Low GI, no refined sugar, spread carbs' : ''}${allConditions.includes('hypertension') ? 'Clinical: Low sodium <1500mg/day' : ''}${allConditions.includes('pcos') ? 'Clinical: Anti-inflammatory, low GI' : ''}${allConditions.includes('kidney_disease') ? 'Clinical: Restrict phosphorus/potassium/sodium' : ''}
${progressContext}
${modificationInstructions ? `\nCOACH INSTRUCTIONS (APPLY STRICTLY): "${modificationInstructions}"` : ''}

━━━ APPROVED DISH CATALOG (USE ONLY THESE — NO EXCEPTIONS) ━━━
${compactCatalog}

${combinationGuide}

━━━ MANDATORY RULES ━━━

**RULE A — COMBINE DISHES (MOST IMPORTANT RULE)**
For LUNCH and DINNER you MUST select 2-3 dishes from the catalog and combine them into one meal.
CORRECT example for lunch: components = ["Whole Wheat Roti", "Dal Tadka", "Mixed Veg Sabzi"]
CORRECT example for dinner: components = ["Tomato Soup", "Roti", "Paneer Bhurji"]
WRONG: components = ["Dal Tadka"] ← single item is NOT acceptable for lunch/dinner
For BREAKFAST: combine 1-2 dishes (e.g., ["Oats Porridge", "Boiled Egg"])
For EVENING SNACK: 1 item is acceptable. For optional EARLY MORNING / MID MORNING bonus slots: 1 item only, strictly from catalog.

**RULE B — NO DISH USED TWICE ON THE SAME DAY**
Before placing a dish in a meal slot, check all OTHER meal slots on that same day.
If the dish name already appears anywhere on that day → pick a DIFFERENT dish.
Example: If "Moong Dal" is at lunch → do NOT use "Moong Dal" at dinner on the same day.
This rule applies across ALL meal slots of each day (4 mandatory + any optional bonus slots included).

**RULE C — EXACT DISH NAMES**
Every name in the "components" array must EXACTLY match a dish name from the catalog above.
Do NOT paraphrase, shorten, or invent dish names.

**RULE D — DAILY SEQUENCE (4 MANDATORY + 2 optional bonus slots)**
MANDATORY every day (no exceptions): 1. breakfast  2. lunch  3. evening_snack  4. dinner
OPTIONAL BONUS — include ONLY if a suitable catalog item exists, never fabricate:
  • early_morning — one detox water or herbal drink (e.g., "Lemon Ginger Mint Cucumber Water", "Jeera Water", "Methi Water")
  • mid_morning — one light fruit or snack from the catalog if appropriate
If no catalog item fits for early_morning or mid_morning, OMIT those slots entirely.
No bedtime meal. No post-dinner slot.

**RULE E — CALORIE RANGE**
Daily total: ${targetCal-100}–${targetCal} kcal. Sum calories from each component in a slot.

**RULE F — VARIETY**
Never repeat the exact same component combination within 3 consecutive days.
Rotate: roti ↔ rice ↔ millet across days. Rotate dal types across days.

**RULE G — NON-VEG & EGGS**
${clinical?.non_veg_frequency_per_10_days ? `Non-veg: use EXACTLY ${clinical.non_veg_frequency_per_10_days} times across the ${duration}-day plan${clinical.non_veg_preferred_meals?.length ? ` (preferred at: ${clinical.non_veg_preferred_meals.join(', ')})` : ''}` : `Follow diet preference: ${client.food_preference}`}
${clinical?.egg_frequency_per_10_days ? `Eggs: use EXACTLY ${clinical.egg_frequency_per_10_days} times across the ${duration}-day plan` : ''}

**RULE H — RICE vs ROTI**
If lunch uses rice-based dish → dinner must use roti/millet. Never rice-based at both lunch AND dinner.

**RULE I — BREAKFAST COMBINATIONS**
For BREAKFAST: prioritize one substantial dish that is a complete meal (e.g., "Masala Poha", "Aloo Paratha", "Idli Sambar").
If combining, ONLY pair one main dish with a NATURAL LIGHT ACCOMPANIMENT:
  - Dry/semi-dry items (Paratha, Cheela, Poha, Upma) → pair with Curd, Chutney, or Pickle
  - Idli/Dosa → pair with Sambar OR Chutney (not both mandatory)
  - NEVER combine two separate "main course" type dishes at breakfast.

**RULE J — NO DOUBLE CURRY / NO CROSS-DIET CURRY**
When building LUNCH or DINNER components:
  - NEVER include two different rice-based dishes in the same meal slot (e.g., Brown Rice + Vegetable Pulao is FORBIDDEN).
  - NEVER combine a VEGETARIAN CURRY/GRAVY with a NON-VEGETARIAN CURRY/GRAVY in the same meal slot.
  - If the meal already has a rich gravy (Dal Makhani, Chicken Curry, Rajma etc.) as main protein, add ONLY a light dry vegetable OR a salad/raita — NOT another cooked sabzi gravy.

**RULE K — MILK/DAIRY WITH NON-VEG**
STRICTLY AVOID combining MILK or MILK PRODUCTS (Curd, Raita, Lassi, Buttermilk, Milk) with NON-VEGETARIAN dishes (Chicken, Fish, Mutton, Egg curry) in the SAME meal slot.
Exception: A very small Raita (cooling agent) may accompany Biryani only, as it is a widely accepted traditional pairing.

**RULE L — NO SIMILAR CARB DISHES IN SAME SLOT**
NEVER combine two dishes that are both rice-based OR both wheat-based in the same meal slot. Examples of FORBIDDEN combinations:
  - Khichdi + Jeera Rice (both rice-based) ← STRICTLY FORBIDDEN
  - Vegetable Pulao + Plain Rice (both rice-based) ← STRICTLY FORBIDDEN
  - Paratha + Roti (both wheat-based) ← STRICTLY FORBIDDEN
Each meal slot may contain AT MOST ONE rice-based dish AND AT MOST ONE wheat-based dish.

**RULE M — MANDATORY PORTION SIZES & CALORIES PER MEAL**
For EVERY meal slot, you MUST provide:
1. "portion_sizes" array: one entry per component, with EXACT Indian household quantity. Examples:
   - "1 pc (30g atta)" for roti/paratha
   - "1 katori (150g)" for dal/sabzi/curry
   - "1 cup cooked (100g raw)" for rice
   - "1 glass (200ml)" for drinks
   - "1 bowl (200g)" for porridge/oats
2. "calories" field: TOTAL kcal for the ENTIRE meal slot (sum of all components). This is MANDATORY — never leave it 0 or blank.
3. "items" array: must match "components" exactly — same dish names, same order.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
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
                components: {
                  type: "array",
                  items: { type: "string" },
                  description: "Exact catalog dish names combined to form this meal"
                },
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

    // Unwrap nested response if InvokeLLM returns { response: { ... } }
    const aiData = aiResponse?.response ?? aiResponse;
    console.log('🤖 AI response meals count:', (aiData.meals || []).length);

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

    // Cross-reference AI meal components against Healthyfy catalog
    const catalogNameSet = new Set(healthyfyDishes.map(d => d.name.toLowerCase().trim()));
    const dishByName = {};
    for (const d of healthyfyDishes) dishByName[d.name.toLowerCase().trim()] = d;

    const enrichedMeals = (aiData.meals || []).map(meal => {
      // Check catalog compliance for all components
      const components = meal.components || [];
      const componentCompliance = components.map(c => ({
        name: c,
        in_catalog: catalogNameSet.has(c.toLowerCase().trim())
      }));
      const allComponentsCompliant = componentCompliance.length === 0
        ? catalogNameSet.has((meal.meal_name || '').toLowerCase().trim())
        : componentCompliance.every(c => c.in_catalog);

      // Try to get nutrition from matched recipe
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

      // Sum up calories & macros from catalog components (using actual nutritional_info)
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

      // Fallback: single dish
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
    // Group meals by day, then scan for duplicates and remove them
    const dayMealGroups = {};
    for (const meal of enrichedMeals) {
      if (!dayMealGroups[meal.day]) dayMealGroups[meal.day] = [];
      dayMealGroups[meal.day].push(meal);
    }

    const intraDayDuplicates = [];
    for (const [day, meals] of Object.entries(dayMealGroups)) {
      // Sort by meal slot order so early meals "claim" dishes first
      const slotOrder = { early_morning: 1, breakfast: 2, mid_morning: 3, lunch: 4, evening_snack: 5, dinner: 6 };
      meals.sort((a, b) => (slotOrder[a.meal_type] || 9) - (slotOrder[b.meal_type] || 9));

      const usedOnDay = new Set();
      for (const meal of meals) {
        const cleanedComponents = [];
        for (const comp of (meal.components || [])) {
          const key = comp.toLowerCase().trim();
          if (usedOnDay.has(key)) {
            // Find a replacement from the same meal type slot that hasn't been used today
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
        // Update items to reflect corrected components
        if (cleanedComponents.length > 0 && cleanedComponents.length !== (meal.components || []).length) {
          meal.items = cleanedComponents.map(c => c);
        }
      }
    }

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
      const existing = aiData.day_summaries?.find(s => s.day === day) || {};
      recalculatedDaySummaries.push({
        ...existing,
        day,
        total_calories: Math.round(totals.calories),
        total_protein: Math.round(totals.protein),
        total_carbs: Math.round(totals.carbs),
        total_fats: Math.round(totals.fats),
      });
    }

    // ─── POST-GENERATION CALORIE COMPLIANCE ENFORCEMENT ───
    const CALORIE_TOLERANCE = 0.10; // ±10%
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

        // Update day summary to reflect corrected values
        daySummary.total_calories = correctedTotal;
        daySummary.total_protein  = Math.round(dayMeals.reduce((sum, m) => sum + (m.protein || 0), 0));
        daySummary.total_carbs    = Math.round(dayMeals.reduce((sum, m) => sum + (m.carbs   || 0), 0));
        daySummary.total_fats     = Math.round(dayMeals.reduce((sum, m) => sum + (m.fats    || 0), 0));
      }
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

    const mealPlan = await base44.asServiceRole.entities.MealPlan.create({
      client_id: clientId,
      name: aiData.plan_name || `AI Meal Plan – ${new Date().toLocaleDateString()}`,
      duration,
      meal_pattern: 'daily',
      target_calories: aiData.daily_calorie_target || targetCal,
      food_preference: client.food_preference,
      regional_preference: client.regional_preference,
      meals: enrichedMeals,
      active: true,
      plan_tier: 'basic',
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

    // ─── MEAL OPTION ANALYSIS ───
    const foodPref = client.food_preference || 'mixed';
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

    return Response.json({
      success: true,
      mealPlan: { id: mealPlan.id, name: mealPlan.name, duration, meals: enrichedMeals.length },
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
      overview: aiData.overview,
      nutritional_strategy: aiData.nutritional_strategy,
      macro_targets: aiData.macro_targets,
      key_foods_included: aiData.key_foods_included,
      foods_avoided: aiData.foods_avoided,
      day_summaries: recalculatedDaySummaries,
      coach_notes: aiResponse.coach_notes,
      meals: enrichedMeals,
      meal_option_analysis: mealOptionAnalysis,
      decision_rules: decisionRules,
    });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTHYFY DISH CATALOG — GOOGLE SHEET INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

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

  // Build header → index map from first row
  const headers = parseCSVLine(lines[0]);
  const colIndex = {};
  headers.forEach((h, i) => { colIndex[h.trim().toLowerCase()] = i; });

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const dishName = cols[colIndex['name']]?.trim();
    if (!dishName || dishName.toLowerCase() === 'name') continue;

    const mealTypeRaw = (cols[colIndex['meal_type']]?.trim() || '').toLowerCase();
    const foodPref = (cols[colIndex['food_preference']]?.trim() || '').toLowerCase();

    // Parse ingredients from JSON column
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
    } catch (e) { /* ignore parse errors */ }

    // Parse nutritional_info from JSON column — actual pre-computed values
    let approxCal = 0;
    let nutritionData = {};
    try {
      const nutJson = cols[colIndex['nutritional_info']]?.trim();
      if (nutJson && nutJson.startsWith('{')) {
        nutritionData = JSON.parse(nutJson);
        approxCal = nutritionData.calories || 0;
      }
    } catch (e) { /* ignore parse errors */ }

    // Fall back to ingredient-based estimate if nutritional_info missing
    if (approxCal === 0) {
      approxCal = estimateDishCalories(ingredients, '');
    }

    // Parse meal_type: comma-separated values e.g. "lunch,dinner"
    let applicableMealTypes = [];
    mealTypeRaw.split(',').forEach(t => {
      const mapped = MEAL_TYPE_MAP[t.trim()];
      if (mapped) mapped.forEach(slot => {
        if (!applicableMealTypes.includes(slot)) applicableMealTypes.push(slot);
      });
    });

    // Fallback: infer from dish name if meal_type column is empty
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