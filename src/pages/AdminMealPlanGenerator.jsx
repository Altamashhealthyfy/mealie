import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Loader2, Download, ChefHat, AlertTriangle, CheckCircle, FileText } from "lucide-react";
import { toast } from "sonner";

const DISEASES = [
  "Diabetes Type 2", "Diabetes Type 1", "Prediabetes",
  "Hypothyroid", "Hyperthyroid",
  "Hypertension", "Heart Disease", "High Cholesterol",
  "Kidney Disease (CKD)", "Liver Disease / Fatty Liver",
  "PCOS / PCOD", "Obesity / Weight Loss",
  "Anemia", "Osteoporosis", "IBS / Gut Issues",
  "Gout / Uric Acid", "GERD / Acidity",
];

const MEAL_COUNTS = [5, 6, 7];

export default function AdminMealPlanGenerator() {
  const [kcalTarget, setKcalTarget] = useState(1600);
  const [numMeals, setNumMeals] = useState(7);
  const [dietType, setDietType] = useState("veg");
  const [selectedDiseases, setSelectedDiseases] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null); // { mealPlan, recipes }
  const [activeTab, setActiveTab] = useState("plan");

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const isSuperAdmin = user?.user_type === "super_admin";

  const toggleDisease = (d) => {
    setSelectedDiseases((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const handleGenerate = async () => {
    if (!kcalTarget || kcalTarget < 1000 || kcalTarget > 3500) {
      toast.error("Please enter a valid kcal target (1000–3500)");
      return;
    }
    if (selectedDiseases.length === 0) {
      toast.error("Please select at least one disease/condition");
      return;
    }

    setGenerating(true);
    setResult(null);

    try {
      const calorieMin = kcalTarget - 50;
      const calorieMax = kcalTarget + 50;

      // Per-meal breakdown based on numMeals
      const mealBreakdown = numMeals === 5
        ? { early: 10, breakfast: Math.round(kcalTarget * 0.25), midMorning: 0, lunch: Math.round(kcalTarget * 0.35), eveningSnack: Math.round(kcalTarget * 0.12), dinner: Math.round(kcalTarget * 0.28), postDinner: 2 }
        : numMeals === 6
        ? { early: 10, breakfast: Math.round(kcalTarget * 0.22), midMorning: Math.round(kcalTarget * 0.08), lunch: Math.round(kcalTarget * 0.33), eveningSnack: Math.round(kcalTarget * 0.10), dinner: Math.round(kcalTarget * 0.25), postDinner: 2 }
        : { early: 10, breakfast: Math.round(kcalTarget * 0.22), midMorning: Math.round(kcalTarget * 0.08), lunch: Math.round(kcalTarget * 0.33), eveningSnack: Math.round(kcalTarget * 0.10), dinner: Math.round(kcalTarget * 0.25), postDinner: 2 };

      const mealSequence = numMeals === 5
        ? "Early Morning, Breakfast, Lunch, Evening Snack, Dinner"
        : numMeals === 6
        ? "Early Morning, Breakfast, Mid-Morning, Lunch, Evening Snack, Dinner"
        : "Early Morning, Breakfast, Mid-Morning, Lunch, Evening Snack, Dinner, Post Dinner";

      const dietLabel = { veg: "Vegetarian", non_veg: "Non-Vegetarian", egg: "Eggetarian", jain: "Jain (No onion, garlic, root veggies)" }[dietType] || dietType;

      const prompt = `# Admin 10-Day Disease-Specific Meal Plan Generator

Generate a complete, clinically accurate **10-day meal plan** (generic, not for a specific client).

## PARAMETERS:
- **Daily Calorie Target:** ${kcalTarget} kcal (acceptable range: ${calorieMin}–${calorieMax} kcal/day)
- **Number of Meals per Day:** ${numMeals} meals
- **Meal Sequence (FOLLOW EXACTLY):** ${mealSequence}
- **Diet Type:** ${dietLabel}
- **Disease Focus:** ${selectedDiseases.join(", ")}

## MANDATORY MEAL CALORIE BREAKDOWN:
${numMeals >= 7 ? `- Early Morning (detox water): ~10 kcal
- Breakfast: ~${mealBreakdown.breakfast} kcal
- Mid-Morning: ~${mealBreakdown.midMorning} kcal
- Lunch: ~${mealBreakdown.lunch} kcal
- Evening Snack: ~${mealBreakdown.eveningSnack} kcal
- Dinner: ~${mealBreakdown.dinner} kcal
- Post Dinner (herbal): ~2 kcal` : numMeals === 6 ? `- Early Morning (detox water): ~10 kcal
- Breakfast: ~${mealBreakdown.breakfast} kcal
- Mid-Morning: ~${mealBreakdown.midMorning} kcal
- Lunch: ~${mealBreakdown.lunch} kcal
- Evening Snack: ~${mealBreakdown.eveningSnack} kcal
- Dinner: ~${mealBreakdown.dinner} kcal` : `- Early Morning (detox water): ~10 kcal
- Breakfast: ~${mealBreakdown.breakfast} kcal
- Lunch: ~${mealBreakdown.lunch} kcal
- Evening Snack: ~${mealBreakdown.eveningSnack} kcal
- Dinner: ~${mealBreakdown.dinner} kcal`}
- **DAILY TOTAL: ${kcalTarget} kcal**

## DISEASE-SPECIFIC RULES TO APPLY:
${selectedDiseases.includes("Diabetes Type 2") || selectedDiseases.includes("Diabetes Type 1") || selectedDiseases.includes("Prediabetes") ? "DIABETES: Low glycaemic index foods only. No sugar, no maida, no white rice (max 4 days). High fibre. Include methi water early morning. Portion control strict.\n" : ""}
${selectedDiseases.includes("Hypothyroid") || selectedDiseases.includes("Hyperthyroid") ? "THYROID: Avoid raw cruciferous veggies. Include selenium-rich foods. No soy in excess. Morning detox water important.\n" : ""}
${selectedDiseases.includes("Hypertension") || selectedDiseases.includes("Heart Disease") ? "HEART/BP: Sodium under 1500mg/day. No fried foods. No processed food. Rich in potassium (bananas, palak, tomato). DASH diet principles.\n" : ""}
${selectedDiseases.includes("High Cholesterol") ? "CHOLESTEROL: No whole eggs. No saturated fat. Include oats, beans, fibre-rich foods. Avoid ghee excess.\n" : ""}
${selectedDiseases.includes("Kidney Disease (CKD)") ? "KIDNEY: Limit potassium, phosphorus, sodium. Low protein (0.6–0.8g/kg). Avoid nuts, seeds in excess. No coconut. No banana, tomato in excess.\n" : ""}
${selectedDiseases.includes("PCOS / PCOD") ? "PCOS: Anti-inflammatory. Low GI. High protein. Include seeds (flax, chia). No sugar. Include spearmint tea.\n" : ""}
${selectedDiseases.includes("Obesity / Weight Loss") ? "WEIGHT LOSS: Caloric deficit already set. High protein, high fibre, low fat. Pre-meal water. Light dinners.\n" : ""}
${selectedDiseases.includes("Gout / Uric Acid") ? "GOUT: No red meat, organ meats. No spinach in excess. Limit dals/pulses to moderate. High water intake. Avoid alcohol.\n" : ""}
${selectedDiseases.includes("IBS / Gut Issues") ? "IBS: Low FODMAP principles. Avoid onion/garlic in excess. No beans in excess. Cooked vegetables only. Probiotics (curd).\n" : ""}
${selectedDiseases.includes("Jain (No onion, garlic, root veggies)") || dietType === "jain" ? "JAIN: Strictly NO onion, garlic, potato, carrot, radish, beets, turnip. Use leafy greens, above-ground vegetables only.\n" : ""}

## DIET TYPE RULES:
${dietType === "veg" ? "VEGETARIAN: No meat, fish, eggs. Dairy allowed. Paneer, curd, dal, legumes for protein." : ""}
${dietType === "non_veg" ? "NON-VEG: Include chicken, fish (grilled/steamed/baked only, no fried). Max 2-3 days/week non-veg. Eggs allowed." : ""}
${dietType === "egg" ? "EGGETARIAN: Eggs allowed (boiled/omelette), no meat/fish. Dairy allowed." : ""}
${dietType === "jain" ? "JAIN: Strictly NO onion, garlic, potato, carrot, radish, beets, turnip, brinjal. Only above-ground vegetables." : ""}

## STRICT RULES:
1. Generate ALL 10 days — NEVER stop early
2. Each day MUST have EXACTLY ${numMeals} meals
3. Every day MUST total ${calorieMin}–${calorieMax} kcal
4. All meals must be authentic Indian cuisine
5. Post Dinner (if included) = SAME herbal drink for all 10 days
6. No fruits at dinner or post-dinner
7. Use Indian units: katori, spoon, glass, piece
8. 3-3-4 rotation pattern: Days 1-3 (Plan A), Days 4-6 (Plan B), Days 7-10 (Plan C)

## OUTPUT FORMAT:
Return a JSON object with:
1. "meal_plan": array of ALL ${numMeals * 10} meal objects, each with: day(1-10), meal_type, meal_name, items(array), portion_sizes(array), calories, protein, carbs, fats, disease_rationale
2. "unique_recipes": array of ALL unique dishes used in the plan, each with: recipe_name, ingredients(array of strings with quantities), instructions(array of steps), prep_time_mins, cook_time_mins, servings, calories_per_serving, protein_g, carbs_g, fats_g, disease_benefits(string), dietary_type("${dietType}")

CRITICAL: The unique_recipes array must contain one entry for EVERY unique dish name used across all 10 days. If a dish is repeated across days, include it ONLY ONCE in unique_recipes.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            meal_plan: {
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
                  disease_rationale: { type: "string" },
                },
              },
            },
            unique_recipes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  recipe_name: { type: "string" },
                  ingredients: { type: "array", items: { type: "string" } },
                  instructions: { type: "array", items: { type: "string" } },
                  prep_time_mins: { type: "number" },
                  cook_time_mins: { type: "number" },
                  servings: { type: "number" },
                  calories_per_serving: { type: "number" },
                  protein_g: { type: "number" },
                  carbs_g: { type: "number" },
                  fats_g: { type: "number" },
                  disease_benefits: { type: "string" },
                  dietary_type: { type: "string" },
                },
              },
            },
          },
        },
      });

      setResult(response);
      setActiveTab("plan");
      toast.success(`✅ Generated ${[...new Set(response.meal_plan.map((m) => m.day))].length} days & ${response.unique_recipes?.length || 0} unique recipes!`);
    } catch (err) {
      toast.error("Generation failed: " + (err.message || "Unknown error"));
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  // ── DOWNLOAD MEAL PLAN AS CSV ──
  const downloadMealPlanCSV = () => {
    if (!result?.meal_plan) return;
    const headers = ["Day", "Meal Type", "Meal Name", "Items", "Portion Sizes", "Calories", "Protein (g)", "Carbs (g)", "Fats (g)", "Disease Rationale"];
    const rows = result.meal_plan.map((m) => [
      m.day,
      m.meal_type?.replace(/_/g, " "),
      `"${m.meal_name}"`,
      `"${(m.items || []).join("; ")}"`,
      `"${(m.portion_sizes || []).join("; ")}"`,
      m.calories,
      m.protein,
      m.carbs,
      m.fats,
      `"${m.disease_rationale || ""}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `10day_meal_plan_${dietType}_${kcalTarget}kcal_${selectedDiseases[0]?.replace(/\s/g, "_") || "generic"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Meal plan downloaded!");
  };

  // ── DOWNLOAD RECIPES AS CSV ──
  const downloadRecipesCSV = () => {
    if (!result?.unique_recipes) return;
    const headers = ["Recipe Name", "Ingredients", "Instructions", "Prep Time (min)", "Cook Time (min)", "Servings", "Calories/Serving", "Protein (g)", "Carbs (g)", "Fats (g)", "Disease Benefits", "Diet Type"];
    const rows = result.unique_recipes.map((r) => [
      `"${r.recipe_name}"`,
      `"${(r.ingredients || []).join("; ")}"`,
      `"${(r.instructions || []).join(" | ")}"`,
      r.prep_time_mins || 0,
      r.cook_time_mins || 0,
      r.servings || 1,
      r.calories_per_serving || 0,
      r.protein_g || 0,
      r.carbs_g || 0,
      r.fats_g || 0,
      `"${r.disease_benefits || ""}"`,
      r.dietary_type || "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `unique_recipes_${dietType}_${kcalTarget}kcal.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Recipes downloaded!");
  };

  // ── DOWNLOAD MEAL PLAN AS TXT ──
  const downloadMealPlanTXT = () => {
    if (!result?.meal_plan) return;
    const days = [...new Set(result.meal_plan.map((m) => m.day))].sort((a, b) => a - b);
    let txt = `10-DAY MEAL PLAN\n`;
    txt += `Diet: ${dietType.toUpperCase()} | Calories: ${kcalTarget} kcal/day | Meals: ${numMeals}/day\n`;
    txt += `Conditions: ${selectedDiseases.join(", ")}\n`;
    txt += `${"=".repeat(60)}\n\n`;

    days.forEach((day) => {
      const dayMeals = result.meal_plan.filter((m) => m.day === day);
      const dayTotal = dayMeals.reduce((s, m) => s + (m.calories || 0), 0);
      txt += `DAY ${day} — Total: ${dayTotal} kcal\n${"-".repeat(40)}\n`;
      dayMeals.forEach((meal) => {
        txt += `\n  ${meal.meal_type?.replace(/_/g, " ").toUpperCase()} — ${meal.meal_name} (${meal.calories} kcal)\n`;
        (meal.items || []).forEach((item, i) => {
          txt += `    • ${item} — ${meal.portion_sizes?.[i] || ""}\n`;
        });
        txt += `    Nutrition: P:${meal.protein}g C:${meal.carbs}g F:${meal.fats}g\n`;
        if (meal.disease_rationale) txt += `    Note: ${meal.disease_rationale}\n`;
      });
      txt += "\n";
    });

    const blob = new Blob([txt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `10day_meal_plan_${kcalTarget}kcal.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Meal plan (TXT) downloaded!");
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <Alert className="max-w-md bg-red-50 border-red-500">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <AlertDescription>
            <strong>Admin Only.</strong> This feature is restricted to super admins.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <ChefHat className="w-8 h-8 text-indigo-600" />
              Admin Meal Plan Generator
            </h1>
            <p className="text-gray-500 mt-1">Generate 10-day disease-specific meal plans + unique recipes in one click</p>
          </div>
          <Badge className="bg-indigo-600 text-white px-4 py-2">👑 Admin Only</Badge>
        </div>

        {/* Config Card */}
        <Card className="border-none shadow-xl">
          <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-xl">
            <CardTitle>Plan Configuration</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="font-semibold">Daily Calorie Target (kcal) *</Label>
                <Input
                  type="number"
                  min={1000}
                  max={3500}
                  step={50}
                  value={kcalTarget}
                  onChange={(e) => setKcalTarget(parseInt(e.target.value) || 1600)}
                  className="h-12 text-lg font-semibold"
                />
                <p className="text-xs text-gray-400">Range: 1000–3500 kcal</p>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Meals Per Day *</Label>
                <Select value={numMeals.toString()} onValueChange={(v) => setNumMeals(parseInt(v))}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 Meals (No Mid-Morning / No Post-Dinner)</SelectItem>
                    <SelectItem value="6">6 Meals (No Post-Dinner)</SelectItem>
                    <SelectItem value="7">7 Meals (Full — Early Morning to Post-Dinner)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Diet Type *</Label>
                <Select value={dietType} onValueChange={setDietType}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="veg">🥦 Vegetarian</SelectItem>
                    <SelectItem value="non_veg">🍗 Non-Vegetarian</SelectItem>
                    <SelectItem value="egg">🥚 Eggetarian</SelectItem>
                    <SelectItem value="jain">🙏 Jain (No onion/garlic/root veggies)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Disease Selection */}
            <div className="space-y-3">
              <Label className="font-semibold text-base">
                Disease / Condition Focus *
                {selectedDiseases.length > 0 && (
                  <Badge className="ml-2 bg-indigo-100 text-indigo-700">{selectedDiseases.length} selected</Badge>
                )}
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {DISEASES.map((d) => (
                  <div
                    key={d}
                    onClick={() => toggleDisease(d)}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer text-sm transition-all select-none
                      ${selectedDiseases.includes(d)
                        ? "border-indigo-500 bg-indigo-50 text-indigo-800 font-medium"
                        : "border-gray-200 bg-white text-gray-700 hover:border-indigo-300"
                      }`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center
                      ${selectedDiseases.includes(d) ? "border-indigo-500 bg-indigo-500" : "border-gray-300"}`}>
                      {selectedDiseases.includes(d) && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    {d}
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            {selectedDiseases.length > 0 && (
              <Alert className="bg-indigo-50 border-indigo-300">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <AlertDescription className="text-sm">
                  <strong>Will Generate:</strong> 10-day {dietType} meal plan at {kcalTarget} kcal/day with {numMeals} meals, tailored for: <strong>{selectedDiseases.join(", ")}</strong>
                </AlertDescription>
              </Alert>
            )}

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={generating || selectedDiseases.length === 0}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90"
            >
              {generating ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating 10-Day Plan + Recipes...</>
              ) : (
                <><Sparkles className="w-5 h-5 mr-2" />Generate 10-Day Meal Plan & Recipes</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Stats + Download Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-xl shadow border border-green-200">
              <div className="flex gap-4 flex-wrap">
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-600">{[...new Set(result.meal_plan.map((m) => m.day))].length}</p>
                  <p className="text-xs text-gray-500">Days</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">{result.meal_plan.length}</p>
                  <p className="text-xs text-gray-500">Total Meals</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{result.unique_recipes?.length || 0}</p>
                  <p className="text-xs text-gray-500">Unique Recipes</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{kcalTarget}</p>
                  <p className="text-xs text-gray-500">kcal/day</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={downloadMealPlanCSV} className="bg-teal-600 hover:bg-teal-700">
                  <Download className="w-4 h-4 mr-2" />Meal Plan CSV
                </Button>
                <Button onClick={downloadMealPlanTXT} variant="outline" className="border-teal-400 text-teal-700">
                  <Download className="w-4 h-4 mr-2" />Meal Plan TXT
                </Button>
                <Button onClick={downloadRecipesCSV} className="bg-purple-600 hover:bg-purple-700">
                  <Download className="w-4 h-4 mr-2" />Recipes CSV
                </Button>
              </div>
            </div>

            {/* Tabs: Meal Plan / Recipes */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-white shadow">
                <TabsTrigger value="plan">
                  <FileText className="w-4 h-4 mr-1" />
                  10-Day Meal Plan
                </TabsTrigger>
                <TabsTrigger value="recipes">
                  <ChefHat className="w-4 h-4 mr-1" />
                  Unique Recipes ({result.unique_recipes?.length || 0})
                </TabsTrigger>
              </TabsList>

              {/* MEAL PLAN TAB */}
              <TabsContent value="plan" className="space-y-4 mt-4">
                {[...new Set(result.meal_plan.map((m) => m.day))].sort((a, b) => a - b).map((day) => {
                  const dayMeals = result.meal_plan.filter((m) => m.day === day);
                  const dayTotal = dayMeals.reduce((s, m) => s + (m.calories || 0), 0);
                  const dayProtein = dayMeals.reduce((s, m) => s + (m.protein || 0), 0);
                  const dayCarbs = dayMeals.reduce((s, m) => s + (m.carbs || 0), 0);
                  const dayFats = dayMeals.reduce((s, m) => s + (m.fats || 0), 0);
                  return (
                    <Card key={day} className="border-none shadow-md">
                      <CardHeader className="bg-slate-700 text-white py-3 px-5 flex flex-row items-center justify-between">
                        <CardTitle className="text-base">Day {day}</CardTitle>
                        <div className="flex gap-3 text-sm text-white/90">
                          <span className="font-bold text-yellow-300">{Math.round(dayTotal)} kcal</span>
                          <span>P:{Math.round(dayProtein)}g</span>
                          <span>C:{Math.round(dayCarbs)}g</span>
                          <span>F:{Math.round(dayFats)}g</span>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 divide-y">
                        {dayMeals.map((meal, i) => (
                          <div key={i} className="py-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                                {meal.meal_type?.replace(/_/g, " ")}
                              </span>
                              <Badge variant="outline" className="text-xs">{meal.calories} kcal</Badge>
                            </div>
                            <p className="font-semibold text-gray-800 mb-1">{meal.meal_name}</p>
                            <ul className="space-y-0.5">
                              {(meal.items || []).map((item, j) => (
                                <li key={j} className="flex justify-between text-sm text-gray-600">
                                  <span>• {item}</span>
                                  <span className="text-gray-400 ml-2 text-xs">{meal.portion_sizes?.[j]}</span>
                                </li>
                              ))}
                            </ul>
                            <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
                              <span className="text-red-500">P:{meal.protein}g</span>
                              <span className="text-yellow-500">C:{meal.carbs}g</span>
                              <span className="text-purple-500">F:{meal.fats}g</span>
                            </div>
                            {meal.disease_rationale && (
                              <p className="text-xs text-green-700 mt-1 italic">💡 {meal.disease_rationale}</p>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>

              {/* RECIPES TAB */}
              <TabsContent value="recipes" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(result.unique_recipes || []).map((recipe, i) => (
                    <Card key={i} className="border-none shadow-md">
                      <CardHeader className="bg-purple-700 text-white py-3 px-4">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-sm font-bold">{recipe.recipe_name}</CardTitle>
                          <Badge className="bg-white/20 text-white text-xs flex-shrink-0">{recipe.calories_per_serving} kcal</Badge>
                        </div>
                        <div className="flex gap-2 mt-1 text-xs text-purple-200">
                          <span>Prep: {recipe.prep_time_mins}min</span>
                          <span>•</span>
                          <span>Cook: {recipe.cook_time_mins}min</span>
                          <span>•</span>
                          <span>Serves: {recipe.servings}</span>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        {/* Macros */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-red-50 rounded p-1.5">
                            <p className="text-xs text-gray-500">Protein</p>
                            <p className="font-bold text-red-600 text-sm">{recipe.protein_g}g</p>
                          </div>
                          <div className="bg-yellow-50 rounded p-1.5">
                            <p className="text-xs text-gray-500">Carbs</p>
                            <p className="font-bold text-yellow-600 text-sm">{recipe.carbs_g}g</p>
                          </div>
                          <div className="bg-purple-50 rounded p-1.5">
                            <p className="text-xs text-gray-500">Fats</p>
                            <p className="font-bold text-purple-600 text-sm">{recipe.fats_g}g</p>
                          </div>
                        </div>

                        {/* Ingredients */}
                        <div>
                          <p className="text-xs font-bold text-gray-700 uppercase mb-1">Ingredients</p>
                          <ul className="text-sm text-gray-600 space-y-0.5">
                            {(recipe.ingredients || []).map((ing, j) => (
                              <li key={j} className="text-xs">• {ing}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Instructions */}
                        <div>
                          <p className="text-xs font-bold text-gray-700 uppercase mb-1">Method</p>
                          <ol className="text-xs text-gray-600 space-y-0.5">
                            {(recipe.instructions || []).map((step, j) => (
                              <li key={j} className="text-xs">{j + 1}. {step}</li>
                            ))}
                          </ol>
                        </div>

                        {recipe.disease_benefits && (
                          <Alert className="bg-green-50 border-green-200 py-2 px-3">
                            <AlertDescription className="text-xs text-green-800">
                              💚 {recipe.disease_benefits}
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}