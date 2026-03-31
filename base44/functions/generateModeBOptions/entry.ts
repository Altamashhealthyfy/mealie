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
      early_morning:  0.04,
      breakfast:      0.22,
      mid_morning:    0.09,
      lunch_grain:    0.14,
      lunch_dal:      0.10,
      lunch_sabzi:    0.08,
      evening_snack:  0.09,
      dinner_grain:   0.13,
      dinner_protein: 0.11,
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

    // Group by slot — map catalog slot names to ModeB slot keys
    const slotAlias = {
      snack: 'evening_snack',
      dinner_prot: 'dinner_protein',
      dinner_sabzi: 'dinner_protein', // fallback
    };

    const bySlot = {};
    for (const d of filteredDishes) {
      const key = slotAlias[d.slot] || d.slot;
      if (!bySlot[key]) bySlot[key] = [];
      bySlot[key].push(d);
    }

    // Build dish list strings per slot (limit to 30 per slot to keep prompt manageable)
    const slotList = (key) => {
      const dishes = bySlot[key] || [];
      return dishes.slice(0, 30).map(d => d.name).join(', ') || 'none';
    };

    const slotTargets = Object.fromEntries(
      Object.entries(slotPcts).map(([k, pct]) => [k, Math.round(targetCal * pct)])
    );

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
${Object.entries(slotTargets).map(([k, v]) => `  ${k}: ${v} kcal`).join('\n')}

Available dishes per slot:
  early_morning:  ${slotList('early_morning')}
  breakfast:      ${slotList('breakfast')}
  mid_morning:    ${slotList('mid_morning')}
  lunch_grain:    ${slotList('lunch_grain')}
  lunch_dal:      ${slotList('lunch_dal')}
  lunch_sabzi:    ${slotList('lunch_sabzi')}
  evening_snack:  ${slotList('evening_snack')}
  dinner_grain:   ${slotList('dinner_grain')}
  dinner_protein: ${slotList('dinner_protein')}

Rules:
- Choose 4 options per slot (5 for breakfast and lunch slots)
- Each option must be a different dish
- Rotate grains across options (no same grain repeated in dinner_grain and lunch_grain in same option row)
- Max 1 non-veg slot per option row (only at lunch_dal or dinner_protein)
- Apply disease rules for: ${conditionStr}
- Variety across options — different proteins, different grains

Return this exact JSON structure:
{
  "early_morning":  ["dish1", "dish2", "dish3", "dish4"],
  "breakfast":      ["dish1", "dish2", "dish3", "dish4", "dish5"],
  "mid_morning":    ["dish1", "dish2", "dish3", "dish4"],
  "lunch_grain":    ["dish1", "dish2", "dish3", "dish4", "dish5"],
  "lunch_dal":      ["dish1", "dish2", "dish3", "dish4", "dish5"],
  "lunch_sabzi":    ["dish1", "dish2", "dish3", "dish4", "dish5"],
  "evening_snack":  ["dish1", "dish2", "dish3", "dish4"],
  "dinner_grain":   ["dish1", "dish2", "dish3", "dish4"],
  "dinner_protein": ["dish1", "dish2", "dish3", "dish4"]
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
      // Also index by name without punctuation for fuzzy match
      catalogMap[d.name.toLowerCase().replace(/[^a-z0-9 ]/g, '')] = d;
    }

    // ── Build slot option objects with macros from catalog ──
    const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

    const slotResults = {};
    for (const [slotKey, dishNames] of Object.entries(parsed)) {
      if (!Array.isArray(dishNames)) continue;
      const opts = [];
      for (const name of dishNames) {
        // Lookup by exact name, then normalized
        const d = catalogMap[name.toLowerCase()]
          || catalogMap[name.toLowerCase().replace(/[^a-z0-9 ]/g, '')]
          || null;

        if (!d) {
          // Include with unknown macros but still show it
          opts.push({
            dish_name: name,
            dish_id: null,
            portion_size: 'medium',
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            diet_type: 'veg',
            catalog_verified: false,
          });
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

      // Auto-distribute days evenly
      const n = opts.length;
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