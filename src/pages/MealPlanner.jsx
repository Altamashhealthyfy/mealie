import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Calendar, ChefHat, Loader2, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import GeneratedMealPlan from "../components/mealplanner/GeneratedMealPlan";

export default function MealPlanner() {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [planConfig, setPlanConfig] = useState({
    duration: 10,
    meal_pattern: 'daily',
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ created_by: user?.email });
      return profiles[0] || null;
    },
    enabled: !!user,
  });

  const { data: mealPlans } = useQuery({
    queryKey: ['mealPlans'],
    queryFn: () => base44.entities.MealPlan.list('-created_date'),
    enabled: !!user,
    initialData: [],
  });

  const savePlanMutation = useMutation({
    mutationFn: (planData) => base44.entities.MealPlan.create(planData),
    onSuccess: () => {
      queryClient.invalidateQueries(['mealPlans']);
      setGeneratedPlan(null);
      alert("Meal plan saved successfully!");
    },
  });

  const generateMealPlan = async () => {
    if (!userProfile) {
      alert("Please complete your profile first");
      return;
    }

    setGenerating(true);

    try {
      const prompt = `Generate a personalized ${planConfig.duration}-day Indian meal plan with the following details:

Food Preference: ${userProfile.food_preference}
Regional Preference: ${userProfile.regional_preference}
Daily Calories: ${userProfile.target_calories} kcal
Protein: ${userProfile.target_protein}g
Carbs: ${userProfile.target_carbs}g
Fats: ${userProfile.target_fats}g
Meal Pattern: ${planConfig.meal_pattern}

Create a detailed meal plan with:
- 6 meals per day: Early Morning, Breakfast, Mid-Morning, Lunch, Evening Snack, Dinner
- Use household units (katori, roti, cup, tbsp) - NO GRAMS
- Include macro breakdown (calories, protein, carbs, fats) for each meal
- Add a small nutritional tip for each meal
- Use regional Indian foods based on preference
- Ensure variety - don't repeat meals unless necessary
- For ${planConfig.meal_pattern === '3-3-4' ? 'pattern 3-3-4: create Plan A (3 days), Plan B (3 days), Plan C (4 days)' : 'daily pattern: create unique meals for each day'}

Return the meal plan in a structured format with all days and meals.`;

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

      setGeneratedPlan({
        ...response,
        duration: planConfig.duration,
        meal_pattern: planConfig.meal_pattern,
        food_preference: userProfile.food_preference,
        regional_preference: userProfile.regional_preference,
        target_calories: userProfile.target_calories,
      });
    } catch (error) {
      alert("Error generating meal plan. Please try again.");
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleSavePlan = () => {
    console.log("Saving plan...");
    if (!generatedPlan) return;

    savePlanMutation.mutate({
      name: generatedPlan.plan_name,
      duration: generatedPlan.duration,
      meal_pattern: generatedPlan.meal_pattern,
      target_calories: generatedPlan.target_calories,
      meals: generatedPlan.meals,
      food_preference: generatedPlan.food_preference,
      regional_preference: generatedPlan.regional_preference,
      active: true,
    });
  };

  const handleGenerateNew = () => {
    console.log("Generate New clicked - resetting to form");
    setGeneratedPlan(null);
    setGenerating(false);
  };

  if (!userProfile) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl">
          <CardHeader>
            <CardTitle>Complete Your Profile</CardTitle>
            <CardDescription>Please set up your profile before generating meal plans</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => window.location.href = '/profile'}>
              Go to Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Meal Planner</h1>
            <p className="text-gray-600">Generate personalized Indian meal plans based on your profile</p>
          </div>
          <Calendar className="w-10 h-10 text-orange-500" />
        </div>

        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur">
            <TabsTrigger value="generate" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
              <Plus className="w-4 h-4 mr-2" />
              Generate New
            </TabsTrigger>
            <TabsTrigger value="saved" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
              <Calendar className="w-4 h-4 mr-2" />
              Saved Plans
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6">
            {!generatedPlan ? (
              <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-orange-500" />
                    Configure Your Meal Plan
                  </CardTitle>
                  <CardDescription>Choose your preferences for the meal plan</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Duration</Label>
                      <Select
                        value={planConfig.duration.toString()}
                        onValueChange={(value) => setPlanConfig({...planConfig, duration: parseInt(value)})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 Days</SelectItem>
                          <SelectItem value="15">15 Days</SelectItem>
                          <SelectItem value="20">20 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Meal Pattern</Label>
                      <Select
                        value={planConfig.meal_pattern}
                        onValueChange={(value) => setPlanConfig({...planConfig, meal_pattern: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily (Unique each day)</SelectItem>
                          <SelectItem value="3-3-4">3-3-4 Pattern (3+3+4 days rotation)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl">
                    <h3 className="font-semibold text-gray-900 mb-3">Your Profile Summary</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Food:</span>
                        <Badge className="ml-2 capitalize">{userProfile.food_preference}</Badge>
                      </div>
                      <div>
                        <span className="text-gray-600">Region:</span>
                        <Badge className="ml-2 capitalize">{userProfile.regional_preference}</Badge>
                      </div>
                      <div>
                        <span className="text-gray-600">Target Calories:</span>
                        <span className="ml-2 font-semibold">{userProfile.target_calories} kcal</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Macros:</span>
                        <span className="ml-2 font-semibold">
                          P: {userProfile.target_protein}g | C: {userProfile.target_carbs}g | F: {userProfile.target_fats}g
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={generateMealPlan}
                    disabled={generating}
                    className="w-full h-14 text-lg bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Generating Your Meal Plan...
                      </>
                    ) : (
                      <>
                        <ChefHat className="w-5 h-5 mr-2" />
                        Generate Meal Plan
                      </>
                    )}
                  </Button>

                  <Alert className="border-orange-200 bg-orange-50">
                    <Sparkles className="w-4 h-4 text-orange-600" />
                    <AlertDescription className="text-gray-700">
                      Your meal plan will be generated based on your profile using AI. 
                      It may take 10-20 seconds to create your personalized plan.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            ) : (
              <GeneratedMealPlan 
                plan={generatedPlan} 
                onSave={handleSavePlan}
                onGenerateNew={handleGenerateNew}
                isSaving={savePlanMutation.isPending}
              />
            )}
          </TabsContent>

          <TabsContent value="saved">
            <div className="grid gap-4">
              {mealPlans.length === 0 ? (
                <Card className="border-none shadow-lg">
                  <CardContent className="p-12 text-center">
                    <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Saved Plans</h3>
                    <p className="text-gray-600 mb-4">Generate your first meal plan to get started</p>
                  </CardContent>
                </Card>
              ) : (
                mealPlans.map((plan) => (
                  <Card key={plan.id} className="border-none shadow-lg bg-white/80 backdrop-blur hover:shadow-xl transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                          <div className="flex flex-wrap gap-2">
                            <Badge className="bg-orange-100 text-orange-700">{plan.duration} Days</Badge>
                            <Badge className="bg-blue-100 text-blue-700 capitalize">{plan.food_preference}</Badge>
                            <Badge className="bg-green-100 text-green-700 capitalize">{plan.regional_preference}</Badge>
                            {plan.active && <Badge className="bg-purple-100 text-purple-700">Active</Badge>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Target</p>
                          <p className="text-2xl font-bold text-orange-600">{plan.target_calories}</p>
                          <p className="text-xs text-gray-500">kcal/day</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-4">
                        {plan.meals?.length || 0} meals planned across {plan.duration} days
                      </p>
                      <Button variant="outline" className="w-full">
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}