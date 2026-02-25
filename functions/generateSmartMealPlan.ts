import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      client_id,
      duration = 7,
      dietary_restrictions = [],
      cuisine_preferences = [],
      target_calories,
      target_protein,
      target_carbs,
      target_fats,
      food_preference,
      regional_preference
    } = await req.json();

    if (!client_id || !target_calories) {
      return Response.json({ 
        error: 'Missing required fields: client_id and target_calories' 
      }, { status: 400 });
    }

    // Fetch all published recipes from library
    const allRecipes = await base44.entities.Recipe.filter({ is_published: true });

    // Filter recipes based on preferences and restrictions
    let filteredRecipes = allRecipes.filter(recipe => {
      // Food preference match
      if (food_preference && recipe.food_preference !== food_preference) {
        return false;
      }

      // Regional preference match
      if (regional_preference && regional_preference !== 'all' && 
          recipe.regional_cuisine !== regional_preference) {
        return false;
      }

      // Cuisine preferences match
      if (cuisine_preferences.length > 0) {
        if (!cuisine_preferences.includes(recipe.regional_cuisine)) {
          return false;
        }
      }

      // Dietary restrictions check
      if (dietary_restrictions.length > 0) {
        // Check if recipe violates any dietary restrictions
        const recipeIngredients = recipe.ingredients?.map(ing => 
          ing.item.toLowerCase()
        ) || [];
        
        const hasRestriction = dietary_restrictions.some(restriction => 
          recipeIngredients.some(ingredient => 
            ingredient.includes(restriction.toLowerCase())
          )
        );
        
        if (hasRestriction) return false;
      }

      return true;
    });

    // Group recipes by meal type
    const recipesByMealType = {
      breakfast: filteredRecipes.filter(r => r.meal_type === 'breakfast'),
      lunch: filteredRecipes.filter(r => r.meal_type === 'lunch'),
      dinner: filteredRecipes.filter(r => r.meal_type === 'dinner'),
      snack: filteredRecipes.filter(r => r.meal_type === 'snack'),
    };

    // Calculate calorie distribution
    const calorieDistribution = {
      early_morning: 0,
      breakfast: Math.round(target_calories * 0.30),
      mid_morning: Math.round(target_calories * 0.10),
      lunch: Math.round(target_calories * 0.35),
      evening_snack: Math.round(target_calories * 0.10),
      dinner: Math.round(target_calories * 0.20)
    };

    // Build weekly meal plan using available recipes
    const prompt = `Create a ${duration}-day meal plan using ONLY the recipes provided below.

Available Recipes by Meal Type:
BREAKFAST (${recipesByMealType.breakfast.length} recipes):
${recipesByMealType.breakfast.slice(0, 20).map(r => `- ${r.name} (${r.calories || 0} kcal, P:${r.protein || 0}g, C:${r.carbs || 0}g, F:${r.fats || 0}g)`).join('\n')}

LUNCH (${recipesByMealType.lunch.length} recipes):
${recipesByMealType.lunch.slice(0, 20).map(r => `- ${r.name} (${r.calories || 0} kcal, P:${r.protein || 0}g, C:${r.carbs || 0}g, F:${r.fats || 0}g)`).join('\n')}

DINNER (${recipesByMealType.dinner.length} recipes):
${recipesByMealType.dinner.length > 0 ? recipesByMealType.dinner.slice(0, 20).map(r => `- ${r.name} (${r.calories || 0} kcal, P:${r.protein || 0}g, C:${r.carbs || 0}g, F:${r.fats || 0}g)`).join('\n') : '(No dinner recipes - suggest simple traditional Indian dinner options)'}

SNACKS (${recipesByMealType.snack.length} recipes):
${recipesByMealType.snack.slice(0, 20).map(r => `- ${r.name} (${r.calories || 0} kcal, P:${r.protein || 0}g, C:${r.carbs || 0}g, F:${r.fats || 0}g)`).join('\n')}

Target Daily Macros:
- Calories: ${target_calories} kcal
${target_protein ? `- Protein: ${target_protein}g` : ''}
${target_carbs ? `- Carbs: ${target_carbs}g` : ''}
${target_fats ? `- Fats: ${target_fats}g` : ''}

Dietary Restrictions to AVOID:
${dietary_restrictions.length > 0 ? dietary_restrictions.join(', ') : 'None'}

Calorie Distribution Per Meal:
- Early Morning: 0-50 kcal (warm water/lemon water)
- Breakfast: ${calorieDistribution.breakfast} kcal
- Mid-Morning: ${calorieDistribution.mid_morning} kcal (fruit/nuts)
- Lunch: ${calorieDistribution.lunch} kcal
- Evening Snack: ${calorieDistribution.evening_snack} kcal
- Dinner: ${calorieDistribution.dinner} kcal

CRITICAL INSTRUCTIONS:
1. Select recipes from the provided lists above that best match the meal type and calorie targets
2. For meal types with limited or no recipes in library (like dinner), suggest simple traditional Indian options
3. Ensure each day totals EXACTLY ${target_calories} kcal by adjusting portions
4. Distribute macros across the day based on targets
5. Create variety - don't repeat same recipe more than 2 times in ${duration} days
6. Fill in simple options for early morning (warm water/lemon) and snacks if no matching recipes

Return a complete ${duration}-day plan with 6 meals per day (${duration * 6} total meals).`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          plan_name: { type: "string" },
          meals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day: { type: "number" },
                meal_type: { type: "string" },
                meal_name: { type: "string" },
                recipe_name: { type: "string" },
                items: { type: "array", items: { type: "string" } },
                portion_sizes: { type: "array", items: { type: "string" } },
                calories: { type: "number" },
                protein: { type: "number" },
                carbs: { type: "number" },
                fats: { type: "number" },
                nutritional_tip: { type: "string" }
              }
            }
          },
          recipes_used: {
            type: "array",
            items: { type: "string" },
            description: "List of recipe names from library that were used"
          },
          total_recipes_from_library: { type: "number" }
        }
      }
    });

    return Response.json({
      success: true,
      plan: aiResponse,
      available_recipes_count: {
        breakfast: recipesByMealType.breakfast.length,
        lunch: recipesByMealType.lunch.length,
        dinner: recipesByMealType.dinner.length,
        snack: recipesByMealType.snack.length
      }
    });

  } catch (error) {
    console.error('Error generating smart meal plan:', error);
    return Response.json({ 
      error: error.message || 'Failed to generate meal plan' 
    }, { status: 500 });
  }
});