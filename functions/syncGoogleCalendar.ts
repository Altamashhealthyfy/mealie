import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, appointment_id, appointment_data } = await req.json();

    // Get access token for Google Calendar
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    if (action === 'create') {
      try {
        // Try to create event in Google Calendar
        const eventData = {
          summary: appointment_data.title,
          description: appointment_data.description || '',
          start: {
            dateTime: new Date(appointment_data.appointment_date).toISOString(),
            timeZone: 'UTC'
          },
          end: {
            dateTime: new Date(appointment_data.end_time).toISOString(),
            timeZone: 'UTC'
          },
          location: appointment_data.location || 'Virtual',
          attendees: [
            { email: user.email, responseStatus: 'accepted' },
            { email: appointment_data.client_email }
          ]
        };

        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(eventData)
        });

        let googleEventId = null;
        if (response.ok) {
          const event = await response.json();
          googleEventId = event.id;
        }

        // Save appointment with or without Google event ID
        const appointment = await base44.entities.Appointment.create({
          ...appointment_data,
          coach_email: user.email,
          google_event_id: googleEventId
        });

        return Response.json({
          success: true,
          appointment_id: appointment.id,
          google_event_id: googleEventId,
          message: googleEventId ? 'Appointment created and synced to Google Calendar' : 'Appointment created (Google Calendar sync pending)'
        });
      } catch (error) {
        console.log('Google Calendar sync skipped:', error.message);
        // Create appointment without Google Calendar sync
        const appointment = await base44.entities.Appointment.create({
          ...appointment_data,
          coach_email: user.email
        });

        return Response.json({
          success: true,
          appointment_id: appointment.id,
          message: 'Appointment created'
        });
      }
    }

    if (action === 'update') {
      // Get existing appointment
      const appointments = await base44.entities.Appointment.filter({ id: appointment_id });
      const appointment = appointments[0];

      if (!appointment) {
        return Response.json({ error: 'Appointment not found' }, { status: 404 });
      }

      // Update Google Calendar event
      const eventData = {
        summary: appointment_data.title || appointment.title,
        description: appointment_data.description || appointment.description || '',
        start: {
          dateTime: new Date(appointment_data.appointment_date || appointment.appointment_date).toISOString(),
          timeZone: 'UTC'
        },
        end: {
          dateTime: new Date(appointment_data.end_time || appointment.end_time).toISOString(),
          timeZone: 'UTC'
        },
        location: appointment_data.location || appointment.location || 'Virtual',
        attendees: [
          { email: user.email, responseStatus: 'accepted' },
          { email: appointment_data.client_email || appointment.client_email }
        ]
      };

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${appointment.google_event_id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(eventData)
        }
      );

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.statusText}`);
      }

      // Update appointment
      await base44.entities.Appointment.update(appointment_id, appointment_data);

      return Response.json({
        success: true,
        message: 'Appointment updated successfully'
      });
    }

    if (action === 'delete') {
      // Get appointment
      const appointments = await base44.entities.Appointment.filter({ id: appointment_id });
      const appointment = appointments[0];

      if (!appointment || !appointment.google_event_id) {
        return Response.json({ error: 'Appointment not found' }, { status: 404 });
      }

      // Delete from Google Calendar
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${appointment.google_event_id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      // Mark as cancelled instead of deleting
      await base44.entities.Appointment.update(appointment_id, {
        status: 'cancelled'
      });

      return Response.json({
        success: true,
        message: 'Appointment cancelled'
      });
    }

    return Response.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Google Calendar sync error:', error);
    return Response.json(
      { error: error.message || 'Failed to sync with Google Calendar' },
      { status: 500 }
    );
  }
});