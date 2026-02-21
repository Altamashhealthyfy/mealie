import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all active schedules that are due
    const schedules = await base44.asServiceRole.entities.ClientCheckInSchedule.filter({
      is_active: true
    });

    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMinute = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;
    const dayOfWeek = now.getDay();
    const dateOfMonth = now.getDate();

    let sentCount = 0;

    for (const schedule of schedules) {
      try {
        let shouldSend = false;

        // Check if within date range
        const startDate = schedule.start_date ? new Date(schedule.start_date) : null;
        const endDate = schedule.end_date ? new Date(schedule.end_date) : null;

        if (startDate && now < startDate) continue;
        if (endDate && now > endDate) continue;

        // Check max sends limit
        if (schedule.max_sends && schedule.times_sent >= schedule.max_sends) continue;

        // Check if last sent was today (for daily schedules)
        const lastSent = schedule.last_sent_date ? new Date(schedule.last_sent_date) : null;
        const isToday = lastSent && 
          lastSent.getFullYear() === now.getFullYear() &&
          lastSent.getMonth() === now.getMonth() &&
          lastSent.getDate() === now.getDate();

        // Determine if message should be sent based on frequency
        if (schedule.frequency === 'daily') {
          shouldSend = !isToday && currentTime >= schedule.schedule_time;
        } else if (schedule.frequency === 'weekly') {
          shouldSend = schedule.days_of_week.includes(dayOfWeek) && !isToday && currentTime >= schedule.schedule_time;
        } else if (schedule.frequency === 'biweekly') {
          const scheduleDate = new Date(schedule.start_date || schedule.created_date);
          const weeksDiff = Math.floor((now - scheduleDate) / (7 * 24 * 60 * 60 * 1000));
          shouldSend = weeksDiff % 2 === 0 && schedule.days_of_week.includes(dayOfWeek) && !isToday && currentTime >= schedule.schedule_time;
        } else if (schedule.frequency === 'monthly') {
          shouldSend = dateOfMonth === schedule.day_of_month && !isToday && currentTime >= schedule.schedule_time;
        }

        if (!shouldSend) continue;

        // Construct message
        const messages = {
          meal_logging: `Hi! 🍽️ Have you logged your meals for today? Your coach wants to make sure you're tracking your nutrition. Please log your meals when you get a chance!`,
          water_intake: `💧 Don't forget to stay hydrated! Have you logged your water intake today? Aim for at least 8 glasses of water.`,
          workout: `💪 Time for your workout! Have you completed today's physical activity? Log it in the app to keep your coach updated.`,
          wellbeing: `🧘 Quick wellness check-in! How are you feeling today? Take a moment to log your mood, energy level, and any observations.`,
          custom: schedule.custom_message
        };

        const messageText = messages[schedule.message_type];

        // Create message in app
        await base44.asServiceRole.entities.Message.create({
          client_id: schedule.client_id,
          sender_type: 'dietitian',
          sender_id: schedule.coach_email,
          sender_name: 'Coach',
          message: messageText,
          content_type: 'text',
          read: false,
          is_important: false
        });

        // Create notification
        await base44.asServiceRole.entities.Notification.create({
          user_email: schedule.client_email,
          type: 'check_in_reminder',
          title: 'Coach Check-In Reminder',
          message: messageText,
          priority: 'normal',
          link: '/ClientCommunication',
          read: false
        }).catch(() => {});

        // Send push notification if enabled
        if (schedule.send_push_notification) {
          try {
            await base44.asServiceRole.functions.invoke('sendPushNotification', {
              user_email: schedule.client_email,
              title: 'Coach Check-In Reminder',
              body: messageText,
              action_url: '/ClientCommunication'
            });
          } catch (err) {
            console.error('Push notification failed:', err.message);
            // Continue even if push fails
          }
        }

        // Update schedule
        await base44.asServiceRole.entities.ClientCheckInSchedule.update(schedule.id, {
          last_sent_date: now.toISOString(),
          times_sent: (schedule.times_sent || 0) + 1
        });

        sentCount++;
      } catch (scheduleError) {
        console.error(`Failed to send check-in for schedule ${schedule.id}:`, scheduleError.message);
        // Continue with next schedule
      }
    }

    return Response.json({
      success: true,
      message: `Sent ${sentCount} check-in reminders`,
      sentCount
    });

  } catch (error) {
    console.error('Error in sendScheduledCheckIns:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});