/**
 * VideoCallSignaling
 * Implements a simple signaling channel using base44 Message entity
 * with content_type='video_signal' to relay WebRTC SDP/ICE messages.
 */
import { base44 } from "@/api/base44Client";

export function createSignalingChannel({ clientId, senderType, senderEmail, onMessage }) {
  let stopped = false;
  let lastSeenId = null;
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
      });
    } catch (e) {
      console.error('Signaling send error:', e);
    }
  };

  const registerHandler = (cb) => {
    handlers.push(cb);
  };

  const poll = async () => {
    if (stopped) return;
    try {
      const msgs = await base44.entities.Message.filter({
        client_id: clientId,
        content_type: 'video_signal',
      });
      const newMsgs = msgs
        .filter(m => m.sender_type !== senderType)
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

      for (const msg of newMsgs) {
        if (lastSeenId && msg.id <= lastSeenId) continue;
        lastSeenId = msg.id;
        try {
          const data = JSON.parse(msg.message);
          handlers.forEach(h => h(data));
          if (onMessage) onMessage(data);
        } catch {}
        // Mark as read so we don't re-process
        base44.entities.Message.update(msg.id, { read: true }).catch(() => {});
      }
    } catch (e) {
      console.error('Signaling poll error:', e);
    }
  };

  const start = () => {
    intervalId = setInterval(poll, 1500);
  };

  const stop = () => {
    stopped = true;
    clearInterval(intervalId);
  };

  return { send, onMessage: registerHandler, start, stop };
}