import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId, clientEmail, senderName, messagePreview } = await req.json();

    if (!clientId || !clientEmail) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create notification
    await base44.entities.Notification.create({
      recipient_email: clientEmail,
      type: 'new_message',
      title: `New message from ${senderName}`,
      message: messagePreview,
      icon: '💬',
      action_url: '/messages',
      is_read: false,
      priority: 'high'
    });

    // Send email notification (optional)
    try {
      await base44.integrations.Core.SendEmail({
        to: clientEmail,
        subject: `New message from ${senderName}`,
        body: `
          <h2>You have a new message!</h2>
          <p><strong>${senderName}:</strong> ${messagePreview}</p>
          <p><a href="https://app.mealie.com/messages">View full conversation</a></p>
        `
      });
    } catch (emailError) {
      console.log('Email notification skipped:', emailError.message);
    }

    return Response.json({
      success: true,
      message: 'Notification sent successfully'
    });
  } catch (error) {
    console.error('Notification error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});