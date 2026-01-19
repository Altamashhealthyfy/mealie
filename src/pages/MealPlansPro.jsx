import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Loader2, Users, AlertTriangle, CheckCircle, FileText, Heart, Brain, Activity, Star, Edit, Copy } from "lucide-react";
import { createPageUrl } from "@/utils";
import ManualMealPlanBuilder from "@/components/mealplanner/ManualMealPlanBuilder";

export default function MealPlansPro() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const preSelectedClientId = searchParams.get('client');
  
  const [selectedClientId, setSelectedClientId] = useState(preSelectedClientId || null);
  const [activeTab, setActiveTab] = useState("generate");
  const [generating, setGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: coachSubscription } = useQuery({
    queryKey: ['coachSubscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.HealthCoachSubscription.filter({ 
        coach_email: user?.email,
        status: 'active'
      });
      return subs[0] || null;
    },
    enabled: !!user && user.user_type === 'student_coach',
  });

  const { data: coachPlan } = useQuery({
    queryKey: ['coachPlan', coachSubscription?.plan_id],
    queryFn: async () => {
      const plan = await base44.entities.HealthCoachPlan.filter({ 
        id: coachSubscription?.plan_id 
      });
      return plan[0] || null;
    },
    enabled: !!coachSubscription?.plan_id,
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list('-created_date');
      if (user?.user_type === 'super_admin') {
        return allClients;
      }
      if (user?.user_type === 'student_coach') {
        return allClients.filter(client => 
          client.created_by === user?.email || 
          client.assigned_coach === user?.email
        );
      }
      return allClients.filter(client => client.created_by === user?.email);
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: clinicalIntakes } = useQuery({
    queryKey: ['clinicalIntakes', selectedClientId],
    queryFn: () => base44.entities.ClinicalIntake.filter({ client_id: selectedClientId }),
    enabled: !!selectedClientId,
    initialData: [],
  });

  const { data: proMealPlans } = useQuery({
    queryKey: ['proMealPlans'],
    queryFn: async () => {
      const allPlans = await base44.entities.MealPlan.list('-created_date');
      return allPlans.filter(plan => plan.plan_tier === 'advanced');
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: templates } = useQuery({
    queryKey: ['proTemplates'],
    queryFn: async () => {
      const myTemplates = await base44.entities.MealPlanTemplate.filter({ 
        created_by: user?.email,
        category: { $in: ['diabetes', 'pcos', 'thyroid', 'kidney', 'heart'] } // Added more categories as per common clinical needs
      });
      const publicTemplates = await base44.entities.MealPlanTemplate.filter({ 
        is_public: true,
        category: { $in: ['diabetes', 'pcos', 'thyroid', 'kidney', 'heart'] }
      });
      return [...myTemplates, ...publicTemplates];
    },
    enabled: !!user,
    initialData: [],
  });

  const savePlanMutation = useMutation({
    mutationFn: (planData) => base44.entities.MealPlan.create(planData),
    onSuccess: () => {
      queryClient.invalidateQueries(['proMealPlans']);
      setGeneratedPlan(null);
      alert('✅ Pro meal plan saved and assigned successfully!');
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: (templateData) => base44.entities.MealPlanTemplate.create(templateData),
    onSuccess: () => {
      queryClient.invalidateQueries(['proTemplates']);
      alert("✅ Pro template saved! You can now use it unlimited times for FREE!");
    },
  });

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const latestIntake = clinicalIntakes?.[0];
  const hasCompletedIntake = latestIntake?.completed;

  const generateProPlan = async () => {
    if (!selectedClient || !latestIntake) {
      alert('Please ensure client has completed clinical intake');
      return;
    }

    setGenerating(true);

    try {
      const prompt = constructDiamondPrompt(selectedClient, latestIntake);
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            decision_rules: { type: "array", items: { type: "string" } },
            conflict_resolution: { type: "string" },
            calculations: {
              type: "object",
              properties: {
                bmr: { type: "number" },
                tdee: { type: "number" },
                target_calories: { type: "number" },
                macros: {
                  type: "object",
                  properties: {
                    carbs_g: { type: "number" },
                    protein_g: { type: "number" },
                    fats_g: { type: "number" }
                  }
                }
              }
            },
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
                  sodium: { type: "number" },
                  potassium: { type: "number" },
                  disease_rationale: { type: "string" }
                }
              }
            },
            mpess_integration: {
              type: "object",
              properties: {
                mind: { type: "array", items: { type: "string" } },
                physical: { type: "array", items: { type: "string" } },
                emotional: { type: "array", items: { type: "string" } },
                social: { type: "array", items: { type: "string" } },
                spiritual: { type: "array", items: { type: "string" } }
              }
            },
            audit_snapshot: {
              type: "object",
              properties: {
                avg_calories_per_day: { type: "number" },
                calorie_range: { type: "string" },
                macro_percentages: {
                  type: "object",
                  properties: {
                    carbs: { type: "number" },
                    protein: { type: "number" },
                    fats: { type: "number" }
                  }
                },
                sodium_compliance: { type: "string" },
                potassium_compliance: { type: "string" },
                medication_conflicts: { type: "boolean" },
                variety_check: { type: "boolean" },
                mpess_integrated: { type: "boolean" }
              }
            }
          }
        }
      });

      setGeneratedPlan({
        ...response,
        client_id: selectedClient.id,
        client_name: selectedClient.full_name
      });

    } catch (error) {
      console.error(error);
      alert('Error generating meal plan. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSavePlan = () => {
    if (!generatedPlan) return;

    savePlanMutation.mutate({
      client_id: generatedPlan.client_id,
      name: `Diamond Clinical Plan - ${generatedPlan.client_name}`,
      plan_tier: 'advanced',
      duration: 10,
      meal_pattern: '3-3-4',
      target_calories: generatedPlan.calculations.target_calories,
      disease_focus: latestIntake?.health_conditions || [], // Use latestIntake for disease_focus or default to empty array
      meals: generatedPlan.meal_plan,
      food_preference: latestIntake?.diet_type?.toLowerCase() || 'general', // Use latestIntake for diet_type or default
      active: true,
      mpess_integration: {
        mind_practices: generatedPlan.mpess_integration.mind,
        physical_practices: generatedPlan.mpess_integration.physical,
        emotional_practices: generatedPlan.mpess_integration.emotional,
        social_practices: generatedPlan.mpess_integration.social,
        spiritual_practices: generatedPlan.mpess_integration.spiritual
      },
      audit_snapshot: generatedPlan.audit_snapshot,
      decision_rules_applied: generatedPlan.decision_rules,
      conflict_resolution: generatedPlan.conflict_resolution,
      created_by: user?.email
    });
  };

  const handleSaveAsProTemplate = (plan) => {
    const templateName = prompt("Enter Pro template name:", `Pro ${latestIntake?.health_conditions?.join('+') || 'Clinical'} Plan - ${plan.calculations.target_calories} cal`);
    if (!templateName) return;

    saveTemplateMutation.mutate({
      name: templateName,
      description: `Disease-specific template for ${latestIntake?.health_conditions?.join(', ') || 'various conditions'}`,
      category: latestIntake?.health_conditions?.[0]?.toLowerCase() || 'general',
      duration: 10,
      target_calories: plan.calculations.target_calories,
      food_preference: latestIntake?.diet_type?.toLowerCase() || 'general',
      regional_preference: 'all',
      meals: plan.meal_plan,
      is_public: false,
      times_used: 0,
      tags: ['pro', 'disease-specific', ...(latestIntake?.health_conditions || [])],
      created_by: user?.email
    });
  };

  const cloneProTemplate = (template) => {
    if (!selectedClient) {
      alert("Please select a client first");
      return;
    }

    setGeneratedPlan({
      plan_name: `${template.name} - ${selectedClient.full_name}`,
      meal_plan: template.meals,
      client_id: selectedClient.id,
      client_name: selectedClient.full_name,
      // Default calculations/audit for cloned templates as AI doesn't generate these for templates
      calculations: {
        target_calories: template.target_calories || 0,
        bmr: 0,
        tdee: 0,
        macros: { carbs_g: 0, protein_g: 0, fats_g: 0 }
      },
      decision_rules: ['Template-based plan'],
      conflict_resolution: 'From template',
      mpess_integration: { mind: [], physical: [], emotional: [], social: [], spiritual: [] }, // MPESS might be empty in templates
      audit_snapshot: {
        avg_calories_per_day: template.target_calories || 0,
        calorie_range: 'Template-based',
        macro_percentages: { carbs: 0, protein: 0, fats: 0 }, // Placeholder values
        sodium_compliance: 'Check required',
        potassium_compliance: 'Check required',
        medication_conflicts: false,
        variety_check: true,
        mpess_integrated: false
      },
      from_template: true, // Flag to indicate it's from a template
      template_id: template.id
    });

    base44.entities.MealPlanTemplate.update(template.id, {
      times_used: (template.times_used || 0) + 1
    }).then(() => {
      queryClient.invalidateQueries(['proTemplates']);
    }).catch(console.error);

    setActiveTab("generate");
  };

  const handleManualSave = (planData) => {
    if (!selectedClient) {
      alert("Please select a client first before saving a manual plan.");
      return;
    }

    savePlanMutation.mutate({
      ...planData,
      plan_tier: 'advanced',
      name: `Manual Pro Plan - ${selectedClient.full_name}`,
      client_id: selectedClient.id,
      created_by: user?.email
    });
  };

  // Check access for student coaches
  const isSuperAdmin = user?.user_type === 'super_admin';
  const isStudentCoach = user?.user_type === 'student_coach';
  
  // Pro Plans access controlled by plan feature
  const hasProAccess = isSuperAdmin || (isStudentCoach && coachSubscription && coachPlan?.can_access_pro_plans);

  if (isStudentCoach && !hasProAccess) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50">
        <Card className="max-w-md border-none shadow-xl bg-white">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              Pro Plans Access Restricted
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-800">
              💎 Mealie Pro (Disease-Specific Clinical Meal Planning) is only available on plans that include this feature.
            </p>
            <Alert className="bg-purple-50 border-purple-500">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <AlertDescription>
                <strong>Upgrade to a plan with Pro Plans access</strong> to unlock:
                <ul className="list-disc ml-4 mt-2">
                  <li>Disease-specific meal plans</li>
                  <li>Clinical intake integration</li>
                  <li>MPESS wellness practices</li>
                  <li>10-day rotation plans</li>
                  <li>Audit compliance tracking</li>
                </ul>
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => window.location.href = createPageUrl('CoachSubscriptions')}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-500"
            >
              View Subscription Plans
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-purple-50 to-indigo-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">💎 Mealie Pro</h1>
            <p className="text-gray-600">Disease-Specific Clinical Meal Planning</p>
          </div>
          <Badge className="bg-purple-600 text-white text-lg px-4 py-2">
            Advanced Tier
          </Badge>
        </div>

        <Alert className="bg-gradient-to-r from-purple-100 to-indigo-100 border-purple-300">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <AlertDescription>
            <strong>Pro Features:</strong> 10-day rotation plans (3-3-4 pattern) • Disease-specific rationales • MPESS integration • Lab value tracking • Medication management • Audit compliance
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur grid grid-cols-4">
            <TabsTrigger value="templates">
              <Star className="w-4 h-4 mr-2" />
              Pro Templates
            </TabsTrigger>
            <TabsTrigger value="manual">
              <Edit className="w-4 h-4 mr-2" />
              Manual
            </TabsTrigger>
            <TabsTrigger value="generate">
              <Sparkles className="w-4 h-4 mr-2" />
              AI Generate
            </TabsTrigger>
            <TabsTrigger value="saved">
              <FileText className="w-4 h-4 mr-2" />
              My Plans ({proMealPlans.length})
            </TabsTrigger>
          </TabsList>

          {/* PRO TEMPLATES TAB */}
          <TabsContent value="templates" className="space-y-6">
            {templates.length === 0 ? (
              <Card className="border-none shadow-xl bg-gradient-to-br from-purple-50 to-pink-50">
                <CardContent className="p-12 text-center">
                  <Star className="w-16 h-16 mx-auto text-purple-500 mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Create Your First Pro Template!</h3>
                  <p className="text-gray-600 mb-6">Save disease-specific plans as templates for reuse!</p>
                  <Button 
                    className="bg-gradient-to-r from-purple-500 to-indigo-500"
                    onClick={() => setActiveTab("generate")}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Your First Pro Template
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-lg">Select Client for Pro Template</CardTitle>
                    <CardDescription>Choose a client to assign or customize a disease-specific template</CardDescription>
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
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{client.full_name}</span>
                              <Badge variant="outline" className="text-xs capitalize">
                                {client.food_preference}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template) => (
                    <Card key={template.id} className="border-none shadow-lg bg-white/80 backdrop-blur hover:shadow-xl transition-all">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                          </div>
                          <Badge className="bg-purple-600 text-white">💎 Pro</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge className="bg-red-100 text-red-700 capitalize">
                            {template.category}
                          </Badge>
                          <Badge className="bg-orange-100 text-orange-700">
                            {template.target_calories} kcal
                          </Badge>
                          <Badge className="bg-green-100 text-green-700">
                            {template.duration} days
                          </Badge>
                        </div>

                        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <p className="text-sm font-semibold text-purple-900">
                            ✅ Used {template.times_used || 0} times
                          </p>
                          <p className="text-xs text-purple-700">FREE - Unlimited uses!</p>
                        </div>

                        <Button
                          onClick={() => cloneProTemplate(template)}
                          disabled={!selectedClient}
                          className="w-full bg-gradient-to-r from-purple-500 to-indigo-500"
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

          {/* MANUAL TAB */}
          <TabsContent value="manual" className="space-y-6">
            {!selectedClientId ? (
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Select Client for Manual Pro Plan</CardTitle>
                  <CardDescription>Choose a client to build a disease-specific meal plan manually</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={selectedClientId || ''} onValueChange={setSelectedClientId}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Choose a client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{client.full_name}</span>
                            <Badge variant="outline" className="text-xs capitalize">
                              {client.food_preference}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            ) : (
              <>
                <Alert className="bg-purple-50 border-purple-500">
                  <AlertDescription>
                    <strong>💎 Pro Manual Builder:</strong> Build disease-specific meal plans with full control. All AI-powered nutrition lookups included!
                  </AlertDescription>
                </Alert>
                <ManualMealPlanBuilder
                  client={selectedClient}
                  onSave={handleManualSave}
                  isSaving={savePlanMutation.isPending}
                />
              </>
            )}
          </TabsContent>

          {/* AI GENERATE TAB */}
          <TabsContent value="generate" className="space-y-6">
            {!generatedPlan ? (
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                  <CardTitle className="text-2xl">Generate Diamond Clinical Meal Plan</CardTitle>
                  <CardDescription className="text-white/90">
                    Based on detailed clinical intake with disease-specific guidelines
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Client Selection */}
                  <div className="space-y-2">
                    <label className="text-base font-semibold flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Select Client *
                    </label>
                    <Select
                      value={selectedClientId || ''}
                      onValueChange={setSelectedClientId}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Choose a client..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{client.full_name}</span>
                              {client.plan_tier === 'advanced' && (
                                <Badge className="bg-purple-100 text-purple-700">Pro</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Show client info and intake status */}
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

                      {hasCompletedIntake ? (
                        <Alert className="bg-green-50 border-green-500">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <AlertDescription>
                            <strong>Clinical intake completed!</strong><br/>
                            Health Conditions: {latestIntake.health_conditions.join(', ')}<br/>
                            Diet Type: {latestIntake.diet_type}<br/>
                            Goal: {latestIntake.goal}
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert className="bg-orange-50 border-orange-500">
                          <AlertTriangle className="w-4 h-4 text-orange-600" />
                          <AlertDescription>
                            <strong>Clinical intake not completed.</strong><br/>
                            Please complete the clinical intake form first.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {selectedClient && !hasCompletedIntake && (
                    <Button
                      onClick={() => window.location.href = `/#/ClinicalIntake?clientId=${selectedClient.id}`}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 h-12"
                    >
                      <FileText className="w-5 h-5 mr-2" />
                      Fill Clinical Intake Form
                    </Button>
                  )}

                  {selectedClient && hasCompletedIntake && (
                    <Button
                      onClick={generateProPlan}
                      disabled={generating}
                      className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 h-14 text-lg"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Generating Diamond Plan...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 mr-2" />
                          Generate Pro Plan (10 Days)
                        </>
                      )}
                    </Button>
                  )}

                  {/* Info about Pro features */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-semibold text-purple-900 mb-2">🎯 Disease-Specific Rules</h4>
                      <p className="text-sm text-gray-700">
                        Follows clinical guidelines for diabetes, thyroid, kidney, heart, and hormonal conditions with conflict resolution hierarchy.
                      </p>
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-lg">
                      <h4 className="font-semibold text-indigo-900 mb-2">🔄 3-3-4 Rotation</h4>
                      <p className="text-sm text-gray-700">
                        10-day plan with Plan A (days 1-3), Plan B (days 4-6), Plan C (days 7-10) for variety and convenience.
                      </p>
                    </div>
                    <div className="p-4 bg-pink-50 rounded-lg">
                      <h4 className="font-semibold text-pink-900 mb-2">🧘 MPESS Integration</h4>
                      <p className="text-sm text-gray-700">
                        Holistic wellness practices for Mind, Physical, Emotional, Social, and Spiritual health.
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-semibold text-green-900 mb-2">📊 Audit Compliance</h4>
                      <p className="text-sm text-gray-700">
                        Automatic tracking of sodium, potassium, medication conflicts, and RDA compliance (90-250% range).
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Show Generated Plan */
              <div className="space-y-6">
                {/* Decision Rules */}
                <Card className="border-none shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                    <CardTitle>✅ Decision Rules Applied</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ul className="space-y-2">
                      {generatedPlan.decision_rules.map((rule, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{rule}</span>
                        </li>
                      ))}
                    </ul>
                    {generatedPlan.conflict_resolution && (
                      <Alert className="mt-4 bg-blue-50 border-blue-500">
                        <AlertDescription>
                          <strong>Conflict Resolution:</strong> {generatedPlan.conflict_resolution}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                {/* Calculations */}
                <Card className="border-none shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                    <CardTitle>📊 Nutritional Calculations</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">BMR</p>
                        <p className="text-2xl font-bold text-blue-600">{generatedPlan.calculations.bmr}</p>
                        <p className="text-xs text-gray-500">kcal/day</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">TDEE</p>
                        <p className="text-2xl font-bold text-cyan-600">{generatedPlan.calculations.tdee}</p>
                        <p className="text-xs text-gray-500">kcal/day</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Target Calories</p>
                        <p className="text-2xl font-bold text-orange-600">{generatedPlan.calculations.target_calories}</p>
                        <p className="text-xs text-gray-500">kcal/day</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Macros (C/P/F)</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {generatedPlan.calculations.macros.carbs_g}/{generatedPlan.calculations.macros.protein_g}/{generatedPlan.calculations.macros.fats_g}
                        </p>
                        <p className="text-xs text-gray-500">grams</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 10-Day Meal Plan */}
                <Card className="border-none shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                    <CardTitle>🍽️ 10-Day Meal Plan (3-3-4 Rotation)</CardTitle>
                    <CardDescription className="text-white/90">
                      Plan A: Days 1-3 | Plan B: Days 4-6 | Plan C: Days 7-10
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <Tabs defaultValue="1" className="space-y-4">
                      <TabsList className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(day => (
                          <TabsTrigger key={day} value={day.toString()}>
                            Day {day}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(day => (
                        <TabsContent key={day} value={day.toString()} className="space-y-4">
                          {generatedPlan.meal_plan
                            .filter(meal => meal.day === day)
                            .map((meal, index) => (
                              <Card key={index} className="bg-gradient-to-br from-gray-50 to-white">
                                <CardHeader>
                                  <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg capitalize">{meal.meal_type.replace('_', ' ')}</CardTitle>
                                    <Badge>{meal.calories} kcal</Badge>
                                  </div>
                                  <p className="text-xl font-bold text-gray-900">{meal.meal_name}</p>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  <div>
                                    <p className="font-semibold text-gray-700 mb-2">Food Items:</p>
                                    {meal.items.map((item, i) => (
                                      <div key={i} className="flex justify-between text-sm">
                                        <span>{item}</span>
                                        <span className="text-gray-600">{meal.portion_sizes[i]}</span>
                                      </div>
                                    ))}
                                  </div>
                                  
                                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2 pt-2 border-t">
                                    <div className="text-center">
                                      <p className="text-xs text-gray-600">Protein</p>
                                      <p className="font-bold text-red-600">{meal.protein}g</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-xs text-gray-600">Carbs</p>
                                      <p className="font-bold text-yellow-600">{meal.carbs}g</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-xs text-gray-600">Fats</p>
                                      <p className="font-bold text-purple-600">{meal.fats}g</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-xs text-gray-600">Sodium</p>
                                      <p className="font-bold text-blue-600">{meal.sodium}mg</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-xs text-gray-600">Potassium</p>
                                      <p className="font-bold text-green-600">{meal.potassium}mg</p>
                                    </div>
                                  </div>

                                  {meal.disease_rationale && (
                                    <Alert className="bg-green-50 border-green-500">
                                      <AlertDescription>
                                        <strong>Why this meal?</strong> {meal.disease_rationale}
                                      </AlertDescription>
                                    </Alert>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                        </TabsContent>
                      ))}
                    </Tabs>
                  </CardContent>
                </Card>

                {/* MPESS Integration */}
                {generatedPlan.mpess_integration && (
                  <Card className="border-none shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-pink-500 to-rose-500 text-white">
                      <CardTitle>🧘 MPESS Wellness Practices</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <Tabs defaultValue="mind" className="space-y-4">
                        <TabsList className="grid grid-cols-5">
                          <TabsTrigger value="mind"><Brain className="w-4 h-4" /></TabsTrigger>
                          <TabsTrigger value="physical"><Activity className="w-4 h-4" /></TabsTrigger>
                          <TabsTrigger value="emotional"><Heart className="w-4 h-4" /></TabsTrigger>
                          <TabsTrigger value="social"><Users className="w-4 h-4" /></TabsTrigger>
                          <TabsTrigger value="spiritual"><Sparkles className="w-4 h-4" /></TabsTrigger>
                        </TabsList>

                        {Object.entries(generatedPlan.mpess_integration).map(([key, practices]) => (
                          <TabsContent key={key} value={key} className="space-y-2">
                            <h3 className="font-bold text-lg capitalize">{key} Practices</h3>
                            {practices.map((practice, index) => (
                              <div key={index} className="p-3 bg-purple-50 rounded-lg">
                                <p>{practice}</p>
                              </div>
                            ))}
                          </TabsContent>
                        ))}
                      </Tabs>
                    </CardContent>
                  </Card>
                )}

                {/* Audit Snapshot */}
                <Card className="border-none shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
                    <CardTitle>📊 Audit & Compliance Snapshot</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Avg Calories/Day</p>
                        <p className="text-xl font-bold">{generatedPlan.audit_snapshot.avg_calories_per_day} kcal</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Calorie Range</p>
                        <p className="text-xl font-bold">{generatedPlan.audit_snapshot.calorie_range}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Macro Split</p>
                        <p className="text-xl font-bold">
                          {generatedPlan.audit_snapshot.macro_percentages.carbs}% / 
                          {generatedPlan.audit_snapshot.macro_percentages.protein}% / 
                          {generatedPlan.audit_snapshot.macro_percentages.fats}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Sodium</p>
                        <p className="text-sm font-bold">{generatedPlan.audit_snapshot.sodium_compliance}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Potassium</p>
                        <p className="text-sm font-bold">{generatedPlan.audit_snapshot.potassium_compliance}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Variety</p>
                        <p className="text-sm font-bold">
                          {generatedPlan.audit_snapshot.variety_check ? '✓ >20 items' : '⚠ Limited'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setGeneratedPlan(null)}
                  >
                    Generate New Plan
                  </Button>
                  {!generatedPlan.from_template && ( // Only show "Save as Template" if not generated from a template
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleSaveAsProTemplate(generatedPlan)}
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Save as Pro Template
                    </Button>
                  )}
                  <Button
                    className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 h-14 text-lg"
                    onClick={handleSavePlan}
                    disabled={savePlanMutation.isPending}
                  >
                    {savePlanMutation.isPending ? 'Saving...' : 'Save & Assign to Client'}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* SAVED PLANS TAB */}
          <TabsContent value="saved">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>My Pro Plans ({proMealPlans.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {proMealPlans.length === 0 ? (
                  <p className="text-center text-gray-500 py-12">No Pro plans created yet</p>
                ) : (
                  <div className="space-y-4">
                    {proMealPlans.map(plan => {
                      const planClient = clients.find(c => c.id === plan.client_id);
                      return (
                        <Card key={plan.id} className="bg-purple-50">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle>{plan.name}</CardTitle>
                                <p className="text-sm text-gray-600">{planClient?.full_name}</p>
                              </div>
                              <Badge className="bg-purple-600">Diamond</Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline">10 Days</Badge>
                              <Badge variant="outline">3-3-4 Rotation</Badge>
                              {plan.disease_focus?.map(disease => (
                                <Badge key={disease} className="bg-red-100 text-red-700">
                                  {disease}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Helper function to construct Diamond GPT prompt
function constructDiamondPrompt(client, intake) {
  const activityMultipliers = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extremely_active: 1.9
  };

  const bmr = client.gender === 'male'
    ? (10 * client.weight) + (6.25 * client.height) - (5 * client.age) + 5
    : (10 * client.weight) + (6.25 * client.height) - (5 * client.age) - 161;

  const tdee = bmr * activityMultipliers[client.activity_level];

  // Format medications safely without nested template literals
  const medsText = intake.current_medications
    .map(m => m.name + ' (' + m.dosage + ')')
    .join(', ');

  const labValuesText = Object.entries(intake.lab_values)
    .map(([key, val]) => '- ' + key + ': ' + val)
    .join('\n');

  return `# Diamond Clinical Meal Plan GPT

Generate a **disease-specific holistic 10-day meal plan** with 3-3-4 rotation pattern.

## CLIENT INTAKE DATA:
Name: ${client.full_name}
Age: ${client.age}
Gender: ${client.gender}
Height: ${client.height} cm
Weight: ${client.weight} kg
BMI: ${intake.basic_info.bmi}
Activity Level: ${client.activity_level}

Health Conditions: ${intake.health_conditions.join(', ')}
Stage/Severity: ${intake.stage_severity || 'Not specified'}
Current Medications: ${medsText}

Lab Values:
${labValuesText}

Diet Type: ${intake.diet_type}
Likes: ${intake.likes_dislikes_allergies.likes.join(', ')}
Dislikes: ${intake.likes_dislikes_allergies.dislikes.join(', ')}
Allergies: ${intake.likes_dislikes_allergies.allergies.join(', ')}
No-Go Foods: ${intake.likes_dislikes_allergies.no_go_foods.join(', ')}

Daily Routine:
- Breakfast: ${intake.daily_routine.breakfast_time}
- Lunch: ${intake.daily_routine.lunch_time}
- Dinner: ${intake.daily_routine.dinner_time}

Goal: ${intake.goal}
Symptom Goals: ${intake.symptom_goals.join(', ')}

BMR: ${Math.round(bmr)} kcal
TDEE: ${Math.round(tdee)} kcal

---

## REQUIREMENTS:

1. Apply disease-specific rules for: ${intake.health_conditions.join(', ')}
2. Generate 10-day plan with 3-3-4 rotation (Plan A: days 1-3, Plan B: days 4-6, Plan C: days 7-10)
3. Each day has 8 meals: Early Morning, Breakfast, Mid-Morning, Lunch, Evening Snack, Dinner, Post Dinner, Bedtime
4. For each meal provide: meal_name, items, portion_sizes (Indian units), calories, protein, carbs, fats, sodium, potassium, disease_rationale
5. Include MPESS practices for: ${Object.entries(intake.mpess_preferences).filter(([k,v]) => v).map(([k]) => k).join(', ')}
6. Provide audit snapshot with compliance tracking
7. List decision rules applied
8. Handle conflicts with hierarchy: Kidney > Diabetes > Heart > Thyroid

Return structured JSON with decision_rules, calculations, meal_plan array, mpess_integration, and audit_snapshot.`;
}