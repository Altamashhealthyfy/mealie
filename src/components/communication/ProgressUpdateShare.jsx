import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Upload, Camera, FileText, Lightbulb, Scale, Heart, TrendingUp, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ProgressUpdateShare({ onShare, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('metrics');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Metrics tab
  const [metrics, setMetrics] = useState({
    weight: '',
    mood: 'good',
    energy: '',
    sleep_hours: '',
    exercise_minutes: '',
  });

  // Photo tab
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Notes tab
  const [notes, setNotes] = useState({
    title: '',
    content: '',
    tags: 'motivation',
  });

  const handlePhotoSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5242880) {
      toast.error('Image size must be less than 5 MB');
      return;
    }
    setSelectedPhoto(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleShare = async () => {
    setLoading(true);
    try {
      let shareData = {
        type: activeTab,
        timestamp: new Date().toISOString(),
      };

      if (activeTab === 'metrics') {
        if (!metrics.weight && !metrics.energy && !metrics.sleep_hours) {
          toast.error('Please enter at least one metric');
          setLoading(false);
          return;
        }
        shareData.data = metrics;
      } else if (activeTab === 'photo' && selectedPhoto) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedPhoto });
        shareData.data = {
          photo_url: file_url,
          caption: notes.title || 'Progress photo',
        };
      } else if (activeTab === 'notes') {
        if (!notes.content.trim()) {
          toast.error('Please write a note');
          setLoading(false);
          return;
        }
        shareData.data = notes;
      }

      onShare(shareData);
      
      // Reset form
      setMetrics({ weight: '', mood: 'good', energy: '', sleep_hours: '', exercise_minutes: '' });
      setSelectedPhoto(null);
      setPhotoPreview(null);
      setNotes({ title: '', content: '', tags: 'motivation' });
      setOpen(false);
      toast.success('Progress update shared!');
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to share update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="border-green-300 text-green-700 hover:bg-green-50 w-full flex gap-2"
        >
          <TrendingUp className="w-4 h-4" />
          Share Progress
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share Your Progress Update</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="metrics" className="flex gap-1">
              <Scale className="w-4 h-4" />
              <span className="hidden sm:inline">Metrics</span>
            </TabsTrigger>
            <TabsTrigger value="photo" className="flex gap-1">
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Photo</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex gap-1">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Notes</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="metrics" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Weight (kg)</label>
                <Input
                  type="number"
                  placeholder="Current weight"
                  value={metrics.weight}
                  onChange={(e) => setMetrics({ ...metrics, weight: e.target.value })}
                  step="0.1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Energy (1-10)</label>
                <Input
                  type="number"
                  placeholder="Energy level"
                  value={metrics.energy}
                  onChange={(e) => setMetrics({ ...metrics, energy: e.target.value })}
                  min="1"
                  max="10"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Sleep Hours</label>
                <Input
                  type="number"
                  placeholder="Hours slept"
                  value={metrics.sleep_hours}
                  onChange={(e) => setMetrics({ ...metrics, sleep_hours: e.target.value })}
                  step="0.5"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Exercise (minutes)</label>
                <Input
                  type="number"
                  placeholder="Minutes exercised"
                  value={metrics.exercise_minutes}
                  onChange={(e) => setMetrics({ ...metrics, exercise_minutes: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block flex gap-1">
                <Heart className="w-4 h-4" />
                How are you feeling?
              </label>
              <div className="grid grid-cols-5 gap-2">
                {['very_poor', 'poor', 'neutral', 'good', 'excellent'].map((mood) => (
                  <Button
                    key={mood}
                    variant={metrics.mood === mood ? 'default' : 'outline'}
                    className="h-10 capitalize"
                    onClick={() => setMetrics({ ...metrics, mood })}
                  >
                    {mood === 'very_poor' ? '😞' : mood === 'poor' ? '😔' : mood === 'neutral' ? '😐' : mood === 'good' ? '😊' : '😄'}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="photo" className="space-y-4 mt-4">
            {photoPreview ? (
              <div className="space-y-3">
                <img src={photoPreview} alt="Preview" className="w-full rounded-lg max-h-64 object-cover" />
                <Input
                  placeholder="Add a caption (optional)"
                  value={notes.title}
                  onChange={(e) => setNotes({ ...notes, title: e.target.value })}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSelectedPhoto(null);
                    setPhotoPreview(null);
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Change Photo
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoSelect(e.target.files?.[0])}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handlePhotoSelect(e.target.files?.[0])}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="w-full h-32 flex flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 text-gray-400" />
                  Upload Photo
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Take Photo
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="notes" className="space-y-4 mt-4">
            <Input
              placeholder="Note title (e.g., 'Weekly Reflection')"
              value={notes.title}
              onChange={(e) => setNotes({ ...notes, title: e.target.value })}
            />
            <Textarea
              placeholder="Share your progress, challenges, or insights..."
              value={notes.content}
              onChange={(e) => setNotes({ ...notes, content: e.target.value })}
              rows={6}
              className="resize-none"
            />
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Tag</label>
              <div className="flex gap-2 flex-wrap">
                {['motivation', 'challenge', 'milestone', 'insight', 'reflection'].map((tag) => (
                  <Badge
                    key={tag}
                    variant={notes.tags === tag ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setNotes({ ...notes, tags: tag })}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleShare}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                Share Update
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}