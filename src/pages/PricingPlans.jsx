import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, X, Sparkles, Star, Rocket, Crown, Zap, AlertTriangle } from "lucide-react";

export default function PricingPlans() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const plans = [
    {
      name: "Student",
      price: "₹499",
      period: "/month",
      icon: Sparkles,
      color: "from-blue-500 to-cyan-500",
      bgColor: "from-blue-50 to-cyan-50",
      badge: "Learning Phase",
      description: "Perfect for health coach students and beginners",
      features: {
        clients: "Up to 10 clients",
        basicPlans: {
          ai: "5 AI generations/month",
          manual: "Unlimited",
          templates: "Unlimited FREE"
        },
        proPlans: {
          ai: "❌ Not included",
          manual: "❌ Not included",
          templates: "❌ Not included"
        },
        recipes: "10 AI recipes/month",
        foodLookup: "20 AI lookups/month",
        businessGPTs: "5 queries/month",
        marketing: "✅ Full access",
        downloadTemplates: "✅ Unlimited downloads",
        communication: "✅ Client chat",
        progressTracking: "✅ Basic tracking",
        support: "Email support"
      },
      ctaText: "Start Learning",
      ideal: ["Students", "New coaches", "Learning phase", "Building first 10 clients"]
    },
    {
      name: "Professional",
      price: "₹999",
      period: "/month",
      icon: Star,
      color: "from-orange-500 to-red-500",
      bgColor: "from-orange-50 to-red-50",
      badge: "Most Popular",
      description: "For growing health coaching practices",
      popular: true,
      features: {
        clients: "Up to 50 clients",
        basicPlans: {
          ai: "20 AI generations/month",
          manual: "Unlimited",
          templates: "Unlimited FREE"
        },
        proPlans: {
          ai: "10 AI Pro plans/month",
          manual: "Unlimited",
          templates: "Unlimited FREE"
        },
        recipes: "50 AI recipes/month",
        foodLookup: "50 AI lookups/month",
        businessGPTs: "20 queries/month",
        marketing: "✅ Full access + AI content",
        downloadTemplates: "✅ Unlimited downloads",
        communication: "✅ Client chat + WhatsApp integration",
        progressTracking: "✅ Advanced tracking + Reports",
        teamManagement: "Add 2 team members",
        support: "Priority email + Chat support"
      },
      ctaText: "Go Professional",
      ideal: ["Growing practice", "10-50 clients", "Disease-specific planning", "Team collaboration"]
    },
    {
      name: "Premium",
      price: "₹1,999",
      period: "/month",
      icon: Crown,
      color: "from-purple-500 to-indigo-500",
      bgColor: "from-purple-50 to-indigo-50",
      badge: "Advanced",
      description: "For established health coaches with scaling needs",
      features: {
        clients: "Unlimited clients",
        basicPlans: {
          ai: "Unlimited AI generations",
          manual: "Unlimited",
          templates: "Unlimited FREE + Create & share"
        },
        proPlans: {
          ai: "Unlimited AI Pro plans",
          manual: "Unlimited",
          templates: "Unlimited FREE + Create & share"
        },
        recipes: "Unlimited AI recipes",
        foodLookup: "Unlimited AI lookups",
        businessGPTs: "Unlimited queries",
        marketing: "✅ Everything + Advanced automation",
        downloadTemplates: "✅ Unlimited + Upload your own",
        communication: "✅ Multi-channel + Automation",
        progressTracking: "✅ Advanced + Custom reports",
        teamManagement: "Unlimited team members",
        whiteLabel: "Custom branding (logo, colors)",
        apiAccess: "API access for integrations",
        support: "24/7 Priority support + Dedicated manager"
      },
      ctaText: "Scale Your Business",
      ideal: ["Established coaches", "50+ clients", "Team of coaches", "White-label needs"]
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "Contact us",
      icon: Rocket,
      color: "from-pink-500 to-rose-500",
      bgColor: "from-pink-50 to-rose-50",
      badge: "Custom Solution",
      description: "Fully customized platform for coaching businesses",
      features: {
        clients: "Unlimited",
        basicPlans: {
          ai: "Unlimited",
          manual: "Unlimited",
          templates: "Unlimited"
        },
        proPlans: {
          ai: "Unlimited",
          manual: "Unlimited",
          templates: "Unlimited"
        },
        recipes: "Unlimited",
        foodLookup: "Unlimited",
        businessGPTs: "Unlimited",
        marketing: "✅ Everything + Custom automation",
        downloadTemplates: "✅ Unlimited + Custom library",
        communication: "✅ Multi-channel + Custom workflows",
        progressTracking: "✅ Custom reports + Analytics",
        teamManagement: "Unlimited + Role-based access",
        whiteLabel: "Complete white-label + Custom domain",
        apiAccess: "Full API + Custom integrations",
        customFeatures: "Custom feature development",
        dataExport: "Full data ownership & export",
        support: "Dedicated success manager + Training"
      },
      ctaText: "Contact Sales",
      ideal: ["Coaching institutes", "100+ clients", "Custom workflows", "Multiple coaches"]
    }
  ];

  const comparisonFeatures = [
    {
      category: "Client Management",
      items: [
        { name: "Client Profiles", student: "10", pro: "50", premium: "Unlimited", enterprise: "Unlimited" },
        { name: "Progress Tracking", student: "Basic", pro: "Advanced", premium: "Advanced + Custom", enterprise: "Custom" },
        { name: "Communication", student: "Chat", pro: "Chat + WhatsApp", premium: "Multi-channel", enterprise: "Custom" }
      ]
    },
    {
      category: "Basic Meal Plans (RDA-based)",
      items: [
        { name: "AI Generations/month", student: "5", pro: "20", premium: "Unlimited", enterprise: "Unlimited" },
        { name: "Manual Creation", student: "✓", pro: "✓", premium: "✓", enterprise: "✓" },
        { name: "Templates (FREE)", student: "✓", pro: "✓", premium: "✓", enterprise: "✓" }
      ]
    },
    {
      category: "Pro Plans (Disease-Specific) 💎",
      items: [
        { name: "AI Pro Plans/month", student: "✗", pro: "10", premium: "Unlimited", enterprise: "Unlimited" },
        { name: "Manual Pro Creation", student: "✗", pro: "✓", premium: "✓", enterprise: "✓" },
        { name: "Pro Templates (FREE)", student: "✗", pro: "✓", premium: "✓ + Create", enterprise: "✓ + Custom" },
        { name: "Clinical Intake Forms", student: "✗", pro: "✓", premium: "✓", enterprise: "✓" },
        { name: "Disease Guidelines", student: "✗", pro: "✓", premium: "✓", enterprise: "✓ + Custom" }
      ]
    },
    {
      category: "AI Features",
      items: [
        { name: "Recipe Generation", student: "10/mo", pro: "50/mo", premium: "Unlimited", enterprise: "Unlimited" },
        { name: "Food Lookup", student: "20/mo", pro: "50/mo", premium: "Unlimited", enterprise: "Unlimited" },
        { name: "Business GPTs", student: "5/mo", pro: "20/mo", premium: "Unlimited", enterprise: "Unlimited" }
      ]
    },
    {
      category: "Marketing & Content",
      items: [
        { name: "Marketing Hub", student: "✓", pro: "✓", premium: "✓ + Automation", enterprise: "✓ + Custom" },
        { name: "Content Templates", student: "✓", pro: "✓", premium: "✓", enterprise: "✓" },
        { name: "AI Content Creator", student: "Limited", pro: "Full", premium: "Full + Advanced", enterprise: "Custom" }
      ]
    },
    {
      category: "Business Tools",
      items: [
        { name: "Template Library", student: "✓", pro: "✓", premium: "✓ + Upload", enterprise: "✓ + Custom" },
        { name: "Team Management", student: "✗", pro: "2 members", premium: "Unlimited", enterprise: "Unlimited + Roles" },
        { name: "Finance Tracking", student: "Basic", pro: "Full", premium: "Full + Reports", enterprise: "Custom" }
      ]
    },
    {
      category: "Branding & Customization",
      items: [
        { name: "White-label", student: "✗", pro: "✗", premium: "Logo + Colors", enterprise: "Full + Domain" },
        { name: "Custom Features", student: "✗", pro: "✗", premium: "✗", enterprise: "✓" },
        { name: "API Access", student: "✗", pro: "✗", premium: "Basic", enterprise: "Full" }
      ]
    },
    {
      category: "Support",
      items: [
        { name: "Support Type", student: "Email", pro: "Email + Chat", premium: "24/7 Priority", enterprise: "Dedicated Manager" },
        { name: "Onboarding", student: "Self-serve", pro: "Guided", premium: "1-on-1 Training", enterprise: "Full Training" },
        { name: "Response Time", student: "48 hrs", pro: "24 hrs", premium: "4 hrs", enterprise: "1 hr" }
      ]
    }
  ];

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-lg px-6 py-2">
            <Zap className="w-5 h-5 mr-2 inline" />
            Pricing Plans
          </Badge>
          <h1 className="text-5xl font-bold text-gray-900">Choose Your Plan</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Start with what fits your stage. Upgrade anytime as you grow! 🚀
          </p>
        </div>

        {/* Current Plan Alert */}
        {user && (
          <Alert className="bg-gradient-to-r from-blue-100 to-cyan-100 border-blue-300">
            <AlertDescription className="text-center">
              <strong>Your Current Plan:</strong> {user.subscription_plan || 'Student'} • 
              Clients: {user.client_count || 0} • 
              Usage: {user.ai_usage || 0} AI generations this month
            </AlertDescription>
          </Alert>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <Card 
              key={plan.name}
              className={`border-none shadow-xl bg-gradient-to-br ${plan.bgColor} ${
                plan.popular ? 'ring-4 ring-orange-500 scale-105' : ''
              } hover:shadow-2xl transition-all duration-300`}
            >
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <plan.icon className="w-10 h-10 text-gray-700" />
                  {plan.popular && (
                    <Badge className="bg-orange-500 text-white">
                      <Star className="w-3 h-3 mr-1" />
                      Popular
                    </Badge>
                  )}
                </div>
                <Badge className={`bg-gradient-to-r ${plan.color} text-white w-fit`}>
                  {plan.badge}
                </Badge>
                <CardTitle className="text-3xl mt-2">{plan.name}</CardTitle>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600">{plan.period}</span>
                </div>
                <CardDescription className="text-base mt-2">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Key Features */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">{plan.features.clients}</span>
                  </div>
                  
                  {/* Basic Plans */}
                  <div className="pl-3 border-l-2 border-blue-300 space-y-1">
                    <p className="text-xs font-semibold text-blue-900">Basic Meal Plans:</p>
                    <p className="text-xs text-gray-700">• AI: {plan.features.basicPlans.ai}</p>
                    <p className="text-xs text-gray-700">• Manual: {plan.features.basicPlans.manual}</p>
                    <p className="text-xs text-gray-700">• Templates: {plan.features.basicPlans.templates}</p>
                  </div>

                  {/* Pro Plans */}
                  <div className="pl-3 border-l-2 border-purple-300 space-y-1">
                    <p className="text-xs font-semibold text-purple-900">💎 Pro Plans:</p>
                    <p className="text-xs text-gray-700">• AI: {plan.features.proPlans.ai}</p>
                    <p className="text-xs text-gray-700">• Manual: {plan.features.proPlans.manual}</p>
                    <p className="text-xs text-gray-700">• Templates: {plan.features.proPlans.templates}</p>
                  </div>

                  <div className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Recipes: {plan.features.recipes}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Food Lookup: {plan.features.foodLookup}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Business GPTs: {plan.features.businessGPTs}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{plan.features.marketing}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{plan.features.downloadTemplates}</span>
                  </div>
                  
                  {plan.features.teamManagement && (
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{plan.features.teamManagement}</span>
                    </div>
                  )}
                  
                  {plan.features.whiteLabel && (
                    <div className="flex items-start gap-2">
                      <Crown className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm font-semibold text-purple-900">{plan.features.whiteLabel}</span>
                    </div>
                  )}
                </div>

                {/* Ideal For */}
                <div className="pt-4 border-t">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Ideal for:</p>
                  <div className="flex flex-wrap gap-1">
                    {plan.ideal.map((item, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* CTA Button */}
                <Button 
                  className={`w-full h-12 bg-gradient-to-r ${plan.color} hover:opacity-90`}
                >
                  {plan.ctaText}
                </Button>

                <p className="text-xs text-center text-gray-600">{plan.features.support}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <Card className="border-none shadow-xl">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
            <CardTitle className="text-2xl">Detailed Feature Comparison</CardTitle>
            <CardDescription className="text-white/90">
              See exactly what's included in each plan
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-4 px-4 font-bold text-gray-900">Feature</th>
                  <th className="text-center py-4 px-4 font-bold text-blue-900">Student</th>
                  <th className="text-center py-4 px-4 font-bold text-orange-900">Professional</th>
                  <th className="text-center py-4 px-4 font-bold text-purple-900">Premium</th>
                  <th className="text-center py-4 px-4 font-bold text-pink-900">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((category, catIdx) => (
                  <React.Fragment key={catIdx}>
                    <tr className="bg-gray-100">
                      <td colSpan="5" className="py-3 px-4 font-bold text-gray-900">
                        {category.category}
                      </td>
                    </tr>
                    {category.items.map((item, itemIdx) => (
                      <tr key={itemIdx} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-700">{item.name}</td>
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
                          {item.pro === '✓' ? (
                            <Check className="w-5 h-5 text-green-600 mx-auto" />
                          ) : item.pro === '✗' ? (
                            <X className="w-5 h-5 text-red-500 mx-auto" />
                          ) : (
                            <span className="text-sm text-gray-700">{item.pro}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.premium === '✓' ? (
                            <Check className="w-5 h-5 text-green-600 mx-auto" />
                          ) : item.premium === '✗' ? (
                            <X className="w-5 h-5 text-red-500 mx-auto" />
                          ) : (
                            <span className="text-sm text-gray-700">{item.premium}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.enterprise === '✓' ? (
                            <Check className="w-5 h-5 text-green-600 mx-auto" />
                          ) : item.enterprise === '✗' ? (
                            <X className="w-5 h-5 text-red-500 mx-auto" />
                          ) : (
                            <span className="text-sm text-gray-700">{item.enterprise}</span>
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

        {/* FAQ Section */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardHeader>
            <CardTitle className="text-2xl">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-bold text-gray-900 mb-2">💰 What are "AI generations" and why are they limited?</h3>
              <p className="text-gray-700 text-sm">
                Each AI-generated meal plan costs us ₹10 in API fees. To keep pricing affordable, we have monthly limits. 
                <strong> But here's the smart part:</strong> Use our FREE templates instead! Clone them unlimited times at ₹0 cost!
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">🆓 Are templates really unlimited and FREE?</h3>
              <p className="text-gray-700 text-sm">
                <strong>YES!</strong> Once you generate 1 AI plan and save it as a template, you can use it for 100 clients at ZERO cost. 
                This is how you save money while scaling your practice!
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">💎 What's the difference between Basic and Pro plans?</h3>
              <p className="text-gray-700 text-sm">
                <strong>Basic Plans:</strong> RDA-based nutrition planning for weight loss/gain, maintenance (included in all tiers)<br/>
                <strong>Pro Plans:</strong> Disease-specific clinical planning (Diabetes, PCOS, Thyroid, etc.) with medical guidelines and lab tracking (Professional tier and above)
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">📈 Can I upgrade/downgrade anytime?</h3>
              <p className="text-gray-700 text-sm">
                Yes! Upgrade anytime as you grow. Downgrade at the end of your billing cycle. No lock-in period.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">👥 What if I exceed my client limit?</h3>
              <p className="text-gray-700 text-sm">
                You'll be prompted to upgrade to the next tier. We don't delete any data - your clients and plans remain safe.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">🎓 I'm a student. Which plan should I choose?</h3>
              <p className="text-gray-700 text-sm">
                Start with <strong>Student (₹499/mo)</strong> plan! It gives you everything to build your first 10 clients. 
                Upgrade to Professional once you cross 10 clients or need Pro disease-specific planning.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">💳 What payment methods do you accept?</h3>
              <p className="text-gray-700 text-sm">
                UPI, Credit/Debit cards, Net banking. All plans are auto-renewed monthly unless cancelled.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Final CTA */}
        <Card className="border-none shadow-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white">
          <CardContent className="p-12 text-center">
            <h2 className="text-4xl font-bold mb-4">Ready to Transform Lives? 🌟</h2>
            <p className="text-xl mb-6 text-white/90">
              Join 1000+ health coaches already using Mealie to grow their practice
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button 
                size="lg"
                className="bg-white text-orange-600 hover:bg-orange-50 h-14 px-8 text-lg"
              >
                Start 7-Day Free Trial
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10 h-14 px-8 text-lg"
              >
                Book a Demo
              </Button>
            </div>
            <p className="text-sm mt-4 text-white/80">
              No credit card required • Cancel anytime • 30-day money-back guarantee
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}