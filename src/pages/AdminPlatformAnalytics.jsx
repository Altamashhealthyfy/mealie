import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
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
  ResponsiveContainer,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
} from "recharts";
import {
  AlertTriangle,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Download,
  Calendar,
  Activity,
  Award,
  BarChart3,
  Filter,
  FileText,
  TrendingDown,
  UserMinus,
  Layers,
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, differenceInDays, differenceInMonths, parseISO } from "date-fns";
import { toast } from "sonner";

export default function AdminPlatformAnalytics() {
  const [dateRange, setDateRange] = useState("3months");
  const [customReportDialog, setCustomReportDialog] = useState(false);
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 3), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reportFilters, setReportFilters] = useState({
    includeDemographics: true,
    includeRevenue: true,
    includeEngagement: true,
    groupByRegion: false,
    groupByPlan: true,
  });

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: allCoaches } = useQuery({
    queryKey: ["allCoaches"],
    queryFn: async () => {
      if (user?.user_type !== "super_admin") return [];
      const users = await base44.entities.User.list();
      return users.filter((u) => u.user_type === "student_coach");
    },
    enabled: !!user && user?.user_type === "super_admin",
    initialData: [],
    retry: 0,
  });

  const { data: allClients } = useQuery({
    queryKey: ["allClients"],
    queryFn: async () => base44.entities.Client.list(),
    initialData: [],
  });

  const { data: allSubscriptions } = useQuery({
    queryKey: ["allSubscriptions"],
    queryFn: async () => base44.entities.HealthCoachSubscription.list("-created_date", 1000),
    initialData: [],
  });

  const { data: allRevenues } = useQuery({
    queryKey: ["allRevenues"],
    queryFn: async () => base44.entities.CoachRevenue.list("-transaction_date", 1000),
    initialData: [],
  });

  const { data: allAppointments } = useQuery({
    queryKey: ["allAppointments"],
    queryFn: async () => base44.entities.Appointment.list("-appointment_date", 1000),
    initialData: [],
  });

  const { data: allEnrollments } = useQuery({
    queryKey: ["allEnrollments"],
    queryFn: async () => base44.entities.ProgramEnrollment.list("-enrollment_date", 1000),
    initialData: [],
  });

  const { data: allPlans } = useQuery({
    queryKey: ["allPlans"],
    queryFn: async () => base44.entities.HealthCoachPlan.list(),
    initialData: [],
  });

  const { data: allFeedback } = useQuery({
    queryKey: ["allFeedback"],
    queryFn: async () => base44.entities.ClientFeedback.list("-created_date", 1000),
    initialData: [],
  });

  const { data: progressLogs } = useQuery({
    queryKey: ["progressLogs"],
    queryFn: async () => base44.entities.ProgressLog.list("-date", 1000),
    initialData: [],
  });

  // Platform metrics
  const metrics = useMemo(() => {
    const activeCoaches = allSubscriptions.filter((s) => s.status === "active").length;
    const totalRevenue = allRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);
    const activeClients = allClients.filter((c) => c.status === "active").length;
    const completedPrograms = allEnrollments.filter((e) => e.status === "completed").length;

    return {
      totalCoaches: allCoaches.length,
      activeCoaches,
      totalClients: allClients.length,
      activeClients,
      totalRevenue,
      avgRevenuePerCoach: activeCoaches > 0 ? totalRevenue / activeCoaches : 0,
      totalAppointments: allAppointments.length,
      completedPrograms,
      avgClientsPerCoach: activeCoaches > 0 ? activeClients / activeCoaches : 0,
    };
  }, [allCoaches, allClients, allSubscriptions, allRevenues, allAppointments, allEnrollments]);

  // Coach performance ranking
  const coachPerformance = useMemo(() => {
    return allCoaches
      .map((coach) => {
        const subscription = allSubscriptions.find((s) => s.coach_email === coach.email);
        const coachClients = allClients.filter((c) =>
          Array.isArray(c.assigned_coach)
            ? c.assigned_coach.includes(coach.email)
            : c.assigned_coach === coach.email
        );
        const coachRevenue = allRevenues
          .filter((r) => r.coach_email === coach.email)
          .reduce((sum, r) => sum + (r.amount || 0), 0);
        const coachAppointments = allAppointments.filter((a) => a.coach_email === coach.email);
        const completedAppts = coachAppointments.filter((a) => a.status === "completed").length;

        return {
          name: coach.full_name,
          email: coach.email,
          clients: coachClients.length,
          revenue: coachRevenue,
          appointments: coachAppointments.length,
          completed: completedAppts,
          attendanceRate: coachAppointments.length > 0 ? (completedAppts / coachAppointments.length) * 100 : 0,
          planStatus: subscription?.status || "inactive",
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [allCoaches, allClients, allSubscriptions, allRevenues, allAppointments]);

  // Revenue trend
  const revenueTrend = useMemo(() => {
    const months = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const month = subMonths(now, i);
      const key = format(month, "MMM yyyy");
      months[key] = 0;
    }

    allRevenues.forEach((r) => {
      const month = format(new Date(r.transaction_date), "MMM yyyy");
      if (months.hasOwnProperty(month)) {
        months[month] += r.amount || 0;
      }
    });

    return Object.entries(months).map(([month, revenue]) => ({ month, revenue }));
  }, [allRevenues]);

  // Client distribution by coach
  const clientDistribution = useMemo(() => {
    return allCoaches.slice(0, 8).map((coach) => {
      const count = allClients.filter((c) =>
        Array.isArray(c.assigned_coach)
          ? c.assigned_coach.includes(coach.email)
          : c.assigned_coach === coach.email
      ).length;
      return { name: coach.full_name.substring(0, 12), clients: count };
    });
  }, [allCoaches, allClients]);

  // Client statuses
  const clientStatusDistribution = useMemo(() => {
    const statuses = {};
    allClients.forEach((c) => {
      statuses[c.status || "unknown"] = (statuses[c.status || "unknown"] || 0) + 1;
    });
    return Object.entries(statuses).map(([status, count]) => ({ name: status, value: count }));
  }, [allClients]);

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  // Cohort Analysis - Track client retention by signup month
  const cohortAnalysis = useMemo(() => {
    const cohorts = {};
    
    allClients.forEach(client => {
      if (!client.join_date) return;
      
      const cohortMonth = format(new Date(client.join_date), 'MMM yyyy');
      if (!cohorts[cohortMonth]) {
        cohorts[cohortMonth] = {
          month: cohortMonth,
          totalClients: 0,
          activeClients: 0,
          month1Retention: 0,
          month3Retention: 0,
          month6Retention: 0,
          avgEngagement: 0,
        };
      }
      
      cohorts[cohortMonth].totalClients++;
      if (client.status === 'active') {
        cohorts[cohortMonth].activeClients++;
      }
      
      // Calculate engagement based on progress logs
      const clientLogs = progressLogs.filter(log => log.client_id === client.id);
      cohorts[cohortMonth].avgEngagement += clientLogs.length;
    });

    // Calculate retention rates
    Object.keys(cohorts).forEach(cohortMonth => {
      const cohort = cohorts[cohortMonth];
      cohort.retentionRate = cohort.totalClients > 0 
        ? (cohort.activeClients / cohort.totalClients) * 100 
        : 0;
      cohort.avgEngagement = cohort.totalClients > 0 
        ? cohort.avgEngagement / cohort.totalClients 
        : 0;
    });

    return Object.values(cohorts).slice(-12); // Last 12 cohorts
  }, [allClients, progressLogs]);

  // Churn Prediction - Identify at-risk subscriptions
  const churnPrediction = useMemo(() => {
    const atRiskSubs = [];
    const now = new Date();
    
    allSubscriptions.forEach(sub => {
      if (sub.status !== 'active') return;
      
      const coachEmail = sub.coach_email;
      const coachClients = allClients.filter(c => 
        Array.isArray(c.assigned_coach) 
          ? c.assigned_coach.includes(coachEmail)
          : c.assigned_coach === coachEmail
      );
      
      const recentAppointments = allAppointments.filter(a => 
        a.coach_email === coachEmail && 
        differenceInDays(now, new Date(a.appointment_date)) <= 30
      );
      
      const recentRevenue = allRevenues.filter(r => 
        r.coach_email === coachEmail && 
        differenceInDays(now, new Date(r.transaction_date)) <= 30
      );
      
      const avgFeedback = allFeedback.filter(f => f.coach_email === coachEmail);
      const avgRating = avgFeedback.length > 0 
        ? avgFeedback.reduce((sum, f) => sum + (f.overall_rating || 0), 0) / avgFeedback.length 
        : 0;
      
      // Calculate churn risk score
      let riskScore = 0;
      const riskFactors = [];
      
      if (coachClients.length === 0) {
        riskScore += 30;
        riskFactors.push("No active clients");
      } else if (coachClients.length < 3) {
        riskScore += 15;
        riskFactors.push("Low client count");
      }
      
      if (recentAppointments.length === 0) {
        riskScore += 25;
        riskFactors.push("No recent appointments");
      }
      
      if (recentRevenue.length === 0 || recentRevenue.reduce((s, r) => s + r.amount, 0) < 1000) {
        riskScore += 20;
        riskFactors.push("Low recent revenue");
      }
      
      if (avgRating < 3.5 && avgFeedback.length > 0) {
        riskScore += 15;
        riskFactors.push("Low feedback ratings");
      }
      
      const daysSinceStart = differenceInDays(now, new Date(sub.start_date));
      if (daysSinceStart > 60 && recentAppointments.length === 0) {
        riskScore += 10;
        riskFactors.push("Inactive for extended period");
      }
      
      if (riskScore >= 30) {
        atRiskSubs.push({
          coachEmail: sub.coach_email,
          coachName: sub.coach_name,
          plan: sub.plan_name,
          riskScore,
          riskLevel: riskScore >= 60 ? 'high' : riskScore >= 40 ? 'medium' : 'low',
          riskFactors,
          clients: coachClients.length,
          recentAppointments: recentAppointments.length,
          avgRating: avgRating.toFixed(1),
        });
      }
    });
    
    return atRiskSubs.sort((a, b) => b.riskScore - a.riskScore);
  }, [allSubscriptions, allClients, allAppointments, allRevenues, allFeedback]);

  // Revenue by Plan Type
  const revenueByPlan = useMemo(() => {
    const planRevenue = {};
    
    allSubscriptions.forEach(sub => {
      if (sub.status === 'active') {
        const planName = sub.plan_name || 'Unknown';
        if (!planRevenue[planName]) {
          planRevenue[planName] = { plan: planName, revenue: 0, count: 0 };
        }
        planRevenue[planName].revenue += sub.amount || 0;
        planRevenue[planName].count++;
      }
    });
    
    return Object.values(planRevenue);
  }, [allSubscriptions]);

  // Coach Performance by Region (based on location)
  const performanceByRegion = useMemo(() => {
    const regions = {};
    
    allClients.forEach(client => {
      const location = client.location || 'Unknown';
      if (!regions[location]) {
        regions[location] = {
          region: location,
          clients: 0,
          revenue: 0,
          avgSatisfaction: 0,
          feedbackCount: 0,
        };
      }
      
      regions[location].clients++;
      
      const clientRevenue = allRevenues.filter(r => r.client_id === client.id);
      regions[location].revenue += clientRevenue.reduce((sum, r) => sum + (r.amount || 0), 0);
      
      const clientFeedback = allFeedback.filter(f => f.client_id === client.id);
      if (clientFeedback.length > 0) {
        regions[location].feedbackCount += clientFeedback.length;
        regions[location].avgSatisfaction += clientFeedback.reduce((sum, f) => sum + (f.overall_rating || 0), 0);
      }
    });
    
    Object.keys(regions).forEach(region => {
      const data = regions[region];
      data.avgSatisfaction = data.feedbackCount > 0 
        ? (data.avgSatisfaction / data.feedbackCount).toFixed(1) 
        : 0;
    });
    
    return Object.values(regions)
      .filter(r => r.clients > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [allClients, allRevenues, allFeedback]);

  // Client Demographics
  const demographics = useMemo(() => {
    const ageGroups = { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '56+': 0 };
    const genderDist = { male: 0, female: 0, other: 0 };
    const goalDist = {};
    
    allClients.forEach(client => {
      // Age distribution
      if (client.age) {
        if (client.age <= 25) ageGroups['18-25']++;
        else if (client.age <= 35) ageGroups['26-35']++;
        else if (client.age <= 45) ageGroups['36-45']++;
        else if (client.age <= 55) ageGroups['46-55']++;
        else ageGroups['56+']++;
      }
      
      // Gender distribution
      if (client.gender) {
        genderDist[client.gender] = (genderDist[client.gender] || 0) + 1;
      }
      
      // Goal distribution
      if (client.goal) {
        goalDist[client.goal] = (goalDist[client.goal] || 0) + 1;
      }
    });
    
    return {
      age: Object.entries(ageGroups).map(([range, count]) => ({ range, count })),
      gender: Object.entries(genderDist).map(([gender, count]) => ({ gender, count })),
      goals: Object.entries(goalDist).map(([goal, count]) => ({ goal, count })),
    };
  }, [allClients]);

  const handleExportReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      dateRange: { startDate, endDate },
      metrics,
      cohortAnalysis,
      churnPrediction,
      revenueByPlan,
      performanceByRegion,
      demographics,
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Report exported successfully!');
  };

  if (!user || user.user_type !== "super_admin") {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>Only super admins can access platform analytics.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              📊 Advanced Analytics Dashboard
            </h1>
            <p className="text-gray-600">Custom reports, cohort analysis & churn prediction</p>
          </div>
          <div className="flex gap-3">
            <Dialog open={customReportDialog} onOpenChange={setCustomReportDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Custom Report
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Generate Custom Report</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label>Report Sections</Label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          checked={reportFilters.includeDemographics}
                          onCheckedChange={(checked) => setReportFilters(prev => ({ ...prev, includeDemographics: checked }))}
                        />
                        <Label>Client Demographics</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          checked={reportFilters.includeRevenue}
                          onCheckedChange={(checked) => setReportFilters(prev => ({ ...prev, includeRevenue: checked }))}
                        />
                        <Label>Revenue Analysis</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          checked={reportFilters.includeEngagement}
                          onCheckedChange={(checked) => setReportFilters(prev => ({ ...prev, includeEngagement: checked }))}
                        />
                        <Label>Engagement Metrics</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          checked={reportFilters.groupByRegion}
                          onCheckedChange={(checked) => setReportFilters(prev => ({ ...prev, groupByRegion: checked }))}
                        />
                        <Label>Group by Region</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          checked={reportFilters.groupByPlan}
                          onCheckedChange={(checked) => setReportFilters(prev => ({ ...prev, groupByPlan: checked }))}
                        />
                        <Label>Group by Plan Type</Label>
                      </div>
                    </div>
                  </div>
                  
                  <Button onClick={handleExportReport} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Generate & Export Report
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button onClick={handleExportReport} className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="cohorts">Cohort Analysis</TabsTrigger>
            <TabsTrigger value="churn">Churn Prediction</TabsTrigger>
            <TabsTrigger value="custom">Custom Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Total Coaches</p>
                  <p className="text-3xl font-bold text-blue-600">{metrics.totalCoaches}</p>
                  <p className="text-xs text-gray-500 mt-2">{metrics.activeCoaches} active</p>
                </div>
                <Users className="w-10 h-10 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Total Clients</p>
                  <p className="text-3xl font-bold text-green-600">{metrics.totalClients}</p>
                  <p className="text-xs text-gray-500 mt-2">{metrics.activeClients} active</p>
                </div>
                <Activity className="w-10 h-10 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Total Revenue</p>
                  <p className="text-3xl font-bold text-purple-600">₹{(metrics.totalRevenue / 1000).toFixed(1)}k</p>
                  <p className="text-xs text-gray-500 mt-2">All time</p>
                </div>
                <DollarSign className="w-10 h-10 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Programs</p>
                  <p className="text-3xl font-bold text-orange-600">{metrics.completedPrograms}</p>
                  <p className="text-xs text-gray-500 mt-2">Completed</p>
                </div>
                <Target className="w-10 h-10 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Revenue Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueTrend}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                  <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Client Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Clients per Coach
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={clientDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="clients" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Client Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Client Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={clientStatusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {clientStatusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Key Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Platform Insights</CardTitle>
              <CardDescription>Key metrics and trends</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-semibold text-blue-900">Avg Clients per Coach</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.avgClientsPerCoach.toFixed(1)}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm font-semibold text-green-900">Avg Revenue per Coach</p>
                <p className="text-2xl font-bold text-green-600">₹{metrics.avgRevenuePerCoach.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm font-semibold text-purple-900">Total Appointments</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.totalAppointments}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Top Performing Coaches
            </CardTitle>
            <CardDescription>Based on revenue and client engagement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Coach</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Clients</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Appointments</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Attendance</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Revenue</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {coachPerformance.map((coach, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{coach.name}</td>
                      <td className="py-3 px-4 text-center text-gray-600">{coach.clients}</td>
                      <td className="py-3 px-4 text-center text-gray-600">{coach.appointments}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={coach.attendanceRate >= 80 ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}>
                          {coach.attendanceRate.toFixed(0)}%
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">
                        ₹{coach.revenue.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={coach.planStatus === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                          {coach.planStatus}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          {/* Cohort Analysis Tab */}
          <TabsContent value="cohorts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-600" />
                  Client Cohort Analysis
                </CardTitle>
                <CardDescription>Track client retention and engagement by signup month</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={cohortAnalysis}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" angle={-45} textAnchor="end" height={100} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="totalClients" stroke="#3b82f6" name="Total Clients" />
                    <Line yAxisId="left" type="monotone" dataKey="activeClients" stroke="#10b981" name="Active Clients" />
                    <Line yAxisId="right" type="monotone" dataKey="retentionRate" stroke="#8b5cf6" name="Retention %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Retention Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={cohortAnalysis}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="retentionRate" fill="#8b5cf6" name="Retention %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Engagement by Cohort</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={cohortAnalysis}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="avgEngagement" fill="#10b981" name="Avg Logs/Client" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Cohort Performance Table</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">Cohort Month</th>
                        <th className="text-center py-3 px-4 font-semibold">Total Clients</th>
                        <th className="text-center py-3 px-4 font-semibold">Active</th>
                        <th className="text-center py-3 px-4 font-semibold">Retention %</th>
                        <th className="text-center py-3 px-4 font-semibold">Avg Engagement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cohortAnalysis.map((cohort, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{cohort.month}</td>
                          <td className="py-3 px-4 text-center">{cohort.totalClients}</td>
                          <td className="py-3 px-4 text-center">{cohort.activeClients}</td>
                          <td className="py-3 px-4 text-center">
                            <Badge className={cohort.retentionRate >= 70 ? "bg-green-100 text-green-700" : cohort.retentionRate >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}>
                              {cohort.retentionRate.toFixed(1)}%
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">{cohort.avgEngagement.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Churn Prediction Tab */}
          <TabsContent value="churn" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-l-4 border-l-red-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">High Risk</p>
                      <p className="text-3xl font-bold text-red-600">
                        {churnPrediction.filter(s => s.riskLevel === 'high').length}
                      </p>
                    </div>
                    <UserMinus className="w-10 h-10 text-red-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-orange-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Medium Risk</p>
                      <p className="text-3xl font-bold text-orange-600">
                        {churnPrediction.filter(s => s.riskLevel === 'medium').length}
                      </p>
                    </div>
                    <TrendingDown className="w-10 h-10 text-orange-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-yellow-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Low Risk</p>
                      <p className="text-3xl font-bold text-yellow-600">
                        {churnPrediction.filter(s => s.riskLevel === 'low').length}
                      </p>
                    </div>
                    <Activity className="w-10 h-10 text-yellow-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  At-Risk Subscriptions
                </CardTitle>
                <CardDescription>Coaches who may cancel their subscription soon</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">Coach</th>
                        <th className="text-center py-3 px-4 font-semibold">Plan</th>
                        <th className="text-center py-3 px-4 font-semibold">Risk Level</th>
                        <th className="text-center py-3 px-4 font-semibold">Risk Score</th>
                        <th className="text-center py-3 px-4 font-semibold">Clients</th>
                        <th className="text-center py-3 px-4 font-semibold">Recent Appts</th>
                        <th className="text-left py-3 px-4 font-semibold">Risk Factors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {churnPrediction.map((sub, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{sub.coachName}</td>
                          <td className="py-3 px-4 text-center text-sm">{sub.plan}</td>
                          <td className="py-3 px-4 text-center">
                            <Badge className={
                              sub.riskLevel === 'high' ? "bg-red-100 text-red-700" :
                              sub.riskLevel === 'medium' ? "bg-orange-100 text-orange-700" :
                              "bg-yellow-100 text-yellow-700"
                            }>
                              {sub.riskLevel}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center font-semibold">{sub.riskScore}</td>
                          <td className="py-3 px-4 text-center">{sub.clients}</td>
                          <td className="py-3 px-4 text-center">{sub.recentAppointments}</td>
                          <td className="py-3 px-4 text-sm">
                            <div className="space-y-1">
                              {sub.riskFactors.slice(0, 3).map((factor, i) => (
                                <div key={i} className="text-gray-600">• {factor}</div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Custom Reports Tab */}
          <TabsContent value="custom" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Demographics */}
              <Card>
                <CardHeader>
                  <CardTitle>Client Age Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={demographics.age}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Client Goals Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={demographics.goals}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.goal}: ${entry.count}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {demographics.goals.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Revenue by Plan */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Plan Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueByPlan}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="plan" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                      <Bar dataKey="revenue" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Performance by Region */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance by Region</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-semibold">Region</th>
                          <th className="text-center py-2 px-3 font-semibold">Clients</th>
                          <th className="text-right py-2 px-3 font-semibold">Revenue</th>
                          <th className="text-center py-2 px-3 font-semibold">Satisfaction</th>
                        </tr>
                      </thead>
                      <tbody>
                        {performanceByRegion.map((region, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-3 font-medium">{region.region}</td>
                            <td className="py-2 px-3 text-center">{region.clients}</td>
                            <td className="py-2 px-3 text-right">₹{region.revenue.toLocaleString()}</td>
                            <td className="py-2 px-3 text-center">
                              <Badge className="bg-green-100 text-green-700">
                                {region.avgSatisfaction} ⭐
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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