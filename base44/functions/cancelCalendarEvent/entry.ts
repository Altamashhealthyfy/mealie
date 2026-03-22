import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event_id } = await req.json();

    if (!event_id) {
      return Response.json({ error: 'event_id is required' }, { status: 400 });
    }

    // Get Google Calendar access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Delete event from Google Calendar
    const calendarId = user.gcal_calendar_id || 'primary';
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${event_id}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok && response.status !== 410) { // 410 = already deleted
      const error = await response.text();
      return Response.json({ error: 'Failed to cancel calendar event', details: error }, { status: response.status });
    }

    return Response.json({
      success: true,
      message: 'Event cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling calendar event:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});