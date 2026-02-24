import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Activity, TrendingUp, TrendingDown, MessageSquare, Target,
  Award, AlertTriangle, CheckCircle, Star, Zap, Clock, BarChart3,
  Heart, ChefHat, Clipboard, Flame, ThumbsUp, UserCheck, Loader2
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";
import { subDays, format, differenceInDays, differenceInWeeks } from "date-fns";

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#84cc16'];

const StatCard = ({ icon: Icon, label, value, sub, color = "orange", trend }) => {
  const colorMap = {
    orange: "from-orange-50 to-red-50 text-orange-600",
    blue: "from-blue-50 to-cyan-50 text-blue-600",
    green: "from-green-50 to-emerald-50 text-green-600",
    purple: "from-purple-50 to-pink-50 text-purple-600",
    yellow: "from-yellow-50 to-amber-50 text-yellow-600",
    teal: "from-teal-50 to-cyan-50 text-teal-600",
  };
  return (
    <Card className={`border-none shadow-lg bg-gradient-to-br ${colorMap[color]}`}>
      <CardContent className="p-3 md:p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-xl md:text-3xl font-bold text-gray-900">{value}</p>
            {sub && <p className="text-[9px] md:text-xs text-gray-500 mt-1">{sub}</p>}
          </div>
          <div className={`p-2 md:p-3 rounded-xl bg-white/60`}>
            <Icon className={`w-5 md:w-6 h-5 md:h-6 ${colorMap[color].split(' ')[2]}`} />
          </div>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}% vs last period
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function AdvancedCoachAnalytics() {
  const [period, setPeriod] = useState(30);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['allClients'],
    queryFn: async () => {
      const all = await base44.entities.Client.list('-created_date');
      if (user?.user_type === 'super_admin') return all;
      if (user?.user_type === 'student_coach') {
        return all.filter(c => {
          const coaches = Array.isArray(c.assigned_coach) ? c.assigned_coach : c.assigned_coach ? [c.assigned_coach] : [];
          return c.created_by === user?.email || coaches.includes(user?.email);
        });
      }
      return all.filter(c => c.created_by === user?.email);
    },
    enabled: !!user,
  });

  const { data: progressLogs = [] } = useQuery({
    queryKey: ['progressLogsAdv'],
    queryFn: () => base44.entities.ProgressLog.list('-date', 1000),
  });

  const { data: foodLogs = [] } = useQuery({
    queryKey: ['foodLogsAdv'],
    queryFn: () => base44.entities.FoodLog.list('-date', 1000),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messagesAdv'],
    queryFn: () => base44.entities.Message.list('-created_date', 500),
  });

  const { data: mealPlans = [] } = useQuery({
    queryKey: ['mealPlansAdv'],
    queryFn: () => base44.entities.MealPlan.list('-created_date', 200),
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointmentsAdv'],
    queryFn: () => base44.entities.Appointment.list('-appointment_date', 200),
  });

  const { data: progressGoals = [] } = useQuery({
    queryKey: ['progressGoalsAdv'],
    queryFn: () => base44.entities.ProgressGoal.list('-created_date'),
  });

  const { data: mpessLogs = [] } = useQuery({
    queryKey: ['mpessLogsAdv'],
    queryFn: () => base44.entities.MPESSTracker.list('-submission_date', 500),
  });

  const isLoading = clientsLoading;

  const analytics = useMemo(() => {
    const cutoff = subDays(new Date(), period);
    const prevCutoff = subDays(new Date(), period * 2);

    // ─── 1. CLIENT ENGAGEMENT ───────────────────────────────────────────
    const activeClientIds = new Set(
      [...progressLogs, ...foodLogs]
        .filter(l => l.date && new Date(l.date) >= cutoff)
        .map(l => l.client_id)
    );
    const prevActiveClientIds = new Set(
      [...progressLogs, ...foodLogs]
        .filter(l => l.date && new Date(l.date) >= prevCutoff && new Date(l.date) < cutoff)
        .map(l => l.client_id)
    );

    // Engagement score per client (0-100)
    const clientEngagement = clients.map(client => {
      const pLogs = progressLogs.filter(l => l.client_id === client.id && l.date && new Date(l.date) >= cutoff);
      const fLogs = foodLogs.filter(l => l.client_id === client.id && l.date && new Date(l.date) >= cutoff);
      const msgs = messages.filter(m => (m.client_id === client.id || m.sender_id === client.id) && m.created_date && new Date(m.created_date) >= cutoff);
      const mpess = mpessLogs.filter(l => l.client_id === client.id && l.submission_date && new Date(l.submission_date) >= cutoff);

      const logsScore = Math.min(pLogs.length * 10, 30);
      const foodScore = Math.min(fLogs.length * 5, 30);
      const msgScore = Math.min(msgs.length * 5, 20);
      const mpessScore = Math.min(mpess.length * 10, 20);
      const total = logsScore + foodScore + msgScore + mpessScore;

      return { client, score: total, pLogs: pLogs.length, fLogs: fLogs.length, msgs: msgs.length };
    });

    // Daily active users for trend
    const dailyActivity = [];
    for (let i = period - 1; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const ds = format(d, 'yyyy-MM-dd');
      const active = new Set([
        ...progressLogs.filter(l => l.date && format(new Date(l.date), 'yyyy-MM-dd') === ds).map(l => l.client_id),
        ...foodLogs.filter(l => l.date && format(new Date(l.date), 'yyyy-MM-dd') === ds).map(l => l.client_id),
      ]);
      dailyActivity.push({ date: format(d, 'MMM d'), activeUsers: active.size, logs: progressLogs.filter(l => l.date && format(new Date(l.date), 'yyyy-MM-dd') === ds).length + foodLogs.filter(l => l.date && format(new Date(l.date), 'yyyy-MM-dd') === ds).length });
    }

    // Streak leaders
    const streakData = clients.map(client => {
      const sortedLogs = [...progressLogs, ...foodLogs]
        .filter(l => l.client_id === client.id && l.date)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      let streak = 0;
      let today = new Date();
      today.setHours(0,0,0,0);
      for (let i = 0; i < 60; i++) {
        const d = format(subDays(today, i), 'yyyy-MM-dd');
        const hasLog = sortedLogs.some(l => format(new Date(l.date), 'yyyy-MM-dd') === d);
        if (hasLog) streak++;
        else break;
      }
      return { client, streak };
    }).sort((a, b) => b.streak - a.streak);

    // ─── 2. COMMON ISSUES / QUESTIONS ────────────────────────────────────
    // Symptom frequency
    const symptomFreq = {};
    progressLogs.filter(l => l.date && new Date(l.date) >= cutoff && l.symptoms?.length).forEach(l => {
      l.symptoms.forEach(s => { symptomFreq[s] = (symptomFreq[s] || 0) + 1; });
    });
    const topSymptoms = Object.entries(symptomFreq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));

    // Cravings
    const cravingsFreq = {};
    progressLogs.filter(l => l.date && new Date(l.date) >= cutoff && l.wellness_metrics?.cravings?.length).forEach(l => {
      l.wellness_metrics.cravings.forEach(c => { cravingsFreq[c] = (cravingsFreq[c] || 0) + 1; });
    });
    const topCravings = Object.entries(cravingsFreq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));

    // Mood distribution
    const moodDist = { very_poor: 0, poor: 0, neutral: 0, good: 0, excellent: 0 };
    progressLogs.filter(l => l.date && new Date(l.date) >= cutoff && l.wellness_metrics?.mood).forEach(l => {
      moodDist[l.wellness_metrics.mood] = (moodDist[l.wellness_metrics.mood] || 0) + 1;
    });
    const moodData = Object.entries(moodDist).map(([mood, count]) => ({ mood: mood.replace('_', ' '), count }));

    // Wellness weekly radar
    const wellnessLogs = progressLogs.filter(l => l.date && new Date(l.date) >= cutoff && l.wellness_metrics);
    const wellnessAvg = {
      energy: 0, sleep: 0, stress: 0, digestion: 0
    };
    let wellnessCount = 0;
    wellnessLogs.forEach(l => {
      const m = l.wellness_metrics;
      if (m.energy_level) wellnessAvg.energy += m.energy_level;
      if (m.sleep_quality) wellnessAvg.sleep += m.sleep_quality;
      if (m.stress_level) wellnessAvg.stress += m.stress_level;
      if (m.digestion_quality) wellnessAvg.digestion += m.digestion_quality;
      wellnessCount++;
    });
    const radarData = wellnessCount > 0 ? [
      { metric: 'Energy', value: +(wellnessAvg.energy / wellnessCount).toFixed(1) },
      { metric: 'Sleep', value: +(wellnessAvg.sleep / wellnessCount).toFixed(1) },
      { metric: 'Low Stress', value: +(10 - wellnessAvg.stress / wellnessCount).toFixed(1) },
      { metric: 'Digestion', value: +(wellnessAvg.digestion / wellnessCount).toFixed(1) },
    ] : [];

    // ─── 3. PLAN EFFECTIVENESS ───────────────────────────────────────────
    // Plan type success rates
    const planEffectiveness = {};
    mealPlans.forEach(plan => {
      const type = plan.food_preference || 'unknown';
      if (!planEffectiveness[type]) planEffectiveness[type] = { type, clients: 0, avgAdherence: 0, weightLoss: 0, totalWeight: 0 };
      planEffectiveness[type].clients++;

      const clientLogs = progressLogs.filter(l => l.client_id === plan.client_id && l.date && new Date(l.date) >= cutoff);
      const adherenceLogs = clientLogs.filter(l => l.meal_adherence != null);
      if (adherenceLogs.length > 0) {
        planEffectiveness[type].avgAdherence += adherenceLogs.reduce((s, l) => s + l.meal_adherence, 0) / adherenceLogs.length;
      }

      const weightLogs = progressLogs.filter(l => l.client_id === plan.client_id && l.weight && l.date).sort((a, b) => new Date(a.date) - new Date(b.date));
      if (weightLogs.length >= 2) {
        const change = weightLogs[weightLogs.length - 1].weight - weightLogs[0].weight;
        planEffectiveness[type].weightLoss += change;
        planEffectiveness[type].totalWeight++;
      }
    });
    const planEffData = Object.values(planEffectiveness).map(p => ({
      ...p,
      avgAdherence: p.clients > 0 ? +(p.avgAdherence / p.clients).toFixed(1) : 0,
      avgWeightChange: p.totalWeight > 0 ? +(p.weightLoss / p.totalWeight).toFixed(2) : 0,
    }));

    // Goal achievement by goal type
    const goalTypeSuccess = {};
    clients.forEach(c => {
      const g = c.goal || 'unknown';
      if (!goalTypeSuccess[g]) goalTypeSuccess[g] = { goal: g.replace(/_/g, ' '), total: 0, losing: 0, gaining: 0 };
      goalTypeSuccess[g].total++;
      const wLogs = progressLogs.filter(l => l.client_id === c.id && l.weight && l.date).sort((a, b) => new Date(a.date) - new Date(b.date));
      if (wLogs.length >= 2) {
        const delta = wLogs[wLogs.length - 1].weight - wLogs[0].weight;
        if (delta < 0) goalTypeSuccess[g].losing++;
        else goalTypeSuccess[g].gaining++;
      }
    });
    const goalSuccessData = Object.values(goalTypeSuccess).map(g => ({
      ...g,
      successRate: g.total > 0 ? +((g.losing / g.total) * 100).toFixed(1) : 0,
    }));

    // Calorie target adherence
    const calorieAdherence = clients.map(c => {
      if (!c.target_calories) return null;
      const fLogs2 = foodLogs.filter(l => l.client_id === c.id && l.date && new Date(l.date) >= cutoff && l.calories);
      if (fLogs2.length === 0) return null;
      const avg = fLogs2.reduce((s, l) => s + l.calories, 0) / fLogs2.length;
      const diff = ((avg - c.target_calories) / c.target_calories * 100).toFixed(1);
      return { name: c.full_name.split(' ')[0], target: c.target_calories, avg: +avg.toFixed(0), diff: +diff };
    }).filter(Boolean).slice(0, 10);

    // ─── 4. COACH PERFORMANCE ────────────────────────────────────────────
    const totalClients = clients.length;
    const activeClients = activeClientIds.size;
    const prevActive = prevActiveClientIds.size;
    const activeTrend = prevActive > 0 ? +(((activeClients - prevActive) / prevActive) * 100).toFixed(1) : 0;

    // Response time (coach messages vs client messages)
    const coachMsgs = messages.filter(m => m.sender_type === 'dietitian' && m.created_date && new Date(m.created_date) >= cutoff);
    const clientMsgsCount = messages.filter(m => m.sender_type === 'client' && m.created_date && new Date(m.created_date) >= cutoff).length;
    const responseRate = clientMsgsCount > 0 ? +((coachMsgs.length / clientMsgsCount) * 100).toFixed(1) : 0;

    // Appointment completion
    const completedAppts = appointments.filter(a => a.status === 'completed' && a.appointment_date && new Date(a.appointment_date) >= cutoff).length;
    const totalAppts = appointments.filter(a => a.appointment_date && new Date(a.appointment_date) >= cutoff).length;
    const apptCompletion = totalAppts > 0 ? +((completedAppts / totalAppts) * 100).toFixed(1) : 0;

    // Goal achievement rate
    const achievedGoals = progressGoals.filter(g => g.status === 'completed').length;
    const goalAchRate = progressGoals.length > 0 ? +((achievedGoals / progressGoals.length) * 100).toFixed(1) : 0;

    // Clients on track (adherence > 70)
    const adherenceMap = {};
    progressLogs.filter(l => l.date && new Date(l.date) >= cutoff && l.meal_adherence != null).forEach(l => {
      if (!adherenceMap[l.client_id]) adherenceMap[l.client_id] = [];
      adherenceMap[l.client_id].push(l.meal_adherence);
    });
    const onTrack = Object.values(adherenceMap).filter(arr => {
      const avg = arr.reduce((s, v) => s + v, 0) / arr.length;
      return avg >= 70;
    }).length;

    // Monthly new clients trend
    const monthlyClients = [];
    for (let i = 5; i >= 0; i--) {
      const start = subDays(new Date(), (i + 1) * 30);
      const end = subDays(new Date(), i * 30);
      const count = clients.filter(c => c.created_date && new Date(c.created_date) >= start && new Date(c.created_date) < end).length;
      monthlyClients.push({ month: format(end, 'MMM'), newClients: count });
    }

    // Avg feedback quality (from reviewed progress logs)
    const reviewedLogs = progressLogs.filter(l => l.reviewed && l.coach_feedback?.rating);
    const avgFeedbackRating = reviewedLogs.length > 0
      ? +(reviewedLogs.reduce((s, l) => s + l.coach_feedback.rating, 0) / reviewedLogs.length).toFixed(1) : 0;

    return {
      // Engagement
      totalClients, activeClients, activeTrend, dailyActivity, clientEngagement, streakData,
      engagementDistribution: [
        { range: 'Highly Active (80+)', count: clientEngagement.filter(c => c.score >= 80).length, color: '#10b981' },
        { range: 'Active (50-79)', count: clientEngagement.filter(c => c.score >= 50 && c.score < 80).length, color: '#f97316' },
        { range: 'Moderate (20-49)', count: clientEngagement.filter(c => c.score >= 20 && c.score < 50).length, color: '#f59e0b' },
        { range: 'Inactive (<20)', count: clientEngagement.filter(c => c.score < 20).length, color: '#ef4444' },
      ],
      // Issues
      topSymptoms, topCravings, moodData, radarData, wellnessCount,
      // Plans
      planEffData, goalSuccessData, calorieAdherence,
      // Coach
      responseRate, apptCompletion, completedAppts, totalAppts,
      goalAchRate, onTrack, monthlyClients, avgFeedbackRating,
      reviewedLogs: reviewedLogs.length,
      totalMessages: coachMsgs.length,
    };
  }, [clients, progressLogs, foodLogs, messages, mealPlans, appointments, progressGoals, mpessLogs, period]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 md:p-8 pb-24 md:pb-6 bg-gradient-to-br from-gray-50 to-orange-50">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4">
          <div>
            <h1 className="text-lg sm:text-2xl md:text-4xl font-bold text-gray-900">Advanced Coach Analytics</h1>
            <p className="text-xs sm:text-sm md:text-base text-gray-500 mt-1">Deep insights into engagement, outcomes, and your performance</p>
          </div>
          <div className="flex gap-2">
            {[7, 30, 90].map(p => (
              <Button key={p} size="sm" variant={period === p ? "default" : "outline"}
                onClick={() => setPeriod(p)}
                className={period === p ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}>
                {p}d
              </Button>
            ))}
          </div>
        </div>

        {/* Top KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          <StatCard icon={Users} label="Active Clients" value={analytics.activeClients} sub={`of ${analytics.totalClients} total`} color="blue" trend={analytics.activeTrend} />
          <StatCard icon={Flame} label="On Track" value={analytics.onTrack} sub="≥70% adherence" color="green" />
          <StatCard icon={MessageSquare} label="Coach Response Rate" value={`${analytics.responseRate}%`} sub={`${analytics.totalMessages} replies sent`} color="purple" />
          <StatCard icon={Award} label="Goal Achievement" value={`${analytics.goalAchRate}%`} sub={`${progressGoals.length} goals tracked`} color="yellow" />
        </div>

        <Tabs defaultValue="engagement" className="space-y-4 md:space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 bg-white shadow-sm w-full h-auto">
            <TabsTrigger value="engagement" className="flex items-center gap-1 text-[10px] sm:text-xs md:text-sm py-2">
              <Activity className="w-3.5 md:w-4 h-3.5 md:h-4" /> Engagement
            </TabsTrigger>
            <TabsTrigger value="issues" className="flex items-center gap-1 text-[10px] sm:text-xs md:text-sm py-2">
              <AlertTriangle className="w-3.5 md:w-4 h-3.5 md:h-4" /> Issues
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-1 text-[10px] sm:text-xs md:text-sm py-2">
              <ChefHat className="w-3.5 md:w-4 h-3.5 md:h-4" /> Plans
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-1 text-[10px] sm:text-xs md:text-sm py-2">
              <Star className="w-3.5 md:w-4 h-3.5 md:h-4" /> Performance
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: ENGAGEMENT ──────────────────────────────────── */}
          <TabsContent value="engagement" className="space-y-4 md:space-y-6">
            {/* Daily Active Users Trend */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-orange-500" /> Daily Client Activity</CardTitle>
                <CardDescription>Active users and total log entries per day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.dailyActivity}>
                    <defs>
                      <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="logsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="activeUsers" stroke="#f97316" fill="url(#activeGrad)" name="Active Clients" strokeWidth={2} />
                    <Area type="monotone" dataKey="logs" stroke="#3b82f6" fill="url(#logsGrad)" name="Total Logs" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
              {/* Engagement Distribution */}
              <Card className="border-none shadow-lg">
                <CardHeader className="pb-2 md:pb-4">
                  <CardTitle className="text-sm md:text-base flex items-center gap-1.5 md:gap-2"><BarChart3 className="w-4 md:w-5 h-4 md:h-5 text-blue-500" /> Engagement Segments</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Clients grouped by activity level (score 0-100)</CardDescription>
                </CardHeader>
                <CardContent className="p-3 md:p-6">
                  <div className="space-y-3 mb-4">
                    {analytics.engagementDistribution.map(seg => (
                      <div key={seg.range} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: seg.color }} />
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700">{seg.range}</span>
                            <span className="font-bold">{seg.count}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="h-2 rounded-full" style={{ width: `${analytics.totalClients > 0 ? (seg.count / analytics.totalClients * 100) : 0}%`, background: seg.color }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Streak Leaderboard */}
              <Card className="border-none shadow-lg">
                <CardHeader className="pb-2 md:pb-4">
                  <CardTitle className="text-sm md:text-base flex items-center gap-1.5 md:gap-2"><Flame className="w-4 md:w-5 h-4 md:h-5 text-orange-500" /> Top Streak Leaders</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Consecutive days with at least one log</CardDescription>
                </CardHeader>
                <CardContent className="p-3 md:p-6">
                  <div className="space-y-2">
                    {analytics.streakData.filter(s => s.streak > 0).slice(0, 8).map((s, i) => (
                      <div key={s.client.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-orange-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{i + 1}</span>
                          <span className="text-sm font-medium text-gray-800">{s.client.full_name}</span>
                        </div>
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200">{s.streak} 🔥</Badge>
                      </div>
                    ))}
                    {analytics.streakData.filter(s => s.streak > 0).length === 0 && (
                      <p className="text-center text-gray-500 py-6">No streak data available yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Engaged Clients */}
            <Card className="border-none shadow-lg">
              <CardHeader className="pb-2 md:pb-4">
                <CardTitle className="text-sm md:text-base flex items-center gap-1.5 md:gap-2"><UserCheck className="w-4 md:w-5 h-4 md:h-5 text-green-500" /> Client Engagement Scores</CardTitle>
                <CardDescription className="text-xs md:text-sm">Composite score based on logs, messages, and wellness submissions</CardDescription>
              </CardHeader>
              <CardContent className="p-3 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {analytics.clientEngagement.sort((a, b) => b.score - a.score).slice(0, 12).map(c => (
                    <div key={c.client.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-orange-200 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {c.client.full_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{c.client.full_name}</p>
                        <div className="flex gap-2 text-xs text-gray-500 mt-0.5">
                          <span>📊 {c.pLogs} logs</span>
                          <span>🥗 {c.fLogs} food</span>
                          <span>💬 {c.msgs} msgs</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className={`text-lg font-bold ${c.score >= 80 ? 'text-green-600' : c.score >= 50 ? 'text-orange-500' : c.score >= 20 ? 'text-yellow-500' : 'text-red-500'}`}>{c.score}</div>
                        <div className="text-xs text-gray-400">/ 100</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 2: COMMON ISSUES ───────────────────────────────── */}
          <TabsContent value="issues" className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
              {/* Top Symptoms */}
              <Card className="border-none shadow-lg">
                <CardHeader className="pb-2 md:pb-4">
                  <CardTitle className="text-sm md:text-base flex items-center gap-1.5 md:gap-2"><AlertTriangle className="w-4 md:w-5 h-4 md:h-5 text-red-500" /> Most Reported Symptoms</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Frequency of symptoms logged by clients</CardDescription>
                </CardHeader>
                <CardContent className="p-3 md:p-6">
                  {analytics.topSymptoms.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={analytics.topSymptoms} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" name="Reports" radius={[0, 4, 4, 0]}>
                          {analytics.topSymptoms.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-60 flex items-center justify-center text-gray-400 text-sm">No symptom data in this period</div>
                  )}
                </CardContent>
              </Card>

              {/* Mood Distribution */}
              <Card className="border-none shadow-lg">
                <CardHeader className="pb-2 md:pb-4">
                  <CardTitle className="text-sm md:text-base flex items-center gap-1.5 md:gap-2"><Heart className="w-4 md:w-5 h-4 md:h-5 text-pink-500" /> Mood Distribution</CardTitle>
                  <CardDescription className="text-xs md:text-sm">How clients are feeling overall</CardDescription>
                </CardHeader>
                <CardContent className="p-3 md:p-6">
                  {analytics.moodData.some(m => m.count > 0) ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={analytics.moodData.filter(m => m.count > 0)} dataKey="count" nameKey="mood" cx="50%" cy="50%" outerRadius={100} label={({ mood, count }) => `${mood}: ${count}`}>
                          {analytics.moodData.map((_, i) => <Cell key={i} fill={['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'][i]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-60 flex items-center justify-center text-gray-400 text-sm">No mood data in this period</div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
              {/* Top Cravings */}
              <Card className="border-none shadow-lg">
                <CardHeader className="pb-2 md:pb-4">
                  <CardTitle className="text-sm md:text-base flex items-center gap-1.5 md:gap-2"><Zap className="w-4 md:w-5 h-4 md:h-5 text-yellow-500" /> Most Common Cravings</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Cravings reported by clients — useful for plan adjustments</CardDescription>
                </CardHeader>
                <CardContent className="p-3 md:p-6">
                  {analytics.topCravings.length > 0 ? (
                    <div className="space-y-2">
                      {analytics.topCravings.map((c, i) => (
                        <div key={c.name} className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-gray-700 capitalize">{c.name}</span>
                              <span className="text-gray-500">{c.count}x</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div className="h-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500"
                                style={{ width: `${(c.count / analytics.topCravings[0].count) * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-gray-400 text-sm">No craving data available</div>
                  )}
                </CardContent>
              </Card>

              {/* Wellness Radar */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-teal-500" /> Avg Wellness Profile</CardTitle>
                  <CardDescription>Based on {analytics.wellnessCount} submissions in this period</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.radarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <RadarChart data={analytics.radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                        <Radar name="Avg Score" dataKey="value" stroke="#f97316" fill="#f97316" fillOpacity={0.3} />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-60 flex items-center justify-center text-gray-400 text-sm">No wellness data in this period</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── TAB 3: PLAN EFFECTIVENESS ──────────────────────────── */}
          <TabsContent value="plans" className="space-y-6">
            {/* Plan Type Effectiveness */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ChefHat className="w-5 h-5 text-orange-500" /> Meal Plan Type Performance</CardTitle>
                <CardDescription>Adherence and avg weight change by diet preference</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.planEffData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={analytics.planEffData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11 }} label={{ value: 'Adherence %', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} label={{ value: 'Weight Δ kg', angle: 90, position: 'insideRight', fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="avgAdherence" name="Avg Adherence %" fill="#f97316" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="avgWeightChange" name="Avg Weight Change (kg)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-60 flex items-center justify-center text-gray-400">No plan data available</div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Goal Success Rate by Type */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-purple-500" /> Outcome by Client Goal</CardTitle>
                  <CardDescription>% of clients achieving weight goal by goal type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.goalSuccessData.map(g => (
                      <div key={g.goal} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-gray-700 capitalize">{g.goal}</span>
                          <span className="text-gray-500">{g.losing}/{g.total} on track ({g.successRate}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3">
                          <div className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: `${g.successRate}%` }} />
                        </div>
                      </div>
                    ))}
                    {analytics.goalSuccessData.length === 0 && (
                      <div className="py-8 text-center text-gray-400 text-sm">No client goal data available</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Calorie Adherence */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Clipboard className="w-5 h-5 text-green-500" /> Calorie Target Adherence</CardTitle>
                  <CardDescription>Avg daily calories vs target per client</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.calorieAdherence.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={analytics.calorieAdherence} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v, name) => [name === 'target' ? `${v} kcal` : `${v} kcal`, name === 'target' ? 'Target' : 'Avg Actual']} />
                        <Legend />
                        <Bar dataKey="target" name="Target" fill="#e5e7eb" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="avg" name="Avg Actual" fill="#10b981" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No calorie data available</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── TAB 4: COACH PERFORMANCE ───────────────────────────── */}
          <TabsContent value="performance" className="space-y-6">
            {/* Coach KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={ThumbsUp} label="Appointment Completion" value={`${analytics.apptCompletion}%`} sub={`${analytics.completedAppts}/${analytics.totalAppts} completed`} color="green" />
              <StatCard icon={MessageSquare} label="Msg Response Rate" value={`${analytics.responseRate}%`} sub="replies vs client msgs" color="blue" />
              <StatCard icon={Star} label="Avg Feedback Rating" value={analytics.avgFeedbackRating > 0 ? `${analytics.avgFeedbackRating}/5` : 'N/A'} sub={`${analytics.reviewedLogs} reviewed logs`} color="yellow" />
              <StatCard icon={CheckCircle} label="Goal Achievement" value={`${analytics.goalAchRate}%`} sub={`${progressGoals.filter(g => g.status === 'completed').length} completed`} color="purple" />
            </div>

            {/* New Clients Trend */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-500" /> New Client Acquisition (Last 6 Months)</CardTitle>
                <CardDescription>Monthly growth in client base</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={analytics.monthlyClients}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="newClients" name="New Clients" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Client Status Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-blue-500" /> Client Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const statusGroups = { active: 0, inactive: 0, completed: 0, on_hold: 0 };
                    clients.forEach(c => { statusGroups[c.status || 'active'] = (statusGroups[c.status || 'active'] || 0) + 1; });
                    const statusData = Object.entries(statusGroups).map(([s, c]) => ({ status: s.replace('_', ' '), count: c })).filter(d => d.count > 0);
                    const statusColors = { active: '#10b981', inactive: '#ef4444', completed: '#3b82f6', 'on hold': '#f59e0b' };
                    return (
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie data={statusData} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90} label={({ status, count }) => `${status}: ${count}`}>
                            {statusData.map((d, i) => <Cell key={i} fill={statusColors[d.status] || COLORS[i]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Coach Performance Summary */}
              <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Star className="w-5 h-5 text-orange-500" /> Coach Performance Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: 'Client Activation Rate', value: analytics.totalClients > 0 ? +((analytics.activeClients / analytics.totalClients) * 100).toFixed(1) : 0, max: 100, color: '#f97316', suffix: '%' },
                    { label: 'Clients On Track', value: Object.values({}).length > 0 ? analytics.onTrack : analytics.onTrack, max: analytics.totalClients || 1, display: `${analytics.onTrack}/${analytics.totalClients}`, color: '#10b981', suffix: '' },
                    { label: 'Appointment Completion', value: analytics.apptCompletion, max: 100, color: '#3b82f6', suffix: '%' },
                    { label: 'Goal Achievement', value: analytics.goalAchRate, max: 100, color: '#8b5cf6', suffix: '%' },
                    { label: 'Message Response Rate', value: Math.min(analytics.responseRate, 100), max: 100, color: '#ec4899', suffix: '%' },
                  ].map(item => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700 font-medium">{item.label}</span>
                        <span className="font-bold">{item.display || `${item.value}${item.suffix}`}</span>
                      </div>
                      <div className="w-full bg-white rounded-full h-3 shadow-inner">
                        <div className="h-3 rounded-full transition-all" style={{ width: `${Math.min((item.value / item.max) * 100, 100)}%`, background: item.color }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}