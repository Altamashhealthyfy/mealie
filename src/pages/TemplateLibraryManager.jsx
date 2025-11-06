
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
  Eye
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function TemplateLibraryManager() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [viewingTemplate, setViewingTemplate] = useState(null);
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

  const uploadMutation = useMutation({
    mutationFn: async (data) => {
      // Upload file first
      const uploadResult = await base44.integrations.Core.UploadFile({ file: selectedFile });
      
      // Get file size
      const fileSizeKB = (selectedFile.size / 1024).toFixed(1);
      const fileSizeMB = (selectedFile.size / (1024 * 1024)).toFixed(1);
      const fileSize = fileSizeMB >= 1 ? `${fileSizeMB} MB` : `${fileSizeKB} KB`;
      
      // Get file type
      const fileType = selectedFile.name.split('.').pop().toLowerCase();
      
      // Create template record
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
      alert("✅ Template uploaded successfully!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DownloadableTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['downloadableTemplates']);
      alert("Template deleted");
    },
  });

  const handleUpload = async () => {
    if (!selectedFile) {
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
      alert("Error uploading template");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const userType = user?.user_type || 'client';
  
  // Allow super_admin, team_member, student_coach, and student_team_member to upload
  const canUploadTemplates = ['super_admin', 'team_member', 'student_coach', 'student_team_member'].includes(userType);
  
  if (!canUploadTemplates) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl">
          <CardHeader>
            <Shield className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <CardTitle className="text-center text-2xl">Access Restricted</CardTitle>
            <CardDescription className="text-center">
              This page is only accessible to team members and coaches
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Badge className="bg-purple-600 text-white mb-2">
              <Shield className="w-4 h-4 mr-1" />
              {userType.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </Badge>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Template Library Manager</h1>
            <p className="text-gray-600">Upload templates for students to download</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">{templates.length}</p>
            <p className="text-sm text-gray-600">Total Templates</p>
          </div>
        </div>

        {/* Upload Section */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardHeader>
            <CardTitle className="text-2xl">Upload New Template</CardTitle>
            <CardDescription>Upload Word/PDF files that students can download</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload */}
            <div className="p-6 border-2 border-dashed border-blue-300 rounded-xl bg-white">
              <div className="text-center">
                <Upload className="w-12 h-12 mx-auto text-blue-500 mb-3" />
                <p className="text-sm text-gray-700 mb-3">
                  Select Word (.docx), PDF (.pdf), or Excel (.xlsx) file
                </p>
                <input
                  type="file"
                  accept=".docx,.pdf,.xlsx,.doc"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="w-full p-2 border rounded-lg"
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

            {/* Template Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  placeholder="e.g., Veg Weight Loss 1500 cal"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({...formData, category: value})}
                >
                  <SelectTrigger>
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
                    <Label>Subcategory</Label>
                    <Select
                      value={formData.subcategory}
                      onValueChange={(value) => setFormData({...formData, subcategory: value})}
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
                        <SelectItem value="pregnancy">Pregnancy</SelectItem>
                        <SelectItem value="kids">Kids Nutrition</SelectItem>
                        <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Target Calories</Label>
                    <Input
                      type="number"
                      placeholder="1500"
                      value={formData.target_calories}
                      onChange={(e) => setFormData({...formData, target_calories: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Food Preference</Label>
                    <Select
                      value={formData.food_preference}
                      onValueChange={(value) => setFormData({...formData, food_preference: value})}
                    >
                      <SelectTrigger>
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
                    <Label>Regional Preference</Label>
                    <Select
                      value={formData.regional_preference}
                      onValueChange={(value) => setFormData({...formData, regional_preference: value})}
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
                    <Label>Duration (days)</Label>
                    <Input
                      type="number"
                      placeholder="7"
                      value={formData.duration}
                      onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of what this template contains"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input
                placeholder="e.g., weight loss, high protein, low carb"
                value={formData.tags}
                onChange={(e) => setFormData({...formData, tags: e.target.value})}
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
              <Label htmlFor="premium">Premium Only (Only for Professional/Premium plans)</Label>
            </div>

            <Button
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
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
          </CardContent>
        </Card>

        {/* Uploaded Templates */}
        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Uploaded Templates ({templates.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">No templates uploaded yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card key={template.id} className="border-2 hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          {template.is_premium && (
                            <Badge className="bg-purple-500 text-white mt-1">
                              <Star className="w-3 h-3 mr-1" />
                              Premium
                            </Badge>
                          )}
                        </div>
                        <Badge className="bg-blue-100 text-blue-700 uppercase">
                          {template.file_type}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
                      
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
                      </div>

                      <div className="text-xs text-gray-500 space-y-1">
                        <p>📥 Downloaded: {template.download_count} times</p>
                        <p>📦 Size: {template.file_size}</p>
                        <p>📅 Updated: {template.last_updated}</p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setViewingTemplate(template)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => {
                            if (confirm("Delete this template?")) {
                              deleteMutation.mutate(template.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Template Dialog */}
        {viewingTemplate && (
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
                      📅 Last updated: {viewingTemplate.last_updated}
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
