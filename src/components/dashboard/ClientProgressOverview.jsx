import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

export default function ClientProgressOverview({ progressMetrics }) {
  const sortedMetrics = [...progressMetrics].sort((a, b) => 
    parseFloat(b.weightLossPercentage) - parseFloat(a.weightLossPercentage)
  );

  const chartData = sortedMetrics.slice(0, 10).map(m => ({
    name: m.clientName.split(' ')[0],
    percentage: parseFloat(m.weightLossPercentage),
    weightLoss: parseFloat(m.weightLoss.toFixed(1))
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Weight Loss Progress by Client</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" label={{ value: '% Loss', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'Weight (kg)', angle: 90, position: 'insideRight' }} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="percentage" fill="#10b981" name="Loss %" />
                <Bar yAxisId="right" dataKey="weightLoss" fill="#f97316" name="Weight Loss (kg)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-green-600" />
              Progress Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Total Clients Tracked</p>
                <p className="text-2xl font-bold text-green-700">{progressMetrics.length}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Avg Weight Loss</p>
                <p className="text-2xl font-bold text-blue-700">
                  {progressMetrics.length > 0
                    ? (progressMetrics.reduce((sum, p) => sum + parseFloat(p.weightLoss), 0) / progressMetrics.length).toFixed(1)
                    : 0}
                  kg
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Top Performers</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {sortedMetrics.slice(0, 5).map((metric, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <p className="text-sm font-medium text-gray-700 truncate">{metric.clientName}</p>
                    <Badge className="bg-green-100 text-green-800">
                      {metric.weightLossPercentage}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}