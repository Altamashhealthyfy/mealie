import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CalendarDays, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";

export default function PlanScheduleDialog({ plan, onSuccess, onCancel }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [startDate, setStartDate] = useState(today);
  const [startTime, setStartTime] = useState("08:00");
  const [saving, setSaving] = useState(false);

  const endDate = startDate
    ? format(addDays(new Date(startDate), plan?.duration || 0), "yyyy-MM-dd")
    : "";

  const handleSave = async () => {
    if (!startDate) {
      toast.error("Please select a start date.");
      return;
    }
    setSaving(true);
    try {
      await base44.entities.MealPlan.update(plan.id, {
        valid_from: startDate,
        valid_until: endDate,
        schedule_time: startTime,
        active: true,
      });
      toast.success("Plan scheduled successfully!");
      onSuccess?.();
    } catch (err) {
      toast.error("Failed to schedule: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 py-2">
      <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm">
        <p className="font-semibold text-blue-800">{plan?.name}</p>
        <p className="text-xs text-blue-600 mt-0.5">{plan?.duration} Days · {plan?.food_preference || ""} · {plan?.target_calories ? `${plan.target_calories} kcal/day` : ""}</p>
      </div>

      <div className="space-y-1">
        <Label className="text-sm font-medium">Start Date</Label>
        <Input
          type="date"
          value={startDate}
          min={today}
          onChange={(e) => setStartDate(e.target.value)}
          className="h-10"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-sm font-medium">Start Time</Label>
        <Input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="h-10"
        />
      </div>

      {endDate && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          <CalendarDays className="w-4 h-4 shrink-0" />
          <span>Plan ends on <strong>{format(new Date(endDate), "MMM d, yyyy")}</strong></span>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button variant="outline" onClick={onCancel} className="flex-1" disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700">
          {saving
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scheduling…</>
            : <><CheckCircle className="w-4 h-4 mr-2" />Schedule Plan</>}
        </Button>
      </div>
    </div>
  );
}