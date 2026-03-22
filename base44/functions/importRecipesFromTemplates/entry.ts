import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.user_type !== 'super_admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    // Fetch all recipe templates from DownloadableTemplate
    const allTemplates = await base44.asServiceRole.entities.DownloadableTemplate.filter({
      category: 'recipe'
    });

    if (allTemplates.length === 0) {
      return Response.json({
        success: true,
        message: 'No recipe templates found to import',
        imported: 0
      });
    }

    const results = [];
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const template of allTemplates) {
      try {
        // Check if recipe already exists with same name
        const existingRecipes = await base44.asServiceRole.entities.Recipe.filter({
          name: template.name
        });

        if (existingRecipes.length > 0) {
          results.push({
            template_name: template.name,
            success: false,
            skipped: true,
            message: 'Recipe already exists'
          });
          skippedCount++;
          continue;
        }

        // Extract nutritional info from template metadata or use defaults
        const recipeData = {
          name: template.name,
          description: template.description || `Recipe from template library`,
          meal_type: 'lunch', // Default, can be adjusted
          food_preference: template.food_preference || 'veg',
          regional_cuisine: template.regional_preference || 'north',
          category: 'main_course',
          prep_time: 20,
          cook_time: 30,
          servings: 2,
          ingredients: [
            { item: 'See template file for ingredients', quantity: 'As per template' }
          ],
          instructions: [
            'Download the template file for detailed cooking instructions',
            'Follow the steps provided in the template document',
            'Adjust quantities based on your serving needs'
          ],
          nutritional_info: {
            calories: template.target_calories || 400,
            protein: Math.round((template.target_calories || 400) * 0.25 / 4),
            carbs: Math.round((template.target_calories || 400) * 0.45 / 4),
            fats: Math.round((template.target_calories || 400) * 0.30 / 9)
          },
          tags: template.tags || ['template-imported', template.subcategory || 'general'],
          is_published: true,
          usage_count: 0
        };

        await base44.asServiceRole.entities.Recipe.create(recipeData);

        results.push({
          template_name: template.name,
          success: true,
          message: 'Imported successfully'
        });
        successCount++;

      } catch (error) {
        console.error(`Error importing template ${template.name}:`, error);
        results.push({
          template_name: template.name,
          success: false,
          error: error.message
        });
        failedCount++;
      }
    }

    return Response.json({
      success: true,
      summary: {
        total: allTemplates.length,
        imported: successCount,
        failed: failedCount,
        skipped: skippedCount
      },
      results: results
    });

  } catch (error) {
    console.error('Import recipes from templates error:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});