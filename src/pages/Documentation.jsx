import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Users,
  Shield,
  Zap,
  CheckCircle2,
  Download,
  AlertTriangle,
  Info
} from "lucide-react";

export default function Documentation() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const userType = user?.user_type || 'team_admin';

  // Redirect if not super admin
  if (userType !== 'super_admin') {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl">
          <CardHeader>
            <Shield className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <CardTitle className="text-center text-2xl">Access Restricted</CardTitle>
            <CardDescription className="text-center text-lg">
              This section is only available to Super Admins
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription>
                Documentation contains sensitive business information and is restricted to app owners only.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen p-4 md:p-8 print:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between print:block">
          <div>
            <Badge className="bg-purple-600 text-white mb-2">
              <Shield className="w-4 h-4 mr-1" />
              Super Admin Only
            </Badge>
            <h1 className="text-5xl font-bold text-gray-900 mb-2">Complete Documentation</h1>
            <p className="text-xl text-gray-600">Platform setup, user management, and business operations</p>
          </div>
          <Button onClick={handlePrint} className="bg-gradient-to-r from-purple-500 to-indigo-500 print:hidden">
            <Download className="w-4 h-4 mr-2" />
            Download as PDF
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur grid grid-cols-5 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="roles">Roles & Access</TabsTrigger>
            <TabsTrigger value="workflow">Workflows</TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                <CardTitle className="text-3xl">Platform Overview</CardTitle>
                <CardDescription className="text-white/80 text-lg">Understanding the Mealie Pro ecosystem</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-4">🎯 Three-Tier System</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-2 border-purple-200 bg-purple-50">
                      <CardHeader>
                        <CardTitle className="text-xl">👑 Super Admin (YOU)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          <li>✓ Platform owner</li>
                          <li>✓ Manages all users</li>
                          <li>✓ Sees business plan</li>
                          <li>✓ Full access</li>
                          <li>✓ Can white-label for students</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-blue-200 bg-blue-50">
                      <CardHeader>
                        <CardTitle className="text-xl">👥 Team Admins</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          <li>✓ Your team members</li>
                          <li>✓ Handle clients</li>
                          <li>✓ Create meal plans</li>
                          <li>✓ Access all features</li>
                          <li>✗ Can't see business plan</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-green-200 bg-green-50">
                      <CardHeader>
                        <CardTitle className="text-xl">🎓 Student Coaches</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          <li>✓ Your training students</li>
                          <li>✓ Use with their brand</li>
                          <li>✓ Manage their clients</li>
                          <li>✓ Marketing & payment tools</li>
                          <li>✗ Can't see business plan</li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">🔑 Key Concepts</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-bold text-lg mb-2">Data Isolation</h4>
                      <p className="text-gray-700">Each student coach only sees THEIR clients. Your team sees all clients. This ensures privacy and separation.</p>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="font-bold text-lg mb-2">White-Label Capability</h4>
                      <p className="text-gray-700">Student coaches can use their own business name and branding. The platform adapts to their identity.</p>
                    </div>

                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <h4 className="font-bold text-lg mb-2">Role-Based Access</h4>
                      <p className="text-gray-700">Business Plan & Documentation are ONLY visible to super admins. Marketing Hub & Payment Setup available to all coaches.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Management */}
          <TabsContent value="users" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <CardTitle className="text-3xl">User Management Guide</CardTitle>
                <CardDescription className="text-white/80 text-lg">How to invite and manage different user types</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <Alert className="border-red-500 bg-red-50">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <AlertDescription>
                    <strong>IMPORTANT:</strong> You CANNOT create users through code. All users must be invited through the Base44 Dashboard. This is a security feature.
                  </AlertDescription>
                </Alert>

                <div>
                  <h3 className="text-2xl font-bold mb-4">Step-by-Step: Invite Users</h3>
                  <div className="space-y-6">
                    <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-l-4 border-purple-500">
                      <h4 className="font-bold text-xl mb-3">STEP 1: Access Base44 Dashboard</h4>
                      <ol className="space-y-2 ml-6">
                        <li className="flex gap-2">
                          <span className="font-bold text-purple-600">1.</span>
                          <span>Go to: <code className="bg-purple-100 px-2 py-1 rounded">https://base44.app</code></span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-purple-600">2.</span>
                          <span>Login with your account</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-purple-600">3.</span>
                          <span>Navigate to your app's dashboard</span>
                        </li>
                      </ol>
                    </div>

                    <div className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-l-4 border-blue-500">
                      <h4 className="font-bold text-xl mb-3">STEP 2: Navigate to Users</h4>
                      <ol className="space-y-2 ml-6">
                        <li className="flex gap-2">
                          <span className="font-bold text-blue-600">1.</span>
                          <span>Look for "Users" or "Team" in the sidebar</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-blue-600">2.</span>
                          <span>Click to open the users management page</span>
                        </li>
                      </ol>
                    </div>

                    <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-l-4 border-green-500">
                      <h4 className="font-bold text-xl mb-3">STEP 3: Invite New User</h4>
                      <ol className="space-y-2 ml-6">
                        <li className="flex gap-2">
                          <span className="font-bold text-green-600">1.</span>
                          <span>Click "Invite User" or "+ Add User" button</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-green-600">2.</span>
                          <span>Enter their email address</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-green-600">3.</span>
                          <span>Select role: "Admin" (for dietitians/coaches)</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-green-600">4.</span>
                          <span>Click "Send Invitation"</span>
                        </li>
                      </ol>
                    </div>

                    <div className="p-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border-l-4 border-orange-500">
                      <h4 className="font-bold text-xl mb-3">STEP 4: Set User Type in App</h4>
                      <p className="text-gray-700 mb-3">After they accept invitation and login:</p>
                      <ol className="space-y-2 ml-6">
                        <li className="flex gap-2">
                          <span className="font-bold text-orange-600">1.</span>
                          <span>Go to Dashboard → Data → User in Base44</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-orange-600">2.</span>
                          <span>Find the user's record</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-orange-600">3.</span>
                          <span>Edit and set <code className="bg-orange-100 px-2 py-1 rounded">user_type</code> field:</span>
                        </li>
                        <li className="ml-6 text-sm">
                          <div className="bg-white p-3 rounded border">
                            • <code>super_admin</code> = You (platform owner)<br/>
                            • <code>team_admin</code> = Your team members<br/>
                            • <code>student_coach</code> = Health coaches you train
                          </div>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-orange-600">4.</span>
                          <span>For student coaches, optionally set <code className="bg-orange-100 px-2 py-1 rounded">business_name</code></span>
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">📧 Sample Invitation Email</h3>
                  <div className="p-6 bg-gray-50 rounded-lg border border-gray-300 font-mono text-sm whitespace-pre-line">
{`Subject: Welcome to Mealie Pro Team!

Hi [Name],

I'm excited to invite you to the Mealie Pro platform!

🔗 App URL: https://[your-app-name].base44.app

You'll receive an invitation email from Base44 shortly.

WHAT TO DO:
1. Check your email (check spam too!)
2. Click the invitation link
3. Set your password
4. Login at the app URL above
5. Start managing clients!

Need help? Just reply to this email.

Welcome aboard! 🎉

[Your Name]
Mealie Pro`}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roles & Access */}
          <TabsContent value="roles" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                <CardTitle className="text-3xl">Roles & Access Control</CardTitle>
                <CardDescription className="text-white/80 text-lg">What each user type can see and do</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  {[
                    {
                      role: "👑 Super Admin",
                      color: "purple",
                      access: [
                        { feature: "Client Management", allowed: true, note: "All clients" },
                        { feature: "Meal Plans", allowed: true, note: "All plans" },
                        { feature: "Messages & Appointments", allowed: true, note: "All communications" },
                        { feature: "Recipes & Food Lookup", allowed: true, note: "Full access" },
                        { feature: "Business Plan", allowed: true, note: "View & edit" },
                        { feature: "Documentation", allowed: true, note: "This page" },
                        { feature: "Marketing Hub", allowed: true, note: "All templates" },
                        { feature: "Payment Setup", allowed: true, note: "Platform payments" },
                      ]
                    },
                    {
                      role: "👥 Team Admin",
                      color: "blue",
                      access: [
                        { feature: "Client Management", allowed: true, note: "All clients" },
                        { feature: "Meal Plans", allowed: true, note: "All plans" },
                        { feature: "Messages & Appointments", allowed: true, note: "All communications" },
                        { feature: "Recipes & Food Lookup", allowed: true, note: "Full access" },
                        { feature: "Business Plan", allowed: false, note: "Hidden" },
                        { feature: "Documentation", allowed: false, note: "Hidden" },
                        { feature: "Marketing Hub", allowed: true, note: "All templates" },
                        { feature: "Payment Setup", allowed: true, note: "Team payments" },
                      ]
                    },
                    {
                      role: "🎓 Student Coach",
                      color: "green",
                      access: [
                        { feature: "Client Management", allowed: true, note: "Only THEIR clients" },
                        { feature: "Meal Plans", allowed: true, note: "Only their client plans" },
                        { feature: "Messages & Appointments", allowed: true, note: "Only their clients" },
                        { feature: "Recipes & Food Lookup", allowed: true, note: "Full access" },
                        { feature: "Business Plan", allowed: false, note: "Hidden" },
                        { feature: "Documentation", allowed: false, note: "Hidden" },
                        { feature: "Marketing Hub", allowed: true, note: "For their business" },
                        { feature: "Payment Setup", allowed: true, note: "Their payment links" },
                      ]
                    },
                  ].map((userRole) => (
                    <Card key={userRole.role} className={`border-2 border-${userRole.color}-200 bg-${userRole.color}-50`}>
                      <CardHeader>
                        <CardTitle className="text-2xl">{userRole.role}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <table className="w-full">
                          <thead>
                            <tr className="border-b-2">
                              <th className="text-left p-2">Feature</th>
                              <th className="text-center p-2 w-24">Access</th>
                              <th className="text-left p-2">Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userRole.access.map((item, idx) => (
                              <tr key={idx} className="border-b">
                                <td className="p-2">{item.feature}</td>
                                <td className="text-center p-2">
                                  {item.allowed ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                                  ) : (
                                    <span className="text-red-500">✗</span>
                                  )}
                                </td>
                                <td className="p-2 text-sm text-gray-600">{item.note}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Workflows */}
          <TabsContent value="workflow" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                <CardTitle className="text-3xl">Common Workflows</CardTitle>
                <CardDescription className="text-white/80 text-lg">How to accomplish common tasks</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                {[
                  {
                    title: "🎓 Onboarding a New Student Coach",
                    steps: [
                      "Invite them via Base44 Dashboard (role: Admin)",
                      "Wait for them to accept and login",
                      "Set their user_type to 'student_coach' in database",
                      "Optionally set their business_name",
                      "Send them the Marketing Hub link",
                      "Help them set up their payment links",
                      "They can now add their own clients!"
                    ]
                  },
                  {
                    title: "👥 Adding a Team Member",
                    steps: [
                      "Invite them via Base44 Dashboard (role: Admin)",
                      "Set user_type to 'team_admin'",
                      "They get access to all clients",
                      "Train them on the platform",
                      "They can handle all client operations"
                    ]
                  },
                  {
                    title: "🤝 Student Coach Adds Their First Client",
                    steps: [
                      "Student coach logs in",
                      "Goes to Clients page",
                      "Clicks '+ Add New Client'",
                      "Fills in client details",
                      "Calculates macros",
                      "Adds client",
                      "System automatically sets owner_id to student's ID",
                      "Only that student can see this client!"
                    ]
                  },
                  {
                    title: "📋 Creating Meal Plan for Client",
                    steps: [
                      "Go to 'Meal Plans' page",
                      "Click 'Generate New' tab",
                      "Select client from dropdown",
                      "Review client's profile",
                      "Choose duration & pattern",
                      "Click 'Generate Meal Plan'",
                      "Wait 15-20 seconds",
                      "Review generated plan",
                      "Edit meals if needed (click ✏️ icon)",
                      "Click 'Save This Plan'",
                      "Client can now see it in their portal!"
                    ]
                  },
                  {
                    title: "💳 Student Coach Setting Up Payments",
                    steps: [
                      "Student coach goes to 'Payment Setup'",
                      "Sees payment gateway options (Razorpay/Stripe)",
                      "Follows integration guide",
                      "Sets up their own payment gateway account",
                      "Gets their payment links",
                      "Can now accept payments from their clients",
                      "Payments go directly to their account!"
                    ]
                  }
                ].map((workflow, idx) => (
                  <div key={idx} className="p-6 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200">
                    <h3 className="text-xl font-bold mb-4">{workflow.title}</h3>
                    <ol className="space-y-2">
                      {workflow.steps.map((step, i) => (
                        <li key={i} className="flex gap-3">
                          <Badge className="bg-green-500 text-white flex-shrink-0">{i + 1}</Badge>
                          <span className="text-gray-700">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* FAQ */}
          <TabsContent value="faq" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-pink-500 to-red-500 text-white">
                <CardTitle className="text-3xl">Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                {[
                  {
                    q: "Can I create users directly in the app?",
                    a: "No. For security reasons, all users must be invited through the Base44 Dashboard. This prevents unauthorized user creation."
                  },
                  {
                    q: "Can student coaches see each other's clients?",
                    a: "No. Data isolation ensures each student coach only sees THEIR clients. Your team admins and you (super admin) can see all clients."
                  },
                  {
                    q: "How does white-labeling work?",
                    a: "Set the 'business_name' field for a student coach. The app will display their business name instead of 'Mealie Pro' when they login. Future updates will allow logo customization."
                  },
                  {
                    q: "Do student coaches pay separately for their accounts?",
                    a: "You charge them based on your business model (see Business Plan page). They use your platform subscription. Payments they receive from clients go directly to their accounts."
                  },
                  {
                    q: "Can I remove access from a student coach?",
                    a: "Yes. Go to Base44 Dashboard → Users, and remove/deactivate their account. Their data remains but they lose access."
                  },
                  {
                    q: "What happens to a student's clients if I remove them?",
                    a: "The client records remain in the database. You can reassign them to another coach by updating the owner_id field."
                  },
                  {
                    q: "Can team admins see business financials?",
                    a: "No. Business Plan and Documentation pages are restricted to super admins only. This protects your business strategy."
                  },
                  {
                    q: "How do I track which clients belong to which coach?",
                    a: "Every client has an 'owner_id' field that stores the coach's user ID. Query by this field to filter clients by coach."
                  },
                  {
                    q: "Can I bulk import clients?",
                    a: "Not through the UI. Contact Base44 support for bulk import assistance, or use the API if you have backend functions enabled."
                  },
                  {
                    q: "What's the difference between dietitian_id and owner_id?",
                    a: "owner_id determines who can see the client (for data isolation). dietitian_id is for assigning which team member handles them (for workflow)."
                  }
                ].map((faq, idx) => (
                  <div key={idx} className="p-6 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex gap-3 items-start">
                      <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="font-bold text-lg text-gray-900 mb-2">{faq.q}</h4>
                        <p className="text-gray-700">{faq.a}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <style>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          @page {
            margin: 2cm;
          }
        }
      `}</style>
    </div>
  );
}