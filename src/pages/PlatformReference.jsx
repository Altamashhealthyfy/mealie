import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Download, Crown } from "lucide-react";

export default function PlatformReference() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-white">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between no-print">
          <div>
            <Badge className="bg-purple-600 text-white mb-2">
              <Crown className="w-4 h-4 mr-1" />
              Admin Reference
            </Badge>
            <h1 className="text-4xl font-bold text-gray-900">Platform Documentation & Setup</h1>
          </div>
          <Button onClick={handlePrint} className="bg-gradient-to-r from-blue-500 to-cyan-500">
            <Download className="w-4 h-4 mr-2" />
            Download as PDF
          </Button>
        </div>

        {/* BUSINESS PLAN */}
        <Card className="border-2">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
            <CardTitle className="text-2xl">📊 Business Plan Overview</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-3">Market Opportunity</h2>
              <p className="text-gray-700 leading-relaxed">
                India has 300,000+ health coaches with 90% struggling to use tech effectively. 
                Our platform solves: meal planning (manual/time-consuming), client tracking (Excel chaos), 
                and business operations (spreadsheet overload). Target: 10,000 coaches @ ₹999/month = ₹1Cr MRR.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">Revenue Model</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-bold text-blue-900 mb-2">Student (₹499/month)</h3>
                  <ul className="text-sm space-y-1 text-gray-700">
                    <li>• 5 AI meal plans/month</li>
                    <li>• 10 AI recipes</li>
                    <li>• Unlimited templates</li>
                    <li>• Up to 10 clients</li>
                  </ul>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-bold text-green-900 mb-2">Professional (₹999/month)</h3>
                  <ul className="text-sm space-y-1 text-gray-700">
                    <li>• 20 AI meal plans/month</li>
                    <li>• 50 AI recipes</li>
                    <li>• Unlimited templates</li>
                    <li>• Unlimited clients</li>
                    <li>• White-label branding</li>
                  </ul>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h3 className="font-bold text-purple-900 mb-2">Premium (₹1999/month)</h3>
                  <ul className="text-sm space-y-1 text-gray-700">
                    <li>• Unlimited everything</li>
                    <li>• Priority support</li>
                    <li>• Advanced analytics</li>
                    <li>• Custom integrations</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">Go-to-Market Strategy</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li><strong>Health Coach Academy Students:</strong> 5000+ existing students → Convert to SaaS users (₹499/month)</li>
                <li><strong>Instagram/Facebook Ads:</strong> Target dietitians, nutritionists → Free trial → Paid users</li>
                <li><strong>WhatsApp Marketing:</strong> Current student database → Demo videos → Onboarding</li>
                <li><strong>Partnership Model:</strong> Tie-up with nutrition academies → Bulk licensing</li>
              </ol>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">Risk Mitigation</h2>
              <ul className="space-y-2 text-gray-700">
                <li>• <strong>Usage Overage Protection:</strong> AI generations have monthly limits with overage charges</li>
                <li>• <strong>Template Strategy:</strong> Encourage template reuse to reduce AI costs</li>
                <li>• <strong>Churn Prevention:</strong> Monthly webinars, support groups, feature updates</li>
                <li>• <strong>White-Label Lock-in:</strong> Once branded, harder to switch platforms</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* TEAM SETUP GUIDE */}
        <Card className="border-2">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
            <CardTitle className="text-2xl">👥 Team Setup Guide</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-3">User Roles & Hierarchy</h2>
              <div className="space-y-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h3 className="font-bold text-purple-900 mb-2">👑 Super Admin</h3>
                  <p className="text-sm text-gray-700">Platform owner. Sees everything. Can add team & student coaches. Full access.</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-bold text-blue-900 mb-2">👥 Team Member</h3>
                  <p className="text-sm text-gray-700">Employee. Sees all clients. Can create plans. Cannot manage team or billing.</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-bold text-green-900 mb-2">🎓 Student Coach</h3>
                  <p className="text-sm text-gray-700">Independent coach. Pays ₹499/month. Sees only their clients. White-labeled.</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <h3 className="font-bold text-orange-900 mb-2">👤 Client</h3>
                  <p className="text-sm text-gray-700">End user. Added via Client Management. Receives meal plans & tracks progress.</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">Step-by-Step: Adding Users</h2>
              <div className="space-y-6">
                <div className="p-6 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <h3 className="font-bold text-blue-900 mb-3">Adding Core Team Member:</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                    <li>base44.app → Login → Your App → Users → Invite User</li>
                    <li>Email + SELECT 'Admin' role</li>
                    <li>They accept email → Create password</li>
                    <li>Data → User entity → Edit their row</li>
                    <li>Set: user_type = 'team_member'</li>
                    <li>Set: parent_coach_id = YOUR_USER_ID</li>
                    <li>Leave business_name blank</li>
                    <li>Save → They refresh (F5) → See full dashboard</li>
                  </ol>
                </div>

                <div className="p-6 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <h3 className="font-bold text-green-900 mb-3">Adding Student Coach (Paying ₹499):</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                    <li>base44.app → Login → Your App → Users → Invite User</li>
                    <li>Email + SELECT 'Admin' role</li>
                    <li>They accept email → Create password</li>
                    <li>Data → User entity → Edit their row</li>
                    <li>Set: user_type = 'student_coach'</li>
                    <li>Set: parent_coach_id = YOUR_USER_ID</li>
                    <li>Set: business_name = 'Their Business Name'</li>
                    <li>Save → They refresh (F5) → See branded dashboard</li>
                  </ol>
                </div>

                <div className="p-6 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                  <h3 className="font-bold text-orange-900 mb-3">Adding Client:</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                    <li>Go to Client Management page in app</li>
                    <li>Click '+ Add New Client'</li>
                    <li>Fill details (name, email, health data)</li>
                    <li>System auto-calculates macros</li>
                    <li>Click 'Save Client'</li>
                    <li>Then: Dashboard → Data → User → Invite User</li>
                    <li>Enter SAME email, set user_type = 'client'</li>
                    <li>They login & see their meal plan automatically</li>
                  </ol>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PAYMENT SETUP */}
        <Card className="border-2">
          <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
            <CardTitle className="text-2xl">💳 Payment Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-3">Subscription Plans</h2>
              <table className="w-full border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-3 text-left">Plan</th>
                    <th className="border p-3 text-left">Price</th>
                    <th className="border p-3 text-left">AI Limits/Month</th>
                    <th className="border p-3 text-left">Client Limit</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border p-3"><strong>Student</strong></td>
                    <td className="border p-3">₹499/month</td>
                    <td className="border p-3">5 meal plans, 10 recipes, 20 food lookups</td>
                    <td className="border p-3">Up to 10 clients</td>
                  </tr>
                  <tr>
                    <td className="border p-3"><strong>Professional</strong></td>
                    <td className="border p-3">₹999/month</td>
                    <td className="border p-3">20 meal plans, 50 recipes, 50 food lookups</td>
                    <td className="border p-3">Unlimited clients</td>
                  </tr>
                  <tr>
                    <td className="border p-3"><strong>Premium</strong></td>
                    <td className="border p-3">₹1999/month</td>
                    <td className="border p-3">Unlimited everything</td>
                    <td className="border p-3">Unlimited</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">Payment Gateway Options</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-bold mb-2">Razorpay (India)</h3>
                  <p className="text-sm text-gray-700 mb-3">2.5% transaction fee. Easy setup. Auto-invoicing.</p>
                  <a href="https://razorpay.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm underline">
                    Setup Guide →
                  </a>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-bold mb-2">Stripe (International)</h3>
                  <p className="text-sm text-gray-700 mb-3">2.9% + $0.30 per transaction. Global reach.</p>
                  <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="text-green-600 text-sm underline">
                    Setup Guide →
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* DOCUMENTATION */}
        <Card className="border-2">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
            <CardTitle className="text-2xl">📚 Platform Features & Workflows</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-3">Core Features</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">For Dietitians:</h3>
                  <ul className="text-sm space-y-1 text-gray-700">
                    <li>• Client Management</li>
                    <li>• AI Meal Plan Generation</li>
                    <li>• Template Library (FREE unlimited)</li>
                    <li>• Manual Meal Plan Builder</li>
                    <li>• Recipe Generator</li>
                    <li>• Food Lookup (ICMR data)</li>
                    <li>• Appointment Scheduling</li>
                    <li>• Client Messaging</li>
                    <li>• Progress Tracking</li>
                    <li>• MPESS Wellness Integration</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">For Business Operations:</h3>
                  <ul className="text-sm space-y-1 text-gray-700">
                    <li>• Webinar Performance Tracker</li>
                    <li>• Lead Pipeline Management</li>
                    <li>• Call Center & Scripts</li>
                    <li>• Finance Manager (HFS/HFI)</li>
                    <li>• Team Attendance Tracking</li>
                    <li>• Task Management</li>
                    <li>• Marketing Hub</li>
                    <li>• Business GPTs (AI assistants)</li>
                    <li>• Usage & Billing Dashboard</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">White-Labeling Guide</h2>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="font-bold text-purple-900 mb-3">Platform White-Labeling (Super Admin):</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                  <li>Go to your User profile in Base44 Dashboard</li>
                  <li>Set 'business_name' field (e.g., "Healthyfy Institute")</li>
                  <li>Save → Refresh app → See your business name in sidebar</li>
                </ol>
              </div>

              <div className="p-4 bg-green-50 rounded-lg mt-4">
                <h3 className="font-bold text-green-900 mb-3">Individual White-Labeling (Student Coaches):</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                  <li>When inviting student coach, set business_name field</li>
                  <li>Each coach sees their own business name</li>
                  <li>Their clients see coach's branding (not yours)</li>
                  <li>Complete white-label experience</li>
                </ol>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">Common Workflows</h2>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-bold mb-2">New Client Onboarding:</h3>
                  <ol className="list-decimal list-inside text-sm space-y-1 text-gray-700">
                    <li>Add client via Client Management</li>
                    <li>Calculate macros (auto or manual)</li>
                    <li>Create meal plan (AI, Template, or Manual)</li>
                    <li>Invite client to User (Dashboard → User → Invite)</li>
                    <li>Set user_type = 'client'</li>
                    <li>Client receives email → Sets password → Sees meal plan</li>
                  </ol>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-bold mb-2">Weekly Client Follow-up:</h3>
                  <ol className="list-decimal list-inside text-sm space-y-1 text-gray-700">
                    <li>Check Messages for client updates</li>
                    <li>Review Progress Tracking logs</li>
                    <li>Check Food Log adherence</li>
                    <li>Send encouraging message</li>
                    <li>Schedule next appointment</li>
                  </ol>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">FAQ</h2>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-semibold mb-1">Q: Why separate Client Profile and User Invitation?</p>
                  <p className="text-sm text-gray-700">A: Security. Only platform admins can create login accounts. This prevents unauthorized access.</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-semibold mb-1">Q: How do AI usage limits work?</p>
                  <p className="text-sm text-gray-700">A: Monthly limits reset on 1st. Overage charges at ₹10 per generation. Templates are FREE unlimited.</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-semibold mb-1">Q: Can student coaches add their own team?</p>
                  <p className="text-sm text-gray-700">A: Yes! Follow same process - invite via Base44, set user_type='student_team_member', set parent_coach_id=STUDENT_COACH_ID</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* BUSINESS HUB INFO */}
        <Card className="border-2">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
            <CardTitle className="text-2xl">🚀 Business Hub Features (Now Removed)</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-gray-700 mb-4">
              The Business Hub was a central dashboard showing quick stats and links to all business functions.
              It's now removed to simplify navigation. All features are still accessible via individual pages.
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-gray-50 rounded">
                <strong>Sales Pipeline:</strong> Access via "Webinar Tracker" or direct pages
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <strong>Team Tasks:</strong> Use "Team Attendance" and project management
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <strong>Call Center:</strong> Still available as separate page
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <strong>Revenue Stats:</strong> Use "Finance Manager" instead
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center py-8 text-gray-500 text-sm no-print">
          <p>This reference document contains all setup information previously in separate pages.</p>
          <p>Keep this for future reference or print as PDF using the button above.</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}