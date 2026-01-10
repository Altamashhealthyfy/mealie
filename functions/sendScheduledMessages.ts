import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all scheduled messages that are ready to send
    const now = new Date().toISOString();
    const scheduledMessages = await base44.entities.Message.filter({
      is_scheduled: true,
      scheduled_time: { $lte: now }
    });

    console.log(`[sendScheduledMessages] Found ${scheduledMessages.length} messages to send`);

    let sent = 0;

    for (const msg of scheduledMessages) {
      try {
        // Mark as sent by removing scheduled flags
        await base44.asServiceRole.entities.Message.update(msg.id, {
          is_scheduled: false,
          scheduled_time: null
        });
        sent++;
        console.log(`[sendScheduledMessages] Sent message ${msg.id}`);
      } catch (error) {
        console.error(`[sendScheduledMessages] Failed to send message ${msg.id}:`, error.message);
      }
    }

    return Response.json({
      success: true,
      total_scheduled: scheduledMessages.length,
      sent: sent,
      message: `Sent ${sent} scheduled messages`
    });
  } catch (error) {
    console.error('[sendScheduledMessages] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});