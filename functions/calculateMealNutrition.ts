import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Calculate exact nutrition for a meal by looking up ingredients in the database.
 * Input: { template_code, servings } OR { ingredients: [{name, qty, unit}] }
 * Output: { kcal, protein_g, carbs_g, fat_g, fibre_g, sodium_mg, potassium_mg }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { template_code, servings = 1, ingredients: customIngredients } = body;

    let ingredientsList = customIngredients || [];

    // If template_code provided, fetch recipe from DB
    if (template_code) {
      const recipes = await base44.asServiceRole.entities.RecipeTemplate.filter({ template_code });
      if (recipes.length === 0) {
        return Response.json({ error: `Recipe template '${template_code}' not found` }, { status: 404 });
      }
      const recipe = recipes[0];

      // If pre-calculated nutrition exists and servings = 1, return directly
      if (recipe.calculated_nutrition_per_serving && servings === 1) {
        return Response.json({
          success: true,
          template_code,
          dish_name: recipe.dish_name,
          servings,
          nutrition: recipe.calculated_nutrition_per_serving,
          source: 'pre_calculated',
        });
      }

      // Otherwise scale by servings
      if (recipe.calculated_nutrition_per_serving) {
        const n = recipe.calculated_nutrition_per_serving;
        return Response.json({
          success: true,
          template_code,
          dish_name: recipe.dish_name,
          servings,
          nutrition: {
            kcal: Math.round(n.kcal * servings * 10) / 10,
            protein_g: Math.round(n.protein_g * servings * 10) / 10,
            carbs_g: Math.round(n.carbs_g * servings * 10) / 10,
            fat_g: Math.round(n.fat_g * servings * 10) / 10,
            fibre_g: Math.round((n.fibre_g || 0) * servings * 10) / 10,
            sodium_mg: Math.round((n.sodium_mg || 0) * servings * 10) / 10,
            potassium_mg: Math.round((n.potassium_mg || 0) * servings * 10) / 10,
          },
          source: 'pre_calculated_scaled',
        });
      }

      ingredientsList = recipe.ingredients || [];
    }

    if (!ingredientsList.length) {
      return Response.json({ error: 'No ingredients to calculate' }, { status: 400 });
    }

    // Fetch all ingredient names needed
    const ingredientNames = ingredientsList.map(i => i.ingredient_name);
    const allDbIngredients = await base44.asServiceRole.entities.NutritionalIngredient.list();

    // Calculate nutrition
    let kcal = 0, protein = 0, carbs = 0, fat = 0, fibre = 0, sodium = 0, potassium = 0;
    const missing = [];

    for (const ing of ingredientsList) {
      const dbEntry = allDbIngredients.find(
        d => d.ingredient_name.toLowerCase() === ing.ingredient_name.toLowerCase()
      );
      if (!dbEntry) {
        missing.push(ing.ingredient_name);
        continue;
      }

      let grams = ing.qty * servings;
      if (ing.unit === 'ml' && dbEntry.density_g_per_ml) {
        grams = ing.qty * servings * dbEntry.density_g_per_ml;
      }

      const factor = grams / 100;
      kcal      += (dbEntry.kcal_100g || 0) * factor;
      protein   += (dbEntry.protein_100g || 0) * factor;
      carbs     += (dbEntry.carbs_100g || 0) * factor;
      fat       += (dbEntry.fat_100g || 0) * factor;
      fibre     += (dbEntry.fibre_100g || 0) * factor;
      sodium    += (dbEntry.sodium_mg_100g || 0) * factor;
      potassium += (dbEntry.potassium_mg_100g || 0) * factor;
    }

    return Response.json({
      success: true,
      servings,
      nutrition: {
        kcal: Math.round(kcal * 10) / 10,
        protein_g: Math.round(protein * 10) / 10,
        carbs_g: Math.round(carbs * 10) / 10,
        fat_g: Math.round(fat * 10) / 10,
        fibre_g: Math.round(fibre * 10) / 10,
        sodium_mg: Math.round(sodium * 10) / 10,
        potassium_mg: Math.round(potassium * 10) / 10,
      },
      missing_ingredients: missing,
      source: 'calculated_from_db',
    });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});