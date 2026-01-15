import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, Users, Loader2, CreditCard, AlertCircle, CheckCircle } from "lucide-react";
import CouponInput from "@/components/payments/CouponInput";

export default function PurchaseClientPlan() {
  const queryClient = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
  const planId = urlParams.get('planId');

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

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ['clientPlan', planId],
    queryFn: async () => {
      const plans = await base44.entities.ClientPlanDefinition.filter({ id: planId, status: 'active' });
      return plans[0] || null;
    },
    enabled: !!planId,
  });

  const { data: mySubscription } = useQuery({
    queryKey: ['myClientSubscription', clientProfile?.id],
    queryFn: async () => {
      const subs = await base44.entities.ClientSubscription.filter({
        client_id: clientProfile?.id,
        status: 'active'
      });
      return subs[0] || null;
    },
    enabled: !!clientProfile?.id,
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
    mutationFn: async (data) => base44.entities.ClientSubscription.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['myClientSubscription']);
    },
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ id, data }) => base44.entities.ClientSubscription.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['myClientSubscription']);
    },
  });

  const handlePurchase = async () => {
    if (!user || !clientProfile) {
      alert('Please login as a client to continue');
      return;
    }

    if (!paymentGateway) {
      alert('Payment gateway not configured. Please contact support.');
      return;
    }

    setIsProcessingPayment(true);

    try {
      const originalAmount = plan.price;
      const amount = appliedCoupon ? appliedCoupon.finalAmount : originalAmount;
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + plan.duration_days);

      const subscriptionData = {
        client_id: clientProfile.id,
        client_email: user.email,
        client_name: user.full_name,
        plan_id: plan.id,
        plan_name: plan.plan_name,
        plan_tier: 'custom',
        duration_days: plan.duration_days,
        amount,
        currency: 'INR',
        start_date: startDate,
        end_date: endDate.toISOString().split('T')[0],
        status: 'pending',
        payment_method: 'razorpay',
        auto_renew: false
      };

      const newSubscription = await createSubscriptionMutation.mutateAsync(subscriptionData);

      const { data: paymentOrder } = await base44.functions.invoke('createClientPayment', {
        subscriptionId: newSubscription.id,
        amount: amount * 100,
        currency: 'INR',
        clientName: user.full_name,
        clientEmail: user.email,
        planName: plan.plan_name
      });

      const options = {
        key: paymentOrder.razorpay_key_id,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: 'Health Coaching Plan',
        description: `${plan.plan_name} - ${plan.duration_days} Days`,
        order_id: paymentOrder.order_id,
        prefill: {
          name: user.full_name,
          email: user.email,
        },
        theme: {
          color: '#3B82F6'
        },
        handler: async function (response) {
          try {
            const { data: verification } = await base44.functions.invoke('verifyClientPayment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              subscriptionId: newSubscription.id
            });

            if (verification.success) {
              // Cancel old subscription only after new payment succeeds
              if (mySubscription && mySubscription.status === 'active') {
                await updateSubscriptionMutation.mutateAsync({
                  id: mySubscription.id,
                  data: { status: 'cancelled' }
                });
              }

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
                  razorpay_order_id: response.razorpay_order_id
                }
              });

              await queryClient.invalidateQueries(['myClientSubscription']);
              await queryClient.refetchQueries(['myClientSubscription']);

              setIsProcessingPayment(false);
              setAppliedCoupon(null);
              alert('✅ Payment successful! Your plan is now active. Redirecting...');
              window.location.href = '/#/ClientPlans';
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Purchase {plan.plan_name}</h1>
          <p className="text-gray-600">Complete your purchase to start your health journey</p>
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
            <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8" />
                <Badge className="bg-white text-blue-600">HEALTH PLAN</Badge>
              </div>
              <CardTitle className="text-2xl">{plan.plan_name}</CardTitle>
              <div className="mt-3">
                <p className="text-3xl font-bold">₹{plan.price}</p>
                <p className="text-sm">{plan.duration_days} days program</p>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-gray-700">{plan.plan_description}</p>

              {plan.health_focus?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Health Focus:</p>
                  <div className="flex flex-wrap gap-2">
                    {plan.health_focus.map((focus, idx) => (
                      <Badge key={idx} variant="outline">{focus}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {plan.features?.length > 0 && (
                <div className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>Complete Purchase</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CouponInput
                applicableTo="client_plans"
                originalAmount={plan.price}
                onCouponApplied={setAppliedCoupon}
                userEmail={user?.email}
              />

              <Alert>
                <CreditCard className="w-4 h-4" />
                <AlertDescription>
                  Payment will be processed securely through Razorpay
                </AlertDescription>
              </Alert>

              <Button
                onClick={handlePurchase}
                disabled={isProcessingPayment || !user || user.user_type !== 'client'}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-600"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing Payment...
                  </>
                ) : !user ? (
                  'Please Login to Continue'
                ) : user.user_type !== 'client' ? (
                  'Only Clients Can Purchase'
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