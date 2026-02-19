import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RefreshCw } from "lucide-react";

export default function RecurringGoalConfig({ config, onChange }) {
  const update = (field, value) => onChange({ ...config, [field]: value });

  return (
    <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-indigo-900 text-sm flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" /> Recurring Goal
          </p>
          <p className="text-xs text-indigo-600 mt-0.5">Reset and repeat on a schedule with a variable target</p>
        </div>
        <Switch
          checked={!!config?.enabled}
          onCheckedChange={(v) => onChange({ ...config, enabled: v })}
        />
      </div>

      {config?.enabled && (
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <Label className="text-indigo-800 text-xs">Recurrence</Label>
            <Select value={config.recurrence || "weekly"} onValueChange={(v) => update("recurrence", v)}>
              <SelectTrigger className="h-8 text-sm bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-indigo-800 text-xs">Target per period</Label>
            <Input
              type="number"
              step="0.1"
              value={config.period_target || ""}
              onChange={(e) => update("period_target", parseFloat(e.target.value))}
              placeholder="e.g. 0.5"
              className="h-8 text-sm bg-white"
            />
          </div>
          <div>
            <Label className="text-indigo-800 text-xs">Unit</Label>
            <Input
              value={config.unit || ""}
              onChange={(e) => update("unit", e.target.value)}
              placeholder="kg, sessions, km…"
              className="h-8 text-sm bg-white"
            />
          </div>
          <div>
            <Label className="text-indigo-800 text-xs">Pts per period</Label>
            <Input
              type="number"
              value={config.period_points || 50}
              onChange={(e) => update("period_points", Number(e.target.value))}
              className="h-8 text-sm bg-white"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-indigo-800 text-xs">Progress direction</Label>
            <Select value={config.direction || "decrease"} onValueChange={(v) => update("direction", v)}>
              <SelectTrigger className="h-8 text-sm bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="decrease">Decrease (e.g. weight loss)</SelectItem>
                <SelectItem value="increase">Increase (e.g. steps, water)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}