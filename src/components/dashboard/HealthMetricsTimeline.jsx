import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar } from "recharts";
import { BarChart3, TrendingUp, Activity, Heart } from "lucide-react";
import { format } from "date-fns";

export default function HealthMetricsTimeline({ progressLogs, clientProfile }) {
  const chartData = React.useMemo(() => {
    // Get last 30 days of data
    const last30 = progressLogs
      .filter(log => {
        const logDate = new Date(log.date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return logDate >= thirtyDaysAgo && log.date;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return last30.map(log => ({
      date: format(new Date(log.date), 'MMM dd'),
      weight: log.weight,
      energy: log.wellness_metrics?.energy_level || null,
      sleep: log.wellness_metrics?.sleep_quality || null,
      stress: log.wellness_metrics?.stress_level || null,
      mood: log.wellness_metrics?.mood === 'excellent' ? 5 : log.wellness_metrics?.mood === 'good' ? 4 : log.wellness_metrics?.mood === 'neutral' ? 3 : log.wellness_metrics?.mood === 'poor' ? 2 : 1
    }));
  }, [progressLogs]);

  const stats = React.useMemo(() => {
    if (chartData.length === 0) return null;

    const weights = chartData.filter(d => d.weight).map(d => d.weight);
    const energies = chartData.filter(d => d.energy).map(d => d.energy);
    const sleeps = chartData.filter(d => d.sleep).map(d => d.sleep);

    return {
      avgWeight: (weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1),
      minWeight: Math.min(...weights).toFixed(1),
      maxWeight: Math.max(...weights).toFixed(1),
      weightTrend: weights.length > 1 ? weights[weights.length - 1] - weights[0] : 0,
      avgEnergy: energies.length > 0 ? (energies.reduce((a, b) => a + b, 0) / energies.length).toFixed(1) : 0,
      avgSleep: sleeps.length > 0 ? (sleeps.reduce((a, b) => a + b, 0) / sleeps.length).toFixed(1) : 0
    };
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <Card className="border-none shadow-lg mb-6 bg-gray-50">
        <CardContent className="p-6 text-center text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No health data yet. Start logging your metrics to see trends.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 mb-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 mb-1">Avg Weight</p>
            <p className="text-2xl font-bold text-gray-900">{stats.avgWeight}</p>
            <p className="text-xs text-gray-500 mt-1">kg</p>
            {stats.weightTrend && (
              <Badge className={stats.weightTrend > 0 ? "bg-blue-500 mt-2" : "bg-green-500 mt-2"}>
                {stats.weightTrend > 0 ? "+" : ""}{stats.weightTrend.toFixed(1)} kg
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-yellow-50 to-amber-50">
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 mb-1">Avg Energy</p>
            <p className="text-2xl font-bold text-gray-900">{stats.avgEnergy}</p>
            <p className="text-xs text-gray-500 mt-1">/10</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 mb-1">Avg Sleep</p>
            <p className="text-2xl font-bold text-gray-900">{stats.avgSleep}</p>
            <p className="text-xs text-gray-500 mt-1">/10</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 mb-1">Data Points</p>
            <p className="text-2xl font-bold text-gray-900">{chartData.length}</p>
            <p className="text-xs text-gray-500 mt-1">days tracked</p>
          </CardContent>
        </Card>
      </div>

      {/* Weight Chart */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            Weight Timeline (30 Days)
          </CardTitle>
          <CardDescription>Track your weight progression over the past month</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis domain={['dataMin - 2', 'dataMax + 2']} stroke="#6b7280" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="weight" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" name="Weight (kg)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Wellness Metrics */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            Wellness Metrics Timeline (30 Days)
          </CardTitle>
          <CardDescription>Energy, Sleep, Stress, and Mood trends</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis yAxisId="left" domain={[0, 10]} stroke="#6b7280" />
              <YAxis yAxisId="right" orientation="right" domain={[1, 5]} stroke="#6b7280" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '8px' }} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="energy" stroke="#f59e0b" strokeWidth={2} name="Energy Level" dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="sleep" stroke="#6366f1" strokeWidth={2} name="Sleep Quality" dot={false} />
              <Bar yAxisId="right" dataKey="mood" fill="#ec4899" opacity={0.3} name="Mood (1-5)" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card className="border-none shadow-lg bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Insights from Your Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {stats.weightTrend < 0 && (
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold text-lg">✓</span>
                <span className="text-sm text-gray-700">Great progress! You've lost {Math.abs(stats.weightTrend).toFixed(1)} kg over the past month.</span>
              </li>
            )}
            {stats.avgEnergy >= 7 && (
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold text-lg">⚡</span>
                <span className="text-sm text-gray-700">Your energy levels are consistently high - keep up the great work!</span>
              </li>
            )}
            {stats.avgSleep >= 7 && (
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold text-lg">😴</span>
                <span className="text-sm text-gray-700">Your sleep quality is excellent, which supports your health goals.</span>
              </li>
            )}
            {stats.avgSleep < 6 && (
              <li className="flex items-start gap-2">
                <span className="text-orange-600 font-bold text-lg">⚠</span>
                <span className="text-sm text-gray-700">Your sleep quality is below optimal. Try to improve sleep hygiene for better results.</span>
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}