import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event_id, fields_to_update, timezone = 'Asia/Kolkata' } = await req.json();

    if (!event_id) {
      return Response.json({ error: 'event_id is required' }, { status: 400 });
    }

    // Get Google Calendar access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // First, fetch the existing event
    const calendarId = user.gcal_calendar_id || 'primary';
    const getUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${event_id}`;
    
    const getResponse = await fetch(getUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!getResponse.ok) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    const existingEvent = await getResponse.json();

    // Update fields
    const updatedEvent = { ...existingEvent };
    
    if (fields_to_update.title) {
      updatedEvent.summary = fields_to_update.title;
    }
    
    if (fields_to_update.description) {
      updatedEvent.description = fields_to_update.description;
    }
    
    if (fields_to_update.start_datetime) {
      updatedEvent.start = {
        dateTime: fields_to_update.start_datetime,
        timeZone: timezone
      };
    }
    
    if (fields_to_update.end_datetime) {
      updatedEvent.end = {
        dateTime: fields_to_update.end_datetime,
        timeZone: timezone
      };
    }

    // Update event in Google Calendar
    const updateUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${event_id}`;
    
    const response = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedEvent)
    });

    if (!response.ok) {
      const error = await response.text();
      return Response.json({ error: 'Failed to update calendar event', details: error }, { status: response.status });
    }

    const result = await response.json();
    
    return Response.json({
      success: true,
      event: result
    });

  } catch (error) {
    console.error('Error updating calendar event:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});