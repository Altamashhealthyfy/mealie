import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  TrendingUp,
  Users,
  Zap,
  AlertTriangle,
  CheckCircle,
  Download,
  Calendar,
  Shield
} from "lucide-react";
import { format } from "date-fns";

export default function UsageDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allUsage } = useQuery({
    queryKey: ['allUsage', selectedMonth],
    queryFn: async () => {
      const usage = await base44.entities.UsageTracking.filter({ month: selectedMonth });
      return usage;
    },
    initialData: [],
  });

  const { data: aiTransactions } = useQuery({
    queryKey: ['aiTransactions', selectedMonth],
    queryFn: async () => {
      const startOfMonth = new Date(selectedMonth + '-01');
      const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0);
      
      const txns = await base44.entities.AICreditsTransaction.list('-created_date');
      return txns.filter(txn => {
        const txnDate = new Date(txn.created_date);
        return txnDate >= startOfMonth && txnDate <= endOfMonth;
      });
    },
    initialData: [],
  });

  const { data: users } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.user_type !== 'client'); // Only coaches
    },
    initialData: [],
  });

  // Cost calculations
  const COSTS = {
    ai_meal_plan: 10,
    ai_recipe: 5,
    food_lookup: 2,
    business_gpt: 8,
    email: 0.5
  };

  const calculateTotalCost = (usageRecord) => {
    const mealPlanCost = (usageRecord.ai_meal_plans_generated || 0) * COSTS.ai_meal_plan;
    const recipeCost = (usageRecord.ai_recipes_generated || 0) * COSTS.ai_recipe;
    const foodLookupCost = (usageRecord.food_lookups || 0) * COSTS.food_lookup;
    const gptCost = (usageRecord.business_gpt_queries || 0) * COSTS.business_gpt;
    const emailCost = (usageRecord.emails_sent || 0) * COSTS.email;
    
    return mealPlanCost + recipeCost + foodLookupCost + gptCost + emailCost;
  };

  // Count AI meal plans from transactions
  const aiMealPlansFromTransactions = aiTransactions.filter(
    txn => txn.transaction_type === 'usage' && txn.feature_used === 'ai_meal_plan_pro'
  ).length;

  const totalMonthlySpend = allUsage.reduce((sum, usage) => sum + calculateTotalCost(usage), 0);
  
  const breakdown = {
    mealPlans: allUsage.reduce((sum, u) => sum + (u.ai_meal_plans_generated || 0), 0) + aiMealPlansFromTransactions,
    recipes: allUsage.reduce((sum, u) => sum + (u.ai_recipes_generated || 0), 0),
    foodLookups: allUsage.reduce((sum, u) => sum + (u.food_lookups || 0), 0),
    businessGPT: allUsage.reduce((sum, u) => sum + (u.business_gpt_queries || 0), 0),
    emails: allUsage.reduce((sum, u) => sum + (u.emails_sent || 0), 0),
  };

  const breakdownCosts = {
    mealPlans: breakdown.mealPlans * COSTS.ai_meal_plan,
    recipes: breakdown.recipes * COSTS.ai_recipe,
    foodLookups: breakdown.foodLookups * COSTS.food_lookup,
    businessGPT: breakdown.businessGPT * COSTS.business_gpt,
    emails: breakdown.emails * COSTS.email,
  };

  // Revenue calculations (assuming average ₹499 per student coach)
  const studentCoaches = users.filter(u => u.user_type === 'student_coach').length;
  const monthlyRevenue = studentCoaches * 499;
  const profit = monthlyRevenue - totalMonthlySpend;
  const profitMargin = monthlyRevenue > 0 ? ((profit / monthlyRevenue) * 100).toFixed(1) : 0;

  const userType = user?.user_type || 'client';
  
  if (userType !== 'super_admin') {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl">
          <CardHeader>
            <Shield className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <CardTitle className="text-center text-2xl">Super Admin Only</CardTitle>
            <CardDescription className="text-center">
              Usage & billing dashboard is only for platform administrators
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Badge className="bg-purple-600 text-white mb-2">
              <Shield className="w-4 h-4 mr-1" />
              Super Admin
            </Badge>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Usage & Billing Dashboard</h1>
            <p className="text-gray-600">Track your platform costs and profitability</p>
          </div>
          <Button className="bg-green-500 hover:bg-green-600">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Month Selector */}
        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Calendar className="w-5 h-5 text-gray-600" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex-1 p-2 border rounded-lg"
              >
                {[...Array(6)].map((_, i) => {
                  const date = new Date();
                  date.setMonth(date.getMonth() - i);
                  const monthStr = format(date, 'yyyy-MM');
                  return (
                    <option key={monthStr} value={monthStr}>
                      {format(date, 'MMMM yyyy')}
                    </option>
                  );
                })}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-red-500" />
                <Badge className="bg-red-500 text-white">Cost</Badge>
              </div>
              <p className="text-3xl font-bold text-gray-900">₹{totalMonthlySpend.toFixed(0)}</p>
              <p className="text-sm text-gray-600">Total Spend This Month</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-green-500" />
                <Badge className="bg-green-500 text-white">Revenue</Badge>
              </div>
              <p className="text-3xl font-bold text-gray-900">₹{monthlyRevenue.toFixed(0)}</p>
              <p className="text-sm text-gray-600">{studentCoaches} Student Coaches</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-blue-500" />
                <Badge className="bg-blue-500 text-white">Profit</Badge>
              </div>
              <p className="text-3xl font-bold text-gray-900">₹{profit.toFixed(0)}</p>
              <p className="text-sm text-gray-600">{profitMargin}% Margin</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 text-purple-500" />
                <Badge className="bg-purple-500 text-white">Active</Badge>
              </div>
              <p className="text-3xl font-bold text-gray-900">{allUsage.length}</p>
              <p className="text-sm text-gray-600">Active Users</p>
            </CardContent>
          </Card>
        </div>

        {/* Profit Alert */}
        {profit < 0 ? (
          <Alert className="border-red-500 bg-red-50">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <AlertDescription className="ml-2">
              <strong>⚠️ WARNING:</strong> You're losing ₹{Math.abs(profit).toFixed(0)} this month! 
              Students are using too much AI. Push them to use templates instead.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <AlertDescription className="ml-2">
              <strong>✅ HEALTHY:</strong> You're making ₹{profit.toFixed(0)} profit this month ({profitMargin}% margin)
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="breakdown" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur">
            <TabsTrigger value="breakdown">Cost Breakdown</TabsTrigger>
            <TabsTrigger value="users">Per User Usage</TabsTrigger>
            <TabsTrigger value="recommendations">Optimization</TabsTrigger>
          </TabsList>

          {/* COST BREAKDOWN */}
          <TabsContent value="breakdown" className="space-y-4">
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle>Cost Breakdown - {format(new Date(selectedMonth), 'MMMM yyyy')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Zap className="w-6 h-6 text-orange-500" />
                      <div>
                        <p className="font-semibold">AI Meal Plans</p>
                        <p className="text-sm text-gray-600">{breakdown.mealPlans} generations × ₹{COSTS.ai_meal_plan}</p>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-orange-700">₹{breakdownCosts.mealPlans.toFixed(0)}</p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Zap className="w-6 h-6 text-green-500" />
                      <div>
                        <p className="font-semibold">AI Recipes</p>
                        <p className="text-sm text-gray-600">{breakdown.recipes} generations × ₹{COSTS.ai_recipe}</p>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-green-700">₹{breakdownCosts.recipes.toFixed(0)}</p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Zap className="w-6 h-6 text-blue-500" />
                      <div>
                        <p className="font-semibold">Food Lookups</p>
                        <p className="text-sm text-gray-600">{breakdown.foodLookups} queries × ₹{COSTS.food_lookup}</p>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-blue-700">₹{breakdownCosts.foodLookups.toFixed(0)}</p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Zap className="w-6 h-6 text-purple-500" />
                      <div>
                        <p className="font-semibold">Business GPT</p>
                        <p className="text-sm text-gray-600">{breakdown.businessGPT} queries × ₹{COSTS.business_gpt}</p>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-purple-700">₹{breakdownCosts.businessGPT.toFixed(0)}</p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-pink-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Zap className="w-6 h-6 text-pink-500" />
                      <div>
                        <p className="font-semibold">Emails Sent</p>
                        <p className="text-sm text-gray-600">{breakdown.emails} emails × ₹{COSTS.email}</p>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-pink-700">₹{breakdownCosts.emails.toFixed(0)}</p>
                  </div>

                  <div className="flex items-center justify-between p-6 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg text-white">
                    <div>
                      <p className="text-lg font-semibold">TOTAL MONTHLY COST</p>
                      <p className="text-sm opacity-90">Base44 + Integrations</p>
                    </div>
                    <p className="text-4xl font-bold">₹{totalMonthlySpend.toFixed(0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PER USER USAGE */}
          <TabsContent value="users" className="space-y-4">
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle>Per User Usage - {format(new Date(selectedMonth), 'MMMM yyyy')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allUsage.sort((a, b) => calculateTotalCost(b) - calculateTotalCost(a)).map((usage) => {
                    const cost = calculateTotalCost(usage);
                    const userInfo = users.find(u => u.email === usage.user_email);
                    
                    return (
                      <div key={usage.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-semibold">{userInfo?.full_name || usage.user_email}</p>
                            <p className="text-sm text-gray-600">{usage.user_email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-red-600">₹{cost.toFixed(0)}</p>
                            <Badge className={cost > 100 ? 'bg-red-500' : cost > 50 ? 'bg-yellow-500' : 'bg-green-500'}>
                              {cost > 100 ? 'High' : cost > 50 ? 'Medium' : 'Low'} Usage
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-5 gap-2 text-xs">
                          <div className="text-center p-2 bg-orange-50 rounded">
                            <p className="font-semibold">{usage.ai_meal_plans_generated || 0}</p>
                            <p className="text-gray-600">Meal Plans</p>
                          </div>
                          <div className="text-center p-2 bg-green-50 rounded">
                            <p className="font-semibold">{usage.ai_recipes_generated || 0}</p>
                            <p className="text-gray-600">Recipes</p>
                          </div>
                          <div className="text-center p-2 bg-blue-50 rounded">
                            <p className="font-semibold">{usage.food_lookups || 0}</p>
                            <p className="text-gray-600">Lookups</p>
                          </div>
                          <div className="text-center p-2 bg-purple-50 rounded">
                            <p className="font-semibold">{usage.business_gpt_queries || 0}</p>
                            <p className="text-gray-600">GPT</p>
                          </div>
                          <div className="text-center p-2 bg-pink-50 rounded">
                            <p className="font-semibold">{usage.emails_sent || 0}</p>
                            <p className="text-gray-600">Emails</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* RECOMMENDATIONS */}
          <TabsContent value="recommendations" className="space-y-4">
            <Card className="border-none shadow-xl bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader>
                <CardTitle className="text-2xl">💡 Cost Optimization Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-green-500">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <AlertDescription className="ml-2">
                    <strong>✅ Your Strategy is Working!</strong><br/>
                    Current profit margin: {profitMargin}%<br/>
                    Keep pushing students to use templates instead of AI generation.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <div className="p-4 bg-white rounded-lg border-l-4 border-blue-500">
                    <h4 className="font-bold mb-2">1. Promote Template Library</h4>
                    <p className="text-sm text-gray-700">
                      Send weekly emails to students: "Use templates to save money! Free forever!"
                      Target: Reduce AI meal plan generations by 70%
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-lg border-l-4 border-purple-500">
                    <h4 className="font-bold mb-2">2. Gamify Template Usage</h4>
                    <p className="text-sm text-gray-700">
                      Show badge: "Saved ₹XXX this month by using templates"
                      Students love seeing their savings!
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-lg border-l-4 border-orange-500">
                    <h4 className="font-bold mb-2">3. Stricter Limits for Student Plan</h4>
                    <p className="text-sm text-gray-700">
                      Current: 20 AI generations/month<br/>
                      Recommend: Reduce to 5 AI generations/month<br/>
                      Force them to templates after limit
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-lg border-l-4 border-green-500">
                    <h4 className="font-bold mb-2">4. Upsell Professional Plan</h4>
                    <p className="text-sm text-gray-700">
                      ₹999/month with 50 AI generations<br/>
                      For coaches who NEED more AI flexibility<br/>
                      Higher revenue covers higher costs
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-lg border-l-4 border-red-500">
                    <h4 className="font-bold mb-2">5. Identify Heavy Users</h4>
                    <p className="text-sm text-gray-700">
                      Anyone spending more than ₹100/month should be contacted<br/>
                      Educate them on template usage or upsell to higher plan
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Base44 Plan Recommendation */}
        <Card className="border-none shadow-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
          <CardHeader>
            <CardTitle className="text-3xl">📊 Recommended Base44 Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg">
              Based on your current usage ({studentCoaches} student coaches, ₹{totalMonthlySpend.toFixed(0)} monthly integration costs):
            </p>

            <div className="p-6 bg-white/10 rounded-xl backdrop-blur">
              <h3 className="text-2xl font-bold mb-2">Base44 Professional Plan</h3>
              <p className="text-3xl font-bold mb-4">$79/month (~₹6,500)</p>
              <ul className="space-y-2 text-white/90">
                <li>✅ Unlimited database operations</li>
                <li>✅ Custom domain</li>
                <li>✅ Priority support</li>
                <li>✅ Auto backups</li>
                <li>✅ 99.9% uptime SLA</li>
              </ul>
            </div>

            <Alert className="bg-white/10 border-white/20">
              <AlertDescription className="text-white">
                <strong>Total Monthly Cost:</strong> ₹6,500 (Base44) + ₹{totalMonthlySpend.toFixed(0)} (Integrations) = ₹{(6500 + totalMonthlySpend).toFixed(0)}<br/>
                <strong>Monthly Revenue:</strong> ₹{monthlyRevenue}<br/>
                <strong>Net Profit:</strong> ₹{(monthlyRevenue - totalMonthlySpend - 6500).toFixed(0)} ({(((monthlyRevenue - totalMonthlySpend - 6500) / monthlyRevenue) * 100).toFixed(1)}% margin)
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}