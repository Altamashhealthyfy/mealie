import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, TrendingDown, Minus, TrendingUp, Flame, Heart } from "lucide-react";
import { format } from "date-fns";

export default function ClientProgressSummary({ client, progressLogs, foodLogs }) {
  const latestProgress = progressLogs?.[0];
  const previousProgress = progressLogs?.[1];
  const recentFoodLogs = foodLogs?.filter(log => {
    if (!log.date) return false;
    const days = Math.floor((new Date() - new Date(log.date)) / (1000 * 60 * 60 * 24));
    return days <= 7;
  }) || [];

  const totalCalories = recentFoodLogs.reduce((sum, log) => sum + (log.calories || 0), 0);
  const avgDailyCalories = recentFoodLogs.length > 0 ? Math.round(totalCalories / recentFoodLogs.length) : 0;
  
  const weightChange = latestProgress && previousProgress && latestProgress.weight
    ? (latestProgress.weight - previousProgress.weight).toFixed(1)
    : null;

  const adherenceRate = recentFoodLogs.length > 0 ? Math.round((recentFoodLogs.length / 7) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Weight Trend */}
      <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-cyan-50">
        <CardContent className="p-4">
          <p className="text-sm text-gray-600 mb-2 flex items-center gap-2">
            <Scale className="w-4 h-4" />
            Current Weight
          </p>
          <p className="text-2xl font-bold text-blue-600">
            {latestProgress?.weight || client?.weight || '--'} kg
          </p>
          {weightChange && (
            <div className="mt-2 flex items-center gap-1">
              {parseFloat(weightChange) < 0 ? (
                <>
                  <TrendingDown className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-600 font-semibold">
                    {Math.abs(weightChange)} kg lost
                  </span>
                </>
              ) : parseFloat(weightChange) > 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-red-600" />
                  <span className="text-xs text-red-600 font-semibold">
                    {weightChange} kg gained
                  </span>
                </>
              ) : (
                <>
                  <Minus className="w-4 h-4 text-gray-600" />
                  <span className="text-xs text-gray-600 font-semibold">No change</span>
                </>
              )}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">
            {latestProgress?.date ? format(new Date(latestProgress.date), 'MMM d, yyyy') : 'No logs'}
          </p>
        </CardContent>
      </Card>

      {/* Meal Adherence */}
      <Card className="border-none shadow-md bg-gradient-to-br from-orange-50 to-red-50">
        <CardContent className="p-4">
          <p className="text-sm text-gray-600 mb-2 flex items-center gap-2">
            <Flame className="w-4 h-4" />
            7-Day Adherence
          </p>
          <p className="text-2xl font-bold text-orange-600">{adherenceRate}%</p>
          <p className="text-xs text-gray-600 mt-2">
            {recentFoodLogs.length} days tracked
          </p>
        </CardContent>
      </Card>

      {/* Average Calories */}
      <Card className="border-none shadow-md bg-gradient-to-br from-purple-50 to-pink-50">
        <CardContent className="p-4">
          <p className="text-sm text-gray-600 mb-2 flex items-center gap-2">
            <Flame className="w-4 h-4" />
            Avg Daily Calories
          </p>
          <p className="text-2xl font-bold text-purple-600">{avgDailyCalories}</p>
          <p className="text-xs text-gray-600 mt-2">
            Target: {client?.target_calories || '--'}
          </p>
        </CardContent>
      </Card>

      {/* Wellness Status */}
      <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-emerald-50">
        <CardContent className="p-4">
          <p className="text-sm text-gray-600 mb-2 flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Wellness Status
          </p>
          <Badge className={
            latestProgress?.wellness_metrics?.mood === 'excellent' ? 'bg-green-500 text-white' :
            latestProgress?.wellness_metrics?.mood === 'good' ? 'bg-blue-500 text-white' :
            'bg-gray-500 text-white'
          }>
            {latestProgress?.wellness_metrics?.mood || 'Not logged'}
          </Badge>
          <p className="text-xs text-gray-600 mt-2">
            Energy: {latestProgress?.wellness_metrics?.energy_level || '--'}/10
          </p>
        </CardContent>
      </Card>
    </div>
  );
}