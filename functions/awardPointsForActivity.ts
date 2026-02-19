import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id, action_type, points_earned, description } = await req.json();

    if (!client_id || !action_type || !points_earned) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Define point values for different activities
    const pointValues = {
      meal_logged: 10,
      food_log_submitted: 15,
      progress_logged: 25,
      workout_completed: 30,
      mpess_assessment_done: 20,
      resource_completed: 15,
      appointment_attended: 30,
      water_intake_logged: 5,
      sleep_logged: 15,
      custom: points_earned // Custom points from coach
    };

    // Create point record
    const point = await base44.entities.GamificationPoints.create({
      client_id,
      action_type,
      points_earned: points_earned || pointValues[action_type] || 10,
      description: description || `Points awarded for ${action_type.replace(/_/g, ' ')}`,
      date_earned: new Date().toISOString()
    });

    // Check for milestone badges
    const allPoints = await base44.entities.GamificationPoints.filter({ client_id });
    const totalPoints = allPoints.reduce((sum, p) => sum + p.points_earned, 0);

    const milestoneBadges = [];
    const badgeDefinitions = await base44.entities.Badge.list();

    // Check milestone achievements
    const milestones = [
      { points: 100, badgeName: 'Hundred Points Club' },
      { points: 500, badgeName: 'Five Hundred Points Club' },
      { points: 1000, badgeName: 'Thousand Points Club' },
      { points: 2500, badgeName: 'Gamification Champion' }
    ];

    for (const milestone of milestones) {
      if (totalPoints >= milestone.points) {
        const badge = badgeDefinitions.find(b => b.name === milestone.badgeName);
        if (badge) {
          const existing = await base44.entities.ClientBadge.filter({
            client_id,
            badge_id: badge.id
          });
          
          if (existing.length === 0) {
            await base44.entities.ClientBadge.create({
              client_id,
              badge_id: badge.id,
              earned_date: new Date().toISOString()
            });
            milestoneBadges.push(badge.name);
          }
        }
      }
    }

    return Response.json({
      success: true,
      point,
      badgesEarned: milestoneBadges
    });
  } catch (error) {
    console.error('Error awarding points:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});