import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Shield,
  Eye,
  Edit,
  Trash2,
  Plus,
  Save,
  RefreshCw,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  Users,
  Settings,
  Upload
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function PermissionManager() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState("team_member");
  const [hasChanges, setHasChanges] = useState(false);
  const [localPermissions, setLocalPermissions] = useState({});
  const [showResetDialog, setShowResetDialog] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['rolePermissions'],
    queryFn: () => base44.entities.RolePermission.list(),
    initialData: [],
  });

  const savePermissionMutation = useMutation({
    mutationFn: async ({ role, section, permissionData }) => {
      const existing = permissions.find(p => p.role === role && p.section === section);
      if (existing) {
        return await base44.entities.RolePermission.update(existing.id, permissionData);
      } else {
        return await base44.entities.RolePermission.create(permissionData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['rolePermissions']);
      setHasChanges(false);
      alert("✅ Permissions saved successfully!");
    },
  });

  const resetPermissionsMutation = useMutation({
    mutationFn: async (role) => {
      const rolePerms = permissions.filter(p => p.role === role);
      for (const perm of rolePerms) {
        await base44.entities.RolePermission.delete(perm.id);
      }
      
      // Create default permissions
      const defaultPerms = getDefaultPermissions(role);
      for (const section in defaultPerms) {
        await base44.entities.RolePermission.create({
          role,
          section,
          permissions: defaultPerms[section],
          is_active: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['rolePermissions']);
      setLocalPermissions({});
      setHasChanges(false);
      setShowResetDialog(false);
      alert("✅ Permissions reset to defaults!");
    },
  });

  // All available sections/pages
  const sections = {
    "Client Management": {
      key: "ClientManagement",
      description: "Manage client profiles and information",
      features: ["view", "create", "edit", "delete"]
    },
    "Meal Planner": {
      key: "MealPlanner",
      description: "Create and manage meal plans",
      features: ["view", "create", "edit", "delete"]
    },
    "Pro Meal Plans": {
      key: "MealPlansPro",
      description: "Advanced disease-focused meal plans",
      features: ["view", "create", "edit", "delete"]
    },
    "Recipes": {
      key: "Recipes",
      description: "Recipe library and management",
      features: ["view", "create", "edit", "delete", "upload"]
    },
    "Communication": {
      key: "Communication",
      description: "Client messaging system",
      features: ["view", "create", "edit", "delete"]
    },
    "Appointments": {
      key: "Appointments",
      description: "Schedule and manage appointments",
      features: ["view", "create", "edit", "delete"]
    },
    "Template Library": {
      key: "TemplateLibrary",
      description: "Download ready-made templates",
      features: ["view", "create", "edit", "delete"]
    },
    "Template Manager": {
      key: "TemplateLibraryManager",
      description: "Upload and manage templates",
      features: ["view", "create", "edit", "delete", "upload"]
    },
    "Food Lookup": {
      key: "FoodLookup",
      description: "Search food nutritional data",
      features: ["view"]
    },
    "Business GPTs": {
      key: "BusinessGPTs",
      description: "AI business tools",
      features: ["view", "create"]
    },
    "Marketing Hub": {
      key: "MarketingHub",
      description: "Marketing content generator",
      features: ["view", "create"]
    },
    "Finance Manager": {
      key: "ClientFinanceManager",
      description: "Client transactions and payments",
      features: ["view", "create", "edit", "delete"]
    },
    "Webinar Tracker": {
      key: "WebinarPerformanceTracker",
      description: "Track webinar performance",
      features: ["view", "create", "edit", "delete"]
    },
    "Vertical Management": {
      key: "VerticalManagement",
      description: "Business verticals dashboard",
      features: ["view", "create", "edit", "delete"]
    },
    "Team Management": {
      key: "TeamManagement",
      description: "Manage team members",
      features: ["view", "create", "edit", "delete"]
    },
    "Team Attendance": {
      key: "TeamAttendance",
      description: "Track team attendance",
      features: ["view", "create", "edit", "delete"]
    },
    "Bulk Import": {
      key: "BulkImport",
      description: "Import data in bulk",
      features: ["view", "create", "upload"]
    },
    "Usage Dashboard": {
      key: "UsageDashboard",
      description: "Track AI usage and billing",
      features: ["view"]
    }
  };

  const roles = [
    { value: "team_member", label: "Team Member", color: "blue", icon: Users },
    { value: "student_coach", label: "Health Coach", color: "green", icon: Users },
    { value: "student_team_member", label: "Coach Team", color: "cyan", icon: Users },
    { value: "client", label: "Client", color: "purple", icon: Users }
  ];

  const getDefaultPermissions = (role) => {
    const defaults = {
      team_member: {
        ClientManagement: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_edit_own_only: true, can_delete_own_only: true, can_upload: false },
        MealPlanner: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_edit_own_only: true, can_delete_own_only: true, can_upload: false },
        Recipes: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_edit_own_only: true, can_delete_own_only: true, can_upload: true },
        Communication: { can_view: true, can_create: true, can_edit: false, can_delete: false, can_edit_own_only: true, can_delete_own_only: false, can_upload: false },
        Appointments: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_edit_own_only: true, can_delete_own_only: true, can_upload: false },
        TemplateLibrary: { can_view: true, can_create: false, can_edit: false, can_delete: false, can_edit_own_only: false, can_delete_own_only: false, can_upload: false },
        TemplateLibraryManager: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_edit_own_only: true, can_delete_own_only: true, can_upload: true },
        FoodLookup: { can_view: true, can_create: false, can_edit: false, can_delete: false, can_edit_own_only: false, can_delete_own_only: false, can_upload: false },
        BusinessGPTs: { can_view: true, can_create: true, can_edit: false, can_delete: false, can_edit_own_only: false, can_delete_own_only: false, can_upload: false },
        MarketingHub: { can_view: true, can_create: true, can_edit: false, can_delete: false, can_edit_own_only: false, can_delete_own_only: false, can_upload: false },
        BulkImport: { can_view: true, can_create: true, can_edit: false, can_delete: false, can_edit_own_only: false, can_delete_own_only: false, can_upload: true }
      },
      student_coach: {
        ClientManagement: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_edit_own_only: true, can_delete_own_only: true, can_upload: false },
        MealPlanner: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_edit_own_only: true, can_delete_own_only: true, can_upload: false },
        MealPlansPro: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_edit_own_only: true, can_delete_own_only: true, can_upload: false },
        Recipes: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_edit_own_only: true, can_delete_own_only: true, can_upload: true },
        Communication: { can_view: true, can_create: true, can_edit: false, can_delete: false, can_edit_own_only: true, can_delete_own_only: false, can_upload: false },
        Appointments: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_edit_own_only: true, can_delete_own_only: true, can_upload: false },
        TemplateLibrary: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_edit_own_only: true, can_delete_own_only: true, can_upload: false },
        TemplateLibraryManager: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_edit_own_only: true, can_delete_own_only: true, can_upload: true },
        FoodLookup: { can_view: true, can_create: false, can_edit: false, can_delete: false, can_edit_own_only: false, can_delete_own_only: false, can_upload: false },
        BusinessGPTs: { can_view: true, can_create: true, can_edit: false, can_delete: false, can_edit_own_only: false, can_delete_own_only: false, can_upload: false },
        MarketingHub: { can_view: true, can_create: true, can_edit: false, can_delete: false, can_edit_own_only: false, can_delete_own_only: false, can_upload: false },
        ClientFinanceManager: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_edit_own_only: true, can_delete_own_only: true, can_upload: false },
        TeamManagement: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_edit_own_only: false, can_delete_own_only: false, can_upload: false },
        TeamAttendance: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_edit_own_only: false, can_delete_own_only: false, can_upload: false },
        BulkImport: { can_view: true, can_create: true, can_edit: false, can_delete: false, can_edit_own_only: false, can_delete_own_only: false, can_upload: true }
      },
      student_team_member: {
        ClientManagement: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_edit_own_only: true, can_delete_own_only: true, can_upload: false },
        MealPlanner: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_edit_own_only: true, can_delete_own_only: true, can_upload: false },
        Recipes: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_edit_own_only: true, can_delete_own_only: true, can_upload: true },
        Communication: { can_view: true, can_create: true, can_edit: false, can_delete: false, can_edit_own_only: true, can_delete_own_only: false, can_upload: false },
        Appointments: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_edit_own_only: true, can_delete_own_only: true, can_upload: false },
        TemplateLibrary: { can_view: true, can_create: false, can_edit: false, can_delete: false, can_edit_own_only: false, can_delete_own_only: false, can_upload: false },
        FoodLookup: { can_view: true, can_create: false, can_edit: false, can_delete: false, can_edit_own_only: false, can_delete_own_only: false, can_upload: false },
        BusinessGPTs: { can_view: true, can_create: true, can_edit: false, can_delete: false, can_edit_own_only: false, can_delete_own_only: false, can_upload: false },
        MarketingHub: { can_view: true, can_create: true, can_edit: false, can_delete: false, can_edit_own_only: false, can_delete_own_only: false, can_upload: false }
      },
      client: {
        MyAssignedMealPlan: { can_view: true, can_create: false, can_edit: false, can_delete: false, can_edit_own_only: false, can_delete_own_only: false, can_upload: false },
        FoodLog: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_edit_own_only: true, can_delete_own_only: true, can_upload: false },
        ProgressTracking: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_edit_own_only: true, can_delete_own_only: true, can_upload: false },
        MPESSTracker: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_edit_own_only: true, can_delete_own_only: true, can_upload: false },
        ClientCommunication: { can_view: true, can_create: true, can_edit: false, can_delete: false, can_edit_own_only: false, can_delete_own_only: false, can_upload: false },
        Recipes: { can_view: true, can_create: false, can_edit: false, can_delete: false, can_edit_own_only: false, can_delete_own_only: false, can_upload: false }
      }
    };

    return defaults[role] || {};
  };

  const getCurrentPermission = (section) => {
    const key = `${selectedRole}_${section}`;
    if (localPermissions[key]) {
      return localPermissions[key];
    }

    const existing = permissions.find(p => p.role === selectedRole && p.section === section);
    if (existing) {
      return existing.permissions;
    }

    const defaults = getDefaultPermissions(selectedRole);
    return defaults[section] || {
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
      can_upload: false,
      can_edit_own_only: true,
      can_delete_own_only: true
    };
  };

  const updatePermission = (section, field, value) => {
    const key = `${selectedRole}_${section}`;
    const current = getCurrentPermission(section);
    setLocalPermissions({
      ...localPermissions,
      [key]: { ...current, [field]: value }
    });
    setHasChanges(true);
  };

  const saveAllChanges = async () => {
    for (const key in localPermissions) {
      const [role, section] = key.split('_');
      const permissionData = {
        role,
        section,
        permissions: localPermissions[key],
        is_active: true
      };
      await savePermissionMutation.mutateAsync({ role, section, permissionData });
    }
  };

  const handleResetToDefaults = () => {
    setShowResetDialog(true);
  };

  const confirmReset = () => {
    resetPermissionsMutation.mutate(selectedRole);
  };

  if (user?.user_type !== 'super_admin') {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Lock className="w-6 h-6" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Only super administrators can manage permissions.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Shield className="w-10 h-10 text-orange-500" />
              Permission Manager
            </h1>
            <p className="text-gray-600">Control who can access, edit, delete, and upload in each section</p>
          </div>
          {hasChanges && (
            <Button
              onClick={saveAllChanges}
              disabled={savePermissionMutation.isPending}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 h-12 px-6 shadow-xl"
            >
              <Save className="w-5 h-5 mr-2" />
              {savePermissionMutation.isPending ? 'Saving...' : 'Save All Changes'}
            </Button>
          )}
        </div>

        {/* Important Alert */}
        <Alert className="bg-orange-50 border-orange-500 border-2">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <AlertTitle className="text-orange-900 font-bold">⚠️ Important - Super Admin Powers</AlertTitle>
          <AlertDescription className="text-orange-800">
            <strong>You have FULL CONTROL over all permissions.</strong> Changes here affect what team members and coaches can see and do in the platform.
            Be careful when restricting access. Super Admins always have full access regardless of these settings.
          </AlertDescription>
        </Alert>

        {/* Role Selection Tabs */}
        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              Select Role to Manage
            </CardTitle>
            <CardDescription>Choose which role's permissions you want to configure</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedRole} onValueChange={(value) => {
              setSelectedRole(value);
              setLocalPermissions({});
              setHasChanges(false);
            }}>
              <TabsList className="grid grid-cols-4 w-full">
                {roles.map((role) => (
                  <TabsTrigger key={role.value} value={role.value} className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
                    <role.icon className="w-4 h-4 mr-2" />
                    {role.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex justify-end mt-4">
              <Button
                variant="outline"
                onClick={handleResetToDefaults}
                disabled={resetPermissionsMutation.isPending}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset to Defaults
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Permissions Grid */}
        <div className="grid grid-cols-1 gap-4">
          {Object.entries(sections).map(([sectionName, sectionData]) => {
            const perm = getCurrentPermission(sectionData.key);
            const hasAnyPermission = perm.can_view || perm.can_create || perm.can_edit || perm.can_delete || perm.can_upload;

            return (
              <Card key={sectionData.key} className={`border-2 transition-all ${hasAnyPermission ? 'border-green-300 bg-green-50/30' : 'border-gray-200'}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        {hasAnyPermission ? (
                          <Unlock className="w-5 h-5 text-green-600" />
                        ) : (
                          <Lock className="w-5 h-5 text-gray-400" />
                        )}
                        {sectionName}
                      </CardTitle>
                      <CardDescription className="mt-1">{sectionData.description}</CardDescription>
                    </div>
                    <Badge className={hasAnyPermission ? "bg-green-500" : "bg-gray-400"}>
                      {hasAnyPermission ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {/* View Permission */}
                    {sectionData.features.includes("view") && (
                      <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2">
                        <div className="flex items-center gap-2">
                          <Eye className="w-5 h-5 text-blue-600" />
                          <Label className="font-semibold">View</Label>
                        </div>
                        <Switch
                          checked={perm.can_view}
                          onCheckedChange={(checked) => updatePermission(sectionData.key, 'can_view', checked)}
                        />
                      </div>
                    )}

                    {/* Create Permission */}
                    {sectionData.features.includes("create") && (
                      <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2">
                        <div className="flex items-center gap-2">
                          <Plus className="w-5 h-5 text-green-600" />
                          <Label className="font-semibold">Create</Label>
                        </div>
                        <Switch
                          checked={perm.can_create}
                          onCheckedChange={(checked) => updatePermission(sectionData.key, 'can_create', checked)}
                          disabled={!perm.can_view}
                        />
                      </div>
                    )}

                    {/* Edit Permission */}
                    {sectionData.features.includes("edit") && (
                      <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2">
                        <div className="flex items-center gap-2">
                          <Edit className="w-5 h-5 text-orange-600" />
                          <Label className="font-semibold">Edit</Label>
                        </div>
                        <Switch
                          checked={perm.can_edit}
                          onCheckedChange={(checked) => updatePermission(sectionData.key, 'can_edit', checked)}
                          disabled={!perm.can_view}
                        />
                      </div>
                    )}

                    {/* Delete Permission */}
                    {sectionData.features.includes("delete") && (
                      <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2">
                        <div className="flex items-center gap-2">
                          <Trash2 className="w-5 h-5 text-red-600" />
                          <Label className="font-semibold">Delete</Label>
                        </div>
                        <Switch
                          checked={perm.can_delete}
                          onCheckedChange={(checked) => updatePermission(sectionData.key, 'can_delete', checked)}
                          disabled={!perm.can_view}
                        />
                      </div>
                    )}

                    {/* Upload Permission */}
                    {sectionData.features.includes("upload") && (
                      <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2">
                        <div className="flex items-center gap-2">
                          <Upload className="w-5 h-5 text-purple-600" />
                          <Label className="font-semibold">Upload</Label>
                        </div>
                        <Switch
                          checked={perm.can_upload}
                          onCheckedChange={(checked) => updatePermission(sectionData.key, 'can_upload', checked)}
                          disabled={!perm.can_view}
                        />
                      </div>
                    )}

                    {/* Edit Own Only */}
                    {sectionData.features.includes("edit") && (
                      <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2">
                        <Label className="font-semibold text-sm">Edit Own Only</Label>
                        <Switch
                          checked={perm.can_edit_own_only}
                          onCheckedChange={(checked) => updatePermission(sectionData.key, 'can_edit_own_only', checked)}
                          disabled={!perm.can_edit}
                        />
                      </div>
                    )}

                    {/* Delete Own Only */}
                    {sectionData.features.includes("delete") && (
                      <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2">
                        <Label className="font-semibold text-sm">Delete Own Only</Label>
                        <Switch
                          checked={perm.can_delete_own_only}
                          onCheckedChange={(checked) => updatePermission(sectionData.key, 'can_delete_own_only', checked)}
                          disabled={!perm.can_delete}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Save Changes Banner */}
        {hasChanges && (
          <Card className="border-2 border-orange-500 bg-gradient-to-r from-orange-50 to-red-50 sticky bottom-4">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                  <div>
                    <p className="font-bold text-orange-900">You have unsaved changes!</p>
                    <p className="text-sm text-orange-700">Click "Save All Changes" to apply your permission settings</p>
                  </div>
                </div>
                <Button
                  onClick={saveAllChanges}
                  disabled={savePermissionMutation.isPending}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 h-12 px-8"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {savePermissionMutation.isPending ? 'Saving...' : 'Save All Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reset Confirmation Dialog */}
        <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
                Reset to Default Permissions?
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Alert className="bg-yellow-50 border-yellow-500">
                <AlertDescription>
                  This will reset all permissions for <strong>{roles.find(r => r.value === selectedRole)?.label}</strong> to the default settings.
                  Any custom configurations will be lost.
                </AlertDescription>
              </Alert>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowResetDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmReset}
                  disabled={resetPermissionsMutation.isPending}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  {resetPermissionsMutation.isPending ? 'Resetting...' : 'Reset to Defaults'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Info Card */}
        <Alert className="bg-blue-50 border-blue-500">
          <CheckCircle className="w-5 h-5 text-blue-600" />
          <AlertDescription>
            <strong>💡 How it works:</strong> Toggle permissions on/off for each role. "Upload" controls file upload capabilities. "Edit Own Only" and "Delete Own Only" restrict users to only their own content.
            Super Admins always have full access regardless of these settings.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}