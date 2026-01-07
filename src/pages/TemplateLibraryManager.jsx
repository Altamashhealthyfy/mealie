import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  FileText,
  Download,
  Trash2,
  CheckCircle,
  Loader2,
  Shield,
  Star,
  Eye,
  Sparkles,
  FileSpreadsheet,
  AlertTriangle,
  Edit,
  Copy,
  ChefHat,
  Plus,
  Lock,
  Crown
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCoachPlanPermissions } from "@/components/permissions/useCoachPlanPermissions";
import { createPageUrl } from "@/utils";

export default function TemplateLibraryManager() {
  const { user, canAccessTemplateManager, isLoading: permissionsLoading } = useCoachPlanPermissions();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [viewingTemplate, setViewingTemplate] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editingMealPlanTemplate, setEditingMealPlanTemplate] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkFiles, setBulkFiles] = useState([]);
  const [bulkMetadata, setBulkMetadata] = useState([]);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showEditMealPlanDialog, setShowEditMealPlanDialog] = useState(false);
  const [selectedMealPlan, setSelectedMealPlan] = useState(null);
  const [convertFormData, setConvertFormData] = useState({
    name: "",
    description: "",
    is_public: false
  });
  const [mealPlanEditFormData, setMealPlanEditFormData] = useState({
    name: "",
    description: "",
    is_public: false
  });
  const [activeTab, setActiveTab] = useState("downloadable");
  const [showAIGenerateDialog, setShowAIGenerateDialog] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiGeneratedPlan, setAiGeneratedPlan] = useState(null);
  const [aiFormData, setAiFormData] = useState({
    name: "",
    target_calories: "1800",
    food_preference: "veg",
    regional_preference: "all",
    duration: "7",
    description: ""
  });
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "meal_plan",
    subcategory: "weight_loss",
    target_calories: "",
    food_preference: "veg",
    regional_preference: "all",
    duration: "7",
    tags: "",
    is_premium: false
  });

  // Check access for student_coach
  if (!permissionsLoading && user?.user_type === 'student_coach' && !canAccessTemplateManager) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl bg-gradient-to-br from-amber-50 to-yellow-50">
          <CardHeader>
            <Lock className="w-16 h-16 mx-auto text-amber-500 mb-4" />
            <CardTitle className="text-center text-2xl">Feature Not Available</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Template Manager is not included in your current plan.
            </p>
            <Alert className="bg-white border-amber-300">
              <Crown className="w-5 h-5 text-amber-600" />
              <AlertDescription>
                Upgrade your plan to manage and upload templates.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => window.location.href = createPageUrl('CoachSubscriptions')}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: coachSubscription } = useQuery({
    queryKey: ['coachSubscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.HealthCoachSubscription.filter({ 
        coach_email: user?.email,
        status: 'active'
      });
      return subs[0] || null;
    },
    enabled: !!user && user?.user_type === 'student_coach',
  });

  const { data: coachPlan } = useQuery({
    queryKey: ['coachPlan', coachSubscription?.plan_id],
    queryFn: async () => {
      if (!coachSubscription?.plan_id) return null;
      const plans = await base44.entities.HealthCoachPlan.filter({ id: coachSubscription.plan_id });
      return plans[0] || null;
    },
    enabled: !!coachSubscription?.plan_id,
  });

  const { data: templates } = useQuery({
    queryKey: ['downloadableTemplates'],
    queryFn: () => base44.entities.DownloadableTemplate.list('-created_date'),
    initialData: [],
  });

  const { data: mealPlanTemplates } = useQuery({
    queryKey: ['mealPlanTemplates'],
    queryFn: async () => {
      const myTemplates = await base44.entities.MealPlanTemplate.filter({ created_by: user?.email });
      const publicTemplates = await base44.entities.MealPlanTemplate.filter({ is_public: true });
      const combinedTemplates = [...myTemplates, ...publicTemplates];
      const uniqueTemplates = Array.from(new Map(combinedTemplates.map(item => [item.id, item])).values());
      return uniqueTemplates;
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: mealPlans } = useQuery({
    queryKey: ['mealPlans'],
    queryFn: async () => {
      const allPlans = await base44.entities.MealPlan.list('-created_date');
      if (user?.user_type === 'super_admin') {
        return allPlans;
      }
      return allPlans.filter(plan => plan.created_by === user?.email);
    },
    enabled: !!user,
    initialData: [],
  });

  const convertMealPlanMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.MealPlanTemplate.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['mealPlanTemplates']);
      setShowConvertDialog(false);
      setSelectedMealPlan(null);
      setConvertFormData({ name: "", description: "", is_public: false });
      alert("✅ Meal plan converted to template successfully!");
    },
  });

  const updateMealPlanTemplateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.MealPlanTemplate.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['mealPlanTemplates']);
      setShowEditMealPlanDialog(false);
      setEditingMealPlanTemplate(null);
      alert("✅ Meal plan template updated successfully!");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (data) => {
      if (editingTemplate && !selectedFile) {
        const updateData = {
          ...data,
          last_updated: new Date().toISOString().split('T')[0]
        };
        return await base44.entities.DownloadableTemplate.update(editingTemplate.id, updateData);
      }
      
      if (selectedFile) {
        const uploadResult = await base44.integrations.Core.UploadFile({ file: selectedFile });
        const fileSizeMB = (selectedFile.size / (1024 * 1024)).toFixed(1);
        const fileSizeKB = (selectedFile.size / 1024).toFixed(1);
        const fileSize = fileSizeMB >= 1 ? `${fileSizeMB} MB` : `${fileSizeKB} KB`;
        const fileType = selectedFile.name.split('.').pop().toLowerCase();
        
        const templateData = {
          ...data,
          file_url: uploadResult.file_url,
          file_type: fileType,
          file_size: fileSize,
          download_count: editingTemplate?.download_count || 0,
          version: editingTemplate ? (parseFloat(editingTemplate.version || '1.0') + 0.1).toFixed(1) : "1.0",
          last_updated: new Date().toISOString().split('T')[0]
        };
        
        if (editingTemplate) {
          return await base44.entities.DownloadableTemplate.update(editingTemplate.id, templateData);
        } else {
          return await base44.entities.DownloadableTemplate.create(templateData);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['downloadableTemplates']);
      setSelectedFile(null);
      setEditingTemplate(null);
      setFormData({
        name: "",
        description: "",
        category: "meal_plan",
        subcategory: "weight_loss",
        target_calories: "",
        food_preference: "veg",
        regional_preference: "all",
        duration: "7",
        tags: "",
        is_premium: false
      });
      alert(editingTemplate ? "✅ Template updated!" : "✅ Template uploaded!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DownloadableTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['downloadableTemplates']);
      alert("✅ Template deleted successfully!");
    },
  });

  const deleteMealPlanTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.MealPlanTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['mealPlanTemplates']);
      alert("✅ Template deleted successfully!");
    },
  });

  const generateAITemplateMutation = useMutation({
    mutationFn: async (templateData) => {
      return await base44.entities.MealPlanTemplate.create(templateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['mealPlanTemplates']);
      setShowAIGenerateDialog(false);
      setAiGeneratedPlan(null);
      setAiFormData({
        name: "",
        target_calories: "1800",
        food_preference: "veg",
        regional_preference: "all",
        duration: "7",
        description: ""
      });
      alert("✅ AI template created successfully!");
    },
  });

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setSelectedFile(null);
    setFormData({
      name: template.name,
      description: template.description,
      category: template.category,
      subcategory: template.subcategory || "weight_loss",
      target_calories: template.target_calories?.toString() || "",
      food_preference: template.food_preference || "veg",
      regional_preference: template.regional_preference || "all",
      duration: template.duration?.toString() || "7",
      tags: template.tags?.join(', ') || "",
      is_premium: template.is_premium || false
    });
    setActiveTab("downloadable");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditMealPlanTemplate = (template) => {
    setEditingMealPlanTemplate(template);
    setMealPlanEditFormData({
      name: template.name,
      description: template.description || "",
      is_public: template.is_public || false
    });
    setShowEditMealPlanDialog(true);
  };

  const handleSaveMealPlanTemplateEdit = () => {
    if (!mealPlanEditFormData.name.trim()) {
      alert("Please enter a template name");
      return;
    }

    updateMealPlanTemplateMutation.mutate({
      id: editingMealPlanTemplate.id,
      data: {
        name: mealPlanEditFormData.name,
        description: mealPlanEditFormData.description,
        is_public: mealPlanEditFormData.is_public
      }
    });
  };

  const handleConvertMealPlan = (plan) => {
    setSelectedMealPlan(plan);
    setConvertFormData({
      name: `${plan.name} - Template`,
      description: `Reusable template from ${plan.name}`,
      is_public: false
    });
  };

  const handleConvertSave = () => {
    if (!convertFormData.name.trim()) {
      alert("Please enter a template name");
      return;
    }

    convertMealPlanMutation.mutate({
      name: convertFormData.name,
      description: convertFormData.description,
      category: selectedMealPlan.plan_tier === 'advanced' ? 'disease_reversal' : 'general',
      duration: selectedMealPlan.duration,
      target_calories: selectedMealPlan.target_calories,
      food_preference: selectedMealPlan.food_preference,
      regional_preference: selectedMealPlan.regional_preference,
      meals: selectedMealPlan.meals,
      is_public: convertFormData.is_public,
      times_used: 0,
      tags: [
        selectedMealPlan.food_preference,
        `${selectedMealPlan.target_calories}cal`,
        `${selectedMealPlan.duration}days`
      ]
    });
  };

  const handleAIGenerate = async () => {
    if (!aiFormData.target_calories || !aiFormData.duration) {
      alert("Please fill in all required fields");
      return;
    }

    setGeneratingAI(true);
    try {
      const targetCalories = parseInt(aiFormData.target_calories);
      const duration = parseInt(aiFormData.duration);

      const prompt = `Generate a complete ${duration}-day Indian meal plan template with ALL meal types for EVERY day.

Target Calories: ${targetCalories} kcal per day
Food Preference: ${aiFormData.food_preference}
Regional Preference: ${aiFormData.regional_preference}

CRITICAL REQUIREMENTS:

1. COMPLETE MEAL STRUCTURE - EVERY DAY MUST HAVE ALL 6 MEALS:
   - Early Morning (6-7 AM)
   - Breakfast (8-9 AM)
   - Mid-Morning (11 AM)
   - Lunch (1-2 PM)
   - Evening Snack (4-5 PM)
   - Dinner (7-8 PM)

2. TOTAL MEALS REQUIRED: ${duration * 6} meals (${duration} days × 6 meals per day)

3. EARLY MORNING - SAME FOR ALL ${duration} DAYS:
   - Give the EXACT SAME early morning drink for ALL days
   - DO NOT rotate or vary this meal
   - Example: "1 glass warm water (250ml) with lemon juice"

4. VARIETY ACROSS DAYS (except early morning):
   - Create DIFFERENT meals for breakfast, lunch, dinner across days
   - Do NOT repeat the same meal more than 2 times
   - Rotate between different cuisines and preparations

5. LUNCH - ONLY TRADITIONAL OPTIONS:
   - MUST be either: Roti + Sabji OR Dal + Rice
   - Example: "2 roti + aloo gobi + cucumber raita"
   - Example: "Dal tadka + jeera rice + baingan bharta"

6. PORTION SIZES - USE CORRECT UNITS:
   - Flatbreads: "2 medium roti (60g total)" NOT katori
   - Cooked foods: "1 small katori dal (150g cooked)"
   - Drinks: "1 glass milk (200ml)"

7. CALORIE DISTRIBUTION PER DAY (MUST TOTAL ${targetCalories} kcal):
   - Early Morning: 0-50 kcal
   - Breakfast: 30-35% (${Math.round(targetCalories * 0.32)} kcal)
   - Mid-Morning: 8-10% (${Math.round(targetCalories * 0.09)} kcal)
   - Lunch: 30-35% (${Math.round(targetCalories * 0.32)} kcal)
   - Evening: 8-10% (${Math.round(targetCalories * 0.09)} kcal)
   - Dinner: 20-25% (${Math.round(targetCalories * 0.22)} kcal)

8. EACH MEAL MUST INCLUDE:
   - day: day number (1 to ${duration})
   - meal_type: "early_morning", "breakfast", "mid_morning", "lunch", "evening_snack", "dinner"
   - meal_name: descriptive name
   - items: array of food items
   - portion_sizes: array matching items
   - calories, protein, carbs, fats: nutritional values
   - nutritional_tip: short health tip

Return EXACTLY ${duration * 6} meals with proper variety and complete nutrition data.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
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

      setAiGeneratedPlan(response.meals);
      alert(`✅ Generated ${response.meals.length} meals! Review and save as template.`);
    } catch (error) {
      console.error("AI generation error:", error);
      alert("Failed to generate template. Please try again.");
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSaveAITemplate = () => {
    if (!aiFormData.name.trim()) {
      alert("Please enter a template name");
      return;
    }

    if (!aiGeneratedPlan || aiGeneratedPlan.length === 0) {
      alert("No meals generated yet");
      return;
    }

    generateAITemplateMutation.mutate({
      name: aiFormData.name,
      description: aiFormData.description || `AI-generated ${aiFormData.duration}-day meal plan template`,
      category: "general",
      duration: parseInt(aiFormData.duration),
      target_calories: parseInt(aiFormData.target_calories),
      food_preference: aiFormData.food_preference,
      regional_preference: aiFormData.regional_preference,
      meals: aiGeneratedPlan,
      is_public: false,
      times_used: 0,
      tags: [
        aiFormData.food_preference,
        `${aiFormData.target_calories}cal`,
        `${aiFormData.duration}days`,
        "ai-generated"
      ]
    });
  };

  const handleUpload = async () => {
    if (!editingTemplate && !selectedFile) {
      alert("Please select a file first");
      return;
    }
    if (!formData.name) {
      alert("Please enter template name");
      return;
    }

    setUploading(true);
    try {
      const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      await uploadMutation.mutateAsync({
        name: formData.name,
        description: formData.description,
        category: formData.category,
        subcategory: formData.subcategory,
        target_calories: formData.target_calories ? parseInt(formData.target_calories) : null,
        food_preference: formData.food_preference,
        regional_preference: formData.regional_preference,
        duration: formData.duration ? parseInt(formData.duration) : null,
        tags: tagsArray,
        is_premium: formData.is_premium
      });
    } catch (error) {
      console.error(error);
      alert(`Error ${editingTemplate ? "updating" : "uploading"} template`);
    } finally {
      setUploading(false);
    }
  };

  const handleBulkAnalyze = async () => {
    if (bulkFiles.length === 0) {
      alert("Please select files first");
      return;
    }

    setBulkUploading(true);
    try {
      const uploadPromises = bulkFiles.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const uploadResults = await Promise.all(uploadPromises);

      const metadataPromises = uploadResults.map((uploadResult, index) => {
        const file = bulkFiles[index];
        return base44.integrations.Core.InvokeLLM({
          prompt: `Analyze this meal plan/template file and extract metadata.

Filename: "${file.name}"

Extract:
1. Template name
2. Category (meal_plan, recipe, business_strategy, marketing_material, client_tracker, assessment_form, other)
3. Subcategory (weight_loss, weight_gain, diabetes, pcos, thyroid, pregnancy, kids, muscle_gain, maintenance, general)
4. Target calories
5. Food preference (veg, non_veg, jain, mixed, all)
6. Regional preference (north, south, west, east, all)
7. Duration in days
8. Short description
9. 3-5 relevant tags`,
          file_urls: [uploadResult.file_url],
          response_json_schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              category: { type: "string" },
              subcategory: { type: "string" },
              target_calories: { type: "number" },
              food_preference: { type: "string" },
              regional_preference: { type: "string" },
              duration: { type: "number" },
              description: { type: "string" },
              tags: { type: "array", items: { type: "string" } }
            },
            required: ["name", "category", "description", "tags"]
          }
        }).then(data => ({
          ...data,
          file_url: uploadResult.file_url,
          file_size: `${(file.size / 1024).toFixed(1)} KB`,
          file_type: file.name.split('.').pop().toLowerCase()
        }));
      });

      const metadata = await Promise.all(metadataPromises);
      setBulkMetadata(metadata);
      alert("✅ AI analysis complete! Review and save.");
    } catch (error) {
      console.error(error);
      alert("Error analyzing files");
    } finally {
      setBulkUploading(false);
    }
  };

  const handleBulkSave = async () => {
    try {
      await base44.entities.DownloadableTemplate.bulkCreate(
        bulkMetadata.map(m => ({
          ...m,
          download_count: 0,
          version: "1.0",
          last_updated: new Date().toISOString().split('T')[0]
        }))
      );
      queryClient.invalidateQueries(['downloadableTemplates']);
      setBulkFiles([]);
      setBulkMetadata([]);
      setShowBulkDialog(false);
      alert(`✅ Successfully uploaded ${bulkMetadata.length} templates!`);
    } catch (error) {
      console.error(error);
      alert("Error saving templates");
    }
  };

  const userType = user?.user_type || 'client';
  const canUploadTemplates = userType === 'super_admin' || 
                              (userType === 'team_member' && user?.team_roles?.includes('operations')) ||
                              (userType === 'student_coach' && coachPlan?.can_contribute_templates === true);
  const isSuperAdmin = userType === 'super_admin';
  
  if (!canUploadTemplates) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl">
          <CardHeader>
            <Shield className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <CardTitle className="text-center text-2xl">Access Restricted</CardTitle>
            <CardDescription className="text-center text-lg">
              Template contribution is not available in your current plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <AlertDescription>
                Please upgrade your plan to contribute templates to the marketplace.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canDeleteTemplate = (template) => {
    return isSuperAdmin || template.created_by === user?.email;
  };

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <Badge className="bg-purple-600 text-white mb-2">
              <Shield className="w-4 h-4 mr-1" />
              Template Manager
            </Badge>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">Template Library Manager</h1>
            <p className="text-sm md:text-base text-gray-600">Manage all templates</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-2xl md:text-3xl font-bold text-gray-900">{templates.length + mealPlanTemplates.length}</p>
            <p className="text-xs md:text-sm text-gray-600">Total Templates</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Button
            onClick={() => setShowAIGenerateDialog(true)}
            className="bg-gradient-to-r from-orange-500 to-red-500 h-14 text-base"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            AI Generate Template
          </Button>

          <Button
            onClick={() => setShowBulkDialog(true)}
            className="bg-gradient-to-r from-purple-500 to-indigo-500 h-14 text-base"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Smart Bulk Upload
          </Button>
          
          <Button
            onClick={() => { setShowConvertDialog(true); setSelectedMealPlan(null); }}
            className="bg-gradient-to-r from-green-500 to-emerald-500 h-14 text-base"
          >
            <Copy className="w-5 h-5 mr-2" />
            Convert Meal Plan
          </Button>
          
          <Button
            variant="outline"
            className="h-14 text-base"
            onClick={() => alert("Coming soon!")}
          >
            <FileSpreadsheet className="w-5 h-5 mr-2" />
            Excel Upload
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="downloadable">
              <FileText className="w-4 h-4 mr-2" />
              Files ({templates.length})
            </TabsTrigger>
            <TabsTrigger value="mealplans">
              <ChefHat className="w-4 h-4 mr-2" />
              Meal Plans ({mealPlanTemplates.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="downloadable" className="space-y-6">
            <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardHeader>
                <CardTitle className="text-xl md:text-2xl">
                  {editingTemplate ? 'Edit Template' : 'Upload New Template'}
                </CardTitle>
                <CardDescription>
                  {editingTemplate ? 'Update template details' : 'Upload Word/PDF/Excel files'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingTemplate && (
                  <Alert className="bg-blue-50 border-blue-500">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <AlertDescription>
                      Editing: {editingTemplate.name} (v{editingTemplate.version || '1.0'})
                    </AlertDescription>
                  </Alert>
                )}

                <div className="p-4 md:p-6 border-2 border-dashed border-blue-300 rounded-xl bg-white">
                  <div className="text-center">
                    <Upload className="w-10 md:w-12 h-10 md:h-12 mx-auto text-blue-500 mb-3" />
                    <p className="text-xs md:text-sm text-gray-700 mb-3">
                      {editingTemplate ? 'Upload new file (optional)' : 'Select file (.docx, .pdf, .xlsx)'}
                    </p>
                    <input
                      type="file"
                      accept=".docx,.pdf,.xlsx,.doc"
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                      className="w-full p-2 border rounded-lg text-sm"
                    />
                    {selectedFile && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-xs md:text-sm font-semibold text-green-900">
                          ✅ {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Name *</Label>
                    <Input
                      placeholder="Template name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="h-10 md:h-auto"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({...formData, category: value})}
                    >
                      <SelectTrigger className="h-10 md:h-auto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meal_plan">Meal Plan</SelectItem>
                        <SelectItem value="recipe">Recipe</SelectItem>
                        <SelectItem value="business_strategy">Business</SelectItem>
                        <SelectItem value="marketing_material">Marketing</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.category === 'meal_plan' && (
                    <>
                      <div className="space-y-2">
                       <Label className="text-sm">Subcategory</Label>
                       <Select
                         value={formData.subcategory}
                         onValueChange={(value) => setFormData({...formData, subcategory: value})}
                       >
                         <SelectTrigger className="h-10 md:h-auto">
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="weight_loss">Weight Loss</SelectItem>
                           <SelectItem value="weight_gain">Weight Gain</SelectItem>
                           <SelectItem value="diabetes">Diabetes</SelectItem>
                           <SelectItem value="pcos">PCOS</SelectItem>
                           <SelectItem value="thyroid">Thyroid</SelectItem>
                           <SelectItem value="pregnancy">Pregnancy</SelectItem>
                           <SelectItem value="kids">Kids</SelectItem>
                           <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                           <SelectItem value="maintenance">Maintenance</SelectItem>
                           <SelectItem value="eggetarian">Eggetarian Diet</SelectItem>
                           <SelectItem value="cholesterol">Cholesterol Management</SelectItem>
                           <SelectItem value="clinical_nutrition">Clinical Nutrition</SelectItem>
                           <SelectItem value="triglycerides">Triglycerides Control</SelectItem>
                           <SelectItem value="gluten_free">Gluten-Free Diet</SelectItem>
                           <SelectItem value="general">General</SelectItem>
                         </SelectContent>
                       </Select>
                      </div>

                      <div className="space-y-2">
                       <Label className="text-sm">Calories</Label>
                       <Input
                         type="number"
                         placeholder="1500"
                         value={formData.target_calories}
                         onChange={(e) => setFormData({...formData, target_calories: e.target.value})}
                         className="h-10 md:h-auto"
                       />
                      </div>

                      <div className="space-y-2">
                       <Label className="text-sm">Duration</Label>
                       <Input
                         type="number"
                         placeholder="7"
                         value={formData.duration}
                         onChange={(e) => setFormData({...formData, duration: e.target.value})}
                         className="h-10 md:h-auto"
                       />
                      </div>
                      </>
                      )}
                      </div>

                <div className="space-y-2">
                  <Label className="text-sm">Description</Label>
                  <Textarea
                    placeholder="Description..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Tags (comma-separated)</Label>
                  <Input
                    placeholder="weight loss, protein, etc"
                    value={formData.tags}
                    onChange={(e) => setFormData({...formData, tags: e.target.value})}
                    className="h-10 md:h-auto"
                  />
                </div>

                <div className="flex gap-3">
                  {editingTemplate && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingTemplate(null);
                        setSelectedFile(null);
                        setFormData({
                          name: "",
                          description: "",
                          category: "meal_plan",
                          subcategory: "weight_loss",
                          target_calories: "",
                          food_preference: "veg",
                          regional_preference: "all",
                          duration: "7",
                          tags: "",
                          is_premium: false
                        });
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    onClick={handleUpload}
                    disabled={uploading || (!editingTemplate && !selectedFile)}
                    className={`h-12 bg-gradient-to-r from-blue-500 to-cyan-500 ${editingTemplate ? 'flex-1' : 'w-full'}`}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        {editingTemplate ? 'Updating...' : 'Uploading...'}
                      </>
                    ) : (
                      <>
                        {editingTemplate ? <Edit className="w-5 h-5 mr-2" /> : <Upload className="w-5 h-5 mr-2" />}
                        {editingTemplate ? 'Update' : 'Upload'}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl md:text-2xl">Downloadable Templates ({templates.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {templates.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-600">No templates yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {templates.map((template) => (
                      <Card key={template.id} className="border-2">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between gap-2">
                            <CardTitle className="text-base truncate">{template.name}</CardTitle>
                            <Badge className="bg-blue-100 text-blue-700 uppercase text-xs">
                              {template.file_type}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-xs text-gray-600 line-clamp-2">{template.description}</p>
                          
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-xs capitalize">
                              {template.category?.replace('_', ' ')}
                            </Badge>
                            {template.target_calories && (
                              <Badge className="bg-orange-100 text-orange-700 text-xs">
                                {template.target_calories} kcal
                              </Badge>
                            )}
                          </div>

                          <div className="text-xs text-gray-500">
                            <p>📥 {template.download_count} downloads</p>
                            <p>📦 {template.file_size}</p>
                            <p>🔢 v{template.version || '1.0'}</p>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs"
                              onClick={() => setViewingTemplate(template)}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs"
                              onClick={() => handleEdit(template)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            {canDeleteTemplate(template) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 text-xs"
                                onClick={() => {
                                  if (confirm(`Delete "${template.name}"?`)) {
                                    deleteMutation.mutate(template.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mealplans" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl md:text-2xl">Meal Plan Templates ({mealPlanTemplates.length})</CardTitle>
                <CardDescription>Templates created from meal plans - use unlimited times FREE!</CardDescription>
              </CardHeader>
              <CardContent>
                {mealPlanTemplates.length === 0 ? (
                  <div className="text-center py-12">
                    <ChefHat className="w-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-600 mb-4">No meal plan templates yet</p>
                    <Button onClick={() => setShowConvertDialog(true)} className="bg-green-500">
                      <Plus className="w-4 h-4 mr-2" />
                      Convert First Template
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {mealPlanTemplates.map((template) => (
                      <Card key={template.id} className="border-2">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between gap-2">
                            <CardTitle className="text-base truncate">{template.name}</CardTitle>
                            {template.is_public && (
                              <Badge className="bg-blue-500 text-white text-xs">Public</Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-xs text-gray-600 line-clamp-2">{template.description}</p>
                          
                          <div className="flex flex-wrap gap-1">
                            <Badge className="bg-orange-100 text-orange-700 text-xs">
                              {template.duration} Days
                            </Badge>
                            <Badge className="bg-blue-100 text-blue-700 text-xs capitalize">
                              {template.food_preference}
                            </Badge>
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              {template.target_calories} kcal
                            </Badge>
                          </div>

                          <div className="text-xs text-gray-500">
                            <p>🔄 Used {template.times_used || 0} times</p>
                            <p>👤 {template.created_by === user?.email ? 'My Template' : 'Public'}</p>
                          </div>

                          <div className="flex gap-2">
                            {(template.created_by === user?.email || isSuperAdmin) && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 text-xs"
                                  onClick={() => handleEditMealPlanTemplate(template)}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 text-xs"
                                  onClick={() => {
                                    if (confirm(`Delete "${template.name}"?`)) {
                                      deleteMealPlanTemplateMutation.mutate(template.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-500" />
                AI Smart Bulk Upload
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {bulkMetadata.length === 0 ? (
                <>
                  <Alert className="bg-blue-50 border-blue-500">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <AlertDescription>
                      Upload multiple files - AI extracts all metadata automatically!
                    </AlertDescription>
                  </Alert>

                  <div className="p-6 border-2 border-dashed border-purple-300 rounded-xl bg-purple-50">
                    <div className="text-center">
                      <Upload className="w-12 h-12 mx-auto text-purple-500 mb-3" />
                      <p className="text-sm text-gray-700 mb-3">
                        Select multiple files (up to 50)
                      </p>
                      <input
                        type="file"
                        accept=".docx,.pdf,.doc"
                        multiple
                        onChange={(e) => setBulkFiles(Array.from(e.target.files))}
                        className="w-full p-2 border rounded-lg"
                      />
                      {bulkFiles.length > 0 && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                          <p className="font-semibold text-green-900">
                            ✅ {bulkFiles.length} files selected
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={handleBulkAnalyze}
                    disabled={bulkUploading || bulkFiles.length === 0}
                    className="w-full h-14 bg-gradient-to-r from-purple-500 to-indigo-500"
                  >
                    {bulkUploading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Analyze with AI
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Alert className="bg-green-50 border-green-500">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <AlertDescription>
                      AI Analysis Complete! Review and save.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {bulkMetadata.map((template, index) => (
                      <Card key={index} className="border-2">
                        <CardContent className="p-4">
                          <h3 className="font-bold">#{index + 1}: {template.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                          <div className="flex gap-2 mt-2">
                            {template.tags.map((tag, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setBulkMetadata([]);
                        setBulkFiles([]);
                      }}
                      className="flex-1"
                    >
                      Start Over
                    </Button>
                    <Button
                      onClick={handleBulkSave}
                      className="flex-1 bg-green-500 h-12"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Save All
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Copy className="w-6 h-6 text-green-600" />
                Convert Meal Plan to Template
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <Alert className="bg-green-50 border-green-500">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <AlertDescription>
                  Convert existing meal plans into reusable templates - use unlimited times FREE!
                </AlertDescription>
              </Alert>

              {!selectedMealPlan ? (
                <div className="space-y-3">
                  <Label className="text-lg font-semibold">Select Meal Plan:</Label>
                  {mealPlans.length === 0 ? (
                    <div className="text-center py-8">
                      <ChefHat className="w-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-600">No meal plans found</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {mealPlans.map((plan) => (
                        <Card 
                          key={plan.id} 
                          className="border-2 hover:border-green-500 cursor-pointer"
                          onClick={() => handleConvertMealPlan(plan)}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between">
                              <div>
                                <h3 className="font-bold">{plan.name}</h3>
                                <div className="flex gap-2 mt-2">
                                  <Badge className="text-xs">{plan.duration} Days</Badge>
                                  <Badge className="text-xs capitalize">{plan.food_preference}</Badge>
                                  <Badge className="text-xs">{plan.target_calories} kcal</Badge>
                                </div>
                              </div>
                              <Copy className="w-6 h-6 text-green-600" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Card className="border-2 border-green-500 bg-green-50">
                    <CardContent className="p-4">
                      <div className="flex justify-between mb-2">
                        <h3 className="font-bold text-green-900">Selected:</h3>
                        <Button variant="outline" size="sm" onClick={() => setSelectedMealPlan(null)}>
                          Change
                        </Button>
                      </div>
                      <p className="font-semibold">{selectedMealPlan.name}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge>{selectedMealPlan.duration} Days</Badge>
                        <Badge>{selectedMealPlan.target_calories} kcal</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Template Name *</Label>
                      <Input
                        value={convertFormData.name}
                        onChange={(e) => setConvertFormData({...convertFormData, name: e.target.value})}
                        placeholder="Template name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={convertFormData.description}
                        onChange={(e) => setConvertFormData({...convertFormData, description: e.target.value})}
                        placeholder="Description"
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="public"
                        checked={convertFormData.is_public}
                        onChange={(e) => setConvertFormData({...convertFormData, is_public: e.target.checked})}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="public" className="text-sm">Make public</Label>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowConvertDialog(false);
                          setSelectedMealPlan(null);
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleConvertSave}
                        disabled={convertMealPlanMutation.isPending}
                        className="flex-1 bg-green-500 h-12"
                      >
                        {convertMealPlanMutation.isPending ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Converting...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Create Template
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Meal Plan Template Dialog */}
        <Dialog open={showEditMealPlanDialog} onOpenChange={setShowEditMealPlanDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Edit className="w-6 h-6 text-blue-600" />
                Edit Meal Plan Template
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  value={mealPlanEditFormData.name}
                  onChange={(e) => setMealPlanEditFormData({...mealPlanEditFormData, name: e.target.value})}
                  placeholder="Template name"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={mealPlanEditFormData.description}
                  onChange={(e) => setMealPlanEditFormData({...mealPlanEditFormData, description: e.target.value})}
                  placeholder="Description"
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-public"
                  checked={mealPlanEditFormData.is_public}
                  onChange={(e) => setMealPlanEditFormData({...mealPlanEditFormData, is_public: e.target.checked})}
                  className="w-4 h-4"
                />
                <Label htmlFor="edit-public" className="text-sm">Make public</Label>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditMealPlanDialog(false);
                    setEditingMealPlanTemplate(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveMealPlanTemplateEdit}
                  disabled={updateMealPlanTemplateMutation.isPending}
                  className="flex-1 bg-blue-500 h-12"
                >
                  {updateMealPlanTemplateMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* AI Generate Template Dialog */}
        <Dialog open={showAIGenerateDialog} onOpenChange={setShowAIGenerateDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-orange-500" />
                AI Generate Complete Meal Plan Template
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <Alert className="bg-orange-50 border-orange-500">
                <Sparkles className="w-5 h-5 text-orange-600" />
                <AlertDescription>
                  AI will generate a complete {aiFormData.duration}-day meal plan with ALL 6 meals per day ({parseInt(aiFormData.duration) * 6} total meals) - ready to use unlimited times FREE!
                </AlertDescription>
              </Alert>

              {!aiGeneratedPlan ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Target Calories *</Label>
                      <Input
                        type="number"
                        placeholder="1800"
                        value={aiFormData.target_calories}
                        onChange={(e) => setAiFormData({...aiFormData, target_calories: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Duration (days) *</Label>
                      <Select
                        value={aiFormData.duration}
                        onValueChange={(value) => setAiFormData({...aiFormData, duration: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 Days</SelectItem>
                          <SelectItem value="10">10 Days</SelectItem>
                          <SelectItem value="15">15 Days</SelectItem>
                          <SelectItem value="21">21 Days</SelectItem>
                          <SelectItem value="30">30 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Food Preference *</Label>
                      <Select
                        value={aiFormData.food_preference}
                        onValueChange={(value) => setAiFormData({...aiFormData, food_preference: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="veg">Vegetarian</SelectItem>
                          <SelectItem value="non_veg">Non-Veg</SelectItem>
                          <SelectItem value="eggetarian">Eggetarian</SelectItem>
                          <SelectItem value="jain">Jain</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Regional Preference *</Label>
                      <Select
                        value={aiFormData.regional_preference}
                        onValueChange={(value) => setAiFormData({...aiFormData, regional_preference: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="north">North Indian</SelectItem>
                          <SelectItem value="south">South Indian</SelectItem>
                          <SelectItem value="west">West Indian</SelectItem>
                          <SelectItem value="east">East Indian</SelectItem>
                          <SelectItem value="all">All Regions</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={handleAIGenerate}
                    disabled={generatingAI}
                    className="w-full h-14 bg-gradient-to-r from-orange-500 to-red-500"
                  >
                    {generatingAI ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Generating {parseInt(aiFormData.duration) * 6} meals...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Generate Complete Meal Plan
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert className="bg-green-50 border-green-500">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <AlertDescription>
                      ✅ Successfully generated {aiGeneratedPlan.length} meals! Review and save as template.
                    </AlertDescription>
                  </Alert>

                  <div className="p-4 bg-white border-2 rounded-lg max-h-64 overflow-y-auto">
                    <h3 className="font-bold mb-3">Generated Meals Summary:</h3>
                    {Array.from({ length: parseInt(aiFormData.duration) }, (_, i) => i + 1).map(day => {
                      const dayMeals = aiGeneratedPlan.filter(m => m.day === day);
                      return (
                        <div key={day} className="mb-3 p-3 bg-gray-50 rounded">
                          <p className="font-semibold text-sm">Day {day} ({dayMeals.length} meals):</p>
                          <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                            {dayMeals.map((meal, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span className="capitalize text-gray-600">{meal.meal_type.replace('_', ' ')}:</span>
                                <span className="font-medium">{meal.meal_name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Template Name *</Label>
                      <Input
                        placeholder="e.g., Veg 1800 cal - 7 days Template"
                        value={aiFormData.name}
                        onChange={(e) => setAiFormData({...aiFormData, name: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Description (optional)</Label>
                      <Textarea
                        placeholder="Description"
                        value={aiFormData.description}
                        onChange={(e) => setAiFormData({...aiFormData, description: e.target.value})}
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAiGeneratedPlan(null);
                        setAiFormData({
                          name: "",
                          target_calories: "1800",
                          food_preference: "veg",
                          regional_preference: "all",
                          duration: "7",
                          description: ""
                        });
                      }}
                      className="flex-1"
                    >
                      Start Over
                    </Button>
                    <Button
                      onClick={handleSaveAITemplate}
                      disabled={generateAITemplateMutation.isPending}
                      className="flex-1 bg-green-500 h-12"
                    >
                      {generateAITemplateMutation.isPending ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Save as Template
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {viewingTemplate && (
          <Dialog open={!!viewingTemplate} onOpenChange={() => setViewingTemplate(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl">{viewingTemplate.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-gray-700">{viewingTemplate.description}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Category</p>
                    <p className="font-semibold capitalize">{viewingTemplate.category?.replace('_', ' ')}</p>
                  </div>
                  {viewingTemplate.target_calories && (
                    <div>
                      <p className="text-gray-600">Calories</p>
                      <p className="font-semibold">{viewingTemplate.target_calories} kcal</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {viewingTemplate.tags?.map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </div>

                <Alert>
                  <AlertDescription className="text-sm">
                    📥 {viewingTemplate.download_count} downloads<br/>
                    📦 {viewingTemplate.file_size}<br/>
                    🔢 v{viewingTemplate.version || '1.0'}
                  </AlertDescription>
                </Alert>

                <Button
                  className="w-full"
                  onClick={() => window.open(viewingTemplate.file_url, '_blank')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}