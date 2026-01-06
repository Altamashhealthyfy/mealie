import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This should be called by a scheduled task
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ 
        error: 'Forbidden: Admin access required' 
      }, { status: 403 });
    }

    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    // Get all active clients
    const clients = await base44.asServiceRole.entities.Client.filter({ status: 'active' });
    
    // Get recent logs
    const progressLogs = await base44.asServiceRole.entities.ProgressLog.list('-date', 1000);
    const foodLogs = await base44.asServiceRole.entities.FoodLog.list('-date', 1000);

    const notifications = [];

    for (const client of clients) {
      const clientProgress = progressLogs.filter(l => 
        l.client_id === client.id && 
        new Date(l.date) >= sevenDaysAgo
      );
      
      const clientFood = foodLogs.filter(l => 
        l.client_id === client.id && 
        new Date(l.date) >= sevenDaysAgo
      );

      // Low compliance check (no logs in 7 days)
      if (clientProgress.length === 0 && clientFood.length === 0) {
        const notifyEmail = client.assigned_coach || client.created_by;
        
        if (notifyEmail) {
          await base44.asServiceRole.entities.Notification.create({
            user_email: notifyEmail,
            type: 'progress_update',
            title: `Low Activity: ${client.full_name}`,
            message: `${client.full_name} hasn't logged any progress or food in the past 7 days. Consider reaching out.`,
            priority: 'high',
            link: '/ClientManagement',
            read: false,
            metadata: {
              client_id: client.id,
              client_name: client.full_name,
              compliance_issue: 'no_activity_7_days'
            }
          });
          
          notifications.push({
            client: client.full_name,
            issue: 'no_activity_7_days'
          });
        }
      }

      // Check for milestone - significant weight loss
      if (clientProgress.length >= 2) {
        const sortedLogs = clientProgress.sort((a, b) => 
          new Date(a.date) - new Date(b.date)
        );
        const firstLog = sortedLogs[0];
        const latestLog = sortedLogs[sortedLogs.length - 1];
        
        if (firstLog.weight && latestLog.weight) {
          const weightLoss = firstLog.weight - latestLog.weight;
          
          if (weightLoss >= 5) { // 5kg milestone
            const notifyEmail = client.assigned_coach || client.created_by;
            
            if (notifyEmail) {
              await base44.asServiceRole.entities.Notification.create({
                user_email: notifyEmail,
                type: 'progress_update',
                title: `🎉 Milestone: ${client.full_name}`,
                message: `${client.full_name} has lost ${weightLoss.toFixed(1)} kg! Celebrate this achievement with them!`,
                priority: 'normal',
                link: '/ClientManagement',
                read: false,
                metadata: {
                  client_id: client.id,
                  client_name: client.full_name,
                  milestone_type: 'weight_loss',
                  weight_loss: weightLoss
                }
              });
              
              notifications.push({
                client: client.full_name,
                milestone: `${weightLoss.toFixed(1)}kg lost`
              });
            }
          }
        }
      }
    }

    return Response.json({ 
      success: true, 
      notifications_created: notifications.length,
      details: notifications
    });

  } catch (error) {
    console.error('Error checking compliance:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});