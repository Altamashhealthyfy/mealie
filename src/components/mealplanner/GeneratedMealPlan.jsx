import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, RefreshCw, Utensils, Lightbulb } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function GeneratedMealPlan({ plan, onSave, onGenerateNew, isSaving }) {
  const mealTypes = ["Early Morning", "Breakfast", "Mid-Morning", "Lunch", "Evening Snack", "Dinner"];
  
  const groupedMeals = {};
  plan.meals?.forEach(meal => {
    if (!groupedMeals[meal.day]) {
      groupedMeals[meal.day] = [];
    }
    groupedMeals[meal.day].push(meal);
  });

  const handleGenerateNewClick = () => {
    console.log("Generate New button clicked!");
    if (onGenerateNew) {
      onGenerateNew();
    } else {
      console.error("onGenerateNew function not provided!");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-3xl mb-2">{plan.plan_name}</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-orange-500 text-white">{plan.duration} Days</Badge>
                <Badge className="bg-blue-500 text-white capitalize">{plan.food_preference}</Badge>
                <Badge className="bg-green-500 text-white capitalize">{plan.regional_preference}</Badge>
                <Badge className="bg-purple-500 text-white">{plan.target_calories} kcal/day</Badge>
              </div>
            </div>
            <Utensils className="w-12 h-12 text-orange-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              onClick={onSave}
              disabled={isSaving}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save This Plan'}
            </Button>
            <Button
              onClick={handleGenerateNewClick}
              variant="outline"
              className="flex-1 border-2 border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Generate New
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="day-1" className="space-y-4">
        <div className="bg-white/80 backdrop-blur rounded-xl p-2 shadow-lg overflow-x-auto">
          <TabsList className="flex flex-nowrap">
            {Object.keys(groupedMeals).sort((a, b) => a - b).map(day => (
              <TabsTrigger 
                key={day} 
                value={`day-${day}`}
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white whitespace-nowrap"
              >
                Day {day}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {Object.keys(groupedMeals).sort((a, b) => a - b).map(day => (
          <TabsContent key={day} value={`day-${day}`} className="space-y-4">
            {groupedMeals[day]
              .sort((a, b) => mealTypes.indexOf(a.meal_type) - mealTypes.indexOf(b.meal_type))
              .map((meal, idx) => (
              <Card key={idx} className="border-none shadow-lg bg-white/80 backdrop-blur hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          {meal.meal_type}
                        </Badge>
                      </div>
                      <CardTitle className="text-2xl">{meal.meal_name}</CardTitle>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-orange-600">{meal.calories}</p>
                      <p className="text-xs text-gray-500">kcal</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Ingredients & Portions</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {meal.items?.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <span className="text-gray-700">{item}</span>
                          <Badge variant="secondary">{meal.portion_sizes?.[i]}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1 p-3 bg-red-50 rounded-lg">
                      <p className="text-xs text-gray-600">Protein</p>
                      <p className="text-lg font-bold text-red-600">{meal.protein}g</p>
                    </div>
                    <div className="flex-1 p-3 bg-yellow-50 rounded-lg">
                      <p className="text-xs text-gray-600">Carbs</p>
                      <p className="text-lg font-bold text-yellow-600">{meal.carbs}g</p>
                    </div>
                    <div className="flex-1 p-3 bg-purple-50 rounded-lg">
                      <p className="text-xs text-gray-600">Fats</p>
                      <p className="text-lg font-bold text-purple-600">{meal.fats}g</p>
                    </div>
                  </div>

                  {meal.nutritional_tip && (
                    <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-green-900 mb-1">Nutritional Tip</p>
                          <p className="text-sm text-green-700">{meal.nutritional_tip}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}