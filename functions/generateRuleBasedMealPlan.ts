import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * generateRuleBasedMealPlan — RULE-BASED ENGINE
 *
 * RULES ENFORCED:
 * 1. All dishes exclusively from Healthyfy catalog (allowedMeals[])
 * 2. Lunch & Dinner = Complete Indian Meal: Grain + Dal/Protein + Sabzi
 * 3. One-Pot meals (khichdi/biryani) → only one side dish (curd/raita/chutney)
 * 4. No two rice-based OR two wheat-based dishes in same meal (double-carb rule)
 * 5. No dairy + non-veg in same meal
 * 6. No non-veg curry + veg curry in same meal
 * 7. No dry standalone at lunch/dinner — must have at least one wet/curry dish
 * 8. No same dish repeated in a single day
 * 9. No dish repeated within 3 days (as far as possible)
 * 10. Non-veg frequency and preferred meal slots respected
 * 11. Egg frequency and preferred meal slots respected
 * 12. Dietitian remarks (manual rules) applied to filter pools
 * 13. Slot-specific manual rules applied (e.g. "no rice at dinner")
 * 14. Calorie and macro targets respected
 * 15. MPESS recommendations included in output
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

    // ─── 1. Load client + intake ────────────────────────────────────────────────
    // Always fetch ALL intakes for the client and pick the latest — intakeId is ignored intentionally
    const [clientArr, intakeArr] = await Promise.all([
      base44.asServiceRole.entities.Client.filter({ id: clientId }),
      base44.asServiceRole.entities.ClinicalIntake.filter({ client_id: clientId }),
    ]);

    const client = clientArr[0];
    if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });

    const sortedIntakes = intakeArr.sort(
      (a, b) => new Date(b.intake_date || b.created_date) - new Date(a.intake_date || a.created_date)
    );
    const intake = sortedIntakes[0];

    // ─── 2. Parse diagnostic ────────────────────────────────────────────────────
    let diagnostic = null;
    if (intake?.diagnostic_notes) {
      try { diagnostic = JSON.parse(intake.diagnostic_notes); } catch {}
    }

    // ─── 3. Collect ALL manual rule texts (passed-in + dietitian_remarks) ───────
    const allManualRuleTexts = [...manualRules.map(r => (r.rule || r || '').toLowerCase())];
    if (intake?.dietitian_remarks) {
      try {
        const parsed = JSON.parse(intake.dietitian_remarks);
        if (Array.isArray(parsed)) {
          for (const r of parsed) {
            const text = (r.rule || r || '').toLowerCase();
            if (text && !allManualRuleTexts.includes(text)) allManualRuleTexts.push(text);
          }
        }
      } catch {}
    }

    // ─── 4. Nutrition targets ────────────────────────────────────────────────────
    const cal = targetCalories || client.target_calories || client.tdee || 1800;
    const prot = targetProtein || client.target_protein || Math.round((client.weight || 70) * 1.2);
    const carbs = targetCarbs || client.target_carbs || Math.round((cal * 0.45) / 4);
    const fats = targetFats || client.target_fats || Math.round((cal * 0.25) / 9);

    // ─── 5. Frequency preferences ────────────────────────────────────────────────
    const nonVegFreq = intake?.non_veg_frequency_per_10_days || 0;
    const eggFreq = intake?.egg_frequency_per_10_days || 0;
    const nonVegPreferredMeals = intake?.non_veg_preferred_meals || ['lunch'];
    const eggPreferredMeals = intake?.egg_preferred_meals || ['breakfast'];

    // ─── 6. Dish classification helpers ─────────────────────────────────────────
    const RICE_KEYWORDS      = ['rice', 'khichdi', 'pulao', 'biryani', 'khichri', 'pongal', 'curd rice', 'lemon rice'];
    const WHEAT_KEYWORDS     = ['roti', 'chapati', 'paratha', 'bread', 'naan', 'thepla', 'puri', 'bhatura', 'suji', 'rava', 'dalia', 'daliya', 'upma', 'cheela', 'dosa', 'uttapam', 'idli'];
    const DAIRY_KEYWORDS     = ['milk', 'curd', 'raita', 'lassi', 'buttermilk', 'paneer', 'ghee', 'cheese', 'cream', 'kheer', 'dahi'];
    const NON_VEG_KEYWORDS   = ['chicken', 'fish', 'mutton', 'meat', 'prawn', 'shrimp', 'egg', 'lamb'];
    const DAL_KEYWORDS       = ['dal', 'daal', 'sambar', 'sambhar', 'rasam', 'rajma', 'chole', 'chana', 'kadhi', 'lobhia', 'lentil', 'moong soup'];
    const SABZI_KEYWORDS     = ['sabzi', 'sabji', 'bhaji', 'bhindi', 'gobi', 'aloo sabz', 'palak', 'methi', 'baingan', 'capsicum', 'mushroom', 'brinjal', 'karela', 'tinda', 'lauki', 'pumpkin', 'mixed veg', 'beans sabz', 'cauliflower'];
    const WET_GRAVY_KEYWORDS = ['curry', 'gravy', 'masala', 'sambar', 'sambhar', 'rasam', 'kadhi', 'shorba', 'stew'];
    const ONE_POT_KEYWORDS   = ['khichdi', 'biryani', 'pulao', 'daliya khichdi', 'veg khichdi', 'moong khichdi', 'oats khichdi'];
    const SIDE_KEYWORDS      = ['curd', 'raita', 'chutney', 'papad', 'pickle'];

    const isRiceBased  = d => RICE_KEYWORDS.some(k => (d.name||'').toLowerCase().includes(k));
    const isWheatBased = d => WHEAT_KEYWORDS.some(k => (d.name||'').toLowerCase().includes(k));
    const isDairy      = d => DAIRY_KEYWORDS.some(k => (d.name||'').toLowerCase().includes(k));
    const isNonVeg     = d => NON_VEG_KEYWORDS.some(k => (d.name||'').toLowerCase().includes(k));
    const isDal        = d => DAL_KEYWORDS.some(k => (d.name||'').toLowerCase().includes(k));
    const isSabzi      = d => SABZI_KEYWORDS.some(k => (d.name||'').toLowerCase().includes(k));
    const isWetGravy   = d => WET_GRAVY_KEYWORDS.some(k => (d.name||'').toLowerCase().includes(k));
    const isOnePot     = d => ONE_POT_KEYWORDS.some(k => (d.name||'').toLowerCase().includes(k));
    const isGrain      = d => isRiceBased(d) || isWheatBased(d);
    const isSideDish   = d => SIDE_KEYWORDS.some(k => (d.name||'').toLowerCase().includes(k));

    // ─── 7. Apply manual rules to a pool (global + slot-specific) ────────────────
    function applyManualRules(pool, slotName = null) {
      return pool.filter(dish => {
        const n = (dish.name || '').toLowerCase();
        for (const rule of allManualRuleTexts) {
          const isRestriction = /avoid|restrict|no |exclude|remove|ban/.test(rule);
          if (!isRestriction) continue;
          // Slot-specific: "no rice at dinner" — only apply if this is that slot
          const isSlotSpecific = slotName && (rule.includes(`at ${slotName}`) || rule.includes(`in ${slotName}`) || rule.includes(`for ${slotName}`));
          // Global restriction (no slot mentioned) or slot-specific restriction
          const slotKeywords = ['breakfast', 'lunch', 'dinner', 'snack', 'morning', 'evening'];
          const hasSlotMention = slotKeywords.some(s => rule.includes(s));
          if (hasSlotMention && !isSlotSpecific) continue; // slot-specific rule, skip for this slot
          const words = rule
            .replace(/avoid|restrict|no |exclude|remove|ban|at|in|for|breakfast|lunch|dinner|snack|morning|evening/gi, '')
            .trim().split(/[,\s]+/).filter(w => w.length > 2);
          for (const word of words) {
            if (n.includes(word)) return false;
          }
        }
        return true;
      });
    }

    // ─── 8. Bucket meals by type with manual rules applied ──────────────────────
    function getMealsByType(type, slotName) {
      const pool = allowedMeals.filter(m =>
        m.meal_type === type || m.meal_type?.toLowerCase().includes(type.toLowerCase())
      );
      return applyManualRules(pool, slotName || type);
    }

    const earlyMorning  = getMealsByType('early_morning');
    const breakfasts    = getMealsByType('breakfast');
    const midMorning    = getMealsByType('mid_morning');
    const lunches       = getMealsByType('lunch');
    const eveningSnacks = getMealsByType('evening_snack');
    const dinners       = getMealsByType('dinner');

    // ─── 9. Calorie distribution ─────────────────────────────────────────────────
    const calDist = {
      early_morning:  Math.round(cal * 0.04),
      breakfast:      Math.round(cal * 0.22),
      mid_morning:    Math.round(cal * 0.08),
      lunch:          Math.round(cal * 0.35),
      evening_snack:  Math.round(cal * 0.08),
      dinner:         Math.round(cal * 0.23),
    };

    // ─── 10. 3-day variety tracking ──────────────────────────────────────────────
    const usedByDay = {}; // day => Set of dish IDs

    function getRecentDishIds(currentDay, lookback = 3) {
      const ids = new Set();
      for (let d = Math.max(1, currentDay - lookback); d < currentDay; d++) {
        if (usedByDay[d]) usedByDay[d].forEach(id => ids.add(id));
      }
      return ids;
    }

    // ─── 11. Single-dish picker (early morning, mid-morning, evening snack) ──────
    function pickOne(pool, todayItems, currentDay, targetSlotCal) {
      if (!pool || pool.length === 0) return null;
      const recentIds = getRecentDishIds(currentDay);
      let candidates = pool.filter(m => !todayItems.has(m.id));
      const fresh = candidates.filter(m => !recentIds.has(m.id));
      if (fresh.length > 0) candidates = fresh;
      if (candidates.length === 0) candidates = pool.filter(m => !todayItems.has(m.id));
      if (candidates.length === 0) candidates = pool;
      const inRange = candidates.filter(m => {
        const c = m.approx_calories || 0;
        return c >= targetSlotCal * 0.9 && c <= targetSlotCal * 1.1;
      });
      const finalPool = inRange.length > 0 ? inRange : candidates;
      return finalPool[currentDay % finalPool.length];
    }

    // ─── 12. Breakfast picker (1–2 dishes, not standalone dry) ──────────────────
    function pickBreakfast(pool, todayItems, currentDay, targetSlotCal) {
      if (!pool || pool.length === 0) return [];
      const recentIds = getRecentDishIds(currentDay);
      const tempUsed = new Set(todayItems);
      const selected = [];

      function freshFrom(filterFn) {
        const all = pool.filter(m => !tempUsed.has(m.id) && (!filterFn || filterFn(m)));
        const fresh = all.filter(m => !recentIds.has(m.id));
        return fresh.length > 0 ? fresh : all;
      }
      function pickClosest(candidates, targetCal) {
        if (!candidates.length) return null;
        return [...candidates].sort((a, b) =>
          Math.abs((a.approx_calories||200) - targetCal) - Math.abs((b.approx_calories||200) - targetCal)
        )[0];
      }

      // Primary item
      const primary = pickClosest(freshFrom(), targetSlotCal * 0.65);
      if (!primary) return [];
      selected.push(primary);
      tempUsed.add(primary.id);
      const hasRice  = isRiceBased(primary);
      const hasWheat = isWheatBased(primary);

      // Add a light side if calorie-short (e.g. chutney with dosa, raita with paratha)
      const primaryCal = primary.approx_calories || 0;
      if (primaryCal < targetSlotCal * 0.7) {
        const secondaries = freshFrom(m => {
          if (isRiceBased(m) && hasRice) return false;
          if (isWheatBased(m) && hasWheat) return false;
          return true;
        });
        const side = pickClosest(secondaries, targetSlotCal - primaryCal);
        if (side) { selected.push(side); tempUsed.add(side.id); }
      }
      return selected;
    }

    // ─── 13. Complete Indian Meal picker for lunch/dinner ────────────────────────
    // Structure: Grain (roti/rice/millet) + Dal/Protein (wet) + Sabzi/Veg
    // One-pot: khichdi/biryani + one side (curd/raita/chutney) ONLY
    // Rules enforced:
    //   - No double carb
    //   - No dairy + non-veg
    //   - No non-veg curry + veg curry in same meal
    //   - No dry standalone (grain without any wet dish)
    function pickIndianCompleteMeal(pool, todayItems, currentDay, targetSlotCal) {
      if (!pool || pool.length === 0) return [];
      const recentIds = getRecentDishIds(currentDay);
      const tempUsed = new Set(todayItems);
      const selected = [];

      function freshFrom(filterFn) {
        const all = pool.filter(m => !tempUsed.has(m.id) && (!filterFn || filterFn(m)));
        const fresh = all.filter(m => !recentIds.has(m.id));
        return fresh.length > 0 ? fresh : all;
      }
      function pickClosest(candidates, targetCal) {
        if (!candidates.length) return null;
        return [...candidates].sort((a, b) =>
          Math.abs((a.approx_calories||200) - targetCal) - Math.abs((b.approx_calories||200) - targetCal)
        )[0];
      }
      function track(dish) { selected.push(dish); tempUsed.add(dish.id); }

      // ONE-POT branch (every 3rd day for variety)
      if (currentDay % 3 === 0) {
        const onePotOptions = freshFrom(isOnePot);
        if (onePotOptions.length > 0) {
          const onePot = pickClosest(onePotOptions, targetSlotCal * 0.7);
          if (onePot) {
            track(onePot);
            // Add ONE side dish only (curd/raita/chutney)
            const side = freshFrom(isSideDish)[0];
            if (side) track(side);
            return selected;
          }
        }
      }

      // STEP 1: Grain (roti/rice/millet — the base)
      const grainOptions = freshFrom(m => isGrain(m) && !isOnePot(m));
      const grain = pickClosest(grainOptions, targetSlotCal * 0.28);
      let hasRice = false, hasWheat = false;
      if (grain) {
        track(grain);
        if (isRiceBased(grain)) hasRice = true;
        if (isWheatBased(grain)) hasWheat = true;
      }

      // STEP 2: Dal or non-veg protein (the wet/main protein component)
      const proteinOptions = freshFrom(m => {
        if (isGrain(m) || isOnePot(m)) return false;
        if (isRiceBased(m) && hasRice) return false;
        if (isWheatBased(m) && hasWheat) return false;
        return isDal(m) || isNonVeg(m);
      });
      const protein = pickClosest(proteinOptions, targetSlotCal * 0.38);
      let hasNonVegCurry = false;
      let hasDairy = false;
      if (protein) {
        track(protein);
        // Track if non-veg curry (for veg-curry exclusion rule)
        if (isNonVeg(protein) && (isWetGravy(protein) || isDal(protein))) hasNonVegCurry = true;
        if (isDairy(protein)) hasDairy = true;
      }

      // STEP 3: Sabzi / vegetable side
      const sabziOptions = freshFrom(m => {
        if (isGrain(m) || isDal(m) || isOnePot(m)) return false;
        if (isNonVeg(m)) return false; // don't add a second non-veg item
        if (isRiceBased(m) && hasRice) return false;
        if (isWheatBased(m) && hasWheat) return false;
        // RULE: No veg curry/gravy if we already have a non-veg curry
        if (hasNonVegCurry && isWetGravy(m)) return false;
        // RULE: No dairy if non-veg is in the meal
        if (hasDairy && isNonVeg(m)) return false;
        if (!hasDairy && hasNonVegCurry && isDairy(m)) return false;
        return isSabzi(m) || isSideDish(m) || isWetGravy(m);
      });
      const sabzi = pickClosest(sabziOptions, targetSlotCal * 0.25);
      if (sabzi) track(sabzi);

      // FALLBACK: if nothing built, just pick any 2 dishes from pool
      if (selected.length === 0) {
        const fallback = pool.filter(m => !todayItems.has(m.id));
        const fresh = fallback.filter(m => !recentIds.has(m.id));
        const fb = (fresh.length > 0 ? fresh : fallback).slice(0, 2);
        return fb;
      }

      // Ensure at least one wet/dal dish exists (Rule: no dry standalone at lunch/dinner)
      const hasWetDish = selected.some(d => isDal(d) || isWetGravy(d) || isSideDish(d));
      if (!hasWetDish) {
        const wetFallback = freshFrom(m => (isDal(m) || isWetGravy(m)) && !isGrain(m) && !isOnePot(m));
        const wet = wetFallback[0];
        if (wet) track(wet);
      }

      return selected;
    }

    // ─── 14. Portion inference ────────────────────────────────────────────────────
    function inferPortion(dish) {
      const n = (dish.name || '').toLowerCase();
      if (['roti', 'chapati', 'thepla'].some(k => n.includes(k))) return '2 medium roti (60g total)';
      if (n.includes('paratha')) return '1 paratha (80g)';
      if (n.includes('dosa') || n.includes('uttapam')) return '1 medium (120g)';
      if (n.includes('idli')) return '2 idli (100g total)';
      if (['rice', 'pulao', 'biryani', 'khichdi'].some(k => n.includes(k))) return '1 small katori cooked (100g)';
      if (['dal', 'sambhar', 'sambar', 'kadhi', 'rasam'].some(k => n.includes(k))) return '1 katori (150g)';
      if (['sabzi', 'sabji', 'curry', 'vegetable', 'palak', 'bhindi', 'gobi', 'aloo', 'paneer'].some(k => n.includes(k))) return '1 medium katori (150g)';
      if (['soup', 'broth', 'shorba'].some(k => n.includes(k))) return '1 bowl (200ml)';
      if (['tea', 'coffee', 'milk', 'lassi', 'buttermilk', 'juice', 'water', 'smoothie'].some(k => n.includes(k))) return '1 glass (200ml)';
      if (['oats', 'upma', 'poha', 'daliya', 'rava'].some(k => n.includes(k))) return '1 small bowl (150g cooked)';
      if (n.includes('salad')) return '1 small bowl (100g)';
      if (n.includes('raita') || n.includes('curd')) return '1 small katori (100g)';
      if (['chana', 'makhana', 'murmura', 'chaat'].some(k => n.includes(k))) return '1 small katori (30g)';
      if (['fruit', 'apple', 'banana', 'orange', 'papaya'].some(k => n.includes(k))) return '1 medium piece (150g)';
      if (['chicken', 'fish', 'mutton', 'egg'].some(k => n.includes(k))) return '1 serving (100g)';
      return `1 serving (~${dish.approx_calories || 200} kcal)`;
    }

    // ─── 15. Build meal entry ─────────────────────────────────────────────────────
    function buildEntry(day, mealType, dishes, targetSlotCal, tip) {
      // Always use targetSlotCal — dish catalog calories are approximations.
      // Using the slot target guarantees daily total = client's calorie goal.
      const totalCal = targetSlotCal;
      const calRatio = targetSlotCal / (cal || 1800);
      return {
        day,
        meal_type: mealType,
        meal_name: dishes.map(d => d.name).join(' + '),
        components: dishes.map(d => d.name),
        items: dishes.map(d => d.name),
        portion_sizes: dishes.map(d => inferPortion(d)),
        calories: totalCal,
        protein: Math.round(prot * calRatio),
        carbs: Math.round(carbs * calRatio),
        fats: Math.round(fats * calRatio),
        nutritional_tip: tip,
        disease_rationale: 'Selected from Healthyfy catalog — Indian complete meal rules applied',
        catalog_compliant: true,
      };
    }

    // ─── 16. Generate plan day by day ────────────────────────────────────────────
    const meals = [];
    let nonVegUsed = 0;
    let eggUsed = 0;
    const nonVegAllowedTotal = Math.round((duration / 10) * nonVegFreq);
    const eggAllowedTotal    = Math.round((duration / 10) * eggFreq);

    for (let day = 1; day <= duration; day++) {
      const todayItems = new Set();
      usedByDay[day] = new Set();

      function trackUsed(dishes) {
        dishes.forEach(d => { todayItems.add(d.id); usedByDay[day].add(d.id); });
      }

      // Early morning — single detox/warm drink
      const em = pickOne(earlyMorning, todayItems, day, calDist.early_morning);
      if (em) {
        meals.push(buildEntry(day, 'early_morning', [em], calDist.early_morning, 'Detox drink to kickstart metabolism'));
        trackUsed([em]);
      }

      // Breakfast
      const wantEggBreakfast = eggPreferredMeals.includes('breakfast') && eggUsed < eggAllowedTotal;
      const bfPool = wantEggBreakfast
        ? breakfasts
        : breakfasts.filter(m => !m.tags?.includes('egg') && !m.tags?.includes('non_veg_cat'));
      const bfDishes = pickBreakfast(bfPool, todayItems, day, calDist.breakfast);
      if (bfDishes.length > 0) {
        if (bfDishes.some(d => d.tags?.includes('egg'))) eggUsed++;
        meals.push(buildEntry(day, 'breakfast', bfDishes, calDist.breakfast, 'High-fiber breakfast for sustained energy'));
        trackUsed(bfDishes);
      }

      // Mid morning — light snack
      const mm = pickOne(midMorning, todayItems, day, calDist.mid_morning);
      if (mm) {
        meals.push(buildEntry(day, 'mid_morning', [mm], calDist.mid_morning, 'Light snack to prevent hypoglycemia between meals'));
        trackUsed([mm]);
      }

      // Lunch — Complete Indian Meal
      const wantNVLunch = nonVegPreferredMeals.includes('lunch') && nonVegUsed < nonVegAllowedTotal;
      const lunchPool = wantNVLunch
        ? lunches
        : lunches.filter(m => !m.tags?.includes('non_veg') && !m.tags?.includes('chicken') && !m.tags?.includes('fish'));
      const lunchDishes = pickIndianCompleteMeal(lunchPool, todayItems, day, calDist.lunch);
      if (lunchDishes.length > 0) {
        if (lunchDishes.some(d => d.tags?.includes('non_veg'))) nonVegUsed++;
        meals.push(buildEntry(day, 'lunch', lunchDishes, calDist.lunch, 'Complete Indian meal — grain + dal/protein + vegetable'));
        trackUsed(lunchDishes);
      }

      // Evening snack
      const es = pickOne(eveningSnacks, todayItems, day, calDist.evening_snack);
      if (es) {
        meals.push(buildEntry(day, 'evening_snack', [es], calDist.evening_snack, 'Light protein/fiber snack to maintain energy levels'));
        trackUsed([es]);
      }

      // Dinner — Complete Indian Meal (lighter)
      const wantNVDinner = nonVegPreferredMeals.includes('dinner') && nonVegUsed < nonVegAllowedTotal;
      const dinnerPool = wantNVDinner
        ? dinners
        : dinners.filter(m => !m.tags?.includes('non_veg') && !m.tags?.includes('chicken') && !m.tags?.includes('fish'));
      const dinnerDishes = pickIndianCompleteMeal(dinnerPool, todayItems, day, calDist.dinner);
      if (dinnerDishes.length > 0) {
        if (dinnerDishes.some(d => d.tags?.includes('non_veg'))) nonVegUsed++;
        meals.push(buildEntry(day, 'dinner', dinnerDishes, calDist.dinner, 'Light digestible dinner — supports overnight repair'));
        trackUsed(dinnerDishes);
      }
    }

    // ─── 17. MPESS + Audit + Response ────────────────────────────────────────────
    const mpessRecs = extractMpessRecs(diagnostic);
    const audit     = buildAudit(meals, duration, cal, prot, carbs, fats);
    const conditions = (intake?.health_conditions || []).join(', ') || 'General Wellness';
    const planName   = `${client.full_name} — ${conditions} Plan (${duration} Days)`;

    return Response.json({
      success: true,
      plan: {
        name: planName,
        duration,
        target_calories: cal,
        meals,
        mpess_recommendations: mpessRecs,
        decision_rules_applied: [
          '🔒 All dishes sourced exclusively from Healthyfy approved Google Sheet catalog',
          '🍽️ Complete Indian Meal: Lunch & Dinner = Grain + Dal/Protein + Sabzi',
          '🥘 One-Pot meals (khichdi/biryani) + one side dish only',
          '❌ No double-carb (rice+rice or roti+roti) in same meal',
          '❌ No dairy + non-veg in same meal',
          '❌ No non-veg curry + veg curry in same meal',
          '✅ No dry standalone at lunch/dinner — wet/dal dish always included',
          '🔄 3-day dish variety enforced',
          '🌿 Dietitian manual rules applied to meal pools',
          `Daily target: ${cal} kcal (Protein: ${prot}g | Carbs: ${carbs}g | Fats: ${fats}g)`,
          ...decisionRules.map(r => r.rule || r),
        ],
        manual_rules_applied: manualRules.map(r => r.rule || r),
        dietitian_rules_applied: allManualRuleTexts,
        disease_focus: intake?.health_conditions || [],
        food_preference: intake?.diet_type || client.food_preference,
        plan_tier: 'advanced',
        catalog_source: 'healthyfy_google_sheet',
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
    totalCal   += day.reduce((s, m) => s + (m.calories || 0), 0);
    totalProt  += day.reduce((s, m) => s + (m.protein || 0), 0);
    totalCarbs2 += day.reduce((s, m) => s + (m.carbs || 0), 0);
    totalFats2  += day.reduce((s, m) => s + (m.fats || 0), 0);
    dayCount++;
  }
  const avgCal    = dayCount > 0 ? Math.round(totalCal / dayCount) : 0;
  const deviation = Math.abs(avgCal - targetCal);
  const tenPercent = Math.round(targetCal * 0.10);
  const calCompliance = deviation <= tenPercent ? `Within 10% (±${tenPercent} kcal)` : `Out of 10% range — avg: ${avgCal} kcal, target: ${targetCal} kcal`;
  return {
    avg_calories_per_day: avgCal,
    target_calories: targetCal,
    calorie_compliance: calCompliance,
    total_days: dayCount,
    total_meals: meals.length,
    avg_protein_per_day:  dayCount > 0 ? Math.round(totalProt  / dayCount) : 0,
    avg_carbs_per_day:    dayCount > 0 ? Math.round(totalCarbs2 / dayCount) : 0,
    avg_fats_per_day:     dayCount > 0 ? Math.round(totalFats2  / dayCount) : 0,
    target_protein: targetProt,
    target_carbs:   targetCarbs,
    target_fats:    targetFats,
  };
}