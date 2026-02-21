import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  MessageSquare,
  TrendingUp,
  Bell,
  Activity,
  Target,
  BarChart3,
  Loader2
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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
import ClientEngagementMetrics from "@/components/dashboard/ClientEngagementMetrics";
import ClientProgressOverview from "@/components/dashboard/ClientProgressOverview";
import CheckInMetricsPanel from "@/components/dashboard/CheckInMetricsPanel";
import TemplateAssignmentManager from "@/components/dashboard/TemplateAssignmentManager";

export default function CoachPerformanceDashboard() {
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['coachClients', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Client.filter({
        assigned_coach: user.email
      });
    },
    enabled: !!user?.email,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['coachMessages', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Message.filter({
        sender_id: user.email
      });
    },
    enabled: !!user?.email,
  });

  const { data: progressLogs = [] } = useQuery({
    queryKey: ['clientProgressLogs', clients.length],
    queryFn: async () => {
      if (clients.length === 0) return [];
      const allLogs = await base44.entities.ProgressLog.list('-created_date', 500);
      return allLogs.filter(log => clients.some(c => c.id === log.client_id));
    },
    enabled: clients.length > 0,
  });

  const { data: checkInSchedules = [] } = useQuery({
    queryKey: ['coachCheckInSchedules', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.ClientCheckInSchedule.filter({
        coach_email: user.email
      });
    },
    enabled: !!user?.email,
  });

  const metrics = useMemo(() => {
    const activeClients = clients.filter(c => c.status === 'active').length;
    const totalClients = clients.length;
    
    // Calculate engagement metrics
    const clientEngagement = clients.map(client => {
      const clientMessages = messages.filter(m => m.client_id === client.id);
      const replyCount = clientMessages.filter(m => m.sender_type === 'client').length;
      const clientLogs = progressLogs.filter(p => p.client_id === client.id);
      
      return {
        clientId: client.id,
        clientName: client.full_name,
        messageReplyCount: replyCount,
        logsCount: clientLogs.length,
        lastActivityDate: clientLogs.length > 0 
          ? new Date(clientLogs[0].created_date)
          : null
      };
    });

    const avgMessageReplies = clientEngagement.length > 0 
      ? (clientEngagement.reduce((sum, c) => sum + c.messageReplyCount, 0) / clientEngagement.length).toFixed(1)
      : 0;

    // Calculate progress metrics
    const clientProgressMetrics = clients.map(client => {
      const clientLogs = progressLogs.filter(p => p.client_id === client.id);
      if (clientLogs.length < 2) return null;

      const sortedLogs = clientLogs.sort((a, b) => 
        new Date(a.created_date) - new Date(b.created_date)
      );

      const firstWeight = sortedLogs[0].weight;
      const lastWeight = sortedLogs[sortedLogs.length - 1].weight;

      if (!firstWeight || !lastWeight) return null;

      const weightLoss = firstWeight - lastWeight;
      const weightLossPercentage = ((weightLoss / firstWeight) * 100).toFixed(1);

      return {
        clientName: client.full_name,
        weightLoss,
        weightLossPercentage,
        initialWeight: firstWeight,
        currentWeight: lastWeight
      };
    }).filter(Boolean);

    const avgWeightLossPercentage = clientProgressMetrics.length > 0
      ? (clientProgressMetrics.reduce((sum, p) => sum + parseFloat(p.weightLossPercentage), 0) / clientProgressMetrics.length).toFixed(1)
      : 0;

    // Calculate check-in metrics
    const totalCheckIns = checkInSchedules.reduce((sum, s) => sum + (s.times_sent || 0), 0);
    const activeCheckInSchedules = checkInSchedules.filter(s => s.is_active).length;

    return {
      activeClients,
      totalClients,
      avgMessageReplies,
      avgWeightLossPercentage,
      totalCheckIns,
      activeCheckInSchedules,
      clientEngagement,
      clientProgressMetrics,
      progressChangeData: generateProgressTrend(progressLogs, clients)
    };
  }, [clients, messages, progressLogs, checkInSchedules]);

  const generateProgressTrend = (logs, clientList) => {
    const last7Days = {};
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      last7Days[dateStr] = { date: dateStr, logs: 0 };
    }

    logs.forEach(log => {
      const logDate = new Date(log.created_date);
      const dateStr = logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (last7Days[dateStr]) {
        last7Days[dateStr].logs += 1;
      }
    });

    return Object.values(last7Days);
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Performance Dashboard</h1>
          <p className="text-gray-600 mt-2">Track your coaching metrics and client progress</p>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Clients */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Active Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{metrics.activeClients}</div>
              <p className="text-xs text-gray-500 mt-1">of {metrics.totalClients} total clients</p>
            </CardContent>
          </Card>

          {/* Avg Message Engagement */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-600" />
                Message Replies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{metrics.avgMessageReplies}</div>
              <p className="text-xs text-gray-500 mt-1">avg replies per client</p>
            </CardContent>
          </Card>

          {/* Avg Weight Loss */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                Weight Loss Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{metrics.avgWeightLossPercentage}%</div>
              <p className="text-xs text-gray-500 mt-1">average across clients</p>
            </CardContent>
          </Card>

          {/* Check-in Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Bell className="w-4 h-4 text-orange-600" />
                Check-in Reminders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{metrics.totalCheckIns}</div>
              <p className="text-xs text-gray-500 mt-1">{metrics.activeCheckInSchedules} active schedules</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tabs */}
        <Tabs defaultValue="engagement" className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="engagement" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Engagement</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Progress</span>
            </TabsTrigger>
            <TabsTrigger value="checkins" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Check-ins</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Templates</span>
            </TabsTrigger>
          </TabsList>

          {/* Engagement Tab */}
          <TabsContent value="engagement" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Progress Log Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Progress Logging Trend (Last 7 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metrics.progressChangeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="logs"
                        stroke="#f97316"
                        strokeWidth={2}
                        dot={{ fill: '#f97316' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Engagement Metrics */}
              <ClientEngagementMetrics clients={metrics.clientEngagement} />
            </div>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress">
            <ClientProgressOverview progressMetrics={metrics.clientProgressMetrics} />
          </TabsContent>

          {/* Check-ins Tab */}
          <TabsContent value="checkins">
            <CheckInMetricsPanel schedules={checkInSchedules} />
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <TemplateAssignmentManager clients={clients} coachEmail={user?.email} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}