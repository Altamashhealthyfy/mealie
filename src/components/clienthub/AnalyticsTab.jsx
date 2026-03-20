import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Flame } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, parseISO } from "date-fns";

export default function AnalyticsTab({ clientId, client }) {
  const { data: progressLogs = [], isLoading: loadingProgress } = useQuery({
    queryKey: ["analyticsProgress", clientId],
    queryFn: () => base44.entities.ProgressLog.filter({ client_id: clientId }, "-date", 30),
    enabled: !!clientId,
  });

  const { data: foodLogs = [], isLoading: loadingFood } = useQuery({
    queryKey: ["analyticsFoodLogs", clientId],
    queryFn: () => base44.entities.FoodLog.filter({ client_id: clientId }, "-date", 30),
    enabled: !!clientId,
  });

  const isLoading = loadingProgress || loadingFood;

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  // Weight chart data
  const weightData = [...progressLogs]
    .filter(l => l.weight && l.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-14)
    .map(l => ({ date: format(parseISO(l.date), "MMM d"), weight: l.weight }));

  // Calorie adherence: days food was logged in last 30 days
  const uniqueLogDays = new Set(foodLogs.map(f => f.date)).size;
  const adherencePct = Math.round((uniqueLogDays / 30) * 100);

  // Streak: consecutive days with food logs ending today
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    const d = format(subDays(today, i), "yyyy-MM-dd");
    if (foodLogs.some(f => f.date === d)) streak++;
    else break;
  }

  // Avg meal adherence from progress logs
  const logsWithAdherence = progressLogs.filter(l => l.meal_adherence != null);
  const avgAdherence = logsWithAdherence.length
    ? Math.round(logsWithAdherence.reduce((s, l) => s + l.meal_adherence, 0) / logsWithAdherence.length)
    : null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">Analytics</h2>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-none shadow bg-blue-50">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-gray-500">Log Adherence</p>
            <p className="text-2xl font-bold text-blue-600">{adherencePct}%</p>
            <p className="text-xs text-gray-400">last 30 days</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow bg-orange-50">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-gray-500 flex items-center justify-center gap-1"><Flame className="w-3 h-3 text-orange-500" />Streak</p>
            <p className="text-2xl font-bold text-orange-600">{streak}</p>
            <p className="text-xs text-gray-400">days</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow bg-green-50">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-gray-500">Meal Adherence</p>
            <p className="text-2xl font-bold text-green-600">{avgAdherence != null ? `${avgAdherence}%` : "—"}</p>
            <p className="text-xs text-gray-400">avg from logs</p>
          </CardContent>
        </Card>
      </div>

      {/* Weight Chart */}
      <Card className="border-none shadow bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" /> Weight Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          {weightData.length < 2 ? (
            <p className="text-sm text-gray-400 text-center py-6">Not enough data to show chart (need 2+ logs)</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weightData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v} kg`, "Weight"]} />
                <Line type="monotone" dataKey="weight" stroke="#f97316" strokeWidth={2} dot={{ r: 4, fill: "#f97316" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}