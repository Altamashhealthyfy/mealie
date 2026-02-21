import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Search, Loader2, Apple, Flame, TrendingUp, Wheat, Droplet,
  Leaf, ChevronRight, Database, Sparkles, Info, X, Plus, BookOpen
} from "lucide-react";
import NutrientBar from "@/components/foodlookup/NutrientBar";

const QUICK_EXAMPLES = [
  "1 katori dal", "2 chapatis", "1 plate poha",
  "Masala dosa", "1 bowl curd rice", "Chicken breast", "Brown rice"
];

const USDA_EXAMPLES = [
  "Apple", "Chicken breast", "Brown rice", "Almonds", "Broccoli", "Salmon", "Eggs"
];

export default function FoodLookup() {
  const [tab, setTab] = useState("usda");

  // USDA state
  const [usdaQuery, setUsdaQuery] = useState("");
  const [usdaSearching, setUsdaSearching] = useState(false);
  const [usdaResults, setUsdaResults] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  const [usdaError, setUsdaError] = useState("");

  // AI / Indian foods state
  const [aiQuery, setAiQuery] = useState("");
  const [aiSearching, setAiSearching] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const inputRef = useRef(null);

  // ── USDA Search ──────────────────────────────────────────────
  const handleUsdaSearch = async () => {
    if (!usdaQuery.trim()) return;
    setUsdaSearching(true);
    setUsdaResults([]);
    setSelectedFood(null);
    setUsdaError("");
    try {
      const res = await base44.functions.invoke("usdaFoodSearch", { query: usdaQuery, pageSize: 12 });
      const foods = res.data?.foods || [];
      if (foods.length === 0) setUsdaError("No results found. Try a different keyword.");
      setUsdaResults(foods);
    } catch (e) {
      setUsdaError("Failed to fetch from USDA. Please try again.");
    }
    setUsdaSearching(false);
  };

  // ── AI / Indian Search ───────────────────────────────────────
  const handleAiSearch = async () => {
    if (!aiQuery.trim()) return;
    setAiSearching(true);
    setAiResult(null);
    try {
      const prompt = `Provide detailed nutritional information for: "${aiQuery}"
Use ICMR data and standard Indian portion sizes where relevant.
Return per standard serving/portion.`;
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            food_name: { type: "string" },
            portion_size: { type: "string" },
            calories: { type: "number" },
            protein: { type: "number" },
            carbs: { type: "number" },
            fats: { type: "number" },
            fiber: { type: "number" },
            sugar: { type: "number" },
            sodium: { type: "number" },
            description: { type: "string" },
            health_benefits: { type: "array", items: { type: "string" } },
            tips: { type: "array", items: { type: "string" } },
            alternatives: { type: "array", items: { type: "string" } }
          }
        }
      });
      setAiResult(response);
    } catch (e) {
      alert("Error fetching AI nutrition info. Please try again.");
    }
    setAiSearching(false);
  };

  const n = (val) => (val != null ? Math.round(val * 10) / 10 : "—");

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">Food & Nutrition Lookup</h1>
            <p className="text-gray-500">Search the USDA FoodData Central database or use AI for Indian foods</p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-gray-400 bg-white rounded-xl px-3 py-2 shadow-sm border">
            <Database className="w-4 h-4 text-orange-400" />
            USDA FoodData Central
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full sm:w-auto grid grid-cols-2 mb-2">
            <TabsTrigger value="usda" className="flex items-center gap-1.5">
              <Database className="w-4 h-4" />
              USDA Database
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              AI / Indian Foods
            </TabsTrigger>
          </TabsList>

          {/* ── USDA TAB ── */}
          <TabsContent value="usda" className="space-y-5 mt-4">
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Search className="w-5 h-5 text-orange-500" />
                  Search USDA FoodData Central
                </CardTitle>
                <CardDescription>
                  Over 600,000 foods with detailed micronutrient data sourced from USDA labs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    placeholder="E.g., chicken breast, brown rice, almonds..."
                    value={usdaQuery}
                    onChange={e => setUsdaQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleUsdaSearch()}
                    className="text-base"
                  />
                  <Button
                    onClick={handleUsdaSearch}
                    disabled={usdaSearching}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 px-6 shrink-0"
                  >
                    {usdaSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {USDA_EXAMPLES.map(ex => (
                    <Badge
                      key={ex}
                      variant="outline"
                      className="cursor-pointer hover:bg-orange-50 hover:border-orange-300 transition-colors text-xs"
                      onClick={() => { setUsdaQuery(ex); }}
                    >
                      {ex}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {usdaError && (
              <Alert className="border-red-200 bg-red-50">
                <Info className="w-4 h-4 text-red-500" />
                <AlertDescription className="text-red-700">{usdaError}</AlertDescription>
              </Alert>
            )}

            {/* Results grid */}
            {usdaResults.length > 0 && !selectedFood && (
              <div>
                <p className="text-sm text-gray-500 mb-3">{usdaResults.length} results found</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {usdaResults.map(food => (
                    <Card
                      key={food.fdcId}
                      className="border hover:border-orange-300 hover:shadow-md transition-all cursor-pointer bg-white"
                      onClick={() => setSelectedFood(food)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2">{food.description}</p>
                            {food.brandOwner && <p className="text-xs text-gray-400 mt-0.5">{food.brandOwner}</p>}
                          </div>
                          <ChevronRight className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                        </div>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <Badge className="bg-orange-100 text-orange-700 text-xs font-normal">
                            {n(food.nutrients?.calories)} kcal
                          </Badge>
                          <Badge className="bg-blue-100 text-blue-700 text-xs font-normal">
                            P: {n(food.nutrients?.protein)}g
                          </Badge>
                          <Badge variant="outline" className="text-xs font-normal capitalize">
                            {food.dataType?.replace('SR Legacy', 'USDA')}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Selected food detail */}
            {selectedFood && (
              <FoodDetailCard food={selectedFood} onClose={() => setSelectedFood(null)} n={n} />
            )}

            {usdaResults.length === 0 && !usdaSearching && !usdaError && (
              <div className="text-center py-16 text-gray-400">
                <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">Search the USDA database</p>
                <p className="text-sm mt-1">Comprehensive data for 600,000+ foods</p>
              </div>
            )}
          </TabsContent>

          {/* ── AI TAB ── */}
          <TabsContent value="ai" className="space-y-5 mt-4">
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-orange-500" />
                  AI Nutrition (Indian & Global Foods)
                </CardTitle>
                <CardDescription>
                  Ask about any food, meal combination or Indian dish — AI uses ICMR data & internet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="E.g., 1 plate poha, 2 rotis + dal + sabzi..."
                    value={aiQuery}
                    onChange={e => setAiQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleAiSearch()}
                    className="text-base"
                  />
                  <Button
                    onClick={handleAiSearch}
                    disabled={aiSearching}
                    className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 px-6 shrink-0"
                  >
                    {aiSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_EXAMPLES.map(ex => (
                    <Badge
                      key={ex}
                      variant="outline"
                      className="cursor-pointer hover:bg-purple-50 hover:border-purple-300 transition-colors text-xs"
                      onClick={() => setAiQuery(ex)}
                    >
                      {ex}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {aiSearching && (
              <div className="flex items-center justify-center py-12 gap-3 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                Analysing nutritional data...
              </div>
            )}

            {aiResult && <AIResultCard result={aiResult} n={n} onAlternativeClick={q => setAiQuery(q)} />}

            {!aiResult && !aiSearching && (
              <div className="text-center py-16 text-gray-400">
                <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">AI-powered nutrition lookup</p>
                <p className="text-sm mt-1">Best for Indian dishes, meal combos & portion estimates</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Alert className="border-orange-200 bg-orange-50">
          <Info className="w-4 h-4 text-orange-600" />
          <AlertDescription className="text-gray-600 text-sm">
            USDA data is per 100g unless a serving size is specified. AI values use ICMR standards and standard Indian portions. Always apply clinical judgment.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function FoodDetailCard({ food, onClose, n }) {
  const { nutrients: nu = {}, description, brandOwner, dataType, servingSize, servingSizeUnit } = food;
  return (
    <Card className="border-none shadow-xl bg-white">
      <CardHeader className="pb-3 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-xl leading-snug">{description}</CardTitle>
          <div className="flex flex-wrap gap-2 mt-2">
            {brandOwner && <Badge variant="outline" className="text-xs">{brandOwner}</Badge>}
            <Badge variant="outline" className="text-xs">{dataType}</Badge>
            <Badge className="bg-gray-100 text-gray-700 text-xs">Per {servingSize || 100}{servingSizeUnit || 'g'}</Badge>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Macro tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Calories", val: nu.calories, unit: "kcal", icon: Flame, color: "text-orange-500", bg: "bg-orange-50" },
            { label: "Protein", val: nu.protein, unit: "g", icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-50" },
            { label: "Carbs", val: nu.carbs, unit: "g", icon: Wheat, color: "text-yellow-600", bg: "bg-yellow-50" },
            { label: "Fats", val: nu.fats, unit: "g", icon: Droplet, color: "text-purple-500", bg: "bg-purple-50" },
          ].map(({ label, val, unit, icon: Icon, color, bg }) => (
            <div key={label} className={`rounded-xl p-3 text-center ${bg}`}>
              <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
              <p className="text-xs text-gray-500">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{n(val)}</p>
              <p className="text-xs text-gray-400">{unit}</p>
            </div>
          ))}
        </div>

        {/* Micronutrient bars */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-green-500" /> Detailed Nutrients
          </p>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
            <NutrientBar label="Fiber" value={n(nu.fiber)} unit="g" max={30} color="bg-green-400" />
            <NutrientBar label="Sugar" value={n(nu.sugar)} unit="g" max={50} color="bg-pink-400" />
            <NutrientBar label="Sodium" value={n(nu.sodium)} unit="mg" max={2300} color="bg-red-400" />
            <NutrientBar label="Potassium" value={n(nu.potassium)} unit="mg" max={4700} color="bg-indigo-400" />
            <NutrientBar label="Calcium" value={n(nu.calcium)} unit="mg" max={1300} color="bg-teal-400" />
            <NutrientBar label="Iron" value={n(nu.iron)} unit="mg" max={18} color="bg-amber-400" />
            <NutrientBar label="Vitamin C" value={n(nu.vitamin_c)} unit="mg" max={90} color="bg-orange-300" />
            <NutrientBar label="Vitamin D" value={n(nu.vitamin_d)} unit="µg" max={20} color="bg-yellow-300" />
            <NutrientBar label="Cholesterol" value={n(nu.cholesterol)} unit="mg" max={300} color="bg-rose-400" />
            <NutrientBar label="Saturated Fat" value={n(nu.saturated_fat)} unit="g" max={20} color="bg-red-300" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AIResultCard({ result, n, onAlternativeClick }) {
  return (
    <div className="space-y-4">
      <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl">{result.food_name}</CardTitle>
          {result.portion_size && (
            <Badge className="bg-purple-600 text-white w-fit">{result.portion_size}</Badge>
          )}
        </CardHeader>
        <CardContent>
          {result.description && <p className="text-gray-600 text-sm">{result.description}</p>}
        </CardContent>
      </Card>

      {/* Macros */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: "Calories", val: result.calories, unit: "kcal", color: "text-orange-600", bg: "bg-orange-50", icon: Flame },
          { label: "Protein", val: result.protein, unit: "g", color: "text-blue-600", bg: "bg-blue-50", icon: TrendingUp },
          { label: "Carbs", val: result.carbs, unit: "g", color: "text-yellow-600", bg: "bg-yellow-50", icon: Wheat },
          { label: "Fats", val: result.fats, unit: "g", color: "text-purple-600", bg: "bg-purple-50", icon: Droplet },
          { label: "Fiber", val: result.fiber, unit: "g", color: "text-green-600", bg: "bg-green-50", icon: Leaf },
          { label: "Sugar", val: result.sugar, unit: "g", color: "text-pink-600", bg: "bg-pink-50", icon: Apple },
        ].map(({ label, val, unit, color, bg, icon: Icon }) => (
          <div key={label} className={`rounded-xl p-3 text-center ${bg}`}>
            <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{n(val)}</p>
            <p className="text-xs text-gray-400">{unit}</p>
          </div>
        ))}
      </div>

      {/* Sodium */}
      {result.sodium != null && (
        <div className="grid sm:grid-cols-2 gap-3">
          <NutrientBar label="Sodium" value={n(result.sodium)} unit="mg" max={2300} color="bg-red-400" />
        </div>
      )}

      {/* Benefits */}
      {result.health_benefits?.length > 0 && (
        <Card className="border-none shadow bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-base text-green-700">Health Benefits</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {result.health_benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-green-500 mt-0.5">✓</span> {b}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      {result.tips?.length > 0 && (
        <Card className="border-none shadow bg-blue-50">
          <CardHeader className="pb-2"><CardTitle className="text-base text-blue-700">Dietitian Tips</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {result.tips.map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-500 mt-0.5">💡</span> {t}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Alternatives */}
      {result.alternatives?.length > 0 && (
        <Card className="border-none shadow bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-base text-purple-700">Alternatives</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {result.alternatives.map((a, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="cursor-pointer hover:bg-purple-50 hover:border-purple-300 transition-colors px-3 py-1"
                  onClick={() => onAlternativeClick(a)}
                >
                  <Plus className="w-3 h-3 mr-1" />{a}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}