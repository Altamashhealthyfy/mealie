import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Stethoscope, CheckCircle, Sparkles, Save, RefreshCw, Send } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import MealPlanViewer from "./MealPlanViewer";

export default function InlineProPlanForm({ client, onSuccess, onCancel, prefillIntake }) {
  const [step, setStep] = useState("intake"); // intake | generating | preview | saved
  const [saving, setSaving] = useState(false);
  const [savedPlan, setSavedPlan] = useState(null);
  const [generatedData, setGeneratedData] = useState(null);

  const [formData, setFormData] = useState({
    health_conditions: prefillIntake?.health_conditions || [],
    goal: prefillIntake?.goal || (client.goal ? [client.goal] : []),
    diet_type: client.food_preference === "non_veg" ? "Non-Veg" : "Veg",
    duration: 10,
  });

  const handleHealthConditionToggle = (condition) => {
    setFormData((prev) => ({
      ...prev,
      health_conditions: prev.health_conditions.includes(condition)
        ? prev.health_conditions.filter((c) => c !== condition)
        : [...prev.health_conditions, condition],
    }));
  };

  const handleGoalToggle = (goal) => {
    setFormData((prev) => ({
      ...prev,
      goal: prev.goal.includes(goal)
        ? prev.goal.filter((g) => g !== goal)
        : [...prev.goal, goal],
    }));
  };

  const handleGenerate = async () => {
    if (!formData.health_conditions.length) {
      toast.error("Please select at least one health condition");
      return;
    }
    if (!formData.goal?.length) {
      toast.error("Please select at least one goal");
      return;
    }

    // Save intake first
    try {
      await base44.entities.ClinicalIntake.create({
        client_id: client.id,
        intake_date: format(new Date(), "yyyy-MM-dd"),
        health_conditions: formData.health_conditions,
        goal: formData.goal,
        diet_type: formData.diet_type,
        basic_info: {
          age: client.age || 0,
          gender: client.gender || "",
          height: client.height || 0,
          weight: client.weight || 0,
          bmi: client.height && client.weight
            ? parseFloat((client.weight / ((client.height / 100) ** 2)).toFixed(1))
            : 0,
          activity_level: client.activity_level || "",
        },
        completed: true,
      });
    } catch (e) {
      console.error("Intake save error", e);
    }

    setStep("generating");
    try {
      const calories = client.target_calories || 1600;
      const conditions = formData.health_conditions.join(", ");
      const goals = formData.goal.join(", ");

      const prompt = `Generate a disease-specific therapeutic ${formData.duration}-day Indian meal plan:

Client: ${client.full_name}
Health Conditions: ${conditions}
Goals: ${goals}
Food Preference: ${formData.diet_type}
Regional Preference: ${client.regional_preference || "north"}
Daily Calories: ${calories} kcal
Protein: ${client.target_protein || Math.round(calories * 0.25 / 4)}g

CLINICAL REQUIREMENTS:
- All meals must be safe and beneficial for: ${conditions}
- Include disease-specific therapeutic foods
- Avoid contraindicated foods for ${conditions}
- 6 meals daily: early_morning, breakfast, mid_morning, lunch, evening_snack, dinner
- Include rationale for each meal's disease benefit
- Indian traditional foods only, ${formData.diet_type} diet
- Each day totals exactly ${calories} kcal

Return structured therapeutic meal plan with exact portions, macros, nutritional tips, and disease rationale.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            plan_name: { type: "string" },
            meals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day: { type: "number" },
                  meal_type: { type: "string" },
                  meal_name: { type: "string" },
                  items: { type: "array", items: { type: "string" } },
                  portion_sizes: { type: "array", items: { type: "string" } },
                  calories: { type: "number" },
                  protein: { type: "number" },
                  carbs: { type: "number" },
                  fats: { type: "number" },
                  nutritional_tip: { type: "string" },
                  disease_rationale: { type: "string" },
                },
              },
            },
          },
        },
      });

      setGeneratedData(response);
      setStep("preview");
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Failed to generate pro plan. Please try again.");
      setStep("intake");
    }
  };

  const savePlan = async () => {
    setSaving(true);
    try {
      const plan = await base44.entities.MealPlan.create({
        client_id: client.id,
        name: generatedData.plan_name || `Pro Clinical Plan - ${client.full_name}`,
        duration: formData.duration,
        meal_pattern: "daily",
        target_calories: client.target_calories,
        meals: generatedData.meals,
        food_preference: client.food_preference,
        regional_preference: client.regional_preference,
        plan_tier: "advanced",
        disease_focus: formData.health_conditions,
        active: false,
      });
      setSavedPlan(plan);
      setStep("saved");
    } catch (e) {
      toast.error("Failed to save plan. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // INTAKE STEP
  if (step === "intake") {
    return (
      <div className="space-y-4">
        <Alert className="bg-purple-50 border-purple-300">
          <AlertDescription className="text-xs text-purple-800">
            Fill in clinical details to generate a disease-specific pro meal plan.
            {prefillIntake && " Pre-filled from last intake — update if needed."}
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Health Conditions *</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {["Diabetes", "Thyroid", "Liver", "Kidney", "Heart", "Hormonal", "Hypertension", "Others"].map((condition) => (
                <div key={condition} className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.health_conditions.includes(condition)}
                    onCheckedChange={() => handleHealthConditionToggle(condition)}
                  />
                  <Label className="text-xs cursor-pointer">{condition}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Goals *</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "weight_loss", label: "Weight Loss" },
                { value: "maintenance", label: "Maintenance" },
                { value: "energy", label: "Energy" },
                { value: "symptom_relief", label: "Symptom Relief" },
                { value: "disease_reversal", label: "Disease Reversal" },
              ].map(({ value, label }) => (
                <div key={value} className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.goal?.includes(value)}
                    onCheckedChange={() => handleGoalToggle(value)}
                  />
                  <Label className="text-xs cursor-pointer">{label}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 items-center">
          <Label className="text-xs text-gray-500 shrink-0">Duration:</Label>
          <div className="flex gap-1">
            {[7, 10, 15].map((d) => (
              <button
                key={d}
                onClick={() => setFormData((p) => ({ ...p, duration: d }))}
                className={`px-3 py-1 rounded-full text-xs border transition-all ${
                  formData.duration === d
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleGenerate} className="flex-1 bg-purple-600 hover:bg-purple-700">
            <Sparkles className="w-3 h-3 mr-1" /> Save & Generate Plan
          </Button>
        </div>
      </div>
    );
  }

  // GENERATING
  if (step === "generating") {
    return (
      <div className="py-12 text-center space-y-4">
        <Loader2 className="w-10 h-10 mx-auto animate-spin text-purple-500" />
        <p className="font-semibold text-gray-700">Generating therapeutic meal plan…</p>
        <p className="text-xs text-gray-400">Conditions: {formData.health_conditions.join(", ")}</p>
        <p className="text-xs text-gray-400">This may take 20–40 seconds</p>
      </div>
    );
  }

  // PREVIEW
  if (step === "preview" && generatedData) {
    const previewPlan = {
      name: generatedData.plan_name || `Pro Clinical Plan - ${client.full_name}`,
      duration: formData.duration,
      meals: generatedData.meals,
      target_calories: client.target_calories,
      food_preference: client.food_preference,
      plan_tier: "advanced",
      disease_focus: formData.health_conditions,
      active: false,
      created_date: new Date().toISOString(),
    };

    return (
      <div className="space-y-4">
        <Alert className="bg-green-50 border-green-300">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-xs text-green-800">
            Therapeutic plan generated! Review below, then <strong>Save</strong> or <strong>Regenerate</strong>.
          </AlertDescription>
        </Alert>

        <h3 className="font-semibold text-gray-900">{previewPlan.name}</h3>

        <div className="max-h-[50vh] overflow-y-auto border rounded-xl p-3 bg-gray-50">
          <MealPlanViewer plan={previewPlan} allPlanIds={[]} hideActions={true} />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setStep("intake")} className="flex-1">
            <RefreshCw className="w-3 h-3 mr-1" /> Regenerate
          </Button>
          <Button onClick={savePlan} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700">
            {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
            Save Plan
          </Button>
        </div>
      </div>
    );
  }

  // SAVED
  if (step === "saved" && savedPlan) {
    return (
      <div className="space-y-4">
        <Alert className="bg-green-50 border-green-300">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-xs text-green-800">
            Pro plan saved! Assign it to the client now or later from the Meal Plans tab.
          </AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} className="flex-1">
            Close (Assign Later)
          </Button>
          <Button onClick={() => onSuccess(savedPlan)} className="flex-1 bg-orange-500 hover:bg-orange-600">
            <Send className="w-3 h-3 mr-1" /> Assign Now & Close
          </Button>
        </div>
      </div>
    );
  }

  return null;
}