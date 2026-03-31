import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { clientId, planDuration = 10 } = body;
    if (!clientId) return Response.json({ error: 'clientId required' }, { status: 400 });

    const Client      = base44.asServiceRole.entities.Client;
    const DishCatalog = base44.asServiceRole.entities.DishCatalog;
    const ClinicalIntake = base44.asServiceRole.entities.ClinicalIntake;

    // ── Read client ──
    const clientArr = await Client.filter({ id: clientId });
    const client = clientArr[0];
    if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });

    const resolvedDiet = (client.food_preference || 'veg').toLowerCase().replace(/[\s-]/g, '_');
    const targetCal = parseInt(client.target_calories || 1500);

    // ── Read clinical intake for conditions/allergies ──
    const intakes = await ClinicalIntake.filter({ client_id: clientId });
    const intake = intakes[0] || null;
    const conditions = intake?.health_conditions || [];
    const allergies  = intake?.likes_dislikes_allergies?.allergies || [];
    const dislikes   = intake?.likes_dislikes_allergies?.dislikes  || [];
    const noGoFoods  = intake?.likes_dislikes_allergies?.no_go_foods || [];

    // ── Slot % targets ──
    const slotPcts = {
      early_morning: 0.04,
      breakfast:     0.22,
      mid_morning:   0.09,
      lunch:         0.32, // grain 14% + dal 10% + sabzi 8%
      evening_snack: 0.09,
      dinner:        0.24, // grain 13% + protein 11%
    };

    // ── Load & filter DishCatalog by diet ──
    const allDishes = await DishCatalog.filter({ status: 'verified' });

    const dietMap = {
      jain:       ['jain'],
      veg:        ['veg', 'jain', 'all'],
      eggetarian: ['veg', 'jain', 'egg', 'eggetarian', 'all'],
      non_veg:    ['veg', 'jain', 'egg', 'eggetarian', 'non_veg', 'all'],
    };
    const eligible = dietMap[resolvedDiet] || ['veg', 'all'];

    // Filter out allergies/dislikes/no-go by name match
    const excludeWords = [...allergies, ...dislikes, ...noGoFoods].map(s => s.toLowerCase());

    const filteredDishes = allDishes.filter(d => {
      if (!eligible.includes(d.diet_type)) return false;
      if (excludeWords.some(w => d.name?.toLowerCase().includes(w))) return false;
      return true;
    });

    // Group by slot for dish lists
    const slotAlias = {
      snack: 'evening_snack',
      dinner_prot: 'dinner_protein',
      dinner_sabzi: 'dinner_protein',
    };

    const bySlot = {};
    for (const d of filteredDishes) {
      const key = slotAlias[d.slot] || d.slot;
      if (!bySlot[key]) bySlot[key] = [];
      bySlot[key].push(d);
    }

    const slotList = (key) => {
      const dishes = bySlot[key] || [];
      return dishes.slice(0, 25).map(d => d.name).join(', ') || 'none';
    };

    const lunchTarget  = Math.round(targetCal * 0.32);
    const dinnerTarget = Math.round(targetCal * 0.24);
    const conditionStr = conditions.length ? conditions.join(', ') : 'none';
    const allergyStr   = excludeWords.length ? excludeWords.join(', ') : 'none';

    const systemPrompt = `You are a clinical dietitian generating a meal options card.
Return ONLY valid JSON — no explanation, no markdown fences.`;

    const userPrompt = `Client: ${client.full_name}
Diet type: ${resolvedDiet}
Daily kcal target: ${targetCal} kcal
Health conditions: ${conditionStr}
Allergies/avoid: ${allergyStr}
Plan duration: ${planDuration} days

Slot kcal targets:
  early_morning: ${Math.round(targetCal * 0.04)} kcal
  breakfast: ${Math.round(targetCal * 0.22)} kcal
  mid_morning: ${Math.round(targetCal * 0.09)} kcal
  lunch (complete meal): ${lunchTarget} kcal
  evening_snack: ${Math.round(targetCal * 0.09)} kcal
  dinner (complete meal): ${dinnerTarget} kcal

Available dishes:
  early_morning:  ${slotList('early_morning')}
  breakfast:      ${slotList('breakfast')}
  mid_morning:    ${slotList('mid_morning')}
  lunch grains:   ${slotList('lunch_grain')}
  lunch dal/protein: ${slotList('lunch_dal')}
  lunch sabzi:    ${slotList('lunch_sabzi')}
  evening_snack:  ${slotList('evening_snack')}
  dinner grains:  ${slotList('dinner_grain')}
  dinner protein/sabzi: ${slotList('dinner_protein')}

Rules for early_morning, breakfast, mid_morning, evening_snack:
- Choose 4-5 individual dish options
- Each a single dish from the available list
- Diet-appropriate, variety across options

Rules for LUNCH (complete meal combos):
- Generate 4-5 COMPLETE meal options
- Each option = grain + dal/protein + sabzi combined as one string
- Format: "GrainName (qty) + DalName + SabziName"
- Example: "Jowar Roti (2) + Dal Tadka + Bhindi Sabzi"
- Use only dishes from the available lunch lists above
- Rotate grains — different grain in each option
- Max 1 non-veg combo total
- Apply disease rules for: ${conditionStr}

Rules for DINNER (complete meal combos):
- Generate 4-5 COMPLETE meal options
- Each option = grain + protein/sabzi combined
- Format: "GrainName (qty) + ProteinName + SabziName" or "GrainName (qty) + DishName"
- Example: "Bajra Roti (2) + Palak Dal + Lauki Sabzi"
- Use only dishes from the available dinner lists above
- No same grain at both lunch AND dinner across the combo sets
- Max 1 non-veg combo total (shared with lunch)
- Apply disease rules for: ${conditionStr}

Return this EXACT JSON structure (no extra keys):
{
  "early_morning":  ["dish1", "dish2", "dish3", "dish4"],
  "breakfast":      ["dish1", "dish2", "dish3", "dish4", "dish5"],
  "mid_morning":    ["dish1", "dish2", "dish3", "dish4"],
  "lunch":  [
    "Grain (qty) + Dal + Sabzi",
    "Grain (qty) + Dal + Sabzi",
    "Grain (qty) + Dal + Sabzi",
    "Grain (qty) + Dal + Sabzi"
  ],
  "evening_snack":  ["dish1", "dish2", "dish3", "dish4"],
  "dinner": [
    "Grain (qty) + Protein + Sabzi",
    "Grain (qty) + Protein + Sabzi",
    "Grain (qty) + Protein + Sabzi",
    "Grain (qty) + Protein + Sabzi"
  ]
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('CLAUDE'),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    const apiData = await response.json();
    if (apiData.error) throw new Error('Claude API: ' + apiData.error.message);

    const raw = apiData.content?.[0]?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();

    let parsed;
    try { parsed = JSON.parse(clean); }
    catch (e) { throw new Error('Claude returned invalid JSON: ' + raw.slice(0, 300)); }

    // ── Build catalog lookup map ──
    const catalogMap = {};
    for (const d of allDishes) {
      catalogMap[d.name.toLowerCase()] = d;
      catalogMap[d.name.toLowerCase().replace(/[^a-z0-9 ]/g, '')] = d;
    }

    const lookupDish = (name) => {
      const n = name.trim();
      // Strip quantity like "(2)" for lookup
      const stripped = n.replace(/\s*\(\d+\)\s*/g, '').trim();
      return catalogMap[n.toLowerCase()]
        || catalogMap[n.toLowerCase().replace(/[^a-z0-9 ]/g, '')]
        || catalogMap[stripped.toLowerCase()]
        || catalogMap[stripped.toLowerCase().replace(/[^a-z0-9 ]/g, '')]
        || null;
    };

    const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];
    const COMBO_SLOTS = new Set(['lunch', 'dinner']);

    // ── Build slot options ──
    const slotResults = {};
    for (const [slotKey, items] of Object.entries(parsed)) {
      if (!Array.isArray(items)) continue;
      const opts = [];

      for (const item of items) {
        if (COMBO_SLOTS.has(slotKey)) {
          // ── Combo meal: split by ' + ' and sum macros ──
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
              totalCal  += comp.calories;
              totalProt += comp.protein;
              totalCarbs += comp.carbs;
              totalFat  += comp.fat;
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
          // ── Single dish ──
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

      // Auto-distribute days evenly
      const n = opts.length || 1;
      const baseDays = Math.floor(planDuration / n);
      const extra    = planDuration % n;
      opts.forEach((o, i) => {
        o.recommended_days = baseDays + (i < extra ? 1 : 0);
        o.option_label = OPTION_LABELS[i] || String(i + 1);
      });

      slotResults[slotKey] = opts;
    }

    console.log('✅ Mode B options generated for client:', clientId);

    return Response.json({ success: true, slots: slotResults, conditions, targetCal });

  } catch (err) {
    console.error('generateModeBOptions error:', err.message);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});