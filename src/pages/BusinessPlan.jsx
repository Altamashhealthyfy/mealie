import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target,
  CheckCircle2,
  Zap,
  Award,
  BarChart3,
  Rocket,
  Shield
} from "lucide-react";

export default function BusinessPlan() {
  const pricingPlans = [
    {
      name: "Student Coach",
      price: "₹499",
      period: "/month",
      description: "Perfect for new health coaches starting their practice",
      features: [
        "Up to 5 active clients",
        "AI-powered meal planning",
        "MPESS wellness tracker",
        "Client portal access",
        "Email support",
        "Community access",
        "Recipe database (500+)",
        "Progress tracking"
      ],
      color: "from-blue-500 to-cyan-500",
      recommended: false,
    },
    {
      name: "Professional",
      price: "₹1,499",
      period: "/month",
      description: "For established coaches growing their practice",
      features: [
        "Up to 25 active clients",
        "Everything in Student",
        "White-label branding",
        "Priority support",
        "Advanced analytics",
        "Custom meal templates",
        "Appointment scheduling",
        "Client messaging",
        "Recipe database (1000+)"
      ],
      color: "from-orange-500 to-red-500",
      recommended: true,
    },
    {
      name: "Premium",
      price: "₹4,999",
      period: "/month",
      description: "For coaches managing large client bases",
      features: [
        "Unlimited clients",
        "Everything in Professional",
        "1-on-1 onboarding call",
        "Dedicated support manager",
        "Custom integrations",
        "API access",
        "Team collaboration",
        "Export data anytime",
        "Custom recipe creation"
      ],
      color: "from-purple-500 to-indigo-500",
      recommended: false,
    },
    {
      name: "Lifetime",
      price: "₹29,999",
      period: "one-time",
      description: "Pay once, use forever - Best value!",
      features: [
        "All Premium features",
        "Lifetime access",
        "No recurring fees",
        "Future updates included",
        "Priority feature requests",
        "Exclusive community",
        "Annual strategy call",
        "Marketing materials"
      ],
      color: "from-green-500 to-emerald-500",
      recommended: false,
    },
  ];

  const revenueProjections = [
    { coaches: 10, monthly: "₹14,990", yearly: "₹1,79,880", profit: "₹1,39,880" },
    { coaches: 30, monthly: "₹44,970", yearly: "₹5,39,640", profit: "₹4,99,640" },
    { coaches: 50, monthly: "₹74,950", yearly: "₹8,99,400", profit: "₹8,49,400" },
    { coaches: 100, monthly: "₹1,49,900", yearly: "₹17,98,800", profit: "₹16,98,800" },
    { coaches: 200, monthly: "₹2,99,800", yearly: "₹35,97,600", profit: "₹33,97,600" },
  ];

  const valueAdds = [
    {
      title: "Pre-built Recipe Database",
      description: "1000+ authentic Indian recipes",
      icon: CheckCircle2,
      color: "text-green-600"
    },
    {
      title: "Meal Plan Templates",
      description: "20+ ready-to-use templates",
      icon: Zap,
      color: "text-yellow-600"
    },
    {
      title: "Marketing Materials",
      description: "Social media & email templates",
      icon: Target,
      color: "text-blue-600"
    },
    {
      title: "Legal Templates",
      description: "Client contracts & agreements",
      icon: Shield,
      color: "text-purple-600"
    },
    {
      title: "Training Program",
      description: "Platform mastery course included",
      icon: Award,
      color: "text-orange-600"
    },
    {
      title: "Community Support",
      description: "Private coach community",
      icon: Users,
      color: "text-pink-600"
    },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-lg px-6 py-2">
            Business Plan & Pricing Strategy
          </Badge>
          <h1 className="text-5xl font-bold text-gray-900">
            Build Your Health Coaching Empire
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Turn your expertise into a thriving business with our all-in-one platform designed specifically for Indian health coaches
          </p>
        </div>

        {/* Pricing Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pricingPlans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`border-none shadow-xl hover:shadow-2xl transition-all ${
                plan.recommended ? 'ring-4 ring-orange-500 scale-105' : ''
              }`}
            >
              {plan.recommended && (
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-center py-2 text-sm font-bold rounded-t-xl">
                  RECOMMENDED
                </div>
              )}
              <CardHeader>
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${plan.color} mx-auto mb-4 flex items-center justify-center`}>
                  <DollarSign className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl text-center">{plan.name}</CardTitle>
                <CardDescription className="text-center min-h-12">
                  {plan.description}
                </CardDescription>
                <div className="text-center pt-4">
                  <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className={`w-full bg-gradient-to-r ${plan.color} hover:opacity-90`}
                >
                  Choose Plan
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Revenue Projections */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              Revenue Projections (Professional Plan @ ₹1,499/coach)
            </CardTitle>
            <CardDescription>Scale your platform revenue with more health coaches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-blue-200">
                    <th className="text-left p-4 font-bold">Active Coaches</th>
                    <th className="text-left p-4 font-bold">Monthly Revenue</th>
                    <th className="text-left p-4 font-bold">Yearly Revenue</th>
                    <th className="text-left p-4 font-bold">Yearly Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueProjections.map((row, i) => (
                    <tr key={i} className="border-b border-blue-100 hover:bg-white transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-blue-600" />
                          <span className="font-semibold">{row.coaches} coaches</span>
                        </div>
                      </td>
                      <td className="p-4 text-lg font-bold text-blue-600">{row.monthly}</td>
                      <td className="p-4 text-lg font-bold text-green-600">{row.yearly}</td>
                      <td className="p-4 text-lg font-bold text-orange-600">{row.profit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 p-4 bg-white rounded-xl">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Note:</strong> Profit calculation assumes monthly operating costs of ₹40,000 
                (platform ₹10k + support ₹20k + marketing ₹10k)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Value Additions */}
        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-3">
              <Rocket className="w-8 h-8 text-orange-600" />
              Value Additions Included
            </CardTitle>
            <CardDescription>Everything your coaches need to succeed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {valueAdds.map((item, i) => (
                <div key={i} className="p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 hover:shadow-lg transition-all">
                  <item.icon className={`w-12 h-12 ${item.color} mb-4`} />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Launch Strategy */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-xl bg-gradient-to-br from-purple-50 to-pink-50">
            <CardHeader>
              <Badge className="bg-purple-600 text-white w-fit mb-2">Phase 1</Badge>
              <CardTitle className="text-2xl">Beta Launch</CardTitle>
              <CardDescription>Month 1-2</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-purple-600 mt-0.5" />
                  <span>Invite 10-20 coaches for FREE</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-purple-600 mt-0.5" />
                  <span>Collect feedback & testimonials</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-purple-600 mt-0.5" />
                  <span>Build case studies</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-purple-600 mt-0.5" />
                  <span>Refine features</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-gradient-to-br from-orange-50 to-red-50">
            <CardHeader>
              <Badge className="bg-orange-600 text-white w-fit mb-2">Phase 2</Badge>
              <CardTitle className="text-2xl">Early Bird</CardTitle>
              <CardDescription>Month 3-4</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-orange-600 mt-0.5" />
                  <span>Launch at 50% discount</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-orange-600 mt-0.5" />
                  <span>₹749/month instead of ₹1,499</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-orange-600 mt-0.5" />
                  <span>Lock in 50-100 coaches</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-orange-600 mt-0.5" />
                  <span>Generate initial revenue</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader>
              <Badge className="bg-green-600 text-white w-fit mb-2">Phase 3</Badge>
              <CardTitle className="text-2xl">Full Launch</CardTitle>
              <CardDescription>Month 5+</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <span>Full pricing structure</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <span>Scale marketing efforts</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <span>Add enterprise tier</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <span>Expand support team</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Breakeven Analysis */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-yellow-50 to-orange-50">
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-3">
              <Target className="w-8 h-8 text-yellow-600" />
              Breakeven Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-white rounded-xl">
                <h3 className="text-xl font-bold mb-4">Fixed Monthly Costs</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Platform (Base44)</span>
                    <span className="font-bold">₹8,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Support Person</span>
                    <span className="font-bold">₹10,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Marketing</span>
                    <span className="font-bold">₹15,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Miscellaneous</span>
                    <span className="font-bold">₹7,000</span>
                  </div>
                  <div className="border-t-2 border-gray-200 pt-3 flex justify-between text-xl">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-orange-600">₹40,000/month</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white rounded-xl">
                <h3 className="text-xl font-bold mb-4">Breakeven Points</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">At ₹1,499/coach</p>
                    <p className="text-3xl font-bold text-blue-600">27 coaches</p>
                    <p className="text-sm text-gray-600 mt-1">= ₹40,473/month</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">At ₹999/coach</p>
                    <p className="text-3xl font-bold text-green-600">41 coaches</p>
                    <p className="text-sm text-gray-600 mt-1">= ₹40,959/month</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">At ₹499/coach</p>
                    <p className="text-3xl font-bold text-purple-600">81 coaches</p>
                    <p className="text-sm text-gray-600 mt-1">= ₹40,419/month</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card className="border-none shadow-2xl bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white">
          <CardContent className="p-12 text-center">
            <h2 className="text-4xl font-bold mb-4">Ready to Build Your Empire?</h2>
            <p className="text-xl mb-8 opacity-90">
              Join 500+ health coaches already transforming their practice with Mealie Pro
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button size="lg" className="bg-white text-orange-600 hover:bg-gray-100 text-lg px-8">
                <Rocket className="w-5 h-5 mr-2" />
                Start Free Trial
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8">
                Schedule Demo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}