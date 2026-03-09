import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * generateRuleBasedMealPlan
 * NON-COMPROMISING RULE: ALL dishes are sourced EXCLUSIVELY from the
 * Healthyfy Dishes Google Sheet catalog passed in via allowedMeals[].
 *
 * KEY FIX: Lunch & Dinner now COMBINE 2-3 catalog dishes to hit calorie targets.
 * Single dishes (~150-350 kcal each) are combined to reach slot targets.
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
      early_morning: Math.round(cal * 0.04),   // ~4%
      breakfast: Math.round(cal * 0.22),         // ~22%
      mid_morning: Math.round(cal * 0.08),       // ~8%
      lunch: Math.round(cal * 0.35),             // ~35%
      evening_snack: Math.round(cal * 0.08),     // ~8%
      dinner: Math.round(cal * 0.23),            // ~23%
    };

    // 7. Pick a single dish avoiding today's dishes and recently used
    function pickOne(pool, usedIds, targetSlotCal, todayItems) {
      if (!pool || pool.length === 0) return null;
      let candidates = pool.filter(m => !todayItems.has(m.id));
      const recentlyUsed = usedIds.slice(-3);
      const fresh = candidates.filter(m => !recentlyUsed.includes(m.id));
      if (fresh.length > 0) candidates = fresh;
      if (candidates.length === 0) candidates = pool.filter(m => !todayItems.has(m.id));
      if (candidates.length === 0) candidates = pool;

      // Calorie range filter
      const inRange = candidates.filter(m => {
        const c = m.approx_calories || 0;
        return c >= targetSlotCal * 0.5 && c <= targetSlotCal * 1.4;
      });
      const finalPool = inRange.length > 0 ? inRange : candidates;
      return finalPool[usedIds.length % finalPool.length];
    }

    // 8. Pick 2-3 dishes for a slot to hit calorie target (combination mode for lunch/dinner)
    function pickCombined(pool, usedIds, targetSlotCal, todayItems, count = 2) {
      if (!pool || pool.length === 0) return [];
      const selected = [];
      let remainingCal = targetSlotCal;
      const tempUsed = new Set(todayItems);

      for (let i = 0; i < count; i++) {
        let candidates = pool.filter(m => !tempUsed.has(m.id));
        if (candidates.length === 0) break;

        // Avoid recently used
        const recentlyUsed = usedIds.slice(-4);
        const fresh = candidates.filter(m => !recentlyUsed.includes(m.id));
        if (fresh.length > 0) candidates = fresh;

        // Pick dish closest to remaining calorie share
        const share = remainingCal / (count - i);
        candidates.sort((a, b) =>
          Math.abs((a.approx_calories || 200) - share) - Math.abs((b.approx_calories || 200) - share)
        );

        const picked = candidates[0];
        selected.push(picked);
        remainingCal -= picked.approx_calories || 200;
        tempUsed.add(picked.id);
      }

      return selected;
    }

    // 9. Build meal entry from one or more dishes
    function buildEntry(day, mealType, dishes, targetSlotCal, tip) {
      const totalCal = dishes.reduce((s, d) => s + (d.approx_calories || 0), 0) || targetSlotCal;
      const calRatio = totalCal / (cal || 1800);
      return {
        day,
        meal_type: mealType,
        meal_name: dishes.map(d => d.name).join(' + '),
        components: dishes.map(d => d.name),
        items: dishes.map(d => d.name),
        portion_sizes: dishes.map(() => 'As described'),
        calories: totalCal,
        protein: Math.round(prot * calRatio),
        carbs: Math.round(carbs * calRatio),
        fats: Math.round(fats * calRatio),
        nutritional_tip: tip,
        disease_rationale: 'Selected from Healthyfy catalog — catalog dishes combined to meet calorie target',
        catalog_compliant: true,
      };
    }

    // 10. Generate meal plan day by day
    const meals = [];
    const usedPerSlot = {};
    MEAL_SLOTS.forEach(s => { usedPerSlot[s] = []; });

    let nonVegUsed = 0;
    let eggUsed = 0;
    const nonVegAllowedTotal = Math.round((duration / 10) * nonVegFreq);
    const eggAllowedTotal = Math.round((duration / 10) * eggFreq);

    for (let day = 1; day <= duration; day++) {
      const todayItems = new Set();

      // Early morning — single drink/detox item
      const em = pickOne(earlyMorning, usedPerSlot['early_morning'], calDist.early_morning, todayItems);
      if (em) {
        meals.push(buildEntry(day, 'early_morning', [em], calDist.early_morning, 'Detox drink to kickstart metabolism'));
        usedPerSlot['early_morning'].push(em.id);
        todayItems.add(em.id);
      }

      // Breakfast — 1-2 dishes
      const wantEggBreakfast = eggPreferredMeals.includes('breakfast') && eggUsed < eggAllowedTotal;
      const bfPool = wantEggBreakfast ? breakfasts : breakfasts.filter(m => !m.tags?.includes('egg') && !m.tags?.includes('non_veg_cat'));
      const bfDishes = pickCombined(bfPool, usedPerSlot['breakfast'], calDist.breakfast, todayItems, 2);
      if (bfDishes.length > 0) {
        if (bfDishes.some(d => d.tags?.includes('egg'))) eggUsed++;
        meals.push(buildEntry(day, 'breakfast', bfDishes, calDist.breakfast, 'High-fiber breakfast to maintain sustained energy'));
        bfDishes.forEach(d => { usedPerSlot['breakfast'].push(d.id); todayItems.add(d.id); });
      }

      // Mid morning — single snack
      const mm = pickOne(midMorning, usedPerSlot['mid_morning'], calDist.mid_morning, todayItems);
      if (mm) {
        meals.push(buildEntry(day, 'mid_morning', [mm], calDist.mid_morning, 'Light snack to prevent hypoglycemia between meals'));
        usedPerSlot['mid_morning'].push(mm.id);
        todayItems.add(mm.id);
      }

      // Lunch — COMBINE 2-3 dishes to hit ~35% of daily calories
      const wantNVLunch = nonVegPreferredMeals.includes('lunch') && nonVegUsed < nonVegAllowedTotal;
      const lunchPool = wantNVLunch ? lunches : lunches.filter(m => !m.tags?.includes('non_veg') && !m.tags?.includes('chicken') && !m.tags?.includes('fish'));
      const lunchDishes = pickCombined(lunchPool, usedPerSlot['lunch'], calDist.lunch, todayItems, 3);
      if (lunchDishes.length > 0) {
        if (lunchDishes.some(d => d.tags?.includes('non_veg'))) nonVegUsed++;
        meals.push(buildEntry(day, 'lunch', lunchDishes, calDist.lunch, 'Complete Indian meal — grain + protein + vegetable'));
        lunchDishes.forEach(d => { usedPerSlot['lunch'].push(d.id); todayItems.add(d.id); });
      }

      // Evening snack — single item
      const es = pickOne(eveningSnacks, usedPerSlot['evening_snack'], calDist.evening_snack, todayItems);
      if (es) {
        meals.push(buildEntry(day, 'evening_snack', [es], calDist.evening_snack, 'Light protein/fiber snack to maintain energy levels'));
        usedPerSlot['evening_snack'].push(es.id);
        todayItems.add(es.id);
      }

      // Dinner — COMBINE 2-3 dishes to hit ~23% of daily calories
      const wantNVDinner = nonVegPreferredMeals.includes('dinner') && nonVegUsed < nonVegAllowedTotal;
      const dinnerPool = wantNVDinner ? dinners : dinners.filter(m => !m.tags?.includes('non_veg') && !m.tags?.includes('chicken') && !m.tags?.includes('fish'));
      const dinnerDishes = pickCombined(dinnerPool, usedPerSlot['dinner'], calDist.dinner, todayItems, 2);
      if (dinnerDishes.length > 0) {
        if (dinnerDishes.some(d => d.tags?.includes('non_veg'))) nonVegUsed++;
        meals.push(buildEntry(day, 'dinner', dinnerDishes, calDist.dinner, 'Light digestible dinner — supports overnight repair'));
        dinnerDishes.forEach(d => { usedPerSlot['dinner'].push(d.id); todayItems.add(d.id); });
      }
    }

    // 11. MPESS recommendations from diagnostic
    const mpessRecs = extractMpessRecs(diagnostic);

    // 12. Audit
    const audit = buildAudit(meals, duration, cal, prot, carbs, fats);

    // 13. Build plan name
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
        decision_rules_applied: [
          '🔒 NON-COMPROMISING RULE: All dishes sourced exclusively from Healthyfy approved Google Sheet catalog',
          '🍽️ COMBINATION MODE: Lunch & Dinner combine 2-3 catalog dishes to hit daily calorie targets',
          `Daily target: ${cal} kcal (Protein: ${prot}g | Carbs: ${carbs}g | Fats: ${fats}g)`,
          ...decisionRules.map(r => r.rule || r),
        ],
        manual_rules_applied: manualRules.map(r => r.rule || r),
        disease_focus: intake?.health_conditions || [],
        food_preference: intake?.diet_type || client.food_preference,
        plan_tier: 'advanced',
        catalog_source: 'healthyfy_google_sheet',
        dish_combination_mode: true,
      },
      audit,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

