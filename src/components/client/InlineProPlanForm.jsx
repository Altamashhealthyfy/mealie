import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, Sparkles, Save, RefreshCw, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import MealPlanViewer from "./MealPlanViewer";
import DiagnosticReview from "@/components/pro/DiagnosticReview";

export default function InlineProPlanForm({ client, onSuccess, onCancel, prefillIntake }) {
  // step: "diagnostic" | "generating" | "preview" | "saved"
  const [step, setStep] = useState("diagnostic");
  const [saving, setSaving] = useState(false);
  const saveInProgress = useRef(false);
  const generateInProgress = useRef(false);
  const [generatedData, setGeneratedData] = useState(null);
  const [decisionRules, setDecisionRules] = useState([]);
  const [duration, setDuration] = useState(10);

  // Use latest intake data
  const intake = prefillIntake;

  const handleDiagnosticConfirm = async (rules) => {
    if (!intake) {
      toast.error("No clinical intake found. Please fill a clinical intake first.");
      return;
    }
    setDecisionRules(rules);

    // Save diagnostic notes + dietitian remarks back to the intake record
    try {
      const diagnosticNotes = rules.slice(0, 3).join(" | ");
      const dietitianRemarks = rules.slice(3).join("\n");
      await base44.entities.ClinicalIntake.update(intake.id, {
        diagnostic_notes: diagnosticNotes,
        dietitian_remarks: dietitianRemarks,
      });
    } catch (e) {
      console.warn("Could not save remarks to intake:", e);
    }

    await generatePlan(rules);
  };

  const generatePlan = async (rules) => {
    if (generateInProgress.current) return; // prevent double-generation
    generateInProgress.current = true;
    setStep("generating");
    try {
      const calories = client.target_calories || 1600;
      const conditions = (intake.health_conditions || []).join(", ");
      const goals = (Array.isArray(intake.goal) ? intake.goal : [intake.goal]).join(", ");
      const rulesText = rules.join("\n- ");

      const prompt = `Generate a disease-specific therapeutic ${duration}-day Indian meal plan.

Client: ${client.full_name}
Age: ${intake.basic_info?.age || client.age}, Gender: ${intake.basic_info?.gender || client.gender}
Height: ${intake.basic_info?.height || client.height}cm, Weight: ${intake.basic_info?.weight || client.weight}kg
Activity Level: ${intake.basic_info?.activity_level || client.activity_level}
Health Conditions: ${conditions}
Goals: ${goals}
Food Preference: ${intake.diet_type || "Veg"}
Stage/Severity: ${intake.stage_severity || "Not specified"}
Current Medications: ${(intake.current_medications || []).map(m => m.name).filter(Boolean).join(", ") || "None"}
Daily Routine: Wake ${intake.daily_routine?.wake_up || "?"}, Breakfast ${intake.daily_routine?.breakfast_time || "?"}, Lunch ${intake.daily_routine?.lunch_time || "?"}, Dinner ${intake.daily_routine?.dinner_time || "?"}
Likes: ${(intake.likes_dislikes_allergies?.likes || []).join(", ") || "None"}
Dislikes: ${(intake.likes_dislikes_allergies?.dislikes || []).join(", ") || "None"}
No-Go Foods: ${(intake.likes_dislikes_allergies?.no_go_foods || []).join(", ") || "None"}
Cooking Oil: ${intake.cooking_style?.oil_used || "Any"}
Regional Preference: ${client.regional_preference || "north"}

CLINICAL DECISION RULES (strictly follow all):
- ${rulesText}

REQUIREMENTS:
- 6 meals daily: early_morning, breakfast, mid_morning, lunch, evening_snack, dinner
- Each day totals exactly ${calories} kcal
- Include disease_rationale for each meal
- Indian traditional foods only matching the diet type
- Include nutritional_tip for each meal

Return a structured therapeutic meal plan with exact portions and macros.`;

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
      setStep("diagnostic");
    } finally {
      generateInProgress.current = false;
    }
  };

  const savePlan = async () => {
    if (saveInProgress.current) return; // prevent double-submit
    saveInProgress.current = true;
    setSaving(true);
    try {
      const plan = await base44.entities.MealPlan.create({
        client_id: client.id,
        name: generatedData.plan_name || `Pro Clinical Plan - ${client.full_name}`,
        duration,
        meal_pattern: "daily",
        target_calories: client.target_calories,
        meals: generatedData.meals,
        food_preference: client.food_preference,
        regional_preference: client.regional_preference,
        plan_tier: "advanced",
        disease_focus: intake?.health_conditions || [],
        active: false,
        decision_rules_applied: decisionRules,
      });
      toast.success("Plan saved successfully!");
      onSuccess(plan);
    } catch (e) {
      toast.error("Failed to save plan. Please try again.");
    } finally {
      setSaving(false);
      saveInProgress.current = false;
    }
  };

  // No intake guard
  if (!intake) {
    return (
      <div className="space-y-4 py-4">
        <Alert className="bg-orange-50 border-orange-300">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <AlertDescription className="text-sm text-orange-800">
            No clinical intake found for this client. Please fill in the Clinical Intake form first (via the Clinical Intake tab), then come back to generate a Pro Plan.
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={onCancel} className="w-full">Close</Button>
      </div>
    );
  }

  // DIAGNOSTIC STEP
  if (step === "diagnostic") {
    return (
      <div className="space-y-4">
        <Alert className="bg-purple-50 border-purple-300">
          <AlertDescription className="text-xs text-purple-800">
            Using latest intake from <strong>{intake.intake_date ? format(new Date(intake.intake_date), "MMM d, yyyy") : "—"}</strong>. Review diagnostics and rules below, then generate.
          </AlertDescription>
        </Alert>

        {/* Duration selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 shrink-0">Plan Duration:</span>
          <div className="flex gap-1">
            {[7, 10, 15].map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`px-3 py-1 rounded-full text-xs border transition-all ${
                  duration === d ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>
        </div>

        <DiagnosticReview
          client={client}
          intake={intake}
          foodPreferences={{
            likedFoods: intake.likes_dislikes_allergies?.likes || [],
            dislikedFoods: intake.likes_dislikes_allergies?.dislikes || [],
            recommendedFoods: [],
          }}
          numberOfDays={duration}
          mealPattern="daily"
          onConfirm={handleDiagnosticConfirm}
        />

        <Button variant="outline" size="sm" onClick={onCancel} className="w-full">
          Cancel
        </Button>
      </div>
    );
  }

  // GENERATING
  if (step === "generating") {
    return (
      <div className="py-12 text-center space-y-4">
        <Loader2 className="w-10 h-10 mx-auto animate-spin text-purple-500" />
        <p className="font-semibold text-gray-700">Generating therapeutic meal plan…</p>
        <p className="text-xs text-gray-400">Conditions: {(intake.health_conditions || []).join(", ")}</p>
        <p className="text-xs text-gray-400">Applying {decisionRules.length} clinical decision rules</p>
        <p className="text-xs text-gray-400">This may take 20–40 seconds</p>
      </div>
    );
  }

  // PREVIEW
  if (step === "preview" && generatedData) {
    const previewPlan = {
      name: generatedData.plan_name || `Pro Clinical Plan - ${client.full_name}`,
      duration,
      meals: generatedData.meals,
      target_calories: client.target_calories,
      food_preference: client.food_preference,
      plan_tier: "advanced",
      disease_focus: intake?.health_conditions || [],
      active: false,
      created_date: new Date().toISOString(),
    };

    return (
      <div className="space-y-4">
        <Alert className="bg-green-50 border-green-300">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-xs text-green-800">
            Therapeutic plan generated! Review below, then <strong>Save</strong> or go back to <strong>Regenerate</strong>.
          </AlertDescription>
        </Alert>

        <h3 className="font-semibold text-gray-900">{previewPlan.name}</h3>

        <div className="max-h-[50vh] overflow-y-auto border rounded-xl p-3 bg-gray-50">
          <MealPlanViewer plan={previewPlan} allPlanIds={[]} hideActions={true} />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setStep("diagnostic")} className="flex-1">
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

  return null;
}