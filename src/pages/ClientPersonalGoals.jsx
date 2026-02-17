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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, Plus, Edit, Trash2, CheckCircle, Trophy, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ClientPersonalGoals() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    goal_type: 'weight',
    title: '',
    description: '',
    target_value: '',
    current_value: '',
    start_value: '',
    unit: 'kg',
    target_date: '',
    priority: 'medium',
    points_reward: 100,
    auto_track: true
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['myClientProfile', user?.email],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ email: user?.email });
      return clients[0];
    },
    enabled: !!user
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['myGoals', clientProfile?.id],
    queryFn: () => base44.entities.ProgressGoal.filter({ 
      client_id: clientProfile?.id,
      is_coach_set: false
    }),
    enabled: !!clientProfile
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProgressGoal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['myGoals']);
      toast.success("Goal created! Let's achieve it! 🎯");
      resetForm();
      setDialogOpen(false);
    },
    onError: () => toast.error("Failed to create goal")
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProgressGoal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['myGoals']);
      toast.success("Goal updated!");
      resetForm();
      setDialogOpen(false);
    },
    onError: () => toast.error("Failed to update goal")
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProgressGoal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['myGoals']);
      toast.success("Goal deleted");
    },
    onError: () => toast.error("Failed to delete goal")
  });

  const resetForm = () => {
    setFormData({
      goal_type: 'weight',
      title: '',
      description: '',
      target_value: '',
      current_value: '',
      start_value: '',
      unit: 'kg',
      target_date: '',
      priority: 'medium',
      points_reward: 100,
      auto_track: true
    });
    setEditingGoal(null);
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setFormData({
      goal_type: goal.goal_type,
      title: goal.title,
      description: goal.description || '',
      target_value: goal.target_value,
      current_value: goal.current_value || '',
      start_value: goal.start_value || '',
      unit: goal.unit || 'kg',
      target_date: goal.target_date || '',
      priority: goal.priority,
      points_reward: goal.points_reward || 100,
      auto_track: goal.auto_track !== false
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const data = {
      ...formData,
      client_id: clientProfile.id,
      target_value: parseFloat(formData.target_value),
      current_value: formData.current_value ? parseFloat(formData.current_value) : parseFloat(formData.start_value || 0),
      start_value: formData.start_value ? parseFloat(formData.start_value) : parseFloat(formData.current_value || 0),
      is_coach_set: false
    };

    if (editingGoal) {
      updateMutation.mutate({ id: editingGoal.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const calculateProgress = (goal) => {
    if (!goal.current_value || !goal.start_value || !goal.target_value) return 0;
    const total = Math.abs(goal.target_value - goal.start_value);
    const current = Math.abs(goal.current_value - goal.start_value);
    return Math.min(100, Math.round((current / total) * 100));
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  if (!clientProfile) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Target className="w-8 h-8 text-orange-500" />
              My Personal Goals
            </h1>
            <p className="text-gray-600 mt-1">Set measurable goals and track your progress</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-500 to-red-600">
                <Plus className="w-5 h-5 mr-2" />
                New Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingGoal ? 'Edit' : 'Create'} Personal Goal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Goal Type</Label>
                    <Select value={formData.goal_type} onValueChange={(value) => setFormData({ ...formData, goal_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weight">Weight</SelectItem>
                        <SelectItem value="body_measurement">Body Measurement</SelectItem>
                        <SelectItem value="wellness">Wellness</SelectItem>
                        <SelectItem value="habit">Habit</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
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

                <div>
                  <Label>Goal Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Lose 10 kg"
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Why is this goal important to you?"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Start Value</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.start_value}
                      onChange={(e) => setFormData({ ...formData, start_value: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Target Value</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.target_value}
                      onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Input
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="kg, cm, days"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Target Date</Label>
                    <Input
                      type="date"
                      value={formData.target_date}
                      onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Reward Points</Label>
                    <Input
                      type="number"
                      value={formData.points_reward}
                      onChange={(e) => setFormData({ ...formData, points_reward: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <Button onClick={handleSubmit} className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingGoal ? 'Update Goal' : 'Create Goal'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Active Goals ({activeGoals.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeGoals.map(goal => {
                const progress = calculateProgress(goal);
                return (
                  <Card key={goal.id} className="border-blue-200">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{goal.title}</h3>
                          {goal.description && <p className="text-sm text-gray-600 mt-1">{goal.description}</p>}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(goal)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600" onClick={() => deleteMutation.mutate(goal.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span className="font-bold">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Start: {goal.start_value} {goal.unit}</span>
                          <span>Current: {goal.current_value} {goal.unit}</span>
                          <span>Target: {goal.target_value} {goal.unit}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className={`${
                          goal.priority === 'high' ? 'bg-red-600' :
                          goal.priority === 'medium' ? 'bg-yellow-600' :
                          'bg-green-600'
                        }`}>
                          {goal.priority} priority
                        </Badge>
                        {goal.points_reward && (
                          <Badge className="bg-orange-500">
                            <Trophy className="w-3 h-3 mr-1" />
                            {goal.points_reward} pts
                          </Badge>
                        )}
                        {goal.target_date && (
                          <Badge variant="outline">
                            Due: {format(new Date(goal.target_date), 'MMM d')}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {activeGoals.length === 0 && (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No active goals</p>
                  <p className="text-gray-400 text-sm mt-1">Create your first goal to get started!</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Completed Goals ({completedGoals.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {completedGoals.map(goal => (
                <Card key={goal.id} className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{goal.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Achieved: {goal.target_value} {goal.unit}
                        </p>
                        {goal.completed_date && (
                          <p className="text-xs text-gray-500 mt-1">
                            Completed on {format(new Date(goal.completed_date), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
              ))}
              {completedGoals.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No completed goals yet</p>
                  <p className="text-gray-400 text-sm mt-1">Complete your first goal!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}