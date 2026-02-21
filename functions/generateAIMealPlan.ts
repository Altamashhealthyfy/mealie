import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      clientId, duration = 7, adaptFromFeedback = false,
      // Override / extra params from the form
      overrideGoal, overrideCalories, overrideProtein, overrideCarbs, overrideFats,
      additionalRestrictions = [], additionalAllergies = [],
      additionalConditions = [], mealFrequency = 5,
      snackPreference = 'light', cuisineNotes = '',
      focusAreas = []
    } = body;

    if (!clientId) return Response.json({ error: 'Client ID required' }, { status: 400 });

    const [clientArr, progressArr, clinicalArr, foodLogsArr] = await Promise.all([
      base44.asServiceRole.entities.Client.filter({ id: clientId }),
      base44.asServiceRole.entities.ProgressLog.filter({ client_id: clientId }),
      base44.asServiceRole.entities.ClinicalIntake.filter({ client_id: clientId }),
      base44.asServiceRole.entities.FoodLog.filter({ client_id: clientId }),
    ]);

    const client = clientArr[0];
    if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });

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

    // Always use full pattern for all clients now
    const mealTypes = ['early_morning', 'breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner', 'post_dinner'];

    const progressContext = adaptFromFeedback && recentLogs.length > 0
      ? `RECENT PROGRESS (last ${recentLogs.length} logs):
${recentLogs.map(l => `  ${l.date}: weight=${l.weight || 'N/A'}kg, adherence=${l.meal_adherence || 'N/A'}%, symptoms=${l.symptoms?.join(', ') || 'none'}`).join('\n')}
Food patterns: ${recentFoodLogs.slice(0, 6).map(f => f.meal_name || f.meal_type).join(', ') || 'N/A'}
→ If adherence < 70%, simplify portions and prefer quicker meals. Avoid foods linked to reported symptoms.`
      : '';

    const prompt = `You are a senior clinical dietitian creating a personalized ${duration}-day meal plan. Be thorough, specific, and clinically sound.

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
1. Generate exactly ${duration} days × 7 meals/sections (early_morning, breakfast, mid_morning, lunch, evening_snack, dinner, post_dinner)
2. Each meal MUST include: name, items array, portion_sizes array (same length as items), calories, protein, carbs, fats, fiber, rationale (explain WHY this benefits this client specifically)
3. Never repeat same main dish within 3 consecutive days
4. Daily total calories = ${targetCal} kcal (±80 kcal max) across ALL meals including herbal drink
5. Macro targets: Protein=${targetProtein}g, Carbs=${targetCarbs}g, Fats=${targetFats}g (±15%)
6. 100% Indian meals only. Use authentic Indian food names
7. Post-dinner: SAME herbal beverage for all ${duration} days (important for consistency)
8. Day summaries with total macros for each day
9. Nutritional strategy explaining adaptation for client's specific goal & conditions

═══ STRICT MEAL RULES (NEVER VIOLATE) ═══
RULE 1 - 100% INDIAN MEALS ONLY: All meals must be 100% traditional Indian cuisine. NO continental, fusion, or non-Indian dishes. Use only Indian ingredients and cooking styles.

RULE 2 - MEAL SEQUENCE (STRICT — EXACT ORDER EVERY DAY):
  1. Early Morning: Detox drink (warm lemon water, methi water, ajwain water, etc.)
  2. Breakfast
  3. Mid Morning (light snack)
  4. Lunch
  5. Evening Snack
  6. Dinner
  7. Post Dinner: ONE herbal drink ONLY
  Present in this exact sequence. NEVER reorder or add bedtime meal.

RULE 3 - POST DINNER BEVERAGES (WEIGHT LOSS & ALL CLIENTS):
  ALLOWED post-dinner options ONLY:
  - Saunf Water (Fennel Seed Water)
  - Ajwain Water (Carom Seed Water)
  - Turmeric Water (Haldi Water)
  - Hing Water (Asafoetida Water)
  - Ginger Water (no milk, no sugar)
  - Chamomile Tea (unsweetened)
  FORBIDDEN: NO green juice, NO milk-based drinks, NO smoothies, NO fruits, NO food.
  CRITICAL: Use the SAME post-dinner option for ALL ${duration} days. NO rotation or variation.
  This is the ONLY item after dinner — nothing more.

RULE 4 - NO BEDTIME MEAL (ABSOLUTE): 
  Do NOT create "bedtime" meal type. Day ends with post-dinner herbal drink.
  NO night milk for ANY client, especially weight loss clients.
  NO milk-based beverages after dinner.

RULE 5 - WEIGHT LOSS DIET MODIFICATIONS (goal = weight_loss):
  a) PRE-MEAL WATER: Add explicitly in lunch & dinner meals: "Drink 1 glass plain water 30 minutes before this meal"
  b) NO PALAK PANEER: Never include palak paneer in ANY meal for weight loss clients (dinner especially)
  c) NO NIGHT MILK: Strictly no milk, yogurt, or dairy after dinner for weight loss clients
  d) NO MILK POST-DINNER: Only herbal water drinks post-dinner (saunf/ajwain/turmeric/hing/ginger/chamomile)
  e) ALCOHOL-FREE: No wines, beers, or alcohol
  f) Light, high-protein dinners only

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

RULE 9 - POST DINNER CONSISTENCY (CRITICAL):
  ALWAYS use the SAME post-dinner beverage for ALL ${duration} days without any variation or rotation.
  This consistency helps clients build habit and maintain adherence.

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

    // Save to DB
    const mealPlan = await base44.asServiceRole.entities.MealPlan.create({
      client_id: clientId,
      name: aiResponse.plan_name || `AI Meal Plan – ${new Date().toLocaleDateString()}`,
      duration,
      meal_pattern: 'daily',
      target_calories: aiResponse.daily_calorie_target || targetCal,
      food_preference: client.food_preference,
      regional_preference: client.regional_preference,
      meals: aiResponse.meals,
      active: true,
      plan_tier: 'basic',
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
      day_summaries: aiResponse.day_summaries,
      coach_notes: aiResponse.coach_notes,
      meals: aiResponse.meals,
    });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});