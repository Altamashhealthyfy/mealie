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
  let backoffDelay = 3000;
  const BASE_INTERVAL = 3000;
  const MAX_BACKOFF = 30000;
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
        attachment_name: roomId,
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
      // Get all video_signal messages for this client, then filter client-side
      const msgs = await base44.entities.Message.filter({
        client_id: clientId,
        content_type: 'video_signal',
      });

      const incoming = msgs
        .filter(m => 
          m.sender_type !== senderType && 
          m.read === false && 
          m.attachment_name === roomId
        )
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

      for (const msg of incoming) {
        if (processedIds.has(msg.id)) continue;
        processedIds.add(msg.id);

        try {
          const data = JSON.parse(msg.message);
          console.log('Signaling message received:', data);
          
          // Mark as read BEFORE processing to ensure it's not reprocessed
          await base44.entities.Message.update(msg.id, { read: true }).catch(() => {});
          
          // Process message after marking read
          handlers.forEach(h => h(data));
        } catch (e) {
          console.error('Failed to parse signaling message:', e);
        }
      }
    } catch (e) {
      if (e?.status === 429 || e?.message?.includes('Rate limit')) {
        backoffDelay = Math.min(backoffDelay * 2, MAX_BACKOFF);
      }
      // Silently swallow all signaling errors to avoid console flood
    }
  };

  const start = () => {
    if (intervalId) return;
    backoffDelay = BASE_INTERVAL;
    const schedulePoll = () => {
      if (stopped) return;
      poll().finally(() => {
        if (!stopped) intervalId = setTimeout(schedulePoll, backoffDelay);
      });
    };
    schedulePoll();
  };

  const stop = () => {
    stopped = true;
    clearTimeout(intervalId);
  };

  return { send, onMessage, start, stop };
}