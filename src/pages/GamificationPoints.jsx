import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, Award, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function GamificationPoints() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      if (user?.user_type === 'super_admin') {
        return await base44.entities.Client.list();
      } else {
        return await base44.entities.Client.filter({ assigned_coach: user?.email });
      }
    },
    enabled: !!user
  });

  const { data: allPoints = [] } = useQuery({
    queryKey: ['allPoints'],
    queryFn: async () => {
      const points = await base44.entities.GamificationPoints.list();
      return points;
    },
    enabled: !!user
  });

  const clientPointsMap = {};
  allPoints.forEach(point => {
    if (!clientPointsMap[point.client_id]) {
      clientPointsMap[point.client_id] = 0;
    }
    clientPointsMap[point.client_id] += point.points_earned;
  });

  const getClientName = (clientId) => {
    return clients.find(c => c.id === clientId)?.full_name || 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Target className="w-8 h-8 text-orange-500" />
            Points Overview
          </h1>
          <p className="text-gray-600 mt-1">Track gamification points across all clients</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Points Awarded</p>
                  <p className="text-3xl font-bold text-orange-500">
                    {allPoints.reduce((sum, p) => sum + p.points_earned, 0)}
                  </p>
                </div>
                <Target className="w-12 h-12 text-orange-300" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Clients</p>
                  <p className="text-3xl font-bold text-purple-500">
                    {Object.keys(clientPointsMap).length}
                  </p>
                </div>
                <TrendingUp className="w-12 h-12 text-purple-300" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Activities Logged</p>
                  <p className="text-3xl font-bold text-green-500">
                    {allPoints.length}
                  </p>
                </div>
                <Award className="w-12 h-12 text-green-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Client Points Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(clientPointsMap)
                .sort((a, b) => b[1] - a[1])
                .map(([clientId, points]) => (
                  <div key={clientId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="font-semibold">{getClientName(clientId)}</span>
                    <Badge className="bg-orange-500 text-white text-lg px-4 py-1">
                      {points} pts
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Point Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allPoints.slice(0, 20).map(point => (
                <div key={point.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="font-semibold">{getClientName(point.client_id)}</p>
                      <p className="text-gray-600">{point.description || point.action_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">
                      {format(new Date(point.date_earned), 'MMM dd, yyyy')}
                    </span>
                    <Badge className="bg-green-500">+{point.points_earned}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}