import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ─── IST timestamp helper ───
function getISTTimestamp() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dd   = String(ist.getUTCDate()).padStart(2,'0');
  const mm   = months[ist.getUTCMonth()];
  const yyyy = ist.getUTCFullYear();
  let   hh   = ist.getUTCHours();
  const min  = String(ist.getUTCMinutes()).padStart(2,'0');
  const ampm = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12 || 12;
  return `${dd} ${mm} ${yyyy} ${String(hh).padStart(2,'0')}:${min} ${ampm} IST`;
}

// ─── Harris-Benedict kcal calculator ───
function calcTargetKcal(client, goalOverride) {
  const { weight, height, age, gender, activity_level, goal } = client;
  if (!weight || !height || !age) return null;

  let bmr;
  if ((gender || '').toLowerCase() === 'male') {
    bmr = 88.36 + (13.40 * weight) + (4.80 * height) - (5.68 * age);
  } else {
    bmr = 447.6 + (9.25 * weight) + (3.10 * height) - (4.33 * age);
  }

  const activityMap = {
    sedentary:          1.2,
    lightly_active:     1.375,
    moderately_active:  1.55,
    very_active:        1.725,
    extremely_active:   1.9,
  };
  const tdee = bmr * (activityMap[activity_level] || 1.55);

  const resolvedGoal = goalOverride || goal || 'maintenance';
  let target = tdee;
  if (resolvedGoal === 'weight_loss')  target = tdee - 300;
  if (resolvedGoal === 'weight_gain' || resolvedGoal === 'muscle_gain') target = tdee + 300;

  return Math.round(target / 50) * 50; // round to nearest 50
}

// ─── Smart rotation (no repeat within 3 days) ───
function generateRotation(numDays) {
  const templates = ['A','B','C','D','E'];
  const rotation  = [];
  const usage     = { A:0, B:0, C:0, D:0, E:0 };
  for (let i = 0; i < numDays; i++) {
    const recent    = rotation.slice(-2);
    const available = templates.filter(t => !recent.includes(t));
    available.sort((a, b) => usage[a] - usage[b]);
    const pool   = available.slice(0, Math.max(2, Math.ceil(available.length / 2)));
    const picked = pool[Math.floor(Math.random() * pool.length)];
    rotation.push(picked);
    usage[picked]++;
  }
  return rotation;
}

