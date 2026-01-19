import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Crown, Loader2, CreditCard, CheckCircle, AlertCircle } from "lucide-react";
import CouponInput from "@/components/payments/CouponInput";

export default function PurchaseCoachPlan() {
  const queryClient = useQueryClient();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
  const planId = urlParams.get('planId');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ['coachPlan', planId],
    queryFn: async () => {
      const plans = await base44.entities.HealthCoachPlan.filter({ id: planId, status: 'active' });
      return plans[0] || null;
    },
    enabled: !!planId,
  });

  const { data: mySubscription } = useQuery({
    queryKey: ['myCoachSubscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.HealthCoachSubscription.filter({
        coach_email: user?.email,
        status: 'active'
      });
      return subs[0] || null;
    },
    enabled: !!user && user.user_type === 'student_coach',
  });

  const { data: paymentGateway } = useQuery({
    queryKey: ['coachPaymentGateway'],
    queryFn: async () => {
      const gateways = await base44.entities.CoachPaymentGateway.list();
      const completedGateway = gateways.find(g => g.setup_completed === true);
      return completedGateway || gateways[0] || null;
    },
  });

  useEffect(() => {
    if (paymentGateway?.gateway_type === 'razorpay') {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
      return () => {
        document.body.removeChild(script);
      };
    }
  }, [paymentGateway]);

  const createSubscriptionMutation = useMutation({
    mutationFn: async (data) => base44.entities.HealthCoachSubscription.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['myCoachSubscription']);
    },
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ id, data }) => base44.entities.HealthCoachSubscription.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['myCoachSubscription']);
    },
  });

  const handleSubscribe = async () => {
    if (!user) {
      alert('Please login to continue');
      return;
    }

    if (!paymentGateway) {
      alert('Payment gateway not configured. Please contact support.');
      return;
    }

    setIsProcessingPayment(true);

    try {
      if (mySubscription && mySubscription.status === 'active') {
        await updateSubscriptionMutation.mutateAsync({
          id: mySubscription.id,
          data: { status: 'cancelled' }
        });
      }

      const originalAmount = billingCycle === 'yearly' ? plan.yearly_price : plan.monthly_price;
      const amount = appliedCoupon ? appliedCoupon.finalAmount : originalAmount;
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (billingCycle === 'yearly' ? 12 : 1));

      const subscriptionData = {
        coach_email: user.email,
        coach_name: user.full_name,
        plan_id: plan.id,
        plan_name: plan.plan_name,
        billing_cycle: billingCycle,
        amount,
        currency: 'INR',
        start_date: startDate,
        end_date: endDate.toISOString().split('T')[0],
        next_billing_date: endDate.toISOString().split('T')[0],
        status: 'pending',
        payment_method: 'razorpay',
        auto_renew: true,
        manually_granted: false,
        granted_by: null
      };

      const newSubscription = await createSubscriptionMutation.mutateAsync(subscriptionData);

      const { data: paymentOrder } = await base44.functions.invoke('createCoachPayment', {
        subscriptionId: newSubscription.id,
        amount: amount * 100,
        currency: 'INR',
        coachName: user.full_name,
        coachEmail: user.email,
        planName: plan.plan_name
      });

      const options = {
        key: paymentOrder.razorpay_key_id,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: 'Mealie Health Coach',
        description: `${plan.plan_name} - ${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}`,
        order_id: paymentOrder.order_id,
        prefill: {
          name: user.full_name,
          email: user.email,
        },
        theme: {
          color: '#9333EA'
        },
        handler: async function (response) {
          try {
            const { data: verification } = await base44.functions.invoke('verifyCoachPayment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              subscriptionId: newSubscription.id
            });

            if (verification.success) {
              if (appliedCoupon) {
                const usedBy = appliedCoupon.coupon.used_by || [];
                usedBy.push({
                  user_email: user.email,
                  used_at: new Date().toISOString(),
                  amount: amount
                });
                await base44.entities.Coupon.update(appliedCoupon.coupon.id, {
                  usage_count: (appliedCoupon.coupon.usage_count || 0) + 1,
                  used_by: usedBy
                });
              }

              await updateSubscriptionMutation.mutateAsync({
                id: newSubscription.id,
                data: {
                  status: 'active',
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  manually_granted: false,
                  granted_by: null
                }
              });

              await queryClient.invalidateQueries(['myCoachSubscription']);
              await queryClient.refetchQueries(['myCoachSubscription']);

              setIsProcessingPayment(false);
              setAppliedCoupon(null);
              alert('✅ Payment successful! Your plan is now active. Redirecting to dashboard...');
              window.location.href = '/#/CoachSubscriptions';
            } else {
              alert('❌ Payment verification failed. Please contact support.');
              setIsProcessingPayment(false);
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            alert('❌ Payment verification failed. Please contact support.');
            setIsProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessingPayment(false);
            alert('Payment cancelled.');
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

  if (!planId) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="w-5 h-5" />
          <AlertDescription>Invalid purchase link. Plan ID is missing.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (planLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="w-5 h-5" />
          <AlertDescription>Plan not found or inactive.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Subscribe to {plan.plan_name}</h1>
          <p className="text-gray-600">Complete your purchase to unlock premium features</p>
        </div>

        {mySubscription && mySubscription.status === 'active' && (
          <Alert className="bg-blue-50 border-blue-500">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            <AlertDescription>
              You already have an active subscription: {mySubscription.plan_name}. 
              Proceeding will cancel your current plan and activate this one.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-none shadow-xl">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
              <div className="flex items-center justify-between mb-2">
                <Crown className="w-8 h-8" />
                <Badge className="bg-white text-purple-600">COACH</Badge>
              </div>
              <CardTitle className="text-2xl">{plan.plan_name}</CardTitle>
              <div className="mt-3">
                <p className="text-3xl font-bold">₹{plan.monthly_price}<span className="text-sm">/mo</span></p>
                {plan.yearly_price > 0 && (
                  <p className="text-xl mt-2">₹{plan.yearly_price}<span className="text-sm">/year</span></p>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-gray-700">{plan.plan_description}</p>

              {plan.features?.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}

              <div className="pt-4 border-t space-y-1 text-sm text-gray-600">
                <p>📊 Max Clients: {plan.max_clients === -1 ? 'Unlimited' : plan.max_clients}</p>
                <p>💎 AI Credits: {plan.ai_credits_included === -1 ? 'Unlimited' : plan.ai_credits_included === 0 ? 'None' : `${plan.ai_credits_included}/month`}</p>
                {plan.can_add_payment_gateway && <p>💳 Custom Payment Gateway</p>}
                {plan.can_create_client_plans && <p>📋 Create Client Plans</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>Complete Purchase</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="font-semibold">Billing Cycle</label>
                <Select value={billingCycle} onValueChange={setBillingCycle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly - ₹{plan.monthly_price}</SelectItem>
                    {plan.yearly_price > 0 && (
                      <SelectItem value="yearly">Yearly - ₹{plan.yearly_price} (Save money!)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <CouponInput
                applicableTo="coach_plans"
                originalAmount={billingCycle === 'yearly' ? plan.yearly_price : plan.monthly_price}
                onCouponApplied={setAppliedCoupon}
                userEmail={user?.email}
              />

              <div className="space-y-2">
                <label className="font-semibold">Payment Method</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="razorpay">Razorpay (Card/UPI/Netbanking)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Alert>
                <CreditCard className="w-4 h-4" />
                <AlertDescription>
                  Payment will be processed securely through Razorpay
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleSubscribe}
                disabled={isProcessingPayment || !user}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing Payment...
                  </>
                ) : !user ? (
                  'Please Login to Continue'
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Proceed to Payment
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}