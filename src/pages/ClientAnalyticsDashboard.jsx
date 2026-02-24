import React, { useState, useMemo } from "react";

import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
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
  ClipboardList,
  BarChart3,
  Heart,
  Utensils,
  Search,
  X,
  Layers,
  Zap,
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, subDays, differenceInDays } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ClientAnalyticsDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("30"); // days
  const [selectedMetric, setSelectedMetric] = useState("all");
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

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
      if (user?.user_type === 'student_coach') {
        return allClients.filter(client => {
          const assignedCoaches = Array.isArray(client.assigned_coach) 
            ? client.assigned_coach 
            : client.assigned_coach 
              ? [client.assigned_coach] 
              : [];
          return client.created_by === user?.email || assignedCoaches.includes(user?.email);
        });
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

  const { data: assessments } = useQuery({
    queryKey: ['assessments'],
    queryFn: async () => {
      const all = await base44.entities.ClientAssessment.list('-created_date');
      if (user?.user_type === 'super_admin') return all;
      return all.filter(a => a.assigned_by === user?.email);
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: progressGoals } = useQuery({
    queryKey: ['progressGoals'],
    queryFn: () => base44.entities.ProgressGoal.list('-created_date'),
    initialData: [],
  });

  const { data: mpessLogs } = useQuery({
    queryKey: ['mpessLogs'],
    queryFn: () => base44.entities.MPESSTracker.list('-submission_date', 500),
    initialData: [],
  });

  const { data: clientGroups } = useQuery({
    queryKey: ['clientGroups'],
    queryFn: () => base44.entities.ClientGroup.list('-created_date'),
    initialData: [],
  });

  // Calculate analytics
  const analytics = useMemo(() => {
    // Apply date range if specified
    let cutoffDate = subDays(new Date(), parseInt(selectedPeriod));
    let endDate = new Date();

    if (dateRange.start) {
      cutoffDate = new Date(dateRange.start);
    }
    if (dateRange.end) {
      endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
    }
    
    // Filter data by selected client and search term
    let filteredClients = selectedClient === "all" ? clients : clients.filter(c => c.id === selectedClient);

    // Apply group filter
    if (selectedGroup !== "all") {
      const group = clientGroups.find(g => g.id === selectedGroup);
      if (group?.client_ids?.length) {
        filteredClients = filteredClients.filter(c => group.client_ids.includes(c.id));
      }
    }
    
    // Apply search filter to clients
    if (searchTerm.trim()) {
      filteredClients = filteredClients.filter(c => 
        c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    const filteredProgressLogs = selectedClient === "all" ? progressLogs : progressLogs.filter(l => l.client_id === selectedClient);
    const filteredFoodLogs = selectedClient === "all" ? foodLogs : foodLogs.filter(l => l.client_id === selectedClient);
    const filteredGoals = selectedClient === "all" ? progressGoals : progressGoals.filter(g => g.client_id === selectedClient);
    
    // Active clients (logged progress or food in last 7 days)
    const recentDate = subDays(new Date(), 7);
    const activeClientIds = new Set([
      ...filteredProgressLogs.filter(log => log.date && !isNaN(new Date(log.date).getTime()) && new Date(log.date) >= recentDate).map(log => log.client_id),
      ...filteredFoodLogs.filter(log => log.date && !isNaN(new Date(log.date).getTime()) && new Date(log.date) >= recentDate).map(log => log.client_id)
    ]);

    // Clients with plans
    const clientsWithPlans = filteredClients.filter(c => 
      mealPlans.some(p => p.client_id === c.id && p.active)
    );

    // Weight loss progress
    const clientProgress = filteredClients.map(client => {
      const clientLogs = filteredProgressLogs
        .filter(log => log.client_id === client.id && log.weight && log.date && !isNaN(new Date(log.date).getTime()))
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
    const clientAdherence = filteredClients.map(client => {
      const recentLogs = filteredProgressLogs.filter(log => 
        log.client_id === client.id && 
        log.date && !isNaN(new Date(log.date).getTime()) &&
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
    const needsAttention = filteredClients.filter(client => {
      const clientLogs = filteredProgressLogs.filter(log => log.client_id === client.id && log.date && !isNaN(new Date(log.date).getTime()));
      const clientFoodLogs = filteredFoodLogs.filter(log => log.client_id === client.id && log.date && !isNaN(new Date(log.date).getTime()));
      const lastProgress = clientLogs[0];
      const lastFood = clientFoodLogs[0];
      
      const daysSinceProgress = lastProgress && lastProgress.date && !isNaN(new Date(lastProgress.date).getTime()) ? differenceInDays(new Date(), new Date(lastProgress.date)) : 999;
      const daysSinceFood = lastFood && lastFood.date && !isNaN(new Date(lastFood.date).getTime()) ? differenceInDays(new Date(), new Date(lastFood.date)) : 999;

      return daysSinceProgress > 7 || daysSinceFood > 7;
    });

    // Message activity
    const recentMessages = messages.filter(msg => msg.created_date && !isNaN(new Date(msg.created_date).getTime()) && new Date(msg.created_date) >= cutoffDate);

    // Weight trend data (last 30 days average)
    const weightTrendData = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'MMM dd');
      
      const logsOnDate = filteredProgressLogs.filter(log => 
        log.date && !isNaN(new Date(log.date).getTime()) &&
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
    const goalDistribution = filteredClients.reduce((acc, client) => {
      const goal = client.goal || 'unknown';
      acc[goal] = (acc[goal] || 0) + 1;
      return acc;
    }, {});

    const goalData = Object.entries(goalDistribution).map(([goal, count]) => ({
      goal: goal.replace(/_/g, ' '),
      count,
    }));

    // Module Usage Stats
    const completedAssessments = assessments.filter(a => a.status === 'completed' && (selectedClient === "all" || a.client_id === selectedClient)).length;
    const pendingAssessments = assessments.filter(a => a.status === 'pending' && (selectedClient === "all" || a.client_id === selectedClient)).length;
    const activeGoals = filteredGoals.filter(g => g.status === 'active').length;
    const completedGoals = filteredGoals.filter(g => g.status === 'completed').length;
    const recentMPESS = mpessLogs.filter(log => log.submission_date && !isNaN(new Date(log.submission_date).getTime()) && new Date(log.submission_date) >= cutoffDate).length;
    
    // Assessment completion rate
    const assessmentCompletionRate = assessments.length > 0 
      ? ((completedAssessments / assessments.length) * 100).toFixed(0)
      : 0;
    
    // Goals achievement rate
    const goalAchievementRate = progressGoals.length > 0
      ? ((completedGoals / progressGoals.length) * 100).toFixed(0)
      : 0;

    // Module usage over time (last 30 days)
    const moduleUsageData = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'MMM dd');
      
      const progressCount = filteredProgressLogs.filter(log => 
        log.date && !isNaN(new Date(log.date).getTime()) &&
        format(new Date(log.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      ).length;
      
      const foodCount = filteredFoodLogs.filter(log => 
        log.date && !isNaN(new Date(log.date).getTime()) &&
        format(new Date(log.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      ).length;
      
      const mpessCount = mpessLogs.filter(log => 
        log.submission_date && !isNaN(new Date(log.submission_date).getTime()) &&
        format(new Date(log.submission_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      ).length;

      moduleUsageData.push({ date: dateStr, progress: progressCount, food: foodCount, mpess: mpessCount });
    }

    // Client wellness trends
    const wellnessTrends = filteredProgressLogs
      .filter(log => log.wellness_metrics && log.date && !isNaN(new Date(log.date).getTime()) && new Date(log.date) >= cutoffDate)
      .reduce((acc, log) => {
        if (log.wellness_metrics.energy_level) {
          acc.totalEnergy += log.wellness_metrics.energy_level;
          acc.energyCount++;
        }
        if (log.wellness_metrics.sleep_quality) {
          acc.totalSleep += log.wellness_metrics.sleep_quality;
          acc.sleepCount++;
        }
        if (log.wellness_metrics.stress_level) {
          acc.totalStress += log.wellness_metrics.stress_level;
          acc.stressCount++;
        }
        return acc;
      }, { totalEnergy: 0, energyCount: 0, totalSleep: 0, sleepCount: 0, totalStress: 0, stressCount: 0 });

    const avgEnergy = wellnessTrends.energyCount > 0 ? (wellnessTrends.totalEnergy / wellnessTrends.energyCount).toFixed(1) : 0;
    const avgSleep = wellnessTrends.sleepCount > 0 ? (wellnessTrends.totalSleep / wellnessTrends.sleepCount).toFixed(1) : 0;
    const avgStress = wellnessTrends.stressCount > 0 ? (wellnessTrends.totalStress / wellnessTrends.stressCount).toFixed(1) : 0;

    return {
      totalClients: filteredClients.length,
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
      totalProgressLogs: filteredProgressLogs.filter(log => log.date && !isNaN(new Date(log.date).getTime()) && new Date(log.date) >= cutoffDate && new Date(log.date) <= endDate).length,
      totalFoodLogs: filteredFoodLogs.filter(log => log.date && !isNaN(new Date(log.date).getTime()) && new Date(log.date) >= cutoffDate && new Date(log.date) <= endDate).length,
      completedAssessments,
      pendingAssessments,
      assessmentCompletionRate,
      activeGoals,
      completedGoals,
      goalAchievementRate,
      recentMPESS,
      moduleUsageData,
      avgEnergy,
      avgSleep,
      avgStress,
      filteredClients,
    };
  }, [clients, progressLogs, foodLogs, mealPlans, messages, assessments, progressGoals, mpessLogs, selectedPeriod, selectedClient, selectedGroup, searchTerm, dateRange]);

  return (
    <div className="min-h-screen p-3 md:p-8 pb-24 md:pb-6">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2 md:gap-4">
         <div>
           <h1 className="text-lg sm:text-2xl md:text-4xl font-bold text-gray-900 mb-1 md:mb-2">Client Analytics</h1>
           <p className="text-xs md:text-base text-gray-600">Track progress, engagement, and identify clients needing attention</p>
         </div>
          
          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <Button
              variant={selectedPeriod === "7" ? "default" : "outline"}
              onClick={() => setSelectedPeriod("7")}
              size="sm"
              className="flex-1 sm:flex-none"
            >
              7 Days
            </Button>
            <Button
              variant={selectedPeriod === "30" ? "default" : "outline"}
              onClick={() => setSelectedPeriod("30")}
              size="sm"
              className="flex-1 sm:flex-none"
            >
              30 Days
            </Button>
            <Button
              variant={selectedPeriod === "90" ? "default" : "outline"}
              onClick={() => setSelectedPeriod("90")}
              size="sm"
              className="flex-1 sm:flex-none"
            >
              90 Days
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
          <CardContent className="p-2.5 md:p-4">
            <div className="space-y-3 md:space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search clients by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10 h-10 border-gray-300 focus:ring-orange-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Date Range Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Start Date</Label>
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">End Date</Label>
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="h-10"
                  />
                </div>
              </div>

              {/* Other Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> Filter by Group</Label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => { setSelectedGroup(e.target.value); setSelectedClient("all"); }}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="all">All Groups</option>
                    {clientGroups.map(group => (
                      <option key={group.id} value={group.id}>{group.name} ({group.client_ids?.length || 0})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Filter by Client</Label>
                  <select
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="all">All Clients</option>
                    {analytics.filteredClients.map(client => (
                      <option key={client.id} value={client.id}>{client.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Focus Metric</Label>
                  <select
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="all">All Metrics</option>
                    <option value="weight">Weight Only</option>
                    <option value="wellness">Wellness Only</option>
                    <option value="adherence">Adherence Only</option>
                    <option value="goals">Goals Only</option>
                  </select>
                </div>
              </div>

              {/* Active Filters Display */}
              {(searchTerm || dateRange.start || dateRange.end || selectedGroup !== "all" || selectedClient !== "all") && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedGroup !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-2 bg-blue-100 text-blue-800">
                      Group: {clientGroups.find(g => g.id === selectedGroup)?.name}
                      <button onClick={() => setSelectedGroup("all")} className="ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                  {selectedClient !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-2 bg-purple-100 text-purple-800">
                      Client: {clients.find(c => c.id === selectedClient)?.full_name}
                      <button onClick={() => setSelectedClient("all")} className="ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                  {searchTerm && (
                    <Badge variant="secondary" className="flex items-center gap-2">
                      Search: {searchTerm}
                      <button onClick={() => setSearchTerm("")} className="ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                  {dateRange.start && (
                    <Badge variant="secondary" className="flex items-center gap-2">
                      From: {dateRange.start}
                      <button onClick={() => setDateRange({ ...dateRange, start: "" })} className="ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                  {dateRange.end && (
                    <Badge variant="secondary" className="flex items-center gap-2">
                      To: {dateRange.end}
                      <button onClick={() => setDateRange({ ...dateRange, end: "" })} className="ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* Module Usage Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <ClipboardList className="w-8 h-8 text-indigo-600" />
                <div>
                  <p className="text-xs text-gray-600">Assessments</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.completedAssessments}</p>
                  <p className="text-xs text-green-600">{analytics.assessmentCompletionRate}% completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-xs text-gray-600">Goals</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.completedGoals}</p>
                  <p className="text-xs text-green-600">{analytics.goalAchievementRate}% achieved</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-xs text-gray-600">Progress Logs</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.totalProgressLogs}</p>
                  <p className="text-xs text-gray-600">Last {selectedPeriod} days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Utensils className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-xs text-gray-600">Food Logs</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.totalFoodLogs}</p>
                  <p className="text-xs text-gray-600">Last {selectedPeriod} days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Heart className="w-8 h-8 text-pink-600" />
                <div>
                  <p className="text-xs text-gray-600">MPESS Logs</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.recentMPESS}</p>
                  <p className="text-xs text-gray-600">Last {selectedPeriod} days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 bg-white/80 backdrop-blur w-full">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="trends" className="text-xs sm:text-sm">Trends</TabsTrigger>
            <TabsTrigger value="progress" className="text-xs sm:text-sm">Progress</TabsTrigger>
            <TabsTrigger value="engagement" className="text-xs sm:text-sm">Engagement</TabsTrigger>
            <TabsTrigger value="attention" className="text-xs sm:text-sm">Attention</TabsTrigger>
            <TabsTrigger value="modules" className="text-xs sm:text-sm col-span-3 sm:col-span-1">Modules</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Module Usage Chart */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Daily Module Activity (Last 30 Days)</CardTitle>
                <CardDescription>Track how clients are using different features</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={analytics.moduleUsageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="progress" fill="#f97316" name="Progress Logs" stackId="a" />
                    <Bar dataKey="food" fill="#10b981" name="Food Logs" stackId="a" />
                    <Bar dataKey="mpess" fill="#ec4899" name="MPESS Logs" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Wellness Metrics Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Card className="border-none shadow-lg bg-gradient-to-br from-yellow-50 to-orange-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Avg Energy</p>
                      <p className="text-3xl font-bold text-orange-600">{analytics.avgEnergy}<span className="text-lg">/10</span></p>
                      <p className="text-xs text-gray-500 mt-1">Across all clients</p>
                    </div>
                    <Activity className="w-12 h-12 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Avg Sleep</p>
                      <p className="text-3xl font-bold text-blue-600">{analytics.avgSleep}<span className="text-lg">/10</span></p>
                      <p className="text-xs text-gray-500 mt-1">Sleep quality</p>
                    </div>
                    <Clock className="w-12 h-12 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-pink-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Avg Stress</p>
                      <p className="text-3xl font-bold text-red-600">{analytics.avgStress}<span className="text-lg">/10</span></p>
                      <p className="text-xs text-gray-500 mt-1">Stress level</p>
                    </div>
                    <AlertTriangle className="w-12 h-12 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Assessment & Goals Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-indigo-600" />
                    Assessment Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600">Completed</p>
                        <p className="text-2xl font-bold text-green-600">{analytics.completedAssessments}</p>
                      </div>
                      <Badge className="bg-green-600 text-white text-lg px-4 py-1">
                        {analytics.assessmentCompletionRate}%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600">Pending</p>
                        <p className="text-2xl font-bold text-yellow-600">{analytics.pendingAssessments}</p>
                      </div>
                      <Link to={createPageUrl("ClientAssessments")}>
                        <Button size="sm" variant="outline">View All</Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    Goals Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600">Active Goals</p>
                        <p className="text-2xl font-bold text-purple-600">{analytics.activeGoals}</p>
                      </div>
                      <Badge className="bg-purple-600 text-white">In Progress</Badge>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600">Achieved</p>
                        <p className="text-2xl font-bold text-green-600">{analytics.completedGoals}</p>
                      </div>
                      <Badge className="bg-green-600 text-white text-lg px-4 py-1">
                        {analytics.goalAchievementRate}%
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            {/* Wellness Trends Over Time */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  Wellness Trends Over Time
                </CardTitle>
                <CardDescription>Average energy, sleep quality, and stress across {selectedGroup !== "all" ? clientGroups.find(g=>g.id===selectedGroup)?.name : "all clients"}</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                {(() => {
                  const days = parseInt(selectedPeriod);
                  const trendData = [];
                  for (let i = days - 1; i >= 0; i--) {
                    const date = subDays(new Date(), i);
                    const dateStr = format(date, 'MMM dd');
                    const logsOnDate = progressLogs.filter(log => {
                      if (!log.date || !log.wellness_metrics) return false;
                      const clientIds = analytics.filteredClients.map(c => c.id);
                      return clientIds.includes(log.client_id) && format(new Date(log.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
                    });
                    const energy = logsOnDate.filter(l => l.wellness_metrics?.energy_level);
                    const sleep = logsOnDate.filter(l => l.wellness_metrics?.sleep_quality);
                    const stress = logsOnDate.filter(l => l.wellness_metrics?.stress_level);
                    trendData.push({
                      date: dateStr,
                      energy: energy.length ? (energy.reduce((s, l) => s + l.wellness_metrics.energy_level, 0) / energy.length).toFixed(1) : null,
                      sleep: sleep.length ? (sleep.reduce((s, l) => s + l.wellness_metrics.sleep_quality, 0) / sleep.length).toFixed(1) : null,
                      stress: stress.length ? (stress.reduce((s, l) => s + l.wellness_metrics.stress_level, 0) / stress.length).toFixed(1) : null,
                    });
                  }
                  const hasData = trendData.some(d => d.energy || d.sleep || d.stress);
                  return hasData ? (
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 10]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="energy" stroke="#f97316" strokeWidth={2} name="Energy (/10)" connectNulls dot={false} />
                        <Line type="monotone" dataKey="sleep" stroke="#3b82f6" strokeWidth={2} name="Sleep Quality (/10)" connectNulls dot={false} />
                        <Line type="monotone" dataKey="stress" stroke="#ef4444" strokeWidth={2} name="Stress (/10)" connectNulls dot={false} strokeDasharray="4 2" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[320px] flex items-center justify-center text-gray-500">No wellness data in selected period</div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Activity Level Trend */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-500" />
                  Logging Activity Trend
                </CardTitle>
                <CardDescription>Number of clients actively logging per day</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                {(() => {
                  const days = parseInt(selectedPeriod);
                  const activityData = [];
                  const clientIds = analytics.filteredClients.map(c => c.id);
                  for (let i = days - 1; i >= 0; i--) {
                    const date = subDays(new Date(), i);
                    const dateStr = format(date, 'MMM dd');
                    const activeOnDate = new Set([
                      ...progressLogs.filter(l => clientIds.includes(l.client_id) && l.date && format(new Date(l.date),'yyyy-MM-dd') === format(date,'yyyy-MM-dd')).map(l => l.client_id),
                      ...foodLogs.filter(l => clientIds.includes(l.client_id) && l.date && format(new Date(l.date),'yyyy-MM-dd') === format(date,'yyyy-MM-dd')).map(l => l.client_id),
                    ]);
                    activityData.push({ date: dateStr, activeClients: activeOnDate.size });
                  }
                  return (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={activityData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="activeClients" fill="#10b981" name="Active Clients" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Adherence Trend */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-orange-500" />
                  Meal Adherence Trend
                </CardTitle>
                <CardDescription>Average meal plan adherence % over time</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                {(() => {
                  const days = parseInt(selectedPeriod);
                  const adherenceTrend = [];
                  const clientIds = analytics.filteredClients.map(c => c.id);
                  for (let i = days - 1; i >= 0; i--) {
                    const date = subDays(new Date(), i);
                    const dateStr = format(date, 'MMM dd');
                    const logsOnDate = progressLogs.filter(l =>
                      clientIds.includes(l.client_id) && l.date && l.meal_adherence != null &&
                      format(new Date(l.date),'yyyy-MM-dd') === format(date,'yyyy-MM-dd')
                    );
                    const avg = logsOnDate.length ? (logsOnDate.reduce((s,l) => s + l.meal_adherence, 0) / logsOnDate.length) : null;
                    adherenceTrend.push({ date: dateStr, adherence: avg ? parseFloat(avg.toFixed(1)) : null });
                  }
                  const hasData = adherenceTrend.some(d => d.adherence !== null);
                  return hasData ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={adherenceTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} unit="%" />
                        <Tooltip formatter={(v) => v ? `${v}%` : 'No data'} />
                        <Line type="monotone" dataKey="adherence" stroke="#f97316" strokeWidth={2} name="Avg Adherence" connectNulls dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-gray-500">No adherence data in selected period</div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Progress Tracking Tab */}
          <TabsContent value="progress" className="space-y-6">
            {/* Consolidated Progress Dashboard */}
            <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl">📊 {selectedClient === "all" ? "All Clients" : analytics.filteredClients[0]?.full_name} Progress Overview</CardTitle>
                <CardDescription className="text-sm">Quick snapshot of progress</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  <div className="p-4 bg-white rounded-lg shadow">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingDown className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">Losing Weight</p>
                        <p className="text-3xl font-bold text-green-600">
                          {analytics.clientProgress.filter(p => p.weightChange < 0).length}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Avg: {analytics.clientProgress.filter(p => p.weightChange < 0).length > 0 
                        ? (analytics.clientProgress.filter(p => p.weightChange < 0).reduce((sum, p) => sum + p.weightChange, 0) / analytics.clientProgress.filter(p => p.weightChange < 0).length).toFixed(1)
                        : '0'} kg
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-lg shadow">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingUp className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">Gaining Weight</p>
                        <p className="text-3xl font-bold text-blue-600">
                          {analytics.clientProgress.filter(p => p.weightChange > 0).length}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Avg: +{analytics.clientProgress.filter(p => p.weightChange > 0).length > 0 
                        ? (analytics.clientProgress.filter(p => p.weightChange > 0).reduce((sum, p) => sum + p.weightChange, 0) / analytics.clientProgress.filter(p => p.weightChange > 0).length).toFixed(1)
                        : '0'} kg
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-lg shadow">
                    <div className="flex items-center gap-3 mb-2">
                      <Award className="w-8 h-8 text-yellow-600" />
                      <div>
                        <p className="text-sm text-gray-600">Top Performer</p>
                        <p className="text-xl font-bold text-yellow-600">
                          {analytics.clientProgress.filter(p => p.weightChange < 0).sort((a, b) => a.weightChange - b.weightChange)[0]?.client.full_name.split(' ')[0] || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      {analytics.clientProgress.filter(p => p.weightChange < 0)[0]?.weightChange.toFixed(1) || '0'} kg lost
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-lg shadow">
                    <div className="flex items-center gap-3 mb-2">
                      <Target className="w-8 h-8 text-purple-600" />
                      <div>
                        <p className="text-sm text-gray-600">Tracking Clients</p>
                        <p className="text-3xl font-bold text-purple-600">
                          {analytics.clientProgress.length}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      {((analytics.clientProgress.length / analytics.totalClients) * 100).toFixed(0)}% of all clients
                    </p>
                  </div>
                </div>

                {/* At-risk and excelling clients */}
                <div className="grid grid-cols-1 gap-4 mt-6">
                  {/* Excelling Clients */}
                  <div className="p-4 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg border-2 border-green-300">
                    <div className="flex items-center gap-2 mb-3">
                      <Award className="w-6 h-6 text-green-700" />
                      <h3 className="font-bold text-green-900">🌟 Excelling (High Adherence)</h3>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {analytics.clientAdherence
                        .filter(c => c.adherence >= 80)
                        .slice(0, 5)
                        .map(item => (
                          <div key={item.client.id} className="flex items-center justify-between p-2 bg-white/80 rounded">
                            <span className="text-sm font-semibold text-gray-900">{item.client.full_name}</span>
                            <Badge className="bg-green-600 text-white">{item.adherence.toFixed(0)}%</Badge>
                          </div>
                        ))}
                      {analytics.clientAdherence.filter(c => c.adherence >= 80).length === 0 && (
                        <p className="text-sm text-gray-600 text-center py-2">No clients with 80%+ adherence yet</p>
                      )}
                    </div>
                  </div>

                  {/* At-risk Clients */}
                  <div className="p-4 bg-gradient-to-br from-red-100 to-orange-100 rounded-lg border-2 border-red-300">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-6 h-6 text-red-700" />
                      <h3 className="font-bold text-red-900">⚠️ Off-Track (Low Adherence)</h3>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {analytics.clientAdherence
                        .filter(c => c.adherence < 50)
                        .slice(0, 5)
                        .map(item => (
                          <div key={item.client.id} className="flex items-center justify-between p-2 bg-white/80 rounded">
                            <span className="text-sm font-semibold text-gray-900">{item.client.full_name}</span>
                            <Badge className="bg-red-600 text-white">{item.adherence.toFixed(0)}%</Badge>
                          </div>
                        ))}
                      {analytics.clientAdherence.filter(c => c.adherence < 50).length === 0 && (
                        <p className="text-sm text-gray-600 text-center py-2">No at-risk clients 🎉</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weight Trend Chart */}
              <Card className="border-none shadow-lg col-span-2">
                <CardHeader>
                  <CardTitle>Average Weight Trend (Last 30 Days)</CardTitle>
                  <CardDescription>Daily average weight across all clients</CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
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
                <CardContent className="p-3 sm:p-6">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {analytics.needsAttention.map((client) => {
                     const lastProgress = progressLogs.find(log => log.client_id === client.id && log.date && !isNaN(new Date(log.date).getTime()));
                     const lastFood = foodLogs.find(log => log.client_id === client.id && log.date && !isNaN(new Date(log.date).getTime()));
                     const daysSinceProgress = lastProgress && lastProgress.date && !isNaN(new Date(lastProgress.date).getTime()) ? differenceInDays(new Date(), new Date(lastProgress.date)) : null;
                     const daysSinceFood = lastFood && lastFood.date && !isNaN(new Date(lastFood.date).getTime()) ? differenceInDays(new Date(), new Date(lastFood.date)) : null;

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

          {/* Module Usage Tab */}
          <TabsContent value="modules" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Assessment Analytics */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-indigo-600" />
                    Assessment Analytics
                  </CardTitle>
                  <CardDescription>Client assessment completion and insights</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-indigo-50 rounded-lg">
                      <p className="text-xs text-gray-600">Total</p>
                      <p className="text-2xl font-bold text-indigo-600">{assessments.length}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-gray-600">Completed</p>
                      <p className="text-2xl font-bold text-green-600">{analytics.completedAssessments}</p>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <p className="text-xs text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-yellow-600">{analytics.pendingAssessments}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg text-white">
                    <p className="text-sm mb-1">Completion Rate</p>
                    <p className="text-3xl font-bold">{analytics.assessmentCompletionRate}%</p>
                  </div>
                </CardContent>
              </Card>

              {/* Goals Analytics */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    Goals Analytics
                  </CardTitle>
                  <CardDescription>Client goal tracking and achievement</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <p className="text-xs text-gray-600">Total</p>
                      <p className="text-2xl font-bold text-purple-600">{progressGoals.length}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-gray-600">Active</p>
                      <p className="text-2xl font-bold text-blue-600">{analytics.activeGoals}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-gray-600">Achieved</p>
                      <p className="text-2xl font-bold text-green-600">{analytics.completedGoals}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white">
                    <p className="text-sm mb-1">Achievement Rate</p>
                    <p className="text-3xl font-bold">{analytics.goalAchievementRate}%</p>
                  </div>
                </CardContent>
              </Card>

              {/* Activity Breakdown */}
              <Card className="border-none shadow-lg col-span-2">
                <CardHeader>
                  <CardTitle>Module Activity Breakdown</CardTitle>
                  <CardDescription>Distribution of client activity across modules</CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Progress Logs', value: analytics.totalProgressLogs, color: '#f97316' },
                          { name: 'Food Logs', value: analytics.totalFoodLogs, color: '#10b981' },
                          { name: 'MPESS Logs', value: analytics.recentMPESS, color: '#ec4899' },
                          { name: 'Messages', value: analytics.recentMessages, color: '#3b82f6' },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                      >
                        {[
                          { name: 'Progress Logs', value: analytics.totalProgressLogs, color: '#f97316' },
                          { name: 'Food Logs', value: analytics.totalFoodLogs, color: '#10b981' },
                          { name: 'MPESS Logs', value: analytics.recentMPESS, color: '#ec4899' },
                          { name: 'Messages', value: analytics.recentMessages, color: '#3b82f6' },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Goals Overview Tab - Renamed from goals to avoid confusion */}
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