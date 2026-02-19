import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical } from "lucide-react";

export default function MultiStepGoalForm({ steps = [], onChange }) {
  const addStep = () => {
    onChange([
      ...steps,
      { title: "", target_value: "", unit: "", points_reward: 50, completed: false },
    ]);
  };

  const updateStep = (i, field, value) => {
    const updated = steps.map((s, idx) =>
      idx === i ? { ...s, [field]: value } : s
    );
    onChange(updated);
  };

  const removeStep = (i) => {
    onChange(steps.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold text-gray-700">Goal Phases / Steps</Label>
        <Button type="button" size="sm" variant="outline" onClick={addStep} className="h-7 text-xs">
          <Plus className="w-3 h-3 mr-1" /> Add Phase
        </Button>
      </div>

      {steps.length === 0 && (
        <p className="text-xs text-gray-400 italic">No phases yet — click "Add Phase" to break this goal into steps.</p>
      )}

      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex-shrink-0 mt-2">
              <GripVertical className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex-1 grid grid-cols-3 gap-2">
              <div className="col-span-3">
                <Input
                  value={step.title}
                  onChange={(e) => updateStep(i, "title", e.target.value)}
                  placeholder={`Phase ${i + 1} name (e.g., "Build base fitness")`}
                  className="h-8 text-sm"
                />
              </div>
              <Input
                type="number"
                step="0.1"
                value={step.target_value}
                onChange={(e) => updateStep(i, "target_value", e.target.value)}
                placeholder="Target"
                className="h-8 text-sm"
              />
              <Input
                value={step.unit}
                onChange={(e) => updateStep(i, "unit", e.target.value)}
                placeholder="Unit"
                className="h-8 text-sm"
              />
              <Input
                type="number"
                value={step.points_reward}
                onChange={(e) => updateStep(i, "points_reward", Number(e.target.value))}
                placeholder="Pts"
                className="h-8 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => removeStep(i)}
              className="flex-shrink-0 mt-2 text-red-400 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}