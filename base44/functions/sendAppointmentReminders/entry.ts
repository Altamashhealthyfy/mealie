import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const now = new Date();
    
    // Get all scheduled and confirmed appointments
    const appointments = await base44.asServiceRole.entities.Appointment.filter({
      status: ['scheduled', 'confirmed']
    });

    // Get all active reminder settings
    const reminderSettings = await base44.asServiceRole.entities.ReminderSettings.filter({
      is_active: true,
      appointment_reminders_enabled: true
    });

    const settingsMap = {};
    reminderSettings.forEach(s => {
      settingsMap[s.client_id] = s;
    });

    const results = {
      checked: appointments.length,
      sent: 0,
      skipped: 0,
      errors: []
    };

    for (const appointment of appointments) {
      try {
        // Skip if reminder already sent
        if (appointment.reminder_sent) {
          results.skipped++;
          continue;
        }

        const appointmentDate = new Date(appointment.appointment_date);
        const hoursUntil = (appointmentDate - now) / (1000 * 60 * 60);

        // Get reminder settings for this client
        const settings = settingsMap[appointment.client_id];
        const reminderHours = settings?.appointment_reminder_hours_before || 24;

        // Check if it's time to send reminder (within 1 hour window)
        if (hoursUntil <= reminderHours && hoursUntil > (reminderHours - 1)) {
          const message = `Hi ${appointment.client_name}! This is a reminder that you have an appointment "${appointment.title}" scheduled for ${appointmentDate.toLocaleString('en-US', { 
            dateStyle: 'full', 
            timeStyle: 'short' 
          })}. ${appointment.location || 'Details will be shared soon.'}`;

          const reminderMethod = settings?.reminder_method || 'both';

          // Send notification
          if (reminderMethod === 'notification' || reminderMethod === 'both') {
            await base44.asServiceRole.entities.Notification.create({
              user_email: appointment.client_email,
              title: '📅 Upcoming Appointment Reminder',
              message: message,
              type: 'reminder',
              priority: 'high',
              action_url: '/client-appointments',
              is_read: false
            });
          }

          // Send email
          if (reminderMethod === 'email' || reminderMethod === 'both') {
            await base44.asServiceRole.functions.invoke('sendEmail', {
              to: appointment.client_email,
              subject: `Reminder: Appointment Tomorrow - ${appointment.title}`,
              body: message
            });
          }

          // Mark reminder as sent
          await base44.asServiceRole.entities.Appointment.update(appointment.id, {
            reminder_sent: true
          });

          results.sent++;
        } else {
          results.skipped++;
        }
      } catch (error) {
        results.errors.push({
          appointment: appointment.id,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Appointment reminder error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});