import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2,
  Calendar,
  Activity,
  Users,
  Target,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function ClientOverviewWidget({ 
  clients, 
  appointments, 
  progressLogs, 
  foodLogs,
  goals,
  mealPlans 
}) {
  // Calculate metrics
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.status === 'active').length;
  
  // Upcoming appointments (next 7 days)
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  
  const upcomingAppointments = appointments
    .filter(a => {
      const apptDate = new Date(a.date);
      return apptDate >= today && apptDate <= nextWeek && a.status === 'scheduled';
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  // Recent activity (last 7 days)
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  
  const recentProgressLogs = progressLogs.filter(log => 
    new Date(log.date) >= sevenDaysAgo
  ).length;
  
  const recentFoodLogs = foodLogs.filter(log => 
    new Date(log.date) >= sevenDaysAgo
  ).length;

  // Clients needing attention
  const clientsNeedingAttention = clients.filter(client => {
    const clientProgress = progressLogs.filter(l => l.client_id === client.id);
    const clientFood = foodLogs.filter(l => l.client_id === client.id);
    const lastActivity = [...clientProgress, ...clientFood]
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    
    if (!lastActivity) return true;
    
    const daysSince = Math.floor((today - new Date(lastActivity.date)) / (1000 * 60 * 60 * 24));
    return daysSince > 7;
  });

  // Goal progress
  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const goalCompletionRate = goals.length > 0 
    ? Math.round((completedGoals.length / goals.length) * 100) 
    : 0;

  // Weight change tracking
  const clientsWithWeightChange = clients.map(client => {
    const clientLogs = progressLogs
      .filter(l => l.client_id === client.id && l.weight)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (clientLogs.length < 2) return null;
    
    const firstLog = clientLogs[0];
    const lastLog = clientLogs[clientLogs.length - 1];
    const change = firstLog.weight - lastLog.weight;
    
    return {
      client,
      change,
      trend: change > 0 ? 'down' : 'up',
      logs: clientLogs.length
    };
  }).filter(Boolean).sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Clients</p>
                <p className="text-3xl font-bold text-gray-900">{activeClients}</p>
                <p className="text-xs text-gray-500 mt-1">of {totalClients} total</p>
              </div>
              <Users className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Upcoming Appts</p>
                <p className="text-3xl font-bold text-gray-900">{upcomingAppointments.length}</p>
                <p className="text-xs text-gray-500 mt-1">next 7 days</p>
              </div>
              <Calendar className="w-12 h-12 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Recent Activity</p>
                <p className="text-3xl font-bold text-gray-900">{recentProgressLogs + recentFoodLogs}</p>
                <p className="text-xs text-gray-500 mt-1">logs this week</p>
              </div>
              <Activity className="w-12 h-12 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Goal Progress</p>
                <p className="text-3xl font-bold text-gray-900">{goalCompletionRate}%</p>
                <p className="text-xs text-gray-500 mt-1">{completedGoals.length}/{goals.length} completed</p>
              </div>
              <Target className="w-12 h-12 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Upcoming Appointments
              </CardTitle>
              <Link to={createPageUrl("Appointments")}>
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No upcoming appointments</p>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map(appt => (
                  <div key={appt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{appt.client_name || appt.title}</p>
                      <p className="text-xs text-gray-600">
                        {format(new Date(appt.date), 'MMM d')} at {appt.time}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {appt.type?.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clients Needing Attention */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                Needs Attention ({clientsNeedingAttention.length})
              </CardTitle>
              <Link to={createPageUrl("ClientManagement")}>
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {clientsNeedingAttention.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-2" />
                <p className="text-sm text-gray-600">All clients are active!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {clientsNeedingAttention.slice(0, 5).map(client => (
                  <div key={client.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div>
                      <p className="font-semibold text-sm">{client.full_name}</p>
                      <p className="text-xs text-gray-600">No activity in 7+ days</p>
                    </div>
                    <Link to={createPageUrl("Communication")}>
                      <Button size="sm" variant="outline" className="text-orange-600">
                        Contact
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weight Progress Leaders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Top Weight Progress This Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clientsWithWeightChange.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No weight data available yet</p>
          ) : (
            <div className="space-y-3">
              {clientsWithWeightChange.map(({ client, change, trend, logs }) => (
                <div key={client.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded-full ${trend === 'down' ? 'bg-green-100' : 'bg-blue-100'}`}>
                      {trend === 'down' ? (
                        <TrendingDown className="w-5 h-5 text-green-600" />
                      ) : (
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{client.full_name}</p>
                      <p className="text-xs text-gray-600">{logs} progress logs</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${trend === 'down' ? 'text-green-600' : 'text-blue-600'}`}>
                      {Math.abs(change).toFixed(1)} kg
                    </p>
                    <p className="text-xs text-gray-500">{trend === 'down' ? 'lost' : 'gained'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}