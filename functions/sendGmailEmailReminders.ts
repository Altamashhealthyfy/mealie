import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const results = { appointments: 0, missed_progress: 0, checkins: 0, errors: [] };

    // ── 1. APPOINTMENT REMINDERS ──────────────────────────────────────────────
    const appointments = await base44.asServiceRole.entities.Appointment.filter({ status: ['scheduled', 'confirmed'] });
    const reminderSettings = await base44.asServiceRole.entities.ReminderSettings.filter({ is_active: true });
    const settingsMap = {};
    reminderSettings.forEach(s => { settingsMap[s.client_id] = s; });

    for (const appt of appointments) {
      if (appt.reminder_sent) continue;
      const apptDate = new Date(appt.appointment_date);
      const hoursUntil = (apptDate - now) / (1000 * 60 * 60);
      const settings = settingsMap[appt.client_id];
      const reminderHours = settings?.appointment_reminder_hours_before || 24;

      if (hoursUntil <= reminderHours && hoursUntil > (reminderHours - 1)) {
        const method = settings?.notification_method || 'both';
        if (method === 'email' || method === 'both') {
          const customMsg = settings?.appointment_email_template || '';
          const subject = `📅 Reminder: ${appt.title}`;
          const body = buildEmailHtml({
            clientName: appt.client_name,
            heading: 'Upcoming Appointment Reminder',
            emoji: '📅',
            body: customMsg || `You have an upcoming appointment <strong>${appt.title}</strong> scheduled for <strong>${apptDate.toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}</strong>.${appt.is_virtual ? '<br>📹 This is a virtual session.' : (appt.location ? `<br>📍 Location: ${appt.location}` : '')}`,
            cta: 'View Appointment',
            ctaUrl: 'https://app.mealiepro.com/ClientAppointments'
          });
          await sendGmail(accessToken, appt.client_email, subject, body);
          results.appointments++;
        }

        if (method === 'in_app' || method === 'both') {
          await base44.asServiceRole.entities.Notification.create({
            user_email: appt.client_email,
            title: `📅 Upcoming Appointment: ${appt.title}`,
            message: `Your appointment is on ${apptDate.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`,
            type: 'reminder',
            priority: 'high',
            is_read: false
          });
        }

        await base44.asServiceRole.entities.Appointment.update(appt.id, { reminder_sent: true });
      }
    }

    // ── 2. MISSED PROGRESS LOG REMINDERS ─────────────────────────────────────
    const progressReminders = reminderSettings.filter(s =>
      s.is_active && (s.reminder_type === 'daily_progress' || s.reminder_type === 'food_log')
    );

    for (const reminder of progressReminders) {
      try {
        const clients = await base44.asServiceRole.entities.Client.filter({ id: reminder.client_id });
        const client = clients[0];
        if (!client) continue;

        // Check if already sent today
        if (reminder.last_sent) {
          const lastSentDay = new Date(reminder.last_sent).toISOString().split('T')[0];
          if (lastSentDay === today) continue;
        }

        // Check if log already submitted
        if (reminder.conditions?.only_if_not_completed) {
          const entity = reminder.reminder_type === 'food_log' ? base44.asServiceRole.entities.FoodLog : base44.asServiceRole.entities.ProgressLog;
          const logs = await entity.filter({ client_id: client.id, date: today });
          if (logs.length > 0) continue;
        }

        // Check time window
        if (!isInTimeWindow(now, reminder.time_of_day, reminder.days_of_week)) continue;

        const method = reminder.notification_method || 'both';
        if (method === 'email' || method === 'both') {
          const isFood = reminder.reminder_type === 'food_log';
          const customMsg = reminder.message || '';
          const subject = reminder.title || (isFood ? '🍽️ Time to log your meals!' : '📊 Daily progress log reminder');
          const body = buildEmailHtml({
            clientName: client.full_name,
            heading: isFood ? 'Food Log Reminder' : 'Progress Log Reminder',
            emoji: isFood ? '🍽️' : '📊',
            body: customMsg || (isFood
              ? `Don't forget to log your meals for today! Tracking your food intake helps your coach create the best plan for you.`
              : `Time to log your daily progress! Recording your weight, measurements, and wellness metrics helps track your journey.`),
            cta: isFood ? 'Log Food Now' : 'Log Progress Now',
            ctaUrl: isFood ? 'https://app.mealiepro.com/FoodLog' : 'https://app.mealiepro.com/ProgressTracking'
          });
          await sendGmail(accessToken, client.email, subject, body);
          results.missed_progress++;
        }

        if (method === 'in_app' || method === 'both') {
          await base44.asServiceRole.entities.Notification.create({
            user_email: client.email,
            title: reminder.title,
            message: reminder.message || `Please complete your ${reminder.reminder_type.replace('_', ' ')} for today.`,
            type: 'reminder',
            is_read: false
          });
        }

        await base44.asServiceRole.entities.ReminderSettings.update(reminder.id, { last_sent: now.toISOString() });
      } catch (err) {
        results.errors.push({ reminder: reminder.id, error: err.message });
      }
    }

    // ── 3. CHECK-IN REMINDERS ─────────────────────────────────────────────────
    const checkInSchedules = await base44.asServiceRole.entities.ClientCheckInSchedule.filter({ is_active: true });

    for (const schedule of checkInSchedules) {
      try {
        // Check if it's time to send
        if (schedule.next_send_date && new Date(schedule.next_send_date) > now) continue;
        if (schedule.max_sends && schedule.times_sent >= schedule.max_sends) continue;
        if (schedule.end_date && today > schedule.end_date) continue;
        if (schedule.start_date && today < schedule.start_date) continue;

        if (!isInTimeWindow(now, schedule.schedule_time, null)) continue;

        // Check last sent to avoid duplicates
        if (schedule.last_sent_date) {
          const lastSentDay = new Date(schedule.last_sent_date).toISOString().split('T')[0];
          if (lastSentDay === today) continue;
        }

        const clients = await base44.asServiceRole.entities.Client.filter({ id: schedule.client_id });
        const client = clients[0];
        if (!client) continue;

        const msgContent = getCheckInMessage(schedule);
        const subject = `💬 ${msgContent.subject}`;
        const body = buildEmailHtml({
          clientName: client.full_name,
          heading: msgContent.heading,
          emoji: msgContent.emoji,
          body: schedule.custom_message || msgContent.body,
          cta: 'Open App',
          ctaUrl: 'https://app.mealiepro.com/ClientDashboard'
        });

        await sendGmail(accessToken, client.email, subject, body);
        results.checkins++;

        await base44.asServiceRole.entities.ClientCheckInSchedule.update(schedule.id, {
          last_sent_date: now.toISOString(),
          times_sent: (schedule.times_sent || 0) + 1,
          next_send_date: calcNextSendDate(now, schedule.frequency).toISOString()
        });
      } catch (err) {
        results.errors.push({ schedule: schedule.id, error: err.message });
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    console.error('Gmail reminders error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function sendGmail(accessToken, to, subject, htmlBody) {
  const email = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    htmlBody
  ].join('\n');

  const encoded = btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: encoded })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail send failed: ${err}`);
  }
  return res.json();
}

function buildEmailHtml({ clientName, heading, emoji, body, cta, ctaUrl }) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#f97316,#dc2626);padding:32px 24px;text-align:center;">
      <div style="font-size:48px;">${emoji}</div>
      <h1 style="color:white;margin:8px 0 0;font-size:22px;">${heading}</h1>
    </div>
    <div style="padding:32px 24px;">
      <p style="color:#374151;font-size:16px;margin-top:0;">Hi <strong>${clientName}</strong>,</p>
      <p style="color:#4b5563;font-size:15px;line-height:1.7;">${body}</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#f97316,#dc2626);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">${cta}</a>
      </div>
    </div>
    <div style="background:#f9fafb;padding:20px 24px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af;font-size:13px;margin:0;">Sent by your Health Coach via Mealie Pro</p>
    </div>
  </div>
</body>
</html>`;
}

