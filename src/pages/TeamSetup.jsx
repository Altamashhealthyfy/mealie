import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  UserPlus,
  GraduationCap,
  Shield,
  Copy,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Target,
  Rocket,
  Crown
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function TeamSetup() {
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users;
    },
    initialData: [],
  });

  const userType = user?.user_type || 'client';

  if (userType !== 'super_admin') {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl">
          <CardHeader>
            <Shield className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <CardTitle className="text-center text-2xl">Super Admin Only</CardTitle>
            <CardDescription className="text-center">
              Team setup is only for platform administrators
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const coreTeam = allUsers.filter(u => u.user_type === 'team_member' || u.user_type === 'super_admin');
  const studentCoaches = allUsers.filter(u => u.user_type === 'student_coach');
  const clients = allUsers.filter(u => u.user_type === 'client' || !u.user_type);

  const copyUserId = () => {
    navigator.clipboard.writeText(user?.id || '');
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const UserTypeCard = ({ type, icon: Icon, title, description, color, count, instructions, example }) => (
    <Card className={`border-none shadow-xl bg-gradient-to-br ${color}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Icon className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-white text-2xl">{title}</CardTitle>
              <p className="text-white/80">{description}</p>
            </div>
          </div>
          <Badge className="bg-white/20 text-white text-xl px-4 py-2">{count}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* What they can do */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-4">
          <h3 className="text-white font-bold mb-3">✨ Access Level:</h3>
          <div className="space-y-2 text-white/90 text-sm">
            {instructions.access.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="bg-white rounded-xl p-6 text-gray-900">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" />
            How to Add:
          </h3>
          <ol className="space-y-3">
            {instructions.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>

          {/* Example */}
          {example && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
              <p className="text-xs font-semibold text-gray-600 mb-2">EXAMPLE:</p>
              <div className="text-sm font-mono space-y-1">
                {Object.entries(example).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-gray-600">{key}:</span>{' '}
                    <span className="text-gray-900 font-semibold">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* View in Database */}
        <Button
          variant="outline"
          className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
          onClick={() => window.open('https://base44.app', '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Open Base44 Dashboard
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <Badge className="bg-purple-600 text-white text-lg px-6 py-2">
            <Crown className="w-5 h-5 mr-2 inline" />
            Super Admin Setup Center
          </Badge>
          <h1 className="text-5xl font-bold text-gray-900">Team & User Management</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Complete guide to add your team, student coaches, and clients
          </p>
        </div>

        {/* Your User ID Card */}
        <Card className="border-none shadow-xl bg-gradient-to-r from-purple-500 to-pink-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">Your User ID (Save This!)</p>
                <p className="text-white text-2xl font-mono font-bold">{user?.id || 'Loading...'}</p>
                <p className="text-white/70 text-xs mt-2">You'll need this when adding team members</p>
              </div>
              <Button
                onClick={copyUserId}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                {copiedId ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy ID
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardContent className="p-6 text-center">
              <Shield className="w-12 h-12 mx-auto text-blue-500 mb-3" />
              <p className="text-4xl font-bold text-blue-600">{coreTeam.length}</p>
              <p className="text-gray-600">Core Team Members</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-6 text-center">
              <GraduationCap className="w-12 h-12 mx-auto text-green-500 mb-3" />
              <p className="text-4xl font-bold text-green-600">{studentCoaches.length}</p>
              <p className="text-gray-600">Student Coaches</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
            <CardContent className="p-6 text-center">
              <Users className="w-12 h-12 mx-auto text-orange-500 mb-3" />
              <p className="text-4xl font-bold text-orange-600">{clients.length}</p>
              <p className="text-gray-600">Clients</p>
            </CardContent>
          </Card>
        </div>

        {/* User Type Cards */}
        <Tabs defaultValue="core_team" className="space-y-8">
          <TabsList className="grid grid-cols-3 bg-white shadow-lg h-16">
            <TabsTrigger value="core_team" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-lg">
              <Shield className="w-5 h-5 mr-2" />
              Core Team
            </TabsTrigger>
            <TabsTrigger value="student_coaches" className="data-[state=active]:bg-green-500 data-[state=active]:text-white text-lg">
              <GraduationCap className="w-5 h-5 mr-2" />
              Student Coaches
            </TabsTrigger>
            <TabsTrigger value="clients" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-lg">
              <Users className="w-5 h-5 mr-2" />
              Clients
            </TabsTrigger>
          </TabsList>

          {/* CORE TEAM TAB */}
          <TabsContent value="core_team" className="space-y-6">
            <UserTypeCard
              type="team_member"
              icon={Shield}
              title="Core Team Members"
              description="Your employees who help run the business"
              color="from-blue-500 to-cyan-500"
              count={coreTeam.length}
              instructions={{
                access: [
                  "See ALL clients (yours + all student coaches')",
                  "Create & manage meal plans",
                  "Full communication access",
                  "Marketing hub & Business GPTs",
                  "Team attendance & payments",
                  "Cannot add team members (admin only)",
                  "Cannot see usage/billing (admin only)"
                ],
                steps: [
                  "Go to base44.app → Login → Click your app",
                  "Click 'Users' in sidebar → 'Invite User'",
                  "Enter email & SELECT 'Admin' role ⚠️",
                  "They receive email → Accept invitation → Create password",
                  "Go to 'Data' tab → Click 'User' entity",
                  "Find their row → Click 'Edit'",
                  "Set user_type = 'team_member'",
                  `Set parent_coach_id = '${user?.id || '[YOUR_USER_ID]'}'`,
                  "Leave business_name BLANK",
                  "Click 'Save' → Tell them to refresh (F5)",
                  "✅ They see full dashboard!"
                ]
              }}
              example={{
                user_type: "team_member",
                parent_coach_id: user?.id || "[YOUR_USER_ID]",
                business_name: "[Leave blank]"
              }}
            />

            {/* Current Team Members */}
            {coreTeam.length > 0 && (
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Current Team Members ({coreTeam.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {coreTeam.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium">
                              {member.full_name?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold">{member.full_name || 'No name'}</p>
                            <p className="text-sm text-gray-600">{member.email}</p>
                          </div>
                        </div>
                        <Badge className={member.user_type === 'super_admin' ? 'bg-purple-500' : 'bg-blue-500'}>
                          {member.user_type === 'super_admin' ? '👑 Super Admin' : '👥 Team Member'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* STUDENT COACHES TAB */}
          <TabsContent value="student_coaches" className="space-y-6">
            <UserTypeCard
              type="student_coach"
              icon={GraduationCap}
              title="Student Coaches"
              description="Independent health coaches who pay ₹499/month"
              color="from-green-500 to-emerald-500"
              count={studentCoaches.length}
              instructions={{
                access: [
                  "See ONLY their own clients",
                  "Create meal plans for their clients",
                  "Download templates (FREE unlimited)",
                  "Use AI features (with limits)",
                  "White-label with own business name",
                  "Can add their own team members",
                  "Marketing hub & Business GPTs",
                  "Payment setup for their business",
                  "Cannot see other coaches' data"
                ],
                steps: [
                  "Go to base44.app → Login → Click your app",
                  "Click 'Users' in sidebar → 'Invite User'",
                  "Enter email & SELECT 'Admin' role ⚠️",
                  "They receive email → Accept invitation → Create password",
                  "Go to 'Data' tab → Click 'User' entity",
                  "Find their row → Click 'Edit'",
                  "Set user_type = 'student_coach'",
                  `Set parent_coach_id = '${user?.id || '[YOUR_USER_ID]'}'`,
                  "Set business_name = 'Their Business Name' ⚠️",
                  "Click 'Save' → Tell them to refresh (F5)",
                  "✅ They see their own branded dashboard!"
                ]
              }}
              example={{
                user_type: "student_coach",
                parent_coach_id: user?.id || "[YOUR_USER_ID]",
                business_name: "Fit & Healthy by Rajesh"
              }}
            />

            {/* Current Student Coaches */}
            {studentCoaches.length > 0 && (
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Current Student Coaches ({studentCoaches.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {studentCoaches.map((coach) => (
                      <div key={coach.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium">
                              {coach.full_name?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold">{coach.full_name || 'No name'}</p>
                            <p className="text-sm text-gray-600">{coach.email}</p>
                            {coach.business_name && (
                              <p className="text-xs text-green-600 font-medium">{coach.business_name}</p>
                            )}
                          </div>
                        </div>
                        <Badge className="bg-green-500">
                          🎓 Student Coach
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* CLIENTS TAB */}
          <TabsContent value="clients" className="space-y-6">
            <UserTypeCard
              type="client"
              icon={Users}
              title="Clients (End Users)"
              description="People receiving coaching - created via Client Management"
              color="from-orange-500 to-red-500"
              count={clients.length}
              instructions={{
                access: [
                  "View their assigned meal plan",
                  "Log daily food intake",
                  "Track progress (weight, measurements)",
                  "Track MPESS wellness daily",
                  "Message their coach",
                  "View appointments",
                  "Cannot see other clients",
                  "Cannot create meal plans",
                  "Read-only access mostly"
                ],
                steps: [
                  "⚠️ CLIENTS ARE NOT INVITED VIA BASE44!",
                  "Instead, coaches add them through the app:",
                  "Go to: Client Management page",
                  "Click '+ Add New Client' button",
                  "Fill in client details (name, email, health data)",
                  "System calculates macros automatically",
                  "Click 'Save Client'",
                  "Client receives email with login instructions",
                  "They create password & login",
                  "✅ They see client dashboard automatically!",
                  "No manual user_type setting needed"
                ]
              }}
              example={{
                "How to add": "Use 'Client Management' page in app",
                "Not via": "Base44 dashboard",
                user_type: "Auto-set to 'client'",
                parent_coach_id: "Auto-set to coach's ID"
              }}
            />

            {/* Alert for Clients */}
            <Alert className="border-orange-500 bg-orange-50">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <AlertDescription className="ml-2">
                <strong>IMPORTANT:</strong> Clients are added through the "Client Management" page in your app,
                NOT through Base44 dashboard. The system automatically sets them up correctly.
              </AlertDescription>
            </Alert>

            {/* Current Clients Summary */}
            {clients.length > 0 && (
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Current Clients ({clients.length})</CardTitle>
                  <CardDescription>
                    View and manage all clients through the Client Management page
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500"
                    onClick={() => window.location.href = '/client-management'}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Go to Client Management
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Quick Reference */}
        <Card className="border-none shadow-2xl bg-gradient-to-br from-gray-900 to-gray-800 text-white">
          <CardHeader>
            <CardTitle className="text-2xl">📋 Quick Reference Card</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white/10 rounded-lg">
                <h3 className="font-bold mb-2 text-blue-300">👥 Core Team</h3>
                <p className="text-sm text-white/80 mb-2">user_type: team_member</p>
                <p className="text-xs text-white/60">parent_coach_id: YOUR_ID</p>
                <p className="text-xs text-white/60">business_name: [blank]</p>
              </div>

              <div className="p-4 bg-white/10 rounded-lg">
                <h3 className="font-bold mb-2 text-green-300">🎓 Student Coaches</h3>
                <p className="text-sm text-white/80 mb-2">user_type: student_coach</p>
                <p className="text-xs text-white/60">parent_coach_id: YOUR_ID</p>
                <p className="text-xs text-white/60">business_name: Their Name</p>
              </div>

              <div className="p-4 bg-white/10 rounded-lg">
                <h3 className="font-bold mb-2 text-orange-300">👤 Clients</h3>
                <p className="text-sm text-white/80 mb-2">Add via Client Management</p>
                <p className="text-xs text-white/60">NOT via Base44!</p>
                <p className="text-xs text-white/60">Auto-configured</p>
              </div>
            </div>

            <div className="p-4 bg-purple-500/20 rounded-lg border border-purple-400/30">
              <p className="text-sm">
                <strong>Your User ID:</strong> <code className="bg-black/30 px-2 py-1 rounded">{user?.id}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-2 text-white hover:bg-white/10"
                  onClick={copyUserId}
                >
                  {copiedId ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}