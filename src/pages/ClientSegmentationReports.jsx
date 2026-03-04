import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import {
  Users,
  TrendingUp,
  Activity,
  Target,
  Download,
  Filter,
  BarChart3,
  Loader2,
  Award,
  Calendar,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import { useClientSegmentation } from "@/components/client/ClientSegmentationEngine";
import SegmentationFilterPanel from "@/components/client/SegmentationFilterPanel";
import SegmentAnalytics from "@/components/client/SegmentAnalytics";
import SegmentedClientList from "@/components/client/SegmentedClientList";

export default function ClientSegmentationReports() {
  const [selectedSegments, setSelectedSegments] = useState([]);
  const [segmentBy, setSegmentBy] = useState("goal");
  const [filterGoal, setFilterGoal] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCoach, setFilterCoach] = useState("all");
  const [filterHealthCondition, setFilterHealthCondition] = useState("all");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['allClients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: [],
  });

  const { data: progressLogs } = useQuery({
    queryKey: ['allProgressLogs'],
    queryFn: () => base44.entities.ProgressLog.list(),
    initialData: [],
  });

  const { data: mealPlans } = useQuery({
    queryKey: ['allMealPlans'],
    queryFn: () => base44.entities.MealPlan.list(),
    initialData: [],
  });

  const { data: coaches } = useQuery({
    queryKey: ['allCoaches'],
    queryFn: async () => {
      return await base44.entities.User.filter({ user_type: 'student_coach' });
    },
    initialData: [],
  });

  const { data: coachProfiles } = useQuery({
    queryKey: ['allCoachProfiles'],
    queryFn: () => base44.entities.CoachProfile.list(),
    initialData: [],
  });

  // Generate advanced segments
  const segments = useClientSegmentation(clients, progressLogs);

  // Apply filters
  const filteredClients = useMemo(() => {
    let result = clients.filter(client => {
      if (filterGoal !== "all" && client.goal !== filterGoal) return false;
      if (filterStatus !== "all" && client.status !== filterStatus) return false;
      if (filterCoach !== "all" && (!client.assigned_coach || !client.assigned_coach.includes(filterCoach))) return false;
      if (filterHealthCondition !== "all" && (!client.health_conditions || !client.health_conditions.includes(filterHealthCondition))) return false;
      return true;
    });

    // Apply advanced segmentation filters
    if (selectedSegments.length > 0) {
      const segmentsByCategory = {};
      selectedSegments.forEach(segment => {
        const [categoryKey, segmentKey] = segment.split('-');
        if (!segmentsByCategory[categoryKey]) {
          segmentsByCategory[categoryKey] = [];
        }
        const segmentData = segments[categoryKey] || {};
        segmentData[segmentKey]?.forEach(client => {
          if (!segmentsByCategory[categoryKey].find(c => c.id === client.id)) {
            segmentsByCategory[categoryKey].push(client);
          }
        });
      });

      const categories = Object.keys(segmentsByCategory);
      if (categories.length > 0) {
        result = result.filter(client =>
          categories.every(cat => segmentsByCategory[cat].find(c => c.id === client.id))
        );
      }
    }

    return result;
  }, [clients, filterGoal, filterStatus, filterCoach, filterHealthCondition, selectedSegments, segments]);

  // Calculate metrics for each segment
  const segmentMetrics = useMemo(() => {
    return Object.entries(segments).flatMap(([key, segmentClients]) => {
      // Skip null/undefined values
      if (!segmentClients) return [];
      // atRisk and similar top-level arrays are flat arrays, not sub-segment objects
      if (Array.isArray(segmentClients)) {
        const clientIds = segmentClients.map(c => c.id);
        const segmentProgress = progressLogs.filter(p => clientIds.includes(p.client_id));
        const segmentPlans = mealPlans.filter(m => clientIds.includes(m.client_id));
        const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentProgress = segmentProgress.filter(p => new Date(p.date) >= last30Days);
        const engagedClients = new Set(recentProgress.map(p => p.client_id)).size;
        const engagementRate = segmentClients.length > 0 ? (engagedClients / segmentClients.length) * 100 : 0;
        const activeClients = segmentClients.filter(c => c.status === 'active').length;
        return [{
          name: key,
          count: segmentClients.length,
          activeClients,
          avgWeightLoss: "0.0",
          engagementRate: engagementRate.toFixed(0),
          mealPlans: segmentPlans.length,
          progressLogs: segmentProgress.length
        }];
      }
      // Normal sub-segment objects
      return Object.entries(segmentClients).flatMap(([subKey, subClients]) => {
        if (!Array.isArray(subClients)) return [];
        const clientIds = subClients.map(c => c.id);
        const segmentProgress = progressLogs.filter(p => clientIds.includes(p.client_id));
        const segmentPlans = mealPlans.filter(m => clientIds.includes(m.client_id));
        const weightChanges = subClients.map(client => {
          const clientProgress = segmentProgress.filter(p => p.client_id === client.id).sort((a, b) => new Date(b.date) - new Date(a.date));
          if (clientProgress.length > 0 && client.initial_weight) return client.initial_weight - clientProgress[0].weight;
          return 0;
        }).filter(w => w !== 0);
        const avgWeightLoss = weightChanges.length > 0 ? weightChanges.reduce((a, b) => a + b, 0) / weightChanges.length : 0;
        const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentProgress = segmentProgress.filter(p => new Date(p.date) >= last30Days);
        const engagedClients = new Set(recentProgress.map(p => p.client_id)).size;
        const engagementRate = subClients.length > 0 ? (engagedClients / subClients.length) * 100 : 0;
        const activeClients = subClients.filter(c => c.status === 'active').length;
        return {
          name: subKey,
          count: subClients.length,
          activeClients,
          avgWeightLoss: avgWeightLoss.toFixed(1),
          engagementRate: engagementRate.toFixed(0),
          mealPlans: segmentPlans.length,
          progressLogs: segmentProgress.length
        };
      });
    });
  }, [segments, progressLogs, mealPlans]);

  // Coach performance metrics
  const coachPerformance = useMemo(() => {
    return coaches.map(coach => {
      const coachClients = filteredClients.filter(c => 
        c.assigned_coach && c.assigned_coach.includes(coach.email)
      );
      const clientIds = coachClients.map(c => c.id);
      const coachProgress = progressLogs.filter(p => clientIds.includes(p.client_id));
      
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentProgress = coachProgress.filter(p => new Date(p.date) >= last30Days);
      const engagedClients = new Set(recentProgress.map(p => p.client_id)).size;
      const engagementRate = coachClients.length > 0 
        ? (engagedClients / coachClients.length) * 100 
        : 0;
      
      const profile = coachProfiles.find(p => p.created_by === coach.email);
      
      return {
        name: coach.full_name,
        email: coach.email,
        clients: coachClients.length,
        activeClients: coachClients.filter(c => c.status === 'active').length,
        engagementRate: engagementRate.toFixed(0),
        specializations: profile?.specializations?.length || 0,
        capacity: profile?.availability_settings?.max_client_capacity || 50
      };
    }).sort((a, b) => b.clients - a.clients);
  }, [coaches, filteredClients, progressLogs, coachProfiles]);

  // Trend data - weight loss over time
  const trendData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      return {
        month: date.toLocaleString('default', { month: 'short' }),
        date: date
      };
    });
    
    return last6Months.map(({ month, date }) => {
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthProgress = progressLogs.filter(p => {
        const pDate = new Date(p.date);
        return pDate >= monthStart && pDate <= monthEnd;
      });
      
      const avgAdherence = monthProgress.length > 0
        ? monthProgress.reduce((sum, p) => sum + (p.meal_adherence || 0), 0) / monthProgress.length
        : 0;
      
      const uniqueClients = new Set(monthProgress.map(p => p.client_id)).size;
      
      return {
        month,
        clients: uniqueClients,
        adherence: avgAdherence.toFixed(0),
        logs: monthProgress.length
      };
    });
  }, [progressLogs]);

  // Export functionality
  const handleExport = () => {
    const csvData = [
      ['Segment', 'Total Clients', 'Active Clients', 'Avg Weight Loss (kg)', 'Engagement Rate (%)', 'Meal Plans', 'Progress Logs'],
      ...segmentMetrics.map(m => [
        m.name,
        m.count,
        m.activeClients,
        m.avgWeightLoss,
        m.engagementRate,
        m.mealPlans,
        m.progressLogs
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `client-segments-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Report exported successfully!");
  };

  const handleExportCoachPerformance = () => {
    const csvData = [
      ['Coach Name', 'Email', 'Total Clients', 'Active Clients', 'Engagement Rate (%)', 'Specializations', 'Capacity'],
      ...coachPerformance.map(c => [
        c.name,
        c.email,
        c.clients,
        c.activeClients,
        c.engagementRate,
        c.specializations,
        c.capacity
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coach-performance-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Coach performance report exported!");
  };

  if (clientsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const COLORS = ['#f97316', '#dc2626', '#16a34a', '#2563eb', '#9333ea', '#ca8a04', '#0891b2'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-orange-500" />
              Client Segmentation & Reports
            </h1>
            <p className="text-gray-600 mt-2">Advanced analytics and insights across client segments</p>
          </div>
        </div>

        {/* Advanced Segmentation Filter */}
         <SegmentationFilterPanel
           segments={segments}
           selectedSegments={selectedSegments}
           onSegmentChange={setSelectedSegments}
         />

        {/* Filters */}
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Filter className="w-5 h-5 text-orange-500" />
               Additional Filters
             </CardTitle>
           </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Segment By</Label>
                <Select value={segmentBy} onValueChange={setSegmentBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="goal">Goal</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="coach">Coach</SelectItem>
                    <SelectItem value="health_condition">Health Condition</SelectItem>
                    <SelectItem value="activity_level">Activity Level</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Goal</Label>
                <Select value={filterGoal} onValueChange={setFilterGoal}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Goals</SelectItem>
                    <SelectItem value="weight_loss">Weight Loss</SelectItem>
                    <SelectItem value="weight_gain">Weight Gain</SelectItem>
                    <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                    <SelectItem value="health_improvement">Health Improvement</SelectItem>
                    <SelectItem value="disease_reversal">Disease Reversal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Coach</Label>
                <Select value={filterCoach} onValueChange={setFilterCoach}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Coaches</SelectItem>
                    {coaches.map(coach => (
                      <SelectItem key={coach.email} value={coach.email}>
                        {coach.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Health Condition</Label>
                <Select value={filterHealthCondition} onValueChange={setFilterHealthCondition}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Conditions</SelectItem>
                    <SelectItem value="diabetes_type2">Diabetes Type 2</SelectItem>
                    <SelectItem value="hypertension">Hypertension</SelectItem>
                    <SelectItem value="pcos">PCOS</SelectItem>
                    <SelectItem value="thyroid_hypo">Thyroid (Hypo)</SelectItem>
                    <SelectItem value="high_cholesterol">High Cholesterol</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <Badge variant="outline" className="text-sm">
                <Users className="w-3 h-3 mr-1" />
                {filteredClients.length} clients in view
              </Badge>
              <Badge variant="outline" className="text-sm">
                <Target className="w-3 h-3 mr-1" />
                {Object.keys(segments).length} segments
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different views */}
        <Tabs defaultValue="segments" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="segments">Segment Analysis</TabsTrigger>
            <TabsTrigger value="trends">Trends & Insights</TabsTrigger>
            <TabsTrigger value="coaches">Coach Performance</TabsTrigger>
          </TabsList>

          {/* Segment Analysis */}
          <TabsContent value="segments" className="space-y-4">
            {/* Segment Analytics Overview */}
            <SegmentAnalytics
              filteredClients={filteredClients}
              segments={segments}
              progressLogs={progressLogs}
            />

            <div className="flex justify-end">
              <Button onClick={handleExport} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Segments Report
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Segment Distribution Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Segment Distribution</CardTitle>
                  <CardDescription>Client count by segment</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={segmentMetrics}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(entry) => `${entry.name}: ${entry.count}`}
                      >
                        {segmentMetrics.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Engagement Rate by Segment */}
              <Card>
                <CardHeader>
                  <CardTitle>Engagement Rate by Segment</CardTitle>
                  <CardDescription>Client activity in last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={segmentMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="engagementRate" fill="#f97316" name="Engagement %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Segment Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Segment Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Segment</th>
                        <th className="text-right py-3 px-4">Total Clients</th>
                        <th className="text-right py-3 px-4">Active</th>
                        <th className="text-right py-3 px-4">Avg Weight Loss</th>
                        <th className="text-right py-3 px-4">Engagement</th>
                        <th className="text-right py-3 px-4">Meal Plans</th>
                        <th className="text-right py-3 px-4">Progress Logs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {segmentMetrics.map((segment, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium capitalize">
                            {segment.name.replace(/_/g, ' ')}
                          </td>
                          <td className="text-right py-3 px-4">{segment.count}</td>
                          <td className="text-right py-3 px-4">{segment.activeClients}</td>
                          <td className="text-right py-3 px-4">{segment.avgWeightLoss} kg</td>
                          <td className="text-right py-3 px-4">
                            <Badge variant={segment.engagementRate > 60 ? "default" : "secondary"}>
                              {segment.engagementRate}%
                            </Badge>
                          </td>
                          <td className="text-right py-3 px-4">{segment.mealPlans}</td>
                          <td className="text-right py-3 px-4">{segment.progressLogs}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends & Insights */}
          <TabsContent value="trends" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Client Activity Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Active Clients Trend</CardTitle>
                  <CardDescription>Last 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="clients" stroke="#f97316" name="Active Clients" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Meal Adherence Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Meal Adherence Trend</CardTitle>
                  <CardDescription>Average adherence over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="adherence" stroke="#16a34a" name="Adherence %" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Key Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-orange-500" />
                  Key Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold text-sm text-gray-600 mb-2">Most Common Goal</h4>
                    <p className="text-2xl font-bold text-orange-600 capitalize">
                      {segmentMetrics.sort((a, b) => b.count - a.count)[0]?.name.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold text-sm text-gray-600 mb-2">Highest Engagement Segment</h4>
                    <p className="text-2xl font-bold text-green-600 capitalize">
                      {segmentMetrics.sort((a, b) => b.engagementRate - a.engagementRate)[0]?.name.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold text-sm text-gray-600 mb-2">Best Weight Loss Segment</h4>
                    <p className="text-2xl font-bold text-blue-600 capitalize">
                      {segmentMetrics.sort((a, b) => parseFloat(b.avgWeightLoss) - parseFloat(a.avgWeightLoss))[0]?.name.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Coach Performance */}
          <TabsContent value="coaches" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleExportCoachPerformance} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Coach Report
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Coach Performance Metrics</CardTitle>
                <CardDescription>Performance across all coaches</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Coach Name</th>
                        <th className="text-right py-3 px-4">Total Clients</th>
                        <th className="text-right py-3 px-4">Active</th>
                        <th className="text-right py-3 px-4">Engagement</th>
                        <th className="text-right py-3 px-4">Specializations</th>
                        <th className="text-right py-3 px-4">Load</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coachPerformance.map((coach, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{coach.name}</td>
                          <td className="text-right py-3 px-4">{coach.clients}</td>
                          <td className="text-right py-3 px-4">{coach.activeClients}</td>
                          <td className="text-right py-3 px-4">
                            <Badge variant={coach.engagementRate > 60 ? "default" : "secondary"}>
                              {coach.engagementRate}%
                            </Badge>
                          </td>
                          <td className="text-right py-3 px-4">{coach.specializations}</td>
                          <td className="text-right py-3 px-4">
                            <Badge variant={
                              (coach.clients / coach.capacity) > 0.9 ? "destructive" :
                              (coach.clients / coach.capacity) > 0.7 ? "secondary" : "outline"
                            }>
                              {coach.clients}/{coach.capacity}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Coach Load Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Coach Load Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={coachPerformance.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="clients" fill="#f97316" name="Total Clients" />
                    <Bar dataKey="activeClients" fill="#16a34a" name="Active Clients" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
          </Tabs>

          {/* Segmented Client List */}
          <div className="mt-8">
          <SegmentedClientList
            clients={filteredClients}
            progressLogs={progressLogs}
          />
          </div>
        </div>
      </div>
    );
}