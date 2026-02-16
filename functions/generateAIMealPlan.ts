import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId, duration = 7, adaptFromFeedback = false } = await req.json();

    if (!clientId) {
      return Response.json({ error: 'Client ID is required' }, { status: 400 });
    }

    // Fetch client data
    const clients = await base44.asServiceRole.entities.Client.filter({ id: clientId });
    const client = clients[0];

    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    // Fetch recent progress and feedback
    const progressLogs = await base44.asServiceRole.entities.ProgressLog.filter({ 
      client_id: clientId 
    });
    const recentProgress = progressLogs.sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    ).slice(0, 5);

    const existingMealPlans = await base44.asServiceRole.entities.MealPlan.filter({ 
      client_id: clientId 
    });

    // Build comprehensive prompt
    const prompt = `You are an expert nutritionist creating a personalized ${duration}-day meal plan.

CLIENT PROFILE:
- Name: ${client.full_name}
- Age: ${client.age}, Gender: ${client.gender}
- Current Weight: ${client.weight} kg, Target: ${client.target_weight} kg
- Height: ${client.height} cm
- BMR: ${client.bmr || 'Not calculated'}, TDEE: ${client.tdee || 'Not calculated'}
- Goal: ${client.goal?.replace(/_/g, ' ') || 'General health'}
- Activity Level: ${client.activity_level?.replace(/_/g, ' ') || 'Moderate'}

DIETARY PREFERENCES:
- Food Preference: ${client.food_preference || 'Mixed'}
- Regional Preference: ${client.regional_preference || 'All'}
- Likes: ${client.likes_dislikes?.likes?.join(', ') || 'Not specified'}
- Dislikes: ${client.likes_dislikes?.dislikes?.join(', ') || 'Not specified'}
- Allergies: ${client.allergies?.join(', ') || 'None'}

HEALTH CONDITIONS:
${client.health_conditions && client.health_conditions.length > 0 
  ? client.health_conditions.map(c => `- ${c.replace(/_/g, ' ')}`).join('\n')
  : '- None reported'}

DAILY ROUTINE:
- Wake Up: ${client.daily_routine?.wake_up_time || '7:00 AM'}
- Breakfast: ${client.daily_routine?.breakfast_time || '8:00 AM'}
- Lunch: ${client.daily_routine?.lunch_time || '1:00 PM'}
- Dinner: ${client.daily_routine?.dinner_time || '8:00 PM'}
- Sleep: ${client.daily_routine?.sleep_time || '11:00 PM'}

${adaptFromFeedback && recentProgress.length > 0 ? `
RECENT PROGRESS & FEEDBACK:
${recentProgress.map(p => `
Date: ${p.date}
Weight: ${p.weight} kg
Meal Adherence: ${p.meal_adherence || 'N/A'}%
Notes: ${p.notes || 'No notes'}
Symptoms: ${p.symptoms?.join(', ') || 'None'}
`).join('\n')}

Previous meal plan feedback should guide adjustments. If adherence is low, simplify meals. If symptoms reported, avoid trigger foods.
` : ''}

INSTRUCTIONS:
1. Create a ${duration}-day meal plan with balanced nutrition
2. Each day should have: Breakfast, Mid-Morning Snack, Lunch, Evening Snack, Dinner
3. Strictly respect dietary preferences, allergies, and health conditions
4. Consider the daily routine for meal timing
5. For each meal, provide:
   - Meal name
   - List of items with portion sizes
   - Approximate calories, protein, carbs, fats
   - A brief nutritional tip or health benefit
6. Ensure variety across days
7. If health conditions exist, provide disease-specific rationale for food choices
8. Target daily calories should align with their TDEE and goal

Generate a practical, easy-to-follow meal plan that the client will enjoy and stick to.`;

    // Call AI to generate meal plan
    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          plan_name: { type: "string" },
          overview: { type: "string" },
          daily_calorie_target: { type: "number" },
          meals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day: { type: "number" },
                meal_type: { 
                  type: "string",
                  enum: ["breakfast", "mid_morning", "lunch", "evening_snack", "dinner"]
                },
                meal_name: { type: "string" },
                items: { 
                  type: "array",
                  items: { type: "string" }
                },
                portion_sizes: {
                  type: "array",
                  items: { type: "string" }
                },
                calories: { type: "number" },
                protein: { type: "number" },
                carbs: { type: "number" },
                fats: { type: "number" },
                nutritional_tip: { type: "string" },
                disease_rationale: { type: "string" }
              }
            }
          }
        }
      }
    });

    // Create meal plan in database
    const mealPlanData = {
      client_id: clientId,
      name: aiResponse.plan_name || `AI Generated Plan - ${new Date().toLocaleDateString()}`,
      duration: duration,
      meal_pattern: "daily",
      target_calories: aiResponse.daily_calorie_target || client.target_calories,
      food_preference: client.food_preference,
      regional_preference: client.regional_preference,
      meals: aiResponse.meals,
      active: true,
      plan_tier: "basic"
    };

    const createdPlan = await base44.asServiceRole.entities.MealPlan.create(mealPlanData);

    // Create notification for client
    await base44.asServiceRole.entities.Notification.create({
      user_email: client.email,
      type: 'meal_plan',
      title: '🎉 New AI-Generated Meal Plan Ready!',
      message: `Your personalized ${duration}-day meal plan has been created. Check it out and start your journey!`,
      priority: 'high',
      link: '/MyAssignedMealPlan',
      read: false,
      metadata: {
        meal_plan_id: createdPlan.id,
        client_id: clientId
      }
    });

    return Response.json({
      success: true,
      message: 'AI meal plan generated successfully',
      mealPlan: {
        id: createdPlan.id,
        name: createdPlan.name,
        duration: duration,
        meals: aiResponse.meals.length,
        overview: aiResponse.overview
      }
    });

  } catch (error) {
    console.error('AI Meal Plan Generation Error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});