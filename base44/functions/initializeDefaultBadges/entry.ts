import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.user_type !== 'super_admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const defaultBadges = [
      {
        name: "First Steps",
        description: "Log your first progress entry",
        icon: "👣",
        category: "milestone",
        rarity: "common",
        points_required: 10,
        is_active: true
      },
      {
        name: "Week Warrior",
        description: "Log progress for 7 consecutive days",
        icon: "🔥",
        category: "consistency",
        rarity: "rare",
        points_required: 100,
        is_active: true
      },
      {
        name: "Weight Champion",
        description: "Lose 5kg from starting weight",
        icon: "🏆",
        category: "weight_loss",
        rarity: "epic",
        unlock_criteria: {
          type: "weight_loss",
          value: 5,
          description: "Lose 5kg"
        },
        is_active: true
      },
      {
        name: "Hydration Hero",
        description: "Drink 2L+ water for 30 days",
        icon: "💧",
        category: "wellness",
        rarity: "rare",
        points_required: 300,
        is_active: true
      },
      {
        name: "Perfect Week",
        description: "100% meal adherence for 7 days",
        icon: "⭐",
        category: "nutrition",
        rarity: "epic",
        points_required: 200,
        is_active: true
      },
      {
        name: "Century Club",
        description: "Earn 100 total points",
        icon: "💯",
        category: "milestone",
        rarity: "rare",
        points_required: 100,
        is_active: true
      },
      {
        name: "Transformation Legend",
        description: "Reach your target weight",
        icon: "👑",
        category: "weight_loss",
        rarity: "legendary",
        unlock_criteria: {
          type: "goal_completion",
          value: 1,
          description: "Achieve target weight"
        },
        is_active: true
      },
      {
        name: "Wellness Warrior",
        description: "Track all wellness metrics for 30 days",
        icon: "🌟",
        category: "wellness",
        rarity: "epic",
        points_required: 500,
        is_active: true
      }
    ];

    const created = [];
    for (const badgeData of defaultBadges) {
      const badge = await base44.asServiceRole.entities.Badge.create(badgeData);
      created.push(badge);
    }

    return Response.json({
      success: true,
      message: `Created ${created.length} default badges`,
      badges: created
    });

  } catch (error) {
    console.error('Initialize badges error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});