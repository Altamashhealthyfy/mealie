import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from "recharts";
import {
  TrendingUp, Users, DollarSign, Award, Activity, Calendar,
  Target, CheckCircle, Clock, Star, ArrowUp, ArrowDown, Loader2
} from "lucide-react";

export default function ComprehensiveAnalyticsDashboard() {
  const [dateRange, setDateRange] = useState("30");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allClients, isLoading: loadingClients } = useQuery({
    queryKey: ['allClients'],
    queryFn: () => base44.entities.Client.list('-created_date', 10000),
    initialData: [],
  });

  const { data: coaches } = useQuery({
    queryKey: ['coaches'],
    queryFn: async () => {
      const users = await base44.entities.User.list('', 10000);
      return users.filter(u => u.user_type === 'student_coach' || u.role === 'user');
    },
    initialData: [],
  });

  const { data: subscriptions } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => base44.entities.HealthCoachSubscription.list('-created_date', 10000),
    initialData: [],
  });

  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-payment_date', 10000),
    initialData: [],
  });

  const { data: coachRevenue } = useQuery({
    queryKey: ['coachRevenue'],
    queryFn: () => base44.entities.CoachRevenue.list('-transaction_date', 10000),
    initialData: [],
  });

  const { data: mealPlans } = useQuery({
    queryKey: ['mealPlans'],
    queryFn: () => base44.entities.MealPlan.list('-created_date', 10000),
    initialData: [],
  });

  const { data: progressLogs } = useQuery({
    queryKey: ['progressLogs'],
    queryFn: () => base44.entities.ProgressLog.list('-date', 10000),
    initialData: [],
  });

  const { data: appointments } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.Appointment.list('-appointment_date', 10000),
    initialData: [],
  });

  const { data: feedback } = useQuery({
    queryKey: ['feedback'],
    queryFn: () => base44.entities.ClientFeedback.list('-created_date', 10000),
    initialData: [],
  });

  const { data: clientSubscriptions } = useQuery({
    queryKey: ['clientSubscriptions'],
    queryFn: () => base44.entities.ClientSubscription.list('', 10000),
    initialData: [],
  });

  if (!user || loadingClients) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // Calculate date filter
  const daysAgo = parseInt(dateRange);
  const filterDate = new Date();
  filterDate.setDate(filterDate.getDate() - daysAgo);

  // Client Engagement Metrics
  const activeClients = allClients.filter(c => c.status === 'active').length;
  const onboardingCompletionRate = allClients.length > 0
    ? ((allClients.filter(c => c.onboarding_completed).length / allClients.length) * 100).toFixed(1)
    : 0;

  const recentProgressLogs = progressLogs.filter(p => new Date(p.date) >= filterDate);
  const clientsWithProgress = new Set(recentProgressLogs.map(p => p.client_id)).size;
  const engagementRate = activeClients > 0 ? ((clientsWithProgress / activeClients) * 100).toFixed(1) : 0;

  // Coach Performance Metrics
  const avgFeedbackRating = feedback.length > 0
    ? (feedback.reduce((sum, f) => sum + (f.overall_rating || 0), 0) / feedback.length).toFixed(1)
    : 0;

  const mealPlansCreated = mealPlans.filter(m => new Date(m.created_date) >= filterDate).length;
  const completedAppointments = appointments.filter(a =>
    a.status === 'completed' && new Date(a.appointment_date) >= filterDate
  ).length;

  // Subscription Metrics
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
  const trialSubscriptions = subscriptions.filter(s => s.status === 'trial' || s.is_trial).length;
  const expiredTrials = subscriptions.filter(s => s.trial_expired_notified).length;
  const trialConversionRate = expiredTrials > 0
    ? (((expiredTrials - trialSubscriptions) / expiredTrials) * 100).toFixed(1)
    : 0;

  // Revenue Metrics
  const totalRevenue = [...payments, ...coachRevenue]
    .filter(p => p.payment_status === 'completed' || p.payment_status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const recentRevenue = [...payments, ...coachRevenue]
    .filter(p => {
      const date = new Date(p.payment_date || p.transaction_date);
      return date >= filterDate && (p.payment_status === 'completed' || p.payment_status === 'paid');
    })
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  // Growth trends
  const clientGrowth = allClients.filter(c => new Date(c.created_date) >= filterDate).length;
  const previousPeriodDate = new Date();
  previousPeriodDate.setDate(previousPeriodDate.getDate() - (daysAgo * 2));
  const previousPeriodClients = allClients.filter(c => {
    const date = new Date(c.created_date);
    return date >= previousPeriodDate && date < filterDate;
  }).length;
  const clientGrowthRate = previousPeriodClients > 0
    ? (((clientGrowth - previousPeriodClients) / previousPeriodClients) * 100).toFixed(1)
    : 100;

  // Chart Data
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date.toISOString().split('T')[0];
  });

  const clientGrowthData = last30Days.map(date => {
    const count = allClients.filter(c => c.created_date?.startsWith(date)).length;
    return { date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), clients: count };
  });

  const revenueData = last30Days.map(date => {
    const revenue = [...payments, ...coachRevenue]
      .filter(p => {
        const payDate = (p.payment_date || p.transaction_date)?.startsWith(date);
        return payDate && (p.payment_status === 'completed' || p.payment_status === 'paid');
      })
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    return { date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), revenue };
  });

  const subscriptionsByPlan = subscriptions
    .filter(s => s.status === 'active')
    .reduce((acc, s) => {
      const plan = s.plan_name || 'Unknown';
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {});

  const planDistributionData = Object.entries(subscriptionsByPlan).map(([name, value]) => ({
    name,
    value
  }));

  const COLORS = ['#f97316', '#dc2626', '#22c55e', '#3b82f6', '#8b5cf6'];

  const engagementData = [
    { metric: 'Progress Tracked', value: clientsWithProgress, total: activeClients },
    { metric: 'Onboarding Done', value: allClients.filter(c => c.onboarding_completed).length, total: allClients.length },
    { metric: 'Active Plans', value: mealPlans.filter(m => m.active).length, total: activeClients },
  ];

  const coachPerformanceData = coaches.slice(0, 10).map(coach => {
    const coachClients = allClients.filter(c => c.assigned_coach?.includes(coach.email)).length;
    const coachPlans = mealPlans.filter(m => m.created_by === coach.email).length;
    const coachFeedback = feedback.filter(f => f.coach_email === coach.email);
    const avgRating = coachFeedback.length > 0
      ? (coachFeedback.reduce((sum, f) => sum + (f.overall_rating || 0), 0) / coachFeedback.length).toFixed(1)
      : 0;

    return {
      name: coach.full_name || coach.email,
      clients: coachClients,
      plans: coachPlans,
      rating: parseFloat(avgRating)
    };
  });

  const StatCard = ({ title, value, icon: Icon, trend, trendValue, color = "orange" }) => (
    <Card className="border-none shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <Icon className={`w-5 h-5 text-${color}-500`} />
        </div>
        <div className="flex items-end justify-between">
          <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
          {trend && (
            <div className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
              <span className="font-semibold">{trendValue}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
            <p className="text-gray-600">Comprehensive insights into platform performance</p>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Active Clients"
            value={activeClients}
            icon={Users}
            trend={parseFloat(clientGrowthRate) > 0 ? 'up' : 'down'}
            trendValue={Math.abs(clientGrowthRate)}
            color="orange"
          />
          <StatCard
            title="Active Subscriptions"
            value={activeSubscriptions}
            icon={Award}
            color="green"
          />
          <StatCard
            title="Total Revenue"
            value={`₹${recentRevenue.toLocaleString()}`}
            icon={DollarSign}
            color="blue"
          />
          <StatCard
            title="Avg Coach Rating"
            value={avgFeedbackRating}
            icon={Star}
            color="yellow"
          />
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid grid-cols-4 bg-white/80 backdrop-blur shadow-lg">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="clients">Client Engagement</TabsTrigger>
            <TabsTrigger value="coaches">Coach Performance</TabsTrigger>
            <TabsTrigger value="revenue">Revenue & Plans</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Client Growth Trend</CardTitle>
                  <CardDescription>New clients over the last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={clientGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="clients" stroke="#f97316" fill="#fb923c" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                  <CardDescription>Daily revenue over the last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-none shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Activity className="w-8 h-8 text-orange-500" />
                    <div>
                      <p className="text-sm text-gray-600">Engagement Rate</p>
                      <h3 className="text-2xl font-bold">{engagementRate}%</h3>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Clients actively tracking progress</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <div>
                      <p className="text-sm text-gray-600">Onboarding Rate</p>
                      <h3 className="text-2xl font-bold">{onboardingCompletionRate}%</h3>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Completed onboarding process</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Target className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-600">Trial Conversion</p>
                      <h3 className="text-2xl font-bold">{trialConversionRate}%</h3>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Trials converted to paid</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Client Engagement Tab */}
          <TabsContent value="clients" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Client Engagement Metrics</CardTitle>
                  <CardDescription>Key engagement indicators</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={engagementData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="metric" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#f97316" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Client Status Distribution</CardTitle>
                  <CardDescription>Current client statuses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {['active', 'inactive', 'completed', 'on_hold'].map(status => {
                      const count = allClients.filter(c => c.status === status).length;
                      const percentage = allClients.length > 0 ? ((count / allClients.length) * 100).toFixed(0) : 0;
                      return (
                        <div key={status} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className="capitalize">{status.replace('_', ' ')}</Badge>
                            <span className="text-sm text-gray-600">{count} clients</span>
                          </div>
                          <span className="text-sm font-semibold">{percentage}%</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Recent Activity Highlights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Meal Plans Created</p>
                    <p className="text-2xl font-bold text-orange-600">{mealPlansCreated}</p>
                    <p className="text-xs text-gray-500 mt-1">Last {dateRange} days</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Progress Logs</p>
                    <p className="text-2xl font-bold text-green-600">{recentProgressLogs.length}</p>
                    <p className="text-xs text-gray-500 mt-1">Last {dateRange} days</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Appointments Held</p>
                    <p className="text-2xl font-bold text-blue-600">{completedAppointments}</p>
                    <p className="text-xs text-gray-500 mt-1">Last {dateRange} days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Coach Performance Tab */}
          <TabsContent value="coaches" className="space-y-6">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Top Coaches Performance</CardTitle>
                <CardDescription>Coaches ranked by client count and ratings</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={coachPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="clients" fill="#f97316" name="Clients" />
                    <Bar dataKey="plans" fill="#22c55e" name="Meal Plans" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Coach Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="text-sm font-medium">Total Coaches</span>
                      <span className="text-2xl font-bold text-orange-600">{coaches.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium">Avg Rating</span>
                      <span className="text-2xl font-bold text-green-600">{avgFeedbackRating}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium">Total Feedback</span>
                      <span className="text-2xl font-bold text-blue-600">{feedback.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Rating Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map(rating => {
                      const count = feedback.filter(f => Math.round(f.overall_rating) === rating).length;
                      const percentage = feedback.length > 0 ? ((count / feedback.length) * 100).toFixed(0) : 0;
                      return (
                        <div key={rating} className="flex items-center gap-3">
                          <span className="text-sm font-medium w-12">{rating} ⭐</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-orange-500 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Revenue & Plans Tab */}
          <TabsContent value="revenue" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Subscription Plan Distribution</CardTitle>
                  <CardDescription>Active subscriptions by plan</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={planDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {planDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Revenue Summary</CardTitle>
                  <CardDescription>Financial performance overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Total Revenue (All Time)</p>
                      <p className="text-3xl font-bold text-green-600">₹{totalRevenue.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Revenue (Last {dateRange} days)</p>
                      <p className="text-3xl font-bold text-blue-600">₹{recentRevenue.toLocaleString()}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-orange-50 rounded-lg">
                        <p className="text-xs text-gray-600">Active Subs</p>
                        <p className="text-xl font-bold text-orange-600">{activeSubscriptions}</p>
                      </div>
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <p className="text-xs text-gray-600">Trials</p>
                        <p className="text-xl font-bold text-yellow-600">{trialSubscriptions}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Subscription Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 border-2 border-green-200 bg-green-50 rounded-lg">
                    <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
                    <p className="text-sm text-gray-600">Active</p>
                    <p className="text-2xl font-bold text-green-600">{activeSubscriptions}</p>
                  </div>
                  <div className="p-4 border-2 border-blue-200 bg-blue-50 rounded-lg">
                    <Clock className="w-8 h-8 text-blue-600 mb-2" />
                    <p className="text-sm text-gray-600">Trials</p>
                    <p className="text-2xl font-bold text-blue-600">{trialSubscriptions}</p>
                  </div>
                  <div className="p-4 border-2 border-orange-200 bg-orange-50 rounded-lg">
                    <TrendingUp className="w-8 h-8 text-orange-600 mb-2" />
                    <p className="text-sm text-gray-600">Conversion</p>
                    <p className="text-2xl font-bold text-orange-600">{trialConversionRate}%</p>
                  </div>
                  <div className="p-4 border-2 border-red-200 bg-red-50 rounded-lg">
                    <Activity className="w-8 h-8 text-red-600 mb-2" />
                    <p className="text-sm text-gray-600">Expired Trials</p>
                    <p className="text-2xl font-bold text-red-600">{expiredTrials}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}