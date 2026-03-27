import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users, TrendingUp, Star, DollarSign, Award, BarChart3,
  Search, ArrowUpDown, ArrowUp, ArrowDown, CreditCard, Loader2, Target
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const REVENUE_COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899'];

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-gray-400 inline ml-1" />;
  return sortDir === 'asc'
    ? <ArrowUp className="w-3 h-3 text-orange-600 inline ml-1" />
    : <ArrowDown className="w-3 h-3 text-orange-600 inline ml-1" />;
}

function RatingStars({ value }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${s <= rounded ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`}
        />
      ))}
      <span className="ml-1 text-xs font-semibold text-gray-700">{value > 0 ? value.toFixed(1) : '—'}</span>
    </div>
  );
}

function MetricCard({ label, value, sub, icon: Icon, color }) {
  return (
    <Card className="border-none shadow-md">
      <CardContent className="p-5 flex items-start gap-4">
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CoachPerformanceAnalytics() {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('monthlyRevenue');
  const [sortDir, setSortDir] = useState('desc');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: coaches = [], isLoading: loadingCoaches } = useQuery({
    queryKey: ['allCoaches'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.user_type === 'student_coach');
    },
    enabled: !!user && user?.user_type === 'super_admin',
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['allClients'],
    queryFn: () => base44.entities.Client.list(),
    enabled: !!user && user?.user_type === 'super_admin',
  });

  // Coach-level subscriptions (platform fees they pay)
  const { data: coachSubscriptions = [] } = useQuery({
    queryKey: ['allCoachSubscriptions'],
    queryFn: () => base44.entities.HealthCoachSubscription.list(),
    enabled: !!user && user?.user_type === 'super_admin',
  });

  // Client-level subscriptions (revenue coaches generate from clients)
  const { data: clientSubscriptions = [] } = useQuery({
    queryKey: ['allClientSubscriptions'],
    queryFn: () => base44.entities.ClientSubscription.list(),
    enabled: !!user && user?.user_type === 'super_admin',
  });

  const { data: feedback = [] } = useQuery({
    queryKey: ['clientFeedback'],
    queryFn: () => base44.entities.ClientFeedback.list(),
    enabled: !!user && user?.user_type === 'super_admin',
  });

  // ── Build per-coach metrics ────────────────────────────────────────────────
  const coachMetrics = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    return coaches.map(coach => {
      // Clients assigned to this coach
      const coachClients = clients.filter(c =>
        c.assigned_coach && c.assigned_coach.includes(coach.email)
      );
      const activeClientCount = coachClients.filter(c => c.status === 'active').length;
      const totalClientCount = coachClients.length;
      const retentionRate = totalClientCount > 0 ? (activeClientCount / totalClientCount) * 100 : 0;

      // Active client subscriptions for this coach's clients
      const coachClientIds = new Set(coachClients.map(c => c.id));
      const activeClientSubs = clientSubscriptions.filter(s =>
        coachClientIds.has(s.client_id) && s.status === 'active'
      );
      const activeSubCount = activeClientSubs.length;

      // Monthly revenue = sum of active client subscription amounts
      const monthlyRevenue = activeClientSubs.reduce((sum, s) => sum + (s.amount || 0), 0);

      // Avg client satisfaction from feedback
      const coachFeedback = feedback.filter(f => f.coach_email === coach.email);
      const avgSatisfaction = coachFeedback.length > 0
        ? coachFeedback.reduce((sum, f) => sum + (f.overall_rating || 0), 0) / coachFeedback.length
        : 0;
      const feedbackCount = coachFeedback.length;

      // Coach's own platform subscription status
      const platSub = coachSubscriptions.find(s => s.coach_email === coach.email && s.status === 'active');
      const planName = platSub?.plan_name || null;

      return {
        id: coach.id,
        name: coach.full_name || coach.email.split('@')[0],
        email: coach.email,
        activeClientCount,
        totalClientCount,
        retentionRate,
        activeSubCount,
        monthlyRevenue,
        avgSatisfaction,
        feedbackCount,
        planName,
      };
    });
  }, [coaches, clients, clientSubscriptions, feedback, coachSubscriptions]);

  // ── Platform-level summary ─────────────────────────────────────────────────
  const totalRevenue = useMemo(() => coachMetrics.reduce((s, c) => s + c.monthlyRevenue, 0), [coachMetrics]);
  const totalActiveSubs = useMemo(() => coachMetrics.reduce((s, c) => s + c.activeSubCount, 0), [coachMetrics]);
  const avgSatisfactionAll = useMemo(() => {
    const rated = coachMetrics.filter(c => c.avgSatisfaction > 0);
    return rated.length > 0 ? rated.reduce((s, c) => s + c.avgSatisfaction, 0) / rated.length : 0;
  }, [coachMetrics]);
  const totalActiveClients = useMemo(() => coachMetrics.reduce((s, c) => s + c.activeClientCount, 0), [coachMetrics]);

  // ── Sorting & filtering ────────────────────────────────────────────────────
  const sortedMetrics = useMemo(() => {
    const filtered = coachMetrics.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
    );
    return [...filtered].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      return (a[sortField] - b[sortField]) * dir;
    });
  }, [coachMetrics, search, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  // ── Chart data ─────────────────────────────────────────────────────────────
  const revenueChartData = useMemo(() =>
    [...coachMetrics]
      .sort((a, b) => b.monthlyRevenue - a.monthlyRevenue)
      .slice(0, 10)
      .map(c => ({ name: c.name.split(' ')[0], revenue: c.monthlyRevenue, subs: c.activeSubCount })),
    [coachMetrics]);

  const satisfactionChartData = useMemo(() =>
    [...coachMetrics]
      .filter(c => c.avgSatisfaction > 0)
      .sort((a, b) => b.avgSatisfaction - a.avgSatisfaction)
      .slice(0, 10)
      .map(c => ({ name: c.name.split(' ')[0], rating: parseFloat(c.avgSatisfaction.toFixed(2)) })),
    [coachMetrics]);

  const planDistribution = useMemo(() => {
    const map = {};
    coachMetrics.forEach(c => {
      const key = c.planName || 'No Plan';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [coachMetrics]);

  const top3 = useMemo(() =>
    [...coachMetrics].sort((a, b) => b.monthlyRevenue - a.monthlyRevenue).slice(0, 3),
    [coachMetrics]);

  if (user?.user_type !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="max-w-md w-full text-center p-8">
          <BarChart3 className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 font-medium">Super admin access required</p>
        </Card>
      </div>
    );
  }

  if (loadingCoaches) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const COLS = [
    { key: 'name', label: 'Coach', sortable: false },
    { key: 'activeClientCount', label: 'Active Clients', sortable: true },
    { key: 'activeSubCount', label: 'Active Subscriptions', sortable: true },
    { key: 'monthlyRevenue', label: 'Monthly Revenue', sortable: true },
    { key: 'avgSatisfaction', label: 'Avg Satisfaction', sortable: true },
    { key: 'retentionRate', label: 'Retention', sortable: true },
    { key: 'feedbackCount', label: 'Reviews', sortable: true },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 p-2.5 rounded-xl shadow">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              Coach Performance Dashboard
            </h1>
            <p className="text-gray-500 text-sm mt-1">Monitor revenue, subscriptions & satisfaction across all coaches</p>
          </div>
          <Badge className="bg-orange-100 text-orange-800 text-xs self-start md:self-center">
            {coaches.length} Coaches
          </Badge>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Total Monthly Revenue"
            value={`₹${totalRevenue.toLocaleString('en-IN')}`}
            sub="From active client subscriptions"
            icon={DollarSign}
            color="bg-gradient-to-br from-green-500 to-emerald-600"
          />
          <MetricCard
            label="Active Client Subscriptions"
            value={totalActiveSubs}
            sub="Paying clients across all coaches"
            icon={CreditCard}
            color="bg-gradient-to-br from-blue-500 to-cyan-600"
          />
          <MetricCard
            label="Avg Client Satisfaction"
            value={avgSatisfactionAll > 0 ? `${avgSatisfactionAll.toFixed(1)} / 5` : '—'}
            sub={`${feedback.length} reviews submitted`}
            icon={Star}
            color="bg-gradient-to-br from-amber-400 to-orange-500"
          />
          <MetricCard
            label="Total Active Clients"
            value={totalActiveClients}
            sub={`Across ${coaches.length} coaches`}
            icon={Users}
            color="bg-gradient-to-br from-purple-500 to-indigo-600"
          />
        </div>

        {/* Top 3 Revenue Generators */}
        {top3.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {top3.map((c, i) => (
              <Card key={c.id} className={`border-2 ${i === 0 ? 'border-amber-400' : i === 1 ? 'border-gray-300' : 'border-orange-300'}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${
                    i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-300 text-gray-700' : 'bg-orange-300 text-orange-900'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 truncate">{c.email}</p>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      <Badge className="bg-green-100 text-green-800 text-xs">₹{c.monthlyRevenue.toLocaleString('en-IN')}/mo</Badge>
                      <Badge className="bg-blue-100 text-blue-800 text-xs">{c.activeSubCount} subs</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <RatingStars value={c.avgSatisfaction} />
                    <p className="text-xs text-gray-400 mt-1">{c.feedbackCount} reviews</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue per Coach */}
          <Card className="border-none shadow-md lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                Monthly Revenue by Coach (Top 10)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {revenueChartData.length === 0 || revenueChartData.every(d => d.revenue === 0) ? (
                <div className="h-56 flex items-center justify-center text-gray-400 text-sm">No revenue data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={revenueChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" style={{ fontSize: '11px' }} stroke="#6b7280" />
                    <YAxis style={{ fontSize: '11px' }} stroke="#6b7280" tickFormatter={v => `₹${v}`} />
                    <Tooltip formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Plan Distribution */}
          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-600" />
                Coach Plan Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={planDistribution} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({ name, value }) => `${value}`}>
                    {planDistribution.map((_, i) => (
                      <Cell key={i} fill={REVENUE_COLORS[i % REVENUE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {planDistribution.map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: REVENUE_COLORS[i % REVENUE_COLORS.length] }} />
                      <span className="text-gray-700 truncate max-w-[120px]">{p.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900">{p.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Satisfaction chart */}
        {satisfactionChartData.length > 0 && (
          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                Avg Client Satisfaction by Coach (Top 10)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={satisfactionChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" style={{ fontSize: '11px' }} stroke="#6b7280" />
                  <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} style={{ fontSize: '11px' }} stroke="#6b7280" />
                  <Tooltip formatter={(v) => [v.toFixed(2), 'Avg Rating']} />
                  <Bar dataKey="rating" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Detailed Table */}
        <Card className="border-none shadow-md">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-orange-600" />
                Full Coach Leaderboard
              </CardTitle>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input
                  placeholder="Search coach..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-y border-gray-200">
                  <tr>
                    {COLS.map(col => (
                      <th
                        key={col.key}
                        className={`px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap ${col.sortable ? 'cursor-pointer hover:text-orange-600 select-none' : ''}`}
                        onClick={() => col.sortable && handleSort(col.key)}
                      >
                        {col.label}
                        {col.sortable && <SortIcon field={col.key} sortField={sortField} sortDir={sortDir} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedMetrics.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-gray-400">No coaches found</td>
                    </tr>
                  )}
                  {sortedMetrics.map((c, idx) => (
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-orange-50/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 leading-none">{c.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{c.email}</p>
                            {c.planName && <Badge className="bg-purple-100 text-purple-700 text-xs mt-0.5 py-0">{c.planName}</Badge>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-blue-100 text-blue-800">{c.activeClientCount}</Badge>
                        <span className="text-xs text-gray-400 ml-1">/ {c.totalClientCount}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${c.activeSubCount > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {c.activeSubCount}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${c.monthlyRevenue > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                          ₹{c.monthlyRevenue.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <RatingStars value={c.avgSatisfaction} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${
                          c.retentionRate >= 80 ? 'bg-green-100 text-green-800' :
                          c.retentionRate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                          c.totalClientCount === 0 ? 'bg-gray-100 text-gray-500' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {c.totalClientCount > 0 ? `${c.retentionRate.toFixed(0)}%` : '—'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-center">{c.feedbackCount}</td>
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