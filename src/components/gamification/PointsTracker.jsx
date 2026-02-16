import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function PointsTracker({ clientId, compact = false }) {
  const { data: pointsHistory } = useQuery({
    queryKey: ['gamificationPoints', clientId],
    queryFn: async () => {
      const points = await base44.entities.GamificationPoints.filter({ client_id: clientId });
      return points.sort((a, b) => new Date(b.date_earned) - new Date(a.date_earned));
    },
    enabled: !!clientId,
    initialData: [],
  });

  const totalPoints = pointsHistory.reduce((sum, p) => sum + p.points_earned, 0);
  const thisWeekPoints = pointsHistory
    .filter(p => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(p.date_earned) >= weekAgo;
    })
    .reduce((sum, p) => sum + p.points_earned, 0);

  const level = Math.floor(totalPoints / 100) + 1;
  const pointsToNextLevel = 100 - (totalPoints % 100);

  if (compact) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalPoints}</p>
            <p className="text-xs text-gray-600">points • Level {level}</p>
          </div>
        </div>
        <div className="flex-1 max-w-48">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Level {level}</span>
            <span>{pointsToNextLevel} to Level {level + 1}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all"
              style={{ width: `${((totalPoints % 100) / 100) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-yellow-50 to-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-600" />
          Your Points & Level
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-orange-600">
              {totalPoints}
            </p>
            <p className="text-sm text-gray-600">Total Points</p>
          </div>
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-xl">
              <div className="text-white">
                <p className="text-2xl font-bold">{level}</p>
                <p className="text-xs">Level</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-600">+{thisWeekPoints}</p>
            <p className="text-sm text-gray-600">This Week</p>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Level {level} Progress</span>
            <span>{pointsToNextLevel} points to Level {level + 1}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full transition-all"
              style={{ width: `${((totalPoints % 100) / 100) * 100}%` }}
            />
          </div>
        </div>

        {pointsHistory.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <p className="text-sm font-semibold text-gray-700">Recent Activities</p>
            {pointsHistory.slice(0, 5).map((point, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{point.description}</p>
                  <p className="text-xs text-gray-500">{new Date(point.date_earned).toLocaleDateString()}</p>
                </div>
                <Badge className="bg-yellow-500 text-white">+{point.points_earned}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}