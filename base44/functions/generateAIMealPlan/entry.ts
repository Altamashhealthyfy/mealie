import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      clientId,
      clinicalIntakeId,
      modificationInstructions,
      numDays = 10,
      overrideGoal,
      overrideDietType,
      overrideCalories,
      // Legacy params still accepted for backwards compat from MealPlanningWorkflow
      duration: rawDuration,
      calorieTarget,
      dietType,
      condition,
      additionalConditions = [],
    } = body;

    if (!clientId) return Response.json({ error: 'Client ID required' }, { status: 400 });

    // ─── STEP 1: Read client and clinical intake ───
    const days = numDays || rawDuration || 10;
    const [clientArr, intakeArr] = await Promise.all([
      base44.asServiceRole.entities.Client.filter({ id: clientId }),
      clinicalIntakeId
        ? base44.asServiceRole.entities.ClinicalIntake.filter({ id: clinicalIntakeId })
        : base44.asServiceRole.entities.ClinicalIntake.filter({ client_id: clientId, is_latest: true }),
    ]);
    const client = clientArr[0];
    if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });
    // Use is_latest record; fall back to most recent by date if none flagged
    const intake = intakeArr?.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0] || null;

    // ─── STEP 2: Resolve plan parameters ───
    const dietTypeRaw = overrideDietType || dietType || intake?.diet_type || client.food_preference || 'veg';
    const resolvedDiet = dietTypeRaw.toLowerCase().replace(/[\s-]/g, '_');
    const targetCal = parseInt(overrideCalories) || parseInt(calorieTarget) || parseInt(intake?.target_calories) || client.target_calories || 1500;
    const conditions = [...new Set([
      ...(intake?.health_conditions || []),
      ...(condition ? [condition] : []),
      ...additionalConditions,
    ])];
    const medications = intake?.current_medications || [];
    const labValues = intake?.lab_values || {};
    const likesRaw = intake?.likes_dislikes_allergies?.likes || '';
    const dislikesRaw = intake?.likes_dislikes_allergies?.dislikes || '';
    const allergiesRaw = intake?.likes_dislikes_allergies?.allergies || [];
    const likes = Array.isArray(likesRaw) ? likesRaw.join(', ') : String(likesRaw || '');
    const dislikes = Array.isArray(dislikesRaw) ? dislikesRaw.join(', ') : String(dislikesRaw || '');
    const allergies = Array.isArray(allergiesRaw) ? allergiesRaw.join(', ') : String(allergiesRaw || '');
    const coachRules = modificationInstructions || intake?.additional_rules || intake?.dietitian_remarks || '';
    const goal = overrideGoal || intake?.goal?.[0] || client.goal || 'general_health';

    console.log(`📌 Params → cal:${targetCal} diet:${resolvedDiet} conditions:[${conditions.join(',')}] days:${days}`);

    // ─── STEP 3: Calculate slot calorie targets ───
    const slotTargets = {
      early_morning:  Math.round(targetCal * 0.06),
      breakfast:      Math.round(targetCal * 0.22),
      mid_morning:    Math.round(targetCal * 0.09),
      lunch_grain:    Math.round(targetCal * 0.12),
      lunch_dal:      Math.round(targetCal * 0.12),
      lunch_sabzi:    Math.round(targetCal * 0.09),
      snack:          Math.round(targetCal * 0.08),
      dinner_grain:   Math.round(targetCal * 0.10),
      dinner_prot:    Math.round(targetCal * 0.10),
      dinner_sabzi:   Math.round(targetCal * 0.02),
    };

    // ─── STEP 4: Load and filter DishCatalog ───
    const allDishes = await base44.asServiceRole.entities.DishCatalog.filter({ status: 'verified' });
    console.log(`📋 DishCatalog loaded: ${allDishes.length} verified dishes`);

    // Diet eligibility map
    const dietMap = {
      jain:       ['all'],
      veg:        ['all', 'veg'],
      eggetarian: ['all', 'veg', 'egg'],
      non_veg:    ['all', 'veg', 'egg', 'non_veg'],
    };
    const eligibleTypes = dietMap[resolvedDiet] || ['all', 'veg'];
    let filtered = allDishes.filter(d => eligibleTypes.includes(d.diet_type));

    // Disease filters
    const conditionsLower = conditions.map(c => c.toLowerCase());
    const hasThyroid  = conditionsLower.some(c => c.includes('thyroid'));
    const hasDiabetes = conditionsLower.some(c => c.includes('diabet'));
    const hasKidney   = conditionsLower.some(c => c.includes('kidney'));
    const hasHP       = conditionsLower.some(c => c.includes('hypertension') || c.includes(' bp'));

    if (hasDiabetes) {
      const removeIds = [15, 22, 23, 42, 48, 82];
      filtered = filtered.filter(d => !removeIds.includes(d.dish_id));
    }
    if (hasThyroid) {
      filtered = filtered.filter(d => !d.name.toLowerCase().includes('soy'));
    }
    if (hasKidney) {
      const removeIds = [54, 55, 65];
      filtered = filtered.filter(d => !removeIds.includes(d.dish_id));
    }
    if (hasHP) {
      const removeIds = [55, 29];
      filtered = filtered.filter(d => !removeIds.includes(d.dish_id));
    }

    // Remove disliked foods
    if (dislikes) {
      const dislikeWords = dislikes.toLowerCase().split(/[,،\n]+/).map(s => s.trim()).filter(s => s.length > 3);
      filtered = filtered.filter(d => !dislikeWords.some(w => d.name.toLowerCase().includes(w)));
    }

    // Remove allergy foods
    if (allergies) {
      const allergyWords = allergies.toLowerCase().split(/[,،\n]+/).map(s => s.trim()).filter(s => s.length > 3);
      filtered = filtered.filter(d => !allergyWords.some(w => d.name.toLowerCase().includes(w)));
    }

    // Group by slot
    const bySlot = {};
    for (const d of filtered) {
      if (!bySlot[d.slot]) bySlot[d.slot] = [];
      bySlot[d.slot].push(d);
    }

    const slotCounts = Object.fromEntries(Object.entries(bySlot).map(([k, v]) => [k, v.length]));
    console.log('📊 Dishes per slot after filtering:', JSON.stringify(slotCounts));

    // ─── STEP 5: Build dish name lists for Claude ───
    const slotList = (slot) => (bySlot[slot] || []).map(d => `${d.dish_id}:${d.name}`).join(' | ');

    const callStartTime = Date.now();

    const systemPrompt = `You are HMRE — Healthyfy Meal Rule Engine. Generate exactly 5 meal plan templates (A,B,C,D,E) using ONLY dishes from the provided lists.

RULES — follow strictly:
1. Pick ONE dish per slot per template from the lists below
2. Each template must use DIFFERENT dishes from other templates
3. Same dish can appear in max 2 templates only
4. Rotate grains: each template must use a different grain
5. Rotate proteins: each template must use a different dal or protein
6. No dairy + non-veg in same template meal
7. Dinner grain must be DIFFERENT from lunch grain in same template
8. Lunch sabzi and dinner sabzi must be DIFFERENT in same template
9. Non-veg only at lunch_dal or dinner_prot slots — never early_morning or snack
${hasDiabetes ? '10. DIABETES: Prefer low GI dishes. Include karela max 2 templates. Include methi in at least 1 template.' : ''}
${hasThyroid ? '10. THYROID: Include mushroom or egg dishes for selenium. No soy anywhere.' : ''}
${hasHP ? '10. HYPERTENSION: Avoid high sodium dishes. Prefer light sabzi.' : ''}

Return ONLY valid JSON — no explanation, no markdown:
{
  "A": {"early_morning":"ID:Name","breakfast":"ID:Name","mid_morning":"ID:Name","lunch_grain":"ID:Name","lunch_dal":"ID:Name","lunch_sabzi":"ID:Name","snack":"ID:Name","dinner_grain":"ID:Name","dinner_prot":"ID:Name","dinner_sabzi":"ID:Name"},
  "B": { same structure },
  "C": { same structure },
  "D": { same structure },
  "E": { same structure },
  "mpess": {"sleep":"...","stress":"...","movement":"...","mindfulness":"...","pranayam":"..."}
}`;

    const userPrompt = `Client: ${client.full_name || client.name}
Diet: ${resolvedDiet} | Target: ${targetCal} kcal | Goal: ${goal}
Conditions: ${conditions.join(', ') || 'None'}
Medications: ${medications.map(m => m.name || m.medicine_name || m).filter(Boolean).join(', ') || 'None'}
Likes: ${likes} | Dislikes: ${dislikes} | Allergies: ${allergies}
Coach rules: ${coachRules || 'None'}

AVAILABLE DISHES BY SLOT:
EARLY MORNING: ${slotList('early_morning')}
BREAKFAST: ${slotList('breakfast')}
MID MORNING: ${slotList('mid_morning')}
LUNCH GRAIN: ${slotList('lunch_grain')}
LUNCH DAL/PROTEIN: ${slotList('lunch_dal')}
LUNCH SABZI: ${slotList('lunch_sabzi')}
SNACK: ${slotList('snack')}
DINNER GRAIN: ${slotList('dinner_grain')}
DINNER PROTEIN: ${slotList('dinner_prot')}
DINNER SABZI: ${slotList('lunch_sabzi')}

Generate 5 templates and MPESS for ${conditions.join('+')||'general health'} client.`;

    console.log('📤 Sending to Claude Haiku...');

    // ─── STEP 6: Call Claude ───
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('CLAUDE'),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    const claudeData = await claudeResponse.json();
    const callDurationMs = Date.now() - callStartTime;

    if (claudeData.error) throw new Error('Claude API: ' + claudeData.error.message);

    const promptTokens = claudeData.usage?.input_tokens || 0;
    const completionTokens = claudeData.usage?.output_tokens || 0;
    const estimatedCost = (promptTokens * 0.80 + completionTokens * 4) / 1_000_000;

    const rawText = claudeData.content?.[0]?.text || '';
    const cleanText = rawText.replace(/```json|```/g, '').trim();

    let parsed;
    try { parsed = JSON.parse(cleanText); }
    catch(e) { throw new Error('Claude returned invalid JSON: ' + rawText.slice(0, 300)); }

    console.log(`✅ Templates received: ${Object.keys(parsed).filter(k => k.length === 1).join(',')}`);

    // ─── STEP 7: Build catalog lookup map ───
    const catalogMap = {};
    for (const d of allDishes) {
      catalogMap[d.dish_id] = d;
      catalogMap[d.name.toLowerCase()] = d;
    }

    // ─── STEP 8: Pick best portion size per slot ───
    function getBestPortion(dish, slotTarget) {
      if (!dish) return { label: 'standard', kcal: dish?.calories || 0 };
      const options = [
        { label: dish.small_label,  kcal: dish.small_kcal  || dish.calories },
        { label: dish.medium_label, kcal: dish.medium_kcal || dish.calories },
        { label: dish.large_label,  kcal: dish.large_kcal  || dish.calories },
      ];
      return options.reduce((best, opt) =>
        Math.abs((opt.kcal || 0) - slotTarget) < Math.abs((best.kcal || 0) - slotTarget) ? opt : best
      );
    }

    // ─── STEP 9: Resolve dish from Claude's response ───
    function resolveDish(value) {
      if (!value) return null;
      const idMatch = value.match(/^(\d+):/);
      if (idMatch) return catalogMap[parseInt(idMatch[1])] || null;
      return catalogMap[value.toLowerCase()] || null;
    }

    // ─── STEP 10: Smart random rotation ───
    function generateRotation(numDaysArg, numTemplates = 5) {
      const templates = ['A','B','C','D','E'].slice(0, numTemplates);
      const rotation = [];
      const usage = {};
      templates.forEach(t => usage[t] = 0);
      for (let i = 0; i < numDaysArg; i++) {
        const recent = rotation.slice(-2);
        const available = templates.filter(t => !recent.includes(t));
        available.sort((a, b) => usage[a] - usage[b]);
        const pool = available.slice(0, Math.max(2, Math.ceil(available.length / 2)));
        const picked = pool[Math.floor(Math.random() * pool.length)];
        rotation.push(picked);
        usage[picked]++;
      }
      return rotation;
    }

    const templateKeys = Object.keys(parsed).filter(k => k.length === 1 && k >= 'A' && k <= 'E');
    const rotation = generateRotation(days, templateKeys.length);

    // ─── STEP 11: Build all meals with catalog macros ───
    const SLOTS = [
      'early_morning','breakfast','mid_morning',
      'lunch_grain','lunch_dal','lunch_sabzi',
      'snack','dinner_grain','dinner_prot','dinner_sabzi',
    ];
    const slotMealType = {
      early_morning: 'early_morning', breakfast: 'breakfast',
      mid_morning: 'mid_morning', lunch_grain: 'lunch',
      lunch_dal: 'lunch', lunch_sabzi: 'lunch',
      snack: 'evening_snack', dinner_grain: 'dinner',
      dinner_prot: 'dinner', dinner_sabzi: 'dinner',
    };

    const allMeals = [];
    let nonVegCount = 0;
    let eggCount = 0;

    for (let day = 1; day <= days; day++) {
      const tmplKey = rotation[day - 1];
      const tmpl = parsed[tmplKey];
      if (!tmpl) continue;

      const dayMeals = {};

      for (const subSlot of SLOTS) {
        const dish = resolveDish(tmpl[subSlot]);
        if (!dish) continue;

        const slotTarget = slotTargets[subSlot] || 100;
        const portion = getBestPortion(dish, slotTarget);
        const mealType = slotMealType[subSlot];
        const ratio = dish.calories > 0 ? (portion.kcal / dish.calories) : 1;

        if (!dayMeals[mealType]) {
          dayMeals[mealType] = { day, meal_type: mealType, components: [], total_calories: 0, total_protein: 0, total_carbs: 0, total_fats: 0 };
        }

        dayMeals[mealType].components.push({
          dish_name: dish.name,
          portion_label: portion.label || 'standard',
          calories: portion.kcal || 0,
          protein: Math.round((dish.protein || 0) * ratio * 10) / 10,
          carbs:   Math.round((dish.carbs   || 0) * ratio * 10) / 10,
          fats:    Math.round((dish.fats    || 0) * ratio * 10) / 10,
          notes: dish.notes || '',
        });

        dayMeals[mealType].total_calories += portion.kcal || 0;
        dayMeals[mealType].total_protein  += Math.round((dish.protein || 0) * ratio * 10) / 10;
        dayMeals[mealType].total_carbs    += Math.round((dish.carbs   || 0) * ratio * 10) / 10;
        dayMeals[mealType].total_fats     += Math.round((dish.fats    || 0) * ratio * 10) / 10;

        if (dish.diet_type === 'non_veg') nonVegCount++;
        if (dish.diet_type === 'egg') eggCount++;
      }

      for (const [mealType, mealData] of Object.entries(dayMeals)) {
        const mealName = mealData.components.map(c => c.dish_name).join(' + ');
        const portionStr = mealData.components.map(c => c.portion_label).join(' | ');
        allMeals.push({
          day: mealData.day,
          meal_type: mealType,
          meal_name: mealName,
          items: mealData.components.map(c => c.dish_name),
          portion_sizes: mealData.components.map(c => c.portion_label),
          calories: Math.round(mealData.total_calories),
          protein: Math.round(mealData.total_protein * 10) / 10,
          carbs:   Math.round(mealData.total_carbs   * 10) / 10,
          fats:    Math.round(mealData.total_fats    * 10) / 10,
          notes: mealData.components.map(c => c.notes).filter(Boolean).join(' | '),
          macro_source: 'catalog',
        });
      }
    }

    console.log(`✅ Built ${allMeals.length} meal entries for ${days} days`);
    if (allMeals.length === 0) throw new Error('Plan generation produced 0 meals.');

    // ─── STEP 12: Build MPESS ───
    const mpessData = parsed.mpess || {};
    const mpess = Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      sleep:       mpessData.sleep       || '',
      stress:      mpessData.stress      || '',
      movement:    mpessData.movement    || '',
      mindfulness: mpessData.mindfulness || '',
      pranayam:    mpessData.pranayam    || '',
    }));

    // ─── STEP 13: Build plan name with IST ───
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    const istDay = String(istTime.getUTCDate()).padStart(2, '0');
    const istMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const istMonth = istMonths[istTime.getUTCMonth()];
    const istYear = istTime.getUTCFullYear();
    let istHours = istTime.getUTCHours();
    const istMinutes = String(istTime.getUTCMinutes()).padStart(2, '0');
    const istAmPm = istHours >= 12 ? 'PM' : 'AM';
    istHours = istHours % 12 || 12;
    const timeStr = `${String(istHours).padStart(2,'0')}:${istMinutes} ${istAmPm}`;
    const planName = `${client.full_name || client.name} — ${conditions.join('+')||'General'} Plan (${days} Days) | ${istDay} ${istMonth} ${istYear} ${timeStr} IST`;

    // ─── STEP 14: Save plan ───
    const mealPlan = await base44.asServiceRole.entities.MealPlan.create({
      client_id: clientId,
      name: planName,
      duration: days,
      food_preference: resolvedDiet,
      target_calories: targetCal,
      disease_focus: conditions,
      meals: allMeals,
      mpess: mpess,
      active: false,
      plan_tier: 'advanced',
      generation_parameters: {
        duration: days,
        target_calories: targetCal,
        goal,
        food_preference: resolvedDiet,
        modification_instructions: coachRules || null,
        generation_count: 1,
        macro_source: 'catalog',
        rotation_used: rotation.join(','),
        templates_used: templateKeys.join(','),
      },
    });

    // Notify client
    await base44.asServiceRole.entities.Notification.create({
      user_email: client.email,
      type: 'meal_plan',
      title: '🎉 New AI Meal Plan Ready!',
      message: `Your personalized ${days}-day meal plan has been created.`,
      priority: 'high',
      link: '/MyAssignedMealPlan',
      read: false,
    }).catch(() => {});

    // Log AI call
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
      prompt_summary: userPrompt.slice(0, 500),
      response_summary: rawText.slice(0, 500),
      context_metadata: {
        duration_days: days,
        calorie_target: targetCal,
        diet_type: resolvedDiet,
        conditions,
        catalog_dishes_count: allDishes.length,
        templates_used: templateKeys.join(','),
      },
    }).catch(e => console.warn('AICallLog write failed:', e.message));

    console.log('✅ Plan saved:', { name: planName, days, meals: allMeals.length, non_veg: nonVegCount, eggs: eggCount, rotation: rotation.join(',') });

    return Response.json({
      success: true,
      mealPlan: { id: mealPlan.id, name: planName },
      plan_id: mealPlan.id,
      plan_name: planName,
      total_meals: allMeals.length,
      non_veg_count: nonVegCount,
      egg_count: eggCount,
      rotation: rotation.join(','),
      templates_used: templateKeys.join(','),
      macro_source: 'catalog',
      meals: allMeals,
      mpess: mpess,
      // Legacy fields for MealPlanningWorkflow frontend
      overview: `Catalog-based ${days}-day plan for ${conditions.join('+')||'general health'}.`,
      calorie_compliance_audit: { target_calories: targetCal },
      decision_rules: conditions.map(c => ({ rule: `Applied clinical rules for ${c}`, category: 'Medical Condition' })),
      conversationContext: { originalPrompt: userPrompt, assistantResponse: rawText },
    });

  } catch (err) {
    console.error('💥 generateAIMealPlan error:', err.message, err.stack);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});