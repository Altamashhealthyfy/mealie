import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft, Zap, User, AlertTriangle, Loader2,
  CheckCircle, RefreshCw, Edit
} from "lucide-react";
import { toast } from "sonner";
import MealPlanViewer from "@/components/client/MealPlanViewer";
import InlineProfileEditor from "@/components/client/InlineProfileEditor";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// ── Harris-Benedict kcal calc (same as backend, for preview) ──────────────────
function calcTargetKcal(client) {
  const { weight, height, age, gender, activity_level, goal } = client || {};
  if (!weight || !height || !age) return null;
  let bmr;
  if ((gender || "").toLowerCase() === "male") {
    bmr = 88.36 + 13.40 * weight + 4.80 * height - 5.68 * age;
  } else {
    bmr = 447.6 + 9.25 * weight + 3.10 * height - 4.33 * age;
  }
  const actMap = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extremely_active: 1.9,
  };
  const tdee = bmr * (actMap[activity_level] || 1.55);
  let target = tdee;
  if (goal === "weight_loss") target = tdee - 300;
  if (goal === "weight_gain" || goal === "muscle_gain") target = tdee + 300;
  return Math.round(target / 50) * 50;
}

const LOADING_TIPS = [
  "Selecting healthy Indian meals…",
  "Balancing nutrients across slots…",
  "Ensuring variety across days…",
  "Matching portions to calorie targets…",
  "Building your 5-day templates…",
];

const DURATION_OPTIONS = [7, 10, 15];

