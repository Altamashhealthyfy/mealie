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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, Plus, TrendingUp, CheckCircle, Clock, Edit, Trash2, Award, Calendar } from "lucide-react";
import { format, differenceInDays } from "date-fns";

export default function MyGoals() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [formData, setFormData] = useState({
    goal_type: 'weight_loss',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    status: 'active',
    priority: 'medium',
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['myClientProfile', user?.email],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ email: user.email });
      return clients[0] || null;
    },
    enabled: !!user,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['myGoals', clientProfile?.id],
    queryFn: () => base44.entities.Goal.filter({ client_id: clientProfile?.id }),
    enabled: !!clientProfile,
  });

  const saveGoalMutation = useMutation({
    mutationFn: (data) => {
      if (editingGoal) {
        return base44.entities.Goal.update(editingGoal.id, data);
      }
      return base44.entities.Goal.create({ ...data, client_id: clientProfile.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myGoals']);
      setShowDialog(false);
      setEditingGoal(null);
      setFormData({ goal_type: 'weight_loss', start_date: format(new Date(), 'yyyy-MM-dd'), status: 'active', priority: 'medium' });
      alert('✅ Goal saved successfully!');
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (id) => base44.entities.Goal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['myGoals']);
      alert('✅ Goal deleted!');
    },
  });

  const handleSubmit = () => {
    if (!formData.title || !formData.target_value || !formData.target_date) {
      alert('Please fill in all required fields');
      return;
    }

    // Calculate initial progress
    const progressData = {
      ...formData,
      current_value: formData.current_value || (formData.goal_type === 'weight_loss' ? clientProfile?.weight : 0),
      progress_percentage: 0,
    };

    saveGoalMutation.mutate(progressData);
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setFormData(goal);
    setShowDialog(true);
  };

  const handleDelete = (goal) => {
    if (confirm('Delete this goal?')) {
      deleteGoalMutation.mutate(goal.id);
    }
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  const getPriorityColor = (priority) => {
    return priority === 'high' ? 'bg-red-500' : priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500';
  };

  const getStatusIcon = (status) => {
    if (status === 'completed') return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (status === 'paused') return <Clock className="w-5 h-5 text-gray-600" />;
    return <TrendingUp className="w-5 h-5 text-blue-600" />;
  };

  if (!clientProfile) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <Target className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600">Please contact your coach to set up your profile first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Goals</h1>
            <p className="text-gray-600">Set and track your health & fitness goals</p>
          </div>
          <Button onClick={() => setShowDialog(true)} className="bg-gradient-to-r from-orange-500 to-red-500">
            <Plus className="w-4 h-4 mr-2" />
            New Goal
          </Button>
        </div>

        {/* Goal Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Target className="w-10 h-10 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Active Goals</p>
                  <p className="text-3xl font-bold text-blue-600">{activeGoals.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Award className="w-10 h-10 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{completedGoals.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-10 h-10 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Avg Progress</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {activeGoals.length > 0 
                      ? Math.round(activeGoals.reduce((sum, g) => sum + (g.progress_percentage || 0), 0) / activeGoals.length)
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Goals */}
        <Card className="border-none shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
            <CardTitle>Active Goals</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {activeGoals.length === 0 ? (
              <div className="text-center py-12">
                <Target className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Goals</h3>
                <p className="text-gray-600 mb-4">Start by setting your first goal!</p>
                <Button onClick={() => setShowDialog(true)} className="bg-gradient-to-r from-orange-500 to-red-500">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Goal
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeGoals.map(goal => {
                  const daysLeft = differenceInDays(new Date(goal.target_date), new Date());
                  return (
                    <div key={goal.id} className="p-5 border-2 border-gray-200 rounded-lg hover:border-orange-300 transition-all bg-white">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getStatusIcon(goal.status)}
                            <h3 className="text-xl font-bold text-gray-900">{goal.title}</h3>
                            <Badge className={getPriorityColor(goal.priority)}>
                              {goal.priority}
                            </Badge>
                            {goal.created_by_coach && (
                              <Badge variant="outline" className="text-purple-600 border-purple-600">
                                Coach Suggested
                              </Badge>
                            )}
                          </div>
                          {goal.description && (
                            <p className="text-gray-600 text-sm mb-3">{goal.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div>Target: <span className="font-semibold text-orange-600">{goal.target_value} {goal.unit}</span></div>
                            <div>Current: <span className="font-semibold text-blue-600">{goal.current_value || 0} {goal.unit}</span></div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(goal)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(goal)} className="text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-bold text-gray-900">{goal.progress_percentage || 0}%</span>
                        </div>
                        <Progress value={goal.progress_percentage || 0} className="h-3" />
                      </div>

                      {goal.coach_notes && (
                        <div className="mt-3 p-3 bg-purple-50 rounded border-l-4 border-purple-500">
                          <p className="text-sm font-semibold text-purple-900 mb-1">Coach's Note:</p>
                          <p className="text-sm text-gray-700">{goal.coach_notes}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <Card className="border-none shadow-xl">
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
              <CardTitle className="flex items-center gap-2">
                <Award className="w-6 h-6" />
                Completed Goals ({completedGoals.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedGoals.map(goal => (
                  <div key={goal.id} className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <h3 className="font-bold text-gray-900">{goal.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Achieved: {goal.target_value} {goal.unit}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Goal Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingGoal ? 'Edit Goal' : 'Create New Goal'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Goal Type *</Label>
                <Select value={formData.goal_type} onValueChange={(value) => setFormData({...formData, goal_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weight_loss">Weight Loss</SelectItem>
                    <SelectItem value="weight_gain">Weight Gain</SelectItem>
                    <SelectItem value="adherence">Meal Plan Adherence</SelectItem>
                    <SelectItem value="fitness_milestone">Fitness Milestone</SelectItem>
                    <SelectItem value="measurement">Body Measurement</SelectItem>
                    <SelectItem value="wellness">Wellness Goal</SelectItem>
                    <SelectItem value="custom">Custom Goal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Goal Title *</Label>
                <Input
                  value={formData.title || ''}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., Lose 10 kg"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe your goal..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Value *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.target_value || ''}
                    onChange={(e) => setFormData({...formData, target_value: parseFloat(e.target.value)})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Unit *</Label>
                  <Input
                    value={formData.unit || ''}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    placeholder="kg, %, days, etc."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Target Date *</Label>
                  <Input
                    type="date"
                    value={formData.target_date || ''}
                    onChange={(e) => setFormData({...formData, target_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
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

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={saveGoalMutation.isPending} className="flex-1 bg-gradient-to-r from-orange-500 to-red-500">
                  {saveGoalMutation.isPending ? 'Saving...' : 'Save Goal'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}