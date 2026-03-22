import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Called when a client sends a message; checks if it matches any trigger keywords
// and fires automated follow-up messages from the coach.
// Payload: { client_id, message_text, coach_email }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { client_id, message_text, coach_email } = await req.json();

    if (!client_id || !message_text) {
      return Response.json({ success: false, error: 'client_id and message_text are required' }, { status: 400 });
    }

    // Load schedules that belong to this client
    const schedules = await base44.asServiceRole.entities.ClientCheckInSchedule.filter({
      client_id,
      is_active: true,
    });

    const lowerText = message_text.toLowerCase();
    let followUpsSent = 0;

    for (const schedule of schedules) {
      const triggers = schedule.response_triggers || [];
      for (const trigger of triggers) {
        if (!trigger.keyword) continue;
        if (lowerText.includes(trigger.keyword.toLowerCase())) {
          // Send automated follow-up
          await base44.asServiceRole.entities.Message.create({
            client_id,
            sender_type: 'dietitian',
            sender_id: coach_email || schedule.coach_email,
            sender_name: 'Coach',
            message: trigger.followUp || trigger.follow_up,
            content_type: 'text',
            read: false,
          });

          // Notify client
          await base44.asServiceRole.entities.Notification.create({
            user_email: schedule.client_email,
            type: 'coach_message',
            title: 'Message from your Coach',
            message: trigger.followUp || trigger.follow_up,
            priority: 'high',
            link: '/ClientCommunication',
            read: false,
          }).catch(() => {});

          followUpsSent++;
          break; // Only fire one trigger per schedule per message
        }
      }
    }

    return Response.json({ success: true, followUpsSent });
  } catch (error) {
    console.error('processCheckInTriggers error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});