import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event } = body;

    if (event.type !== 'create' || event.entity_name !== 'Message') {
      return Response.json({ message: 'Not a message creation event' }, { status: 200 });
    }

    // Fetch the created message
    const messages = await base44.asServiceRole.entities.Message.filter({ id: event.entity_id });
    const message = messages[0];

    if (!message || message.sender_type !== 'dietitian') {
      return Response.json({ message: 'Not a coach message' }, { status: 200 });
    }

    // Fetch client details
    const clients = await base44.asServiceRole.entities.Client.filter({ id: message.client_id });
    const client = clients[0];

    if (!client || !client.email) {
      return Response.json({ message: 'Client not found' }, { status: 200 });
    }

    // Send push notification
    await base44.asServiceRole.functions.invoke('sendPushNotification', {
      userId: client.email,
      title: `Message from ${message.sender_name || 'Your Coach'}`,
      body: message.message.substring(0, 100) || 'You have a new message',
      data: {
        url: '/clientcommunication',
        type: 'message',
        clientId: message.client_id,
      },
      tag: 'coach-message',
      actions: [
        { action: 'open_messages', title: 'Open Messages' },
      ],
    });

    return Response.json({ message: 'Notification sent' });
  } catch (error) {
    console.error('Error notifying on new message:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});