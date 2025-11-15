import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Crown, TrendingUp, Users, AlertTriangle, CreditCard, ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";

export default function WhiteLabelSubscription() {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [confirmDialog, setConfirmDialog] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: mySubscription } = useQuery({
    queryKey: ['mySubscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({ 
        coach_email: user?.email,
        status: 'active'
      });
      return subs[0] || null;
    },
    enabled: !!user && user.user_type === 'student_coach',
  });

  const { data: securitySettings } = useQuery({
    queryKey: ['securitySettings'],
    queryFn: async () => {
      const settings = await base44.entities.AppSecuritySettings.list();
      return settings[0] || null;
    },
  });

  const changePlanMutation = useMutation({
    mutationFn: async (planData) => {
      if (mySubscription) {
        return await base44.entities.Subscription.update(mySubscription.id, planData);
      } else {
        return await base44.entities.Subscription.create(planData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['mySubscription']);
      setConfirmDialog(false);
      alert('✅ Plan updated successfully!');
    },
  });

  if (user?.user_type !== 'student_coach') {
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
            <p className="text-red-800">This page is only for Health Coaches.</p>
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
        'Up to 50 clients',
        'Basic meal planning',
        '5 AI generations/month',
        'Email support',
        'Basic analytics'
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
        'Unlimited clients',
        'Advanced meal planning',
        '40 AI generations/month',
        'Priority support',
        'Advanced analytics',
        'White-label branding',
        'Payment gateway integration'
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
        'Unlimited AI generations',
        'Custom domain',
        'API access',
        'Dedicated support',
        'Team management',
        'Business tools suite'
      ]
    }
  ];

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setConfirmDialog(true);
  };

  const handleConfirmChange = () => {
    const amount = billingCycle === 'yearly' ? selectedPlan.yearly : selectedPlan.monthly;
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (billingCycle === 'yearly' ? 12 : 1));

    const planData = {
      coach_email: user.email,
      coach_name: user.full_name,
      plan_type: selectedPlan.id,
      billing_cycle: billingCycle,
      amount,
      currency: 'INR',
      start_date: startDate,
      end_date: endDate.toISOString().split('T')[0],
      next_billing_date: endDate.toISOString().split('T')[0],
      status: 'active',
      auto_renew: true
    };

    changePlanMutation.mutate(planData);
  };

  const isUpgrade = (planId) => {
    if (!mySubscription) return true;
    const planOrder = { basic: 1, advanced: 2, pro: 3 };
    return planOrder[planId] > planOrder[mySubscription.plan_type];
  };

  const isDowngrade = (planId) => {
    if (!mySubscription) return false;
    const planOrder = { basic: 1, advanced: 2, pro: 3 };
    return planOrder[planId] < planOrder[mySubscription.plan_type];
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My White-Label Plan</h1>
            <p className="text-gray-600">Manage your subscription and features</p>
          </div>
          <Crown className="w-10 h-10 text-purple-500" />
        </div>

        {mySubscription && (
          <Alert className="bg-green-50 border-green-500">
            <Check className="w-5 h-5 text-green-600" />
            <AlertDescription className="text-green-900">
              <strong>Current Plan:</strong> {mySubscription.plan_type.toUpperCase()} • 
              Billing: {mySubscription.billing_cycle} • 
              Next billing: {format(new Date(mySubscription.next_billing_date), 'MMM d, yyyy')}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(plan => {
            const PlanIcon = plan.icon;
            const isCurrent = mySubscription?.plan_type === plan.id;
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
                    onClick={() => handlePlanSelect(plan)}
                    disabled={isCurrent}
                    className={`w-full ${isCurrent ? 'bg-gray-400' : `bg-gradient-to-r ${plan.color}`}`}
                  >
                    {isCurrent ? (
                      <>Current Plan</>
                    ) : isUpgrade(plan.id) ? (
                      <><ArrowUp className="w-4 h-4 mr-2" />Upgrade</>
                    ) : (
                      <><ArrowDown className="w-4 h-4 mr-2" />Downgrade</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isUpgrade(selectedPlan?.id) ? 'Upgrade' : 'Downgrade'} to {selectedPlan?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
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

              {isUpgrade(selectedPlan?.id) ? (
                <Alert className="bg-blue-50 border-blue-500">
                  <CreditCard className="w-4 h-4" />
                  <AlertDescription className="text-blue-900">
                    <strong>Payment Required:</strong> You'll be redirected to payment gateway to complete your upgrade.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-green-50 border-green-500">
                  <Check className="w-4 h-4" />
                  <AlertDescription className="text-green-900">
                    <strong>No Payment Required:</strong> Downgrade will take effect immediately.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleConfirmChange}
                disabled={changePlanMutation.isPending}
                className="w-full"
              >
                {changePlanMutation.isPending ? 'Processing...' : 'Confirm Change'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}