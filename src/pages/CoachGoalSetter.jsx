import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Target,
  Plus,
  Edit,
  Trash2,
  Users,
  Calendar,
  TrendingUp,
  CheckCircle,
  Loader2,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function CoachGoalSetter() {
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState(null);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [goalData, setGoalData] = useState({
    goal_type: 'weight',
    status: 'active',
    priority: 'medium',
    tracking_frequency: 'daily',
    is_coach_set: true,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients } = useQuery({
    queryKey: ['myClients'],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list();
      if (user?.user_type === 'super_admin') {
        return allClients;
      }
      return allClients.filter(c => c.assigned_coach && c.assigned_coach.includes(user?.email));
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: clientGoals } = useQuery({
    queryKey: ['clientGoals', selectedClient?.id],
    queryFn: async () => {
      const goals = await base44.entities.ProgressGoal.filter({ client_id: selectedClient?.id });
      return goals.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!selectedClient,
    initialData: [],
  });

  const { data: progressLogs } = useQuery({
    queryKey: ['clientProgress', selectedClient?.id],
    queryFn: () => base44.entities.ProgressLog.filter({ client_id: selectedClient?.id }),
    enabled: !!selectedClient,
    initialData: [],
  });

  const saveGoalMutation = useMutation({
    mutationFn: async (data) => {
      if (editingGoal) {
        return await base44.entities.ProgressGoal.update(editingGoal.id, data);
      }
      return await base44.entities.ProgressGoal.create({ ...data, client_id: selectedClient.id });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['clientGoals'] });
      
      // Notify client
      if (selectedClient && !editingGoal) {
        await base44.entities.Notification.create({
          user_email: selectedClient.email,
          type: 'goal_set',
          title: '🎯 New Goal Set by Your Coach',
          message: `Your coach has set a new goal: "${goalData.title}"`,
          priority: 'high',
          link: '/ProgressTracking',
          read: false
        });
      }
      
      setShowGoalDialog(false);
      setEditingGoal(null);
      setGoalData({
        goal_type: 'weight',
        status: 'active',
        priority: 'medium',
        tracking_frequency: 'daily',
        is_coach_set: true,
      });
      toast.success(editingGoal ? "Goal updated!" : "Goal set successfully!");
    },
    onError: (error) => {
      toast.error("Failed to save goal: " + error.message);
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (id) => base44.entities.ProgressGoal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientGoals'] });
      toast.success("Goal deleted");
    },
  });

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
      metric_key: goal.metric_key,
      tracking_frequency: goal.tracking_frequency || 'daily',
      is_coach_set: true,
      milestone_alerts: goal.milestone_alerts || []
    });
    setShowGoalDialog(true);
  };

  const handleDeleteGoal = (goalId) => {
    if (window.confirm('Delete this goal?')) {
      deleteGoalMutation.mutate(goalId);
    }
  };

  const latestLog = progressLogs.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const activeGoals = clientGoals.filter(g => g.status === 'active');

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Target className="w-8 h-8 text-orange-500" />
            Client Goal Manager
          </h1>
          <p className="text-gray-600 mt-2">Set and track custom goals for your clients</p>
        </div>

        {/* Client Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-500" />
              Select Client
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedClient?.id || ''}
              onValueChange={(value) => setSelectedClient(clients.find(c => c.id === value))}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Choose a client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.full_name} • {client.goal?.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedClient && (
          <>
            {/* Client Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-600">Current Weight</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-gray-900">{latestLog?.weight || selectedClient.weight || '-'}</p>
                  <p className="text-xs text-gray-500">kg</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-600">Target Weight</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-purple-600">{selectedClient.target_weight || '-'}</p>
                  <p className="text-xs text-gray-500">kg</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-600">Active Goals</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">{activeGoals.length}</p>
                  <p className="text-xs text-gray-500">in progress</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-600">Recent Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-blue-600">{progressLogs.length}</p>
                  <p className="text-xs text-gray-500">total entries</p>
                </CardContent>
              </Card>
            </div>

            {/* Set New Goal */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Client Goals</CardTitle>
                    <CardDescription>Custom tracking goals for {selectedClient.full_name}</CardDescription>
                  </div>
                  <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
                    <DialogTrigger asChild>
                      <Button
                        onClick={() => {
                          setEditingGoal(null);
                          setGoalData({
                            goal_type: 'weight',
                            status: 'active',
                            priority: 'medium',
                            tracking_frequency: 'daily',
                            is_coach_set: true,
                          });
                        }}
                        className="bg-gradient-to-r from-orange-500 to-red-500"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Set New Goal
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{editingGoal ? 'Edit Goal' : 'Set New Goal'}</DialogTitle>
                        <DialogDescription>
                          Create a custom tracking goal for {selectedClient.full_name}
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label>Goal Type</Label>
                          <Select value={goalData.goal_type} onValueChange={(value) => setGoalData({...goalData, goal_type: value})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="weight">Weight Goal</SelectItem>
                              <SelectItem value="body_measurement">Body Measurement</SelectItem>
                              <SelectItem value="wellness">Wellness Metric (energy, sleep, etc.)</SelectItem>
                              <SelectItem value="habit">Habit/Behavior Goal</SelectItem>
                              <SelectItem value="custom">Custom Metric</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Goal Title *</Label>
                          <Input
                            value={goalData.title || ''}
                            onChange={(e) => setGoalData({...goalData, title: e.target.value})}
                            placeholder="e.g., Reduce waist by 5cm, Sleep 7+ hours daily"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            value={goalData.description || ''}
                            onChange={(e) => setGoalData({...goalData, description: e.target.value})}
                            placeholder="Why this goal matters and how to achieve it..."
                            rows={3}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Start Value</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={goalData.start_value || ''}
                              onChange={(e) => setGoalData({...goalData, start_value: parseFloat(e.target.value)})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Current Value</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={goalData.current_value || ''}
                              onChange={(e) => setGoalData({...goalData, current_value: parseFloat(e.target.value)})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Target Value *</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={goalData.target_value || ''}
                              onChange={(e) => setGoalData({...goalData, target_value: parseFloat(e.target.value)})}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Unit</Label>
                            <Input
                              value={goalData.unit || ''}
                              onChange={(e) => setGoalData({...goalData, unit: e.target.value})}
                              placeholder="kg, cm, hours, days"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Target Date</Label>
                            <Input
                              type="date"
                              value={goalData.target_date || ''}
                              onChange={(e) => setGoalData({...goalData, target_date: e.target.value})}
                              min={format(new Date(), 'yyyy-MM-dd')}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Tracking Frequency</Label>
                            <Select
                              value={goalData.tracking_frequency}
                              onValueChange={(value) => setGoalData({...goalData, tracking_frequency: value})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Priority</Label>
                            <Select
                              value={goalData.priority}
                              onValueChange={(value) => setGoalData({...goalData, priority: value})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {goalData.goal_type === 'custom' && (
                          <div className="space-y-2">
                            <Label>Metric Key *</Label>
                            <Input
                              value={goalData.metric_key || ''}
                              onChange={(e) => setGoalData({...goalData, metric_key: e.target.value})}
                              placeholder="e.g., blood_sugar, steps, protein_intake"
                            />
                            <p className="text-xs text-gray-500">
                              Unique identifier for this custom metric in progress logs
                            </p>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>Coach Notes</Label>
                          <Textarea
                            value={goalData.notes || ''}
                            onChange={(e) => setGoalData({...goalData, notes: e.target.value})}
                            placeholder="Additional guidance or context for the client..."
                            rows={2}
                          />
                        </div>

                        <div className="flex gap-3 pt-4">
                          <Button variant="outline" onClick={() => setShowGoalDialog(false)} className="flex-1">
                            Cancel
                          </Button>
                          <Button
                            onClick={() => saveGoalMutation.mutate(goalData)}
                            disabled={saveGoalMutation.isPending || !goalData.title || !goalData.target_value}
                            className="flex-1 bg-gradient-to-r from-orange-500 to-red-500"
                          >
                            {saveGoalMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                {editingGoal ? 'Update Goal' : 'Set Goal'}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {clientGoals.length === 0 ? (
                  <div className="text-center py-12">
                    <Target className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-600 mb-4">No goals set yet</p>
                    <Button onClick={() => setShowGoalDialog(true)} className="bg-gradient-to-r from-orange-500 to-red-500">
                      <Plus className="w-4 h-4 mr-2" />
                      Set First Goal
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clientGoals.map(goal => {
                      const progress = goal.start_value && goal.target_value
                        ? ((goal.current_value - goal.start_value) / (goal.target_value - goal.start_value)) * 100
                        : 0;
                      const isComplete = goal.status === 'completed' || progress >= 100;

                      return (
                        <Card key={goal.id} className={`${isComplete ? 'bg-green-50 border-green-300' : ''}`}>
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <CardTitle className="text-lg flex items-center gap-2">
                                  {goal.title}
                                  {goal.is_coach_set && (
                                    <Badge variant="outline" className="text-xs">
                                      Coach Set
                                    </Badge>
                                  )}
                                </CardTitle>
                                <CardDescription className="mt-1">{goal.description}</CardDescription>
                              </div>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleEditGoal(goal)}>
                                  <Edit className="w-4 h-4 text-blue-600" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteGoal(goal.id)}>
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Progress:</span>
                              <Badge variant={isComplete ? "default" : "secondary"} className="bg-green-600 text-white">
                                {Math.min(Math.max(progress, 0), 100).toFixed(0)}%
                              </Badge>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className="bg-gradient-to-r from-orange-500 to-red-500 h-3 rounded-full transition-all"
                                style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>Start: {goal.start_value} {goal.unit}</span>
                              <span>Current: {goal.current_value || '-'} {goal.unit}</span>
                              <span>Target: {goal.target_value} {goal.unit}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs pt-2 border-t">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {goal.target_date ? format(new Date(goal.target_date), 'MMM d, yyyy') : 'No deadline'}
                              </span>
                              <Badge variant="outline" className="capitalize">
                                {goal.tracking_frequency}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!selectedClient && (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">Select a client to manage their goals</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}