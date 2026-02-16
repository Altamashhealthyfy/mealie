import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";

export default function GamificationLeaderboard() {
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
    queryFn: () => base44.entities.GamificationPoints.list(),
    enabled: !!user
  });

  const { data: allBadges = [] } = useQuery({
    queryKey: ['allClientBadges'],
    queryFn: () => base44.entities.ClientBadge.list(),
    enabled: !!user
  });

  const leaderboard = clients.map(client => {
    const points = allPoints
      .filter(p => p.client_id === client.id)
      .reduce((sum, p) => sum + p.points_earned, 0);
    
    const badges = allBadges.filter(b => b.client_id === client.id).length;

    return {
      ...client,
      totalPoints: points,
      totalBadges: badges
    };
  }).sort((a, b) => b.totalPoints - a.totalPoints);

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-8 h-8 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-8 h-8 text-gray-400" />;
    if (rank === 3) return <Medal className="w-8 h-8 text-orange-600" />;
    return <span className="text-2xl font-bold text-gray-400">#{rank}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-orange-500" />
            Client Leaderboard
          </h1>
          <p className="text-gray-600 mt-1">Top performing clients by points and badges</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaderboard.map((client, index) => (
                <div
                  key={client.id}
                  className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                    index === 0 ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-400' :
                    index === 1 ? 'bg-gradient-to-r from-gray-100 to-slate-100 border-2 border-gray-400' :
                    index === 2 ? 'bg-gradient-to-r from-orange-100 to-amber-100 border-2 border-orange-400' :
                    'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12">
                      {getRankIcon(index + 1)}
                    </div>
                    <div>
                      <p className="font-bold text-lg">{client.full_name}</p>
                      <p className="text-sm text-gray-600">{client.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <Badge className="bg-orange-500 text-white text-lg px-4 py-1">
                        {client.totalPoints} pts
                      </Badge>
                      <p className="text-xs text-gray-600 mt-1">
                        {client.totalBadges} badges
                      </p>
                    </div>
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