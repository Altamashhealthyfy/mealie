import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Flame, Target, TrendingUp, AlertCircle } from "lucide-react";

export default function MacroAdherenceDashboard({ foodLogs, mealPlan, clientProfile }) {
  // Calculate last 7 days intake
  const last7Days = React.useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    
    return foodLogs.filter(log => new Date(log.date) >= cutoffDate);
  }, [foodLogs]);

  // Calculate daily averages
  const dailyAverages = React.useMemo(() => {
    if (last7Days.length === 0) return null;

    const totals = last7Days.reduce((acc, log) => ({
      calories: acc.calories + (log.calories || 0),
      protein: acc.protein + (log.protein || 0),
      carbs: acc.carbs + (log.carbs || 0),
      fats: acc.fats + (log.fats || 0),
      count: acc.count + 1
    }), { calories: 0, protein: 0, carbs: 0, fats: 0, count: 0 });

    return {
      calories: Math.round(totals.calories / totals.count),
      protein: Math.round(totals.protein / totals.count),
      carbs: Math.round(totals.carbs / totals.count),
      fats: Math.round(totals.fats / totals.count)
    };
  }, [last7Days]);

  // Get targets from meal plan or client profile
  const targets = React.useMemo(() => ({
    calories: mealPlan?.target_calories || clientProfile?.target_calories || 2000,
    protein: mealPlan?.target_protein || clientProfile?.target_protein || 150,
    carbs: mealPlan?.target_carbs || clientProfile?.target_carbs || 250,
    fats: mealPlan?.target_fats || clientProfile?.target_fats || 50
  }), [mealPlan, clientProfile]);

  // Calculate adherence percentages
  const adherence = React.useMemo(() => {
    if (!dailyAverages) return null;

    return {
      calories: Math.min(100, Math.round((dailyAverages.calories / targets.calories) * 100)),
      protein: Math.min(100, Math.round((dailyAverages.protein / targets.protein) * 100)),
      carbs: Math.min(100, Math.round((dailyAverages.carbs / targets.carbs) * 100)),
      fats: Math.min(100, Math.round((dailyAverages.fats / targets.fats) * 100))
    };
  }, [dailyAverages, targets]);

  // Pie chart data for macros
  const macroDistribution = React.useMemo(() => {
    if (!dailyAverages) return [];

    return [
      { name: 'Protein', value: dailyAverages.protein * 4, color: '#ef4444' },
      { name: 'Carbs', value: dailyAverages.carbs * 4, color: '#f59e0b' },
      { name: 'Fats', value: dailyAverages.fats * 9, color: '#8b5cf6' }
    ];
  }, [dailyAverages]);

  // Daily trend data
  const dailyTrends = React.useMemo(() => {
    const dailyGroups = {};
    
    last7Days.forEach(log => {
      const date = format(new Date(log.date), 'MMM dd');
      if (!dailyGroups[date]) {
        dailyGroups[date] = { calories: 0, protein: 0, carbs: 0, fats: 0 };
      }
      dailyGroups[date].calories += log.calories || 0;
      dailyGroups[date].protein += log.protein || 0;
      dailyGroups[date].carbs += log.carbs || 0;
      dailyGroups[date].fats += log.fats || 0;
    });

    return Object.entries(dailyGroups).map(([date, values]) => ({
      date,
      ...values,
      targetCalories: targets.calories
    }));
  }, [last7Days, targets]);

  if (!dailyAverages) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-12 text-center">
          <Flame className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600">No food logs yet. Start tracking your meals!</p>
        </CardContent>
      </Card>
    );
  }

  const overallAdherence = Math.round(
    (adherence.calories + adherence.protein + adherence.carbs + adherence.fats) / 4
  );

  return (
    <div className="space-y-6">
      {/* Overall Adherence Score */}
      <Card className="border-none shadow-xl bg-gradient-to-r from-orange-500 to-red-500 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 mb-1">Overall Nutrition Adherence</p>
              <p className="text-5xl font-bold">{overallAdherence}%</p>
              <p className="text-sm text-white/90 mt-2">Last 7 days average</p>
            </div>
            <Target className="w-16 h-16 text-white/30" />
          </div>
        </CardContent>
      </Card>

      {/* Macro Targets vs Actual */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <Flame className="w-8 h-8 text-orange-500" />
              <Badge className={adherence.calories >= 90 && adherence.calories <= 110 ? 'bg-green-500' : 'bg-yellow-500'}>
                {adherence.calories}%
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-1">Calories</p>
            <p className="text-2xl font-bold text-gray-900">{dailyAverages.calories}</p>
            <p className="text-xs text-gray-500">Target: {targets.calories} kcal</p>
            <Progress value={adherence.calories} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">P</div>
              <Badge className={adherence.protein >= 90 && adherence.protein <= 110 ? 'bg-green-500' : 'bg-yellow-500'}>
                {adherence.protein}%
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-1">Protein</p>
            <p className="text-2xl font-bold text-gray-900">{dailyAverages.protein}g</p>
            <p className="text-xs text-gray-500">Target: {targets.protein}g</p>
            <Progress value={adherence.protein} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-yellow-50 to-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">C</div>
              <Badge className={adherence.carbs >= 90 && adherence.carbs <= 110 ? 'bg-green-500' : 'bg-yellow-500'}>
                {adherence.carbs}%
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-1">Carbs</p>
            <p className="text-2xl font-bold text-gray-900">{dailyAverages.carbs}g</p>
            <p className="text-xs text-gray-500">Target: {targets.carbs}g</p>
            <Progress value={adherence.carbs} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">F</div>
              <Badge className={adherence.fats >= 90 && adherence.fats <= 110 ? 'bg-green-500' : 'bg-yellow-500'}>
                {adherence.fats}%
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-1">Fats</p>
            <p className="text-2xl font-bold text-gray-900">{dailyAverages.fats}g</p>
            <p className="text-xs text-gray-500">Target: {targets.fats}g</p>
            <Progress value={adherence.fats} className="mt-3 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Macro Distribution Pie */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Macro Distribution (Calories)</CardTitle>
            <CardDescription>Average breakdown of your macros</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={macroDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {macroDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Calorie Trend */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Daily Calorie Intake</CardTitle>
            <CardDescription>Last 7 days vs your target</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="calories" fill="#f97316" name="Actual Calories" />
                <Bar dataKey="targetCalories" fill="#10b981" name="Target Calories" opacity={0.5} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {overallAdherence < 80 && (
        <Card className="border-2 border-yellow-300 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-900 mb-1">Nutrition Adherence Alert</p>
                <p className="text-sm text-yellow-800">
                  Your nutrition adherence is below 80%. Try to stick closer to your meal plan for better results. 
                  Consider discussing challenges with your coach!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}