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
    const goal = userProfile?.goal || clientProfile?.goal || 'maintenance';
    const activityLevel = userProfile?.activity_level || clientProfile?.activity_level || 'moderately_active';
    const targetCalories = userProfile?.target_calories || clientProfile?.target_calories || null;
    const targetProtein = userProfile?.target_protein || clientProfile?.target_protein || null;

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
      prep_time: recipe.prep_time,
      cook_time: recipe.cook_time
    }));

    // Use AI to generate personalized recommendations
    const prompt = `You are a nutrition AI assistant. Analyze the user's profile and recommend the best recipes from the available options.

User Profile:
- Food Preference: ${foodPreference}
- Regional Preference: ${regionalPreference} Indian
- Dietary Restrictions: ${dietaryRestrictions.length > 0 ? dietaryRestrictions.join(', ') : 'None'}
- Health Goal: ${goal}
- Activity Level: ${activityLevel}
${targetCalories ? `- Target Daily Calories: ${targetCalories} kcal` : ''}
${targetProtein ? `- Target Daily Protein: ${targetProtein}g` : ''}

Available Recipes (${recipeSummaries.length} total):
${JSON.stringify(recipeSummaries, null, 2)}

Select the ${limit} BEST recipes that match the user's preferences, dietary needs, and health goals. Consider:
1. Food preference matching (vegetarian/non-veg)
2. Regional cuisine preference
3. Nutritional alignment with goals (weight loss/gain/maintenance)
4. Calorie and protein targets
5. Variety in meal types
6. Dietary restrictions compatibility

Return ONLY the recipe IDs in order of recommendation strength (most suitable first).`;

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
        goal: goal
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