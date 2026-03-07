import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Save, BookOpen } from "lucide-react";
import { toast } from "sonner";

export default function SaveAsTemplateDialog({ plan, onSuccess, onCancel }) {
  const [name, setName] = useState(plan?.name || "");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Template name is required"); return; }
    setSaving(true);
    try {
      await base44.entities.MealPlanTemplate.create({
        name: name.trim(),
        description: description.trim(),
        category,
        duration: plan.duration,
        target_calories: plan.target_calories,
        food_preference: plan.food_preference,
        regional_preference: plan.regional_preference,
        meals: plan.meals,
        times_used: 0,
        tags: plan.disease_focus || [],
      });
      toast.success("Template saved! You can now assign it to other clients.");
      onSuccess?.();
    } catch (e) {
      toast.error("Failed to save template: " + e.message);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
        <BookOpen className="w-5 h-5 text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-800">Save as Reusable Template</p>
          <p className="text-xs text-green-600">This template can be assigned to any client in one click</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium">Template Name *</Label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Veg Diabetes 1500cal Plan"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-sm font-medium">Description</Label>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Who is this template for? What conditions/goals does it suit?"
            rows={2}
            className="mt-1 text-sm"
          />
        </div>

        <div>
          <Label className="text-sm font-medium">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General Wellness</SelectItem>
              <SelectItem value="weight_loss">Weight Loss</SelectItem>
              <SelectItem value="weight_gain">Weight Gain</SelectItem>
              <SelectItem value="diabetes">Diabetes</SelectItem>
              <SelectItem value="pcos">PCOS</SelectItem>
              <SelectItem value="thyroid">Thyroid</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 space-y-0.5">
          <p>📅 Duration: <strong>{plan?.duration} days</strong></p>
          <p>🔥 Target Calories: <strong>{plan?.target_calories} kcal/day</strong></p>
          <p>🍽️ Meals: <strong>{plan?.meals?.length || 0} meal slots</strong></p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={handleSave} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Template
        </Button>
      </div>
    </div>
  );
}