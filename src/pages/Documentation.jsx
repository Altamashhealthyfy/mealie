
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

          {/* Platform Setup - NEW FIRST TAB */}
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
                                <strong>Subject:</strong> Custom Domain Request - [Your App Name]<br/>
                                <br/>
                                <strong>Body:</strong><br/>
                                Hi Base44 Team,<br/>
                                <br/>
                                I would like to set up a custom domain for my app.<br/>
                                <br/>
                                App URL: [yourapp.base44.app]<br/>
                                Desired Domain: [app.yourdomain.com]<br/>
                                <br/>
                                Please provide DNS configuration instructions.<br/>
                                <br/>
                                Thanks!<br/>
                                [Your Name]
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
                              <strong>Type:</strong> CNAME<br/>
                              <strong>Name:</strong> app (or your subdomain)<br/>
                              <strong>Value:</strong> [provided by Base44]<br/>
                              <strong>TTL:</strong> 3600
                            </div>
                          </div>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-green-600">4.</span>
                          <span>Save changes</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-green-600">5.</span>
                          <span>Wait 15 minutes to 24 hours for DNS propagation</span>
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
                          <span>Test by visiting your new URL: <code className="bg-orange-100 px-2 py-1 rounded">app.yourdomain.com</code></span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-orange-600">3.</span>
                          <span>Share new URL with your team and students</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-orange-600">4.</span>
                          <span>Old base44.app URL will still work (redirects automatically)</span>
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">💰 Pricing & Plans</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-6 bg-gray-50 rounded-xl border-2 border-gray-200">
                      <h4 className="font-bold text-lg mb-2">🆓 Free Plan</h4>
                      <p className="text-3xl font-bold text-gray-900 mb-4">₹0/mo</p>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li>✓ base44.app subdomain</li>
                        <li>✗ Custom domain</li>
                        <li>✗ White label branding</li>
                      </ul>
                    </div>

                    <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-300">
                      <h4 className="font-bold text-lg mb-2">💼 Pro Plan</h4>
                      <p className="text-3xl font-bold text-blue-900 mb-4">Check with Base44</p>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li>✓ Custom domain</li>
                        <li>✓ SSL certificate included</li>
                        <li>✓ White label branding</li>
                        <li>✓ Priority support</li>
                      </ul>
                    </div>

                    <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-300">
                      <h4 className="font-bold text-lg mb-2">👑 Enterprise</h4>
                      <p className="text-3xl font-bold text-purple-900 mb-4">Custom</p>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li>✓ Everything in Pro</li>
                        <li>✓ Multiple domains</li>
                        <li>✓ Custom logo & colors</li>
                        <li>✓ Dedicated support</li>
                      </ul>
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
                            Open Dashboard →
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">❓ Common Questions</h3>
                  <div className="space-y-3">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-bold mb-2">Q: How long does setup take?</h4>
                      <p className="text-gray-700 text-sm">A: Usually 1-2 business days after DNS is configured. DNS propagation can take up to 24 hours.</p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-bold mb-2">Q: Will my old URL still work?</h4>
                      <p className="text-gray-700 text-sm">A: Yes! Your base44.app URL will automatically redirect to your new domain.</p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-bold mb-2">Q: Can I use my existing domain?</h4>
                      <p className="text-gray-700 text-sm">A: Yes! You can use a subdomain (app.yourdomain.com) or a completely new domain.</p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-bold mb-2">Q: Is SSL/HTTPS included?</h4>
                      <p className="text-gray-700 text-sm">A: Yes! Base44 provides free SSL certificates for all custom domains.</p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-bold mb-2">Q: Can I change the domain later?</h4>
                      <p className="text-gray-700 text-sm">A: Yes, but it's better to choose wisely upfront. Contact support if you need to change.</p>
                    </div>
                  </div>
                </div>

                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <AlertDescription>
                    <strong>✅ Pro Tip:</strong> Once you have your custom domain, update it in your marketing materials, student onboarding emails, and social media bios for maximum brand consistency!
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

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

          {/* White Label - NEW SECTION */}
          <TabsContent value="whitelabel" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                <CardTitle className="text-3xl">White Label Setup Guide</CardTitle>
                <CardDescription className="text-white/80 text-lg">How student coaches can use their own branding</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <Alert className="border-green-500 bg-green-50">
                  <Info className="w-5 h-5 text-green-600" />
                  <AlertDescription>
                    <strong>What is White Labeling?</strong> It allows your student coaches to use the platform with THEIR business name instead of "Mealie Pro". When they login, they see their brand everywhere.
                  </AlertDescription>
                </Alert>

                <div>
                  <h3 className="text-2xl font-bold mb-4">🎨 What Gets White-Labeled?</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                      <h4 className="font-bold text-lg mb-2">✅ Currently White-Labeled:</h4>
                      <ul className="space-y-1 text-sm text-gray-700">
                        <li>• Sidebar header (business name)</li>
                        <li>• Mobile header</li>
                        <li>• User badge label</li>
                        <li>• Platform branding text</li>
                        <li>• Email signatures (if configured)</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                      <h4 className="font-bold text-lg mb-2">🔮 Future White-Label Options:</h4>
                      <ul className="space-y-1 text-sm text-gray-700">
                        <li>• Custom logo upload</li>
                        <li>• Custom color scheme</li>
                        <li>• Custom domain (studentname.com)</li>
                        <li>• Custom email templates</li>
                        <li>• Branded meal plan PDFs</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">📋 Step-by-Step: Enable White Label</h3>
                  
                  <div className="space-y-6">
                    <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-l-4 border-purple-500">
                      <h4 className="font-bold text-xl mb-3">STEP 1: Invite Student Coach</h4>
                      <ol className="space-y-2 ml-6">
                        <li className="flex gap-2">
                          <span className="font-bold text-purple-600">1.</span>
                          <span>Go to Base44 Dashboard → Users</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-purple-600">2.</span>
                          <span>Click "Invite User"</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-purple-600">3.</span>
                          <span>Enter their email</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-purple-600">4.</span>
                          <span>Select role: <strong>"Admin"</strong></span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-purple-600">5.</span>
                          <span>Send invitation</span>
                        </li>
                      </ol>
                    </div>

                    <div className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-l-4 border-blue-500">
                      <h4 className="font-bold text-xl mb-3">STEP 2: They Accept & Login</h4>
                      <ol className="space-y-2 ml-6">
                        <li className="flex gap-2">
                          <span className="font-bold text-blue-600">1.</span>
                          <span>They receive invitation email</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-blue-600">2.</span>
                          <span>Click link and set password</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-blue-600">3.</span>
                          <span>Login to the app</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-blue-600">4.</span>
                          <span>At this point, they see "Mealie Pro" branding</span>
                        </li>
                      </ol>
                    </div>

                    <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-l-4 border-green-500">
                      <h4 className="font-bold text-xl mb-3">STEP 3: Set User Type & Business Name</h4>
                      <ol className="space-y-2 ml-6">
                        <li className="flex gap-2">
                          <span className="font-bold text-green-600">1.</span>
                          <span>Go to: Base44 Dashboard → Data → User</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-green-600">2.</span>
                          <span>Find their user record (search by email)</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-green-600">3.</span>
                          <span>Click "Edit" button</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-green-600">4.</span>
                          <span>Set these fields:</span>
                        </li>
                        <li className="ml-6">
                          <div className="bg-white p-4 rounded border space-y-2">
                            <div>
                              <strong className="text-green-700">user_type:</strong>
                              <code className="ml-2 bg-green-100 px-2 py-1 rounded">student_coach</code>
                            </div>
                            <div>
                              <strong className="text-green-700">business_name:</strong>
                              <code className="ml-2 bg-green-100 px-2 py-1 rounded">"Priya's Wellness Hub"</code>
                              <p className="text-xs text-gray-600 mt-1">↑ Their actual business name</p>
                            </div>
                          </div>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-green-600">5.</span>
                          <span>Click "Save"</span>
                        </li>
                      </ol>
                    </div>

                    <div className="p-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border-l-4 border-orange-500">
                      <h4 className="font-bold text-xl mb-3">STEP 4: They Refresh & See Magic! ✨</h4>
                      <ol className="space-y-2 ml-6">
                        <li className="flex gap-2">
                          <span className="font-bold text-orange-600">1.</span>
                          <span>Student coach refreshes the app</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-orange-600">2.</span>
                          <span>Sidebar now shows: <strong>"Priya's Wellness Hub"</strong></span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-orange-600">3.</span>
                          <span>Mobile header shows their business name</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-orange-600">4.</span>
                          <span>Badge says: <strong>"🎓 Health Coach"</strong></span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-orange-600">5.</span>
                          <span>Platform is now fully branded to them!</span>
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">💼 Example: Complete Setup</h3>
                  <div className="p-6 bg-gray-50 rounded-lg border border-gray-300">
                    <h4 className="font-bold mb-3">Scenario: Onboarding "Priya Sharma" as Student Coach</h4>
                    
                    <div className="space-y-4">
                      <div>
                        <strong>📧 Step 1: Invitation</strong>
                        <div className="bg-white p-3 rounded mt-2 text-sm font-mono">
                          Email: priya.sharma@gmail.com<br/>
                          Role: Admin<br/>
                          Status: Invitation sent ✅
                        </div>
                      </div>

                      <div>
                        <strong>✅ Step 2: Priya Accepts</strong>
                        <div className="bg-white p-3 rounded mt-2 text-sm">
                          • Priya clicks invitation link<br/>
                          • Sets password: ••••••••<br/>
                          • Logs into app<br/>
                          • Sees "Mealie Pro" everywhere (default)
                        </div>
                      </div>

                      <div>
                        <strong>⚙️ Step 3: You Configure</strong>
                        <div className="bg-white p-3 rounded mt-2 text-sm font-mono">
                          Dashboard → Data → User → priya.sharma@gmail.com<br/>
                          <br/>
                          SET:<br/>
                          user_type = "student_coach"<br/>
                          business_name = "Priya's Wellness Hub"<br/>
                          <br/>
                          Save ✅
                        </div>
                      </div>

                      <div>
                        <strong>🎉 Step 4: Result</strong>
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded mt-2 text-sm border-l-4 border-green-500">
                          <strong>Priya's View:</strong><br/>
                          • Sidebar: "Priya's Wellness Hub" 🎨<br/>
                          • Header: "Priya's Wellness Hub"<br/>
                          • Badge: "🎓 Health Coach"<br/>
                          • All clients she adds: Only visible to her<br/>
                          • Complete data isolation ✅
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">🚨 Important Notes</h3>
                  <div className="space-y-3">
                    <Alert className="border-red-500 bg-red-50">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <AlertDescription>
                        <strong>CRITICAL:</strong> The business_name field is case-sensitive and will display exactly as you type it. Double-check spelling!
                      </AlertDescription>
                    </Alert>

                    <Alert className="border-blue-500 bg-blue-50">
                      <Info className="w-5 h-5 text-blue-600" />
                      <AlertDescription>
                        <strong>TIP:</strong> Student coaches don't need to know about the technical setup. Just tell them their business name will appear in the app after you configure it.
                      </AlertDescription>
                    </Alert>

                    <Alert className="border-yellow-500 bg-yellow-50">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      <AlertDescription>
                        <strong>LIMITATION:</strong> Logo upload is not yet available. Coming in future updates. For now, only business name is customizable.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">📧 Sample Email to Student Coach</h3>
                  <div className="p-6 bg-gray-50 rounded-lg border border-gray-300 font-mono text-sm whitespace-pre-line">
{`Subject: Your White-Label Platform is Ready! 🎉

Hi Priya,

Great news! Your personalized health coaching platform is now ready with YOUR branding!

🔗 App URL: https://[your-app-url].base44.app

When you login, you'll see:
✅ "Priya's Wellness Hub" as your platform name
✅ All features customized for your business
✅ Only YOUR clients visible to you
✅ Complete data privacy

LOGIN DETAILS:
📧 Email: priya.sharma@gmail.com
🔑 Password: [Check your email for invitation]

NEXT STEPS:
1. Login to the platform
2. Add your first client
3. Create a meal plan
4. Use Marketing Hub for social media content
5. Set up your payment links

Need help? Just reply to this email!

Welcome to your coaching platform! 🚀

[Your Name]
Mealie Pro Admin`}
                  </div>
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
