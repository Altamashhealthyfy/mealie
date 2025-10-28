
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Calendar, ChefHat, Loader2, Plus, Users, Eye, CheckCircle, Copy, AlertTriangle, Zap, Star } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import GeneratedMealPlan from "../components/mealplanner/GeneratedMealPlan";
import UsageLimitWarning from "../components/mealplanner/UsageLimitWarning";

export default function MealPlanner() {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [viewingPlan, setViewingPlan] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [activeTab, setActiveTab] = useState("templates"); // Changed initial tab to "templates"
  const [showAIWarning, setShowAIWarning] = useState(false); // New state for AI generation warning
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

  const { data: mealPlans } = useQuery({ // Removed refetch from here
    queryKey: ['mealPlans'],
    queryFn: () => base44.entities.MealPlan.list('-created_date'),
    enabled: !!user,
    initialData: [],
  });

  // New query for meal plan templates
  const { data: templates } = useQuery({
    queryKey: ['mealPlanTemplates'],
    queryFn: async () => {
      // Fetch templates created by the current user
      const myTemplates = await base44.entities.MealPlanTemplate.filter({ created_by: user?.email });
      // Fetch public templates
      const publicTemplates = await base44.entities.MealPlanTemplate.filter({ is_public: true });
      // Combine and return
      return [...myTemplates, ...publicTemplates];
    },
    enabled: !!user,
    initialData: [],
  });

  // New query for usage tracking
  const { data: usage } = useQuery({
    queryKey: ['usage', user?.email, format(new Date(), 'yyyy-MM')], // Added user?.email and month to queryKey for better invalidation
    queryFn: async () => {
      if (!user?.email) return null; // Ensure user email is available
      const currentMonth = format(new Date(), 'yyyy-MM');
      const usageRecords = await base44.entities.UsageTracking.filter({
        user_email: user?.email,
        month: currentMonth
      });
      // Return existing record or a default one
      return usageRecords[0] || {
        meal_plans_generated: 0,
        plan_limits: { meal_plans: 20, recipes: 50, food_lookups: 50, business_gpts: 10 } // Default limits
      };
    },
    enabled: !!user, // Only run if user is logged in
  });

  // New mutation to save templates
  const saveTemplateMutation = useMutation({
    mutationFn: (templateData) => base44.entities.MealPlanTemplate.create(templateData),
    onSuccess: () => {
      queryClient.invalidateQueries(['mealPlanTemplates']); // Invalidate templates cache
      alert("✅ Template saved! You can now use it unlimited times for FREE!");
    },
  });

  const savePlanMutation = useMutation({
    mutationFn: (planData) => base44.entities.MealPlan.create(planData),
    onSuccess: async () => {
      await queryClient.invalidateQueries(['mealPlans']); // Invalidate mealPlans cache
      setGeneratedPlan(null);
      setSelectedClientId(null);
      alert(`✅ Meal plan assigned successfully!\n\nClient will see it in their "My Meal Plan" page`); // Updated alert message
    },
  });

  // New mutation to update usage
  const updateUsageMutation = useMutation({
    mutationFn: async ({ type }) => {
      if (!user?.email) throw new Error("User email is not available for usage tracking.");
      const currentMonth = format(new Date(), 'yyyy-MM');
      const usageRecords = await base44.entities.UsageTracking.filter({
        user_email: user?.email,
        month: currentMonth
      });
      
      if (usageRecords.length > 0) {
        const current = usageRecords[0];
        return await base44.entities.UsageTracking.update(current.id, {
          meal_plans_generated: (current.meal_plans_generated || 0) + (type === 'meal_plan' ? 1 : 0),
          // Can add other usage types here if needed
        });
      } else {
        // Create new usage record if none exists for the month
        return await base44.entities.UsageTracking.create({
          user_email: user?.email,
          month: currentMonth,
          meal_plans_generated: type === 'meal_plan' ? 1 : 0,
          plan_limits: { meal_plans: 20, recipes: 50, food_lookups: 50, business_gpts: 10 } // Set default limits for new month
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['usage']); // Invalidate usage cache
    },
  });

  const selectedClient = clients.find(c => c.id === selectedClientId);

  // New function to clone a template
  const cloneTemplate = (template) => {
    if (!selectedClient) {
      alert("Please select a client first");
      return;
    }

    setGeneratedPlan({
      plan_name: `${template.name} - ${selectedClient.full_name}`,
      meals: template.meals,
      client_id: selectedClient.id,
      client_name: selectedClient.full_name,
      duration: template.duration,
      meal_pattern: 'daily', // Templates are usually daily, can be adjusted
      food_preference: template.food_preference,
      regional_preference: template.regional_preference,
      target_calories: template.target_calories,
      from_template: true, // Mark this plan as generated from a template
      template_id: template.id // Store template ID for tracking if needed
    });

    // Update template usage count
    // No await needed, fire and forget for UI responsiveness
    base44.entities.MealPlanTemplate.update(template.id, {
      times_used: (template.times_used || 0) + 1
    }).then(() => {
        queryClient.invalidateQueries(['mealPlanTemplates']); // Invalidate templates to reflect usage update
    }).catch(console.error);


    setActiveTab("generate"); // Switch to generate tab to show the cloned plan
  };

  const generateMealPlan = async () => {
    if (!selectedClient) {
      alert("Please select a client first");
      return;
    }

    // Check usage limits before proceeding with AI generation
    const currentUsage = usage?.meal_plans_generated || 0;
    const limit = usage?.plan_limits?.meal_plans || 20;

    if (currentUsage >= limit) {
      setShowAIWarning(true); // Show the warning dialog if limit is reached
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

      // Update usage count after successful generation
      await updateUsageMutation.mutateAsync({ type: 'meal_plan' });

    } catch (error) {
      alert("Error generating meal plan. Please try again.");
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleSavePlan = (editedPlan) => {
    if (!editedPlan) return;
    
    savePlanMutation.mutate({
      client_id: editedPlan.client_id,
      name: editedPlan.plan_name, // Ensure plan_name is passed
      duration: editedPlan.duration,
      meal_pattern: editedPlan.meal_pattern,
      target_calories: editedPlan.target_calories,
      meals: editedPlan.meals,
      food_preference: editedPlan.food_preference,
      regional_preference: editedPlan.regional_preference,
      active: true,
    });
  };

  // New function to save a generated plan as a template
  const handleSaveAsTemplate = (plan) => {
    const templateName = prompt("Enter template name:", `${plan.food_preference} ${plan.target_calories} cal - ${plan.duration} days`);
    if (!templateName) return;

    saveTemplateMutation.mutate({
      name: templateName,
      description: `Template for ${plan.food_preference}, ${plan.target_calories} kcal, ${plan.duration} days`,
      category: "general",
      duration: plan.duration,
      target_calories: plan.target_calories,
      food_preference: plan.food_preference,
      regional_preference: plan.regional_preference,
      meals: plan.meals,
      is_public: false, // Default to private
      times_used: 0,
      created_by: user?.email // Store who created the template
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
            <CardDescription>Add clients before generating meal plans or using templates</CardDescription>
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
            <p className="text-gray-600">Generate or use templates for Indian meal plans</p>
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

        {/* Usage Warning component */}
        <UsageLimitWarning usage={usage} limits={usage?.plan_limits} type="meal_plan" />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur grid grid-cols-3"> {/* Updated grid cols */}
            <TabsTrigger value="templates" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white">
              <Star className="w-4 h-4 mr-2" />
              Templates (FREE!)
            </TabsTrigger>
            <TabsTrigger value="generate" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Plan
            </TabsTrigger>
            <TabsTrigger value="saved" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white">
              <Calendar className="w-4 h-4 mr-2" />
              Assigned Plans ({mealPlans.length})
            </TabsTrigger>
          </TabsList>

          {/* TEMPLATES TAB */}
          <TabsContent value="templates" className="space-y-6">
            {templates.length === 0 ? (
              <Card className="border-none shadow-xl bg-gradient-to-br from-green-50 to-emerald-50">
                <CardContent className="p-12 text-center">
                  <Star className="w-16 h-16 mx-auto text-green-500 mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Create Your First Template!</h3>
                  <p className="text-gray-600 mb-6">Templates save you money - use them unlimited times for FREE!</p>
                  <div className="space-y-2 text-sm text-gray-700 text-left max-w-md mx-auto">
                    <p>✅ Generate 1 AI meal plan (costs ₹10)</p>
                    <p>✅ Save it as template (FREE forever)</p>
                    <p>✅ Use for 100 clients (₹0 instead of ₹1000!)</p>
                  </div>
                  <Button 
                    className="mt-6 bg-gradient-to-r from-green-500 to-emerald-500"
                    onClick={() => setActiveTab("generate")}
                  >
                    Generate Your First Template
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Client Selector for Templates */}
                <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-lg">Select Client to Assign Template</CardTitle>
                    <CardDescription>First, select a client to whom you'd like to assign or customize a template. Then pick a template below.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={selectedClientId || ''}
                      onValueChange={setSelectedClientId}
                    >
                      <SelectTrigger className="h-12">
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
                                <Badge className="text-xs">{client.target_calories} kcal</Badge>
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
                  </CardContent>
                </Card>

                {/* Templates Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template) => (
                    <Card key={template.id} className="border-none shadow-lg bg-white/80 backdrop-blur hover:shadow-xl transition-all">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                          </div>
                          <div className="flex gap-1">
                            {template.is_public && (
                              <Badge className="bg-purple-100 text-purple-700">Public</Badge>
                            )}
                            {template.created_by === user?.email && (
                              <Badge className="bg-blue-100 text-blue-700">My Template</Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge className="bg-orange-100 text-orange-700 capitalize">
                            {template.food_preference}
                          </Badge>
                          <Badge className="bg-blue-100 text-blue-700">
                            {template.target_calories} kcal
                          </Badge>
                          <Badge className="bg-green-100 text-green-700">
                            {template.duration} days
                          </Badge>
                        </div>

                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm font-semibold text-green-900">
                            ✅ Used {template.times_used || 0} times
                          </p>
                          <p className="text-xs text-green-700">FREE - Unlimited uses!</p>
                        </div>

                        <Button
                          onClick={() => cloneTemplate(template)}
                          disabled={!selectedClient}
                          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Clone & Customize
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* GENERATE TAB */}
          <TabsContent value="generate" className="space-y-6">
            {generatedPlan === null && viewingPlan === null ? (
              <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-orange-500" />
                    Generate New Meal Plan with AI
                  </CardTitle>
                  <CardDescription>
                    ⚠️ Costs ₹10 per plan - Use templates instead to save money!
                  </CardDescription>
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
                                <Badge className="text-xs">{client.target_calories} kcal</Badge>
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
                          <SelectItem value="7">7 Days</SelectItem> {/* Changed values */}
                          <SelectItem value="10">10 Days</SelectItem>
                          <SelectItem value="15">15 Days</SelectItem>
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

                  {/* Cost Warning */}
                  <Alert className="border-2 border-yellow-500 bg-yellow-50">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <AlertDescription className="ml-2">
                      <div className="space-y-2">
                        <p className="font-semibold text-yellow-900">💸 This will cost ₹10</p>
                        <p className="text-sm text-yellow-800">
                          You've used {usage?.meal_plans_generated || 0} / {usage?.plan_limits?.meal_plans || 20} AI generations this month
                        </p>
                        <div className="p-3 bg-green-100 border border-green-300 rounded-lg mt-2">
                          <p className="text-sm font-semibold text-green-900 mb-1">💡 Save Money!</p>
                          <p className="text-xs text-green-800">
                            After generating, click "Save as Template" to reuse it FREE unlimited times!
                          </p>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <Button
                    onClick={generateMealPlan}
                    disabled={generating || !selectedClient} // showAIWarning is handled by the dialog
                    className="w-full h-14 text-lg bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Generating Meal Plan...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 mr-2" />
                        Generate with AI (₹10)
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <GeneratedMealPlan 
                plan={viewingPlan || generatedPlan} 
                onSave={viewingPlan ? null : handleSavePlan}
                onSaveAsTemplate={!viewingPlan && generatedPlan?.from_template !== true ? () => handleSaveAsTemplate(generatedPlan) : null} // Only show if not viewing existing plan AND not from template
                onGenerateNew={handleGenerateNew}
                isSaving={savePlanMutation.isPending}
              />
            )}
          </TabsContent>

          {/* SAVED PLANS TAB */}
          <TabsContent value="saved">
            {mealPlans.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Assigned Plans</h3>
                  <p className="text-gray-600 mb-4">Create a new plan or clone a template to get started</p>
                  <Button 
                    onClick={() => setActiveTab("templates")}
                    className="bg-gradient-to-r from-green-500 to-emerald-500"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Browse Templates
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Summary Card Removed as per outline, only individual plan cards remain */}
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
                                <Badge className="bg-gray-100 text-gray-700">{plan.target_calories} kcal</Badge>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-sm text-gray-600">Created</p>
                              <p className="text-sm font-semibold">{format(new Date(plan.created_date), 'MMM d, yyyy')}</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {/* `plan.meals?.length || 0} meals planned` was removed as per outline */}
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

        {/* AI Warning Dialog */}
        <Dialog open={showAIWarning} onOpenChange={setShowAIWarning}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                Monthly Limit Reached!
              </DialogTitle>
              <DialogDescription className="space-y-4 pt-4">
                <p className="text-lg">You've used all {usage?.plan_limits?.meal_plans || 20} AI generations for this month.</p>
                
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                  <p className="font-semibold text-red-900 mb-2">💸 Each additional plan costs ₹10</p>
                  <p className="text-sm text-red-800">This will be added to your monthly bill.</p>
                </div>

                <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                  <p className="font-semibold text-green-900 mb-2">✅ Better Option: Use Templates!</p>
                  <p className="text-sm text-green-800 mb-3">
                    Templates are FREE and unlimited. Clone one and customize in 5 minutes!
                  </p>
                  <Button 
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500"
                    onClick={() => {
                      setShowAIWarning(false);
                      setActiveTab("templates");
                    }}
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Browse Templates (FREE)
                  </Button>
                </div>

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setShowAIWarning(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1 bg-red-500 hover:bg-red-600"
                    onClick={() => {
                      setShowAIWarning(false);
                      // Proceed with generation, this time without the dialog check
                      generateMealPlan(); 
                    }}
                  >
                    Generate Anyway (₹10)
                  </Button>
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
