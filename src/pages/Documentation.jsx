import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Users,
  DollarSign,
  Megaphone,
  Settings,
  CheckCircle2,
  Download,
  Mail,
  Phone,
  Video,
  FileText,
  Shield,
  TrendingUp
} from "lucide-react";

export default function Documentation() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen p-4 md:p-8 print:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between print:block">
          <div>
            <h1 className="text-5xl font-bold text-gray-900 mb-2">Mealie Pro Documentation</h1>
            <p className="text-xl text-gray-600">Complete Implementation & Business Guide</p>
          </div>
          <Button onClick={handlePrint} className="bg-gradient-to-r from-orange-500 to-red-500 print:hidden">
            <Download className="w-4 h-4 mr-2" />
            Download as PDF
          </Button>
        </div>

        {/* Table of Contents */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-orange-50 to-red-50 print:shadow-none print:border print:border-gray-300">
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-orange-600" />
              Table of Contents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <a href="#business-plan" className="block p-3 bg-white rounded-lg hover:shadow transition-all">
                  <h3 className="font-bold text-lg">1. Business Plan & Pricing</h3>
                  <p className="text-sm text-gray-600">Revenue models and pricing strategy</p>
                </a>
                <a href="#cost-structure" className="block p-3 bg-white rounded-lg hover:shadow transition-all">
                  <h3 className="font-bold text-lg">2. Cost Structure</h3>
                  <p className="text-sm text-gray-600">Monthly expenses and breakeven analysis</p>
                </a>
                <a href="#payment-setup" className="block p-3 bg-white rounded-lg hover:shadow transition-all">
                  <h3 className="font-bold text-lg">3. Payment Integration</h3>
                  <p className="text-sm text-gray-600">Setting up Razorpay, Stripe, and UPI</p>
                </a>
                <a href="#marketing" className="block p-3 bg-white rounded-lg hover:shadow transition-all">
                  <h3 className="font-bold text-lg">4. Marketing Materials</h3>
                  <p className="text-sm text-gray-600">Templates and content strategies</p>
                </a>
              </div>
              <div className="space-y-2">
                <a href="#user-invitation" className="block p-3 bg-white rounded-lg hover:shadow transition-all">
                  <h3 className="font-bold text-lg">5. User Invitation Guide</h3>
                  <p className="text-sm text-gray-600">How to invite your team and clients</p>
                </a>
                <a href="#onboarding" className="block p-3 bg-white rounded-lg hover:shadow transition-all">
                  <h3 className="font-bold text-lg">6. Team Onboarding</h3>
                  <p className="text-sm text-gray-600">Training and support process</p>
                </a>
                <a href="#launch-strategy" className="block p-3 bg-white rounded-lg hover:shadow transition-all">
                  <h3 className="font-bold text-lg">7. Launch Strategy</h3>
                  <p className="text-sm text-gray-600">3-phase go-to-market plan</p>
                </a>
                <a href="#best-practices" className="block p-3 bg-white rounded-lg hover:shadow transition-all">
                  <h3 className="font-bold text-lg">8. Best Practices</h3>
                  <p className="text-sm text-gray-600">Tips for success</p>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 1: Business Plan & Pricing */}
        <div id="business-plan" className="page-break-before print:pt-8">
          <Card className="border-none shadow-xl print:shadow-none print:border print:border-gray-300">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white print:bg-gray-100 print:text-gray-900">
              <CardTitle className="text-3xl flex items-center gap-3">
                <DollarSign className="w-8 h-8" />
                1. Business Plan & Pricing Strategy
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div>
                <h3 className="text-2xl font-bold mb-4">Recommended Pricing Tiers</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 border-2 border-blue-200 rounded-lg">
                    <h4 className="font-bold text-xl mb-2">Student Coach</h4>
                    <p className="text-3xl font-bold text-blue-600 mb-2">₹499/month</p>
                    <ul className="space-y-1 text-sm">
                      <li>• Up to 5 clients</li>
                      <li>• Basic features</li>
                      <li>• Email support</li>
                      <li>• Community access</li>
                    </ul>
                  </div>
                  <div className="p-4 border-2 border-orange-500 rounded-lg bg-orange-50">
                    <Badge className="mb-2 bg-orange-600">RECOMMENDED</Badge>
                    <h4 className="font-bold text-xl mb-2">Professional</h4>
                    <p className="text-3xl font-bold text-orange-600 mb-2">₹1,499/month</p>
                    <ul className="space-y-1 text-sm">
                      <li>• Up to 25 clients</li>
                      <li>• All features</li>
                      <li>• Priority support</li>
                      <li>• White-label branding</li>
                    </ul>
                  </div>
                  <div className="p-4 border-2 border-purple-200 rounded-lg">
                    <h4 className="font-bold text-xl mb-2">Premium</h4>
                    <p className="text-3xl font-bold text-purple-600 mb-2">₹4,999/month</p>
                    <ul className="space-y-1 text-sm">
                      <li>• Unlimited clients</li>
                      <li>• Dedicated support</li>
                      <li>• API access</li>
                      <li>• Custom features</li>
                    </ul>
                  </div>
                  <div className="p-4 border-2 border-green-200 rounded-lg">
                    <h4 className="font-bold text-xl mb-2">Lifetime</h4>
                    <p className="text-3xl font-bold text-green-600 mb-2">₹29,999</p>
                    <p className="text-sm text-green-700 mb-2">One-time payment</p>
                    <ul className="space-y-1 text-sm">
                      <li>• All Premium features</li>
                      <li>• Lifetime access</li>
                      <li>• No recurring fees</li>
                      <li>• Future updates</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-4">Revenue Projections (Professional Plan)</h3>
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-3 text-left">Active Coaches</th>
                      <th className="border border-gray-300 p-3 text-left">Monthly Revenue</th>
                      <th className="border border-gray-300 p-3 text-left">Yearly Revenue</th>
                      <th className="border border-gray-300 p-3 text-left">Yearly Profit*</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 p-3">10 coaches</td>
                      <td className="border border-gray-300 p-3 font-bold">₹14,990</td>
                      <td className="border border-gray-300 p-3 font-bold">₹1,79,880</td>
                      <td className="border border-gray-300 p-3 font-bold text-green-600">₹1,39,880</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-3">30 coaches</td>
                      <td className="border border-gray-300 p-3 font-bold">₹44,970</td>
                      <td className="border border-gray-300 p-3 font-bold">₹5,39,640</td>
                      <td className="border border-gray-300 p-3 font-bold text-green-600">₹4,99,640</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-3">50 coaches</td>
                      <td className="border border-gray-300 p-3 font-bold">₹74,950</td>
                      <td className="border border-gray-300 p-3 font-bold">₹8,99,400</td>
                      <td className="border border-gray-300 p-3 font-bold text-green-600">₹8,49,400</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-3">100 coaches</td>
                      <td className="border border-gray-300 p-3 font-bold">₹1,49,900</td>
                      <td className="border border-gray-300 p-3 font-bold">₹17,98,800</td>
                      <td className="border border-gray-300 p-3 font-bold text-green-600">₹16,98,800</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-3">200 coaches</td>
                      <td className="border border-gray-300 p-3 font-bold">₹2,99,800</td>
                      <td className="border border-gray-300 p-3 font-bold">₹35,97,600</td>
                      <td className="border border-gray-300 p-3 font-bold text-green-600">₹33,97,600</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-sm text-gray-600 mt-2">*Profit assumes ₹40,000/month operating costs</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 2: Cost Structure */}
        <div id="cost-structure" className="page-break-before print:pt-8">
          <Card className="border-none shadow-xl print:shadow-none print:border print:border-gray-300">
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white print:bg-gray-100 print:text-gray-900">
              <CardTitle className="text-3xl flex items-center gap-3">
                <TrendingUp className="w-8 h-8" />
                2. Cost Structure & Breakeven Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div>
                <h3 className="text-2xl font-bold mb-4">Fixed Monthly Costs</h3>
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-3 text-left">Expense Category</th>
                      <th className="border border-gray-300 p-3 text-left">Amount (₹/month)</th>
                      <th className="border border-gray-300 p-3 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 p-3">Platform (Base44)</td>
                      <td className="border border-gray-300 p-3 font-bold">₹8,000</td>
                      <td className="border border-gray-300 p-3">Database, hosting, API calls</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-3">Support Person</td>
                      <td className="border border-gray-300 p-3 font-bold">₹10,000</td>
                      <td className="border border-gray-300 p-3">Customer support, onboarding</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-3">Marketing</td>
                      <td className="border border-gray-300 p-3 font-bold">₹15,000</td>
                      <td className="border border-gray-300 p-3">Ads, content, social media</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-3">Miscellaneous</td>
                      <td className="border border-gray-300 p-3 font-bold">₹7,000</td>
                      <td className="border border-gray-300 p-3">Tools, subscriptions, misc</td>
                    </tr>
                    <tr className="bg-blue-50">
                      <td className="border border-gray-300 p-3 font-bold">TOTAL</td>
                      <td className="border border-gray-300 p-3 font-bold text-xl text-blue-600">₹40,000</td>
                      <td className="border border-gray-300 p-3">Per month</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-4">Breakeven Points by Pricing Tier</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <p className="text-sm text-gray-600 mb-2">At ₹1,499/coach</p>
                    <p className="text-4xl font-bold text-blue-600 mb-2">27</p>
                    <p className="text-lg font-semibold">coaches needed</p>
                    <p className="text-sm text-gray-600 mt-2">= ₹40,473/month revenue</p>
                  </div>
                  <div className="p-6 bg-green-50 rounded-lg border-2 border-green-200">
                    <p className="text-sm text-gray-600 mb-2">At ₹999/coach</p>
                    <p className="text-4xl font-bold text-green-600 mb-2">41</p>
                    <p className="text-lg font-semibold">coaches needed</p>
                    <p className="text-sm text-gray-600 mt-2">= ₹40,959/month revenue</p>
                  </div>
                  <div className="p-6 bg-purple-50 rounded-lg border-2 border-purple-200">
                    <p className="text-sm text-gray-600 mb-2">At ₹499/coach</p>
                    <p className="text-4xl font-bold text-purple-600 mb-2">81</p>
                    <p className="text-lg font-semibold">coaches needed</p>
                    <p className="text-sm text-gray-600 mt-2">= ₹40,419/month revenue</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 3: Payment Integration */}
        <div id="payment-setup" className="page-break-before print:pt-8">
          <Card className="border-none shadow-xl print:shadow-none print:border print:border-gray-300">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white print:bg-gray-100 print:text-gray-900">
              <CardTitle className="text-3xl flex items-center gap-3">
                <Settings className="w-8 h-8" />
                3. Payment Integration Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div>
                <h3 className="text-2xl font-bold mb-4">4-Step Integration Process</h3>
                <div className="space-y-4">
                  <div className="p-6 border-l-4 border-blue-500 bg-blue-50 rounded">
                    <h4 className="font-bold text-xl mb-2">Step 1: Create Payment Gateway Account</h4>
                    <p className="text-gray-700 mb-3">Sign up for Razorpay (recommended for India) or Stripe (for international payments)</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      <li>Go to <a href="https://razorpay.com" className="text-blue-600 underline">razorpay.com</a> or <a href="https://stripe.com" className="text-blue-600 underline">stripe.com</a></li>
                      <li>Complete business registration</li>
                      <li>Submit required documents (PAN, GST, Bank details)</li>
                      <li>Wait for account approval (1-3 days)</li>
                    </ul>
                  </div>

                  <div className="p-6 border-l-4 border-green-500 bg-green-50 rounded">
                    <h4 className="font-bold text-xl mb-2">Step 2: Get API Keys</h4>
                    <p className="text-gray-700 mb-3">After account approval, generate your API credentials</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      <li>Navigate to Settings → API Keys</li>
                      <li>Generate Test Mode keys first</li>
                      <li>Later generate Live Mode keys</li>
                      <li>Keep these keys secure and never share publicly</li>
                    </ul>
                  </div>

                  <div className="p-6 border-l-4 border-orange-500 bg-orange-50 rounded">
                    <h4 className="font-bold text-xl mb-2">Step 3: Configure Webhooks</h4>
                    <p className="text-gray-700 mb-3">Set up webhooks to receive real-time payment notifications</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      <li>Go to Webhooks section in dashboard</li>
                      <li>Add your webhook URL from Base44</li>
                      <li>Select events to listen for (payment.success, etc.)</li>
                      <li>Save webhook secret for verification</li>
                    </ul>
                  </div>

                  <div className="p-6 border-l-4 border-purple-500 bg-purple-50 rounded">
                    <h4 className="font-bold text-xl mb-2">Step 4: Test Payments</h4>
                    <p className="text-gray-700 mb-3">Thoroughly test before going live</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      <li>Use test mode to simulate payments</li>
                      <li>Test different payment methods (UPI, cards, etc.)</li>
                      <li>Verify webhook notifications are received</li>
                      <li>Check payment status updates correctly</li>
                      <li>Only switch to Live mode after thorough testing</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-4">Payment Methods Supported</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border-2 border-gray-200 rounded-lg">
                    <h4 className="font-bold text-lg mb-2">💳 Razorpay</h4>
                    <p className="text-sm text-gray-700 mb-2">Best for Indian market</p>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• UPI (Google Pay, PhonePe, Paytm)</li>
                      <li>• Credit/Debit Cards</li>
                      <li>• NetBanking</li>
                      <li>• Wallets (Paytm, Freecharge)</li>
                    </ul>
                  </div>
                  <div className="p-4 border-2 border-gray-200 rounded-lg">
                    <h4 className="font-bold text-lg mb-2">💵 Stripe</h4>
                    <p className="text-sm text-gray-700 mb-2">Best for international</p>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• Credit/Debit Cards</li>
                      <li>• Apple Pay / Google Pay</li>
                      <li>• Bank Transfers</li>
                      <li>• Multiple currencies</li>
                    </ul>
                  </div>
                  <div className="p-4 border-2 border-gray-200 rounded-lg">
                    <h4 className="font-bold text-lg mb-2">🏦 Bank Transfer</h4>
                    <p className="text-sm text-gray-700 mb-2">Direct to your account</p>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• NEFT / RTGS / IMPS</li>
                      <li>• No transaction fees</li>
                      <li>• Manual verification needed</li>
                      <li>• Good for large amounts</li>
                    </ul>
                  </div>
                  <div className="p-4 border-2 border-gray-200 rounded-lg">
                    <h4 className="font-bold text-lg mb-2">📱 UPI Direct</h4>
                    <p className="text-sm text-gray-700 mb-2">Your UPI ID</p>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• Share your UPI ID</li>
                      <li>• Instant transfers</li>
                      <li>• No setup required</li>
                      <li>• Manual recording</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 4: Marketing Materials */}
        <div id="marketing" className="page-break-before print:pt-8">
          <Card className="border-none shadow-xl print:shadow-none print:border print:border-gray-300">
            <CardHeader className="bg-gradient-to-r from-pink-500 to-red-500 text-white print:bg-gray-100 print:text-gray-900">
              <CardTitle className="text-3xl flex items-center gap-3">
                <Megaphone className="w-8 h-8" />
                4. Marketing Materials & Strategy
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div>
                <h3 className="text-2xl font-bold mb-4">Social Media Content Calendar</h3>
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-3 text-left">Day</th>
                      <th className="border border-gray-300 p-3 text-left">Content Type</th>
                      <th className="border border-gray-300 p-3 text-left">Topic Ideas</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 p-3 font-bold">Monday</td>
                      <td className="border border-gray-300 p-3">Motivation</td>
                      <td className="border border-gray-300 p-3">Transformation stories, Success quotes</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-3 font-bold">Tuesday</td>
                      <td className="border border-gray-300 p-3">Education</td>
                      <td className="border border-gray-300 p-3">Nutrition tips, Myth busters</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-3 font-bold">Wednesday</td>
                      <td className="border border-gray-300 p-3">Recipe</td>
                      <td className="border border-gray-300 p-3">Healthy recipe, Meal prep guide</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-3 font-bold">Thursday</td>
                      <td className="border border-gray-300 p-3">Engagement</td>
                      <td className="border border-gray-300 p-3">Poll, Q&A, Challenge announcement</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-3 font-bold">Friday</td>
                      <td className="border border-gray-300 p-3">Testimonial</td>
                      <td className="border border-gray-300 p-3">Client success, Before/After</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-3 font-bold">Saturday</td>
                      <td className="border border-gray-300 p-3">Lifestyle</td>
                      <td className="border border-gray-300 p-3">Self-care tips, Wellness advice</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-3 font-bold">Sunday</td>
                      <td className="border border-gray-300 p-3">Personal</td>
                      <td className="border border-gray-300 p-3">Behind the scenes, Day in the life</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-4">Email Marketing Templates</h3>
                <div className="space-y-4">
                  <div className="p-4 border-2 border-gray-200 rounded-lg">
                    <h4 className="font-bold text-lg mb-2">Welcome Email Sequence (5 emails)</h4>
                    <ul className="space-y-2 text-sm">
                      <li><strong>Day 1:</strong> Welcome + What to expect</li>
                      <li><strong>Day 3:</strong> Your personalized plan is ready</li>
                      <li><strong>Day 7:</strong> Tips for your first week</li>
                      <li><strong>Day 14:</strong> Check-in + Support resources</li>
                      <li><strong>Day 30:</strong> Celebrate first milestone</li>
                    </ul>
                  </div>

                  <div className="p-4 border-2 border-gray-200 rounded-lg">
                    <h4 className="font-bold text-lg mb-2">Weekly Newsletter Template</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• Nutrition tip of the week</li>
                      <li>• Recipe of the week</li>
                      <li>• Client spotlight/success story</li>
                      <li>• Upcoming events/webinars</li>
                      <li>• Call to action (book consultation)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-4">6-Month Marketing Roadmap</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                    <h4 className="font-bold text-lg mb-2">Month 1-2: Build Foundation</h4>
                    <ul className="space-y-1 text-sm">
                      <li>✓ Create social media profiles</li>
                      <li>✓ Design logo and branding</li>
                      <li>✓ Build content library (20+ posts)</li>
                      <li>✓ Set up email marketing</li>
                      <li>✓ Launch website/landing page</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                    <h4 className="font-bold text-lg mb-2">Month 3-4: Grow Audience</h4>
                    <ul className="space-y-1 text-sm">
                      <li>✓ Post consistently (3x per week)</li>
                      <li>✓ Run free webinar/workshop</li>
                      <li>✓ Start email list (lead magnet)</li>
                      <li>✓ Collaborate with 2-3 influencers</li>
                      <li>✓ Join health/fitness communities</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                    <h4 className="font-bold text-lg mb-2">Month 5-6: Scale Business</h4>
                    <ul className="space-y-1 text-sm">
                      <li>✓ Launch paid ads (₹10k budget)</li>
                      <li>✓ Run 30-day challenge</li>
                      <li>✓ Build referral program</li>
                      <li>✓ Partner with gyms/clinics</li>
                      <li>✓ Automate systems</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 5: User Invitation */}
        <div id="user-invitation" className="page-break-before print:pt-8">
          <Card className="border-none shadow-xl print:shadow-none print:border print:border-gray-300">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white print:bg-gray-100 print:text-gray-900">
              <CardTitle className="text-3xl flex items-center gap-3">
                <Users className="w-8 h-8" />
                5. User Invitation Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div>
                <h3 className="text-2xl font-bold mb-4">Step-by-Step: Invite Your Team</h3>
                <div className="space-y-4">
                  <div className="p-6 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                    <h4 className="font-bold text-xl mb-3">Method 1: Through Base44 Dashboard (Recommended)</h4>
                    <ol className="space-y-2">
                      <li className="flex gap-3">
                        <span className="font-bold text-blue-600 flex-shrink-0">1.</span>
                        <span><strong>Go to Dashboard:</strong> Click on "Dashboard" in the left sidebar or go to your Base44 dashboard directly</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-blue-600 flex-shrink-0">2.</span>
                        <span><strong>Navigate to Users:</strong> Click on "Users" or "Team" section</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-blue-600 flex-shrink-0">3.</span>
                        <span><strong>Invite New Users:</strong> Click "Invite User" or "Add User" button</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-blue-600 flex-shrink-0">4.</span>
                        <span><strong>Enter Details:</strong> Email address and select role (Admin for dietitians, User for clients)</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-blue-600 flex-shrink-0">5.</span>
                        <span><strong>Send Invitation:</strong> Click "Send Invitation" - they'll receive an email</span>
                      </li>
                    </ol>
                  </div>

                  <div className="p-6 bg-amber-50 rounded-lg border-l-4 border-amber-500">
                    <h4 className="font-bold text-xl mb-3">⚠️ Important Notes</h4>
                    <ul className="space-y-2">
                      <li className="flex gap-2">
                        <span className="text-amber-600">•</span>
                        <span><strong>You CANNOT create users through code</strong> - Users must be invited through Base44 dashboard</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-amber-600">•</span>
                        <span><strong>Security feature:</strong> This prevents unauthorized user creation</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-amber-600">•</span>
                        <span><strong>User limits:</strong> Check your Base44 plan for user limits</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-amber-600">•</span>
                        <span><strong>Client setup:</strong> After inviting, create their Client profile in ClientManagement page</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-4">User Roles Explained</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 bg-purple-50 rounded-lg border-2 border-purple-200">
                    <h4 className="font-bold text-xl mb-3 text-purple-700">Admin Role (Dietitians)</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" /> <span>Access to DietitianDashboard</span></li>
                      <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" /> <span>Can manage all clients</span></li>
                      <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" /> <span>Can see all appointments</span></li>
                      <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" /> <span>Can view all messages</span></li>
                      <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" /> <span>Can create meal plans</span></li>
                      <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" /> <span>Full platform access</span></li>
                    </ul>
                  </div>

                  <div className="p-6 bg-green-50 rounded-lg border-2 border-green-200">
                    <h4 className="font-bold text-xl mb-3 text-green-700">User Role (Clients)</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" /> <span>Access to their own dashboard</span></li>
                      <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" /> <span>Can view their meal plan</span></li>
                      <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" /> <span>Can track their progress</span></li>
                      <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" /> <span>Can message their dietitian</span></li>
                      <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" /> <span>Can log food</span></li>
                      <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" /> <span>Limited to their own data</span></li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-4">Invitation Email Template</h3>
                <div className="p-6 bg-gray-50 rounded-lg border-2 border-gray-300 font-mono text-sm">
                  <p className="font-bold mb-4">Subject: Welcome to Mealie Pro - Your Dietitian Platform</p>
                  <p className="mb-2">Hi [Name],</p>
                  <p className="mb-4">I'm excited to invite you to join our Mealie Pro platform!</p>
                  <p className="mb-2">🔗 App Link: https://[your-app-name].base44.app</p>
                  <p className="mb-4">📧 You should receive an invitation email shortly. Please check your spam folder if you don't see it.</p>
                  <p className="mb-2 font-bold">What to do:</p>
                  <p className="ml-4 mb-1">1. Check your email for the invitation</p>
                  <p className="ml-4 mb-1">2. Click the link and set your password</p>
                  <p className="ml-4 mb-1">3. Login at the app link above</p>
                  <p className="ml-4 mb-4">4. Start managing your clients!</p>
                  <p className="mb-2">Need help? Just reply to this email.</p>
                  <p className="mt-4">Best,<br />[Your Name]</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 6: Onboarding */}
        <div id="onboarding" className="page-break-before print:pt-8">
          <Card className="border-none shadow-xl print:shadow-none print:border print:border-gray-300">
            <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white print:bg-gray-100 print:text-gray-900">
              <CardTitle className="text-3xl flex items-center gap-3">
                <Video className="w-8 h-8" />
                6. Team Onboarding & Training
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div>
                <h3 className="text-2xl font-bold mb-4">Week-by-Week Onboarding Plan</h3>
                <div className="space-y-4">
                  <div className="p-6 bg-blue-50 rounded-lg">
                    <h4 className="font-bold text-xl mb-3 text-blue-700">Week 1: Foundation</h4>
                    <table className="w-full">
                      <tbody>
                        <tr>
                          <td className="py-2 font-semibold w-24">Day 1:</td>
                          <td>Invite 2-3 dietitians, Platform tour video call</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="py-2 font-semibold">Day 2:</td>
                          <td>Help them login and explore dashboard</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-semibold">Day 3:</td>
                          <td>Train on client management features</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="py-2 font-semibold">Day 4:</td>
                          <td>Invite 2-3 more dietitians, Meal planning training</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-semibold">Day 5:</td>
                          <td>Get feedback, Fix any issues, Q&A session</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="p-6 bg-green-50 rounded-lg">
                    <h4 className="font-bold text-xl mb-3 text-green-700">Week 2: Practice</h4>
                    <table className="w-full">
                      <tbody>
                        <tr>
                          <td className="py-2 font-semibold w-24">Day 1-2:</td>
                          <td>Each coach adds 1 test client</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="py-2 font-semibold">Day 3-4:</td>
                          <td>Practice creating meal plans and messaging</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-semibold">Day 5:</td>
                          <td>Group training call, Share best practices</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="p-6 bg-orange-50 rounded-lg">
                    <h4 className="font-bold text-xl mb-3 text-orange-700">Week 3-4: Scale</h4>
                    <table className="w-full">
                      <tbody>
                        <tr>
                          <td className="py-2 font-semibold w-24">Week 3:</td>
                          <td>Invite remaining team members, Repeat training</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="py-2 font-semibold">Week 4:</td>
                          <td>Everyone onboards their real clients, Daily support available</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-4">Training Checklist for New Coaches</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-bold text-lg mb-2">Platform Basics</h4>
                    <div className="space-y-1 text-sm">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="print:hidden" /> Login & password reset
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="print:hidden" /> Navigate dashboard
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="print:hidden" /> Update profile settings
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="print:hidden" /> Understand user roles
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-lg mb-2">Client Management</h4>
                    <div className="space-y-1 text-sm">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="print:hidden" /> Add new client
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="print:hidden" /> Calculate macros
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="print:hidden" /> Update client goals
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="print:hidden" /> Track client progress
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-lg mb-2">Meal Planning</h4>
                    <div className="space-y-1 text-sm">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="print:hidden" /> Generate AI meal plan
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="print:hidden" /> Customize meals
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="print:hidden" /> Save meal templates
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="print:hidden" /> Share plan with client
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-lg mb-2">Communication</h4>
                    <div className="space-y-1 text-sm">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="print:hidden" /> Send messages
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="print:hidden" /> Schedule appointments
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="print:hidden" /> Video call setup
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="print:hidden" /> Manage notifications
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-4">Support System Setup</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border-2 border-green-200 rounded-lg bg-green-50">
                    <h4 className="font-bold text-lg mb-2 flex items-center gap-2">
                      <Phone className="w-5 h-5 text-green-600" />
                      WhatsApp Group
                    </h4>
                    <ul className="text-sm space-y-1">
                      <li>• Quick questions</li>
                      <li>• Peer support</li>
                      <li>• Daily tips</li>
                      <li>• Announcements</li>
                    </ul>
                  </div>

                  <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                    <h4 className="font-bold text-lg mb-2 flex items-center gap-2">
                      <Video className="w-5 h-5 text-blue-600" />
                      Weekly Calls
                    </h4>
                    <ul className="text-sm space-y-1">
                      <li>• New features</li>
                      <li>• Q&A sessions</li>
                      <li>• Success stories</li>
                      <li>• Best practices</li>
                    </ul>
                  </div>

                  <div className="p-4 border-2 border-purple-200 rounded-lg bg-purple-50">
                    <h4 className="font-bold text-lg mb-2 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-purple-600" />
                      Documentation
                    </h4>
                    <ul className="text-sm space-y-1">
                      <li>• Video tutorials</li>
                      <li>• Written guides</li>
                      <li>• FAQ document</li>
                      <li>• Troubleshooting</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 7: Launch Strategy */}
        <div id="launch-strategy" className="page-break-before print:pt-8">
          <Card className="border-none shadow-xl print:shadow-none print:border print:border-gray-300">
            <CardHeader className="bg-gradient-to-r from-red-500 to-pink-500 text-white print:bg-gray-100 print:text-gray-900">
              <CardTitle className="text-3xl flex items-center gap-3">
                <TrendingUp className="w-8 h-8" />
                7. 3-Phase Launch Strategy
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-purple-50 rounded-lg border-2 border-purple-200">
                  <Badge className="bg-purple-600 text-white mb-3">Phase 1</Badge>
                  <h4 className="font-bold text-xl mb-3">Beta Launch</h4>
                  <p className="text-sm text-gray-600 mb-3">Month 1-2</p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-600 mt-0.5" />
                      <span>Invite 10-20 coaches for FREE</span>
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-600 mt-0.5" />
                      <span>Collect feedback & testimonials</span>
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-600 mt-0.5" />
                      <span>Build case studies</span>
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-600 mt-0.5" />
                      <span>Refine features based on feedback</span>
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-600 mt-0.5" />
                      <span>Fix any bugs or issues</span>
                    </li>
                  </ul>
                </div>

                <div className="p-6 bg-orange-50 rounded-lg border-2 border-orange-500">
                  <Badge className="bg-orange-600 text-white mb-3">Phase 2</Badge>
                  <h4 className="font-bold text-xl mb-3">Early Bird</h4>
                  <p className="text-sm text-gray-600 mb-3">Month 3-4</p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-orange-600 mt-0.5" />
                      <span>Launch at 50% discount</span>
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-orange-600 mt-0.5" />
                      <span>₹749/month instead of ₹1,499</span>
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-orange-600 mt-0.5" />
                      <span>Lock in 50-100 coaches</span>
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-orange-600 mt-0.5" />
                      <span>Generate initial revenue</span>
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-orange-600 mt-0.5" />
                      <span>Build social proof</span>
                    </li>
                  </ul>
                </div>

                <div className="p-6 bg-green-50 rounded-lg border-2 border-green-500">
                  <Badge className="bg-green-600 text-white mb-3">Phase 3</Badge>
                  <h4 className="font-bold text-xl mb-3">Full Launch</h4>
                  <p className="text-sm text-gray-600 mb-3">Month 5+</p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                      <span>Full pricing structure</span>
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                      <span>Scale marketing efforts</span>
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                      <span>Add enterprise tier</span>
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                      <span>Expand support team</span>
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                      <span>Launch affiliate program</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-4">Detailed Timeline</h3>
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-3 text-left">Week</th>
                      <th className="border border-gray-300 p-3 text-left">Activities</th>
                      <th className="border border-gray-300 p-3 text-left">Goals</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 p-3 font-bold">Week 1-2</td>
                      <td className="border border-gray-300 p-3">Platform testing, Beta invites, Onboarding first coaches</td>
                      <td className="border border-gray-300 p-3">5-10 active coaches</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-3 font-bold">Week 3-4</td>
                      <td className="border border-gray-300 p-3">Gather feedback, Fix bugs, Add polish</td>
                      <td className="border border-gray-300 p-3">10-15 active coaches</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-3 font-bold">Week 5-8</td>
                      <td className="border border-gray-300 p-3">Continue beta, Collect testimonials, Build case studies</td>
                      <td className="border border-gray-300 p-3">15-20 active coaches</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-3 font-bold">Week 9-12</td>
                      <td className="border border-gray-300 p-3">Early bird launch, Marketing push, Scale onboarding</td>
                      <td className="border border-gray-300 p-3">50-75 paying coaches</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-3 font-bold">Week 13-16</td>
                      <td className="border border-gray-300 p-3">Continue early bird, Optimize conversions, Build systems</td>
                      <td className="border border-gray-300 p-3">75-100 paying coaches</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-3 font-bold">Week 17+</td>
                      <td className="border border-gray-300 p-3">Full price launch, Scale operations, Hire team</td>
                      <td className="border border-gray-300 p-3">100+ paying coaches</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 8: Best Practices */}
        <div id="best-practices" className="page-break-before print:pt-8">
          <Card className="border-none shadow-xl print:shadow-none print:border print:border-gray-300">
            <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white print:bg-gray-100 print:text-gray-900">
              <CardTitle className="text-3xl flex items-center gap-3">
                <Shield className="w-8 h-8" />
                8. Best Practices & Tips for Success
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div>
                <h3 className="text-2xl font-bold mb-4">Client Onboarding Best Practices</h3>
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                    <h4 className="font-bold mb-2">1. Initial Consultation</h4>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• Spend 45-60 minutes understanding client goals</li>
                      <li>• Take detailed health history</li>
                      <li>• Set realistic expectations</li>
                      <li>• Explain your process clearly</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                    <h4 className="font-bold mb-2">2. Regular Check-ins</h4>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• Weekly messages for first month</li>
                      <li>• Bi-weekly after that</li>
                      <li>• Monthly progress reviews</li>
                      <li>• Quarterly goal reassessment</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                    <h4 className="font-bold mb-2">3. Communication Tips</h4>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• Respond within 24 hours</li>
                      <li>• Be empathetic and supportive</li>
                      <li>• Celebrate small wins</li>
                      <li>• Provide evidence-based advice</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-4">Data Security & Privacy</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border-2 border-red-200 rounded-lg bg-red-50">
                    <h4 className="font-bold text-lg mb-2 text-red-700">🔒 Security Checklist</h4>
                    <ul className="text-sm space-y-1">
                      <li>✓ Use strong, unique passwords</li>
                      <li>✓ Enable two-factor authentication</li>
                      <li>✓ Never share login credentials</li>
                      <li>✓ Log out from shared devices</li>
                      <li>✓ Regular security audits</li>
                    </ul>
                  </div>

                  <div className="p-4 border-2 border-purple-200 rounded-lg bg-purple-50">
                    <h4 className="font-bold text-lg mb-2 text-purple-700">📋 Privacy Guidelines</h4>
                    <ul className="text-sm space-y-1">
                      <li>✓ Keep client data confidential</li>
                      <li>✓ Don't share client information</li>
                      <li>✓ Get consent for testimonials</li>
                      <li>✓ Follow HIPAA guidelines (if applicable)</li>
                      <li>✓ Secure data backup</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-4">Growth Tips</h3>
                <div className="space-y-3">
                  <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-3xl">💡</div>
                    <div>
                      <h4 className="font-bold mb-1">Ask for Referrals</h4>
                      <p className="text-sm text-gray-700">Happy clients are your best marketers. Ask for referrals after they've seen results.</p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-3xl">📱</div>
                    <div>
                      <h4 className="font-bold mb-1">Leverage Social Proof</h4>
                      <p className="text-sm text-gray-700">Share success stories (with permission), testimonials, and before/after photos regularly.</p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-3xl">🎯</div>
                    <div>
                      <h4 className="font-bold mb-1">Niche Down</h4>
                      <p className="text-sm text-gray-700">Specialize in a specific area (PCOS, diabetes, sports nutrition) to stand out.</p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-3xl">🤝</div>
                    <div>
                      <h4 className="font-bold mb-1">Partner with Others</h4>
                      <p className="text-sm text-gray-700">Collaborate with gyms, yoga studios, doctors, and wellness centers.</p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-3xl">📊</div>
                    <div>
                      <h4 className="font-bold mb-1">Track Metrics</h4>
                      <p className="text-sm text-gray-700">Monitor client retention, satisfaction, results, and business growth monthly.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-4">Common Pitfalls to Avoid</h3>
                <div className="space-y-2">
                  <div className="flex gap-3 items-start p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                    <span className="text-red-600 font-bold text-xl">✗</span>
                    <div>
                      <h4 className="font-bold text-red-700">Over-promising Results</h4>
                      <p className="text-sm">Set realistic expectations. Health transformation takes time.</p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                    <span className="text-red-600 font-bold text-xl">✗</span>
                    <div>
                      <h4 className="font-bold text-red-700">Inconsistent Communication</h4>
                      <p className="text-sm">Regular touchpoints are crucial for client retention.</p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                    <span className="text-red-600 font-bold text-xl">✗</span>
                    <div>
                      <h4 className="font-bold text-red-700">Ignoring Feedback</h4>
                      <p className="text-sm">Listen to your clients and adapt your approach.</p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                    <span className="text-red-600 font-bold text-xl">✗</span>
                    <div>
                      <h4 className="font-bold text-red-700">Poor Documentation</h4>
                      <p className="text-sm">Keep detailed records of all client interactions and progress.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center py-12 print:pt-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Launch? 🚀</h2>
          <p className="text-xl text-gray-600 mb-8">
            You now have everything you need to build a successful health coaching platform!
          </p>
          <div className="flex gap-4 justify-center print:hidden">
            <Button onClick={handlePrint} size="lg" className="bg-gradient-to-r from-orange-500 to-red-500">
              <Download className="w-5 h-5 mr-2" />
              Download This Guide as PDF
            </Button>
          </div>
        </div>

        {/* Print Instructions */}
        <div className="hidden print:block text-center text-sm text-gray-600 mt-8">
          <p>© {new Date().getFullYear()} Mealie Pro Documentation</p>
          <p>For internal use only • Confidential</p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .page-break-before {
            page-break-before: always;
          }
          @page {
            margin: 2cm;
          }
        }
      `}</style>
    </div>
  );
}