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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Scale,
  Calendar,
  Activity,
  Utensils,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  X,
  Heart,
  Image as ImageIcon,
  BarChart3,
  FileText,
  ClipboardList,
  LineChart as LineChartIcon
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ClientProgressDashboard({ client, onClose }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [goalFormData, setGoalFormData] = useState({
    goal_type: 'weight',
    title: '',
    target_value: '',
    unit: 'kg',
    target_date: '',
    status: 'active',
    priority: 'medium'
  });

  // Fetch progress logs
  const { data: progressLogs } = useQuery({
    queryKey: ['clientProgressLogs', client.id],
    queryFn: async () => {
      try {
        const logs = await base44.entities.ProgressLog.filter({ client_id: client.id });
        return logs.sort((a, b) => new Date(a.date) - new Date(b.date));
      } catch (error) {
        console.error('Progress logs fetch error:', error);
        return [];
      }
    },
    initialData: [],
    enabled: !!client?.id,
  });

  // Fetch food logs
  const { data: foodLogs } = useQuery({
    queryKey: ['clientFoodLogs', client.id],
    queryFn: async () => {
      const logs = await base44.entities.FoodLog.filter({ client_id: client.id });
      return logs.sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    initialData: [],
    enabled: !!client.id,
  });

  // Fetch goals
  const { data: goals } = useQuery({
    queryKey: ['clientGoals', client.id],
    queryFn: async () => {
      try {
        const allGoals = await base44.entities.ProgressGoal.filter({ client_id: client.id });
        return allGoals.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      } catch (error) {
        console.error('Goals fetch error:', error);
        return [];
      }
    },
    initialData: [],
    enabled: !!client?.id,
  });

  // Fetch MPESS tracking
  const { data: mpessLogs } = useQuery({
    queryKey: ['clientMPESS', client.id],
    queryFn: async () => {
      try {
        const logs = await base44.entities.MPESSTracker.filter({ created_by: client.email });
        return logs.sort((a, b) => new Date(b.date) - new Date(a.date));
      } catch (error) {
        console.error('MPESS fetch error:', error);
        return [];
      }
    },
    initialData: [],
    enabled: !!client?.email,
  });

  const saveGoalMutation = useMutation({
    mutationFn: (data) => {
      if (editingGoal) {
        return base44.entities.ProgressGoal.update(editingGoal.id, data);
      }
      return base44.entities.ProgressGoal.create({ ...data, client_id: client.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clientGoals']);
      setShowGoalDialog(false);
      setEditingGoal(null);
      setGoalFormData({
        goal_type: 'weight',
        title: '',
        target_value: '',
        unit: 'kg',
        target_date: '',
        status: 'active',
        priority: 'medium'
      });
      alert(editingGoal ? 'Goal updated!' : 'Goal created!');
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (id) => base44.entities.ProgressGoal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientGoals']);
      alert('Goal deleted!');
    },
  });

  // Prepare chart data
  const weightChartData = (progressLogs || []).map(log => ({
    date: format(new Date(log.date), 'MMM d'),
    weight: log.weight,
    targetWeight: client.target_weight
  }));

  // Daily calorie intake from food logs
  const calorieData = {};
  (foodLogs || []).forEach(log => {
    if (!calorieData[log.date]) {
      calorieData[log.date] = 0;
    }
    calorieData[log.date] += log.calories || 0;
  });

  const calorieChartData = Object.entries(calorieData)
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .slice(-14)
    .map(([date, calories]) => ({
      date: format(new Date(date), 'MMM d'),
      calories,
      target: client.target_calories
    }));

  // Wellness metrics
  const wellnessData = (progressLogs || [])
    .filter(log => log.wellness_metrics)
    .slice(-14)
    .map(log => ({
      date: format(new Date(log.date), 'MMM d'),
      energy: log.wellness_metrics?.energy_level || 0,
      sleep: log.wellness_metrics?.sleep_quality || 0,
      stress: log.wellness_metrics?.stress_level || 0,
    }));

  // Calculate stats
  const latestLog = (progressLogs || [])[progressLogs?.length - 1];
  const initialWeight = client?.initial_weight || client?.weight || 0;
  const currentWeight = latestLog?.weight || client?.weight || 0;
  const weightChange = initialWeight ? currentWeight - initialWeight : 0;
  const weightProgress = client?.target_weight 
    ? ((initialWeight - currentWeight) / (initialWeight - client.target_weight) * 100).toFixed(1)
    : 0;

  const activeGoals = (goals || []).filter(g => g.status === 'active');
  const completedGoals = (goals || []).filter(g => g.status === 'completed');

  const handleEditGoal = (goal) => {
    setEditingGoal(goal);
    setGoalFormData({
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

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            {client.profile_photo_url ? (
              <img
                src={client.profile_photo_url}
                alt={client.full_name}
                className="w-12 h-12 rounded-full object-cover border-2 border-orange-500"
              />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {client.full_name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
            )}
            {client.full_name}'s Progress Dashboard
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Key Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Starting</p>
                    <p className="text-2xl font-bold text-blue-600">{initialWeight}</p>
                    <p className="text-xs text-gray-500">kg</p>
                  </div>
                  <Scale className="w-10 h-10 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Current</p>
                    <p className="text-2xl font-bold text-green-600">{currentWeight}</p>
                    <p className="text-xs text-gray-500">kg</p>
                  </div>
                  {weightChange < 0 ? 
                    <TrendingDown className="w-10 h-10 text-green-500" /> :
                    <TrendingUp className="w-10 h-10 text-orange-500" />
                  }
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Target</p>
                    <p className="text-2xl font-bold text-purple-600">{client.target_weight || '-'}</p>
                    <p className="text-xs text-gray-500">kg</p>
                  </div>
                  <Target className="w-10 h-10 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Change</p>
                    <p className={`text-2xl font-bold ${weightChange < 0 ? 'text-green-600' : 'text-orange-600'}`}>
                      {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-500">kg</p>
                  </div>
                  <Activity className="w-10 h-10 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Goals Section */}
          <Card className="border-none shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Goals & Milestones
              </CardTitle>
              <Button size="sm" onClick={() => setShowGoalDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Goal
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeGoals.length === 0 && completedGoals.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600 mb-4">No goals set yet</p>
                  <Button size="sm" onClick={() => setShowGoalDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Goal
                  </Button>
                </div>
              ) : (
                <>
                  {activeGoals.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-gray-700">Active Goals</h4>
                      {activeGoals.map(goal => (
                        <Card key={goal.id} className="border-2 border-purple-200">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h5 className="font-semibold">{goal.title}</h5>
                                <p className="text-sm text-gray-600">{goal.description}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => handleEditGoal(goal)}>
                                  <Edit className="w-4 h-4 text-blue-600" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => {
                                  if (window.confirm('Delete this goal?')) {
                                    deleteGoalMutation.mutate(goal.id);
                                  }
                                }}>
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Progress</span>
                                <span className="font-semibold">
                                  {goal.current_value || goal.start_value || 0} / {goal.target_value} {goal.unit}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2.5 rounded-full"
                                  style={{
                                    width: `${Math.min(100, Math.max(0, 
                                      ((goal.current_value || goal.start_value || 0) / goal.target_value) * 100
                                    ))}%`
                                  }}
                                />
                              </div>
                              <div className="flex justify-between text-xs text-gray-600">
                                {goal.priority && <Badge variant="outline" className="capitalize">{goal.priority}</Badge>}
                                {goal.target_date && (
                                  <span>Target: {format(new Date(goal.target_date), 'MMM d, yyyy')}</span>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {completedGoals.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        Completed Goals
                      </h4>
                      {completedGoals.slice(0, 3).map(goal => (
                        <Card key={goal.id} className="border-2 border-green-200 bg-green-50">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="font-semibold text-sm">{goal.title}</h5>
                                <p className="text-xs text-gray-600">
                                  {goal.target_value} {goal.unit} achieved
                                </p>
                              </div>
                              <CheckCircle2 className="w-6 h-6 text-green-600" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Charts Tabs */}
          <Tabs defaultValue="weight" className="space-y-4">
            <TabsList className="grid grid-cols-3 md:grid-cols-6 bg-white/80 backdrop-blur">
              <TabsTrigger value="weight"><Scale className="w-4 h-4 mr-2" />Weight</TabsTrigger>
              <TabsTrigger value="calories"><Utensils className="w-4 h-4 mr-2" />Calories</TabsTrigger>
              <TabsTrigger value="wellness"><Activity className="w-4 h-4 mr-2" />Wellness</TabsTrigger>
              <TabsTrigger value="foodlog"><ImageIcon className="w-4 h-4 mr-2" />Food Log</TabsTrigger>
              <TabsTrigger value="progress"><Calendar className="w-4 h-4 mr-2" />Progress</TabsTrigger>
              <TabsTrigger value="mpess"><Heart className="w-4 h-4 mr-2" />MPESS</TabsTrigger>
            </TabsList>

            <TabsContent value="weight">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Weight Progress Over Time</CardTitle>
                  <CardDescription>Tracking weight changes towards target</CardDescription>
                </CardHeader>
                <CardContent>
                  {weightChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={weightChartData}>
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
                        {client.target_weight && (
                          <Line
                            type="monotone"
                            dataKey="targetWeight"
                            stroke="#8b5cf6"
                            strokeDasharray="5 5"
                            strokeWidth={2}
                            dot={false}
                            name="Target Weight"
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12">
                      <Scale className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-600">No weight data logged yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="calories">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Daily Calorie Intake (Last 14 Days)</CardTitle>
                  <CardDescription>Comparing actual intake vs target</CardDescription>
                </CardHeader>
                <CardContent>
                  {calorieChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={calorieChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="calories" fill="#10b981" name="Calories Consumed" />
                        {client.target_calories && (
                          <Line
                            type="monotone"
                            dataKey="target"
                            stroke="#f59e0b"
                            strokeDasharray="5 5"
                            strokeWidth={2}
                            name="Target Calories"
                          />
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12">
                      <Utensils className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-600">No food logs yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="wellness">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Wellness Metrics (Last 14 Days)</CardTitle>
                  <CardDescription>Energy, sleep quality, and stress levels</CardDescription>
                </CardHeader>
                <CardContent>
                  {wellnessData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={wellnessData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 10]} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="energy"
                          stroke="#10b981"
                          strokeWidth={2}
                          name="Energy Level"
                        />
                        <Line
                          type="monotone"
                          dataKey="sleep"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          name="Sleep Quality"
                        />
                        <Line
                          type="monotone"
                          dataKey="stress"
                          stroke="#ef4444"
                          strokeWidth={2}
                          name="Stress Level"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12">
                      <Activity className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-600">No wellness data logged yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="foodlog">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Food Log with Photos</CardTitle>
                  <CardDescription>Recent meal entries from {client.full_name} ({foodLogs.length} total)</CardDescription>
                </CardHeader>
                <CardContent>
                  {foodLogs.length > 0 ? (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
                      {foodLogs.slice(0, 15).map((log) => (
                        <Card key={log.id} className="border-2 hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row gap-4">
                              {log.photo_url && (
                                <img 
                                  src={log.photo_url} 
                                  alt={log.meal_name || log.meal_type}
                                  className="w-full md:w-32 h-32 object-cover rounded-lg"
                                />
                              )}
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <h5 className="font-semibold text-lg">{log.meal_name || log.meal_type}</h5>
                                    <p className="text-sm text-gray-600">{format(new Date(log.date), 'MMM d, yyyy')}</p>
                                  </div>
                                  <Badge variant="outline" className="capitalize">{log.meal_type?.replace('_', ' ')}</Badge>
                                </div>
                                
                                {log.items && log.items.length > 0 && (
                                  <div className="mb-2">
                                    <p className="text-sm text-gray-700">
                                      <strong>Items:</strong> {log.items.join(', ')}
                                    </p>
                                  </div>
                                )}

                                {log.calories && (
                                  <div className="flex gap-4 text-sm">
                                    <span className="font-medium text-orange-600">{log.calories} cal</span>
                                    {log.protein && <span className="text-blue-600">P: {log.protein}g</span>}
                                    {log.carbs && <span className="text-green-600">C: {log.carbs}g</span>}
                                    {log.fats && <span className="text-purple-600">F: {log.fats}g</span>}
                                  </div>
                                )}

                                {log.notes && (
                                  <p className="text-sm text-gray-600 mt-2 italic">{log.notes}</p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Utensils className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-600">No food logs yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="progress">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Progress Tracking History</CardTitle>
                  <CardDescription>Weight, measurements, and wellness entries</CardDescription>
                </CardHeader>
                <CardContent>
                  {progressLogs.length > 0 ? (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
                      {progressLogs.slice().reverse().map((log) => (
                        <Card key={log.id} className="border-2 hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h5 className="font-semibold text-lg">{format(new Date(log.date), 'MMMM d, yyyy')}</h5>
                                <p className="text-2xl font-bold text-green-600 mt-1">{log.weight} kg</p>
                              </div>
                              {log.wellness_metrics?.mood && (
                                <Badge variant="outline" className="capitalize">{log.wellness_metrics.mood}</Badge>
                              )}
                            </div>

                            {log.measurements && Object.keys(log.measurements).length > 0 && (
                              <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm font-semibold text-blue-900 mb-2">Body Measurements (cm)</p>
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                  {Object.entries(log.measurements).map(([key, value]) => (
                                    value && (
                                      <div key={key}>
                                        <span className="text-gray-600 capitalize">{key.replace('_', ' ')}: </span>
                                        <span className="font-medium">{value}</span>
                                      </div>
                                    )
                                  ))}
                                </div>
                              </div>
                            )}

                            {log.wellness_metrics && (
                              <div className="flex flex-wrap gap-3 text-sm mb-2">
                                {log.wellness_metrics.energy_level && (
                                  <span className="text-yellow-600">⚡ Energy: {log.wellness_metrics.energy_level}/10</span>
                                )}
                                {log.wellness_metrics.sleep_quality && (
                                  <span className="text-indigo-600">😴 Sleep: {log.wellness_metrics.sleep_quality}/10</span>
                                )}
                                {log.wellness_metrics.stress_level && (
                                  <span className="text-red-600">😰 Stress: {log.wellness_metrics.stress_level}/10</span>
                                )}
                                {log.wellness_metrics.water_intake && (
                                  <span className="text-blue-600">💧 Water: {log.wellness_metrics.water_intake}L</span>
                                )}
                              </div>
                            )}

                            {log.photos && Object.keys(log.photos).filter(k => log.photos[k]).length > 0 && (
                              <div className="flex gap-2 mt-3">
                                {Object.entries(log.photos).map(([type, url]) => (
                                  url && (
                                    <img 
                                      key={type}
                                      src={url} 
                                      alt={type}
                                      className="w-20 h-20 object-cover rounded border-2 border-orange-300"
                                      title={`${type} view`}
                                    />
                                  )
                                ))}
                              </div>
                            )}

                            {log.notes && (
                              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded mt-3">{log.notes}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-600">No progress logs yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mpess">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>MPESS Wellness Tracker</CardTitle>
                  <CardDescription>Mind, Physical, Emotional, Social, Spiritual practices</CardDescription>
                </CardHeader>
                <CardContent>
                  {mpessLogs.length > 0 ? (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
                      {mpessLogs.slice().reverse().slice(0, 15).map((log) => (
                        <Card key={log.id} className="border-2 hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-semibold text-lg">{format(new Date(log.date), 'MMMM d, yyyy')}</h5>
                              {log.overall_rating && (
                                <div className="flex items-center gap-1">
                                  {[...Array(log.overall_rating)].map((_, i) => (
                                    <span key={i} className="text-yellow-500">⭐</span>
                                  ))}
                                  <span className="text-sm text-gray-600 ml-1">{log.overall_rating}/5</span>
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                              {/* Mind */}
                              {log.mind_practices && (
                                <div className="p-2 bg-blue-50 rounded">
                                  <p className="text-xs font-semibold text-blue-900 mb-1">🧠 Mind</p>
                                  <div className="text-xs space-y-1">
                                    {log.mind_practices.affirmations_completed && <p>✓ Affirmations</p>}
                                    {log.mind_practices.stress_relief_done && <p>✓ Stress Relief</p>}
                                    {log.mind_practices.sleep_guidance_followed && <p>✓ Sleep Guide</p>}
                                  </div>
                                </div>
                              )}

                              {/* Physical */}
                              {log.physical_practices && (
                                <div className="p-2 bg-green-50 rounded">
                                  <p className="text-xs font-semibold text-green-900 mb-1">💪 Physical</p>
                                  <div className="text-xs space-y-1">
                                    {log.physical_practices.movement_done && <p>✓ Movement</p>}
                                    {log.physical_practices.posture_awareness && <p>✓ Posture</p>}
                                    {log.physical_practices.hydration_met && <p>✓ Hydration</p>}
                                    {log.physical_practices.water_intake && (
                                      <p className="font-medium">{log.physical_practices.water_intake}L water</p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Emotional */}
                              {log.emotional_practices && (
                                <div className="p-2 bg-pink-50 rounded">
                                  <p className="text-xs font-semibold text-pink-900 mb-1">❤️ Emotional</p>
                                  <div className="text-xs space-y-1">
                                    {log.emotional_practices.journaling_done && <p>✓ Journaling</p>}
                                    {log.emotional_practices.emotion_release_done && <p>✓ Release</p>}
                                    {log.emotional_practices.breathwork_done && <p>✓ Breathwork</p>}
                                    {log.emotional_practices.mood && (
                                      <p className="font-medium capitalize">{log.emotional_practices.mood}</p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Social */}
                              {log.social_practices && (
                                <div className="p-2 bg-yellow-50 rounded">
                                  <p className="text-xs font-semibold text-yellow-900 mb-1">👥 Social</p>
                                  <div className="text-xs space-y-1">
                                    {log.social_practices.bonding_activity_done && <p>✓ Bonding</p>}
                                    {log.social_practices.connection_made && <p>✓ Connection</p>}
                                  </div>
                                </div>
                              )}

                              {/* Spiritual */}
                              {log.spiritual_practices && (
                                <div className="p-2 bg-purple-50 rounded">
                                  <p className="text-xs font-semibold text-purple-900 mb-1">🙏 Spiritual</p>
                                  <div className="text-xs space-y-1">
                                    {log.spiritual_practices.breathwork_done && <p>✓ Breathwork</p>}
                                    {log.spiritual_practices.meditation_done && <p>✓ Meditation</p>}
                                    {log.spiritual_practices.gratitude_journaling_done && <p>✓ Gratitude</p>}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Heart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-600">No MPESS tracking yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Summary Stats */}
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-purple-50">
            <CardHeader>
              <CardTitle>Progress Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Progress Logs</p>
                <p className="text-2xl font-bold text-blue-600">{progressLogs.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Food Logs</p>
                <p className="text-2xl font-bold text-green-600">{foodLogs.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Goals</p>
                <p className="text-2xl font-bold text-purple-600">{activeGoals.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Weight Progress</p>
                <p className="text-2xl font-bold text-orange-600">{weightProgress}%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Goal Dialog */}
        <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingGoal ? 'Edit Goal' : 'Create New Goal'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Goal Type</Label>
                <Select value={goalFormData.goal_type} onValueChange={(value) => setGoalFormData({...goalFormData, goal_type: value})}>
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
                <Label>Goal Title *</Label>
                <Input value={goalFormData.title || ''} onChange={(e) => setGoalFormData({...goalFormData, title: e.target.value})}
                  placeholder="e.g., Lose 5kg, Reduce waist by 5cm" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Start Value</Label>
                  <Input type="number" step="0.1" value={goalFormData.start_value || ''}
                    onChange={(e) => setGoalFormData({...goalFormData, start_value: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Current</Label>
                  <Input type="number" step="0.1" value={goalFormData.current_value || ''}
                    onChange={(e) => setGoalFormData({...goalFormData, current_value: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Target *</Label>
                  <Input type="number" step="0.1" value={goalFormData.target_value || ''}
                    onChange={(e) => setGoalFormData({...goalFormData, target_value: parseFloat(e.target.value)})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Input value={goalFormData.unit || ''} onChange={(e) => setGoalFormData({...goalFormData, unit: e.target.value})}
                    placeholder="kg, cm, days" />
                </div>
                <div className="space-y-2">
                  <Label>Target Date</Label>
                  <Input type="date" value={goalFormData.target_date || ''}
                    onChange={(e) => setGoalFormData({...goalFormData, target_date: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={goalFormData.priority} onValueChange={(value) => setGoalFormData({...goalFormData, priority: value})}>
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
                  <Select value={goalFormData.status} onValueChange={(value) => setGoalFormData({...goalFormData, status: value})}>
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
                <Button onClick={() => saveGoalMutation.mutate(goalFormData)} disabled={saveGoalMutation.isPending || !goalFormData.title || !goalFormData.target_value}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500">
                  {saveGoalMutation.isPending ? 'Saving...' : editingGoal ? 'Update' : 'Create Goal'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}