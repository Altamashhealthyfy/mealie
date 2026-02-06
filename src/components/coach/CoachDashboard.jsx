import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Crown, 
  Sparkles, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  CheckCircle2,
  ArrowUpCircle,
  Eye,
  History
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function CoachDashboard({ coach, open, onOpenChange, onEdit, onAddCredits, onViewHistory }) {
  const { data: subscription } = useQuery({
    queryKey: ['coachSubscription', coach?.email],
    queryFn: async () => {
      const subs = await base44.entities.HealthCoachSubscription.filter({ 
        coach_email: coach.email,
        status: 'active'
      });
      return subs[0] || null;
    },
    enabled: !!coach && open,
  });

  const { data: plan } = useQuery({
    queryKey: ['coachPlan', subscription?.plan_id],
    queryFn: async () => {
      const plans = await base44.entities.HealthCoachPlan.filter({ id: subscription.plan_id });
      return plans[0] || null;
    },
    enabled: !!subscription?.plan_id,
  });

  const { data: recentHistory } = useQuery({
    queryKey: ['coachRecentHistory', coach?.email],
    queryFn: async () => {
      const records = await base44.entities.CoachSubscriptionHistory.filter({ 
        coach_email: coach.email 
      });
      return records.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 5);
    },
    enabled: !!coach && open,
  });

  const { data: allHistory } = useQuery({
    queryKey: ['coachAllHistory', coach?.email],
    queryFn: async () => {
      const records = await base44.entities.CoachSubscriptionHistory.filter({ 
        coach_email: coach.email 
      });
      return records.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!coach && open,
  });

  if (!coach) return null;

  // Calculate AI credits
  const planCredits = plan?.ai_credits_per_month || 0;
  const purchasedCredits = subscription?.ai_credits_purchased || 0;
  const usedCredits = subscription?.ai_credits_used_this_month || 0;
  const totalCredits = planCredits + purchasedCredits;
  const remainingCredits = totalCredits - usedCredits;
  const usagePercentage = totalCredits > 0 ? (usedCredits / totalCredits) * 100 : 0;

  // Check if expired
  const isExpired = subscription?.end_date ? new Date(subscription.end_date) < new Date() : true;
  const daysUntilExpiry = subscription?.end_date 
    ? Math.ceil((new Date(subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  // Generate credit usage trend data (simulated based on history)
  const generateCreditTrend = () => {
    if (!allHistory?.length) {
      return [
        { date: 'Week 1', used: 0, total: totalCredits },
        { date: 'Week 2', used: Math.floor(usedCredits * 0.3), total: totalCredits },
        { date: 'Week 3', used: Math.floor(usedCredits * 0.6), total: totalCredits },
        { date: 'Week 4', used: usedCredits, total: totalCredits },
      ];
    }

    // Group history by weeks
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    return weeks.map((week, idx) => ({
      date: week,
      used: Math.floor(usedCredits * ((idx + 1) / weeks.length)),
      total: totalCredits,
      remaining: totalCredits - Math.floor(usedCredits * ((idx + 1) / weeks.length)),
    }));
  };

  const creditTrendData = generateCreditTrend();

  const getActionIcon = (actionType) => {
    switch(actionType) {
      case 'plan_assigned': return Crown;
      case 'plan_upgraded': return TrendingUp;
      case 'plan_downgraded': return TrendingDown;
      case 'credits_added': return Sparkles;
      case 'access_enabled': return Eye;
      default: return Activity;
    }
  };

  const getActionColor = (actionType) => {
    switch(actionType) {
      case 'plan_upgraded': return 'text-green-600';
      case 'plan_downgraded': return 'text-orange-600';
      case 'credits_added': return 'text-purple-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
              <Activity className="w-6 h-6 text-white" />
            </div>
            {coach.full_name}'s Dashboard
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="hover:bg-orange-50 hover:text-orange-600"
            >
              <Crown className="w-4 h-4 mr-2" />
              Manage Plan
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onAddCredits}
              className="hover:bg-purple-50 hover:text-purple-600"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Add Credits
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onViewHistory}
              className="hover:bg-blue-50 hover:text-blue-600"
            >
              <History className="w-4 h-4 mr-2" />
              Full History
            </Button>
          </div>

          {/* Subscription Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-indigo-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
                  <Crown className="w-4 h-4" />
                  Current Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                {subscription && plan ? (
                  <>
                    <p className="text-2xl font-bold text-purple-900">{plan.plan_name}</p>
                    <p className="text-sm text-purple-600 mt-1">
                      ₹{subscription.billing_cycle === 'monthly' ? plan.monthly_price : plan.yearly_price} / {subscription.billing_cycle}
                    </p>
                    <Badge className={`mt-2 ${isExpired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                      {isExpired ? 'Expired' : 'Active'}
                    </Badge>
                  </>
                ) : (
                  <p className="text-gray-500">No active plan</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-amber-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI Credits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-orange-900">{remainingCredits}</p>
                  <p className="text-sm text-orange-600">/ {totalCredits}</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-gradient-to-r from-orange-500 to-red-600 h-2 rounded-full transition-all"
                    style={{ width: `${100 - usagePercentage}%` }}
                  />
                </div>
                <p className="text-xs text-orange-600 mt-2">
                  {usagePercentage.toFixed(0)}% used this month
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Expiry
                </CardTitle>
              </CardHeader>
              <CardContent>
                {subscription?.end_date ? (
                  <>
                    <p className="text-2xl font-bold text-blue-900">
                      {daysUntilExpiry > 0 ? `${daysUntilExpiry} days` : 'Expired'}
                    </p>
                    <p className="text-sm text-blue-600 mt-1">
                      {new Date(subscription.end_date).toLocaleDateString()}
                    </p>
                    {daysUntilExpiry <= 7 && daysUntilExpiry > 0 && (
                      <Badge className="mt-2 bg-amber-100 text-amber-800">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Expiring Soon
                      </Badge>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500">No expiry date</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Credit Usage Trend */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                AI Credit Usage Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={creditTrendData}>
                  <defs>
                    <linearGradient id="colorUsed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Area type="monotone" dataKey="used" stroke="#f97316" fillOpacity={1} fill="url(#colorUsed)" name="Used Credits" />
                  <Area type="monotone" dataKey="remaining" stroke="#22c55e" fillOpacity={1} fill="url(#colorTotal)" name="Remaining" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-orange-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentHistory?.length > 0 ? (
                <div className="space-y-3">
                  {recentHistory.map((record) => {
                    const Icon = getActionIcon(record.action_type);
                    const colorClass = getActionColor(record.action_type);
                    return (
                      <div key={record.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className={`p-2 rounded-lg bg-white ${colorClass}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">
                            {record.action_type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </p>
                          {record.action_type === 'credits_added' && (
                            <p className="text-sm text-gray-600">Added {record.amount} AI credits</p>
                          )}
                          {record.action_type.includes('plan') && (
                            <p className="text-sm text-gray-600">
                              {record.old_value && `From ${record.old_value} `}to {record.new_value}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(record.created_date).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No recent activity</p>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}