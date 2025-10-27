import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  CheckCircle2,
  Download,
  AlertTriangle,
  Info
} from "lucide-react";

// Documentation page for super admins only
export default function Documentation() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const userType = user?.user_type || 'team_admin';

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

        <Tabs defaultValue="platform" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur grid grid-cols-7 w-full">
            <TabsTrigger value="platform">Platform Setup</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="roles">Roles & Access</TabsTrigger>
            <TabsTrigger value="whitelabel">White Label</TabsTrigger>
            <TabsTrigger value="workflow">Workflows</TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
          </TabsList>

          <TabsContent value="platform" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <CardTitle className="text-3xl">Platform White Label Setup</CardTitle>
                <CardDescription className="text-white/80 text-lg">Get YOUR own domain and branding</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <Alert className="border-orange-500 bg-orange-50">
                  <Info className="w-5 h-5 text-orange-600" />
                  <AlertDescription className="text-lg">
                    <strong>🎯 IMPORTANT:</strong> This is different from student coach white-labeling. This is about YOUR platform running on YOUR domain instead of app.base44.com
                  </AlertDescription>
                </Alert>

                <div>
                  <h3 className="text-2xl font-bold mb-4">🌐 What is Platform White-Labeling?</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-6 bg-red-50 rounded-xl border-l-4 border-red-500">
                      <h4 className="font-bold text-lg text-red-900 mb-2">❌ WITHOUT Platform White Label:</h4>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li>• URL: <code className="bg-red-100 px-2 py-1 rounded">yourapp.base44.app</code></li>
                        <li>• Says "Powered by Base44"</li>
                        <li>• Generic branding</li>
                        <li>• Shared domain</li>
                      </ul>
                    </div>

                    <div className="p-6 bg-green-50 rounded-xl border-l-4 border-green-500">
                      <h4 className="font-bold text-lg text-green-900 mb-2">✅ WITH Platform White Label:</h4>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li>• URL: <code className="bg-green-100 px-2 py-1 rounded">app.yourdomain.com</code></li>
                        <li>• Your logo everywhere</li>
                        <li>• Your brand colors</li>
                        <li>• Professional credibility</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">📋 Step-by-Step: Get Your Custom Domain</h3>
                  
                  <div className="space-y-6">
                    <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-l-4 border-purple-500">
                      <h4 className="font-bold text-xl mb-3">STEP 1: Choose Your Domain</h4>
                      <ol className="space-y-3 ml-6">
                        <li className="flex gap-2">
                          <span className="font-bold text-purple-600">1.</span>
                          <div>
                            <span className="font-semibold">Decide on your domain name:</span>
                            <div className="mt-2 space-y-1 text-sm">
                              <div className="p-2 bg-white rounded">
                                ✅ <code>app.healthyfy.in</code> (if you own healthyfy.in)
                              </div>
                              <div className="p-2 bg-white rounded">
                                ✅ <code>portal.healthyfy.in</code>
                              </div>
                              <div className="p-2 bg-white rounded">
                                ✅ <code>coach.healthyfy.in</code>
                              </div>
                              <div className="p-2 bg-white rounded">
                                ✅ <code>healthyfy-app.com</code> (if buying new)
                              </div>
                            </div>
                          </div>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-purple-600">2.</span>
                          <span>Buy domain from GoDaddy, Namecheap, or any registrar (if you don't have one)</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-purple-600">3.</span>
                          <span>Cost: Around ₹500-1000/year for .in domain, $10-15/year for .com</span>
                        </li>
                      </ol>
                    </div>

                    <div className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-l-4 border-blue-500">
                      <h4 className="font-bold text-xl mb-3">STEP 2: Contact Base44 Support</h4>
                      <ol className="space-y-3 ml-6">
                        <li className="flex gap-2">
                          <span className="font-bold text-blue-600">1.</span>
                          <div className="flex-1">
                            <span className="font-semibold">Email Base44 support with:</span>
                            <div className="mt-3 p-4 bg-white rounded-lg border border-blue-200">
                              <p className="text-sm font-mono text-gray-700">
                                <strong>To:</strong> support@base44.app<br/>
                                <strong>Subject:</strong> Custom Domain Request<br/>
                                <br/>
                                Hi Base44 Team,<br/>
                                <br/>
                                I would like to set up a custom domain for my app.<br/>
                                <br/>
                                App URL: yourapp.base44.app<br/>
                                Desired Domain: app.yourdomain.com<br/>
                                <br/>
                                Please provide DNS configuration instructions.<br/>
                                <br/>
                                Thanks!
                              </p>
                            </div>
                          </div>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-blue-600">2.</span>
                          <span>Base44 will reply with DNS records you need to add</span>
                        </li>
                      </ol>
                    </div>

                    <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-l-4 border-green-500">
                      <h4 className="font-bold text-xl mb-3">STEP 3: Configure DNS Settings</h4>
                      <ol className="space-y-3 ml-6">
                        <li className="flex gap-2">
                          <span className="font-bold text-green-600">1.</span>
                          <span>Login to your domain registrar (GoDaddy, Namecheap, etc.)</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-green-600">2.</span>
                          <span>Go to DNS Management / DNS Settings</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-green-600">3.</span>
                          <div className="flex-1">
                            <span>Add the records Base44 provided (usually something like):</span>
                            <div className="mt-2 p-3 bg-white rounded border text-sm font-mono">
                              Type: CNAME<br/>
                              Name: app<br/>
                              Value: [provided by Base44]<br/>
                              TTL: 3600
                            </div>
                          </div>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-green-600">4.</span>
                          <span>Save changes and wait 15 minutes to 24 hours for DNS propagation</span>
                        </li>
                      </ol>
                    </div>

                    <div className="p-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border-l-4 border-orange-500">
                      <h4 className="font-bold text-xl mb-3">STEP 4: Confirm & Launch! 🚀</h4>
                      <ol className="space-y-3 ml-6">
                        <li className="flex gap-2">
                          <span className="font-bold text-orange-600">1.</span>
                          <span>Base44 will confirm when domain is active</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-orange-600">2.</span>
                          <span>Test by visiting your new URL</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-orange-600">3.</span>
                          <span>Share new URL with your team and students</span>
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">📞 Contact Base44 Support</h3>
                  <div className="p-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl text-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-bold text-xl mb-2">📧 Email Support</h4>
                        <p className="text-white/90 mb-2">For custom domain requests:</p>
                        <code className="bg-white/20 px-3 py-2 rounded block">support@base44.app</code>
                      </div>
                      <div>
                        <h4 className="font-bold text-xl mb-2">💬 Live Chat</h4>
                        <p className="text-white/90 mb-2">Available in Base44 dashboard:</p>
                        <a href="https://base44.app" target="_blank" rel="noopener noreferrer" className="inline-block">
                          <Button className="bg-white text-blue-600 hover:bg-white/90">
                            Open Dashboard
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <AlertDescription>
                    <strong>✅ Pro Tip:</strong> Once you have your custom domain, update it in your marketing materials and social media bios!
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                <CardTitle className="text-3xl">Platform Overview</CardTitle>
                <CardDescription className="text-white/80 text-lg">Understanding the Mealie Pro ecosystem</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <p className="text-lg text-gray-700 mb-4">
                  Mealie Pro is a three-tier health coaching platform with Super Admins, Team Members, and Student Coaches.
                </p>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-gray-700">For complete overview, see the other documentation tabs.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <CardTitle className="text-3xl">User Management Guide</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <Alert className="border-red-500 bg-red-50 mb-6">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <AlertDescription>
                    <strong>IMPORTANT:</strong> You CANNOT create users through code. All users must be invited through the Base44 Dashboard.
                  </AlertDescription>
                </Alert>
                <p className="text-lg text-gray-700">
                  To invite users, go to Base44 Dashboard → Users → Invite User. Then set their user_type in the database.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                <CardTitle className="text-3xl">Roles & Access Control</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <p className="text-lg text-gray-700">
                  Different user types have different access levels: Super Admin (full access), Team Members (all clients), Student Coaches (their clients only).
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="whitelabel" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                <CardTitle className="text-3xl">White Label Setup Guide</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <Alert className="border-green-500 bg-green-50">
                  <Info className="w-5 h-5 text-green-600" />
                  <AlertDescription>
                    <strong>What is White Labeling?</strong> It allows your student coaches to use the platform with THEIR business name instead of "Mealie Pro".
                  </AlertDescription>
                </Alert>

                <div>
                  <h3 className="text-2xl font-bold mb-4">📋 Step-by-Step: Enable White Label</h3>
                  
                  <div className="space-y-6">
                    <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-l-4 border-purple-500">
                      <h4 className="font-bold text-xl mb-3">STEP 1: Invite Student Coach</h4>
                      <ol className="space-y-2 ml-6">
                        <li>1. Go to Base44 Dashboard → Users</li>
                        <li>2. Click "Invite User"</li>
                        <li>3. Enter their email</li>
                        <li>4. Select role: Admin</li>
                        <li>5. Send invitation</li>
                      </ol>
                    </div>

                    <div className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-l-4 border-blue-500">
                      <h4 className="font-bold text-xl mb-3">STEP 2: They Accept & Login</h4>
                      <ol className="space-y-2 ml-6">
                        <li>1. They receive invitation email</li>
                        <li>2. Click link and set password</li>
                        <li>3. Login to the app</li>
                        <li>4. At this point, they see "Mealie Pro" branding</li>
                      </ol>
                    </div>

                    <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-l-4 border-green-500">
                      <h4 className="font-bold text-xl mb-3">STEP 3: Set User Type & Business Name</h4>
                      <ol className="space-y-2 ml-6">
                        <li>1. Go to: Base44 Dashboard → Data → User</li>
                        <li>2. Find their user record (search by email)</li>
                        <li>3. Click "Edit" button</li>
                        <li>4. Set these fields:</li>
                        <li className="ml-6">
                          <div className="bg-white p-4 rounded border space-y-2 text-sm">
                            <div>
                              <strong>user_type:</strong>
                              <code className="ml-2 bg-green-100 px-2 py-1 rounded">student_coach</code>
                            </div>
                            <div>
                              <strong>business_name:</strong>
                              <code className="ml-2 bg-green-100 px-2 py-1 rounded">"Their Business Name"</code>
                            </div>
                          </div>
                        </li>
                        <li>5. Click "Save"</li>
                      </ol>
                    </div>

                    <div className="p-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border-l-4 border-orange-500">
                      <h4 className="font-bold text-xl mb-3">STEP 4: They Refresh & See Magic! ✨</h4>
                      <ol className="space-y-2 ml-6">
                        <li>1. Student coach refreshes the app</li>
                        <li>2. Sidebar now shows their business name</li>
                        <li>3. Mobile header shows their business name</li>
                        <li>4. Badge says "🎓 Health Coach"</li>
                        <li>5. Platform is now fully branded to them!</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workflow" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                <CardTitle className="text-3xl">Common Workflows</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <p className="text-lg text-gray-700">
                  Common tasks include onboarding student coaches, adding team members, creating meal plans, and managing clients.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="faq" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-pink-500 to-red-500 text-white">
                <CardTitle className="text-3xl">Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-bold mb-2">Q: Can I create users directly in the app?</h4>
                  <p className="text-gray-700 text-sm">A: No. For security reasons, all users must be invited through the Base44 Dashboard.</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-bold mb-2">Q: Can student coaches see each other's clients?</h4>
                  <p className="text-gray-700 text-sm">A: No. Data isolation ensures each student coach only sees THEIR clients.</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-bold mb-2">Q: How does white-labeling work?</h4>
                  <p className="text-gray-700 text-sm">A: Set the 'business_name' field for a student coach. The app will display their business name instead of 'Mealie Pro'.</p>
                </div>
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