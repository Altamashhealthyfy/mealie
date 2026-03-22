import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Allow automation calls
    const user = await base44.auth.isAuthenticated();
    if (!user && !req.headers.get('x-automation-key')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay(); // 0-6
    const today = now.toISOString().split('T')[0];

    // Get all active reminders
    const reminders = await base44.asServiceRole.entities.ReminderSettings.filter({ 
      is_active: true 
    });

    const sentReminders = [];
    const skippedReminders = [];

    for (const reminder of reminders) {
      // Check if it's time to send this reminder
      const shouldSend = await shouldSendReminder(base44, reminder, currentHour, currentMinute, currentDay, today);
      
      if (!shouldSend.send) {
        skippedReminders.push({
          id: reminder.id,
          reason: shouldSend.reason
        });
        continue;
      }

      // Get client details
      const clients = await base44.asServiceRole.entities.Client.filter({ 
        id: reminder.client_id 
      });
      const client = clients[0];

      if (!client) continue;

      // Send in-app notification
      if (reminder.notification_method === 'in_app' || reminder.notification_method === 'both') {
        await base44.asServiceRole.entities.Notification.create({
          user_email: client.email,
          type: 'reminder',
          title: reminder.title,
          message: reminder.message || getDefaultMessage(reminder.reminder_type),
          priority: 'normal',
          link: getActionLink(reminder.reminder_type),
          read: false
        });
      }

      // Send email
      if (reminder.notification_method === 'email' || reminder.notification_method === 'both') {
        try {
          await base44.asServiceRole.functions.invoke('sendEmail', {
            to: client.email,
            subject: `Reminder: ${reminder.title}`,
            body: `
              <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #f97316;">🔔 Reminder</h2>
                <p style="font-size: 16px; color: #333;">Hi ${client.full_name},</p>
                <p style="font-size: 16px; color: #333;">${reminder.message || getDefaultMessage(reminder.reminder_type)}</p>
                <p style="margin-top: 20px;">
                  <a href="https://app.mealiepro.com" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
                    Take Action
                  </a>
                </p>
                <p style="margin-top: 20px; font-size: 14px; color: #666;">
                  Best regards,<br>
                  Your Health Coach
                </p>
              </div>
            `
          });
        } catch (emailError) {
          console.error('Email send error:', emailError);
        }
      }

      // Update last_sent timestamp
      await base44.asServiceRole.entities.ReminderSettings.update(reminder.id, {
        last_sent: now.toISOString()
      });

      sentReminders.push({
        id: reminder.id,
        client: client.full_name,
        type: reminder.reminder_type,
        method: reminder.notification_method
      });
    }

    return Response.json({
      success: true,
      sent: sentReminders.length,
      skipped: skippedReminders.length,
      details: {
        sent: sentReminders,
        skipped: skippedReminders.slice(0, 10) // Limit for response size
      }
    });

  } catch (error) {
    console.error('Send reminders error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});

async function shouldSendReminder(base44, reminder, currentHour, currentMinute, currentDay, today) {
  // Check time of day
  if (reminder.time_of_day) {
    const [reminderHour, reminderMinute] = reminder.time_of_day.split(':').map(Number);
    if (currentHour !== reminderHour || Math.abs(currentMinute - reminderMinute) > 30) {
      return { send: false, reason: 'not_time_yet' };
    }
  }

  // Check day of week
  if (reminder.days_of_week && reminder.days_of_week.length > 0) {
    if (!reminder.days_of_week.includes(currentDay)) {
      return { send: false, reason: 'wrong_day' };
    }
  }

  // Check if already sent recently
  if (reminder.last_sent) {
    const lastSentDate = new Date(reminder.last_sent).toISOString().split('T')[0];
    if (lastSentDate === today && reminder.frequency === 'daily') {
      return { send: false, reason: 'already_sent_today' };
    }
  }

  // Check conditions - only send if action not completed
  if (reminder.conditions?.only_if_not_completed) {
    const completed = await checkIfCompleted(base44, reminder, today);
    if (completed) {
      return { send: false, reason: 'already_completed' };
    }
  }

  return { send: true };
}

async function checkIfCompleted(base44, reminder, today) {
  try {
    if (reminder.reminder_type === 'daily_progress' || reminder.conditions?.check_data_source === 'progress_log') {
      const logs = await base44.asServiceRole.entities.ProgressLog.filter({
        client_id: reminder.client_id,
        date: today
      });
      return logs.length > 0;
    }

    if (reminder.reminder_type === 'food_log' || reminder.conditions?.check_data_source === 'food_log') {
      const logs = await base44.asServiceRole.entities.FoodLog.filter({
        client_id: reminder.client_id,
        date: today
      });
      return logs.length > 0;
    }

    if (reminder.reminder_type === 'challenge' || reminder.conditions?.check_data_source === 'challenge') {
      const challenges = await base44.asServiceRole.entities.ClientChallenge.filter({
        client_id: reminder.client_id,
        challenge_id: reminder.linked_entity_id,
        status: 'active'
      });
      return challenges.length === 0; // If no active challenge, it's completed
    }

    return false;
  } catch (error) {
    console.error('Check completion error:', error);
    return false;
  }
}

function getDefaultMessage(type) {
  const messages = {
    daily_progress: "Don't forget to log your daily progress! Track your weight, measurements, and wellness metrics.",
    food_log: "Remember to log your meals today! Keep track of what you're eating.",
    appointment: "You have an upcoming appointment. Please make sure you're prepared.",
    challenge: "You have an active challenge! Keep up the great work and stay consistent.",
    meal_plan_review: "Time to review your meal plan and prepare for the week ahead.",
    custom: "You have a pending task. Please take action."
  };
  return messages[type] || "You have a reminder pending.";
}

function getActionLink(type) {
  const links = {
    daily_progress: '/ProgressTracking',
    food_log: '/FoodLog',
    appointment: '/ClientAppointments',
    challenge: '/ClientAchievements',
    meal_plan_review: '/MyAssignedMealPlan',
    custom: '/ClientDashboard'
  };
  return links[type] || '/ClientDashboard';
}