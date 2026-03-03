import React, { useState, useMemo } from "react";
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
  Download,
  FileText,
  Star,
  Search,
  Filter,
  CheckCircle,
  Sparkles,
  Eye,
  Upload,
  Plus,
  Loader2,
  Trash2,
  Edit,
  Users,
  TrendingUp,
  ArrowUpDown,
  Copy,
  Zap
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function TemplateLibrary() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [diseaseFilter, setDiseaseFilter] = useState("all");
  const [calorieFilter, setCalorieFilter] = useState("all");
  const [customCalorieSearch, setCustomCalorieSearch] = useState("");
  const [foodPrefFilter, setFoodPrefFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [uploaderFilter, setUploaderFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("-created_date");
  const [viewingTemplate, setViewingTemplate] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [sortByRating, setSortByRating] = useState(false);
  const [clientTypeFilter, setClientTypeFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [templateToRate, setTemplateToRate] = useState(null);
  const [userRating, setUserRating] = useState(0);
  const [showBrandingDialog, setShowBrandingDialog] = useState(false);
  const [brandingTemplate, setBrandingTemplate] = useState(null);
  const [brandingData, setBrandingData] = useState({ clinicName: "", logoUrl: "", letterheadUrl: "" });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingLetterhead, setUploadingLetterhead] = useState(false);
  const [uploadFormData, setUploadFormData] = useState({
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
  const [editFormData, setEditFormData] = useState({
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
    queryKey: ['downloadableTemplates', sortOrder],
    queryFn: () => base44.entities.DownloadableTemplate.list(sortOrder),
    initialData: [],
  });

  // Calculate uploader statistics
  const uploaderStats = useMemo(() => {
    const stats = {};
    templates.forEach(template => {
      const uploader = template.created_by || 'Unknown';
      if (!stats[uploader]) {
        stats[uploader] = {
          email: uploader,
          count: 0,
          totalDownloads: 0
        };
      }
      stats[uploader].count++;
      stats[uploader].totalDownloads += (template.download_count || 0);
    });
    return Object.values(stats).sort((a, b) => b.count - a.count);
  }, [templates]);

  const downloadMutation = useMutation({
    mutationFn: async (template) => {
      await base44.entities.DownloadableTemplate.update(template.id, {
        download_count: (template.download_count || 0) + 1
      });
      // For cross-origin URLs, fetch the file as a blob first
      try {
        const response = await fetch(template.file_url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = template.name + '.' + (template.file_type || 'docx');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } catch (err) {
        // Fallback: open in new tab
        window.open(template.file_url, '_blank');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['downloadableTemplates']);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (data) => {
      const uploadResult = await base44.integrations.Core.UploadFile({ file: selectedFile });
      const fileSizeMB = (selectedFile.size / (1024 * 1024)).toFixed(1);
      const fileSizeKB = (selectedFile.size / 1024).toFixed(1);
      const fileSize = fileSizeMB >= 1 ? `${fileSizeMB} MB` : `${fileSizeKB} KB`;
      const fileType = selectedFile.name.split('.').pop().toLowerCase();
      
      return await base44.entities.DownloadableTemplate.create({
        ...data,
        file_url: uploadResult.file_url,
        file_type: fileType,
        file_size: fileSize,
        download_count: 0,
        version: "1.0",
        last_updated: new Date().toISOString().split('T')[0]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['downloadableTemplates']);
      setShowUploadDialog(false);
      setSelectedFile(null);
      setUploadFormData({
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
      alert("✅ Template uploaded successfully! It's now available for everyone to download.");
    },
    onError: (error) => {
      console.error(error);
      alert("Failed to upload template. Please try again.");
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.DownloadableTemplate.update(id, {
        ...data,
        last_updated: new Date().toISOString().split('T')[0]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['downloadableTemplates']);
      setShowEditDialog(false);
      setEditingTemplate(null);
      alert("✅ Template updated successfully!");
    },
    onError: (error) => {
      console.error(error);
      alert("Failed to update template. Please try again.");
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (templateId) => base44.entities.DownloadableTemplate.delete(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries(['downloadableTemplates']);
      setViewingTemplate(null);
      alert("✅ Template deleted successfully!");
    },
    onError: (error) => {
      console.error(error);
      alert("❌ Failed to delete template. Please try again.");
    }
  });

  const ratingMutation = useMutation({
    mutationFn: async ({ templateId, rating }) => {
      const template = templates.find(t => t.id === templateId);
      const newRatingCount = (template.rating_count || 0) + 1;
      const newAverageRating = (((template.average_rating || 0) * (template.rating_count || 0)) + rating) / newRatingCount;
      const effectivenessScore = Math.round((newAverageRating * 20) + (template.download_count || 0) * 0.5);
      
      return await base44.entities.DownloadableTemplate.update(templateId, {
        average_rating: parseFloat(newAverageRating.toFixed(1)),
        rating_count: newRatingCount,
        effectiveness_score: effectivenessScore
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['downloadableTemplates']);
      setShowRatingDialog(false);
      setTemplateToRate(null);
      setUserRating(0);
      alert("✅ Thank you for rating this template!");
    }
  });

  const duplicateTemplateMutation = useMutation({
    mutationFn: async (templateId) => {
      const template = templates.find(t => t.id === templateId);
      const duplicatedName = `${template.name} (Copy)`;
      
      return await base44.entities.DownloadableTemplate.create({
        ...template,
        id: undefined,
        name: duplicatedName,
        rating_count: 0,
        average_rating: 0,
        download_count: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['downloadableTemplates']);
      alert("✅ Template duplicated successfully! You can now edit it.");
    },
    onError: (error) => {
      console.error(error);
      alert("❌ Failed to duplicate template. Please try again.");
    }
  });

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file first");
      return;
    }
    if (!uploadFormData.name) {
      alert("Please enter template name");
      return;
    }

    setUploading(true);
    try {
      const tagsArray = uploadFormData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      await uploadMutation.mutateAsync({
        name: uploadFormData.name,
        description: uploadFormData.description,
        category: uploadFormData.category,
        subcategory: uploadFormData.subcategory,
        target_calories: uploadFormData.target_calories ? parseInt(uploadFormData.target_calories) : null,
        food_preference: uploadFormData.food_preference,
        regional_preference: uploadFormData.regional_preference,
        duration: uploadFormData.duration ? parseInt(uploadFormData.duration) : null,
        tags: tagsArray,
        is_premium: uploadFormData.is_premium
      });
    } catch (error) {
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setEditFormData({
      name: template.name,
      description: template.description || "",
      category: template.category,
      subcategory: template.subcategory || "weight_loss",
      target_calories: template.target_calories?.toString() || "",
      food_preference: template.food_preference || "veg",
      regional_preference: template.regional_preference || "all",
      duration: template.duration?.toString() || "7",
      tags: template.tags?.join(', ') || "",
      is_premium: template.is_premium || false
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editFormData.name.trim()) {
      alert("Please enter template name");
      return;
    }

    const tagsArray = editFormData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);

    updateTemplateMutation.mutate({
      id: editingTemplate.id,
      data: {
        name: editFormData.name,
        description: editFormData.description,
        category: editFormData.category,
        subcategory: editFormData.subcategory,
        target_calories: editFormData.target_calories ? parseInt(editFormData.target_calories) : null,
        food_preference: editFormData.food_preference,
        regional_preference: editFormData.regional_preference,
        duration: editFormData.duration ? parseInt(editFormData.duration) : null,
        tags: tagsArray,
        is_premium: editFormData.is_premium
      }
    });
  };

  const handleDeleteTemplate = (template) => {
    if (window.confirm(`Are you sure you want to delete "${template.name}"?\n\nThis action cannot be undone and will remove the template for all users.`)) {
      deleteTemplateMutation.mutate(template.id);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || template.category === categoryFilter;
    
    // Calorie filtering: preset dropdown OR custom search
    const matchesCalories = (() => {
      if (customCalorieSearch) {
        const customCalories = parseInt(customCalorieSearch);
        return template.target_calories && 
               Math.abs(template.target_calories - customCalories) <= 100;
      } else if (calorieFilter !== "all") {
        return template.target_calories && 
               Math.abs(template.target_calories - parseInt(calorieFilter)) <= 100;
      }
      return true;
    })();
    
    const matchesFoodPref = foodPrefFilter === "all" || 
                           template.food_preference === foodPrefFilter || 
                           template.food_preference === "all";
    const matchesRegion = regionFilter === "all" || 
                         template.regional_preference === regionFilter || 
                         template.regional_preference === "all";
    const matchesDisease = diseaseFilter === "all" || template.subcategory === diseaseFilter;
    const matchesUploader = uploaderFilter === "all" || template.created_by === uploaderFilter;
    
    // Rating filter
    const matchesRating = (() => {
      if (ratingFilter === "all") return true;
      if (ratingFilter === "4plus") return (template.average_rating || 0) >= 4;
      if (ratingFilter === "3plus") return (template.average_rating || 0) >= 3;
      if (ratingFilter === "highly_rated") return (template.average_rating || 0) >= 4.5;
      return true;
    })();

    // Client type filter
    const matchesClientType = (() => {
      if (clientTypeFilter === "all") return true;
      return (template.client_types || []).includes(clientTypeFilter);
    })();
    
    return matchesSearch && matchesCategory && matchesCalories && matchesFoodPref && 
           matchesRegion && matchesDisease && matchesUploader && matchesRating && matchesClientType;
  });

  const sortedTemplates = useMemo(() => {
    const sorted = [...filteredTemplates];
    if (sortByRating) {
      sorted.sort((a, b) => {
        const scoreB = (b.effectiveness_score || 0) || (b.average_rating || 0);
        const scoreA = (a.effectiveness_score || 0) || (a.average_rating || 0);
        return scoreB - scoreA;
      });
    }
    return sorted;
  }, [filteredTemplates, sortByRating]);

  const handleDownload = (template) => {
    downloadMutation.mutate(template);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setBrandingData(prev => ({ ...prev, logoUrl: file_url }));
    } catch {
      alert("Failed to upload logo");
    }
    setUploadingLogo(false);
  };

  const handleLetterheadUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLetterhead(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setBrandingData(prev => ({ ...prev, letterheadUrl: file_url }));
    } catch {
      alert("Failed to upload letterhead");
    }
    setUploadingLetterhead(false);
  };

  // Open download dialog - always show branding/format chooser first
  const openDownloadDialog = (template) => {
    setBrandingTemplate(template);
    setShowBrandingDialog(true);
  };

  const MEAL_TYPE_ORDER_LIB = ["early_morning", "breakfast", "mid_morning", "lunch", "evening_snack", "dinner", "post_dinner"];
  const MEAL_TYPE_LABELS_LIB = { early_morning: "Early Morning", breakfast: "Breakfast", mid_morning: "Mid-Morning", lunch: "Lunch", evening_snack: "Evening Snack", dinner: "Dinner", post_dinner: "Post Dinner" };

  const handlePDFDownload = (template, branding = {}) => {
    const { clinicName, logoUrl } = branding;

    // Group meals by day
    const groupedMeals = {};
    (template.meals || []).forEach((meal) => {
      if (!groupedMeals[meal.day]) groupedMeals[meal.day] = [];
      groupedMeals[meal.day].push(meal);
    });
    const sortedDays = Object.keys(groupedMeals).sort((a, b) => parseInt(a) - parseInt(b));
    const hasMeals = sortedDays.length > 0;

    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; color: #111827; background: #fff; }
      .page { padding: 32px 40px; max-width: 900px; margin: 0 auto; }
      .letterhead-bar { display: flex; align-items: center; gap: 16px; padding-bottom: 16px; margin-bottom: 20px; border-bottom: 3px solid #ea580c; }
      .letterhead-logo { max-height: 70px; max-width: 200px; object-fit: contain; }
      .clinic-name-text { font-size: 22px; font-weight: 800; color: #ea580c; }
      h1 { font-size: 26px; color: #ea580c; margin-bottom: 6px; font-weight: 800; }
      .meta { font-size: 13px; color: #555; margin-bottom: 24px; display: flex; flex-wrap: wrap; gap: 8px; }
      .meta span { background: #fff7ed; border: 1px solid #fdba74; border-radius: 20px; padding: 3px 12px; }
      .description { font-size: 14px; color: #444; margin-bottom: 20px; padding: 12px; background: #f9fafb; border-left: 4px solid #ea580c; border-radius: 0 6px 6px 0; }
      .day-header { background: #ea580c; color: white; padding: 10px 16px; font-size: 17px; font-weight: bold; border-radius: 8px; margin: 24px 0 12px 0; }
      .meal-block { background: #fff; border: 1px solid #f3f4f6; border-left: 4px solid #fb923c; border-radius: 0 8px 8px 0; padding: 14px 16px; margin-bottom: 12px; }
      .meal-type { font-size: 10px; text-transform: uppercase; color: #ea580c; font-weight: 700; letter-spacing: 0.8px; margin-bottom: 4px; }
      .meal-name { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 10px; }
      .items-table { width: 100%; border-collapse: collapse; }
      .items-table tr { border-bottom: 1px solid #f9fafb; }
      .items-table td { padding: 4px 2px; font-size: 13px; }
      .items-table td.item-name { color: #374151; }
      .items-table td.item-portion { color: #9ca3af; text-align: right; white-space: nowrap; padding-left: 12px; }
      .macros { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
      .macro-badge { border: 1px solid #e5e7eb; border-radius: 6px; padding: 3px 10px; font-size: 12px; font-weight: 500; color: #374151; background: #f9fafb; }
      .macro-badge.kcal { color: #ea580c; font-weight: 700; }
      .tip { font-size: 12px; color: #16a34a; font-style: italic; margin-top: 8px; padding: 6px 10px; background: #f0fdf4; border-radius: 4px; }
      .footer { margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 11px; color: #9ca3af; text-align: center; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .meal-block { break-inside: avoid; } }
    </style></head><body><div class="page">`;

    const { letterheadUrl } = branding;
    if (letterheadUrl) {
      html += `<div style="margin-bottom:20px;border-bottom:3px solid #ea580c;padding-bottom:16px;"><img src="${letterheadUrl}" style="width:100%;max-height:120px;object-fit:contain;" /></div>`;
    } else if (logoUrl || clinicName) {
      html += `<div class="letterhead-bar">`;
      if (logoUrl) html += `<img src="${logoUrl}" class="letterhead-logo" />`;
      if (clinicName) html += `<div class="clinic-name-text">${clinicName}</div>`;
      html += `</div>`;
    }

    html += `<h1>${template.name}</h1>`;
    html += `<div class="meta">`;
    if (template.category) html += `<span>📁 ${template.category.replace(/_/g, ' ')}</span>`;
    if (template.target_calories) html += `<span>🔥 ${template.target_calories} Kcal/day</span>`;
    if (template.food_preference && template.food_preference !== 'all') html += `<span>🥗 ${template.food_preference}</span>`;
    if (template.duration) html += `<span>📅 ${template.duration} Days</span>`;
    if (template.regional_preference && template.regional_preference !== 'all') html += `<span>🌍 ${template.regional_preference}</span>`;
    html += `</div>`;

    if (template.description) html += `<div class="description">${template.description}</div>`;

    if (hasMeals) {
      sortedDays.forEach((day) => {
        const meals = (groupedMeals[day] || []).slice().sort(
          (a, b) => MEAL_TYPE_ORDER_LIB.indexOf(a.meal_type) - MEAL_TYPE_ORDER_LIB.indexOf(b.meal_type)
        );
        const dayTotal = meals.reduce((s, m) => s + (m.calories || 0), 0);
        html += `<div class="day-header">Day ${day}${dayTotal > 0 ? ` — ${Math.round(dayTotal)} kcal` : ''}</div>`;
        meals.forEach((meal) => {
          html += `<div class="meal-block">
            <div class="meal-type">${MEAL_TYPE_LABELS_LIB[meal.meal_type] || meal.meal_type}</div>
            <div class="meal-name">${meal.meal_name || ''}</div>
            <table class="items-table">`;
          (meal.items || []).forEach((item, i) => {
            const portion = meal.portion_sizes?.[i] || '';
            html += `<tr><td class="item-name">• ${item}</td><td class="item-portion">${portion}</td></tr>`;
          });
          html += `</table>`;
          if (meal.calories) {
            html += `<div class="macros">
              <span class="macro-badge kcal">🔥 ${meal.calories} kcal</span>
              ${meal.protein ? `<span class="macro-badge">P: ${meal.protein}g</span>` : ''}
              ${meal.carbs ? `<span class="macro-badge">C: ${meal.carbs}g</span>` : ''}
              ${meal.fats ? `<span class="macro-badge">F: ${meal.fats}g</span>` : ''}
            </div>`;
          }
          if (meal.nutritional_tip) html += `<div class="tip">💡 ${meal.nutritional_tip}</div>`;
          html += `</div>`;
        });
      });
    } else {
      html += `<p style="color:#9ca3af;font-style:italic;margin-top:20px;">No meal content available in this template.</p>`;
    }

    html += `<div class="footer">${clinicName || 'Template Library'} • ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div></div></body></html>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert('Popup blocked! Please allow popups and try again.'); return; }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
  };

  const userType = user?.user_type || 'client';
  const canUpload = ['super_admin', 'team_member', 'student_coach', 'student_team_member'].includes(userType);
  const canEdit = (template) => {
    return userType === 'super_admin' || template.created_by === user?.email;
  };
  const canDelete = userType === 'super_admin';

  return (
    <div className="min-h-screen p-3 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-lg px-6 py-2">
            <Sparkles className="w-5 h-5 mr-2 inline" />
            100% FREE Templates
          </Badge>
          <h1 className="text-5xl font-bold text-gray-900">Template Library</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Download ready-made Word templates - Use unlimited times at NO COST!
          </p>
          
          {canUpload && (
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 h-12 px-6">
                  <Plus className="w-5 h-5 mr-2" />
                  Contribute Your Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl">Upload Template to Library</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <Alert className="bg-blue-50 border-blue-500">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <AlertDescription>
                      Share your templates with the community! Your contribution helps everyone.
                    </AlertDescription>
                  </Alert>

                  <div className="p-6 border-2 border-dashed border-blue-300 rounded-xl bg-white">
                    <div className="text-center">
                      <Upload className="w-12 h-12 mx-auto text-blue-500 mb-3" />
                      <p className="text-sm text-gray-700 mb-3">
                        Select file (.docx, .pdf, .xlsx)
                      </p>
                      <input
                        type="file"
                        accept=".docx,.pdf,.xlsx,.doc"
                        onChange={(e) => setSelectedFile(e.target.files[0])}
                        className="w-full p-2 border rounded-lg text-sm"
                      />
                      {selectedFile && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm font-semibold text-green-900">
                            ✅ {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label className="text-sm">Template Name *</Label>
                      <Input
                        placeholder="e.g., Veg Weight Loss 1500 cal"
                        value={uploadFormData.name}
                        onChange={(e) => setUploadFormData({...uploadFormData, name: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Category *</Label>
                      <Select
                        value={uploadFormData.category}
                        onValueChange={(value) => setUploadFormData({...uploadFormData, category: value})}
                      >
                        <SelectTrigger>
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

                    {uploadFormData.category === 'meal_plan' && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-sm">Subcategory</Label>
                          <Select
                            value={uploadFormData.subcategory}
                            onValueChange={(value) => setUploadFormData({...uploadFormData, subcategory: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="weight_loss">Weight Loss</SelectItem>
                              <SelectItem value="weight_gain">Weight Gain</SelectItem>
                              <SelectItem value="diabetes">Diabetes</SelectItem>
                              <SelectItem value="pcos">PCOS</SelectItem>
                              <SelectItem value="thyroid">Thyroid</SelectItem>
                              <SelectItem value="general">General</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm">Target Calories</Label>
                          <Input
                            type="number"
                            placeholder="1500"
                            value={uploadFormData.target_calories}
                            onChange={(e) => setUploadFormData({...uploadFormData, target_calories: e.target.value})}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm">Food Preference</Label>
                          <Select
                            value={uploadFormData.food_preference}
                            onValueChange={(value) => setUploadFormData({...uploadFormData, food_preference: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="veg">Vegetarian</SelectItem>
                              <SelectItem value="non_veg">Non-Veg</SelectItem>
                              <SelectItem value="eggetarian">Eggetarian</SelectItem>
                              <SelectItem value="jain">Jain</SelectItem>
                              <SelectItem value="mixed">Mixed</SelectItem>
                              <SelectItem value="all">All</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm">Regional Preference</Label>
                          <Select
                            value={uploadFormData.regional_preference}
                            onValueChange={(value) => setUploadFormData({...uploadFormData, regional_preference: value})}
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

                        <div className="space-y-2">
                          <Label className="text-sm">Duration (days)</Label>
                          <Input
                            type="number"
                            placeholder="7"
                            value={uploadFormData.duration}
                            onChange={(e) => setUploadFormData({...uploadFormData, duration: e.target.value})}
                          />
                        </div>
                      </>
                    )}

                    <div className="space-y-2 col-span-2">
                      <Label className="text-sm">Description</Label>
                      <Textarea
                        placeholder="Brief description..."
                        value={uploadFormData.description}
                        onChange={(e) => setUploadFormData({...uploadFormData, description: e.target.value})}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2 col-span-2">
                      <Label className="text-sm">Tags (comma-separated)</Label>
                      <Input
                        placeholder="e.g., weight loss, high protein, low carb"
                        value={uploadFormData.tags}
                        onChange={(e) => setUploadFormData({...uploadFormData, tags: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowUploadDialog(false);
                        setSelectedFile(null);
                      }}
                      className="flex-1"
                      disabled={uploading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpload}
                      disabled={uploading || !selectedFile || !uploadFormData.name}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 h-12"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 mr-2" />
                          Upload Template
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Big Benefits Card */}
        <Card className="border-none shadow-2xl bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-xl mb-2">100% FREE</h3>
                <p className="text-gray-700">Download as many times as you want. No limits!</p>
              </div>
              <div>
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-xl mb-2">Editable Files</h3>
                <p className="text-gray-700">Word/PDF files you can customize for clients</p>
              </div>
              <div>
                <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-xl mb-2">Expert Created</h3>
                <p className="text-gray-700">Professional templates ready to use</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Uploader Statistics Card */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-purple-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <TrendingUp className="w-6 h-6 text-purple-600" />
              Top Contributors
            </CardTitle>
            <CardDescription>Community members who uploaded the most templates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {uploaderStats.slice(0, 6).map((stat, index) => (
                <Card key={stat.email} className="border-2 hover:border-purple-300 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-600' :
                        'bg-purple-500'
                      }`}>
                        <span className="text-white font-bold">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{stat.email}</p>
                        <div className="flex gap-3 text-xs text-gray-600 mt-1">
                          <span>📤 {stat.count} templates</span>
                          <span>📥 {stat.totalDownloads} downloads</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Search & Filters */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12"
                  />
                </div>
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger className="w-64">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-created_date">
                      <div className="flex items-center gap-2">
                        <span>🆕</span>
                        <span>Newest First</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="created_date">
                      <div className="flex items-center gap-2">
                        <span>🗓️</span>
                        <span>Oldest First</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="-download_count">
                      <div className="flex items-center gap-2">
                        <span>🔥</span>
                        <span>Most Downloaded</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="download_count">
                      <div className="flex items-center gap-2">
                        <span>📥</span>
                        <span>Least Downloaded</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="name">
                      <div className="flex items-center gap-2">
                        <span>🔤</span>
                        <span>Name (A-Z)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="-name">
                      <div className="flex items-center gap-2">
                        <span>🔤</span>
                        <span>Name (Z-A)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="meal_plan">Meal Plans</SelectItem>
                    <SelectItem value="recipe">Recipes</SelectItem>
                    <SelectItem value="business_strategy">Business</SelectItem>
                    <SelectItem value="marketing_material">Marketing</SelectItem>
                    <SelectItem value="client_tracker">Client Tools</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={diseaseFilter} onValueChange={setDiseaseFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Disease/Condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Conditions</SelectItem>
                    <SelectItem value="weight_loss">Weight Loss</SelectItem>
                    <SelectItem value="weight_gain">Weight Gain</SelectItem>
                    <SelectItem value="diabetes">Diabetes</SelectItem>
                    <SelectItem value="pcos">PCOS</SelectItem>
                    <SelectItem value="thyroid">Thyroid</SelectItem>
                    <SelectItem value="general">General Health</SelectItem>
                  </SelectContent>
                </Select>

                <Select 
                  value={calorieFilter} 
                  onValueChange={(value) => {
                    setCalorieFilter(value);
                    if (value !== "all") setCustomCalorieSearch(""); // Clear custom when preset selected
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Calories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Calories</SelectItem>
                    <SelectItem value="1200">1200 Kcal</SelectItem>
                    <SelectItem value="1400">1400 Kcal</SelectItem>
                    <SelectItem value="1500">1500 Kcal</SelectItem>
                    <SelectItem value="1600">1600 Kcal</SelectItem>
                    <SelectItem value="1800">1800 Kcal</SelectItem>
                    <SelectItem value="2000">2000 Kcal</SelectItem>
                    <SelectItem value="2200">2200 Kcal</SelectItem>
                    <SelectItem value="2500">2500 Kcal</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={foodPrefFilter} onValueChange={setFoodPrefFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Food Preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="veg">Vegetarian</SelectItem>
                    <SelectItem value="non_veg">Non-Veg</SelectItem>
                    <SelectItem value="eggetarian">Eggetarian</SelectItem>
                    <SelectItem value="jain">Jain</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={regionFilter} onValueChange={setRegionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    <SelectItem value="north">North Indian</SelectItem>
                    <SelectItem value="south">South Indian</SelectItem>
                    <SelectItem value="west">West Indian</SelectItem>
                    <SelectItem value="east">East Indian</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={uploaderFilter} onValueChange={setUploaderFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Uploader" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        All Uploaders
                      </div>
                    </SelectItem>
                    {uploaderStats.map((stat) => (
                      <SelectItem key={stat.email} value={stat.email}>
                        <div className="flex items-center justify-between gap-2 w-full">
                          <span className="truncate">{stat.email}</span>
                          <Badge className="bg-purple-100 text-purple-700 text-xs">
                            {stat.count}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Calorie Search Input */}
              <div className="flex items-center gap-3">
                <Label className="text-sm text-gray-700 whitespace-nowrap">Or search custom calories:</Label>
                <Input
                  type="number"
                  placeholder="e.g., 1750"
                  value={customCalorieSearch}
                  onChange={(e) => {
                    setCustomCalorieSearch(e.target.value);
                    if (e.target.value) setCalorieFilter("all"); // Clear preset when custom entered
                  }}
                  className="max-w-xs"
                />
                {customCalorieSearch && (
                  <Badge className="bg-orange-100 text-orange-700">
                    Searching: {customCalorieSearch} kcal (±100)
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <Button
                  onClick={() => setSortByRating(!sortByRating)}
                  variant={sortByRating ? "default" : "outline"}
                  className="gap-2"
                >
                  <Zap className="w-4 h-4" />
                  {sortByRating ? "Sorted by Effectiveness" : "Sort by Effectiveness"}
                </Button>

                {(categoryFilter !== "all" || diseaseFilter !== "all" || clientTypeFilter !== "all" || ratingFilter !== "all") && (
                  <Button
                    onClick={() => {
                      setCategoryFilter("all");
                      setDiseaseFilter("all");
                      setClientTypeFilter("all");
                      setRatingFilter("all");
                    }}
                    variant="outline"
                    className="text-red-600 hover:bg-red-50"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>

              {/* Active Filters Display */}
              {uploaderFilter !== "all" && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-600">Active filter:</span>
                  <Badge className="bg-purple-100 text-purple-700">
                    <Users className="w-3 h-3 mr-1" />
                    {uploaderFilter}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-1 h-4 w-4 p-0"
                      onClick={() => setUploaderFilter("all")}
                    >
                      ×
                    </Button>
                  </Badge>
                </div>
              )}
              </div>
              </CardContent>
              </Card>

        {/* Results Summary */}
        <Card className="border-none shadow-lg bg-gradient-to-r from-blue-50 to-cyan-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-600" />
                <span className="text-lg font-semibold text-gray-900">
                  Showing {sortedTemplates.length} of {templates.length} templates
                </span>
              </div>
              <Badge className="bg-blue-600 text-white text-sm">
                {sortByRating ? '⚡ By Effectiveness' : 
                 (sortOrder === '-created_date' && '🆕 Newest First') ||
                 (sortOrder === 'created_date' && '🗓️ Oldest First') ||
                 (sortOrder === '-download_count' && '🔥 Most Downloaded') ||
                 (sortOrder === 'download_count' && '📥 Least Downloaded') ||
                 (sortOrder === 'name' && '🔤 A-Z') ||
                 (sortOrder === '-name' && '🔤 Z-A')}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Templates Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {sortedTemplates.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No templates found</h3>
              <p className="text-gray-600">Try adjusting your filters</p>
            </div>
          ) : (
            sortedTemplates.map((template) => (
              <Card 
                key={template.id} 
                className="border-none shadow-lg bg-white/80 backdrop-blur hover:shadow-xl transition-all group"
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge className="bg-blue-100 text-blue-700 uppercase">
                      {template.file_type}
                    </Badge>
                    <div className="flex gap-2 flex-wrap justify-end">
                      {template.is_premium && (
                        <Badge className="bg-purple-500 text-white">
                          <Star className="w-3 h-3 mr-1" />
                          Premium
                        </Badge>
                      )}
                      {template.average_rating && template.average_rating >= 4 && (
                        <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
                          ⭐ {template.average_rating.toFixed(1)}
                        </Badge>
                      )}
                      {canEdit(template) && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => duplicateTemplateMutation.mutate(template.id)}
                            className="text-green-600 hover:bg-green-50 h-6 w-6 p-0"
                            title="Duplicate Template"
                            disabled={duplicateTemplateMutation.isPending}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(template)}
                            className="text-blue-600 hover:bg-blue-50 h-6 w-6 p-0"
                            title="Edit Template"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template)}
                          className="text-red-600 hover:bg-red-50 h-6 w-6 p-0"
                          title="Delete Template"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-xl line-clamp-2">{template.name}</CardTitle>
                  <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="capitalize">
                      {template.category.replace('_', ' ')}
                    </Badge>
                    {template.target_calories && (
                      <Badge className="bg-orange-100 text-orange-700">
                        {template.target_calories} Kcal
                      </Badge>
                    )}
                    {template.food_preference && template.food_preference !== 'all' && (
                      <Badge className="bg-green-100 text-green-700 capitalize">
                        {template.food_preference}
                      </Badge>
                    )}
                    {template.duration && (
                      <Badge className="bg-purple-100 text-purple-700">
                        {template.duration} days
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 space-y-1">
                    <p>📥 {template.download_count || 0} downloads</p>
                    <p>📦 {template.file_size}</p>
                    {template.created_by && (
                      <p className="truncate">
                        👤 <span className="font-semibold">{template.created_by}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                  <Button
                   onClick={() => setViewingTemplate(template)}
                   className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 h-12 font-semibold"
                  >
                   <Eye className="w-4 h-4 mr-2" />
                   View Template Details
                  </Button>
                  <div className="flex gap-2">
                  <Button
                    onClick={() => openDownloadDialog(template)}
                    className="flex-1 h-11 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    onClick={() => {
                      setTemplateToRate(template);
                      setShowRatingDialog(true);
                      setUserRating(0);
                    }}
                    variant="outline"
                    className="h-11 border-2 border-orange-500 text-orange-700 hover:bg-orange-50 px-3"
                  >
                    <Star className="w-4 h-4" />
                  </Button>
                  </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Edit Template Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Edit className="w-6 h-6 text-blue-600" />
                Edit Template
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <Alert className="bg-blue-50 border-blue-500">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <AlertDescription>
                  Editing: {editingTemplate?.name}
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label className="text-sm">Template Name *</Label>
                  <Input
                    placeholder="Template name"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Category *</Label>
                  <Select
                    value={editFormData.category}
                    onValueChange={(value) => setEditFormData({...editFormData, category: value})}
                  >
                    <SelectTrigger>
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

                {editFormData.category === 'meal_plan' && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm">Subcategory</Label>
                      <Select
                        value={editFormData.subcategory}
                        onValueChange={(value) => setEditFormData({...editFormData, subcategory: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weight_loss">Weight Loss</SelectItem>
                          <SelectItem value="weight_gain">Weight Gain</SelectItem>
                          <SelectItem value="diabetes">Diabetes</SelectItem>
                          <SelectItem value="pcos">PCOS</SelectItem>
                          <SelectItem value="thyroid">Thyroid</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Target Calories</Label>
                      <Input
                        type="number"
                        placeholder="1500"
                        value={editFormData.target_calories}
                        onChange={(e) => setEditFormData({...editFormData, target_calories: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Food Preference</Label>
                      <Select
                        value={editFormData.food_preference}
                        onValueChange={(value) => setEditFormData({...editFormData, food_preference: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="veg">Vegetarian</SelectItem>
                          <SelectItem value="non_veg">Non-Veg</SelectItem>
                          <SelectItem value="eggetarian">Eggetarian</SelectItem>
                          <SelectItem value="jain">Jain</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                          <SelectItem value="all">All</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Regional Preference</Label>
                      <Select
                        value={editFormData.regional_preference}
                        onValueChange={(value) => setEditFormData({...editFormData, regional_preference: value})}
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

                    <div className="space-y-2">
                      <Label className="text-sm">Duration (days)</Label>
                      <Input
                        type="number"
                        placeholder="7"
                        value={editFormData.duration}
                        onChange={(e) => setEditFormData({...editFormData, duration: e.target.value})}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Description</Label>
                <Textarea
                  placeholder="Brief description..."
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Tags (comma-separated)</Label>
                <Input
                  placeholder="e.g., weight loss, high protein, low carb"
                  value={editFormData.tags}
                  onChange={(e) => setEditFormData({...editFormData, tags: e.target.value})}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditDialog(false);
                    setEditingTemplate(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={updateTemplateMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 h-12"
                >
                  {updateTemplateMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Saving...
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

        {/* View Template Dialog */}
        <Dialog open={!!viewingTemplate} onOpenChange={() => setViewingTemplate(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-500" />
                {viewingTemplate?.name}
              </DialogTitle>
            </DialogHeader>
            
            {viewingTemplate && (
              <div className="space-y-6">
                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Description</p>
                    <p className="text-gray-900">{viewingTemplate.description || 'No description'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Category</p>
                      <Badge variant="outline" className="mt-1 capitalize">
                        {viewingTemplate.category.replace('_', ' ')}
                      </Badge>
                    </div>

                    {viewingTemplate.subcategory && (
                      <div>
                        <p className="text-sm text-gray-600">Subcategory</p>
                        <Badge className="mt-1 bg-purple-100 text-purple-700 capitalize">
                          {viewingTemplate.subcategory.replace('_', ' ')}
                        </Badge>
                      </div>
                    )}

                    {viewingTemplate.target_calories && (
                      <div>
                        <p className="text-sm text-gray-600">Target Calories</p>
                        <Badge className="mt-1 bg-orange-100 text-orange-700">
                          {viewingTemplate.target_calories} Kcal
                        </Badge>
                      </div>
                    )}

                    {viewingTemplate.food_preference && (
                      <div>
                        <p className="text-sm text-gray-600">Food Preference</p>
                        <Badge className="mt-1 bg-green-100 text-green-700 capitalize">
                          {viewingTemplate.food_preference}
                        </Badge>
                      </div>
                    )}

                    {viewingTemplate.regional_preference && (
                      <div>
                        <p className="text-sm text-gray-600">Regional Preference</p>
                        <Badge className="mt-1 bg-blue-100 text-blue-700 capitalize">
                          {viewingTemplate.regional_preference}
                        </Badge>
                      </div>
                    )}

                    {viewingTemplate.duration && (
                      <div>
                        <p className="text-sm text-gray-600">Duration</p>
                        <Badge className="mt-1 bg-indigo-100 text-indigo-700">
                          {viewingTemplate.duration} days
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                {viewingTemplate.tags && viewingTemplate.tags.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {viewingTemplate.tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-600">File Type</p>
                      <Badge className="mt-1 bg-blue-500 uppercase">
                        {viewingTemplate.file_type}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">File Size</p>
                      <p className="font-semibold mt-1">{viewingTemplate.file_size}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Downloads</p>
                      <p className="font-semibold mt-1">📥 {viewingTemplate.download_count || 0}</p>
                    </div>
                  </div>
                </div>

                {viewingTemplate.is_premium && (
                  <Alert className="bg-purple-50 border-purple-500">
                    <Star className="w-5 h-5 text-purple-600" />
                    <AlertDescription className="ml-2">
                      <strong>Premium Template</strong> - Available for Professional & Premium plan users only
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 gap-3">
                 <Button
                   variant="outline"
                   onClick={() => setViewingTemplate(null)}
                   className="h-12"
                 >
                   Close
                 </Button>
                 <Button
                   onClick={() => { setViewingTemplate(null); openDownloadDialog(viewingTemplate); }}
                   className="h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                 >
                   <Download className="w-4 h-4 mr-2" />
                   Download
                 </Button>
                </div>

                {canDelete && (
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteTemplate(viewingTemplate)}
                    disabled={deleteTemplateMutation.isPending}
                    className="w-full h-12"
                  >
                    {deleteTemplateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Template
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Download Dialog - Format chooser + branding */}
        <Dialog open={showBrandingDialog} onOpenChange={(open) => {
          setShowBrandingDialog(open);
          if (!open) setBrandingData({ clinicName: "", logoUrl: "", letterheadUrl: "" });
        }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Download className="w-5 h-5 text-green-600" />
                Download Template
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 mt-2">
              {brandingTemplate && (
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <p className="font-semibold text-gray-900 text-sm">{brandingTemplate.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{brandingTemplate.file_type?.toUpperCase()} • {brandingTemplate.file_size}</p>
                </div>
              )}

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800">
                <strong>Choose download format:</strong> Download the original file as-is, or get a branded PDF with your clinic's logo/letterhead.
              </div>

              {/* Format 1: Original File */}
              <div className="border-2 border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <FileText className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Original File</p>
                    <p className="text-xs text-gray-500">Download as DOCX/PDF/XLSX — editable original</p>
                  </div>
                </div>
                <Button
                  onClick={() => { handleDownload(brandingTemplate); setShowBrandingDialog(false); }}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 h-11"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Original File
                </Button>
              </div>

              {/* Format 2: Branded PDF */}
              <div className="border-2 border-orange-200 rounded-xl p-4 space-y-4 bg-orange-50/30">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <FileText className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Branded PDF</p>
                    <p className="text-xs text-gray-500">Add your clinic logo, name & letterhead</p>
                  </div>
                </div>

                {/* Clinic Logo */}
                <div>
                  <Label className="text-sm font-semibold">Clinic Logo (Optional)</Label>
                  {brandingData.logoUrl ? (
                    <div className="relative mt-1">
                      <img src={brandingData.logoUrl} alt="Logo" className="w-full h-16 object-contain border rounded-lg bg-white" />
                      <button onClick={() => setBrandingData(prev => ({ ...prev, logoUrl: "" }))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">×</button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-dashed border-gray-300 hover:border-orange-400 hover:bg-white transition-colors mt-1">
                      {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> : <Upload className="w-4 h-4 text-orange-500" />}
                      <span className="text-sm text-gray-600">{uploadingLogo ? "Uploading..." : "Upload Logo"}</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} className="hidden" />
                    </label>
                  )}
                </div>

                {/* Letterhead */}
                <div>
                  <Label className="text-sm font-semibold">Letterhead Image (Optional)</Label>
                  <p className="text-xs text-gray-500 mb-1">Full-width header image for your clinic letterhead</p>
                  {brandingData.letterheadUrl ? (
                    <div className="relative">
                      <img src={brandingData.letterheadUrl} alt="Letterhead" className="w-full h-16 object-contain border rounded-lg bg-white" />
                      <button onClick={() => setBrandingData(prev => ({ ...prev, letterheadUrl: "" }))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">×</button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-dashed border-gray-300 hover:border-orange-400 hover:bg-white transition-colors">
                      {uploadingLetterhead ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> : <Upload className="w-4 h-4 text-orange-500" />}
                      <span className="text-sm text-gray-600">{uploadingLetterhead ? "Uploading..." : "Upload Letterhead"}</span>
                      <input type="file" accept="image/*" onChange={handleLetterheadUpload} disabled={uploadingLetterhead} className="hidden" />
                    </label>
                  )}
                </div>

                {/* Clinic Name */}
                <div>
                  <Label className="text-sm font-semibold">Clinic / Brand Name (Optional)</Label>
                  <Input
                    placeholder="e.g., Dr. Sharma's Nutrition Clinic"
                    value={brandingData.clinicName}
                    onChange={(e) => setBrandingData(prev => ({ ...prev, clinicName: e.target.value }))}
                    className="mt-1 bg-white"
                  />
                </div>

                <Button
                  onClick={() => {
                    handlePDFDownload(brandingTemplate, brandingData);
                    setShowBrandingDialog(false);
                  }}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 h-11"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Download Branded PDF
                </Button>
              </div>

              <Button variant="outline" onClick={() => setShowBrandingDialog(false)} className="w-full">
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Rating Dialog */}
         <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
           <DialogContent className="max-w-md">
             <DialogHeader>
               <DialogTitle className="flex items-center gap-2">
                 <Star className="w-6 h-6 text-yellow-500" />
                 Rate This Template
               </DialogTitle>
             </DialogHeader>

             {templateToRate && (
               <div className="space-y-6">
                 <div className="p-4 bg-gray-50 rounded-lg">
                   <p className="font-semibold text-gray-900">{templateToRate.name}</p>
                   <p className="text-sm text-gray-600 mt-1">{templateToRate.description}</p>
                 </div>

                 <div className="space-y-3">
                   <Label className="text-sm text-gray-600">How would you rate this template?</Label>
                   <div className="flex gap-3 justify-center">
                     {[1, 2, 3, 4, 5].map((star) => (
                       <button
                         key={star}
                         onClick={() => setUserRating(star)}
                         className="transition-transform hover:scale-125"
                       >
                         <Star
                           className={`w-10 h-10 ${
                             star <= userRating 
                               ? "fill-yellow-400 text-yellow-400" 
                               : "text-gray-300"
                           }`}
                         />
                       </button>
                     ))}
                   </div>
                   <p className="text-center text-sm text-gray-600">
                     {userRating > 0 ? `You rated: ${userRating} star${userRating !== 1 ? 's' : ''}` : 'Click to rate'}
                   </p>
                 </div>

                 <div className="flex gap-3">
                   <Button
                     variant="outline"
                     onClick={() => setShowRatingDialog(false)}
                     className="flex-1"
                   >
                     Cancel
                   </Button>
                   <Button
                     onClick={() => ratingMutation.mutate({ templateId: templateToRate.id, rating: userRating })}
                     disabled={userRating === 0 || ratingMutation.isPending}
                     className="flex-1 bg-yellow-500 hover:bg-yellow-600"
                   >
                     {ratingMutation.isPending ? (
                       <>
                         <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                         Submitting...
                       </>
                     ) : (
                       <>
                         <Star className="w-4 h-4 mr-2" />
                         Submit Rating
                       </>
                     )}
                   </Button>
                 </div>
               </div>
             )}
           </DialogContent>
         </Dialog>

        {/* Info Alert */}
         <Alert className="border-green-500 bg-green-50">
           <CheckCircle className="w-5 h-5 text-green-600" />
           <AlertDescription className="ml-2">
             <strong>💡 New Features:</strong> Rate templates to help identify the most effective ones, filter by client type, and duplicate templates for quick customization!
           </AlertDescription>
         </Alert>
        </div>
        </div>
        );
        }