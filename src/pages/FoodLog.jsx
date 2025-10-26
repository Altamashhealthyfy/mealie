import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Utensils, Camera, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function FoodLog() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    meal_type: 'breakfast',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['myClientProfile', user?.email],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ email: user?.email });
      return clients[0] || null;
    },
    enabled: !!user,
  });

  const { data: todayLogs } = useQuery({
    queryKey: ['todayFoodLogs', format(selectedDate, 'yyyy-MM-dd'), clientProfile?.id],
    queryFn: async () => {
      const logs = await base44.entities.FoodLog.filter({
        date: format(selectedDate, 'yyyy-MM-dd'),
        client_id: clientProfile?.id,
      });
      return logs.sort((a, b) => {
        const order = ['breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner'];
        return order.indexOf(a.meal_type) - order.indexOf(b.meal_type);
      });
    },
    enabled: !!clientProfile,
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.FoodLog.create({
      ...data,
      client_id: clientProfile.id,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['todayFoodLogs']);
      setShowAddDialog(false);
      setFormData({ meal_type: 'breakfast', date: format(new Date(), 'yyyy-MM-dd') });
      alert('Food log saved!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FoodLog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['todayFoodLogs']);
      alert('Food log deleted!');
    },
  });

  const handleSubmit = () => {
    saveMutation.mutate({
      ...formData,
      date: format(selectedDate, 'yyyy-MM-dd'),
    });
  };

  const totalCalories = todayLogs.reduce((sum, log) => sum + (log.calories || 0), 0);
  const totalProtein = todayLogs.reduce((sum, log) => sum + (log.protein || 0), 0);
  const totalCarbs = todayLogs.reduce((sum, log) => sum + (log.carbs || 0), 0);
  const totalFats = todayLogs.reduce((sum, log) => sum + (log.fats || 0), 0);

  const targetCalories = clientProfile?.target_calories || 2000;
  const calorieProgress = (totalCalories / targetCalories) * 100;

  if (!clientProfile) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl">
          <CardHeader>
            <CardTitle>No Client Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Your dietitian needs to create your profile first.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Food Log</h1>
            <p className="text-gray-600">Track your daily food intake</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-500 to-red-500">
                <Plus className="w-4 h-4 mr-2" />
                Log Food
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Log Your Meal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Meal Type</Label>
                  <Select
                    value={formData.meal_type}
                    onValueChange={(value) => setFormData({...formData, meal_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakfast">Breakfast</SelectItem>
                      <SelectItem value="mid_morning">Mid-Morning Snack</SelectItem>
                      <SelectItem value="lunch">Lunch</SelectItem>
                      <SelectItem value="evening_snack">Evening Snack</SelectItem>
                      <SelectItem value="dinner">Dinner</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Meal Name</Label>
                  <Input
                    value={formData.meal_name || ''}
                    onChange={(e) => setFormData({...formData, meal_name: e.target.value})}
                    placeholder="e.g., Poha with peanuts"
                  />
                </div>

                <div className="space-y-2">
                  <Label>What did you eat? (one per line)</Label>
                  <Textarea
                    value={formData.items?.join('\n') || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      items: e.target.value.split('\n').filter(item => item.trim())
                    })}
                    placeholder="1 katori poha&#10;1 cup chai&#10;10 peanuts"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Calories (optional)</Label>
                    <Input
                      type="number"
                      value={formData.calories || ''}
                      onChange={(e) => setFormData({...formData, calories: parseFloat(e.target.value)})}
                      placeholder="250"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Protein (g)</Label>
                    <Input
                      type="number"
                      value={formData.protein || ''}
                      onChange={(e) => setFormData({...formData, protein: parseFloat(e.target.value)})}
                      placeholder="10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Carbs (g)</Label>
                    <Input
                      type="number"
                      value={formData.carbs || ''}
                      onChange={(e) => setFormData({...formData, carbs: parseFloat(e.target.value)})}
                      placeholder="40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fats (g)</Label>
                    <Input
                      type="number"
                      value={formData.fats || ''}
                      onChange={(e) => setFormData({...formData, fats: parseFloat(e.target.value)})}
                      placeholder="5"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="How did you feel? Any deviations from the plan?"
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={saveMutation.isPending}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500"
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save Food Log'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">Select Date</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          {/* Food Logs */}
          <div className="lg:col-span-3 space-y-6">
            {/* Daily Summary */}
            <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
              <CardHeader>
                <CardTitle>Today's Summary - {format(selectedDate, 'MMMM d, yyyy')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">Calories</span>
                      <span className="text-sm font-medium">
                        {totalCalories} / {targetCalories} kcal
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-orange-500 to-red-500 h-3 rounded-full transition-all"
                        style={{ width: `${Math.min(calorieProgress, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-xs text-gray-600">Protein</p>
                      <p className="text-2xl font-bold text-red-600">{totalProtein}g</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-xs text-gray-600">Carbs</p>
                      <p className="text-2xl font-bold text-yellow-600">{totalCarbs}g</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-xs text-gray-600">Fats</p>
                      <p className="text-2xl font-bold text-purple-600">{totalFats}g</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Food Logs List */}
            {todayLogs.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <Utensils className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No Food Logged Yet
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Start tracking your meals for {format(selectedDate, 'MMMM d')}
                  </p>
                  <Button
                    onClick={() => setShowAddDialog(true)}
                    className="bg-gradient-to-r from-orange-500 to-red-500"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Log Your First Meal
                  </Button>
                </CardContent>
              </Card>
            ) : (
              todayLogs.map((log) => (
                <Card key={log.id} className="border-none shadow-lg bg-white/80 backdrop-blur">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-orange-600 border-orange-300 capitalize">
                            {log.meal_type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <CardTitle className="text-xl">{log.meal_name || 'Meal'}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        {log.calories && (
                          <div className="text-right">
                            <p className="text-2xl font-bold text-orange-600">{log.calories}</p>
                            <p className="text-xs text-gray-500">kcal</p>
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Delete this food log?')) {
                              deleteMutation.mutate(log.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {log.items && log.items.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">What I Ate</h4>
                        <div className="space-y-1">
                          {log.items.map((item, i) => (
                            <div key={i} className="text-gray-700">• {item}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(log.protein || log.carbs || log.fats) && (
                      <div className="flex gap-2">
                        {log.protein && (
                          <div className="flex-1 p-2 bg-red-50 rounded-lg">
                            <p className="text-xs text-gray-600">Protein</p>
                            <p className="text-lg font-bold text-red-600">{log.protein}g</p>
                          </div>
                        )}
                        {log.carbs && (
                          <div className="flex-1 p-2 bg-yellow-50 rounded-lg">
                            <p className="text-xs text-gray-600">Carbs</p>
                            <p className="text-lg font-bold text-yellow-600">{log.carbs}g</p>
                          </div>
                        )}
                        {log.fats && (
                          <div className="flex-1 p-2 bg-purple-50 rounded-lg">
                            <p className="text-xs text-gray-600">Fats</p>
                            <p className="text-lg font-bold text-purple-600">{log.fats}g</p>
                          </div>
                        )}
                      </div>
                    )}

                    {log.notes && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">{log.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}