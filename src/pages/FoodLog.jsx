import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Utensils, Camera, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";

export default function FoodLog() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formData, setFormData] = useState({
    meal_type: 'breakfast',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['myClientProfile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      
      // Try to find client by email match
      const clients = await base44.entities.Client.filter({ email: user.email });
      if (clients.length > 0) {
        return clients[0];
      }
      
      // If not found, try case-insensitive search
      const allClients = await base44.entities.Client.list();
      const matchingClient = allClients.find(c => 
        c.email?.toLowerCase() === user.email?.toLowerCase()
      );
      
      return matchingClient || null;
    },
    enabled: !!user,
  });

  const { data: todayLogs } = useQuery({
    queryKey: ['todayFoodLogs', format(selectedDate, 'yyyy-MM-dd'), clientProfile?.id],
    queryFn: async () => {
      const logs = await base44.entities.FoodLog.filter({
        date: format(selectedDate, 'yyyy-MM-dd'),
        client_id: clientProfile?.id,
      });
      return logs.sort((a, b) => {
        const order = ['breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner'];
        return order.indexOf(a.meal_type) - order.indexOf(b.meal_type);
      });
    },
    enabled: !!clientProfile,
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingLog) {
        return base44.entities.FoodLog.update(editingLog.id, data);
      }
      return base44.entities.FoodLog.create({
        ...data,
        client_id: clientProfile.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['todayFoodLogs']);
      setShowAddDialog(false);
      setEditingLog(null);
      setFormData({ meal_type: 'breakfast', date: format(new Date(), 'yyyy-MM-dd'), photo_url: null });
      alert(editingLog ? 'Food log updated!' : 'Food log saved!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FoodLog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['todayFoodLogs']);
      alert('Food log deleted!');
    },
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10485760) {
      alert('Photo size must be less than 10 MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, photo_url: file_url });
    } catch (error) {
      console.error('Photo upload failed:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleEdit = (log) => {
    setEditingLog(log);
    setFormData({
      meal_type: log.meal_type,
      meal_name: log.meal_name,
      items: log.items,
      portion_sizes: log.portion_sizes,
      calories: log.calories,
      protein: log.protein,
      carbs: log.carbs,
      fats: log.fats,
      photo_url: log.photo_url,
      notes: log.notes,
    });
    setShowAddDialog(true);
  };

  const handleDialogClose = () => {
    setShowAddDialog(false);
    setEditingLog(null);
    setFormData({ meal_type: 'breakfast', date: format(new Date(), 'yyyy-MM-dd'), photo_url: null });
  };

  const handleSubmit = () => {
    saveMutation.mutate({
      ...formData,
      date: format(selectedDate, 'yyyy-MM-dd'),
    });
  };

  const totalCalories = todayLogs.reduce((sum, log) => sum + (log.calories || 0), 0);
  const totalProtein = todayLogs.reduce((sum, log) => sum + (log.protein || 0), 0);
  const totalCarbs = todayLogs.reduce((sum, log) => sum + (log.carbs || 0), 0);
  const totalFats = todayLogs.reduce((sum, log) => sum + (log.fats || 0), 0);

  const targetCalories = clientProfile?.target_calories || 2000;
  const calorieProgress = (totalCalories / targetCalories) * 100;

  if (!clientProfile) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl">
          <CardHeader>
            <CardTitle>No Client Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Your dietitian needs to create your profile first.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">Food Log</h1>
            <p className="text-sm md:text-base text-gray-600">Track your daily food intake</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={(open) => !open && handleDialogClose()}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-500 to-red-500 w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Log Food
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingLog ? 'Edit Meal' : 'Log Your Meal'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Meal Type</Label>
                  <Select
                    value={formData.meal_type}
                    onValueChange={(value) => setFormData({...formData, meal_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakfast">Breakfast</SelectItem>
                      <SelectItem value="mid_morning">Mid-Morning Snack</SelectItem>
                      <SelectItem value="lunch">Lunch</SelectItem>
                      <SelectItem value="evening_snack">Evening Snack</SelectItem>
                      <SelectItem value="dinner">Dinner</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Meal Name</Label>
                  <Input
                    value={formData.meal_name || ''}
                    onChange={(e) => setFormData({...formData, meal_name: e.target.value})}
                    placeholder="e.g., Poha with peanuts"
                  />
                </div>

                <div className="space-y-2">
                  <Label>What did you eat? (one per line)</Label>
                  <Textarea
                    value={formData.items?.join('\n') || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      items: e.target.value.split('\n').filter(item => item.trim())
                    })}
                    placeholder="1 katori poha&#10;1 cup chai&#10;10 peanuts"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Calories (optional)</Label>
                    <Input
                      type="number"
                      value={formData.calories || ''}
                      onChange={(e) => setFormData({...formData, calories: parseFloat(e.target.value)})}
                      placeholder="250"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Protein (g)</Label>
                    <Input
                      type="number"
                      value={formData.protein || ''}
                      onChange={(e) => setFormData({...formData, protein: parseFloat(e.target.value)})}
                      placeholder="10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Carbs (g)</Label>
                    <Input
                      type="number"
                      value={formData.carbs || ''}
                      onChange={(e) => setFormData({...formData, carbs: parseFloat(e.target.value)})}
                      placeholder="40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fats (g)</Label>
                    <Input
                      type="number"
                      value={formData.fats || ''}
                      onChange={(e) => setFormData({...formData, fats: parseFloat(e.target.value)})}
                      placeholder="5"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="How did you feel? Any deviations from the plan?"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Upload Food Photo (optional)</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-orange-500 transition-colors">
                    <div className="text-center">
                      <Camera className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={uploadingPhoto}
                        className="hidden"
                        id="food-photo-upload"
                      />
                      <label
                        htmlFor="food-photo-upload"
                        className={`cursor-pointer text-sm text-gray-600 hover:text-orange-600 ${uploadingPhoto ? 'opacity-50' : ''}`}
                      >
                        {uploadingPhoto ? 'Uploading...' : 'Click to upload photo'}
                      </label>
                      {formData.photo_url && (
                        <div className="mt-3">
                          <img
                            src={formData.photo_url}
                            alt="Food"
                            className="max-h-40 mx-auto rounded-lg"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => setFormData({ ...formData, photo_url: null })}
                          >
                            Remove Photo
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleDialogClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={saveMutation.isPending || uploadingPhoto}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-500"
                  >
                    {saveMutation.isPending ? 'Saving...' : editingLog ? 'Update Food Log' : 'Save Food Log'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Calendar - Hidden on mobile, shown on desktop */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur hidden lg:block">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-base md:text-lg">Select Date</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center p-2 sm:p-4 md:p-6">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border w-full"
              />
            </CardContent>
          </Card>
          
          {/* Mobile Date Selector */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur lg:hidden">
            <CardHeader className="p-4">
              <CardTitle className="text-base">Select Date</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="w-full"
              />
            </CardContent>
          </Card>

          {/* Food Logs */}
          <div className="lg:col-span-3 space-y-4 sm:space-y-6">
            {/* Daily Summary */}
            <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-base md:text-lg lg:text-xl">Today's Summary - {format(selectedDate, 'MMM d, yyyy')}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <div className="space-y-3 md:space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-xs md:text-sm text-gray-600">Calories</span>
                      <span className="text-xs md:text-sm font-medium">
                        {totalCalories} / {targetCalories} kcal
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 md:h-3">
                      <div
                        className="bg-gradient-to-r from-orange-500 to-red-500 h-2 md:h-3 rounded-full transition-all"
                        style={{ width: `${Math.min(calorieProgress, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                    <div className="p-2 sm:p-2.5 md:p-3 bg-white rounded-lg">
                      <p className="text-xs text-gray-600">Protein</p>
                      <p className="text-base sm:text-lg md:text-2xl font-bold text-red-600">{totalProtein}g</p>
                    </div>
                    <div className="p-2 sm:p-2.5 md:p-3 bg-white rounded-lg">
                      <p className="text-xs text-gray-600">Carbs</p>
                      <p className="text-base sm:text-lg md:text-2xl font-bold text-yellow-600">{totalCarbs}g</p>
                    </div>
                    <div className="p-2 sm:p-2.5 md:p-3 bg-white rounded-lg">
                      <p className="text-xs text-gray-600">Fats</p>
                      <p className="text-base sm:text-lg md:text-2xl font-bold text-purple-600">{totalFats}g</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Food Logs List */}
            {todayLogs.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-6 sm:p-8 md:p-12 text-center">
                  <Utensils className="w-12 h-12 md:w-16 md:h-16 mx-auto text-gray-300 mb-3 md:mb-4" />
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-2">
                    No Food Logged Yet
                  </h3>
                  <p className="text-sm md:text-base text-gray-600 mb-3 md:mb-4">
                    Start tracking your meals for {format(selectedDate, 'MMMM d')}
                  </p>
                  <Button
                    onClick={() => setShowAddDialog(true)}
                    className="bg-gradient-to-r from-orange-500 to-red-500 w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Log Your First Meal
                  </Button>
                </CardContent>
              </Card>
            ) : (
              todayLogs.map((log) => (
                <Card key={log.id} className="border-none shadow-lg bg-white/80 backdrop-blur">
                  <CardHeader className="p-4 md:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge variant="outline" className="text-orange-600 border-orange-300 capitalize text-xs">
                            {log.meal_type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <CardTitle className="text-base sm:text-lg md:text-xl break-words">{log.meal_name || 'Meal'}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                        {log.calories && (
                          <div className="text-right">
                            <p className="text-lg sm:text-xl md:text-2xl font-bold text-orange-600">{log.calories}</p>
                            <p className="text-xs text-gray-500">kcal</p>
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(log)}
                          className="h-8 w-8 md:h-10 md:w-10"
                        >
                          <Edit className="w-3 h-3 md:w-4 md:h-4 text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Delete this food log?')) {
                              deleteMutation.mutate(log.id);
                            }
                          }}
                          className="h-8 w-8 md:h-10 md:w-10"
                        >
                          <Trash2 className="w-3 h-3 md:w-4 md:h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6">
                    {log.items && log.items.length > 0 && (
                      <div>
                        <h4 className="text-sm md:text-base font-semibold text-gray-900 mb-2">What I Ate</h4>
                        <div className="space-y-1">
                          {log.items.map((item, i) => (
                            <div key={i} className="text-sm md:text-base text-gray-700 break-words">• {item}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(log.protein || log.carbs || log.fats) && (
                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        {log.protein > 0 && (
                          <div className="p-2 sm:p-2.5 md:p-3 bg-red-50 rounded-lg">
                            <p className="text-xs text-gray-600">Protein</p>
                            <p className="text-sm sm:text-base md:text-lg font-bold text-red-600">{log.protein}g</p>
                          </div>
                        )}
                        {log.carbs > 0 && (
                          <div className="p-2 sm:p-2.5 md:p-3 bg-yellow-50 rounded-lg">
                            <p className="text-xs text-gray-600">Carbs</p>
                            <p className="text-sm sm:text-base md:text-lg font-bold text-yellow-600">{log.carbs}g</p>
                          </div>
                        )}
                        {log.fats > 0 && (
                          <div className="p-2 sm:p-2.5 md:p-3 bg-purple-50 rounded-lg">
                            <p className="text-xs text-gray-600">Fats</p>
                            <p className="text-sm sm:text-base md:text-lg font-bold text-purple-600">{log.fats}g</p>
                          </div>
                        )}
                      </div>
                    )}

                    {log.photo_url && (
                      <div>
                        <h4 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Food Photo</h4>
                        <img
                          src={log.photo_url}
                          alt="Food"
                          className="w-full max-h-40 sm:max-h-48 md:max-h-64 object-cover rounded-lg cursor-pointer"
                          onClick={() => window.open(log.photo_url, '_blank')}
                        />
                      </div>
                    )}

                    {log.notes && (
                      <div className="p-2 md:p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs md:text-sm text-gray-700 break-words">{log.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}