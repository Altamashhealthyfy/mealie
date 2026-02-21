import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
 
import ClientOverviewWidget from "@/components/dashboard/ClientOverviewWidget";
import NotificationCenter from "@/components/dashboard/NotificationCenter";
import {
  Users,
  Calendar,
  MessageSquare,
  TrendingUp,
  ChefHat,
  Clock,
  Heart,
  Sparkles,
  UserPlus,
  Eye,
  Plus,
  ArrowRight,
  Scale,
  TrendingDown,
  Minus,
  Target,
  ClipboardList,
  Crown,
  Shield
} from "lucide-react";
import { format } from "date-fns";
import ActionItemsPanel from "@/components/dashboard/ActionItemsPanel";
import CoachGuidePanel from "@/components/common/CoachGuidePanel";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DietitianDashboard() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState(() => {
    // Load viewMode from localStorage on mount
    return localStorage.getItem('admin_view_mode') || 'admin';
  });

  // Save viewMode to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('admin_view_mode', viewMode);
    // Trigger a custom event to notify Layout component
    window.dispatchEvent(new CustomEvent('viewModeChanged', { detail: viewMode }));
  }, [viewMode]);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients } = useQuery({
    queryKey: ['dashboardClients', user?.email, user?.user_type, viewMode],
    queryFn: async () => {
      let allClients = [];
      // Admin view - show all
      if (user?.user_type === 'super_admin' && viewMode === 'admin') {
        allClients = await base44.entities.Client.list('-created_date', 50);
      } else {
        // All other views - show only user's own clients
        allClients = await base44.entities.Client.filter({ created_by: user?.email }, '-created_date', 50);
      }
      // Filter out the current user's own email from the client list
      return allClients.filter(client => client.email?.toLowerCase() !== user?.email?.toLowerCase());
    },
    enabled: !!user,
    initialData: [],
    staleTime: 60000,
  });

  const { data: mealPlans } = useQuery({
    queryKey: ['dashboardMealPlans', user?.email, user?.user_type, viewMode],
    queryFn: async () => {
      if (user?.user_type === 'super_admin' && viewMode === 'admin') {
        return await base44.entities.MealPlan.list('-created_date', 20);
      }
      return await base44.entities.MealPlan.filter({ created_by: user?.email }, '-created_date', 20);
    },
    enabled: !!user,
    initialData: [],
    staleTime: 60000,
  });

  const { data: appointments } = useQuery({
    queryKey: ['dashboardAppointments'],
    queryFn: () => base44.entities.Appointment.filter({ status: 'scheduled' }, '-date', 5),
    initialData: [],
    staleTime: 60000,
  });

  const { data: messages } = useQuery({
    queryKey: ['dashboardUnreadMessages'],
    queryFn: () => base44.entities.Message.filter({ read: false }, '-created_date', 20),
    initialData: [],
    staleTime: 30000,
  });

  const { data: mpessTracking } = useQuery({
    queryKey: ['dashboardMpess'],
    queryFn: () => base44.entities.MPESSTracker.list('-created_date', 20),
    initialData: [],
    staleTime: 60000,
  });

  const { data: progressLogs } = useQuery({
    queryKey: ['dashboardProgress'],
    queryFn: () => base44.entities.ProgressLog.list('-date', 500),
    initialData: [],
    staleTime: 60000,
  });

  const { data: foodLogs } = useQuery({
    queryKey: ['dashboardFoodLogs'],
    queryFn: () => base44.entities.FoodLog.list('-date', 500),
    initialData: [],
    staleTime: 60000,
  });

  const { data: assessments } = useQuery({
    queryKey: ['dashboardAssessments', viewMode],
    queryFn: async () => {
      if (user?.user_type === 'super_admin' && viewMode === 'admin') {
        return await base44.entities.ClientAssessment.list('-created_date');
      }
      return await base44.entities.ClientAssessment.filter({ assigned_by: user?.email }, '-created_date');
    },
    enabled: !!user,
    initialData: [],
    staleTime: 60000,
  });

  const { data: goals } = useQuery({
    queryKey: ['dashboardGoals'],
    queryFn: () => base44.entities.ProgressGoal.list('-created_date'),
    initialData: [],
    staleTime: 60000,
  });

  const { data: mealPlansData } = useQuery({
    queryKey: ['dashboardMealPlansData'],
    queryFn: () => base44.entities.MealPlan.list('-created_date', 200),
    initialData: [],
    staleTime: 60000,
  });

  // Get unique clients who have tracked MPESS
  const mpessClientIds = [...new Set(mpessTracking.map(t => t.created_by))];
  const mpessClients = clients.filter(c => mpessClientIds.includes(c.email));

  // Progress tracking clients
  const progressClientIds = [...new Set(progressLogs.map(p => p.client_id))];
  const progressClients = clients.filter(c => progressClientIds.includes(c.id));

  const activeClients = clients.filter(c => c.status === 'active');
  const recentClients = clients.slice(0, 5);
  const upcomingAppointments = appointments.filter(a => a.status === 'scheduled').slice(0, 3);

  // MPESS stats
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);
  const recentMPESS = mpessTracking.filter(t => new Date(t.date) >= last7Days);
  const totalMPESSSessions = mpessTracking.length;
  const avgMPESSRating = mpessTracking.length > 0 
    ? (mpessTracking.reduce((sum, t) => sum + (t.overall_rating || 0), 0) / mpessTracking.length).toFixed(1)
    : 0;

  // Client growth stats
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);
  const newClientsThisMonth = clients.filter(c => new Date(c.created_date) >= last30Days).length;

  const handleCreatePlan = (clientId) => {
    navigate(`${createPageUrl("MealPlanner")}?client=${clientId}`);
  };

   

  const stats = [
    {
      title: "Total Clients",
      value: clients.length,
      subtitle: `${activeClients.length} active`,
      icon: Users,
      color: "from-blue-500 to-cyan-500",
      link: createPageUrl("ClientManagement"),
    },
    {
      title: "New This Month",
      value: newClientsThisMonth,
      subtitle: "clients added",
      icon: UserPlus,
      color: "from-green-500 to-emerald-500",
      link: createPageUrl("ClientManagement"),
    },
    {
      title: "Meal Plans",
      value: mealPlans.length,
      subtitle: "created",
      icon: ChefHat,
      color: "from-orange-500 to-red-500",
      link: createPageUrl("MealPlanner"),
    },
    {
      title: "MPESS Sessions",
      value: totalMPESSSessions,
      subtitle: `Avg: ${avgMPESSRating}/5`,
      icon: Heart,
      color: "from-pink-500 to-rose-500",
      link: createPageUrl("ClientManagement"),
    },
    {
      title: "Unread Messages",
      value: messages.length,
      subtitle: "pending",
      icon: MessageSquare,
      color: "from-purple-500 to-indigo-500",
      link: createPageUrl("Communication"),
    },
    {
      title: "Appointments",
      value: upcomingAppointments.length,
      subtitle: "upcoming",
      icon: Calendar,
      color: "from-cyan-500 to-blue-500",
      link: createPageUrl("Appointments"),
    },
  ];

  const isAdmin = user?.user_type === 'super_admin';

  // Simulate plan permissions based on view mode
  const getViewPermissions = () => {
    switch(viewMode) {
      case 'admin':
        return { all: true };
      case 'pro_user':
        return {
          max_clients: -1,
          ai_generation_limit: -1,
          can_access_pro_plans: true,
          can_create_templates: true,
          can_access_business_tools: true,
        };
      case 'basic_user':
        return {
          max_clients: 25,
          ai_generation_limit: 50,
          can_access_pro_plans: false,
          can_create_templates: false,
          can_access_business_tools: false,
        };
      case 'trial':
        return {
          max_clients: 25,
          ai_generation_limit: 50,
          can_access_pro_plans: false,
          is_trial: true,
          trial_days_left: 5,
        };
      case 'client':
        return {
          is_client_view: true,
        };
      default:
        return { all: true };
    }
  };

  const viewPermissions = getViewPermissions();
  const limitedClients = viewMode === 'basic_user' || viewMode === 'trial' ? clients.slice(0, 25) : clients;

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-8">
       
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">
              Welcome back{user?.full_name ? `, ${user.full_name}` : ''}! 👋
            </h1>
            <p className="text-sm sm:text-base text-gray-600">Here's what's happening with your practice today</p>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <div className="bg-white p-4 rounded-lg shadow-md border-2 border-purple-200">
                <Label htmlFor="view-mode" className="text-sm font-semibold text-gray-700 mb-2 block">
                  👁️ Admin View Selector
                </Label>
                <Select value={viewMode} onValueChange={setViewMode}>
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">👑 Admin View (All Data)</SelectItem>
                    <SelectItem value="pro_user">💎 Mealie Pro User</SelectItem>
                    <SelectItem value="basic_user">⭐ Mealie Basic User</SelectItem>
                    <SelectItem value="trial">🎁 Trial User (7 Days)</SelectItem>
                    <SelectItem value="client">👤 Client View</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-orange-500" />
          </div>
        </div>

        {/* View Mode Indicator */}
        {isAdmin && (
          <Card className={`border-2 ${
            viewMode === 'admin' ? 'border-purple-500 bg-purple-50' :
            viewMode === 'pro_user' ? 'border-green-500 bg-green-50' :
            viewMode === 'basic_user' ? 'border-blue-500 bg-blue-50' :
            viewMode === 'trial' ? 'border-orange-500 bg-orange-50' :
            'border-gray-500 bg-gray-50'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {viewMode === 'admin' && (
                    <>
                      <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                        <Crown className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Platform Admin View</h3>
                        <p className="text-sm text-gray-600">Full access to all platform data and analytics</p>
                      </div>
                    </>
                  )}
                  {viewMode === 'pro_user' && (
                    <>
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                        <Crown className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Mealie Pro User</h3>
                        <p className="text-sm text-gray-600">Unlimited clients • Unlimited AI • Pro Plans • Business Tools</p>
                      </div>
                    </>
                  )}
                  {viewMode === 'basic_user' && (
                    <>
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Mealie Basic User</h3>
                        <p className="text-sm text-gray-600">Up to 25 clients • 50 AI generations • Basic features</p>
                      </div>
                    </>
                  )}
                  {viewMode === 'trial' && (
                    <>
                      <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Trial User (Free Trial)</h3>
                        <p className="text-sm text-gray-600">7-day free trial • Basic plan features • 5 days remaining</p>
                      </div>
                    </>
                  )}
                  {viewMode === 'client' && (
                    <>
                      <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center">
                        <Heart className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Client View</h3>
                        <p className="text-sm text-gray-600">Client portal with meal plans and progress tracking</p>
                      </div>
                    </>
                  )}
                </div>
                {(viewMode === 'basic_user' || viewMode === 'trial') && (
                  <div className="text-right">
                    <Badge className="bg-orange-500 text-white text-xs mb-1">LIMITS ACTIVE</Badge>
                    <p className="text-xs text-gray-600">Clients: {limitedClients.length}/25</p>
                    <p className="text-xs text-gray-600">AI: 35/50 used</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Coach Guide Panel */}
        <CoachGuidePanel />

        {/* Client Overview Dashboard */}
        <ClientOverviewWidget
          clients={clients}
          appointments={appointments}
          progressLogs={progressLogs}
          foodLogs={foodLogs}
          goals={goals}
          mealPlans={mealPlansData}
        />

        {/* Notification Center */}
        <NotificationCenter user={user} />

        {/* Limitations Warning for Basic/Trial */}
        {isAdmin && (viewMode === 'basic_user' || viewMode === 'trial') && (
          <Card className="border-2 border-orange-500 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-orange-600" />
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">Plan Limitations Preview</h3>
                  <p className="text-sm text-gray-600">This view simulates {viewMode === 'trial' ? 'trial' : 'basic'} plan restrictions and feature access</p>
                </div>
                <Badge className="bg-orange-600 text-white">LIMITED ACCESS</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="dashboard-stats">
          {stats.map((stat) => (
            <Link key={stat.title} to={stat.link}>
              <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white/80 backdrop-blur">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                      <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                      {stat.subtitle && (
                        <p className="text-xs text-gray-500">{stat.subtitle}</p>
                      )}
                    </div>
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                      <stat.icon className="w-7 h-7 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Action Items */}
        <ActionItemsPanel
          clients={clients}
          progressLogs={progressLogs}
          foodLogs={foodLogs}
          assessments={assessments}
          goals={goals}
          appointments={appointments}
        />

        {/* Client Growth Chart */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50" id="client-growth">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Client Growth Analytics
            </CardTitle>
            <CardDescription>Track your client base growth and engagement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total Clients</p>
                <p className="text-2xl font-bold text-blue-600">{clients.length}</p>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </div>
              <div className="p-4 bg-white rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Active Clients</p>
                <p className="text-2xl font-bold text-green-600">{activeClients.length}</p>
                <p className="text-xs text-gray-500 mt-1">{((activeClients.length / Math.max(clients.length, 1)) * 100).toFixed(0)}% of total</p>
              </div>
              <div className="p-4 bg-white rounded-lg">
                <p className="text-sm text-gray-600 mb-1">New This Month</p>
                <p className="text-2xl font-bold text-orange-600">{newClientsThisMonth}</p>
                <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* MPESS Wellness Tracking */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-pink-50 to-rose-50" id="mpess-wellness">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              MPESS Wellness Tracking
            </CardTitle>
            <CardDescription>Client wellness activity and engagement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total Sessions</p>
                <p className="text-2xl font-bold text-pink-600">{totalMPESSSessions}</p>
                <p className="text-xs text-gray-500 mt-1">All time tracking</p>
              </div>
              <div className="p-4 bg-white rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Avg Rating</p>
                <p className="text-2xl font-bold text-purple-600">{avgMPESSRating}/5</p>
                <p className="text-xs text-gray-500 mt-1">Wellness score</p>
              </div>
              <div className="p-4 bg-white rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Last 7 Days</p>
                <p className="text-2xl font-bold text-orange-600">{recentMPESS.length}</p>
                <p className="text-xs text-gray-500 mt-1">Recent sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Clients */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur" id="recent-clients">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  Recent Clients
                </CardTitle>
                <Link to={createPageUrl("ClientManagement")}>
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentClients.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-600 mb-4">No clients yet</p>
                  <Link to={createPageUrl("ClientManagement")}>
                    <Button className="bg-gradient-to-r from-orange-500 to-red-500">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add First Client
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentClients.map((client) => {
                    const clientPlans = mealPlans.filter(p => p.client_id === client.id);
                    const activePlan = clientPlans.find(p => p.active);
                    
                    return (
                      <div key={client.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-medium">
                                {client.full_name.charAt(0)}
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{client.full_name}</p>
                              <div className="flex gap-2 mt-1">
                                <Badge className={
                                  client.status === 'active' ? 'bg-green-100 text-green-700' :
                                  'bg-gray-100 text-gray-700'
                                }>
                                  {client.status}
                                </Badge>
                                {clientPlans.length > 0 && (
                                  <Badge className="bg-purple-100 text-purple-700">
                                    {clientPlans.length} {clientPlans.length === 1 ? 'Plan' : 'Plans'}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {clientPlans.length > 0 && (
                              <Link to={createPageUrl("MealPlanner")}>
                                <Button variant="outline" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleCreatePlan(client.id)}
                              className="border-orange-500 text-orange-600 hover:bg-orange-50"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Appointments */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur" id="upcoming-appointments">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-500" />
                  Upcoming Appointments
                </CardTitle>
                <Link to={createPageUrl("Appointments")}>
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-600">No upcoming appointments</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingAppointments.map((appointment) => {
                    const client = clients.find(c => c.id === appointment.client_id);
                    return (
                      <div key={appointment.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-gray-900">{appointment.title}</p>
                          <Badge variant="outline">{appointment.type}</Badge>
                        </div>
                        {client && (
                          <p className="text-sm text-gray-600 mb-2">
                            <Users className="w-3 h-3 inline mr-1" />
                            {client.full_name}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(appointment.date), 'MMM d, yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {appointment.time}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Progress Tracking Activity */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-blue-500" />
                  Recent Progress Updates
                </CardTitle>
                <Badge className="bg-blue-100 text-blue-700">
                  {progressClients.length} Tracking
                </Badge>
              </div>
              <CardDescription>Client weight and measurement tracking</CardDescription>
            </CardHeader>
            <CardContent>
              {progressLogs.length === 0 ? (
                <div className="text-center py-8">
                  <Scale className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-600 mb-2">No progress tracking yet</p>
                  <p className="text-sm text-gray-500">Clients haven't logged their progress</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {progressLogs.slice(0, 10).map((log) => {
                    const client = clients.find(c => c.id === log.client_id);
                    const previousLogs = progressLogs.filter(p => 
                      p.client_id === log.client_id && 
                      new Date(p.date) < new Date(log.date)
                    );
                    const previousLog = previousLogs.length > 0 ? previousLogs[0] : null;
                    const weightChange = previousLog && log.weight 
                      ? (log.weight - previousLog.weight).toFixed(1)
                      : null;
                    
                    return (
                      <div key={log.id} className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-100">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">
                                  {client?.full_name?.charAt(0) || 'C'}
                                </span>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{client?.full_name || 'Client'}</p>
                                <p className="text-xs text-gray-500">
                                  {format(new Date(log.date), 'MMM d, yyyy')}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-3">
                              {log.weight && (
                                <div className="p-2 bg-white rounded">
                                  <p className="text-xs text-gray-600">Weight</p>
                                  <div className="flex items-center gap-1">
                                    <p className="text-lg font-bold text-blue-600">{log.weight} kg</p>
                                    {weightChange && (
                                      <span className={`text-xs flex items-center ${
                                        parseFloat(weightChange) < 0 ? 'text-green-600' : 
                                        parseFloat(weightChange) > 0 ? 'text-red-600' : 'text-gray-600'
                                      }`}>
                                        {parseFloat(weightChange) < 0 ? (
                                          <TrendingDown className="w-3 h-3" />
                                        ) : parseFloat(weightChange) > 0 ? (
                                          <TrendingUp className="w-3 h-3" />
                                        ) : (
                                          <Minus className="w-3 h-3" />
                                        )}
                                        {Math.abs(parseFloat(weightChange))}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                              {(log.measurements?.waist || log.measurements?.chest) && (
                                <div className="p-2 bg-white rounded">
                                  <p className="text-xs text-gray-600">Measurements</p>
                                  <p className="text-xs text-gray-700">
                                    {log.measurements?.waist && `W: ${log.measurements.waist}"`}
                                    {log.measurements?.chest && ` C: ${log.measurements.chest}"`}
                                  </p>
                                </div>
                              )}
                            </div>
                            {log.notes && (
                              <p className="text-xs text-gray-600 mt-2 italic">"{log.notes}"</p>
                            )}
                          </div>
                          <div className="text-right ml-2">
                            {log.energy_level && (
                              <div className="mb-1">
                                <p className="text-xs text-gray-500">Energy</p>
                                <p className="text-sm font-bold text-green-600">{log.energy_level}/5</p>
                              </div>
                            )}
                            {log.meal_adherence !== undefined && (
                              <div>
                                <p className="text-xs text-gray-500">Adherence</p>
                                <p className="text-sm font-bold text-purple-600">{log.meal_adherence}%</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* MPESS Client Activity */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  Recent MPESS Wellness Activity
                </CardTitle>
                <Badge className="bg-pink-100 text-pink-700">
                  {mpessClients.length} Active Clients
                </Badge>
              </div>
              <CardDescription>Client wellness tracking updates</CardDescription>
            </CardHeader>
          <CardContent>
            {mpessTracking.length === 0 ? (
              <div className="text-center py-8">
                <Heart className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-600 mb-2">No MPESS tracking yet</p>
                <p className="text-sm text-gray-500">Clients haven't started wellness tracking</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {mpessTracking.slice(0, 10).map((tracking) => {
                  const client = clients.find(c => c.email === tracking.created_by);
                  return (
                    <div key={tracking.id} className="p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg border border-pink-100">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                {client?.full_name?.charAt(0) || 'C'}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{client?.full_name || 'Client'}</p>
                              <p className="text-xs text-gray-500">
                                {format(new Date(tracking.date), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-5 gap-2 mt-3">
                            <div className="text-center">
                              <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center ${
                                tracking.mind_practices?.affirmations_completed || tracking.mind_practices?.stress_relief_done 
                                  ? 'bg-blue-500' : 'bg-gray-200'
                              }`}>
                                <span className="text-xs text-white">🧠</span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">Mind</p>
                            </div>
                            <div className="text-center">
                              <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center ${
                                tracking.physical_practices?.movement_done || tracking.physical_practices?.hydration_met
                                  ? 'bg-green-500' : 'bg-gray-200'
                              }`}>
                                <span className="text-xs text-white">💪</span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">Physical</p>
                            </div>
                            <div className="text-center">
                              <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center ${
                                tracking.emotional_practices?.journaling_done || tracking.emotional_practices?.breathwork_done
                                  ? 'bg-yellow-500' : 'bg-gray-200'
                              }`}>
                                <span className="text-xs text-white">❤️</span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">Emotional</p>
                            </div>
                            <div className="text-center">
                              <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center ${
                                tracking.social_practices?.bonding_activity_done || tracking.social_practices?.connection_made
                                  ? 'bg-purple-500' : 'bg-gray-200'
                              }`}>
                                <span className="text-xs text-white">👥</span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">Social</p>
                            </div>
                            <div className="text-center">
                              <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center ${
                                tracking.spiritual_practices?.meditation_done || tracking.spiritual_practices?.gratitude_journaling_done
                                  ? 'bg-indigo-500' : 'bg-gray-200'
                              }`}>
                                <span className="text-xs text-white">✨</span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">Spiritual</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-full border-2 border-pink-500">
                            <span className="text-2xl font-bold text-pink-600">{tracking.overall_rating || 0}</span>
                            <span className="text-xs text-gray-500">/5</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Overall</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        </div>

        {/* Quick Actions */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50" id="quick-actions">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Link to={createPageUrl("ClientManagement")} className="block">
                <Button className="w-full h-20 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
                  <div className="text-center">
                    <UserPlus className="w-6 h-6 mx-auto mb-1" />
                    <span className="text-sm">Add Client</span>
                  </div>
                </Button>
              </Link>
              <Link to={createPageUrl("MealPlanner")} className="block">
                <Button className="w-full h-20 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
                  <div className="text-center">
                    <ChefHat className="w-6 h-6 mx-auto mb-1" />
                    <span className="text-sm">Create Meal Plan</span>
                  </div>
                </Button>
              </Link>
              <Link to={createPageUrl("Appointments")} className="block">
                <Button className="w-full h-20 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                  <div className="text-center">
                    <Calendar className="w-6 h-6 mx-auto mb-1" />
                    <span className="text-sm">Schedule Appointment</span>
                  </div>
                </Button>
              </Link>
              <Link to={createPageUrl("Communication")} className="block">
                <Button className="w-full h-20 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
                  <div className="text-center">
                    <MessageSquare className="w-6 h-6 mx-auto mb-1" />
                    <span className="text-sm">Message Client</span>
                  </div>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}