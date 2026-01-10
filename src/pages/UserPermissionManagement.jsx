import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Search, Shield, Save, Edit2, Crown, UserCog, GraduationCap, Eye, Edit, Trash2, Award, UserPlus, Key } from "lucide-react";

export default function UserPermissionManagement() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editGlobalClientDialog, setEditGlobalClientDialog] = useState(false);
  const [customPermissions, setCustomPermissions] = useState({});
  const [globalClientPermissions, setGlobalClientPermissions] = useState({});
  const [activeUserType, setActiveUserType] = useState("super_admin");
  const [assignPlanDialog, setAssignPlanDialog] = useState(false);
  const [selectedCoachForPlan, setSelectedCoachForPlan] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [createCoachDialog, setCreateCoachDialog] = useState(false);
  const [newCoachEmail, setNewCoachEmail] = useState("");
  const [newCoachName, setNewCoachName] = useState("");
  const [newCoachPassword, setNewCoachPassword] = useState("");
  const [createMethod, setCreateMethod] = useState("invite"); // "invite" or "password"
  const [changePasswordDialog, setChangePasswordDialog] = useState(false);
  const [selectedCoachForPassword, setSelectedCoachForPassword] = useState(null);
  const [newPasswordForCoach, setNewPasswordForCoach] = useState("");

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!currentUser && currentUser.user_type === 'super_admin',
    initialData: [],
  });

  const { data: userPermissions } = useQuery({
    queryKey: ['userPermissions'],
    queryFn: () => base44.entities.UserPermissions.list(),
    enabled: !!currentUser && currentUser.user_type === 'super_admin',
    initialData: [],
  });

  const { data: securitySettings } = useQuery({
    queryKey: ['securitySettings'],
    queryFn: async () => {
      const settings = await base44.entities.AppSecuritySettings.list();
      return settings[0] || null;
    },
    enabled: !!currentUser && currentUser.user_type === 'super_admin',
  });

  const { data: coachPlans } = useQuery({
    queryKey: ['coachPlans'],
    queryFn: () => base44.entities.HealthCoachPlan.list('sort_order'),
    enabled: !!currentUser && currentUser.user_type === 'super_admin',
    initialData: [],
  });

  const { data: coachSubscriptions } = useQuery({
    queryKey: ['coachSubscriptions'],
    queryFn: () => base44.entities.HealthCoachSubscription.list(),
    enabled: !!currentUser && currentUser.user_type === 'super_admin',
    initialData: [],
  });

  const savePermissionsMutation = useMutation({
    mutationFn: async (data) => {
      const existing = userPermissions.find(p => p.user_email === data.user_email);
      if (existing) {
        return await base44.entities.UserPermissions.update(existing.id, data);
      } else {
        return await base44.entities.UserPermissions.create(data);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['userPermissions']);
      queryClient.invalidateQueries(['userCustomPermissions']);
      queryClient.invalidateQueries(['securitySettings']);
      queryClient.invalidateQueries(['allUsers']);
      queryClient.invalidateQueries(['userCustomPermissions', data.user_email]);
      
      setEditDialog(false);
      alert('✅ User permissions saved successfully!');
    },
  });

  const saveGlobalClientPermissionsMutation = useMutation({
    mutationFn: async (clientRestrictions) => {
      const updatedSettings = {
        ...securitySettings,
        client_restrictions: clientRestrictions,
        settings_metadata: {
          last_modified_by: currentUser?.email,
          last_modified_date: new Date().toISOString(),
          version: (securitySettings.settings_metadata?.version || 0) + 1
        }
      };
      
      return await base44.entities.AppSecuritySettings.update(securitySettings.id, updatedSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['securitySettings']);
      queryClient.invalidateQueries(['userCustomPermissions']);
      setEditGlobalClientDialog(false);
      alert('✅ Global client permissions saved successfully!');
    },
  });

  const assignPlanMutation = useMutation({
    mutationFn: async ({ coachEmail, planId, billingCycle }) => {
      const existingSub = coachSubscriptions.find(s => s.coach_email === coachEmail && s.status === 'active');
      const selectedPlan = coachPlans.find(p => p.id === planId);
      
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date();
      if (billingCycle === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      const amount = billingCycle === 'yearly' ? selectedPlan?.yearly_price : selectedPlan?.monthly_price;

      const subscriptionData = {
        coach_email: coachEmail,
        coach_name: allUsers.find(u => u.email === coachEmail)?.full_name || coachEmail,
        plan_id: planId,
        plan_name: selectedPlan?.plan_name,
        billing_cycle: billingCycle,
        amount: amount || 0,
        currency: 'INR',
        start_date: startDate,
        end_date: endDate.toISOString().split('T')[0],
        next_billing_date: endDate.toISOString().split('T')[0],
        status: 'active',
        payment_method: 'manual',
        manually_granted: true,
        granted_by: currentUser?.email,
        auto_renew: false
      };

      if (existingSub) {
        return await base44.entities.HealthCoachSubscription.update(existingSub.id, subscriptionData);
      } else {
        return await base44.entities.HealthCoachSubscription.create(subscriptionData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['coachSubscriptions']);
      setAssignPlanDialog(false);
      setSelectedCoachForPlan(null);
      setSelectedPlanId("");
      setBillingCycle("monthly");
      alert('✅ Health Coach Plan assigned successfully!');
    },
  });

  const createCoachMutation = useMutation({
    mutationFn: async ({ email, name, password, method }) => {
      if (method === "password") {
        // Create user with password using backend function
        const response = await base44.functions.invoke('createUserWithPassword', {
          email,
          full_name: name,
          password,
          user_type: 'student_coach'
        });
        return response.data;
      } else {
        // Send invitation email
        await base44.users.inviteUser(email, 'admin');
        
        // Wait a moment and update user type
        await new Promise(resolve => setTimeout(resolve, 2000));
        const users = await base44.asServiceRole.entities.User.list();
        const newUser = users.find(u => u.email === email);
        
        if (newUser) {
          await base44.asServiceRole.entities.User.update(newUser.id, {
            full_name: name || email,
            user_type: 'student_coach'
          });
        }
        
        return { success: true, email };
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['allUsers']);
      setCreateCoachDialog(false);
      setNewCoachEmail("");
      setNewCoachName("");
      setNewCoachPassword("");
      setCreateMethod("invite");
      
      if (variables.method === "password") {
        alert('✅ Health coach created successfully! They can now login with their credentials.');
      } else {
        alert('✅ Invitation sent! The coach will receive an email to set their password and complete registration.');
      }
    },
    onError: (error) => {
      alert('❌ Failed to create coach: ' + (error.response?.data?.error || error.message));
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ email, password }) => {
      return await base44.functions.invoke('changeUserPassword', {
        email,
        password
      });
    },
    onSuccess: () => {
      setChangePasswordDialog(false);
      setSelectedCoachForPassword(null);
      setNewPasswordForCoach("");
      alert('✅ Password changed successfully!');
    },
    onError: (error) => {
      alert('❌ Failed to change password: ' + (error.response?.data?.error || error.message));
    }
  });

  if (currentUser?.user_type !== 'super_admin') {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <Shield className="w-6 h-6" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-800">Only Platform Owner can access user permission management.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getUsersByType = (userType) => {
    return allUsers.filter(u => u.user_type === userType);
  };

  const getUserCustomPermissions = (userEmail) => {
    return userPermissions.find(p => p.user_email === userEmail);
  };

  const getDefaultPermissions = (userType) => {
    const permissionMap = {
      'super_admin': securitySettings?.super_admin_permissions || {},
      'team_member': securitySettings?.team_member_permissions || {},
      'student_coach': securitySettings?.student_coach_permissions || {}
    };
    return permissionMap[userType] || {};
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    const existing = getUserCustomPermissions(user.email);
    const defaults = getDefaultPermissions(user.user_type);
    setCustomPermissions(existing?.custom_permissions || defaults);
    setEditDialog(true);
  };

  const handleEditGlobalClientPermissions = () => {
    setGlobalClientPermissions(securitySettings?.client_restrictions || {});
    setEditGlobalClientDialog(true);
  };

  const handleSavePermissions = () => {
    savePermissionsMutation.mutate({
      user_email: selectedUser.email,
      user_type: selectedUser.user_type,
      custom_permissions: customPermissions
    });
  };

  const handleSaveGlobalClientPermissions = () => {
    saveGlobalClientPermissionsMutation.mutate(globalClientPermissions);
  };

  const handleAssignPlan = (coach) => {
    setSelectedCoachForPlan(coach);
    const existingSub = coachSubscriptions.find(s => s.coach_email === coach.email && s.status === 'active');
    setSelectedPlanId(existingSub?.plan_id || "");
    setBillingCycle(existingSub?.billing_cycle || "monthly");
    setAssignPlanDialog(true);
  };

  const handleSaveAssignPlan = () => {
    if (!selectedPlanId) {
      alert('Please select a plan');
      return;
    }
    assignPlanMutation.mutate({
      coachEmail: selectedCoachForPlan.email,
      planId: selectedPlanId,
      billingCycle: billingCycle
    });
  };

  const handleCreateCoach = () => {
    if (!newCoachEmail) {
      alert('Please enter an email address');
      return;
    }
    
    if (createMethod === "password") {
      if (!newCoachPassword || newCoachPassword.length < 6) {
        alert('Password must be at least 6 characters');
        return;
      }
    }
    
    createCoachMutation.mutate({
      email: newCoachEmail,
      name: newCoachName,
      password: newCoachPassword,
      method: createMethod
    });
  };

  const handleOpenChangePassword = (coach) => {
    setSelectedCoachForPassword(coach);
    setNewPasswordForCoach("");
    setChangePasswordDialog(true);
  };

  const handleChangePassword = () => {
    if (!newPasswordForCoach || newPasswordForCoach.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    changePasswordMutation.mutate({
      email: selectedCoachForPassword.email,
      password: newPasswordForCoach
    });
  };

  const getCoachSubscription = (coachEmail) => {
    return coachSubscriptions.find(s => s.coach_email === coachEmail && s.status === 'active');
  };

  const updatePermission = (key, value) => {
    setCustomPermissions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateGlobalClientPermission = (key, value) => {
    setGlobalClientPermissions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const filteredUsers = getUsersByType(activeUserType).filter(user =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const permissionCategories = {
    super_admin: [
      { key: 'can_view_dashboard', label: 'View Dashboard', type: 'view' },
      { key: 'can_manage_users', label: 'Manage Users', type: 'edit' },
      { key: 'can_invite_users', label: 'Invite Users', type: 'edit' },
      { key: 'can_delete_users', label: 'Delete Users', type: 'delete' },
      { key: 'can_modify_user_roles', label: 'Modify User Roles', type: 'edit' },
      { key: 'can_view_all_clients', label: 'View All Clients', type: 'view' },
      { key: 'can_create_clients', label: 'Create Clients', type: 'edit' },
      { key: 'can_edit_all_clients', label: 'Edit All Clients', type: 'edit' },
      { key: 'can_delete_clients', label: 'Delete Clients', type: 'delete' },
      { key: 'can_view_all_meal_plans', label: 'View All Meal Plans', type: 'view' },
      { key: 'can_create_meal_plans', label: 'Create Meal Plans', type: 'edit' },
      { key: 'can_edit_all_meal_plans', label: 'Edit All Meal Plans', type: 'edit' },
      { key: 'can_delete_meal_plans', label: 'Delete Meal Plans', type: 'delete' },
      { key: 'can_view_all_messages', label: 'View All Messages', type: 'view' },
      { key: 'can_send_messages', label: 'Send Messages', type: 'edit' },
      { key: 'can_delete_messages', label: 'Delete Messages', type: 'delete' },
      { key: 'can_view_financial_data', label: 'View Financial Data', type: 'view' },
      { key: 'can_edit_financial_data', label: 'Edit Financial Data', type: 'edit' },
      { key: 'can_delete_financial_data', label: 'Delete Financial Data', type: 'delete' },
      { key: 'can_view_templates', label: 'View Templates', type: 'view' },
      { key: 'can_create_templates', label: 'Create Templates', type: 'edit' },
      { key: 'can_edit_templates', label: 'Edit Templates', type: 'edit' },
      { key: 'can_delete_templates', label: 'Delete Templates', type: 'delete' },
      { key: 'can_view_recipes', label: 'View Recipes', type: 'view' },
      { key: 'can_create_recipes', label: 'Create Recipes', type: 'edit' },
      { key: 'can_edit_all_recipes', label: 'Edit All Recipes', type: 'edit' },
      { key: 'can_delete_recipes', label: 'Delete Recipes', type: 'delete' },
      { key: 'can_upload_files', label: 'Upload Files', type: 'edit' },
      { key: 'can_delete_files', label: 'Delete Files', type: 'delete' },
      { key: 'can_manage_permissions', label: 'Manage Permissions', type: 'edit' },
    ],
    team_member: [
      { key: 'can_view_dashboard', label: 'View Dashboard', type: 'view' },
      { key: 'can_view_only_own_clients', label: 'View Only Own Clients', type: 'view' },
      { key: 'can_view_all_clients', label: 'View All Clients', type: 'view' },
      { key: 'can_create_clients', label: 'Create Clients', type: 'edit' },
      { key: 'can_edit_own_clients', label: 'Edit Own Clients', type: 'edit' },
      { key: 'can_edit_all_clients', label: 'Edit All Clients', type: 'edit' },
      { key: 'can_delete_own_clients', label: 'Delete Own Clients', type: 'delete' },
      { key: 'can_delete_all_clients', label: 'Delete All Clients', type: 'delete' },
      { key: 'can_view_own_meal_plans', label: 'View Own Meal Plans', type: 'view' },
      { key: 'can_view_all_meal_plans', label: 'View All Meal Plans', type: 'view' },
      { key: 'can_create_meal_plans', label: 'Create Meal Plans', type: 'edit' },
      { key: 'can_edit_own_meal_plans', label: 'Edit Own Meal Plans', type: 'edit' },
      { key: 'can_edit_all_meal_plans', label: 'Edit All Meal Plans', type: 'edit' },
      { key: 'can_view_own_messages', label: 'View Own Messages', type: 'view' },
      { key: 'can_view_all_messages', label: 'View All Messages', type: 'view' },
      { key: 'can_send_messages', label: 'Send Messages', type: 'edit' },
      { key: 'can_view_financial_data', label: 'View Financial Data', type: 'view' },
      { key: 'can_edit_financial_data', label: 'Edit Financial Data', type: 'edit' },
      { key: 'can_view_recipes', label: 'View Recipes', type: 'view' },
      { key: 'can_create_recipes', label: 'Create Recipes', type: 'edit' },
      { key: 'can_edit_own_recipes', label: 'Edit Own Recipes', type: 'edit' },
      { key: 'can_delete_own_recipes', label: 'Delete Own Recipes', type: 'delete' },
    ],
    student_coach: [
      { key: 'can_view_dashboard', label: 'View Dashboard', type: 'view' },
      { key: 'can_view_only_own_clients', label: 'View Only Own Clients', type: 'view' },
      { key: 'can_view_all_clients', label: 'View All Clients', type: 'view' },
      { key: 'can_create_clients', label: 'Create Clients', type: 'edit' },
      { key: 'can_edit_own_clients', label: 'Edit Own Clients', type: 'edit' },
      { key: 'can_edit_all_clients', label: 'Edit All Clients', type: 'edit' },
      { key: 'can_delete_own_clients', label: 'Delete Own Clients', type: 'delete' },
      { key: 'can_delete_all_clients', label: 'Delete All Clients', type: 'delete' },
      { key: 'can_create_meal_plans', label: 'Create Meal Plans', type: 'edit' },
      { key: 'can_edit_own_meal_plans', label: 'Edit Own Meal Plans', type: 'edit' },
      { key: 'can_send_messages', label: 'Send Messages', type: 'edit' },
      { key: 'can_access_business_tools', label: 'Access Business Tools', type: 'view' },
      { key: 'can_manage_team', label: 'Manage Team', type: 'edit' },
      { key: 'can_view_financial_data', label: 'View Financial Data', type: 'view' },
      { key: 'can_edit_financial_data', label: 'Edit Financial Data', type: 'edit' },
      { key: 'can_delete_financial_data', label: 'Delete Financial Data', type: 'delete' },
      { key: 'can_create_templates', label: 'Create Templates', type: 'edit' },
      { key: 'can_edit_own_templates', label: 'Edit Own Templates', type: 'edit' },
      { key: 'can_delete_own_templates', label: 'Delete Own Templates', type: 'delete' },
    ],
    client: [
      { key: 'can_view_meal_plan', label: 'View Meal Plan', type: 'view' },
      { key: 'can_comment_on_meal_plan', label: 'Comment on Meal Plan', type: 'edit' },
      { key: 'can_view_food_log', label: 'View Food Log', type: 'view' },
      { key: 'can_edit_food_log', label: 'Edit Food Log', type: 'edit' },
      { key: 'can_delete_food_log', label: 'Delete Food Log', type: 'delete' },
      { key: 'can_view_progress', label: 'View Progress', type: 'view' },
      { key: 'can_edit_progress', label: 'Edit Progress', type: 'edit' },
      { key: 'can_delete_progress', label: 'Delete Progress', type: 'delete' },
      { key: 'can_view_mpess', label: 'View MPESS', type: 'view' },
      { key: 'can_edit_mpess', label: 'Edit MPESS', type: 'edit' },
      { key: 'can_view_messages', label: 'View Messages', type: 'view' },
      { key: 'can_send_messages', label: 'Send Messages', type: 'edit' },
      { key: 'can_view_appointments', label: 'View Appointments', type: 'view' },
      { key: 'can_book_appointments', label: 'Book Appointments', type: 'edit' },
      { key: 'can_view_profile', label: 'View Profile', type: 'view' },
      { key: 'can_edit_profile', label: 'Edit Profile', type: 'edit' },
      { key: 'can_upload_profile_photo', label: 'Upload Profile Photo', type: 'edit' },
      { key: 'show_my_plans', label: 'Show My Plans Page', type: 'view' },
      { key: 'can_view_recipes', label: 'View Recipes', type: 'view' },
      { key: 'can_download_recipes', label: 'Download Recipes', type: 'edit' },
      { key: 'can_upload_recipes', label: 'Upload Recipes', type: 'edit' },
      { key: 'can_generate_ai_recipes', label: 'Generate AI Recipes', type: 'edit' },
      { key: 'can_upload_progress_photos', label: 'Upload Progress Photos', type: 'edit' },
      { key: 'can_upload_food_photos', label: 'Upload Food Photos', type: 'edit' },
      { key: 'can_upload_lab_reports', label: 'Upload Lab Reports', type: 'edit' },
      { key: 'can_upload_documents', label: 'Upload Documents', type: 'edit' },
      { key: 'can_export_data', label: 'Export Data', type: 'edit' },
      { key: 'can_use_food_lookup_ai', label: 'Food Lookup AI', type: 'edit' },
      { key: 'can_use_wellness_insights', label: 'Wellness AI', type: 'edit' },
      { key: 'can_use_chat_assistant', label: 'Chat Assistant', type: 'edit' },
    ]
  };

  const getRoleIcon = (userType) => {
    switch(userType) {
      case 'super_admin': return Crown;
      case 'team_member': return UserCog;
      case 'student_coach': return GraduationCap;
      case 'client': return Users;
      default: return Shield;
    }
  };

  const getRoleColor = (userType) => {
    switch(userType) {
      case 'super_admin': return 'from-purple-500 to-indigo-600';
      case 'team_member': return 'from-blue-500 to-cyan-600';
      case 'student_coach': return 'from-orange-500 to-red-600';
      case 'client': return 'from-green-500 to-emerald-600';
      default: return 'from-gray-500 to-slate-600';
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'view': return Eye;
      case 'edit': return Edit;
      case 'delete': return Trash2;
      default: return Shield;
    }
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'view': return 'text-blue-600';
      case 'edit': return 'text-green-600';
      case 'delete': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTypeBg = (type, enabled) => {
    if (!enabled) return 'bg-gray-50 border-gray-200';
    switch(type) {
      case 'view': return 'bg-blue-50 border-blue-300';
      case 'edit': return 'bg-green-50 border-green-300';
      case 'delete': return 'bg-red-50 border-red-300';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">User Permission Management</h1>
            <p className="text-gray-600">Edit individual staff permissions and global client access</p>
          </div>
          <Shield className="w-10 h-10 text-purple-500" />
        </div>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeUserType} onValueChange={setActiveUserType} className="space-y-6">
          <TabsList className="grid grid-cols-4 bg-white/80 backdrop-blur shadow-lg">
            <TabsTrigger value="super_admin" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white">
              <Crown className="w-4 h-4 mr-2" />
              Super Admins
            </TabsTrigger>
            <TabsTrigger value="team_member" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white">
              <UserCog className="w-4 h-4 mr-2" />
              Team Members
            </TabsTrigger>
            <TabsTrigger value="student_coach" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
              <GraduationCap className="w-4 h-4 mr-2" />
              Health Coaches
            </TabsTrigger>
            <TabsTrigger value="client" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              All Clients
            </TabsTrigger>
          </TabsList>

          {['super_admin', 'team_member', 'student_coach'].map(userType => {
            const RoleIcon = getRoleIcon(userType);
            const isCoachTab = userType === 'student_coach';
            return (
              <TabsContent key={userType} value={userType}>
                {isCoachTab && (
                  <Card className="border-none shadow-lg bg-gradient-to-r from-orange-50 to-red-50 mb-6">
                    <CardContent className="p-6 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Create New Health Coach</h3>
                        <p className="text-sm text-gray-600">Manually add a new health coach to the platform</p>
                      </div>
                      <Button
                        onClick={() => setCreateCoachDialog(true)}
                        className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Create Health Coach
                      </Button>
                    </CardContent>
                  </Card>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredUsers.map(user => {
                    const hasCustomPerms = !!getUserCustomPermissions(user.email);
                    const coachSub = isCoachTab ? getCoachSubscription(user.email) : null;
                    const assignedPlan = coachSub ? coachPlans.find(p => p.id === coachSub.plan_id) : null;
                    return (
                      <Card key={user.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-bold text-lg text-gray-900">{user.full_name}</h3>
                              <p className="text-sm text-gray-600">{user.email}</p>
                            </div>
                            <RoleIcon className="w-5 h-5 text-gray-400" />
                          </div>
                          <div className="space-y-2 mb-3">
                            {hasCustomPerms && (
                              <Badge className="bg-orange-100 text-orange-700">Custom Permissions</Badge>
                            )}
                            {assignedPlan && (
                              <Badge className="bg-green-100 text-green-700">
                                {assignedPlan.plan_name}
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Button
                              onClick={() => handleEditUser(user)}
                              variant="outline"
                              className="w-full"
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit Permissions
                            </Button>
                            {userType === 'student_coach' && (
                              <>
                                <Button
                                  onClick={() => handleAssignPlan(user)}
                                  variant="outline"
                                  className="w-full border-green-500 text-green-700 hover:bg-green-50"
                                >
                                  <Award className="w-4 h-4 mr-2" />
                                  {assignedPlan ? 'Change Plan' : 'Assign Plan'}
                                </Button>
                                <Button
                                  onClick={() => handleOpenChangePassword(user)}
                                  variant="outline"
                                  className="w-full border-blue-500 text-blue-700 hover:bg-blue-50"
                                >
                                  <Key className="w-4 h-4 mr-2" />
                                  Change Password
                                </Button>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            );
          })}

          <TabsContent value="client">
            <div className="space-y-6">
              <Card className="border-none shadow-lg bg-gradient-to-r from-green-50 to-emerald-50">
                <CardContent className="p-8 text-center">
                  <Users className="w-16 h-16 mx-auto text-green-600 mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Global Client Permissions</h3>
                  <p className="text-gray-600 mb-6">
                    Configure default permissions that apply to ALL clients across the platform
                  </p>
                  <Button
                    onClick={handleEditGlobalClientPermissions}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Global Client Permissions
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Individual Client Permissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getUsersByType('client').filter(u =>
                      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
                    ).map(client => {
                      const hasCustomPerms = !!getUserCustomPermissions(client.email);
                      return (
                        <Card key={client.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h3 className="font-bold text-lg text-gray-900">{client.full_name}</h3>
                                <p className="text-sm text-gray-600">{client.email}</p>
                              </div>
                              <Users className="w-5 h-5 text-gray-400" />
                            </div>
                            {hasCustomPerms && (
                              <Badge className="bg-orange-100 text-orange-700 mb-3">Custom Permissions</Badge>
                            )}
                            <Button
                              onClick={() => handleEditUser(client)}
                              variant="outline"
                              className="w-full"
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit Permissions
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Individual User Permissions Dialog */}
        {selectedUser && (
          <Dialog open={editDialog} onOpenChange={setEditDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Edit Permissions: {selectedUser.full_name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Card className={`border-none shadow-lg bg-gradient-to-r ${getRoleColor(selectedUser.user_type)} text-white`}>
                  <CardContent className="p-4">
                    <p className="text-sm">User: <strong>{selectedUser.email}</strong></p>
                    <p className="text-sm">Role: <strong className="capitalize">{selectedUser.user_type.replace('_', ' ')}</strong></p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {permissionCategories[selectedUser.user_type]?.map(perm => {
                    const isEnabled = customPermissions[perm.key] ?? false;
                    const TypeIcon = getTypeIcon(perm.type);
                    
                    return (
                      <div
                        key={perm.key}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                          getTypeBg(perm.type, isEnabled)
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <TypeIcon className={`w-4 h-4 ${isEnabled ? getTypeColor(perm.type) : 'text-gray-400'}`} />
                          <Label className="text-sm font-medium text-gray-900 cursor-pointer">
                            {perm.label}
                          </Label>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) => updatePermission(perm.key, checked)}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setEditDialog(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSavePermissions}
                    disabled={savePermissionsMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {savePermissionsMutation.isPending ? 'Saving...' : 'Save Permissions'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Assign Plan Dialog */}
        {selectedCoachForPlan && (
          <Dialog open={assignPlanDialog} onOpenChange={setAssignPlanDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-green-600" />
                  Assign Health Coach Plan
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Card className="border-none shadow-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                  <CardContent className="p-4">
                    <p className="text-sm">
                      <strong>Coach:</strong> {selectedCoachForPlan.full_name}
                    </p>
                    <p className="text-xs opacity-90">{selectedCoachForPlan.email}</p>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <Label className="text-base font-semibold">Select Plan</Label>
                  <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Choose a Health Coach Plan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {coachPlans.filter(p => p.status === 'active').map(plan => (
                        <SelectItem key={plan.id} value={plan.id}>
                          <div className="flex items-center justify-between w-full">
                            <span className="font-semibold">{plan.plan_name}</span>
                            <span className="text-sm text-gray-600 ml-4">
                              ₹{plan.monthly_price}/mo
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold">Billing Cycle</Label>
                  <Select value={billingCycle} onValueChange={setBillingCycle}>
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">
                        Monthly - ₹{coachPlans.find(p => p.id === selectedPlanId)?.monthly_price || 0}/month
                      </SelectItem>
                      <SelectItem value="yearly">
                        Yearly - ₹{coachPlans.find(p => p.id === selectedPlanId)?.yearly_price || 0}/year
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedPlanId && (
                  <Card className="border-2 border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>{coachPlans.find(p => p.id === selectedPlanId)?.plan_name}</span>
                        <Badge className="bg-green-600">
                          ₹{billingCycle === 'yearly' 
                            ? coachPlans.find(p => p.id === selectedPlanId)?.yearly_price 
                            : coachPlans.find(p => p.id === selectedPlanId)?.monthly_price}
                          /{billingCycle === 'yearly' ? 'year' : 'month'}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {coachPlans.find(p => p.id === selectedPlanId)?.plan_description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>Max Clients: {coachPlans.find(p => p.id === selectedPlanId)?.max_clients === -1 ? 'Unlimited' : coachPlans.find(p => p.id === selectedPlanId)?.max_clients}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>AI Limit: {coachPlans.find(p => p.id === selectedPlanId)?.ai_generation_limit === -1 ? 'Unlimited' : coachPlans.find(p => p.id === selectedPlanId)?.ai_generation_limit}</span>
                        </div>
                        {coachPlans.find(p => p.id === selectedPlanId)?.can_access_pro_plans && (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>Pro Plans Access</span>
                          </div>
                        )}
                        {coachPlans.find(p => p.id === selectedPlanId)?.can_manage_team && (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>Team Management</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Alert className="bg-blue-50 border-blue-500">
                  <AlertDescription>
                    This will manually assign a plan to the coach without payment. The plan will be active immediately.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setAssignPlanDialog(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveAssignPlan}
                    disabled={assignPlanMutation.isPending || !selectedPlanId}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {assignPlanMutation.isPending ? 'Assigning...' : 'Assign Plan'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Create Health Coach Dialog */}
        <Dialog open={createCoachDialog} onOpenChange={setCreateCoachDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-orange-600" />
                Create New Health Coach
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-3">
                <Label className="text-base font-semibold">Creation Method</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setCreateMethod("invite")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      createMethod === "invite"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">📧</div>
                      <div className="font-semibold text-sm">Send Invitation</div>
                      <div className="text-xs text-gray-600 mt-1">They set password</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setCreateMethod("password")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      createMethod === "password"
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">🔑</div>
                      <div className="font-semibold text-sm">Set Password</div>
                      <div className="text-xs text-gray-600 mt-1">Create directly</div>
                    </div>
                  </button>
                </div>
              </div>

              {createMethod === "invite" ? (
                <Alert className="bg-blue-50 border-blue-500">
                  <AlertDescription className="text-sm">
                    The coach will receive an email invitation to create their account and set their own password.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-orange-50 border-orange-500">
                  <AlertDescription className="text-sm">
                    You'll set the password now. Share it securely with the health coach.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>Full Name {createMethod === "password" ? "*" : "(Optional)"}</Label>
                <Input
                  placeholder="Dr Dt Sheenu Sanjeev"
                  value={newCoachName}
                  onChange={(e) => setNewCoachName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Email Address *</Label>
                <Input
                  type="email"
                  placeholder="sheenumathur10@gmail.com"
                  value={newCoachEmail}
                  onChange={(e) => setNewCoachEmail(e.target.value)}
                />
              </div>

              {createMethod === "password" && (
                <div className="space-y-2">
                  <Label>Password *</Label>
                  <Input
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={newCoachPassword}
                    onChange={(e) => setNewCoachPassword(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">Minimum 6 characters required</p>
                </div>
              )}

              <Alert className="bg-green-50 border-green-300">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-sm text-green-900">
                  The health coach will be created with 'student_coach' role. You can assign a plan to them after creation.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setCreateCoachDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateCoach}
                  disabled={createCoachMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-500"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {createCoachMutation.isPending ? 'Creating...' : (createMethod === "invite" ? "Send Invitation" : "Create Coach")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Change Password Dialog */}
        {selectedCoachForPassword && (
          <Dialog open={changePasswordDialog} onOpenChange={setChangePasswordDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-blue-600" />
                  Change Password
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Card className="border-none shadow-lg bg-gradient-to-r from-blue-500 to-cyan-600 text-white">
                  <CardContent className="p-4">
                    <p className="text-sm">
                      <strong>Coach:</strong> {selectedCoachForPassword.full_name}
                    </p>
                    <p className="text-xs opacity-90">{selectedCoachForPassword.email}</p>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <Label>New Password *</Label>
                  <Input
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={newPasswordForCoach}
                    onChange={(e) => setNewPasswordForCoach(e.target.value)}
                  />
                </div>

                <Alert className="bg-yellow-50 border-yellow-500">
                  <AlertDescription className="text-sm text-yellow-900">
                    <strong>Warning:</strong> This will immediately change the coach's password. They will need to use the new password to login.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setChangePasswordDialog(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleChangePassword}
                    disabled={changePasswordMutation.isPending || newPasswordForCoach.length < 6}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Global Client Permissions Dialog */}
        <Dialog open={editGlobalClientDialog} onOpenChange={setEditGlobalClientDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Edit Global Client Permissions
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Card className="border-none shadow-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                <CardContent className="p-4">
                  <p className="text-sm">
                    <strong>These permissions apply to ALL clients by default</strong>
                  </p>
                  <p className="text-xs opacity-90">Changes here will affect every client's access across the platform</p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {permissionCategories.client?.map(perm => {
                  const isEnabled = globalClientPermissions[perm.key] ?? false;
                  const TypeIcon = getTypeIcon(perm.type);
                  
                  return (
                    <div
                      key={perm.key}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                        getTypeBg(perm.type, isEnabled)
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <TypeIcon className={`w-4 h-4 ${isEnabled ? getTypeColor(perm.type) : 'text-gray-400'}`} />
                        <Label className="text-sm font-medium text-gray-900 cursor-pointer">
                          {perm.label}
                        </Label>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => updateGlobalClientPermission(perm.key, checked)}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setEditGlobalClientDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveGlobalClientPermissions}
                  disabled={saveGlobalClientPermissionsMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveGlobalClientPermissionsMutation.isPending ? 'Saving...' : 'Save Global Permissions'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}