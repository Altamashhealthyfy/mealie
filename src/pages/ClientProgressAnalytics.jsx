import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Search, Calendar, Scale, Moon, Battery, Brain, Heart, Droplets, Activity, Utensils, AlertCircle } from 'lucide-react';

export default function ClientProgressAnalytics() {
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('30');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['allClients', user?.email],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list('-created_date', 200);
      if (user?.user_type === 'super_admin') return allClients;
      if (user?.user_type === 'student_coach') {
        return allClients.filter(c => c.created_by === user?.email || c.assigned_coach === user?.email);
      }
      return allClients.filter(c => c.created_by === user?.email);
    },
    enabled: !!user,
  });

  const { data: progressLogs = [] } = useQuery({
    queryKey: ['clientProgressLogs', selectedClient?.id, timeRange],
    queryFn: async () => {
      const logs = await base44.entities.ProgressLog.filter({ client_id: selectedClient?.id });
      const days = parseInt(timeRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      return logs
        .filter(log => new Date(log.date) >= cutoffDate)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    },
    enabled: !!selectedClient?.id,
  });

  const filteredClients = clients.filter(c =>
    c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculateTrend = (data, key) => {
    if (data.length < 2) return { value: 0, direction: 'neutral' };
    const recent = data.slice(-7);
    const values = recent.map(d => d[key]).filter(v => v);
    if (values.length < 2) return { value: 0, direction: 'neutral' };
    
    const first = values[0];
    const last = values[values.length - 1];
    const change = last - first;
    const percentage = ((change / first) * 100).toFixed(1);
    
    return {
      value: percentage,
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      absolute: change.toFixed(1)
    };
  };

  const getAverages = () => {
    if (progressLogs.length === 0) return {};
    
    const sum = progressLogs.reduce((acc, log) => ({
      energy: acc.energy + (log.wellness_metrics?.energy_level || 0),
      sleep: acc.sleep + (log.wellness_metrics?.sleep_quality || 0),
      stress: acc.stress + (log.wellness_metrics?.stress_level || 0),
      water: acc.water + (log.wellness_metrics?.water_intake || 0),
      exercise: acc.exercise + (log.wellness_metrics?.exercise_minutes || 0),
      adherence: acc.adherence + (log.meal_adherence || 0)
    }), { energy: 0, sleep: 0, stress: 0, water: 0, exercise: 0, adherence: 0 });

    const count = progressLogs.length;
    return {
      energy: (sum.energy / count).toFixed(1),
      sleep: (sum.sleep / count).toFixed(1),
      stress: (sum.stress / count).toFixed(1),
      water: (sum.water / count).toFixed(1),
      exercise: Math.round(sum.exercise / count),
      adherence: Math.round(sum.adherence / count)
    };
  };

  const weightTrend = calculateTrend(progressLogs, 'weight');
  const averages = getAverages();

  const weightChartData = progressLogs
    .filter(log => log.weight)
    .map(log => ({
      date: new Date(log.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      weight: log.weight
    }));

  const wellnessChartData = progressLogs.map(log => ({
    date: new Date(log.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    energy: log.wellness_metrics?.energy_level || 0,
    sleep: log.wellness_metrics?.sleep_quality || 0,
    stress: log.wellness_metrics?.stress_level || 0,
  }));

  const activityChartData = progressLogs.map(log => ({
    date: new Date(log.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    water: log.wellness_metrics?.water_intake || 0,
    exercise: log.wellness_metrics?.exercise_minutes || 0,
    adherence: log.meal_adherence || 0
  }));

  const getCommonSymptoms = () => {
    const symptomCount = {};
    progressLogs.forEach(log => {
      (log.symptoms || []).forEach(symptom => {
        symptomCount[symptom] = (symptomCount[symptom] || 0) + 1;
      });
    });
    return Object.entries(symptomCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  };

  if (!selectedClient) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <TrendingUp className="w-10 h-10 text-blue-500" />
            Client Progress Analytics
          </h1>

          <Card>
            <CardHeader>
              <CardTitle>Select a Client</CardTitle>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {filteredClients.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No clients found</p>
                  ) : (
                    filteredClients.map(client => (
                      <button
                        key={client.id}
                        onClick={() => setSelectedClient(client)}
                        className="w-full text-left p-4 bg-gray-50 hover:bg-blue-50 rounded-lg transition"
                      >
                        <p className="font-semibold">{client.full_name}</p>
                        <p className="text-sm text-gray-600">{client.email}</p>
                        {client.goal && (
                          <Badge variant="outline" className="mt-2">{client.goal}</Badge>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Button variant="ghost" onClick={() => setSelectedClient(null)} className="mb-2">
              ← Back to Clients
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">{selectedClient.full_name}</h1>
            <p className="text-gray-600">{selectedClient.email}</p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {progressLogs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">No progress data available for this time range</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Weight Trend</p>
                      <p className="text-2xl font-bold">{weightTrend.absolute} kg</p>
                    </div>
                    <Scale className="w-8 h-8 text-purple-500" />
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-sm">
                    {weightTrend.direction === 'down' ? (
                      <TrendingDown className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-red-500" />
                    )}
                    <span className={weightTrend.direction === 'down' ? 'text-green-600' : 'text-red-600'}>
                      {weightTrend.value}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Avg Energy</p>
                      <p className="text-2xl font-bold">{averages.energy}/10</p>
                    </div>
                    <Battery className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Avg Sleep Quality</p>
                      <p className="text-2xl font-bold">{averages.sleep}/10</p>
                    </div>
                    <Moon className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Meal Adherence</p>
                      <p className="text-2xl font-bold">{averages.adherence}%</p>
                    </div>
                    <Utensils className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <Tabs defaultValue="weight" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="weight">Weight</TabsTrigger>
                <TabsTrigger value="wellness">Wellness</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
              </TabsList>

              <TabsContent value="weight">
                <Card>
                  <CardHeader>
                    <CardTitle>Weight Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={weightChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="weight" stroke="#8b5cf6" strokeWidth={2} name="Weight (kg)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="wellness">
                <Card>
                  <CardHeader>
                    <CardTitle>Wellness Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={wellnessChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="energy" stroke="#22c55e" name="Energy" />
                        <Line type="monotone" dataKey="sleep" stroke="#3b82f6" name="Sleep" />
                        <Line type="monotone" dataKey="stress" stroke="#f59e0b" name="Stress" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity">
                <Card>
                  <CardHeader>
                    <CardTitle>Activity & Adherence</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={activityChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="water" fill="#3b82f6" name="Water (L)" />
                        <Bar dataKey="exercise" fill="#22c55e" name="Exercise (min)" />
                        <Bar dataKey="adherence" fill="#f59e0b" name="Adherence (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="insights">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-orange-500" />
                        Common Symptoms
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {getCommonSymptoms().length === 0 ? (
                        <p className="text-gray-500">No symptoms reported</p>
                      ) : (
                        <div className="space-y-2">
                          {getCommonSymptoms().map(([symptom, count]) => (
                            <div key={symptom} className="flex justify-between items-center">
                              <span className="text-sm">{symptom}</span>
                              <Badge variant="secondary">{count}x</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-64">
                        <div className="space-y-3">
                          {progressLogs
                            .filter(log => log.notes)
                            .slice(-5)
                            .reverse()
                            .map(log => (
                              <div key={log.id} className="p-3 bg-gray-50 rounded">
                                <p className="text-xs text-gray-500 mb-1">
                                  {new Date(log.date).toLocaleDateString()}
                                </p>
                                <p className="text-sm">{log.notes}</p>
                              </div>
                            ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}