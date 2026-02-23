import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      title,
      start_datetime,
      duration_minutes = 30,
      client_name,
      client_email,
      note,
      is_recurring,
      recurrence_rule, // e.g. "RRULE:FREQ=WEEKLY;COUNT=4"
    } = await req.json();

    if (!start_datetime || !client_email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    const startDate = new Date(start_datetime);
    const endDate = new Date(startDate.getTime() + duration_minutes * 60 * 1000);

    const eventData = {
      summary: title || `Video Call with ${client_name}`,
      description: note || `Scheduled video call with ${client_name}. Join via Google Meet link in this event.`,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      attendees: [
        { email: client_email, displayName: client_name },
        { email: user.email, displayName: user.full_name, organizer: true },
      ],
      conferenceData: {
        createRequest: {
          requestId: `mealie-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 15 },
        ],
      },
      sendUpdates: 'all', // automatically emails all attendees
    };

    if (is_recurring && recurrence_rule) {
      eventData.recurrence = [recurrence_rule];
    }

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      const err = await response.text();
      return Response.json({ error: 'Failed to create calendar event', details: err }, { status: response.status });
    }

    const createdEvent = await response.json();
    const meetLink = createdEvent.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri || createdEvent.hangoutLink || null;

    return Response.json({
      success: true,
      event_id: createdEvent.id,
      meet_link: meetLink,
      html_link: createdEvent.htmlLink,
    });
  } catch (error) {
    console.error('scheduleVideoCall error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});