export default function BasicPlanCreator({ client, onBack, onPlanSaved }) {
  const queryClient = useQueryClient();
  const [duration, setDuration] = useState(7);
  const [generating, setGenerating] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [errors, setErrors] = useState({});
  const [showEditProfile, setShowEditProfile] = useState(false);

  // Kcal preview
  const calculatedKcal = useMemo(() => calcTargetKcal(client), [client]);
  const displayKcal = client?.target_calories || calculatedKcal;
  const kcalIsAuto = !client?.target_calories && !!calculatedKcal;

  // Validate required fields
  const validate = () => {
    const errs = {};
    if (!client?.age) errs.age = "Please add client age in profile first.";
    if (!client?.weight) errs.weight = "Please add client weight in profile.";
    if (!client?.food_preference) errs.food_preference = "Please add diet type in profile.";
    if (!client?.goal) errs.goal = "Please add client goal in profile.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleGenerate = async () => {
    if (!validate()) return;

    setGenerating(true);
    setTipIndex(0);

    // Rotate tips
    const tipInterval = setInterval(() => {
      setTipIndex(i => (i + 1) % LOADING_TIPS.length);
    }, 2000);

    // Minimum 2 seconds
    const minWait = new Promise(r => setTimeout(r, 2000));

    try {
      const [response] = await Promise.all([
        base44.functions.invoke("generateBasicMealPlan", {
          clientId:        client.id,
          numDays:         duration,
          overrideCalories: displayKcal || undefined,
          overrideDietType: client.food_preference,
          overrideGoal:    client.goal,
        }),
        minWait,
      ]);

      clearInterval(tipInterval);

      const data = response?.data;
      if (!data?.success) throw new Error(data?.error || "Generation failed");

      toast.success("Basic plan generated successfully!");
      queryClient.invalidateQueries({ queryKey: ["clientMealPlans", client.id] });

      // Build a minimal plan object for viewer
      setGeneratedPlan({
        id:              data.plan_id,
        name:            data.plan_name,
        duration,
        target_calories: data.target_calories,
        food_preference: client.food_preference,
        meals:           data.meals || [],
        plan_tier:       "basic",
        active:          true,
        created_date:    new Date().toISOString(),
      });
    } catch (err) {
      clearInterval(tipInterval);
      console.error("BasicPlanCreator generation error:", err);
      toast.error("Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────────
  if (generatedPlan) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Meal Plans
        </button>

        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <h3 className="font-bold text-gray-900 text-lg">Plan Generated!</h3>
        </div>

        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-xs">
            ⚠️ This is a general healthy meal plan based on your client's profile. It is not designed
            for managing medical conditions. Macros are sourced from the verified food catalog.
          </AlertDescription>
        </Alert>

        <MealPlanViewer
          plan={generatedPlan}
          allPlanIds={[generatedPlan.id]}
          onAssigned={() => { onPlanSaved?.(generatedPlan); onBack(); }}
          onClose={onBack}
          isCoach={true}
        />

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => { setGeneratedPlan(null); }}
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Regenerate
          </Button>
          <Button
            onClick={() => { onPlanSaved?.(generatedPlan); onBack(); }}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" /> Done
          </Button>
        </div>
      </div>
    );
  }

  // ── Generator screen ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Meal Plans
      </button>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          <h3 className="font-bold text-gray-900 text-lg">Generate Basic Plan</h3>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">Based on client profile data</p>
      </div>

      {/* Client profile summary card */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <p className="text-sm font-semibold text-gray-700">Plan will be generated using:</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setShowEditProfile(true)}
            >
              <Edit className="w-3 h-3 mr-1" /> Edit Profile
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {[
              { label: "Name",     value: client?.full_name },
              { label: "Age",      value: client?.age ? `${client.age} years` : undefined,   field: "age" },
              { label: "Gender",   value: client?.gender },
              { label: "Weight",   value: client?.weight ? `${client.weight} kg` : undefined, field: "weight" },
              { label: "Height",   value: client?.height ? `${client.height} cm` : undefined },
              { label: "Diet",     value: client?.food_preference,                            field: "food_preference" },
              { label: "Goal",     value: client?.goal?.replace(/_/g," "),                    field: "goal" },
              { label: "Activity", value: client?.activity_level?.replace(/_/g," ") },
            ].map(({ label, value, field }) => (
              <div key={label} className="flex items-baseline gap-1">
                <span className="text-xs text-gray-400 w-16 shrink-0">{label}:</span>
                {value ? (
                  <span className="font-medium text-gray-800 capitalize">{value}</span>
                ) : (
                  <span className={`text-xs font-medium ${field && errors[field] ? "text-red-600" : "text-orange-500"}`}>
                    Not set
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
            <span className="text-xs text-gray-400">Daily Target:</span>
            {displayKcal ? (
              <>
                <span className="font-bold text-green-700">{displayKcal} kcal</span>
                {kcalIsAuto && (
                  <span className="text-[10px] text-gray-400 italic">(auto-calculated from profile)</span>
                )}
              </>
            ) : (
              <span className="text-xs text-orange-500 italic">
                Cannot calculate — add age, weight, height to profile
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation errors */}
      {Object.keys(errors).length > 0 && (
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription>
            <p className="font-semibold text-red-700 text-sm mb-1">Please fix these before generating:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {Object.values(errors).map((err, i) => (
                <li key={i} className="text-xs text-red-600">{err}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Duration selector */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Plan Duration</p>
        <div className="flex gap-2">
          {DURATION_OPTIONS.map(d => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`px-5 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                duration === d
                  ? "border-green-600 bg-green-600 text-white shadow-sm"
                  : "border-gray-200 bg-white text-gray-700 hover:border-green-400"
              }`}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <Alert className="bg-amber-50 border-amber-200">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-amber-800 text-xs leading-relaxed">
          <strong>⚠️ Important:</strong> Basic Plan is for general healthy eating only. It does not apply
          disease rules. For clients with thyroid, diabetes, PCOS or other conditions, use{" "}
          <strong>AI Generated Plan</strong> instead.
        </AlertDescription>
      </Alert>

      {/* Generate button / loading state */}
      {generating ? (
        <div className="flex flex-col items-center justify-center py-10 gap-4">
          <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
          <p className="text-sm font-medium text-gray-700">Generating your basic meal plan…</p>
          <p className="text-xs text-gray-400 italic">{LOADING_TIPS[tipIndex]}</p>
        </div>
      ) : (
        <Button
          onClick={handleGenerate}
          className="w-full bg-green-600 hover:bg-green-700 text-white text-base py-5 font-semibold"
          size="lg"
        >
          <Zap className="w-5 h-5 mr-2" /> Generate Basic Plan
        </Button>
      )}

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile — {client?.full_name}</DialogTitle>
          </DialogHeader>
          <InlineProfileEditor
            client={client}
            onSuccess={() => {
              setShowEditProfile(false);
              queryClient.invalidateQueries(["client", client?.id]);
            }}
            onCancel={() => setShowEditProfile(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}