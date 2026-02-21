import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_id, title, body, data } = await req.json();

    // Create notification record
    const notification = await base44.entities.Notification.create({
      user_email: user_id,
      title,
      message: body,
      type: 'new_message',
      priority: 'high',
      read: false,
      link: data?.link || '/messages',
    });

    // Get user's push subscriptions
    const subscriptions = await base44.entities.PushSubscription.filter({
      user_email: user_id,
    });

    // Send web push notifications if available
    for (const sub of subscriptions) {
      try {
        const pushPayload = JSON.stringify({
          title,
          body,
          icon: '/favicon.ico',
          tag: 'message-notification',
          data: {
            link: data?.link || '/messages',
            notification_id: notification.id,
          },
        });

        const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
        const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

        if (vapidPrivateKey && vapidPublicKey && sub.subscription_endpoint) {
          // Send push via Web Push API
          // This would require a web-push library or manual implementation
          // For now, we rely on the database notification
          console.log('Push notification queued for:', user_id);
        }
      } catch (error) {
        console.error('Error sending push:', error);
      }
    }

    return Response.json({ 
      success: true, 
      notification_id: notification.id 
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});