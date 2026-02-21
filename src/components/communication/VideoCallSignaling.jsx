/**
 * VideoCallSignaling
 * Implements a signaling channel using base44 Message entity
 * with content_type='video_signal' to relay WebRTC SDP/ICE messages.
 */
import { base44 } from "@/api/base44Client";

export function createSignalingChannel({ clientId, senderType, senderEmail }) {
  let stopped = false;
  let processedIds = new Set();
  let intervalId = null;
  const handlers = [];

  const send = async (data) => {
    try {
      // Use roomId from data to avoid cross-call interference
      const roomId = data.roomId || clientId;
      await base44.entities.Message.create({
        client_id: clientId,
        sender_type: senderType,
        sender_id: senderEmail,
        message: JSON.stringify(data),
        content_type: 'video_signal',
        read: false,
        attachment_name: roomId, // Store roomId to filter by call
      });
    } catch (e) {
      console.error('Signaling send error:', e);
    }
  };

  const onMessage = (cb) => {
    handlers.push(cb);
  };

  const poll = async () => {
    if (stopped) return;
    try {
      const msgs = await base44.entities.Message.filter({
        client_id: clientId,
        content_type: 'video_signal',
        read: false,
      });

      const incoming = msgs
        .filter(m => m.sender_type !== senderType)
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

      for (const msg of incoming) {
        if (processedIds.has(msg.id)) continue;
        processedIds.add(msg.id);

        try {
          const data = JSON.parse(msg.message);
          // Only process if it's for this call (roomId match)
          handlers.forEach(h => h(data));
        } catch (e) {
          console.error('Failed to parse signaling message:', e);
        }

        // Mark as read immediately to reduce database load
        await base44.entities.Message.update(msg.id, { read: true }).catch(() => {});
      }
    } catch (e) {
      console.error('Signaling poll error:', e);
    }
  };

  const start = () => {
    // Poll immediately then every 200ms for faster WebRTC connection
    poll();
    intervalId = setInterval(poll, 200);
  };

  const stop = () => {
    stopped = true;
    clearInterval(intervalId);
  };

  return { send, onMessage, start, stop };
}