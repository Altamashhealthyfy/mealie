import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { clientId, slotKey, planDuration = 10 } = body;
    if (!clientId || !slotKey) return Response.json({ error: 'clientId and slotKey required' }, { status: 400 });

    const Client         = base44.asServiceRole.entities.Client;
    const DishCatalog    = base44.asServiceRole.entities.DishCatalog;
    const ClinicalIntake = base44.asServiceRole.entities.ClinicalIntake;

    const clientArr = await Client.filter({ id: clientId });
    const client = clientArr[0];
    if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });

    const resolvedDiet = (client.food_preference || 'veg').toLowerCase().replace(/[\s-]/g, '_');
    const targetCal    = parseInt(client.target_calories || 1500);

    const intakes = await ClinicalIntake.filter({ client_id: clientId });
    const intake  = intakes[0] || null;
    const conditions   = intake?.health_conditions || [];
    const allergies    = intake?.likes_dislikes_allergies?.allergies  || [];
    const dislikes     = intake?.likes_dislikes_allergies?.dislikes   || [];
    const noGoFoods    = intake?.likes_dislikes_allergies?.no_go_foods || [];
    const excludeWords = [...allergies, ...dislikes, ...noGoFoods].map(s => s.toLowerCase());

    const allDishes = await DishCatalog.filter({ status: 'verified' });

    const dietMap = {
      jain:       ['jain'],
      veg:        ['veg', 'jain', 'all'],
      eggetarian: ['veg', 'jain', 'egg', 'eggetarian', 'all'],
      non_veg:    ['veg', 'jain', 'egg', 'eggetarian', 'non_veg', 'all'],
    };
    const eligible = dietMap[resolvedDiet] || ['veg', 'all'];

    const filteredDishes = allDishes.filter(d => {
      if (!eligible.includes(d.diet_type)) return false;
      if (excludeWords.some(w => d.name?.toLowerCase().includes(w))) return false;
      return true;
    });

    const bySlot = {};
    for (const d of filteredDishes) {
      if (!bySlot[d.slot]) bySlot[d.slot] = [];
      bySlot[d.slot].push(d);
    }

    const slotList = (key) => {
      const dishes = bySlot[key] || [];
      return dishes.slice(0, 25).map(d => d.name).join(', ') || 'none';
    };

    const conditionStr = conditions.length ? conditions.join(', ') : 'none';
    const allergyStr   = excludeWords.length ? excludeWords.join(', ') : 'none';
    const isCombo      = slotKey === 'lunch' || slotKey === 'dinner';

    const slotPctMap = { early_morning: 0.04, breakfast: 0.22, mid_morning: 0.09, lunch: 0.32, evening_snack: 0.09, dinner: 0.24 };
    const slotKcal = Math.round(targetCal * (slotPctMap[slotKey] || 0.1));

    const slotLabelMap = { early_morning: 'Early Morning', breakfast: 'Breakfast', mid_morning: 'Mid Morning', lunch: 'Lunch', evening_snack: 'Evening Snack', dinner: 'Dinner' };
    const slotLabel = slotLabelMap[slotKey] || slotKey;

    let userPrompt;
    if (isCombo) {
      const grainSlot  = slotKey === 'lunch' ? 'lunch_grain' : 'dinner_grain';
      const protSlot   = slotKey === 'lunch' ? 'lunch_dal'   : 'dinner_prot';
      const sabziSlot  = slotKey === 'lunch' ? 'lunch_sabzi' : 'lunch_sabzi';
      userPrompt = `Client: ${client.full_name}, Diet: ${resolvedDiet}, Target: ${targetCal} kcal/day
Health conditions: ${conditionStr}
Allergies/avoid: ${allergyStr}

Generate 4-5 NEW complete ${slotLabel} meal combos (~${slotKcal} kcal each).
Available grains: ${slotList(grainSlot)}
Available dal/protein: ${slotList(protSlot)}
Available sabzi: ${slotList(sabziSlot)}

Rules:
- Each option = grain + dal/protein + sabzi
- Format: "GrainName (qty) + DalName + SabziName"
- Rotate grains across options
- Apply disease rules for: ${conditionStr}
- Return ONLY a JSON array of strings, no explanation

Example: ["Jowar Roti (2) + Dal Tadka + Bhindi", "Bajra Roti (2) + Moong Dal + Lauki"]`;
    } else {
      const dishListKey = slotKey === 'evening_snack' ? 'evening_snack' : slotKey;
      userPrompt = `Client: ${client.full_name}, Diet: ${resolvedDiet}, Target: ${targetCal} kcal/day
Health conditions: ${conditionStr}
Allergies/avoid: ${allergyStr}

Generate 4-5 NEW ${slotLabel} options (~${slotKcal} kcal each).
Available dishes: ${slotList(dishListKey)}

Rules:
- Each option = 1 dish from the available list
- Variety across options
- Apply disease rules for: ${conditionStr}
- Return ONLY a JSON array of strings, no explanation

Example: ["Dish1", "Dish2", "Dish3", "Dish4"]`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('CLAUDE'),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: 'You are a clinical dietitian. Return ONLY valid JSON — no explanation, no markdown fences.',
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    const apiData = await response.json();
    if (apiData.error) throw new Error('Claude API: ' + apiData.error.message);

    const raw = apiData.content?.[0]?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    let items;
    try { items = JSON.parse(clean); }
    catch (e) { throw new Error('Claude returned invalid JSON: ' + raw.slice(0, 200)); }

    if (!Array.isArray(items)) throw new Error('Expected JSON array from Claude');

    // Build catalog lookup
    const catalogMap = {};
    for (const d of allDishes) {
      catalogMap[d.name.toLowerCase()] = d;
      catalogMap[d.name.toLowerCase().replace(/[^a-z0-9 ]/g, '')] = d;
    }

    const lookupDish = (name) => {
      const n = name.trim();
      const stripped = n.replace(/\s*\(\d+\)\s*/g, '').trim();
      return catalogMap[n.toLowerCase()]
        || catalogMap[n.toLowerCase().replace(/[^a-z0-9 ]/g, '')]
        || catalogMap[stripped.toLowerCase()]
        || catalogMap[stripped.toLowerCase().replace(/[^a-z0-9 ]/g, '')]
        || null;
    };

    const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];
    const opts = [];

    for (const item of items) {
      if (isCombo) {
        const parts = item.split(' + ').map(p => p.trim()).filter(Boolean);
        const components = [];
        let totalCal = 0, totalProt = 0, totalCarbs = 0, totalFat = 0;
        let allVerified = true;
        for (const part of parts) {
          const d = lookupDish(part);
          if (d) {
            const cal = d.medium_kcal || d.calories || 0;
            const base = d.calories || 1;
            const ratio = cal / base;
            const comp = {
              dish_name: d.name,
              dish_id: d.dish_id || d.id,
              calories: cal,
              protein: Math.round((d.protein || 0) * ratio * 10) / 10,
              carbs:   Math.round((d.carbs   || 0) * ratio * 10) / 10,
              fat:     Math.round((d.fats    || 0) * ratio * 10) / 10,
              portion_label: d.medium_label || '1 serving',
              catalog_verified: true,
            };
            components.push(comp);
            totalCal   += comp.calories;
            totalProt  += comp.protein;
            totalCarbs += comp.carbs;
            totalFat   += comp.fat;
          } else {
            components.push({ dish_name: part, calories: 0, protein: 0, carbs: 0, fat: 0, catalog_verified: false });
            allVerified = false;
          }
        }
        opts.push({
          meal_name: item,
          components,
          calories: Math.round(totalCal),
          protein:  Math.round(totalProt  * 10) / 10,
          carbs:    Math.round(totalCarbs * 10) / 10,
          fat:      Math.round(totalFat   * 10) / 10,
          is_combo: true,
          catalog_verified: allVerified,
        });
      } else {
        const d = lookupDish(item);
        if (!d) {
          opts.push({ dish_name: item, dish_id: null, portion_size: 'medium', calories: 0, protein: 0, carbs: 0, fat: 0, catalog_verified: false });
          continue;
        }
        const calories = d.medium_kcal || d.calories || 0;
        const base = d.calories || 1;
        const ratio = calories / base;
        opts.push({
          dish_name: d.name,
          dish_id: d.dish_id || d.id,
          portion_size: 'medium',
          portion_label: d.medium_label || '1 serving',
          calories,
          protein: Math.round((d.protein || 0) * ratio * 10) / 10,
          carbs:   Math.round((d.carbs   || 0) * ratio * 10) / 10,
          fat:     Math.round((d.fats    || 0) * ratio * 10) / 10,
          diet_type: d.diet_type || 'veg',
          catalog_verified: true,
        });
      }
    }

    // Distribute days evenly
    const n = opts.length || 1;
    const baseDays = Math.floor(planDuration / n);
    const extra    = planDuration % n;
    opts.forEach((o, i) => {
      o.recommended_days = baseDays + (i < extra ? 1 : 0);
      o.option_label = OPTION_LABELS[i] || String(i + 1);
    });

    console.log(`✅ Slot "${slotKey}" regenerated for client: ${clientId}, ${opts.length} options`);
    return Response.json({ success: true, slotKey, options: opts });

  } catch (err) {
    console.error('regenerateModeBSlot error:', err.message);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});