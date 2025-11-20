import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  Target,
  Activity,
  Calendar,
  MessageCircle,
  Award,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, subDays, differenceInDays } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ClientAnalyticsDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("30"); // days

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list('-created_date');
      if (user?.user_type === 'super_admin') {
        return allClients;
      }
      return allClients.filter(client => client.created_by === user?.email);
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: progressLogs } = useQuery({
    queryKey: ['progressLogs'],
    queryFn: () => base44.entities.ProgressLog.list('-date', 500),
    initialData: [],
  });

  const { data: foodLogs } = useQuery({
    queryKey: ['foodLogs'],
    queryFn: () => base44.entities.FoodLog.list('-date', 500),
    initialData: [],
  });

  const { data: mealPlans } = useQuery({
    queryKey: ['mealPlans'],
    queryFn: async () => {
      const allPlans = await base44.entities.MealPlan.list('-created_date');
      if (user?.user_type === 'super_admin') {
        return allPlans;
      }
      return allPlans.filter(plan => plan.created_by === user?.email);
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: messages } = useQuery({
    queryKey: ['messages'],
    queryFn: () => base44.entities.Message.list('-created_date', 200),
    initialData: [],
  });

  // Calculate analytics
  const analytics = useMemo(() => {
    const cutoffDate = subDays(new Date(), parseInt(selectedPeriod));
    
    // Active clients (logged progress or food in last 7 days)
    const recentDate = subDays(new Date(), 7);
    const activeClientIds = new Set([
      ...progressLogs.filter(log => new Date(log.date) >= recentDate).map(log => log.client_id),
      ...foodLogs.filter(log => new Date(log.date) >= recentDate).map(log => log.client_id)
    ]);

    // Clients with plans
    const clientsWithPlans = clients.filter(c => 
      mealPlans.some(p => p.client_id === c.id && p.active)
    );

    // Weight loss progress
    const clientProgress = clients.map(client => {
      const clientLogs = progressLogs
        .filter(log => log.client_id === client.id && log.weight)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      
      if (clientLogs.length < 2) return null;

      const firstLog = clientLogs[0];
      const lastLog = clientLogs[clientLogs.length - 1];
      const weightChange = lastLog.weight - firstLog.weight;
      const daysTracking = differenceInDays(new Date(lastLog.date), new Date(firstLog.date));

      return {
        client,
        weightChange,
        daysTracking,
        currentWeight: lastLog.weight,
        startWeight: firstLog.weight,
        lastLogDate: lastLog.date,
        totalLogs: clientLogs.length,
      };
    }).filter(Boolean);

    // Meal adherence
    const clientAdherence = clients.map(client => {
      const recentLogs = progressLogs.filter(log => 
        log.client_id === client.id && 
        new Date(log.date) >= cutoffDate &&
        log.meal_adherence !== null
      );

      if (recentLogs.length === 0) return null;

      const avgAdherence = recentLogs.reduce((sum, log) => sum + (log.meal_adherence || 0), 0) / recentLogs.length;

      return {
        client,
        adherence: avgAdherence,
        logsCount: recentLogs.length,
      };
    }).filter(Boolean);

    // Clients needing attention
    const needsAttention = clients.filter(client => {
      const clientLogs = progressLogs.filter(log => log.client_id === client.id);
      const clientFoodLogs = foodLogs.filter(log => log.client_id === client.id);
      const lastProgress = clientLogs[0];
      const lastFood = clientFoodLogs[0];
      
      const daysSinceProgress = lastProgress ? differenceInDays(new Date(), new Date(lastProgress.date)) : 999;
      const daysSinceFood = lastFood ? differenceInDays(new Date(), new Date(lastFood.date)) : 999;

      return daysSinceProgress > 7 || daysSinceFood > 7;
    });

    // Message activity
    const recentMessages = messages.filter(msg => new Date(msg.created_date) >= cutoffDate);

    // Weight trend data (last 30 days average)
    const weightTrendData = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'MMM dd');
      
      const logsOnDate = progressLogs.filter(log => 
        format(new Date(log.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd') &&
        log.weight
      );

      const avgWeight = logsOnDate.length > 0
        ? logsOnDate.reduce((sum, log) => sum + log.weight, 0) / logsOnDate.length
        : null;

      weightTrendData.push({
        date: dateStr,
        avgWeight: avgWeight ? avgWeight.toFixed(1) : null,
        count: logsOnDate.length,
      });
    }

    // Adherence distribution
    const adherenceRanges = [
      { range: '0-25%', count: 0, color: '#ef4444' },
      { range: '26-50%', count: 0, color: '#f97316' },
      { range: '51-75%', count: 0, color: '#eab308' },
      { range: '76-100%', count: 0, color: '#22c55e' },
    ];

    clientAdherence.forEach(({ adherence }) => {
      if (adherence <= 25) adherenceRanges[0].count++;
      else if (adherence <= 50) adherenceRanges[1].count++;
      else if (adherence <= 75) adherenceRanges[2].count++;
      else adherenceRanges[3].count++;
    });

    // Goal progress
    const goalDistribution = clients.reduce((acc, client) => {
      const goal = client.goal || 'unknown';
      acc[goal] = (acc[goal] || 0) + 1;
      return acc;
    }, {});

    const goalData = Object.entries(goalDistribution).map(([goal, count]) => ({
      goal: goal.replace(/_/g, ' '),
      count,
    }));

    return {
      totalClients: clients.length,
      activeClients: activeClientIds.size,
      clientsWithPlans: clientsWithPlans.length,
      avgAdherence: clientAdherence.length > 0 
        ? (clientAdherence.reduce((sum, c) => sum + c.adherence, 0) / clientAdherence.length).toFixed(1)
        : 0,
      clientProgress,
      clientAdherence: clientAdherence.sort((a, b) => b.adherence - a.adherence),
      needsAttention,
      weightTrendData: weightTrendData.filter(d => d.avgWeight),
      adherenceRanges,
      goalData,
      recentMessages: recentMessages.length,
      totalProgressLogs: progressLogs.filter(log => new Date(log.date) >= cutoffDate).length,
      totalFoodLogs: foodLogs.filter(log => new Date(log.date) >= cutoffDate).length,
    };
  }, [clients, progressLogs, foodLogs, mealPlans, messages, selectedPeriod]);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Client Analytics</h1>
            <p className="text-gray-600">Track progress, engagement, and identify clients needing attention</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={selectedPeriod === "7" ? "default" : "outline"}
              onClick={() => setSelectedPeriod("7")}
              size="sm"
            >
              7 Days
            </Button>
            <Button
              variant={selectedPeriod === "30" ? "default" : "outline"}
              onClick={() => setSelectedPeriod("30")}
              size="sm"
            >
              30 Days
            </Button>
            <Button
              variant={selectedPeriod === "90" ? "default" : "outline"}
              onClick={() => setSelectedPeriod("90")}
              size="sm"
            >
              90 Days
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{analytics.totalClients}</div>
              <p className="text-xs text-gray-600 mt-1">
                {analytics.activeClients} active in last 7 days
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Avg Adherence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{analytics.avgAdherence}%</div>
              <p className="text-xs text-gray-600 mt-1">
                Based on {analytics.clientAdherence.length} clients
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Needs Attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{analytics.needsAttention.length}</div>
              <p className="text-xs text-gray-600 mt-1">
                No activity in 7+ days
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Total Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {analytics.totalProgressLogs + analytics.totalFoodLogs}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Last {selectedPeriod} days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="progress" className="space-y-6">
          <TabsList className="grid grid-cols-4 bg-white/80 backdrop-blur">
            <TabsTrigger value="progress">Progress Tracking</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="attention">Needs Attention</TabsTrigger>
            <TabsTrigger value="goals">Goals Overview</TabsTrigger>
          </TabsList>

          {/* Progress Tracking Tab */}
          <TabsContent value="progress" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weight Trend Chart */}
              <Card className="border-none shadow-lg col-span-2">
                <CardHeader>
                  <CardTitle>Average Weight Trend (Last 30 Days)</CardTitle>
                  <CardDescription>Daily average weight across all clients</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.weightTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analytics.weightTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="avgWeight" 
                          stroke="#f97316" 
                          strokeWidth={2}
                          name="Avg Weight (kg)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-gray-500">
                      No weight data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Performers */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-500" />
                    Top Weight Loss Progress
                  </CardTitle>
                  <CardDescription>Clients with best progress</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.clientProgress
                      .filter(p => p.weightChange < 0)
                      .sort((a, b) => a.weightChange - b.weightChange)
                      .slice(0, 5)
                      .map((progress, idx) => (
                        <div key={progress.client.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{progress.client.full_name}</p>
                              <p className="text-xs text-gray-600">{progress.daysTracking} days tracked</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-green-600 font-bold">
                              <TrendingDown className="w-4 h-4" />
                              {Math.abs(progress.weightChange).toFixed(1)} kg
                            </div>
                            <p className="text-xs text-gray-600">{progress.totalLogs} logs</p>
                          </div>
                        </div>
                      ))}
                    {analytics.clientProgress.filter(p => p.weightChange < 0).length === 0 && (
                      <p className="text-gray-500 text-center py-4">No weight loss data yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Weight Gain Progress */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    Top Weight Gain Progress
                  </CardTitle>
                  <CardDescription>Clients building mass</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.clientProgress
                      .filter(p => p.weightChange > 0)
                      .sort((a, b) => b.weightChange - a.weightChange)
                      .slice(0, 5)
                      .map((progress, idx) => (
                        <div key={progress.client.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{progress.client.full_name}</p>
                              <p className="text-xs text-gray-600">{progress.daysTracking} days tracked</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-blue-600 font-bold">
                              <TrendingUp className="w-4 h-4" />
                              +{progress.weightChange.toFixed(1)} kg
                            </div>
                            <p className="text-xs text-gray-600">{progress.totalLogs} logs</p>
                          </div>
                        </div>
                      ))}
                    {analytics.clientProgress.filter(p => p.weightChange > 0).length === 0 && (
                      <p className="text-gray-500 text-center py-4">No weight gain data yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Engagement Tab */}
          <TabsContent value="engagement" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Adherence Chart */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Meal Plan Adherence Distribution</CardTitle>
                  <CardDescription>How clients are following their plans</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.adherenceRanges.some(r => r.count > 0) ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.adherenceRanges}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" name="Clients">
                          {analytics.adherenceRanges.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-gray-500">
                      No adherence data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Adherence */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Highest Adherence Clients</CardTitle>
                  <CardDescription>Most committed clients</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.clientAdherence.slice(0, 8).map((item) => (
                      <div key={item.client.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {item.client.full_name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{item.client.full_name}</p>
                            <p className="text-xs text-gray-600">{item.logsCount} logs</p>
                          </div>
                        </div>
                        <Badge 
                          className={
                            item.adherence >= 80 ? "bg-green-500" :
                            item.adherence >= 60 ? "bg-yellow-500" :
                            "bg-orange-500"
                          }
                        >
                          {item.adherence.toFixed(0)}%
                        </Badge>
                      </div>
                    ))}
                    {analytics.clientAdherence.length === 0 && (
                      <p className="text-gray-500 text-center py-4">No adherence data yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Needs Attention Tab */}
          <TabsContent value="attention" className="space-y-6">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Clients Needing Attention ({analytics.needsAttention.length})
                </CardTitle>
                <CardDescription>
                  Clients with no activity in the last 7 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.needsAttention.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {analytics.needsAttention.map((client) => {
                      const lastProgress = progressLogs.find(log => log.client_id === client.id);
                      const lastFood = foodLogs.find(log => log.client_id === client.id);
                      const daysSinceProgress = lastProgress ? differenceInDays(new Date(), new Date(lastProgress.date)) : null;
                      const daysSinceFood = lastFood ? differenceInDays(new Date(), new Date(lastFood.date)) : null;

                      return (
                        <Card key={client.id} className="border-2 border-red-200 bg-red-50">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold">
                                  {client.full_name.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{client.full_name}</p>
                                <p className="text-xs text-gray-600">{client.email}</p>
                              </div>
                            </div>
                            <div className="space-y-2 text-sm">
                              {daysSinceProgress && (
                                <div className="flex items-center gap-2 text-red-700">
                                  <Clock className="w-4 h-4" />
                                  <span>{daysSinceProgress} days since progress log</span>
                                </div>
                              )}
                              {daysSinceFood && (
                                <div className="flex items-center gap-2 text-red-700">
                                  <Clock className="w-4 h-4" />
                                  <span>{daysSinceFood} days since food log</span>
                                </div>
                              )}
                              {!daysSinceProgress && !daysSinceFood && (
                                <div className="flex items-center gap-2 text-red-700">
                                  <XCircle className="w-4 h-4" />
                                  <span>No activity recorded</span>
                                </div>
                              )}
                            </div>
                            <Link to={createPageUrl("Communication")}>
                              <Button className="w-full mt-3" size="sm" variant="outline">
                                <MessageCircle className="w-4 h-4 mr-2" />
                                Send Message
                              </Button>
                            </Link>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">All Clients Active!</h3>
                    <p className="text-gray-600">Every client has logged activity in the last 7 days</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Goals Overview Tab */}
          <TabsContent value="goals" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Client Goals Distribution</CardTitle>
                  <CardDescription>What your clients are working towards</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.goalData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={analytics.goalData}
                          dataKey="count"
                          nameKey="goal"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={(entry) => `${entry.goal}: ${entry.count}`}
                        >
                          {analytics.goalData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'][index % 5]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-gray-500">
                      No goal data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                  <CardDescription>Overall platform metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Target className="w-8 h-8 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Clients with Plans</p>
                          <p className="text-2xl font-bold text-gray-900">{analytics.clientsWithPlans}</p>
                        </div>
                      </div>
                      <Badge variant="outline">{((analytics.clientsWithPlans / analytics.totalClients) * 100).toFixed(0)}%</Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Activity className="w-8 h-8 text-green-600" />
                        <div>
                          <p className="text-sm text-gray-600">Active Clients (7d)</p>
                          <p className="text-2xl font-bold text-gray-900">{analytics.activeClients}</p>
                        </div>
                      </div>
                      <Badge variant="outline">{((analytics.activeClients / analytics.totalClients) * 100).toFixed(0)}%</Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <MessageCircle className="w-8 h-8 text-purple-600" />
                        <div>
                          <p className="text-sm text-gray-600">Messages (Last {selectedPeriod}d)</p>
                          <p className="text-2xl font-bold text-gray-900">{analytics.recentMessages}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-8 h-8 text-orange-600" />
                        <div>
                          <p className="text-sm text-gray-600">Progress Logs</p>
                          <p className="text-2xl font-bold text-gray-900">{analytics.totalProgressLogs}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}