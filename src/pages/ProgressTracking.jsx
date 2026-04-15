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
import { TrendingUp, TrendingDown, Plus, Scale, Calendar, Edit, Trash2, Camera, Ruler, Activity, Target, Smile, Zap, Moon, CloudRain, Droplets, Dumbbell, Heart, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import GoalCard from "../components/progress/GoalCard";
import { logAction } from "@/lib/logAction";
import WellnessCharts from "../components/progress/WellnessCharts";
import AdvancedAnalyticsDashboard from "../components/progress/AdvancedAnalyticsDashboard";
import DailyProgressLogger from "../components/progress/DailyProgressLogger";
import MacroAdherenceDashboard from "../components/progress/MacroAdherenceDashboard";
import EnhancedHealthLogger from "../components/health/EnhancedHealthLogger";
import HealthTrendsVisualization from "../components/health/HealthTrendsVisualization";

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
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: securitySettings } = useQuery({
    queryKey: ['securitySettings'],
    queryFn: async () => {
      const settings = await base44.entities.AppSecuritySettings.list();
      return settings[0] || null;
    },
    enabled: !!user,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
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
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: progressLogs } = useQuery({
    queryKey: ['myProgressLogs', clientProfile?.id],
    queryFn: async () => {
      const logs = await base44.entities.ProgressLog.filter({ client_id: clientProfile?.id });
      return logs.sort((a, b) => new Date(a.date) - new Date(b.date));
    },
    enabled: !!clientProfile,
    initialData: [],
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: goals } = useQuery({
    queryKey: ['myProgressGoals', clientProfile?.id],
    queryFn: async () => {
      const allGoals = await base44.entities.ProgressGoal.filter({ client_id: clientProfile?.id });
      return allGoals.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!clientProfile,
    initialData: [],
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: foodLogs } = useQuery({
    queryKey: ['myFoodLogs', clientProfile?.id],
    queryFn: async () => {
      const logs = await base44.entities.FoodLog.filter({ client_id: clientProfile?.id });
      return logs.sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    enabled: !!clientProfile,
    initialData: [],
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: mpessLogs } = useQuery({
    queryKey: ['myMPESSLogs', user?.email],
    queryFn: async () => {
      const logs = await base44.entities.MPESSTracker.filter({ created_by: user?.email });
      return logs.sort((a, b) => new Date(a.date) - new Date(b.date));
    },
    enabled: !!user,
    initialData: [],
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingLog) {
        return base44.entities.ProgressLog.update(editingLog.id, data);
      }
      return base44.entities.ProgressLog.create({ ...data, client_id: clientProfile.id });
    },
    onSuccess: async () => {
      logAction({ action: "submit_progress", status: "success", pageSection: "ProgressLog", userEmail: user?.email, userType: "client", metadata: { client_id: clientProfile?.id, weight: formData.weight, is_edit: !!editingLog } });
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
    onError: (err) => {
      logAction({ action: "submit_progress", status: "error", pageSection: "ProgressLog", userEmail: user?.email, userType: "client", errorMessage: err.message });
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

  const chartData = progressLogs
    .filter(log => log.date)
    .map(log => ({
      date: format(new Date(log.date), 'MMM d'),
      weight: log.weight,
    }));

  // Symptom check-ins (from SymptomCheckIn page, type=symptom_checkin)
  const { data: symptomLogs } = useQuery({
    queryKey: ['mySymptomCheckIns', clientProfile?.id],
    queryFn: async () => {
      const logs = await base44.entities.ProgressLog.filter({ client_id: clientProfile?.id, log_type: 'symptom_checkin' });
      return logs.sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    enabled: !!clientProfile?.id,
    initialData: [],
    staleTime: 30000,
  });

  const { data: mealPlan } = useQuery({
    queryKey: ['activeMealPlan', clientProfile?.id],
    queryFn: async () => {
      const plans = await base44.entities.MealPlan.filter({ 
        client_id: clientProfile?.id,
        active: true 
      });
      return plans[0] || null;
    },
    enabled: !!clientProfile?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

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
    <div className="min-h-screen p-3 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">Progress Tracking</h1>
            <p className="text-sm sm:text-base text-gray-600">Track your transformation journey with detailed metrics</p>
          </div>
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            {canEditProgress && (
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-gradient-to-r from-orange-500 to-red-500 flex-1 sm:flex-none"
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
                    <span className="hidden sm:inline">Log Progress</span>
                    <span className="sm:hidden">Log</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
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

                    {/* Enhanced Health Logger */}
                    <EnhancedHealthLogger 
                      formData={formData}
                      setFormData={setFormData}
                      clientProfile={clientProfile}
                    />

                    {/* Body Measurements */}
                    <div className="space-y-3 p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Ruler className="w-5 h-5 text-orange-600" />
                        Body Measurements (cm)
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        <Input placeholder="Left Arm" type="number" step="0.1" value={formData.measurements?.left_arm || ''}
                          onChange={(e) => setFormData({...formData, measurements: {...formData.measurements, left_arm: parseFloat(e.target.value)}})} />
                        <Input placeholder="Right Arm" type="number" step="0.1" value={formData.measurements?.right_arm || ''}
                          onChange={(e) => setFormData({...formData, measurements: {...formData.measurements, right_arm: parseFloat(e.target.value)}})} />
                        <Input placeholder="Thighs" type="number" step="0.1" value={formData.measurements?.thighs || ''}
                          onChange={(e) => setFormData({...formData, measurements: {...formData.measurements, thighs: parseFloat(e.target.value)}})} />
                      </div>
                    </div>

                    {/* Progress Photos */}
                    <div className="space-y-3">
                      <Label>Progress Photos</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                <Button variant="outline" className="border-2 border-purple-500 text-purple-600 hover:bg-purple-50 flex-1 sm:flex-none">
                  <Target className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Set Goal</span>
                  <span className="sm:hidden">Goal</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

                  <div className="space-y-2">
                    <Label>Target Date</Label>
                    <Input type="date" value={goalData.target_date || ''}
                      onChange={(e) => setGoalData({...goalData, target_date: e.target.value})} />
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Starting Weight</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600">{initialWeight}</p>
                  <p className="text-xs text-gray-500">kg</p>
                </div>
                <Scale className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Current Weight</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600">{currentWeight}</p>
                  <p className="text-xs text-gray-500">kg</p>
                </div>
                <TrendingDown className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Target Weight</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-600">{targetWeight || '-'}</p>
                  <p className="text-xs text-gray-500">kg</p>
                </div>
                <Target className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Weight Change</p>
                  <p className={`text-xl sm:text-2xl md:text-3xl font-bold ${weightChange < 0 ? 'text-green-600' : 'text-orange-600'}`}>
                    {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500">kg</p>
                </div>
                {weightChange < 0 ? <TrendingDown className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-green-500" /> : <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-orange-500" />}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Symptom Check-in Banner */}
        {(() => {
          const lastCheckIn = symptomLogs[0];
          const daysSince = lastCheckIn
            ? Math.floor((Date.now() - new Date(lastCheckIn.date)) / 86400000)
            : null;
          const isWorse = lastCheckIn?.symptom_status === 'worsening' || lastCheckIn?.symptom_status === 'much_worse';
          const sympBg = isWorse ? 'bg-red-50 border-red-300' : daysSince !== null && daysSince <= 3 ? 'bg-green-50 border-green-300' : 'bg-blue-50 border-blue-300';
          return (
            <Card className={`border-2 shadow-md ${sympBg}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Heart className="w-6 h-6 text-green-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">Symptom Check-ins</p>
                      {lastCheckIn ? (
                        <p className="text-xs text-gray-600">
                          Last: <strong className="capitalize">{lastCheckIn.symptom_status?.replace('_', ' ')}</strong>
                          {' '}· {daysSince === 0 ? 'Today' : `${daysSince} day${daysSince > 1 ? 's' : ''} ago`}
                          {lastCheckIn.energy_level ? ` · Energy: ${lastCheckIn.energy_level}/5` : ''}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500">No check-ins yet — submit one below</p>
                      )}
                    </div>
                  </div>
                  <Link to={`/SymptomCheckIn?clientId=${clientProfile?.id}&email=${encodeURIComponent(user?.email || '')}`}>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white shrink-0">
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Submit Check-in
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Daily Progress Logger */}
        <DailyProgressLogger clientId={clientProfile?.id} />

        {/* Nutrition Adherence from Progress Logs (meal ticks) */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Nutrition Adherence</h2>
          {(() => {
            const recentLogs = progressLogs.filter(l => l.meal_adherence != null).slice(-7);
            if (recentLogs.length === 0) {
              return (
                <Card className="border-none shadow-lg">
                  <CardContent className="p-8 text-center">
                    <Target className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No adherence data yet. Log your daily progress with meal adherence %.</p>
                  </CardContent>
                </Card>
              );
            }
            const avgAdherence = Math.round(recentLogs.reduce((s, l) => s + l.meal_adherence, 0) / recentLogs.length);
            return (
              <div className="space-y-4">
                <Card className="border-none shadow-xl bg-gradient-to-r from-orange-500 to-red-500 text-white">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <p className="text-white/80 mb-1">Overall Meal Adherence</p>
                      <p className="text-5xl font-bold">{avgAdherence}%</p>
                      <p className="text-sm text-white/90 mt-2">Average over last {recentLogs.length} log{recentLogs.length > 1 ? 's' : ''}</p>
                    </div>
                    <Target className="w-16 h-16 text-white/30" />
                  </CardContent>
                </Card>
                <div className="space-y-2">
                  {recentLogs.slice().reverse().map(log => (
                    <Card key={log.id} className="border-none shadow">
                      <CardContent className="p-4 flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-700">{log.date ? format(new Date(log.date), 'MMM d, yyyy') : '—'}</p>
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, log.meal_adherence)}%`, backgroundColor: log.meal_adherence >= 80 ? '#22c55e' : log.meal_adherence >= 50 ? '#f59e0b' : '#ef4444' }} />
                          </div>
                          <span className={`text-sm font-bold ${log.meal_adherence >= 80 ? 'text-green-600' : log.meal_adherence >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{log.meal_adherence}%</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Goals Section */}
        {(activeGoals.length > 0 || completedGoals.length > 0) && (
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              My Goals
            </h2>
            
            {activeGoals.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {activeGoals.map(goal => (
                  <GoalCard key={goal.id} goal={goal} onEdit={handleEditGoal} onDelete={handleDeleteGoal} />
                ))}
              </div>
            )}

            {completedGoals.length > 0 && (
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">Completed Goals 🎉</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {completedGoals.map(goal => (
                    <GoalCard key={goal.id} goal={goal} onEdit={handleEditGoal} onDelete={handleDeleteGoal} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Health Trends Visualization */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Health Trends & Insights</h2>
          <HealthTrendsVisualization progressLogs={progressLogs} />
        </div>

        {/* Advanced Analytics */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Advanced Analytics</h2>
          <AdvancedAnalyticsDashboard progressLogs={progressLogs} mealPlan={mealPlan} />
        </div>

        {/* Charts Tabs */}
        <Tabs defaultValue="weight" className="space-y-4 sm:space-y-6">
          <TabsList className="grid grid-cols-4 bg-white/80 backdrop-blur w-full h-auto">
            <TabsTrigger value="weight" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
              <Scale className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Weight</span>
            </TabsTrigger>
            <TabsTrigger value="wellness" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
              <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Wellness</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="symptoms" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
              <Heart className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Symptoms</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weight">
            {chartData.length > 0 ? (
              <Card className="border-none shadow-lg">
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="text-base sm:text-lg md:text-xl">Weight Progress</CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                  <ResponsiveContainer width="100%" height={300} className="sm:hidden">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" style={{ fontSize: '10px' }} />
                      <YAxis domain={['dataMin - 2', 'dataMax + 2']} style={{ fontSize: '10px' }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="weight" stroke="#f97316" strokeWidth={2}
                        dot={{ fill: '#f97316', r: 4 }} name="Weight (kg)" />
                    </LineChart>
                  </ResponsiveContainer>
                  <ResponsiveContainer width="100%" height={400} className="hidden sm:block">
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
              <Card><CardContent className="p-8 sm:p-12 text-center">
                <Scale className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-300 mb-3 sm:mb-4" />
                <p className="text-sm sm:text-base text-gray-600">No weight data yet</p>
              </CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="wellness">
            {progressLogs.length > 0 || mpessLogs.length > 0 ? (
              <WellnessCharts progressLogs={progressLogs} mpessLogs={mpessLogs} />
            ) : (
              <Card><CardContent className="p-12 text-center">
                <Activity className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">No wellness data yet</p>
              </CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="history">
            <Card className="border-none shadow-lg">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-base sm:text-lg md:text-xl">Progress History</CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                {progressLogs.length === 0 && mpessLogs.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <Scale className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-300 mb-3 sm:mb-4" />
                    <p className="text-sm sm:text-base text-gray-600">No progress logged yet</p>
                    {canEditProgress && (
                      <Button onClick={() => setShowAddDialog(true)} className="mt-3 sm:mt-4 bg-gradient-to-r from-orange-500 to-red-500 w-full sm:w-auto">
                        <Plus className="w-4 h-4 mr-2" />Log Your First Progress
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {/* Progress Logs */}
                    {progressLogs.slice().reverse().map((log) => (
                     <div key={`progress-${log.id}`} className="p-3 sm:p-4 border-2 border-orange-200 rounded-lg hover:bg-orange-50 bg-white">
                       <div className="flex items-center gap-2 mb-2">
                         <Badge className="bg-orange-500 text-white">Progress Log</Badge>
                       </div>
                       <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-3 mb-3">
                         <div className="min-w-0">
                           <p className="font-semibold text-sm sm:text-base">{log.date ? format(new Date(log.date), 'MMMM d, yyyy') : 'No date'}</p>
                            <p className="text-xs sm:text-sm text-gray-600">Weight: <span className="font-medium text-green-600">{log.weight} kg</span></p>
                          </div>
                          <div className="flex gap-2 shrink-0">
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
                          <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm mb-2">
                            {log.wellness_metrics.energy_level && <span>⚡ Energy: {log.wellness_metrics.energy_level}/10</span>}
                            {log.wellness_metrics.sleep_quality && <span>😴 Sleep: {log.wellness_metrics.sleep_quality}/10</span>}
                            {log.wellness_metrics.stress_level && <span>😰 Stress: {log.wellness_metrics.stress_level}/10</span>}
                          </div>
                        )}

                        {log.notes && <p className="text-xs sm:text-sm text-gray-700 bg-gray-50 p-2 sm:p-3 rounded break-words">{log.notes}</p>}

                        {log.coach_feedback && (
                          <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="bg-green-600 text-white">Coach Feedback</Badge>
                              <div className="flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <span key={i} className={i < log.coach_feedback.rating ? 'text-yellow-500' : 'text-gray-300'}>★</span>
                                ))}
                              </div>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-700 mb-2">{log.coach_feedback.feedback_text}</p>
                            {log.coach_feedback.celebration_notes && (
                              <div className="p-2 bg-yellow-100 rounded mb-2">
                                <p className="text-xs sm:text-sm">🎉 {log.coach_feedback.celebration_notes}</p>
                              </div>
                            )}
                            {log.coach_feedback.suggestions?.length > 0 && (
                              <div className="text-xs sm:text-sm">
                                <p className="font-semibold mb-1">Suggestions:</p>
                                <ul className="list-disc list-inside space-y-0.5">
                                  {log.coach_feedback.suggestions.map((s, idx) => <li key={idx}>{s}</li>)}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* MPESS Logs */}
                    {mpessLogs.slice().reverse().map((mpess) => {
                      const practices = [];
                      if (mpess.mind_practices?.affirmations_completed) practices.push('🧠 Affirmations');
                      if (mpess.physical_practices?.movement_done) practices.push('🏃 Movement');
                      if (mpess.emotional_practices?.journaling_done) practices.push('📝 Journaling');
                      if (mpess.social_practices?.bonding_activity_done) practices.push('👥 Social');
                      if (mpess.spiritual_practices?.meditation_done) practices.push('🧘 Meditation');

                      return (
                        <div key={`mpess-${mpess.id}`} className="p-3 sm:p-4 border-2 border-purple-200 rounded-lg hover:bg-purple-50 bg-white">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-purple-500 text-white">MPESS Wellness</Badge>
                          </div>
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-3 mb-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-sm sm:text-base">{mpess.date ? format(new Date(mpess.date), 'MMMM d, yyyy') : 'No date'}</p>
                              {mpess.overall_rating && (
                                <p className="text-xs sm:text-sm text-gray-600">
                                  Overall Rating: <span className="font-medium text-purple-600">{mpess.overall_rating}/5 ⭐</span>
                                </p>
                              )}
                            </div>
                          </div>

                          {practices.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {practices.map((practice, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">{practice}</Badge>
                              ))}
                            </div>
                          )}

                          {mpess.emotional_practices?.mood && (
                            <div className="text-xs sm:text-sm text-gray-700 mb-1">
                              Mood: <span className="font-medium capitalize">{mpess.emotional_practices.mood}</span>
                            </div>
                          )}

                          {mpess.physical_practices?.water_intake && (
                            <div className="text-xs sm:text-sm text-gray-700 mb-1">
                              💧 Water: <span className="font-medium">{mpess.physical_practices.water_intake}L</span>
                            </div>
                          )}

                          {(mpess.mind_practices?.notes || mpess.emotional_practices?.notes) && (
                            <p className="text-xs sm:text-sm text-gray-700 bg-purple-50 p-2 sm:p-3 rounded break-words mt-2">
                              {mpess.mind_practices?.notes || mpess.emotional_practices?.notes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="symptoms">
            <Card className="border-none shadow-lg">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center justify-between text-base sm:text-lg md:text-xl">
                  <span className="flex items-center gap-2"><Heart className="w-5 h-5 text-green-500" /> Symptom Check-in History</span>
                  <Link to={`/SymptomCheckIn?clientId=${clientProfile?.id}&email=${encodeURIComponent(user?.email || '')}`}>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                      <Plus className="w-4 h-4 mr-1" /> New Check-in
                    </Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                {symptomLogs.length === 0 ? (
                  <div className="text-center py-10 space-y-3">
                    <Heart className="w-12 h-12 mx-auto text-gray-300" />
                    <p className="text-gray-500 text-sm">No symptom check-ins yet.</p>
                    <p className="text-gray-400 text-xs">Your coach sends one every 3 days, or you can submit one anytime.</p>
                    <Link to={`/SymptomCheckIn?clientId=${clientProfile?.id}&email=${encodeURIComponent(user?.email || '')}`}>
                      <Button className="mt-2 bg-green-600 hover:bg-green-700 text-white" size="sm">Submit First Check-in</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {symptomLogs.map(log => {
                      const COLORS = { improving: 'border-l-green-500 bg-green-50', same: 'border-l-blue-400 bg-blue-50', worsening: 'border-l-orange-500 bg-orange-50', much_worse: 'border-l-red-600 bg-red-50' };
                      const LABELS = { improving: '😊 Improving', same: '😐 Same', worsening: '😟 Worsening', much_worse: '😰 Much Worse' };
                      const cls = COLORS[log.symptom_status] || 'border-l-gray-300 bg-gray-50';
                      return (
                        <div key={log.id} className={`p-4 rounded-xl border-l-4 ${cls}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{log.date ? format(new Date(log.date), 'MMMM d, yyyy') : '—'}</p>
                              <div className="flex flex-wrap gap-2 mt-1 text-xs">
                                <span className="font-medium">{LABELS[log.symptom_status] || log.symptom_status}</span>
                                {log.energy_level && <span>⚡ Energy: {log.energy_level}/5</span>}
                                {log.digestive_health && <span>🫁 {log.digestive_health}</span>}
                              </div>
                            </div>
                          </div>
                          {log.worsening_details && (
                            <p className="text-xs text-red-700 italic mt-2 bg-white rounded p-2">"{log.worsening_details}"</p>
                          )}
                          {log.notes && <p className="text-xs text-gray-600 italic mt-1 bg-white rounded p-2">"{log.notes}"</p>}
                        </div>
                      );
                    })}
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