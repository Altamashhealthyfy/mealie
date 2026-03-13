import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Fields to ignore during import
const IGNORED_FIELDS = [
  'default_servings_value',
  '_orig_template_code',
  '_orig_meal_category',
  '_orig_meal_flexibility',
  '_orig_meal_type_raw',
];

function cleanRecipeData(rawRecipe) {
  const cleaned = {};
  for (const [key, value] of Object.entries(rawRecipe)) {
    if (IGNORED_FIELDS.includes(key)) continue;
    if (value === null || value === undefined || value === '') continue;
    cleaned[key] = value;
  }
  return cleaned;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { recipes } = await req.json();

    if (!recipes || !Array.isArray(recipes)) {
      return Response.json({ error: 'Invalid payload: recipes array is required' }, { status: 400 });
    }

    let created = 0;
    let updated = 0;
    let errors = [];

    for (const rawRecipe of recipes) {
      const recipeData = cleanRecipeData(rawRecipe);

      if (!recipeData.name) {
        errors.push({ recipe: rawRecipe, error: 'Missing recipe name, skipped.' });
        continue;
      }

      // Check if a recipe with this name already exists
      const existing = await base44.asServiceRole.entities.Recipe.filter({ name: recipeData.name });

      if (existing && existing.length > 0) {
        // Update existing recipe
        await base44.asServiceRole.entities.Recipe.update(existing[0].id, recipeData);
        updated++;
      } else {
        // Create new recipe
        await base44.asServiceRole.entities.Recipe.create(recipeData);
        created++;
      }
    }

    return Response.json({
      success: true,
      summary: {
        total: recipes.length,
        created,
        updated,
        errors: errors.length,
      },
      errors,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});