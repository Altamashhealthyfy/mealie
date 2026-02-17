import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Award, Plus, Edit, Trash2, Loader2, CheckCircle, Image, Smile } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function BadgeManagement() {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingBadge, setEditingBadge] = useState(null);
  const [badgeData, setBadgeData] = useState({
    category: 'milestone',
    rarity: 'common',
    is_active: true,
  });
  const [iconType, setIconType] = useState('emoji');
  const [uploading, setUploading] = useState(false);

  const { data: badges } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.Badge.list(),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingBadge) {
        return await base44.entities.Badge.update(editingBadge.id, data);
      }
      return await base44.entities.Badge.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      setShowCreateDialog(false);
      setEditingBadge(null);
      setBadgeData({
        category: 'milestone',
        rarity: 'common',
        is_active: true,
      });
      toast.success(editingBadge ? "Badge updated!" : "Badge created!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Badge.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      toast.success("Badge deleted");
    },
  });

  const handleEdit = (badge) => {
    setEditingBadge(badge);
    setBadgeData({
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      category: badge.category,
      rarity: badge.rarity,
      points_required: badge.points_required,
      unlock_criteria: badge.unlock_criteria,
      is_active: badge.is_active,
    });
    setShowCreateDialog(true);
  };

  const rarityColors = {
    common: "bg-gray-100 border-gray-300",
    rare: "bg-blue-100 border-blue-400",
    epic: "bg-purple-100 border-purple-400",
    legendary: "bg-yellow-100 border-yellow-400"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
              <Award className="w-10 h-10 text-purple-500" />
              Badge Management
            </h1>
            <p className="text-gray-600 mt-2">Create and manage achievement badges</p>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingBadge(null);
                  setBadgeData({
                    category: 'milestone',
                    rarity: 'common',
                    is_active: true,
                  });
                }}
                className="bg-gradient-to-r from-purple-500 to-pink-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Badge
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingBadge ? 'Edit Badge' : 'Create New Badge'}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Badge Name *</Label>
                  <Input
                    value={badgeData.name || ''}
                    onChange={(e) => setBadgeData({...badgeData, name: e.target.value})}
                    placeholder="e.g., First Steps, Weight Warrior, Hydration Hero"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Icon *</Label>
                  <Tabs value={iconType} onValueChange={setIconType}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="emoji" className="flex items-center gap-2">
                        <Smile className="w-4 h-4" />
                        Select Emoji
                      </TabsTrigger>
                      <TabsTrigger value="upload" className="flex items-center gap-2">
                        <Image className="w-4 h-4" />
                        Upload Icon
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="emoji" className="space-y-3 mt-3">
                      <Input
                        value={badgeData.icon || ''}
                        onChange={(e) => setBadgeData({...badgeData, icon: e.target.value})}
                        placeholder="🏆 🎯 💪 ⭐ 🔥 💎"
                      />
                      <div className="grid grid-cols-8 gap-2 p-3 bg-gray-50 rounded-lg border">
                        {['🏆', '🎯', '💪', '⭐', '🔥', '💎', '👑', '🥇', '🥈', '🥉', '🎖️', '🏅', '🌟', '✨', '💫', '⚡'].map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setBadgeData({...badgeData, icon: emoji})}
                            className={`text-3xl p-2 rounded hover:bg-white transition-all ${
                              badgeData.icon === emoji ? 'bg-white ring-2 ring-purple-500' : ''
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">Click an emoji or type your own</p>
                    </TabsContent>

                    <TabsContent value="upload" className="space-y-3 mt-3">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            setUploading(true);
                            try {
                              const { file_url } = await base44.integrations.Core.UploadFile({ file });
                              setBadgeData({...badgeData, icon: file_url});
                              toast.success("Icon uploaded!");
                            } catch (error) {
                              toast.error("Failed to upload icon");
                            } finally {
                              setUploading(false);
                            }
                          }}
                          className="hidden"
                          id="badge-icon-upload"
                        />
                        <label htmlFor="badge-icon-upload" className="cursor-pointer">
                          {badgeData.icon && badgeData.icon.startsWith('http') ? (
                            <div className="space-y-2">
                              <img src={badgeData.icon} alt="Badge icon" className="w-20 h-20 mx-auto object-contain" />
                              <p className="text-sm text-green-600 font-semibold">✓ Icon uploaded</p>
                              <p className="text-xs text-gray-500">Click to change</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Image className="w-12 h-12 mx-auto text-gray-400" />
                              <p className="text-sm font-semibold text-gray-700">
                                {uploading ? 'Uploading...' : 'Click to upload icon'}
                              </p>
                              <p className="text-xs text-gray-500">PNG, JPG, SVG up to 5MB</p>
                            </div>
                          )}
                        </label>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    value={badgeData.description || ''}
                    onChange={(e) => setBadgeData({...badgeData, description: e.target.value})}
                    placeholder="What this badge represents..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={badgeData.category}
                      onValueChange={(value) => setBadgeData({...badgeData, category: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weight_loss">Weight Loss</SelectItem>
                        <SelectItem value="consistency">Consistency</SelectItem>
                        <SelectItem value="wellness">Wellness</SelectItem>
                        <SelectItem value="nutrition">Nutrition</SelectItem>
                        <SelectItem value="milestone">Milestone</SelectItem>
                        <SelectItem value="special">Special</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Rarity</Label>
                    <Select
                      value={badgeData.rarity}
                      onValueChange={(value) => setBadgeData({...badgeData, rarity: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="common">Common</SelectItem>
                        <SelectItem value="rare">Rare</SelectItem>
                        <SelectItem value="epic">Epic</SelectItem>
                        <SelectItem value="legendary">Legendary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Points Required to Unlock</Label>
                  <Input
                    type="number"
                    value={badgeData.points_required || ''}
                    onChange={(e) => setBadgeData({...badgeData, points_required: parseInt(e.target.value)})}
                    placeholder="e.g., 100, 500, 1000"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={() => saveMutation.mutate(badgeData)}
                    disabled={saveMutation.isPending || !badgeData.name || !badgeData.icon || !badgeData.description}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
                  >
                    {saveMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {editingBadge ? 'Update' : 'Create'} Badge
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {badges.map(badge => (
            <Card key={badge.id} className={`border-2 ${rarityColors[badge.rarity]} hover:shadow-lg transition-all`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="text-5xl">
                    {badge.icon?.startsWith('http') ? (
                      <img src={badge.icon} alt={badge.name} className="w-16 h-16 object-contain" />
                    ) : (
                      badge.icon
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(badge)}>
                      <Edit className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => {
                      if (window.confirm('Delete this badge?')) {
                        deleteMutation.mutate(badge.id);
                      }
                    }}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-bold text-gray-900">{badge.name}</p>
                <p className="text-xs text-gray-600">{badge.description}</p>
                <div className="flex gap-2">
                  <Badge className="capitalize text-xs">{badge.rarity}</Badge>
                  <Badge variant="outline" className="text-xs capitalize">{badge.category}</Badge>
                </div>
                {badge.points_required && (
                  <p className="text-xs text-gray-500">Requires {badge.points_required} points</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {badges.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Award className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 mb-4">No badges created yet</p>
              <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-to-r from-purple-500 to-pink-500">
                <Plus className="w-4 h-4 mr-2" />
                Create First Badge
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}