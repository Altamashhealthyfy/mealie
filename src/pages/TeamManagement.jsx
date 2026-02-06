import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import TourButton from "@/components/common/TourButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createPageUrl } from "@/utils";
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
  Building2,
  Trash2,
  Edit,
  ClipboardList,
  Plus,
  Calendar as CalendarIcon
} from "lucide-react";

export default function TeamManagement() {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    user_type: "team_member"
  });

  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    title: "",
    description: "",
    assigned_to: "",
    priority: "medium",
    status: "todo",
    due_date: ""
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const userType = user?.user_type || 'team_member';
  const isSuperAdmin = userType === 'super_admin';
  const isStudentCoach = userType === 'student_coach';

  const { data: allUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users;
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: mySubscription } = useQuery({
    queryKey: ['myCoachSubscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.HealthCoachSubscription.filter({ 
        coach_email: user?.email,
        status: 'active'
      });
      return subs[0] || null;
    },
    enabled: !!user && isStudentCoach,
  });

  const { data: myPlan } = useQuery({
    queryKey: ['myCoachPlan', mySubscription?.plan_id],
    queryFn: async () => {
      if (!mySubscription?.plan_id) return null;
      const plans = await base44.entities.HealthCoachPlan.filter({ id: mySubscription.plan_id });
      return plans[0] || null;
    },
    enabled: !!mySubscription?.plan_id,
  });

  const addUserMutation = useMutation({
    mutationFn: async (data) => {
      // Create user with password using backend function
      const response = await base44.functions.invoke('createUserWithPassword', {
        email: data.email.trim(),
        full_name: data.full_name?.trim() || data.email.trim(),
        password: 'TempPass123!',
        user_type: data.user_type
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allUsers']);
      setShowAddDialog(false);
      setFormData({ full_name: "", email: "", password: "", user_type: "team_member" });
      alert('✅ User created successfully! Temporary password: TempPass123!');
    },
    onError: (error) => {
      console.error('User creation error:', error);
      alert('❌ Error: ' + (error?.response?.data?.error || error?.message || 'Failed to create user'));
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      return await base44.entities.User.delete(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allUsers']);
      setShowDetailDialog(false);
      setSelectedMember(null);
      alert('✅ User deleted successfully!');
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }) => {
      return await base44.asServiceRole.entities.User.update(userId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allUsers']);
      setShowDetailDialog(false);
      setSelectedMember(null);
      alert('✅ User updated successfully!');
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['teamTasks'],
    queryFn: async () => {
      const allTasks = await base44.entities.Task.list('-created_date');
      return allTasks;
    },
    enabled: !!user,
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Task.create({
        ...data,
        assigned_by: user?.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['teamTasks']);
      setShowAddTaskDialog(false);
      setTaskFormData({
        title: "",
        description: "",
        assigned_to: "",
        priority: "medium",
        status: "todo",
        due_date: ""
      });
      alert('✅ Task created successfully!');
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }) => {
      return await base44.entities.Task.update(taskId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['teamTasks']);
    },
  });

  const handleAddUser = () => {
    if (!formData.email) {
      alert('Please enter an email address');
      return;
    }
    
    if (!canAddMore) {
      alert(`⚠️ Team member limit reached!\n\nYour plan allows ${teamMemberLimit} team member${teamMemberLimit !== 1 ? 's' : ''} and you currently have ${currentTeamCount}.\n\nUpgrade your plan to add more team members.`);
      return;
    }
    
    addUserMutation.mutate(formData);
  };

  const handleViewDetails = (member) => {
    setSelectedMember(member);
    setShowDetailDialog(true);
  };

  const handleUpdateMember = () => {
    if (!selectedMember) return;
    updateUserMutation.mutate({
      userId: selectedMember.id,
      data: selectedMember
    });
  };

  // Check if coach has team management permission from their plan
  const hasTeamManagementPermission = myPlan?.can_manage_team || false;
  const canManageTeam = isSuperAdmin || (isStudentCoach && hasTeamManagementPermission);

  // Filter team members based on user role
  const filteredTeamMembers = allUsers.filter(u => {
    if (u.user_type === 'client') return false;
    
    if (isSuperAdmin) {
      // Super admin sees ALL team members and student coaches, except themselves
      return (u.user_type === 'team_member' || u.user_type === 'student_coach' || u.user_type === 'student_team_member') && u.id !== user?.id;
    } else if (isStudentCoach) {
      // Student coach only sees their own team members (student_team_member created by them)
      return u.user_type === 'student_team_member' && u.created_by === user?.email;
    }
    return false;
  });

  // Calculate team member limit
  const teamMemberLimit = isStudentCoach ? (myPlan?.max_team_members || 0) : -1;
  const currentTeamCount = isStudentCoach ? filteredTeamMembers.length : 0;
  const canAddMore = isSuperAdmin || (isStudentCoach && (teamMemberLimit === -1 || currentTeamCount < teamMemberLimit));

  if (!canManageTeam) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl">
          <CardHeader>
            <Shield className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <CardTitle className="text-center text-2xl">Access Restricted</CardTitle>
            <CardDescription className="text-center text-lg">
              {isStudentCoach ? "Team Management Not Available" : "Only admins and coaches can manage team members"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription>
                {isStudentCoach 
                  ? "Your current plan does not include Team Management. Upgrade your subscription to access this feature."
                  : "This feature is available to platform owners and student coaches only."}
              </AlertDescription>
            </Alert>
            {isStudentCoach && (
              <Button
                onClick={() => window.location.href = createPageUrl('CoachSubscriptions')}
                className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-500"
              >
                View Subscription Plans
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreateTask = () => {
    if (!taskFormData.title || !taskFormData.assigned_to) {
      alert('Please fill in task title and assign to someone');
      return;
    }
    createTaskMutation.mutate(taskFormData);
  };

  const handleTaskStatusChange = (taskId, newStatus) => {
    updateTaskMutation.mutate({ taskId, data: { status: newStatus } });
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
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
              {isStudentCoach && (
                <Badge className="bg-blue-600 text-white">
                  Team: {currentTeamCount}/{teamMemberLimit === -1 ? '∞' : teamMemberLimit}
                </Badge>
              )}
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-2">Team Management</h1>
            <p className="text-xl text-gray-600">
              {isSuperAdmin 
                ? 'Manage tasks and team members' 
                : 'Manage tasks and team members'
              }
            </p>
          </div>
          <Button 
            onClick={() => setShowAddDialog(true)} 
            disabled={!canAddMore}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Add User
          </Button>
        </div>

        {/* Team Limit Alert for Student Coaches */}
        {isStudentCoach && !canAddMore && (
          <Alert className="bg-orange-50 border-orange-500">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <AlertDescription className="text-orange-900">
              <strong>Team Member Limit Reached!</strong> Your plan allows {teamMemberLimit} team member{teamMemberLimit !== 1 ? 's' : ''} and you currently have {currentTeamCount}. Upgrade your plan to add more team members.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur grid grid-cols-2">
            <TabsTrigger value="tasks">
              <ClipboardList className="w-4 h-4 mr-2" />
              Tasks Board
            </TabsTrigger>
            <TabsTrigger value="team">
              <Users className="w-4 h-4 mr-2" />
              Team Members
            </TabsTrigger>
          </TabsList>

          {/* Team Members Tab */}
          <TabsContent value="team" className="space-y-8">
            {/* Users List */}
            <Card className="border-none shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white">
            <CardTitle className="text-2xl flex items-center justify-between">
              <span>Team Members</span>
              <Badge className="bg-white text-blue-600">
                {filteredTeamMembers.length} {filteredTeamMembers.length === 1 ? 'Member' : 'Members'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {filteredTeamMembers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No team members yet</h3>
                <p className="text-gray-600 mb-4">Add team members to help manage your clients</p>
                <Button 
                  onClick={() => setShowAddDialog(true)}
                  disabled={!canAddMore}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Add First Team Member
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTeamMembers.map(teamUser => (
                <div key={teamUser.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1 cursor-pointer" onClick={() => handleViewDetails(teamUser)}>
                    <h3 className="font-bold text-gray-900">{teamUser.full_name}</h3>
                    <p className="text-sm text-gray-600">{teamUser.email}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge className={
                        teamUser.user_type === 'super_admin' ? 'bg-purple-600' :
                        teamUser.user_type === 'student_coach' ? 'bg-green-600' :
                        'bg-blue-600'
                      }>
                        {teamUser.user_type === 'super_admin' ? 'Super Admin' :
                         teamUser.user_type === 'student_coach' ? 'Health Coach' :
                         teamUser.user_type === 'student_team_member' ? 'Coach Team' :
                         'Team Member'}
                      </Badge>
                      {teamUser.created_date && (
                        <Badge variant="outline" className="text-xs">
                          Added {new Date(teamUser.created_date).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleViewDetails(teamUser)}
                      variant="outline"
                      size="sm"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {teamUser.id !== user?.id && (
                      <Button
                        onClick={() => {
                          if (confirm('Delete this user?')) {
                            deleteUserMutation.mutate(teamUser.id);
                          }
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Tasks Board</h2>
              <Button 
                onClick={() => setShowAddTaskDialog(true)}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </div>

            {tasks.length === 0 ? (
              <Card className="border-none shadow-xl">
                <CardContent className="p-12 text-center">
                  <ClipboardList className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No tasks yet</h3>
                  <p className="text-gray-600 mb-4">Create tasks and assign them to your team members</p>
                  <Button 
                    onClick={() => setShowAddTaskDialog(true)}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create First Task
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* TO-DO Column */}
                <Card className="border-none shadow-xl bg-gradient-to-br from-gray-50 to-white">
                  <CardHeader className="bg-gray-100 border-b">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                      TO-DO
                      <Badge className="ml-auto bg-gray-500">
                        {tasks.filter(t => t.status === 'todo').length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 min-h-[400px]">
                    {tasks.filter(t => t.status === 'todo').map(task => {
                      const assignedUser = filteredTeamMembers.find(m => m.email === task.assigned_to);
                      const priorityColors = {
                        low: 'bg-blue-100 text-blue-700 border-blue-200',
                        medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
                        high: 'bg-red-100 text-red-700 border-red-200',
                        urgent: 'bg-purple-100 text-purple-700 border-purple-200'
                      };
                      
                      return (
                        <div key={task.id} className="p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-orange-300 transition-all shadow-sm">
                          <h4 className="font-bold text-gray-900 mb-2">{task.title}</h4>
                          {task.description && (
                            <p className="text-xs text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1 mb-2">
                            <Badge className={`text-xs ${priorityColors[task.priority]}`}>
                              {task.priority}
                            </Badge>
                            {assignedUser && (
                              <Badge variant="outline" className="text-xs flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {assignedUser.full_name}
                              </Badge>
                            )}
                          </div>
                          {task.due_date && (
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              {new Date(task.due_date).toLocaleDateString()}
                            </p>
                          )}
                          <div className="mt-2 pt-2 border-t flex gap-1">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleTaskStatusChange(task.id, 'in_progress')}
                              className="flex-1 text-xs"
                            >
                              Start →
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* DOING Column */}
                <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50 to-white">
                  <CardHeader className="bg-blue-100 border-b">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      DOING
                      <Badge className="ml-auto bg-blue-500">
                        {tasks.filter(t => t.status === 'in_progress').length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 min-h-[400px]">
                    {tasks.filter(t => t.status === 'in_progress').map(task => {
                      const assignedUser = filteredTeamMembers.find(m => m.email === task.assigned_to);
                      const priorityColors = {
                        low: 'bg-blue-100 text-blue-700 border-blue-200',
                        medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
                        high: 'bg-red-100 text-red-700 border-red-200',
                        urgent: 'bg-purple-100 text-purple-700 border-purple-200'
                      };
                      
                      return (
                        <div key={task.id} className="p-3 bg-white rounded-lg border-2 border-blue-300 hover:border-blue-400 transition-all shadow-sm">
                          <h4 className="font-bold text-gray-900 mb-2">{task.title}</h4>
                          {task.description && (
                            <p className="text-xs text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1 mb-2">
                            <Badge className={`text-xs ${priorityColors[task.priority]}`}>
                              {task.priority}
                            </Badge>
                            {assignedUser && (
                              <Badge variant="outline" className="text-xs flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {assignedUser.full_name}
                              </Badge>
                            )}
                          </div>
                          {task.due_date && (
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              {new Date(task.due_date).toLocaleDateString()}
                            </p>
                          )}
                          <div className="mt-2 pt-2 border-t flex gap-1">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleTaskStatusChange(task.id, 'todo')}
                              className="flex-1 text-xs"
                            >
                              ← Back
                            </Button>
                            <Button 
                              size="sm" 
                              className="flex-1 text-xs bg-green-500 hover:bg-green-600"
                              onClick={() => handleTaskStatusChange(task.id, 'done')}
                            >
                              Done ✓
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* DONE Column */}
                <Card className="border-none shadow-xl bg-gradient-to-br from-green-50 to-white">
                  <CardHeader className="bg-green-100 border-b">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      DONE
                      <Badge className="ml-auto bg-green-500">
                        {tasks.filter(t => t.status === 'done').length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 min-h-[400px]">
                    {tasks.filter(t => t.status === 'done').map(task => {
                      const assignedUser = filteredTeamMembers.find(m => m.email === task.assigned_to);
                      const priorityColors = {
                        low: 'bg-blue-100 text-blue-700 border-blue-200',
                        medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
                        high: 'bg-red-100 text-red-700 border-red-200',
                        urgent: 'bg-purple-100 text-purple-700 border-purple-200'
                      };
                      
                      return (
                        <div key={task.id} className="p-3 bg-white rounded-lg border-2 border-green-300 hover:border-green-400 transition-all shadow-sm opacity-75">
                          <h4 className="font-bold text-gray-900 mb-2 line-through">{task.title}</h4>
                          {task.description && (
                            <p className="text-xs text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1 mb-2">
                            <Badge className={`text-xs ${priorityColors[task.priority]}`}>
                              {task.priority}
                            </Badge>
                            {assignedUser && (
                              <Badge variant="outline" className="text-xs flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {assignedUser.full_name}
                              </Badge>
                            )}
                            <Badge className="text-xs bg-green-100 text-green-700">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Completed
                            </Badge>
                          </div>
                          {task.due_date && (
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              {new Date(task.due_date).toLocaleDateString()}
                            </p>
                          )}
                          <div className="mt-2 pt-2 border-t">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleTaskStatusChange(task.id, 'in_progress')}
                              className="w-full text-xs"
                            >
                              ← Reopen
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Member Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Team Member Details</DialogTitle>
            </DialogHeader>
            {selectedMember && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      value={selectedMember.full_name || ''}
                      onChange={(e) => setSelectedMember({...selectedMember, full_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={selectedMember.email || ''}
                      onChange={(e) => setSelectedMember({...selectedMember, email: e.target.value})}
                      disabled
                    />
                  </div>
                </div>

                {isSuperAdmin && (
                  <div className="space-y-2">
                    <Label>User Type</Label>
                    <Select 
                      value={selectedMember.user_type || 'team_member'} 
                      onValueChange={(value) => setSelectedMember({...selectedMember, user_type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                        <SelectItem value="team_member">Team Member</SelectItem>
                        <SelectItem value="student_coach">Student Coach</SelectItem>
                        <SelectItem value="student_team_member">Coach Team Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">User ID:</span>
                    <span className="font-mono text-xs">{selectedMember.id}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Created:</span>
                    <span>{new Date(selectedMember.created_date).toLocaleString()}</span>
                  </div>
                  {selectedMember.created_by && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Added By:</span>
                      <span>{selectedMember.created_by}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => setShowDetailDialog(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateMember}
                    disabled={updateUserMutation.isPending}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                  {selectedMember.id !== user?.id && (
                    <Button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this user?')) {
                          deleteUserMutation.mutate(selectedMember.id);
                        }
                      }}
                      disabled={deleteUserMutation.isPending}
                      variant="destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Add User Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                {isSuperAdmin ? 'Create New Health Coach' : 'Invite Team Member'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Alert className="bg-blue-50 border-blue-300">
                <Info className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>How it works:</strong> Enter the email address below. The user will receive an invitation link to create their account and set their password.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Full Name (Optional)</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  placeholder="Dr Dt Sheenu Sanjeev"
                />
                <p className="text-xs text-gray-500">For your reference only - they can update this later</p>
              </div>

              <div className="space-y-2">
                <Label>Email Address *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="sheenumathur10@gmail.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={formData.user_type} onValueChange={(value) => setFormData({...formData, user_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isSuperAdmin && (
                      <>
                        <SelectItem value="student_coach">Health Coach</SelectItem>
                        <SelectItem value="team_member">Team Member</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </>
                    )}
                    {!isSuperAdmin && (
                      <SelectItem value="student_team_member">Team Member</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Alert className="bg-green-50 border-green-300">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  The {isSuperAdmin ? 'health coach' : 'team member'} will be created with '{formData.user_type === 'student_coach' ? 'student_coach' : formData.user_type === 'super_admin' ? 'super_admin' : formData.user_type === 'team_member' ? 'team_member' : 'student_team_member'}' role. You can assign a plan to them after creation.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddUser}
                  disabled={addUserMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                >
                  {addUserMutation.isPending ? (
                    <>
                      <Mail className="w-4 h-4 mr-2 animate-pulse" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Task Dialog */}
        <Dialog open={showAddTaskDialog} onOpenChange={setShowAddTaskDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Task Title *</Label>
                <Input
                  value={taskFormData.title}
                  onChange={(e) => setTaskFormData({...taskFormData, title: e.target.value})}
                  placeholder="e.g., Create meal plans for new clients"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={taskFormData.description}
                  onChange={(e) => setTaskFormData({...taskFormData, description: e.target.value})}
                  placeholder="Task details..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Assign To *</Label>
                <Select 
                  value={taskFormData.assigned_to} 
                  onValueChange={(value) => setTaskFormData({...taskFormData, assigned_to: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTeamMembers.map(member => (
                      <SelectItem key={member.id} value={member.email}>
                        {member.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select 
                    value={taskFormData.priority} 
                    onValueChange={(value) => setTaskFormData({...taskFormData, priority: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={taskFormData.due_date}
                    onChange={(e) => setTaskFormData({...taskFormData, due_date: e.target.value})}
                  />
                </div>
              </div>
              <Button
                onClick={handleCreateTask}
                disabled={createTaskMutation.isPending}
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Contact Support */}
        <Card className="border-none shadow-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
          <CardContent className="p-8 text-center">
            <Info className="w-12 h-12 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Need Help?</h2>
            <p className="text-white/90 mb-4">
              {isSuperAdmin 
                ? "If you need help managing your team or student coaches, contact support"
                : "If you need help with your team members, contact the platform admin"
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