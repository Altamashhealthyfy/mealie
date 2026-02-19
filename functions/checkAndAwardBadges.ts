import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { clientId, clientEmail } = await req.json();

    const badgesAwarded = [];

    // Fetch client data
    const progressLogs = await base44.entities.ProgressLog.filter({ client_id: clientId });
    const foodLogs = await base44.entities.FoodLog.filter({ client_id: clientId });
    const existingBadges = await base44.entities.Badge.filter({ client_id: clientId });

    const existingBadgeIds = existingBadges.map(b => b.badge_id);

    // Badge 1: First Step - Log first progress
    if (!existingBadgeIds.includes('first_step') && progressLogs.length > 0) {
      await base44.entities.Badge.create({
        client_id: clientId,
        client_email: clientEmail,
        badge_id: 'first_step',
        badge_name: 'First Step',
        earned_date: new Date().toISOString(),
        description: 'Logged your first progress',
        icon_emoji: '👣'
      });
      badgesAwarded.push('first_step');
    }

    // Badge 2: Consistent Logger - 7 consecutive days
    if (!existingBadgeIds.includes('consistent_logger')) {
      const logDates = progressLogs.map(log => new Date(log.date).toDateString());
      const uniqueDates = [...new Set(logDates)];
      if (uniqueDates.length >= 7) {
        await base44.entities.Badge.create({
          client_id: clientId,
          client_email: clientEmail,
          badge_id: 'consistent_logger',
          badge_name: 'Consistent Logger',
          earned_date: new Date().toISOString(),
          description: 'Logged progress 7 days in a row',
          icon_emoji: '📅'
        });
        badgesAwarded.push('consistent_logger');
      }
    }

    // Badge 3: Foodie - 30 food log entries
    if (!existingBadgeIds.includes('foodie') && foodLogs.length >= 30) {
      await base44.entities.Badge.create({
        client_id: clientId,
        client_email: clientEmail,
        badge_id: 'foodie',
        badge_name: 'Foodie',
        earned_date: new Date().toISOString(),
        description: 'Logged 30 meal entries',
        icon_emoji: '🍽️'
      });
      badgesAwarded.push('foodie');
    }

    // Badge 4: Weight Milestone - 5kg progress
    if (!existingBadgeIds.includes('weight_milestone') && progressLogs.length >= 2) {
      const weights = progressLogs.map(p => p.weight).filter(w => w);
      if (weights.length >= 2) {
        const difference = Math.abs(weights[0] - weights[weights.length - 1]);
        if (difference >= 5) {
          await base44.entities.Badge.create({
            client_id: clientId,
            client_email: clientEmail,
            badge_id: 'weight_milestone',
            badge_name: 'Weight Milestone',
            earned_date: new Date().toISOString(),
            description: '5kg progress achieved',
            icon_emoji: '⚖️'
          });
          badgesAwarded.push('weight_milestone');
        }
      }
    }

    // Badge 5: Wellness Warrior - High wellness score
    if (!existingBadgeIds.includes('wellness_warrior')) {
      const wellnessScores = progressLogs.filter(p => p.wellness_metrics?.energy_level).map(p => p.wellness_metrics.energy_level);
      if (wellnessScores.length >= 7) {
        const avgScore = wellnessScores.reduce((a, b) => a + b) / wellnessScores.length;
        if (avgScore >= 8) {
          await base44.entities.Badge.create({
            client_id: clientId,
            client_email: clientEmail,
            badge_id: 'wellness_warrior',
            badge_name: 'Wellness Warrior',
            earned_date: new Date().toISOString(),
            description: 'Maintained high wellness scores',
            icon_emoji: '💪'
          });
          badgesAwarded.push('wellness_warrior');
        }
      }
    }

    // Badge 6: Challenge Master - Completed 3 challenges
    if (!existingBadgeIds.includes('challenge_master')) {
      const completedChallenges = await base44.entities.ClientChallenge.filter({
        client_id: clientId,
        status: 'completed'
      });
      if (completedChallenges.length >= 3) {
        await base44.entities.Badge.create({
          client_id: clientId,
          client_email: clientEmail,
          badge_id: 'challenge_master',
          badge_name: 'Challenge Master',
          earned_date: new Date().toISOString(),
          description: 'Completed 3 challenges',
          icon_emoji: '🏆'
        });
        badgesAwarded.push('challenge_master');
      }
    }

    return Response.json({
      success: true,
      badgesAwarded: badgesAwarded,
      message: `${badgesAwarded.length} badges awarded`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});