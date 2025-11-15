import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Crown, Check, TrendingUp, Users, AlertTriangle, Zap, Settings, CreditCard } from "lucide-react";

export default function WhiteLabelSubscription() {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');

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
    enabled: !!user,
  });

  const subscribeMutation = useMutation({
    mutationFn: async ({ plan, cycle }) => {
      const amount = cycle === 'monthly' ? plan.monthly : plan.yearly;
      const today = new Date();
      const endDate = new Date(today);
      
      if (cycle === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      const subscriptionData = {
        coach_email: user.email,
        coach_name: user.full_name,
        plan_type: plan.id,
        billing_cycle: cycle,
        amount: amount,
        start_date: today.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        next_billing_date: endDate.toISOString().split('T')[0],
        status: 'active',
        payment_method: 'razorpay',
        features: {
          client_limit: plan.clientLimit,
          can_add_payment_gateway: plan.canAddPaymentGateway,
          can_add_custom_domain: plan.canAddCustomDomain,
          white_label_enabled: true
        }
      };

      if (mySubscription) {
        return await base44.entities.Subscription.update(mySubscription.id, subscriptionData);
      } else {
        return await base44.entities.Subscription.create(subscriptionData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['mySubscription']);
      setSelectedPlan(null);
      alert('✅ Subscription updated successfully!');
    },
  });

  const cancelSubscription = useMutation({
    mutationFn: async () => {
      return await base44.entities.Subscription.update(mySubscription.id, {
        status: 'cancelled',
        auto_renew: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['mySubscription']);
      alert('✅ Subscription cancelled successfully!');
    },
  });

  const plans = [
    {
      id: 'basic',
      name: 'Basic White-Label',
      icon: Users,
      color: 'from-gray-500 to-slate-600',
      monthly: 0,
      yearly: 0,
      clientLimit: 50,
      canAddPaymentGateway: false,
      canAddCustomDomain: false,
      features: [
        'Up to 50 clients',
        'Client management',
        'Meal planning tools',
        'Basic white-label branding',
        'Standard support',
        'Platform payment gateway'
      ]
    },
    {
      id: 'advanced',
      name: 'Advanced White-Label',
      icon: TrendingUp,
      color: 'from-blue-500 to-cyan-600',
      monthly: 4999,
      yearly: 49999,
      clientLimit: 200,
      canAddPaymentGateway: true,
      canAddCustomDomain: true,
      popular: true,
      features: [
        'Everything in Basic',
        'Up to 200 clients',
        'Add your own payment gateway',
        'Custom domain support',
        'Advanced white-label branding',
        'Priority support'
      ]
    },
    {
      id: 'pro',
      name: 'Pro White-Label',
      icon: Crown,
      color: 'from-purple-500 to-pink-600',
      monthly: 9999,
      yearly: 99999,
      clientLimit: -1,
      canAddPaymentGateway: true,
      canAddCustomDomain: true,
      best: true,
      features: [
        'Everything in Advanced',
        'Unlimited clients',
        'Full white-label branding',
        'Custom domain + SSL',
        'Your own payment gateway',
        'API access',
        '24/7 priority support',
        'Dedicated account manager'
      ]
    }
  ];

  const handleSubscribe = (plan) => {
    if (plan.id === 'basic' && plan.monthly === 0) {
      subscribeMutation.mutate({ plan, cycle: 'monthly' });
    } else {
      setSelectedPlan(plan);
    }
  };

  const confirmSubscription = () => {
    subscribeMutation.mutate({ plan: selectedPlan, cycle: billingCycle });
  };

  if (!user || !['super_admin', 'team_member', 'student_coach'].includes(user.user_type)) {
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
            <p className="text-red-800">White-label subscriptions are only available for coaches.</p>
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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">White-Label Plans</h1>
            <p className="text-gray-600">Scale your business with your own branded platform</p>
          </div>
          <Zap className="w-10 h-10 text-purple-500" />
        </div>

        {mySubscription && mySubscription.status === 'active' && (
          <Alert className="bg-green-50 border-green-500">
            <Check className="w-5 h-5 text-green-600" />
            <AlertDescription className="flex items-center justify-between">
              <div>
                <strong>Active Plan:</strong> {mySubscription.plan_type.toUpperCase()} • 
                Billing: {mySubscription.billing_cycle} • 
                Next billing: {new Date(mySubscription.next_billing_date).toLocaleDateString()}
              </div>
              {mySubscription.plan_type !== 'basic' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm('Are you sure you want to cancel your subscription?')) {
                      cancelSubscription.mutate();
                    }
                  }}
                  className="text-red-600 hover:text-red-700 border-red-300"
                >
                  Cancel Subscription
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Alert className="bg-blue-50 border-blue-500">
          <Settings className="w-5 h-5 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>White-Label Platform:</strong> Run your own branded coaching business. Your clients will see your branding, not Mealie's.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(plan => {
            const PlanIcon = plan.icon;
            const isCurrentPlan = mySubscription?.plan_type === plan.id && mySubscription?.status === 'active';
            
            return (
              <Card key={plan.id} className={`border-none shadow-xl ${plan.popular || plan.best ? 'ring-4 ' + (plan.popular ? 'ring-blue-500' : 'ring-purple-500') : ''} ${isCurrentPlan ? 'ring-4 ring-green-500' : ''}`}>
                <CardHeader className={`bg-gradient-to-r ${plan.color} text-white`}>
                  <div className="flex items-center justify-between mb-2">
                    <PlanIcon className="w-8 h-8" />
                    {plan.popular && <Badge className="bg-blue-600">Popular</Badge>}
                    {plan.best && <Badge className="bg-purple-600">Best Value</Badge>}
                    {isCurrentPlan && <Badge className="bg-green-600">Current</Badge>}
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-3">
                    {plan.monthly === 0 ? (
                      <div>
                        <p className="text-4xl font-bold">FREE</p>
                        <p className="text-sm opacity-90 mt-1">Forever free</p>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="text-sm opacity-90">Monthly</p>
                          <p className="text-3xl font-bold">₹{plan.monthly}<span className="text-sm">/mo</span></p>
                        </div>
                        <div className="mt-2 p-2 bg-white/20 rounded">
                          <p className="text-sm opacity-90">Yearly</p>
                          <p className="text-3xl font-bold">₹{plan.yearly}<span className="text-sm">/year</span></p>
                          <p className="text-xs opacity-75">Save 2 months!</p>
                        </div>
                      </>
                    )}
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
                    onClick={() => handleSubscribe(plan)}
                    disabled={isCurrentPlan || subscribeMutation.isPending}
                    className={`w-full bg-gradient-to-r ${plan.color}`}
                  >
                    {isCurrentPlan ? 'Current Plan' : 
                     mySubscription && mySubscription.status === 'active' ? 'Upgrade/Downgrade' : 
                     plan.monthly === 0 ? 'Activate Free Plan' : 'Subscribe'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {selectedPlan && (
          <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Subscribe to {selectedPlan.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Billing Cycle</Label>
                  <Select value={billingCycle} onValueChange={setBillingCycle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly - ₹{selectedPlan.monthly}</SelectItem>
                      <SelectItem value="yearly">Yearly - ₹{selectedPlan.yearly} (Save 2 months!)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Alert className="bg-blue-50 border-blue-500">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    <strong>Amount:</strong> ₹{billingCycle === 'monthly' ? selectedPlan.monthly : selectedPlan.yearly}
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setSelectedPlan(null)} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmSubscription}
                    disabled={subscribeMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
                  >
                    {subscribeMutation.isPending ? 'Processing...' : 'Confirm & Pay'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}