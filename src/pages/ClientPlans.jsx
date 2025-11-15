import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, AlertTriangle, CreditCard, Users, TrendingUp, Crown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ClientPlans() {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');

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
        status: 'active'
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

  const subscribeMutation = useMutation({
    mutationFn: async (data) => base44.entities.ClientSubscription.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['myClientSubscription']);
      setSelectedPlan(null);
      alert('✅ Plan activated! Please wait for payment confirmation.');
    },
  });

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

  const handleSubscribe = (plan) => {
    if (!clientProfile) {
      alert('Client profile not found');
      return;
    }

    const amount = billingCycle === 'yearly' ? plan.yearly : plan.monthly;
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (billingCycle === 'yearly' ? 12 : 1));

    subscribeMutation.mutate({
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
    });
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

        {mySubscription && (
          <Alert className="bg-green-50 border-green-500">
            <Check className="w-5 h-5 text-green-600" />
            <AlertDescription>
              <strong>Active Plan:</strong> {mySubscription.plan_tier.toUpperCase()} • 
              Billing: {mySubscription.billing_cycle} • 
              Next billing: {new Date(mySubscription.next_billing_date).toLocaleDateString()}
            </AlertDescription>
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
                    disabled={mySubscription?.plan_tier === plan.id}
                    className={`w-full bg-gradient-to-r ${plan.color}`}
                  >
                    {mySubscription?.plan_tier === plan.id ? 'Current Plan' : 
                     mySubscription ? 'Upgrade/Downgrade' : 'Subscribe'}
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
                disabled={subscribeMutation.isPending}
                className="w-full"
              >
                {subscribeMutation.isPending ? 'Processing...' : 'Confirm & Request Payment'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}