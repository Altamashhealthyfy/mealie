import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Eye, BookOpen, Loader2, Upload } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function ResourceManager() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [viewingResource, setViewingResource] = useState(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    resource_type: 'article',
    category: 'general',
    tags: [],
    target_goals: ['all'],
    target_preferences: ['all'],
    thumbnail_url: '',
    video_url: '',
    external_link: '',
    reading_time: '',
    difficulty_level: 'beginner',
    featured: false,
    published: true,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: resources } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list('-created_date'),
    initialData: [],
  });

  const saveResourceMutation = useMutation({
    mutationFn: (data) => {
      if (editingResource) {
        return base44.entities.Resource.update(editingResource.id, data);
      }
      return base44.entities.Resource.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['resources']);
      setShowDialog(false);
      setEditingResource(null);
      resetForm();
      alert(editingResource ? 'Resource updated!' : 'Resource created!');
    },
  });

  const deleteResourceMutation = useMutation({
    mutationFn: (id) => base44.entities.Resource.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['resources']);
      alert('Resource deleted!');
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      content: '',
      resource_type: 'article',
      category: 'general',
      tags: [],
      target_goals: ['all'],
      target_preferences: ['all'],
      thumbnail_url: '',
      video_url: '',
      external_link: '',
      reading_time: '',
      difficulty_level: 'beginner',
      featured: false,
      published: true,
    });
  };

  const handleEdit = (resource) => {
    setEditingResource(resource);
    setFormData({
      title: resource.title || '',
      description: resource.description || '',
      content: resource.content || '',
      resource_type: resource.resource_type || 'article',
      category: resource.category || 'general',
      tags: resource.tags || [],
      target_goals: resource.target_goals || ['all'],
      target_preferences: resource.target_preferences || ['all'],
      thumbnail_url: resource.thumbnail_url || '',
      video_url: resource.video_url || '',
      external_link: resource.external_link || '',
      reading_time: resource.reading_time || '',
      difficulty_level: resource.difficulty_level || 'beginner',
      featured: resource.featured || false,
      published: resource.published ?? true,
    });
    setShowDialog(true);
  };

  const handleUploadThumbnail = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingThumbnail(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, thumbnail_url: file_url });
    } catch (error) {
      alert('Failed to upload thumbnail');
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleSubmit = () => {
    if (!formData.title) {
      alert('Please enter a title');
      return;
    }
    saveResourceMutation.mutate(formData);
  };

  const handleDelete = (resource) => {
    if (window.confirm(`Delete "${resource.title}"?`)) {
      deleteResourceMutation.mutate(resource.id);
    }
  };

  if (user?.user_type === 'client') {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">This page is only accessible to coaches and administrators.</p>
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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Resource Manager</h1>
            <p className="text-gray-600">Create and manage educational content for clients</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-500 to-red-500" onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Resource
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingResource ? 'Edit Resource' : 'Create New Resource'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Resource Type</Label>
                    <Select value={formData.resource_type} onValueChange={(value) => setFormData({...formData, resource_type: value})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="article">Article</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="recipe">Recipe</SelectItem>
                        <SelectItem value="workout">Workout</SelectItem>
                        <SelectItem value="guide">Guide</SelectItem>
                        <SelectItem value="tip">Quick Tip</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nutrition">Nutrition</SelectItem>
                        <SelectItem value="fitness">Fitness</SelectItem>
                        <SelectItem value="mindfulness">Mindfulness</SelectItem>
                        <SelectItem value="recipes">Recipes</SelectItem>
                        <SelectItem value="lifestyle">Lifestyle</SelectItem>
                        <SelectItem value="disease_management">Disease Management</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={2} />
                </div>

                <div className="space-y-2">
                  <Label>Content (Markdown supported)</Label>
                  <Textarea value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} rows={8} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Reading Time (minutes)</Label>
                    <Input type="number" value={formData.reading_time} onChange={(e) => setFormData({...formData, reading_time: parseInt(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Difficulty Level</Label>
                    <Select value={formData.difficulty_level} onValueChange={(value) => setFormData({...formData, difficulty_level: value})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Thumbnail Image</Label>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadThumbnail}
                      disabled={uploadingThumbnail}
                    />
                    {uploadingThumbnail && <Loader2 className="w-5 h-5 animate-spin" />}
                  </div>
                  {formData.thumbnail_url && (
                    <img src={formData.thumbnail_url} alt="Preview" className="w-full h-40 object-cover rounded" />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Video URL (YouTube embed)</Label>
                  <Input value={formData.video_url} onChange={(e) => setFormData({...formData, video_url: e.target.value})} 
                    placeholder="https://www.youtube.com/watch?v=..." />
                </div>

                <div className="space-y-2">
                  <Label>External Link</Label>
                  <Input value={formData.external_link} onChange={(e) => setFormData({...formData, external_link: e.target.value})} />
                </div>

                <div className="space-y-2">
                  <Label>Tags (comma separated)</Label>
                  <Input 
                    value={formData.tags.join(', ')} 
                    onChange={(e) => setFormData({...formData, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})}
                    placeholder="weight loss, beginner, healthy eating"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <Label>Featured Resource</Label>
                  <Switch checked={formData.featured} onCheckedChange={(checked) => setFormData({...formData, featured: checked})} />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <Label>Published</Label>
                  <Switch checked={formData.published} onCheckedChange={(checked) => setFormData({...formData, published: checked})} />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">Cancel</Button>
                  <Button onClick={handleSubmit} disabled={saveResourceMutation.isPending} className="flex-1 bg-gradient-to-r from-orange-500 to-red-500">
                    {saveResourceMutation.isPending ? 'Saving...' : editingResource ? 'Update' : 'Create'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map(resource => (
            <Card key={resource.id} className="border-none shadow-lg">
              {resource.thumbnail_url && (
                <img src={resource.thumbnail_url} alt={resource.title} className="w-full h-48 object-cover rounded-t-lg" />
              )}
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="capitalize">{resource.resource_type}</Badge>
                  <Badge variant="outline" className="capitalize">{resource.category}</Badge>
                  {resource.featured && <Badge className="bg-yellow-500">Featured</Badge>}
                  {!resource.published && <Badge className="bg-gray-500">Draft</Badge>}
                </div>
                <CardTitle className="text-lg">{resource.title}</CardTitle>
                <p className="text-sm text-gray-600 line-clamp-2">{resource.description}</p>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setViewingResource(resource)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(resource)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(resource)} className="text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {resources.length === 0 && (
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Resources Yet</h3>
              <p className="text-gray-600 mb-4">Create your first educational resource</p>
              <Button onClick={() => setShowDialog(true)} className="bg-gradient-to-r from-orange-500 to-red-500">
                <Plus className="w-4 h-4 mr-2" />
                Add Resource
              </Button>
            </CardContent>
          </Card>
        )}

        {/* View Resource Dialog */}
        <Dialog open={!!viewingResource} onOpenChange={() => setViewingResource(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">{viewingResource?.title}</DialogTitle>
            </DialogHeader>
            {viewingResource && (
              <div className="space-y-4 mt-4">
                {viewingResource.thumbnail_url && (
                  <img src={viewingResource.thumbnail_url} alt={viewingResource.title} className="w-full h-64 object-cover rounded-lg" />
                )}
                <div className="flex gap-2">
                  <Badge>{viewingResource.resource_type}</Badge>
                  <Badge variant="outline">{viewingResource.category}</Badge>
                  <Badge variant="outline">{viewingResource.difficulty_level}</Badge>
                </div>
                <p className="text-gray-700">{viewingResource.description}</p>
                {viewingResource.content && (
                  <div className="prose max-w-none">
                    <ReactMarkdown>{viewingResource.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}