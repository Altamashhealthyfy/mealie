import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Heart, Moon, Zap, Footprints, Target } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';

export default function WearableDataDashboard({ clientId }) {
  // Fetch latest wearable data (last 7 days)
  const { data: wearableData = [], isLoading, error } = useQuery({
    queryKey: ['wearableDataDashboard', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      return await base44.entities.WearableData.filter({ 
        client_id: clientId
      });
    },
    enabled: !!clientId
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (wearableData.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <Zap className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600">No wearable data available yet. Connect a device to get started.</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate aggregates
  const latestData = wearableData[wearableData.length - 1];
  const avgSteps = Math.round(wearableData.reduce((sum, d) => sum + (d.steps || 0), 0) / wearableData.length);
  const avgSleep = Math.round(wearableData.reduce((sum, d) => sum + (d.sleep?.total_minutes || 0), 0) / wearableData.length);
  const totalCalories = wearableData.reduce((sum, d) => sum + (d.calories?.total || 0), 0);
  const avgActiveMinutes = Math.round(wearableData.reduce((sum, d) => sum + (d.active_minutes || 0), 0) / wearableData.length);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Today's Steps</p>
                <p className="text-2xl font-bold text-gray-900">{latestData?.steps || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Average: {avgSteps}</p>
              </div>
              <Footprints className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Last Night's Sleep</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round((latestData?.sleep?.total_minutes || 0) / 60)}h</p>
                <p className="text-xs text-gray-500 mt-1">Average: {Math.round(avgSleep / 60)}h</p>
              </div>
              <Moon className="w-8 h-8 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Active Minutes</p>
                <p className="text-2xl font-bold text-gray-900">{latestData?.active_minutes || 0}m</p>
                <p className="text-xs text-gray-500 mt-1">Average: {avgActiveMinutes}m</p>
              </div>
              <Target className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Calories Burned</p>
                <p className="text-2xl font-bold text-gray-900">{latestData?.calories?.total || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Total (7d): {totalCalories}</p>
              </div>
              <Zap className="w-8 h-8 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Steps Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Footprints className="w-5 h-5 text-blue-600" />
            Steps Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={wearableData}>
              <defs>
                <linearGradient id="colorSteps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="steps" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSteps)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Sleep Analysis */}
      {wearableData.some(d => d.sleep) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="w-5 h-5 text-purple-600" />
              Sleep Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {wearableData.map((data, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{data.date}</p>
                    <div className="flex gap-3 mt-1 text-xs text-gray-600">
                      <span>Total: {Math.round(data.sleep?.total_minutes / 60)}h</span>
                      <span>Deep: {Math.round(data.sleep?.deep_minutes || 0)}m</span>
                      <span>REM: {Math.round(data.sleep?.rem_minutes || 0)}m</span>
                    </div>
                  </div>
                  {data.sleep?.sleep_score && (
                    <Badge className="bg-purple-100 text-purple-800">
                      {data.sleep.sleep_score}/100
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Heart Rate Summary */}
      {wearableData.some(d => d.heart_rate?.average) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-600" />
              Heart Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={wearableData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="heart_rate.average" fill="#ef4444" name="Avg HR" />
                <Bar dataKey="heart_rate.max" fill="#dc2626" name="Max HR" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Calorie Burn Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-600" />
            Calorie Burn
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={wearableData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="calories.total" stroke="#f97316" name="Total Calories" />
              <Line type="monotone" dataKey="calories.active" stroke="#ea580c" name="Active Calories" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}