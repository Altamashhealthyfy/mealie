import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { clientId, limit = 5 } = body;

    if (!clientId) {
      return Response.json({ error: 'clientId is required' }, { status: 400 });
    }

    // Fetch client data
    const clients = await base44.entities.Client.filter({ id: clientId });
    const client = clients[0];
    
    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    // Fetch client's recent progress logs to understand needs
    const progressLogs = await base44.entities.ProgressLog.filter(
      { client_id: clientId },
      '-created_date',
      5
    );

    // Fetch client's assigned meal plan
    const mealPlans = await base44.entities.MealPlan.filter(
      { client_id: clientId, active: true },
      '-created_date',
      1
    );

    // Fetch client's goals
    const goals = await base44.entities.ProgressGoal.filter(
      { client_id: clientId },
      '-created_date',
      3
    );

    // Fetch all available resources from this coach
    const allResources = await base44.entities.Resource.filter(
      { coach_email: client.assigned_to, status: 'published' },
      '-created_date',
      100
    );

    // Build relevance scoring
    const relevantResources = allResources
      .map(resource => {
        let score = 0;

        // Match by health goal
        if (client.goal && resource.goals?.includes(client.goal)) {
          score += 30;
        }

        // Match by health conditions (from meal plan disease focus)
        if (mealPlans[0]?.disease_focus) {
          mealPlans[0].disease_focus.forEach(condition => {
            if (resource.conditions?.includes(condition)) {
              score += 25;
            }
          });
        }

        // Match by client's recent challenges (from progress logs)
        if (progressLogs.length > 0) {
          const recentLog = progressLogs[0];
          
          // Low energy - suggest energy/wellness resources
          if (recentLog.wellness_metrics?.energy_level < 5) {
            if (['lifestyle', 'nutrition', 'stress_management'].includes(resource.category)) {
              score += 15;
            }
          }

          // Poor sleep - suggest sleep resources
          if (recentLog.wellness_metrics?.sleep_quality < 5) {
            if (resource.category === 'sleep' || resource.tags?.includes('sleep')) {
              score += 20;
            }
          }

          // Low adherence - suggest meal planning resources
          if (recentLog.meal_adherence < 60) {
            if (['meal_planning', 'cooking', 'nutrition'].includes(resource.category)) {
              score += 20;
            }
          }

          // Stress - suggest stress management
          if (recentLog.wellness_metrics?.stress_level > 7) {
            if (['stress_management', 'mental_health', 'lifestyle'].includes(resource.category)) {
              score += 20;
            }
          }
        }

        // Match by goals from progress goals
        if (goals.length > 0) {
          goals.forEach(goal => {
            if (goal.category && resource.tags?.includes(goal.category)) {
              score += 10;
            }
          });
        }

        // Prefer beginner resources for new clients
        const clientAge = Math.floor((Date.now() - new Date(client.join_date)) / (1000 * 60 * 60 * 24));
        if (clientAge < 30 && resource.difficulty_level === 'beginner') {
          score += 10;
        }

        // Prefer resources not yet assigned to client
        const isAssigned = progressLogs.some(log => log.id === resource.id);
        if (!isAssigned) {
          score += 5;
        }

        return { ...resource, relevance_score: score };
      })
      .filter(r => r.relevance_score > 0)
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, limit);

    return Response.json({
      suggestions: relevantResources.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        type: r.type,
        category: r.category,
        relevance_score: r.relevance_score,
        reason: generateReason(r, client, progressLogs, goals, mealPlans),
        thumbnail_url: r.thumbnail_url,
        reading_time_minutes: r.reading_time_minutes,
        duration_minutes: r.duration_minutes
      }))
    });
  } catch (error) {
    console.error('Error suggesting resources:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateReason(resource, client, logs, goals, mealPlans) {
  const reasons = [];

  if (client.goal && resource.goals?.includes(client.goal)) {
    reasons.push(`Matches your goal of ${client.goal.replace(/_/g, ' ')}`);
  }

  if (logs[0]?.wellness_metrics?.sleep_quality < 5 && resource.category === 'sleep') {
    reasons.push('Based on your recent low sleep quality');
  }

  if (logs[0]?.wellness_metrics?.energy_level < 5 && ['lifestyle', 'nutrition'].includes(resource.category)) {
    reasons.push('Could help boost your energy levels');
  }

  if (logs[0]?.meal_adherence < 60 && resource.category === 'meal_planning') {
    reasons.push('Helpful for improving meal plan adherence');
  }

  return reasons.length > 0 ? reasons[0] : 'Recommended by your coach';
}