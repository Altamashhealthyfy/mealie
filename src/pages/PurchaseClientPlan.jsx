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
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [formErrors, setFormErrors] = useState({});

  const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
  const planId = urlParams.get('planId');

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        return null;
      }
    },
    retry: false,
  });

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ['clientPlan', planId],
    queryFn: async () => {
      const plans = await base44.entities.ClientPlanDefinition.filter({ id: planId, status: 'active' });
      return plans[0] || null;
    },
    enabled: !!planId,
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
    if (user) {
      setFullName(user.full_name || "");
      setEmail(user.email || "");
    }
  }, [user]);

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

  const validateForm = () => {
    const errors = {};
    if (!fullName.trim()) errors.fullName = "Full Name is required";
    if (!email.trim()) errors.email = "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Invalid email format";
    if (!mobileNumber.trim()) errors.mobileNumber = "Mobile Number is required";
    if (!/^[0-9]{10}$/.test(mobileNumber)) errors.mobileNumber = "Invalid mobile number (10 digits)";
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePurchase = async () => {
    if (!validateForm()) {
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

      let clientId;
      let clientEmail = email;
      let clientName = fullName;

      // Check if client exists with this email
      const existingClients = await base44.entities.Client.filter({ email: email });
      if (existingClients.length > 0) {
        clientId = existingClients[0].id;
        // Update phone if missing
        if (!existingClients[0].phone) {
          await base44.entities.Client.update(clientId, { phone: mobileNumber });
        }
      } else {
        // Create new client
        const newClient = await base44.entities.Client.create({
          full_name: fullName,
          email: email,
          phone: mobileNumber,
          status: 'active',
          join_date: startDate,
        });
        clientId = newClient.id;
      }

      const subscriptionData = {
        client_id: clientId,
        client_email: clientEmail,
        client_name: clientName,
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
        clientName: fullName,
        clientEmail: email,
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
          name: fullName,
          email: email,
          contact: mobileNumber
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
              if (appliedCoupon) {
                const usedBy = appliedCoupon.coupon.used_by || [];
                usedBy.push({
                  user_email: email,
                  used_at: new Date().toISOString(),
                  amount: amount
                });
                await base44.entities.Coupon.update(appliedCoupon.coupon.id, {
                  usage_count: (appliedCoupon.coupon.usage_count || 0) + 1,
                  used_by: usedBy
                });
              }

              await createSubscriptionMutation.mutateAsync({
                ...subscriptionData,
                id: newSubscription.id,
                status: 'active',
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id
              });

              setIsProcessingPayment(false);
              setAppliedCoupon(null);
              alert('✅ Payment successful! Your plan is now active.');
              window.location.href = '/';
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
      <div className="min-h-screen p-8 flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <Alert className="max-w-md">
          <AlertCircle className="w-5 h-5" />
          <AlertDescription>Invalid purchase link. Plan ID is missing.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (planLoading || userLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <Alert className="max-w-md">
          <AlertCircle className="w-5 h-5" />
          <AlertDescription>Plan not found or inactive.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{plan.plan_name}</h1>
          <p className="text-gray-600">Complete your purchase to start your health journey</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Plan Details */}
          <Card className="border-none shadow-xl md:col-span-2">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8" />
                <Badge className="bg-white text-orange-600">HEALTH PLAN</Badge>
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

          {/* Purchase Form */}
          <Card className="border-none shadow-xl">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
              <CardTitle>Purchase Details</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    formErrors.fullName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                {formErrors.fullName && <p className="text-red-500 text-xs mt-1">{formErrors.fullName}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    formErrors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
              </div>

              {/* Mobile */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    formErrors.mobileNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="10-digit mobile number"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                />
                {formErrors.mobileNumber && <p className="text-red-500 text-xs mt-1">{formErrors.mobileNumber}</p>}
              </div>

              <CouponInput
                applicableTo="client_plans"
                originalAmount={plan.price}
                onCouponApplied={setAppliedCoupon}
                userEmail={email}
              />

              <Alert>
                <CreditCard className="w-4 h-4" />
                <AlertDescription className="text-xs">
                  Payment secured by Razorpay
                </AlertDescription>
              </Alert>

              <Button
                onClick={handlePurchase}
                disabled={isProcessingPayment || !fullName || !email || !mobileNumber || Object.keys(formErrors).length > 0}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-3"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pay ₹{appliedCoupon ? appliedCoupon.finalAmount : plan.price}
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