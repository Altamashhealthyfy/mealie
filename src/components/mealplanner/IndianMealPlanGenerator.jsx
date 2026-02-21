import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, Loader2, Utensils } from "lucide-react";

export default function IndianMealPlanGenerator() {
  const [clientGoal, setClientGoal] = useState("weight_loss");
  const [foodPreference, setFoodPreference] = useState("veg");
  const [hasHealthCondition, setHasHealthCondition] = useState(false);
  const [mealPlan, setMealPlan] = useState(null);

  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('generate10DayIndianMealPlan', {
        clientGoal,
        foodPreference,
        hasHealthCondition
      });
      return data;
    },
    onSuccess: (data) => {
      setMealPlan(data);
    }
  });

  const downloadPlan = () => {
    if (!mealPlan) return;

    const content = generatePlanContent();
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', `IndianMealPlan_${clientGoal}_${foodPreference}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const generatePlanContent = () => {
    if (!mealPlan) return '';
    
    let content = `10-DAY INDIAN MEAL PLAN\n`;
    content += `Goal: ${clientGoal}\n`;
    content += `Food Preference: ${foodPreference}\n`;
    content += `Health Condition: ${hasHealthCondition ? 'Yes' : 'No'}\n`;
    content += `${'='.repeat(80)}\n\n`;
    
    mealPlan.mealPlan.forEach(day => {
      content += `DAY ${day.day}\n`;
      content += `${'-'.repeat(80)}\n`;
      content += `Early Morning: ${day.earlyMorning}\n`;
      content += `Breakfast: ${day.breakfast}\n`;
      content += `Mid-Morning: ${day.midMorning}\n`;
      content += `Lunch: ${day.lunch}\n`;
      content += `Evening Snack: ${day.eveningSnack}\n`;
      content += `Dinner: ${day.dinner}\n`;
      content += `Post-Dinner: ${day.postDinner}\n\n`;
    });
    
    return content;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="w-5 h-5" />
            10-Day Indian Meal Plan Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Client Goal */}
          <div className="space-y-3">
            <Label className="font-semibold">Client Goal</Label>
            <Select value={clientGoal} onValueChange={setClientGoal} disabled={generatePlanMutation.isPending}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weight_loss">Weight Loss</SelectItem>
                <SelectItem value="weight_gain">Weight Gain</SelectItem>
                <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Food Preference */}
          <div className="space-y-3">
            <Label className="font-semibold">Food Preference</Label>
            <Select value={foodPreference} onValueChange={setFoodPreference} disabled={generatePlanMutation.isPending}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="veg">Vegetarian</SelectItem>
                <SelectItem value="non_veg">Non-Vegetarian</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Health Condition */}
          <div className="flex items-center gap-3">
            <Checkbox
              id="health-condition"
              checked={hasHealthCondition}
              onCheckedChange={setHasHealthCondition}
              disabled={generatePlanMutation.isPending}
            />
            <Label htmlFor="health-condition" className="font-semibold cursor-pointer">
              Client has Diabetes or Hyperlipidemia
            </Label>
          </div>

          <Alert className="bg-blue-50 border-blue-300">
            <AlertDescription className="text-sm text-blue-900">
              This plan includes early morning, breakfast, mid-morning, lunch, evening snacks, and dinner. Post-dinner beverage is fixed throughout the plan. No palak paneer at dinner, and no night milk for weight-loss clients.
            </AlertDescription>
          </Alert>

          <Button
            onClick={() => generatePlanMutation.mutate()}
            disabled={generatePlanMutation.isPending}
            className="w-full bg-orange-600 hover:bg-orange-700"
            size="lg"
          >
            {generatePlanMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Plan...
              </>
            ) : (
              'Generate 10-Day Plan'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Display Generated Plan */}
      {mealPlan && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Your 10-Day Meal Plan</h2>
            <Button onClick={downloadPlan} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Download Plan
            </Button>
          </div>

          <Alert className="bg-green-50 border-green-300">
            <AlertDescription className="text-sm text-green-900">
              Post-Dinner Beverage (All Days): <span className="font-semibold">{mealPlan.mealPlan[0].postDinner}</span>
            </AlertDescription>
          </Alert>

          {mealPlan.mealPlan.map((day) => (
            <Card key={day.day}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Day {day.day}</CardTitle>
                  <Badge className="bg-orange-100 text-orange-800">
                    {foodPreference === 'non_veg' ? day.dinner.includes('chicken') || day.dinner.includes('fish') || day.dinner.includes('egg') ? '🥩 Non-Veg' : '🥗 Veg' : '🥗 Vegetarian'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase">Early Morning</p>
                    <p className="text-sm text-gray-900">{day.earlyMorning}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase">Breakfast</p>
                    <p className="text-sm text-gray-900">{day.breakfast}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase">Mid-Morning</p>
                    <p className="text-sm text-gray-900">{day.midMorning}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase">Lunch</p>
                    <p className="text-sm text-gray-900">{day.lunch}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase">Evening Snack</p>
                    <p className="text-sm text-gray-900">{day.eveningSnack}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase">Dinner</p>
                    <p className="text-sm text-gray-900">{day.dinner}</p>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <p className="text-xs font-semibold text-gray-600 uppercase">Post-Dinner Beverage</p>
                  <p className="text-sm text-gray-900 font-medium">{day.postDinner}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}