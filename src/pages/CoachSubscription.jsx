import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Star, Crown, Check, AlertTriangle, CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CoachSubscription() {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: currentSubscription } = useQuery({
    queryKey: ['mySubscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({ coach_email: user?.email, status: 'active' });
      return subs[0] || null;
    },
    enabled: !!user,
  });

  const subscribeMutation = useMutation({
    mutationFn: async (data) => base44.entities.Subscription.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['mySubscription']);
      setSelectedPlan(null);
      alert('✅ Subscription activated successfully!');
    },
  });

  const plans = [
    {
      id: 'student',
      name: 'Student',
      icon: Sparkles,
      color: 'from-blue-500 to-cyan-500',
      monthly: 499,
      yearly: 5988,
      clientLimit: 10,
      features: [
        'Up to 10 clients',
        '5 AI meal plans/month',
        'Unlimited manual plans',
        'Unlimited templates (FREE)',
        'Basic business tools',
        'Email support'
      ]
    },
    {
      id: 'professional',
      name: 'Professional',
      icon: Star,
      color: 'from-orange-500 to-red-500',
      monthly: 1499,
      yearly: 17988,
      clientLimit: 50,
      popular: true,
      features: [
        'Up to 50 clients',
        '20 AI meal plans/month',
        '10 AI Pro plans/month',
        'Unlimited manual & templates',
        'Team management (2 members)',
        'Full business tools',
        'Priority support'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      icon: Crown,
      color: 'from-purple-500 to-indigo-500',
      yearly: 29999,
      clientLimit: -1,
      best: true,
      features: [
        'Unlimited clients',
        'Unlimited AI generations',
        'Unlimited Pro plans',
        'White-label branding',
        'Unlimited team members',
        'API access',
        '24/7 priority support',
        'Custom features'
      ]
    }
  ];

  const handleSubscribe = (plan) => {
    if (plan.id === 'premium' && billingCycle === 'monthly') {
      alert('Premium plan is only available yearly');
      return;
    }

    const amount = billingCycle === 'yearly' ? plan.yearly : plan.monthly;
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (billingCycle === 'yearly' ? 12 : 1));

    subscribeMutation.mutate({
      coach_email: user.email,
      coach_name: user.full_name,
      plan_type: plan.id,
      billing_cycle: billingCycle,
      amount,
      currency: 'INR',
      start_date: startDate,
      end_date: endDate.toISOString().split('T')[0],
      status: 'active',
      payment_method: 'razorpay',
      client_limit: plan.clientLimit,
      auto_renew: true
    });
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Subscription</h1>
            <p className="text-gray-600">Manage your platform subscription</p>
          </div>
        </div>

        {currentSubscription && (
          <Alert className="bg-green-50 border-green-500">
            <Check className="w-5 h-5 text-green-600" />
            <AlertDescription>
              <strong>Active Plan:</strong> {currentSubscription.plan_type.toUpperCase()} • 
              Billing: {currentSubscription.billing_cycle} • 
              Expires: {new Date(currentSubscription.end_date).toLocaleDateString()}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(plan => {
            const PlanIcon = plan.icon;
            return (
              <Card key={plan.id} className={`border-none shadow-xl ${plan.popular || plan.best ? 'ring-4 ' + (plan.popular ? 'ring-orange-500' : 'ring-purple-500') : ''}`}>
                <CardHeader className={`bg-gradient-to-r ${plan.color} text-white`}>
                  <div className="flex items-center justify-between mb-2">
                    <PlanIcon className="w-8 h-8" />
                    {plan.popular && <Badge className="bg-orange-600">Popular</Badge>}
                    {plan.best && <Badge className="bg-purple-600">Best Value</Badge>}
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-3">
                    {plan.monthly && (
                      <div>
                        <p className="text-sm opacity-90">Monthly</p>
                        <p className="text-3xl font-bold">₹{plan.monthly}<span className="text-sm">/mo</span></p>
                      </div>
                    )}
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
                    disabled={currentSubscription?.plan_type === plan.id}
                    className={`w-full bg-gradient-to-r ${plan.color}`}
                  >
                    {currentSubscription?.plan_type === plan.id ? 'Current Plan' : 'Subscribe'}
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
                    {selectedPlan?.monthly && <SelectItem value="monthly">Monthly - ₹{selectedPlan.monthly}</SelectItem>}
                    <SelectItem value="yearly">Yearly - ₹{selectedPlan?.yearly} (Save money!)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Alert>
                <CreditCard className="w-4 h-4" />
                <AlertDescription>
                  Payment will be processed via Razorpay
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => handleSubscribe(selectedPlan)}
                disabled={subscribeMutation.isPending}
                className="w-full"
              >
                {subscribeMutation.isPending ? 'Processing...' : 'Confirm & Pay'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}