import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event } = body;

    if (event.type !== 'update' || event.entity_name !== 'ProgressLog') {
      return Response.json({ message: 'Not a progress log update' }, { status: 200 });
    }

    // Fetch the updated progress log
    const logs = await base44.asServiceRole.entities.ProgressLog.filter({ id: event.entity_id });
    const log = logs[0];

    if (!log || !log.coach_feedback || !log.coach_feedback.reviewed_by) {
      return Response.json({ message: 'No coach feedback found' }, { status: 200 });
    }

    // Fetch client
    const clients = await base44.asServiceRole.entities.Client.filter({ id: log.client_id });
    const client = clients[0];

    if (!client || !client.email) {
      return Response.json({ message: 'Client not found' }, { status: 200 });
    }

    const rating = log.coach_feedback.rating || 0;
    const ratingEmoji = rating >= 4 ? '⭐' : rating >= 3 ? '👍' : '📝';

    // Send push notification
    await base44.asServiceRole.functions.invoke('sendPushNotification', {
      userId: client.email,
      title: `Coach Feedback ${ratingEmoji}`,
      body: `Your coach reviewed your progress: ${log.coach_feedback.celebration_notes || 'Check out the detailed feedback'}`,
      data: {
        url: '/progresstracking',
        type: 'feedback',
        logId: log.id,
      },
      tag: 'coach-feedback',
      requireInteraction: true,
    });

    return Response.json({ message: 'Feedback notification sent' });
  } catch (error) {
    console.error('Error notifying on coach feedback:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});