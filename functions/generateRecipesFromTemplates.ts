import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.user_type !== 'super_admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    // Fetch all meal plan templates
    const templates = await base44.asServiceRole.entities.DownloadableTemplate.list();

    if (templates.length === 0) {
      return Response.json({
        success: true,
        message: 'No templates found',
        generated: 0
      });
    }

    const results = [];
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const extractedRecipes = new Map(); // Use Map to avoid duplicates

    // Extract all unique recipes from all templates
    for (const template of templates) {
      try {
        if (!template.meals || !Array.isArray(template.meals)) {
          continue;
        }

        // Parse meals and extract recipe information
        for (const meal of template.meals) {
          if (!meal.name || !meal.name.trim()) {
            continue;
          }

          const recipeName = meal.name.trim();
          
          // Skip if we've already extracted this recipe
          if (extractedRecipes.has(recipeName)) {
            continue;
          }

          // Check if recipe already exists in database
          const existingRecipes = await base44.asServiceRole.entities.Recipe.filter({
            name: recipeName
          });

          if (existingRecipes.length > 0) {
            skippedCount++;
            continue;
          }

          // Add to extracted recipes map to track it
          extractedRecipes.set(recipeName, {
            name: recipeName,
            meal_type: meal.meal_type || 'lunch',
            calories: meal.calories || null,
            protein: meal.protein || null,
            carbs: meal.carbs || null,
            fats: meal.fats || null,
            food_preference: template.food_preference || 'veg',
            regional_cuisine: template.regional_preference || 'north',
            servings: 2,
            template_source: template.name
          });
        }
      } catch (error) {
        console.error(`Error extracting recipes from template ${template.name}:`, error);
      }
    }

    // Now generate complete recipes with AI for all extracted unique recipes
    for (const [recipeName, recipeInfo] of extractedRecipes) {
      try {
        const prompt = `Create a complete, detailed Indian recipe for: "${recipeName}"

Context from meal template:
- Meal Type: ${recipeInfo.meal_type}
- Food Preference: ${recipeInfo.food_preference}
- Regional Cuisine: ${recipeInfo.regional_cuisine}
${recipeInfo.calories ? `- Target Calories: ${recipeInfo.calories} kcal` : ''}
${recipeInfo.protein ? `- Target Protein: ${recipeInfo.protein}g` : ''}

Provide:
- Brief description (2-3 sentences)
- Complete ingredient list with precise quantities for ${recipeInfo.servings} servings
- Step-by-step cooking instructions (5-8 steps)
- Accurate nutritional information per serving
- Prep and cook time estimates
- Relevant dietary tags

Make it authentic, practical, and delicious!`;

        const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: prompt,
          response_json_schema: {
            type: "object",
            properties: {
              description: { type: "string" },
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
              calories: { type: "number" },
              protein: { type: "number" },
              carbs: { type: "number" },
              fats: { type: "number" },
              tags: { 
                type: "array", 
                items: { type: "string" } 
              }
            }
          }
        });

        // Generate recipe image
        const imagePrompt = `Professional food photography of ${recipeName}, ${aiResponse.description}. 
Beautiful plating, appetizing presentation, restaurant quality, natural lighting, 
${recipeInfo.regional_cuisine} Indian cuisine style, vibrant colors, high resolution food photo`;

        const imageResult = await base44.asServiceRole.integrations.Core.GenerateImage({
          prompt: imagePrompt
        });

        // Create the recipe
        const recipeData = {
          name: recipeName,
          description: aiResponse.description,
          meal_type: recipeInfo.meal_type,
          food_preference: recipeInfo.food_preference,
          regional_cuisine: recipeInfo.regional_cuisine,
          category: 'main_course',
          ingredients: aiResponse.ingredients,
          instructions: aiResponse.instructions,
          prep_time: aiResponse.prep_time,
          cook_time: aiResponse.cook_time,
          servings: recipeInfo.servings,
          calories: aiResponse.calories,
          protein: aiResponse.protein,
          carbs: aiResponse.carbs,
          fats: aiResponse.fats,
          tags: [...(aiResponse.tags || []), 'from-template', recipeInfo.template_source],
          image_url: imageResult.url,
          is_published: true,
          usage_count: 0
        };

        await base44.asServiceRole.entities.Recipe.create(recipeData);

        results.push({
          recipe_name: recipeName,
          from_template: recipeInfo.template_source,
          success: true,
          message: 'Recipe created successfully'
        });
        successCount++;

      } catch (error) {
        console.error(`Error creating recipe ${recipeName}:`, error);
        results.push({
          recipe_name: recipeName,
          success: false,
          error: error.message
        });
        failedCount++;
      }
    }

    return Response.json({
      success: true,
      summary: {
        templates_analyzed: templates.length,
        unique_recipes_found: extractedRecipes.size,
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