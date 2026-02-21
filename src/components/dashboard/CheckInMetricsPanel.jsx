import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Clock, CheckCircle } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from "recharts";

export default function CheckInMetricsPanel({ schedules }) {
  const metrics = useMemo(() => {
    const active = schedules.filter(s => s.is_active).length;
    const inactive = schedules.filter(s => !s.is_active).length;
    const totalSent = schedules.reduce((sum, s) => sum + (s.times_sent || 0), 0);

    const byType = {
      meal_logging: 0,
      water_intake: 0,
      workout: 0,
      wellbeing: 0,
      custom: 0
    };

    schedules.forEach(s => {
      if (byType.hasOwnProperty(s.message_type)) {
        byType[s.message_type]++;
      }
    });

    const chartData = Object.entries(byType)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => ({
        name: type.replace(/_/g, ' ').charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' '),
        value: count
      }));

    return { active, inactive, totalSent, byType, chartData };
  }, [schedules]);

  const COLORS = ['#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

  const frequencyBreakdown = [
    { label: 'Daily', count: schedules.filter(s => s.frequency === 'daily').length },
    { label: 'Weekly', count: schedules.filter(s => s.frequency === 'weekly').length },
    { label: 'Biweekly', count: schedules.filter(s => s.frequency === 'biweekly').length },
    { label: 'Monthly', count: schedules.filter(s => s.frequency === 'monthly').length }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active Schedules */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Active Schedules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{metrics.active}</div>
            <p className="text-xs text-gray-500 mt-1">{metrics.inactive} paused</p>
          </CardContent>
        </Card>

        {/* Total Messages Sent */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bell className="w-4 h-4 text-orange-600" />
              Total Messages Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{metrics.totalSent}</div>
            <p className="text-xs text-gray-500 mt-1">across all schedules</p>
          </CardContent>
        </Card>

        {/* Response Rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              Avg per Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {schedules.length > 0 ? (metrics.totalSent / schedules.length).toFixed(1) : 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">messages per schedule</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message Type Distribution */}
        {metrics.chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Check-in Types</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={metrics.chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {metrics.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Frequency Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Schedule Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {frequencyBreakdown.map((freq, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-sm text-gray-700">{freq.label}</p>
                  <Badge className="bg-blue-100 text-blue-800">{freq.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Schedules */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Check-in Schedules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {schedules.slice(0, 10).map((schedule) => (
              <div key={schedule.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900">
                    {schedule.message_type.replace(/_/g, ' ').toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-600">
                    {schedule.frequency} @ {schedule.schedule_time}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {schedule.is_active && (
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  )}
                  <Badge variant="outline">
                    {schedule.times_sent || 0} sent
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}