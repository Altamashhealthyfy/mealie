// MealPlansPro page - fully uses toast for notifications, no alert() calls
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
import { Sparkles, Loader2, Users, AlertTriangle, CheckCircle, FileText, Heart, Brain, Activity, Star, Edit, Copy, Upload, Wand2, X, Eye, Trash2, ChevronDown, ChevronUp, Search, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createPageUrl } from "@/utils";
import ManualMealPlanBuilder from "@/components/mealplanner/ManualMealPlanBuilder";
import { Input } from "@/components/ui/input";
import ProMealPlanChatModifier from "@/components/pro/ProMealPlanChatModifier";
import RecipeScaler from "@/components/mealplanner/RecipeScaler";
import FoodPreferenceForm from "@/components/mealplanner/FoodPreferenceForm";
import ExtraMealAdder from "@/components/pro/ExtraMealAdder";
import { toast } from "sonner";
import ClientSearchSelect from "@/components/common/ClientSearchSelect";
import { handleTemplateFileUpload, downloadSampleTemplate } from "@/components/pro/TemplateUploadUtils";
import { constructDiamondPrompt } from "@/components/pro/DiamondPromptBuilder";
import DiagnosticReview from "@/components/pro/DiagnosticReview";

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
  const [medicalReportFiles, setMedicalReportFiles] = useState([]); // [{file, status, data}]
  const [extractingReport, setExtractingReport] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [clientSearchTemplate, setClientSearchTemplate] = useState('');
  const [clientSearchManual, setClientSearchManual] = useState('');
  const [viewingPlan, setViewingPlan] = useState(null);
  const [expandedPlanId, setExpandedPlanId] = useState(null);
  const [planSearch, setPlanSearch] = useState('');
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);

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

  const { data: clientHealthReports } = useQuery({
    queryKey: ['clientHealthReports', selectedClientId],
    queryFn: () => base44.entities.HealthReport.filter({ client_id: selectedClientId }),
    enabled: !!selectedClientId,
    initialData: [],
  });

  const { data: proMealPlans } = useQuery({
    queryKey: ['proMealPlans', user?.email, user?.user_type],
    queryFn: async () => {
      const allPlans = await base44.entities.MealPlan.filter({ created_by: user?.email }, '-created_date');
      return allPlans.filter(plan => plan.plan_tier === 'advanced');
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: templates } = useQuery({
    queryKey: ['proTemplates'],
    queryFn: async () => {
      const myTemplates = await base44.entities.MealPlanTemplate.filter({ created_by: user?.email });
      const publicTemplates = await base44.entities.MealPlanTemplate.filter({ is_public: true });
      const allTemplates = [...myTemplates, ...publicTemplates];
      // Deduplicate by id
      return allTemplates.filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i);
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
      toast.success('✅ Pro meal plan saved and assigned successfully!');
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: (templateData) => base44.entities.MealPlanTemplate.create(templateData),
    onSuccess: () => {
      queryClient.invalidateQueries(['proTemplates']);
      toast.success("✅ Pro template saved! You can now use it unlimited times for FREE!");
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (planId) => base44.entities.MealPlan.delete(planId),
    onSuccess: () => {
      queryClient.invalidateQueries(['proMealPlans']);
      toast.success("Plan deleted successfully!");
    },
  });

  const handleDeletePlan = (plan) => {
    if (window.confirm(`Are you sure you want to delete "${plan.name}"? This cannot be undone.`)) {
      deletePlanMutation.mutate(plan.id);
    }
  };

  const handleEditSavedPlan = (plan) => {
    // Load saved plan into the generate tab for editing
    setGeneratedPlan({
      ...plan,
      meal_plan: plan.meals,
      client_name: clients.find(c => c.id === plan.client_id)?.full_name || '',
      calculations: {
        target_calories: plan.target_calories || 0,
        bmr: 0,
        tdee: 0,
        macros: { carbs_g: 0, protein_g: 0, fats_g: 0 }
      },
      decision_rules: plan.decision_rules_applied || [],
      conflict_resolution: plan.conflict_resolution || '',
      mpess_integration: plan.mpess_integration || { affirmations: [], journaling_prompts: [], breathing_exercises: [], physical_activities: [], forgiveness_practices: [] },
      audit_snapshot: plan.audit_snapshot || {
        avg_calories_per_day: plan.target_calories || 0,
        calorie_range: '',
        macro_percentages: { carbs: 0, protein: 0, fats: 0 },
        sodium_compliance: '',
        potassium_compliance: '',
        medication_conflicts: false,
        variety_check: true,
        mpess_integrated: false
      }
    });
    setNumberOfDays(plan.duration || 10);
    setEditMode(true);
    setEditedMeals([...(plan.meals || [])]);
    setActiveTab("generate");
    toast.info("Plan loaded for editing. Make changes and save.");
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const latestIntake = clinicalIntakes?.[0];
  const hasCompletedIntake = latestIntake?.completed;



  const handleMedicalReportUpload = async (e) => {
    const newFiles = Array.from(e.target.files);
    if (!newFiles.length) return;
    
    // Add files with 'uploading' status
    const fileEntries = newFiles.map(file => ({ file, status: 'uploading', data: null, name: file.name }));
    setMedicalReportFiles(prev => [...prev, ...fileEntries]);
    setExtractingReport(true);

    // Analyze each file
    for (const entry of fileEntries) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: entry.file });
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
        setMedicalReportFiles(prev => prev.map(f => f.name === entry.name ? { ...f, status: 'done', data: result } : f));
        toast.success(`✅ ${entry.name} analyzed!`);
      } catch (err) {
        setMedicalReportFiles(prev => prev.map(f => f.name === entry.name ? { ...f, status: 'error' } : f));
        toast.error(`Failed to analyze ${entry.name}`);
      }
    }
    setExtractingReport(false);
    e.target.value = '';
  };

  // Merge all analyzed report data
  const getMergedReportData = () => {
    const doneFies = medicalReportFiles.filter(f => f.status === 'done' && f.data);
    if (!doneFies.length) return null;
    const merged = {
      health_conditions: [],
      lab_values: {},
      current_medications: [],
      additional_notes: '',
      stage_severity: ''
    };
    doneFies.forEach(f => {
      if (f.data.health_conditions) merged.health_conditions.push(...f.data.health_conditions);
      if (f.data.lab_values) Object.assign(merged.lab_values, f.data.lab_values);
      if (f.data.current_medications) merged.current_medications.push(...f.data.current_medications);
      if (f.data.additional_notes) merged.additional_notes += (merged.additional_notes ? '\n' : '') + f.data.additional_notes;
      if (f.data.stage_severity) merged.stage_severity = f.data.stage_severity;
    });
    merged.health_conditions = [...new Set(merged.health_conditions)];
    return merged;
  };

  const handleFoodPreferencesSubmit = (preferences) => {
    setFoodPreferences(preferences);
    setShowFoodPreferences(false);
    // Show diagnostic review before generating
    setShowDiagnostic(true);
  };

  const handleDiagnosticConfirm = (approvedRules) => {
    setShowDiagnostic(false);
    generateProPlan(foodPreferences, approvedRules);
  };

  const generateProPlan = async (preferences = foodPreferences, approvedRules = null) => {
    try {


      if (!selectedClientId || !selectedClient) {
        toast.error('Please select a client first'); return;
        return;
      }

      if (!clinicalIntakes || clinicalIntakes.length === 0) {
        toast.error('No clinical intake found. Please complete the clinical intake form first.'); return;
        return;
      }

      const intake = clinicalIntakes[0];

      if (!intake.completed) {
        toast.error('Clinical intake is not completed yet. Please complete the form first.'); return;
        return;
      }

      // Check AI credits availability
      const totalCredits = (coachSubscription?.ai_credits_included || 0) + (coachSubscription?.ai_credits_purchased || 0);
      const usedCredits = coachSubscription?.ai_credits_used_this_month || 0;
      const availableCredits = totalCredits - usedCredits;

      if (user?.user_type === 'student_coach' && availableCredits < 1) {
        toast.error('Insufficient AI credits. Please purchase more credits to generate meal plans.');
        navigate(createPageUrl('PurchaseAICredits'));
        return;
      }

      setGenerating(true);

      // Use manually uploaded report data (merged) OR latest stored report extracted_data
      const latestStoredReport = clientHealthReports?.[0]?.extracted_data || null;
      const reportDataToUse = getMergedReportData() || latestStoredReport;
      
      const prompt = constructDiamondPrompt(selectedClient, intake, numberOfDays, mealPattern, preferences, reportDataToUse, approvedRules);
      

      
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
      
      if (generatedDays.length < numberOfDays) {
        toast.warning(`AI only generated ${generatedDays.length}/${numberOfDays} days. Missing: ${expectedDays.filter(d => !generatedDays.includes(d)).join(', ')}. Try regenerating.`);
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

      toast.success('Pro meal plan generated! Scroll down to review.');
      setGenerating(false);

    } catch (error) {
      console.error('❌ Error:', error);
      toast.error(error.message || 'Failed to generate meal plan');
      setGenerating(false);
    }
  };

  const handleSavePlan = () => {
    if (!generatedPlan) return;

    const mealsToSave = editMode ? editedMeals : (generatedPlan.meal_plan || generatedPlan.meals || []);
    const mpess = generatedPlan.mpess_integration || {};

    savePlanMutation.mutate({
      client_id: generatedPlan.client_id,
      name: `Therapeutic & Holistic Plan - ${generatedPlan.client_name}`,
      plan_tier: 'advanced',
      duration: numberOfDays,
      meal_pattern: mealPattern,
      target_calories: generatedPlan.calculations?.target_calories || 0,
      disease_focus: latestIntake?.health_conditions || [],
      meals: mealsToSave,
      food_preference: latestIntake?.diet_type?.toLowerCase() || 'general',
      active: true,
      mpess_integration: {
        affirmations: mpess.affirmations || [],
        journaling_prompts: mpess.journaling_prompts || [],
        breathing_exercises: mpess.breathing_exercises || [],
        physical_activities: mpess.physical_activities || [],
        forgiveness_practices: mpess.forgiveness_practices || []
      },
      audit_snapshot: generatedPlan.audit_snapshot || {},
      decision_rules_applied: generatedPlan.decision_rules || [],
      conflict_resolution: generatedPlan.conflict_resolution || '',
      created_by: user?.email
    });
  };

  const handleSaveAsProTemplate = (plan) => {
    const targetCal = plan.calculations?.target_calories || 0;
    const templateName = prompt("Enter Pro template name:", `Pro ${latestIntake?.health_conditions?.join('+') || 'Clinical'} Plan - ${targetCal} cal`);
    if (!templateName) return;

    const mealsForTemplate = plan.meal_plan || plan.meals || [];

    saveTemplateMutation.mutate({
      name: templateName,
      description: `Disease-specific template for ${latestIntake?.health_conditions?.join(', ') || 'various conditions'}`,
      category: latestIntake?.health_conditions?.[0]?.toLowerCase() || 'general',
      duration: numberOfDays,
      target_calories: targetCal,
      food_preference: latestIntake?.diet_type?.toLowerCase() || 'general',
      regional_preference: 'all',
      meals: mealsForTemplate,
      is_public: false,
      times_used: 0,
      tags: ['pro', 'disease-specific', ...(latestIntake?.health_conditions || [])],
      created_by: user?.email
    });
  };

  const cloneProTemplate = (template) => {
    if (!selectedClient) {
      toast.error("Please select a client first"); return;
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
      toast.error("Please select a client first before saving a manual plan."); return;
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
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1">🌿 Mealie Pro</h1>
            <p className="text-sm md:text-base text-gray-600">Therapeutic Meal & Holistic Wellness Planning</p>
          </div>
          <Badge className="bg-purple-600 text-white text-sm md:text-base px-3 py-1.5 md:px-4 md:py-2 self-start sm:self-auto">
            Advanced Tier
          </Badge>
        </div>

        <Alert className="bg-gradient-to-r from-purple-100 to-indigo-100 border-purple-300">
          <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <AlertDescription className="text-xs sm:text-sm">
            <strong>Pro Features:</strong> Multi-day rotation plans • Holistic MPESS wellness • Lab tracking • Audit compliance • Personalized nutrition
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
                    <ClientSearchSelect clients={clients} value={selectedClientId} onChange={setSelectedClientId} placeholder="Search or select client..." />
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
                  <ClientSearchSelect clients={clients} value={selectedClientId} onChange={setSelectedClientId} placeholder="Search or select client..." />
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
                  <h2 className="text-lg md:text-2xl font-bold">Therapeutic Meal & Holistic Plan</h2>
                  <p className="text-white/90 mt-1 text-sm md:text-base">
                   Personalized clinical nutrition with holistic MPESS wellness integration
                  </p>
                </div>
                <div className="p-4 md:p-6 space-y-5 bg-white">
                  {/* Client Selection */}
                  <div className="space-y-2">
                    <label className="text-base font-semibold flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Select Client *
                    </label>
                    <ClientSearchSelect clients={clients} value={selectedClientId} onChange={setSelectedClientId} placeholder="Search or select client..." />
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

                      {/* Stored Reports Info */}
                      {clientHealthReports?.length > 0 && medicalReportFiles.length === 0 && (
                        <Alert className="bg-green-50 border-green-300">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <AlertDescription className="text-sm">
                            <strong>{clientHealthReports.length} medical report(s)</strong> found for this client. They will automatically be used to personalize the meal plan.
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Medical Report Upload - Multiple */}
                      <div className="border-2 border-dashed border-indigo-200 rounded-xl p-4 bg-indigo-50/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Wand2 className="w-4 h-4 text-indigo-600" />
                          <span className="font-semibold text-indigo-900 text-sm">Upload Medical Reports (Optional)</span>
                          <Badge className="bg-indigo-100 text-indigo-700 text-xs border-0">AI Enhanced</Badge>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">Upload multiple blood reports, lab results, or prescriptions — AI will auto-analyze and merge all data to personalize the meal plan.</p>
                        
                        {/* Uploaded files list */}
                        {medicalReportFiles.length > 0 && (
                          <div className="space-y-2 mb-3">
                            {medicalReportFiles.map((entry, i) => (
                              <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-indigo-100">
                                {entry.status === 'uploading' ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500 flex-shrink-0" />
                                ) : entry.status === 'done' ? (
                                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                ) : (
                                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-gray-800 truncate">{entry.name}</p>
                                  {entry.status === 'done' && entry.data && (
                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                      {entry.data.health_conditions?.slice(0, 3).map((c, j) => (
                                        <Badge key={j} className="bg-red-100 text-red-700 text-xs border-0 py-0">{c}</Badge>
                                      ))}
                                      {entry.data.lab_values && Object.keys(entry.data.lab_values).length > 0 && (
                                        <Badge className="bg-purple-100 text-purple-700 text-xs border-0 py-0">{Object.keys(entry.data.lab_values).length} lab vals</Badge>
                                      )}
                                    </div>
                                  )}
                                  {entry.status === 'uploading' && <p className="text-xs text-indigo-500">Analyzing with AI...</p>}
                                  {entry.status === 'error' && <p className="text-xs text-red-500">Analysis failed</p>}
                                </div>
                                <button
                                  onClick={() => setMedicalReportFiles(prev => prev.filter((_, idx) => idx !== i))}
                                  className="text-gray-400 hover:text-red-500 flex-shrink-0"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <label className="flex items-center justify-center gap-2 w-full h-10 rounded-lg border cursor-pointer font-medium text-sm bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:opacity-90 transition-all">
                          <Upload className="w-4 h-4" />
                          {medicalReportFiles.length > 0 ? 'Add More Reports' : 'Upload Reports (Image / PDF)'}
                          <input type="file" accept="image/*,.pdf" multiple onChange={handleMedicalReportUpload} className="hidden" />
                        </label>
                        
                        {medicalReportFiles.filter(f => f.status === 'done').length > 0 && (
                          <p className="text-xs text-green-700 text-center mt-2 font-medium">
                            ✅ {medicalReportFiles.filter(f => f.status === 'done').length} report(s) analyzed & will be merged for meal plan
                          </p>
                        )}
                      </div>
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
                          Generating Holistic Plan...
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
                    {(() => {
                      const allMeals = editMode ? editedMeals : (generatedPlan.meal_plan || generatedPlan.meals || []);
                      const actualDays = [...new Set(allMeals.map(m => m.day))].sort((a, b) => a - b);
                      const daysToShow = actualDays.length > 0 ? actualDays : Array.from({ length: numberOfDays }, (_, i) => i + 1);
                      const defaultDay = daysToShow[0]?.toString() || "1";
                      return (
                    <Tabs defaultValue={defaultDay} className="space-y-4">
                      <TabsList className="flex flex-wrap gap-1.5 h-auto bg-gray-100 p-1.5">
                        {daysToShow.map(day => (
                          <TabsTrigger key={day} value={day.toString()} className="text-xs px-2 py-1">
                            D{day}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {daysToShow.map(day => {
                        const dayMeals = allMeals.filter(m => m.day === day);
                        const dayTotals = dayMeals.reduce((acc, m) => ({
                          calories: acc.calories + (Number(m.calories) || 0),
                          protein: acc.protein + (Number(m.protein) || 0),
                          carbs: acc.carbs + (Number(m.carbs) || 0),
                          fats: acc.fats + (Number(m.fats) || 0),
                        }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
                        return (
                        <TabsContent key={day} value={day.toString()} className="space-y-3">
                          {/* Day Macro Summary */}
                          <div className="flex flex-wrap gap-3 p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200 text-sm">
                            <span className="font-semibold text-gray-700">Day {day} Totals:</span>
                            <span className="font-bold text-orange-600">{Math.round(dayTotals.calories)} kcal</span>
                            <span className="text-red-600">P: {Math.round(dayTotals.protein)}g</span>
                            <span className="text-yellow-600">C: {Math.round(dayTotals.carbs)}g</span>
                            <span className="text-purple-600">F: {Math.round(dayTotals.fats)}g</span>
                          </div>
                          {dayMeals.map((meal, index) => (
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
                            );
                            })}
                            </Tabs>
                            );
                            })()}
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
                    toast.success('Extra meal(s) added! Remember to save the plan when done.');
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
                {/* Filters */}
                <div className="mb-4 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      className="pl-9 h-10"
                      placeholder="Search plan by name or disease..."
                      value={planSearch}
                      onChange={(e) => setPlanSearch(e.target.value)}
                    />
                  </div>
                  <div className="sm:w-64">
                    <ClientSearchSelect clients={clients} value={selectedClientId} onChange={setSelectedClientId} placeholder="Filter by client..." />
                  </div>
                </div>
                {proMealPlans.length === 0 ? (
                  <p className="text-center text-gray-500 py-12">No Pro plans created yet</p>
                ) : (
                  <div className="space-y-4">
                    {proMealPlans.filter(plan => {
                      const matchesClient = !selectedClientId || plan.client_id === selectedClientId;
                      const searchLower = planSearch.toLowerCase();
                      const matchesPlan = !planSearch || 
                        plan.name?.toLowerCase().includes(searchLower) ||
                        plan.disease_focus?.some(d => d.toLowerCase().includes(searchLower));
                      return matchesClient && matchesPlan;
                    }).map(plan => {
                      const planClient = clients.find(c => c.id === plan.client_id);
                      return (
                        <Card key={plan.id} className="bg-purple-50 border border-purple-200">
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-base truncate">{plan.name}</CardTitle>
                                <p className="text-sm text-gray-600">{planClient?.full_name || 'Unknown Client'}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{new Date(plan.created_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                              </div>
                              <Badge className="bg-purple-600 flex-shrink-0">💎 Diamond</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              <Badge variant="outline">{plan.duration || 10} Days</Badge>
                              <Badge variant="outline">{plan.meal_pattern || '3-3-4'}</Badge>
                              {plan.target_calories && <Badge className="bg-orange-100 text-orange-700">{plan.target_calories} kcal</Badge>}
                              {plan.disease_focus?.map(disease => (
                                <Badge key={disease} className="bg-red-100 text-red-700 text-xs">
                                  {disease}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 text-purple-700 border-purple-300 hover:bg-purple-50"
                                onClick={() => setViewingPlan(plan)}
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 text-blue-700 border-blue-300 hover:bg-blue-50"
                                onClick={() => handleEditSavedPlan(plan)}
                              >
                                <Edit className="w-3.5 h-3.5 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-300 hover:bg-red-50"
                                onClick={() => handleDeletePlan(plan)}
                                disabled={deletePlanMutation.isPending}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
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

      {/* View Plan Dialog */}
      {viewingPlan && (
        <Dialog open={!!viewingPlan} onOpenChange={() => setViewingPlan(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">{viewingPlan.name}</DialogTitle>
              <p className="text-sm text-gray-500">{clients.find(c => c.id === viewingPlan.client_id)?.full_name} • {viewingPlan.duration || 10} Days</p>
            </DialogHeader>
            <div className="space-y-4">
              {/* Disease Focus */}
              {viewingPlan.disease_focus?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {viewingPlan.disease_focus.map(d => (
                    <Badge key={d} className="bg-red-100 text-red-700">{d}</Badge>
                  ))}
                </div>
              )}
              {/* Macros */}
              {viewingPlan.audit_snapshot && (
                <div className="grid grid-cols-3 gap-3 p-3 bg-purple-50 rounded-xl">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Avg Cal/Day</p>
                    <p className="font-bold text-purple-700">{viewingPlan.audit_snapshot.avg_calories_per_day} kcal</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Calorie Range</p>
                    <p className="font-bold text-purple-700 text-xs">{viewingPlan.audit_snapshot.calorie_range}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">C/P/F %</p>
                    <p className="font-bold text-purple-700 text-xs">
                      {viewingPlan.audit_snapshot.macro_percentages?.carbs}%/{viewingPlan.audit_snapshot.macro_percentages?.protein}%/{viewingPlan.audit_snapshot.macro_percentages?.fats}%
                    </p>
                  </div>
                </div>
              )}
              {/* Meal Plan by Day */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Meal Plan ({[...new Set((viewingPlan.meals || []).map(m => m.day))].length} days)</h3>
                {[...new Set((viewingPlan.meals || []).map(m => m.day))].sort((a, b) => a - b).map(day => (
                  <div key={day} className="mb-2 border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors font-medium text-sm"
                      onClick={() => setExpandedPlanId(expandedPlanId === `${viewingPlan.id}-${day}` ? null : `${viewingPlan.id}-${day}`)}
                    >
                      <span>Day {day}</span>
                      {expandedPlanId === `${viewingPlan.id}-${day}` ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {expandedPlanId === `${viewingPlan.id}-${day}` && (
                      <div className="divide-y">
                        {(viewingPlan.meals || []).filter(m => m.day === day).map((meal, i) => (
                          <div key={i} className="px-4 py-3">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-medium text-sm capitalize text-purple-700">{meal.meal_type?.replace(/_/g, ' ')}</span>
                              <Badge variant="outline" className="text-xs">{meal.calories} kcal</Badge>
                            </div>
                            <p className="text-sm font-semibold text-gray-800 mb-1">{meal.meal_name}</p>
                            <ul className="space-y-0.5">
                              {meal.items?.map((item, j) => (
                                <li key={j} className="flex justify-between text-xs text-gray-600">
                                  <span>{item}</span>
                                  <span className="text-gray-400 ml-2">{meal.portion_sizes?.[j]}</span>
                                </li>
                              ))}
                            </ul>
                            <div className="flex gap-3 mt-2 text-xs text-gray-500">
                              <span className="text-red-600">P: {meal.protein}g</span>
                              <span className="text-yellow-600">C: {meal.carbs}g</span>
                              <span className="text-purple-600">F: {meal.fats}g</span>
                            </div>
                            {meal.disease_rationale && (
                              <p className="text-xs text-green-700 mt-1 italic">💡 {meal.disease_rationale}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* MPESS in View Dialog */}
              {viewingPlan.mpess_integration && Object.values(viewingPlan.mpess_integration).some(v => Array.isArray(v) && v.length > 0) && (
                <div className="border border-pink-200 rounded-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 py-3">
                    <h3 className="font-bold text-sm">🧘 MPESS Wellness Practices</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    {viewingPlan.mpess_integration.affirmations?.length > 0 && (
                      <div>
                        <p className="font-semibold text-xs text-purple-700 mb-1 uppercase tracking-wide">✨ Affirmations</p>
                        {viewingPlan.mpess_integration.affirmations.map((a, i) => (
                          <p key={i} className="text-xs text-gray-700 py-1 border-l-2 border-purple-300 pl-2 mb-1">"{a}"</p>
                        ))}
                      </div>
                    )}
                    {viewingPlan.mpess_integration.journaling_prompts?.length > 0 && (
                      <div>
                        <p className="font-semibold text-xs text-blue-700 mb-1 uppercase tracking-wide">📝 Journaling Prompts</p>
                        {viewingPlan.mpess_integration.journaling_prompts.map((p, i) => (
                          <p key={i} className="text-xs text-gray-700 py-1 border-l-2 border-blue-300 pl-2 mb-1">{p}</p>
                        ))}
                      </div>
                    )}
                    {viewingPlan.mpess_integration.breathing_exercises?.length > 0 && (
                      <div>
                        <p className="font-semibold text-xs text-red-700 mb-1 uppercase tracking-wide">🌬️ Breathing Exercises</p>
                        {viewingPlan.mpess_integration.breathing_exercises.map((e, i) => (
                          <p key={i} className="text-xs text-gray-700 py-1 border-l-2 border-red-300 pl-2 mb-1">{e}</p>
                        ))}
                      </div>
                    )}
                    {viewingPlan.mpess_integration.physical_activities?.length > 0 && (
                      <div>
                        <p className="font-semibold text-xs text-green-700 mb-1 uppercase tracking-wide">🏃 Physical Activities</p>
                        {viewingPlan.mpess_integration.physical_activities.map((a, i) => (
                          <p key={i} className="text-xs text-gray-700 py-1 border-l-2 border-green-300 pl-2 mb-1">{a}</p>
                        ))}
                      </div>
                    )}
                    {viewingPlan.mpess_integration.forgiveness_practices?.length > 0 && (
                      <div>
                        <p className="font-semibold text-xs text-pink-700 mb-1 uppercase tracking-wide">💗 Forgiveness Practices</p>
                        {viewingPlan.mpess_integration.forgiveness_practices.map((p, i) => (
                          <p key={i} className="text-xs text-gray-700 py-1 border-l-2 border-pink-300 pl-2 mb-1">{p}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => { handleEditSavedPlan(viewingPlan); setViewingPlan(null); }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit This Plan
                </Button>
                <Button variant="outline" onClick={() => setViewingPlan(null)} className="flex-1">Close</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}