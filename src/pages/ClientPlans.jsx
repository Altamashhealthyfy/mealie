import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, AlertTriangle, CreditCard, Users, TrendingUp, Crown, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPageUrl } from "@/utils";
import { useUserPermissions } from "@/components/permissions/useUserPermissions";

export default function ClientPlans() {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['clientProfile', user?.email],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ email: user?.email });
      return clients[0] || null;
    },
    enabled: !!user && user.user_type === 'client',
  });

  const { data: mySubscription } = useQuery({
    queryKey: ['myClientSubscription', clientProfile?.id],
    queryFn: async () => {
      const subs = await base44.entities.ClientSubscription.filter({ 
        client_id: clientProfile?.id,
        status: { '$ne': 'cancelled' }
      });
      return subs[0] || null;
    },
    enabled: !!clientProfile,
  });

  const { data: securitySettings } = useQuery({
    queryKey: ['securitySettings'],
    queryFn: async () => {
      const settings = await base44.entities.AppSecuritySettings.list();
      return settings[0] || null;
    },
  });

  const { permissions, hasPermission } = useUserPermissions();

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const createSubscriptionMutation = useMutation({
    mutationFn: async (data) => base44.entities.ClientSubscription.create(data),
    onSuccess: (newSubscription) => {
      return newSubscription;
    },
    onError: (error) => {
        console.error("Error creating subscription:", error);
        alert('Failed to create subscription. Please try again.');
    }
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ id, data }) => base44.entities.ClientSubscription.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['myClientSubscription']);
      queryClient.invalidateQueries(['clientSubscription']);
      queryClient.invalidateQueries(['userCustomPermissions']);
    },
  });

  const unSubscribeMutation = useMutation({
    mutationFn: async (subscriptionId) => base44.entities.ClientSubscription.update(subscriptionId, { status: 'cancelled', auto_renew: false }),
    onSuccess: () => {
      queryClient.invalidateQueries(['myClientSubscription']);
      queryClient.invalidateQueries(['clientSubscription']);
      queryClient.invalidateQueries(['userCustomPermissions']);
      alert('Your subscription has been cancelled.');
    },
    onError: (error) => {
      console.error("Error cancelling subscription:", error);
      alert('Failed to cancel subscription. Please try again.');
    }
  });

  // Check if client has access to this page using permissions hook
  const canShowMyPlans = hasPermission('show_my_plans');

  React.useEffect(() => {
    if (user && user.user_type === 'client' && !canShowMyPlans) {
      alert('⛔ My Plans page is not available.\n\nContact your dietitian for subscription information.');
      window.location.href = createPageUrl('Home');
    }
  }, [user, canShowMyPlans]);

  if (user && user.user_type === 'client' && !canShowMyPlans) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              Access Restricted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-800">
              My Plans page access is disabled. Contact your dietitian for subscription information.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const plans = [
    {
      id: 'basic',
      name: 'Basic Plan',
      icon: Users,
      color: 'from-gray-500 to-slate-600',
      monthly: securitySettings?.membership_plans?.basic_plan?.monthly_price || 999,
      yearly: securitySettings?.membership_plans?.basic_plan?.yearly_price || 9999,
      features: [
        'View meal plans',
        'Food log tracking',
        'Progress tracking',
        'MPESS wellness',
        'Recipe downloads',
        'AI food lookup',
        'Basic support'
      ]
    },
    {
      id: 'advanced',
      name: 'Advanced Plan',
      icon: TrendingUp,
      color: 'from-blue-500 to-cyan-600',
      monthly: securitySettings?.membership_plans?.advanced_plan?.monthly_price || 2999,
      yearly: securitySettings?.membership_plans?.advanced_plan?.yearly_price || 29999,
      popular: true,
      features: [
        'Everything in Basic',
        'Comment on meal plans',
        'Delete entries',
        'Book appointments',
        'AI recipe generation',
        'Wellness AI insights',
        'Export data',
        'Priority support'
      ]
    },
    {
      id: 'pro',
      name: 'Pro Plan',
      icon: Crown,
      color: 'from-purple-500 to-pink-600',
      monthly: securitySettings?.membership_plans?.pro_plan?.monthly_price || 4999,
      yearly: securitySettings?.membership_plans?.pro_plan?.yearly_price || 49999,
      best: true,
      features: [
        'Everything in Advanced',
        'Upload recipes',
        'Upload documents',
        'Unlimited AI features',
        'Advanced analytics',
        'White-label access',
        '24/7 priority support'
      ]
    }
  ];

  const handleSubscribe = async (plan) => {
    if (!clientProfile) {
      alert('Client profile not found');
      return;
    }
    if (!user) {
        alert('User data not found');
        return;
    }

    setIsProcessingPayment(true);

    try {
      const amount = billingCycle === 'yearly' ? plan.yearly : plan.monthly;
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (billingCycle === 'yearly' ? 12 : 1));

      // Create subscription record first
      const subscriptionData = {
        client_id: clientProfile.id,
        client_email: user.email,
        client_name: user.full_name,
        plan_tier: plan.id,
        billing_cycle: billingCycle,
        amount,
        currency: 'INR',
        start_date: startDate,
        end_date: endDate.toISOString().split('T')[0],
        next_billing_date: endDate.toISOString().split('T')[0],
        status: 'pending',
        payment_gateway: 'razorpay',
        coach_email: clientProfile.created_by,
        auto_renew: true
      };

      const newSubscription = await createSubscriptionMutation.mutateAsync(subscriptionData);

      // Initiate Razorpay payment
      const { data: paymentOrder } = await base44.functions.invoke('createClientPayment', {
        subscriptionId: newSubscription.id,
        amount: amount * 100, // Razorpay expects amount in paise
        currency: 'INR',
        clientName: user.full_name,
        clientEmail: user.email,
        planName: plan.name
      });

      const options = {
        key: paymentOrder.razorpay_key_id,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: 'Mealie',
        description: `${plan.name} - ${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}`,
        order_id: paymentOrder.order_id,
        prefill: {
          name: user.full_name,
          email: user.email,
        },
        theme: {
          color: '#F97316'
        },
        handler: async function (response) {
          try {
            // Verify payment
            const { data: verification } = await base44.functions.invoke('verifyClientPayment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              subscriptionId: newSubscription.id
            });

            if (verification.success) {
              // Update subscription to active
              await updateSubscriptionMutation.mutateAsync({
                id: newSubscription.id,
                data: {
                  status: 'active',
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id
                }
              });
              
              setSelectedPlan(null);
              alert('✅ Payment successful! Your plan is now active.');
            } else {
              alert('❌ Payment verification failed. Please contact support.');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            alert('❌ Payment verification failed. Please contact support.');
          } finally {
            setIsProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: function() {
            setIsProcessingPayment(false);
            alert('Payment cancelled. Your subscription remains pending.');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Payment initiation error:', error);
      alert('Failed to initiate payment. Please try again.');
      setIsProcessingPayment(false);
    }
  };

  const handleCancelSubscription = () => {
    if (mySubscription && mySubscription.id) {
      if (confirm('Are you sure you want to cancel your current subscription? This will take effect at the end of your current billing cycle and cannot be undone.')) {
        unSubscribeMutation.mutate(mySubscription.id);
      }
    } else {
      alert('No active subscription found to cancel.');
    }
  };

  if (user?.user_type !== 'client') {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-800">This page is only for clients.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Plans</h1>
            <p className="text-gray-600">Upgrade your wellness journey</p>
          </div>
        </div>

        {mySubscription && mySubscription.status === 'active' && (
          <Alert className="bg-green-50 border-green-500 flex items-center justify-between p-4">
            <div className="flex items-center">
                <Check className="w-5 h-5 text-green-600 mr-2" />
                <AlertDescription>
                    <strong>Active Plan:</strong> {mySubscription.plan_tier.toUpperCase()} • 
                    Billing: {mySubscription.billing_cycle} • 
                    Next billing: {new Date(mySubscription.next_billing_date).toLocaleDateString()}
                </AlertDescription>
            </div>
            <Button
                variant="destructive"
                size="sm"
                onClick={handleCancelSubscription}
                disabled={unSubscribeMutation.isPending}
            >
                {unSubscribeMutation.isPending ? 'Cancelling...' : 'Unsubscribe'}
            </Button>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(plan => {
            const PlanIcon = plan.icon;
            return (
              <Card key={plan.id} className={`border-none shadow-xl ${plan.popular || plan.best ? 'ring-4 ' + (plan.popular ? 'ring-blue-500' : 'ring-purple-500') : ''}`}>
                <CardHeader className={`bg-gradient-to-r ${plan.color} text-white`}>
                  <div className="flex items-center justify-between mb-2">
                    <PlanIcon className="w-8 h-8" />
                    {plan.popular && <Badge className="bg-blue-600">Popular</Badge>}
                    {plan.best && <Badge className="bg-purple-600">Best Value</Badge>}
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-3">
                    <div>
                      <p className="text-sm opacity-90">Monthly</p>
                      <p className="text-3xl font-bold">₹{plan.monthly}<span className="text-sm">/mo</span></p>
                    </div>
                    <div className="mt-2 p-2 bg-white/20 rounded">
                      <p className="text-sm opacity-90">Yearly</p>
                      <p className="text-3xl font-bold">₹{plan.yearly}<span className="text-sm">/year</span></p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                  <Button
                    onClick={() => setSelectedPlan(plan)}
                    disabled={mySubscription?.plan_tier === plan.id && mySubscription?.status === 'active'}
                    className={`w-full bg-gradient-to-r ${plan.color}`}
                  >
                    {mySubscription?.plan_tier === plan.id && mySubscription?.status === 'active' ? 'Current Plan' : 
                     mySubscription && mySubscription.status === 'active' ? 'Upgrade/Downgrade' : 'Subscribe'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Subscribe to {selectedPlan?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="font-semibold">Billing Cycle</label>
                <Select value={billingCycle} onValueChange={setBillingCycle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly - ₹{selectedPlan?.monthly}</SelectItem>
                    <SelectItem value="yearly">Yearly - ₹{selectedPlan?.yearly} (Save money!)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Alert>
                <CreditCard className="w-4 h-4" />
                <AlertDescription>
                  Payment will be processed by your dietitian's payment gateway
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => handleSubscribe(selectedPlan)}
                disabled={isProcessingPayment}
                className="w-full"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Proceed to Payment
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}