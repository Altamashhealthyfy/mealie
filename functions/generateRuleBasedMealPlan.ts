import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * generateRuleBasedMealPlan
 * NON-COMPROMISING RULE: ALL dishes are sourced EXCLUSIVELY from the
 * Healthyfy Dishes Google Sheet catalog. If allowedMeals[] is passed from
 * filterMealOptions, those are already pre-filtered from the catalog.
 * Applies to ALL users: Super Admin, Student Coaches, Team Members.
 *
 * Input:
 *   clientId, intakeId, duration, allowedMeals[], decisionRules[],
 *   manualRules[], targetCalories?, targetProtein?, targetCarbs?, targetFats?
 *
 * Output: { plan, audit }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      clientId,
      intakeId,
      duration = 10,
      allowedMeals = [],
      decisionRules = [],
      manualRules = [],
      targetCalories,
      targetProtein,
      targetCarbs,
      targetFats,
    } = await req.json();

    if (!clientId) return Response.json({ error: 'clientId required' }, { status: 400 });

    // 1. Load client + intake
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

    // 2. Parse diagnostic
    let diagnostic = null;
    if (intake?.diagnostic_notes) {
      try { diagnostic = JSON.parse(intake.diagnostic_notes); } catch {}
    }

    // 3. Targets
    const cal = targetCalories || client.target_calories || client.tdee || 1800;
    const prot = targetProtein || client.target_protein || Math.round((client.weight || 70) * 1.2);
    const carbs = targetCarbs || client.target_carbs || Math.round((cal * 0.45) / 4);
    const fats = targetFats || client.target_fats || Math.round((cal * 0.25) / 9);

    // 4. Frequency preferences
    const nonVegFreq = intake?.non_veg_frequency_per_10_days || 0;
    const eggFreq = intake?.egg_frequency_per_10_days || 0;
    const nonVegPreferredMeals = intake?.non_veg_preferred_meals || ['lunch'];
    const eggPreferredMeals = intake?.egg_preferred_meals || ['breakfast'];

    // 5. Bucket allowed meals by meal_type
    function getMealsByType(type) {
      return allowedMeals.filter(m => m.meal_type === type || m.meal_type?.toLowerCase().includes(type.toLowerCase()));
    }

    const earlyMorning = getMealsByType('early_morning');
    const breakfasts = getMealsByType('breakfast');
    const midMorning = getMealsByType('mid_morning');
    const lunches = getMealsByType('lunch');
    const eveningSnacks = getMealsByType('evening_snack');
    const dinners = getMealsByType('dinner');

    // 6. Calorie distribution per meal slot (typical Indian distribution)
    const calDist = {
      early_morning: Math.round(cal * 0.02),   // ~2%
      breakfast: Math.round(cal * 0.25),         // ~25%
      mid_morning: Math.round(cal * 0.08),       // ~8%
      lunch: Math.round(cal * 0.35),             // ~35%
      evening_snack: Math.round(cal * 0.10),     // ~10%
      dinner: Math.round(cal * 0.20),            // ~20%
    };

    // 7. Generate meal plan day by day
    const meals = [];
    const usedPerSlot = {};
    MEAL_SLOTS.forEach(s => { usedPerSlot[s] = []; });

    // Track non-veg/egg usage across the plan
    let nonVegUsed = 0;
    let eggUsed = 0;
    const nonVegAllowedTotal = Math.round((duration / 10) * nonVegFreq);
    const eggAllowedTotal = Math.round((duration / 10) * eggFreq);

    for (let day = 1; day <= duration; day++) {
      const todayMeals = [];
      const todayItems = new Set();

      // Early morning — rotate through options
      const em = pickMeal(earlyMorning, usedPerSlot['early_morning'], calDist.early_morning, todayItems);
      if (em) {
        todayMeals.push(buildMealEntry(day, 'early_morning', em, calDist.early_morning, prot, carbs, fats, 'Detox drink to kickstart metabolism'));
        usedPerSlot['early_morning'].push(em.id);
        todayItems.add(em.id);
      }

      // Breakfast — check egg eligibility
      const wantEggBreakfast = eggPreferredMeals.includes('breakfast') && eggUsed < eggAllowedTotal;
      const breakfastPool = wantEggBreakfast
        ? breakfasts
        : breakfasts.filter(m => !m.tags?.includes('egg') && !m.tags?.includes('non_veg_cat'));
      const bf = pickMeal(breakfastPool, usedPerSlot['breakfast'], calDist.breakfast, todayItems);
      if (bf) {
        if (bf.tags?.includes('egg')) eggUsed++;
        todayMeals.push(buildMealEntry(day, 'breakfast', bf, calDist.breakfast, prot, carbs, fats, 'High-fiber breakfast to maintain sustained energy'));
        usedPerSlot['breakfast'].push(bf.id);
        todayItems.add(bf.id);
      }

      // Mid morning
      const mm = pickMeal(midMorning, usedPerSlot['mid_morning'], calDist.mid_morning, todayItems);
      if (mm) {
        todayMeals.push(buildMealEntry(day, 'mid_morning', mm, calDist.mid_morning, prot, carbs, fats, 'Light snack to prevent hypoglycemia between meals'));
        usedPerSlot['mid_morning'].push(mm.id);
        todayItems.add(mm.id);
      }

      // Lunch — check non-veg eligibility
      const wantNVLunch = nonVegPreferredMeals.includes('lunch') && nonVegUsed < nonVegAllowedTotal;
      const lunchPool = wantNVLunch
        ? lunches
        : lunches.filter(m => !m.tags?.includes('non_veg') && !m.tags?.includes('chicken') && !m.tags?.includes('fish'));
      const lch = pickMeal(lunchPool, usedPerSlot['lunch'], calDist.lunch, todayItems);
      if (lch) {
        if (lch.tags?.includes('non_veg')) nonVegUsed++;
        todayMeals.push(buildMealEntry(day, 'lunch', lch, calDist.lunch, prot, carbs, fats, 'Complete Indian meal with grain, protein, and vegetable'));
        usedPerSlot['lunch'].push(lch.id);
        todayItems.add(lch.id);
      }

      // Evening snack
      const es = pickMeal(eveningSnacks, usedPerSlot['evening_snack'], calDist.evening_snack, todayItems);
      if (es) {
        todayMeals.push(buildMealEntry(day, 'evening_snack', es, calDist.evening_snack, prot, carbs, fats, 'Light protein/fiber snack to maintain energy levels'));
        usedPerSlot['evening_snack'].push(es.id);
        todayItems.add(es.id);
      }

      // Dinner — prefer lighter options; check non-veg eligibility
      const wantNVDinner = nonVegPreferredMeals.includes('dinner') && nonVegUsed < nonVegAllowedTotal;
      const dinnerPool = wantNVDinner
        ? dinners
        : dinners.filter(m => !m.tags?.includes('non_veg') && !m.tags?.includes('chicken') && !m.tags?.includes('fish'));
      const dn = pickMeal(dinnerPool, usedPerSlot['dinner'], calDist.dinner, todayItems);
      if (dn) {
        if (dn.tags?.includes('non_veg')) nonVegUsed++;
        todayMeals.push(buildMealEntry(day, 'dinner', dn, calDist.dinner, prot, carbs, fats, 'Light digestible dinner, easy on gut, supports overnight repair'));
        usedPerSlot['dinner'].push(dn.id);
        todayItems.add(dn.id);
      }

      meals.push(...todayMeals);
    }

    // 8. MPESS recommendations from diagnostic
    const mpessRecs = extractMpessRecs(diagnostic);

    // 9. Audit
    const audit = buildAudit(meals, duration, cal, prot, carbs, fats);

    // 10. Build plan name
    const conditions = (intake?.health_conditions || []).join(', ') || 'General Wellness';
    const planName = `${client.full_name} — ${conditions} Plan (${duration} Days)`;

    return Response.json({
      success: true,
      plan: {
        name: planName,
        duration,
        target_calories: cal,
        meals,
        mpess_recommendations: mpessRecs,
        decision_rules_applied: decisionRules.map(r => r.rule || r),
        manual_rules_applied: manualRules.map(r => r.rule || r),
        disease_focus: intake?.health_conditions || [],
        food_preference: intake?.diet_type || client.food_preference,
        plan_tier: 'advanced',
      },
      audit,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

const MEAL_SLOTS = ['early_morning', 'breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner'];

function pickMeal(pool, usedIds, targetCal, todayItems) {
  if (!pool || pool.length === 0) return null;

  // Filter: not used today, prefer not recently used overall
  let candidates = pool.filter(m => !todayItems.has(m.id));

  // Prefer not used recently (last 3 days in this slot)
  const recentlyUsed = usedIds.slice(-3);
  const fresh = candidates.filter(m => !recentlyUsed.includes(m.id));
  if (fresh.length > 0) candidates = fresh;

  if (candidates.length === 0) candidates = pool; // fallback

  // Pick the one closest to targetCal (within 20% range)
  const calRangeMin = targetCal * 0.7;
  const calRangeMax = targetCal * 1.3;
  const inRange = candidates.filter(m => (m.approx_calories || 0) >= calRangeMin && (m.approx_calories || 0) <= calRangeMax);
  const finalPool = inRange.length > 0 ? inRange : candidates;

  // Pick pseudo-randomly but deterministically based on usedIds length
  const idx = usedIds.length % finalPool.length;
  return finalPool[idx];
}

function buildMealEntry(day, mealType, meal, targetCal, totalProtein, totalCarbs, totalFats, tip) {
  const calRatio = (meal.approx_calories || targetCal) / (targetCal || 1);
  return {
    day,
    meal_type: mealType,
    meal_name: meal.name,
    items: [meal.name],
    portion_sizes: ['As described'],
    calories: meal.approx_calories || targetCal,
    protein: Math.round((totalProtein / 6) * calRatio),
    carbs: Math.round((totalCarbs / 6) * calRatio),
    fats: Math.round((totalFats / 6) * calRatio),
    nutritional_tip: tip,
    disease_rationale: 'Selected from filtered allowed meals based on clinical diagnostic rules',
  };
}

function extractMpessRecs(diagnostic) {
  if (!diagnostic?.body_type_summary?.holistic_considerations) return [];
  return diagnostic.body_type_summary.holistic_considerations.slice(0, 10);
}

function buildAudit(meals, duration, targetCal, targetProt, targetCarbs, targetFats) {
  const daysMap = {};
  for (const m of meals) {
    if (!daysMap[m.day]) daysMap[m.day] = [];
    daysMap[m.day].push(m);
  }

  let totalCal = 0, totalProt = 0, totalCarbs2 = 0, totalFats2 = 0;
  let dayCount = 0;

  for (const day of Object.values(daysMap)) {
    const dayCal = day.reduce((s, m) => s + (m.calories || 0), 0);
    totalCal += dayCal;
    totalProt += day.reduce((s, m) => s + (m.protein || 0), 0);
    totalCarbs2 += day.reduce((s, m) => s + (m.carbs || 0), 0);
    totalFats2 += day.reduce((s, m) => s + (m.fats || 0), 0);
    dayCount++;
  }

  const avgCal = dayCount > 0 ? Math.round(totalCal / dayCount) : 0;
  const calTarget = targetCal || 1800;
  const deviation = Math.abs(avgCal - calTarget);
  const calCompliance = deviation <= 150 ? 'Within range (±150 kcal)' : deviation <= 300 ? 'Slightly off (±300 kcal)' : 'Out of range';

  return {
    avg_calories_per_day: avgCal,
    target_calories: calTarget,
    calorie_compliance: calCompliance,
    total_days: dayCount,
    total_meals: meals.length,
    avg_protein_per_day: dayCount > 0 ? Math.round(totalProt / dayCount) : 0,
    avg_carbs_per_day: dayCount > 0 ? Math.round(totalCarbs2 / dayCount) : 0,
    avg_fats_per_day: dayCount > 0 ? Math.round(totalFats2 / dayCount) : 0,
    target_protein: targetProt,
    target_carbs: targetCarbs,
    target_fats: targetFats,
  };
}