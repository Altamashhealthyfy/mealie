import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Users, Zap, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

const COLORS = ['#f97316', '#dc2626', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

function MetricCard({ icon: Icon, label, value, unit, trend, color = "orange" }) {
  const colorMap = {
    orange: "bg-orange-50 border-orange-200 text-orange-600",
    red: "bg-red-50 border-red-200 text-red-600",
    green: "bg-green-50 border-green-200 text-green-600",
    blue: "bg-blue-50 border-blue-200 text-blue-600",
    purple: "bg-purple-50 border-purple-200 text-purple-600",
  };

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-75">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {unit && <p className="text-xs opacity-60 mt-0.5">{unit}</p>}
        </div>
        <Icon className="w-8 h-8 opacity-20" />
      </div>
      {trend && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          <TrendingUp className="w-3 h-3" />
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState("30"); // days

  // Fetch all necessary data in parallel
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["analytics-clients"],
    queryFn: () => base44.asServiceRole.entities.Client.list(),
  });

  const { data: progressLogs = [] } = useQuery({
    queryKey: ["analytics-progress"],
    queryFn: () => base44.asServiceRole.entities.ProgressLog.list(),
  });

  const { data: mealPlans = [] } = useQuery({
    queryKey: ["analytics-mealplans"],
    queryFn: () => base44.asServiceRole.entities.MealPlan.list(),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["analytics-messages"],
    queryFn: () => base44.asServiceRole.entities.Message.list(),
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["analytics-appointments"],
    queryFn: () => base44.asServiceRole.entities.Appointment.list(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["analytics-tasks"],
    queryFn: () => base44.asServiceRole.entities.Task.list(),
  });

  // Calculate engagement metrics
  const getEngagementData = () => {
    const now = new Date();
    const daysAgo = parseInt(timeRange);
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    const recentMessages = messages.filter(m => new Date(m.created_date) >= startDate).length;
    const recentAppointments = appointments.filter(a => new Date(a.created_date) >= startDate).length;
    const recentMealPlans = mealPlans.filter(p => new Date(p.created_date) >= startDate).length;

    return {
      totalClients: clients.length,
      activeClients: clients.filter(c => c.status === "active").length,
      totalMessages: recentMessages,
      totalAppointments: recentAppointments,
      mealPlansCreated: recentMealPlans,
    };
  };

  // Calculate progress metrics
  const getProgressMetrics = () => {
    if (progressLogs.length === 0) return { adherence: 0, goalAchievement: 0, avgWeightLoss: 0 };

    const completedLogs = progressLogs.filter(log => log.reviewed);
    const avgAdherence = completedLogs.length > 0
      ? Math.round(completedLogs.reduce((sum, log) => sum + (log.meal_adherence || 0), 0) / completedLogs.length)
      : 0;

    const clientsWithGoal = clients.filter(c => c.target_weight && c.initial_weight);
    const totalWeightChange = clientsWithGoal.reduce((sum, c) => sum + ((c.initial_weight - c.weight) || 0), 0);
    const avgWeightLoss = clientsWithGoal.length > 0 ? (totalWeightChange / clientsWithGoal.length).toFixed(1) : 0;

    const goalsAchieved = clients.filter(c => c.weight <= c.target_weight).length;
    const goalAchievementRate = clients.length > 0 ? Math.round((goalsAchieved / clients.length) * 100) : 0;

    return { adherence: avgAdherence, goalAchievement: goalAchievementRate, avgWeightLoss };
  };

  // Generate time-series chart data
  const getChartData = () => {
    const now = new Date();
    const daysAgo = parseInt(timeRange);
    const data = [];

    for (let i = daysAgo; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      const dayMessages = messages.filter(m => new Date(m.created_date).toDateString() === date.toDateString()).length;
      const dayMealPlans = mealPlans.filter(p => new Date(p.created_date).toDateString() === date.toDateString()).length;

      data.push({
        date: dateStr,
        messages: dayMessages,
        mealPlans: dayMealPlans,
        engagement: dayMessages + dayMealPlans,
      });
    }

    return data;
  };

  // Feature usage breakdown
  const getFeatureUsage = () => {
    const now = new Date();
    const daysAgo = parseInt(timeRange);
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    return [
      { name: "Messages", value: messages.filter(m => new Date(m.created_date) >= startDate).length, color: "#3b82f6" },
      { name: "Meal Plans", value: mealPlans.filter(p => new Date(p.created_date) >= startDate).length, color: "#22c55e" },
      { name: "Appointments", value: appointments.filter(a => new Date(a.created_date) >= startDate).length, color: "#f97316" },
      { name: "Tasks", value: tasks.filter(t => new Date(t.created_date) >= startDate).length, color: "#8b5cf6" },
    ].filter(f => f.value > 0);
  };

  // Operational efficiency
  const getOperationalMetrics = () => {
    const completedTasks = tasks.filter(t => t.status === "done").length;
    const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

    const completedAppointments = appointments.filter(a => a.status === "completed").length;
    const appointmentCompletionRate = appointments.length > 0 ? Math.round((completedAppointments / appointments.length) * 100) : 0;

    return { completionRate, appointmentCompletionRate };
  };

  const engagementData = getEngagementData();
  const progressMetrics = getProgressMetrics();
  const chartData = getChartData();
  const featureUsage = getFeatureUsage();
  const operationalMetrics = getOperationalMetrics();

  if (clientsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-500 mt-1">Platform metrics & performance tracking</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Users} label="Active Clients" value={engagementData.activeClients} unit={`of ${engagementData.totalClients} total`} color="blue" />
        <MetricCard icon={Zap} label="Messages Sent" value={engagementData.totalMessages} unit={`in ${timeRange} days`} color="orange" />
        <MetricCard icon={CheckCircle2} label="Avg Adherence" value={`${progressMetrics.adherence}%`} unit="meal plan compliance" color="green" />
        <MetricCard icon={TrendingUp} label="Avg Weight Loss" value={`${progressMetrics.avgWeightLoss} kg`} unit="per client" color="purple" />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Engagement Trend */}
        <Card className="lg:col-span-2 border-orange-100">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              Engagement Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="messages" stroke="#3b82f6" name="Messages" />
                <Line type="monotone" dataKey="mealPlans" stroke="#22c55e" name="Meal Plans" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Feature Usage Breakdown */}
        <Card className="border-blue-100">
          <CardHeader>
            <CardTitle className="text-lg">Feature Usage</CardTitle>
          </CardHeader>
          <CardContent>
            {featureUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={featureUsage}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {featureUsage.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-400 py-8">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progress & Operational Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Client Progress Summary */}
        <Card className="border-green-100">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Client Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Goal Achievement</span>
                <span className="text-sm font-bold">{progressMetrics.goalAchievement}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${progressMetrics.goalAchievement}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Plan Adherence</span>
                <span className="text-sm font-bold">{progressMetrics.adherence}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${progressMetrics.adherence}%` }}
                ></div>
              </div>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-600">
                <span className="font-semibold">{progressMetrics.avgWeightLoss} kg</span> avg weight loss per client
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Operational Efficiency */}
        <Card className="border-purple-100">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-500" />
              Task Completion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Task Completion</span>
                <span className="text-sm font-bold">{operationalMetrics.completionRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${operationalMetrics.completionRate}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Appointment Rate</span>
                <span className="text-sm font-bold">{operationalMetrics.appointmentCompletionRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all"
                  style={{ width: `${operationalMetrics.appointmentCompletionRate}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Stats */}
        <Card className="border-red-100">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-red-500" />
              Activity Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Meal Plans Created</span>
              <Badge className="bg-orange-100 text-orange-700 border-0">{engagementData.mealPlansCreated}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Appointments Scheduled</span>
              <Badge className="bg-blue-100 text-blue-700 border-0">{engagementData.totalAppointments}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Messages</span>
              <Badge className="bg-green-100 text-green-700 border-0">{engagementData.totalMessages}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}