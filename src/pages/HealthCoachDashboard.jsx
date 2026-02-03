import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Crown,
  Users,
  Calendar,
  Sparkles,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  CreditCard,
  Package,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function HealthCoachDashboard() {
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ['coachSubscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.HealthCoachSubscription.filter({
        coach_email: user?.email,
        status: 'active'
      });
      return subs[0] || null;
    },
    enabled: !!user,
  });

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ['coachPlan', subscription?.plan_id],
    queryFn: async () => {
      const plans = await base44.entities.HealthCoachPlan.filter({ id: subscription?.plan_id });
      return plans[0] || null;
    },
    enabled: !!subscription?.plan_id,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['coachClients', user?.email],
    queryFn: async () => {
      return await base44.entities.Client.filter({
        assigned_coach: user?.email,
        status: 'active'
      });
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: creditTransactions = [] } = useQuery({
    queryKey: ['creditTransactions', user?.email],
    queryFn: async () => {
      const transactions = await base44.entities.AICreditsTransaction.filter({
        coach_email: user?.email
      });
      return transactions.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 5);
    },
    enabled: !!user,
    initialData: [],
  });

  if (userLoading || subLoading || planLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto text-orange-500 mb-4 animate-spin" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (user?.user_type !== 'student_coach') {
    return (
      <div className="p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-900">
            This dashboard is only available for health coaches.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="w-4 h-4 text-orange-600" />
          <AlertDescription className="text-orange-900">
            You don't have an active subscription. Please subscribe to a plan to access the platform.
          </AlertDescription>
        </Alert>
        <div className="mt-6 flex justify-center">
          <Link to={createPageUrl("CoachSubscriptions")}>
            <Button className="bg-gradient-to-r from-orange-500 to-red-500">
              View Available Plans
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const daysUntilBilling = subscription.next_billing_date
    ? Math.ceil((new Date(subscription.next_billing_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const availableCredits = (() => {
    const monthlyIncluded = plan?.ai_credits_included || 0;
    const purchased = subscription?.ai_credits_purchased || 0;
    const used = subscription?.ai_credits_used_this_month || 0;
    
    if (monthlyIncluded === -1) return { available: "Unlimited", total: "Unlimited", percentage: 100 };
    
    const total = monthlyIncluded + purchased;
    const available = total - used;
    const percentage = total > 0 ? ((available / total) * 100) : 0;
    
    return { available, total, percentage, used };
  })();

  const planFeatures = [
    { key: 'max_clients', label: 'Max Clients', value: plan?.max_clients === -1 ? 'Unlimited' : plan?.max_clients },
    { key: 'can_access_pro_plans', label: 'Pro Plans Access', enabled: plan?.can_access_pro_plans },
    { key: 'can_create_client_plans', label: 'Create Client Plans', enabled: plan?.can_create_client_plans },
    { key: 'can_add_payment_gateway', label: 'Payment Gateway', enabled: plan?.can_add_payment_gateway },
    { key: 'can_custom_domain', label: 'Custom Domain', enabled: plan?.can_custom_domain },
    { key: 'can_manage_team', label: 'Team Management', enabled: plan?.can_manage_team },
    { key: 'can_access_finance_manager', label: 'Finance Manager', enabled: plan?.can_access_finance_manager },
    { key: 'can_access_marketing_hub', label: 'Marketing Hub', enabled: plan?.can_access_marketing_hub },
    { key: 'can_access_business_gpts', label: 'Business GPTs', enabled: plan?.can_access_business_gpts },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Health Coach Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back, {user?.full_name}</p>
          </div>
          <Link to={createPageUrl("CoachSubscriptions")}>
            <Button variant="outline">
              <Crown className="w-4 h-4 mr-2" />
              Manage Subscription
            </Button>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Active Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{clients.length}</div>
              <p className="text-xs text-gray-500 mt-1">
                {plan?.max_clients === -1 ? 'Unlimited' : `of ${plan?.max_clients} max`}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                AI Credits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {typeof availableCredits.available === 'number' 
                  ? availableCredits.available.toLocaleString()
                  : availableCredits.available}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {typeof availableCredits.total === 'number'
                  ? `of ${availableCredits.total} total`
                  : 'available'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-green-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Next Billing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {daysUntilBilling !== null ? daysUntilBilling : '--'}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {daysUntilBilling !== null ? 'days remaining' : 'N/A'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Plan Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                ₹{(subscription.billing_cycle === 'yearly' ? plan?.yearly_price : plan?.monthly_price)?.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                per {subscription.billing_cycle === 'yearly' ? 'year' : 'month'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Plan Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="w-5 h-5 text-orange-500" />
                      {plan?.plan_name}
                    </CardTitle>
                    <CardDescription className="mt-1">{plan?.plan_description}</CardDescription>
                  </div>
                  <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                    {subscription.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Billing Cycle</p>
                    <p className="font-semibold capitalize">{subscription.billing_cycle}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Start Date</p>
                    <p className="font-semibold">{new Date(subscription.start_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">End Date</p>
                    <p className="font-semibold">{new Date(subscription.end_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Auto Renew</p>
                    <p className="font-semibold">{subscription.auto_renew ? 'Yes' : 'No'}</p>
                  </div>
                </div>

                {typeof availableCredits.percentage === 'number' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">AI Credits Usage</span>
                      <span className="font-semibold">
                        {availableCredits.used} / {availableCredits.total} used
                      </span>
                    </div>
                    <Progress value={100 - availableCredits.percentage} className="h-2" />
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Link to={createPageUrl("PurchaseAICredits")} className="flex-1">
                    <Button variant="outline" className="w-full">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Buy AI Credits
                    </Button>
                  </Link>
                  <Link to={createPageUrl("CoachSubscriptions")} className="flex-1">
                    <Button className="w-full bg-gradient-to-r from-orange-500 to-red-500">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Upgrade Plan
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Plan Features */}
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-orange-500" />
                  Plan Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {planFeatures.map((feature) => (
                    <div key={feature.key} className="flex items-center gap-2 text-sm">
                      {feature.enabled !== undefined ? (
                        feature.enabled ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        )
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                      )}
                      <span className={feature.enabled === false ? 'text-gray-400' : 'text-gray-700'}>
                        {feature.label}{feature.value && `: ${feature.value}`}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Recent Credit Transactions */}
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-orange-500" />
                  Recent Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {creditTransactions.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No transactions yet</p>
                ) : (
                  <div className="space-y-3">
                    {creditTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2 last:border-0">
                        <div>
                          <p className="font-medium text-gray-900">{transaction.transaction_type}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(transaction.created_date).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`font-semibold ${
                          transaction.credits_amount > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.credits_amount > 0 ? '+' : ''}{transaction.credits_amount}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <Link to={createPageUrl("PurchaseAICredits")}>
                  <Button variant="link" className="w-full mt-3 text-orange-600">
                    View All Transactions
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link to={createPageUrl("ClientManagement")}>
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="w-4 h-4 mr-2" />
                    Manage Clients
                  </Button>
                </Link>
                <Link to={createPageUrl("CoachPaymentSetup")}>
                  <Button variant="outline" className="w-full justify-start">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Payment Setup
                  </Button>
                </Link>
                <Link to={createPageUrl("ClientPlanBuilder")}>
                  <Button variant="outline" className="w-full justify-start">
                    <Package className="w-4 h-4 mr-2" />
                    Create Client Plans
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}