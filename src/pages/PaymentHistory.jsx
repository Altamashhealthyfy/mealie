import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DollarSign, Calendar, Search, TrendingUp, CreditCard, Lock, Download, Filter, MoreVertical, CheckCircle2, RefreshCw, X, Sparkles } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function PaymentHistory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [view, setView] = useState("razorpay"); // razorpay, client, all
  const [selectedPlan, setSelectedPlan] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: securitySettings } = useQuery({
    queryKey: ['securitySettings'],
    queryFn: async () => {
      const settings = await base44.entities.AppSecuritySettings.list();
      return settings[0] || null;
    },
  });

  const { data: subscriptions } = useQuery({
    queryKey: ['allSubscriptions'],
    queryFn: async () => {
      const allSubs = await base44.entities.ClientSubscription.list('-created_date');
      if (user?.user_type === 'super_admin') {
        return allSubs;
      }
      return allSubs.filter(sub => sub.coach_email === user?.email);
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: payments } = useQuery({
    queryKey: ['allPayments'],
    queryFn: async () => {
      const allPayments = await base44.entities.Payment.list('-payment_date');
      if (user?.user_type === 'super_admin') {
        return allPayments;
      }
      return allPayments.filter(payment => payment.coach_email === user?.email);
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: coachSubscriptions } = useQuery({
    queryKey: ['allCoachSubscriptions'],
    queryFn: async () => {
      const allSubs = await base44.entities.HealthCoachSubscription.filter({ 
        payment_method: 'razorpay'
      });
      if (user?.user_type === 'super_admin') {
        return allSubs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      }
      return allSubs.filter(sub => sub.coach_email === user?.email)
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: aiCreditsTransactions } = useQuery({
    queryKey: ['allAICreditsTransactions'],
    queryFn: async () => {
      const allTxns = await base44.entities.AICreditsTransaction.list('-created_date');
      if (user?.user_type === 'super_admin') {
        return allTxns;
      }
      return allTxns.filter(txn => txn.coach_email === user?.email);
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: clientPlanPurchases } = useQuery({
    queryKey: ['allClientPlanPurchases'],
    queryFn: async () => {
      const allPurchases = await base44.entities.ClientPlanPurchase.list('-created_date');
      if (user?.user_type === 'super_admin') {
        return allPurchases;
      }
      // Filter for student_coach to show only their clients' purchases
      return allPurchases.filter(purchase => purchase.coach_email === user?.email);
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: messages } = useQuery({
    queryKey: ['allMessages'],
    queryFn: async () => {
      const allMessages = await base44.entities.Message.filter({ read: false });
      return allMessages;
    },
    enabled: !!user,
    initialData: [],
  });

  // All useMemo hooks must be unconditional — moved before any early returns

  const filteredSubscriptions = React.useMemo(() => subscriptions.filter(sub => {
    const matchesSearch = 
      sub.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.client_email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [subscriptions, searchQuery, statusFilter]);

  const totalRevenue = subscriptions
    .filter(sub => sub.status === 'active')
    .reduce((sum, sub) => sum + (sub.amount || 0), 0);

  const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active').length;

  const totalRazorpayRevenue = coachSubscriptions
    .filter(sub => sub.status === 'active')
    .reduce((sum, sub) => sum + (sub.amount || 0), 0);

  const razorpayByPlan = coachSubscriptions.reduce((acc, sub) => {
    const plan = sub.plan_name || 'Unknown Plan';
    if (!acc[plan]) {
      acc[plan] = [];
    }
    acc[plan].push(sub);
    return acc;
  }, {});

  const filteredRazorpayTransactions = React.useMemo(() => coachSubscriptions.filter(sub => {
    const matchesSearch = 
      sub.coach_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.coach_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.razorpay_payment_id?.toLowerCase().includes(searchQuery.toLowerCase());
    // Show all statuses including failed payments
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    
    let matchesDate = true;
    if (dateFrom) {
      matchesDate = matchesDate && new Date(sub.created_date) >= new Date(dateFrom);
    }
    if (dateTo) {
      matchesDate = matchesDate && new Date(sub.created_date) <= new Date(dateTo);
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  }), [coachSubscriptions, searchQuery, statusFilter, dateFrom, dateTo]);

  const filteredAICreditsTransactions = React.useMemo(() => aiCreditsTransactions.filter(txn => {
    const matchesSearch = 
      txn.coach_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && txn.payment_status === "completed") ||
      (statusFilter === "failed" && txn.payment_status === "failed");
    
    let matchesDate = true;
    if (dateFrom) {
      matchesDate = matchesDate && new Date(txn.created_date) >= new Date(dateFrom);
    }
    if (dateTo) {
      matchesDate = matchesDate && new Date(txn.created_date) <= new Date(dateTo);
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  }), [aiCreditsTransactions, searchQuery, statusFilter, dateFrom, dateTo]);

  const filteredClientPurchases = React.useMemo(() => clientPlanPurchases.filter(purchase => {
    const matchesSearch = 
      purchase.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.client_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.coach_email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && purchase.payment_status === "completed") ||
      (statusFilter === "failed" && purchase.payment_status === "failed");
    
    let matchesDate = true;
    if (dateFrom) {
      matchesDate = matchesDate && new Date(purchase.created_date) >= new Date(dateFrom);
    }
    if (dateTo) {
      matchesDate = matchesDate && new Date(purchase.created_date) <= new Date(dateTo);
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  }), [clientPlanPurchases, searchQuery, statusFilter, dateFrom, dateTo]);

  const successfulOrders = React.useMemo(() => 
    filteredRazorpayTransactions.filter(sub => sub.status === 'active').length,
    [filteredRazorpayTransactions]
  );
  
  const totalEarnings = React.useMemo(() => 
    filteredRazorpayTransactions
      .filter(sub => sub.status === 'active')
      .reduce((sum, sub) => sum + (sub.amount || 0), 0),
    [filteredRazorpayTransactions]
  );

  const canViewPaymentHistory = () => {
    if (user?.user_type === 'super_admin') {
      return securitySettings?.super_admin_permissions?.can_view_payment_history ?? true;
    }
    if (user?.user_type === 'team_member') {
      return securitySettings?.team_member_permissions?.can_view_payment_history ?? true;
    }
    if (user?.user_type === 'student_coach') {
      return securitySettings?.student_coach_permissions?.can_view_payment_history ?? true;
    }
    return false;
  };

  const canView = canViewPaymentHistory();

  // All useMemo hooks must be before any early return
  // Generate chart data by month
  const chartData = React.useMemo(() => {
    const monthlyData = {};
    coachSubscriptions
      .filter(sub => sub.status === 'active')
      .forEach(sub => {
        const month = format(new Date(sub.created_date), 'MMM yyyy');
        if (!monthlyData[month]) monthlyData[month] = 0;
        monthlyData[month] += sub.amount || 0;
      });
    return Object.keys(monthlyData)
      .sort((a, b) => new Date(a) - new Date(b))
      .map(month => ({ month: month.split(' ')[0], earnings: monthlyData[month] }));
  }, [coachSubscriptions]);

  // Earnings by plan
  const earningsByPlan = React.useMemo(() => {
    const planEarnings = {};
    coachSubscriptions
      .filter(sub => sub.status === 'active')
      .forEach(sub => {
        const plan = sub.plan_name || 'Unknown Plan';
        if (!planEarnings[plan]) planEarnings[plan] = 0;
        planEarnings[plan] += sub.amount || 0;
      });
    return Object.entries(planEarnings)
      .sort((a, b) => b[1] - a[1])
      .map(([plan, earnings]) => ({ plan, earnings }));
  }, [coachSubscriptions]);

  // AI Credits purchased per coach
  const creditsPurchasedByCoach = React.useMemo(() => {
    const coachCredits = {};
    aiCreditsTransactions
      .filter(txn => txn.transaction_type === 'purchase' && txn.payment_status === 'completed')
      .forEach(txn => {
        const coach = txn.coach_email || 'Unknown';
        if (!coachCredits[coach]) coachCredits[coach] = { credits: 0, spent: 0 };
        coachCredits[coach].credits += txn.credits_amount || 0;
        coachCredits[coach].spent += txn.cost || 0;
      });
    return Object.entries(coachCredits)
      .sort((a, b) => b[1].credits - a[1].credits)
      .map(([coach, data]) => ({ coach, credits: data.credits, spent: data.spent }));
  }, [aiCreditsTransactions]);

  // Client revenue by coach with unread messages
  const clientRevenueByCoach = React.useMemo(() => {
    const coachRevenue = {};
    clientPlanPurchases
      .filter(purchase => purchase.payment_status === 'completed')
      .forEach(purchase => {
        const coach = purchase.coach_email || 'Unknown';
        if (!coachRevenue[coach]) coachRevenue[coach] = { revenue: 0, unreadMessages: 0 };
        coachRevenue[coach].revenue += purchase.amount || 0;
      });
    messages.forEach(msg => {
      const clientPurchase = clientPlanPurchases.find(p => p.client_email === msg.created_by);
      if (clientPurchase?.coach_email) {
        const coach = clientPurchase.coach_email;
        if (!coachRevenue[coach]) coachRevenue[coach] = { revenue: 0, unreadMessages: 0 };
        coachRevenue[coach].unreadMessages += 1;
      }
    });
    return Object.entries(coachRevenue)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .map(([coach, data]) => ({ coach, revenue: data.revenue, unreadMessages: data.unreadMessages }));
  }, [clientPlanPurchases, messages]);

  if (!canView) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <Lock className="w-6 h-6" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-800">
              You don't have permission to view payment history.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const exportToCSV = () => {
    const headers = ['Date', 'Customer', 'Email', 'Plan', 'Amount', 'Billing Cycle', 'Status', 'Payment ID', 'Order ID'];
    const rows = filteredRazorpayTransactions.map(sub => [
      format(new Date(sub.created_date), 'dd MMM yyyy, h:mm a'),
      sub.coach_name,
      sub.coach_email,
      sub.plan_name,
      sub.amount,
      sub.billing_cycle,
      sub.status,
      sub.razorpay_payment_id || '',
      sub.razorpay_order_id || ''
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `razorpay-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen p-4 lg:p-8 bg-gray-50 overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-3 lg:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 lg:gap-2">
          <div>
            <h1 className="text-2xl lg:text-4xl font-bold text-gray-900 mb-0.5 lg:mb-2">Transactions</h1>
            <p className="text-xs lg:text-sm text-gray-600 line-clamp-2">
              Showing transaction records from {dateFrom || 'all time'} to {dateTo || 'now'}
            </p>
          </div>
        </div>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-3 lg:p-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-start justify-between gap-2 lg:gap-4 mb-4 lg:mb-6">
              <div>
                <h2 className="text-2xl lg:text-4xl font-bold text-gray-900 mb-2">
                  ₹{totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
                <p className="text-xs lg:text-sm text-gray-600">
                  Total earnings as on {format(new Date(), 'MMM dd, yyyy')}
                </p>
              </div>
              <div className="flex gap-2 w-full lg:w-auto">
                <Input
                  type="month"
                  placeholder="Start month"
                  className="flex-1 lg:w-36 h-10"
                />
                <span className="flex items-center px-2 text-gray-400">→</span>
                <Input
                  type="month"
                  placeholder="End month"
                  className="flex-1 lg:w-36 h-10"
                />
              </div>
            </div>

            <div className="w-full" style={{ height: 'clamp(180px, 35vh, 280px)' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 11 }}
                    stroke="#9ca3af"
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    stroke="#9ca3af"
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value) => `₹${value.toLocaleString()}`}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="earnings" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorEarnings)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-6">
          <Card className="border-none shadow-sm bg-white">
            <CardContent className="p-3 lg:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 lg:gap-4 mb-4 lg:mb-6">
                <div>
                  <h3 className="text-lg lg:text-xl font-bold text-gray-900">Services earnings</h3>
                  <p className="text-xs lg:text-sm text-gray-500">Last updated {format(new Date(), 'h')} hours ago</p>
                </div>
                <Button variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>

              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by service"
                  className="pl-10 h-10"
                />
              </div>

              <div className="space-y-2 lg:space-y-3">
                <div className="grid grid-cols-3 gap-2 lg:gap-4 pb-2 border-b text-xs font-medium text-gray-600">
                  <div>Service</div>
                  <div className="text-right">Earnings</div>
                  <div className="text-right">Action</div>
                </div>

                <div className="space-y-2 lg:space-y-3 max-h-[280px] overflow-y-auto scrollbar-thin">
                  {earningsByPlan.map(({ plan, earnings }) => (
                    <div key={plan} className="grid grid-cols-3 gap-2 lg:gap-4 items-center py-2 border-b last:border-0">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate" title={plan}>{plan}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge className="bg-blue-100 text-blue-800 text-[10px]">ACTIVE</Badge>
                          <Badge className="bg-green-100 text-green-800 text-[10px]">ONETIME</Badge>
                        </div>
                      </div>
                      <div className="text-right font-semibold text-gray-900 text-sm">
                        ₹{earnings.toLocaleString()}
                      </div>
                      <div className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedPlan(plan)}
                          className="text-xs px-2 py-1 h-8"
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ))}

                  {earningsByPlan.length === 0 && (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No earnings data available
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-gradient-to-br from-purple-50 to-pink-50">
            <CardContent className="p-3 lg:p-6">
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <div>
                  <h3 className="text-lg lg:text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    AI Credits Purchased
                  </h3>
                  <p className="text-xs lg:text-sm text-gray-500">Total credits bought by coaches</p>
                </div>
              </div>

              <div className="space-y-2 lg:space-y-3">
                <div className="grid grid-cols-3 gap-2 lg:gap-4 pb-2 border-b text-xs font-medium text-gray-600">
                  <div>Coach</div>
                  <div className="text-right">Credits</div>
                  <div className="text-right">Spent</div>
                </div>

                <div className="space-y-2 lg:space-y-3 max-h-[280px] overflow-y-auto scrollbar-thin">
                  {creditsPurchasedByCoach.map(({ coach, credits, spent }) => (
                    <div key={coach} className="grid grid-cols-3 gap-2 lg:gap-4 items-center py-2 border-b border-purple-100 last:border-0">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate" title={coach}>
                          {coach.split('@')[0]}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{coach}</p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-purple-600 text-white text-xs">
                          {credits} credits
                        </Badge>
                      </div>
                      <div className="text-right font-semibold text-gray-900 text-sm">
                        ₹{spent.toLocaleString()}
                      </div>
                    </div>
                  ))}

                  {creditsPurchasedByCoach.length === 0 && (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No AI credits purchased yet
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {user?.user_type === 'super_admin' && (
            <Card className="border-none shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
              <CardContent className="p-3 lg:p-6">
                <div className="flex items-center justify-between mb-4 lg:mb-6">
                  <div>
                    <h3 className="text-lg lg:text-xl font-bold text-gray-900 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-green-600" />
                      Client Revenue
                    </h3>
                    <p className="text-xs lg:text-sm text-gray-500">Revenue from client purchases</p>
                  </div>
                </div>

                <div className="space-y-2 lg:space-y-3">
                  <div className="grid grid-cols-3 gap-2 lg:gap-4 pb-2 border-b text-xs font-medium text-gray-600">
                    <div>Coach</div>
                    <div className="text-right">Messages</div>
                    <div className="text-right">Revenue</div>
                  </div>

                  <div className="space-y-2 lg:space-y-3 max-h-[280px] overflow-y-auto scrollbar-thin">
                    {clientRevenueByCoach.map(({ coach, unreadMessages, revenue }) => (
                      <div key={coach} className="grid grid-cols-3 gap-2 lg:gap-4 items-center py-2 border-b border-green-100 last:border-0">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate" title={coach}>
                            {coach.split('@')[0]}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{coach}</p>
                        </div>
                        <div className="text-right">
                          {unreadMessages > 0 ? (
                            <Badge className="bg-red-600 text-white text-xs">
                              {unreadMessages}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </div>
                        <div className="text-right font-semibold text-gray-900 text-sm">
                          ₹{revenue.toLocaleString()}
                        </div>
                      </div>
                    ))}

                    {clientRevenueByCoach.length === 0 && (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No client purchases yet
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4 lg:p-6">
            <div className="flex flex-col lg:flex-row gap-2 lg:gap-3 mb-4 lg:mb-6">
              <div className="flex-1 min-w-0 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search by name, phone or email"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
              <div className="flex flex-wrap gap-2 lg:gap-3">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-36 lg:w-40 h-10"
                />
                <span className="flex items-center px-2">→</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-36 lg:w-40 h-10"
                />
                <Button variant="outline" size="icon" className="h-10 w-10">
                  <Filter className="w-4 h-4" />
                </Button>
                <Button variant="outline" onClick={exportToCSV} className="h-10">
                  <Download className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Export CSV</span>
                  <span className="sm:hidden">Export</span>
                </Button>
              </div>
            </div>

            <div className="w-full overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-[10px] lg:text-sm text-gray-600">
                    <th className="text-left py-2 lg:py-3 px-2 lg:px-4 whitespace-nowrap font-medium">Date</th>
                    <th className="text-left py-2 lg:py-3 px-2 lg:px-4 whitespace-nowrap font-medium">Customer</th>
                    <th className="text-left py-2 lg:py-3 px-2 lg:px-4 whitespace-nowrap font-medium">Amount</th>
                    <th className="text-left py-2 lg:py-3 px-2 lg:px-4 whitespace-nowrap font-medium hidden md:table-cell">Contact</th>
                    <th className="text-left py-2 lg:py-3 px-2 lg:px-4 whitespace-nowrap font-medium hidden xl:table-cell">Service</th>
                    <th className="text-center py-2 lg:py-3 px-2 lg:px-4 whitespace-nowrap font-medium hidden lg:table-cell">Qty</th>
                    <th className="text-center py-2 lg:py-3 px-2 lg:px-4 whitespace-nowrap font-medium hidden lg:table-cell">Cycle</th>
                    <th className="text-center py-2 lg:py-3 px-2 lg:px-4 whitespace-nowrap font-medium">Status</th>
                    <th className="text-center py-2 lg:py-3 px-2 lg:px-4 font-medium hidden sm:table-cell"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRazorpayTransactions.map((sub) => (
                    <tr key={sub.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 lg:py-3 px-2 lg:px-4 text-[10px] lg:text-sm whitespace-nowrap">
                        <div className="hidden lg:block">{format(new Date(sub.created_date), 'dd MMM yyyy, h:mm a')}</div>
                        <div className="lg:hidden">{format(new Date(sub.created_date), 'dd MMM')}</div>
                      </td>
                      <td className="py-2 lg:py-3 px-2 lg:px-4">
                        <p className="font-medium text-xs lg:text-sm truncate">{sub.coach_name}</p>
                      </td>
                      <td className="py-2 lg:py-3 px-2 lg:px-4">
                        <p className="font-semibold text-xs lg:text-sm">₹{sub.amount}</p>
                      </td>
                      <td className="py-2 lg:py-3 px-2 lg:px-4 text-[10px] lg:text-sm hidden md:table-cell">
                        <p className="text-blue-600 truncate max-w-[100px]" title={sub.coach_email}>{sub.coach_email.split('@')[0]}</p>
                      </td>
                      <td className="py-2 lg:py-3 px-2 lg:px-4 text-[10px] lg:text-sm hidden xl:table-cell">
                        <p className="font-medium text-xs truncate">{sub.plan_name}</p>
                      </td>
                      <td className="py-2 lg:py-3 px-2 lg:px-4 text-center text-xs hidden lg:table-cell">1</td>
                      <td className="py-2 lg:py-3 px-2 lg:px-4 text-center hidden lg:table-cell">
                        <Badge className="bg-green-100 text-green-800 capitalize text-[10px] whitespace-nowrap">
                          {sub.billing_cycle}
                        </Badge>
                      </td>
                      <td className="py-2 lg:py-3 px-2 lg:px-4 text-center">
                        <Badge className={`${
                          sub.status === 'active' ? 'bg-green-500' :
                          sub.status === 'failed' ? 'bg-red-500' :
                          sub.status === 'expired' ? 'bg-orange-500' :
                          sub.status === 'cancelled' ? 'bg-gray-500' :
                          'bg-yellow-500'
                        } text-white inline-flex items-center gap-0.5 text-[10px] lg:text-xs whitespace-nowrap`}>
                          <CheckCircle2 className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
                          <span className="hidden sm:inline">{sub.status === 'active' ? 'SUCCESS' : 
                           sub.status === 'failed' ? 'FAILED' :
                           sub.status.toUpperCase()}</span>
                          <span className="sm:hidden">{sub.status === 'active' ? 'OK' : 'ERR'}</span>
                        </Badge>
                      </td>
                      <td className="py-2 lg:py-3 px-2 lg:px-4 text-center hidden sm:table-cell">
                        <Button variant="ghost" size="icon" className="h-7 w-7 lg:h-8 lg:w-8">
                          <MoreVertical className="w-3 h-3 lg:w-4 lg:h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredAICreditsTransactions.map((txn) => (
                    <tr key={`ai-${txn.id}`} className="border-b hover:bg-purple-50 bg-purple-25">
                      <td className="py-3 lg:py-4 px-2 lg:px-4 text-xs lg:text-sm whitespace-nowrap">
                        {format(new Date(txn.created_date), 'dd MMM yyyy, h:mm a')}
                      </td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          <p className="font-medium text-sm">{txn.coach_email?.split('@')[0]}</p>
                        </div>
                      </td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4">
                        <p className="font-semibold text-sm">{txn.cost ? `₹${txn.cost}` : '-'}</p>
                      </td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4 text-xs lg:text-sm">
                        <p className="text-blue-600 truncate max-w-[150px]" title={txn.coach_email}>{txn.coach_email}</p>
                      </td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4 text-xs lg:text-sm">
                        <p className="font-medium flex items-center gap-1 text-sm">
                          <Sparkles className="w-3 h-3 text-purple-600" />
                          AI Credits
                        </p>
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">{txn.description}</p>
                      </td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4 text-center text-sm">
                        {txn.credits_amount > 0 ? `+${txn.credits_amount}` : txn.credits_amount}
                      </td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4 text-center">
                        <Badge className={`${
                          txn.transaction_type === 'purchase' ? 'bg-purple-100 text-purple-800' :
                          txn.transaction_type === 'usage' ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        } capitalize text-xs whitespace-nowrap`}>
                          {txn.transaction_type}
                        </Badge>
                      </td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4 text-center">
                        <Badge className={`${
                          txn.payment_status === 'completed' ? 'bg-green-500' :
                          txn.payment_status === 'failed' ? 'bg-red-500' :
                          'bg-yellow-500'
                        } text-white inline-flex items-center gap-1 text-xs whitespace-nowrap`}>
                          <CheckCircle2 className="w-3 h-3" />
                          {txn.payment_status === 'completed' ? 'SUCCESS' : 
                           txn.payment_status === 'failed' ? 'FAILED' :
                           txn.payment_status?.toUpperCase() || 'N/A'}
                        </Badge>
                      </td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4 text-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredClientPurchases.map((purchase) => (
                    <tr key={`client-${purchase.id}`} className="border-b hover:bg-green-50 bg-green-25">
                      <td className="py-3 lg:py-4 px-2 lg:px-4 text-xs lg:text-sm whitespace-nowrap">
                        {format(new Date(purchase.created_date), 'dd MMM yyyy, h:mm a')}
                      </td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-green-600" />
                          <p className="font-medium text-sm">{purchase.client_name}</p>
                        </div>
                      </td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4">
                        <p className="font-semibold text-sm">₹{purchase.amount}</p>
                      </td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4 text-xs lg:text-sm">
                        <p className="text-blue-600 truncate max-w-[150px]" title={purchase.client_email}>{purchase.client_email}</p>
                        {user?.user_type === 'super_admin' && (
                          <p className="text-xs text-gray-500 truncate max-w-[150px]">Coach: {purchase.coach_email}</p>
                        )}
                      </td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4 text-xs lg:text-sm">
                        <p className="font-medium flex items-center gap-1 text-sm">
                          <CreditCard className="w-3 h-3 text-green-600" />
                          {purchase.plan_name}
                        </p>
                        <p className="text-xs text-gray-500">Client Plan Purchase</p>
                      </td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4 text-center text-sm">1</td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4 text-center">
                        <Badge className="bg-green-100 text-green-800 capitalize text-xs whitespace-nowrap">
                          {purchase.duration_months} months
                        </Badge>
                      </td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4 text-center">
                        <Badge className={`${
                          purchase.payment_status === 'completed' ? 'bg-green-500' :
                          purchase.payment_status === 'failed' ? 'bg-red-500' :
                          'bg-yellow-500'
                        } text-white inline-flex items-center gap-1 text-xs whitespace-nowrap`}>
                          <CheckCircle2 className="w-3 h-3" />
                          {purchase.payment_status === 'completed' ? 'SUCCESS' : 
                           purchase.payment_status === 'failed' ? 'FAILED' :
                           purchase.payment_status?.toUpperCase() || 'PENDING'}
                        </Badge>
                      </td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4 text-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}



                </tbody>
              </table>
            </div>

            {filteredRazorpayTransactions.length === 0 && filteredAICreditsTransactions.length === 0 && filteredClientPurchases.length === 0 && (
              <div className="text-center py-8 lg:py-12">
                <DollarSign className="w-12 lg:w-16 h-12 lg:h-16 mx-auto text-gray-300 mb-2 lg:mb-4" />
                <h3 className="text-base lg:text-xl font-semibold text-gray-900 mb-1 lg:mb-2">No Transactions Found</h3>
                <p className="text-xs lg:text-base text-gray-600">Transaction history will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedPlan} - Invoices</span>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setSelectedPlan(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {coachSubscriptions
                .filter(sub => (sub.plan_name || 'Unknown Plan') === selectedPlan)
                .map(sub => (
                  <Card key={sub.id} className="border shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <Badge className={`${
                              sub.status === 'active' ? 'bg-green-500' :
                              sub.status === 'failed' ? 'bg-red-500' :
                              sub.status === 'expired' ? 'bg-orange-500' :
                              'bg-gray-500'
                            } text-white`}>
                              {sub.status.toUpperCase()}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {format(new Date(sub.created_date), 'MMM dd, yyyy h:mm a')}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">Customer</p>
                              <p className="font-medium text-gray-900">{sub.coach_name}</p>
                              <p className="text-sm text-blue-600">{sub.coach_email}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Amount</p>
                              <p className="text-2xl font-bold text-gray-900">₹{sub.amount}</p>
                              <p className="text-sm text-gray-500 capitalize">{sub.billing_cycle}</p>
                            </div>
                          </div>

                          {sub.razorpay_payment_id && (
                            <div className="pt-2 border-t">
                              <p className="text-xs text-gray-500">Payment ID: {sub.razorpay_payment_id}</p>
                              {sub.razorpay_order_id && (
                                <p className="text-xs text-gray-500">Order ID: {sub.razorpay_order_id}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              
              {coachSubscriptions.filter(sub => (sub.plan_name || 'Unknown Plan') === selectedPlan).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No invoices found for this plan
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}