import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

export default function AdminPlatformAnalytics() {
  const [dateRange, setDateRange] = useState("3months");

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: allCoaches } = useQuery({
    queryKey: ["allCoaches"],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter((u) => u.user_type === "student_coach");
    },
    initialData: [],
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
              📊 Platform Analytics Dashboard
            </h1>
            <p className="text-gray-600">Overall platform usage, revenue trends & coach performance</p>
          </div>
          <div className="flex gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1month">Last Month</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export Report
            </Button>
          </div>
        </div>

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
      </div>
    </div>
  );
}