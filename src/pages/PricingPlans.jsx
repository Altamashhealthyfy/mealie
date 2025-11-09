import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, X, Sparkles, Star, Rocket, Crown, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PricingPlans() {
  const [billingCycle, setBillingCycle] = useState("yearly");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const plans = [
    {
      name: "Student",
      monthlyPrice: 499,
      yearlyPrice: 5988,
      icon: Sparkles,
      color: "from-blue-500 to-cyan-500",
      bgColor: "from-blue-50 to-cyan-50",
      badge: "Perfect for Learning",
      description: "Ideal for health coach students and beginners",
      features: {
        clients: "Up to 10 clients",
        basicPlans: {
          ai: "5 AI generations/month",
          manual: "✅ Unlimited",
          templates: "✅ Unlimited FREE"
        },
        proPlans: {
          ai: "❌ Not available",
          manual: "❌ Not available",
          templates: "❌ Not available"
        },
        recipes: "10 AI recipes/month",
        foodLookup: "20 AI lookups/month",
        businessGPTs: "5 queries/month",
        marketing: "✅ Marketing Hub access",
        downloadTemplates: "✅ Unlimited downloads",
        communication: "✅ Client messaging",
        progressTracking: "✅ Basic tracking",
        support: "Email support (48hrs)"
      },
      highlights: [
        "Perfect for first 10 clients",
        "Learn the platform",
        "Build your foundation",
        "Upgrade when ready"
      ]
    },
    {
      name: "Professional",
      monthlyPrice: 1499,
      yearlyPrice: 14988,
      icon: Star,
      color: "from-orange-500 to-red-500",
      bgColor: "from-orange-50 to-red-50",
      badge: "Most Popular",
      popular: true,
      description: "For growing practices with disease-specific needs",
      features: {
        clients: "Up to 50 clients",
        basicPlans: {
          ai: "20 AI generations/month",
          manual: "✅ Unlimited",
          templates: "✅ Unlimited FREE"
        },
        proPlans: {
          ai: "💎 10 AI Pro plans/month",
          manual: "💎 Unlimited",
          templates: "💎 Unlimited FREE"
        },
        recipes: "50 AI recipes/month",
        foodLookup: "50 AI lookups/month",
        businessGPTs: "20 queries/month",
        marketing: "✅ Full Marketing Hub + AI Content",
        downloadTemplates: "✅ Unlimited + Upload your own",
        communication: "✅ Chat + WhatsApp integration",
        progressTracking: "✅ Advanced tracking + Reports",
        teamManagement: "✅ Add 2 team members",
        support: "Priority support (24hrs)"
      },
      highlights: [
        "Disease-specific meal plans",
        "Diabetes, PCOS, Thyroid planning",
        "Clinical intake forms",
        "Team collaboration"
      ]
    },
    {
      name: "Premium",
      monthlyPrice: 2999,
      yearlyPrice: 29999,
      savingsYearly: 6989,
      icon: Crown,
      color: "from-purple-500 to-indigo-500",
      bgColor: "from-purple-50 to-indigo-50",
      badge: "For Scale & White-label",
      description: "Unlimited everything + custom branding",
      features: {
        clients: "♾️ Unlimited clients",
        basicPlans: {
          ai: "♾️ Unlimited AI",
          manual: "✅ Unlimited",
          templates: "✅ Unlimited + Create & Share"
        },
        proPlans: {
          ai: "💎 Unlimited AI Pro plans",
          manual: "💎 Unlimited",
          templates: "💎 Unlimited + Create & Share"
        },
        recipes: "♾️ Unlimited AI recipes",
        foodLookup: "♾️ Unlimited AI lookups",
        businessGPTs: "♾️ Unlimited queries",
        marketing: "✅ Everything + Automation",
        downloadTemplates: "✅ Unlimited + Upload library",
        communication: "✅ Multi-channel + Automation",
        progressTracking: "✅ Custom reports + Analytics",
        teamManagement: "✅ Unlimited team members",
        whiteLabel: "🎨 Custom branding (Logo + Colors)",
        apiAccess: "🔌 API access",
        support: "24/7 Priority + Dedicated manager"
      },
      highlights: [
        "Scale without limits",
        "White-label your brand",
        "Unlimited everything",
        "Perfect for 50+ clients"
      ]
    }
  ];

  const comparisonFeatures = [
    {
      category: "👥 Client Management",
      items: [
        { name: "Client Profiles", student: "10", professional: "50", premium: "Unlimited" },
        { name: "Progress Tracking", student: "Basic", professional: "Advanced + Reports", premium: "Custom + Analytics" },
        { name: "Communication", student: "Chat", professional: "Chat + WhatsApp", premium: "Multi-channel" },
        { name: "Appointments", student: "✓", professional: "✓", premium: "✓" }
      ]
    },
    {
      category: "🍽️ Basic Meal Plans (RDA-based)",
      items: [
        { name: "AI Generations/month", student: "5", professional: "20", premium: "Unlimited" },
        { name: "Manual Creation", student: "Unlimited", professional: "Unlimited", premium: "Unlimited" },
        { name: "Templates (FREE)", student: "Unlimited", professional: "Unlimited", premium: "Unlimited + Create" }
      ]
    },
    {
      category: "💎 Pro Plans (Disease-Specific)",
      items: [
        { name: "AI Pro Plans/month", student: "✗", professional: "10", premium: "Unlimited" },
        { name: "Manual Pro Creation", student: "✗", professional: "Unlimited", premium: "Unlimited" },
        { name: "Pro Templates (FREE)", student: "✗", professional: "Unlimited", premium: "Unlimited + Create" },
        { name: "Clinical Intake Forms", student: "✗", professional: "✓", premium: "✓" },
        { name: "Disease Guidelines", student: "✗", professional: "✓", premium: "✓ + Custom" },
        { name: "MPESS Integration", student: "✗", professional: "✓", premium: "✓" },
        { name: "Lab Tracking", student: "✗", professional: "✓", premium: "✓" }
      ]
    },
    {
      category: "🤖 AI Features",
      items: [
        { name: "Recipe Generation", student: "10/mo", professional: "50/mo", premium: "Unlimited" },
        { name: "Food Lookup (AI)", student: "20/mo", professional: "50/mo", premium: "Unlimited" },
        { name: "Business GPTs", student: "5/mo", professional: "20/mo", premium: "Unlimited" },
        { name: "Marketing Content AI", student: "Limited", professional: "Full", premium: "Full + Advanced" }
      ]
    },
    {
      category: "📱 Marketing & Business",
      items: [
        { name: "Marketing Hub", student: "✓", professional: "✓ + AI", premium: "✓ + Automation" },
        { name: "Content Templates", student: "✓", professional: "✓", premium: "✓" },
        { name: "Social Media Calendar", student: "✓", professional: "✓", premium: "✓" },
        { name: "AI Launchpad GPT", student: "Limited", professional: "Full", premium: "Full" }
      ]
    },
    {
      category: "📥 Template Library",
      items: [
        { name: "Download Templates", student: "Unlimited", professional: "Unlimited", premium: "Unlimited" },
        { name: "Upload Your Templates", student: "✗", professional: "✓", premium: "✓" },
        { name: "Create Master Templates", student: "✗", professional: "✗", premium: "✓" }
      ]
    },
    {
      category: "👨‍💼 Team & Collaboration",
      items: [
        { name: "Team Members", student: "✗", professional: "2 members", premium: "Unlimited" },
        { name: "Team Attendance", student: "✗", professional: "✓", premium: "✓" },
        { name: "Role-based Access", student: "✗", professional: "Basic", premium: "Advanced" }
      ]
    },
    {
      category: "💼 Business Management",
      items: [
        { name: "Finance Tracking", student: "Basic", professional: "Full", premium: "Full + Reports" },
        { name: "Bulk Import", student: "✓", professional: "✓", premium: "✓" },
        { name: "Usage Dashboard", student: "Basic", professional: "Full", premium: "Full + Analytics" }
      ]
    },
    {
      category: "🎨 Branding & Customization",
      items: [
        { name: "White-label Branding", student: "✗", professional: "✗", premium: "Logo + Colors" },
        { name: "Custom Domain", student: "✗", professional: "✗", premium: "Add-on" },
        { name: "API Access", student: "✗", professional: "✗", premium: "Basic" }
      ]
    },
    {
      category: "🛟 Support & Training",
      items: [
        { name: "Support Type", student: "Email", professional: "Email + Chat", premium: "24/7 Priority" },
        { name: "Response Time", student: "48 hrs", professional: "24 hrs", premium: "4 hrs" },
        { name: "Onboarding", student: "Self-serve", professional: "Guided", premium: "1-on-1 Training" },
        { name: "Dedicated Manager", student: "✗", professional: "✗", premium: "✓" }
      ]
    }
  ];

  const getPlanPrice = (plan) => {
    if (billingCycle === "monthly") {
      return {
        amount: `₹${plan.monthlyPrice.toLocaleString('en-IN')}`,
        period: "/month",
        subtext: `₹${(plan.monthlyPrice * 12).toLocaleString('en-IN')}/year billed monthly`
      };
    } else {
      const savings = (plan.monthlyPrice * 12) - plan.yearlyPrice;
      return {
        amount: `₹${plan.yearlyPrice.toLocaleString('en-IN')}`,
        period: "/year",
        subtext: savings > 0 ? `Save ₹${savings.toLocaleString('en-IN')} vs monthly!` : `₹${Math.round(plan.yearlyPrice / 12).toLocaleString('en-IN')}/month`
      };
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-lg px-6 py-2">
            <Zap className="w-5 h-5 mr-2 inline" />
            Simple, Transparent Pricing
          </Badge>
          <h1 className="text-5xl font-bold text-gray-900">Choose Your Plan</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Scale as you grow. Start small, upgrade anytime! 🚀
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center">
          <Card className="border-none shadow-lg inline-block">
            <CardContent className="p-2">
              <Tabs value={billingCycle} onValueChange={setBillingCycle}>
                <TabsList className="grid grid-cols-2 w-80">
                  <TabsTrigger value="monthly" className="text-base">
                    Monthly
                  </TabsTrigger>
                  <TabsTrigger value="yearly" className="text-base">
                    Yearly
                    <Badge className="ml-2 bg-green-500 text-white text-xs">
                      Save up to ₹6,989
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Current Plan Alert */}
        {user && (
          <Alert className="bg-gradient-to-r from-blue-100 to-cyan-100 border-blue-300 max-w-3xl mx-auto">
            <AlertDescription className="text-center">
              <strong>Your Current Plan:</strong> {user.subscription_plan || 'Student'} • 
              Clients: {user.client_count || 0} • 
              AI Usage: {user.ai_usage || 0} generations this month
            </AlertDescription>
          </Alert>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const pricing = getPlanPrice(plan);
            return (
              <Card 
                key={plan.name}
                className={`border-none shadow-xl bg-gradient-to-br ${plan.bgColor} ${
                  plan.popular ? 'ring-4 ring-orange-500 scale-105 md:scale-110' : ''
                } hover:shadow-2xl transition-all duration-300 relative`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center">
                    <Badge className="bg-orange-500 text-white px-4 py-1 text-sm shadow-lg">
                      <Star className="w-4 h-4 mr-1" />
                      MOST POPULAR
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <plan.icon className="w-12 h-12 text-gray-700" />
                  </div>
                  <Badge className={`bg-gradient-to-r ${plan.color} text-white w-fit text-xs px-3 py-1`}>
                    {plan.badge}
                  </Badge>
                  <CardTitle className="text-3xl mt-3">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-bold text-gray-900">{pricing.amount}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{pricing.period}</p>
                    <p className={`text-xs mt-1 ${pricing.subtext.includes('Save') ? 'text-green-700 font-semibold' : 'text-gray-500'}`}>
                      {pricing.subtext}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700 mt-3">{plan.description}</p>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Key Stats */}
                  <div className="p-3 bg-white/80 rounded-lg border-2 border-gray-200">
                    <p className="font-bold text-center text-gray-900">{plan.features.clients}</p>
                  </div>

                  {/* Basic Plans */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-blue-900">🍽️ Basic Meal Plans:</p>
                    <div className="pl-3 border-l-2 border-blue-300 space-y-1">
                      <p className="text-xs text-gray-700">AI: {plan.features.basicPlans.ai}</p>
                      <p className="text-xs text-gray-700">Manual: {plan.features.basicPlans.manual}</p>
                      <p className="text-xs text-gray-700">Templates: {plan.features.basicPlans.templates}</p>
                    </div>
                  </div>

                  {/* Pro Plans */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-purple-900">💎 Pro Plans:</p>
                    <div className="pl-3 border-l-2 border-purple-300 space-y-1">
                      <p className="text-xs text-gray-700">AI: {plan.features.proPlans.ai}</p>
                      <p className="text-xs text-gray-700">Manual: {plan.features.proPlans.manual}</p>
                      <p className="text-xs text-gray-700">Templates: {plan.features.proPlans.templates}</p>
                    </div>
                  </div>

                  {/* Other Features */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Recipes: {plan.features.recipes}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Food Lookup: {plan.features.foodLookup}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Business GPTs: {plan.features.businessGPTs}</span>
                    </div>
                    {plan.features.teamManagement && (
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="font-semibold">{plan.features.teamManagement}</span>
                      </div>
                    )}
                    {plan.features.whiteLabel && (
                      <div className="flex items-start gap-2">
                        <Crown className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                        <span className="font-semibold text-purple-900">{plan.features.whiteLabel}</span>
                      </div>
                    )}
                  </div>

                  {/* Highlights */}
                  <div className="pt-3 border-t">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Perfect for:</p>
                    <div className="space-y-1">
                      {plan.highlights.map((highlight, idx) => (
                        <p key={idx} className="text-xs text-gray-600">• {highlight}</p>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <Button 
                    className={`w-full h-12 bg-gradient-to-r ${plan.color} hover:opacity-90 text-base font-semibold`}
                  >
                    Get Started
                  </Button>

                  <p className="text-xs text-center text-gray-600">{plan.features.support}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Value Props */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">Unlimited Templates</h3>
              <p className="text-sm text-gray-700">
                Use templates unlimited times at ₹0 cost! Save AI generations for when you really need them.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">Disease-Specific Pro</h3>
              <p className="text-sm text-gray-700">
                Professional plan onwards includes Pro Plans for Diabetes, PCOS, Thyroid, and more!
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">Manual Always Free</h3>
              <p className="text-sm text-gray-700">
                Manual meal plan creation is ALWAYS unlimited in every plan. Zero AI costs!
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Comparison Table */}
        <Card className="border-none shadow-xl">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
            <CardTitle className="text-2xl">Complete Feature Comparison</CardTitle>
            <CardDescription className="text-white/90">
              Everything you get in each plan
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-4 px-4 font-bold text-gray-900">Feature</th>
                  <th className="text-center py-4 px-4">
                    <div className="font-bold text-blue-900">Student</div>
                    <div className="text-sm font-normal text-gray-600">₹499/mo</div>
                  </th>
                  <th className="text-center py-4 px-4">
                    <div className="font-bold text-orange-900">Professional</div>
                    <div className="text-sm font-normal text-gray-600">₹1,499/mo</div>
                  </th>
                  <th className="text-center py-4 px-4">
                    <div className="font-bold text-purple-900">Premium</div>
                    <div className="text-sm font-normal text-gray-600">₹2,999/mo</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((category, catIdx) => (
                  <React.Fragment key={catIdx}>
                    <tr className="bg-gradient-to-r from-gray-100 to-gray-50">
                      <td colSpan="4" className="py-3 px-4 font-bold text-gray-900 text-sm">
                        {category.category}
                      </td>
                    </tr>
                    {category.items.map((item, itemIdx) => (
                      <tr key={itemIdx} className="border-b border-gray-200 hover:bg-orange-50 transition-colors">
                        <td className="py-3 px-4 text-sm text-gray-700">{item.name}</td>
                        <td className="py-3 px-4 text-center">
                          {item.student === '✓' ? (
                            <Check className="w-5 h-5 text-green-600 mx-auto" />
                          ) : item.student === '✗' ? (
                            <X className="w-5 h-5 text-red-500 mx-auto" />
                          ) : (
                            <span className="text-sm text-gray-700">{item.student}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.professional === '✓' ? (
                            <Check className="w-5 h-5 text-green-600 mx-auto" />
                          ) : item.professional === '✗' ? (
                            <X className="w-5 h-5 text-red-500 mx-auto" />
                          ) : (
                            <span className="text-sm text-gray-700 font-medium">{item.professional}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.premium === '✓' ? (
                            <Check className="w-5 h-5 text-green-600 mx-auto" />
                          ) : item.premium === '✗' ? (
                            <X className="w-5 h-5 text-red-500 mx-auto" />
                          ) : (
                            <span className="text-sm text-gray-700 font-medium">{item.premium}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardHeader>
            <CardTitle className="text-2xl">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-bold text-gray-900 mb-2">💰 Why are AI features limited?</h3>
              <p className="text-sm text-gray-700">
                Each AI generation costs us ₹10 in API fees. But here's the smart part: Use FREE templates unlimited times! 
                Generate 1 AI plan → Save as template → Use for 100 clients at ₹0 cost.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">💎 What's the difference between Basic and Pro Plans?</h3>
              <p className="text-sm text-gray-700">
                <strong>Basic Plans:</strong> RDA-based nutrition (weight loss/gain, maintenance) - Available in all tiers<br/>
                <strong>Pro Plans:</strong> Disease-specific clinical planning (Diabetes, PCOS, Thyroid) with medical guidelines - Professional plan onwards (₹1,499/mo+)
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">📊 How much do I save with yearly billing?</h3>
              <p className="text-sm text-gray-700">
                <strong>Student:</strong> No discount (₹5,988/year)<br/>
                <strong>Professional:</strong> Save ₹3,000/year (₹14,988 instead of ₹17,988)<br/>
                <strong>Premium:</strong> Save ₹6,989/year (₹29,999 instead of ₹35,988)
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">🎓 Which plan should I start with?</h3>
              <p className="text-sm text-gray-700">
                <strong>Student (₹499/mo):</strong> Perfect for first 10 clients, learning the platform<br/>
                <strong>Professional (₹1,499/mo):</strong> When you need Pro disease-specific planning or have 10-50 clients<br/>
                <strong>Premium (₹2,999/mo):</strong> For 50+ clients, white-label needs, or unlimited AI usage
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">📈 Can I upgrade/downgrade?</h3>
              <p className="text-sm text-gray-700">
                Yes! Upgrade anytime and pay the difference. Downgrade at billing cycle end. All your data stays safe.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">💳 What payment methods?</h3>
              <p className="text-sm text-gray-700">
                UPI, Cards, Net Banking. Monthly plans auto-renew. Yearly plans renew annually. Cancel anytime.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Final CTA */}
        <Card className="border-none shadow-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white">
          <CardContent className="p-12 text-center">
            <h2 className="text-4xl font-bold mb-4">Ready to Scale Your Practice? 🚀</h2>
            <p className="text-xl mb-8 text-white/90">
              Join 1000+ health coaches transforming lives with Mealie
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button 
                size="lg"
                className="bg-white text-orange-600 hover:bg-orange-50 h-14 px-8 text-lg font-semibold"
              >
                Start 7-Day Free Trial
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="border-2 border-white text-white hover:bg-white/10 h-14 px-8 text-lg font-semibold"
              >
                Schedule Demo
              </Button>
            </div>
            <p className="text-sm mt-6 text-white/80">
              ✨ No credit card required • Cancel anytime • 30-day money-back guarantee
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}