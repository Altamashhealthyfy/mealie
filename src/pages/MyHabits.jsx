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
import { CheckCircle, Circle, Plus, Flame, Award, Calendar, TrendingUp } from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";

export default function MyHabits() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({ frequency: 'daily', category: 'custom', active: true });
  const today = format(new Date(), 'yyyy-MM-dd');

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

  const { data: habits = [] } = useQuery({
    queryKey: ['myHabits', clientProfile?.id],
    queryFn: () => base44.entities.Habit.filter({ client_id: clientProfile?.id, active: true }),
    enabled: !!clientProfile,
  });

  const { data: habitLogs = [] } = useQuery({
    queryKey: ['myHabitLogs', clientProfile?.id],
    queryFn: () => base44.entities.HabitLog.filter({ client_id: clientProfile?.id }),
    enabled: !!clientProfile,
  });

  const createHabitMutation = useMutation({
    mutationFn: (data) => base44.entities.Habit.create({ ...data, client_id: clientProfile.id }),
    onSuccess: () => {
      queryClient.invalidateQueries(['myHabits']);
      setShowDialog(false);
      setFormData({ frequency: 'daily', category: 'custom', active: true });
      alert('✅ Habit created!');
    },
  });

  const logHabitMutation = useMutation({
    mutationFn: (data) => base44.entities.HabitLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['myHabitLogs']);
    },
  });

  const updateHabitMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Habit.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['myHabits']);
    },
  });

  const handleToggleHabit = async (habit) => {
    const existingLog = habitLogs.find(log => log.habit_id === habit.id && log.date === today);
    
    if (existingLog) {
      // Already logged today - do nothing or show message
      return;
    }

    await logHabitMutation.mutateAsync({
      habit_id: habit.id,
      client_id: clientProfile.id,
      date: today,
      completed: true,
    });

    // Calculate new streak
    const habitLogsForHabit = habitLogs.filter(log => log.habit_id === habit.id).sort((a, b) => new Date(b.date) - new Date(a.date));
    let streak = 1;
    for (let i = 1; i < 365; i++) {
      const checkDate = format(subDays(new Date(), i), 'yyyy-MM-dd');
      if (habitLogsForHabit.some(log => log.date === checkDate)) {
        streak++;
      } else {
        break;
      }
    }

    const newBestStreak = Math.max(habit.best_streak || 0, streak);
    await updateHabitMutation.mutateAsync({
      id: habit.id,
      data: {
        current_streak: streak,
        best_streak: newBestStreak,
        total_completions: (habit.total_completions || 0) + 1,
      }
    });
  };

  const isCompletedToday = (habitId) => {
    return habitLogs.some(log => log.habit_id === habitId && log.date === today);
  };

  const getWeekProgress = (habitId) => {
    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());
    const weekLogs = habitLogs.filter(log => 
      log.habit_id === habitId && 
      new Date(log.date) >= weekStart && 
      new Date(log.date) <= weekEnd
    );
    return weekLogs.length;
  };

  const handleCreateHabit = () => {
    if (!formData.title) {
      alert('Please enter a habit title');
      return;
    }
    createHabitMutation.mutate(formData);
  };

  const categoryIcons = {
    nutrition: '🥗',
    exercise: '💪',
    wellness: '🧘',
    sleep: '😴',
    mindfulness: '🧠',
    hydration: '💧',
    custom: '⭐',
  };

  if (!clientProfile) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <p className="text-gray-600">Please contact your coach to set up your profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalCompletions = habits.reduce((sum, h) => sum + (h.total_completions || 0), 0);
  const bestStreak = Math.max(...habits.map(h => h.best_streak || 0), 0);
  const todayComplete = habits.filter(h => isCompletedToday(h.id)).length;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Habits</h1>
            <p className="text-gray-600">Build consistency with daily habits</p>
          </div>
          <Button onClick={() => setShowDialog(true)} className="bg-gradient-to-r from-orange-500 to-red-500">
            <Plus className="w-4 h-4 mr-2" />
            New Habit
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-10 h-10 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Today</p>
                  <p className="text-3xl font-bold text-orange-600">{todayComplete}/{habits.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-pink-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Flame className="w-10 h-10 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600">Best Streak</p>
                  <p className="text-3xl font-bold text-red-600">{bestStreak}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Award className="w-10 h-10 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-3xl font-bold text-purple-600">{totalCompletions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-10 h-10 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Active Habits</p>
                  <p className="text-3xl font-bold text-blue-600">{habits.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Habits */}
        <Card className="border-none shadow-xl">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              Today - {format(new Date(), 'EEEE, MMMM d')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {habits.length === 0 ? (
              <div className="text-center py-12">
                <Circle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Habits Yet</h3>
                <p className="text-gray-600 mb-4">Start building healthy habits today!</p>
                <Button onClick={() => setShowDialog(true)} className="bg-gradient-to-r from-orange-500 to-red-500">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Habit
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {habits.map(habit => {
                  const completed = isCompletedToday(habit.id);
                  const weekProgress = getWeekProgress(habit.id);
                  
                  return (
                    <div
                      key={habit.id}
                      onClick={() => !completed && handleToggleHabit(habit)}
                      className={`p-5 rounded-lg border-2 transition-all cursor-pointer ${
                        completed
                          ? 'bg-green-50 border-green-500'
                          : 'bg-white border-gray-200 hover:border-orange-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{habit.icon || categoryIcons[habit.category]}</span>
                          <div>
                            <h3 className="font-bold text-gray-900">{habit.title}</h3>
                            {habit.description && (
                              <p className="text-sm text-gray-600">{habit.description}</p>
                            )}
                          </div>
                        </div>
                        {completed ? (
                          <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
                        ) : (
                          <Circle className="w-8 h-8 text-gray-400 flex-shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Flame className="w-4 h-4 text-orange-600" />
                          <span className="font-semibold">{habit.current_streak || 0} day streak</span>
                        </div>
                        {habit.frequency === 'weekly' && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <span>{weekProgress}/{habit.target_per_week || 7} this week</span>
                          </div>
                        )}
                        {habit.created_by_coach && (
                          <Badge variant="outline" className="text-purple-600 border-purple-600">
                            Coach
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Habit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Habit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Habit Title *</Label>
                <Input
                  value={formData.title || ''}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., Drink 8 glasses of water"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Optional details..."
                  rows={2}
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

              {formData.frequency === 'weekly' && (
                <div className="space-y-2">
                  <Label>Target per Week</Label>
                  <Input
                    type="number"
                    min="1"
                    max="7"
                    value={formData.target_per_week || 7}
                    onChange={(e) => setFormData({...formData, target_per_week: parseInt(e.target.value)})}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Icon (Optional Emoji)</Label>
                <Input
                  value={formData.icon || ''}
                  onChange={(e) => setFormData({...formData, icon: e.target.value})}
                  placeholder="🎯"
                  maxLength="2"
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleCreateHabit} disabled={createHabitMutation.isPending} className="flex-1 bg-gradient-to-r from-orange-500 to-red-500">
                  {createHabitMutation.isPending ? 'Creating...' : 'Create Habit'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}