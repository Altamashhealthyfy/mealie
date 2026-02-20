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

    const mealTypes = mealFrequency === 3
      ? ['breakfast', 'lunch', 'dinner']
      : mealFrequency === 4
        ? ['breakfast', 'lunch', 'evening_snack', 'dinner']
        : ['breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner'];

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
1. Generate exactly ${duration} days × ${mealTypes.length} meals (${mealTypes.join(', ')})
2. Each meal must include: name, items array, portion_sizes array (same length as items), calories, protein_g, carbs_g, fats_g, fiber_g, rationale (1-2 sentences explaining WHY this food choice benefits THIS client)
3. Never repeat the same main dish within 3 consecutive days
4. Ensure daily totals stay within ±100 kcal of ${targetCal}
5. Macro distribution should match targets (±15%)
6. Include traditional/regional foods appropriate to preference
7. Provide day-level summaries with total macros
8. Provide an overall plan overview explaining the nutritional strategy
9. Include specific meal timing suggestions based on typical Indian daily routine

═══ STRICT MEAL RULES (NEVER VIOLATE) ═══
RULE 1 - RICE vs ROTI BALANCE: All meals must be 100% Indian. If rice (chawal) is given at lunch, then dinner must NOT include rice — give roti, paratha, bajra roti, jowar roti, or any other grain/bread alternative instead. Never give rice in both lunch and dinner on the same day.
RULE 2 - MID MORNING MEAL: If the meal plan includes 'mid_morning', skip it entirely for any client whose lunch time is at 12:00 PM or earlier. Mid morning is only relevant if there is a gap of at least 3 hours between breakfast and lunch.
RULE 3 - POST DINNER — ONE HERBAL DRINK ONLY: After dinner, include EXACTLY ONE herbal drink. Pick only ONE per day (do not list multiple). Choose from:
  - "Saunf Water (Fennel Seed Water)"
  - "Ginger Tea (Adrak Ki Chai — no milk)"
  - "Ajwain Water (Carom Seed Water)"
  - "Hing Water (Asafoetida Water)"
  - "Chamomile Tea"
  Rotate which one you pick across days. NEVER include milk, haldi doodh, smoothies, juices, or any food after dinner. NO BEDTIME MEAL — remove it entirely. The herbal drink is the final item of the day.
RULE 4 - NO FRUITS AT NIGHT: NEVER include any fruits (e.g. banana, apple, papaya, mango, orange, etc.) in dinner or post-dinner. Fruits are ONLY allowed at breakfast, mid-morning, or evening snack.
RULE 5 - NO BEDTIME MEAL (ABSOLUTE): There is NO bedtime section. Do NOT create a "bedtime" meal type. Do NOT include milk at night. The day ends with Post Dinner herbal drink (RULE 3) — nothing after that.
RULE 6 - NON-VEG OPTIONS (apply ONLY if food_preference is non_veg or eggetarian):
  - DINNER: ONLY grilled or baked chicken with sautéed/steamed vegetables. NO fried chicken, NO heavy curries at dinner. Keep light and protein-forward for weight loss.
  - LUNCH: ONLY chicken breast curry (light gravy, minimal oil) with roti or rice. Not heavy masala versions.
  - BREAKFAST/MID-MORNING: ONLY egg curry, 2-egg omelette, egg salad, or chicken salad. These are the ONLY allowed non-veg breakfast options.
  - EGG RULE (CRITICAL — NEVER IGNORE): If the client has Diabetes OR High Cholesterol (any of: high_cholesterol, hyperlipidemia, dyslipidemia) in their medical conditions, use ONLY EGG WHITES in all egg preparations. Write "Egg White Omelette", "Egg White Bhurji" etc. — NEVER whole egg.
  - Keep non-veg simple: max one non-veg protein source per day (either egg OR chicken, not both on same day).
  - If food_preference is veg or jain, completely ignore this rule — no non-veg at all.
RULE 7 - MEAL ORDER & SEQUENCE (STRICT — NEVER REORDER): Present meals in this EXACT sequence every day:
  1. Early Morning (e.g. warm lemon water, methi water, detox water)
  2. Breakfast
  3. Mid Morning (only if applicable per RULE 2)
  4. Lunch
  5. Evening Snack
  6. Dinner
  7. Post Dinner (ONE herbal drink only — per RULE 3)
  Never reverse, never skip the sequence. Always top-to-bottom in this order.
RULE 8 - PRE-MEAL WATER FOR WEIGHT LOSS: If client goal is weight_loss, add this note explicitly in the lunch AND dinner meal_name or disease_rationale: "Drink 1 glass of plain water 30 minutes before this meal." This helps with portion control and satiety.
RULE 9 - STRICT CALORIE COMPLIANCE: The total calories for ALL meals in a single day MUST NOT exceed the target of ${targetCal} kcal. Count every item's calories accurately including the herbal drink (which is ~0-5 kcal). Daily total must stay within ${targetCal - 100} to ${targetCal} kcal. Never go above ${targetCal} kcal.

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