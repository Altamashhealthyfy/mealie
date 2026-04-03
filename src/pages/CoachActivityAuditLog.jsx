import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Shield,
  Search,
  UserPlus,
  KeyRound,
  Crown,
  Sparkles,
  CalendarPlus,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Trash2,
  User,
  Filter,
  Download,
  RefreshCw,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format, formatDistanceToNow, subDays, isAfter } from 'date-fns';

const ACTION_CONFIG = {
  account_created: {
    label: 'Account Created',
    icon: UserPlus,
    color: 'bg-green-100 text-green-800 border-green-200',
    dot: 'bg-green-500',
  },
  password_changed: {
    label: 'Password Changed',
    icon: KeyRound,
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    dot: 'bg-indigo-500',
  },
  plan_assigned: {
    label: 'Plan Assigned',
    icon: Crown,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    dot: 'bg-purple-500',
  },
  plan_upgraded: {
    label: 'Plan Upgraded',
    icon: TrendingUp,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    dot: 'bg-blue-500',
  },
  plan_downgraded: {
    label: 'Plan Downgraded',
    icon: TrendingDown,
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    dot: 'bg-orange-500',
  },
  plan_extended: {
    label: 'Plan Extended',
    icon: CalendarPlus,
    color: 'bg-teal-100 text-teal-800 border-teal-200',
    dot: 'bg-teal-500',
  },
  credits_added: {
    label: 'Credits Added',
    icon: Sparkles,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    dot: 'bg-yellow-500',
  },
  access_enabled: {
    label: 'Access Enabled',
    icon: Eye,
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  access_disabled: {
    label: 'Access Disabled',
    icon: EyeOff,
    color: 'bg-red-100 text-red-800 border-red-200',
    dot: 'bg-red-500',
  },
  account_deleted: {
    label: 'Account Deleted',
    icon: Trash2,
    color: 'bg-red-100 text-red-900 border-red-300',
    dot: 'bg-red-700',
  },
  profile_updated: {
    label: 'Profile Updated',
    icon: User,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    dot: 'bg-gray-500',
  },
};

const PAGE_SIZE = 20;

export default function CoachActivityAuditLog() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [page, setPage] = useState(1);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['coachAuditLog'],
    queryFn: () => base44.entities.CoachSubscriptionHistory.list('-created_date', 500),
    enabled: !!user && user?.user_type === 'super_admin',
    staleTime: 30 * 1000,
  });

  const filtered = useMemo(() => {
    const now = new Date();
    return logs.filter((log) => {
      const matchSearch =
        !search ||
        log.coach_name?.toLowerCase().includes(search.toLowerCase()) ||
        log.coach_email?.toLowerCase().includes(search.toLowerCase()) ||
        log.performed_by?.toLowerCase().includes(search.toLowerCase());

      const matchAction = actionFilter === 'all' || log.action_type === actionFilter;

      let matchDate = true;
      if (dateFilter === 'today') matchDate = isAfter(new Date(log.created_date), subDays(now, 1));
      else if (dateFilter === '7d') matchDate = isAfter(new Date(log.created_date), subDays(now, 7));
      else if (dateFilter === '30d') matchDate = isAfter(new Date(log.created_date), subDays(now, 30));

      return matchSearch && matchAction && matchDate;
    });
  }, [logs, search, actionFilter, dateFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Stats
  const stats = useMemo(() => {
    const today = subDays(new Date(), 1);
    const todayLogs = logs.filter((l) => isAfter(new Date(l.created_date), today));
    return {
      total: logs.length,
      today: todayLogs.length,
      passwordChanges: logs.filter((l) => l.action_type === 'password_changed').length,
      accountCreations: logs.filter((l) => l.action_type === 'account_created').length,
      planActions: logs.filter((l) => ['plan_assigned', 'plan_upgraded', 'plan_downgraded', 'plan_extended'].includes(l.action_type)).length,
    };
  }, [logs]);

  const exportCSV = () => {
    const headers = ['Date', 'Coach Name', 'Coach Email', 'Action', 'Performed By', 'Old Value', 'New Value', 'Notes'];
    const rows = filtered.map((l) => [
      format(new Date(l.created_date), 'yyyy-MM-dd HH:mm'),
      l.coach_name || '',
      l.coach_email || '',
      ACTION_CONFIG[l.action_type]?.label || l.action_type,
      l.performed_by || '',
      l.old_value || '',
      l.new_value || '',
      l.notes || '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coach-audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (user?.user_type !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 p-6">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-red-600" />
              <CardTitle>Access Denied</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Only super admins can access the audit log.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent flex items-center gap-2">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 p-2 rounded-xl shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              Coach Activity Audit Log
            </h1>
            <p className="text-gray-500 text-sm mt-1">Complete trail of all admin actions performed on health coaches</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 h-9">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2 h-9 border-green-300 text-green-700 hover:bg-green-50">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total Events', value: stats.total, color: 'text-gray-900', bg: 'bg-white' },
            { label: 'Today', value: stats.today, color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'Accounts Created', value: stats.accountCreations, color: 'text-green-700', bg: 'bg-green-50' },
            { label: 'Password Resets', value: stats.passwordChanges, color: 'text-indigo-700', bg: 'bg-indigo-50' },
            { label: 'Plan Changes', value: stats.planActions, color: 'text-purple-700', bg: 'bg-purple-50' },
          ].map((s) => (
            <Card key={s.label} className={`border-none shadow ${s.bg}`}>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="border-none shadow bg-white/80 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search coach name, email, or performed by..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full md:w-52 h-9 text-sm">
                  <Filter className="w-3 h-3 mr-2 text-gray-400" />
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {Object.entries(ACTION_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full md:w-44 h-9 text-sm">
                  <Clock className="w-3 h-3 mr-2 text-gray-400" />
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Log Table */}
        <Card className="border-none shadow bg-white/80 backdrop-blur overflow-hidden">
          <CardHeader className="border-b border-gray-100 py-3 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              {filtered.length} event{filtered.length !== 1 ? 's' : ''}
              {search || actionFilter !== 'all' || dateFilter !== 'all' ? ' (filtered)' : ''}
            </CardTitle>
            <span className="text-xs text-gray-400">Page {page} of {Math.max(totalPages, 1)}</span>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center text-gray-400">Loading audit log...</div>
            ) : paginated.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <Shield className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                <p>No events found matching your filters.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {paginated.map((log) => {
                  const cfg = ACTION_CONFIG[log.action_type] || {
                    label: log.action_type,
                    icon: Shield,
                    color: 'bg-gray-100 text-gray-700 border-gray-200',
                    dot: 'bg-gray-400',
                  };
                  const Icon = cfg.icon;
                  return (
                    <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-orange-50/40 transition-colors">
                      {/* Icon */}
                      <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.color.includes('green') ? 'bg-green-100' : cfg.color.includes('indigo') ? 'bg-indigo-100' : cfg.color.includes('purple') ? 'bg-purple-100' : cfg.color.includes('red') ? 'bg-red-100' : cfg.color.includes('yellow') ? 'bg-yellow-100' : cfg.color.includes('blue') ? 'bg-blue-100' : cfg.color.includes('teal') ? 'bg-teal-100' : cfg.color.includes('orange') ? 'bg-orange-100' : cfg.color.includes('emerald') ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                        <Icon className="w-4 h-4 text-gray-600" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={`text-xs border ${cfg.color}`}>{cfg.label}</Badge>
                          <span className="font-semibold text-sm text-gray-900 truncate">{log.coach_name || log.coach_email}</span>
                          {log.coach_name && <span className="text-xs text-gray-400 truncate hidden sm:inline">{log.coach_email}</span>}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 mt-1 text-xs text-gray-500">
                          <span>by <span className="font-medium text-gray-700">{log.performed_by}</span></span>
                          {log.old_value && log.new_value && (
                            <span className="hidden sm:inline">
                              <span className="line-through text-gray-400">{log.old_value}</span>
                              {' → '}
                              <span className="text-gray-700">{log.new_value}</span>
                            </span>
                          )}
                          {!log.old_value && log.new_value && (
                            <span className="text-gray-600 hidden sm:inline">{log.new_value}</span>
                          )}
                          {log.amount && !log.new_value && (
                            <span className="text-gray-600">+{log.amount} credits</span>
                          )}
                          {log.notes && <span className="italic text-gray-400 hidden md:inline">"{log.notes}"</span>}
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div className="text-right flex-shrink-0 text-xs text-gray-400 space-y-0.5">
                        <p className="font-medium text-gray-600">
                          {format(new Date(log.created_date), 'dd MMM yyyy')}
                        </p>
                        <p>{format(new Date(log.created_date), 'HH:mm')}</p>
                        <p className="text-gray-300 hidden sm:block">
                          {formatDistanceToNow(new Date(log.created_date), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="gap-1 h-8"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </Button>
                <span className="text-sm text-gray-500">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="gap-1 h-8"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}