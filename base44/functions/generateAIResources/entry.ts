import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { clientId, resourceType, clientGoals = [], identifiedGaps = [] } = body;

    if (!clientId || !resourceType) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch client data for context
    const clients = await base44.entities.Client.filter({ id: clientId });
    const client = clients[0];
    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    // Fetch recent progress to identify gaps
    const progressLogs = await base44.entities.ProgressLog.filter({ client_id: clientId }, '-date', 10);
    const progressGaps = identifiedGaps.length > 0 ? identifiedGaps : extractGaps(progressLogs, client);

    // Generate AI content based on resource type
    let prompt = '';
    let resources = [];

    if (resourceType === 'article') {
      prompt = generateArticlePrompt(client, clientGoals, progressGaps);
    } else if (resourceType === 'recipe_collection') {
      prompt = generateRecipePrompt(client, clientGoals, progressGaps);
      resources = [{ item: 'Recipe 1' }, { item: 'Recipe 2' }, { item: 'Recipe 3' }];
    } else if (resourceType === 'workout_routine') {
      prompt = generateWorkoutPrompt(client, clientGoals, progressGaps);
      resources = [{ item: 'Workout A' }, { item: 'Workout B' }, { item: 'Workout C' }];
    } else if (resourceType === 'meal_plan') {
      prompt = generateMealPlanPrompt(client, clientGoals, progressGaps);
    }

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          summary: { type: 'string' },
          content: { type: 'string' },
          key_points: { type: 'array', items: { type: 'string' } },
          actionable_tips: { type: 'array', items: { type: 'string' } },
          difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] }
        }
      }
    });

    const generatedResource = {
      client_id: clientId,
      client_email: client.email,
      coach_email: user.email,
      resource_type: resourceType,
      title: aiResponse.title,
      content: aiResponse.content,
      summary: aiResponse.summary,
      client_goals: clientGoals,
      identified_gaps: progressGaps,
      personalization_notes: [
        `Generated for ${client.full_name}`,
        `Targets: ${clientGoals.join(', ')}`,
        `Addresses gaps: ${progressGaps.join(', ')}`
      ],
      resources: resources.length > 0 ? resources : undefined,
      tags: [resourceType, ...clientGoals, ...progressGaps],
      difficulty_level: aiResponse.difficulty,
      estimated_value: aiResponse.key_points?.join('; ') || 'Personalized content'
    };

    // Save to database
    const savedResource = await base44.entities.AIGeneratedResource.create(generatedResource);

    return Response.json({
      success: true,
      resource: savedResource,
      message: 'AI resource generated successfully'
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function extractGaps(progressLogs, client) {
  const gaps = [];
  
  if (progressLogs.length === 0) {
    gaps.push('nutrition_tracking', 'water_intake');
    return gaps;
  }

  const avgMood = progressLogs.reduce((sum, log) => {
    const moodValues = { very_poor: 1, poor: 2, neutral: 3, good: 4, excellent: 5 };
    return sum + (moodValues[log.wellness_metrics?.mood] || 3);
  }, 0) / progressLogs.length;

  if (avgMood < 3) gaps.push('stress_management', 'mental_health');
  
  const avgSleep = progressLogs.reduce((sum, log) => sum + (log.wellness_metrics?.sleep_hours || 0), 0) / progressLogs.length;
  if (avgSleep < 7) gaps.push('sleep_optimization', 'sleep_hygiene');

  if (!progressLogs.some(log => log.wellness_metrics?.exercise_minutes > 0)) {
    gaps.push('fitness', 'physical_activity');
  }

  return gaps;
}

function generateArticlePrompt(client, goals, gaps) {
  return `Create an informative, engaging article for ${client.full_name}, a health client. 
  Client Goals: ${goals.join(', ')}
  Identified Progress Gaps: ${gaps.join(', ')}
  Client Status: ${client.goal}, Activity Level: ${client.activity_level}
  
  Write a comprehensive article that:
  1. Addresses the identified gaps
  2. Aligns with client's health goals
  3. Provides actionable, evidence-based advice
  4. Includes key takeaways and tips
  5. Is personalized to their situation
  
  Format as JSON with title, summary, content (detailed), key_points (array), actionable_tips (array), and difficulty.`;
}

function generateRecipePrompt(client, goals, gaps) {
  return `Generate a collection of 3 personalized healthy recipes for ${client.full_name}.
  Dietary Preference: ${client.food_preference}
  Regional Cuisine: ${client.regional_preference}
  Health Goals: ${goals.join(', ')}
  Target Calories: ${client.target_calories}
  Allergies/Restrictions: ${client.dietary_restrictions?.join(', ') || 'None'}
  
  Create recipes that:
  1. Align with their dietary goals and preferences
  2. Address nutrition gaps
  3. Are realistic to prepare
  4. Include nutritional information
  
  Format as JSON with title, summary, content (with recipes), key_points, actionable_tips, and difficulty.`;
}

function generateWorkoutPrompt(client, goals, gaps) {
  return `Create a personalized workout routine for ${client.full_name}.
  Activity Level: ${client.activity_level}
  Health Goals: ${goals.join(', ')}
  Focus Areas: ${gaps.join(', ')}
  Age: ${client.age}, Weight: ${client.weight}kg
  
  Generate a workout plan that:
  1. Matches their fitness level
  2. Progresses gradually
  3. Targets their health goals
  4. Is safe and sustainable
  5. Can be done at home or gym
  
  Format as JSON with title, summary, content (detailed routine), key_points, actionable_tips, and difficulty.`;
}

function generateMealPlanPrompt(client, goals, gaps) {
  return `Create a personalized weekly meal plan for ${client.full_name}.
  Goal: ${client.goal}
  Dietary Preference: ${client.food_preference}
  Regional Preference: ${client.regional_preference}
  Target Calories: ${client.target_calories}
  Target Macros - Protein: ${client.target_protein}g, Carbs: ${client.target_carbs}g, Fats: ${client.target_fats}g
  
  Create a 7-day meal plan that:
  1. Achieves calorie and macro targets
  2. Respects dietary preferences
  3. Includes variety and local cuisines
  4. Addresses identified gaps
  5. Is practical and realistic
  
  Format as JSON with title, summary, content (daily meals), key_points, actionable_tips, and difficulty.`;
}