import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Users, TrendingUp, Target, Activity } from "lucide-react";

export default function SegmentAnalytics({ filteredClients, segments, progressLogs }) {
  // Calculate segment metrics
  const goalDistribution = Object.entries(segments.byGoal || {}).map(([key, clients]) => ({
    name: key.replace(/_/g, ' '),
    value: clients.length,
  }));

  const engagementDistribution = Object.entries(segments.byEngagement || {}).map(([key, clients]) => ({
    name: key.replace(/_/g, ' '),
    value: clients.length,
  }));

  const progressDistribution = Object.entries(segments.byProgress || {}).map(([key, clients]) => ({
    name: key.replace(/_/g, ' '),
    value: clients.length,
  }));

  const statusDistribution = Object.entries(segments.byStatus || {}).map(([key, clients]) => ({
    name: key.replace(/_/g, ' '),
    value: clients.length,
  }));

  // Calculate average metrics
  const calculateAverageWeight = () => {
    const weights = filteredClients
      .map(c => c.weight)
      .filter(w => w && w > 0);
    return weights.length > 0 ? (weights.reduce((a, b) => a + b) / weights.length).toFixed(1) : 'N/A';
  };

  const calculateAverageAge = () => {
    const ages = filteredClients
      .map(c => c.age)
      .filter(a => a && a > 0);
    return ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b) / ages.length) : 'N/A';
  };

  const calculateAvgProgress = () => {
    const progressValues = filteredClients.map(c => {
      const logs = progressLogs.filter(l => l.client_id === c.id);
      if (logs.length < 2) return 0;
      const latestLog = logs[logs.length - 1];
      const startLog = logs[0];
      if (!latestLog.weight || !startLog.weight) return 0;
      const weightChange = startLog.weight - latestLog.weight;
      return (weightChange / startLog.weight) * 100;
    });
    return (progressValues.reduce((a, b) => a + b, 0) / progressValues.length || 0).toFixed(1);
  };

  const COLORS = ['#f97316', '#dc2626', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#f59e0b', '#06b6d4'];

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{filteredClients.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Avg Age</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{calculateAverageAge()} yrs</p>
              </div>
              <Target className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Avg Weight</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{calculateAverageWeight()} kg</p>
              </div>
              <Activity className="w-8 h-8 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Avg Progress</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{calculateAvgProgress()}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {goalDistribution.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Health Goals Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={goalDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {goalDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {engagementDistribution.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Engagement Levels</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={engagementDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} interval={0} tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#f97316" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {progressDistribution.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progress Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={progressDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} interval={0} tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#22c55e" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {statusDistribution.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Client Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}