import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Flame, Award, TrendingUp, Users, Plus } from "lucide-react";

export default function ClientHabits() {
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({ frequency: 'daily', category: 'custom', created_by_coach: true });

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

  const { data: allHabits = [] } = useQuery({
    queryKey: ['allHabits'],
    queryFn: () => base44.entities.Habit.list('-created_date'),
    initialData: [],
  });

  const { data: allHabitLogs = [] } = useQuery({
    queryKey: ['allHabitLogs'],
    queryFn: () => base44.entities.HabitLog.list('-date', 1000),
    initialData: [],
  });

  const createHabitMutation = useMutation({
    mutationFn: (data) => base44.entities.Habit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['allHabits']);
      setShowDialog(false);
      setFormData({ frequency: 'daily', category: 'custom', created_by_coach: true });
      alert('✅ Habit suggested!');
    },
  });

  const handleSuggestHabit = (client) => {
    setSelectedClient(client.id);
    setFormData({ 
      client_id: client.id,
      frequency: 'daily', 
      category: 'custom', 
      created_by_coach: true,
      active: true,
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!formData.title) {
      alert('Please enter habit title');
      return;
    }
    createHabitMutation.mutate(formData);
  };

  const clientsWithHabits = clients.map(client => {
    const clientHabits = allHabits.filter(h => h.client_id === client.id && h.active);
    const totalCompletions = clientHabits.reduce((sum, h) => sum + (h.total_completions || 0), 0);
    const bestStreak = Math.max(...clientHabits.map(h => h.best_streak || 0), 0);
    const avgStreak = clientHabits.length > 0
      ? clientHabits.reduce((sum, h) => sum + (h.current_streak || 0), 0) / clientHabits.length
      : 0;

    return {
      ...client,
      habits: clientHabits,
      totalCompletions,
      bestStreak,
      avgStreak,
    };
  });

  const topPerformers = clientsWithHabits
    .filter(c => c.habits.length > 0)
    .sort((a, b) => b.bestStreak - a.bestStreak)
    .slice(0, 5);

  const categoryIcons = {
    nutrition: '🥗',
    exercise: '💪',
    wellness: '🧘',
    sleep: '😴',
    mindfulness: '🧠',
    hydration: '💧',
    custom: '⭐',
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Client Habits</h1>
            <p className="text-gray-600">Monitor client consistency and suggest new habits</p>
          </div>
          <CheckCircle className="w-12 h-12 text-orange-500" />
        </div>

        {/* Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Users className="w-10 h-10 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Clients with Habits</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {clientsWithHabits.filter(c => c.habits.length > 0).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Flame className="w-10 h-10 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Longest Streak</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {Math.max(...clientsWithHabits.map(c => c.bestStreak), 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Award className="w-10 h-10 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Completions</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {clientsWithHabits.reduce((sum, c) => sum + c.totalCompletions, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-10 h-10 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Active Habits</p>
                  <p className="text-3xl font-bold text-green-600">
                    {allHabits.filter(h => h.active).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Performers */}
        {topPerformers.length > 0 && (
          <Card className="border-none shadow-xl bg-gradient-to-br from-yellow-50 to-orange-50">
            <CardHeader className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
              <CardTitle className="flex items-center gap-2">
                <Award className="w-6 h-6" />
                Top Habit Performers
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {topPerformers.map((client, idx) => (
                  <div key={client.id} className="p-4 bg-white rounded-lg border-2 border-yellow-200">
                    <div className="text-center mb-2">
                      <div className="text-3xl mb-1">{['🥇', '🥈', '🥉', '🏅', '🏅'][idx]}</div>
                      <h3 className="font-bold text-gray-900">{client.full_name}</h3>
                    </div>
                    <div className="text-center text-sm">
                      <div className="flex items-center justify-center gap-1 text-orange-600">
                        <Flame className="w-4 h-4" />
                        <span className="font-bold">{client.bestStreak} days</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Clients */}
        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle>All Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clientsWithHabits.map(client => (
                <div key={client.id} className="p-4 border-2 border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{client.full_name}</h3>
                      <div className="flex gap-4 text-sm text-gray-600 mt-1">
                        <span>Habits: {client.habits.length}</span>
                        <span>Best Streak: {client.bestStreak}</span>
                        <span>Total: {client.totalCompletions}</span>
                      </div>
                    </div>
                    <Button onClick={() => handleSuggestHabit(client)} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Suggest Habit
                    </Button>
                  </div>

                  {client.habits.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                      {client.habits.map(habit => (
                        <div key={habit.id} className="p-3 bg-gray-50 rounded flex items-center gap-2">
                          <span className="text-2xl">{habit.icon || categoryIcons[habit.category]}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{habit.title}</p>
                            <div className="flex items-center gap-1 text-xs text-orange-600">
                              <Flame className="w-3 h-3" />
                              {habit.current_streak || 0}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Suggest Habit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Habit Title *</Label>
                <Input
                  value={formData.title || ''}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., 30 min daily walk"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nutrition">🥗 Nutrition</SelectItem>
                      <SelectItem value="exercise">💪 Exercise</SelectItem>
                      <SelectItem value="wellness">🧘 Wellness</SelectItem>
                      <SelectItem value="sleep">😴 Sleep</SelectItem>
                      <SelectItem value="mindfulness">🧠 Mindfulness</SelectItem>
                      <SelectItem value="hydration">💧 Hydration</SelectItem>
                      <SelectItem value="custom">⭐ Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={formData.frequency} onValueChange={(v) => setFormData({...formData, frequency: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleSave} disabled={createHabitMutation.isPending} className="flex-1 bg-gradient-to-r from-orange-500 to-red-500">
                  {createHabitMutation.isPending ? 'Saving...' : 'Suggest'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}