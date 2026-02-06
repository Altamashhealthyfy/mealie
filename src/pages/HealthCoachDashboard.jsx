import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Award,
  Loader2,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { LineChart, Line, PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

export default function HealthCoachDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => await base44.auth.me(),
  });

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["coachClients", user?.email],
    queryFn: async () => {
      const result = await base44.entities.Client.filter({
        assigned_coach: user?.email,
        status: "active"
      });
      return result || [];
    },
    enabled: !!user?.email,
  });

  const { data: appointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ["coachAppointments", user?.email],
    queryFn: async () => {
      const result = await base44.entities.Appointment.filter({
        coach_email: user?.email,
        status: "scheduled"
      });
      return result || [];
    },
    enabled: !!user?.email,
  });

  const { data: progressLogs } = useQuery({
    queryKey: ["coachProgressLogs", user?.email],
    queryFn: async () => {
      if (!clients?.length) return [];
      const logs = await Promise.all(
        clients.map(client =>
          base44.entities.ProgressLog.filter({ client_id: client.id })
        )
      );
      return logs.flat();
    },
    enabled: !!clients?.length,
  });

  const { data: revenue } = useQuery({
    queryKey: ["coachRevenue", user?.email],
    queryFn: async () => {
      const result = await base44.entities.CoachRevenue.filter({
        coach_email: user?.email,
        payment_status: "completed"
      });
      return result || [];
    },
    enabled: !!user?.email,
  });

  const { data: enrollments } = useQuery({
    queryKey: ["coachEnrollments", user?.email],
    queryFn: async () => {
      const result = await base44.entities.ProgramEnrollment.filter({
        coach_email: user?.email
      });
      return result || [];
    },
    enabled: !!user?.email,
  });

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // Calculate metrics
  const activeClientsCount = clients?.length || 0;
  const upcomingAppointmentsCount = appointments?.filter(a => new Date(a.appointment_date) > new Date()).length || 0;
  const completedSessionsCount = appointments?.filter(a => a.status === "completed").length || 0;
  const sessionCompletionRate = appointments?.length 
    ? Math.round((completedSessionsCount / appointments.length) * 100) 
    : 0;

  const totalRevenue = revenue?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
  const averageRevenuePerClient = activeClientsCount > 0 ? Math.round(totalRevenue / activeClientsCount) : 0;

  const clientsWithProgress = clients?.filter(c => 
    progressLogs?.some(log => log.client_id === c.id)
  ).length || 0;

  const upcomingAppointments = appointments
    ?.filter(a => new Date(a.appointment_date) > new Date())
    .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))
    .slice(0, 5) || [];

  // Revenue trend data
  const revenueTrendData = revenue?.reduce((acc, r) => {
    const month = new Date(r.transaction_date).toLocaleDateString('en-US', { month: 'short' });
    const existing = acc.find(item => item.month === month);
    if (existing) {
      existing.amount += r.amount;
    } else {
      acc.push({ month, amount: r.amount });
    }
    return acc;
  }, []).slice(-6) || [];

  // Client progress overview
  const clientProgressData = clients?.slice(0, 5).map(client => {
    const clientLogs = progressLogs?.filter(log => log.client_id === client.id) || [];
    const avgProgress = clientLogs.length > 0
      ? Math.round(clientLogs.reduce((sum, log) => sum + (log.coach_feedback?.rating || 0), 0) / clientLogs.length * 20)
      : 0;
    return {
      name: client.full_name,
      progress: avgProgress,
      logsCount: clientLogs.length
    };
  }) || [];

  const COLORS = ['#f97316', '#dc2626', '#16a34a', '#0284c7', '#9333ea'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Performance Dashboard</h1>
            <p className="text-gray-600 mt-2">Welcome back, {user?.full_name}! Here's your coaching overview.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSelectedPeriod("week")} className={selectedPeriod === "week" ? "bg-orange-100" : ""}>
              Week
            </Button>
            <Button variant="outline" onClick={() => setSelectedPeriod("month")} className={selectedPeriod === "month" ? "bg-orange-100" : ""}>
              Month
            </Button>
            <Button variant="outline" onClick={() => setSelectedPeriod("year")} className={selectedPeriod === "year" ? "bg-orange-100" : ""}>
              Year
            </Button>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Clients */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
              <Users className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeClientsCount}</div>
              <p className="text-xs text-gray-500">{clientsWithProgress} with progress logs</p>
            </CardContent>
          </Card>

          {/* Session Completion Rate */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sessionCompletionRate}%</div>
              <p className="text-xs text-gray-500">{completedSessionsCount} of {appointments?.length || 0} sessions</p>
            </CardContent>
          </Card>

          {/* Total Revenue */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-gray-500">₹{averageRevenuePerClient.toLocaleString()} per client</p>
            </CardContent>
          </Card>

          {/* Upcoming Appointments */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Calendar className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingAppointmentsCount}</div>
              <p className="text-xs text-gray-500">Appointments scheduled</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Monthly revenue performance</CardDescription>
            </CardHeader>
            <CardContent>
              {revenueTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `₹${value}`} />
                    <Line type="monotone" dataKey="amount" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500">No revenue data available</div>
              )}
            </CardContent>
          </Card>

          {/* Client Progress Overview */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Client Progress</CardTitle>
              <CardDescription>Top clients and their ratings</CardDescription>
            </CardHeader>
            <CardContent>
              {clientProgressData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={clientProgressData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="progress" fill="#16a34a" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500">No progress data available</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Appointments */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upcoming Appointments</CardTitle>
                <CardDescription>Your next scheduled sessions</CardDescription>
              </div>
              <Calendar className="h-5 w-5 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length > 0 ? (
              <div className="space-y-4">
                {upcomingAppointments.map((apt) => (
                  <div key={apt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{apt.client_name}</h4>
                      <p className="text-sm text-gray-600">{apt.title || "Session"}</p>
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        {new Date(apt.appointment_date).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className="bg-orange-100 text-orange-800">
                        {apt.appointment_type}
                      </Badge>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-40" />
                <p>No upcoming appointments</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Engagement Summary */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Client Engagement Summary</CardTitle>
            <CardDescription>Overview of your active clients</CardDescription>
          </CardHeader>
          <CardContent>
            {clients && clients.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">Active Clients</span>
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{activeClientsCount}</p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-900">With Progress Logs</span>
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-900">{clientsWithProgress}</p>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-purple-900">Program Enrollments</span>
                    <Award className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-purple-900">{enrollments?.length || 0}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-40" />
                <p>No active clients yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}