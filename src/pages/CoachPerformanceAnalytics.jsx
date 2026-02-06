import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  TrendingUp, 
  Star, 
  Sparkles, 
  Award,
  Activity,
  BarChart3,
  Target,
  Heart
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

export default function CoachPerformanceAnalytics() {
  const [selectedCoach, setSelectedCoach] = useState('all');
  const [timeRange, setTimeRange] = useState('30');

  // Fetch current user
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch all coaches
  const { data: coaches } = useQuery({
    queryKey: ['allCoaches'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.user_type === 'student_coach');
    },
  });

  // Fetch all clients
  const { data: clients } = useQuery({
    queryKey: ['allClients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: [],
  });

  // Fetch subscriptions
  const { data: subscriptions } = useQuery({
    queryKey: ['coachSubscriptions'],
    queryFn: () => base44.entities.HealthCoachSubscription.list(),
    initialData: [],
  });

  // Fetch feedback
  const { data: feedback } = useQuery({
    queryKey: ['clientFeedback'],
    queryFn: () => base44.entities.ClientFeedback.list(),
    initialData: [],
  });

  // Calculate metrics for each coach
  const calculateCoachMetrics = (coachEmail) => {
    const coachClients = clients.filter(c => 
      c.assigned_coach && c.assigned_coach.includes(coachEmail)
    );
    
    const activeClients = coachClients.filter(c => c.status === 'active').length;
    const totalClients = coachClients.length;
    
    const coachFeedback = feedback.filter(f => f.coach_email === coachEmail);
    const avgSatisfaction = coachFeedback.length > 0
      ? coachFeedback.reduce((sum, f) => sum + (f.overall_rating || 0), 0) / coachFeedback.length
      : 0;
    
    const coachSub = subscriptions.find(s => s.coach_email === coachEmail && s.status === 'active');
    const aiCreditsUsed = coachSub?.ai_credits_used_this_month || 0;
    
    const retentionRate = totalClients > 0 ? (activeClients / totalClients) * 100 : 0;
    
    const completedClients = coachClients.filter(c => c.status === 'completed').length;
    
    return {
      coachEmail,
      activeClients,
      totalClients,
      retentionRate,
      avgSatisfaction,
      aiCreditsUsed,
      completedClients,
      feedbackCount: coachFeedback.length,
    };
  };

  // Get filtered coaches
  const filteredCoaches = selectedCoach === 'all' 
    ? coaches || []
    : coaches?.filter(c => c.email === selectedCoach) || [];

  const coachMetrics = filteredCoaches.map(coach => {
    const metrics = calculateCoachMetrics(coach.email);
    return {
      ...coach,
      ...metrics,
    };
  });

  // Aggregate metrics
  const totalActiveClients = coachMetrics.reduce((sum, c) => sum + c.activeClients, 0);
  const totalClients = coachMetrics.reduce((sum, c) => sum + c.totalClients, 0);
  const avgRetention = coachMetrics.length > 0
    ? coachMetrics.reduce((sum, c) => sum + c.retentionRate, 0) / coachMetrics.length
    : 0;
  const avgSatisfaction = coachMetrics.length > 0
    ? coachMetrics.reduce((sum, c) => sum + c.avgSatisfaction, 0) / coachMetrics.length
    : 0;
  const totalAICredits = coachMetrics.reduce((sum, c) => sum + c.aiCreditsUsed, 0);

  // Prepare chart data
  const coachComparisonData = coachMetrics.slice(0, 10).map(c => ({
    name: c.full_name?.split(' ')[0] || c.email.split('@')[0],
    clients: c.activeClients,
    satisfaction: c.avgSatisfaction,
    retention: c.retentionRate,
  }));

  const satisfactionDistribution = [
    { name: '5 Stars', value: feedback.filter(f => f.overall_rating === 5).length, color: '#22c55e' },
    { name: '4 Stars', value: feedback.filter(f => f.overall_rating === 4).length, color: '#84cc16' },
    { name: '3 Stars', value: feedback.filter(f => f.overall_rating === 3).length, color: '#eab308' },
    { name: '2 Stars', value: feedback.filter(f => f.overall_rating === 2).length, color: '#f97316' },
    { name: '1 Star', value: feedback.filter(f => f.overall_rating === 1).length, color: '#ef4444' },
  ];

  const performanceRadarData = selectedCoach !== 'all' && coachMetrics.length === 1
    ? [
        { metric: 'Active Clients', value: Math.min(coachMetrics[0].activeClients * 10, 100) },
        { metric: 'Retention', value: coachMetrics[0].retentionRate },
        { metric: 'Satisfaction', value: coachMetrics[0].avgSatisfaction * 20 },
        { metric: 'Feedback Count', value: Math.min(coachMetrics[0].feedbackCount * 10, 100) },
        { metric: 'AI Usage', value: Math.min(coachMetrics[0].aiCreditsUsed / 5, 100) },
      ]
    : [];

  const topPerformers = [...coachMetrics]
    .sort((a, b) => b.avgSatisfaction - a.avgSatisfaction)
    .slice(0, 5);

  if (user?.user_type !== 'super_admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Only super admins can access this page</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent flex items-center gap-3">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 p-3 rounded-2xl shadow-lg">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              Coach Performance Analytics
            </h1>
            <p className="text-gray-600 text-lg mt-2">Track and analyze coach performance metrics</p>
          </div>
          <div className="flex gap-3">
            <Select value={selectedCoach} onValueChange={setSelectedCoach}>
              <SelectTrigger className="w-48 h-11">
                <SelectValue placeholder="All Coaches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Coaches</SelectItem>
                {coaches?.map(coach => (
                  <SelectItem key={coach.id} value={coach.email}>
                    {coach.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-blue-700">Active Clients</CardTitle>
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-900">{totalActiveClients}</p>
              <p className="text-xs text-blue-600 mt-1">of {totalClients} total</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-green-700">Retention Rate</CardTitle>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-900">{avgRetention.toFixed(1)}%</p>
              <p className="text-xs text-green-600 mt-1">Average across coaches</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-amber-50 to-orange-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-amber-700">Satisfaction</CardTitle>
                <Star className="w-5 h-5 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-1">
                <p className="text-3xl font-bold text-amber-900">{avgSatisfaction.toFixed(1)}</p>
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              </div>
              <p className="text-xs text-amber-600 mt-1">Out of 5.0</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-indigo-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-purple-700">AI Credits Used</CardTitle>
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-900">{totalAICredits}</p>
              <p className="text-xs text-purple-600 mt-1">This month</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-pink-50 to-rose-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-pink-700">Feedback Count</CardTitle>
                <Heart className="w-5 h-5 text-pink-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-pink-900">{feedback.length}</p>
              <p className="text-xs text-pink-600 mt-1">Total responses</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coach Comparison */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-orange-600" />
                Coach Comparison - Active Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={coachComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="clients" fill="#f97316" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Satisfaction Distribution */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-orange-600" />
                Client Satisfaction Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={satisfactionDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                  >
                    {satisfactionDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Retention & Satisfaction Trend */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                Retention vs Satisfaction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={coachComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="retention" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    name="Retention %"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="satisfaction" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    name="Satisfaction (x20)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Performance Radar (Single Coach) */}
          {selectedCoach !== 'all' && performanceRadarData.length > 0 ? (
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange-600" />
                  Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={performanceRadarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="metric" style={{ fontSize: '12px' }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} style={{ fontSize: '10px' }} />
                    <Radar name="Performance" dataKey="value" stroke="#f97316" fill="#f97316" fillOpacity={0.5} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-orange-600" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topPerformers.map((coach, idx) => (
                    <div key={coach.id} className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                        idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                        idx === 1 ? 'bg-gray-300 text-gray-700' :
                        idx === 2 ? 'bg-orange-400 text-orange-900' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{coach.full_name}</p>
                        <p className="text-xs text-gray-600">{coach.activeClients} active clients</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span className="font-bold text-gray-900">{coach.avgSatisfaction.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Detailed Coach Metrics Table */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-600" />
              Detailed Coach Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Coach</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Active Clients</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Total Clients</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Retention</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Satisfaction</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">AI Credits</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {coachMetrics.map(coach => (
                    <tr key={coach.id} className="border-b border-gray-100 hover:bg-orange-50/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold text-gray-900">{coach.full_name}</p>
                          <p className="text-xs text-gray-500">{coach.email}</p>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <Badge className="bg-blue-100 text-blue-800">{coach.activeClients}</Badge>
                      </td>
                      <td className="text-center py-3 px-4 text-gray-600">{coach.totalClients}</td>
                      <td className="text-center py-3 px-4">
                        <Badge className={`${
                          coach.retentionRate >= 80 ? 'bg-green-100 text-green-800' :
                          coach.retentionRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {coach.retentionRate.toFixed(0)}%
                        </Badge>
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          <span className="font-semibold">{coach.avgSatisfaction.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <Badge className="bg-purple-100 text-purple-800">
                          <Sparkles className="w-3 h-3 mr-1" />
                          {coach.aiCreditsUsed}
                        </Badge>
                      </td>
                      <td className="text-center py-3 px-4 text-gray-600">{coach.feedbackCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}