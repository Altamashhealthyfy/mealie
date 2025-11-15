
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Crown, TrendingUp, Users, ArrowUpCircle, ArrowDownCircle, DollarSign, Calendar, CheckCircle2, Lock, Search } from "lucide-react";
import { format, addMonths, addYears } from "date-fns";

export default function ClientPlanManagement() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState("monthly");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: securitySettings } = useQuery({
    queryKey: ['securitySettings'],
    queryFn: async () => {
      const settings = await base44.entities.AppSecuritySettings.list();
      return settings[0] || null;
    },
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list('-created_date');
      if (user?.user_type === 'super_admin') {
        return allClients;
      }
      return allClients.filter(client => client.created_by === user?.email);
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: subscriptions } = useQuery({
    queryKey: ['clientSubscriptions'],
    queryFn: async () => {
      const allSubs = await base44.entities.ClientSubscription.list('-created_date');
      if (user?.user_type === 'super_admin') {
        return allSubs;
      }
      return allSubs.filter(sub => sub.created_by === user?.email);
    },
    enabled: !!user,
    initialData: [],
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.ClientSubscription.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clientSubscriptions']);
      queryClient.invalidateQueries(['clients']);
      setShowUpgradeDialog(false);
      setSelectedClient(null);
      alert("✅ Plan updated successfully!");
    },
  });

  const updateClientPlanMutation = useMutation({
    mutationFn: async ({ clientId, planTier }) => {
      return await base44.entities.Client.update(clientId, { plan_tier: planTier });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
    },
  });

  const handlePlanChange = (client, plan, cycle) => {
    const planPrices = securitySettings?.membership_plans?.[`${plan}_plan`];
    const amount = cycle === 'monthly' ? planPrices?.monthly_price : planPrices?.yearly_price;

    const startDate = new Date();
    const endDate = cycle === 'monthly' ? addMonths(startDate, 1) : addYears(startDate, 1);

    const subscriptionData = {
      client_id: client.id,
      client_email: client.email,
      client_name: client.full_name,
      plan_tier: plan,
      billing_cycle: cycle,
      amount: amount || 0,
      currency: planPrices?.currency || "INR",
      status: "active",
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      next_billing_date: format(endDate, 'yyyy-MM-dd'),
      payment_gateway: user?.payment_gateway_config?.razorpay_enabled ? "razorpay" : "manual",
      coach_email: user?.email,
    };

    createSubscriptionMutation.mutate(subscriptionData);
    updateClientPlanMutation.mutate({ clientId: client.id, planTier: plan });
  };

  const canManagePlans = () => {
    if (user?.user_type === 'super_admin') {
      return securitySettings?.super_admin_permissions?.can_manage_client_plans ?? true;
    }
    if (user?.user_type === 'team_member') {
      return securitySettings?.team_member_permissions?.can_manage_client_plans ?? true;
    }
    if (user?.user_type === 'student_coach') {
      return securitySettings?.student_coach_permissions?.can_manage_client_plans ?? true;
    }
    return false;
  };

  if (!canManagePlans()) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <Lock className="w-6 h-6" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-800">
              You don't have permission to manage client plans.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getClientSubscription = (clientId) => {
    return subscriptions.find(sub => sub.client_id === clientId && sub.status === 'active');
  };

  const filteredClients = clients.filter(client =>
    client.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const plans = [
    { key: 'basic', name: 'Basic Plan', icon: Users, color: 'from-gray-500 to-slate-600' },
    { key: 'advanced', name: 'Advanced Plan', icon: TrendingUp, color: 'from-blue-500 to-cyan-600' },
    { key: 'pro', name: 'Pro Plan', icon: Crown, color: 'from-purple-500 to-pink-600' }
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Client Plan Management</h1>
            <p className="text-gray-600">Upgrade or downgrade client subscription plans</p>
          </div>
          <Crown className="w-10 h-10 text-purple-500" />
        </div>

        <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => {
            const subscription = getClientSubscription(client.id);
            const currentPlan = client.plan_tier || 'basic';
            
            return (
              <Card key={client.id} className="border-none shadow-lg hover:shadow-xl transition-all">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    {client.profile_photo_url ? (
                      <img
                        src={client.profile_photo_url}
                        alt={client.full_name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-orange-500"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">
                          {client.full_name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{client.full_name}</CardTitle>
                      <p className="text-sm text-gray-600">{client.email}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Current Plan:</span>
                    <Badge className={`${
                      currentPlan === 'pro' ? 'bg-purple-600' :
                      currentPlan === 'advanced' ? 'bg-blue-600' :
                      'bg-gray-600'
                    } text-white capitalize`}>
                      {currentPlan} Plan
                    </Badge>
                  </div>

                  {subscription && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-semibold">₹{subscription.amount}/{subscription.billing_cycle}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Next Billing:</span>
                        <span className="font-semibold">{format(new Date(subscription.next_billing_date), 'MMM d, yyyy')}</span>
                      </div>
                      <Badge className="w-full justify-center bg-green-100 text-green-700">
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Active Subscription
                      </Badge>
                    </>
                  )}

                  <Dialog open={showUpgradeDialog && selectedClient?.id === client.id} onOpenChange={(open) => {
                    setShowUpgradeDialog(open);
                    if (!open) setSelectedClient(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        onClick={() => setSelectedClient(client)}
                      >
                        {currentPlan === 'pro' ? <ArrowDownCircle className="w-4 h-4 mr-2" /> : <ArrowUpCircle className="w-4 h-4 mr-2" />}
                        Change Plan
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-2xl">
                          Change Plan for {client.full_name}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label>Billing Cycle</Label>
                          <Select value={billingCycle} onValueChange={setBillingCycle}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="yearly">Yearly (Save more!)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-4">
                          {plans.map(plan => {
                            const planData = securitySettings?.membership_plans?.[`${plan.key}_plan`];
                            const price = billingCycle === 'monthly' ? planData?.monthly_price : planData?.yearly_price;
                            const PlanIcon = plan.icon;
                            
                            return (
                              <Card
                                key={plan.key}
                                className={`cursor-pointer border-2 transition-all hover:shadow-lg ${
                                  selectedPlan === plan.key ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                                }`}
                                onClick={() => setSelectedPlan(plan.key)}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-12 h-12 bg-gradient-to-br ${plan.color} rounded-lg flex items-center justify-center`}>
                                        <PlanIcon className="w-6 h-6 text-white" />
                                      </div>
                                      <div>
                                        <h3 className="font-bold text-lg">{planData?.plan_name || plan.name}</h3>
                                        <p className="text-sm text-gray-600 capitalize">{billingCycle} billing</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-2xl font-bold text-gray-900">₹{price}</p>
                                      <p className="text-xs text-gray-500">/{billingCycle === 'monthly' ? 'month' : 'year'}</p>
                                    </div>
                                  </div>
                                  {currentPlan === plan.key && (
                                    <Badge className="mt-3 bg-green-500 text-white">Current Plan</Badge>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>

                        <Button
                          onClick={() => {
                            if (!selectedPlan) {
                              alert("Please select a plan");
                              return;
                            }
                            handlePlanChange(client, selectedPlan, billingCycle);
                          }}
                          disabled={!selectedPlan || createSubscriptionMutation.isPending}
                          className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        >
                          {createSubscriptionMutation.isPending ? 'Processing...' : 'Confirm Plan Change'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredClients.length === 0 && (
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Clients Found</h3>
              <p className="text-gray-600">Add clients to manage their plans</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
