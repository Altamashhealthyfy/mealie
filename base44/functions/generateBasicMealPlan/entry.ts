import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      clientId,
      numDays = 7,
      overrideDietType,
      overrideCalories,
      overrideGoal,
      // legacy param support
      calorieTarget,
      dietType,
      goal: goalParam,
    } = body;

    if (!clientId) return Response.json({ error: 'clientId required' }, { status: 400 });

    const Client     = base44.asServiceRole.entities.Client;
    const DishCatalog = base44.asServiceRole.entities.DishCatalog;
    const MealPlan   = base44.asServiceRole.entities.MealPlan;

    // ─── STEP 1: Read client ───
    const clientArr = await Client.filter({ id: clientId });
    const client = clientArr[0];
    if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });

    // ─── STEP 2: Resolve parameters ───
    const dietType2 = overrideDietType || dietType || client.food_preference || 'veg';
    const targetCal = parseInt(overrideCalories || calorieTarget || client.target_calories || 1500);
    const goal = overrideGoal || goalParam || client.goal || 'general_health';
    const resolvedDiet = dietType2.toLowerCase().replace(/[\s-]/g, '_');
    const days = parseInt(numDays) || 7;

    // ─── STEP 3: Slot targets ───
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
      dinner_sabzi:   Math.round(targetCal * 0.02)
    };

    // ─── STEP 4: Load and filter DishCatalog ───
    const allDishes = await DishCatalog.filter({ status: 'verified' });
    console.log(`Loaded ${allDishes.length} verified dishes from catalog`);

    const dietMap = {
      jain:       ['all'],
      veg:        ['all', 'veg'],
      eggetarian: ['all', 'veg', 'egg'],
      non_veg:    ['all', 'veg', 'egg', 'non_veg']
    };
    const eligibleTypes = dietMap[resolvedDiet] || ['all', 'veg'];
    const filtered = allDishes.filter(d => eligibleTypes.includes(d.diet_type));

    // Group by slot
    const bySlot = {};
    for (const d of filtered) {
      if (!bySlot[d.slot]) bySlot[d.slot] = [];
      bySlot[d.slot].push(d);
    }

    console.log('Dishes per slot:', Object.fromEntries(Object.entries(bySlot).map(([k,v]) => [k, v.length])));

    // ─── STEP 5: Send to Claude ───
    const slotList = (slot) =>
      (bySlot[slot] || []).map(d => `${d.dish_id}:${d.name}`).join(' | ');

    const systemPrompt = `You are HMRE — Healthyfy Meal Rule Engine.
Generate exactly 5 meal plan templates (A,B,C,D,E) for a BASIC health plan.
Use ONLY dishes from the provided lists.

RULES:
1. Pick ONE dish per slot per template
2. Each template must use DIFFERENT dishes from other templates
3. Rotate grains — each template uses a different grain
4. Rotate proteins — each template uses a different dal or protein
5. No dairy + non-veg in same template
6. Dinner grain must differ from lunch grain in same template
7. Lunch sabzi and dinner sabzi must differ in same template
8. Non-veg only at lunch_dal or dinner_prot — never snack

Return ONLY valid JSON:
{
  "A": {"early_morning":"ID:Name","breakfast":"ID:Name","mid_morning":"ID:Name","lunch_grain":"ID:Name","lunch_dal":"ID:Name","lunch_sabzi":"ID:Name","snack":"ID:Name","dinner_grain":"ID:Name","dinner_prot":"ID:Name","dinner_sabzi":"ID:Name"},
  "B": { same },
  "C": { same },
  "D": { same },
  "E": { same },
  "mpess": {"sleep":"...","stress":"...","movement":"...","mindfulness":"...","pranayam":"..."}
}`;

    const userPrompt = `Client: ${client.full_name || client.name}
Diet: ${resolvedDiet} | Target: ${targetCal} kcal | Goal: ${goal}
This is a BASIC general health plan — no specific medical conditions.

AVAILABLE DISHES:
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

Generate 5 varied templates with MPESS for general health.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('CLAUDE'),
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    const apiData = await response.json();
    if (apiData.error) throw new Error('Claude API: ' + apiData.error.message);
    const raw = apiData.content?.[0]?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    let parsed;
    try { parsed = JSON.parse(clean); }
    catch(e) { throw new Error('Claude returned invalid JSON: ' + raw.slice(0, 200)); }

    // ─── STEP 6: Catalog lookup map ───
    const catalogMap = {};
    for (const d of allDishes) {
      catalogMap[String(d.dish_id)] = d;
      catalogMap[d.name.toLowerCase()] = d;
    }

    // ─── STEP 7: Best portion picker ───
    function getBestPortion(dish, target) {
      if (!dish) return { label: 'standard', kcal: dish?.calories || 0 };
      const opts = [
        { label: dish.small_label,  kcal: dish.small_kcal  || 0 },
        { label: dish.medium_label, kcal: dish.medium_kcal || 0 },
        { label: dish.large_label,  kcal: dish.large_kcal  || 0 }
      ].filter(o => o.label && o.kcal > 0);
      if (!opts.length) return { label: '1 serving', kcal: dish.calories || 0 };
      return opts.reduce((best, o) =>
        Math.abs(o.kcal - target) < Math.abs(best.kcal - target) ? o : best
      );
    }

    function resolveDish(val) {
      if (!val) return null;
      const m = val.match(/^(\d+):/);
      if (m) return catalogMap[m[1]] || null;
      return catalogMap[val.toLowerCase()] || null;
    }

    // ─── STEP 8: Smart rotation ───
    function generateRotation(numDaysLocal) {
      const templates = ['A','B','C','D','E'];
      const rotation = [];
      const usage = {};
      templates.forEach(t => { usage[t] = 0; });
      for (let i = 0; i < numDaysLocal; i++) {
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

    const rotation = generateRotation(days);

    // ─── STEP 9: Build meals ───
    const SLOTS = [
      'early_morning','breakfast','mid_morning',
      'lunch_grain','lunch_dal','lunch_sabzi',
      'snack','dinner_grain','dinner_prot','dinner_sabzi'
    ];
    const slotMealType = {
      early_morning:'early_morning', breakfast:'breakfast',
      mid_morning:'mid_morning', lunch_grain:'lunch',
      lunch_dal:'lunch', lunch_sabzi:'lunch',
      snack:'evening_snack', dinner_grain:'dinner',
      dinner_prot:'dinner', dinner_sabzi:'dinner'
    };

    const allMeals = [];

    for (let day = 1; day <= days; day++) {
      const tmpl = parsed[rotation[day-1]];
      if (!tmpl) continue;

      const dayMeals = {};

      for (const subSlot of SLOTS) {
        const dish = resolveDish(tmpl[subSlot]);
        if (!dish) continue;

        const target = slotTargets[subSlot] || 100;
        const portion = getBestPortion(dish, target);
        const mealType = slotMealType[subSlot];
        const ratio = dish.calories > 0 ? portion.kcal / dish.calories : 1;

        if (!dayMeals[mealType]) {
          dayMeals[mealType] = {
            day, meal_type: mealType,
            names: [], portions: [],
            calories: 0, protein: 0, carbs: 0, fats: 0
          };
        }

        dayMeals[mealType].names.push(dish.name);
        dayMeals[mealType].portions.push(portion.label);
        dayMeals[mealType].calories += portion.kcal;
        dayMeals[mealType].protein  += Math.round(dish.protein * ratio * 10) / 10;
        dayMeals[mealType].carbs    += Math.round(dish.carbs   * ratio * 10) / 10;
        dayMeals[mealType].fats     += Math.round(dish.fats    * ratio * 10) / 10;
      }

      for (const m of Object.values(dayMeals)) {
        allMeals.push({
          day: m.day,
          meal_type: m.meal_type,
          meal_name: m.names.join(' + '),
          portion_sizes: m.portions,
          calories: Math.round(m.calories),
          protein: Math.round(m.protein * 10) / 10,
          carbs:   Math.round(m.carbs   * 10) / 10,
          fats:    Math.round(m.fats    * 10) / 10,
          macro_source: 'catalog'
        });
      }
    }

    // ─── STEP 10: MPESS ───
    const mpessData = parsed.mpess || {};
    const mpess = Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      sleep:       mpessData.sleep       || '',
      stress:      mpessData.stress      || '',
      movement:    mpessData.movement    || '',
      mindfulness: mpessData.mindfulness || '',
      pranayam:    mpessData.pranayam    || ''
    }));

    // ─── STEP 11: Deactivate existing active plans ───
    const existingPlans = await MealPlan.filter({ client_id: clientId, active: true });
    for (const p of existingPlans) {
      try { await MealPlan.update(p.id, { active: false }); } catch (e) {}
    }

    // ─── STEP 12: IST timestamp ───
    const now = new Date();
    const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dd = String(ist.getUTCDate()).padStart(2,'0');
    const mm = months[ist.getUTCMonth()];
    const yyyy = ist.getUTCFullYear();
    let hh = ist.getUTCHours();
    const min = String(ist.getUTCMinutes()).padStart(2,'0');
    const ampm = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12 || 12;
    const planName = `${client.full_name || client.name} — Basic Plan (${days} Days) | ${dd} ${mm} ${yyyy} ${String(hh).padStart(2,'0')}:${min} ${ampm} IST`;

    // ─── STEP 13: Save ───
    const plan = await MealPlan.create({
      client_id: clientId,
      name: planName,
      duration: days,
      food_preference: resolvedDiet,
      target_calories: targetCal,
      goal: goal,
      meals: allMeals,
      mpess: mpess,
      active: true,
      macro_source: 'catalog',
      rotation_used: rotation.join(','),
      plan_tier: 'basic',
      plan_type: 'basic'
    });

    console.log('✅ Basic plan generated:', {
      name: planName,
      days,
      meals: allMeals.length,
      rotation: rotation.join(','),
      macro_source: 'catalog'
    });

    return Response.json({
      success: true,
      plan_id: plan.id,
      plan_name: planName,
      total_meals: allMeals.length,
      rotation: rotation.join(','),
      // legacy fields for backward compat
      mealPlan: { id: plan.id, name: planName, duration: days, target_calories: targetCal, food_preference: resolvedDiet, meals: allMeals, mpess },
      meals: allMeals,
      mpess_recommendations: mpess
    });

  } catch (err) {
    console.error('generateBasicMealPlan error:', err.message);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});