import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Repeat, Calendar, Video, Mail, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

const DURATION_OPTIONS = [
  { label: "15 minutes", value: 15 },
  { label: "30 minutes", value: 30 },
  { label: "45 minutes", value: 45 },
  { label: "1 hour", value: 60 },
  { label: "1.5 hours", value: 90 },
  { label: "2 hours", value: 120 },
];

const buildRRule = (recurrence, endType, occurrences, endDate) => {
  let rule = `RRULE:FREQ=${recurrence.toUpperCase()}`;
  if (endType === "occurrences") {
    rule += `;COUNT=${occurrences}`;
  } else if (endType === "date" && endDate) {
    // Format date as YYYYMMDD for RRULE
    const d = new Date(endDate);
    const until = d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    rule += `;UNTIL=${until}`;
  }
  return rule;
};

export default function VideoCallScheduler({ clientId, clientName, clientEmail, coachEmail, open, onOpenChange }) {
  const [title, setTitle] = useState(`Video Call with ${clientName}`);
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(30);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrence, setRecurrence] = useState("weekly");
  const [endType, setEndType] = useState("occurrences");
  const [occurrences, setOccurrences] = useState(4);
  const [endDate, setEndDate] = useState("");
  const [sendCalendarInvite, setSendCalendarInvite] = useState(true);
  const [result, setResult] = useState(null);

  const handleSchedule = async () => {
    if (!scheduledAt) { toast.error("Please select a date and time."); return; }
    if (isRecurring && endType === "date" && !endDate) { toast.error("Please select an end date."); return; }
    if (isRecurring && endType === "date" && new Date(endDate) <= new Date(scheduledAt)) {
      toast.error("End date must be after start date."); return;
    }

    setSaving(true);
    try {
      let meetLink = null;
      let calendarLink = null;

      // 1. Create Google Calendar event with Meet link + invite
      if (sendCalendarInvite && clientEmail) {
        const rrule = isRecurring ? buildRRule(recurrence, endType, occurrences, endDate) : null;
        const res = await base44.functions.invoke('scheduleVideoCall', {
          title,
          start_datetime: new Date(scheduledAt).toISOString(),
          duration_minutes: duration,
          client_name: clientName,
          client_email: clientEmail,
          note,
          is_recurring: isRecurring,
          recurrence_rule: rrule,
        });
        if (res.data?.success) {
          meetLink = res.data.meet_link;
          calendarLink = res.data.html_link;
        } else {
          toast.error("Could not create Google Calendar event. Scheduling message only.");
        }
      }

      // 2. Always save a message record for tracking
      const dates = isRecurring
        ? generateDates(scheduledAt, recurrence, endType, occurrences, endDate)
        : [new Date(scheduledAt)];

      for (const date of dates) {
        const label = `📹 ${isRecurring ? `Recurring (${recurrence}) ` : ''}video call scheduled — ${date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}${meetLink ? `\n🔗 Meet: ${meetLink}` : ''}${note ? `\n📝 ${note}` : ''}`;
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

      setResult({ meetLink, calendarLink, isRecurring, count: dates.length });
      toast.success(
        sendCalendarInvite && clientEmail
          ? `📧 Calendar invite sent to ${clientEmail}!`
          : `Call scheduled with ${clientName}`
      );
    } catch (e) {
      console.error(e);
      toast.error("Failed to schedule call. Please try again.");
    }
    setSaving(false);
  };

  const generateDates = (start, pattern, endType, occurrences, endDate) => {
    const dates = [new Date(start)];
    const max = endType === "occurrences" ? occurrences : 52;
    const end = endType === "date" ? new Date(endDate) : null;
    let current = new Date(start);
    while (dates.length < max) {
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

  const handleClose = () => {
    setResult(null);
    setTitle(`Video Call with ${clientName}`);
    setScheduledAt(""); setNote(""); setIsRecurring(false);
    setRecurrence("weekly"); setEndType("occurrences"); setOccurrences(4); setEndDate("");
    setSendCalendarInvite(true); setDuration(30);
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-orange-500" />
            Schedule Video Call
          </DialogTitle>
          <DialogDescription>
            with <strong>{clientName}</strong>
            {clientEmail && <span className="text-gray-400 text-xs ml-1">({clientEmail})</span>}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          /* Success State */
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="w-14 h-14 mx-auto text-green-500" />
            <div>
              <p className="font-semibold text-gray-900 text-lg">
                {result.isRecurring ? `${result.count} calls scheduled!` : "Call scheduled!"}
              </p>
              {clientEmail && (
                <p className="text-sm text-gray-500 mt-1 flex items-center justify-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> Calendar invite sent to {clientEmail}
                </p>
              )}
            </div>
            {result.meetLink && (
              <a href={result.meetLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 hover:bg-green-100 transition-colors">
                <Video className="w-4 h-4" /> Open Google Meet Link
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {result.calendarLink && (
              <a href={result.calendarLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-100 transition-colors">
                <Calendar className="w-4 h-4" /> View in Google Calendar
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <Button onClick={handleClose} className="w-full mt-2">Done</Button>
          </div>
        ) : (
          /* Form */
          <div className="space-y-4 pt-2">
            {/* Title */}
            <div className="space-y-1.5">
              <Label>Call Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Monthly Progress Review" />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date & Time (IST)</Label>
                <Input type="datetime-local" value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} />
              </div>
              <div className="space-y-1.5">
                <Label>Duration</Label>
                <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map(d => (
                      <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Calendar Invite Toggle */}
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${clientEmail ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
              <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700">Send Google Calendar invite</p>
                <p className="text-xs text-gray-500 truncate">
                  {clientEmail ? `Invite + Meet link → ${clientEmail}` : 'No client email available'}
                </p>
              </div>
              {clientEmail && (
                <button type="button" onClick={() => setSendCalendarInvite(!sendCalendarInvite)}
                  className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors flex-shrink-0 ${sendCalendarInvite ? 'bg-blue-500' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${sendCalendarInvite ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              )}
            </div>

            {/* Recurring Toggle */}
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <Repeat className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-700 flex-1">Recurring appointment</span>
              <button type="button" onClick={() => setIsRecurring(!isRecurring)}
                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${isRecurring ? 'bg-orange-500' : 'bg-gray-300'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isRecurring ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {isRecurring && (
              <div className="space-y-3 pl-1">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Repeat every</Label>
                  <Select value={recurrence} onValueChange={setRecurrence}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
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
                    {["occurrences", "date"].map(type => (
                      <button key={type} type="button" onClick={() => setEndType(type)}
                        className={`text-sm px-3 py-2 rounded-lg border font-medium transition-colors ${endType === type ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300'}`}>
                        {type === "occurrences" ? "# of times" : "End date"}
                      </button>
                    ))}
                  </div>
                </div>

                {endType === "occurrences" ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">Number of occurrences</Label>
                    <Input type="number" min={2} max={52} value={occurrences}
                      onChange={(e) => setOccurrences(Math.min(52, Math.max(2, parseInt(e.target.value) || 2)))}
                      className="h-9" />
                    <p className="text-xs text-gray-400">{occurrences} calls will be scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">End date</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                      min={scheduledAt ? scheduledAt.slice(0, 10) : new Date().toISOString().slice(0, 10)}
                      className="h-9" />
                  </div>
                )}
              </div>
            )}

            {/* Note */}
            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Textarea placeholder="e.g. Monthly progress review call" value={note}
                onChange={(e) => setNote(e.target.value)} rows={2} className="resize-none" />
            </div>

            {/* Summary */}
            {scheduledAt && (
              <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 space-y-1">
                <p>📅 {new Date(scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' })}</p>
                <p>⏱️ Duration: {DURATION_OPTIONS.find(d => d.value === duration)?.label}</p>
                {isRecurring && <p>🔁 Repeats {recurrence} · {endType === 'occurrences' ? `${occurrences}×` : `until ${endDate}`}</p>}
                {sendCalendarInvite && clientEmail && <p className="text-blue-600">📧 Calendar invite → {clientEmail}</p>}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={handleClose}>Cancel</Button>
              <Button className="flex-1 bg-gradient-to-r from-orange-500 to-red-500"
                onClick={handleSchedule} disabled={saving || !scheduledAt}>
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scheduling…</> : isRecurring ? "Schedule Recurring" : "Schedule Call"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}