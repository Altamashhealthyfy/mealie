import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Plus, Scale, Calendar, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ProgressTracking() {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: securitySettings } = useQuery({
    queryKey: ['securitySettings'],
    queryFn: async () => {
      const settings = await base44.entities.AppSecuritySettings.list();
      return settings[0] || null;
    },
    enabled: !!user,
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['myClientProfile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      
      // Try to find client by email match
      const clients = await base44.entities.Client.filter({ email: user.email });
      if (clients.length > 0) {
        return clients[0];
      }
      
      // If not found, try case-insensitive search
      const allClients = await base44.entities.Client.list();
      const matchingClient = allClients.find(c => 
        c.email?.toLowerCase() === user.email?.toLowerCase()
      );
      
      return matchingClient || null;
    },
    enabled: !!user,
  });

  const { data: progressLogs } = useQuery({
    queryKey: ['myProgressLogs', clientProfile?.id],
    queryFn: async () => {
      const logs = await base44.entities.ProgressLog.filter({
        client_id: clientProfile?.id,
      });
      return logs.sort((a, b) => new Date(a.date) - new Date(b.date));
    },
    enabled: !!clientProfile,
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingLog) {
        return base44.entities.ProgressLog.update(editingLog.id, data);
      }
      return base44.entities.ProgressLog.create({
        ...data,
        client_id: clientProfile.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myProgressLogs']);
      setShowAddDialog(false);
      setEditingLog(null);
      setFormData({ date: format(new Date(), 'yyyy-MM-dd') });
      alert(editingLog ? 'Progress updated successfully!' : 'Progress logged successfully!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProgressLog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['myProgressLogs']);
      alert('Progress entry deleted successfully!');
    },
  });

  const handleSubmit = () => {
    if (!formData.weight) {
      alert('Please enter your weight');
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleEdit = (log) => {
    setEditingLog(log);
    setFormData({
      date: log.date,
      weight: log.weight,
      measurements: log.measurements || {},
      energy_level: log.energy_level,
      sleep_quality: log.sleep_quality,
      stress_level: log.stress_level,
      meal_adherence: log.meal_adherence,
      notes: log.notes,
    });
    setShowAddDialog(true);
  };

  const handleDelete = (log) => {
    if (window.confirm('Are you sure you want to delete this progress entry? This action cannot be undone.')) {
      deleteMutation.mutate(log.id);
    }
  };

  const handleDialogClose = () => {
    setShowAddDialog(false);
    setEditingLog(null);
    setFormData({ date: format(new Date(), 'yyyy-MM-dd') });
  };

  // Permission checks
  const canEditProgress = securitySettings?.client_restrictions?.can_edit_progress ?? true;
  const canDeleteProgress = securitySettings?.client_restrictions?.can_delete_progress ?? false;

  const latestLog = progressLogs[progressLogs.length - 1];
  const initialWeight = clientProfile?.initial_weight || clientProfile?.weight;
  const currentWeight = latestLog?.weight || clientProfile?.weight;
  const targetWeight = clientProfile?.target_weight;
  const weightChange = initialWeight ? currentWeight - initialWeight : 0;

  // Prepare chart data
  const chartData = progressLogs.map(log => ({
    date: format(new Date(log.date), 'MMM d'),
    weight: log.weight,
  }));

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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Progress Tracking</h1>
            <p className="text-gray-600">Track your weight and measurements</p>
          </div>
          {canEditProgress && (
            <Dialog open={showAddDialog} onOpenChange={(open) => !open && handleDialogClose()}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-orange-500 to-red-500">
                  <Plus className="w-4 h-4 mr-2" />
                  Log Progress
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingLog ? 'Edit Progress' : 'Log Your Progress'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Weight (kg) *</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.weight || ''}
                      onChange={(e) => setFormData({...formData, weight: parseFloat(e.target.value)})}
                      placeholder="65.5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Measurements (optional)</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Chest (cm)</Label>
                        <Input
                          type="number"
                          value={formData.measurements?.chest || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            measurements: {...formData.measurements, chest: parseFloat(e.target.value)}
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Waist (cm)</Label>
                        <Input
                          type="number"
                          value={formData.measurements?.waist || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            measurements: {...formData.measurements, waist: parseFloat(e.target.value)}
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Hips (cm)</Label>
                        <Input
                          type="number"
                          value={formData.measurements?.hips || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            measurements: {...formData.measurements, hips: parseFloat(e.target.value)}
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Arms (cm)</Label>
                        <Input
                          type="number"
                          value={formData.measurements?.arms || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            measurements: {...formData.measurements, arms: parseFloat(e.target.value)}
                          })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Energy Level (1-5)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        value={formData.energy_level || ''}
                        onChange={(e) => setFormData({...formData, energy_level: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sleep Quality (1-5)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        value={formData.sleep_quality || ''}
                        onChange={(e) => setFormData({...formData, sleep_quality: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Stress Level (1-5)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        value={formData.stress_level || ''}
                        onChange={(e) => setFormData({...formData, stress_level: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Meal Plan Adherence (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.meal_adherence || ''}
                      onChange={(e) => setFormData({...formData, meal_adherence: parseInt(e.target.value)})}
                      placeholder="80"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      placeholder="How are you feeling? Any challenges?"
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleDialogClose}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={saveMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-red-500"
                    >
                      {saveMutation.isPending ? 'Saving...' : editingLog ? 'Update Progress' : 'Save Progress'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Starting Weight</p>
                  <p className="text-3xl font-bold text-blue-600">{initialWeight}</p>
                  <p className="text-xs text-gray-500">kg</p>
                </div>
                <Scale className="w-12 h-12 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Current Weight</p>
                  <p className="text-3xl font-bold text-green-600">{currentWeight}</p>
                  <p className="text-xs text-gray-500">kg</p>
                </div>
                <TrendingDown className="w-12 h-12 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Target Weight</p>
                  <p className="text-3xl font-bold text-purple-600">{targetWeight || '-'}</p>
                  <p className="text-xs text-gray-500">kg</p>
                </div>
                <Calendar className="w-12 h-12 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Weight Change</p>
                  <p className={`text-3xl font-bold ${weightChange < 0 ? 'text-green-600' : 'text-orange-600'}`}>
                    {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500">kg</p>
                </div>
                {weightChange < 0 ? (
                  <TrendingDown className="w-12 h-12 text-green-500" />
                ) : (
                  <TrendingUp className="w-12 h-12 text-orange-500" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weight Chart */}
        {chartData.length > 0 && (
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle>Weight Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="#f97316" 
                    strokeWidth={3}
                    dot={{ fill: '#f97316', r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Progress Logs */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Progress History</CardTitle>
          </CardHeader>
          <CardContent>
            {progressLogs.length === 0 ? (
              <div className="text-center py-12">
                <Scale className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Progress Logged Yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Start tracking your weight and measurements
                </p>
                {canEditProgress && (
                  <Button
                    onClick={() => setShowAddDialog(true)}
                    className="bg-gradient-to-r from-orange-500 to-red-500"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Log Your First Progress
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {progressLogs.slice().reverse().map((log) => (
                  <div key={log.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {format(new Date(log.date), 'MMMM d, yyyy')}
                        </p>
                        <p className="text-sm text-gray-600">
                          Weight: <span className="font-medium text-green-600">{log.weight} kg</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {log.meal_adherence && (
                          <Badge className="bg-blue-500 text-white">
                            {log.meal_adherence}% Adherence
                          </Badge>
                        )}
                        {canEditProgress && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(log)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {canDeleteProgress && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(log)}
                            disabled={deleteMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {log.measurements && (
                      <div className="grid grid-cols-4 gap-3 mb-3">
                        {log.measurements.chest && (
                          <div className="text-sm">
                            <span className="text-gray-600">Chest:</span>
                            <span className="ml-1 font-medium">{log.measurements.chest} cm</span>
                          </div>
                        )}
                        {log.measurements.waist && (
                          <div className="text-sm">
                            <span className="text-gray-600">Waist:</span>
                            <span className="ml-1 font-medium">{log.measurements.waist} cm</span>
                          </div>
                        )}
                        {log.measurements.hips && (
                          <div className="text-sm">
                            <span className="text-gray-600">Hips:</span>
                            <span className="ml-1 font-medium">{log.measurements.hips} cm</span>
                          </div>
                        )}
                        {log.measurements.arms && (
                          <div className="text-sm">
                            <span className="text-gray-600">Arms:</span>
                            <span className="ml-1 font-medium">{log.measurements.arms} cm</span>
                          </div>
                        )}
                      </div>
                    )}

                    {(log.energy_level || log.sleep_quality || log.stress_level) && (
                      <div className="flex gap-4 mb-3">
                        {log.energy_level && (
                          <div className="text-sm">
                            <span className="text-gray-600">Energy:</span>
                            <span className="ml-1 font-medium">{log.energy_level}/5 ⚡</span>
                          </div>
                        )}
                        {log.sleep_quality && (
                          <div className="text-sm">
                            <span className="text-gray-600">Sleep:</span>
                            <span className="ml-1 font-medium">{log.sleep_quality}/5 😴</span>
                          </div>
                        )}
                        {log.stress_level && (
                          <div className="text-sm">
                            <span className="text-gray-600">Stress:</span>
                            <span className="ml-1 font-medium">{log.stress_level}/5 😰</span>
                          </div>
                        )}
                      </div>
                    )}

                    {log.notes && (
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                        {log.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}