import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Info,
  Crown,
  GraduationCap,
  Building2
} from "lucide-react";

export default function TeamManagement() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      // This would need to be implemented via API
      // For now showing instructions
      return [];
    },
    enabled: !!user,
    initialData: [],
  });

  const userType = user?.user_type || 'team_member';
  const isSuperAdmin = userType === 'super_admin';
  const isStudentCoach = userType === 'student_coach';
  
  const canManageTeam = isSuperAdmin || isStudentCoach;

  if (!canManageTeam) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl">
          <CardHeader>
            <Shield className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <CardTitle className="text-center text-2xl">Access Restricted</CardTitle>
            <CardDescription className="text-center text-lg">
              Only admins and coaches can manage team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription>
                This feature is available to platform owners and student coaches only.
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
        <div>
          <div className="flex items-center gap-2 mb-2">
            {isSuperAdmin ? (
              <Crown className="w-8 h-8 text-purple-600" />
            ) : (
              <GraduationCap className="w-8 h-8 text-green-600" />
            )}
            <Badge className={isSuperAdmin ? "bg-purple-600 text-white" : "bg-green-600 text-white"}>
              {isSuperAdmin ? 'Platform Owner' : 'Health Coach'}
            </Badge>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-2">My Team</h1>
          <p className="text-xl text-gray-600">
            {isSuperAdmin 
              ? 'Manage your team members and student coaches' 
              : 'Manage your team members who help with your clients'
            }
          </p>
        </div>

        {/* Super Admin Instructions */}
        {isSuperAdmin && (
          <Card className="border-none shadow-xl bg-gradient-to-br from-purple-50 to-pink-50">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Crown className="w-6 h-6 text-purple-600" />
                Super Admin Team Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-6 bg-white rounded-xl border-2 border-purple-200">
                <h3 className="text-xl font-bold mb-4">👥 You Can Add Two Types of Users:</h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                    <div className="flex items-start gap-3">
                      <Building2 className="w-6 h-6 text-blue-600 mt-1" />
                      <div>
                        <h4 className="font-bold text-lg text-blue-900 mb-2">1. Team Members (Your Employees)</h4>
                        <p className="text-gray-700 mb-2">People who work directly for you</p>
                        <ul className="space-y-1 text-sm text-gray-700">
                          <li>✓ See ALL clients (yours + all students' clients)</li>
                          <li>✓ Can help any client</li>
                          <li>✓ Create meal plans</li>
                          <li>✓ Use marketing tools</li>
                          <li>✗ Cannot see Business Plan</li>
                          <li>✗ Cannot see Documentation</li>
                          <li>✗ Cannot add team members</li>
                        </ul>
                        <div className="mt-3 p-3 bg-blue-100 rounded">
                          <p className="text-sm font-semibold text-blue-900">After inviting, set:</p>
                          <code className="text-xs bg-blue-200 px-2 py-1 rounded">user_type = "team_member"</code>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                    <div className="flex items-start gap-3">
                      <GraduationCap className="w-6 h-6 text-green-600 mt-1" />
                      <div>
                        <h4 className="font-bold text-lg text-green-900 mb-2">2. Student Coaches (Health Coaches You Train)</h4>
                        <p className="text-gray-700 mb-2">Independent coaches who pay you to use the platform</p>
                        <ul className="space-y-1 text-sm text-gray-700">
                          <li>✓ Only see THEIR clients</li>
                          <li>✓ Use their own business name</li>
                          <li>✓ Can add their OWN team</li>
                          <li>✓ Set up their own payments</li>
                          <li>✓ Use marketing tools</li>
                          <li>✗ Cannot see Business Plan</li>
                          <li>✗ Cannot see Documentation</li>
                        </ul>
                        <div className="mt-3 p-3 bg-green-100 rounded">
                          <p className="text-sm font-semibold text-green-900">After inviting, set:</p>
                          <code className="text-xs bg-green-200 px-2 py-1 rounded block mb-1">user_type = "student_coach"</code>
                          <code className="text-xs bg-green-200 px-2 py-1 rounded block">business_name = "Their Business Name"</code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Student Coach Instructions */}
        {isStudentCoach && (
          <Card className="border-none shadow-xl bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-green-600" />
                Health Coach Team Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-6 bg-white rounded-xl border-2 border-green-200">
                <h3 className="text-xl font-bold mb-4">👥 Add Team Members to Help With Your Clients</h3>
                
                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <div className="flex items-start gap-3">
                    <Users className="w-6 h-6 text-green-600 mt-1" />
                    <div>
                      <h4 className="font-bold text-lg text-green-900 mb-2">Your Team Members</h4>
                      <p className="text-gray-700 mb-2">People who work for YOU (your assistants, interns, etc.)</p>
                      <ul className="space-y-1 text-sm text-gray-700">
                        <li>✓ See only YOUR clients</li>
                        <li>✓ Help manage your clients</li>
                        <li>✓ Create meal plans</li>
                        <li>✓ Use marketing tools</li>
                        <li>✗ Cannot add more team members</li>
                        <li>✗ Cannot see other coaches' clients</li>
                      </ul>
                      <div className="mt-3 p-3 bg-green-100 rounded">
                        <p className="text-sm font-semibold text-green-900">After inviting, ask platform admin to set:</p>
                        <code className="text-xs bg-green-200 px-2 py-1 rounded block mb-1">user_type = "student_team_member"</code>
                        <code className="text-xs bg-green-200 px-2 py-1 rounded block">parent_coach_id = "{user?.id || 'your_id'}"</code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step-by-Step Guide */}
        <Card className="border-none shadow-xl">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
            <CardTitle className="text-3xl">📋 How to Add Team Members</CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <Alert className="border-red-500 bg-red-50">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <AlertDescription>
                <strong>IMPORTANT:</strong> You CANNOT create users through the app. All users must be invited through the Base44 Dashboard.
              </AlertDescription>
            </Alert>

            <div className="space-y-6">
              <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-l-4 border-purple-500">
                <h4 className="font-bold text-xl mb-3">STEP 1: Go to Base44 Dashboard</h4>
                <ol className="space-y-2 ml-6">
                  <li className="flex gap-2">
                    <span className="font-bold text-purple-600">1.</span>
                    <span>Open: <code className="bg-purple-100 px-2 py-1 rounded">https://base44.app</code></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-purple-600">2.</span>
                    <span>Login with your account</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-purple-600">3.</span>
                    <span>Go to your app's dashboard</span>
                  </li>
                </ol>
              </div>

              <div className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-l-4 border-blue-500">
                <h4 className="font-bold text-xl mb-3">STEP 2: Invite User</h4>
                <ol className="space-y-2 ml-6">
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-600">1.</span>
                    <span>Click on "Users" or "Team" in sidebar</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-600">2.</span>
                    <span>Click "Invite User" button</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-600">3.</span>
                    <span>Enter their email address</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-600">4.</span>
                    <span>Select role: <strong>"Admin"</strong> (for dietitians/coaches/team)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-600">5.</span>
                    <span>Click "Send Invitation"</span>
                  </li>
                </ol>
              </div>

              <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-l-4 border-green-500">
                <h4 className="font-bold text-xl mb-3">STEP 3: They Accept Invitation</h4>
                <ol className="space-y-2 ml-6">
                  <li className="flex gap-2">
                    <span className="font-bold text-green-600">1.</span>
                    <span>They receive invitation email</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-green-600">2.</span>
                    <span>They click the link and set password</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-green-600">3.</span>
                    <span>They login to the app</span>
                  </li>
                </ol>
              </div>

              <div className="p-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border-l-4 border-orange-500">
                <h4 className="font-bold text-xl mb-3">STEP 4: Set User Type</h4>
                {isSuperAdmin ? (
                  <div className="space-y-4">
                    <p className="text-gray-700">You (Super Admin) need to set their user_type:</p>
                    <ol className="space-y-2 ml-6">
                      <li className="flex gap-2">
                        <span className="font-bold text-orange-600">1.</span>
                        <span>Go to Dashboard → Data → User in Base44</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-orange-600">2.</span>
                        <span>Find their user record</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-orange-600">3.</span>
                        <span>Click Edit</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-orange-600">4.</span>
                        <span>Set user_type to:</span>
                      </li>
                      <li className="ml-6">
                        <div className="space-y-2 text-sm">
                          <div className="p-3 bg-blue-100 rounded">
                            <strong>For Team Member:</strong><br/>
                            <code className="bg-blue-200 px-2 py-1 rounded">user_type = "team_member"</code>
                          </div>
                          <div className="p-3 bg-green-100 rounded">
                            <strong>For Student Coach:</strong><br/>
                            <code className="bg-green-200 px-2 py-1 rounded block mb-1">user_type = "student_coach"</code>
                            <code className="bg-green-200 px-2 py-1 rounded block">business_name = "Their Business"</code>
                          </div>
                        </div>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-orange-600">5.</span>
                        <span>Click Save</span>
                      </li>
                    </ol>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-gray-700">Contact the platform admin to set user_type for your team member:</p>
                    <div className="p-4 bg-orange-100 rounded">
                      <p className="font-semibold mb-2">Send this to platform admin:</p>
                      <div className="bg-white p-3 rounded font-mono text-sm">
                        <p>Hi! I've invited a new team member.</p>
                        <p className="mt-2">Email: [their email]</p>
                        <p>Please set:</p>
                        <p className="mt-2 text-green-700">user_type = "student_team_member"</p>
                        <p className="text-green-700">parent_coach_id = "{user?.id || 'my_user_id'}"</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl border-l-4 border-pink-500">
                <h4 className="font-bold text-xl mb-3">STEP 5: Done! ✅</h4>
                <p className="text-gray-700">Your team member can now:</p>
                <ul className="space-y-2 ml-6 mt-3">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span>Login to the platform</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span>See {isSuperAdmin ? 'all' : 'your'} clients</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span>Create meal plans</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span>Communicate with clients</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span>Use all tools</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Hierarchy Chart */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-gray-50 to-white">
          <CardHeader>
            <CardTitle className="text-2xl">📊 User Hierarchy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-6 border-4 border-purple-300 rounded-xl bg-purple-50">
                <div className="flex items-center gap-3 mb-3">
                  <Crown className="w-8 h-8 text-purple-600" />
                  <div>
                    <h3 className="text-xl font-bold text-purple-900">Super Admin (Platform Owner)</h3>
                    <p className="text-sm text-purple-700">Full control • Sees everything • Manages all users</p>
                  </div>
                </div>
                
                <div className="ml-8 space-y-3 mt-4">
                  <div className="p-4 border-2 border-blue-300 rounded-lg bg-blue-50">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-6 h-6 text-blue-600" />
                      <div>
                        <h4 className="font-semibold text-blue-900">Team Members</h4>
                        <p className="text-sm text-blue-700">Work for super admin • See all clients • Support role</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-2 border-green-300 rounded-lg bg-green-50">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-6 h-6 text-green-600" />
                      <div>
                        <h4 className="font-semibold text-green-900">Student Coaches</h4>
                        <p className="text-sm text-green-700">Independent • Only their clients • Can have team</p>
                      </div>
                    </div>
                    
                    <div className="ml-8 mt-3">
                      <div className="p-3 border-2 border-cyan-300 rounded-lg bg-cyan-50">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-cyan-600" />
                          <div>
                            <h5 className="font-semibold text-cyan-900 text-sm">Student's Team Members</h5>
                            <p className="text-xs text-cyan-700">Work for student coach • See only that coach's clients</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Support */}
        <Card className="border-none shadow-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
          <CardContent className="p-8 text-center">
            <Info className="w-12 h-12 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Need Help?</h2>
            <p className="text-white/90 mb-4">
              {isSuperAdmin 
                ? "If you need help managing your team or student coaches, contact Base44 support"
                : "If you need help inviting your team members, contact the platform admin or Base44 support"
              }
            </p>
            <Button className="bg-white text-blue-600 hover:bg-gray-100">
              <Mail className="w-4 h-4 mr-2" />
              Contact Support
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}