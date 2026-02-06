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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClientManagementPanel from "@/components/coach/ClientManagementPanel";
import ClientMPESSViewer from "@/components/coach/ClientMPESSViewer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function HealthCoachDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [showMessagingDialog, setShowMessagingDialog] = useState(false);
  const [showClientMPESS, setShowClientMPESS] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [appointmentData, setAppointmentData] = useState({
    title: "",
    description: "",
    appointment_date: "",
    duration_minutes: 60,
    appointment_type: "consultation"
  });
  const [messageData, setMessageData] = useState({
    message: ""
  });

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

  const { data: clientSubscriptions } = useQuery({
    queryKey: ["clientSubscriptions", clients?.map(c => c.id).join(",")],
    queryFn: async () => {
      if (!clients?.length) return [];
      const subs = await base44.entities.ClientPlanPurchase.list();
      return subs.filter(sub => clients.some(c => c.id === sub.client_id));
    },
    enabled: !!clients?.length,
  });

  const { data: userProfiles } = useQuery({
    queryKey: ["userProfiles", clients?.map(c => c.email).join(",")],
    queryFn: async () => {
      if (!clients?.length) return [];
      const profiles = await Promise.all(
        clients.map(client => base44.entities.UserProfile.filter({ created_by: client.email }))
      );
      return profiles.flat();
    },
    enabled: !!clients?.length,
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

  const handleScheduleAppointment = (client) => {
    setSelectedClient(client);
    setAppointmentData({
      title: "",
      description: "",
      appointment_date: "",
      duration_minutes: 60,
      appointment_type: "consultation"
    });
    setShowAppointmentDialog(true);
  };

  const handleSendMessage = (client) => {
    setSelectedClient(client);
    setMessageData({ message: "" });
    setShowMessagingDialog(true);
  };

  const handleViewMPESS = (client, profile) => {
    setSelectedClient(client);
    setShowClientMPESS(true);
  };

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

        {/* Client Management Tabs */}
        <Tabs defaultValue="all-clients" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="all-clients">All Clients</TabsTrigger>
            <TabsTrigger value="mpess-data">MPESS Data</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          </TabsList>

          {/* All Clients Tab */}
          <TabsContent value="all-clients" className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Client Management</CardTitle>
                <CardDescription>Manage clients, schedule appointments, and send messages</CardDescription>
              </CardHeader>
              <CardContent>
                <ClientManagementPanel
                  clients={clients || []}
                  progressLogs={progressLogs || []}
                  subscriptions={clientSubscriptions || []}
                  onScheduleAppointment={handleScheduleAppointment}
                  onSendMessage={handleSendMessage}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* MPESS Data Tab */}
          <TabsContent value="mpess-data" className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Client MPESS Assessments</CardTitle>
                <CardDescription>Root cause analysis and wellness profile data</CardDescription>
              </CardHeader>
              <CardContent>
                {clients && clients.length > 0 ? (
                  <div className="space-y-4">
                    {clients.map((client) => {
                      const clientProfile = userProfiles?.find(p => p.created_by === client.email);
                      if (!clientProfile?.mpess_assessment) return null;

                      return (
                        <div key={client.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-lg">{client.full_name}</h3>
                            <Button
                              size="sm"
                              onClick={() => handleViewMPESS(client, clientProfile)}
                              className="bg-orange-500 hover:bg-orange-600"
                            >
                              View Full Assessment
                            </Button>
                          </div>
                          <ClientMPESSViewer 
                            clientProfile={client}
                            userProfile={clientProfile}
                          />
                        </div>
                      );
                    })}
                    {!clients.some((c) => userProfiles?.some(p => p.created_by === c.email && p.mpess_assessment)) && (
                      <p className="text-gray-500 text-center py-8">No MPESS assessments available yet</p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No clients to display</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Client Subscriptions</CardTitle>
                <CardDescription>Track your clients' plan statuses and purchase history</CardDescription>
              </CardHeader>
              <CardContent>
                {clientSubscriptions && clientSubscriptions.length > 0 ? (
                  <div className="space-y-3">
                    {clientSubscriptions.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                        <div className="flex-1">
                          <h4 className="font-semibold">{sub.client_name}</h4>
                          <p className="text-sm text-gray-600">{sub.plan_name}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <span>Valid: {new Date(sub.start_date).toLocaleDateString()} - {new Date(sub.end_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={sub.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {sub.status}
                          </Badge>
                          <span className="font-semibold text-gray-900">₹{sub.amount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No subscriptions available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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

      {/* Schedule Appointment Dialog */}
      <Dialog open={showAppointmentDialog} onOpenChange={setShowAppointmentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Appointment - {selectedClient?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={appointmentData.title}
                onChange={(e) => setAppointmentData({...appointmentData, title: e.target.value})}
                placeholder="e.g., Weekly Check-in"
              />
            </div>
            <div>
              <Label>Date & Time *</Label>
              <Input
                type="datetime-local"
                value={appointmentData.appointment_date}
                onChange={(e) => setAppointmentData({...appointmentData, appointment_date: e.target.value})}
              />
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={appointmentData.duration_minutes}
                onChange={(e) => setAppointmentData({...appointmentData, duration_minutes: parseInt(e.target.value)})}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAppointmentDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button className="flex-1 bg-orange-500 hover:bg-orange-600">
                Schedule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Messaging Dialog */}
      <Dialog open={showMessagingDialog} onOpenChange={setShowMessagingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Message - {selectedClient?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Message *</Label>
              <Input
                value={messageData.message}
                onChange={(e) => setMessageData({...messageData, message: e.target.value})}
                placeholder="Type your message here..."
                className="min-h-24"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowMessagingDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button className="flex-1 bg-blue-500 hover:bg-blue-600">
                Send Message
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MPESS Viewer Dialog */}
      <Dialog open={showClientMPESS} onOpenChange={setShowClientMPESS}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedClient?.full_name} - MPESS Assessment</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <ClientMPESSViewer
              clientProfile={selectedClient}
              userProfile={userProfiles?.find(p => p.created_by === selectedClient.email)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}