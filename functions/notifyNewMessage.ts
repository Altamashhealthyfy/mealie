import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { message_id, client_id, group_id, sender_type, sender_name, message_preview } = await req.json();

    if (!client_id && !group_id) {
      return Response.json({ error: 'client_id or group_id required' }, { status: 400 });
    }

    const notifications = [];

    if (client_id) {
      // Get client info
      const clients = await base44.asServiceRole.entities.Client.filter({ id: client_id });
      const client = clients[0];
      if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });

      if (sender_type === 'client') {
        // Notify the coach(es)
        const coachEmails = [];
        if (Array.isArray(client.assigned_coach)) {
          coachEmails.push(...client.assigned_coach);
        } else if (client.assigned_coach) {
          coachEmails.push(client.assigned_coach);
        }
        if (client.created_by && !coachEmails.includes(client.created_by)) {
          coachEmails.push(client.created_by);
        }

        for (const email of coachEmails) {
          const notif = await base44.asServiceRole.entities.Notification.create({
            user_email: email,
            type: 'new_message',
            title: `New message from ${client.full_name}`,
            message: message_preview || '(attachment)',
            priority: 'high',
            link: `/Communication?client=${client_id}`,
            read: false,
            metadata: { client_id, sender_type }
          });
          notifications.push(notif);
        }
      } else {
        // Notify the client
        if (client.email) {
          const notif = await base44.asServiceRole.entities.Notification.create({
            user_email: client.email,
            type: 'new_message',
            title: `New message from ${sender_name || 'your coach'}`,
            message: message_preview || '(attachment)',
            priority: 'high',
            link: `/ClientCommunication`,
            read: false,
            metadata: { client_id, sender_type }
          });
          notifications.push(notif);
        }
      }
    }

    if (group_id) {
      // Get group and notify all members
      const groups = await base44.asServiceRole.entities.ClientGroup.filter({ id: group_id });
      const group = groups[0];
      if (group && group.client_ids?.length > 0) {
        const groupClients = await Promise.all(
          group.client_ids.map(cid => base44.asServiceRole.entities.Client.filter({ id: cid }))
        );
        for (const clientArr of groupClients) {
          const c = clientArr[0];
          if (c?.email && sender_type !== 'client') {
            await base44.asServiceRole.entities.Notification.create({
              user_email: c.email,
              type: 'new_message',
              title: `New group message in ${group.name}`,
              message: message_preview || '(attachment)',
              priority: 'normal',
              link: `/ClientCommunication`,
              read: false,
              metadata: { group_id, sender_type }
            });
          }
        }
      }
    }

    return Response.json({ success: true, notifications_created: notifications.length });
  } catch (error) {
    console.error('Error sending message notification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});