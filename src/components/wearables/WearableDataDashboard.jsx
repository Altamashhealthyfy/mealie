import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Heart, Footprints, Moon, Flame, Activity, TrendingUp } from "lucide-react";
import { format, subDays } from "date-fns";

export default function WearableDataDashboard({ clientId, compact = false }) {
  const { data: devices } = useQuery({
    queryKey: ['wearableDevices', clientId],
    queryFn: () => base44.entities.WearableDevice.filter({ client_id: clientId, is_connected: true }),
    enabled: !!clientId,
    initialData: []
  });

  const { data: wearableData } = useQuery({
    queryKey: ['wearableData', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const data = await base44.entities.WearableData.filter({ client_id: clientId });
      // Sort by date descending
      return data.sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    enabled: !!clientId && devices.length > 0,
    initialData: []
  });

  // Get last 7 days of data
  const last7Days = React.useMemo(() => {
    const grouped = {};
    wearableData.forEach(item => {
      if (!grouped[item.date]) {
        grouped[item.date] = {
          date: item.date,
          steps: 0,
          heart_rate_avg: 0,
          sleep_hours: 0,
          calories_burned: 0,
          activity_count: 0
        };
      }

      if (item.steps) grouped[item.date].steps += item.steps;
      if (item.heart_rate?.average) grouped[item.date].heart_rate_avg = item.heart_rate.average;
      if (item.sleep?.total_minutes) grouped[item.date].sleep_hours = (item.sleep.total_minutes / 60).toFixed(1);
      if (item.calories?.burned) grouped[item.date].calories_burned += item.calories.burned;
      if (item.activity) grouped[item.date].activity_count += item.activity.length;
    });

    return Object.values(grouped)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-7);
  }, [wearableData]);

  // Today's stats
  const todayData = React.useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return wearableData.find(d => d.date === today);
  }, [wearableData]);

  // Calculate weekly averages
  const weeklyStats = React.useMemo(() => {
    if (last7Days.length === 0) return null;

    return {
      avg_steps: Math.round(last7Days.reduce((sum, d) => sum + d.steps, 0) / last7Days.length),
      avg_heart_rate: Math.round(last7Days.reduce((sum, d) => sum + d.heart_rate_avg, 0) / last7Days.length),
      avg_sleep: (last7Days.reduce((sum, d) => sum + parseFloat(d.sleep_hours), 0) / last7Days.length).toFixed(1),
      total_calories: Math.round(last7Days.reduce((sum, d) => sum + d.calories_burned, 0))
    };
  }, [last7Days]);

  if (devices.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Today's Summary */}
      {todayData && !compact && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Steps Today</p>
                  <p className="text-3xl font-bold text-gray-900">{todayData.steps || '0'}</p>
                </div>
                <Footprints className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-pink-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Avg Heart Rate</p>
                  <p className="text-3xl font-bold text-gray-900">{todayData.heart_rate?.average || '--'}</p>
                  <p className="text-xs text-gray-500">bpm</p>
                </div>
                <Heart className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-indigo-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Sleep</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {todayData.sleep ? (todayData.sleep.total_minutes / 60).toFixed(1) : '--'}
                  </p>
                  <p className="text-xs text-gray-500">hours</p>
                </div>
                <Moon className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Calories Burned</p>
                  <p className="text-3xl font-bold text-gray-900">{todayData.calories?.burned || '0'}</p>
                </div>
                <Flame className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Weekly Average Stats */}
      {weeklyStats && !compact && (
        <Card className="border-none shadow-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              7-Day Averages
            </CardTitle>
            <CardDescription className="text-blue-100">Based on your wearable data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white/20 rounded-lg p-4">
                <p className="text-sm text-white/80 mb-1">Avg Steps</p>
                <p className="text-3xl font-bold text-white">{weeklyStats.avg_steps}</p>
              </div>
              <div className="bg-white/20 rounded-lg p-4">
                <p className="text-sm text-white/80 mb-1">Avg Heart Rate</p>
                <p className="text-3xl font-bold text-white">{weeklyStats.avg_heart_rate}</p>
              </div>
              <div className="bg-white/20 rounded-lg p-4">
                <p className="text-sm text-white/80 mb-1">Avg Sleep</p>
                <p className="text-3xl font-bold text-white">{weeklyStats.avg_sleep}h</p>
              </div>
              <div className="bg-white/20 rounded-lg p-4">
                <p className="text-sm text-white/80 mb-1">Total Calories</p>
                <p className="text-3xl font-bold text-white">{weeklyStats.total_calories}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Steps Trend */}
      {last7Days.length > 0 && !compact && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Footprints className="w-5 h-5 text-blue-600" />
              Steps Trend - Last 7 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={last7Days}>
                <defs>
                  <linearGradient id="colorSteps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="steps"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorSteps)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Heart Rate & Sleep */}
      {last7Days.length > 0 && !compact && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-600" />
                Heart Rate Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={last7Days}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[40, 100]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="heart_rate_avg"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Heart Rate (bpm)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="w-5 h-5 text-purple-600" />
                Sleep Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={last7Days}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sleep_hours" fill="#a855f7" name="Hours" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Calories Trend */}
      {last7Days.length > 0 && !compact && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-600" />
              Calories Burned - Last 7 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="calories_burned" fill="#f97316" name="Calories" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {last7Days.length === 0 && (
        <Card className="border-none shadow-lg bg-gray-50">
          <CardContent className="p-12 text-center">
            <Activity className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No wearable data synced yet</p>
            <p className="text-sm text-gray-500 mt-2">Your connected devices will start syncing data automatically</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}