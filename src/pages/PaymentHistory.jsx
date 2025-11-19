import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Calendar, Search, TrendingUp, CreditCard, Lock } from "lucide-react";
import { format } from "date-fns";

export default function PaymentHistory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  if (!canViewPaymentHistory()) {
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

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = 
      sub.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.client_email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Payment History</h1>
            <p className="text-gray-600">Track all client subscription payments</p>
          </div>
          <DollarSign className="w-10 h-10 text-green-500" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm mb-1">Total Revenue</p>
                  <p className="text-3xl font-bold">₹{totalRevenue.toLocaleString()}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-white/80" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm mb-1">Active Subscriptions</p>
                  <p className="text-3xl font-bold">{activeSubscriptions}</p>
                </div>
                <CreditCard className="w-10 h-10 text-white/80" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm mb-1">Total Clients</p>
                  <p className="text-3xl font-bold">{subscriptions.length}</p>
                </div>
                <Calendar className="w-10 h-10 text-white/80" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search by client name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {filteredSubscriptions.map((sub) => (
                <Card key={sub.id} className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{sub.client_name}</h3>
                        <p className="text-sm text-gray-600">{sub.client_email}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge className={`${
                            sub.plan_tier === 'pro' ? 'bg-purple-600' :
                            sub.plan_tier === 'advanced' ? 'bg-blue-600' :
                            'bg-gray-600'
                          } text-white capitalize`}>
                            {sub.plan_tier} Plan
                          </Badge>
                          <Badge variant="outline" className="capitalize">{sub.billing_cycle}</Badge>
                          <Badge className={`${
                            sub.status === 'active' ? 'bg-green-500' :
                            sub.status === 'expired' ? 'bg-red-500' :
                            'bg-gray-500'
                          } text-white`}>
                            {sub.status}
                          </Badge>
                          {sub.payment_id && (
                            <Badge variant="outline" className="font-mono text-xs">
                              ID: {sub.payment_id.substring(0, 12)}...
                            </Badge>
                          )}
                        </div>
                        {sub.payment_gateway && (
                          <p className="text-xs text-gray-500 mt-1">
                            Gateway: {sub.payment_gateway}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">₹{sub.amount}</p>
                        <p className="text-sm text-gray-600">{format(new Date(sub.created_date), 'MMM d, yyyy')}</p>
                        {sub.next_billing_date && (
                          <p className="text-xs text-gray-500 mt-1">
                            Next: {format(new Date(sub.next_billing_date), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="mt-8 pt-6 border-t">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                  Razorpay Health Coach Subscriptions
                </h2>
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">Total Razorpay Revenue</p>
                      <p className="text-3xl font-bold text-blue-900">₹{totalRazorpayRevenue.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total Subscriptions</p>
                      <p className="text-2xl font-bold text-blue-900">{coachSubscriptions.length}</p>
                    </div>
                  </div>
                </div>

                {Object.keys(razorpayByPlan).map((planName) => (
                  <div key={planName} className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-xl font-bold text-gray-900">{planName}</h3>
                      <Badge className="bg-purple-600 text-white">
                        {razorpayByPlan[planName].length} subscription{razorpayByPlan[planName].length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {razorpayByPlan[planName].map((sub) => (
                        <Card key={sub.id} className="border-l-4 border-l-purple-500">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-lg">{sub.coach_name}</h4>
                                <p className="text-sm text-gray-600">{sub.coach_email}</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  <Badge className={`${
                                    sub.status === 'active' ? 'bg-green-500' :
                                    sub.status === 'expired' ? 'bg-red-500' :
                                    sub.status === 'cancelled' ? 'bg-gray-500' :
                                    'bg-yellow-500'
                                  } text-white capitalize`}>
                                    {sub.status}
                                  </Badge>
                                  <Badge variant="outline" className="capitalize">
                                    {sub.billing_cycle}
                                  </Badge>
                                  {sub.razorpay_payment_id && (
                                    <Badge variant="outline" className="font-mono text-xs">
                                      Pay: {sub.razorpay_payment_id.substring(0, 15)}...
                                    </Badge>
                                  )}
                                  {sub.razorpay_order_id && (
                                    <Badge variant="outline" className="font-mono text-xs">
                                      Order: {sub.razorpay_order_id.substring(0, 15)}...
                                    </Badge>
                                  )}
                                  {sub.manually_granted && (
                                    <Badge className="bg-orange-500 text-white">
                                      Manually Granted
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 mt-2 space-y-1">
                                  <p>Start: {format(new Date(sub.start_date), 'MMM d, yyyy')}</p>
                                  <p>End: {format(new Date(sub.end_date), 'MMM d, yyyy')}</p>
                                  {sub.next_billing_date && (
                                    <p>Next Billing: {format(new Date(sub.next_billing_date), 'MMM d, yyyy')}</p>
                                  )}
                                  {sub.granted_by && (
                                    <p>Granted By: {sub.granted_by}</p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-gray-900">₹{sub.amount}</p>
                                <p className="text-sm text-gray-600">{sub.currency || 'INR'}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {format(new Date(sub.created_date), 'MMM d, yyyy')}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}

                {coachSubscriptions.length === 0 && (
                  <div className="text-center py-8">
                    <CreditCard className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No Razorpay coach subscriptions found</p>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t">
                <h2 className="text-2xl font-bold mb-4">All Transaction Details</h2>
                {payments.map((payment) => (
                  <Card key={payment.id} className="border-2 mb-3">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{payment.payment_for || 'Payment'}</h3>
                          <p className="text-sm text-gray-600">{payment.coach_email}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge className={`${
                              payment.status === 'completed' ? 'bg-green-500' :
                              payment.status === 'pending' ? 'bg-yellow-500' :
                              payment.status === 'failed' ? 'bg-red-500' :
                              'bg-blue-500'
                            } text-white capitalize`}>
                              {payment.status}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {payment.payment_method}
                            </Badge>
                            {payment.transaction_id && (
                              <Badge variant="outline" className="font-mono text-xs">
                                TXN: {payment.transaction_id}
                              </Badge>
                            )}
                            {payment.razorpay_payment_id && (
                              <Badge variant="outline" className="font-mono text-xs">
                                Pay ID: {payment.razorpay_payment_id.substring(0, 12)}...
                              </Badge>
                            )}
                          </div>
                          {payment.invoice_number && (
                            <p className="text-xs text-gray-500 mt-1">
                              Invoice: {payment.invoice_number}
                            </p>
                          )}
                          {payment.notes && (
                            <p className="text-xs text-gray-500 mt-1">
                              Note: {payment.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">₹{payment.amount}</p>
                          <p className="text-sm text-gray-600">{format(new Date(payment.payment_date), 'MMM d, yyyy')}</p>
                          <p className="text-xs text-gray-500 mt-1">{payment.currency || 'INR'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {payments.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No transaction records found</p>
                  </div>
                )}
              </div>
            </div>

            {filteredSubscriptions.length === 0 && (
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Payment Records</h3>
                <p className="text-gray-600">Payment history will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}