import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, CheckCircle, Save, RefreshCw, AlertTriangle, Send } from "lucide-react";
import MealPlanViewer from "./MealPlanViewer";

export default function InlineMealPlanForm({ client, onSuccess, onCancel }) {
  const [step, setStep] = useState("config"); // config | generating | preview | saved
  const [planConfig, setPlanConfig] = useState({
    duration: 10,
    meal_pattern: "daily",
  });
  const [generatedData, setGeneratedData] = useState(null); // raw LLM response
  const [savedPlan, setSavedPlan] = useState(null);
  const [saving, setSaving] = useState(false);

  const missingProfile = !client.target_calories || !client.food_preference;

  const generateMealPlan = async () => {
    setStep("generating");
    try {
      const isWeightGain = client.goal === "weight_gain" || client.goal === "muscle_gain";
      const isWeightLoss = client.goal === "weight_loss";

      const calorieDistribution = isWeightLoss
        ? "Breakfast: 35%, Lunch: 35%, Dinner: 20% (LIGHTEST), Snacks: 10%"
        : isWeightGain
        ? "Breakfast: 35%, Lunch: 35%, Dinner: 30%, Snacks: 15%"
        : "Breakfast: 30%, Lunch: 35%, Dinner: 25%, Snacks: 10%";

      const earlyMorningDrink = isWeightGain
        ? "1 glass warm water (250ml) with 5-6 soaked almonds + 2 dates"
        : "1 glass warm water (250ml) with lemon juice (half lemon)";

      const calories = client.target_calories || 1600;
      const food = client.food_preference || "veg";
      const regional = client.regional_preference || "north";
      const goal = client.goal || "maintenance";

      const prompt = `Generate a personalized ${planConfig.duration}-day Indian meal plan:

Food Preference: ${food}
Regional Preference: ${regional}
Goal: ${goal}
Daily Calories: ${calories} kcal
Protein: ${client.target_protein || Math.round(calories * 0.25 / 4)}g, Carbs: ${client.target_carbs || Math.round(calories * 0.5 / 4)}g, Fats: ${client.target_fats || Math.round(calories * 0.25 / 9)}g

REQUIREMENTS:
1. EARLY MORNING (SAME for all ${planConfig.duration} days): ${earlyMorningDrink}
2. CALORIE DISTRIBUTION: ${calorieDistribution}
3. Each day MUST total EXACTLY ${calories} kcal
4. LUNCH: ONLY Roti+Sabji OR Dal+Rice
5. 6 meals daily: early_morning, breakfast, mid_morning, lunch, evening_snack, dinner
6. Simple traditional Indian meals only

Return structured meal plan with exact portions, macros, and nutritional tips.`;

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
      alert("Failed to generate meal plan. Please try again.");
      setStep("config");
    }
  };

  const savePlan = async () => {
    setSaving(true);
    try {
      const plan = await base44.entities.MealPlan.create({
        client_id: client.id,
        name: generatedData.plan_name || `${client.full_name} - ${planConfig.duration} Day Plan`,
        duration: planConfig.duration,
        meal_pattern: planConfig.meal_pattern,
        target_calories: client.target_calories,
        meals: generatedData.meals,
        food_preference: client.food_preference,
        regional_preference: client.regional_preference,
        active: false,
      });
      setSavedPlan(plan);
      setStep("saved");
    } catch (e) {
      alert("Failed to save plan. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const assignAndClose = async () => {
    if (!savedPlan) return;
    onSuccess(savedPlan);
  };

  // CONFIG STEP
  if (step === "config") {
    return (
      <div className="space-y-4">
        {missingProfile && (
          <Alert className="bg-yellow-50 border-yellow-300">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <AlertDescription className="text-xs text-yellow-800">
              Client profile is incomplete (missing calories or food preference). Plan will use defaults.
            </AlertDescription>
          </Alert>
        )}
        <Alert className="bg-blue-50 border-blue-300">
          <AlertDescription className="text-xs">
            AI will generate a personalized {planConfig.duration}-day meal plan for <strong>{client.full_name}</strong>
            {client.target_calories ? ` (${client.target_calories} kcal/day, ${client.food_preference})` : ""}
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-sm">Duration</Label>
            <Select
              value={planConfig.duration.toString()}
              onValueChange={(v) => setPlanConfig({ ...planConfig, duration: parseInt(v) })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 Days</SelectItem>
                <SelectItem value="10">10 Days</SelectItem>
                <SelectItem value="15">15 Days</SelectItem>
                <SelectItem value="30">30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Meal Pattern</Label>
            <Select
              value={planConfig.meal_pattern}
              onValueChange={(v) => setPlanConfig({ ...planConfig, meal_pattern: v })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily (unique each day)</SelectItem>
                <SelectItem value="3-3-4">3-3-4 Pattern (repeat)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={generateMealPlan} className="flex-1 bg-gradient-to-r from-orange-500 to-red-500">
            <Sparkles className="w-3 h-3 mr-1" /> Generate Plan
          </Button>
        </div>
      </div>
    );
  }

  // GENERATING STEP
  if (step === "generating") {
    return (
      <div className="py-12 text-center space-y-4">
        <Loader2 className="w-10 h-10 mx-auto animate-spin text-orange-500" />
        <p className="font-semibold text-gray-700">Generating {planConfig.duration}-day meal plan…</p>
        <p className="text-xs text-gray-400">This may take 15–30 seconds</p>
      </div>
    );
  }

  // PREVIEW STEP (generated, not saved yet)
  if (step === "preview" && generatedData) {
    const previewPlan = {
      ...planConfig,
      name: generatedData.plan_name || `${client.full_name} - ${planConfig.duration} Day Plan`,
      meals: generatedData.meals,
      target_calories: client.target_calories,
      food_preference: client.food_preference,
      regional_preference: client.regional_preference,
      active: false,
      created_date: new Date().toISOString(),
    };

    return (
      <div className="space-y-4">
        <Alert className="bg-green-50 border-green-300">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-xs text-green-800">
            Plan generated! Review below, then <strong>Save</strong> to keep it or <strong>Regenerate</strong> for a new version.
          </AlertDescription>
        </Alert>

        <h3 className="font-semibold text-gray-900">{previewPlan.name}</h3>

        <div className="max-h-[50vh] overflow-y-auto border rounded-xl p-3 bg-gray-50">
          <MealPlanViewer
            plan={previewPlan}
            allPlanIds={[]}
            hideActions={true}
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setStep("config")} className="flex-1">
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

  // SAVED STEP
  if (step === "saved" && savedPlan) {
    return (
      <div className="space-y-4">
        <Alert className="bg-green-50 border-green-300">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-xs text-green-800">
            Plan saved! You can assign it to the client now or later from the Meal Plans tab.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} className="flex-1">
            Close (Assign Later)
          </Button>
          <Button onClick={assignAndClose} className="flex-1 bg-orange-500 hover:bg-orange-600">
            <Send className="w-3 h-3 mr-1" /> Assign Now & Close
          </Button>
        </div>
      </div>
    );
  }

  return null;
}