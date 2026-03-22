import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, start_datetime, end_datetime, description, timezone = 'Asia/Kolkata' } = await req.json();

    if (!title || !start_datetime || !end_datetime) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get Google Calendar access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Create event in Google Calendar
    const calendarId = user.gcal_calendar_id || 'primary';
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
    
    const eventData = {
      summary: title,
      description: description || '',
      start: {
        dateTime: start_datetime,
        timeZone: timezone
      },
      end: {
        dateTime: end_datetime,
        timeZone: timezone
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    });

    if (!response.ok) {
      const error = await response.text();
      return Response.json({ error: 'Failed to create calendar event', details: error }, { status: response.status });
    }

    const createdEvent = await response.json();
    
    return Response.json({
      success: true,
      event_id: createdEvent.id,
      event: createdEvent
    });

  } catch (error) {
    console.error('Error creating calendar event:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});