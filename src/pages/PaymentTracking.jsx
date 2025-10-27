import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  Plus,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  X,
  BarChart
} from "lucide-react";
import { format } from "date-fns";

export default function PaymentTracking() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);

  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    payment_type: "low_ticket",
    product_name: "",
    amount: "",
    payment_method: "razorpay",
    payment_status: "completed",
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    transaction_id: "",
  });

  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.PaymentRecord.list('-payment_date'),
    initialData: [],
  });

  const createPaymentMutation = useMutation({
    mutationFn: (data) => base44.entities.PaymentRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['payments']);
      setShowAddForm(false);
      setForm({
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        payment_type: "low_ticket",
        product_name: "",
        amount: "",
        payment_method: "razorpay",
        payment_status: "completed",
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        transaction_id: "",
      });
    },
  });

  const handleCreate = () => {
    createPaymentMutation.mutate({
      ...form,
      amount: parseFloat(form.amount),
    });
  };

  // Calculate stats
  const totalRevenue = payments
    .filter(p => p.payment_status === 'completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const lowTicketRevenue = payments
    .filter(p => p.payment_status === 'completed' && p.payment_type === 'low_ticket')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const highTicketRevenue = payments
    .filter(p => p.payment_status === 'completed' && p.payment_type === 'high_ticket')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const thisMonth = format(new Date(), 'yyyy-MM');
  const monthRevenue = payments
    .filter(p => p.payment_date?.startsWith(thisMonth) && p.payment_status === 'completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const completedCount = payments.filter(p => p.payment_status === 'completed').length;
  const pendingCount = payments.filter(p => p.payment_status === 'pending').length;

  // Monthly breakdown
  const monthlyData = {};
  payments.forEach(p => {
    if (p.payment_status === 'completed' && p.payment_date) {
      const month = p.payment_date.substring(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { revenue: 0, count: 0 };
      }
      monthlyData[month].revenue += p.amount || 0;
      monthlyData[month].count += 1;
    }
  });

  const monthlyEntries = Object.entries(monthlyData).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Payment Tracking</h1>
            <p className="text-gray-600">Monitor all revenue and transactions</p>
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-gradient-to-r from-green-500 to-emerald-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Record Payment
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white">
            <CardContent className="p-6">
              <DollarSign className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">₹{(totalRevenue / 100000).toFixed(1)}L</p>
              <p className="text-sm opacity-90">Total Revenue</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
            <CardContent className="p-6">
              <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">₹{(monthRevenue / 100000).toFixed(1)}L</p>
              <p className="text-sm opacity-90">This Month</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-indigo-500 text-white">
            <CardContent className="p-6">
              <CheckCircle2 className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{completedCount}</p>
              <p className="text-sm opacity-90">Completed</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white">
            <CardContent className="p-6">
              <Clock className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{pendingCount}</p>
              <p className="text-sm opacity-90">Pending</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-pink-500 to-rose-500 text-white">
            <CardContent className="p-6">
              <BarChart className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">₹{completedCount > 0 ? (totalRevenue / completedCount / 1000).toFixed(0) : 0}K</p>
              <p className="text-sm opacity-90">Avg Transaction</p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-none shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
              <CardTitle>Low Ticket Revenue</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-4xl font-bold text-blue-600">₹{(lowTicketRevenue / 100000).toFixed(2)}L</p>
              <p className="text-gray-600 mt-2">
                {payments.filter(p => p.payment_type === 'low_ticket' && p.payment_status === 'completed').length} transactions
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
              <CardTitle>High Ticket Revenue</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-4xl font-bold text-orange-600">₹{(highTicketRevenue / 100000).toFixed(2)}L</p>
              <p className="text-gray-600 mt-2">
                {payments.filter(p => p.payment_type === 'high_ticket' && p.payment_status === 'completed').length} transactions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <Card className="border-none shadow-xl bg-green-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Record New Payment</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer Name *</Label>
                  <Input
                    value={form.customer_name}
                    onChange={(e) => setForm({...form, customer_name: e.target.value})}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={form.customer_phone}
                    onChange={(e) => setForm({...form, customer_phone: e.target.value})}
                    placeholder="+91 9876543210"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.customer_email}
                    onChange={(e) => setForm({...form, customer_email: e.target.value})}
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount (₹) *</Label>
                  <Input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({...form, amount: e.target.value})}
                    placeholder="2999"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Type *</Label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={form.payment_type}
                    onChange={(e) => setForm({...form, payment_type: e.target.value})}
                  >
                    <option value="low_ticket">Low Ticket (₹999-₹5000)</option>
                    <option value="high_ticket">High Ticket (₹25K+)</option>
                    <option value="subscription">Monthly Subscription</option>
                    <option value="upsell">Upsell/Add-on</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Product/Service Name *</Label>
                  <Input
                    value={form.product_name}
                    onChange={(e) => setForm({...form, product_name: e.target.value})}
                    placeholder="Diabetes Reversal Program"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={form.payment_method}
                    onChange={(e) => setForm({...form, payment_method: e.target.value})}
                  >
                    <option value="razorpay">Razorpay</option>
                    <option value="stripe">Stripe</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Payment Date *</Label>
                  <Input
                    type="date"
                    value={form.payment_date}
                    onChange={(e) => setForm({...form, payment_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Transaction ID</Label>
                  <Input
                    value={form.transaction_id}
                    onChange={(e) => setForm({...form, transaction_id: e.target.value})}
                    placeholder="TXN123456789"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={form.payment_status}
                    onChange={(e) => setForm({...form, payment_status: e.target.value})}
                  >
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
              </div>
              <Button
                onClick={handleCreate}
                disabled={createPaymentMutation.isPending || !form.customer_name || !form.amount || !form.product_name}
                className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-500"
              >
                {createPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Monthly Revenue Chart */}
        <Card className="border-none shadow-xl">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
            <CardTitle>Monthly Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {monthlyEntries.map(([month, data]) => (
                <div key={month} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium text-gray-700">
                    {format(new Date(month + '-01'), 'MMM yyyy')}
                  </div>
                  <div className="flex-1">
                    <div className="h-10 bg-gray-100 rounded-lg overflow-hidden relative">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center px-4 text-white font-semibold"
                        style={{ width: `${(data.revenue / totalRevenue) * 100}%` }}
                      >
                        ₹{(data.revenue / 100000).toFixed(1)}L
                      </div>
                    </div>
                  </div>
                  <div className="w-20 text-sm text-gray-600 text-right">
                    {data.count} txns
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur">
            <TabsTrigger value="all">All ({payments.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedCount})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
            <TabsTrigger value="low_ticket">Low Ticket</TabsTrigger>
            <TabsTrigger value="high_ticket">High Ticket</TabsTrigger>
          </TabsList>

          {['all', 'completed', 'pending', 'low_ticket', 'high_ticket'].map(tab => {
            const filteredPayments = payments.filter(p => {
              if (tab === 'all') return true;
              if (tab === 'completed' || tab === 'pending') return p.payment_status === tab;
              return p.payment_type === tab;
            });

            return (
              <TabsContent key={tab} value={tab}>
                <Card className="border-none shadow-lg">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="p-3 text-left text-sm font-semibold">Customer</th>
                            <th className="p-3 text-left text-sm font-semibold">Product</th>
                            <th className="p-3 text-left text-sm font-semibold">Amount</th>
                            <th className="p-3 text-left text-sm font-semibold">Type</th>
                            <th className="p-3 text-left text-sm font-semibold">Method</th>
                            <th className="p-3 text-left text-sm font-semibold">Date</th>
                            <th className="p-3 text-left text-sm font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPayments.map((payment) => (
                            <tr key={payment.id} className="border-b hover:bg-gray-50">
                              <td className="p-3">
                                <p className="font-semibold">{payment.customer_name}</p>
                                {payment.customer_phone && (
                                  <p className="text-xs text-gray-500">{payment.customer_phone}</p>
                                )}
                              </td>
                              <td className="p-3">
                                <p className="text-sm">{payment.product_name}</p>
                              </td>
                              <td className="p-3">
                                <p className="text-lg font-bold text-green-600">₹{payment.amount?.toLocaleString()}</p>
                              </td>
                              <td className="p-3">
                                <Badge variant="outline" className="capitalize">
                                  {payment.payment_type?.replace('_', ' ')}
                                </Badge>
                              </td>
                              <td className="p-3 text-sm capitalize">
                                {payment.payment_method}
                              </td>
                              <td className="p-3 text-sm">
                                {payment.payment_date ? format(new Date(payment.payment_date), 'MMM d, yyyy') : '-'}
                              </td>
                              <td className="p-3">
                                <Badge className={
                                  payment.payment_status === 'completed' ? 'bg-green-500' :
                                  payment.payment_status === 'pending' ? 'bg-orange-500' :
                                  payment.payment_status === 'failed' ? 'bg-red-500' :
                                  'bg-gray-500'
                                }>
                                  {payment.payment_status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}