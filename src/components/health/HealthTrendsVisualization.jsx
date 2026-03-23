import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";
import { format } from "date-fns";
import { TrendingUp, Activity, Moon, Zap, CloudRain, Heart, AlertCircle, Droplets } from "lucide-react";
// fix: Droplets import

export default function HealthTrendsVisualization({ progressLogs }) {
  // Process data for different visualizations
  const chartData = useMemo(() => {
    return progressLogs.map(log => ({
      date: format(new Date(log.date), 'MMM d'),
      fullDate: log.date,
      weight: log.weight,
      energy: log.wellness_metrics?.energy_level || null,
      sleep: log.wellness_metrics?.sleep_quality || null,
      stress: log.wellness_metrics?.stress_level || null,
      water: log.wellness_metrics?.water_intake || null,
      exercise: log.wellness_metrics?.exercise_minutes || null,
      digestion: log.wellness_metrics?.digestion_quality || null,
      adherence: log.meal_adherence || null,
    })).sort((a, b) => new Date(a.fullDate) - new Date(b.fullDate));
  }, [progressLogs]);

  // Average wellness scores
  const wellnessAverage = useMemo(() => {
    const logsWithMetrics = progressLogs.filter(log => log.wellness_metrics);
    if (logsWithMetrics.length === 0) return null;

    const totals = logsWithMetrics.reduce((acc, log) => ({
      energy: acc.energy + (log.wellness_metrics.energy_level || 0),
      sleep: acc.sleep + (log.wellness_metrics.sleep_quality || 0),
      stress: 10 - acc.stress + (10 - (log.wellness_metrics.stress_level || 5)), // Invert stress
      water: acc.water + (log.wellness_metrics.water_intake || 0) / 2, // Normalize
      exercise: acc.exercise + (log.wellness_metrics.exercise_minutes || 0) / 6, // Normalize
    }), { energy: 0, sleep: 0, stress: 0, water: 0, exercise: 0 });

    return [
      { metric: 'Energy', value: (totals.energy / logsWithMetrics.length).toFixed(1) },
      { metric: 'Sleep', value: (totals.sleep / logsWithMetrics.length).toFixed(1) },
      { metric: 'Low Stress', value: (totals.stress / logsWithMetrics.length).toFixed(1) },
      { metric: 'Hydration', value: (totals.water / logsWithMetrics.length).toFixed(1) },
      { metric: 'Exercise', value: (totals.exercise / logsWithMetrics.length).toFixed(1) },
    ];
  }, [progressLogs]);

  // Symptom frequency analysis
  const symptomFrequency = useMemo(() => {
    const frequency = {};
    progressLogs.forEach(log => {
      if (log.symptoms) {
        log.symptoms.forEach(symptom => {
          frequency[symptom] = (frequency[symptom] || 0) + 1;
        });
      }
    });
    return Object.entries(frequency)
      .map(([symptom, count]) => ({ symptom, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [progressLogs]);

  // Mood distribution
  const moodDistribution = useMemo(() => {
    const distribution = {};
    progressLogs.forEach(log => {
      const mood = log.wellness_metrics?.mood;
      if (mood) {
        distribution[mood] = (distribution[mood] || 0) + 1;
      }
    });
    return Object.entries(distribution).map(([mood, count]) => ({
      mood: mood.replace('_', ' '),
      count
    }));
  }, [progressLogs]);

  if (progressLogs.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Activity className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600">No health data logged yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="wellness" className="space-y-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="wellness">Wellness</TabsTrigger>
        <TabsTrigger value="habits">Habits</TabsTrigger>
        <TabsTrigger value="symptoms">Symptoms</TabsTrigger>
        <TabsTrigger value="overview">Overview</TabsTrigger>
      </TabsList>

      {/* Wellness Trends */}
      <TabsContent value="wellness" className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Energy & Sleep Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="energy" stroke="#fbbf24" strokeWidth={2} name="Energy" />
                  <Line type="monotone" dataKey="sleep" stroke="#6366f1" strokeWidth={2} name="Sleep" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CloudRain className="w-5 h-5 text-red-500" />
                Stress Level Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Area type="monotone" dataKey="stress" stroke="#ef4444" fill="#fee2e2" strokeWidth={2} name="Stress" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* Habits */}
      <TabsContent value="habits" className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="w-5 h-5 text-blue-500" />
                Hydration & Exercise
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="water" fill="#3b82f6" name="Water (L)" />
                  <Bar yAxisId="right" dataKey="exercise" fill="#22c55e" name="Exercise (min)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Meal Plan Adherence</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="adherence" stroke="#f97316" strokeWidth={2} name="Adherence %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* Symptoms Analysis */}
      <TabsContent value="symptoms" className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Most Common Symptoms
              </CardTitle>
              <CardDescription>Frequency over the tracking period</CardDescription>
            </CardHeader>
            <CardContent>
              {symptomFrequency.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={symptomFrequency} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="symptom" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ef4444" name="Times Reported" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500 py-12">No symptoms reported</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" />
                Mood Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {moodDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={moodDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mood" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ec4899" name="Days" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500 py-12">No mood data logged</p>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* Wellness Overview Radar */}
      <TabsContent value="overview">
        <Card>
          <CardHeader>
            <CardTitle>Wellness Score Overview</CardTitle>
            <CardDescription>Average scores across all wellness dimensions</CardDescription>
          </CardHeader>
          <CardContent>
            {wellnessAverage ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={wellnessAverage}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis domain={[0, 10]} />
                    <Radar name="Score" dataKey="value" stroke="#f97316" fill="#f97316" fillOpacity={0.6} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Average Wellness Scores</h3>
                  {wellnessAverage.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{item.metric}</span>
                        <Badge variant={parseFloat(item.value) >= 7 ? "default" : "secondary"}>
                          {item.value}/10
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all"
                          style={{ width: `${(parseFloat(item.value) / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-12">Not enough wellness data for overview</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}