import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

export default function WellnessCharts({ progressLogs, mpessLogs = [] }) {
  const chartData = progressLogs
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(log => ({
      date: format(new Date(log.date), 'MMM d'),
      mood: log.wellness_metrics?.mood ? 
        ({ very_poor: 1, poor: 2, neutral: 3, good: 4, excellent: 5 }[log.wellness_metrics.mood] || null) : null,
      energy: log.wellness_metrics?.energy_level || null,
      sleep: log.wellness_metrics?.sleep_quality || null,
      stress: log.wellness_metrics?.stress_level || null,
      water: log.wellness_metrics?.water_intake || null,
      exercise: log.wellness_metrics?.exercise_minutes || null,
      sleepHours: log.wellness_metrics?.sleep_hours || null,
    }));

  const mpessChartData = mpessLogs
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(log => ({
      date: format(new Date(log.date), 'MMM d'),
      mindScore: log.mind_practices ? Object.values(log.mind_practices).filter(v => v === true).length : 0,
      physicalScore: log.physical_practices ? Object.values(log.physical_practices).filter(v => v === true).length : 0,
      emotionalScore: log.emotional_practices ? Object.values(log.emotional_practices).filter(v => v === true).length : 0,
      socialScore: log.social_practices ? Object.values(log.social_practices).filter(v => v === true).length : 0,
      spiritualScore: log.spiritual_practices ? Object.values(log.spiritual_practices).filter(v => v === true).length : 0,
      overallRating: log.overall_rating || null,
    }));

  const moodColors = { 1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#84cc16', 5: '#22c55e' };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Energy & Sleep Quality */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Energy & Sleep Quality Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="energy" 
                stroke="#f97316" 
                strokeWidth={2}
                name="Energy Level"
                connectNulls
              />
              <Line 
                type="monotone" 
                dataKey="sleep" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Sleep Quality"
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Stress Levels */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Stress Levels Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="stress" fill="#ef4444" name="Stress Level" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Sleep Hours */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Sleep Duration</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 12]} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="sleepHours" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                name="Hours of Sleep"
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Water & Exercise */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Hydration & Exercise</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" orientation="left" label={{ value: 'Liters', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" label={{ value: 'Minutes', angle: 90, position: 'insideRight' }} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="water" fill="#06b6d4" name="Water (L)" />
              <Bar yAxisId="right" dataKey="exercise" fill="#22c55e" name="Exercise (min)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* MPESS Tracker */}
      {mpessChartData.length > 0 && (
        <>
          <Card className="border-none shadow-lg lg:col-span-2">
            <CardHeader>
              <CardTitle>MPESS Wellness Practices</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mpessChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="mindScore" fill="#8b5cf6" name="Mind" stackId="a" />
                  <Bar dataKey="physicalScore" fill="#06b6d4" name="Physical" stackId="a" />
                  <Bar dataKey="emotionalScore" fill="#f97316" name="Emotional" stackId="a" />
                  <Bar dataKey="socialScore" fill="#22c55e" name="Social" stackId="a" />
                  <Bar dataKey="spiritualScore" fill="#ec4899" name="Spiritual" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg lg:col-span-2">
            <CardHeader>
              <CardTitle>Overall MPESS Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={mpessChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="overallRating" 
                    stroke="#a855f7" 
                    strokeWidth={3}
                    name="Overall Rating"
                    connectNulls
                    dot={{ fill: '#a855f7', r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}