import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { limit = 6 } = await req.json();

    // Fetch user profile data
    const userProfiles = await base44.entities.UserProfile.filter({ created_by: user.email });
    const userProfile = userProfiles[0] || null;

    const clientProfiles = await base44.entities.Client.filter({ email: user.email });
    const clientProfile = clientProfiles[0] || null;

    // Fetch all recipes
    const allRecipes = await base44.entities.Recipe.list();

    if (allRecipes.length === 0) {
      return Response.json({
        success: true,
        recommendations: [],
        message: 'No recipes available'
      });
    }

    // Build user preferences context
    const foodPreference = userProfile?.food_preference || clientProfile?.food_preference || 'veg';
    const regionalPreference = userProfile?.regional_preference || clientProfile?.regional_preference || 'north';
    const dietaryRestrictions = userProfile?.dietary_restrictions || [];
    const allergies = userProfile?.allergies || [];
    const intolerances = userProfile?.intolerances || [];
    const healthConditions = userProfile?.health_conditions || [];
    const cuisinePreferences = userProfile?.cuisine_preferences || [];
    const dislikedIngredients = userProfile?.disliked_ingredients || [];
    const likedIngredients = userProfile?.liked_ingredients || [];
    const mealPrefs = userProfile?.meal_preferences || {};
    const goal = userProfile?.goal || clientProfile?.goal || 'maintenance';
    const activityLevel = userProfile?.activity_level || clientProfile?.activity_level || 'moderately_active';
    const targetCalories = userProfile?.target_calories || clientProfile?.target_calories || null;
    const targetProtein = userProfile?.target_protein || clientProfile?.target_protein || null;
    const targetCarbs = userProfile?.target_carbs || clientProfile?.target_carbs || null;
    const targetFats = userProfile?.target_fats || clientProfile?.target_fats || null;

    // Prepare recipe data for AI analysis
    const recipeSummaries = allRecipes.map(recipe => ({
      id: recipe.id,
      name: recipe.name,
      meal_type: recipe.meal_type,
      food_preference: recipe.food_preference,
      regional_cuisine: recipe.regional_cuisine,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fats: recipe.fats,
      tags: recipe.tags || [],
      dietary_tags: recipe.dietary_tags || [],
      allergens: recipe.allergens || [],
      ingredients: (recipe.ingredients || []).map(i => i.item),
      prep_time: recipe.prep_time,
      cook_time: recipe.cook_time
    }));

    // Use AI to generate personalized recommendations
    const prompt = `You are a clinical nutrition AI. Select the ${limit} BEST-MATCHED recipes for this user from the list below.

USER PROFILE:
- Food Preference: ${foodPreference}
- Regional Preference: ${regionalPreference}
- Specific Cuisines Liked: ${cuisinePreferences.length ? cuisinePreferences.join(', ') : 'Not specified'}
- Health Goal: ${goal}
- Activity Level: ${activityLevel}
- Health Conditions: ${healthConditions.length ? healthConditions.join(', ') : 'None'}
- Allergies (STRICTLY AVOID): ${allergies.length ? allergies.join(', ') : 'None'}
- Intolerances: ${intolerances.length ? intolerances.join(', ') : 'None'}
- Other Dietary Restrictions: ${dietaryRestrictions.length ? dietaryRestrictions.join(', ') : 'None'}
- Disliked Ingredients (avoid): ${dislikedIngredients.length ? dislikedIngredients.join(', ') : 'None'}
- Liked Ingredients (prefer): ${likedIngredients.length ? likedIngredients.join(', ') : 'None'}
- Prefers Quick Meals (≤30 min): ${mealPrefs.prefer_quick_meals ? 'Yes' : 'No'}
- Prefers High Protein: ${mealPrefs.prefer_high_protein ? 'Yes' : 'No'}
- Prefers Low Carb: ${mealPrefs.prefer_low_carb ? 'Yes' : 'No'}
- Prefers Low Fat: ${mealPrefs.prefer_low_fat ? 'Yes' : 'No'}
- Prefers Low Sodium: ${mealPrefs.prefer_low_sodium ? 'Yes' : 'No'}
- Prefers High Fiber: ${mealPrefs.prefer_high_fiber ? 'Yes' : 'No'}
${targetCalories ? `- Daily Calorie Target: ${targetCalories} kcal` : ''}
${targetProtein ? `- Daily Protein Target: ${targetProtein}g` : ''}
${targetCarbs ? `- Daily Carb Target: ${targetCarbs}g` : ''}
${targetFats ? `- Daily Fat Target: ${targetFats}g` : ''}

SELECTION RULES (in order of priority):
1. NEVER recommend recipes containing the user's allergens
2. Match food_preference (veg/non_veg/vegan/jain/eggetarian)
3. Prefer recipes matching regional/cuisine preferences
4. Align macros with health goals and conditions (e.g. low GI for diabetes, low sodium for hypertension)
5. Prefer recipes with liked ingredients, avoid disliked ones
6. Ensure variety across meal types
7. If quick meals preferred, prioritize prep+cook ≤ 30 min

AVAILABLE RECIPES:
${JSON.stringify(recipeSummaries, null, 2)}

Return exactly ${limit} recipe IDs ranked best to worst match.`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          recommended_recipe_ids: {
            type: "array",
            items: { type: "string" }
          },
          reasoning: {
            type: "string",
            description: "Brief explanation of why these recipes were recommended"
          }
        }
      }
    });

    // Fetch full recipe details for recommendations
    const recommendedRecipes = aiResponse.recommended_recipe_ids
      .slice(0, limit)
      .map(id => allRecipes.find(r => r.id === id))
      .filter(r => r !== undefined);

    return Response.json({
      success: true,
      recommendations: recommendedRecipes,
      reasoning: aiResponse.reasoning,
      user_preferences: {
        food_preference: foodPreference,
        regional_preference: regionalPreference,
        goal: goal,
        allergies: allergies,
        health_conditions: healthConditions
      }
    });

  } catch (error) {
    console.error('Get personalized recipes error:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});