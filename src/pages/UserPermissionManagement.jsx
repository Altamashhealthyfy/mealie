import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Search, Shield, Save, Edit2, Crown, UserCog, GraduationCap, Eye, Edit, Trash2 } from "lucide-react";

export default function UserPermissionManagement() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [customPermissions, setCustomPermissions] = useState({});
  const [activeUserType, setActiveUserType] = useState("super_admin");

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

  const { data: allClients } = useQuery({
    queryKey: ['allClients'],
    queryFn: () => base44.entities.Client.list(),
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
      // Invalidate all relevant queries to ensure permissions are refreshed everywhere
      queryClient.invalidateQueries(['userPermissions']);
      queryClient.invalidateQueries(['userCustomPermissions']);
      queryClient.invalidateQueries(['securitySettings']);
      queryClient.invalidateQueries(['allClients']);
      queryClient.invalidateQueries(['allUsers']);
      
      // Force refetch for the specific user
      queryClient.invalidateQueries(['userCustomPermissions', data.user_email]);
      
      setEditDialog(false);
      alert('✅ User permissions saved successfully!');
    },
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
    if (userType === 'client') {
      return allClients;
    }
    return allUsers.filter(u => u.user_type === userType);
  };

  const getUserCustomPermissions = (userEmail) => {
    return userPermissions.find(p => p.user_email === userEmail);
  };

  const getDefaultPermissions = (userType) => {
    const permissionMap = {
      'super_admin': securitySettings?.super_admin_permissions || {},
      'team_member': securitySettings?.team_member_permissions || {},
      'student_coach': securitySettings?.student_coach_permissions || {},
      'client': securitySettings?.client_restrictions || {}
    };
    return permissionMap[userType] || {};
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    const existing = getUserCustomPermissions(user.email);
    const defaults = getDefaultPermissions(activeUserType === 'client' ? 'client' : user.user_type);
    setCustomPermissions(existing?.custom_permissions || defaults);
    setEditDialog(true);
  };

  const handleSavePermissions = () => {
    savePermissionsMutation.mutate({
      user_email: selectedUser.email,
      user_type: activeUserType === 'client' ? 'client' : selectedUser.user_type,
      custom_permissions: customPermissions
    });
  };

  const updatePermission = (key, value) => {
    setCustomPermissions(prev => ({
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
      default: return Users;
    }
  };

  const getRoleColor = (userType) => {
    switch(userType) {
      case 'super_admin': return 'from-purple-500 to-indigo-600';
      case 'team_member': return 'from-blue-500 to-cyan-600';
      case 'student_coach': return 'from-orange-500 to-red-600';
      default: return 'from-green-500 to-emerald-600';
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
            <p className="text-gray-600">Edit individual user permissions with granular access control</p>
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
              Student Coaches
            </TabsTrigger>
            <TabsTrigger value="client" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              Clients
            </TabsTrigger>
          </TabsList>

          {['super_admin', 'team_member', 'student_coach', 'client'].map(userType => {
            const RoleIcon = getRoleIcon(userType);
            return (
              <TabsContent key={userType} value={userType}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredUsers.map(user => {
                    const hasCustomPerms = !!getUserCustomPermissions(user.email);
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
                          {hasCustomPerms && (
                            <Badge className="bg-orange-100 text-orange-700 mb-3">Custom Permissions</Badge>
                          )}
                          <Button
                            onClick={() => handleEditUser(user)}
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
              </TabsContent>
            );
          })}
        </Tabs>

        {/* Edit Permissions Dialog */}
        {selectedUser && (
          <Dialog open={editDialog} onOpenChange={setEditDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Edit Permissions: {selectedUser.full_name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Card className={`border-none shadow-lg bg-gradient-to-r ${getRoleColor(activeUserType)} text-white`}>
                  <CardContent className="p-4">
                    <p className="text-sm">User: <strong>{selectedUser.email}</strong></p>
                    <p className="text-sm">Role: <strong className="capitalize">{activeUserType.replace('_', ' ')}</strong></p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {permissionCategories[activeUserType]?.map(perm => {
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
      </div>
    </div>
  );
}