import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Rocket,
  Target,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Zap,
  Heart,
  Globe,
  Users,
  Package,
  BarChart
} from "lucide-react";

export default function BusinessPlan() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const userType = user?.user_type || 'team_member';
  const isSuperAdmin = userType === 'super_admin';

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl">
          <CardHeader>
            <AlertTriangle className="w-16 h-16 mx-auto text-orange-500 mb-4" />
            <CardTitle className="text-center text-2xl">Super Admin Only</CardTitle>
            <CardDescription className="text-center text-lg">
              Business Plan is only available to platform owners
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <AlertDescription>
                This strategic document contains sensitive business information and is restricted to super admins.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-8">
          <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-lg px-6 py-2">
            <TrendingUp className="w-5 h-5 mr-2 inline" />
            Mealie Pro Platform
          </Badge>
          <h1 className="text-5xl font-bold text-gray-900">
            Complete Business Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Your roadmap to ₹14 Cr ARR by Year 3
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur grid grid-cols-6 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="market">Market</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
            <TabsTrigger value="risks">Risks & Mitigation</TabsTrigger>
            <TabsTrigger value="support">Support Plan</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                <CardTitle className="text-3xl">📊 Executive Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <p className="text-lg text-gray-700 leading-relaxed">
                  <strong>Mealie Pro</strong> is a comprehensive SaaS platform for Indian health coaches, nutritionists, and dietitians. The platform enables disease-reversal meal planning using the MPESS framework and complete business management.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-6 bg-blue-50 rounded-xl border-l-4 border-blue-500">
                    <h4 className="font-bold text-lg mb-2">🎯 Mission</h4>
                    <p className="text-sm text-gray-700">Empower health coaches with technology to reverse lifestyle diseases and transform lives through evidence-based nutrition</p>
                  </div>
                  
                  <div className="p-6 bg-green-50 rounded-xl border-l-4 border-green-500">
                    <h4 className="font-bold text-lg mb-2">💡 Vision</h4>
                    <p className="text-sm text-gray-700">Become India's leading health coaching platform, serving 10,000+ coaches and impacting 1 million lives by 2027</p>
                  </div>
                  
                  <div className="p-6 bg-orange-50 rounded-xl border-l-4 border-orange-500">
                    <h4 className="font-bold text-lg mb-2">🌟 Value Prop</h4>
                    <p className="text-sm text-gray-700">Only platform combining disease reversal protocols, MPESS wellness, and complete business tools in one system</p>
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white">
                  <h3 className="text-2xl font-bold mb-4">🎯 3-Year Target</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-white/80 text-sm">Year 3 ARR</p>
                      <p className="text-4xl font-bold">₹14 Cr</p>
                    </div>
                    <div>
                      <p className="text-white/80 text-sm">Active Users</p>
                      <p className="text-4xl font-bold">5,000</p>
                    </div>
                    <div>
                      <p className="text-white/80 text-sm">Lives Impacted</p>
                      <p className="text-4xl font-bold">100K+</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* USPs */}
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <CardTitle className="text-3xl">⚡ Your Competitive Advantages</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { title: "Disease Reversal Protocols", desc: "NO competitor has this. Evidence-based protocols for diabetes, PCOS, thyroid reversal" },
                    { title: "MPESS Holistic Framework", desc: "Unique Mind/Physical/Emotional/Social/Spiritual wellness integration" },
                    { title: "India-First Approach", desc: "Indian recipes, ICMR data, regional cuisines. Competitors are Western-focused" },
                    { title: "Complete Business System", desc: "Not just CRM. Includes marketing, payments, team management, AI tools" },
                    { title: "White-Label Capability", desc: "Student coaches can use their own branding. Perfect for training institutes" },
                    { title: "AI-Powered Intelligence", desc: "Smart meal generation, business strategy builder, content creation" },
                    { title: "Affordable Pricing", desc: "₹999/month vs ₹5000+ for international competitors" },
                    { title: "Built on Base44", desc: "Reliable infrastructure, easy updates, professional support" }
                  ].map((usp, i) => (
                    <div key={i} className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-l-4 border-green-500">
                      <h4 className="font-bold mb-2 text-green-900">{usp.title}</h4>
                      <p className="text-sm text-gray-700">{usp.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MARKET TAB */}
          <TabsContent value="market" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Globe className="w-8 h-8" />
                  Market Opportunity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-4">📈 Indian Health Market (MASSIVE!)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-red-50 rounded-xl border-2 border-red-200">
                      <h4 className="font-bold text-xl mb-3 text-red-900">The Problem (YOUR OPPORTUNITY)</h4>
                      <ul className="space-y-2 text-gray-700">
                        <li>• <strong>77 Million</strong> Indians with diabetes (2nd globally)</li>
                        <li>• <strong>315 Million</strong> with hypertension</li>
                        <li>• <strong>135 Million</strong> with obesity</li>
                        <li>• <strong>36 Million</strong> with PCOS</li>
                        <li>• <strong>42 Million</strong> with thyroid disorders</li>
                        <li>• Growing 15% year-on-year post-COVID</li>
                      </ul>
                    </div>
                    
                    <div className="p-6 bg-green-50 rounded-xl border-2 border-green-200">
                      <h4 className="font-bold text-xl mb-3 text-green-900">The Solution (YOUR MARKET)</h4>
                      <ul className="space-y-2 text-gray-700">
                        <li>• <strong>50,000+</strong> registered dietitians in India</li>
                        <li>• <strong>100,000+</strong> health coaches (certified + non-certified)</li>
                        <li>• <strong>₹12,000 Cr</strong> health & wellness market</li>
                        <li>• <strong>500+</strong> nutrition training institutes</li>
                        <li>• <strong>80%</strong> want to scale digitally but lack tools</li>
                        <li>• Average coach earns ₹30-50K/month (you help them 3x this)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">🎯 Target Customers (Who You Serve)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-2 border-purple-200 bg-purple-50">
                      <CardHeader>
                        <CardTitle className="text-lg">Primary (60%)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="font-bold mb-2">Certified Dietitians</p>
                        <ul className="text-sm space-y-1">
                          <li>• BSc/MSc Nutrition</li>
                          <li>• 25-45 years old</li>
                          <li>• Want to scale practice</li>
                          <li>• Need professional tools</li>
                          <li>• Will pay ₹2500-5000/month</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-blue-200 bg-blue-50">
                      <CardHeader>
                        <CardTitle className="text-lg">Secondary (30%)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="font-bold mb-2">Health Coaches</p>
                        <ul className="text-sm space-y-1">
                          <li>• Online certifications</li>
                          <li>• 30-50 years old</li>
                          <li>• Building from scratch</li>
                          <li>• Need credibility tools</li>
                          <li>• Will pay ₹1000-2500/month</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-green-200 bg-green-50">
                      <CardHeader>
                        <CardTitle className="text-lg">Tertiary (10%)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="font-bold mb-2">Training Institutes</p>
                        <ul className="text-sm space-y-1">
                          <li>• Coaching academies</li>
                          <li>• 50-500 students</li>
                          <li>• Want platform for students</li>
                          <li>• Need white-label</li>
                          <li>• Will pay ₹10K-50K/month</li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <AlertDescription className="text-lg">
                    <strong>BOTTOM LINE:</strong> You have a ₹12,000 Cr market with 150,000+ potential customers who desperately need your solution. Even capturing 0.5% = 750 users = ₹2.5 Cr ARR!
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* REVENUE TAB */}
          <TabsContent value="revenue" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                <CardTitle className="text-3xl flex items-center gap-2">
                  <DollarSign className="w-8 h-8" />
                  Revenue Model & Projections
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-4">💰 Pricing Strategy</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-2 border-gray-300">
                      <CardHeader className="bg-gray-50">
                        <CardTitle className="text-lg">Free Trial</CardTitle>
                        <p className="text-3xl font-bold text-gray-900">₹0</p>
                        <p className="text-sm text-gray-600">14 days</p>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <ul className="space-y-2 text-sm">
                          <li>✓ 5 clients max</li>
                          <li>✓ All features</li>
                          <li>✓ No credit card</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-blue-300 bg-blue-50">
                      <CardHeader className="bg-blue-100">
                        <CardTitle className="text-lg">Student</CardTitle>
                        <p className="text-3xl font-bold text-blue-900">₹999</p>
                        <p className="text-sm text-blue-700">/month</p>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <ul className="space-y-2 text-sm">
                          <li>✓ 25 clients</li>
                          <li>✓ Disease reversal</li>
                          <li>✓ Marketing tools</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-purple-300 bg-purple-50 relative">
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600">POPULAR</Badge>
                      <CardHeader className="bg-purple-100">
                        <CardTitle className="text-lg">Professional</CardTitle>
                        <p className="text-3xl font-bold text-purple-900">₹2,499</p>
                        <p className="text-sm text-purple-700">/month</p>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <ul className="space-y-2 text-sm">
                          <li>✓ 100 clients</li>
                          <li>✓ White-label</li>
                          <li>✓ Team (3)</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-orange-300 bg-orange-50">
                      <CardHeader className="bg-orange-100">
                        <CardTitle className="text-lg">Institute</CardTitle>
                        <p className="text-3xl font-bold text-orange-900">₹9,999</p>
                        <p className="text-sm text-orange-700">/month</p>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <ul className="space-y-2 text-sm">
                          <li>✓ Unlimited</li>
                          <li>✓ Custom domain</li>
                          <li>✓ Dedicated support</li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">📊 3-Year Revenue Projection</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border p-3 text-left">Metric</th>
                          <th className="border p-3 text-center">Year 1</th>
                          <th className="border p-3 text-center">Year 2</th>
                          <th className="border p-3 text-center">Year 3</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border p-3 font-semibold">Total Users</td>
                          <td className="border p-3 text-center">500</td>
                          <td className="border p-3 text-center">2,000</td>
                          <td className="border p-3 text-center">5,000</td>
                        </tr>
                        <tr className="bg-blue-50">
                          <td className="border p-3">Student (₹999)</td>
                          <td className="border p-3 text-center">300 (60%)</td>
                          <td className="border p-3 text-center">1,200 (60%)</td>
                          <td className="border p-3 text-center">3,000 (60%)</td>
                        </tr>
                        <tr className="bg-purple-50">
                          <td className="border p-3">Professional (₹2,499)</td>
                          <td className="border p-3 text-center">150 (30%)</td>
                          <td className="border p-3 text-center">600 (30%)</td>
                          <td className="border p-3 text-center">1,500 (30%)</td>
                        </tr>
                        <tr className="bg-orange-50">
                          <td className="border p-3">Institute (₹9,999)</td>
                          <td className="border p-3 text-center">50 (10%)</td>
                          <td className="border p-3 text-center">200 (10%)</td>
                          <td className="border p-3 text-center">500 (10%)</td>
                        </tr>
                        <tr className="bg-green-100 font-bold">
                          <td className="border p-3">Monthly Recurring Revenue</td>
                          <td className="border p-3 text-center">₹11.7 L</td>
                          <td className="border p-3 text-center">₹47 L</td>
                          <td className="border p-3 text-center">₹1.17 Cr</td>
                        </tr>
                        <tr className="bg-green-200 font-bold text-xl">
                          <td className="border p-3">Annual Recurring Revenue</td>
                          <td className="border p-3 text-center">₹1.4 Cr</td>
                          <td className="border p-3 text-center">₹5.6 Cr</td>
                          <td className="border p-3 text-center">₹14 Cr</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <Alert className="mt-4 border-blue-500 bg-blue-50">
                    <AlertDescription>
                      <strong>Assumptions:</strong> 25% annual churn, 40% free-to-paid conversion, mix of organic + paid acquisition. These are CONSERVATIVE estimates.
                    </AlertDescription>
                  </Alert>
                </div>

                <div className="p-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white">
                  <h3 className="text-2xl font-bold mb-4">💰 Additional Revenue Streams (Year 2+)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white/10 rounded-lg">
                      <h4 className="font-bold mb-2">Marketplace Commission</h4>
                      <p className="text-sm text-white/90">10-20% commission on meal prep services, supplements, lab tests sold through platform</p>
                      <p className="text-xl font-bold mt-2">Est: +₹50L-1Cr/year</p>
                    </div>
                    <div className="p-4 bg-white/10 rounded-lg">
                      <h4 className="font-bold mb-2">Premium Add-ons</h4>
                      <p className="text-sm text-white/90">Custom integrations, API access, priority support packages</p>
                      <p className="text-xl font-bold mt-2">Est: +₹30-50L/year</p>
                    </div>
                    <div className="p-4 bg-white/10 rounded-lg">
                      <h4 className="font-bold mb-2">Training & Certification</h4>
                      <p className="text-sm text-white/90">Platform training courses, certification programs for coaches</p>
                      <p className="text-xl font-bold mt-2">Est: +₹25-40L/year</p>
                    </div>
                    <div className="p-4 bg-white/10 rounded-lg">
                      <h4 className="font-bold mb-2">White-Label Licensing</h4>
                      <p className="text-sm text-white/90">Custom white-label setups for large institutes</p>
                      <p className="text-xl font-bold mt-2">Est: +₹1-2Cr/year</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* STRATEGY TAB */}
          <TabsContent value="strategy" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-pink-500 to-rose-500 text-white">
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Zap className="w-8 h-8" />
                  Go-to-Market Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-4">🎯 Phase 1: Launch & Validate (Months 1-3)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-blue-50 rounded-xl border-l-4 border-blue-500">
                      <h4 className="font-bold text-lg mb-3">Target: 50 Paying Users</h4>
                      <p className="text-sm mb-3"><strong>Channels:</strong></p>
                      <ul className="text-sm space-y-1">
                        <li>• Instagram health coaches (DM outreach)</li>
                        <li>• LinkedIn nutritionists (connection requests)</li>
                        <li>• WhatsApp groups (value-first approach)</li>
                        <li>• Partner with 3-5 training institutes</li>
                      </ul>
                    </div>

                    <div className="p-6 bg-green-50 rounded-xl border-l-4 border-green-500">
                      <h4 className="font-bold text-lg mb-3">Action Plan:</h4>
                      <ul className="text-sm space-y-2">
                        <li>✓ <strong>Week 1:</strong> Free webinar "Scale Your Nutrition Practice with Tech" (100 attendees)</li>
                        <li>✓ <strong>Week 2:</strong> Case study videos (3 beta users)</li>
                        <li>✓ <strong>Week 3:</strong> Referral program (give 1 month free)</li>
                        <li>✓ <strong>Week 4:</strong> Launch paid ads (₹50K budget)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">🚀 Phase 2: Growth (Months 4-12)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-6 bg-purple-50 rounded-xl border-l-4 border-purple-500">
                      <h4 className="font-bold text-lg mb-3">Target: 500 Users</h4>
                      <p className="text-sm mb-2"><strong>Content Marketing:</strong></p>
                      <ul className="text-sm space-y-1">
                        <li>• Daily Instagram reels (disease reversal success stories)</li>
                        <li>• SEO blog posts (nutrition coach tools, meal planning software)</li>
                        <li>• YouTube tutorials (how to use platform)</li>
                        <li>• Free resources (meal plan templates, client onboarding checklists)</li>
                      </ul>
                    </div>

                    <div className="p-6 bg-orange-50 rounded-xl border-l-4 border-orange-500">
                      <h4 className="font-bold text-lg mb-3">Paid Advertising:</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Facebook/Instagram ads (₹2L/month budget)</li>
                        <li>• Google Search ads ("nutrition software India")</li>
                        <li>• YouTube pre-roll (targeting health coaches)</li>
                        <li>• LinkedIn sponsored content</li>
                      </ul>
                      <p className="text-xs mt-2 text-orange-700"><strong>Target CAC:</strong> ₹5000-8000 per user</p>
                    </div>

                    <div className="p-6 bg-pink-50 rounded-xl border-l-4 border-pink-500">
                      <h4 className="font-bold text-lg mb-3">Partnerships:</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Top 10 health influencers (affiliate program 20%)</li>
                        <li>• 20 coaching institutes (bulk licensing)</li>
                        <li>• 5 certification bodies (recommended tool)</li>
                        <li>• Corporate wellness programs</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">⚡ Phase 3: Scale (Year 2-3)</h3>
                  <div className="space-y-3">
                    <div className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-l-4 border-blue-500">
                      <h4 className="font-bold text-xl mb-2">Target: 5,000 Users</h4>
                      <p className="text-gray-700"><strong>Enterprise Sales:</strong> Target large health coaching institutes (50-500 students) for bulk licensing at ₹10K-50K/month</p>
                    </div>
                    <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-l-4 border-green-500">
                      <p className="text-gray-700"><strong>International Expansion:</strong> Launch in US/UK/Australia targeting diaspora Indian health coaches (market size: 50K+)</p>
                    </div>
                    <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-l-4 border-purple-500">
                      <p className="text-gray-700"><strong>B2B2C Model:</strong> Partner with hospitals/clinics to provide platform to their in-house nutritionists (500+ hospitals in India)</p>
                    </div>
                    <div className="p-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border-l-4 border-orange-500">
                      <p className="text-gray-700"><strong>Marketplace Launch:</strong> Commission-based marketplace for meal prep services, supplement brands, lab tests, fitness trainers</p>
                    </div>
                  </div>
                </div>

                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <AlertDescription className="text-lg">
                    <strong>KEY SUCCESS FACTOR:</strong> Focus on retention over acquisition. Keep churn under 25% by providing exceptional support, regular feature updates, and community building.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* RISKS TAB */}
          <TabsContent value="risks" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-red-500 to-pink-500 text-white">
                <CardTitle className="text-3xl flex items-center gap-2">
                  <AlertTriangle className="w-8 h-8" />
                  Risks & Mitigation Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <Alert className="border-red-500 bg-red-50">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <AlertDescription className="text-lg">
                    <strong>IMPORTANT:</strong> Every business has risks. The key is identifying and preparing for them. Here's your complete risk mitigation plan.
                  </AlertDescription>
                </Alert>

                <div>
                  <h3 className="text-2xl font-bold mb-4">🚨 Technical Risks</h3>
                  <div className="space-y-4">
                    <Card className="border-2 border-red-200 bg-red-50">
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-bold text-lg text-red-900 mb-2">❌ RISK: Platform Downtime/Crashes</h4>
                            <p className="text-sm text-gray-700">Base44 infrastructure fails. App goes down. Users can't access.</p>
                          </div>
                          <div>
                            <h4 className="font-bold text-lg text-green-900 mb-2">✅ MITIGATION:</h4>
                            <ul className="text-sm space-y-1 text-gray-700">
                              <li>• Base44 has 99.9% uptime SLA</li>
                              <li>• Auto-backups every 6 hours</li>
                              <li>• Monitor with UptimeRobot (alerts if down)</li>
                              <li>• Have Base44 support contact ready</li>
                              <li>• Communicate proactively with users during issues</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-red-200 bg-red-50">
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-bold text-lg text-red-900 mb-2">❌ RISK: Data Loss</h4>
                            <p className="text-sm text-gray-700">Client data, meal plans, or user accounts get deleted/corrupted.</p>
                          </div>
                          <div>
                            <h4 className="font-bold text-lg text-green-900 mb-2">✅ MITIGATION:</h4>
                            <ul className="text-sm space-y-1 text-gray-700">
                              <li>• Base44 auto-backups (built-in)</li>
                              <li>• Request manual backup exports monthly</li>
                              <li>• Store critical backups in Google Drive</li>
                              <li>• Test data recovery quarterly</li>
                              <li>• User agreement includes data backup clause</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-red-200 bg-red-50">
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-bold text-lg text-red-900 mb-2">❌ RISK: Bugs/Broken Features</h4>
                            <p className="text-sm text-gray-700">Critical features stop working. AI meal planner breaks. Payment integration fails.</p>
                          </div>
                          <div>
                            <h4 className="font-bold text-lg text-green-900 mb-2">✅ MITIGATION:</h4>
                            <ul className="text-sm space-y-1 text-gray-700">
                              <li>• Test all features weekly</li>
                              <li>• Have users report bugs via in-app feedback</li>
                              <li>• Priority bug fixing within 24-48 hours</li>
                              <li>• Keep changelog for all updates</li>
                              <li>• Rollback capability for bad updates</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-red-200 bg-red-50">
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-bold text-lg text-red-900 mb-2">❌ RISK: Base44 Platform Discontinuation</h4>
                            <p className="text-sm text-gray-700">Base44 shuts down or changes pricing dramatically.</p>
                          </div>
                          <div>
                            <h4 className="font-bold text-lg text-green-900 mb-2">✅ MITIGATION:</h4>
                            <ul className="text-sm space-y-1 text-gray-700">
                              <li>• Base44 is well-funded and stable</li>
                              <li>• Have export scripts for all data</li>
                              <li>• Identify 2-3 alternative platforms (Bubble, FlutterFlow)</li>
                              <li>• Build on React (portable codebase)</li>
                              <li>• If needed, migration would take 2-3 months</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">💼 Business Risks</h3>
                  <div className="space-y-4">
                    <Card className="border-2 border-orange-200 bg-orange-50">
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-bold text-lg text-orange-900 mb-2">❌ RISK: High Churn Rate</h4>
                            <p className="text-sm text-gray-700">Users subscribe but cancel after 1-2 months. Can't retain customers.</p>
                          </div>
                          <div>
                            <h4 className="font-bold text-lg text-green-900 mb-2">✅ MITIGATION:</h4>
                            <ul className="text-sm space-y-1 text-gray-700">
                              <li>• Onboarding call for all new users</li>
                              <li>• Weekly check-in emails (value tips)</li>
                              <li>• Monthly webinars (new features + training)</li>
                              <li>• Exit surveys (learn why they leave)</li>
                              <li>• Annual plans (40% discount for upfront payment)</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-orange-200 bg-orange-50">
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-bold text-lg text-orange-900 mb-2">❌ RISK: Competition</h4>
                            <p className="text-sm text-gray-700">Bigger player enters market (HealthifyMe, Fittr). Price war starts.</p>
                          </div>
                          <div>
                            <h4 className="font-bold text-lg text-green-900 mb-2">✅ MITIGATION:</h4>
                            <ul className="text-sm space-y-1 text-gray-700">
                              <li>• Focus on B2B (coaches), not B2C (end users)</li>
                              <li>• Disease reversal + MPESS = unique moat</li>
                              <li>• Build strong community (hard to replicate)</li>
                              <li>• White-label = lock-in for institutes</li>
                              <li>• Move fast, add features competitors don't have</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-orange-200 bg-orange-50">
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-bold text-lg text-orange-900 mb-2">❌ RISK: Cash Flow Issues</h4>
                            <p className="text-sm text-gray-700">Can't pay Base44 subscription, marketing costs, or team salaries.</p>
                          </div>
                          <div>
                            <h4 className="font-bold text-lg text-green-900 mb-2">✅ MITIGATION:</h4>
                            <ul className="text-sm space-y-1 text-gray-700">
                              <li>• Bootstrap first 6 months (low burn)</li>
                              <li>• Charge annual upfront (improves cash flow)</li>
                              <li>• Raise pre-seed funding (₹50L-1Cr) if needed</li>
                              <li>• Keep 6 months runway always</li>
                              <li>• Monitor cash flow weekly</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-orange-200 bg-orange-50">
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-bold text-lg text-orange-900 mb-2">❌ RISK: Regulatory/Legal Issues</h4>
                            <p className="text-sm text-gray-700">Health/nutrition regulations change. Medical advice liability concerns.</p>
                          </div>
                          <div>
                            <h4 className="font-bold text-lg text-green-900 mb-2">✅ MITIGATION:</h4>
                            <ul className="text-sm space-y-1 text-gray-700">
                              <li>• Clear disclaimer: "We're a tool, not medical advisors"</li>
                              <li>• User agreement includes liability waiver</li>
                              <li>• Verify users are certified professionals</li>
                              <li>• Consult with healthcare lawyer (₹50K one-time)</li>
                              <li>• Get liability insurance (₹2-3L/year)</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <Alert className="border-blue-500 bg-blue-50">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  <AlertDescription className="text-lg">
                    <strong>BOTTOM LINE:</strong> Most risks are manageable with proper planning. The biggest risk is NOT starting. You have a strong product, massive market, and clear mitigation strategies. Execute with confidence!
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SUPPORT TAB */}
          <TabsContent value="support" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Shield className="w-8 h-8" />
                  Support & Technical Partnership Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <AlertDescription className="text-xl">
                    <strong>GOOD NEWS:</strong> You're building on Base44, which means you have professional infrastructure, automatic backups, security, and support built-in!
                  </AlertDescription>
                </Alert>

                <div>
                  <h3 className="text-2xl font-bold mb-4">🤝 Base44 Support Channels</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-2 border-blue-200 bg-blue-50">
                      <CardHeader>
                        <CardTitle className="text-lg">📧 Email Support</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <code className="bg-blue-100 px-3 py-2 rounded block mb-3 text-center">support@base44.app</code>
                        <ul className="text-sm space-y-1">
                          <li>✓ Response time: 24-48 hours</li>
                          <li>✓ For: Bug reports, feature requests</li>
                          <li>✓ Include: App URL, screenshots, error details</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-purple-200 bg-purple-50">
                      <CardHeader>
                        <CardTitle className="text-lg">💬 Live Chat</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm mb-3">Available in Base44 Dashboard</p>
                        <ul className="text-sm space-y-1">
                          <li>✓ Response time: During business hours</li>
                          <li>✓ For: Quick questions, urgent issues</li>
                          <li>✓ Access: base44.app dashboard</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-green-200 bg-green-50">
                      <CardHeader>
                        <CardTitle className="text-lg">📚 Documentation</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm mb-3">Comprehensive guides & tutorials</p>
                        <ul className="text-sm space-y-1">
                          <li>✓ Base44 docs: base44.app/docs</li>
                          <li>✓ Video tutorials</li>
                          <li>✓ Community forum</li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">🎯 Your Support Strategy (For Your Users)</h3>
                  <div className="space-y-4">
                    <Card className="border-2 border-orange-200 bg-orange-50">
                      <CardContent className="p-6">
                        <h4 className="font-bold text-xl mb-3">TIER 1: Self-Service (80% of queries)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="font-semibold mb-2">Build:</p>
                            <ul className="text-sm space-y-1">
                              <li>• Help Center (Notion or Google Sites)</li>
                              <li>• Video tutorials (YouTube)</li>
                              <li>• FAQ page in app</li>
                              <li>• Quick start guide</li>
                            </ul>
                          </div>
                          <div>
                            <p className="font-semibold mb-2">Cover:</p>
                            <ul className="text-sm space-y-1">
                              <li>• How to add clients</li>
                              <li>• How to create meal plans</li>
                              <li>• How to set up payment</li>
                              <li>• How to use white-label</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-blue-200 bg-blue-50">
                      <CardContent className="p-6">
                        <h4 className="font-bold text-xl mb-3">TIER 2: Email Support (15% of queries)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="font-semibold mb-2">Setup:</p>
                            <ul className="text-sm space-y-1">
                              <li>• support@yourdomain.com</li>
                              <li>• Use Google Workspace (₹125/month)</li>
                              <li>• Response SLA: 24 hours</li>
                              <li>• Use templates for common issues</li>
                            </ul>
                          </div>
                          <div>
                            <p className="font-semibold mb-2">Handle:</p>
                            <ul className="text-sm space-y-1">
                              <li>• Account/billing issues</li>
                              <li>• Feature questions</li>
                              <li>• Bug reports (escalate to Base44)</li>
                              <li>• Partnership inquiries</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-purple-200 bg-purple-50">
                      <CardContent className="p-6">
                        <h4 className="font-bold text-xl mb-3">TIER 3: Priority Support (5% of queries)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="font-semibold mb-2">For Professional & Institute Plans:</p>
                            <ul className="text-sm space-y-1">
                              <li>• WhatsApp support number</li>
                              <li>• Onboarding call (30 min)</li>
                              <li>• Monthly check-in</li>
                              <li>• Priority bug fixing</li>
                            </ul>
                          </div>
                          <div>
                            <p className="font-semibold mb-2">Response SLA:</p>
                            <ul className="text-sm space-y-1">
                              <li>• Critical issues: 4 hours</li>
                              <li>• High priority: 12 hours</li>
                              <li>• Normal: 24 hours</li>
                              <li>• Available: 9 AM - 6 PM IST</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">🚨 Emergency Escalation Plan</h3>
                  <div className="p-6 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border-2 border-red-300">
                    <h4 className="font-bold text-xl mb-4">When App is Down or Critical Bug:</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="font-bold text-red-600 text-xl">1.</span>
                        <div className="flex-1">
                          <p className="font-semibold">Verify the issue (2 min)</p>
                          <p className="text-sm text-gray-700">Check if it's app-wide or user-specific. Try different browsers/devices.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="font-bold text-red-600 text-xl">2.</span>
                        <div className="flex-1">
                          <p className="font-semibold">Contact Base44 immediately</p>
                          <p className="text-sm text-gray-700">Email: support@base44.app + Live chat on dashboard. Mark as "URGENT"</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="font-bold text-red-600 text-xl">3.</span>
                        <div className="flex-1">
                          <p className="font-semibold">Communicate with your users (5 min)</p>
                          <p className="text-sm text-gray-700">Email blast: "We're aware of the issue and working on fix. ETA: X hours"</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="font-bold text-red-600 text-xl">4.</span>
                        <div className="flex-1">
                          <p className="font-semibold">Monitor and follow up</p>
                          <p className="text-sm text-gray-700">Check every 30 min. Update users when fixed. Offer 1 week free as compensation.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">💪 Long-Term Support Plan</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-blue-50 rounded-xl border-l-4 border-blue-500">
                      <h4 className="font-bold text-lg mb-3">Year 1 (0-500 users)</h4>
                      <ul className="text-sm space-y-2">
                        <li>✓ You handle all support yourself (2-3 hours/day)</li>
                        <li>✓ Build help docs and video tutorials</li>
                        <li>✓ Learn common issues and create templates</li>
                        <li>✓ Monthly webinars for user training</li>
                      </ul>
                    </div>

                    <div className="p-6 bg-green-50 rounded-xl border-l-4 border-green-500">
                      <h4 className="font-bold text-lg mb-3">Year 2 (500-2000 users)</h4>
                      <ul className="text-sm space-y-2">
                        <li>✓ Hire 1 support person (₹25-30K/month)</li>
                        <li>✓ Use helpdesk software (Freshdesk, Zoho Desk)</li>
                        <li>✓ 24-hour email response time</li>
                        <li>✓ Community forum for peer support</li>
                      </ul>
                    </div>

                    <div className="p-6 bg-purple-50 rounded-xl border-l-4 border-purple-500">
                      <h4 className="font-bold text-lg mb-3">Year 3 (2000-5000 users)</h4>
                      <ul className="text-sm space-y-2">
                        <li>✓ Support team of 3-4 people</li>
                        <li>✓ 24/5 live chat support</li>
                        <li>✓ Dedicated success managers for enterprise</li>
                        <li>✓ AI chatbot for basic queries</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <AlertDescription className="text-xl">
                    <strong>✅ YOUR SUPPORT ADVANTAGE:</strong> Building on Base44 means infrastructure, security, backups, and platform support are handled. You only focus on user experience and customer success!
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Action Checklist */}
            <Card className="border-none shadow-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
              <CardHeader>
                <CardTitle className="text-3xl">✅ Your Action Checklist (Next 30 Days)</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-3">
                  {[
                    "Get custom domain (app.yourdomain.com) via Base44 support",
                    "Create help center (Notion/Google Sites) with 10 key tutorials",
                    "Set up support@yourdomain.com email",
                    "Record 5 video tutorials (how to add clients, create meal plans, etc.)",
                    "Create WhatsApp number for professional plan users",
                    "Set up UptimeRobot for monitoring (free)",
                    "Request monthly data backup from Base44",
                    "Write terms of service + user agreement (hire lawyer ₹25-50K)",
                    "Get liability insurance quote (₹2-3L/year)",
                    "Create user onboarding email sequence (3-5 emails)",
                    "Launch first webinar: 'How to Scale Your Nutrition Practice'",
                    "Start Instagram daily posting (meal prep tips, disease reversal success stories)"
                  ].map((item, i) => (
                    <div key={i} className="p-4 bg-white/10 rounded-lg flex items-start gap-3 hover:bg-white/20 transition-all cursor-pointer">
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <p className="text-white/90 flex-1">{item}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Final CTA */}
        <Card className="border-none shadow-2xl bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white">
          <CardContent className="p-12 text-center">
            <h2 className="text-5xl font-bold mb-6">🚀 You're Ready to Launch!</h2>
            <p className="text-2xl mb-8 opacity-90">
              You have the platform, the plan, and the market. Time to execute and build India's #1 health coaching SaaS! 💪
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="p-6 bg-white/10 rounded-xl backdrop-blur">
                <p className="text-5xl font-bold mb-2">₹14 Cr</p>
                <p className="text-lg opacity-90">ARR by Year 3</p>
              </div>
              <div className="p-6 bg-white/10 rounded-xl backdrop-blur">
                <p className="text-5xl font-bold mb-2">5,000</p>
                <p className="text-lg opacity-90">Health Coaches</p>
              </div>
              <div className="p-6 bg-white/10 rounded-xl backdrop-blur">
                <p className="text-5xl font-bold mb-2">100K+</p>
                <p className="text-lg opacity-90">Lives Impacted</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}