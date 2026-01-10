import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ComposedChart } from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import { TrendingUp, TrendingDown, Activity, AlertCircle } from 'lucide-react';

export default function AdvancedAnalyticsDashboard({ progressLogs, mealPlan }) {
  // Prepare data for various visualizations
  const preparedData = React.useMemo(() => {
    const sortedLogs = [...progressLogs].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return sortedLogs.map(log => ({
      date: format(new Date(log.date), 'MMM d'),
      fullDate: log.date,
      weight: log.weight,
      energy: log.wellness_metrics?.energy_level || 0,
      sleep: log.wellness_metrics?.sleep_quality || 0,
      stress: log.wellness_metrics?.stress_level || 0,
      water: log.wellness_metrics?.water_intake || 0,
      exercise: log.wellness_metrics?.exercise_minutes || 0,
      adherence: log.meal_adherence || 0,
      mood: log.wellness_metrics?.mood,
    }));
  }, [progressLogs]);

  // Calculate statistics
  const stats = React.useMemo(() => {
    if (preparedData.length === 0) return null;

    const last7Days = preparedData.slice(-7);
    const last30Days = preparedData.slice(-30);

    return {
      avgAdherence7d: (last7Days.reduce((sum, d) => sum + (d.adherence || 0), 0) / last7Days.length).toFixed(1),
      avgAdherence30d: (last30Days.reduce((sum, d) => sum + (d.adherence || 0), 0) / last30Days.length).toFixed(1),
      avgEnergy7d: (last7Days.reduce((sum, d) => sum + (d.energy || 0), 0) / last7Days.length).toFixed(1),
      avgExercise7d: (last7Days.reduce((sum, d) => sum + (d.exercise || 0), 0) / last7Days.length).toFixed(1),
      totalWater7d: last7Days.reduce((sum, d) => sum + (d.water || 0), 0).toFixed(1),
      avgSleep7d: (last7Days.reduce((sum, d) => sum + (d.sleep || 0), 0) / last7Days.length).toFixed(1),
    };
  }, [preparedData]);

  // Correlation analysis
  const correlation = React.useMemo(() => {
    if (preparedData.length < 2) return null;

    const getCorr = (arr1, arr2) => {
      if (arr1.length < 2) return 0;
      const mean1 = arr1.reduce((a, b) => a + b) / arr1.length;
      const mean2 = arr2.reduce((a, b) => a + b) / arr2.length;
      
      const numerator = arr1.reduce((sum, v1, i) => sum + (v1 - mean1) * (arr2[i] - mean2), 0);
      const denom1 = Math.sqrt(arr1.reduce((sum, v1) => sum + (v1 - mean1) ** 2, 0));
      const denom2 = Math.sqrt(arr2.reduce((sum, v2) => sum + (v2 - mean2) ** 2, 0));
      
      return denom1 && denom2 ? (numerator / (denom1 * denom2)).toFixed(2) : 0;
    };

    const energy = preparedData.map(d => d.energy || 0);
    const sleep = preparedData.map(d => d.sleep || 0);
    const adherence = preparedData.map(d => d.adherence || 0);
    const exercise = preparedData.map(d => d.exercise || 0);

    return {
      energySleep: getCorr(energy, sleep),
      adherenceExercise: getCorr(adherence, exercise),
      sleepAdherence: getCorr(sleep, adherence),
    };
  }, [preparedData]);

  if (!preparedData.length) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-12 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600">Not enough data for advanced analytics. Keep logging to see insights!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
          <CardContent className="p-3 md:p-4">
            <p className="text-xs text-gray-600 mb-1">Meal Adherence</p>
            <p className="text-2xl font-bold text-orange-600">{stats.avgAdherence7d}%</p>
            <p className="text-xs text-gray-500 mt-1">7-day avg</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-yellow-50 to-amber-50">
          <CardContent className="p-3 md:p-4">
            <p className="text-xs text-gray-600 mb-1">Avg Energy</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.avgEnergy7d}/10</p>
            <p className="text-xs text-gray-500 mt-1">Last 7 days</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-indigo-50">
          <CardContent className="p-3 md:p-4">
            <p className="text-xs text-gray-600 mb-1">Avg Sleep</p>
            <p className="text-2xl font-bold text-purple-600">{stats.avgSleep7d}</p>
            <p className="text-xs text-gray-500 mt-1">Hours/night</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-3 md:p-4">
            <p className="text-xs text-gray-600 mb-1">Avg Exercise</p>
            <p className="text-2xl font-bold text-green-600">{Math.round(stats.avgExercise7d)}</p>
            <p className="text-xs text-gray-500 mt-1">min/day</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardContent className="p-3 md:p-4">
            <p className="text-xs text-gray-600 mb-1">Total Water</p>
            <p className="text-2xl font-bold text-blue-600">{stats.totalWater7d}L</p>
            <p className="text-xs text-gray-500 mt-1">7 days</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-pink-50 to-rose-50">
          <CardContent className="p-3 md:p-4">
            <p className="text-xs text-gray-600 mb-1">30-Day Adherence</p>
            <p className="text-2xl font-bold text-pink-600">{stats.avgAdherence30d}%</p>
            <p className="text-xs text-gray-500 mt-1">Month avg</p>
          </CardContent>
        </Card>
      </div>

      {/* Meal Adherence Trend */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            Meal Plan Adherence Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={preparedData}>
              <defs>
                <linearGradient id="adherenceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Area type="monotone" dataKey="adherence" stroke="#f97316" fillOpacity={1} fill="url(#adherenceGrad)" name="Adherence %" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Exercise vs Energy Correlation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              Exercise vs Energy Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={preparedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" domain={[0, 10]} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="exercise" fill="#10b981" name="Exercise (min)" opacity={0.7} />
                <Line yAxisId="right" type="monotone" dataKey="energy" stroke="#f59e0b" strokeWidth={2} name="Energy (1-10)" />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>Correlation:</strong> {correlation?.adherenceExercise || '0'} 
                {Math.abs(correlation?.adherenceExercise) > 0.5 ? ' (Strong relationship)' : ' (Weak relationship)'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              Sleep Quality vs Stress Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={preparedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sleep" stroke="#6366f1" strokeWidth={2} name="Sleep Quality" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="stress" stroke="#ef4444" strokeWidth={2} name="Stress Level" dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>Sleep-Stress Correlation:</strong> {correlation?.sleepAdherence || '0'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Water Intake & Exercise Routine */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Daily Water Intake</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={preparedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `${value}L`} />
                <Bar dataKey="water" fill="#0ea5e9" name="Water (Liters)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Exercise Routine Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={preparedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `${value} min`} />
                <Bar dataKey="exercise" fill="#10b981" name="Exercise (Minutes)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Wellness Heatmap */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Wellness Overview (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {preparedData.slice(-7).map((day) => (
              <div key={day.fullDate} className="p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                <p className="text-xs font-semibold text-gray-700 mb-2">{day.date}</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Energy:</span>
                    <span className="font-bold text-yellow-600">{day.energy}/10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sleep:</span>
                    <span className="font-bold text-indigo-600">{day.sleep}/10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Adherence:</span>
                    <span className={`font-bold ${day.adherence >= 80 ? 'text-green-600' : day.adherence >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {day.adherence}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Exercise:</span>
                    <span className="font-bold text-green-600">{day.exercise}m</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}