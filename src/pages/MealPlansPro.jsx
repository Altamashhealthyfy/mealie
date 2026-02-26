import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Loader2, Users, AlertTriangle, CheckCircle, FileText, Heart, Brain, Activity, Star, Edit, Copy, Upload, Wand2, X } from "lucide-react";
import { createPageUrl } from "@/utils";
import ManualMealPlanBuilder from "@/components/mealplanner/ManualMealPlanBuilder";
import { Input } from "@/components/ui/input";
import ProMealPlanChatModifier from "@/components/pro/ProMealPlanChatModifier";
import RecipeScaler from "@/components/mealplanner/RecipeScaler";
import FoodPreferenceForm from "@/components/mealplanner/FoodPreferenceForm";
import ExtraMealAdder from "@/components/pro/ExtraMealAdder";
import { toast } from "sonner";

export default function MealPlansPro() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const preSelectedClientId = searchParams.get('client');
  
  const [selectedClientId, setSelectedClientId] = useState(preSelectedClientId || null);
  const [activeTab, setActiveTab] = useState("generate");
  const [generating, setGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedMeals, setEditedMeals] = useState([]);
  const [mealPattern, setMealPattern] = useState("3-3-4");
  const [numberOfDays, setNumberOfDays] = useState(10);
  const [showFoodPreferences, setShowFoodPreferences] = useState(false);
  const [foodPreferences, setFoodPreferences] = useState(null);
  const [medicalReportFile, setMedicalReportFile] = useState(null);
  const [extractingReport, setExtractingReport] = useState(false);
  const [extractedReportData, setExtractedReportData] = useState(null);

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
      setSelectedClientId(null);
      setActiveTab("templates");
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

  // Debug logs
  React.useEffect(() => {
    console.log('=== DEBUG INFO ===');
    console.log('selectedClientId:', selectedClientId);
    console.log('selectedClient:', selectedClient);
    console.log('clinicalIntakes:', clinicalIntakes);
    console.log('latestIntake:', latestIntake);
    console.log('hasCompletedIntake:', hasCompletedIntake);
    console.log('==================');
  }, [selectedClientId, selectedClient, clinicalIntakes, latestIntake, hasCompletedIntake]);

  const handleMedicalReportUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMedicalReportFile(file);
    setExtractingReport(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a clinical dietitian assistant. Extract all relevant medical/clinical data from this report/document and return structured JSON.

Extract these fields if present:
- health_conditions: array (e.g. ["Diabetes", "Thyroid", "Hypertension"])
- lab_values: object with keys like hba1c, tsh, total_cholesterol, ldl, hdl, triglycerides, creatinine, vitamin_d, vitamin_b12, urea, gfr, sodium, potassium, sgot, sgpt, uric_acid
- current_medications: array of { name, dosage, frequency }
- basic_info: { age, gender, height_cm, weight_kg, bmi, activity_level }
- diet_type: string (Veg/Non-Veg/Vegan/Jain/Eggetarian)
- stage_severity: string
- goal: array (e.g. ["weight_loss", "disease_reversal"])
- additional_notes: string (any other relevant clinical notes)

Return ONLY valid JSON, no explanation.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            health_conditions: { type: "array", items: { type: "string" } },
            lab_values: { type: "object" },
            current_medications: { type: "array", items: { type: "object" } },
            basic_info: { type: "object" },
            diet_type: { type: "string" },
            stage_severity: { type: "string" },
            goal: { type: "array", items: { type: "string" } },
            additional_notes: { type: "string" }
          }
        }
      });
      setExtractedReportData(result);
      toast.success("✅ Medical report analyzed! Data extracted and ready to use for meal plan generation.");
    } catch (err) {
      toast.error("Failed to analyze report. You can still generate without it.");
      console.error(err);
    }
    setExtractingReport(false);
  };

  const handleFoodPreferencesSubmit = (preferences) => {
    setFoodPreferences(preferences);
    setShowFoodPreferences(false);
    // Now proceed with meal plan generation
    generateProPlan(preferences);
  };

  const generateProPlan = async (preferences = foodPreferences) => {
    try {
      console.log('🚀 GENERATE PRO PLAN CALLED');
      console.log('selectedClientId:', selectedClientId);
      console.log('selectedClient:', selectedClient);
      console.log('clinicalIntakes:', clinicalIntakes);
      console.log('foodPreferences:', preferences);

      if (!selectedClientId || !selectedClient) {
        alert('❌ Please select a client first');
        return;
      }

      if (!clinicalIntakes || clinicalIntakes.length === 0) {
        alert('❌ No clinical intake found. Please complete the clinical intake form first.');
        return;
      }

      const intake = clinicalIntakes[0];
      console.log('intake:', intake);
      console.log('intake.completed:', intake.completed);

      if (!intake.completed) {
        alert('❌ Clinical intake is not completed yet. Please complete the form first.');
        return;
      }

      // Check AI credits availability
      const totalCredits = (coachSubscription?.ai_credits_included || 0) + (coachSubscription?.ai_credits_purchased || 0);
      const usedCredits = coachSubscription?.ai_credits_used_this_month || 0;
      const availableCredits = totalCredits - usedCredits;

      if (user?.user_type === 'student_coach' && availableCredits < 1) {
        alert('❌ Insufficient AI credits. Please purchase more credits to generate meal plans.');
        navigate(createPageUrl('PurchaseAICredits'));
        return;
      }

      setGenerating(true);

      const prompt = constructDiamondPrompt(selectedClient, intake, numberOfDays, mealPattern, preferences);
      
      console.log('Sending prompt to AI with numberOfDays:', numberOfDays);
      
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
                affirmations: { type: "array", items: { type: "string" } },
                journaling_prompts: { type: "array", items: { type: "string" } },
                breathing_exercises: { type: "array", items: { type: "string" } },
                physical_activities: { type: "array", items: { type: "string" } },
                forgiveness_practices: { type: "array", items: { type: "string" } }
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

      // Validate that all days were generated
      const generatedDays = [...new Set(response.meal_plan.map(m => m.day))].sort((a, b) => a - b);
      const expectedDays = Array.from({ length: numberOfDays }, (_, i) => i + 1);
      
      console.log('Generated days:', generatedDays);
      console.log('Expected days:', expectedDays);
      
      if (generatedDays.length < numberOfDays) {
        alert(`⚠️ Warning: AI only generated ${generatedDays.length} days instead of ${numberOfDays} days. Missing days: ${expectedDays.filter(d => !generatedDays.includes(d)).join(', ')}. Please try generating again.`);
      }

      setGeneratedPlan({
        ...response,
        client_id: selectedClient.id,
        client_name: selectedClient.full_name
      });

      setEditMode(false);
      setEditedMeals(response.meal_plan);

      // Track AI credit usage for student coaches
      if (user?.user_type === 'student_coach' && coachSubscription) {
        try {
          // Create transaction record
          await base44.entities.AICreditsTransaction.create({
            coach_email: user.email,
            subscription_id: coachSubscription.id,
            transaction_type: 'usage',
            credits_amount: 1,
            feature_used: 'ai_meal_plan_pro',
            description: `AI Pro Meal Plan generated for ${selectedClient.full_name}`,
            status: 'completed'
          });

          // Update subscription credits used
          await base44.entities.HealthCoachSubscription.update(coachSubscription.id, {
            ai_credits_used_this_month: (coachSubscription.ai_credits_used_this_month || 0) + 1
          });

          // Invalidate queries to refresh credit balance
          queryClient.invalidateQueries(['coachSubscription']);
        } catch (trackingError) {
          console.error('Failed to track AI usage:', trackingError);
          // Don't block the user, just log the error
        }
      }

      alert('✅ Pro meal plan generated successfully! Scroll down to review the plan.');
      setGenerating(false);

    } catch (error) {
      console.error('❌ Error:', error);
      alert(`❌ Error: ${error.message || 'Failed to generate meal plan'}`);
      setGenerating(false);
    }
  };

  const handleSavePlan = () => {
    if (!generatedPlan) return;

    const mealsToSave = editMode ? editedMeals : generatedPlan.meal_plan;

    savePlanMutation.mutate({
      client_id: generatedPlan.client_id,
      name: `Diamond Clinical Plan - ${generatedPlan.client_name}`,
      plan_tier: 'advanced',
      duration: numberOfDays,
      meal_pattern: mealPattern,
      target_calories: generatedPlan.calculations.target_calories,
      disease_focus: latestIntake?.health_conditions || [],
      meals: mealsToSave,
      food_preference: latestIntake?.diet_type?.toLowerCase() || 'general', // Use latestIntake for diet_type or default
      active: true,
      mpess_integration: {
        affirmations: generatedPlan.mpess_integration.affirmations,
        journaling_prompts: generatedPlan.mpess_integration.journaling_prompts,
        breathing_exercises: generatedPlan.mpess_integration.breathing_exercises,
        physical_activities: generatedPlan.mpess_integration.physical_activities,
        forgiveness_practices: generatedPlan.mpess_integration.forgiveness_practices
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
      duration: numberOfDays,
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

    const clonedPlan = {
      plan_name: `${template.name} - ${selectedClient.full_name}`,
      meal_plan: template.meals,
      client_id: selectedClient.id,
      client_name: selectedClient.full_name,
      calculations: {
        target_calories: template.target_calories || 0,
        bmr: 0,
        tdee: 0,
        macros: { carbs_g: 0, protein_g: 0, fats_g: 0 }
      },
      decision_rules: ['Template-based plan'],
      conflict_resolution: 'From template',
      mpess_integration: { affirmations: [], journaling_prompts: [], breathing_exercises: [], physical_activities: [], forgiveness_practices: [] },
      audit_snapshot: {
        avg_calories_per_day: template.target_calories || 0,
        calorie_range: 'Template-based',
        macro_percentages: { carbs: 0, protein: 0, fats: 0 },
        sodium_compliance: 'Check required',
        potassium_compliance: 'Check required',
        medication_conflicts: false,
        variety_check: true,
        mpess_integrated: false
      },
      from_template: true,
      template_id: template.id
    };

    setGeneratedPlan(clonedPlan);
    setEditedMeals(template.meals);
    setEditMode(false);

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
    <div className="min-h-screen p-3 md:p-6 lg:p-8 bg-gradient-to-br from-purple-50 to-indigo-50">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1">💎 Mealie Pro</h1>
            <p className="text-sm md:text-base text-gray-600">Disease-Specific Clinical Meal Planning</p>
          </div>
          <Badge className="bg-purple-600 text-white text-sm md:text-base px-3 py-1.5 md:px-4 md:py-2 self-start sm:self-auto">
            Advanced Tier
          </Badge>
        </div>

        <Alert className="bg-gradient-to-r from-purple-100 to-indigo-100 border-purple-300">
          <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <AlertDescription className="text-xs sm:text-sm">
            <strong>Pro Features:</strong> 10-day rotation plans • Disease-specific rationales • MPESS integration • Lab tracking • Audit compliance
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
          <TabsList className="bg-white/80 backdrop-blur grid grid-cols-4 h-auto">
            <TabsTrigger value="templates" className="flex-col sm:flex-row gap-1 py-2 px-1 sm:px-3 text-xs sm:text-sm">
              <Star className="w-4 h-4" />
              <span className="hidden xs:inline">Pro </span>Templates
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex-col sm:flex-row gap-1 py-2 px-1 sm:px-3 text-xs sm:text-sm">
              <Edit className="w-4 h-4" />
              Manual
            </TabsTrigger>
            <TabsTrigger value="generate" className="flex-col sm:flex-row gap-1 py-2 px-1 sm:px-3 text-xs sm:text-sm">
              <Sparkles className="w-4 h-4" />
              AI Generate
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex-col sm:flex-row gap-1 py-2 px-1 sm:px-3 text-xs sm:text-sm">
              <FileText className="w-4 h-4" />
              <span>Plans ({proMealPlans.length})</span>
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
          <TabsContent value="generate" className="space-y-4 md:space-y-6">
            {!generatedPlan ? (
              <div className="border-none shadow-lg rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-4 md:p-6">
                  <h2 className="text-lg md:text-2xl font-bold">Generate Diamond Clinical Meal Plan</h2>
                  <p className="text-white/90 mt-1 text-sm md:text-base">
                    Based on detailed clinical intake with disease-specific guidelines
                  </p>
                </div>
                <div className="p-4 md:p-6 space-y-5 bg-white">
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
                    <div className="p-3 md:p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-medium text-base md:text-lg">
                            {selectedClient.full_name.charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{selectedClient.full_name}</h3>
                          <p className="text-xs md:text-sm text-gray-600 truncate">{selectedClient.email}</p>
                        </div>
                      </div>

                      {hasCompletedIntake ? (
                        <Alert className="bg-green-50 border-green-500">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <AlertDescription>
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="text-sm">
                                <strong>Clinical intake completed!</strong><br/>
                                <span className="text-gray-600">Conditions: {latestIntake?.health_conditions?.join(', ') || 'Not specified'}</span><br/>
                                <span className="text-gray-600">Diet: {latestIntake?.diet_type || 'Not specified'}</span>
                              </div>
                              <Button
                                onClick={() => navigate(`/ClinicalIntake?clientId=${selectedClient.id}`)}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 shrink-0"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Resubmit
                              </Button>
                            </div>
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert className="bg-orange-50 border-orange-500">
                          <AlertTriangle className="w-4 h-4 text-orange-600" />
                          <AlertDescription className="text-sm">
                            <strong>Clinical intake not completed.</strong> Please complete the clinical intake form first.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  {/* Meal Plan Options */}
                  {selectedClient && hasCompletedIntake && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700">
                            Meal Pattern *
                          </label>
                          <Select value={mealPattern} onValueChange={setMealPattern}>
                            <SelectTrigger className="h-12">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="3-3-4">3-3-4 Rotation (Recommended)</SelectItem>
                              <SelectItem value="daily">Daily Variation</SelectItem>
                              <SelectItem value="weekly">Weekly Pattern</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500">
                            3-3-4: Plan A (days 1-3), Plan B (days 4-6), Plan C (days 7-10)
                          </p>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700">
                            Number of Days *
                          </label>
                          <Input
                            type="number"
                            min="3"
                            max="30"
                            value={numberOfDays}
                            onChange={(e) => setNumberOfDays(Math.max(3, Math.min(30, parseInt(e.target.value) || 10)))}
                            className="h-12"
                          />
                          <p className="text-xs text-gray-500">
                            Choose between 3-30 days
                          </p>
                        </div>
                      </div>

                      {!showFoodPreferences && !foodPreferences && (
                        <Alert className="bg-purple-50 border-purple-300">
                          <AlertDescription className="text-sm">
                            <strong>ℹ️</strong> Before generating, you'll be asked about your food preferences (recommended, liked, and disliked foods) to personalize your meal plan.
                          </AlertDescription>
                        </Alert>
                      )}

                      {foodPreferences && (
                        <Alert className="bg-green-50 border-green-300">
                          <AlertDescription className="text-sm">
                            <strong>✅ Food preferences collected!</strong> Ready to generate your personalized meal plan.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {selectedClient && !hasCompletedIntake && (
                    <Button
                      onClick={() => navigate(`/ClinicalIntake?clientId=${selectedClient.id}`)}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 h-12"
                    >
                      <FileText className="w-5 h-5 mr-2" />
                      Fill Clinical Intake Form
                    </Button>
                  )}

                  {showFoodPreferences && selectedClient && hasCompletedIntake ? (
                    <FoodPreferenceForm 
                      onSubmit={handleFoodPreferencesSubmit}
                      isLoading={generating}
                    />
                  ) : (
                    <Button
                      onClick={() => {
                        if (selectedClient && hasCompletedIntake) {
                          setShowFoodPreferences(true);
                        }
                      }}
                      disabled={generating || !selectedClient || !hasCompletedIntake}
                      className={`w-full h-14 text-lg font-semibold ${
                        (!selectedClient || !hasCompletedIntake) 
                          ? 'bg-gray-300 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:opacity-90'
                      }`}
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Generating Diamond Plan...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Next: Share Your Food Preferences →
                        </>
                      )}
                    </Button>
                  )}

                  {!selectedClient && (
                    <Alert className="bg-red-50 border-red-500 mt-4">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <AlertDescription>
                        ⚠️ <strong>Please select a client first</strong> to generate the meal plan
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {selectedClient && !hasCompletedIntake && (
                    <Alert className="bg-orange-50 border-orange-500 mt-4">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      <AlertDescription>
                        ⚠️ <strong>Clinical intake not completed.</strong> Please fill out the clinical intake form first.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {selectedClient && !hasCompletedIntake && (
                    <Alert className="bg-yellow-50 border-yellow-500 mt-4">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <AlertDescription>
                        Complete the clinical intake form to generate AI meal plans
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Info about Pro features */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mt-4">
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
                </div>
              </div>
            ) : (
              /* Show Generated Plan */
              <div className="space-y-4 md:space-y-6">
                {/* Decision Rules */}
                <Card className="border-none shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4 md:p-6">
                    <CardTitle className="text-base md:text-lg">✅ Decision Rules Applied</CardTitle>
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
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-4 md:p-6">
                    <CardTitle className="text-base md:text-lg">📊 Nutritional Calculations</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 md:p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                      {[
                        { label: 'BMR', value: generatedPlan.calculations.bmr, color: 'text-blue-600', unit: 'kcal/day' },
                        { label: 'TDEE', value: generatedPlan.calculations.tdee, color: 'text-cyan-600', unit: 'kcal/day' },
                        { label: 'Target Cal', value: generatedPlan.calculations.target_calories, color: 'text-orange-600', unit: 'kcal/day' },
                        { label: 'C/P/F (g)', value: `${generatedPlan.calculations.macros.carbs_g}/${generatedPlan.calculations.macros.protein_g}/${generatedPlan.calculations.macros.fats_g}`, color: 'text-purple-600', unit: 'grams' },
                      ].map(({ label, value, color, unit }) => (
                        <div key={label} className="text-center p-2 md:p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">{label}</p>
                          <p className={`text-lg md:text-2xl font-bold ${color}`}>{value}</p>
                          <p className="text-xs text-gray-400">{unit}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Meal Plan */}
                <Card className="border-none shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 md:p-6">
                    <CardTitle className="text-base md:text-lg">🍽️ {numberOfDays}-Day Meal Plan ({mealPattern.toUpperCase()})</CardTitle>
                    <CardDescription className="text-white/90 text-xs md:text-sm">
                      {mealPattern === '3-3-4' ? `Plan A: Days 1-3 | Plan B: Days 4-6 | Plan C: Days 7-${numberOfDays}` : `${numberOfDays} days of customized meals`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 md:p-6">
                    <Tabs defaultValue="1" className="space-y-4">
                      <TabsList className="flex flex-wrap gap-1.5 h-auto bg-gray-100 p-1.5">
                        {Array.from({ length: numberOfDays }, (_, i) => i + 1).map(day => (
                          <TabsTrigger key={day} value={day.toString()} className="text-xs px-2 py-1">
                            D{day}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {Array.from({ length: numberOfDays }, (_, i) => i + 1).map(day => (
                        <TabsContent key={day} value={day.toString()} className="space-y-3">
                          {(editMode ? editedMeals : generatedPlan.meal_plan)
                            .filter(meal => meal.day === day)
                            .map((meal, index) => (
                              <Card key={index} className="bg-gradient-to-br from-gray-50 to-white">
                                <CardHeader className="p-3 md:p-4">
                                  <div className="flex items-center justify-between gap-2">
                                    <CardTitle className="text-sm md:text-base capitalize">{meal.meal_type.replace(/_/g, ' ')}</CardTitle>
                                    <Badge className="text-xs shrink-0">{meal.calories} kcal</Badge>
                                  </div>
                                  {editMode ? (
                                    <Input
                                      value={meal.meal_name}
                                      onChange={(e) => {
                                        const updated = [...editedMeals];
                                        const mealIndex = updated.findIndex(m => m.day === day && m.meal_type === meal.meal_type);
                                        updated[mealIndex].meal_name = e.target.value;
                                        setEditedMeals(updated);
                                      }}
                                      className="font-bold text-sm md:text-base"
                                    />
                                  ) : (
                                    <p className="text-sm md:text-base font-bold text-gray-900">{meal.meal_name}</p>
                                  )}
                                </CardHeader>
                                <CardContent className="px-3 pb-3 md:px-4 md:pb-4 space-y-3">
                                  <div>
                                    <p className="font-semibold text-gray-700 mb-1.5 text-sm">Food Items:</p>
                                    <div className="space-y-1.5">
                                      {meal.items.map((item, i) => (
                                        <div key={i} className="flex justify-between text-sm gap-2">
                                          {editMode ? (
                                            <>
                                              <Input value={item} onChange={(e) => {
                                                const updated = [...editedMeals];
                                                const mi = updated.findIndex(m => m.day === day && m.meal_type === meal.meal_type);
                                                updated[mi].items[i] = e.target.value;
                                                setEditedMeals(updated);
                                              }} className="text-xs h-8 flex-1" />
                                              <Input value={meal.portion_sizes[i]} onChange={(e) => {
                                                const updated = [...editedMeals];
                                                const mi = updated.findIndex(m => m.day === day && m.meal_type === meal.meal_type);
                                                updated[mi].portion_sizes[i] = e.target.value;
                                                setEditedMeals(updated);
                                              }} className="text-xs h-8 w-24 md:w-32" />
                                            </>
                                          ) : (
                                            <div className="flex justify-between w-full gap-2">
                                              <span className="text-gray-800">{item}</span>
                                              <span className="text-gray-500 text-xs shrink-0">{meal.portion_sizes[i]}</span>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 pt-2 border-t">
                                    {[
                                      { label: 'Protein', key: 'protein', value: `${meal.protein}g`, color: 'text-red-600' },
                                      { label: 'Carbs', key: 'carbs', value: `${meal.carbs}g`, color: 'text-yellow-600' },
                                      { label: 'Fats', key: 'fats', value: `${meal.fats}g`, color: 'text-purple-600' },
                                      { label: 'Sodium', key: 'sodium', value: `${meal.sodium}mg`, color: 'text-blue-600' },
                                      { label: 'K+', key: 'potassium', value: `${meal.potassium}mg`, color: 'text-green-600' },
                                    ].map(({ label, key, value, color }) => (
                                      <div key={label} className="text-center bg-gray-50 rounded-lg p-1.5">
                                        <p className="text-xs text-gray-500">{label}</p>
                                        {editMode ? (
                                          <Input
                                            type="number"
                                            value={meal[key] || 0}
                                            onChange={(e) => {
                                              const updated = [...editedMeals];
                                              const mealIndex = updated.findIndex(m => m.day === day && m.meal_type === meal.meal_type);
                                              updated[mealIndex][key] = parseFloat(e.target.value) || 0;
                                              setEditedMeals(updated);
                                            }}
                                            className="text-xs h-7 text-center"
                                          />
                                        ) : (
                                          <p className={`text-xs md:text-sm font-bold ${color}`}>{value}</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>

                                  {meal.disease_rationale && (
                                    <Alert className="bg-green-50 border-green-200 py-2 px-3">
                                      <AlertDescription className="text-xs md:text-sm">
                                        <strong>💡 Why this?</strong> {meal.disease_rationale}
                                      </AlertDescription>
                                    </Alert>
                                  )}
                                  <div className="pt-2">
                                    <RecipeScaler meal={meal} />
                                  </div>
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
                    <CardHeader className="bg-gradient-to-r from-pink-500 to-rose-500 text-white p-4 md:p-6">
                      <CardTitle className="text-base md:text-lg">🧘 MPESS Wellness Practices</CardTitle>
                      <CardDescription className="text-white/90 text-xs md:text-sm">Holistic wellness practices tailored to your client's needs</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 md:p-6">
                      <div className="space-y-6">
                        {/* Affirmations */}
                        {generatedPlan.mpess_integration.affirmations?.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                              <Sparkles className="w-5 h-5 text-purple-600" />
                              Daily Affirmations
                            </h3>
                            <div className="grid gap-3">
                              {generatedPlan.mpess_integration.affirmations.map((affirmation, index) => (
                                <div key={index} className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-l-4 border-purple-500">
                                  <p className="text-gray-800">"{affirmation}"</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Journaling Prompts */}
                        {generatedPlan.mpess_integration.journaling_prompts?.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                              <FileText className="w-5 h-5 text-blue-600" />
                              Journaling Prompts
                            </h3>
                            <div className="grid gap-3">
                              {generatedPlan.mpess_integration.journaling_prompts.map((prompt, index) => (
                                <div key={index} className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                                  <p className="text-gray-800">{prompt}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Breathing Exercises */}
                        {generatedPlan.mpess_integration.breathing_exercises?.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                              <Heart className="w-5 h-5 text-red-600" />
                              Breathing Exercises
                            </h3>
                            <div className="grid gap-3">
                              {generatedPlan.mpess_integration.breathing_exercises.map((exercise, index) => (
                                <div key={index} className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                                  <p className="text-gray-800">{exercise}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Physical Activities */}
                        {generatedPlan.mpess_integration.physical_activities?.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                              <Activity className="w-5 h-5 text-green-600" />
                              Physical Activities
                            </h3>
                            <div className="grid gap-3">
                              {generatedPlan.mpess_integration.physical_activities.map((activity, index) => (
                                <div key={index} className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                                  <p className="text-gray-800">{activity}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Forgiveness Practices */}
                        {generatedPlan.mpess_integration.forgiveness_practices?.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                              <Heart className="w-5 h-5 text-pink-600" />
                              Forgiveness & Emotional Release
                            </h3>
                            <div className="grid gap-3">
                              {generatedPlan.mpess_integration.forgiveness_practices.map((practice, index) => (
                                <div key={index} className="p-4 bg-pink-50 rounded-lg border-l-4 border-pink-500">
                                  <p className="text-gray-800">{practice}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Audit Snapshot */}
                <Card className="border-none shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-4 md:p-6">
                    <CardTitle className="text-base md:text-lg">📊 Audit & Compliance Snapshot</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 md:p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: 'Avg Cal/Day', value: `${generatedPlan.audit_snapshot.avg_calories_per_day} kcal` },
                        { label: 'Calorie Range', value: generatedPlan.audit_snapshot.calorie_range },
                        { label: 'Macro (C/P/F)', value: `${generatedPlan.audit_snapshot.macro_percentages.carbs}%/${generatedPlan.audit_snapshot.macro_percentages.protein}%/${generatedPlan.audit_snapshot.macro_percentages.fats}%` },
                        { label: 'Sodium', value: generatedPlan.audit_snapshot.sodium_compliance },
                        { label: 'Potassium', value: generatedPlan.audit_snapshot.potassium_compliance },
                        { label: 'Variety', value: generatedPlan.audit_snapshot.variety_check ? '✓ >20 items' : '⚠ Limited' },
                      ].map(({ label, value }) => (
                        <div key={label} className="p-2.5 md:p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">{label}</p>
                          <p className="text-xs md:text-sm font-bold text-gray-800 break-words">{value}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Extra Meals Adder */}
                <ExtraMealAdder
                  meals={editMode ? editedMeals : generatedPlan.meal_plan}
                  numberOfDays={numberOfDays}
                  onAddMeals={(newMeals) => {
                    const updated = editMode ? [...editedMeals] : [...generatedPlan.meal_plan];
                    updated.push(...newMeals);
                    setEditedMeals(updated);
                    alert('✅ Extra meal(s) added! Remember to save the plan when done.');
                  }}
                />

                {/* AI Chat Modifier */}
                <ProMealPlanChatModifier
                  plan={generatedPlan}
                  onPlanUpdate={(updatedPlan) => {
                    setGeneratedPlan(updatedPlan);
                    setEditedMeals(updatedPlan.meal_plan);
                  }}
                />

                {/* Action Buttons */}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="col-span-1 sm:flex-1"
                    onClick={() => { setGeneratedPlan(null); setEditMode(false); setEditedMeals([]); }}
                  >
                    New Plan
                  </Button>
                  <Button variant="outline" className="col-span-1 sm:flex-1" onClick={() => handleSaveAsProTemplate(generatedPlan)}>
                    <Star className="w-4 h-4 mr-1" />
                    Save as Template
                  </Button>
                  <Button
                    variant={editMode ? "default" : "outline"}
                    className={`col-span-1 sm:flex-1 ${editMode ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                    onClick={() => { if (!editMode) setEditedMeals([...generatedPlan.meal_plan]); setEditMode(!editMode); }}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    {editMode ? 'Done' : 'Edit'}
                  </Button>
                  <Button
                    className="col-span-2 sm:flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 h-12 md:h-14 font-semibold"
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
function constructDiamondPrompt(client, intake, numberOfDays, mealPattern, preferences) {
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

  // Format food preferences
  const recommendedFoodsText = preferences?.recommendedFoods?.join(', ') || 'Not specified';
  const likedFoodsText = preferences?.likedFoods?.join(', ') || 'Not specified';
  const dislikedFoodsText = preferences?.dislikedFoods?.join(', ') || 'Not specified';

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

## CLIENT FOOD PREFERENCES (FROM FORM):
Recommended Foods (Health-promoting): ${recommendedFoodsText}
Foods They Like: ${likedFoodsText}
Foods They Dislike: ${dislikedFoodsText}

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

1. **PERSONALIZE WITH FOOD PREFERENCES:**
   - Incorporate client's RECOMMENDED FOODS whenever possible in the meal plan (these support their health condition)
   - Include client's LIKED FOODS to make the plan enjoyable and sustainable
   - AVOID all DISLIKED FOODS completely - never include them in any meal
   - Balance health requirements with client preferences

2. Apply disease-specific rules for: ${intake.health_conditions.join(', ')}

3. **MANDATORY - DO NOT SKIP ANY DAYS**: 
   - You MUST generate ALL ${numberOfDays} days of meal plans
   - Generate day 1, day 2, day 3, day 4, day 5, day 6, day 7, day 8, day 9, day 10
   - Continue until you reach day ${numberOfDays}
   - DO NOT stop at day 3 or any day before ${numberOfDays}
   - Each meal object must have a "day" field from 1 to ${numberOfDays}

4. Pattern: ${mealPattern}${mealPattern === '3-3-4' ? ' (Plan A: days 1-3, Plan B: days 4-6, Plan C: days 7-' + numberOfDays + ')' : ''}

5. Each day MUST have 7 meal sections in EXACT sequence: Early Morning, Breakfast, Mid-Morning, Lunch, Evening Snack, Dinner, Post Dinner (herbal drink only — SAME drink for all 10 days, NO bedtime meal)

6. For each meal provide: day (1 to ${numberOfDays}), meal_type, meal_name, items, portion_sizes (Indian units), calories, protein, carbs, fats, sodium, potassium, disease_rationale

7. Include MPESS practices SPECIFICALLY for client needs:
   - **Affirmations**: Based on their health goals and mental wellbeing needs
   - **Journaling**: Daily reflection prompts for emotional awareness
   - **Breathing Exercises**: Specific techniques for stress/anxiety management  
   - **Physical Activity**: Exercises suitable for their health conditions
   - **Forgiveness**: Practices for emotional release and healing
   
   Assign these practices according to: ${Object.entries(intake.mpess_preferences).filter(([k,v]) => v).map(([k]) => k).join(', ')}

   8. Provide audit snapshot with compliance tracking

   9. List decision rules applied

   10. Handle conflicts with hierarchy: Kidney > Diabetes > Heart > Thyroid

## APPROVED MEAL OPTIONS (USE ONLY THESE - FROM COMPREHENSIVE LIST):

**EARLY MORNING (Choose 1):**
- 1Liter water + 2 small lemon slices + 1 inch ginger grated + 10-12 mint leaves + 1 small cucumber slice
- 1Glass zeera water [1spoon zeera seeds overnight soaked in 1glass boiled water, consume luke warm]
- 1Glass tulsi water [10-12 tulsi leaves boiled in 1 glass water, may add lemon for taste]
- 30ml aloe Vera juice with 70 ml water
- 1Glass methi water [1spoon methi seeds + 2glasses of water boiled till 1glass, consume luke warm]
- 1Glass Haldi water [½ Teaspoon haldi powder + ½ inch grated ginger + 1Glass Luke warm water]
- 1Tablespoon chia seeds overnight soaked in 1glass water, consume next morning
- 1Glass dhaniya pudina water [1tea spoon dhaniya seeds + 10-12 mint leaves, boiled, consume luke warm]
- 1Glass Haldi water [½ Teaspoon haldi powder + pinch of black pepper + ½ 1Glass water boiled, consume]
- 1Glass cinnamon ginger water [pinch of cinnamon + 1Glass Luke warm water] [NOT for low BP & hyperglycaemic]
- 1Glass saunf water [1spoon saunf seeds + 2glasses of water boiled till 1glass, consume luke warm]
- 1Glass A.C.V. [20ml apple cider vinegar + 1glass water]

**BREAKFAST (Choose 1 category):**
CEREALS: 3 Table spoons muesli without nuts with milk | 3 tablespoon wheat flakes with milk without sugar | Oats with milk | Wheat daliya with milk
POHA: 1Small bowl vegetable poha mix 1ice cube size paneer homemade + veggies | 1Small bowl vegetable poha mix 2 spoons of steam sprouts | 1Small bowl vegetable poha mix nutreela | 1medium bowl vegetable bread Poha (3:1) + green chutney
NON VEG: 3 Eggs white mix veggies omelette or scrambled with 1whole wheat toast | 2-3 boiled egg white with veggies | Chicken salami sandwich with g. chutney
DALIYA: 1bowl veg oats [3:1] with green chutney | 1bowl vegetable wheat daliya [3:1]+ g. chutney | 1bowl vegetable ragi daliya [3:1] + g. chutney | 1bowl vegetable bajra daliya [3:1] + g. chutney | 1bowl vegetable barley daliya [3:1] + g. chutney | 1bowl vegetable upma[3:1]+ g.chutney
SANDWICHES: 1-2 Aata bread veg sandwich with green chutney | 1-2 Paneer sandwiches with green chutney | 1Spoon Peanut butter with chia seeds sandwich [2spoon peanut butter spread on 2slices of whole wheat bread, add strawberries/banana/apple slices + sprinkle 1spoon chia seeds] | 1-2 Soya veg sandwich with g. chutney | 1-2 Aalu veg sandwich with g. chutney
STUFFED ROTI: 1-2 Veg stuffed roti [lauki + green chilli + coriander leaves] | 1-2 Veg stuffed roti [Spinach/methi + green chilli + onion] | 1-2 Veg stuffed roti [onion + green chilli + coriander leaves] | 1-2 Veg stuffed roti [Paneer + onion + green chilli + coriander leaves] | 1-2 Veg stuffed roti [Radish + coriander leaves] | 1-2 Veg stuffed roti [soya bean/nutreela + onion + green chilli + coriander leaves] | 1-2 Veg stuffed roti [carrot + onion + green chilli + coriander leaves]
CHEELA: 1-2 besan cheela veg mix with g. chutney | 1-2 Suji cheela veg mix with g. chutney | 1-2 Veg uttapam with g. chutney | 1-2 Ragi cheela veg mix with g. chutney | 1-2 Moong dal cheela veg mix with g. chutney | 1-2 Chana dal cheela veg mix with g. chutney
CHHOLES: 1bowl steam moong sprouts mix green salad | 1Bowl soya bean sprouts with green salad | 1Bowl boiled black chana saute with lots of veggies | 1Bowl lobhia saute with lots of veggies
SMOOTHIES: 1 bowl fruit yogurt [yogurt + apple + 1spoon chia seeds] | 1 bowl of plain yogurt with fruit [no mango] banana once a week add 1 spoon roasted flax seeds | 1Bowl smoothies [1Glass milk + 2spoon oats+ 1table spoon chia seeds + ½ apple Or ½ banana > grind] | 1 glass APPLE shake /BANANA shake [Once a week]
IDLIS: 2-3Rava idli veg stuffed with g. chutney | 2-3Moong dal idli veg stuffed with g. chutney | 2-3Besan idli veg stuffed with g. chutney | 2-3Oats mix rava mix veggies idli with g. chutney | 2-3 Fermented idli veg stuffed with g. chutney

**MID-MORNING (Choose 1):**
- 1 Seasonal fruit allow [150gm] > AFTER 1HOUR > 1 glass lemon shikanji
- 1 Glass low fat buttermilk mix roasted zeera powder + 1 spoon roasted chia / flax seeds
- 1SEASONAL FRUIT [1Apple /1Orange / Mausambi /1Bowl papaya /1pear/ 1guava/ 1 pomegranate with 2-3 drops of lemon]
- 2 slices cucumber + 1 apple
- 2 slices cucumber + 1 pear
- 1 bowl papaya [2 slices of papaya with black pepper]
- 1Pomegranate with 2-3 drops of lemon

**LUNCH - DAILY BASE (MANDATORY):**
1Full plate/bowl green salad (steamed / Grated Raw) + 1medium bowl of low fat buttermilk
CHOOSE 1 OPTION FROM BELOW:

ROTI + VEGETABLES:
1-2 roti bran mix / jawar + 1bowl: lauki veg | tori veg | parwar veg | bhindi veg | kaddu veg | Spinach veg | brinjal bharta | capsicum potato veg | beans potato veg | nutreela capsicum veg | Methi aalu veg | cauliflower aalu veg | matter mushroom veg | saag veg | paneer veg bhurji[homemade paneer] | spring onion aalu veg | beans yellow moong dal veg | carrot peas veg | mix veg | mooli bhurji | Capsicum paneer veg | brinjal potato veg | cabbage peas veg

ROTI + DAL:
1-2 Roti bran mix / jawar + 1bowl: yellow moong dal | arher dal | masoor dal | chana dal | gatte veg without fried

RICE + LEGUMES (MAXIMUM 4-5 DAYS IN 10-DAY PLAN - LIMIT TO 4-5 DAYS ONLY):
IMPORTANT: Use rice with dal/rajma/chhole/kadhi/veg paneer pulao on EXACTLY 4-5 days ONLY in the 10-day plan.
For remaining days (5-6 days), use ROTI + VEGETABLES or ROTI + DAL instead.
1-2 Roti bran mix / jawar / small bowl steam rice + 1bowl: chhole | black chana | rajhma | lobhia | soyabean | kadhi without pakrori

NON VEG OPTIONS (2-3 days/week max):
1medium bowl chicken biryani [no leg pieces] homemade with low fat buttermilk | 1bowl fish curry with steam rice | 4-5 pieces of fish[steam/grilled]with grilled veggies /1-2 roti wheat /tandoori roti /buttermilk | 2Pieces of grilled chicken [100gm][no leg pieces] with g. chutney + buttermilk | 2Egg white curry with steam rice /1-2 roti bran mix

**EVENING SNACK (Choose 1):**
- 1Cup tea /1Cup black coffee/ Black tea /Green tea /1Cup low fat milk /1cup low fat buttermilk
[Optional snack with tea]:
- One handful of Roasted chana or roasted chana mix green salad [twice-thrice a week]
- Dry roasted bajra puffs unsalted [twice a week]
- Dry roasted popcorn [twice-thrice a week]
- Dry roasted makhane [twice-thrice a week]
- 1Smal bowl steam moong sprouts mix green salad [once -twice a week]
- Roasted wheat puffs unsalted [twice-thrice a week]
- 1Small bowl murmura bhel with lots of vegetables [once a week]
- 1Small bowl boiled black chana saute with veggies [once -twice a week]
- 1Veg grilled sandwich with g. chutney [once a week]

**DINNER - MANDATORY BASE:**
1BOWL SOUP[250ml] + Full bowl of green salad chopped or grated[raw/steam]
SOUP OPTIONS: 1Bowl mix veg soup | Tomato soup[250ml] | Cabbage soup | Mushroom soup | French beans tomato soup | Broccoli peas soup | Spinach soup | Chicken soup/ chicken broth

THEN CHOOSE 1 SAME OPTION FROM LUNCH (ROTI+VEG, ROTI+DAL, OR NON-VEG - SAME AS LUNCH OPTIONS)

**POST DINNER - HERBAL DRINK (SAME FOR ALL 10 DAYS - CHOOSE 1 ONLY):**
Select ONE herbal drink and use it for ALL 10 days consistently (NO rotation, NO variation):
- Saunf Water [1spoon saunf seeds + 2glasses of water > boiled till 1glass, consume luke warm]
- Ajwain Water [1 teaspoon ajwain seeds + hot water, consume luke warm]
- Turmeric Water [½ Teaspoon haldi powder + pinch of black pepper + ½ inch ginger + 1Glass water boiled, consume luke warm]
- Hing Water [½ pinch hing + 1Glass warm water]
- Ginger Tea [Adrak Ki Chai — NO milk, fresh ginger + hot water, consume warm]
- Chamomile Tea [NO milk, brew chamomile in hot water, consume warm]

CRITICAL RULES: 
✓ Use ONLY these pre-approved options
✓ NO meals outside this list
✓ NO green juice in post-dinner
✓ NO fruits in dinner or post-dinner
✓ Post-dinner herbal drink must be IDENTICAL for all 10 days
✓ For weight loss: Include "Drink 1 glass plain water 30 minutes before lunch & dinner" + "Drink 1 glass plain water 10 minutes after post-dinner herbal drink"
✓ NO palak paneer for weight loss clients
✓ For non-vegetarian preference: Include grilled chicken/fish 2-3 days in dinner
✓ For diabetes/hyperlipidemia: Use ONLY egg white options (no whole eggs)

## STRICT MEAL RULES (NEVER VIOLATE):
RULE A - MEAL SEQUENCE (MANDATORY FOR ALL CLIENTS): Present meals in this EXACT sequence EVERY day. NO variations, NO bedtime section:
  1. Early Morning (detox water, lemon water, methi water)
  2. Breakfast
  3. Mid Morning (fruit or light option)
  4. Lunch
  5. Evening Snack
  6. Dinner
  7. Post Dinner (ONE herbal drink ONLY — NO variations, SAME drink all 10 days)

RULE B - POST DINNER — HERBAL DRINK ONLY (NO ROTATION): For ALL clients, pick ONE herbal drink and use it for ALL 10 days consistently:
  ALLOWED OPTIONS ONLY:
  - "Saunf Water (Fennel Seed Water)"
  - "Ajwain Water (Carom Seed Water)"
  - "Turmeric Water (Haldi Water — 1/2 tsp haldi + ginger + warm water)"
  - "Hing Water (Asafoetida Water)"
  - "Ginger Tea (Adrak Ki Chai — NO milk, ginger + hot water)"
  - "Chamomile Tea (NO milk)"
  NEVER milk, NO green juice, NO smoothies, NO juices, NO food after dinner.

RULE C - NO BEDTIME MEAL (ABSOLUTE): There is NO bedtime section. Day ends with Post Dinner herbal drink. Nothing after that. NO variations.

RULE D - NO FRUITS AT NIGHT: NEVER include any fruits (banana, apple, papaya, mango, orange, etc.) in dinner or post-dinner. Fruits ONLY at breakfast, mid-morning, or evening snack.

RULE E - WEIGHT LOSS DIET MODIFICATIONS (IF goal = weight_loss):
  a) PRE-MEAL WATER (MANDATORY): Add explicitly in BOTH lunch AND dinner disease_rationale: "Drink 1 glass plain water 30 minutes before this meal"
  b) POST DINNER WATER: Add "Drink 1 glass plain water 10 minutes after post-dinner herbal drink"
  c) NO MILK AT NIGHT: Strictly NO milk, yogurt, curd, or dairy after 7 PM. Evening snack tea can have minimal milk only.
  d) NO PALAK PANEER: Never include "Palak Paneer" in ANY meal for weight loss clients
  e) Light dinners ONLY: Prefer grilled chicken, grilled fish, egg white curry, or light vegetable-based dinners (NO heavy gravies)

RULE F - INDIAN MEALS ONLY: All meals MUST be authentic Indian cuisine. NO international foods, NO fusion, NO continental items. Use Indian regional cuisines (North, South, East, West, and traditional Indian options).

RULE G - NON-VEG OPTIONS (APPLY ONLY IF diet_type is non_veg or eggetarian):
  - DINNER (2-3 days/week MAX): Grilled or baked chicken breast with steamed/sautéed vegetables (NO fried, NO heavy masala curries at dinner)
  - LUNCH (2-3 days/week): Chicken breast curry (light gravy, minimal oil) with roti/rice OR Grilled fish with vegetables
  - BREAKFAST/MID-MORNING: Egg white omelette, boiled egg whites with veggies, egg white salad, chicken salad
  - EGG WHITE RULE (CRITICAL): If client has Diabetes OR Hyperlipidemia OR High Cholesterol OR Dyslipidemia:
    → Use ONLY egg whites in ALL preparations. Write "Egg White Omelette", "Boiled Egg Whites", "Egg White Bhurji", NEVER whole eggs
  - Keep non-veg simple: Max one non-veg protein source per day (egg OR chicken OR fish, NOT multiple)

RULE H - STRICT CALORIE COMPLIANCE: Count calories for EVERY item including post-dinner herbal drink (= 0-2 kcal). Daily total MUST NOT exceed target calories. NO exceptions. NO night milk for weight loss clients.

RULE I - RICE LIMITATION (CRITICAL): 
For 10-day meal plans, rice with dal/rajma/chhole/kadhi/veg paneer pulao MUST appear on EXACTLY 4-5 days ONLY.
- Days with rice: Use "1-2 Roti bran mix / jawar / small bowl steam rice + 1bowl: chhole | black chana | rajhma | lobhia | soyabean | kadhi without pakrori"
- Remaining 5-6 days: MUST use roti-based meals instead (ROTI + VEGETABLES or ROTI + DAL options)
- Distribute rice days evenly (e.g., Days 2, 4, 6, 7, 9 for a 5-day rice rotation OR Days 2, 3, 5, 7, 9, 10 for a 6-day rotation)
- Do NOT use rice on all/most days
- Rationale: Reduces glycemic load, provides variety, better for weight management

****CRITICAL VALIDATION**: 
- The meal_plan array must contain EXACTLY ${numberOfDays * 7} meals total
- That is ${numberOfDays} days × 7 meals per day = ${numberOfDays * 7} meals
- Verify you have generated meals for EVERY day from day 1 to day ${numberOfDays}
- Daily calorie total must NOT exceed the calculated target calories
- Post dinner herbal drink MUST be IDENTICAL for all ${numberOfDays} days (NO rotation, NO variation)
- Meal sequence MUST be: Early Morning → Breakfast → Mid Morning → Lunch → Evening Snack → Dinner → Post Dinner (EVERY day, NO exceptions)
- RICE USAGE: Count rice meals in lunch/dinner - MUST be 4-5 days ONLY (not more)
- For weight loss clients: Include "Drink 1 glass plain water 30 minutes before" in lunch AND dinner disease_rationale
- For weight loss clients: Add "Drink 1 glass plain water 10 minutes after post-dinner herbal drink" in post-dinner section
- NO green juice, NO fruit juice, NO milk in post-dinner section for ANY client
- If non-vegetarian preference: Include grilled chicken/fish 2-3 days in dinner, chicken curry/biryani options in lunch, egg options in breakfast
- If diabetes/hyperlipidemia/high cholesterol: Use ONLY egg white options (no whole eggs)

Return structured JSON with decision_rules, calculations, meal_plan array (with ALL ${numberOfDays} days), mpess_integration, and audit_snapshot.`;
}