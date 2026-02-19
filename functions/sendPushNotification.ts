import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import webpush from 'npm:web-push@3.6.7';

const vapidPublicKey = 'BIz-4rUu5YTKZ4fB7k_2yW5z5J9yZ5J9yZ5J9yZ5J9yZ5J9yZ5J9yZ5J9yZ5J9yZ5J9yZ5J9yZ5J9yZ5J9yZ5J8';
const vapidPrivateKey = 'aJ9yZ5J9yZ5J9yZ5J9yZ5J9yZ5J9yZ5J9yZ5J9yZ5J9yZ5J9yZ5J9yZ5J9yZ5J9yZ5J9yZ5';

webpush.setVapidDetails(
  'mailto:notifications@mealie.app',
  vapidPublicKey,
  vapidPrivateKey
);

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { userId, title, body: notificationBody, data, actions, tag } = body;

    if (!userId || !title || !notificationBody) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch user's push subscriptions from database
    const subscriptions = await base44.entities.PushSubscription.filter({
      user_id: userId
    });

    if (!subscriptions || subscriptions.length === 0) {
      return Response.json({ message: 'No push subscriptions found' }, { status: 200 });
    }

    const payload = JSON.stringify({
      title,
      body: notificationBody,
      data: data || {},
      actions: actions || [],
      tag: tag || 'notification',
      requireInteraction: false,
    });

    const results = [];
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload
        );
        results.push({ success: true, userId });
      } catch (error) {
        console.error('Push notification failed:', error);
        // Remove invalid subscription
        if (error.statusCode === 410 || error.statusCode === 404) {
          await base44.entities.PushSubscription.delete(subscription.id);
        }
        results.push({ success: false, userId, error: error.message });
      }
    }

    return Response.json({ message: 'Notifications sent', results });
  } catch (error) {
    console.error('Error sending push notification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});