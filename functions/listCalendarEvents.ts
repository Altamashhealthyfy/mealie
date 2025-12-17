import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date, date_range, timezone = 'Asia/Kolkata' } = await req.json();

    // Get Google Calendar access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Determine time range
    let timeMin, timeMax;
    
    if (date_range === 'today') {
      const today = new Date();
      timeMin = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      timeMax = new Date(today.setHours(23, 59, 59, 999)).toISOString();
    } else if (date_range === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      timeMin = new Date(tomorrow.setHours(0, 0, 0, 0)).toISOString();
      timeMax = new Date(tomorrow.setHours(23, 59, 59, 999)).toISOString();
    } else if (date_range === 'this_week') {
      const today = new Date();
      const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
      const lastDay = new Date(today.setDate(today.getDate() - today.getDay() + 6));
      timeMin = new Date(firstDay.setHours(0, 0, 0, 0)).toISOString();
      timeMax = new Date(lastDay.setHours(23, 59, 59, 999)).toISOString();
    } else if (date) {
      const targetDate = new Date(date);
      timeMin = new Date(targetDate.setHours(0, 0, 0, 0)).toISOString();
      timeMax = new Date(targetDate.setHours(23, 59, 59, 999)).toISOString();
    } else {
      // Default to next 7 days
      const today = new Date();
      timeMin = today.toISOString();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      timeMax = nextWeek.toISOString();
    }

    // Fetch events from Google Calendar
    const calendarId = user.gcal_calendar_id || 'primary';
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&timeZone=${timezone}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      return Response.json({ error: 'Failed to fetch calendar events', details: error }, { status: response.status });
    }

    const data = await response.json();
    
    return Response.json({
      success: true,
      events: data.items || [],
      timeMin,
      timeMax
    });

  } catch (error) {
    console.error('Error listing calendar events:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});