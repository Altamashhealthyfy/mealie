import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Auto-creates notifications for key events
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all necessary data
    const [clients, progressLogs, foodLogs, messages, assessments] = await Promise.all([
      base44.asServiceRole.entities.Client.list('-created_date', 500),
      base44.asServiceRole.entities.ProgressLog.list('-date', 1000),
      base44.asServiceRole.entities.FoodLog.list('-date', 1000),
      base44.asServiceRole.entities.Message.list('-created_date', 200),
      base44.asServiceRole.entities.ClientAssessment.list('-created_date', 200),
    ]);

    const today = new Date();
    const notifications = [];

    // Check each client
    for (const client of clients) {
      if (client.status !== 'active') continue;

      const clientProgress = progressLogs.filter(p => p.client_id === client.id);
      const clientFood = foodLogs.filter(f => f.client_id === client.id);
      const clientMessages = messages.filter(m => m.client_id === client.id && m.sender_type === 'client' && !m.read);

      // 1. Low Compliance Alert (< 50% adherence in last 7 days)
      const recentProgress = clientProgress.filter(p => {
        const logDate = new Date(p.date);
        const daysDiff = Math.floor((today - logDate) / (1000 * 60 * 60 * 24));
        return daysDiff <= 7 && p.meal_adherence !== null;
      });

      if (recentProgress.length > 0) {
        const avgAdherence = recentProgress.reduce((sum, p) => sum + (p.meal_adherence || 0), 0) / recentProgress.length;
        if (avgAdherence < 50) {
          notifications.push({
            user_email: client.created_by,
            type: 'progress_update',
            title: `Low Compliance Alert: ${client.full_name}`,
            message: `${client.full_name} has ${Math.round(avgAdherence)}% meal adherence this week. Consider reaching out.`,
            priority: 'high',
            link: `/ClientManagement?client=${client.id}`,
          });
        }
      }

      // 2. No Activity Alert (no logs in 7+ days)
      const lastActivity = [...clientProgress, ...clientFood]
        .map(log => new Date(log.date))
        .sort((a, b) => b - a)[0];

      if (lastActivity) {
        const daysSinceActivity = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));
        if (daysSinceActivity >= 7 && daysSinceActivity <= 8) {
          notifications.push({
            user_email: client.created_by,
            type: 'progress_update',
            title: `Inactive Client: ${client.full_name}`,
            message: `${client.full_name} hasn't logged progress in ${daysSinceActivity} days. Check in with them.`,
            priority: 'normal',
            link: `/ClientManagement?client=${client.id}`,
          });
        }
      }

      // 3. Weight Milestone Alert (lost 5kg or more)
      if (clientProgress.length >= 2 && client.initial_weight) {
        const sortedProgress = clientProgress
          .filter(p => p.weight)
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const latestWeight = sortedProgress[sortedProgress.length - 1]?.weight;
        if (latestWeight && client.initial_weight - latestWeight >= 5) {
          const weightLost = (client.initial_weight - latestWeight).toFixed(1);
          notifications.push({
            user_email: client.created_by,
            type: 'progress_update',
            title: `🎉 Milestone: ${client.full_name} Lost ${weightLost}kg!`,
            message: `Congratulate ${client.full_name} on their amazing progress!`,
            priority: 'high',
            link: `/ClientManagement?client=${client.id}`,
          });
        }
      }

      // 4. Unread Message Alert
      if (clientMessages.length > 0) {
        notifications.push({
          user_email: client.created_by,
          type: 'new_message',
          title: `Unread Messages from ${client.full_name}`,
          message: `You have ${clientMessages.length} unread message${clientMessages.length > 1 ? 's' : ''} from ${client.full_name}`,
          priority: 'high',
          link: `/Communication`,
        });
      }

      // 5. Assessment Completed Alert
      const recentAssessments = assessments.filter(a => 
        a.client_id === client.id && 
        a.status === 'completed' &&
        !a.report_generated
      );

      if (recentAssessments.length > 0) {
        notifications.push({
          user_email: client.created_by,
          type: 'assessment_completed',
          title: `Assessment Complete: ${client.full_name}`,
          message: `${client.full_name} completed their health assessment. Generate a report now.`,
          priority: 'normal',
          link: `/ClientAssessments`,
        });
      }
    }

    // Check for existing notifications to avoid duplicates
    const existingNotifications = await base44.asServiceRole.entities.Notification.list('-created_date', 100);
    const last24Hours = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const filteredNotifications = notifications.filter(notif => {
      const isDuplicate = existingNotifications.some(existing => 
        existing.title === notif.title &&
        existing.user_email === notif.user_email &&
        new Date(existing.created_date) > last24Hours
      );
      return !isDuplicate;
    });

    // Create notifications
    const created = await Promise.all(
      filteredNotifications.map(notif => 
        base44.asServiceRole.entities.Notification.create(notif)
      )
    );

    return Response.json({
      success: true,
      notifications_created: created.length,
      total_checked: clients.length,
    });
  } catch (error) {
    console.error('Error creating notifications:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});