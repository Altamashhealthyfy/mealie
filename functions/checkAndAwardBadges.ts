import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { client_id } = await req.json();

    if (!client_id) {
      return Response.json({ error: 'client_id required' }, { status: 400 });
    }

    const badgesEarned = [];

    // Fetch all necessary data
    const [points, progressLogs, foodLogs, badges] = await Promise.all([
      base44.entities.GamificationPoints.filter({ client_id }),
      base44.entities.ProgressLog.filter({ client_id }),
      base44.entities.FoodLog.filter({ client_id }),
      base44.entities.Badge.list()
    ]);

    // Define badge earning criteria
    const badgeCriteria = [
      // Progress badges
      {
        name: 'First Steps',
        condition: () => progressLogs.length >= 1,
        description: 'Submit your first progress log'
      },
      {
        name: 'Progress Pioneer',
        condition: () => progressLogs.length >= 10,
        description: 'Submit 10 progress logs'
      },
      {
        name: 'Food Logger',
        condition: () => foodLogs.length >= 7,
        description: 'Log meals for 7 days'
      },
      {
        name: 'Food Master',
        condition: () => foodLogs.length >= 30,
        description: 'Log meals for 30 days'
      },
      {
        name: 'Consistency King',
        condition: () => {
          const dates = [...new Set(progressLogs.map(p => new Date(p.date).toDateString()))];
          return dates.length >= 7;
        },
        description: 'Log progress on 7 different days'
      },
      {
        name: 'Week Warrior',
        condition: () => {
          const dates = [...new Set(progressLogs.map(p => new Date(p.date).toDateString()))];
          return dates.length >= 14;
        },
        description: 'Log progress for 2 weeks'
      },
      {
        name: 'Month Master',
        condition: () => {
          const dates = [...new Set(progressLogs.map(p => new Date(p.date).toDateString()))];
          return dates.length >= 30;
        },
        description: 'Log progress for 30 days'
      }
    ];

    // Check each badge criteria
    for (const criteria of badgeCriteria) {
      try {
        if (criteria.condition()) {
          const badgeDef = badges.find(b => b.name === criteria.name);
          
          if (badgeDef) {
            const existing = await base44.entities.ClientBadge.filter({
              client_id,
              badge_id: badgeDef.id
            });

            if (existing.length === 0) {
              await base44.entities.ClientBadge.create({
                client_id,
                badge_id: badgeDef.id,
                earned_date: new Date().toISOString()
              });
              badgesEarned.push(criteria.name);
            }
          }
        }
      } catch (error) {
        console.error(`Error checking badge ${criteria.name}:`, error);
      }
    }

    return Response.json({
      success: true,
      badgesEarned,
      totalBadgesChecked: badgeCriteria.length
    });
  } catch (error) {
    console.error('Error checking badges:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});