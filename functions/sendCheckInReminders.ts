import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This function should be called by a cron job
    // Get all active check-in configurations
    const configurations = await base44.asServiceRole.entities.CheckInConfiguration.filter({ 
      enabled: true 
    });

    const now = new Date();
    const results = [];

    for (const config of configurations) {
      try {
        // Check if reminder should be sent based on frequency
        let shouldSend = false;
        
        if (!config.last_reminder_sent) {
          shouldSend = true;
        } else {
          const lastSent = new Date(config.last_reminder_sent);
          const hoursSince = (now - lastSent) / (1000 * 60 * 60);
          
          if (config.frequency === 'daily' && hoursSince >= 24) {
            shouldSend = true;
          } else if (config.frequency === 'weekly' && hoursSince >= 168) {
            shouldSend = true;
          } else if (config.frequency === 'biweekly' && hoursSince >= 336) {
            shouldSend = true;
          }
        }

        if (!shouldSend) continue;

        // Get client details
        const clients = await base44.asServiceRole.entities.Client.filter({ id: config.client_id });
        if (clients.length === 0) continue;
        
        const client = clients[0];

        // Build reminder message
        const trackingItems = config.check_in_type || [];
        const itemsList = trackingItems.map(item => {
          const labels = {
            weight: '⚖️ Weight',
            measurements: '📏 Body measurements',
            mood: '😊 Mood & energy levels',
            adherence: '✓ Meal plan adherence',
            photos: '📸 Progress photos'
          };
          return labels[item] || item;
        }).join('\n• ');

        const emailSubject = `📊 Time to Log Your Progress!`;
        const emailBody = `
Hi ${client.full_name},

It's time for your ${config.frequency} check-in! 🎯

Please log the following:
• ${itemsList}

Tracking your progress helps us:
✓ Adjust your meal plan
✓ Celebrate your wins
✓ Keep you on track to your goals

Log in now to update your progress: ${Deno.env.get('APP_URL') || 'https://your-app-url.com'}

Keep up the great work!

Your Health Coach
        `.trim();

        // Send email reminder
        if (config.reminder_method === 'email' || config.reminder_method === 'both') {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: client.email,
              subject: emailSubject,
              body: emailBody
            });
            results.push({ client: client.full_name, method: 'email', status: 'sent' });
          } catch (emailError) {
            results.push({ client: client.full_name, method: 'email', status: 'failed', error: emailError.message });
          }
        }

        // Send WhatsApp reminder
        if (config.reminder_method === 'whatsapp' || config.reminder_method === 'both') {
          if (client.phone) {
            try {
              const whatsappMessage = `Hi ${client.full_name}! 📊\n\nTime for your ${config.frequency} check-in!\n\nPlease log:\n• ${itemsList}\n\nLog in to track your progress and stay on target! 🎯`;
              
              await base44.functions.invoke('sendWhatsAppMessage', {
                phone: client.phone,
                message: whatsappMessage
              });
              results.push({ client: client.full_name, method: 'whatsapp', status: 'sent' });
            } catch (whatsappError) {
              results.push({ client: client.full_name, method: 'whatsapp', status: 'failed', error: whatsappError.message });
            }
          }
        }

        // Update last reminder sent
        await base44.asServiceRole.entities.CheckInConfiguration.update(config.id, {
          last_reminder_sent: now.toISOString()
        });

      } catch (error) {
        console.error(`Error processing config ${config.id}:`, error);
        results.push({ config: config.id, status: 'error', error: error.message });
      }
    }

    return Response.json({
      success: true,
      processed: configurations.length,
      results
    });

  } catch (error) {
    console.error('Error in sendCheckInReminders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});