import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Scale, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function RecipeScaler({ meal, trigger }) {
  const [open, setOpen] = useState(false);
  const [originalServings, setOriginalServings] = useState(1);
  const [targetServings, setTargetServings] = useState(2);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleScale = async () => {
    if (!meal) return;
    if (targetServings <= 0) { toast.error("Target servings must be greater than 0"); return; }

    setLoading(true);
    setResult(null);

    const prompt = `You are a clinical dietitian and recipe expert. Scale the following meal recipe from ${originalServings} serving(s) to ${targetServings} serving(s).

ORIGINAL RECIPE (${originalServings} serving):
Meal Name: ${meal.meal_name || meal.name}
Items: ${meal.items?.join(', ')}
Portion Sizes: ${meal.portion_sizes?.join(', ')}
Original Nutritional Info (per ${originalServings} serving):
- Calories: ${meal.calories} kcal
- Protein: ${meal.protein}g
- Carbs: ${meal.carbs}g
- Fats: ${meal.fats}g
${meal.fiber ? `- Fiber: ${meal.fiber}g` : ''}
${meal.sodium ? `- Sodium: ${meal.sodium}mg` : ''}

TASK: Scale ALL ingredient quantities proportionally for ${targetServings} serving(s). Recalculate ALL nutritional values accurately.

Rules:
1. Scale each ingredient quantity by the factor (${targetServings}/${originalServings})
2. Keep the same units where possible, convert to practical units where needed (e.g. 0.5 tbsp → 1.5 tsp)
3. Round quantities to practical cooking measurements
4. Recalculate all macros proportionally
5. Keep the same items list order

Return exact scaled values.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          meal_name: { type: "string" },
          servings: { type: "number" },
          items: { type: "array", items: { type: "string" } },
          portion_sizes: { type: "array", items: { type: "string" } },
          calories: { type: "number" },
          protein: { type: "number" },
          carbs: { type: "number" },
          fats: { type: "number" },
          fiber: { type: "number" },
          sodium: { type: "number" },
          scaling_notes: { type: "string" }
        }
      }
    });

    setResult(response);
    setLoading(false);
  };

  const scaleFactor = targetServings / originalServings;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setResult(null); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="text-xs gap-1.5">
            <Scale className="w-3.5 h-3.5" />
            Scale Recipe
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Scale className="w-5 h-5 text-orange-500" />
            Scale Recipe
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Meal Info */}
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
            <p className="font-semibold text-gray-900 text-sm">{meal?.meal_name || meal?.name}</p>
            <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-gray-500">
              <span className="text-orange-600 font-medium">{meal?.calories} kcal</span>
              <span>P: {meal?.protein}g</span>
              <span>C: {meal?.carbs}g</span>
              <span>F: {meal?.fats}g</span>
            </div>
          </div>

          {/* Servings Input */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Original Servings</Label>
              <Input
                type="number"
                min="0.5"
                step="0.5"
                value={originalServings}
                onChange={e => setOriginalServings(parseFloat(e.target.value) || 1)}
                className="h-10"
              />
              <p className="text-xs text-gray-400">Current recipe makes how many servings?</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Scale To (Servings)</Label>
              <Input
                type="number"
                min="0.5"
                step="0.5"
                value={targetServings}
                onChange={e => setTargetServings(parseFloat(e.target.value) || 1)}
                className="h-10"
              />
              <p className="text-xs text-gray-400">How many servings do you need?</p>
            </div>
          </div>

          {/* Scale Factor Preview */}
          <div className="flex items-center justify-center gap-3 py-2">
            <Badge className="bg-gray-100 text-gray-700 border-0 text-sm px-3 py-1">{originalServings}x</Badge>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <Badge className={`border-0 text-sm px-3 py-1 ${scaleFactor > 1 ? 'bg-green-100 text-green-700' : scaleFactor < 1 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
              {targetServings}x ({scaleFactor > 1 ? '+' : ''}{Math.round((scaleFactor - 1) * 100)}%)
            </Badge>
          </div>

          <Button
            onClick={handleScale}
            disabled={loading || targetServings <= 0}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 h-11"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scaling with AI...</>
            ) : (
              <><Scale className="w-4 h-4 mr-2" />Scale Recipe</>
            )}
          </Button>

          {/* Result */}
          {result && (
            <div className="space-y-4 border-t pt-4">
              <p className="text-sm font-semibold text-gray-700">✅ Scaled Recipe ({result.servings} servings)</p>

              {/* Nutrition Comparison */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="border-gray-200 bg-gray-50">
                  <CardContent className="p-3">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Original ({originalServings} serving)</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span>Calories</span><span className="font-bold text-orange-600">{meal.calories} kcal</span></div>
                      <div className="flex justify-between"><span>Protein</span><span className="font-bold text-red-600">{meal.protein}g</span></div>
                      <div className="flex justify-between"><span>Carbs</span><span className="font-bold text-yellow-600">{meal.carbs}g</span></div>
                      <div className="flex justify-between"><span>Fats</span><span className="font-bold text-purple-600">{meal.fats}g</span></div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-3">
                    <p className="text-xs font-semibold text-green-700 mb-2">Scaled ({targetServings} servings)</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span>Calories</span><span className="font-bold text-orange-600">{result.calories} kcal</span></div>
                      <div className="flex justify-between"><span>Protein</span><span className="font-bold text-red-600">{result.protein}g</span></div>
                      <div className="flex justify-between"><span>Carbs</span><span className="font-bold text-yellow-600">{result.carbs}g</span></div>
                      <div className="flex justify-between"><span>Fats</span><span className="font-bold text-purple-600">{result.fats}g</span></div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Scaled Ingredients */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Scaled Ingredients</p>
                <div className="rounded-xl border divide-y">
                  {result.items?.map((item, i) => (
                    <div key={i} className="flex justify-between items-center px-3 py-2 text-sm">
                      <span className="text-gray-800">{item}</span>
                      <span className="text-gray-500 text-xs font-medium">{result.portion_sizes?.[i]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {result.scaling_notes && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                  💡 {result.scaling_notes}
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setResult(null); }}
              >
                Scale Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}