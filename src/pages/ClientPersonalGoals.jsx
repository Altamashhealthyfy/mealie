import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Target, Plus, Edit, Trash2, CheckCircle, Trophy, TrendingUp, Droplets,
  Footprints, Brain, Dumbbell, Heart, Moon, Apple, Zap, Clock, Calendar,
  BarChart2, RefreshCw, Star, Flame
} from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, isPast } from "date-fns";

const GOAL_TEMPLATES = [
  { icon: "💧", title: "Drink 2L water daily", goal_type: "wellness", target_value: 2, unit: "liters/day", metric_key: "water_intake", auto_track: true, tracking_frequency: "daily", points_reward: 150 },
  { icon: "🚶", title: "Walk 10,000 steps daily", goal_type: "wellness", target_value: 10000, unit: "steps/day", metric_key: "steps", auto_track: false, tracking_frequency: "daily", points_reward: 200 },
  { icon: "🧘", title: "Meditate 5 times a week", goal_type: "habit", target_value: 5, unit: "sessions/week", metric_key: "meditation", auto_track: false, tracking_frequency: "weekly", points_reward: 120 },
  { icon: "😴", title: "Sleep 8 hours daily", goal_type: "wellness", target_value: 8, unit: "hours/day", metric_key: "sleep_hours", auto_track: true, tracking_frequency: "daily", points_reward: 100 },
  { icon: "🏋️", title: "Exercise 30 min daily", goal_type: "wellness", target_value: 30, unit: "min/day", metric_key: "exercise_minutes", auto_track: true, tracking_frequency: "daily", points_reward: 180 },
  { icon: "🥗", title: "Eat 5 servings of vegetables", goal_type: "habit", target_value: 5, unit: "servings/day", metric_key: "vegetables", auto_track: false, tracking_frequency: "daily", points_reward: 120 },
  { icon: "⚖️", title: "Lose 5 kg", goal_type: "weight", target_value: 5, unit: "kg lost", metric_key: "weight", auto_track: true, tracking_frequency: "weekly", points_reward: 500 },
  { icon: "📵", title: "Screen-free 1 hour before bed", goal_type: "habit", target_value: 30, unit: "days", metric_key: "screen_free", auto_track: false, tracking_frequency: "daily", points_reward: 150 },
];

const GOAL_TYPE_CONFIG = {
  weight: { label: "Weight", color: "blue", icon: "⚖️" },
  body_measurement: { label: "Body Measurement", color: "purple", icon: "📏" },
  wellness: { label: "Wellness", color: "green", icon: "💚" },
  habit: { label: "Habit", color: "orange", icon: "🔁" },
  custom: { label: "Custom", color: "gray", icon: "✨" },
};

const AUTO_TRACK_FIELDS = {
  water_intake: "Water Intake (from progress logs)",
  sleep_hours: "Sleep Hours (from progress logs)",
  exercise_minutes: "Exercise Minutes (from progress logs)",
  weight: "Weight (from progress logs)",
  meal_adherence: "Meal Adherence % (from progress logs)",
};

const DEFAULT_FORM = {
  goal_type: "wellness",
  title: "",
  description: "",
  target_value: "",
  current_value: "",
  start_value: "0",
  unit: "",
  target_date: "",
  priority: "medium",
  tracking_frequency: "daily",
  points_reward: 100,
  auto_track: false,
  metric_key: "",
};

