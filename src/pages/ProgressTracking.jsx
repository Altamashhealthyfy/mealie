import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Plus, Scale, Calendar, Edit, Trash2, Camera, Ruler, Activity, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ProgressTracking() {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    measurements: {},
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: securitySettings } = useQuery({
    queryKey: ['securitySettings'],
    queryFn: async () => {
      const settings = await base44.entities.AppSecuritySettings.list();
      return settings[0] || null;
    },
    enabled: !!user,
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

  const { data: progressLogs } = useQuery({
    queryKey: ['myProgressLogs', clientProfile?.id],
    queryFn: async () => {
      const logs = await base44.entities.ProgressLog.filter({
        client_id: clientProfile?.id,
      });
      return logs.sort((a, b) => new Date(a.date) - new Date(b.date));
    },
    enabled: !!clientProfile,
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingLog) {
        return base44.entities.ProgressLog.update(editingLog.id, data);
      }
      return base44.entities.ProgressLog.create({
        ...data,
        client_id: clientProfile.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myProgressLogs']);
      setShowAddDialog(false);
      setEditingLog(null);
      setFormData({ date: format(new Date(), 'yyyy-MM-dd'), measurements: {} });
      alert(editingLog ? 'Progress updated successfully!' : 'Progress logged successfully!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProgressLog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['myProgressLogs']);
      alert('Progress entry deleted successfully!');
    },
  });

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (files.length > 3) {
      alert('You can upload maximum 3 photos');
      return;
    }

    setUploadingPhotos(true);
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const uploadResults = await Promise.all(uploadPromises);
      const photoUrls = uploadResults.map(result => result.file_url);
      
      setFormData({ 
        ...formData, 
        photos: [...(formData.photos || []), ...photoUrls] 
      });
    } catch (error) {
      console.error('Photo upload failed:', error);
      alert('Failed to upload photos. Please try again.');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const removePhoto = (index) => {
    const newPhotos = formData.photos.filter((_, i) => i !== index);
    setFormData({ ...formData, photos: newPhotos });
  };

  const handleSubmit = () => {
    if (!formData.weight) {
      alert('Please enter your weight');
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleEdit = (log) => {
    setEditingLog(log);
    setFormData({
      date: log.date,
      weight: log.weight,
      measurements: log.measurements || {},
      photos: log.photos || [],
      energy_level: log.energy_level,
      sleep_quality: log.sleep_quality,
      stress_level: log.stress_level,
      meal_adherence: log.meal_adherence,
      notes: log.notes,
    });
    setShowAddDialog(true);
  };

  const handleDelete = (log) => {
    if (window.confirm('Are you sure you want to delete this progress entry? This action cannot be undone.')) {
      deleteMutation.mutate(log.id);
    }
  };

  const handleDialogClose = () => {
    setShowAddDialog(false);
    setEditingLog(null);
    setFormData({ date: format(new Date(), 'yyyy-MM-dd'), measurements: {} });
  };

  // Permission checks
  const canEditProgress = securitySettings?.client_restrictions?.can_edit_progress ?? true;
  const canDeleteProgress = securitySettings?.client_restrictions?.can_delete_progress ?? false;

  const latestLog = progressLogs[progressLogs.length - 1];
  const initialWeight = clientProfile?.initial_weight || clientProfile?.weight;
  const currentWeight = latestLog?.weight || clientProfile?.weight;
  const targetWeight = clientProfile?.target_weight;
  const weightChange = initialWeight ? currentWeight - initialWeight : 0;

  // Prepare chart data
  const chartData = progressLogs.map(log => ({
    date: format(new Date(log.date), 'MMM d'),
    weight: log.weight,
  }));

  // Prepare measurements chart data
  const measurementData = progressLogs
    .filter(log => log.measurements && Object.keys(log.measurements).length > 0)
    .map(log => ({
      date: format(new Date(log.date), 'MMM d'),
      chest: log.measurements?.chest || null,
      waist: log.measurements?.waist || null,
      hips: log.measurements?.hips || null,
      arms: log.measurements?.arms || null,
    }));

  // Prepare wellness metrics chart data
  const wellnessData = progressLogs
    .filter(log => log.energy_level || log.sleep_quality || log.stress_level)
    .map(log => ({
      date: format(new Date(log.date), 'MMM d'),
      energy: log.energy_level || 0,
      sleep: log.sleep_quality || 0,
      stress: log.stress_level || 0,
    }));

  // Prepare adherence chart data
  const adherenceData = progressLogs
    .filter(log => log.meal_adherence !== null && log.meal_adherence !== undefined)
    .map(log => ({
      date: format(new Date(log.date), 'MMM d'),
      adherence: log.meal_adherence,
    }));

  // Get logs with photos for comparison
  const logsWithPhotos = progressLogs.filter(log => log.photos && log.photos.length > 0);

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
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Progress Tracking</h1>
            <p className="text-gray-600">Track your weight and measurements</p>
          </div>
          {canEditProgress && (
            <Dialog open={showAddDialog} onOpenChange={(open) => !open && handleDialogClose()}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-orange-500 to-red-500">
                  <Plus className="w-4 h-4 mr-2" />
                  Log Progress
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingLog ? 'Edit Progress' : 'Log Your Progress'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Weight (kg) *</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.weight || ''}
                      onChange={(e) => setFormData({...formData, weight: parseFloat(e.target.value)})}
                      placeholder="65.5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Body Measurements (optional)</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Neck (cm)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.measurements?.neck || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            measurements: {...formData.measurements, neck: parseFloat(e.target.value)}
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Chest (cm)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.measurements?.chest || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            measurements: {...formData.measurements, chest: parseFloat(e.target.value)}
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Upper Abdomen (2" above navel)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.measurements?.upper_abdomen || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            measurements: {...formData.measurements, upper_abdomen: parseFloat(e.target.value)}
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Middle Abdomen (at navel)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.measurements?.middle_abdomen || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            measurements: {...formData.measurements, middle_abdomen: parseFloat(e.target.value)}
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Lower Abdomen (2" below navel)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.measurements?.lower_abdomen || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            measurements: {...formData.measurements, lower_abdomen: parseFloat(e.target.value)}
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Hips (cm)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.measurements?.hips || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            measurements: {...formData.measurements, hips: parseFloat(e.target.value)}
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Left Arm (5" from shoulder)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.measurements?.left_arm || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            measurements: {...formData.measurements, left_arm: parseFloat(e.target.value)}
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Right Arm (5" from shoulder)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.measurements?.right_arm || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            measurements: {...formData.measurements, right_arm: parseFloat(e.target.value)}
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Left Leg (8" from waist)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.measurements?.left_leg || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            measurements: {...formData.measurements, left_leg: parseFloat(e.target.value)}
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Right Leg (8" from waist)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.measurements?.right_leg || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            measurements: {...formData.measurements, right_leg: parseFloat(e.target.value)}
                          })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Energy Level (1-5)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        value={formData.energy_level || ''}
                        onChange={(e) => setFormData({...formData, energy_level: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sleep Quality (1-5)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        value={formData.sleep_quality || ''}
                        onChange={(e) => setFormData({...formData, sleep_quality: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Stress Level (1-5)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        value={formData.stress_level || ''}
                        onChange={(e) => setFormData({...formData, stress_level: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Meal Plan Adherence (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.meal_adherence || ''}
                      onChange={(e) => setFormData({...formData, meal_adherence: parseInt(e.target.value)})}
                      placeholder="80"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      placeholder="How are you feeling? Any challenges?"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Upload Progress Photos (Front & Side view recommended)</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-orange-500 transition-colors">
                      <div className="text-center">
                        <Camera className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoUpload}
                          disabled={uploadingPhotos}
                          className="hidden"
                          id="progress-photo-upload"
                        />
                        <label
                          htmlFor="progress-photo-upload"
                          className={`cursor-pointer text-sm text-gray-600 hover:text-orange-600 ${uploadingPhotos ? 'opacity-50' : ''}`}
                        >
                          {uploadingPhotos ? 'Uploading...' : 'Click to upload photos (max 3)'}
                        </label>
                        {formData.photos && formData.photos.length > 0 && (
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            {formData.photos.map((photo, index) => (
                              <div key={index} className="relative">
                                <img
                                  src={photo}
                                  alt={`Progress ${index + 1}`}
                                  className="w-full h-24 object-cover rounded-lg"
                                />
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-1 right-1 h-6 w-6 p-0"
                                  onClick={() => removePhoto(index)}
                                >
                                  ×
                                </Button>
                              </div>
                            ))}
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
                      disabled={saveMutation.isPending || uploadingPhotos}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-red-500"
                    >
                      {saveMutation.isPending ? 'Saving...' : editingLog ? 'Update Progress' : 'Save Progress'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Starting Weight</p>
                  <p className="text-3xl font-bold text-blue-600">{initialWeight}</p>
                  <p className="text-xs text-gray-500">kg</p>
                </div>
                <Scale className="w-12 h-12 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Current Weight</p>
                  <p className="text-3xl font-bold text-green-600">{currentWeight}</p>
                  <p className="text-xs text-gray-500">kg</p>
                </div>
                <TrendingDown className="w-12 h-12 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Target Weight</p>
                  <p className="text-3xl font-bold text-purple-600">{targetWeight || '-'}</p>
                  <p className="text-xs text-gray-500">kg</p>
                </div>
                <Calendar className="w-12 h-12 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Weight Change</p>
                  <p className={`text-3xl font-bold ${weightChange < 0 ? 'text-green-600' : 'text-orange-600'}`}>
                    {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500">kg</p>
                </div>
                {weightChange < 0 ? (
                  <TrendingDown className="w-12 h-12 text-green-500" />
                ) : (
                  <TrendingUp className="w-12 h-12 text-orange-500" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Charts Tabs */}
        <Tabs defaultValue="weight" className="space-y-6">
          <TabsList className="grid grid-cols-5 bg-white/80 backdrop-blur">
            <TabsTrigger value="weight">
              <Scale className="w-4 h-4 mr-2" />
              Weight
            </TabsTrigger>
            <TabsTrigger value="measurements">
              <Ruler className="w-4 h-4 mr-2" />
              Measurements
            </TabsTrigger>
            <TabsTrigger value="wellness">
              <Activity className="w-4 h-4 mr-2" />
              Wellness
            </TabsTrigger>
            <TabsTrigger value="adherence">
              <Calendar className="w-4 h-4 mr-2" />
              Adherence
            </TabsTrigger>
            <TabsTrigger value="photos">
              <Camera className="w-4 h-4 mr-2" />
              Photos
            </TabsTrigger>
          </TabsList>

          {/* Weight Chart */}
          <TabsContent value="weight">
            {chartData.length > 0 ? (
              <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
                <CardHeader>
                  <CardTitle>Weight Trend Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={['dataMin - 2', 'dataMax + 2']} />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="weight" 
                        stroke="#f97316" 
                        strokeWidth={3}
                        dot={{ fill: '#f97316', r: 6 }}
                        name="Weight (kg)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <Scale className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600">No weight data logged yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Measurements Chart */}
          <TabsContent value="measurements">
            {measurementData.length > 0 ? (
              <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
                <CardHeader>
                  <CardTitle>Body Measurements Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={measurementData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="chest" stroke="#3b82f6" strokeWidth={2} name="Chest (cm)" />
                      <Line type="monotone" dataKey="waist" stroke="#f97316" strokeWidth={2} name="Waist (cm)" />
                      <Line type="monotone" dataKey="hips" stroke="#10b981" strokeWidth={2} name="Hips (cm)" />
                      <Line type="monotone" dataKey="arms" stroke="#8b5cf6" strokeWidth={2} name="Arms (cm)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <Ruler className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600">No measurements logged yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Wellness Metrics Chart */}
          <TabsContent value="wellness">
            {wellnessData.length > 0 ? (
              <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
                <CardHeader>
                  <CardTitle>Wellness Metrics Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={wellnessData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 5]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="energy" fill="#10b981" name="Energy Level" />
                      <Bar dataKey="sleep" fill="#3b82f6" name="Sleep Quality" />
                      <Bar dataKey="stress" fill="#ef4444" name="Stress Level" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <Activity className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600">No wellness data logged yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Adherence Chart */}
          <TabsContent value="adherence">
            {adherenceData.length > 0 ? (
              <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
                <CardHeader>
                  <CardTitle>Meal Plan Adherence Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={adherenceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="adherence" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        dot={{ fill: '#10b981', r: 6 }}
                        name="Adherence (%)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600">No adherence data logged yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Progress Photos */}
          <TabsContent value="photos">
            {logsWithPhotos.length > 0 ? (
              <div className="space-y-6">
                {/* Side-by-side comparison */}
                {logsWithPhotos.length >= 2 && (
                  <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ImageIcon className="w-6 h-6 text-purple-600" />
                        Before & After Comparison
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-6">
                        {/* First photo */}
                        <div className="space-y-3">
                          <Badge className="bg-blue-500 text-white">
                            Before - {format(new Date(logsWithPhotos[0].date), 'MMM d, yyyy')}
                          </Badge>
                          <div className="grid grid-cols-1 gap-3">
                            {logsWithPhotos[0].photos.slice(0, 2).map((photo, idx) => (
                              <img
                                key={idx}
                                src={photo}
                                alt={`Before ${idx + 1}`}
                                className="w-full rounded-lg shadow-lg object-cover aspect-square border-4 border-blue-300"
                              />
                            ))}
                          </div>
                          <div className="text-center p-3 bg-white rounded-lg">
                            <p className="text-sm text-gray-600">Starting Weight</p>
                            <p className="text-2xl font-bold text-blue-600">{logsWithPhotos[0].weight} kg</p>
                          </div>
                        </div>

                        {/* Latest photo */}
                        <div className="space-y-3">
                          <Badge className="bg-green-500 text-white">
                            After - {format(new Date(logsWithPhotos[logsWithPhotos.length - 1].date), 'MMM d, yyyy')}
                          </Badge>
                          <div className="grid grid-cols-1 gap-3">
                            {logsWithPhotos[logsWithPhotos.length - 1].photos.slice(0, 2).map((photo, idx) => (
                              <img
                                key={idx}
                                src={photo}
                                alt={`After ${idx + 1}`}
                                className="w-full rounded-lg shadow-lg object-cover aspect-square border-4 border-green-300"
                              />
                            ))}
                          </div>
                          <div className="text-center p-3 bg-white rounded-lg">
                            <p className="text-sm text-gray-600">Current Weight</p>
                            <p className="text-2xl font-bold text-green-600">{logsWithPhotos[logsWithPhotos.length - 1].weight} kg</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Stats */}
                      <div className="mt-6 p-4 bg-white rounded-lg border-2 border-purple-200">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-sm text-gray-600">Weight Change</p>
                            <p className={`text-2xl font-bold ${logsWithPhotos[logsWithPhotos.length - 1].weight - logsWithPhotos[0].weight < 0 ? 'text-green-600' : 'text-orange-600'}`}>
                              {(logsWithPhotos[logsWithPhotos.length - 1].weight - logsWithPhotos[0].weight).toFixed(1)} kg
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Days Tracked</p>
                            <p className="text-2xl font-bold text-purple-600">
                              {Math.floor((new Date(logsWithPhotos[logsWithPhotos.length - 1].date) - new Date(logsWithPhotos[0].date)) / (1000 * 60 * 60 * 24))}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total Photos</p>
                            <p className="text-2xl font-bold text-pink-600">
                              {logsWithPhotos.reduce((sum, log) => sum + (log.photos?.length || 0), 0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* All photo timeline */}
                <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
                  <CardHeader>
                    <CardTitle>Progress Photo Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {logsWithPhotos.map((log) => (
                        log.photos.map((photo, idx) => (
                          <div key={`${log.id}-${idx}`} className="space-y-2">
                            <img
                              src={photo}
                              alt={`Progress ${format(new Date(log.date), 'MMM d')}`}
                              className="w-full rounded-lg shadow-lg object-cover aspect-square border-2 border-gray-200 hover:border-orange-400 transition-all cursor-pointer"
                              onClick={() => window.open(photo, '_blank')}
                            />
                            <div className="text-center">
                              <p className="text-xs text-gray-600">{format(new Date(log.date), 'MMM d, yyyy')}</p>
                              <p className="text-sm font-semibold text-gray-900">{log.weight} kg</p>
                            </div>
                          </div>
                        ))
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <Camera className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Progress Photos</h3>
                  <p className="text-gray-600 mb-4">Start capturing your transformation!</p>
                  <p className="text-sm text-gray-500">Upload photos when logging your progress to track visual changes over time</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Progress Logs */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Progress History</CardTitle>
          </CardHeader>
          <CardContent>
            {progressLogs.length === 0 ? (
              <div className="text-center py-12">
                <Scale className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Progress Logged Yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Start tracking your weight and measurements
                </p>
                {canEditProgress && (
                  <Button
                    onClick={() => setShowAddDialog(true)}
                    className="bg-gradient-to-r from-orange-500 to-red-500"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Log Your First Progress
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {progressLogs.slice().reverse().map((log) => (
                  <div key={log.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {format(new Date(log.date), 'MMMM d, yyyy')}
                        </p>
                        <p className="text-sm text-gray-600">
                          Weight: <span className="font-medium text-green-600">{log.weight} kg</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {log.meal_adherence && (
                          <Badge className="bg-blue-500 text-white">
                            {log.meal_adherence}% Adherence
                          </Badge>
                        )}
                        {canEditProgress && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(log)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {canDeleteProgress && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(log)}
                            disabled={deleteMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {log.measurements && Object.keys(log.measurements).length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3 text-xs">
                        {log.measurements.neck && (
                          <div><span className="text-gray-600">Neck:</span> <span className="font-medium">{log.measurements.neck}cm</span></div>
                        )}
                        {log.measurements.chest && (
                          <div><span className="text-gray-600">Chest:</span> <span className="font-medium">{log.measurements.chest}cm</span></div>
                        )}
                        {log.measurements.upper_abdomen && (
                          <div><span className="text-gray-600">Upper Abd:</span> <span className="font-medium">{log.measurements.upper_abdomen}cm</span></div>
                        )}
                        {log.measurements.middle_abdomen && (
                          <div><span className="text-gray-600">Mid Abd:</span> <span className="font-medium">{log.measurements.middle_abdomen}cm</span></div>
                        )}
                        {log.measurements.lower_abdomen && (
                          <div><span className="text-gray-600">Lower Abd:</span> <span className="font-medium">{log.measurements.lower_abdomen}cm</span></div>
                        )}
                        {log.measurements.hips && (
                          <div><span className="text-gray-600">Hips:</span> <span className="font-medium">{log.measurements.hips}cm</span></div>
                        )}
                        {log.measurements.left_arm && (
                          <div><span className="text-gray-600">L Arm:</span> <span className="font-medium">{log.measurements.left_arm}cm</span></div>
                        )}
                        {log.measurements.right_arm && (
                          <div><span className="text-gray-600">R Arm:</span> <span className="font-medium">{log.measurements.right_arm}cm</span></div>
                        )}
                        {log.measurements.left_leg && (
                          <div><span className="text-gray-600">L Leg:</span> <span className="font-medium">{log.measurements.left_leg}cm</span></div>
                        )}
                        {log.measurements.right_leg && (
                          <div><span className="text-gray-600">R Leg:</span> <span className="font-medium">{log.measurements.right_leg}cm</span></div>
                        )}
                      </div>
                    )}

                    {log.photos && log.photos.length > 0 && (
                      <div className="mb-3">
                        <div className="flex gap-2 flex-wrap">
                          {log.photos.map((photo, idx) => (
                            <img
                              key={idx}
                              src={photo}
                              alt={`Progress ${idx + 1}`}
                              className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80"
                              onClick={() => window.open(photo, '_blank')}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {(log.energy_level || log.sleep_quality || log.stress_level) && (
                      <div className="flex gap-4 mb-3">
                        {log.energy_level && (
                          <div className="text-sm">
                            <span className="text-gray-600">Energy:</span>
                            <span className="ml-1 font-medium">{log.energy_level}/5 ⚡</span>
                          </div>
                        )}
                        {log.sleep_quality && (
                          <div className="text-sm">
                            <span className="text-gray-600">Sleep:</span>
                            <span className="ml-1 font-medium">{log.sleep_quality}/5 😴</span>
                          </div>
                        )}
                        {log.stress_level && (
                          <div className="text-sm">
                            <span className="text-gray-600">Stress:</span>
                            <span className="ml-1 font-medium">{log.stress_level}/5 😰</span>
                          </div>
                        )}
                      </div>
                    )}

                    {log.notes && (
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                        {log.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}