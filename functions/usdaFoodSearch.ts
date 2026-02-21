import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { query, pageSize = 10 } = await req.json();
    if (!query) return Response.json({ error: 'Query is required' }, { status: 400 });

    // USDA FoodData Central - free demo key (limited but functional)
    const apiKey = Deno.env.get("USDA_API_KEY") || "DEMO_KEY";
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(query)}&pageSize=${pageSize}&dataType=Foundation,SR%20Legacy,Survey%20(FNDDS)`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`USDA API error: ${response.status}`);

    const data = await response.json();

    // Parse and normalize results
    const foods = (data.foods || []).map(food => {
      const nutrients = {};
      (food.foodNutrients || []).forEach(n => {
        const name = n.nutrientName?.toLowerCase() || '';
        const val = n.value || 0;
        if (name.includes('energy') && name.includes('kcal')) nutrients.calories = val;
        else if (name.includes('energy') && !nutrients.calories) nutrients.calories = val;
        else if (name === 'protein') nutrients.protein = val;
        else if (name.includes('carbohydrate, by difference')) nutrients.carbs = val;
        else if (name.includes('total lipid (fat)')) nutrients.fats = val;
        else if (name.includes('fiber, total dietary')) nutrients.fiber = val;
        else if (name.includes('sugars, total')) nutrients.sugar = val;
        else if (name.includes('sodium')) nutrients.sodium = val;
        else if (name.includes('calcium')) nutrients.calcium = val;
        else if (name.includes('iron')) nutrients.iron = val;
        else if (name.includes('potassium')) nutrients.potassium = val;
        else if (name.includes('vitamin c')) nutrients.vitamin_c = val;
        else if (name.includes('vitamin d')) nutrients.vitamin_d = val;
        else if (name.includes('cholesterol')) nutrients.cholesterol = val;
        else if (name.includes('fatty acids, total saturated')) nutrients.saturated_fat = val;
      });

      return {
        fdcId: food.fdcId,
        description: food.description,
        brandOwner: food.brandOwner || null,
        dataType: food.dataType,
        servingSize: food.servingSize || 100,
        servingSizeUnit: food.servingSizeUnit || 'g',
        nutrients
      };
    });

    return Response.json({ foods, totalHits: data.totalHits || foods.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});