export default function ClientPersonalGoals({ embedded = false, clientProfile: propClientProfile } = {}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [logDialogGoal, setLogDialogGoal] = useState(null);
  const [logValue, setLogValue] = useState("");
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me(), enabled: !propClientProfile });

  const { data: fetchedProfile } = useQuery({
    queryKey: ["myClientProfile", user?.email],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ email: user?.email });
      return clients[0];
    },
    enabled: !!user && !propClientProfile,
  });

  const clientProfile = propClientProfile || fetchedProfile;

  const { data: goals = [] } = useQuery({
    queryKey: ["myPersonalGoals", clientProfile?.id],
    queryFn: () => base44.entities.ProgressGoal.filter({ client_id: clientProfile?.id, is_coach_set: false }),
    enabled: !!clientProfile,
  });

  const { data: recentLogs = [] } = useQuery({
    queryKey: ["myRecentProgressLogs", clientProfile?.id],
    queryFn: () => base44.entities.ProgressLog.filter({ client_id: clientProfile?.id }, "-date", 30),
    enabled: !!clientProfile,
  });

  const { data: gamificationPoints } = useQuery({
    queryKey: ["myGamificationPoints", clientProfile?.id],
    queryFn: async () => {
      const pts = await base44.entities.GamificationPoints.filter({ client_id: clientProfile?.id });
      return pts[0];
    },
    enabled: !!clientProfile,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProgressGoal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["myPersonalGoals"]);
      toast.success("Goal created! 🎯 Let's crush it!");
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProgressGoal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["myPersonalGoals"]);
      toast.success("Goal updated!");
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProgressGoal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["myPersonalGoals"]);
      toast.success("Goal removed");
    },
  });

  const logProgressMutation = useMutation({
    mutationFn: async ({ goal, value }) => {
      const newCurrent = parseFloat(value);
      const isComplete = newCurrent >= goal.target_value;
      const updates = { current_value: newCurrent };
      if (isComplete) {
        updates.status = "completed";
        updates.completed_date = format(new Date(), "yyyy-MM-dd");
        // Award points
        if (goal.points_reward && gamificationPoints) {
          await base44.entities.GamificationPoints.update(gamificationPoints.id, {
            total_points: (gamificationPoints.total_points || 0) + goal.points_reward,
            available_points: (gamificationPoints.available_points || 0) + goal.points_reward,
          });
        }
      }
      return base44.entities.ProgressGoal.update(goal.id, updates);
    },
    onSuccess: (_, { goal }) => {
      queryClient.invalidateQueries(["myPersonalGoals"]);
      queryClient.invalidateQueries(["myGamificationPoints"]);
      const isComplete = parseFloat(logValue) >= goal.target_value;
      if (isComplete) {
        toast.success(`🏆 Goal completed! +${goal.points_reward} points earned!`);
      } else {
        toast.success("Progress logged! Keep going! 💪");
      }
      setLogDialogGoal(null);
      setLogValue("");
    },
  });

  const syncFromLogs = (goal) => {
    if (!goal.metric_key || !goal.auto_track) return;
    const latestLog = recentLogs[0];
    if (!latestLog) { toast.error("No recent progress logs found"); return; }
    const fieldMap = {
      water_intake: latestLog.wellness_metrics?.water_intake,
      sleep_hours: latestLog.wellness_metrics?.sleep_hours,
      exercise_minutes: latestLog.wellness_metrics?.exercise_minutes,
      weight: latestLog.weight,
      meal_adherence: latestLog.meal_adherence,
    };
    const value = fieldMap[goal.metric_key];
    if (value !== undefined && value !== null) {
      updateMutation.mutate({ id: goal.id, data: { current_value: value } });
      toast.success(`Synced from latest log: ${value} ${goal.unit}`);
    } else {
      toast.error("No matching data found in recent logs");
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingGoal(null);
    setFormData(DEFAULT_FORM);
    setShowTemplates(false);
  };

  const applyTemplate = (tmpl) => {
    setFormData({
      ...DEFAULT_FORM,
      ...tmpl,
      title: tmpl.title,
      start_value: "0",
      current_value: "0",
      description: "",
      target_date: "",
      priority: "medium",
    });
    setShowTemplates(false);
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setFormData({
      goal_type: goal.goal_type || "wellness",
      title: goal.title || "",
      description: goal.description || "",
      target_value: goal.target_value || "",
      current_value: goal.current_value || "",
      start_value: goal.start_value ?? "0",
      unit: goal.unit || "",
      target_date: goal.target_date || "",
      priority: goal.priority || "medium",
      tracking_frequency: goal.tracking_frequency || "daily",
      points_reward: goal.points_reward || 100,
      auto_track: goal.auto_track || false,
      metric_key: goal.metric_key || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.target_value) {
      toast.error("Please fill in goal title and target value");
      return;
    }
    const data = {
      ...formData,
      client_id: clientProfile.id,
      target_value: parseFloat(formData.target_value),
      current_value: parseFloat(formData.current_value || formData.start_value || 0),
      start_value: parseFloat(formData.start_value || 0),
      points_reward: parseInt(formData.points_reward || 100),
      is_coach_set: false,
      status: "active",
    };
    if (editingGoal) {
      updateMutation.mutate({ id: editingGoal.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const calculateProgress = (goal) => {
    const start = goal.start_value ?? 0;
    const current = goal.current_value ?? start;
    const target = goal.target_value;
    if (target === start) return 0;
    return Math.min(100, Math.max(0, Math.round(((current - start) / (target - start)) * 100)));
  };

  const activeGoals = goals.filter((g) => g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");

  if (!clientProfile) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className={embedded ? "space-y-6" : "min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-4 md:p-6"}>
      <div className={embedded ? "space-y-6" : "max-w-6xl mx-auto space-y-6"}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            {!embedded && (
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Target className="w-8 h-8 text-orange-500" />
                My Personal Goals
              </h1>
            )}
            <p className="text-gray-600 mt-1">Create measurable goals and earn points upon completion</p>
          </div>
          <Button
            onClick={() => { setShowTemplates(true); setDialogOpen(true); }}
            className="bg-gradient-to-r from-orange-500 to-red-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" /> New Goal
          </Button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Active Goals", value: activeGoals.length, icon: <Flame className="w-5 h-5 text-orange-500" />, bg: "bg-orange-50 border-orange-200" },
            { label: "Completed", value: completedGoals.length, icon: <CheckCircle className="w-5 h-5 text-green-500" />, bg: "bg-green-50 border-green-200" },
            { label: "Points Available", value: gamificationPoints?.total_points || 0, icon: <Star className="w-5 h-5 text-yellow-500" />, bg: "bg-yellow-50 border-yellow-200" },
          ].map((s) => (
            <Card key={s.label} className={`border ${s.bg}`}>
              <CardContent className="p-4 flex items-center gap-3">
                {s.icon}
                <div>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-600">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Active Goals */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" /> Active Goals
            <Badge className="bg-blue-100 text-blue-700">{activeGoals.length}</Badge>
          </h2>
          {activeGoals.length === 0 ? (
            <Card className="border-dashed border-2 border-gray-200">
              <CardContent className="p-10 text-center">
                <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No active goals yet</p>
                <p className="text-gray-400 text-sm mt-1 mb-4">Start by creating a goal or pick from our templates!</p>
                <Button onClick={() => { setShowTemplates(true); setDialogOpen(true); }} variant="outline">
                  <Plus className="w-4 h-4 mr-2" /> Create First Goal
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeGoals.map((goal) => {
                const progress = calculateProgress(goal);
                const daysLeft = goal.target_date ? differenceInDays(new Date(goal.target_date), new Date()) : null;
                const isOverdue = daysLeft !== null && daysLeft < 0;
                const cfg = GOAL_TYPE_CONFIG[goal.goal_type] || GOAL_TYPE_CONFIG.custom;
                return (
                  <Card key={goal.id} className={`border-l-4 ${
                    progress >= 100 ? "border-l-green-500" : isOverdue ? "border-l-red-400" : "border-l-orange-400"
                  }`}>
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{cfg.icon}</span>
                            <h3 className="font-bold text-gray-900">{goal.title}</h3>
                          </div>
                          {goal.description && <p className="text-sm text-gray-500">{goal.description}</p>}
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleEdit(goal)}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-700" onClick={() => deleteMutation.mutate(goal.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-bold text-orange-600">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2.5" />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Current: <span className="font-semibold text-gray-700">{goal.current_value ?? goal.start_value ?? 0}</span></span>
                          <span>Target: <span className="font-semibold text-gray-700">{goal.target_value} {goal.unit}</span></span>
                        </div>
                      </div>

                      {/* Meta badges */}
                      <div className="flex flex-wrap gap-1.5">
                        <Badge className={`text-xs ${goal.priority === 'high' ? 'bg-red-100 text-red-700' : goal.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                          {goal.priority} priority
                        </Badge>
                        {goal.points_reward > 0 && (
                          <Badge className="bg-orange-100 text-orange-700 text-xs">
                            <Trophy className="w-3 h-3 mr-1" />{goal.points_reward} pts
                          </Badge>
                        )}
                        {goal.tracking_frequency && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />{goal.tracking_frequency}
                          </Badge>
                        )}
                        {daysLeft !== null && (
                          <Badge className={`text-xs ${isOverdue ? 'bg-red-100 text-red-700' : daysLeft <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                            <Calendar className="w-3 h-3 mr-1" />
                            {isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                          </Badge>
                        )}
                        {goal.auto_track && (
                          <Badge className="bg-purple-100 text-purple-700 text-xs">
                            <RefreshCw className="w-3 h-3 mr-1" />Auto-sync
                          </Badge>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white h-8 text-xs"
                          onClick={() => { setLogDialogGoal(goal); setLogValue(String(goal.current_value || "")); }}
                        >
                          <Zap className="w-3.5 h-3.5 mr-1" /> Log Progress
                        </Button>
                        {goal.auto_track && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-purple-300 text-purple-600 hover:bg-purple-50"
                            onClick={() => syncFromLogs(goal)}
                          >
                            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Sync
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" /> Completed Goals
              <Badge className="bg-green-100 text-green-700">{completedGoals.length}</Badge>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedGoals.map((goal) => (
                <Card key={goal.id} className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{goal.title}</p>
                      <p className="text-sm text-gray-600">{goal.target_value} {goal.unit}</p>
                      {goal.completed_date && (
                        <p className="text-xs text-green-600 font-medium mt-0.5">
                          ✅ {format(new Date(goal.completed_date), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                    {goal.points_reward > 0 && (
                      <Badge className="bg-yellow-100 text-yellow-700 flex-shrink-0">
                        <Trophy className="w-3 h-3 mr-1" />{goal.points_reward}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Goal Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGoal ? "Edit Goal" : "Create Personal Goal"}</DialogTitle>
          </DialogHeader>

          {/* Templates */}
          {showTemplates && !editingGoal && (
            <div className="space-y-3 mb-4">
              <p className="text-sm font-semibold text-gray-700">Quick-start from a template:</p>
              <div className="grid grid-cols-2 gap-2">
                {GOAL_TEMPLATES.map((tmpl, i) => (
                  <button
                    key={i}
                    onClick={() => applyTemplate(tmpl)}
                    className="text-left p-3 rounded-lg border border-orange-200 hover:bg-orange-50 transition-colors text-sm"
                  >
                    <span className="mr-2">{tmpl.icon}</span>
                    <span className="font-medium text-gray-800">{tmpl.title}</span>
                    <div className="text-xs text-gray-500 mt-0.5">{tmpl.points_reward} pts on completion</div>
                  </button>
                ))}
              </div>
              <div className="relative flex items-center gap-2">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-400">or build your own</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>
              <Button variant="ghost" size="sm" className="w-full text-gray-500" onClick={() => setShowTemplates(false)}>
                Build custom goal ↓
              </Button>
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Goal Type</Label>
                <Select value={formData.goal_type} onValueChange={(v) => setFormData({ ...formData, goal_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weight">⚖️ Weight</SelectItem>
                    <SelectItem value="body_measurement">📏 Body Measurement</SelectItem>
                    <SelectItem value="wellness">💚 Wellness</SelectItem>
                    <SelectItem value="habit">🔁 Habit</SelectItem>
                    <SelectItem value="custom">✨ Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🟢 Low</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="high">🔴 High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Goal Title *</Label>
              <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Drink 2L water daily" />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Why is this goal important to you?" rows={2} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Start Value</Label>
                <Input type="number" step="0.1" value={formData.start_value} onChange={(e) => setFormData({ ...formData, start_value: e.target.value })} placeholder="0" />
              </div>
              <div>
                <Label>Target Value *</Label>
                <Input type="number" step="0.1" value={formData.target_value} onChange={(e) => setFormData({ ...formData, target_value: e.target.value })} placeholder="10" />
              </div>
              <div>
                <Label>Unit</Label>
                <Input value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} placeholder="kg, liters, sessions" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Target Date</Label>
                <Input type="date" value={formData.target_date} onChange={(e) => setFormData({ ...formData, target_date: e.target.value })} />
              </div>
              <div>
                <Label>Tracking Frequency</Label>
                <Select value={formData.tracking_frequency} onValueChange={(v) => setFormData({ ...formData, tracking_frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Biweekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Reward Points on Completion</Label>
              <Input type="number" value={formData.points_reward} onChange={(e) => setFormData({ ...formData, points_reward: Number(e.target.value) })} min={0} max={1000} />
              <p className="text-xs text-gray-500 mt-1">Points will be added to your gamification score when you complete this goal</p>
            </div>

            {/* Auto-tracking */}
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-purple-900 text-sm">Auto-sync from progress logs</p>
                  <p className="text-xs text-purple-600">Automatically pull current value from your daily logs</p>
                </div>
                <Switch
                  checked={formData.auto_track}
                  onCheckedChange={(v) => setFormData({ ...formData, auto_track: v, metric_key: v ? formData.metric_key : "" })}
                />
              </div>
              {formData.auto_track && (
                <div>
                  <Label className="text-purple-800">Metric to track</Label>
                  <Select value={formData.metric_key} onValueChange={(v) => setFormData({ ...formData, metric_key: v })}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Select metric..." /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(AUTO_TRACK_FIELDS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingGoal ? "Update Goal" : "Create Goal 🎯"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Log Progress Dialog */}
      <Dialog open={!!logDialogGoal} onOpenChange={(open) => { if (!open) { setLogDialogGoal(null); setLogValue(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Log Progress</DialogTitle>
          </DialogHeader>
          {logDialogGoal && (
            <div className="space-y-4">
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="font-semibold text-gray-900">{logDialogGoal.title}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Current: {logDialogGoal.current_value ?? 0} → Target: {logDialogGoal.target_value} {logDialogGoal.unit}
                </p>
                <Progress value={calculateProgress(logDialogGoal)} className="h-2 mt-2" />
              </div>
              <div>
                <Label>New Current Value ({logDialogGoal.unit})</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={logValue}
                  onChange={(e) => setLogValue(e.target.value)}
                  placeholder={`Enter current value in ${logDialogGoal.unit}`}
                  className="text-lg font-bold"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {parseFloat(logValue || 0) >= logDialogGoal.target_value
                    ? "🎉 This will mark the goal as complete and award points!"
                    : `${Math.max(0, logDialogGoal.target_value - parseFloat(logValue || 0)).toFixed(1)} ${logDialogGoal.unit} remaining`}
                </p>
              </div>
              <Button
                onClick={() => logProgressMutation.mutate({ goal: logDialogGoal, value: logValue })}
                disabled={!logValue || logProgressMutation.isPending}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white"
              >
                {logProgressMutation.isPending ? "Saving..." : "Save Progress 💪"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}