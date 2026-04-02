import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, Loader2, AlertTriangle, Save, Send, RefreshCw, Brain, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import MealPlanViewer from "@/components/client/MealPlanViewer";

const PRESET_DURATIONS = [3, 7, 10, 15, 21, 30];

const LOADING_TIPS = [
  "Selecting healthy Indian meals…",
  "Balancing nutrients across slots…",
  "Ensuring variety across days…",
  "Matching portions to calorie targets…",
  "Building your meal templates…",
];

function Generator({ client, onClose, onPlanGenerated }) {
  const queryClient = useQueryClient();
  const [duration, setDuration] = useState(7);
  const [useCustom, setUseCustom] = useState(false);
  const [customDuration, setCustomDuration] = useState("");
  const [generating, setGenerating] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [saving, setSaving] = useState(false);

  const effectiveDuration = useCustom ? (parseInt(customDuration) || 7) : duration;

  const handleGenerate = async () => {
    if (useCustom && (!parseInt(customDuration) || parseInt(customDuration) < 1 || parseInt(customDuration) > 90)) {
      toast.error("Enter a valid duration between 1 and 90 days.");
      return;
    }
    setGenerating(true);
    setTipIndex(0);
    const tipInterval = setInterval(() => setTipIndex(i => (i + 1) % LOADING_TIPS.length), 2000);
    try {
      const res = await base44.functions.invoke("generateBasicMealPlan", {
        clientId: client.id,
        calorieTarget: client.target_calories,
        dietType: client.food_preference,
        numDays: effectiveDuration,
        goal: client.goal,
      });
      clearInterval(tipInterval);
      const data = res.data;
      if (!data?.success) throw new Error(data?.error || "Generation failed");
      toast.success("Meal plan generated!");
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
        const existingPlans = await base44.entities.MealPlan.filter({ client_id: client.id });
        if (existingPlans.length > 0) {
          await Promise.all(existingPlans.map(p => base44.entities.MealPlan.update(p.id, { active: false })));
        }
        await base44.entities.MealPlan.update(generatedPlan.id, { active: true });
        toast.success("Plan saved and assigned to client!");
        queryClient.invalidateQueries({ queryKey: ["clientMealPlans", client.id] });
        queryClient.refetchQueries({ queryKey: ["clientMealPlans", client.id] });
        onPlanGenerated?.();
      } else {
        toast.success("Plan saved!");
        queryClient.invalidateQueries({ queryKey: ["clientMealPlans", client.id] });
      }
    } catch (err) {
      toast.error("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── After generation: show plan + save buttons ──
  if (generatedPlan) {
    return (
      <div className="space-y-4">
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-xs">
            ⚠️ This is a general healthy meal plan. Not designed for medical conditions.
          </AlertDescription>
        </Alert>

        <div className="border rounded-xl overflow-hidden">
          <MealPlanViewer plan={generatedPlan} allPlanIds={[generatedPlan.id]} hideActions={true} isCoach={true} />
        </div>

        {/* Save & Assign section */}
        <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-emerald-100">
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
              <Button onClick={() => savePlan(false)} disabled={saving} variant="outline" className="border-emerald-400 text-emerald-700">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Only
              </Button>
              <Button onClick={() => savePlan(true)} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
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

  // ── Setup screen ──
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Brain className="w-5 h-5 text-green-600" />
        Generate Basic Meal Plan
        <Badge className="bg-green-100 text-green-700 border-0 ml-1">{client.full_name}</Badge>
      </h2>

      {/* Client summary */}
      <div className="grid grid-cols-3 gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
        <div className="text-center">
          <p className="text-xs text-green-600 font-medium">Diet Type</p>
          <p className="text-sm font-semibold text-gray-800 capitalize">{client.food_preference?.replace(/_/g, ' ') || 'Mixed'}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-green-600 font-medium">Calorie Target</p>
          <p className="text-sm font-semibold text-gray-800">{client.target_calories || client.tdee || 'Auto'} kcal</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-green-600 font-medium">Goal</p>
          <p className="text-sm font-semibold text-gray-800 capitalize">{(client.goal || 'health_improvement').replace(/_/g, ' ')}</p>
        </div>
      </div>

      {/* Duration selector */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Plan Duration</p>
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
              type="number" min={1} max={90}
              placeholder="e.g. 14"
              value={customDuration}
              onChange={e => setCustomDuration(e.target.value)}
              className="w-28 h-9 text-sm"
            />
            <span className="text-sm text-gray-500">days</span>
          </div>
        )}
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-300 rounded-xl">
        <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-yellow-800">Basic Plan — General Healthy Nutrition Only</p>
          <p className="text-xs text-yellow-700 mt-0.5">Does <strong>not</strong> account for medical conditions. Use <strong>Clinical Diet Plan</strong> for disease-specific plans.</p>
        </div>
      </div>

      {/* Generate / loading */}
      {generating ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
          <p className="text-sm font-medium text-gray-700">Generating your meal plan…</p>
          <p className="text-xs text-gray-400 italic">{LOADING_TIPS[tipIndex]}</p>
        </div>
      ) : (
        <div className="flex justify-end gap-3 pt-2 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleGenerate}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 px-6"
          >
            <Sparkles className="w-4 h-4 mr-2" /> Generate {effectiveDuration}-Day Plan
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AIMealPlanGenerator({ client, onPlanGenerated, inlineMode = false, onClose }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleDone = () => {
    if (inlineMode) onClose?.();
    else setIsOpen(false);
    onPlanGenerated?.();
  };

  const content = (
    <div className="p-5">
      <Generator client={client} onClose={inlineMode ? onClose : () => setIsOpen(false)} onPlanGenerated={handleDone} />
    </div>
  );

  if (inlineMode) return <div className="bg-white text-gray-900">{content}</div>;

  return (
    <Dialog open={isOpen} onOpenChange={v => setIsOpen(v)}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
          <Sparkles className="w-4 h-4 mr-2" />Generate AI Meal Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-white text-gray-900">
        {content}
      </DialogContent>
    </Dialog>
  );
}