import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { clientId, clientEmail, activityType, description } = await req.json();

    // Define points for different activities
    const activityPoints = {
      'meal_logged': 10,
      'workout_logged': 25,
      'water_logged': 5,
      'progress_logged': 15,
      'assessment_completed': 30,
      'goal_achieved': 50,
      'streak_7_days': 40,
      'streak_30_days': 100,
      'challenge_completed': 75,
      'feedback_given': 20
    };

    const points = activityPoints[activityType] || 10;

    // Create points record
    const pointsRecord = await base44.entities.GamificationPoints.create({
      client_id: clientId,
      client_email: clientEmail,
      points_awarded: points,
      activity_type: activityType,
      description: description || `Points awarded for ${activityType}`,
      date_awarded: new Date().toISOString()
    });

    // Check if client should earn milestone badges
    const allPoints = await base44.entities.GamificationPoints.filter({ 
      client_id: clientId 
    });
    
    const totalPoints = allPoints.reduce((sum, p) => sum + p.points_awarded, 0);
    
    // Award milestone badges
    const badgeMilestones = {
      100: 'bronze_achiever',
      500: 'silver_champion',
      1000: 'gold_master',
      5000: 'platinum_legend'
    };

    for (const [threshold, badgeId] of Object.entries(badgeMilestones)) {
      if (totalPoints >= parseInt(threshold)) {
        const existingBadge = await base44.entities.Badge.filter({
          client_id: clientId,
          badge_id: badgeId
        });

        if (!existingBadge.length) {
          await base44.entities.Badge.create({
            client_id: clientId,
            client_email: clientEmail,
            badge_id: badgeId,
            badge_name: badgeId.replace('_', ' ').toUpperCase(),
            earned_date: new Date().toISOString(),
            description: `Earned ${threshold}+ points`
          });
        }
      }
    }

    return Response.json({
      success: true,
      pointsAwarded: points,
      totalPoints: totalPoints,
      activity: activityType
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});