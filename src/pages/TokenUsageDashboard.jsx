import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Zap,
  TrendingUp,
  BarChart3,
  Download,
  Shield,
  Loader2,
  Calendar,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfDay, subDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const USD_TO_INR = 84;

export default function TokenUsageDashboard() {
  const queryClient = useQueryClient();
  const [dateFilter, setDateFilter] = useState("month");
  const [coachFilter, setCoachFilter] = useState("all");
  const [functionFilter, setFunctionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedCoach, setExpandedCoach] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["tokenUsageLogs", dateFilter, coachFilter, functionFilter, statusFilter],
    queryFn: async () => {
      const allLogs = await base44.entities.TokenUsageLog.list('-created_at', 1000);
      
      // Filter by date
      let filtered = allLogs;
      const now = new Date();
      const istNow = new Date(now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
      
      if (dateFilter === 'today') {
        const todayStr = istNow.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
        filtered = filtered.filter(log => log.date === todayStr);
      } else if (dateFilter === 'week') {
        const weekAgo = subDays(istNow, 7);
        filtered = filtered.filter(log => {
          const logDate = new Date(log.date);
          return logDate >= weekAgo && logDate <= istNow;
        });
      } else if (dateFilter === 'month') {
        const monthStr = istNow.toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          month: 'short',
          year: 'numeric',
        });
        filtered = filtered.filter(log => log.month_year === monthStr);
      }

      // Filter by coach
      if (coachFilter !== 'all') {
        filtered = filtered.filter(log => log.triggered_by === coachFilter);
      }

      // Filter by function
      if (functionFilter !== 'all') {
        filtered = filtered.filter(log => log.function_name === functionFilter);
      }

      // Filter by status
      if (statusFilter !== 'all') {
        filtered = filtered.filter(log => log.status === statusFilter);
      }

      return filtered;
    },
    enabled: currentUser?.user_type === 'super_admin',
    staleTime: 60000,
    refetchInterval: 60000,
  });

  // Calculate metrics — must be unconditional (before any early return)
  const metrics = useMemo(() => {
    const successLogs = logs.filter(log => log.status === 'success');
    const totalTokens = logs.reduce((sum, log) => sum + (log.total_tokens || 0), 0);
    const totalCostInr = logs.reduce((sum, log) => sum + (log.total_cost_inr || 0), 0);
    const totalCalls = logs.length;
    const successRate = totalCalls > 0 ? ((successLogs.length / totalCalls) * 100).toFixed(1) : 0;
    const avgTokensPerCall = totalCalls > 0 ? Math.round(totalTokens / totalCalls) : 0;

    // Daily data for chart
    const dailyMap = {};
    logs.forEach(log => {
      if (!dailyMap[log.date]) dailyMap[log.date] = 0;
      dailyMap[log.date] += log.total_tokens || 0;
    });
    const dailyData = Object.entries(dailyMap).map(([date, tokens]) => ({
      date: date.substring(5),
      tokens,
    }));

    // By function
    const functionMap = {};
    logs.forEach(log => {
      if (!functionMap[log.function_name]) {
        functionMap[log.function_name] = { calls: 0, tokens: 0, cost: 0 };
      }
      functionMap[log.function_name].calls += 1;
      functionMap[log.function_name].tokens += log.total_tokens || 0;
      functionMap[log.function_name].cost += log.total_cost_inr || 0;
    });
    const byFunction = Object.entries(functionMap).map(([name, data]) => ({
      name,
      ...data,
      avgTokens: Math.round(data.tokens / data.calls),
    })).sort((a, b) => b.tokens - a.tokens);

    // By coach
    const coachMap = {};
    logs.forEach(log => {
      if (!coachMap[log.triggered_by]) {
        coachMap[log.triggered_by] = {
          coach_name: log.coach_name,
          calls: 0,
          tokens: 0,
          cost: 0,
        };
      }
      coachMap[log.triggered_by].calls += 1;
      coachMap[log.triggered_by].tokens += log.total_tokens || 0;
      coachMap[log.triggered_by].cost += log.total_cost_inr || 0;
    });
    const byCoach = Object.entries(coachMap).map(([email, data]) => ({
      email,
      ...data,
    })).sort((a, b) => b.tokens - a.tokens);

    return {
      totalTokens,
      totalCostInr,
      totalCalls,
      successRate,
      avgTokensPerCall,
      dailyData: dailyData.slice(-30),
      byFunction,
      byCoach,
    };
  }, [logs]);

  if (currentUser && currentUser.user_type !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Access Restricted</h2>
          <p className="text-gray-500 mt-1">Only Platform Owners can view token usage.</p>
        </div>
      </div>
    );
  }

  const handleExportCsv = () => {
    const headers = [
      'Date',
      'Time IST',
      'Coach Email',
      'Client Name',
      'Function',
      'Model',
      'Input Tokens',
      'Output Tokens',
      'Total Tokens',
      'Cost USD',
      'Cost INR',
      'Status',
      'Duration ms',
    ];

    const rows = logs.map(log => [
      log.date,
      log.created_at,
      log.triggered_by,
      log.client_name || '',
      log.function_name,
      log.model_used,
      log.input_tokens,
      log.output_tokens,
      log.total_tokens,
      log.total_cost_usd?.toFixed(8) || 0,
      log.total_cost_inr?.toFixed(3) || 0,
      log.status,
      log.duration_ms || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const monthStr = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      year: 'numeric',
    }).replace(' ', '');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `healthyfy_token_usage_${monthStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-7 h-7 text-yellow-500" />
            Token Usage & AI Costs
          </h1>
          <p className="text-sm text-gray-500 mt-1">Track every AI call, token, and cost</p>
        </div>
        <Button onClick={handleExportCsv} className="gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Tokens', value: metrics.totalTokens.toLocaleString('en-IN'), icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Total Cost', value: `₹${metrics.totalCostInr.toFixed(2)}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Total Calls', value: metrics.totalCalls, icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Avg per Call', value: `${metrics.avgTokensPerCall} tokens`, icon: Zap, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Success Rate', value: `${metrics.successRate}%`, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Daily Avg', value: `${Math.round(metrics.totalTokens / Math.max(metrics.dailyData.length, 1))}`, icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map(stat => (
          <Card key={stat.label} className="border shadow-sm">
            <CardContent className="p-4 flex flex-col gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className="text-lg font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>

        <Select value={coachFilter} onValueChange={setCoachFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Coaches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Coaches</SelectItem>
            {metrics.byCoach.map(coach => (
              <SelectItem key={coach.email} value={coach.email}>
                {coach.coach_name || coach.email.split('@')[0]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={functionFilter} onValueChange={setFunctionFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Functions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Functions</SelectItem>
            {metrics.byFunction.map(fn => (
              <SelectItem key={fn.name} value={fn.name}>
                {fn.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>

        {(dateFilter !== 'month' || coachFilter !== 'all' || functionFilter !== 'all' || statusFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDateFilter('month');
              setCoachFilter('all');
              setFunctionFilter('all');
              setStatusFilter('all');
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Daily Chart */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Daily Token Usage (Last 30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={value => value.toLocaleString('en-IN')} />
              <Bar dataKey="tokens" fill="#eab308" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Usage by Function */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Usage by Function</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold">Function</th>
                  <th className="text-right px-4 py-3 font-semibold">Calls</th>
                  <th className="text-right px-4 py-3 font-semibold">Tokens</th>
                  <th className="text-right px-4 py-3 font-semibold">Cost (₹)</th>
                  <th className="text-right px-4 py-3 font-semibold">Avg</th>
                </tr>
              </thead>
              <tbody>
                {metrics.byFunction.map(fn => (
                  <tr key={fn.name} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{fn.name}</td>
                    <td className="text-right px-4 py-3">{fn.calls}</td>
                    <td className="text-right px-4 py-3">{fn.tokens.toLocaleString('en-IN')}</td>
                    <td className="text-right px-4 py-3">₹{fn.cost.toFixed(2)}</td>
                    <td className="text-right px-4 py-3 text-gray-600">{fn.avgTokens}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Usage by Coach */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Usage by Coach</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {metrics.byCoach.map(coach => (
              <div key={coach.email} className="border rounded-lg">
                <button
                  onClick={() => setExpandedCoach(expandedCoach === coach.email ? null : coach.email)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">{coach.coach_name || coach.email}</p>
                    <p className="text-xs text-gray-500">{coach.email}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-bold text-gray-900">{coach.tokens.toLocaleString('en-IN')} tokens</p>
                    <p className="text-sm text-green-600">₹{coach.cost.toFixed(2)}</p>
                  </div>
                </button>

                {expandedCoach === coach.email && (
                  <div className="border-t bg-gray-50 px-4 py-3">
                    <p className="text-xs text-gray-600 mb-2">Calls by function:</p>
                    <div className="space-y-1">
                      {logs
                        .filter(log => log.triggered_by === coach.email)
                        .reduce((acc, log) => {
                          const existing = acc.find(x => x.fn === log.function_name);
                          if (existing) existing.count += 1;
                          else acc.push({ fn: log.function_name, count: 1 });
                          return acc;
                        }, [])
                        .map(item => (
                          <p key={item.fn} className="text-xs text-gray-700">
                            {item.fn}: {item.count} call{item.count > 1 ? 's' : ''}
                          </p>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Calls */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Recent Calls (Last 50)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-3 py-2 font-semibold">Time</th>
                  <th className="text-left px-3 py-2 font-semibold">Coach</th>
                  <th className="text-left px-3 py-2 font-semibold">Client</th>
                  <th className="text-left px-3 py-2 font-semibold">Function</th>
                  <th className="text-right px-3 py-2 font-semibold">Tokens</th>
                  <th className="text-right px-3 py-2 font-semibold">Cost</th>
                  <th className="text-center px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 50).map((log, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">{log.created_at.split(',')[1]?.trim()}</td>
                    <td className="px-3 py-2 text-gray-600">{log.triggered_by.split('@')[0]}</td>
                    <td className="px-3 py-2">{log.client_name || '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{log.function_name.substring(0, 20)}</td>
                    <td className="text-right px-3 py-2">{log.total_tokens || 0}</td>
                    <td className="text-right px-3 py-2">₹{log.total_cost_inr?.toFixed(2) || 0}</td>
                    <td className="text-center px-3 py-2">
                      {log.status === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-green-600 mx-auto" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}