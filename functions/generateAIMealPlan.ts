import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * generateAIMealPlan
 * NON-COMPROMISING RULE: ALL meals MUST be selected EXCLUSIVELY from the
 * Healthyfy Dishes Google Sheet catalog. This rule applies to ALL users:
 * Super Admin, Student Coaches, Team Members — no exceptions.
 * The AI is strictly instructed never to invent or generate meals outside this catalog.
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
    // NON-COMPROMISING RULE: All meals MUST come exclusively from this catalog
    const healthyfyDishes = await fetchHealthyfyDishes();
    const dishByType = {};
    for (const d of healthyfyDishes) {
      if (!dishByType[d.meal_type]) dishByType[d.meal_type] = [];
      dishByType[d.meal_type].push(d);
    }
    const listDishes = (type) => (dishByType[type] || []).map(d => `  • ${d.name}`).join('\n') || '  (none available)';
    const countDishes = (type) => (dishByType[type] || []).length;

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

    const prompt = `You are a senior clinical dietitian creating a personalized ${duration}-day meal plan.
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
Medications: ${allMeds.length ? allMeds.map(m => m.name || m).join(', ') : 'none'}
${allConditions.includes('diabetes') || allConditions.includes('type2_diabetes') ? '→ Low glycemic index foods, avoid refined sugars, monitor carb distribution' : ''}
${allConditions.includes('hypertension') ? '→ Low sodium (<1500mg/day), DASH diet principles' : ''}
${allConditions.includes('pcos') ? '→ Anti-inflammatory foods, low GI, balance hormones' : ''}
${allConditions.includes('hypothyroidism') ? '→ Include selenium, zinc; limit goitrogens in raw form' : ''}
${allConditions.includes('kidney_disease') ? '→ Strict phosphorus/potassium/sodium control' : ''}

${progressContext}

═══ APPROVED MEAL OPTIONS — HEALTHYFY CATALOG (NON-COMPROMISING RULE) ═══
⚠️  ABSOLUTE RULE: You MUST ONLY select meals from the list below.
⚠️  This is the official Healthyfy approved dish catalog — sourced from the master Google Sheet.
⚠️  You are STRICTLY PROHIBITED from creating, inventing, or using ANY meal not in this exact list.
⚠️  If a client restriction eliminates all options for a slot, use the closest available option from this list.
⚠️  NEVER generate a meal outside this catalog under ANY circumstances.

EARLY MORNING — Choose exactly 1 (${countDishes('early_morning')} options):
${listDishes('early_morning')}

BREAKFAST — Choose exactly 1 (${countDishes('breakfast')} options):
${listDishes('breakfast')}

MID MORNING — Choose exactly 1 (${countDishes('mid_morning')} options):
${listDishes('mid_morning')}

LUNCH — (Daily base: green salad + low fat buttermilk) Choose exactly 1 (${countDishes('lunch')} options):
${listDishes('lunch')}

EVENING SNACK — Choose exactly 1 (${countDishes('evening_snack')} options):
${listDishes('evening_snack')}

DINNER — (Daily base: soup + green salad) Choose exactly 1 (${countDishes('dinner')} options):
${listDishes('dinner')}

═══ RULES (FOLLOW ALL — STRICTLY) ═══
RULE 1 — CATALOG COMPLIANCE (ABSOLUTE):
  Use ONLY the dishes listed above. Every meal_name in your response must match exactly one of the names above.
  Never add extra words, combine dishes, or create a dish not listed.

RULE 2 — MEAL SEQUENCE (STRICT — EXACT ORDER EVERY DAY):
  1. early_morning → 2. breakfast → 3. mid_morning → 4. lunch → 5. evening_snack → 6. dinner
  Never add bedtime or post-dinner meal. Day ends with dinner.

RULE 3 — CALORIE COMPLIANCE:
  Total daily calories MUST NOT exceed ${targetCal} kcal. Range: ${targetCal - 100} to ${targetCal} kcal.

RULE 4 — VARIETY:
  Never repeat the same main dish within 3 consecutive days.

RULE 5 — NO POST-DINNER/BEDTIME MEAL: Day ends with dinner. No night milk.

RULE 6 — NON-VEG & EGG FREQUENCY:
${clinical?.non_veg_frequency_per_10_days ? `  • Non-veg meals: EXACTLY ${clinical.non_veg_frequency_per_10_days} times in the ${duration}-day plan` : '  • Non-veg: per diet preference'}
${clinical?.non_veg_preferred_meals?.length ? `  • Non-veg preferred at: ${clinical.non_veg_preferred_meals.join(', ')}` : ''}
${clinical?.egg_frequency_per_10_days ? `  • Egg meals: EXACTLY ${clinical.egg_frequency_per_10_days} times in the ${duration}-day plan` : ''}
${clinical?.egg_preferred_meals?.length ? `  • Eggs preferred at: ${clinical.egg_preferred_meals.join(', ')}` : ''}

RULE 7 — NO FRUITS AT NIGHT: Fruits only at breakfast, mid-morning, or evening snack. Never dinner/post-dinner.

RULE 8 — RICE vs ROTI BALANCE: If rice at lunch, dinner must be roti/millet based. Never rice in both.

RULE 9 — WEIGHT LOSS (if goal = weight_loss):
  Add "Drink 1 glass water 30 min before meal" in lunch & dinner. No night milk. Light high-protein dinners.

RULE 10 — MACROS: Protein=${targetProtein}g | Carbs=${targetCarbs}g | Fats=${targetFats}g (±15%).
${modificationInstructions ? `\n═══ COACH MODIFICATION INSTRUCTIONS (APPLY STRICTLY) ═══\n"${modificationInstructions}"\nApply ONLY these changes while keeping all rules intact.` : ''}`;

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

    // Cross-reference AI meal names against Healthyfy catalog for compliance audit
    const catalogNameSet = new Set(healthyfyDishes.map(d => d.name.toLowerCase().trim()));
    const dishByName = {};
    for (const d of healthyfyDishes) dishByName[d.name.toLowerCase().trim()] = d;

    const enrichedMeals = (aiResponse.meals || []).map(meal => {
      const mealNameKey = (meal.meal_name || '').toUpperCase();
      const mealNameLower = (meal.meal_name || '').toLowerCase().trim();
      const matchedRecipe = recipeMap[mealNameKey];

      // Check catalog compliance
      const inCatalog = catalogNameSet.has(mealNameLower);
      const catalogDish = dishByName[mealNameLower];

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
          catalog_compliant: inCatalog,
        };
      }

      // If catalog dish found, use its estimated calories as a baseline
      if (catalogDish && (!meal.calories || meal.calories === 0)) {
        return { ...meal, calories: catalogDish.approx_calories || meal.calories, nutrition_source: 'catalog_estimated', catalog_compliant: true };
      }

      return { ...meal, nutrition_source: 'ai_estimated', catalog_compliant: inCatalog };
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
      generation_parameters: {
        duration, target_calories: targetCal, target_protein: targetProtein, target_carbs: targetCarbs, target_fats: targetFats,
        goal: goal || client.goal, food_preference: client.food_preference, regional_preference: client.regional_preference,
        snack_preference: snackPreference, meal_frequency: mealFrequency, cuisine_notes: cuisineNotes,
        adapt_from_feedback: adaptFromFeedback, override_goal: overrideGoal || null, focus_areas: focusAreas,
        additional_restrictions: additionalRestrictions, additional_allergies: additionalAllergies,
        additional_conditions: additionalConditions, modification_instructions: modificationInstructions || null,
        generation_count: generationCount, catalog_source: 'healthyfy_google_sheet', total_catalog_dishes: healthyfyDishes.length,
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

    // ─── MEAL OPTION ANALYSIS — FROM HEALTHYFY CATALOG ───
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

    // Build analysis from Healthyfy catalog grouped by meal type
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

    const targetCal2 = overrideCalories || client.target_calories || client.tdee || 1800;
    const decisionRules = [
      { rule: `🔒 NON-COMPROMISING RULE: All dishes sourced exclusively from Healthyfy Google Sheet catalog (${healthyfyDishes.length} total dishes)`, category: 'Dish Source' },
      { rule: `Daily calorie target: ${targetCal2} kcal (BMR: ${client.bmr || 'N/A'}, TDEE: ${client.tdee || 'N/A'}, Goal: ${(goal || client.goal || 'N/A').replace(/_/g,' ')})`, category: 'Calorie Target' },
      { rule: `Macros: Protein ~${targetProtein}g | Carbs ~${targetCarbs}g | Fats ~${targetFats}g`, category: 'Macros' },
      { rule: `Diet type: ${foodPref.charAt(0).toUpperCase() + foodPref.slice(1)} — Meal options selected accordingly`, category: 'Diet Type' },
      ...(allConditions.length > 0 ? allConditions.map(c => ({ rule: `${c}: Applied clinical dietary rules for this condition`, category: 'Medical Condition' })) : []),
      ...(allAllergies.length > 0 ? [{ rule: `Allergies strictly avoided: ${allAllergies.join(', ')}`, category: 'Allergy' }] : []),
      ...(allRestrictions.length > 0 ? [{ rule: `Dietary restrictions applied: ${allRestrictions.join(', ')}`, category: 'Restriction' }] : []),
      ...(focusAreas.length > 0 ? [{ rule: `Nutrition focus areas: ${focusAreas.join(', ')}`, category: 'Focus' }] : []),
      ...(cuisineNotes ? [{ rule: `Cuisine notes: ${cuisineNotes}`, category: 'Cuisine' }] : []),
    ];

    // Catalog compliance audit
    const nonCompliantMeals = enrichedMeals.filter(m => !m.catalog_compliant);

    return Response.json({
      success: true,
      mealPlan: { id: mealPlan.id, name: mealPlan.name, duration, meals: enrichedMeals.length },
      catalog_source: 'healthyfy_google_sheet',
      total_catalog_dishes: healthyfyDishes.length,
      catalog_compliance: {
        total_meals: enrichedMeals.length,
        compliant_meals: enrichedMeals.length - nonCompliantMeals.length,
        non_compliant_meals: nonCompliantMeals.map(m => ({ day: m.day, meal_type: m.meal_type, meal_name: m.meal_name })),
      },
      overview: aiResponse.overview,
      nutritional_strategy: aiResponse.nutritional_strategy,
      macro_targets: aiResponse.macro_targets,
      key_foods_included: aiResponse.key_foods_included,
      foods_avoided: aiResponse.foods_avoided,
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
// NON-COMPROMISING RULE: This is the ONLY source of dishes for ALL meal plans.
// Applies to: Super Admin, Student Coaches, Team Members — NO exceptions.
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
  // NON-COMPROMISING RULE: If Google Sheet is unavailable, FAIL HARD. No fallback. No AI invention.
  const resp = await fetch(HEALTHYFY_SHEET_CSV);
  if (!resp.ok) throw new Error(`HEALTHYFY CATALOG UNAVAILABLE: Google Sheet returned HTTP ${resp.status}. Cannot proceed without the official dish catalog.`);
  const text = await resp.text();
  const dishes = parseHealthyfyCSV(text);
  if (dishes.length === 0) throw new Error('HEALTHYFY CATALOG EMPTY: Google Sheet returned 0 dishes. Cannot generate meal plan.');
  console.log(`✅ Healthyfy catalog loaded: ${dishes.length} dishes from Google Sheet`);
  return dishes;
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

  // NON-COMPROMISING RULE: ONLY dishes from Google Sheet. No hardcoded additions.
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