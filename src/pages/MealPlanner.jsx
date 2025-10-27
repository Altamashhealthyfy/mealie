import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Calendar, ChefHat, Loader2, Plus, Users, Eye, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

import GeneratedMealPlan from "../components/mealplanner/GeneratedMealPlan";

export default function MealPlanner() {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [viewingPlan, setViewingPlan] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [activeTab, setActiveTab] = useState("generate");
  const [planConfig, setPlanConfig] = useState({
    duration: 10,
    meal_pattern: 'daily',
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
    enabled: !!user,
    initialData: [],
  });

  const { data: mealPlans, refetch: refetchPlans } = useQuery({
    queryKey: ['mealPlans'],
    queryFn: () => base44.entities.MealPlan.list('-created_date'),
    enabled: !!user,
    initialData: [],
  });

  const savePlanMutation = useMutation({
    mutationFn: (planData) => base44.entities.MealPlan.create(planData),
    onSuccess: async () => {
      await refetchPlans();
      queryClient.invalidateQueries(['mealPlans']);
      setGeneratedPlan(null);
      setSelectedClientId(null);
      alert(`✅ Meal plan saved successfully!\n\nYou can now:\n1. View it in "Saved Plans" tab\n2. Client will see it in their "My Meal Plan" page`);
    },
  });

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const generateMealPlan = async () => {
    if (!selectedClient) {
      alert("Please select a client first");
      return;
    }

    setGenerating(true);

    try {
      const prompt = `Generate a personalized ${planConfig.duration}-day Indian meal plan with the following details:

Food Preference: ${selectedClient.food_preference}
Regional Preference: ${selectedClient.regional_preference}
Daily Calories: ${selectedClient.target_calories} kcal
Protein: ${selectedClient.target_protein}g
Carbs: ${selectedClient.target_carbs}g
Fats: ${selectedClient.target_fats}g
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
        client_id: selectedClient.id,
        client_name: selectedClient.full_name,
        duration: planConfig.duration,
        meal_pattern: planConfig.meal_pattern,
        food_preference: selectedClient.food_preference,
        regional_preference: selectedClient.regional_preference,
        target_calories: selectedClient.target_calories,
      });
    } catch (error) {
      alert("Error generating meal plan. Please try again.");
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleSavePlan = (editedPlan) => {
    if (!editedPlan) return;

    console.log("Saving plan for client:", editedPlan.client_id);
    
    savePlanMutation.mutate({
      client_id: editedPlan.client_id,
      name: editedPlan.plan_name,
      duration: editedPlan.duration,
      meal_pattern: editedPlan.meal_pattern,
      target_calories: editedPlan.target_calories,
      meals: editedPlan.meals,
      food_preference: editedPlan.food_preference,
      regional_preference: editedPlan.regional_preference,
      active: true,
    });
  };

  const handleGenerateNew = () => {
    setGeneratedPlan(null);
    setGenerating(false);
    setViewingPlan(null);
  };

  const handleViewPlan = (plan) => {
    const client = clients.find(c => c.id === plan.client_id);
    setViewingPlan({
      ...plan,
      plan_name: plan.name,
      client_name: client?.full_name || 'Unknown Client',
      client_id: plan.client_id,
    });
    setActiveTab("generate"); // Switch to generate tab to show the plan
  };

  if (clients.length === 0) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl">
          <CardHeader>
            <CardTitle>No Clients Yet</CardTitle>
            <CardDescription>Add clients before generating meal plans</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => window.location.href = '/client-management'}>
              <Users className="w-4 h-4 mr-2" />
              Add Your First Client
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
            <p className="text-gray-600">Generate personalized Indian meal plans for your clients</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <Calendar className="w-10 h-10 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{mealPlans.length}</p>
                <p className="text-xs text-gray-600">Total Plans</p>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur">
            <TabsTrigger value="generate" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
              <Plus className="w-4 h-4 mr-2" />
              Generate New
            </TabsTrigger>
            <TabsTrigger value="saved" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
              <Calendar className="w-4 h-4 mr-2" />
              Saved Plans ({mealPlans.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6">
            {generatedPlan === null && viewingPlan === null ? (
              <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-orange-500" />
                    Configure Meal Plan
                  </CardTitle>
                  <CardDescription>Select client and plan preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Client Selector */}
                  <div className="space-y-2">
                    <Label htmlFor="client" className="text-base font-semibold flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Select Client *
                    </Label>
                    <Select
                      value={selectedClientId || ''}
                      onValueChange={setSelectedClientId}
                    >
                      <SelectTrigger id="client" className="h-12">
                        <SelectValue placeholder="Choose a client..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => {
                          const clientPlans = mealPlans.filter(p => p.client_id === client.id);
                          const hasActivePlan = clientPlans.some(p => p.active);
                          
                          return (
                            <SelectItem key={client.id} value={client.id}>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{client.full_name}</span>
                                <Badge variant="outline" className="text-xs capitalize">
                                  {client.food_preference}
                                </Badge>
                                {hasActivePlan && (
                                  <Badge className="text-xs bg-green-500">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Has Plan
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Show selected client profile */}
                  {selectedClient && (
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-lg">
                            {selectedClient.full_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{selectedClient.full_name}</h3>
                          <p className="text-sm text-gray-600">{selectedClient.email}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Food:</span>
                          <Badge className="ml-2 capitalize">{selectedClient.food_preference}</Badge>
                        </div>
                        <div>
                          <span className="text-gray-600">Region:</span>
                          <Badge className="ml-2 capitalize">{selectedClient.regional_preference}</Badge>
                        </div>
                        <div>
                          <span className="text-gray-600">Target Calories:</span>
                          <span className="ml-2 font-semibold">{selectedClient.target_calories} kcal</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Goal:</span>
                          <Badge className="ml-2 capitalize">{selectedClient.goal?.replace('_', ' ')}</Badge>
                        </div>
                      </div>
                      
                      {/* Show existing plans for this client */}
                      {mealPlans.filter(p => p.client_id === selectedClient.id).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <p className="text-sm font-medium text-gray-700 mb-2">Existing Plans:</p>
                          <div className="flex flex-wrap gap-2">
                            {mealPlans.filter(p => p.client_id === selectedClient.id).map((plan) => (
                              <Badge key={plan.id} className="bg-blue-100 text-blue-700">
                                {plan.name} ({plan.duration} days)
                                {plan.active && ' ✓'}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration</Label>
                      <Select
                        value={planConfig.duration.toString()}
                        onValueChange={(value) => setPlanConfig({...planConfig, duration: parseInt(value)})}
                      >
                        <SelectTrigger id="duration">
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 Days</SelectItem>
                          <SelectItem value="15">15 Days</SelectItem>
                          <SelectItem value="20">20 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="meal-pattern">Meal Pattern</Label>
                      <Select
                        value={planConfig.meal_pattern}
                        onValueChange={(value) => setPlanConfig({...planConfig, meal_pattern: value})}
                      >
                        <SelectTrigger id="meal-pattern">
                          <SelectValue placeholder="Select meal pattern" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily (Unique each day)</SelectItem>
                          <SelectItem value="3-3-4">3-3-4 Pattern (3+3+4 days rotation)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={generateMealPlan}
                    disabled={generating || !selectedClient}
                    className="w-full h-14 text-lg bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Generating Meal Plan...
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
                      The meal plan will be generated based on the selected client's profile using AI. 
                      It may take 10-20 seconds to create the personalized plan.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            ) : (
              <GeneratedMealPlan 
                plan={viewingPlan || generatedPlan} 
                onSave={viewingPlan ? null : handleSavePlan}
                onGenerateNew={handleGenerateNew}
                isSaving={savePlanMutation.isPending}
              />
            )}
          </TabsContent>

          <TabsContent value="saved">
            {mealPlans.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Saved Plans</h3>
                  <p className="text-gray-600 mb-4">Generate your first meal plan to get started</p>
                  <Button 
                    onClick={() => setActiveTab("generate")}
                    className="bg-gradient-to-r from-orange-500 to-red-500"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Generate First Plan
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">📊 Summary</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-blue-600">Total Plans:</p>
                      <p className="text-2xl font-bold text-blue-900">{mealPlans.length}</p>
                    </div>
                    <div>
                      <p className="text-blue-600">Active Plans:</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {mealPlans.filter(p => p.active).length}
                      </p>
                    </div>
                    <div>
                      <p className="text-blue-600">Clients with Plans:</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {new Set(mealPlans.map(p => p.client_id)).size}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  {mealPlans.map((plan) => {
                    const planClient = clients.find(c => c.id === plan.client_id);
                    return (
                      <Card key={plan.id} className="border-none shadow-lg bg-white/80 backdrop-blur hover:shadow-xl transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                                {plan.active && (
                                  <Badge className="bg-green-500 text-white">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Active
                                  </Badge>
                                )}
                              </div>
                              {planClient ? (
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                                    <span className="text-white font-medium text-sm">
                                      {planClient.full_name.charAt(0)}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">{planClient.full_name}</p>
                                    <p className="text-xs text-gray-600">{planClient.email}</p>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-red-600 mb-3">⚠️ Client not found</p>
                              )}
                              <div className="flex flex-wrap gap-2">
                                <Badge className="bg-orange-100 text-orange-700">{plan.duration} Days</Badge>
                                <Badge className="bg-blue-100 text-blue-700 capitalize">{plan.food_preference}</Badge>
                                <Badge className="bg-green-100 text-green-700 capitalize">{plan.regional_preference}</Badge>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-sm text-gray-600">Target</p>
                              <p className="text-2xl font-bold text-orange-600">{plan.target_calories}</p>
                              <p className="text-xs text-gray-500">kcal/day</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-600 mb-4">
                            {plan.meals?.length || 0} meals planned • Created {format(new Date(plan.created_date), 'MMM d, yyyy')}
                          </p>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              className="flex-1"
                              onClick={() => handleViewPlan(plan)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}