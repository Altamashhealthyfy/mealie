import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all coaches
    const allUsers = await base44.asServiceRole.entities.User.list();
    const coaches = allUsers.filter(u => 
      u.user_type === 'super_admin' || 
      u.user_type === 'student_coach' || 
      u.user_type === 'team_member'
    );

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const results = [];

    for (const coach of coaches) {
      try {
        // Get coach's clients
        const allClients = await base44.asServiceRole.entities.Client.list();
        const coachClients = coach.user_type === 'super_admin' 
          ? allClients 
          : allClients.filter(c => c.created_by === coach.email);

        if (coachClients.length === 0) continue;

        // Get yesterday's activity
        const progressLogs = await base44.asServiceRole.entities.ProgressLog.filter({
          date: yesterdayStr
        });
        
        const foodLogs = await base44.asServiceRole.entities.FoodLog.filter({
          date: yesterdayStr
        });

        const coachProgressLogs = progressLogs.filter(log => 
          coachClients.some(c => c.id === log.client_id)
        );
        
        const coachFoodLogs = foodLogs.filter(log => 
          coachClients.some(c => c.id === log.client_id)
        );

        // Check for inactive clients
        const allProgressLogs = await base44.asServiceRole.entities.ProgressLog.list('-date', 500);
        const inactiveClients = coachClients.filter(client => {
          const clientLogs = allProgressLogs.filter(log => log.client_id === client.id);
          if (clientLogs.length === 0) return true;
          
          const lastLog = clientLogs[0];
          const daysSince = Math.floor((new Date() - new Date(lastLog.date)) / (1000 * 60 * 60 * 24));
          
          // Check if client has config with custom alert days
          const configs = base44.asServiceRole.entities.CheckInConfiguration.filter({ 
            client_id: client.id 
          });
          const alertDays = configs[0]?.inactivity_alert_days || 3;
          
          return daysSince >= alertDays;
        });

        // Only send if there's meaningful activity or alerts
        if (coachProgressLogs.length === 0 && coachFoodLogs.length === 0 && inactiveClients.length === 0) {
          continue;
        }

        // Build digest email
        const activeClients = new Set([
          ...coachProgressLogs.map(log => log.client_id),
          ...coachFoodLogs.map(log => log.client_id)
        ]);

        const emailSubject = `📊 Daily Client Activity Digest - ${yesterday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        
        const emailBody = `
Hi ${coach.full_name},

Here's your daily client activity summary for ${yesterday.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 YESTERDAY'S ACTIVITY

✓ Active Clients: ${activeClients.size} out of ${coachClients.length}
✓ Progress Logs: ${coachProgressLogs.length}
✓ Food Logs: ${coachFoodLogs.length}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${inactiveClients.length > 0 ? `
⚠️ CLIENTS NEEDING ATTENTION (${inactiveClients.length})

${inactiveClients.slice(0, 5).map(client => {
  const lastLog = allProgressLogs.find(log => log.client_id === client.id);
  const daysSince = lastLog 
    ? Math.floor((new Date() - new Date(lastLog.date)) / (1000 * 60 * 60 * 24))
    : 999;
  return `• ${client.full_name} - ${daysSince} days since last log`;
}).join('\n')}

${inactiveClients.length > 5 ? `... and ${inactiveClients.length - 5} more` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ''}

${coachProgressLogs.length > 0 ? `
📊 TOP PROGRESS UPDATES

${coachProgressLogs.slice(0, 5).map(log => {
  const client = coachClients.find(c => c.id === log.client_id);
  return `• ${client?.full_name} - ${log.weight} kg ${log.notes ? `(${log.notes.substring(0, 50)}...)` : ''}`;
}).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ''}

View full details in your dashboard.

Keep up the great coaching! 💪

Mealie Health Coach Platform
        `.trim();

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: coach.email,
          subject: emailSubject,
          body: emailBody
        });

        results.push({ 
          coach: coach.full_name, 
          status: 'sent',
          activeClients: activeClients.size,
          inactiveClients: inactiveClients.length
        });

      } catch (error) {
        console.error(`Error processing coach ${coach.email}:`, error);
        results.push({ coach: coach.email, status: 'failed', error: error.message });
      }
    }

    return Response.json({
      success: true,
      processed: coaches.length,
      results
    });

  } catch (error) {
    console.error('Error in sendCoachDigest:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});