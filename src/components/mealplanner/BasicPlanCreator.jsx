import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Zap, User, AlertTriangle, Loader2,
  CheckCircle, RefreshCw, Edit, Save, Send
} from "lucide-react";
import { toast } from "sonner";
import MealPlanViewer from "@/components/client/MealPlanViewer";
import InlineProfileEditor from "@/components/client/InlineProfileEditor";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// ── Harris-Benedict kcal calc ──────────────────────────────────────────────────
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
    sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55,
    very_active: 1.725, extremely_active: 1.9,
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
  "Building your meal templates…",
];

const PRESET_DURATIONS = [7, 10, 15, 21, 30];

export default function BasicPlanCreator({ client, onBack, onPlanSaved }) {
  const queryClient = useQueryClient();
  const [duration, setDuration] = useState(7);
  const [customDuration, setCustomDuration] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [errors, setErrors] = useState({});
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [saving, setSaving] = useState(false);

  const effectiveDuration = useCustom ? (parseInt(customDuration) || 7) : duration;

  const calculatedKcal = useMemo(() => calcTargetKcal(client), [client]);
  const displayKcal = client?.target_calories || calculatedKcal;
  const kcalIsAuto = !client?.target_calories && !!calculatedKcal;

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
    if (useCustom && (!parseInt(customDuration) || parseInt(customDuration) < 1 || parseInt(customDuration) > 90)) {
      toast.error("Enter a valid duration between 1 and 90 days.");
      return;
    }

    setGenerating(true);
    setTipIndex(0);
    const tipInterval = setInterval(() => setTipIndex(i => (i + 1) % LOADING_TIPS.length), 2000);
    const minWait = new Promise(r => setTimeout(r, 2000));

    try {
      const [response] = await Promise.all([
        base44.functions.invoke("generateBasicMealPlan", {
          clientId: client.id,
          numDays: effectiveDuration,
          overrideCalories: displayKcal || undefined,
          overrideDietType: client.food_preference,
          overrideGoal: client.goal,
        }),
        minWait,
      ]);

      clearInterval(tipInterval);
      const data = response?.data;
      if (!data?.success) throw new Error(data?.error || "Generation failed");

      toast.success("Basic plan generated!");

      setGeneratedPlan({
        id: data.plan_id,
        name: data.plan_name,
        duration: effectiveDuration,
        target_calories: data.target_calories,
        food_preference: client.food_preference,
        meals: data.meals || [],
        plan_tier: "basic",
        active: false,
        created_date: new Date().toISOString(),
      });
    } catch (err) {
      clearInterval(tipInterval);
      console.error("BasicPlanCreator generation error:", err);
      toast.error("Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const savePlan = async (assign = false) => {
    if (!generatedPlan?.id) return;
    setSaving(true);
    try {
      if (assign) {
        // Deactivate all existing plans first
        const existingPlans = await base44.entities.MealPlan.filter({ client_id: client.id });
        if (existingPlans.length > 0) {
          await Promise.all(existingPlans.map(p => base44.entities.MealPlan.update(p.id, { active: false })));
        }
        await base44.entities.MealPlan.update(generatedPlan.id, { active: true });
        toast.success("Plan saved and assigned to client!");
      } else {
        toast.success("Plan saved!");
      }
      await queryClient.invalidateQueries({ queryKey: ["clientMealPlans", client.id] });
      await queryClient.refetchQueries({ queryKey: ["clientMealPlans", client.id] });
      onPlanSaved?.();
    } catch (err) {
      toast.error("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Generated Plan View ────────────────────────────────────────────────────────
  if (generatedPlan) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Meal Plans
        </button>

        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <h3 className="font-bold text-gray-900 text-lg">Plan Generated!</h3>
        </div>

        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-xs">
            ⚠️ This is a general healthy meal plan. Not designed for medical conditions.
          </AlertDescription>
        </Alert>

        {/* Plan preview */}
        <div className="border rounded-xl overflow-hidden">
          <MealPlanViewer plan={generatedPlan} allPlanIds={[generatedPlan.id]} hideActions={true} isCoach={true} />
        </div>

        {/* Save & Assign section */}
        <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-emerald-100 bg-emerald-50">
            <div className="flex items-center gap-2">
              <Save className="w-4 h-4 text-emerald-700" />
              <span className="font-bold text-sm text-emerald-700">Save & Assign Plan</span>
            </div>
          </div>
          <div className="px-4 py-4 bg-white space-y-3">
            <Card className="border-none shadow-sm bg-emerald-50">
              <CardContent className="p-4 text-sm space-y-2">
                <p className="font-semibold text-emerald-800">{generatedPlan.name}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{generatedPlan.duration} Days</Badge>
                  <Badge variant="outline">{generatedPlan.target_calories} kcal/day</Badge>
                  <Badge variant="outline" className="capitalize">{generatedPlan.food_preference}</Badge>
                  <Badge className="bg-green-600 text-white text-xs">⚡ Basic Plan</Badge>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => savePlan(false)}
                disabled={saving}
                variant="outline"
                className="border-emerald-400 text-emerald-700"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Only
              </Button>
              <Button
                onClick={() => savePlan(true)}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Save & Assign
              </Button>
            </div>

            <Button variant="outline" className="w-full text-gray-600" onClick={() => setGeneratedPlan(null)}>
              <RefreshCw className="w-4 h-4 mr-1" /> Discard & Regenerate
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Generator Setup Screen ─────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Meal Plans
      </button>

      <div>
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          <h3 className="font-bold text-gray-900 text-lg">Generate Basic Plan</h3>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">Based on client profile data</p>
      </div>

      {/* Client profile summary */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <p className="text-sm font-semibold text-gray-700">Plan will be generated using:</p>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowEditProfile(true)}>
              <Edit className="w-3 h-3 mr-1" /> Edit Profile
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {[
              { label: "Name",     value: client?.full_name },
              { label: "Age",      value: client?.age ? `${client.age} years` : undefined,    field: "age" },
              { label: "Gender",   value: client?.gender },
              { label: "Weight",   value: client?.weight ? `${client.weight} kg` : undefined,  field: "weight" },
              { label: "Height",   value: client?.height ? `${client.height} cm` : undefined },
              { label: "Diet",     value: client?.food_preference,                             field: "food_preference" },
              { label: "Goal",     value: client?.goal?.replace(/_/g, " "),                    field: "goal" },
              { label: "Activity", value: client?.activity_level?.replace(/_/g, " ") },
            ].map(({ label, value, field }) => (
              <div key={label} className="flex items-baseline gap-1">
                <span className="text-xs text-gray-400 w-16 shrink-0">{label}:</span>
                {value ? (
                  <span className="font-medium text-gray-800 capitalize">{value}</span>
                ) : (
                  <span className={`text-xs font-medium ${field && errors[field] ? "text-red-600" : "text-orange-500"}`}>Not set</span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
            <span className="text-xs text-gray-400">Daily Target:</span>
            {displayKcal ? (
              <>
                <span className="font-bold text-green-700">{displayKcal} kcal</span>
                {kcalIsAuto && <span className="text-[10px] text-gray-400 italic">(auto-calculated)</span>}
              </>
            ) : (
              <span className="text-xs text-orange-500 italic">Cannot calculate — add age, weight, height</span>
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
              {Object.values(errors).map((err, i) => <li key={i} className="text-xs text-red-600">{err}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Duration selector */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Plan Duration</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {PRESET_DURATIONS.map(d => (
            <button
              key={d}
              onClick={() => { setDuration(d); setUseCustom(false); }}
              className={`px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                !useCustom && duration === d
                  ? "border-green-600 bg-green-600 text-white shadow-sm"
                  : "border-gray-200 bg-white text-gray-700 hover:border-green-400"
              }`}
            >
              {d} days
            </button>
          ))}
          <button
            onClick={() => setUseCustom(true)}
            className={`px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
              useCustom
                ? "border-green-600 bg-green-600 text-white shadow-sm"
                : "border-gray-200 bg-white text-gray-700 hover:border-green-400"
            }`}
          >
            Custom
          </button>
        </div>
        {useCustom && (
          <div className="flex items-center gap-2 mt-2">
            <Input
              type="number"
              min={1}
              max={90}
              placeholder="e.g. 14"
              value={customDuration}
              onChange={e => setCustomDuration(e.target.value)}
              className="w-28 h-9 text-sm"
            />
            <span className="text-sm text-gray-500">days</span>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <Alert className="bg-amber-50 border-amber-200">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-amber-800 text-xs leading-relaxed">
          <strong>⚠️ Important:</strong> Basic Plan is for general healthy eating only. It does not apply
          disease rules. For clients with medical conditions, use <strong>Clinical Diet Plan</strong> instead.
        </AlertDescription>
      </Alert>

      {/* Generate button / loading */}
      {generating ? (
        <div className="flex flex-col items-center justify-center py-10 gap-4">
          <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
          <p className="text-sm font-medium text-gray-700">Generating your basic meal plan…</p>
          <p className="text-xs text-gray-400 italic">{LOADING_TIPS[tipIndex]}</p>
        </div>
      ) : (
        <Button onClick={handleGenerate} className="w-full bg-green-600 hover:bg-green-700 text-white text-base py-5 font-semibold" size="lg">
          <Zap className="w-5 h-5 mr-2" /> Generate {effectiveDuration}-Day Basic Plan
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
            onSuccess={() => { setShowEditProfile(false); queryClient.invalidateQueries(["client", client?.id]); }}
            onCancel={() => setShowEditProfile(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}