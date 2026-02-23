import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarClock, Repeat } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function VideoCallScheduler({ clientId, clientName, coachEmail, open, onOpenChange }) {
  const [scheduledAt, setScheduledAt] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrence, setRecurrence] = useState("weekly");
  const [endType, setEndType] = useState("occurrences"); // "occurrences" | "date"
  const [occurrences, setOccurrences] = useState(4);
  const [endDate, setEndDate] = useState("");

  const generateRecurringDates = (startDate, pattern, endType, occurrences, endDate) => {
    const dates = [new Date(startDate)];
    const maxOccurrences = endType === "occurrences" ? occurrences : 52; // cap at 52 for safety
    const end = endType === "date" ? new Date(endDate) : null;

    let current = new Date(startDate);

    while (dates.length < maxOccurrences) {
      const next = new Date(current);
      if (pattern === "daily") next.setDate(next.getDate() + 1);
      else if (pattern === "weekly") next.setDate(next.getDate() + 7);
      else if (pattern === "monthly") next.setMonth(next.getMonth() + 1);

      if (end && next > end) break;
      dates.push(next);
      current = next;
    }

    return dates;
  };

  const handleSchedule = async () => {
    if (!scheduledAt) {
      toast.error("Please select a date and time.");
      return;
    }
    if (isRecurring && endType === "date" && !endDate) {
      toast.error("Please select an end date.");
      return;
    }
    if (isRecurring && endType === "date" && new Date(endDate) <= new Date(scheduledAt)) {
      toast.error("End date must be after the start date.");
      return;
    }

    setSaving(true);
    try {
      const dates = isRecurring
        ? generateRecurringDates(scheduledAt, recurrence, endType, occurrences, endDate)
        : [new Date(scheduledAt)];

      for (const date of dates) {
        const label = isRecurring
          ? `📹 Recurring (${recurrence}) video call — ${date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}${note ? ` — ${note}` : ''}`
          : `📹 Video call scheduled for ${date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}${note ? ` — ${note}` : ''}`;

        await base44.entities.Message.create({
          client_id: clientId,
          sender_type: 'dietitian',
          message: label,
          content_type: 'video_scheduled',
          read: false,
          scheduled_time: date.toISOString(),
          is_scheduled: true,
        });
      }

      const successMsg = isRecurring
        ? `${dates.length} recurring calls scheduled with ${clientName}`
        : `Video call scheduled with ${clientName}`;

      toast.success(successMsg);
      setScheduledAt(""); setNote(""); setIsRecurring(false);
      setRecurrence("weekly"); setEndType("occurrences"); setOccurrences(4); setEndDate("");
      onOpenChange?.(false);
    } catch (e) {
      toast.error("Failed to schedule call. Please try again.");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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

          {/* Recurring Toggle */}
          <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <Repeat className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700 flex-1">Recurring appointment</span>
            <button
              type="button"
              onClick={() => setIsRecurring(!isRecurring)}
              className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${isRecurring ? 'bg-orange-500' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isRecurring ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {isRecurring && (
            <div className="space-y-3 pl-1">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">Repeat every</Label>
                <Select value={recurrence} onValueChange={setRecurrence}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Day (Daily)</SelectItem>
                    <SelectItem value="weekly">Week (Weekly)</SelectItem>
                    <SelectItem value="monthly">Month (Monthly)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">End after</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEndType("occurrences")}
                    className={`text-sm px-3 py-2 rounded-lg border font-medium transition-colors ${endType === "occurrences" ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300'}`}
                  >
                    # of times
                  </button>
                  <button
                    type="button"
                    onClick={() => setEndType("date")}
                    className={`text-sm px-3 py-2 rounded-lg border font-medium transition-colors ${endType === "date" ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300'}`}
                  >
                    End date
                  </button>
                </div>
              </div>

              {endType === "occurrences" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Number of occurrences</Label>
                  <Input
                    type="number"
                    min={2}
                    max={52}
                    value={occurrences}
                    onChange={(e) => setOccurrences(Math.min(52, Math.max(2, parseInt(e.target.value) || 2)))}
                    className="h-9"
                  />
                  <p className="text-xs text-gray-400">{occurrences} calls will be scheduled</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">End date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={scheduledAt ? scheduledAt.slice(0, 10) : new Date().toISOString().slice(0, 10)}
                    className="h-9"
                  />
                </div>
              )}
            </div>
          )}

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

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange?.(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500"
              onClick={handleSchedule}
              disabled={saving}
            >
              {saving ? "Scheduling…" : isRecurring ? "Schedule Recurring" : "Schedule Call"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}