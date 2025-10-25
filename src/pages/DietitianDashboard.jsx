import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Calendar, 
  MessageSquare, 
  TrendingUp, 
  UserPlus,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";

export default function DietitianDashboard() {
  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
    initialData: [],
  });

  const { data: todayAppointments } = useQuery({
    queryKey: ['todayAppointments'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      return await base44.entities.Appointment.filter({ date: today, status: 'scheduled' });
    },
    initialData: [],
  });

  const { data: unreadMessages } = useQuery({
    queryKey: ['unreadMessages'],
    queryFn: () => base44.entities.Message.filter({ read: false, sender_type: 'client' }),
    initialData: [],
  });

  const { data: recentProgress } = useQuery({
    queryKey: ['recentProgress'],
    queryFn: () => base44.entities.ProgressLog.list('-created_date', 5),
    initialData: [],
  });

  const activeClients = clients.filter(c => c.status === 'active');
  const newClients = clients.filter(c => {
    const joinDate = new Date(c.join_date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return joinDate > weekAgo;
  });

  const stats = [
    {
      title: "Total Clients",
      value: clients.length,
      icon: Users,
      color: "from-blue-500 to-cyan-500",
      link: createPageUrl("ClientManagement"),
    },
    {
      title: "Active Clients",
      value: activeClients.length,
      icon: CheckCircle2,
      color: "from-green-500 to-emerald-500",
      link: createPageUrl("ClientManagement"),
    },
    {
      title: "Today's Appointments",
      value: todayAppointments.length,
      icon: Calendar,
      color: "from-purple-500 to-indigo-500",
      link: createPageUrl("Appointments"),
    },
    {
      title: "Unread Messages",
      value: unreadMessages.length,
      icon: MessageSquare,
      color: "from-orange-500 to-red-500",
      link: createPageUrl("Communication"),
    },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Dietitian Dashboard</h1>
            <p className="text-gray-600">Welcome back! Here's your practice overview</p>
          </div>
          <Link to={createPageUrl("ClientManagement")}>
            <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
              <UserPlus className="w-4 h-4 mr-2" />
              Add New Client
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Link key={stat.title} to={stat.link}>
              <Card className="border-none shadow-lg hover:shadow-xl transition-all bg-white/80 backdrop-blur cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <stat.icon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{stat.title}</p>
                      <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Appointments */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-500" />
                  Today's Appointments
                </CardTitle>
                <Link to={createPageUrl("Appointments")}>
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {todayAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-600">No appointments today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayAppointments.slice(0, 5).map((apt) => {
                    const client = clients.find(c => c.id === apt.client_id);
                    return (
                      <div key={apt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{client?.full_name}</p>
                          <p className="text-sm text-gray-600">{apt.title}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{apt.time}</Badge>
                          <p className="text-xs text-gray-500 mt-1">{apt.duration} min</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Messages */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-orange-500" />
                  Recent Messages
                </CardTitle>
                <Link to={createPageUrl("Communication")}>
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {unreadMessages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-600">No new messages</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {unreadMessages.slice(0, 5).map((msg) => {
                    const client = clients.find(c => c.id === msg.client_id);
                    return (
                      <div key={msg.id} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-medium text-sm">
                            {client?.full_name?.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{client?.full_name}</p>
                          <p className="text-sm text-gray-600 line-clamp-2">{msg.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {format(new Date(msg.created_date), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Progress Updates */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Recent Progress Updates
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {recentProgress.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-600">No recent progress updates</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentProgress.map((log) => {
                  const client = clients.find(c => c.id === log.client_id);
                  return (
                    <div key={log.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium">
                            {client?.full_name?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{client?.full_name}</p>
                          <p className="text-sm text-gray-600">
                            {format(new Date(log.date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">{log.weight} kg</p>
                        {client?.initial_weight && (
                          <p className="text-xs text-gray-500">
                            {(client.initial_weight - log.weight).toFixed(1)} kg lost
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* New Clients This Week */}
        {newClients.length > 0 && (
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                New Clients This Week ({newClients.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {newClients.map((client) => (
                  <div key={client.id} className="p-4 bg-white rounded-lg shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">
                          {client.full_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{client.full_name}</p>
                        <p className="text-xs text-gray-500">
                          Joined {format(new Date(client.join_date), 'MMM d')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge className="capitalize">{client.goal?.replace('_', ' ')}</Badge>
                      <Badge variant="outline" className="capitalize">{client.food_preference}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}