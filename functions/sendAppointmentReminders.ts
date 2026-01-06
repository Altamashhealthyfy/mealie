import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This should be called by a scheduled task
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get appointments for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];

    const appointments = await base44.asServiceRole.entities.Appointment.filter({
      date: tomorrowDate,
      status: 'scheduled'
    });

    const reminders = [];

    for (const appointment of appointments) {
      // Get client details
      const clients = await base44.asServiceRole.entities.Client.filter({ id: appointment.client_id });
      const client = clients[0];

      if (client?.email) {
        // Create notification
        await base44.asServiceRole.functions.invoke('createNotification', {
          user_email: client.email,
          type: 'appointment_reminder',
          title: 'Appointment Tomorrow',
          message: `You have an appointment scheduled for tomorrow at ${appointment.time}. ${appointment.title || ''}`,
          link: `/client-appointments`,
          priority: 'high',
          send_email: true,
          metadata: {
            appointment_id: appointment.id,
            appointment_date: appointment.date,
            appointment_time: appointment.time
          }
        });

        reminders.push({
          client: client.full_name,
          appointment: appointment.title,
          time: appointment.time
        });
      }
    }

    return Response.json({
      success: true,
      reminders_sent: reminders.length,
      reminders
    });

  } catch (error) {
    console.error('Error sending appointment reminders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});