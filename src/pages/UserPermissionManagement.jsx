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
import { Users, Search, Shield, Save, Edit2, Crown, UserCog, GraduationCap } from "lucide-react";

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
    onSuccess: () => {
      queryClient.invalidateQueries(['userPermissions']);
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
    const defaults = getDefaultPermissions(user.user_type);
    setCustomPermissions(existing?.custom_permissions || defaults);
    setEditDialog(true);
  };

  const handleSavePermissions = () => {
    savePermissionsMutation.mutate({
      user_email: selectedUser.email,
      user_type: selectedUser.user_type,
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
      { key: 'can_view_dashboard', label: 'View Dashboard' },
      { key: 'can_manage_users', label: 'Manage Users' },
      { key: 'can_view_all_clients', label: 'View All Clients' },
      { key: 'can_create_clients', label: 'Create Clients' },
      { key: 'can_edit_all_clients', label: 'Edit All Clients' },
      { key: 'can_delete_clients', label: 'Delete Clients' },
      { key: 'can_view_all_meal_plans', label: 'View All Meal Plans' },
      { key: 'can_create_meal_plans', label: 'Create Meal Plans' },
      { key: 'can_edit_all_meal_plans', label: 'Edit All Meal Plans' },
      { key: 'can_delete_meal_plans', label: 'Delete Meal Plans' },
      { key: 'can_view_financial_data', label: 'View Financial Data' },
      { key: 'can_manage_permissions', label: 'Manage Permissions' },
    ],
    team_member: [
      { key: 'can_view_dashboard', label: 'View Dashboard' },
      { key: 'can_view_only_own_clients', label: 'View Only Own Clients' },
      { key: 'can_view_all_clients', label: 'View All Clients' },
      { key: 'can_create_clients', label: 'Create Clients' },
      { key: 'can_edit_own_clients', label: 'Edit Own Clients' },
      { key: 'can_edit_all_clients', label: 'Edit All Clients' },
      { key: 'can_create_meal_plans', label: 'Create Meal Plans' },
      { key: 'can_send_messages', label: 'Send Messages' },
      { key: 'can_view_financial_data', label: 'View Financial Data' },
    ],
    student_coach: [
      { key: 'can_view_dashboard', label: 'View Dashboard' },
      { key: 'can_create_clients', label: 'Create Clients' },
      { key: 'can_edit_own_clients', label: 'Edit Own Clients' },
      { key: 'can_create_meal_plans', label: 'Create Meal Plans' },
      { key: 'can_send_messages', label: 'Send Messages' },
      { key: 'can_access_business_tools', label: 'Access Business Tools' },
      { key: 'can_manage_team', label: 'Manage Team' },
      { key: 'can_view_financial_data', label: 'View Financial Data' },
      { key: 'can_edit_financial_data', label: 'Edit Financial Data' },
    ],
    client: [
      { key: 'can_view_meal_plan', label: 'View Meal Plan' },
      { key: 'can_view_food_log', label: 'View Food Log' },
      { key: 'can_edit_food_log', label: 'Edit Food Log' },
      { key: 'can_view_progress', label: 'View Progress' },
      { key: 'can_edit_progress', label: 'Edit Progress' },
      { key: 'can_view_messages', label: 'View Messages' },
      { key: 'can_send_messages', label: 'Send Messages' },
      { key: 'show_my_plans', label: 'Show My Plans' },
      { key: 'can_view_recipes', label: 'View Recipes' },
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

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">User Permission Management</h1>
            <p className="text-gray-600">Edit individual user permissions and access controls</p>
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
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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

                <div className="grid grid-cols-2 gap-3">
                  {permissionCategories[selectedUser.user_type]?.map(perm => {
                    const isEnabled = customPermissions[perm.key] ?? false;
                    return (
                      <div
                        key={perm.key}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                          isEnabled ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <Label className="text-sm font-medium text-gray-900 cursor-pointer flex-1">
                          {perm.label}
                        </Label>
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