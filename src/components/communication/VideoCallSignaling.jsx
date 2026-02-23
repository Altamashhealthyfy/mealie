/**
 * VideoCallSignaling
 * Implements a signaling channel using base44 Message entity
 * with content_type='video_signal' to relay WebRTC SDP/ICE messages.
 */
import { base44 } from "@/api/base44Client";

export function createSignalingChannel({ clientId, senderType, senderEmail, roomId }) {
  let stopped = false;
  let processedIds = new Set();
  let intervalId = null;
  const handlers = [];

  const send = async (data) => {
    try {
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
        attachment_name: roomId,
      });

      const incoming = msgs
        .filter(m => m.sender_type !== senderType)
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

      for (const msg of incoming) {
        if (processedIds.has(msg.id)) continue;
        processedIds.add(msg.id);

        try {
          const data = JSON.parse(msg.message);
          handlers.forEach(h => h(data));
        } catch (e) {
          console.error('Failed to parse signaling message:', e);
        }

        // Mark as read immediately
        await base44.entities.Message.update(msg.id, { read: true }).catch(() => {});
      }
    } catch (e) {
      console.error('Signaling poll error:', e);
    }
  };

  const start = () => {
    if (intervalId) return; // prevent double-start
    // Poll immediately then every 300ms for WebRTC signaling
    poll();
    intervalId = setInterval(poll, 300);
  };

  const stop = () => {
    stopped = true;
    clearInterval(intervalId);
  };

  return { send, onMessage, start, stop };
}