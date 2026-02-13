import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, CheckCircle, Clock, Star, TrendingUp, Scale, Ruler, Heart, Image as ImageIcon, Search, Filter, Target, Eye, TrendingDown, Activity, Flame } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import SMARTGoalBuilder from "../components/progress/SMARTGoalBuilder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ClientProgressReview() {
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [feedbackData, setFeedbackData] = useState({
    feedback_text: '',
    rating: 5,
    suggestions: [],
    celebration_notes: ''
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['myClients', user?.email],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list();
      return allClients.filter(c => {
        const assignedCoaches = Array.isArray(c.assigned_coach) 
          ? c.assigned_coach 
          : c.assigned_coach 
            ? [c.assigned_coach] 
            : [];
        return assignedCoaches.includes(user?.email);
      });
    },
    enabled: !!user,
  });

  const { data: progressLogs = [] } = useQuery({
    queryKey: ['clientProgressLogs', selectedClient?.id],
    queryFn: async () => {
      const logs = await base44.entities.ProgressLog.filter({ client_id: selectedClient?.id });
      return logs.sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    enabled: !!selectedClient?.id,
  });

  const { data: clientGoals = [] } = useQuery({
    queryKey: ['clientGoals', selectedClient?.id],
    queryFn: async () => {
      const goals = await base44.entities.ProgressGoal.filter({ client_id: selectedClient?.id });
      return goals.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!selectedClient?.id,
  });

  const { data: foodLogs = [] } = useQuery({
    queryKey: ['clientFoodLogs', selectedClient?.id],
    queryFn: async () => {
      const logs = await base44.entities.FoodLog.filter({ client_id: selectedClient?.id });
      return logs.sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    enabled: !!selectedClient?.id,
  });

  const { data: mealPlan } = useQuery({
    queryKey: ['clientMealPlan', selectedClient?.id],
    queryFn: async () => {
      const plans = await base44.entities.MealPlan.filter({ 
        client_id: selectedClient?.id,
        active: true 
      });
      return plans[0] || null;
    },
    enabled: !!selectedClient?.id,
  });

  const provideFeedbackMutation = useMutation({
    mutationFn: async ({ logId, feedback }) => {
      return await base44.entities.ProgressLog.update(logId, {
        coach_feedback: {
          ...feedback,
          reviewed_by: user?.email,
          reviewed_at: new Date().toISOString()
        },
        reviewed: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clientProgressLogs']);
      setShowFeedbackDialog(false);
      setSelectedLog(null);
      setFeedbackData({ feedback_text: '', rating: 5, suggestions: [], celebration_notes: '' });
      toast.success('Feedback provided successfully!');
    },
  });

  const handleProvideFeedback = (log) => {
    setSelectedLog(log);
    if (log.coach_feedback) {
      setFeedbackData({
        feedback_text: log.coach_feedback.feedback_text || '',
        rating: log.coach_feedback.rating || 5,
        suggestions: log.coach_feedback.suggestions || [],
        celebration_notes: log.coach_feedback.celebration_notes || ''
      });
    } else {
      setFeedbackData({ feedback_text: '', rating: 5, suggestions: [], celebration_notes: '' });
    }
    setShowFeedbackDialog(true);
  };

  const handleSubmitFeedback = () => {
    if (!feedbackData.feedback_text.trim()) {
      toast.error('Please provide feedback text');
      return;
    }
    provideFeedbackMutation.mutate({
      logId: selectedLog.id,
      feedback: feedbackData
    });
  };

  const addSuggestion = () => {
    const suggestion = prompt('Enter suggestion:');
    if (suggestion) {
      setFeedbackData({
        ...feedbackData,
        suggestions: [...(feedbackData.suggestions || []), suggestion]
      });
    }
  };

  const removeSuggestion = (index) => {
    setFeedbackData({
      ...feedbackData,
      suggestions: feedbackData.suggestions.filter((_, i) => i !== index)
    });
  };

  const filteredClients = clients.filter(client =>
    client.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLogs = progressLogs.filter(log => {
    if (filterStatus === 'reviewed') return log.reviewed === true;
    if (filterStatus === 'pending') return log.reviewed !== true;
    return true;
  });

  const pendingReviewCount = progressLogs.filter(log => !log.reviewed).length;
  const reviewedCount = progressLogs.filter(log => log.reviewed).length;

  // Analytics calculations
  const weightChartData = React.useMemo(() => 
    progressLogs
      .filter(log => log.weight)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(log => ({
        date: format(new Date(log.date), 'MMM dd'),
        weight: log.weight,
        target: selectedClient?.target_weight
      })),
    [progressLogs, selectedClient]
  );

  const last7DaysFoodLogs = React.useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    return foodLogs.filter(log => new Date(log.date) >= cutoffDate);
  }, [foodLogs]);

  const avgCaloriesIntake = React.useMemo(() => {
    if (last7DaysFoodLogs.length === 0) return 0;
    const total = last7DaysFoodLogs.reduce((sum, log) => sum + (log.calories || 0), 0);
    return Math.round(total / last7DaysFoodLogs.length);
  }, [last7DaysFoodLogs]);

  const targetCalories = mealPlan?.target_calories || selectedClient?.target_calories || 2000;
  const calorieAdherence = Math.round((avgCaloriesIntake / targetCalories) * 100);

  const initialWeight = selectedClient?.initial_weight || selectedClient?.weight;
  const latestLog = progressLogs[0];
  const currentWeight = latestLog?.weight || selectedClient?.weight;
  const weightLost = initialWeight && currentWeight ? initialWeight - currentWeight : 0;

  const activeGoals = clientGoals.filter(g => g.status === 'active');

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Client Progress Review</h1>
          <p className="text-gray-600">Review client progress logs and provide personalized feedback</p>
        </div>

        {!selectedClient ? (
          <div>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search clients by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map(client => (
                <Card key={client.id} className="hover:shadow-lg transition-shadow cursor-pointer border-none"
                  onClick={() => setSelectedClient(client)}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{client.full_name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-gray-600">{client.email}</p>
                    {client.weight && (
                      <Badge variant="outline" className="text-xs">
                        <Scale className="w-3 h-3 mr-1" />
                        {client.weight} kg
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredClients.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-gray-600">No clients found</p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <Button variant="outline" onClick={() => setSelectedClient(null)}>
                  ← Back to Clients
                </Button>
                <h2 className="text-2xl font-bold text-gray-900 mt-4">{selectedClient.full_name}</h2>
              </div>
              <div className="flex gap-3">
                <SMARTGoalBuilder clientId={selectedClient.id} clientName={selectedClient.full_name} />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Logs</SelectItem>
                    <SelectItem value="pending">Pending Review</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-none">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Weight Lost</p>
                      <p className="text-3xl font-bold text-green-600">{Math.abs(weightLost).toFixed(1)}</p>
                      <p className="text-xs text-gray-500">kg</p>
                    </div>
                    {weightLost >= 0 ? (
                      <TrendingDown className="w-10 h-10 text-green-500" />
                    ) : (
                      <TrendingUp className="w-10 h-10 text-red-500" />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-none">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Avg Calories</p>
                      <p className="text-3xl font-bold text-orange-600">{avgCaloriesIntake}</p>
                      <p className="text-xs text-gray-500">kcal/day</p>
                    </div>
                    <Flame className="w-10 h-10 text-orange-500" />
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-gray-600">Target: {targetCalories} ({calorieAdherence}%)</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-none">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Pending Review</p>
                      <p className="text-3xl font-bold text-yellow-600">{pendingReviewCount}</p>
                    </div>
                    <Clock className="w-10 h-10 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-none">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Active Goals</p>
                      <p className="text-3xl font-bold text-green-600">{activeGoals.length}</p>
                    </div>
                    <Target className="w-10 h-10 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Visual Analytics Dashboard */}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
                <TabsTrigger value="goals">Goals</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Weight Trend */}
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Scale className="w-5 h-5 text-blue-600" />
                      Weight Progress Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {weightChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={weightChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis domain={['dataMin - 2', 'dataMax + 2']} />
                          <ChartTooltip />
                          <Legend />
                          <Line type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={3} name="Weight" />
                          <Line type="monotone" dataKey="target" stroke="#10b981" strokeDasharray="5 5" name="Target" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-center py-8 text-gray-500">No weight data available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Wellness Metrics */}
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-purple-600" />
                      Wellness Metrics Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {progressLogs.filter(log => log.wellness_metrics).length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={progressLogs.slice(0, 14).reverse().map(log => ({
                          date: format(new Date(log.date), 'MMM dd'),
                          energy: log.wellness_metrics?.energy_level || 0,
                          sleep: log.wellness_metrics?.sleep_quality || 0,
                          stress: 10 - (log.wellness_metrics?.stress_level || 5)
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis domain={[0, 10]} />
                          <ChartTooltip />
                          <Legend />
                          <Line type="monotone" dataKey="energy" stroke="#f59e0b" strokeWidth={2} name="Energy" />
                          <Line type="monotone" dataKey="sleep" stroke="#6366f1" strokeWidth={2} name="Sleep" />
                          <Line type="monotone" dataKey="stress" stroke="#10b981" strokeWidth={2} name="Calm" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-center py-8 text-gray-500">No wellness data available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="nutrition" className="space-y-6">
                {/* Calorie Intake Trend */}
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Flame className="w-5 h-5 text-orange-600" />
                      Calorie Intake vs Target (Last 7 Days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {last7DaysFoodLogs.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={last7DaysFoodLogs.reduce((acc, log) => {
                          const date = format(new Date(log.date), 'MMM dd');
                          const existing = acc.find(item => item.date === date);
                          if (existing) {
                            existing.calories += log.calories || 0;
                          } else {
                            acc.push({ 
                              date, 
                              calories: log.calories || 0,
                              target: targetCalories
                            });
                          }
                          return acc;
                        }, []).reverse()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <ChartTooltip />
                          <Legend />
                          <Bar dataKey="calories" fill="#f97316" name="Actual" />
                          <Bar dataKey="target" fill="#10b981" opacity={0.5} name="Target" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-center py-8 text-gray-500">No food log data available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Macro Adherence */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-none">
                    <CardContent className="p-6">
                      <p className="text-sm text-gray-600 mb-2">Protein Adherence</p>
                      <p className="text-3xl font-bold text-red-600">
                        {Math.round((last7DaysFoodLogs.reduce((sum, log) => sum + (log.protein || 0), 0) / last7DaysFoodLogs.length / (mealPlan?.target_protein || 150)) * 100)}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-none">
                    <CardContent className="p-6">
                      <p className="text-sm text-gray-600 mb-2">Carbs Adherence</p>
                      <p className="text-3xl font-bold text-yellow-600">
                        {Math.round((last7DaysFoodLogs.reduce((sum, log) => sum + (log.carbs || 0), 0) / last7DaysFoodLogs.length / (mealPlan?.target_carbs || 250)) * 100)}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-none">
                    <CardContent className="p-6">
                      <p className="text-sm text-gray-600 mb-2">Fats Adherence</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {Math.round((last7DaysFoodLogs.reduce((sum, log) => sum + (log.fats || 0), 0) / last7DaysFoodLogs.length / (mealPlan?.target_fats || 50)) * 100)}%
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="goals" className="space-y-6">
                {activeGoals.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeGoals.map(goal => {
                      const progress = goal.start_value && goal.target_value 
                        ? Math.round(((goal.current_value - goal.start_value) / (goal.target_value - goal.start_value)) * 100)
                        : 0;
                      
                      return (
                        <Card key={goal.id} className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h3 className="font-bold text-lg text-gray-900">{goal.title}</h3>
                                <p className="text-sm text-gray-600 mt-1">{goal.description}</p>
                              </div>
                              <Badge className={
                                goal.priority === 'high' ? 'bg-red-500' :
                                goal.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                              }>
                                {goal.priority}
                              </Badge>
                            </div>
                            
                            <div className="space-y-3">
                              <div className="grid grid-cols-3 gap-2 text-sm">
                                <div>
                                  <p className="text-gray-500">Start</p>
                                  <p className="font-semibold">{goal.start_value} {goal.unit}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Current</p>
                                  <p className="font-semibold">{goal.current_value} {goal.unit}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Target</p>
                                  <p className="font-semibold">{goal.target_value} {goal.unit}</p>
                                </div>
                              </div>
                              
                              <div>
                                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                                  <div 
                                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full" 
                                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                                  />
                                </div>
                                <p className="text-xs text-gray-600">
                                  {progress}% complete • Due: {format(new Date(goal.target_date), 'MMM dd, yyyy')}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Target className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-600 mb-4">No active goals set for this client</p>
                      <SMARTGoalBuilder clientId={selectedClient.id} clientName={selectedClient.full_name} />
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>

            <div className="space-y-4">
              {filteredLogs.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-gray-600">No progress logs found</p>
                  </CardContent>
                </Card>
              ) : (
                filteredLogs.map(log => (
                  <Card key={log.id} className={`border-2 ${log.reviewed ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold">{format(new Date(log.date), 'MMMM d, yyyy')}</h3>
                            {log.reviewed ? (
                              <Badge className="bg-green-600">✓ Reviewed</Badge>
                            ) : (
                              <Badge className="bg-yellow-600">⏳ Pending Review</Badge>
                            )}
                          </div>
                          <div className="flex gap-4 text-sm text-gray-600">
                            {log.weight && <span className="flex items-center gap-1"><Scale className="w-4 h-4" />{log.weight} kg</span>}
                            {log.meal_adherence && <span>🍽️ {log.meal_adherence}% adherence</span>}
                            {log.wellness_metrics?.mood && <span className="capitalize">😊 {log.wellness_metrics.mood}</span>}
                          </div>
                        </div>
                        <Button 
                          onClick={() => handleProvideFeedback(log)}
                          className={log.reviewed ? 'bg-blue-600' : 'bg-orange-600'}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          {log.reviewed ? 'Edit Feedback' : 'Provide Feedback'}
                        </Button>
                      </div>

                      {log.wellness_metrics && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          {log.wellness_metrics.energy_level && (
                            <div className="text-sm">⚡ Energy: {log.wellness_metrics.energy_level}/10</div>
                          )}
                          {log.wellness_metrics.sleep_quality && (
                            <div className="text-sm">😴 Sleep: {log.wellness_metrics.sleep_quality}/10</div>
                          )}
                          {log.wellness_metrics.stress_level && (
                            <div className="text-sm">😰 Stress: {log.wellness_metrics.stress_level}/10</div>
                          )}
                          {log.wellness_metrics.water_intake && (
                            <div className="text-sm">💧 Water: {log.wellness_metrics.water_intake}L</div>
                          )}
                        </div>
                      )}

                      {log.measurements && Object.keys(log.measurements).length > 0 && (
                        <div className="mb-4 p-3 bg-white rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Ruler className="w-4 h-4 text-orange-600" />
                            <span className="font-semibold text-sm">Measurements</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            {Object.entries(log.measurements).map(([key, value]) => (
                              value && <div key={key}>{key.replace(/_/g, ' ')}: {value}cm</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {log.photos && (Object.keys(log.photos).length > 0) && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <ImageIcon className="w-4 h-4 text-purple-600" />
                            <span className="font-semibold text-sm">Progress Photos</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {Object.entries(log.photos).map(([type, url]) => (
                              url && (
                                <div key={type}>
                                  <img src={url} alt={type} className="w-full h-32 object-cover rounded-lg" />
                                  <p className="text-xs text-center mt-1 capitalize">{type}</p>
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      )}

                      {log.notes && (
                        <div className="p-3 bg-blue-50 rounded-lg mb-4">
                          <p className="text-sm font-semibold mb-1">Client Notes:</p>
                          <p className="text-sm text-gray-700">{log.notes}</p>
                        </div>
                      )}

                      {log.coach_feedback && (
                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Heart className="w-5 h-5 text-green-600" />
                              <span className="font-semibold">Coach Feedback</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-4 h-4 ${i < log.coach_feedback.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{log.coach_feedback.feedback_text}</p>
                          {log.coach_feedback.celebration_notes && (
                            <div className="p-2 bg-yellow-100 rounded mb-2">
                              <p className="text-sm">🎉 <strong>Celebration:</strong> {log.coach_feedback.celebration_notes}</p>
                            </div>
                          )}
                          {log.coach_feedback.suggestions?.length > 0 && (
                            <div>
                              <p className="text-sm font-semibold mb-1">Suggestions:</p>
                              <ul className="list-disc list-inside text-sm space-y-1">
                                {log.coach_feedback.suggestions.map((suggestion, idx) => (
                                  <li key={idx}>{suggestion}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Reviewed by {log.coach_feedback.reviewed_by} on {format(new Date(log.coach_feedback.reviewed_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Provide Feedback</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Overall Rating</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      onClick={() => setFeedbackData({ ...feedbackData, rating })}
                      className="transition-transform hover:scale-110"
                    >
                      <Star className={`w-8 h-8 ${rating <= feedbackData.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Feedback *</Label>
                <Textarea
                  value={feedbackData.feedback_text}
                  onChange={(e) => setFeedbackData({ ...feedbackData, feedback_text: e.target.value })}
                  placeholder="Provide detailed feedback on their progress, effort, and areas for improvement..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Celebration Notes</Label>
                <Textarea
                  value={feedbackData.celebration_notes}
                  onChange={(e) => setFeedbackData({ ...feedbackData, celebration_notes: e.target.value })}
                  placeholder="Acknowledge their achievements and progress (e.g., 'Great job on hitting your water intake goal!')"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Suggestions</Label>
                <div className="space-y-2">
                  {feedbackData.suggestions?.map((suggestion, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input value={suggestion} readOnly className="flex-1" />
                      <Button variant="destructive" size="sm" onClick={() => removeSuggestion(idx)}>×</Button>
                    </div>
                  ))}
                  <Button variant="outline" onClick={addSuggestion} className="w-full">
                    + Add Suggestion
                  </Button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowFeedbackDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitFeedback}
                  disabled={provideFeedbackMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
                >
                  {provideFeedbackMutation.isPending ? 'Saving...' : 'Submit Feedback'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}