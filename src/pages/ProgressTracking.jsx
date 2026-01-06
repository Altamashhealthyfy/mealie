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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { TrendingUp, TrendingDown, Plus, Scale, Calendar, Edit, Trash2, Camera, Ruler, Activity, Target, Smile, Zap, Moon, CloudRain, Droplets, Dumbbell } from "lucide-react";
import { format } from "date-fns";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import GoalCard from "../components/progress/GoalCard";
import WellnessCharts from "../components/progress/WellnessCharts";

export default function ProgressTracking() {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    measurements: {},
    wellness_metrics: {},
    photos: {}
  });
  const [goalData, setGoalData] = useState({
    goal_type: 'weight',
    status: 'active',
    priority: 'medium',
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
      const clients = await base44.entities.Client.filter({ email: user.email });
      if (clients.length > 0) return clients[0];
      const allClients = await base44.entities.Client.list();
      return allClients.find(c => c.email?.toLowerCase() === user.email?.toLowerCase()) || null;
    },
    enabled: !!user,
  });

  const { data: progressLogs } = useQuery({
    queryKey: ['myProgressLogs', clientProfile?.id],
    queryFn: async () => {
      const logs = await base44.entities.ProgressLog.filter({ client_id: clientProfile?.id });
      return logs.sort((a, b) => new Date(a.date) - new Date(b.date));
    },
    enabled: !!clientProfile,
    initialData: [],
  });

  const { data: goals } = useQuery({
    queryKey: ['myProgressGoals', clientProfile?.id],
    queryFn: async () => {
      const allGoals = await base44.entities.ProgressGoal.filter({ client_id: clientProfile?.id });
      return allGoals.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!clientProfile,
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingLog) {
        return base44.entities.ProgressLog.update(editingLog.id, data);
      }
      return base44.entities.ProgressLog.create({ ...data, client_id: clientProfile.id });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(['myProgressLogs']);
      
      // Auto-update goal current values based on latest log
      if (goals.length > 0 && !editingLog) {
        const latestWeight = formData.weight;
        const weightGoals = goals.filter(g => g.goal_type === 'weight' && g.status === 'active');
        
        for (const goal of weightGoals) {
          await base44.entities.ProgressGoal.update(goal.id, { current_value: latestWeight });
        }
        await queryClient.invalidateQueries(['myProgressGoals']);
      }
      
      setShowAddDialog(false);
      setEditingLog(null);
      setFormData({ date: format(new Date(), 'yyyy-MM-dd'), measurements: {}, wellness_metrics: {}, photos: {} });
      alert(editingLog ? 'Progress updated!' : 'Progress logged!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProgressLog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['myProgressLogs']);
      alert('Progress entry deleted!');
    },
  });

  const saveGoalMutation = useMutation({
    mutationFn: (data) => {
      if (editingGoal) {
        return base44.entities.ProgressGoal.update(editingGoal.id, data);
      }
      return base44.entities.ProgressGoal.create({ ...data, client_id: clientProfile.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myProgressGoals']);
      setShowGoalDialog(false);
      setEditingGoal(null);
      setGoalData({ goal_type: 'weight', status: 'active', priority: 'medium' });
      alert(editingGoal ? 'Goal updated!' : 'Goal created!');
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (id) => base44.entities.ProgressGoal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['myProgressGoals']);
      alert('Goal deleted!');
    },
  });

  const handlePhotoUpload = async (e, photoType) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPhotos(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ 
        ...formData, 
        photos: { ...formData.photos, [photoType]: file_url }
      });
    } catch (error) {
      alert('Failed to upload photo');
    } finally {
      setUploadingPhotos(false);
    }
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
      wellness_metrics: log.wellness_metrics || {},
      photos: log.photos || {},
      meal_adherence: log.meal_adherence,
      notes: log.notes,
      symptoms: log.symptoms || [],
    });
    setShowAddDialog(true);
  };

  const handleEditGoal = (goal) => {
    setEditingGoal(goal);
    setGoalData({
      goal_type: goal.goal_type,
      title: goal.title,
      description: goal.description,
      target_value: goal.target_value,
      current_value: goal.current_value,
      start_value: goal.start_value,
      unit: goal.unit,
      target_date: goal.target_date,
      status: goal.status,
      priority: goal.priority,
      notes: goal.notes,
    });
    setShowGoalDialog(true);
  };

  const handleDeleteGoal = (goalId) => {
    if (window.confirm('Delete this goal?')) {
      deleteGoalMutation.mutate(goalId);
    }
  };

  const handleDelete = (log) => {
    if (window.confirm('Delete this progress entry?')) {
      deleteMutation.mutate(log.id);
    }
  };

  const canEditProgress = securitySettings?.client_restrictions?.can_edit_progress ?? true;
  const canDeleteProgress = securitySettings?.client_restrictions?.can_delete_progress ?? false;

  const latestLog = progressLogs[progressLogs.length - 1];
  const initialWeight = clientProfile?.initial_weight || clientProfile?.weight;
  const currentWeight = latestLog?.weight || clientProfile?.weight;
  const targetWeight = clientProfile?.target_weight;
  const weightChange = initialWeight ? currentWeight - initialWeight : 0;

  const chartData = progressLogs.map(log => ({
    date: format(new Date(log.date), 'MMM d'),
    weight: log.weight,
  }));

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  if (!clientProfile) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader><CardTitle>No Client Profile</CardTitle></CardHeader>
          <CardContent><p className="text-gray-600">Your dietitian needs to create your profile first.</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Progress Tracking</h1>
            <p className="text-gray-600">Track your transformation journey with detailed metrics</p>
          </div>
          <div className="flex gap-3">
            {canEditProgress && (
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-gradient-to-r from-orange-500 to-red-500"
                    onClick={() => {
                      setEditingLog(null);
                      setFormData({
                        date: format(new Date(), 'yyyy-MM-dd'),
                        measurements: {},
                        wellness_metrics: {},
                        photos: {}
                      });
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Log Progress
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingLog ? 'Edit Progress' : 'Log Your Progress'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                    </div>

                    <div className="space-y-2">
                      <Label>Weight (kg) *</Label>
                      <Input type="number" step="0.1" value={formData.weight || ''} 
                        onChange={(e) => setFormData({...formData, weight: parseFloat(e.target.value)})} placeholder="65.5" />
                    </div>

                    {/* Wellness Metrics */}
                    <div className="space-y-3 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Smile className="w-5 h-5 text-purple-600" />
                        Wellness Metrics
                      </h3>

                      <div className="space-y-2">
                        <Label>Mood</Label>
                        <Select value={formData.wellness_metrics?.mood || ''} 
                          onValueChange={(value) => setFormData({...formData, wellness_metrics: {...formData.wellness_metrics, mood: value}})}>
                          <SelectTrigger><SelectValue placeholder="How do you feel?" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="excellent">😄 Excellent</SelectItem>
                            <SelectItem value="good">😊 Good</SelectItem>
                            <SelectItem value="neutral">😐 Neutral</SelectItem>
                            <SelectItem value="poor">😕 Poor</SelectItem>
                            <SelectItem value="very_poor">😢 Very Poor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-500" />
                            Energy Level (1-10)
                          </Label>
                          <Input type="number" min="1" max="10" value={formData.wellness_metrics?.energy_level || ''}
                            onChange={(e) => setFormData({...formData, wellness_metrics: {...formData.wellness_metrics, energy_level: parseInt(e.target.value)}})} />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Moon className="w-4 h-4 text-indigo-500" />
                            Sleep Quality (1-10)
                          </Label>
                          <Input type="number" min="1" max="10" value={formData.wellness_metrics?.sleep_quality || ''}
                            onChange={(e) => setFormData({...formData, wellness_metrics: {...formData.wellness_metrics, sleep_quality: parseInt(e.target.value)}})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Sleep Hours</Label>
                          <Input type="number" step="0.5" value={formData.wellness_metrics?.sleep_hours || ''}
                            onChange={(e) => setFormData({...formData, wellness_metrics: {...formData.wellness_metrics, sleep_hours: parseFloat(e.target.value)}})} />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <CloudRain className="w-4 h-4 text-red-500" />
                            Stress Level (1-10)
                          </Label>
                          <Input type="number" min="1" max="10" value={formData.wellness_metrics?.stress_level || ''}
                            onChange={(e) => setFormData({...formData, wellness_metrics: {...formData.wellness_metrics, stress_level: parseInt(e.target.value)}})} />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Droplets className="w-4 h-4 text-blue-500" />
                            Water Intake (liters)
                          </Label>
                          <Input type="number" step="0.5" value={formData.wellness_metrics?.water_intake || ''}
                            onChange={(e) => setFormData({...formData, wellness_metrics: {...formData.wellness_metrics, water_intake: parseFloat(e.target.value)}})} />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Dumbbell className="w-4 h-4 text-green-500" />
                            Exercise (minutes)
                          </Label>
                          <Input type="number" value={formData.wellness_metrics?.exercise_minutes || ''}
                            onChange={(e) => setFormData({...formData, wellness_metrics: {...formData.wellness_metrics, exercise_minutes: parseInt(e.target.value)}})} />
                        </div>
                      </div>
                    </div>

                    {/* Body Measurements */}
                    <div className="space-y-3 p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Ruler className="w-5 h-5 text-orange-600" />
                        Body Measurements (cm)
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <Input placeholder="Neck" type="number" step="0.1" value={formData.measurements?.neck || ''}
                          onChange={(e) => setFormData({...formData, measurements: {...formData.measurements, neck: parseFloat(e.target.value)}})} />
                        <Input placeholder="Chest" type="number" step="0.1" value={formData.measurements?.chest || ''}
                          onChange={(e) => setFormData({...formData, measurements: {...formData.measurements, chest: parseFloat(e.target.value)}})} />
                        <Input placeholder="Upper Abdomen" type="number" step="0.1" value={formData.measurements?.upper_abdomen || ''}
                          onChange={(e) => setFormData({...formData, measurements: {...formData.measurements, upper_abdomen: parseFloat(e.target.value)}})} />
                        <Input placeholder="Abdomen (navel)" type="number" step="0.1" value={formData.measurements?.abdomen || ''}
                          onChange={(e) => setFormData({...formData, measurements: {...formData.measurements, abdomen: parseFloat(e.target.value)}})} />
                        <Input placeholder="Lower Abdomen" type="number" step="0.1" value={formData.measurements?.lower_abdomen || ''}
                          onChange={(e) => setFormData({...formData, measurements: {...formData.measurements, lower_abdomen: parseFloat(e.target.value)}})} />
                        <Input placeholder="Hips" type="number" step="0.1" value={formData.measurements?.hips || ''}
                          onChange={(e) => setFormData({...formData, measurements: {...formData.measurements, hips: parseFloat(e.target.value)}})} />
                        <Input placeholder="Arms" type="number" step="0.1" value={formData.measurements?.arms || ''}
                          onChange={(e) => setFormData({...formData, measurements: {...formData.measurements, arms: parseFloat(e.target.value)}})} />
                        <Input placeholder="Thighs" type="number" step="0.1" value={formData.measurements?.thighs || ''}
                          onChange={(e) => setFormData({...formData, measurements: {...formData.measurements, thighs: parseFloat(e.target.value)}})} />
                      </div>
                    </div>

                    {/* Progress Photos */}
                    <div className="space-y-3">
                      <Label>Progress Photos</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {['front', 'side', 'back'].map(type => (
                          <div key={type} className="space-y-2">
                            <Label className="text-sm capitalize">{type} View</Label>
                            <div className="border-2 border-dashed rounded-lg p-3 text-center">
                              {formData.photos?.[type] ? (
                                <div className="relative">
                                  <img src={formData.photos[type]} alt={type} className="w-full h-32 object-cover rounded" />
                                  <Button variant="destructive" size="sm" className="absolute top-1 right-1"
                                    onClick={() => setFormData({...formData, photos: {...formData.photos, [type]: null}})}>×</Button>
                                </div>
                              ) : (
                                <>
                                  <Camera className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                                  <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, type)}
                                    disabled={uploadingPhotos} className="hidden" id={`photo-${type}`} />
                                  <label htmlFor={`photo-${type}`} className="text-xs cursor-pointer text-blue-600 hover:underline">
                                    {uploadingPhotos ? 'Uploading...' : 'Upload'}
                                  </label>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Meal Adherence (%)</Label>
                      <Input type="number" min="0" max="100" value={formData.meal_adherence || ''}
                        onChange={(e) => setFormData({...formData, meal_adherence: parseInt(e.target.value)})} placeholder="80" />
                    </div>

                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea value={formData.notes || ''} onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        placeholder="How are you feeling? Any challenges?" rows={3} />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1">Cancel</Button>
                      <Button onClick={handleSubmit} disabled={saveMutation.isPending || uploadingPhotos}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-red-500">
                        {saveMutation.isPending ? 'Saving...' : editingLog ? 'Update' : 'Save Progress'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            
            <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-2 border-purple-500 text-purple-600 hover:bg-purple-50">
                  <Target className="w-4 h-4 mr-2" />
                  Set Goal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingGoal ? 'Edit Goal' : 'Set New Goal'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Goal Type</Label>
                    <Select value={goalData.goal_type} onValueChange={(value) => setGoalData({...goalData, goal_type: value})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weight">Weight Goal</SelectItem>
                        <SelectItem value="body_measurement">Body Measurement</SelectItem>
                        <SelectItem value="wellness">Wellness Metric</SelectItem>
                        <SelectItem value="habit">Habit/Behavior</SelectItem>
                        <SelectItem value="custom">Custom Goal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Goal Title</Label>
                    <Input value={goalData.title || ''} onChange={(e) => setGoalData({...goalData, title: e.target.value})}
                      placeholder="e.g., Lose 5kg, Reduce waist by 5cm" />
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={goalData.description || ''} onChange={(e) => setGoalData({...goalData, description: e.target.value})}
                      placeholder="Why is this goal important?" rows={2} />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Start Value</Label>
                      <Input type="number" step="0.1" value={goalData.start_value || ''}
                        onChange={(e) => setGoalData({...goalData, start_value: parseFloat(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Current</Label>
                      <Input type="number" step="0.1" value={goalData.current_value || ''}
                        onChange={(e) => setGoalData({...goalData, current_value: parseFloat(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Target *</Label>
                      <Input type="number" step="0.1" value={goalData.target_value || ''}
                        onChange={(e) => setGoalData({...goalData, target_value: parseFloat(e.target.value)})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Unit</Label>
                      <Input value={goalData.unit || ''} onChange={(e) => setGoalData({...goalData, unit: e.target.value})}
                        placeholder="kg, cm, days" />
                    </div>
                    <div className="space-y-2">
                      <Label>Target Date</Label>
                      <Input type="date" value={goalData.target_date || ''}
                        onChange={(e) => setGoalData({...goalData, target_date: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={goalData.priority} onValueChange={(value) => setGoalData({...goalData, priority: value})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={goalData.status} onValueChange={(value) => setGoalData({...goalData, status: value})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="paused">Paused</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={() => setShowGoalDialog(false)} className="flex-1">Cancel</Button>
                    <Button onClick={() => saveGoalMutation.mutate(goalData)} disabled={saveGoalMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500">
                      {saveGoalMutation.isPending ? 'Saving...' : editingGoal ? 'Update' : 'Create Goal'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <Target className="w-12 h-12 text-purple-500" />
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
                {weightChange < 0 ? <TrendingDown className="w-12 h-12 text-green-500" /> : <TrendingUp className="w-12 h-12 text-orange-500" />}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Goals Section */}
        {(activeGoals.length > 0 || completedGoals.length > 0) && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Target className="w-6 h-6 text-purple-600" />
              My Goals
            </h2>
            
            {activeGoals.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeGoals.map(goal => (
                  <GoalCard key={goal.id} goal={goal} onEdit={handleEditGoal} onDelete={handleDeleteGoal} />
                ))}
              </div>
            )}

            {completedGoals.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Completed Goals 🎉</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedGoals.map(goal => (
                    <GoalCard key={goal.id} goal={goal} onEdit={handleEditGoal} onDelete={handleDeleteGoal} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Charts Tabs */}
        <Tabs defaultValue="weight" className="space-y-6">
          <TabsList className="grid grid-cols-3 bg-white/80 backdrop-blur">
            <TabsTrigger value="weight"><Scale className="w-4 h-4 mr-2" />Weight</TabsTrigger>
            <TabsTrigger value="wellness"><Activity className="w-4 h-4 mr-2" />Wellness</TabsTrigger>
            <TabsTrigger value="history"><Calendar className="w-4 h-4 mr-2" />History</TabsTrigger>
          </TabsList>

          <TabsContent value="weight">
            {chartData.length > 0 ? (
              <Card className="border-none shadow-lg">
                <CardHeader><CardTitle>Weight Progress</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={['dataMin - 2', 'dataMax + 2']} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="weight" stroke="#f97316" strokeWidth={3}
                        dot={{ fill: '#f97316', r: 6 }} name="Weight (kg)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <Card><CardContent className="p-12 text-center">
                <Scale className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">No weight data yet</p>
              </CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="wellness">
            {progressLogs.length > 0 ? (
              <WellnessCharts progressLogs={progressLogs} />
            ) : (
              <Card><CardContent className="p-12 text-center">
                <Activity className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">No wellness data yet</p>
              </CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="history">
            <Card className="border-none shadow-lg">
              <CardHeader><CardTitle>Progress History</CardTitle></CardHeader>
              <CardContent>
                {progressLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <Scale className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-600">No progress logged yet</p>
                    {canEditProgress && (
                      <Button onClick={() => setShowAddDialog(true)} className="mt-4 bg-gradient-to-r from-orange-500 to-red-500">
                        <Plus className="w-4 h-4 mr-2" />Log Your First Progress
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {progressLogs.slice().reverse().map((log) => (
                      <div key={log.id} className="p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold">{format(new Date(log.date), 'MMMM d, yyyy')}</p>
                            <p className="text-sm text-gray-600">Weight: <span className="font-medium text-green-600">{log.weight} kg</span></p>
                          </div>
                          <div className="flex gap-2">
                            {log.wellness_metrics?.mood && (
                              <Badge variant="outline">{log.wellness_metrics.mood}</Badge>
                            )}
                            {canEditProgress && (
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(log)}>
                                <Edit className="w-4 h-4 text-blue-600" />
                              </Button>
                            )}
                            {canDeleteProgress && (
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(log)}>
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {log.wellness_metrics && (
                          <div className="flex gap-4 text-sm mb-2">
                            {log.wellness_metrics.energy_level && <span>⚡ Energy: {log.wellness_metrics.energy_level}/10</span>}
                            {log.wellness_metrics.sleep_quality && <span>😴 Sleep: {log.wellness_metrics.sleep_quality}/10</span>}
                            {log.wellness_metrics.stress_level && <span>😰 Stress: {log.wellness_metrics.stress_level}/10</span>}
                          </div>
                        )}

                        {log.notes && <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{log.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}