import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CreditCard,
  DollarSign,
  CheckCircle2,
  Clock,
  TrendingUp,
  Download,
  Eye,
  Calendar as CalendarIcon,
  Receipt,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";

export default function PaymentSetup() {
  const queryClient = useQueryClient();
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    payment_method: 'razorpay',
    status: 'completed',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: subscription } = useQuery({
    queryKey: ['mySubscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({ coach_email: user?.email });
      return subs[0] || null;
    },
    enabled: !!user,
  });

  const { data: payments } = useQuery({
    queryKey: ['myPayments', user?.email],
    queryFn: () => base44.entities.Payment.filter({ coach_email: user?.email }),
    enabled: !!user,
    initialData: [],
  });

  const createPaymentMutation = useMutation({
    mutationFn: (data) => base44.entities.Payment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['myPayments']);
      setShowAddPayment(false);
      setPaymentForm({
        payment_method: 'razorpay',
        status: 'completed',
        payment_date: format(new Date(), 'yyyy-MM-dd'),
      });
      alert('Payment recorded successfully!');
    },
  });

  const handleRecordPayment = () => {
    createPaymentMutation.mutate({
      ...paymentForm,
      coach_email: user?.email,
      subscription_id: subscription?.id,
    });
  };

  const pricingPlans = [
    {
      name: "Student Coach",
      price: 499,
      period: "month",
      features: ["Up to 5 clients", "Basic features", "Email support"],
      recommended: false,
    },
    {
      name: "Professional",
      price: 1499,
      period: "month",
      features: ["Up to 25 clients", "All features", "Priority support"],
      recommended: true,
    },
    {
      name: "Premium",
      price: 4999,
      period: "month",
      features: ["Unlimited clients", "White-label", "Dedicated support"],
      recommended: false,
    },
    {
      name: "Lifetime",
      price: 29999,
      period: "one-time",
      features: ["All premium features", "Lifetime access", "No recurring fees"],
      recommended: false,
    },
  ];

  const paymentMethods = [
    {
      name: "Razorpay",
      description: "Accept UPI, Cards, NetBanking",
      logo: "💳",
      setupUrl: "https://razorpay.com/",
      recommended: true,
    },
    {
      name: "Stripe",
      description: "International payments",
      logo: "💵",
      setupUrl: "https://stripe.com/",
      recommended: false,
    },
    {
      name: "Bank Transfer",
      description: "Direct bank account",
      logo: "🏦",
      setupUrl: null,
      recommended: false,
    },
    {
      name: "UPI",
      description: "Google Pay, PhonePe, Paytm",
      logo: "📱",
      setupUrl: null,
      recommended: true,
    },
  ];

  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const completedPayments = payments.filter(p => p.status === 'completed').length;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Payment Setup</h1>
            <p className="text-gray-600">Manage your subscription and payment methods</p>
          </div>
        </div>

        {/* Current Subscription */}
        {subscription ? (
          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="bg-green-600 text-white mb-2">Active Subscription</Badge>
                  <CardTitle className="text-3xl">{subscription.plan_type} Plan</CardTitle>
                  <CardDescription className="text-lg mt-2">
                    ₹{subscription.amount} / {subscription.billing_cycle}
                  </CardDescription>
                </div>
                <CheckCircle2 className="w-16 h-16 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Start Date</p>
                  <p className="text-lg font-bold">{format(new Date(subscription.start_date), 'MMM d, yyyy')}</p>
                </div>
                <div className="p-4 bg-white rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Next Renewal</p>
                  <p className="text-lg font-bold">{format(new Date(subscription.end_date), 'MMM d, yyyy')}</p>
                </div>
                <div className="p-4 bg-white rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Client Limit</p>
                  <p className="text-lg font-bold">{subscription.client_limit} clients</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-orange-600" />
                No Active Subscription
              </CardTitle>
              <CardDescription>Choose a plan to get started</CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Payment Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <DollarSign className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Paid</p>
                  <p className="text-3xl font-bold text-gray-900">₹{totalPaid.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-3xl font-bold text-gray-900">{completedPayments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <Receipt className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Invoices</p>
                  <p className="text-3xl font-bold text-gray-900">{payments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="plans" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur shadow-lg">
            <TabsTrigger value="plans">Pricing Plans</TabsTrigger>
            <TabsTrigger value="methods">Payment Methods</TabsTrigger>
            <TabsTrigger value="history">Payment History</TabsTrigger>
          </TabsList>

          {/* Pricing Plans */}
          <TabsContent value="plans">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {pricingPlans.map((plan) => (
                <Card
                  key={plan.name}
                  className={`border-none shadow-xl hover:shadow-2xl transition-all ${
                    plan.recommended ? 'ring-4 ring-orange-500' : ''
                  }`}
                >
                  {plan.recommended && (
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-center py-2 text-sm font-bold rounded-t-xl">
                      RECOMMENDED
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <div className="text-center pt-4">
                      <span className="text-5xl font-bold text-gray-900">₹{plan.price.toLocaleString()}</span>
                      <span className="text-gray-600">/{plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full ${
                        plan.recommended
                          ? 'bg-gradient-to-r from-orange-500 to-red-500'
                          : 'bg-gray-600'
                      }`}
                    >
                      Select Plan
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Payment Methods */}
          <TabsContent value="methods">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {paymentMethods.map((method) => (
                <Card
                  key={method.name}
                  className={`border-none shadow-lg hover:shadow-xl transition-all ${
                    method.recommended ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">{method.logo}</span>
                        <div>
                          <CardTitle className="text-xl">{method.name}</CardTitle>
                          <CardDescription>{method.description}</CardDescription>
                        </div>
                      </div>
                      {method.recommended && (
                        <Badge className="bg-blue-600">Recommended</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {method.setupUrl ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open(method.setupUrl, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Setup {method.name}
                      </Button>
                    ) : (
                      <Alert>
                        <AlertDescription>
                          Contact us to set up {method.name} payments
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Integration Guide */}
            <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 mt-6">
              <CardHeader>
                <CardTitle className="text-2xl">Payment Integration Guide</CardTitle>
                <CardDescription>Step-by-step setup instructions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-lg">
                    <h3 className="font-bold text-lg mb-2">1. Create Payment Gateway Account</h3>
                    <p className="text-gray-600 mb-3">
                      Sign up for Razorpay (recommended for India) or Stripe (for international)
                    </p>
                    <Button variant="outline" size="sm" onClick={() => window.open('https://razorpay.com/', '_blank')}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Go to Razorpay
                    </Button>
                  </div>

                  <div className="p-4 bg-white rounded-lg">
                    <h3 className="font-bold text-lg mb-2">2. Get API Keys</h3>
                    <p className="text-gray-600">
                      After account approval, navigate to Settings → API Keys and generate your keys
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-lg">
                    <h3 className="font-bold text-lg mb-2">3. Configure Webhooks</h3>
                    <p className="text-gray-600">
                      Set up webhooks to receive payment notifications automatically
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-lg">
                    <h3 className="font-bold text-lg mb-2">4. Test Payments</h3>
                    <p className="text-gray-600">
                      Use test mode to verify your integration before going live
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment History */}
          <TabsContent value="history">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">Payment History</CardTitle>
                  <Button onClick={() => setShowAddPayment(!showAddPayment)}>
                    {showAddPayment ? 'Cancel' : 'Record Payment'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showAddPayment && (
                  <Card className="mb-6 bg-blue-50">
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Amount</Label>
                          <Input
                            type="number"
                            value={paymentForm.amount || ''}
                            onChange={(e) => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value)})}
                            placeholder="₹1499"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Payment Date</Label>
                          <Input
                            type="date"
                            value={paymentForm.payment_date}
                            onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Payment Method</Label>
                          <select
                            className="w-full p-2 border rounded-lg"
                            value={paymentForm.payment_method}
                            onChange={(e) => setPaymentForm({...paymentForm, payment_method: e.target.value})}
                          >
                            <option value="razorpay">Razorpay</option>
                            <option value="stripe">Stripe</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="upi">UPI</option>
                            <option value="cash">Cash</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>Transaction ID</Label>
                          <Input
                            value={paymentForm.transaction_id || ''}
                            onChange={(e) => setPaymentForm({...paymentForm, transaction_id: e.target.value})}
                            placeholder="TXN123456"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={handleRecordPayment}
                        disabled={createPaymentMutation.isPending}
                        className="w-full mt-4"
                      >
                        {createPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {payments.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Payments Yet</h3>
                    <p className="text-gray-600">Your payment history will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payments.map((payment) => (
                      <Card key={payment.id} className="border-none shadow hover:shadow-lg transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                payment.status === 'completed' ? 'bg-green-100' :
                                payment.status === 'pending' ? 'bg-yellow-100' :
                                payment.status === 'failed' ? 'bg-red-100' : 'bg-gray-100'
                              }`}>
                                <Receipt className={`w-6 h-6 ${
                                  payment.status === 'completed' ? 'text-green-600' :
                                  payment.status === 'pending' ? 'text-yellow-600' :
                                  payment.status === 'failed' ? 'text-red-600' : 'text-gray-600'
                                }`} />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">
                                  ₹{payment.amount.toLocaleString()}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {format(new Date(payment.payment_date), 'MMM d, yyyy')} • {payment.payment_method}
                                </p>
                                {payment.transaction_id && (
                                  <p className="text-xs text-gray-500">TXN: {payment.transaction_id}</p>
                                )}
                              </div>
                            </div>
                            <Badge className={
                              payment.status === 'completed' ? 'bg-green-100 text-green-700' :
                              payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              payment.status === 'failed' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }>
                              {payment.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}