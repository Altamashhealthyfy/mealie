import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId, actionType, pointsEarned, description, relatedEntityId } = await req.json();

    if (!clientId || !actionType || !pointsEarned) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Award points
    const pointRecord = await base44.asServiceRole.entities.GamificationPoints.create({
      client_id: clientId,
      action_type: actionType,
      points_earned: pointsEarned,
      description: description || `Earned ${pointsEarned} points`,
      date_earned: new Date().toISOString(),
      related_entity_id: relatedEntityId
    });

    // Calculate total points
    const allPoints = await base44.asServiceRole.entities.GamificationPoints.filter({ 
      client_id: clientId 
    });
    const totalPoints = allPoints.reduce((sum, p) => sum + p.points_earned, 0);

    // Check for badge unlocks
    const badges = await base44.asServiceRole.entities.Badge.filter({ is_active: true });
    const clientBadges = await base44.asServiceRole.entities.ClientBadge.filter({ 
      client_id: clientId 
    });
    const earnedBadgeIds = clientBadges.map(cb => cb.badge_id);

    const newBadges = [];
    for (const badge of badges) {
      if (earnedBadgeIds.includes(badge.id)) continue;

      let shouldUnlock = false;

      // Check points-based unlock
      if (badge.points_required && totalPoints >= badge.points_required) {
        shouldUnlock = true;
      }

      // Check criteria-based unlock
      if (badge.unlock_criteria?.type === 'points' && 
          totalPoints >= badge.unlock_criteria.value) {
        shouldUnlock = true;
      }

      if (shouldUnlock) {
        await base44.asServiceRole.entities.ClientBadge.create({
          client_id: clientId,
          badge_id: badge.id,
          earned_date: new Date().toISOString(),
          is_new: true
        });
        newBadges.push(badge);
      }
    }

    // Notify client if new badges unlocked
    if (newBadges.length > 0) {
      const client = await base44.asServiceRole.entities.Client.filter({ id: clientId });
      if (client[0]) {
        await base44.asServiceRole.entities.Notification.create({
          user_email: client[0].email,
          type: 'achievement',
          title: '🎉 New Badge Unlocked!',
          message: `Congratulations! You've earned: ${newBadges.map(b => b.icon + ' ' + b.name).join(', ')}`,
          priority: 'high',
          link: '/ClientAchievements',
          read: false
        });
      }
    }

    return Response.json({
      success: true,
      totalPoints,
      level: Math.floor(totalPoints / 100) + 1,
      newBadges: newBadges.map(b => ({ id: b.id, name: b.name, icon: b.icon }))
    });

  } catch (error) {
    console.error('Award points error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});