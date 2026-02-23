import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Target, Calendar } from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";

export default function GoalPredictions({ goals, progressLogs, clientProfile }) {
  const calculatePrediction = (goal) => {
    if (!goal.target_date || !goal.start_value || !goal.current_value) return null;

    // Get last 14 days of progress
    const last14 = progressLogs.filter(log => {
      const logDate = new Date(log.date);
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      return logDate >= twoWeeksAgo;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    if (last14.length < 2) return null;

    // Get goal-specific metric progression
    let progressionData = [];
    if (goal.metric === 'weight') {
      progressionData = last14.map(log => ({ date: log.date, value: log.weight })).filter(d => d.value);
    } else if (goal.metric === 'energy') {
      progressionData = last14.map(log => ({ date: log.date, value: log.wellness_metrics?.energy_level })).filter(d => d.value);
    }

    if (progressionData.length < 2) return null;

    // Calculate daily rate of change
    const firstValue = parseFloat(progressionData[0].value);
    const lastValue = parseFloat(progressionData[progressionData.length - 1].value);
    const daysDiff = progressionData.length - 1;
    const dailyRate = (lastValue - firstValue) / daysDiff;

    // Project to target date
    const daysUntilTarget = differenceInDays(new Date(goal.target_date), new Date());
    const projectedValue = lastValue + (dailyRate * daysUntilTarget);
    const willAchieve = goal.metric === 'weight' 
      ? projectedValue <= goal.target_value 
      : projectedValue >= goal.target_value;

    return {
      projectedValue: projectedValue.toFixed(1),
      willAchieve,
      daysUntilTarget,
      progress: Math.round(((goal.current_value - goal.start_value) / (goal.target_value - goal.start_value)) * 100)
    };
  };

  const activeGoals = goals.filter(g => g.status === 'active');

  if (activeGoals.length === 0) {
    return (
      <Card className="border-none shadow-lg mb-6 bg-gray-50">
        <CardContent className="p-6 text-center text-gray-500">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No active goals set. Create goals to see predictions.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-indigo-50 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Target className="w-6 h-6 text-purple-600" />
          Goal Achievement Predictions
        </CardTitle>
        <CardDescription>Based on your recent progress patterns</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeGoals.map((goal) => {
            const prediction = calculatePrediction(goal);
            
            return (
              <div key={goal.id} className="p-4 bg-white rounded-lg border-2 border-purple-200">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">{goal.title}</h4>
                  {prediction && (
                    <Badge className={prediction.willAchieve ? "bg-green-500" : "bg-orange-500"}>
                      {prediction.willAchieve ? "On Track ✓" : "Challenge"}
                    </Badge>
                  )}
                </div>

                {prediction ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-2 bg-gray-50 rounded">
                        <p className="text-xs text-gray-600 mb-1">Current</p>
                        <p className="text-lg font-bold text-gray-900">
                          {goal.current_value} {goal.unit}
                        </p>
                      </div>
                      <div className="p-2 bg-purple-50 rounded">
                        <p className="text-xs text-gray-600 mb-1">Target</p>
                        <p className="text-lg font-bold text-purple-600">
                          {goal.target_value} {goal.unit}
                        </p>
                      </div>
                    </div>

                    <div className="p-2 bg-indigo-50 rounded border-l-4 border-indigo-500">
                      <p className="text-xs text-gray-600 mb-1">Projected by {format(new Date(goal.target_date), 'MMM dd')}</p>
                      <p className="text-lg font-bold text-indigo-900">
                        {prediction.projectedValue} {goal.unit}
                      </p>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, prediction.progress))}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>{prediction.progress}% progress</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {prediction.daysUntilTarget} days left
                      </span>
                    </div>

                    {!prediction.willAchieve && (
                      <div className="p-2 bg-orange-50 border border-orange-200 rounded flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-orange-800">
                          At current pace, you may fall short. Consider accelerating your efforts.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-4">
                    Not enough data yet. Keep logging to see predictions.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}