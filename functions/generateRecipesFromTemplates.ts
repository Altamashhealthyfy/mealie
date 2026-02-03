import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.user_type !== 'super_admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    // Fetch all recipe templates
    const recipeTemplates = await base44.asServiceRole.entities.DownloadableTemplate.filter({
      category: 'recipe'
    });

    if (recipeTemplates.length === 0) {
      return Response.json({
        success: true,
        message: 'No recipe templates found',
        generated: 0
      });
    }

    const results = [];
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const template of recipeTemplates) {
      try {
        // Check if recipe already exists
        const existingRecipes = await base44.asServiceRole.entities.Recipe.filter({
          name: template.name
        });

        if (existingRecipes.length > 0) {
          results.push({
            template_name: template.name,
            success: false,
            skipped: true,
            message: 'Recipe already exists, skipped'
          });
          skippedCount++;
          continue;
        }

        // Generate complete recipe using AI
        const prompt = `Based on this recipe template information, create a complete, detailed Indian recipe:

Template Name: ${template.name}
Description: ${template.description || 'Not provided'}
Target Calories: ${template.target_calories || 'Not specified'} kcal
Food Preference: ${template.food_preference || 'veg'}
Regional Cuisine: ${template.regional_preference || 'north'} Indian
Duration: ${template.duration || '7'} days meal plan

Create a single authentic recipe that fits this template. Provide:
- A proper recipe name (if template name is generic, make it specific)
- Detailed description
- Appropriate meal type (breakfast/lunch/dinner/snack)
- Complete ingredient list with precise quantities
- Step-by-step cooking instructions
- Accurate nutritional information per serving
- Prep and cook time
- Number of servings (2-4)
- Relevant dietary tags

Make it authentic, practical, and delicious!`;

        const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: prompt,
          response_json_schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              meal_type: { 
                type: "string",
                enum: ["breakfast", "lunch", "dinner", "snack"]
              },
              food_preference: { type: "string" },
              regional_cuisine: { type: "string" },
              ingredients: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    item: { type: "string" },
                    quantity: { type: "string" }
                  }
                }
              },
              instructions: { 
                type: "array", 
                items: { type: "string" } 
              },
              prep_time: { type: "number" },
              cook_time: { type: "number" },
              servings: { type: "number" },
              calories: { type: "number" },
              protein: { type: "number" },
              carbs: { type: "number" },
              fats: { type: "number" },
              fiber: { type: "number" },
              tags: { 
                type: "array", 
                items: { type: "string" } 
              }
            }
          }
        });

        // Generate recipe image
        const imagePrompt = `Professional food photography of ${aiResponse.name}, ${aiResponse.description}. 
Beautiful plating, appetizing presentation, restaurant quality, natural lighting, 
${aiResponse.regional_cuisine} Indian cuisine style, vibrant colors, high resolution food photo, editorial style`;

        const imageResult = await base44.asServiceRole.integrations.Core.GenerateImage({
          prompt: imagePrompt
        });

        // Create the recipe
        const recipeData = {
          name: aiResponse.name,
          description: aiResponse.description,
          meal_type: aiResponse.meal_type,
          food_preference: aiResponse.food_preference || template.food_preference || 'veg',
          regional_cuisine: aiResponse.regional_cuisine || template.regional_preference || 'north',
          category: 'main_course',
          ingredients: aiResponse.ingredients,
          instructions: aiResponse.instructions,
          prep_time: aiResponse.prep_time,
          cook_time: aiResponse.cook_time,
          servings: aiResponse.servings,
          nutritional_info: {
            calories: aiResponse.calories,
            protein: aiResponse.protein,
            carbs: aiResponse.carbs,
            fats: aiResponse.fats,
            fiber: aiResponse.fiber
          },
          dietary_tags: aiResponse.tags,
          tags: [...(aiResponse.tags || []), 'template-generated', template.subcategory || 'general'],
          image_url: imageResult.url,
          is_published: true,
          usage_count: 0,
          rating: 0
        };

        await base44.asServiceRole.entities.Recipe.create(recipeData);

        results.push({
          template_name: template.name,
          recipe_name: aiResponse.name,
          success: true,
          message: 'Recipe generated and added successfully'
        });
        successCount++;

      } catch (error) {
        console.error(`Error generating recipe from template ${template.name}:`, error);
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
        total: recipeTemplates.length,
        generated: successCount,
        failed: failedCount,
        skipped: skippedCount
      },
      results: results
    });

  } catch (error) {
    console.error('Generate recipes from templates error:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});