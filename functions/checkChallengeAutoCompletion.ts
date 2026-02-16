import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Allow both authenticated users and service role (for automation)
    if (!user && !req.headers.get('x-automation-key')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activeChallenges = await base44.asServiceRole.entities.ClientChallenge.filter({ 
      status: 'active' 
    });

    const completedToday = [];
    const updatedChallenges = [];

    for (const clientChallenge of activeChallenges) {
      // Get challenge details
      const challenges = await base44.asServiceRole.entities.Challenge.filter({ 
        id: clientChallenge.challenge_id 
      });
      const challenge = challenges[0];
      
      if (!challenge || !challenge.auto_completion_rules?.enabled) continue;

      const rules = challenge.auto_completion_rules;
      const today = new Date().toISOString().split('T')[0];

      // Get client data based on data source
      let shouldComplete = false;
      let currentValue = 0;

      if (rules.data_source === 'progress_log') {
        const logs = await base44.asServiceRole.entities.ProgressLog.filter({ 
          client_id: clientChallenge.client_id 
        });
        
        if (rules.condition === 'consecutive_days') {
          // Check consecutive days
          const recentLogs = logs
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, rules.consecutive_days_required || 7);
          
          const consecutiveDays = recentLogs.filter(log => {
            const metricValue = log.wellness_metrics?.[rules.metric_field] || log[rules.metric_field];
            return metricValue >= rules.threshold_value;
          }).length;

          if (consecutiveDays >= rules.consecutive_days_required) {
            shouldComplete = true;
            currentValue = consecutiveDays;
          }
        } else {
          // Check latest value
          const latestLog = logs.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
          if (latestLog) {
            const metricValue = latestLog.wellness_metrics?.[rules.metric_field] || latestLog[rules.metric_field];
            currentValue = metricValue || 0;

            switch (rules.condition) {
              case 'greater_than':
                shouldComplete = currentValue > rules.threshold_value;
                break;
              case 'greater_or_equal':
                shouldComplete = currentValue >= rules.threshold_value;
                break;
              case 'less_than':
                shouldComplete = currentValue < rules.threshold_value;
                break;
              case 'equals':
                shouldComplete = currentValue === rules.threshold_value;
                break;
            }
          }
        }
      } else if (rules.data_source === 'food_log') {
        const logs = await base44.asServiceRole.entities.FoodLog.filter({ 
          client_id: clientChallenge.client_id,
          date: today
        });
        currentValue = logs.length;
        
        if (rules.condition === 'greater_or_equal') {
          shouldComplete = currentValue >= rules.threshold_value;
        }
      }

      // Update challenge if criteria met
      if (shouldComplete && clientChallenge.status === 'active') {
        await base44.asServiceRole.entities.ClientChallenge.update(clientChallenge.id, {
          status: 'completed',
          completed_date: new Date().toISOString(),
          progress_percentage: 100,
          current_value: currentValue
        });

        // Award points
        await base44.asServiceRole.functions.invoke('awardPoints', {
          clientId: clientChallenge.client_id,
          actionType: 'challenge_completed',
          pointsEarned: challenge.points_reward,
          description: `Completed challenge: ${challenge.title}`,
          relatedEntityId: clientChallenge.id
        });

        // Get client for notification
        const clients = await base44.asServiceRole.entities.Client.filter({ 
          id: clientChallenge.client_id 
        });
        const client = clients[0];

        if (client) {
          await base44.asServiceRole.entities.Notification.create({
            user_email: client.email,
            type: 'achievement',
            title: '🎉 Challenge Completed!',
            message: `Congratulations! You've completed "${challenge.title}" and earned ${challenge.points_reward} points!`,
            priority: 'high',
            link: '/ClientAchievements',
            read: false
          });
        }

        completedToday.push({
          challenge: challenge.title,
          client_id: clientChallenge.client_id,
          points: challenge.points_reward
        });
      } else if (currentValue > 0) {
        // Update progress
        const progressPercentage = Math.min(100, (currentValue / rules.threshold_value) * 100);
        await base44.asServiceRole.entities.ClientChallenge.update(clientChallenge.id, {
          current_value: currentValue,
          progress_percentage: progressPercentage
        });
        updatedChallenges.push(clientChallenge.id);
      }
    }

    return Response.json({
      success: true,
      completed: completedToday.length,
      updated: updatedChallenges.length,
      details: {
        completedChallenges: completedToday,
        updatedChallenges: updatedChallenges
      }
    });

  } catch (error) {
    console.error('Auto-completion check error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});