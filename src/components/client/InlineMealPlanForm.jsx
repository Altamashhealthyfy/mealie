import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, CheckCircle } from "lucide-react";

export default function InlineMealPlanForm({ client, onSuccess, onCancel }) {
  const [generating, setGenerating] = useState(false);
  const [planConfig, setPlanConfig] = useState({
    duration: 10,
    meal_pattern: 'daily',
  });

  const generateMealPlan = async () => {
    setGenerating(true);
    try {
      const isWeightGain = client.goal === 'weight_gain' || client.goal === 'muscle_gain';
      const isWeightLoss = client.goal === 'weight_loss';
      
      const calorieDistribution = isWeightLoss 
        ? "Breakfast: 35%, Lunch: 35%, Dinner: 20% (LIGHTEST), Snacks: 10%"
        : isWeightGain
        ? "Breakfast: 35%, Lunch: 35%, Dinner: 30%, Snacks: 15%"
        : "Breakfast: 30%, Lunch: 35%, Dinner: 25%, Snacks: 10%";

      const earlyMorningDrink = isWeightGain
        ? "1 glass warm water (250ml) with 5-6 soaked almonds + 2 dates"
        : "1 glass warm water (250ml) with lemon juice (half lemon)";

      const prompt = `Generate a personalized ${planConfig.duration}-day Indian meal plan:

Food Preference: ${client.food_preference}
Regional Preference: ${client.regional_preference}
Goal: ${client.goal}
Daily Calories: ${client.target_calories} kcal
Protein: ${client.target_protein}g, Carbs: ${client.target_carbs}g, Fats: ${client.target_fats}g

REQUIREMENTS:
1. EARLY MORNING (SAME for all ${planConfig.duration} days): ${earlyMorningDrink}
2. CALORIE DISTRIBUTION: ${calorieDistribution}
3. Each day MUST total EXACTLY ${client.target_calories} kcal
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
                  nutritional_tip: { type: "string" }
                }
              }
            }
          }
        }
      });

      const mealPlan = await base44.entities.MealPlan.create({
        client_id: client.id,
        name: response.plan_name || `${client.full_name} - ${planConfig.duration} Day Plan`,
        duration: planConfig.duration,
        meal_pattern: planConfig.meal_pattern,
        target_calories: client.target_calories,
        meals: response.meals,
        food_preference: client.food_preference,
        regional_preference: client.regional_preference,
        active: true,
      });

      onSuccess(mealPlan);
    } catch (error) {
      console.error("Generation error:", error);
      alert("Failed to generate meal plan. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Generate Basic Meal Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-blue-50 border-blue-300">
            <AlertDescription className="text-xs">
              AI will generate a personalized {planConfig.duration}-day meal plan for {client.full_name}
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">Duration</Label>
              <Select
                value={planConfig.duration.toString()}
                onValueChange={(value) => setPlanConfig({...planConfig, duration: parseInt(value)})}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 Days</SelectItem>
                  <SelectItem value="10">10 Days</SelectItem>
                  <SelectItem value="15">15 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Meal Pattern</Label>
              <Select
                value={planConfig.meal_pattern}
                onValueChange={(value) => setPlanConfig({...planConfig, meal_pattern: value})}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="3-3-4">3-3-4 Pattern</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={generating}
              className="flex-1 text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={generateMealPlan}
              disabled={generating}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-xs"
            >
              {generating ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}