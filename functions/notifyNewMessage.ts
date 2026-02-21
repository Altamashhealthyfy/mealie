import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { message_id, client_id, group_id, sender_type, sender_name, message_preview } = await req.json();

    if (!client_id && !group_id) {
      return Response.json({ error: 'Missing client_id or group_id' }, { status: 400 });
    }

    // Get client info if this is a client message
    let recipientEmail = null;
    if (client_id && sender_type === 'client') {
      const clients = await base44.entities.Client.filter({ id: client_id });
      if (clients.length > 0) {
        const coachEmails = clients[0].assigned_coach;
        recipientEmail = Array.isArray(coachEmails) ? coachEmails[0] : coachEmails;
      }
    }

    if (recipientEmail) {
      // Create notification for coach
      const notification = await base44.entities.Notification.create({
        user_email: recipientEmail,
        title: `New message from ${sender_name}`,
        message: message_preview || 'You have a new message',
        type: 'new_message',
        priority: 'high',
        read: false,
        link: '/messages',
      });

      // Send push notification
      try {
        await base44.functions.invoke('sendPushNotification', {
          user_id: recipientEmail,
          title: `New message from ${sender_name}`,
          body: message_preview || 'Click to read message',
          data: { link: '/messages' },
        });
      } catch (error) {
        console.error('Error sending push notification:', error);
      }
    }

    // Notify group members if group message
    if (group_id) {
      const groups = await base44.entities.ClientGroup.filter({ id: group_id });
      if (groups.length > 0) {
        const group = groups[0];
        for (const memberId of (group.client_ids || [])) {
          if (memberId !== client_id) {
            const notification = await base44.entities.Notification.create({
              user_email: memberId,
              title: `New group message in ${group.name}`,
              message: message_preview || 'You have a new group message',
              type: 'new_message',
              priority: 'normal',
              read: false,
              link: '/messages',
            });
          }
        }
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});