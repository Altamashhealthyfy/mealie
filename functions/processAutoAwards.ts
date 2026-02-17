import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { client_id } = await req.json();

    if (!client_id) {
      return Response.json({ error: 'client_id is required' }, { status: 400 });
    }

    // Get all active auto-award rules
    const rules = await base44.asServiceRole.entities.AutoAwardRule.filter({ is_active: true });
    
    // Get client data
    const client = await base44.asServiceRole.entities.Client.get(client_id);
    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get client's award history to check for repeatable rules
    const awardHistory = await base44.asServiceRole.entities.AwardHistory.filter({ client_id });

    const awardsGiven = [];

    for (const rule of rules) {
      try {
        // Check if already awarded (for non-repeatable rules)
        if (!rule.is_repeatable) {
          const previouslyAwarded = awardHistory.find(h => h.rule_id === rule.id);
          if (previouslyAwarded) continue;
        }

        // Check cooldown for repeatable rules
        if (rule.is_repeatable && rule.cooldown_days) {
          const lastAwarded = awardHistory
            .filter(h => h.rule_id === rule.id)
            .sort((a, b) => new Date(b.awarded_at) - new Date(a.awarded_at))[0];
          
          if (lastAwarded) {
            const daysSinceLastAward = (Date.now() - new Date(lastAwarded.awarded_at)) / (1000 * 60 * 60 * 24);
            if (daysSinceLastAward < rule.cooldown_days) continue;
          }
        }

        // Check rule conditions
        let shouldAward = false;
        let triggerData = {};

        const now = new Date();
        const timePeriodStart = rule.trigger_condition?.time_period_days 
          ? new Date(now.getTime() - rule.trigger_condition.time_period_days * 24 * 60 * 60 * 1000)
          : null;

        switch (rule.trigger_type) {
          case 'progress_log_count': {
            const logs = timePeriodStart
              ? await base44.asServiceRole.entities.ProgressLog.filter({ 
                  client_id, 
                  date: { $gte: timePeriodStart.toISOString().split('T')[0] }
                })
              : await base44.asServiceRole.entities.ProgressLog.filter({ client_id });
            
            shouldAward = checkCondition(logs.length, rule.trigger_condition);
            triggerData = { count: logs.length, type: 'progress_logs' };
            break;
          }

          case 'food_log_count': {
            const logs = timePeriodStart
              ? await base44.asServiceRole.entities.FoodLog.filter({ 
                  client_id,
                  date: { $gte: timePeriodStart.toISOString().split('T')[0] }
                })
              : await base44.asServiceRole.entities.FoodLog.filter({ client_id });
            
            shouldAward = checkCondition(logs.length, rule.trigger_condition);
            triggerData = { count: logs.length, type: 'food_logs' };
            break;
          }

          case 'weight_loss_milestone': {
            const logs = await base44.asServiceRole.entities.ProgressLog.filter({ client_id });
            const logsWithWeight = logs.filter(l => l.weight).sort((a, b) => new Date(a.date) - new Date(b.date));
            
            if (logsWithWeight.length >= 2) {
              const firstWeight = logsWithWeight[0].weight;
              const currentWeight = logsWithWeight[logsWithWeight.length - 1].weight;
              const weightLoss = firstWeight - currentWeight;
              
              shouldAward = checkCondition(weightLoss, rule.trigger_condition);
              triggerData = { weight_loss: weightLoss, type: 'weight_milestone' };
            }
            break;
          }

          case 'consecutive_days': {
            const logs = await base44.asServiceRole.entities.ProgressLog.filter({ client_id });
            const sortedLogs = logs.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            let consecutiveDays = 0;
            let lastDate = null;
            
            for (const log of sortedLogs) {
              const logDate = new Date(log.date);
              if (!lastDate) {
                consecutiveDays = 1;
                lastDate = logDate;
              } else {
                const dayDiff = Math.floor((lastDate - logDate) / (1000 * 60 * 60 * 24));
                if (dayDiff === 1) {
                  consecutiveDays++;
                  lastDate = logDate;
                } else {
                  break;
                }
              }
            }
            
            shouldAward = checkCondition(consecutiveDays, rule.trigger_condition);
            triggerData = { consecutive_days: consecutiveDays, type: 'streak' };
            break;
          }

          case 'workout_count': {
            const logs = timePeriodStart
              ? await base44.asServiceRole.entities.ProgressLog.filter({ 
                  client_id,
                  date: { $gte: timePeriodStart.toISOString().split('T')[0] }
                })
              : await base44.asServiceRole.entities.ProgressLog.filter({ client_id });
            
            const workoutCount = logs.filter(l => l.wellness_metrics?.exercise_minutes > 0).length;
            shouldAward = checkCondition(workoutCount, rule.trigger_condition);
            triggerData = { workout_count: workoutCount, type: 'workouts' };
            break;
          }

          case 'meal_adherence': {
            const logs = timePeriodStart
              ? await base44.asServiceRole.entities.ProgressLog.filter({ 
                  client_id,
                  date: { $gte: timePeriodStart.toISOString().split('T')[0] }
                })
              : await base44.asServiceRole.entities.ProgressLog.filter({ client_id });
            
            const adherenceLogs = logs.filter(l => l.meal_adherence !== undefined);
            if (adherenceLogs.length > 0) {
              const avgAdherence = adherenceLogs.reduce((sum, l) => sum + l.meal_adherence, 0) / adherenceLogs.length;
              shouldAward = checkCondition(avgAdherence, rule.trigger_condition);
              triggerData = { average_adherence: avgAdherence, type: 'meal_adherence' };
            }
            break;
          }

          case 'water_intake_goal': {
            const logs = timePeriodStart
              ? await base44.asServiceRole.entities.ProgressLog.filter({ 
                  client_id,
                  date: { $gte: timePeriodStart.toISOString().split('T')[0] }
                })
              : await base44.asServiceRole.entities.ProgressLog.filter({ client_id });
            
            const waterLogs = logs.filter(l => l.wellness_metrics?.water_intake >= (rule.trigger_condition?.threshold || 2));
            shouldAward = checkCondition(waterLogs.length, rule.trigger_condition);
            triggerData = { days_met_goal: waterLogs.length, type: 'water_intake' };
            break;
          }
        }

        // Award if condition met
        if (shouldAward) {
          const awardedAt = new Date().toISOString();

          // Award points
          if (rule.award_type === 'points' || rule.award_type === 'both') {
            await base44.asServiceRole.entities.GamificationPoints.create({
              client_id,
              action_type: 'custom',
              points_earned: rule.points_to_award,
              description: rule.award_message || rule.rule_name,
              date_earned: awardedAt,
              related_entity_id: rule.id
            });
          }

          // Award badge
          if (rule.award_type === 'badge' || rule.award_type === 'both') {
            const existingBadge = await base44.asServiceRole.entities.ClientBadge.filter({
              client_id,
              badge_id: rule.badge_to_award
            });

            if (existingBadge.length === 0) {
              await base44.asServiceRole.entities.ClientBadge.create({
                client_id,
                badge_id: rule.badge_to_award,
                earned_date: awardedAt,
                is_new: true
              });
            }
          }

          // Record in history
          await base44.asServiceRole.entities.AwardHistory.create({
            client_id,
            rule_id: rule.id,
            rule_name: rule.rule_name,
            award_type: rule.award_type,
            points_awarded: rule.points_to_award || 0,
            badge_awarded: rule.badge_to_award,
            trigger_data: triggerData,
            awarded_at: awardedAt
          });

          awardsGiven.push({
            rule_name: rule.rule_name,
            award_type: rule.award_type,
            message: rule.award_message
          });
        }
      } catch (error) {
        console.error(`Error processing rule ${rule.id}:`, error);
      }
    }

    return Response.json({ 
      success: true, 
      awards_given: awardsGiven.length,
      awards: awardsGiven
    });

  } catch (error) {
    console.error('Error in processAutoAwards:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function checkCondition(value, condition) {
  if (!condition) return false;
  
  const threshold = condition.threshold || 0;
  const comparison = condition.comparison || 'greater_or_equal';

  switch (comparison) {
    case 'equals':
      return value === threshold;
    case 'greater_than':
      return value > threshold;
    case 'greater_or_equal':
      return value >= threshold;
    case 'less_than':
      return value < threshold;
    default:
      return false;
  }
}