import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ArrowRight
} from "lucide-react";
import { format } from "date-fns";

export default function DietitianDashboard() {
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list('-created_date');
      
      // Super admin sees ALL clients
      if (user?.user_type === 'super_admin') {
        return allClients;
      }
      
      // Team members, student coaches - only see THEIR OWN clients
      return allClients.filter(client => client.created_by === user?.email);
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: mealPlans } = useQuery({
    queryKey: ['mealPlans'],
    queryFn: async () => {
      const allPlans = await base44.entities.MealPlan.list('-created_date');
      // Filter to only show plans created by current user (for team members)
      if (user?.user_type === 'super_admin') {
        return allPlans;
      }
      return allPlans.filter(plan => plan.created_by === user?.email);
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: appointments } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.Appointment.list('-created_date', 10),
    initialData: [],
  });

  const { data: messages } = useQuery({
    queryKey: ['unreadMessages'],
    queryFn: () => base44.entities.Message.filter({ read: false }),
    initialData: [],
  });

  const { data: mpessTracking } = useQuery({
    queryKey: ['mpessTracking'],
    queryFn: async () => {
      const tracking = await base44.entities.MPESSTracker.list('-created_date', 30);
      return tracking;
    },
    initialData: [],
  });

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

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Welcome back{user?.full_name ? `, ${user.full_name}` : ''}! 👋
            </h1>
            <p className="text-gray-600">Here's what's happening with your practice today</p>
          </div>
          <Sparkles className="w-12 h-12 text-orange-500" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

        {/* Client Growth Chart */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
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
        <Card className="border-none shadow-lg bg-gradient-to-br from-pink-50 to-rose-50">
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
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
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
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
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

        {/* Quick Actions */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
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