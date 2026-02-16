import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    // Get all active goals
    const goals = await base44.asServiceRole.entities.ProgressGoal.filter({ 
      status: 'active' 
    });

    let milestonesTriggered = 0;

    for (const goal of goals) {
      if (!goal.milestone_alerts || goal.milestone_alerts.length === 0) continue;

      // Calculate current progress percentage
      const progress = goal.start_value && goal.target_value
        ? ((goal.current_value - goal.start_value) / (goal.target_value - goal.start_value)) * 100
        : 0;

      // Check each milestone
      let updated = false;
      const updatedMilestones = goal.milestone_alerts.map(milestone => {
        if (!milestone.triggered && progress >= milestone.percentage) {
          // Trigger milestone notification
          base44.asServiceRole.entities.Notification.create({
            user_email: (async () => {
              const client = await base44.asServiceRole.entities.Client.filter({ id: goal.client_id });
              return client[0]?.email;
            })(),
            type: 'achievement',
            title: '🎯 Milestone Reached!',
            message: `You've reached ${milestone.percentage}% of your goal "${goal.title}"! ${milestone.message}`,
            priority: 'high',
            link: '/ProgressTracking',
            read: false
          });

          milestonesTriggered++;
          updated = true;
          return { ...milestone, triggered: true };
        }
        return milestone;
      });

      if (updated) {
        await base44.asServiceRole.entities.ProgressGoal.update(goal.id, {
          milestone_alerts: updatedMilestones
        });
      }
    }

    return Response.json({ 
      success: true, 
      goalsChecked: goals.length,
      milestonesTriggered 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});