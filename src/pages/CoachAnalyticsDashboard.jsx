import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  ResponsiveContainer
} from "recharts";
import {
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  AlertTriangle,
  Award,
  Target,
  BarChart3
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function CoachAnalyticsDashboard() {
  const [dateRange, setDateRange] = useState("6months");
  const [selectedCoach, setSelectedCoach] = useState(null);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  // For admin: fetch all coaches
  const { data: allCoaches } = useQuery({
    queryKey: ["allCoaches"],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter((u) => u.user_type === "student_coach");
    },
    enabled: !!user && user?.user_type === "super_admin",
    initialData: [],
  });

  const coachEmail = user?.user_type === "super_admin" && selectedCoach ? selectedCoach : user?.email;

  const { data: appointments } = useQuery({
    queryKey: ["appointments", coachEmail],
    queryFn: async () => {
      const apps = await base44.entities.Appointment.filter({
        coach_email: coachEmail
      });
      return apps;
    },
    enabled: !!coachEmail,
    initialData: [],
  });

  const { data: progressLogs } = useQuery({
    queryKey: ["progressLogs", coachEmail],
    queryFn: async () => {
      const logs = await base44.entities.ProgressLog.list("-created_date", 1000);
      // Filter by clients assigned to this coach
      const coachClients = await base44.entities.Client.filter({
        assigned_coach: coachEmail
      });
      const clientIds = coachClients.map(c => c.id);
      return logs.filter(l => clientIds.includes(l.client_id));
    },
    enabled: !!coachEmail,
    initialData: [],
  });

  const { data: revenues } = useQuery({
    queryKey: ["revenues", coachEmail],
    queryFn: async () => {
      const revs = await base44.entities.CoachRevenue.filter({
        coach_email: coachEmail
      });
      return revs;
    },
    enabled: !!coachEmail,
    initialData: [],
  });

  const { data: enrollments } = useQuery({
    queryKey: ["enrollments", coachEmail],
    queryFn: async () => {
      const enroll = await base44.entities.ProgramEnrollment.filter({
        coach_email: coachEmail
      });
      return enroll;
    },
    enabled: !!coachEmail,
    initialData: [],
  });

  const { data: programs } = useQuery({
    queryKey: ["programs", coachEmail],
    queryFn: async () => {
      const progs = await base44.entities.CoachProgram.filter({
        coach_email: coachEmail
      });
      return progs;
    },
    enabled: !!coachEmail,
    initialData: [],
  });

  const { data: clients } = useQuery({
    queryKey: ["clients", coachEmail],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list();
      return allClients.filter(c =>
        Array.isArray(c.assigned_coach)
          ? c.assigned_coach.includes(coachEmail)
          : c.assigned_coach === coachEmail
      );
    },
    enabled: !!coachEmail,
    initialData: [],
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    const now = new Date();
    let startDate = new Date();

    if (dateRange === "1month") startDate = subMonths(now, 1);
    else if (dateRange === "3months") startDate = subMonths(now, 3);
    else if (dateRange === "6months") startDate = subMonths(now, 6);
    else if (dateRange === "1year") startDate = subMonths(now, 12);

    const filteredRevenues = revenues.filter(r => new Date(r.transaction_date) >= startDate);
    const filteredAppointments = appointments.filter(a => new Date(a.appointment_date) >= startDate);
    const filteredEnrollments = enrollments.filter(e => new Date(e.enrollment_date) >= startDate);

    const totalRevenue = filteredRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);
    const avgRevenue = filteredRevenues.length > 0 ? totalRevenue / filteredRevenues.length : 0;
    const completedAppointments = filteredAppointments.filter(a => a.status === "completed").length;
    const completedPrograms = enrollments.filter(e => e.status === "completed").length;

    return {
      totalClients: clients.length,
      totalAppointments: filteredAppointments.length,
      completedAppointments,
      appointmentRate: filteredAppointments.length > 0
        ? Math.round((completedAppointments / filteredAppointments.length) * 100)
        : 0,
      totalRevenue,
      avgRevenue: Math.round(avgRevenue),
      totalPrograms: programs.length,
      enrolledClients: new Set(enrollments.map(e => e.client_id)).size,
      completedPrograms,
      avgRating: programs.length > 0
        ? (programs.reduce((sum, p) => sum + (p.rating || 0), 0) / programs.length).toFixed(1)
        : 0
    };
  }, [dateRange, revenues, appointments, enrollments, programs, clients]);

  // Revenue trend data
  const revenueTrend = useMemo(() => {
    const monthsData = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = format(month, "MMM");
      monthsData[key] = 0;
    }

    revenues.forEach(r => {
      const month = format(new Date(r.transaction_date), "MMM");
      if (monthsData.hasOwnProperty(month)) {
        monthsData[month] += r.amount || 0;
      }
    });

    return Object.entries(monthsData).map(([month, amount]) => ({
      month,
      amount: Math.round(amount)
    }));
  }, [revenues]);

  // Transaction type breakdown
  const transactionBreakdown = useMemo(() => {
    const breakdown = {
      appointment: 0,
      program_enrollment: 0,
      subscription: 0,
      custom_service: 0
    };

    revenues.forEach(r => {
      if (breakdown.hasOwnProperty(r.transaction_type)) {
        breakdown[r.transaction_type] += r.amount || 0;
      }
    });

    return Object.entries(breakdown)
      .filter(([_, amount]) => amount > 0)
      .map(([type, amount]) => ({
        name: type.replace(/_/g, " ").toUpperCase(),
        value: Math.round(amount)
      }));
  }, [revenues]);

  // Appointment status breakdown
  const appointmentBreakdown = useMemo(() => {
    const breakdown = {
      scheduled: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0
    };

    appointments.forEach(a => {
      if (breakdown.hasOwnProperty(a.status)) {
        breakdown[a.status]++;
      }
    });

    return Object.entries(breakdown)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count
      }));
  }, [appointments]);

  // Program performance
  const programPerformance = useMemo(() => {
    return programs.slice(0, 5).map(p => ({
      name: p.program_name.substring(0, 15),
      enrollments: enrollments.filter(e => e.program_id === p.id).length,
      completed: enrollments.filter(e => e.program_id === p.id && e.status === "completed").length
    }));
  }, [programs, enrollments]);

  if (!user || user.user_type !== "student_coach") {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>Only health coaches can access analytics.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              📊 Analytics & Reports
            </h1>
            <p className="text-gray-600">Track revenue, clients, and program performance</p>
          </div>
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
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Clients</p>
                  <p className="text-3xl font-bold text-blue-600">{metrics.totalClients}</p>
                </div>
                <Users className="w-12 h-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                  <p className="text-3xl font-bold text-green-600">₹{metrics.totalRevenue.toLocaleString()}</p>
                </div>
                <DollarSign className="w-12 h-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Appointments</p>
                  <p className="text-3xl font-bold text-purple-600">{metrics.totalAppointments}</p>
                  <p className="text-xs text-gray-500 mt-1">{metrics.appointmentRate}% completed</p>
                </div>
                <Calendar className="w-12 h-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Programs</p>
                  <p className="text-3xl font-bold text-orange-600">{metrics.totalPrograms}</p>
                  <p className="text-xs text-gray-500 mt-1">{metrics.completedPrograms} completed</p>
                </div>
                <Target className="w-12 h-12 text-orange-200" />
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
                <LineChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: "#10b981" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Transaction Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Revenue by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={transactionBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ₹${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {transactionBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Appointment Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Appointment Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={appointmentBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Program Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Top Programs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={programPerformance}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={190} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="enrollments" fill="#10b981" />
                  <Bar dataKey="completed" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Average Revenue per Transaction</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">₹{metrics.avgRevenue.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Program Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">
                {enrollments.length > 0
                  ? Math.round((metrics.completedPrograms / enrollments.length) * 100)
                  : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Average Program Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">{metrics.avgRating} ⭐</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}