// ─── Best portion picker ───
function getBestPortion(dish, target) {
  if (!dish) return { label: '1 serving', kcal: 0 };
  const opts = [
    { label: dish.small_label,  kcal: dish.small_kcal  || 0 },
    { label: dish.medium_label, kcal: dish.medium_kcal || 0 },
    { label: dish.large_label,  kcal: dish.large_kcal  || 0 },
  ].filter(o => o.label && o.kcal > 0);
  if (!opts.length) return { label: '1 serving', kcal: dish.calories || 0 };
  return opts.reduce((best, o) =>
    Math.abs(o.kcal - target) < Math.abs(best.kcal - target) ? o : best
  );
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user   = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      clientId,
      numDays        = 7,
      overrideDietType,
      overrideCalories,
      overrideGoal,
    } = body;

    if (!clientId) return Response.json({ error: 'clientId required' }, { status: 400 });

    const Client      = base44.asServiceRole.entities.Client;
    const DishCatalog = base44.asServiceRole.entities.DishCatalog;
    const MealPlan    = base44.asServiceRole.entities.MealPlan;

    // ─── STEP 1: Read client profile (NOT ClinicalIntake) ───
    const clientArr = await Client.filter({ id: clientId });
    const client    = clientArr[0];
    if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });

    // ─── STEP 2: Resolve diet type ───
    const rawDiet     = overrideDietType || client.food_preference || 'veg';
    const resolvedDiet = rawDiet.toLowerCase().replace(/[\s-]/g, '_');
    const goal         = overrideGoal || client.goal || 'maintenance';
    const days         = Math.max(1, parseInt(numDays) || 7);

    // ─── STEP 2b: Resolve calorie target (Harris-Benedict if not set) ───
    let targetCal    = overrideCalories ? parseInt(overrideCalories) : null;
    let kcalAutoCalc = false;
    let kcalSource   = 'provided';

    if (!targetCal && client.target_calories) {
      targetCal  = parseInt(client.target_calories);
      kcalSource = 'client_profile';
    }

    if (!targetCal) {
      const calc = calcTargetKcal(client, goal);
      if (calc) {
        targetCal    = calc;
        kcalAutoCalc = true;
        kcalSource   = 'harris_benedict';
        console.log(`Auto-calculated kcal target: ${targetCal} (Harris-Benedict)`);
      } else {
        targetCal  = 1500;
        kcalSource = 'default_fallback';
        console.warn('Insufficient profile data for kcal calc — using default 1500');
      }
    }

    // ─── STEP 3: Slot calorie targets ───
    const slotPct = {
      early_morning: 0.06,
      breakfast:     0.22,
      mid_morning:   0.09,
      lunch_grain:   0.12,
      lunch_dal:     0.12,
      lunch_sabzi:   0.09,
      snack:         0.08,
      dinner_grain:  0.10,
      dinner_prot:   0.10,
      dinner_sabzi:  0.02,
    };
    const slotTargets = {};
    for (const [slot, pct] of Object.entries(slotPct)) {
      slotTargets[slot] = Math.round(targetCal * pct);
    }

    // ─── STEP 4: Load and filter DishCatalog ───
    const allDishes = await DishCatalog.filter({ status: 'active' });
    console.log(`DishCatalog: ${allDishes.length} active dishes loaded`);

    // Diet filter mapping per spec
    const dietFilter = {
      jain:     (d) => d.diet_type === 'jain',
      veg:      (d) => ['veg','jain'].includes(d.diet_type),
      eggetarian:(d)=> ['veg','jain','egg','eggetarian'].includes(d.diet_type),
      egg:      (d) => ['veg','jain','egg','eggetarian'].includes(d.diet_type),
      non_veg:  (d) => true, // all dishes eligible
      mixed:    (d) => true,
    };
    const filterFn   = dietFilter[resolvedDiet] || dietFilter['veg'];
    const filtered   = allDishes.filter(filterFn);

    // Group by slot
    const bySlot = {};
    for (const d of filtered) {
      const slotKey = d.slot || '';
      if (!bySlot[slotKey]) bySlot[slotKey] = [];
      bySlot[slotKey].push(d);
    }

    const slotCounts = Object.fromEntries(
      Object.entries(bySlot).map(([k,v]) => [k, v.length])
    );
    console.log('Dishes per slot after diet filter:', slotCounts);

    const MIN_DISHES = 2;
    const REQUIRED_SLOTS = [
      'early_morning','breakfast','mid_morning',
      'lunch_grain','lunch_dal','lunch_sabzi',
      'snack','dinner_grain','dinner_prot'
    ];
    const sparseSlots = REQUIRED_SLOTS.filter(s => (bySlot[s] || []).length < MIN_DISHES);
    if (sparseSlots.length > 3) {
      return Response.json({
        error: `Insufficient dishes in DishCatalog for slots: ${sparseSlots.join(', ')}. Please add more dishes.`
      }, { status: 422 });
    }

    // ─── STEP 5: Build Claude prompt ───
    const slotList = (slot) => {
      const dishes = bySlot[slot] || [];
      if (!dishes.length) return '(none)';
      return dishes.map(d => d.name).join(' | ');
    };

    const systemPrompt = `You are a certified nutrition planner.
Select meal options from the provided dish list to create 5 daily templates (A, B, C, D, E) for a healthy ${resolvedDiet} person.
Daily calorie target: ${targetCal} kcal
Goal: ${goal.replace(/_/g, ' ')}

RULES:
1. Pick exactly ONE dish per slot per template — use the EXACT dish name from the list
2. Each template must vary from others (no same dish used in the same slot across all templates)
3. No grain doubling: lunch_grain and dinner_grain must be different within the same template
4. No dairy + non-veg in the same slot
5. Variety: no dish repeated across consecutive templates (A→B→C should differ)
6. Pick dishes appropriate for the time of day and slot purpose

Return ONLY valid JSON — no explanation, no markdown:
{
  "A": {
    "early_morning": "exact dish name",
    "breakfast": "exact dish name",
    "mid_morning": "exact dish name",
    "lunch_grain": "exact dish name",
    "lunch_dal": "exact dish name",
    "lunch_sabzi": "exact dish name",
    "snack": "exact dish name",
    "dinner_grain": "exact dish name",
    "dinner_prot": "exact dish name"
  },
  "B": { ... },
  "C": { ... },
  "D": { ... },
  "E": { ... }
}`;

    const userPrompt = `Available dishes per slot:
Early Morning: ${slotList('early_morning')}
Breakfast: ${slotList('breakfast')}
Mid Morning: ${slotList('mid_morning')}
Lunch Grain: ${slotList('lunch_grain')}
Lunch Dal/Protein: ${slotList('lunch_dal')}
Lunch Sabzi/Veg: ${slotList('lunch_sabzi')}
Evening Snack: ${slotList('snack')}
Dinner Grain: ${slotList('dinner_grain')}
Dinner Protein: ${slotList('dinner_prot')}`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       Deno.env.get('CLAUDE'),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system:     systemPrompt,
        messages:   [{ role: 'user', content: userPrompt }],
      }),
    });

    const apiData = await claudeRes.json();
    if (apiData.error) throw new Error('Claude API: ' + apiData.error.message);

    const raw = apiData.content?.[0]?.text || '';
    // Strip markdown fences if present
    const clean = raw.replace(/```json[\s\S]*?```|```[\s\S]*?```/g, match =>
      match.replace(/```json|```/g, '').trim()
    ).trim();

    let parsed;
    try {
      // Find first { ... } block
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : clean);
    } catch(e) {
      throw new Error('Claude returned invalid JSON: ' + raw.slice(0, 300));
    }

    console.log('Claude returned templates:', Object.keys(parsed).filter(k => k !== 'mpess'));

    // ─── STEP 6: Build catalog lookup map ───
    const catalogByName = {};
    for (const d of allDishes) {
      catalogByName[d.name.toLowerCase().trim()] = d;
    }

    function resolveDish(name) {
      if (!name) return null;
      return catalogByName[String(name).toLowerCase().trim()] || null;
    }

    // ─── STEP 7: Validate templates — fix grain doubling ───
    const templateKeys = ['A','B','C','D','E'];
    for (const key of templateKeys) {
      const tmpl = parsed[key];
      if (!tmpl) continue;
      // Rule: lunch_grain ≠ dinner_grain
      if (tmpl.lunch_grain && tmpl.dinner_grain) {
        const lg = resolveDish(tmpl.lunch_grain);
        const dg = resolveDish(tmpl.dinner_grain);
        if (lg && dg && lg.id === dg.id) {
          // Replace dinner_grain with a different grain
          const alternates = (bySlot['dinner_grain'] || []).filter(d => d.id !== lg?.id);
          if (alternates.length > 0) {
            const idx = templateKeys.indexOf(key);
            tmpl.dinner_grain = alternates[idx % alternates.length].name;
            console.log(`Auto-fixed grain doubling in template ${key}`);
          }
        }
      }
    }

    // ─── STEP 8: Build meals with catalog macros ───
    const SLOT_TO_MEAL_TYPE = {
      early_morning: 'early_morning',
      breakfast:     'breakfast',
      mid_morning:   'mid_morning',
      lunch_grain:   'lunch',
      lunch_dal:     'lunch',
      lunch_sabzi:   'lunch',
      snack:         'evening_snack',
      dinner_grain:  'dinner',
      dinner_prot:   'dinner',
      dinner_sabzi:  'dinner',
    };

    const MEAL_SLOT_ORDER = [
      'early_morning','breakfast','mid_morning',
      'lunch_grain','lunch_dal','lunch_sabzi',
      'snack','dinner_grain','dinner_prot'
    ];

    const rotation = generateRotation(days);
    const allMeals = [];
    const slotFallbacks = new Set();

    for (let day = 1; day <= days; day++) {
      const tmplKey = rotation[day - 1];
      const tmpl    = parsed[tmplKey];
      if (!tmpl) continue;

      const dayMeals = {};

      for (const subSlot of MEAL_SLOT_ORDER) {
        const dishName = tmpl[subSlot];
        const dish     = resolveDish(dishName);
        const target   = slotTargets[subSlot] || 100;
        const mealType = SLOT_TO_MEAL_TYPE[subSlot];

        if (!dayMeals[mealType]) {
          dayMeals[mealType] = {
            day, meal_type: mealType,
            names: [], portions: [],
            calories: 0, protein: 0, carbs: 0, fats: 0,
            catalog_verified: true,
          };
        }

        if (dish) {
          // ── Catalog path ──
          const portion = getBestPortion(dish, target);
          const ratio   = (dish.calories || 0) > 0 ? portion.kcal / dish.calories : 1;

          dayMeals[mealType].names.push(dish.name);
          dayMeals[mealType].portions.push(portion.label || '1 serving');
          dayMeals[mealType].calories += portion.kcal;
          dayMeals[mealType].protein  += Math.round((dish.protein || 0) * ratio * 10) / 10;
          dayMeals[mealType].carbs    += Math.round((dish.carbs   || 0) * ratio * 10) / 10;
          dayMeals[mealType].fats     += Math.round((dish.fats    || 0) * ratio * 10) / 10;
        } else if (dishName && dishName !== '(none)') {
          // ── Fallback path: dish not in catalog, use Claude name + 0 macros ──
          slotFallbacks.add(subSlot);
          dayMeals[mealType].names.push(dishName);
          dayMeals[mealType].portions.push('1 serving');
          dayMeals[mealType].catalog_verified = false;
          console.warn(`Dish not found in catalog: "${dishName}" (slot: ${subSlot}, day: ${day})`);
        }
      }

      for (const m of Object.values(dayMeals)) {
        if (!m.names.length) continue;
        allMeals.push({
          day:          m.day,
          meal_type:    m.meal_type,
          meal_name:    m.names.join(' + '),
          items:        m.names,
          portion_sizes: m.portions,
          calories:      Math.round(m.calories),
          protein:       Math.round(m.protein * 10) / 10,
          carbs:         Math.round(m.carbs   * 10) / 10,
          fats:          Math.round(m.fats    * 10) / 10,
          macro_source:  m.catalog_verified ? 'catalog' : 'estimated',
          catalog_verified: m.catalog_verified,
        });
      }
    }

    // ─── STEP 9: Deactivate existing active plans ───
    const existingPlans = await MealPlan.filter({ client_id: clientId, active: true });
    for (const p of existingPlans) {
      try { await MealPlan.update(p.id, { active: false }); } catch (_) {}
    }

    // ─── STEP 10: Plan name with IST timestamp ───
    const istTs    = getISTTimestamp();
    const planName = `${client.full_name} — Basic Plan (${days} Days) | ${istTs}`;

    // ─── STEP 11: Save plan ───
    // No MPESS for Basic Plan (Pro feature only)
    const plan = await MealPlan.create({
      client_id:       clientId,
      name:            planName,
      plan_tier:       'basic',
      duration:        days,
      food_preference: resolvedDiet,
      target_calories: targetCal,
      meals:           allMeals,
      active:          true,
      generation_parameters: {
        duration:          days,
        target_calories:   targetCal,
        kcal_source:       kcalSource,
        kcal_auto_calc:    kcalAutoCalc,
        goal,
        food_preference:   resolvedDiet,
        generation_count:  1,
      },
      // stored metadata fields
      disease_focus:       [],
      conflict_resolution: 'basic_plan_no_conditions',
    });

    console.log('✅ Basic catalog plan saved:', {
      name:            planName,
      days,
      meals:           allMeals.length,
      rotation:        rotation.join(','),
      kcalSource,
      targetCal,
      fallbackSlots:   [...slotFallbacks],
    });

    return Response.json({
      success:           true,
      plan_id:           plan.id,
      plan_name:         planName,
      total_meals:       allMeals.length,
      rotation:          rotation.join(','),
      target_calories:   targetCal,
      kcal_auto_calc:    kcalAutoCalc,
      kcal_source:       kcalSource,
      fallback_slots:    [...slotFallbacks],
      macro_source:      'catalog',
      generation_mode:   'basic_catalog',
      disclaimer:        '⚠️ This is a general healthy meal plan based on your profile. It is not designed for managing medical conditions. Macros sourced from verified food catalog.',
      // backward-compat fields
      mealPlan: {
        id:              plan.id,
        name:            planName,
        duration:        days,
        target_calories: targetCal,
        food_preference: resolvedDiet,
        meals:           allMeals,
      },
      meals: allMeals,
    });

  } catch (err) {
    console.error('generateBasicMealPlan error:', err.message, err.stack);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});