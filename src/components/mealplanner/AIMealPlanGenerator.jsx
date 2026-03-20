import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, Loader2, Brain, TrendingUp, AlertTriangle, CheckCircle2, X, Plus, ChevronDown, ChevronUp, Apple, Target, BookOpen, Info, RefreshCw } from "lucide-react";
import RecipeScaler from "@/components/mealplanner/RecipeScaler";
import DiagnosticsPanel from "@/components/mealplanner/DiagnosticsPanel";
import PreGenerationDiagnostics from "@/components/mealplanner/PreGenerationDiagnostics";
import { toast } from "sonner";

const COMMON_RESTRICTIONS = ["Gluten-free", "Dairy-free", "Low-sodium", "Low-sugar", "Low-carb", "High-fiber", "Low-fat", "No onion/garlic (Jain)"];
const COMMON_ALLERGIES = ["Nuts", "Peanuts", "Shellfish", "Eggs", "Soy", "Wheat", "Milk", "Fish", "Sesame"];
const FOCUS_AREAS = ["Gut Health", "Anti-inflammatory", "Bone Health", "Heart Health", "Hormone Balance", "Energy Boost", "Immunity", "Muscle Recovery"];

function TagInput({ label, items, setItems, suggestions, placeholder, color = "blue" }) {
  const [inputVal, setInputVal] = useState("");
  const colorMap = { blue: "bg-blue-100 text-blue-800", red: "bg-red-100 text-red-800", orange: "bg-orange-100 text-orange-800", purple: "bg-purple-100 text-purple-800" };
  const add = (v) => { const t = v.trim(); if (t && !items.includes(t)) setItems([...items, t]); setInputVal(""); };
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">{label}</Label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {items.map((item, i) => (
          <Badge key={i} className={`${colorMap[color]} border-0 flex items-center gap-1 text-xs`}>
            {item}
            <button onClick={() => setItems(items.filter((_, j) => j !== i))}><X className="w-3 h-3" /></button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={inputVal} onChange={e => setInputVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(inputVal); } }} placeholder={placeholder} className="text-sm h-8" />
        <Button size="sm" variant="outline" onClick={() => add(inputVal)} className="h-8 px-2"><Plus className="w-3.5 h-3.5" /></Button>
      </div>
      {suggestions && (
        <div className="flex flex-wrap gap-1 mt-1">
          {suggestions.filter(s => !items.includes(s)).slice(0, 6).map((s, i) => (
            <button key={i} onClick={() => add(s)} className={`text-xs px-2 py-0.5 rounded-full border ${colorMap[color]} opacity-70 hover:opacity-100 transition-opacity`}>{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function MacroCard({ label, value, unit, color }) {
  const colors = { protein: "text-red-600 bg-red-50 border-red-200", carbs: "text-yellow-600 bg-yellow-50 border-yellow-200", fats: "text-purple-600 bg-purple-50 border-purple-200", calories: "text-orange-600 bg-orange-50 border-orange-200" };
  return (
    <div className={`rounded-xl p-3 border text-center ${colors[color]}`}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs opacity-70">{unit}</p>
      <p className="text-xs font-medium mt-0.5">{label}</p>
    </div>
  );
}

function DaySummaryView({ day, meals, summary }) {
  const [open, setOpen] = useState(day === 1);
  const dayMeals = meals.filter(m => m.day === day);
  const mealOrder = ["early_morning", "breakfast", "mid_morning", "lunch", "evening_snack", "dinner", "post_dinner"];
  const sorted = [...dayMeals].sort((a, b) => mealOrder.indexOf(a.meal_type) - mealOrder.indexOf(b.meal_type));
  const mealColors = { early_morning: "bg-sky-50 border-sky-200", breakfast: "bg-yellow-50 border-yellow-200", mid_morning: "bg-green-50 border-green-200", lunch: "bg-blue-50 border-blue-200", evening_snack: "bg-purple-50 border-purple-200", dinner: "bg-orange-50 border-orange-200", post_dinner: "bg-gray-50 border-gray-200" };
  const mealEmojis = { early_morning: "🌄", breakfast: "🌅", mid_morning: "🍎", lunch: "☀️", evening_snack: "🌿", dinner: "🌙", post_dinner: "🫖" };

  // Compute actual totals from meal data (don't trust AI-reported summaries)
  const computed = dayMeals.reduce((acc, m) => ({
    calories: acc.calories + (Number(m.calories) || 0),
    protein: acc.protein + (Number(m.protein) || 0),
    carbs: acc.carbs + (Number(m.carbs) || 0),
    fats: acc.fats + (Number(m.fats) || 0),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  return (
    <div className="border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-gray-50 to-slate-50 hover:from-gray-100 transition-colors">
        <div className="flex items-center gap-3">
          <span className="font-bold text-gray-800">Day {day}</span>
          <div className="flex gap-2 text-xs text-gray-500">
            <span className="font-medium text-orange-600">{Math.round(computed.calories)} kcal</span>
            <span>P:{Math.round(computed.protein)}g</span>
            <span>C:{Math.round(computed.carbs)}g</span>
            <span>F:{Math.round(computed.fats)}g</span>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="p-3 space-y-2.5">
          {sorted.map((meal, i) => (
            <div key={i} className={`rounded-lg border p-3 ${mealColors[meal.meal_type] || 'bg-gray-50'}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {mealEmojis[meal.meal_type]} {meal.meal_type?.replace(/_/g, ' ')}
                    {meal.suggested_time && <span className="ml-1.5 text-gray-400 normal-case tracking-normal">· {meal.suggested_time}</span>}
                  </span>
                  <p className="font-semibold text-gray-900 mt-0.5">{meal.meal_name}</p>
                </div>
                <Badge className="bg-white border text-gray-600 text-xs shrink-0">{meal.calories} kcal</Badge>
              </div>
              <div className="space-y-1 mb-2">
                {meal.items?.map((item, j) => (
                  <div key={j} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item}</span>
                    <span className="text-gray-400 text-xs">{meal.portion_sizes?.[j]}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 text-xs border-t pt-2 mt-2">
                <span className="text-red-600 font-medium">P: {meal.protein}g</span>
                <span className="text-yellow-600 font-medium">C: {meal.carbs}g</span>
                <span className="text-purple-600 font-medium">F: {meal.fats}g</span>
                {meal.fiber > 0 && <span className="text-green-600 font-medium">Fiber: {meal.fiber}g</span>}
              </div>
              {(meal.rationale || meal.disease_rationale) && (
                <p className="text-xs text-gray-500 italic mt-2 border-t pt-2">💡 {meal.rationale || meal.disease_rationale}</p>
              )}
              <div className="mt-2 pt-2 border-t">
                <RecipeScaler meal={meal} />
              </div>
            </div>
          ))}
          {summary?.notes && <p className="text-xs text-gray-500 text-center pt-1 italic">{summary.notes}</p>}
        </div>
      )}
    </div>
  );
}

export default function AIMealPlanGenerator({ client, onPlanGenerated, clinicalIntakes = [], inlineMode = false, onClose }) {
  const [isOpen, setIsOpen] = useState(false);
  const [duration, setDuration] = useState(7);
  const [adaptFromFeedback, setAdaptFromFeedback] = useState(true);
  const [mealFrequency, setMealFrequency] = useState(5);
  const [snackPreference, setSnackPreference] = useState("light");
  const [overrideCalories, setOverrideCalories] = useState("");
  const [overrideProtein, setOverrideProtein] = useState("");
  const [overrideCarbs, setOverrideCarbs] = useState("");
  const [overrideFats, setOverrideFats] = useState("");
  const [overrideGoal, setOverrideGoal] = useState("");
  const [cuisineNotes, setCuisineNotes] = useState("");
  const [additionalRestrictions, setAdditionalRestrictions] = useState([]);
  const [additionalAllergies, setAdditionalAllergies] = useState([]);
  const [additionalConditions, setAdditionalConditions] = useState([]);
  const [focusAreas, setFocusAreas] = useState([]);
  const [result, setResult] = useState(null);
  const [modificationInstructions, setModificationInstructions] = useState("");
  const [generationCount, setGenerationCount] = useState(1);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: async (isRegeneration = false) => {
      const nextCount = isRegeneration ? generationCount + 1 : 1;
      const res = await base44.functions.invoke('generateAIMealPlan', {
        clientId: client.id, duration, adaptFromFeedback, mealFrequency,
        snackPreference, cuisineNotes, focusAreas,
        overrideGoal: overrideGoal || undefined,
        overrideCalories: overrideCalories ? parseInt(overrideCalories) : undefined,
        overrideProtein: overrideProtein ? parseInt(overrideProtein) : undefined,
        overrideCarbs: overrideCarbs ? parseInt(overrideCarbs) : undefined,
        overrideFats: overrideFats ? parseInt(overrideFats) : undefined,
        additionalRestrictions, additionalAllergies, additionalConditions,
        modificationInstructions: isRegeneration ? modificationInstructions : '',
        generationCount: nextCount,
      });
      return { data: res.data, nextCount };
    },
    onSuccess: ({ data, nextCount }) => {
      queryClient.invalidateQueries({ queryKey: ['mealPlans'] });
      setResult(data);
      setGenerationCount(nextCount);
      toast.success("AI meal plan generated! 🎉");
      if (onPlanGenerated) onPlanGenerated(data.mealPlan);
    },
    onError: (e) => toast.error("Failed: " + e.message),
  });

  const days = result ? [...new Set(result.meals?.map(m => m.day) || [])].sort((a, b) => a - b) : [];

  const planContent = (
    <>
      <div className="p-5 pb-0">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Brain className="w-6 h-6 text-purple-500" />
          AI Meal Plan Generator
          <Badge className="bg-purple-100 text-purple-700 border-0 ml-1">for {client.full_name}</Badge>
        </h2>
      </div>

      {!result ? (
          <div className="p-5 space-y-5">
            {/* Clinical intake warning */}
            {clinicalIntakes.length === 0 && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-300 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">No Clinical Intake Found</p>
                  <p className="text-xs text-amber-700 mt-0.5">For best results, complete the Clinical Intake form first. The AI will use clinical data (conditions, medications, diet history) to generate a medically appropriate plan. You can still generate a basic plan using the client profile only.</p>
                </div>
              </div>
            )}
            {/* Client snapshot */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
              {[
                { l: "Goal", v: client.goal?.replace(/_/g, ' ') || 'N/A' },
                { l: "Weight", v: `${client.weight || '?'} kg → ${client.target_weight || '?'} kg` },
                { l: "Diet", v: client.food_preference || 'Mixed' },
                { l: "Calories", v: `${client.target_calories || client.tdee || '?'} kcal` },
              ].map(({ l, v }) => (
                <div key={l} className="text-center">
                  <p className="text-xs text-purple-600 font-medium">{l}</p>
                  <p className="text-sm font-semibold text-gray-800">{v}</p>
                </div>
              ))}
            </div>

            <Tabs defaultValue="basic">
              <TabsList className="w-full grid grid-cols-3 h-9">
                <TabsTrigger value="basic" className="text-xs">⚙️ Basic Config</TabsTrigger>
                <TabsTrigger value="health" className="text-xs">🏥 Health & Diet</TabsTrigger>
                <TabsTrigger value="macros" className="text-xs">📊 Macro Targets</TabsTrigger>
              </TabsList>

              {/* Basic Config */}
              <TabsContent value="basic" className="space-y-4 pt-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Plan Duration (Days)</Label>
                    <Input type="number" min="3" max="30" value={duration} onChange={e => setDuration(parseInt(e.target.value) || 7)} className="h-9" />
                    <p className="text-xs text-gray-400">3–30 days recommended</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Meals Per Day</Label>
                    <Select value={String(mealFrequency)} onValueChange={v => setMealFrequency(parseInt(v))}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 meals (B, L, D)</SelectItem>
                        <SelectItem value="4">4 meals (+ evening snack)</SelectItem>
                        <SelectItem value="5">5 meals (full pattern)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Override Goal</Label>
                    <Select value={overrideGoal || "default"} onValueChange={v => setOverrideGoal(v === "default" ? "" : v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Use client's goal" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Use client's goal</SelectItem>
                        <SelectItem value="weight_loss">Weight Loss</SelectItem>
                        <SelectItem value="weight_gain">Weight Gain</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                        <SelectItem value="health_improvement">Health Improvement</SelectItem>
                        <SelectItem value="disease_reversal">Disease Reversal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Snack Style</Label>
                    <Select value={snackPreference} onValueChange={setSnackPreference}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light (fruits, nuts)</SelectItem>
                        <SelectItem value="filling">Filling (chilla, sprouts)</SelectItem>
                        <SelectItem value="none">No snacks</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Cuisine / Special Notes</Label>
                  <Input value={cuisineNotes} onChange={e => setCuisineNotes(e.target.value)} placeholder="e.g. prefer South Indian breakfast, no spicy food at dinner..." className="h-9 text-sm" />
                </div>
                <div className="border rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-purple-500" /> Adapt from Recent Progress</p>
                    <p className="text-xs text-gray-500 mt-0.5">Uses last 7 progress logs to personalize choices</p>
                  </div>
                  <Switch checked={adaptFromFeedback} onCheckedChange={setAdaptFromFeedback} />
                </div>
              </TabsContent>

              {/* Health & Diet */}
              <TabsContent value="health" className="space-y-4 pt-3">
                <TagInput label="Additional Dietary Restrictions" items={additionalRestrictions} setItems={setAdditionalRestrictions} suggestions={COMMON_RESTRICTIONS} placeholder="Add restriction..." color="blue" />
                <TagInput label="Allergies (AI will strictly avoid)" items={additionalAllergies} setItems={setAdditionalAllergies} suggestions={COMMON_ALLERGIES} placeholder="Add allergy..." color="red" />
                <TagInput label="Medical Conditions" items={additionalConditions} setItems={setAdditionalConditions} suggestions={COMMON_CONDITIONS} placeholder="Add condition..." color="orange" />
                <TagInput label="Nutrition Focus Areas" items={focusAreas} setItems={setFocusAreas} suggestions={FOCUS_AREAS} placeholder="Add focus area..." color="purple" />
              </TabsContent>

              {/* Macros */}
              <TabsContent value="macros" className="space-y-4 pt-3">
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  Leave blank to auto-calculate from client profile. Override only if you have specific clinical targets.
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { l: "Daily Calories (kcal)", v: overrideCalories, s: setOverrideCalories, ph: `Default: ${client.target_calories || client.tdee || 'auto'}` },
                    { l: "Protein (g)", v: overrideProtein, s: setOverrideProtein, ph: `Default: ${client.target_protein || 'auto'}` },
                    { l: "Carbohydrates (g)", v: overrideCarbs, s: setOverrideCarbs, ph: `Default: ${client.target_carbs || 'auto'}` },
                    { l: "Fats (g)", v: overrideFats, s: setOverrideFats, ph: `Default: ${client.target_fats || 'auto'}` },
                  ].map(({ l, v, s, ph }) => (
                    <div key={l} className="space-y-1.5">
                      <Label className="text-sm">{l}</Label>
                      <Input type="number" value={v} onChange={e => s(e.target.value)} placeholder={ph} className="h-9" />
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            {/* Active inputs summary */}
            {(additionalAllergies.length > 0 || additionalConditions.length > 0) && (
              <div className="flex flex-wrap gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                {additionalAllergies.map((a, i) => <Badge key={i} className="bg-red-100 text-red-700 border-0 text-xs">⚠ {a}</Badge>)}
                {additionalConditions.map((c, i) => <Badge key={i} className="bg-orange-100 text-orange-700 border-0 text-xs">🏥 {c}</Badge>)}
              </div>
            )}

            {/* Pre-generation diagnostics */}
            <PreGenerationDiagnostics
              client={client}
              additionalRestrictions={additionalRestrictions}
              additionalAllergies={additionalAllergies}
              additionalConditions={additionalConditions}
              overrideGoal={overrideGoal}
              overrideCalories={overrideCalories}
              overrideProtein={overrideProtein}
              overrideCarbs={overrideCarbs}
              overrideFats={overrideFats}
              focusAreas={focusAreas}
              cuisineNotes={cuisineNotes}
            />

            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button variant="outline" onClick={() => inlineMode ? onClose?.() : setIsOpen(false)} disabled={generateMutation.isPending}>Cancel</Button>
              <Button onClick={() => generateMutation.mutate(false)} disabled={generateMutation.isPending} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-6">
                {generateMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating ({duration}-day plan)...</> : <><Sparkles className="w-4 h-4 mr-2" />Generate {duration}-Day Plan</>}
              </Button>
            </div>
          </div>
        ) : (
          /* Results View */
          <div className="p-5 space-y-5 bg-white text-gray-900">
            {/* Success banner */}
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-800">"{result.mealPlan?.name}" generated & saved!</p>
                <p className="text-xs text-green-700">{result.mealPlan?.meals} meals across {duration} days · assigned to client</p>
              </div>
            </div>

            {/* Overview & strategy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-purple-100 bg-purple-50">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-purple-700 mb-1.5 flex items-center gap-1"><Apple className="w-3.5 h-3.5" /> Plan Overview</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{result.overview}</p>
                </CardContent>
              </Card>
              <Card className="border-blue-100 bg-blue-50">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-blue-700 mb-1.5 flex items-center gap-1"><Target className="w-3.5 h-3.5" /> Nutritional Strategy</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{result.nutritional_strategy}</p>
                </CardContent>
              </Card>
            </div>

            {/* Macro targets */}
            {result.macro_targets && (
              <div className="grid grid-cols-4 gap-2">
                <MacroCard label="Calories" value={result.mealPlan?.daily_calorie_target || "~"} unit="kcal/day" color="calories" />
                <MacroCard label="Protein" value={`${result.macro_targets.protein_g}g`} unit="per day" color="protein" />
                <MacroCard label="Carbs" value={`${result.macro_targets.carbs_g}g`} unit="per day" color="carbs" />
                <MacroCard label="Fats" value={`${result.macro_targets.fats_g}g`} unit="per day" color="fats" />
              </div>
            )}

            {/* Foods included/avoided */}
            {(result.key_foods_included?.length > 0 || result.foods_avoided?.length > 0) && (
              <div className="grid grid-cols-2 gap-3">
                {result.key_foods_included?.length > 0 && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                    <p className="text-xs font-semibold text-green-700 mb-2">✅ Key Foods Included</p>
                    <div className="flex flex-wrap gap-1">{result.key_foods_included.map((f, i) => <span key={i} className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">{f}</span>)}</div>
                  </div>
                )}
                {result.foods_avoided?.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-xs font-semibold text-red-700 mb-2">🚫 Foods Avoided</p>
                    <div className="flex flex-wrap gap-1">{result.foods_avoided.map((f, i) => <span key={i} className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded">{f}</span>)}</div>
                  </div>
                )}
              </div>
            )}

            {/* Day-by-day plan */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Day-by-Day Plan</p>
              <div className="space-y-2">
                {days.map(day => (
                  <DaySummaryView key={day} day={day} meals={result.meals || []} summary={result.day_summaries?.find(s => s.day === day)} />
                ))}
              </div>
            </div>

            {/* Coach notes */}
            {result.coach_notes && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-4 flex items-start gap-3">
                  <span className="text-xl shrink-0">📋</span>
                  <div>
                    <p className="text-xs font-semibold text-yellow-800 mb-1">Coach Notes from AI</p>
                    <p className="text-sm text-yellow-900 leading-relaxed">{result.coach_notes}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ─── AI CHAT REGENERATION ─── */}
            <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-purple-600" />
                  <p className="font-semibold text-purple-800">Regenerate with Instructions</p>
                  {generationCount > 1 && <Badge className="bg-purple-100 text-purple-700 border-0 text-xs">v{generationCount}</Badge>}
                </div>
                <p className="text-xs text-purple-600">
                  Review the plan above, then type any changes you want — the AI will regenerate the full plan with your instructions applied.
                </p>
                <Textarea
                  value={modificationInstructions}
                  onChange={e => setModificationInstructions(e.target.value)}
                  placeholder="e.g. Replace all breakfast cereals with cheela options, add more protein at dinner, avoid rajma at lunch, relax the sodium restriction slightly..."
                  rows={3}
                  className="text-sm border-purple-300 focus:border-purple-500 resize-none"
                />
                <div className="flex flex-wrap gap-2">
                  {["Add more protein at dinner", "Swap cereals with cheela", "Make breakfasts lighter", "More variety in lunch dals", "Relax sodium restriction"].map(s => (
                    <button key={s} onClick={() => setModificationInstructions(prev => prev ? prev + "; " + s : s)}
                      className="text-xs bg-white border border-purple-300 text-purple-700 rounded-full px-2.5 py-1 hover:bg-purple-50 transition-colors">
                      + {s}
                    </button>
                  ))}
                </div>
                <Button
                  onClick={() => generateMutation.mutate(true)}
                  disabled={generateMutation.isPending}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {generateMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Regenerating with your instructions...</>
                  ) : (
                    <><RefreshCw className="w-4 h-4 mr-2" />Regenerate Plan {modificationInstructions ? "with Instructions" : "(Fresh)"}</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* ─── DIAGNOSTICS SECTION ─── */}
            <DiagnosticsPanel
              result={result}
              generationCount={generationCount}
              modificationInstructions={modificationInstructions}
            />

            <div className="flex justify-between gap-3 pt-2 border-t">
              <Button variant="outline" onClick={() => { setResult(null); setModificationInstructions(""); setGenerationCount(1); }}>
                <Sparkles className="w-4 h-4 mr-2" />Start Fresh
              </Button>
              <Button onClick={() => inlineMode ? onClose?.() : setIsOpen(false)} className="bg-gradient-to-r from-green-500 to-emerald-600">Done – View in Meal Planner</Button>
            </div>
          </div>
        )}
    </>
  );

  if (inlineMode) return <div className="bg-white text-gray-900">{planContent}</div>;

  return (
    <Dialog open={isOpen} onOpenChange={v => { setIsOpen(v); if (!v) setResult(null); }}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
          <Sparkles className="w-4 h-4 mr-2" />
          Generate AI Meal Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 bg-white text-gray-900">
        {planContent}
      </DialogContent>
    </Dialog>
  );
}