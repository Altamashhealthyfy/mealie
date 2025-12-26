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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Plus, Edit, CheckCircle, TrendingUp, Award, Users, AlertCircle } from "lucide-react";
import { format, differenceInDays } from "date-fns";

export default function ClientGoals() {
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [formData, setFormData] = useState({});

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list('-created_date');
      if (user?.user_type === 'super_admin') return allClients;
      return allClients.filter(c => c.created_by === user?.email);
    },
    enabled: !!user,
  });

  const { data: allGoals = [] } = useQuery({
    queryKey: ['allGoals'],
    queryFn: () => base44.entities.Goal.list('-created_date'),
    initialData: [],
  });

  const saveGoalMutation = useMutation({
    mutationFn: (data) => {
      if (editingGoal) {
        return base44.entities.Goal.update(editingGoal.id, data);
      }
      return base44.entities.Goal.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allGoals']);
      setShowDialog(false);
      setEditingGoal(null);
      alert('✅ Goal saved!');
    },
  });

  const updateProgressMutation = useMutation({
    mutationFn: ({ id, current_value, progress_percentage }) => 
      base44.entities.Goal.update(id, { current_value, progress_percentage }),
    onSuccess: () => {
      queryClient.invalidateQueries(['allGoals']);
    },
  });

  const handleSuggestGoal = (client) => {
    setSelectedClient(client.id);
    setFormData({
      client_id: client.id,
      goal_type: 'weight_loss',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      status: 'active',
      priority: 'medium',
      created_by_coach: true,
      coach_approved: true,
    });
    setShowDialog(true);
  };

  const handleEditGoal = (goal) => {
    setEditingGoal(goal);
    setFormData(goal);
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!formData.title || !formData.target_value || !formData.target_date) {
      alert('Please fill required fields');
      return;
    }
    saveGoalMutation.mutate(formData);
  };

  const handleUpdateProgress = (goal, newValue) => {
    const target = goal.target_value;
    const start = 0;
    const progress = Math.min(100, Math.max(0, ((newValue - start) / (target - start)) * 100));
    
    updateProgressMutation.mutate({
      id: goal.id,
      current_value: newValue,
      progress_percentage: Math.round(progress),
    });
  };

  const clientsWithGoals = clients.map(client => {
    const clientGoals = allGoals.filter(g => g.client_id === client.id);
    const activeGoals = clientGoals.filter(g => g.status === 'active');
    const completedGoals = clientGoals.filter(g => g.status === 'completed');
    const avgProgress = activeGoals.length > 0
      ? activeGoals.reduce((sum, g) => sum + (g.progress_percentage || 0), 0) / activeGoals.length
      : 0;
    
    return {
      ...client,
      totalGoals: clientGoals.length,
      activeGoals: activeGoals.length,
      completedGoals: completedGoals.length,
      avgProgress,
      goals: clientGoals,
    };
  });

  const atRiskClients = clientsWithGoals.filter(c => c.activeGoals > 0 && c.avgProgress < 30);
  const excellingClients = clientsWithGoals.filter(c => c.activeGoals > 0 && c.avgProgress >= 70);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Client Goals</h1>
            <p className="text-gray-600">Monitor and manage client goal progress</p>
          </div>
          <Target className="w-12 h-12 text-orange-500" />
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Users className="w-10 h-10 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Clients with Goals</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {clientsWithGoals.filter(c => c.totalGoals > 0).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Award className="w-10 h-10 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Excelling</p>
                  <p className="text-3xl font-bold text-green-600">{excellingClients.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-10 h-10 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">At Risk</p>
                  <p className="text-3xl font-bold text-orange-600">{atRiskClients.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Target className="w-10 h-10 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Active Goals</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {clientsWithGoals.reduce((sum, c) => sum + c.activeGoals, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid grid-cols-3 bg-white/80 backdrop-blur">
            <TabsTrigger value="all">All Clients</TabsTrigger>
            <TabsTrigger value="excelling">Excelling ({excellingClients.length})</TabsTrigger>
            <TabsTrigger value="atrisk">At Risk ({atRiskClients.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle>All Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clientsWithGoals.map(client => (
                    <div key={client.id} className="p-4 border-2 border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{client.full_name}</h3>
                          <div className="flex gap-3 text-sm text-gray-600 mt-1">
                            <span>Active: {client.activeGoals}</span>
                            <span>Completed: {client.completedGoals}</span>
                            <span>Avg Progress: {Math.round(client.avgProgress)}%</span>
                          </div>
                        </div>
                        <Button onClick={() => handleSuggestGoal(client)} size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Suggest Goal
                        </Button>
                      </div>

                      {client.goals.filter(g => g.status === 'active').map(goal => (
                        <div key={goal.id} className="mt-3 p-3 bg-gray-50 rounded">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{goal.title}</p>
                              <p className="text-sm text-gray-600">
                                Target: {goal.target_value} {goal.unit} | Current: {goal.current_value || 0} {goal.unit}
                              </p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => handleEditGoal(goal)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                          <Progress value={goal.progress_percentage || 0} className="h-2" />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="excelling">
            <Card className="border-none shadow-xl bg-green-50">
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-6 h-6" />
                  Excelling Clients
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {excellingClients.map(client => (
                  <div key={client.id} className="mb-4 p-4 bg-white rounded-lg border-2 border-green-200">
                    <h3 className="font-bold text-gray-900 mb-2">{client.full_name}</h3>
                    <p className="text-sm text-green-700">Average Progress: {Math.round(client.avgProgress)}%</p>
                    <Progress value={client.avgProgress} className="mt-2 h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="atrisk">
            <Card className="border-none shadow-xl bg-orange-50">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-6 h-6" />
                  Clients At Risk
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {atRiskClients.map(client => (
                  <div key={client.id} className="mb-4 p-4 bg-white rounded-lg border-2 border-orange-200">
                    <h3 className="font-bold text-gray-900 mb-2">{client.full_name}</h3>
                    <p className="text-sm text-orange-700">Average Progress: {Math.round(client.avgProgress)}%</p>
                    <Progress value={client.avgProgress} className="mt-2 h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Goal Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingGoal ? 'Edit Goal' : 'Suggest Goal'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Goal Type</Label>
                <Select value={formData.goal_type} onValueChange={(v) => setFormData({...formData, goal_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weight_loss">Weight Loss</SelectItem>
                    <SelectItem value="weight_gain">Weight Gain</SelectItem>
                    <SelectItem value="adherence">Adherence</SelectItem>
                    <SelectItem value="fitness_milestone">Fitness Milestone</SelectItem>
                    <SelectItem value="measurement">Measurement</SelectItem>
                    <SelectItem value="wellness">Wellness</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={formData.title || ''} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Value</Label>
                  <Input type="number" value={formData.target_value || ''} onChange={(e) => setFormData({...formData, target_value: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Input value={formData.unit || ''} onChange={(e) => setFormData({...formData, unit: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={formData.start_date || ''} onChange={(e) => setFormData({...formData, start_date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Target Date</Label>
                  <Input type="date" value={formData.target_date || ''} onChange={(e) => setFormData({...formData, target_date: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Coach Notes</Label>
                <Textarea value={formData.coach_notes || ''} onChange={(e) => setFormData({...formData, coach_notes: e.target.value})} rows={3} placeholder="Your recommendations..." />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleSave} disabled={saveGoalMutation.isPending} className="flex-1 bg-gradient-to-r from-orange-500 to-red-500">
                  {saveGoalMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}