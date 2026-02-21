import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function VideoCallScheduler({ clientId, clientName, coachEmail, open, onOpenChange }) {
  const [scheduledAt, setScheduledAt] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSchedule = async () => {
    if (!scheduledAt) {
      toast.error("Please select a date and time.");
      return;
    }

    setSaving(true);
    try {
      // Store scheduled call as a special message
      await base44.entities.Message.create({
        client_id: clientId,
        sender_type: 'dietitian',
        message: `📹 Video call scheduled for ${new Date(scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}${note ? ` — ${note}` : ''}`,
        content_type: 'video_scheduled',
        read: false,
        scheduled_time: new Date(scheduledAt).toISOString(),
        is_scheduled: true,
      });

      toast.success(`Video call scheduled with ${clientName}`);
      setScheduledAt("");
      setNote("");
      onOpenChange?.(false);
    } catch (e) {
      toast.error("Failed to schedule call. Please try again.");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-orange-500" />
            Schedule Video Call with {clientName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Date & Time (IST)</Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Textarea
              placeholder="e.g. Monthly progress review call"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange?.(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500"
              onClick={handleSchedule}
              disabled={saving}
            >
              {saving ? "Scheduling…" : "Schedule Call"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}