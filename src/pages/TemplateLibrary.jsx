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
  Loader2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function TemplateLibrary() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [calorieFilter, setCalorieFilter] = useState("all");
  const [foodPrefFilter, setFoodPrefFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [viewingTemplate, setViewingTemplate] = useState(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
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

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: templates } = useQuery({
    queryKey: ['downloadableTemplates'],
    queryFn: () => base44.entities.DownloadableTemplate.list('-download_count'),
    initialData: [],
  });

  const downloadMutation = useMutation({
    mutationFn: async (template) => {
      await base44.entities.DownloadableTemplate.update(template.id, {
        download_count: (template.download_count || 0) + 1
      });
      window.open(template.file_url, '_blank');
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

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || template.category === categoryFilter;
    const matchesCalories = calorieFilter === "all" || 
                           (template.target_calories && 
                            Math.abs(template.target_calories - parseInt(calorieFilter)) <= 100);
    const matchesFoodPref = foodPrefFilter === "all" || 
                           template.food_preference === foodPrefFilter || 
                           template.food_preference === "all";
    const matchesRegion = regionFilter === "all" || 
                         template.regional_preference === regionFilter || 
                         template.regional_preference === "all";
    
    return matchesSearch && matchesCategory && matchesCalories && matchesFoodPref && matchesRegion;
  });

  const handleDownload = (template) => {
    downloadMutation.mutate(template);
  };

  const userType = user?.user_type || 'client';
  const canUpload = ['super_admin', 'team_member', 'student_coach'].includes(userType);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
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

        {/* Search & Filters */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

                <Select value={calorieFilter} onValueChange={setCalorieFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Calories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Calories</SelectItem>
                    <SelectItem value="1200">1200 kcal</SelectItem>
                    <SelectItem value="1400">1400 kcal</SelectItem>
                    <SelectItem value="1500">1500 kcal</SelectItem>
                    <SelectItem value="1600">1600 kcal</SelectItem>
                    <SelectItem value="1800">1800 kcal</SelectItem>
                    <SelectItem value="2000">2000 kcal</SelectItem>
                    <SelectItem value="2200">2200 kcal</SelectItem>
                    <SelectItem value="2500">2500 kcal</SelectItem>
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No templates found</h3>
              <p className="text-gray-600">Try adjusting your filters</p>
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <Card 
                key={template.id} 
                className="border-none shadow-lg bg-white/80 backdrop-blur hover:shadow-xl transition-all group"
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge className="bg-blue-100 text-blue-700 uppercase">
                      {template.file_type}
                    </Badge>
                    {template.is_premium && (
                      <Badge className="bg-purple-500 text-white">
                        <Star className="w-3 h-3 mr-1" />
                        Premium
                      </Badge>
                    )}
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
                        {template.target_calories} kcal
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
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setViewingTemplate(template)}
                      className="w-full"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <Button
                      onClick={() => handleDownload(template)}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

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
                          {viewingTemplate.target_calories} kcal
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

                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setViewingTemplate(null)}
                    className="h-12"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      handleDownload(viewingTemplate);
                      setViewingTemplate(null);
                    }}
                    className="h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
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
            <strong>💡 How to use:</strong> Download templates, customize in Microsoft Word for your clients, 
            and use unlimited times - completely FREE! No AI generation needed, save ₹10 per plan.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}