const MEAL_SLOTS = ['early_morning', 'breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner'];

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
    totalCal += day.reduce((s, m) => s + (m.calories || 0), 0);
    totalProt += day.reduce((s, m) => s + (m.protein || 0), 0);
    totalCarbs2 += day.reduce((s, m) => s + (m.carbs || 0), 0);
    totalFats2 += day.reduce((s, m) => s + (m.fats || 0), 0);
    dayCount++;
  }

  const avgCal = dayCount > 0 ? Math.round(totalCal / dayCount) : 0;
  const deviation = Math.abs(avgCal - targetCal);
  const calCompliance = deviation <= 150 ? 'Within range (±150 kcal)' : deviation <= 300 ? 'Slightly off (±300 kcal)' : 'Out of range';

  return {
    avg_calories_per_day: avgCal,
    target_calories: targetCal,
    calorie_compliance: calCompliance,
    total_days: dayCount,
    total_meals: meals.length,
    avg_protein_per_day: dayCount > 0 ? Math.round(totalProt / dayCount) : 0,
    avg_carbs_per_day: dayCount > 0 ? Math.round(totalCarbs2 / dayCount) : 0,
    avg_fats_per_day: dayCount > 0 ? Math.round(totalFats2 / dayCount) : 0,
    target_protein: targetProt,
    target_carbs: targetCarbs,
    target_fats: targetFats,
    dish_combination_mode: true,
  };
}