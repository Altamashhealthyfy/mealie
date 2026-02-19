import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  'nutrition', 'fitness', 'mental_health', 'disease_management', 
  'meal_planning', 'cooking', 'lifestyle', 'supplements', 'hydration', 'sleep', 'stress_management', 'behavior_change', 'other'
];

const RESOURCE_TYPES = ['pdf', 'article', 'video', 'infographic', 'guide', 'workbook', 'worksheet', 'other'];

const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'];

export default function ResourceUploadForm({ isOpen, onClose, onSuccess, user }) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: '',
    category: '',
    difficulty_level: 'intermediate',
    duration_minutes: '',
    reading_time_minutes: '',
    tags: '',
    conditions: '',
    goals: '',
    is_public: false
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 100 * 1024 * 1024) {
        toast.error('File size exceeds 100MB limit');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    if (!formData.title || !formData.type || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Upload file first
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadRes.file_url;

      // Create thumbnail if it's an image
      let thumbnailUrl = null;
      if (file.type.startsWith('image/')) {
        thumbnailUrl = fileUrl;
      }

      // Create resource
      const resource = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        category: formData.category,
        difficulty_level: formData.difficulty_level,
        file_url: fileUrl,
        file_type: file.type,
        file_size: file.size,
        coach_email: user?.email,
        is_public: formData.is_public,
        thumbnail_url: thumbnailUrl,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        conditions: formData.conditions ? formData.conditions.split(',').map(c => c.trim()) : [],
        goals: formData.goals ? formData.goals.split(',').map(g => g.trim()) : [],
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        reading_time_minutes: formData.reading_time_minutes ? parseInt(formData.reading_time_minutes) : null,
        status: 'published'
      };

      await base44.entities.Resource.create(resource);
      
      toast.success('Resource uploaded successfully!');
      onSuccess?.();
      onClose?.();
      
      // Reset form
      setFile(null);
      setFormData({
        title: '',
        description: '',
        type: '',
        category: '',
        difficulty_level: 'intermediate',
        duration_minutes: '',
        reading_time_minutes: '',
        tags: '',
        conditions: '',
        goals: '',
        is_public: false
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload resource');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Educational Resource</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-400 transition-colors">
            {file ? (
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">{file.name}</p>
                  <p className="text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="p-1 hover:bg-red-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-red-600" />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-700">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-500">PDF, MP4, images, or articles (Max 100MB)</p>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.mp4,.jpg,.jpeg,.png,.webp,.doc,.docx,.txt,.html"
                />
              </label>
            )}
          </div>

          {/* Title & Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Resource title"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category & Difficulty */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty Level</label>
              <Select value={formData.difficulty_level} onValueChange={(value) => setFormData({ ...formData, difficulty_level: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTY_LEVELS.map(level => (
                    <SelectItem key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What is this resource about?"
              rows={3}
            />
          </div>

          {/* Duration Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reading Time (minutes)</label>
              <Input
                type="number"
                value={formData.reading_time_minutes}
                onChange={(e) => setFormData({ ...formData, reading_time_minutes: e.target.value })}
                placeholder="e.g., 15"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Video Duration (minutes)</label>
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                placeholder="e.g., 10"
                min="0"
              />
            </div>
          </div>

          {/* Tags, Conditions, Goals */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
            <Input
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="e.g., weight loss, diabetes, exercise"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Health Conditions (comma-separated)</label>
            <Input
              value={formData.conditions}
              onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
              placeholder="e.g., diabetes, hypertension, obesity"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Health Goals (comma-separated)</label>
            <Input
              value={formData.goals}
              onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
              placeholder="e.g., weight loss, muscle gain, better sleep"
            />
          </div>

          {/* Public Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_public}
              onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
              className="rounded"
              id="public-check"
            />
            <label htmlFor="public-check" className="text-sm text-gray-700">
              Make this resource available to all coaches
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Resource
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}