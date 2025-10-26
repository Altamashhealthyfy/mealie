import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, ChefHat, Utensils, Lightbulb, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export default function MyAssignedMealPlan() {
  const [completedMeals, setCompletedMeals] = useState({});

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['myClientProfile', user?.email],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ email: user?.email });
      return clients[0] || null;
    },
    enabled: !!user,
  });

  const { data: assignedPlan } = useQuery({
    queryKey: ['myAssignedMealPlan', clientProfile?.id],
    queryFn: async () => {
      // Get meal plans assigned to this client
      const plans = await base44.entities.MealPlan.filter({ 
        client_id: clientProfile?.id,
        active: true 
      });
      return plans[0] || null;
    },
    enabled: !!clientProfile,
  });

  const mealTypes = ["Early Morning", "Breakfast", "Mid-Morning", "Lunch", "Evening Snack", "Dinner"];

  const groupedMeals = {};
  assignedPlan?.meals?.forEach(meal => {
    if (!groupedMeals[meal.day]) {
      groupedMeals[meal.day] = [];
    }
    groupedMeals[meal.day].push(meal);
  });

  const toggleMealComplete = (day, mealType) => {
    const key = `${day}-${mealType}`;
    setCompletedMeals(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (!clientProfile) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl">
          <CardHeader>
            <CardTitle>No Client Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Your dietitian needs to create your client profile first.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!assignedPlan) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Meal Plan</h1>
            <p className="text-gray-600">Your personalized nutrition plan</p>
          </div>

          <Card className="border-none shadow-xl">
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Meal Plan Assigned Yet
              </h3>
              <p className="text-gray-600 mb-4">
                Your dietitian will create and assign a personalized meal plan for you soon.
              </p>
              <p className="text-sm text-gray-500">
                In the meantime, you can track your MPESS wellness and message your dietitian.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Meal Plan</h1>
            <p className="text-gray-600">Follow your personalized nutrition plan</p>
          </div>
          <Calendar className="w-10 h-10 text-orange-500" />
        </div>

        {/* Plan Overview */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl mb-2">{assignedPlan.name}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-orange-500 text-white">{assignedPlan.duration} Days</Badge>
                  <Badge className="bg-blue-500 text-white capitalize">{assignedPlan.food_preference}</Badge>
                  <Badge className="bg-green-500 text-white capitalize">{assignedPlan.regional_preference}</Badge>
                  <Badge className="bg-purple-500 text-white">{assignedPlan.target_calories} kcal/day</Badge>
                </div>
              </div>
              <Utensils className="w-12 h-12 text-orange-500" />
            </div>
          </CardHeader>
        </Card>

        {/* Daily Meal Plans */}
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
                .map((meal, idx) => {
                  const mealKey = `${day}-${meal.meal_type}`;
                  const isCompleted = completedMeals[mealKey];

                  return (
                    <Card 
                      key={idx} 
                      className={`border-none shadow-lg bg-white/80 backdrop-blur hover:shadow-xl transition-all ${
                        isCompleted ? 'opacity-60' : ''
                      }`}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <Checkbox
                              checked={isCompleted}
                              onCheckedChange={() => toggleMealComplete(day, meal.meal_type)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-orange-600 border-orange-300">
                                  {meal.meal_type}
                                </Badge>
                                {isCompleted && (
                                  <Badge className="bg-green-500 text-white">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Completed
                                  </Badge>
                                )}
                              </div>
                              <CardTitle className={`text-2xl ${isCompleted ? 'line-through text-gray-500' : ''}`}>
                                {meal.meal_name}
                              </CardTitle>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-bold text-orange-600">{meal.calories}</p>
                            <p className="text-xs text-gray-500">kcal</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <ChefHat className="w-4 h-4" />
                            What to Eat
                          </h4>
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
                  );
                })}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}