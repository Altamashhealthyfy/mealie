
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
  ChefHat // Added ChefHat for meal plans
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function TemplateLibraryManager() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [viewingTemplate, setViewingTemplate] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkFiles, setBulkFiles] = useState([]);
  const [bulkMetadata, setBulkMetadata] = useState([]);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false); // New state for convert dialog
  const [selectedMealPlan, setSelectedMealPlan] = useState(null); // New state for selected meal plan
  const [convertFormData, setConvertFormData] = useState({ // New state for convert form data
    name: "",
    description: "",
    is_public: false
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

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: templates } = useQuery({
    queryKey: ['downloadableTemplates'],
    queryFn: () => base44.entities.DownloadableTemplate.list('-created_date'),
    initialData: [],
  });

  // New query for Meal Plan Templates
  const { data: mealPlanTemplates } = useQuery({
    queryKey: ['mealPlanTemplates'],
    queryFn: async () => {
      // Fetch user's own meal plan templates
      const myTemplates = await base44.entities.MealPlanTemplate.filter({ created_by: user?.email });
      // Fetch public meal plan templates
      const publicTemplates = await base44.entities.MealPlanTemplate.filter({ is_public: true });
      // Combine and filter out duplicates if a user's template is also public
      const combinedTemplates = [...myTemplates, ...publicTemplates];
      const uniqueTemplates = Array.from(new Map(combinedTemplates.map(item => [item.id, item])).values());
      return uniqueTemplates;
    },
    enabled: !!user, // Only run if user data is available
    initialData: [],
  });

  // New query for Meal Plans
  const { data: mealPlans } = useQuery({
    queryKey: ['mealPlans'],
    queryFn: async () => {
      const allPlans = await base44.entities.MealPlan.list('-created_date');
      // If super_admin, show all plans, otherwise only user's own
      if (user?.user_type === 'super_admin') {
        return allPlans;
      }
      return allPlans.filter(plan => plan.created_by === user?.email);
    },
    enabled: !!user, // Only run if user data is available
    initialData: [],
  });

  // New mutation for converting Meal Plan to Template
  const convertMealPlanMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.MealPlanTemplate.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['mealPlanTemplates']); // Invalidate to refetch new template
      setShowConvertDialog(false);
      setSelectedMealPlan(null);
      setConvertFormData({ name: "", description: "", is_public: false });
      alert("✅ Meal plan converted to template successfully! You can now use it unlimited times for FREE!");
    },
    onError: (error) => {
      console.error("Error converting meal plan to template:", error);
      alert("Failed to convert meal plan. Please try again.");
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (data) => {
      let templateData = { ...data };
      
      // If editing and no new file is selected, update metadata only
      if (editingTemplate && !selectedFile) {
        templateData = {
          ...templateData,
          version: `${parseFloat(editingTemplate.version || '1.0') + 0.1}`.slice(0, 3), // Increment version, e.g., 1.0 -> 1.1
          last_updated: new Date().toISOString().split('T')[0]
        };
        return await base44.entities.DownloadableTemplate.update(editingTemplate.id, templateData);
      }
      
      // If there's a selected file (either new upload or replacing file for edit)
      if (selectedFile) {
        const uploadResult = await base44.integrations.Core.UploadFile({ file: selectedFile });
        
        const fileSizeKB = (selectedFile.size / 1024).toFixed(1);
        const fileSizeMB = (selectedFile.size / (1024 * 1024)).toFixed(1);
        const fileSize = fileSizeMB >= 1 ? `${fileSizeMB} MB` : `${fileSizeKB} KB`;
        const fileType = selectedFile.name.split('.').pop().toLowerCase();
        
        templateData = {
          ...templateData,
          file_url: uploadResult.file_url,
          file_type: fileType,
          file_size: fileSize,
          download_count: editingTemplate?.download_count || 0, // Preserve download count if editing
          version: editingTemplate ? `${parseFloat(editingTemplate.version || '1.0') + 0.1}`.slice(0, 3) : "1.0", // Increment or set to 1.0
          last_updated: new Date().toISOString().split('T')[0]
        };
      } else {
        // This case should be caught by handleUpload, but as a fallback, ensure version and date are updated
        templateData = {
          ...templateData,
          version: `${parseFloat(editingTemplate.version || '1.0') + 0.1}`.slice(0, 3),
          last_updated: new Date().toISOString().split('T')[0]
        };
      }
      
      if (editingTemplate) {
        return await base44.entities.DownloadableTemplate.update(editingTemplate.id, templateData);
      } else {
        return await base44.entities.DownloadableTemplate.create(templateData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['downloadableTemplates']);
      setSelectedFile(null);
      setEditingTemplate(null); // Clear editing state
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
      alert(editingTemplate ? "✅ Template updated successfully!" : "✅ Template uploaded successfully!");
    },
    onError: (error) => {
      console.error("Error uploading/updating template:", error);
      alert(`Error ${editingTemplate ? "updating" : "uploading"} template`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DownloadableTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['downloadableTemplates']);
      alert("Downloadable template deleted");
    },
    onError: (error) => {
      console.error("Error deleting downloadable template:", error);
      alert("Failed to delete downloadable template.");
    }
  });

  // New mutation for deleting Meal Plan Templates
  const deleteMealPlanTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.MealPlanTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['mealPlanTemplates']);
      alert("Meal plan template deleted");
    },
    onError: (error) => {
      console.error("Error deleting meal plan template:", error);
      alert("Failed to delete meal plan template.");
    }
  });

  // New function to handle editing a template
  const handleEdit = (template) => {
    setEditingTemplate(template);
    setSelectedFile(null); // Clear any previously selected file for new upload
    setFormData({
      name: template.name,
      description: template.description,
      category: template.category,
      subcategory: template.subcategory || "weight_loss", // Provide default if null
      target_calories: template.target_calories?.toString() || "",
      food_preference: template.food_preference || "veg",
      regional_preference: template.regional_preference || "all",
      duration: template.duration?.toString() || "7",
      tags: template.tags?.join(', ') || "",
      is_premium: template.is_premium || false
    });
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top for easy editing
  };

  // New function to handle selecting a meal plan for conversion
  const handleConvertMealPlan = (plan) => {
    setSelectedMealPlan(plan);
    setConvertFormData({
      name: `${plan.name} Template`, // Suggest a template name
      description: `Template created from meal plan: ${plan.name}`,
      is_public: false
    });
    // setShowConvertDialog(true) is already set in the button click, no need to set again here
  };

  // New function to save the converted meal plan as a template
  const handleConvertSave = () => {
    if (!convertFormData.name.trim()) {
      alert("Please enter a template name");
      return;
    }

    if (!selectedMealPlan) {
      alert("No meal plan selected for conversion.");
      return;
    }

    convertMealPlanMutation.mutate({
      name: convertFormData.name,
      description: convertFormData.description,
      // Map relevant fields from the original meal plan to the template
      category: 'meal_plan', // Always 'meal_plan' for this type of template
      subcategory: selectedMealPlan.subcategory || 'general',
      duration: selectedMealPlan.duration,
      target_calories: selectedMealPlan.target_calories,
      food_preference: selectedMealPlan.food_preference,
      regional_preference: selectedMealPlan.regional_preference,
      meals: selectedMealPlan.meals, // Include the actual meal data
      is_public: convertFormData.is_public,
      times_used: 0, // Initialize usage count
      tags: [ // Generate some initial tags
        selectedMealPlan.food_preference,
        `${selectedMealPlan.target_calories}kcal`,
        `${selectedMealPlan.duration}days`
      ].filter(Boolean), // Filter out any empty tags
      created_by: user?.email, // Store who created it
    });
  };

  const handleUpload = async () => {
    // If not editing and no file selected, or editing and no file selected BUT no name
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
      alert(`Error ${editingTemplate ? "updating" : "uploading"} template`);
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  // 🤖 AI-POWERED BULK UPLOAD
  const handleBulkAnalyze = async () => {
    if (bulkFiles.length === 0) {
      alert("Please select files first");
      return;
    }

    setBulkUploading(true);
    try {
      // Upload all files first
      const uploadPromises = bulkFiles.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const uploadResults = await Promise.all(uploadPromises);

      // AI analyzes each file in parallel
      const metadataPromises = uploadResults.map((uploadResult, index) => {
        const file = bulkFiles[index];
        return base44.integrations.Core.InvokeLLM({
          prompt: `You are analyzing a meal plan/recipe template file to extract metadata.

Filename: "${file.name}"

Analyze this file and extract:
1. Template name (descriptive)
2. Category (meal_plan, recipe, business_strategy, marketing_material, client_tracker, assessment_form, other)
3. Subcategory for meal plans (weight_loss, weight_gain, diabetes, pcos, thyroid, pregnancy, kids, muscle_gain, maintenance, general)
4. Target calories (if mentioned)
5. Food preference (veg, non_veg, jain, mixed, all)
6. Regional preference (north, south, west, east, all)
7. Duration in days (if meal plan)
8. Generate short description
9. Suggest 3-5 relevant tags

Be accurate and specific. Use the filename as hints.`,
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
      console.error("Bulk upload error:", error);
      alert("Error analyzing files. Please try again.");
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
  
  // ⚠️ UPDATED: student_coach and student_team_member CANNOT upload templates.
  // Only super admin and team members with 'operations' role can upload.
  const canUploadTemplates = userType === 'super_admin' || (userType === 'team_member' && user?.team_roles?.includes('operations'));
  
  if (!canUploadTemplates) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl">
          <CardHeader>
            <Shield className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <CardTitle className="text-center text-2xl">Access Restricted</CardTitle>
            <CardDescription className="text-center text-lg">
              Only super admin and operations team can upload templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <AlertDescription>
                <strong>Note:</strong> Student coaches and sales team cannot upload templates. Only platform owner and operations team have this access.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Combine and sort all templates for display
  const allTemplates = [
    ...templates.map(t => ({ ...t, templateType: 'downloadable' })),
    ...mealPlanTemplates.map(t => ({ ...t, templateType: 'meal_plan' }))
  ].sort((a, b) => {
    const dateA = new Date(a.created_date || a.last_updated);
    const dateB = new Date(b.created_date || b.last_updated);
    return dateB - dateA;
  });

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Header - Responsive */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <Badge className="bg-purple-600 text-white mb-2">
              <Shield className="w-4 h-4 mr-1" />
              Template Manager
            </Badge>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">Template Library Manager</h1>
            <p className="text-sm md:text-base text-gray-600">Upload templates for users to download</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-2xl md:text-3xl font-bold text-gray-900">{allTemplates.length}</p>
            <p className="text-xs md:text-sm text-gray-600">Total Templates</p>
          </div>
        </div>

        {/* Action Buttons - ALL OPTIONS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <Button
            onClick={() => setShowBulkDialog(true)}
            className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 h-12 md:h-14 text-base md:text-lg"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            🤖 Smart Bulk Upload
          </Button>
          
          <Button
            onClick={() => { setShowConvertDialog(true); setSelectedMealPlan(null); }} // Reset selected meal plan when opening
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 h-12 md:h-14 text-base md:text-lg"
          >
            <Copy className="w-5 h-5 mr-2" />
            📋 Convert Meal Plan
          </Button>
          
          <Button
            variant="outline"
            className="h-12 md:h-14 text-base md:text-lg"
            onClick={() => alert("Coming soon! Excel bulk upload feature.")}
          >
            <FileSpreadsheet className="w-5 h-5 mr-2" />
            📊 Excel Bulk Upload
          </Button>
        </div>

        {/* Smart Bulk Upload Dialog */}
        <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-500" />
                🤖 AI-Powered Smart Bulk Upload
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {bulkMetadata.length === 0 ? (
                <>
                  <Alert className="bg-blue-50 border-blue-500">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <AlertDescription>
                      <strong>How it works:</strong> Upload multiple files at once. AI will automatically extract all metadata from each file!
                    </AlertDescription>
                  </Alert>

                  <div className="p-6 border-2 border-dashed border-purple-300 rounded-xl bg-purple-50">
                    <div className="text-center">
                      <Upload className="w-12 h-12 mx-auto text-purple-500 mb-3" />
                      <p className="text-sm text-gray-700 mb-3">
                        Select multiple Word/PDF files (up to 50 at once)
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
                          <div className="mt-2 max-h-32 overflow-y-auto text-left text-xs">
                            {bulkFiles.map((f, i) => (
                              <p key={i} className="text-gray-700">• {f.name}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={handleBulkAnalyze}
                    disabled={bulkUploading || bulkFiles.length === 0}
                    className="w-full h-14 bg-gradient-to-r from-purple-500 to-indigo-500 text-lg"
                  >
                    {bulkUploading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        AI is analyzing {bulkFiles.length} files...
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
                      <strong>✅ AI Analysis Complete!</strong> Review the extracted metadata and edit if needed.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {bulkMetadata.map((template, index) => (
                      <Card key={index} className="border-2">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">#{index + 1}: {template.name}</CardTitle>
                            <Badge className="bg-purple-500">
                              <Sparkles className="w-3 h-3 mr-1" />
                              AI
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-gray-600">Category:</p>
                              <p className="font-semibold capitalize">{template.category.replace('_', ' ')}</p>
                            </div>
                            {template.target_calories && (
                              <div>
                                <p className="text-gray-600">Calories:</p>
                                <p className="font-semibold">{template.target_calories} kcal</p>
                              </div>
                            )}
                            <div>
                              <p className="text-gray-600">Food Pref:</p>
                              <p className="font-semibold capitalize">{template.food_preference}</p>
                            </div>
                            {template.duration && (
                              <div>
                                <p className="text-gray-600">Duration:</p>
                                <p className="font-semibold">{template.duration} days</p>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-gray-600 text-sm">Description:</p>
                            <p className="text-sm">{template.description}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 text-sm">Tags:</p>
                            <div className="flex flex-wrap gap-1">
                              {template.tags.map((tag, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                              ))}
                            </div>
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
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 h-12"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Save All {bulkMetadata.length} Templates
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Convert Meal Plan Dialog - NEW */}
        <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Copy className="w-6 h-6 text-green-600" />
                Convert Meal Plan to Reusable Template
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <Alert className="bg-green-50 border-green-500">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <AlertDescription>
                  <strong>💰 Save Money!</strong> Convert an existing meal plan into a template and use it unlimited times for FREE!
                </AlertDescription>
              </Alert>

              {!selectedMealPlan ? (
                <>
                  <div className="space-y-3">
                    <Label className="text-lg font-semibold">Select a Meal Plan to Convert:</Label>
                    {mealPlans.length === 0 ? (
                      <div className="text-center py-8">
                        <ChefHat className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-600">No meal plans found. Create one first!</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {mealPlans.map((plan) => (
                          <Card 
                            key={plan.id} 
                            className="border-2 hover:border-green-500 cursor-pointer transition-all"
                            onClick={() => handleConvertMealPlan(plan)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h3 className="font-bold text-lg">{plan.name}</h3>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    <Badge className="bg-orange-100 text-orange-700">{plan.duration} Days</Badge>
                                    <Badge className="bg-blue-100 text-blue-700 capitalize">{plan.food_preference}</Badge>
                                    <Badge className="bg-green-100 text-green-700">{plan.target_calories} kcal</Badge>
                                    {plan.plan_tier === 'advanced' && (
                                      <Badge className="bg-purple-600 text-white">💎 Pro</Badge>
                                    )}
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
                </>
              ) : (
                <>
                  <Card className="border-2 border-green-500 bg-green-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-lg text-green-900">Selected Meal Plan:</h3>
                        <Button variant="outline" size="sm" onClick={() => setSelectedMealPlan(null)}>
                          Change
                        </Button>
                      </div>
                      <p className="text-green-800 font-semibold">{selectedMealPlan.name}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge>{selectedMealPlan.duration} Days</Badge>
                        <Badge className="capitalize">{selectedMealPlan.food_preference}</Badge>
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
                        placeholder="e.g., Veg Weight Loss 1500 cal Template"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={convertFormData.description}
                        onChange={(e) => setConvertFormData({...convertFormData, description: e.target.value})}
                        placeholder="Brief description of this template"
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
                      <Label htmlFor="public">Make this template public (available to all coaches)</Label>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowConvertDialog(false);
                          setSelectedMealPlan(null);
                          setConvertFormData({ name: "", description: "", is_public: false });
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleConvertSave}
                        disabled={convertMealPlanMutation.isPending || !convertFormData.name.trim()}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 h-12"
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

        {/* Single Upload Section - Improved Responsive */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl">
              {editingTemplate ? 'Edit Template' : 'Upload Single Template'}
            </CardTitle>
            <CardDescription>
              {editingTemplate ? 'Update template details and optionally replace the file' : 'Upload one template at a time with manual details'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6">
            {editingTemplate && (
              <Alert className="bg-blue-50 border-blue-500">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <AlertDescription>
                  <strong>Editing:</strong> {editingTemplate.name} (Version {editingTemplate.version || '1.0'})
                </AlertDescription>
              </Alert>
            )}

            {/* File Upload - Responsive */}
            <div className="p-4 md:p-6 border-2 border-dashed border-blue-300 rounded-xl bg-white">
              <div className="text-center">
                <Upload className="w-10 h-10 md:w-12 md:h-12 mx-auto text-blue-500 mb-3" />
                <p className="text-xs md:text-sm text-gray-700 mb-3">
                  {editingTemplate ? 'Select new file to replace (optional)' : 'Select Word (.docx), PDF (.pdf), or Excel (.xlsx) file'}
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

            {/* Template Details - Responsive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Template Name *</Label>
                <Input
                  placeholder="e.g., Veg Weight Loss 1500 cal"
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
                    <SelectItem value="recipe">Recipe Collection</SelectItem>
                    <SelectItem value="business_strategy">Business Strategy</SelectItem>
                    <SelectItem value="marketing_material">Marketing Material</SelectItem>
                    <SelectItem value="client_tracker">Client Tracker</SelectItem>
                    <SelectItem value="assessment_form">Assessment Form</SelectItem>
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
                        <SelectItem value="kids">Kids Nutrition</SelectItem>
                        <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Target Calories</Label>
                    <Input
                      type="number"
                      placeholder="1500"
                      value={formData.target_calories}
                      onChange={(e) => setFormData({...formData, target_calories: e.target.value})}
                      className="h-10 md:h-auto"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Food Preference</Label>
                    <Select
                      value={formData.food_preference}
                      onValueChange={(value) => setFormData({...formData, food_preference: value})}
                    >
                      <SelectTrigger className="h-10 md:h-auto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="veg">Vegetarian</SelectItem>
                        <SelectItem value="non_veg">Non-Vegetarian</SelectItem>
                        <SelectItem value="jain">Jain</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Regional Preference</Label>
                    <Select
                      value={formData.regional_preference}
                      onValueChange={(value) => setFormData({...formData, regional_preference: value})}
                    >
                      <SelectTrigger className="h-10 md:h-auto">
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

                  <div className="space-y-2">
                    <Label className="text-sm">Duration (days)</Label>
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
                placeholder="Brief description of what this template contains"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Tags (comma-separated)</Label>
              <Input
                placeholder="e.g., weight loss, high protein, low carb"
                value={formData.tags}
                onChange={(e) => setFormData({...formData, tags: e.target.value})}
                className="h-10 md:h-auto"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="premium"
                checked={formData.is_premium}
                onChange={(e) => setFormData({...formData, is_premium: e.target.checked})}
                className="w-4 h-4"
              />
              <Label htmlFor="premium" className="text-sm">Premium Only (Only for Professional/Premium plans)</Label>
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
                disabled={uploading || (!editingTemplate && !selectedFile) || !formData.name.trim()} // Disable if no file for new upload, or if uploading, or no name
                className={`h-12 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 ${editingTemplate ? 'flex-1' : 'w-full'}`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {editingTemplate ? 'Updating...' : 'Uploading...'}
                  </>
                ) : (
                  <>
                    {editingTemplate ? <Edit className="w-5 h-5 mr-2" /> : <Upload className="w-5 h-5 mr-2" />}
                    {editingTemplate ? 'Update Template' : 'Upload Template'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Uploaded Templates - Responsive Grid */}
        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl">Uploaded Templates ({allTemplates.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {allTemplates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 md:w-16 md:h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-sm md:text-base text-gray-600">No templates uploaded yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {allTemplates.map((template) => (
                  <Card key={template.id} className="border-2 hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base md:text-lg truncate">{template.name}</CardTitle>
                          {template.templateType === 'downloadable' && template.is_premium && (
                            <Badge className="bg-purple-500 text-white mt-1 text-xs">
                              <Star className="w-3 h-3 mr-1" />
                              Premium
                            </Badge>
                          )}
                          {template.templateType === 'meal_plan' && template.is_public && (
                            <Badge className="bg-blue-500 text-white mt-1 text-xs">
                              <Eye className="w-3 h-3 mr-1" />
                              Public
                            </Badge>
                          )}
                        </div>
                        {template.templateType === 'downloadable' ? (
                          <Badge className="bg-blue-100 text-blue-700 uppercase text-xs shrink-0">
                            {template.file_type}
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 text-xs shrink-0">
                            MEAL PLAN
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs md:text-sm text-gray-600 line-clamp-2">{template.description}</p>
                      
                      <div className="flex flex-wrap gap-1 md:gap-2">
                        <Badge variant="outline" className="capitalize text-xs">
                          {template.category?.replace('_', ' ') || 'N/A'}
                        </Badge>
                        {template.target_calories && (
                          <Badge className="bg-orange-100 text-orange-700 text-xs">
                            {template.target_calories} kcal
                          </Badge>
                        )}
                        {template.food_preference && template.food_preference !== 'all' && (
                          <Badge className="bg-green-100 text-green-700 capitalize text-xs">
                            {template.food_preference}
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-gray-500 space-y-1">
                        {template.templateType === 'downloadable' ? (
                          <>
                            <p>📥 Downloaded: {template.download_count} times</p>
                            <p>📦 Size: {template.file_size}</p>
                            <p>📅 Updated: {template.last_updated}</p>
                            <p>🔢 Version: {template.version || '1.0'}</p>
                          </>
                        ) : (
                          <>
                            <p>🍽️ Times Used: {template.times_used || 0} times</p>
                            <p>📅 Created: {new Date(template.created_date).toLocaleDateString()}</p>
                            {template.created_by && <p>👤 By: {template.created_by}</p>}
                          </>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {template.templateType === 'downloadable' ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs md:text-sm"
                              onClick={() => setViewingTemplate(template)}
                            >
                              <Eye className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs md:text-sm"
                              onClick={() => handleEdit(template)}
                            >
                              <Edit className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:bg-red-50 text-xs md:text-sm"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this downloadable template?")) {
                                  deleteMutation.mutate(template.id);
                                }
                              }}
                            >
                              <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                            </Button>
                          </>
                        ) : (
                          // For Meal Plan Templates
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs md:text-sm"
                              onClick={() => alert("Viewing Meal Plan Templates directly is coming soon!")} // Placeholder
                            >
                              <Eye className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                              View
                            </Button>
                            {/* No direct 'edit' for Meal Plan templates in this view as per outline, only conversion */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:bg-red-50 text-xs md:text-sm"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this Meal Plan template?")) {
                                  deleteMealPlanTemplateMutation.mutate(template.id);
                                }
                              }}
                            >
                              <Trash2 className="w-3 h-3 md:w-4 h-4" />
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

        {/* View Template Dialog (for downloadable templates only) */}
        {viewingTemplate && viewingTemplate.templateType === 'downloadable' && (
          <Dialog open={!!viewingTemplate} onOpenChange={() => setViewingTemplate(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl">{viewingTemplate.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-gray-700">{viewingTemplate.description}</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Category</p>
                    <p className="font-semibold capitalize">{viewingTemplate.category.replace('_', ' ')}</p>
                  </div>
                  {viewingTemplate.target_calories && (
                    <div>
                      <p className="text-sm text-gray-600">Calories</p>
                      <p className="font-semibold">{viewingTemplate.target_calories} kcal</p>
                    </div>
                  )}
                  {viewingTemplate.food_preference && (
                    <div>
                      <p className="text-sm text-gray-600">Food Preference</p>
                      <p className="font-semibold capitalize">{viewingTemplate.food_preference}</p>
                    </div>
                  )}
                  {viewingTemplate.regional_preference && (
                    <div>
                      <p className="text-sm text-gray-600">Region</p>
                      <p className="font-semibold capitalize">{viewingTemplate.regional_preference}</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {viewingTemplate.tags?.map((tag, i) => (
                      <Badge key={i} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>

                <Alert>
                  <AlertDescription>
                    <p className="text-sm">
                      📥 Downloaded {viewingTemplate.download_count} times<br/>
                      📦 File size: {viewingTemplate.file_size}<br/>
                      📅 Last updated: {viewingTemplate.last_updated}<br/>
                      🔢 Version: {viewingTemplate.version || '1.0'}
                    </p>
                  </AlertDescription>
                </Alert>

                <Button
                  className="w-full"
                  onClick={() => window.open(viewingTemplate.file_url, '_blank')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
