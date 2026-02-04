import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all active reminder settings
    const reminderSettings = await base44.asServiceRole.entities.ReminderSettings.filter({
      is_active: true,
      progress_reminders_enabled: true
    });

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentDay = now.getDay();
    
    const results = {
      checked: reminderSettings.length,
      sent: 0,
      skipped: 0,
      errors: []
    };

    for (const setting of reminderSettings) {
      try {
        // Check if it's time to send reminder
        const shouldSend = checkIfShouldSendReminder(setting, currentTime, currentDay, now);
        
        if (!shouldSend) {
          results.skipped++;
          continue;
        }

        // Build reminder message
        const reminderTypes = [];
        if (setting.weigh_in_reminders) reminderTypes.push('weigh-in');
        if (setting.meal_log_reminders) reminderTypes.push('meal logging');
        if (setting.exercise_reminders) reminderTypes.push('exercise tracking');
        if (setting.mpess_reminders) reminderTypes.push('MPESS wellness');

        const message = setting.custom_message || 
          `Hi ${setting.client_name}! This is your friendly reminder to log your ${reminderTypes.join(', ')} for today. Consistency is key to achieving your health goals! 💪`;

        // Send notification
        if (setting.reminder_method === 'notification' || setting.reminder_method === 'both') {
          await base44.asServiceRole.entities.Notification.create({
            user_email: setting.client_email,
            title: '📊 Progress Logging Reminder',
            message: message,
            type: 'reminder',
            priority: 'normal',
            action_url: '/progress-tracking',
            is_read: false
          });
        }

        // Send email
        if (setting.reminder_method === 'email' || setting.reminder_method === 'both') {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: setting.client_email,
            subject: 'Time to Log Your Progress! 📊',
            body: message
          });
        }

        // Update last sent timestamp
        await base44.asServiceRole.entities.ReminderSettings.update(setting.id, {
          last_progress_reminder_sent: now.toISOString()
        });

        results.sent++;
      } catch (error) {
        results.errors.push({
          client: setting.client_email,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Progress reminder error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});

function checkIfShouldSendReminder(setting, currentTime, currentDay, now) {
  // Check if reminder time matches (within 30 minute window)
  if (setting.progress_reminder_time) {
    const [targetHour, targetMinute] = setting.progress_reminder_time.split(':').map(Number);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const timeDiff = Math.abs((currentHour * 60 + currentMinute) - (targetHour * 60 + targetMinute));
    if (timeDiff > 30) {
      return false;
    }
  }

  // Check frequency
  if (setting.progress_reminder_frequency === 'daily') {
    // Send every day (already passed time check)
    return true;
  }

  if (setting.progress_reminder_frequency === 'weekly') {
    // Check if today is in the selected days
    return setting.progress_reminder_days?.includes(currentDay) || false;
  }

  if (setting.progress_reminder_frequency === 'every_2_days') {
    // Check if last reminder was sent more than 2 days ago
    if (!setting.last_progress_reminder_sent) return true;
    const lastSent = new Date(setting.last_progress_reminder_sent);
    const hoursSince = (now - lastSent) / (1000 * 60 * 60);
    return hoursSince >= 48;
  }

  return false;
}