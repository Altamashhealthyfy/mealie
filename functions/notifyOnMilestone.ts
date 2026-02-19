import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event } = body;

    // Handle points awarded
    if (event.entity_name === 'GamificationPoints' && event.type === 'create') {
      const points = await base44.asServiceRole.entities.GamificationPoints.filter({ 
        id: event.entity_id 
      });
      const pointRecord = points[0];

      if (!pointRecord) return Response.json({ message: 'Points not found' }, { status: 200 });

      // Fetch client
      const clients = await base44.asServiceRole.entities.Client.filter({ 
        id: pointRecord.client_id 
      });
      const client = clients[0];

      if (!client || !client.email) {
        return Response.json({ message: 'Client not found' }, { status: 200 });
      }

      // Send notification
      await base44.asServiceRole.functions.invoke('sendPushNotification', {
        userId: client.email,
        title: '🎯 Points Earned!',
        body: `You earned ${pointRecord.points_earned} points: ${pointRecord.reason}`,
        data: {
          url: '/clientachievements',
          type: 'points',
          clientId: client.id,
        },
        tag: 'points-earned',
      });
    }

    // Handle badge earned
    if (event.entity_name === 'ClientBadge' && event.type === 'create') {
      const clientBadges = await base44.asServiceRole.entities.ClientBadge.filter({ 
        id: event.entity_id 
      });
      const badgeRecord = clientBadges[0];

      if (!badgeRecord) return Response.json({ message: 'Badge not found' }, { status: 200 });

      // Fetch badge details
      const badges = await base44.asServiceRole.entities.Badge.filter({ 
        id: badgeRecord.badge_id 
      });
      const badge = badges[0];

      // Fetch client
      const clients = await base44.asServiceRole.entities.Client.filter({ 
        id: badgeRecord.client_id 
      });
      const client = clients[0];

      if (!client || !client.email) {
        return Response.json({ message: 'Client not found' }, { status: 200 });
      }

      // Send notification
      await base44.asServiceRole.functions.invoke('sendPushNotification', {
        userId: client.email,
        title: `🏆 Badge Unlocked: ${badge?.name || 'Achievement'}`,
        body: badge?.description || 'You earned a new badge!',
        data: {
          url: '/clientachievements',
          type: 'badge',
          clientId: client.id,
        },
        tag: 'badge-earned',
        requireInteraction: true,
      });
    }

    // Handle streak milestone
    if (event.entity_name === 'ProgressLog' && event.type === 'create') {
      const logs = await base44.asServiceRole.entities.ProgressLog.filter({ 
        id: event.entity_id 
      });
      const log = logs[0];

      if (!log) return Response.json({ message: 'Log not found' }, { status: 200 });

      // Fetch all logs for streak calculation
      const clientLogs = await base44.asServiceRole.entities.ProgressLog.filter({ 
        client_id: log.client_id 
      });

      // Sort by date and check for streak
      const sortedLogs = clientLogs.sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );

      let streak = 0;
      const today = new Date();
      for (let i = 0; i < sortedLogs.length; i++) {
        const logDate = new Date(sortedLogs[i].date);
        const expectedDate = new Date(today);
        expectedDate.setDate(expectedDate.getDate() - i);
        
        if (logDate.toDateString() === expectedDate.toDateString()) {
          streak++;
        } else {
          break;
        }
      }

      if (streak > 0 && streak % 7 === 0) {
        // Milestone at 7, 14, 21, etc. days
        const client = await base44.asServiceRole.entities.Client.filter({ 
          id: log.client_id 
        }).then(c => c[0]);

        if (client && client.email) {
          await base44.asServiceRole.functions.invoke('sendPushNotification', {
            userId: client.email,
            title: `🔥 ${streak}-Day Streak!`,
            body: `Amazing! You've logged your progress ${streak} days in a row!`,
            data: {
              url: '/progresstracking',
              type: 'streak',
              clientId: client.id,
            },
            tag: 'streak-milestone',
            requireInteraction: true,
          });
        }
      }
    }

    return Response.json({ message: 'Milestone notification processed' });
  } catch (error) {
    console.error('Error notifying on milestone:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});