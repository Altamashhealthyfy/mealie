import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingDown, TrendingUp, Calendar, CheckCircle, Target, Activity, Heart, Scale, Flame, Award, AlertCircle } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ClientDashboard() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['clientProfile', user?.email],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ email: user?.email });
      return clients[0] || null;
    },
    enabled: !!user,
  });

  const { data: progressLogs } = useQuery({
    queryKey: ['progressLogs', clientProfile?.id],
    queryFn: () => base44.entities.ProgressLog.filter({ client_id: clientProfile?.id }),
    enabled: !!clientProfile?.id,
    initialData: [],
  });

  const { data: foodLogs } = useQuery({
    queryKey: ['foodLogs', clientProfile?.id],
    queryFn: () => base44.entities.FoodLog.filter({ client_id: clientProfile?.id }),
    enabled: !!clientProfile?.id,
    initialData: [],
  });

  const { data: mealPlan } = useQuery({
    queryKey: ['activeMealPlan', clientProfile?.id],
    queryFn: async () => {
      const plans = await base44.entities.MealPlan.filter({ 
        client_id: clientProfile?.id,
        active: true 
      });
      return plans[0] || null;
    },
    enabled: !!clientProfile?.id,
  });

  const { data: goals } = useQuery({
    queryKey: ['goals', clientProfile?.id],
    queryFn: () => base44.entities.ProgressGoal.filter({ client_id: clientProfile?.id }),
    enabled: !!clientProfile?.id,
    initialData: [],
  });

  const { data: mpessLogs } = useQuery({
    queryKey: ['mpessLogs', user?.email],
    queryFn: () => base44.entities.MPESSTracker.filter({ created_by: user?.email }),
    enabled: !!user,
    initialData: [],
  });

  // Calculate statistics - AFTER all hooks, BEFORE early return
  const sortedProgressLogs = React.useMemo(() => 
    [...(progressLogs || [])].sort((a, b) => new Date(a.date) - new Date(b.date)),
    [progressLogs]
  );
  
  const latestProgress = React.useMemo(() => 
    sortedProgressLogs[sortedProgressLogs.length - 1],
    [sortedProgressLogs]
  );
  
  const initialWeight = clientProfile?.initial_weight || sortedProgressLogs[0]?.weight;
  const currentWeight = latestProgress?.weight || clientProfile?.weight;
  const targetWeight = clientProfile?.target_weight;
  const weightLost = initialWeight && currentWeight ? initialWeight - currentWeight : 0;
  const weightToGo = currentWeight && targetWeight ? currentWeight - targetWeight : 0;
  const progressPercentage = initialWeight && targetWeight && currentWeight 
    ? Math.round(((initialWeight - currentWeight) / (initialWeight - targetWeight)) * 100)
    : 0;

  const last7Days = React.useMemo(() => 
    (foodLogs || []).filter(log => {
      const daysDiff = differenceInDays(new Date(), new Date(log.date));
      return daysDiff <= 7;
    }).length,
    [foodLogs]
  );
  
  const adherencePercentage = Math.round((last7Days / (7 * 6)) * 100);

  const weightChartData = React.useMemo(() => 
    sortedProgressLogs
      .filter(log => log.weight)
      .map(log => ({
        date: format(new Date(log.date), 'MMM dd'),
        weight: log.weight,
        target: targetWeight
      })),
    [sortedProgressLogs, targetWeight]
  );

  const wellnessChartData = React.useMemo(() => 
    sortedProgressLogs
      .filter(log => log.wellness_metrics?.energy_level)
      .slice(-14)
      .map(log => ({
        date: format(new Date(log.date), 'MMM dd'),
        energy: log.wellness_metrics?.energy_level || 0,
        sleep: log.wellness_metrics?.sleep_quality || 0,
        stress: 10 - (log.wellness_metrics?.stress_level || 5)
      })),
    [sortedProgressLogs]
  );

  const mpessAdherence = React.useMemo(() => 
    (mpessLogs || []).slice(-7).map(log => {
      const total = [
        log.mind_practices?.affirmations_completed,
        log.physical_practices?.movement_done,
        log.emotional_practices?.journaling_done,
        log.social_practices?.bonding_activity_done,
        log.spiritual_practices?.meditation_done
      ].filter(Boolean).length;
      return {
        date: format(new Date(log.date), 'MMM dd'),
        completed: total
      };
    }),
    [mpessLogs]
  );

  const activeGoals = React.useMemo(() => 
    (goals || []).filter(g => g.status === 'active'),
    [goals]
  );

  if (!user || !clientProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen p-4 md:p-8 space-y-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Welcome back, {clientProfile.full_name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-600">Here's your health journey progress</p>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Current Weight</p>
                  <p className="text-3xl font-bold text-gray-900">{currentWeight || '--'}</p>
                  <p className="text-xs text-gray-500">kg</p>
                </div>
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                  <Scale className="w-6 h-6 text-white" />
                </div>
              </div>
              {weightLost !== 0 && (
                <div className="mt-3 flex items-center gap-1">
                  {weightLost > 0 ? (
                    <TrendingDown className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  )}
                  <span className={`text-sm font-semibold ${weightLost > 0 ? 'text-green-600' : 'text-blue-600'}`}>
                    {Math.abs(weightLost).toFixed(1)} kg {weightLost > 0 ? 'lost' : 'gained'}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Goal Progress</p>
                  <p className="text-3xl font-bold text-gray-900">{Math.max(0, progressPercentage)}%</p>
                  <p className="text-xs text-gray-500">{Math.abs(weightToGo).toFixed(1)} kg to go</p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all" 
                    style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Meal Adherence</p>
                  <p className="text-3xl font-bold text-gray-900">{adherencePercentage}%</p>
                  <p className="text-xs text-gray-500">Last 7 days</p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <Flame className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-3">
                <Badge className={adherencePercentage >= 70 ? 'bg-green-500' : 'bg-yellow-500'}>
                  {adherencePercentage >= 70 ? '✅ Great!' : '⚠️ Keep going!'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Goals</p>
                  <p className="text-3xl font-bold text-gray-900">{activeGoals.length}</p>
                  <p className="text-xs text-gray-500">In progress</p>
                </div>
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                  <Award className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alert for no meal plan */}
        {!mealPlan && (
          <Alert className="mb-6 bg-yellow-50 border-yellow-500">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <AlertDescription className="text-yellow-900">
              <strong>No active meal plan assigned yet.</strong> Contact your dietitian to get your personalized meal plan.
            </AlertDescription>
          </Alert>
        )}

        {/* Weight Trend Chart */}
        <Card className="border-none shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-orange-500" />
              Weight Progress Over Time
            </CardTitle>
            <CardDescription>Track your weight changes and stay on target</CardDescription>
          </CardHeader>
          <CardContent>
            {weightChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weightChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="weight" stroke="#f97316" strokeWidth={3} name="Current Weight" />
                  <Line type="monotone" dataKey="target" stroke="#10b981" strokeDasharray="5 5" name="Target Weight" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Scale className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No weight data logged yet. Start tracking your progress!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Wellness & MPESS Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Wellness Metrics */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                Wellness Trends
              </CardTitle>
              <CardDescription>Energy, sleep quality, and stress levels</CardDescription>
            </CardHeader>
            <CardContent>
              {wellnessChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={wellnessChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="energy" stackId="1" stroke="#f59e0b" fill="#fbbf24" name="Energy" />
                    <Area type="monotone" dataKey="sleep" stackId="1" stroke="#3b82f6" fill="#60a5fa" name="Sleep" />
                    <Area type="monotone" dataKey="stress" stackId="1" stroke="#10b981" fill="#34d399" name="Calm" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No wellness data yet. Log your daily wellness metrics!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* MPESS Adherence */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                MPESS Wellness (Last 7 Days)
              </CardTitle>
              <CardDescription>Mind, Physical, Emotional, Social, Spiritual practices</CardDescription>
            </CardHeader>
            <CardContent>
              {mpessAdherence.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={mpessAdherence}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed" fill="#8b5cf6" name="Practices Completed" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Start tracking your MPESS wellness practices!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Active Goals */}
        {activeGoals.length > 0 && (
          <Card className="border-none shadow-lg mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-500" />
                Your Active Goals
              </CardTitle>
              <CardDescription>Track your progress towards your health goals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeGoals.map((goal) => {
                  const progress = goal.start_value && goal.target_value 
                    ? Math.round(((goal.current_value - goal.start_value) / (goal.target_value - goal.start_value)) * 100)
                    : 0;
                  
                  return (
                    <div key={goal.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">{goal.title}</h4>
                          <p className="text-sm text-gray-600">{goal.description}</p>
                        </div>
                        <Badge className="bg-purple-500">
                          {goal.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-700 mb-2">
                        <span>Current: {goal.current_value} {goal.unit}</span>
                        <span>Target: {goal.target_value} {goal.unit}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full transition-all" 
                          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {progress}% complete • Target date: {goal.target_date ? format(new Date(goal.target_date), 'MMM dd, yyyy') : 'Not set'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity Summary */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                    <Scale className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Weight Logs</p>
                    <p className="text-sm text-gray-600">{progressLogs.length} entries</p>
                  </div>
                </div>
                {latestProgress && (
                  <Badge className="bg-orange-500">
                    Latest: {format(new Date(latestProgress.date), 'MMM dd')}
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <Flame className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Food Logs</p>
                    <p className="text-sm text-gray-600">{foodLogs.length} meals logged</p>
                  </div>
                </div>
                {foodLogs.length > 0 && (
                  <Badge className="bg-blue-500">
                    Last 7 days: {last7Days} meals
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                    <Heart className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">MPESS Tracking</p>
                    <p className="text-sm text-gray-600">{mpessLogs.length} days tracked</p>
                  </div>
                </div>
                {mpessLogs.length > 0 && (
                  <Badge className="bg-purple-500">
                    Latest: {format(new Date(mpessLogs[mpessLogs.length - 1]?.date), 'MMM dd')}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}