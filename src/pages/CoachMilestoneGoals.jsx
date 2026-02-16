import { useState } from "react";
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
import { Target, Plus, TrendingUp, CheckCircle, Flag, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function CoachMilestoneGoals() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [goalData, setGoalData] = useState({
    title: '',
    description: '',
    goal_type: 'weight',
    start_value: 0,
    current_value: 0,
    target_value: 0,
    unit: 'kg',
    target_date: '',
    priority: 'medium',
    milestones: []
  });
  const [milestoneInput, setMilestoneInput] = useState({ percentage: 25, message: '' });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      if (user?.user_type === 'super_admin') {
        return await base44.entities.Client.list();
      } else {
        return await base44.entities.Client.filter({ assigned_coach: user?.email });
      }
    },
    enabled: !!user
  });

  const { data: allGoals = [] } = useQuery({
    queryKey: ['allClientGoals'],
    queryFn: async () => {
      const clientIds = clients.map(c => c.id);
      const goalsPromises = clientIds.map(id => 
        base44.entities.ProgressGoal.filter({ client_id: id, is_coach_set: true })
      );
      const results = await Promise.all(goalsPromises);
      return results.flat();
    },
    enabled: clients.length > 0
  });

  const createGoalMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.ProgressGoal.create({
        ...data,
        is_coach_set: true,
        status: 'active'
      });
    },
    onSuccess: async (goal) => {
      queryClient.invalidateQueries({ queryKey: ['allClientGoals'] });
      
      // Send notification to client
      const client = clients.find(c => c.id === selectedClient);
      if (client) {
        await base44.entities.Notification.create({
          user_email: client.email,
          type: 'goal',
          title: '🎯 New Goal Set!',
          message: `Your coach set a new goal: "${goal.title}". Check your progress!`,
          priority: 'high',
          link: '/ProgressTracking',
          read: false
        });
      }
      
      setShowDialog(false);
      resetForm();
      toast.success("Goal created successfully!");
    }
  });

  const addMilestone = () => {
    if (!milestoneInput.percentage || !milestoneInput.message) {
      toast.error("Please enter milestone percentage and message");
      return;
    }
    
    setGoalData({
      ...goalData,
      milestone_alerts: [
        ...(goalData.milestone_alerts || []),
        { ...milestoneInput, triggered: false }
      ].sort((a, b) => a.percentage - b.percentage)
    });
    
    setMilestoneInput({ percentage: 25, message: '' });
  };

  const removeMilestone = (index) => {
    setGoalData({
      ...goalData,
      milestone_alerts: goalData.milestone_alerts.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedClient) {
      toast.error("Please select a client");
      return;
    }

    createGoalMutation.mutate({
      client_id: selectedClient,
      ...goalData
    });
  };

  const resetForm = () => {
    setSelectedClient('');
    setGoalData({
      title: '',
      description: '',
      goal_type: 'weight',
      start_value: 0,
      current_value: 0,
      target_value: 0,
      unit: 'kg',
      target_date: '',
      priority: 'medium',
      milestone_alerts: []
    });
  };

  const getClientName = (clientId) => {
    return clients.find(c => c.id === clientId)?.full_name || 'Unknown';
  };

  const calculateProgress = (goal) => {
    if (!goal.start_value || !goal.target_value) return 0;
    return Math.round(((goal.current_value - goal.start_value) / (goal.target_value - goal.start_value)) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Target className="w-8 h-8 text-orange-500" />
              Milestone Goals Manager
            </h1>
            <p className="text-gray-600 mt-1">Set and track client milestone goals with automated progress</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Milestone Goal</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Select Client</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.full_name} - {client.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Goal Title</Label>
                  <Input
                    placeholder="e.g., Reach Target Weight"
                    value={goalData.title}
                    onChange={(e) => setGoalData({...goalData, title: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Details about this goal..."
                    value={goalData.description}
                    onChange={(e) => setGoalData({...goalData, description: e.target.value})}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Goal Type</Label>
                    <Select
                      value={goalData.goal_type}
                      onValueChange={(value) => setGoalData({...goalData, goal_type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weight">Weight</SelectItem>
                        <SelectItem value="body_measurement">Body Measurement</SelectItem>
                        <SelectItem value="wellness">Wellness Metric</SelectItem>
                        <SelectItem value="habit">Habit Formation</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
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

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label>Start Value</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={goalData.start_value}
                      onChange={(e) => setGoalData({...goalData, start_value: parseFloat(e.target.value), current_value: parseFloat(e.target.value)})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Target Value</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={goalData.target_value}
                      onChange={(e) => setGoalData({...goalData, target_value: parseFloat(e.target.value)})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Input
                      placeholder="kg, cm, days"
                      value={goalData.unit}
                      onChange={(e) => setGoalData({...goalData, unit: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Target Date</Label>
                    <Input
                      type="date"
                      value={goalData.target_date}
                      onChange={(e) => setGoalData({...goalData, target_date: e.target.value})}
                    />
                  </div>
                </div>

                {/* Milestones */}
                <div className="space-y-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <Label className="text-purple-900">Add Milestones (Optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="%"
                      min="1"
                      max="99"
                      value={milestoneInput.percentage}
                      onChange={(e) => setMilestoneInput({...milestoneInput, percentage: parseInt(e.target.value)})}
                      className="w-20"
                    />
                    <Input
                      placeholder="Milestone message..."
                      value={milestoneInput.message}
                      onChange={(e) => setMilestoneInput({...milestoneInput, message: e.target.value})}
                      className="flex-1"
                    />
                    <Button type="button" onClick={addMilestone} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {goalData.milestone_alerts?.length > 0 && (
                    <div className="space-y-2">
                      {goalData.milestone_alerts.map((milestone, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border">
                          <div className="flex items-center gap-2">
                            <Flag className="w-4 h-4 text-purple-600" />
                            <span className="text-sm font-semibold">{milestone.percentage}%</span>
                            <span className="text-sm text-gray-600">{milestone.message}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMilestone(idx)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createGoalMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-500"
                  >
                    {createGoalMutation.isPending ? 'Creating...' : 'Create Goal'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Goals List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allGoals.map(goal => {
            const progress = calculateProgress(goal);
            return (
              <Card key={goal.id} className="border-2 border-purple-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{goal.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">{getClientName(goal.client_id)}</span>
                      </div>
                    </div>
                    <Badge className={
                      goal.status === 'completed' ? 'bg-green-500' :
                      goal.priority === 'high' ? 'bg-red-500' :
                      goal.priority === 'medium' ? 'bg-yellow-500' :
                      'bg-gray-500'
                    }>
                      {goal.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">{goal.description}</p>
                  
                  <div className="flex justify-between text-sm">
                    <span>Current: {goal.current_value} {goal.unit}</span>
                    <span>Target: {goal.target_value} {goal.unit}</span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                      />
                    </div>
                  </div>

                  {goal.milestone_alerts?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-700">Milestones:</p>
                      {goal.milestone_alerts.map((milestone, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          {milestone.triggered ? (
                            <CheckCircle className="w-3 h-3 text-green-600" />
                          ) : (
                            <Flag className="w-3 h-3 text-gray-400" />
                          )}
                          <span className={milestone.triggered ? 'text-green-600 font-semibold' : 'text-gray-600'}>
                            {milestone.percentage}% - {milestone.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {goal.target_date && (
                    <p className="text-xs text-gray-500">
                      Target: {format(new Date(goal.target_date), 'MMM dd, yyyy')}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {allGoals.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Target className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">No goals created yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}