function isInTimeWindow(now, timeOfDay, daysOfWeek) {
  if (!timeOfDay) return true;
  const [h, m] = timeOfDay.split(':').map(Number);
  const diffMin = Math.abs((now.getHours() * 60 + now.getMinutes()) - (h * 60 + m));
  if (diffMin > 30) return false;
  if (daysOfWeek && daysOfWeek.length > 0 && !daysOfWeek.includes(now.getDay())) return false;
  return true;
}

function getCheckInMessage(schedule) {
  const types = {
    meal_logging: { subject: 'Meal Logging Reminder', heading: 'Log Your Meals', emoji: '🍽️', body: 'Your coach wants to stay updated on your nutrition. Please log your meals for today to keep your plan on track.' },
    water_intake: { subject: 'Water Intake Check-in', heading: 'Stay Hydrated!', emoji: '💧', body: 'Remember to drink enough water today! Staying hydrated is key to your health goals.' },
    workout: { subject: 'Workout Check-in', heading: 'Time to Move!', emoji: '💪', body: 'Your coach is checking in on your workout routine. Have you completed your exercise for today?' },
    wellbeing: { subject: 'Wellbeing Check-in', heading: 'How Are You Feeling?', emoji: '❤️', body: 'Your coach cares about your overall wellbeing. Log your mood, energy, and sleep to help us support you better.' },
    custom: { subject: 'Message from Your Coach', heading: 'Coach Check-in', emoji: '👋', body: 'Your health coach has sent you a message.' }
  };
  return types[schedule.message_type] || types.custom;
}

function calcNextSendDate(now, frequency) {
  const next = new Date(now);
  if (frequency === 'daily') next.setDate(next.getDate() + 1);
  else if (frequency === 'weekly') next.setDate(next.getDate() + 7);
  else if (frequency === 'biweekly') next.setDate(next.getDate() + 14);
  else if (frequency === 'monthly') next.setMonth(next.getMonth() + 1);
  return next;
}