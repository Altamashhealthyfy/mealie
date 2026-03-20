import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { clientId, calorieTarget, dietType, numDays = 7, goal } = await req.json();
    if (!clientId) return Response.json({ error: 'clientId required' }, { status: 400 });

    const clients = await base44.asServiceRole.entities.Client.filter({ id: clientId });
    const client = clients[0];
    if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });

    const targetCal = parseInt(calorieTarget || client.target_calories || 1800);
    const diet = dietType || client.food_preference || 'veg';
    const days = parseInt(numDays) || 7;

    const systemPrompt = `You are a professional Indian dietitian. Generate healthy balanced Indian meal plans.

RULES:
- Generate 4 day templates (A, B, C, D) — rotate across all days
- Diet type: ${diet}
- Calories: ${targetCal} kcal/day
- 6 meal slots: early_morning 6%, breakfast 22%, mid_morning 9%, lunch 33%, evening_snack 8%, dinner 22%
- Use authentic Indian dish names with portions
- Rotate grains: wheat, rice, millet, oats
- Balanced nutrition — protein, carbs, fats in every meal
- No disease-specific rules — this is a general healthy plan
- Early morning: warm drink + nuts only
- Mid morning: fruit or buttermilk only
- Evening snack: light snack only — no grains
- Lunch: grain + dal + sabzi
- Dinner: lighter than lunch

Return ONLY valid JSON:
{
  "templates": {
    "A": {"early_morning": {"dish": "...", "calories": 0, "protein": 0, "carbs": 0, "fats": 0}, "breakfast": {"dish": "...", "calories": 0, "protein": 0, "carbs": 0, "fats": 0}, "mid_morning": {"dish": "...", "calories": 0, "protein": 0, "carbs": 0, "fats": 0}, "lunch": {"dish": "...", "calories": 0, "protein": 0, "carbs": 0, "fats": 0}, "evening_snack": {"dish": "...", "calories": 0, "protein": 0, "carbs": 0, "fats": 0}, "dinner": {"dish": "...", "calories": 0, "protein": 0, "carbs": 0, "fats": 0}},
    "B": {"early_morning": {"dish": "...", "calories": 0, "protein": 0, "carbs": 0, "fats": 0}, "breakfast": {"dish": "...", "calories": 0, "protein": 0, "carbs": 0, "fats": 0}, "mid_morning": {"dish": "...", "calories": 0, "protein": 0, "carbs": 0, "fats": 0}, "lunch": {"dish": "...", "calories": 0, "protein": 0, "carbs": 0, "fats": 0}, "evening_snack": {"dish": "...", "calories": 0, "protein": 0, "carbs": 0, "fats": 0}, "dinner": {"dish": "...", "calories": 0, "protein": 0, "carbs": 0, "fats": 0}},
    "C": {"early_morning": {"dish": "...", "calories": 0, "protein": 0, "carbs": 0, "fats": 0}, "breakfast": {"dish": "...", "calories": 0, "protein": 0, "carbs": 0, "fats": 0}, "mid_morning": {"dish": "...", "calories": 0, "protein": 0, "carbs": 0, "fats": 0}, "lunch": {"dish": "...", "calories": 0, "protein": 0, "carbs": 0, "fats": 0}, "evening_snack": {"dish": "...", "calories": 0, "protein": 0, "carbs": 0, "fats": 0}, "dinner": {"dish": "...", "calories": 0, "protein": 0, "carbs": 0, "fats": 0}},
    "D": {"early_morning": {"dish": "...", "calories": 0, "protein": 0, "carbs": 0, "fats": 0}, "breakfast": {"dish": "...", "calories": 0, "protein": 0, "carbs": 0, "fats": 0}, "mid_morning": {"dish": "...", "calories": 0, "protein": 0, "carbs": 0, "fats": 0}, "lunch": {"dish": "...", "calories": 0, "protein": 0, "carbs": 0, "fats": 0}, "evening_snack": {"dish": "...", "calories": 0, "protein": 0, "carbs": 0, "fats": 0}, "dinner": {"dish": "...", "calories": 0, "protein": 0, "carbs": 0, "fats": 0}}
  },
  "mpess": {"sleep": "...", "stress": "...", "movement": "...", "mindfulness": "...", "pranayam": "..."}
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("CLAUDE"),
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: "user", content: `Generate a ${days}-day healthy Indian meal plan for: ${diet} diet, ${targetCal} kcal/day, goal: ${goal || 'general health'}` }]
      })
    });

    const data = await response.json();
    if (data.error) throw new Error("Claude API: " + data.error.message);
    const text = data.content?.[0]?.text || "";
    let clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    // Extract the outermost JSON object robustly
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      clean = clean.slice(firstBrace, lastBrace + 1);
    }
    const parsed = JSON.parse(clean);
    const templates = parsed.templates;
    const mpessData = parsed.mpess || {};

    const ROTATION = [0, 1, 2, 3, 1, 0, 3, 2, 0, 1, 2, 3, 0, 1];
    const templateKeys = ['A', 'B', 'C', 'D'];
    const SLOT_PCT = { early_morning: 0.06, breakfast: 0.22, mid_morning: 0.09, lunch: 0.33, evening_snack: 0.08, dinner: 0.22 };

    const meals = [];
    for (let day = 1; day <= days; day++) {
      const tKey = templateKeys[ROTATION[(day - 1) % 4]];
      const template = templates[tKey] || templates['A'];
      for (const [slot, pct] of Object.entries(SLOT_PCT)) {
        const m = template[slot] || {};
        if (m.dish) {
          meals.push({
            day,
            meal_type: slot,
            meal_name: m.dish,
            items: [m.dish],
            calories: m.calories || Math.round(targetCal * pct),
            protein: m.protein || 0,
            carbs: m.carbs || 0,
            fats: m.fats || 0
          });
        }
      }
    }

    const mpess = Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      sleep: mpessData.sleep || '',
      stress: mpessData.stress || '',
      movement: mpessData.movement || '',
      mindfulness: mpessData.mindfulness || '',
      pranayam: mpessData.pranayam || ''
    }));

    const existingPlans = await base44.asServiceRole.entities.MealPlan.filter({ client_id: clientId, active: true });
    for (const p of existingPlans) {
      try { await base44.asServiceRole.entities.MealPlan.update(p.id, { active: false }); } catch (e) {}
    }

    const now = new Date();
    const timestamp = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const planName = `${client.full_name} — Basic Plan (${days} Days) | ${timestamp}`;

    const mealPlan = await base44.asServiceRole.entities.MealPlan.create({
      client_id: clientId,
      name: planName,
      duration: days,
      target_calories: targetCal,
      food_preference: diet,
      meal_pattern: 'daily',
      meals,
      mpess,
      active: true,
      plan_tier: 'basic',
      generation_parameters: { calorieTarget: targetCal, dietType: diet, numDays: days, goal }
    });

    return Response.json({
      success: true,
      mealPlan: { id: mealPlan.id, name: planName, duration: days, target_calories: targetCal, food_preference: diet, meals, mpess },
      meals,
      mpess_recommendations: mpess
    });

  } catch (err) {
    console.error('generateBasicMealPlan error:', err.message);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});