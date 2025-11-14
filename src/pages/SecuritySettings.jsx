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
import { Input } from "@/components/ui/input";
import {
  Shield,
  Lock,
  Users,
  Eye,
  EyeOff,
  Save,
  AlertTriangle,
  CheckCircle2,
  UserCog,
  Settings,
  Crown,
  GraduationCap,
  UserCheck,
  Sparkles,
  Upload,
  Zap,
  TrendingUp,
  Award,
  Rocket,
  FileImage,
  FileText,
  Stethoscope
} from "lucide-react";
import { format } from "date-fns";

export default function SecuritySettings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("client_features");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['securitySettings'],
    queryFn: async () => {
      const allSettings = await base44.entities.AppSecuritySettings.list();
      if (allSettings.length > 0) {
        return allSettings[0];
      }
      // Return default settings if none exist
      return {
        super_admin_permissions: {
          can_manage_users: true,
          can_invite_users: true,
          can_delete_users: true,
          can_modify_user_roles: true,
          can_manage_clients: true,
          can_delete_clients: true,
          can_view_all_clients: true,
          can_edit_all_meal_plans: true,
          can_delete_meal_plans: true,
          can_view_financial_data: true,
          can_modify_financial_data: true,
          can_manage_team_members: true,
          can_view_all_messages: true,
          can_manage_templates: true,
          can_manage_recipes: true,
          can_access_business_analytics: true,
          can_modify_app_settings: true,
          can_manage_permissions: true
        },
        client_panel_settings: {
          show_meal_plan: true,
          allow_meal_plan_comments: false,
          show_food_log: true,
          allow_food_log_edit: true,
          allow_food_log_delete: false,
          show_progress_tracking: true,
          allow_progress_edit: true,
          show_mpess_tracker: true,
          allow_mpess_edit: true,
          show_messages: true,
          allow_message_sending: true,
          show_appointments: true,
          allow_appointment_booking: false,
          show_profile: true,
          allow_profile_edit: true,
          show_nutritional_info: true,
          show_recipes: true,
          allow_recipe_download: true,
          allow_recipe_upload: false,
          allow_ai_recipe_generation: false,
          show_dashboard_stats: true,
          allow_export_data: false
        },
        client_ai_tools_access: {
          basic_membership: {
            can_use_food_lookup_ai: true,
            can_generate_meal_plans: false,
            can_generate_recipes: false,
            can_use_wellness_insights: false,
            can_use_chat_assistant: false,
            monthly_ai_requests_limit: 50
          },
          premium_membership: {
            can_use_food_lookup_ai: true,
            can_generate_meal_plans: false,
            can_generate_recipes: false,
            can_use_wellness_insights: true,
            can_use_chat_assistant: true,
            monthly_ai_requests_limit: 200
          },
          vip_membership: {
            can_use_food_lookup_ai: true,
            can_generate_meal_plans: false,
            can_generate_recipes: true,
            can_use_wellness_insights: true,
            can_use_chat_assistant: true,
            can_use_advanced_analytics: true,
            monthly_ai_requests_limit: -1
          }
        },
        client_upload_permissions: {
          can_upload_progress_photos: true,
          can_upload_food_photos: true,
          can_upload_lab_reports: true,
          can_upload_recipes: false,
          can_upload_documents: false,
          max_file_size_mb: 10,
          allowed_file_types: ["jpg", "jpeg", "png", "pdf"]
        },
        team_member_restrictions: {
          can_view_only_own_clients: true,
          can_create_clients: true,
          can_delete_clients: false,
          can_view_financial_data: false,
          can_manage_templates: false,
          max_clients_allowed: -1
        },
        student_coach_restrictions: {
          can_view_only_own_clients: true,
          can_create_clients: true,
          can_delete_clients: false,
          can_access_business_tools: true,
          can_manage_team: true,
          max_clients_allowed: 50
        }
      };
    },
    enabled: !!user && user.user_type === 'super_admin',
  });

  const [formData, setFormData] = useState(settings || {});

  React.useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (data) => {
      const saveData = {
        ...data,
        settings_metadata: {
          last_modified_by: user?.email,
          last_modified_date: new Date().toISOString(),
          version: (data.settings_metadata?.version || 0) + 1
        }
      };

      if (settings?.id) {
        return await base44.entities.AppSecuritySettings.update(settings.id, saveData);
      } else {
        return await base44.entities.AppSecuritySettings.create(saveData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['securitySettings']);
      alert('✅ Security settings saved successfully!');
    },
    onError: (error) => {
      console.error('Error saving settings:', error);
      alert('❌ Failed to save settings. Please try again.');
    }
  });

  const handleSave = () => {
    saveSettingsMutation.mutate(formData);
  };

  const updatePermission = (category, key, value) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const updateNestedPermission = (category, subcategory, key, value) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [subcategory]: {
          ...prev[category]?.[subcategory],
          [key]: value
        }
      }
    }));
  };

  if (user?.user_type !== 'super_admin') {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <Lock className="w-6 h-6" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-800">
              Only Super Admins can access security settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <Settings className="w-12 h-12 animate-spin mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Loading security settings...</p>
        </div>
      </div>
    );
  }

  const clientFeatureSettings = [
    { 
      category: 'Visibility',
      items: [
        { key: 'show_meal_plan', label: 'Show Meal Plan', description: 'Display assigned meal plans', icon: Eye },
        { key: 'show_food_log', label: 'Show Food Log', description: 'Display food logging feature', icon: Eye },
        { key: 'show_progress_tracking', label: 'Show Progress Tracking', description: 'Display progress tracking', icon: Eye },
        { key: 'show_mpess_tracker', label: 'Show MPESS Tracker', description: 'Display wellness tracker', icon: Eye },
        { key: 'show_messages', label: 'Show Messages', description: 'Display messaging feature', icon: Eye },
        { key: 'show_appointments', label: 'Show Appointments', description: 'Display appointments', icon: Eye },
        { key: 'show_profile', label: 'Show Profile', description: 'Display profile page', icon: Eye },
        { key: 'show_nutritional_info', label: 'Show Nutritional Info', description: 'Display food lookup', icon: Eye },
        { key: 'show_recipes', label: 'Show Recipes', description: 'Display recipe library', icon: Eye },
        { key: 'show_dashboard_stats', label: 'Show Dashboard Stats', description: 'Display statistics', icon: Eye },
      ]
    },
    {
      category: 'Edit Permissions',
      items: [
        { key: 'allow_meal_plan_comments', label: 'Allow Meal Plan Comments', description: 'Let clients comment on meals', icon: Settings },
        { key: 'allow_food_log_edit', label: 'Allow Food Log Edit', description: 'Let clients edit food logs', icon: Settings },
        { key: 'allow_food_log_delete', label: 'Allow Food Log Delete', description: 'Let clients delete entries', icon: AlertTriangle },
        { key: 'allow_progress_edit', label: 'Allow Progress Edit', description: 'Let clients log progress', icon: Settings },
        { key: 'allow_mpess_edit', label: 'Allow MPESS Edit', description: 'Let clients track wellness', icon: Settings },
        { key: 'allow_message_sending', label: 'Allow Message Sending', description: 'Let clients send messages', icon: Settings },
        { key: 'allow_appointment_booking', label: 'Allow Appointment Booking', description: 'Let clients book appointments', icon: Settings },
        { key: 'allow_profile_edit', label: 'Allow Profile Edit', description: 'Let clients edit profile', icon: Settings },
      ]
    },
    {
      category: 'Advanced Actions',
      items: [
        { key: 'allow_recipe_download', label: 'Allow Recipe Download', description: 'Let clients download recipes', icon: Settings },
        { key: 'allow_recipe_upload', label: 'Allow Recipe Upload', description: 'Let clients upload recipes', icon: Upload },
        { key: 'allow_ai_recipe_generation', label: 'Allow AI Recipe Generation', description: 'Let clients generate AI recipes', icon: Sparkles },
        { key: 'allow_export_data', label: 'Allow Data Export', description: 'Let clients export their data', icon: Settings },
      ]
    }
  ];

  const uploadPermissions = [
    { key: 'can_upload_progress_photos', label: 'Progress Photos', description: 'Transformation photos', icon: FileImage },
    { key: 'can_upload_food_photos', label: 'Food Photos', description: 'Food log images', icon: FileImage },
    { key: 'can_upload_lab_reports', label: 'Lab Reports', description: 'Medical reports/PDFs', icon: Stethoscope },
    { key: 'can_upload_recipes', label: 'Recipe Uploads', description: 'Custom recipes to library', icon: Upload },
    { key: 'can_upload_documents', label: 'General Documents', description: 'Any documents', icon: FileText },
  ];

  const aiToolsByMembership = [
    {
      tier: 'basic_membership',
      label: 'Basic Membership',
      icon: Users,
      color: 'from-gray-500 to-slate-500',
      badgeColor: 'bg-gray-600',
      tools: [
        { key: 'can_use_food_lookup_ai', label: 'Food Lookup AI', description: 'AI nutritional information', icon: Sparkles },
        { key: 'can_generate_meal_plans', label: 'Generate Meal Plans', description: 'AI meal plan creation', icon: Zap },
        { key: 'can_generate_recipes', label: 'Generate Recipes', description: 'AI recipe generation', icon: Sparkles },
        { key: 'can_use_wellness_insights', label: 'Wellness Insights', description: 'AI MPESS analysis', icon: TrendingUp },
        { key: 'can_use_chat_assistant', label: 'Chat Assistant', description: '24/7 AI nutrition help', icon: Sparkles },
        { key: 'monthly_ai_requests_limit', label: 'Monthly AI Request Limit', description: 'Max requests per month', type: 'number', icon: Zap },
      ]
    },
    {
      tier: 'premium_membership',
      label: 'Premium Membership',
      icon: Award,
      color: 'from-blue-500 to-cyan-500',
      badgeColor: 'bg-blue-600',
      tools: [
        { key: 'can_use_food_lookup_ai', label: 'Food Lookup AI', description: 'Enhanced nutritional data', icon: Sparkles },
        { key: 'can_generate_meal_plans', label: 'Generate Meal Plans', description: 'AI meal suggestions', icon: Zap },
        { key: 'can_generate_recipes', label: 'Generate Recipes', description: 'Personal recipe creation', icon: Sparkles },
        { key: 'can_use_wellness_insights', label: 'Wellness Insights', description: 'Advanced MPESS analysis', icon: TrendingUp },
        { key: 'can_use_chat_assistant', label: 'Chat Assistant', description: 'Priority AI support', icon: Sparkles },
        { key: 'monthly_ai_requests_limit', label: 'Monthly AI Request Limit', description: 'Max requests per month', type: 'number', icon: Zap },
      ]
    },
    {
      tier: 'vip_membership',
      label: 'VIP Membership',
      icon: Crown,
      color: 'from-purple-500 to-pink-500',
      badgeColor: 'bg-purple-600',
      tools: [
        { key: 'can_use_food_lookup_ai', label: 'Food Lookup AI', description: 'Premium data access', icon: Sparkles },
        { key: 'can_generate_meal_plans', label: 'Generate Meal Plans', description: 'Unlimited suggestions', icon: Zap },
        { key: 'can_generate_recipes', label: 'Generate Recipes', description: 'Unlimited recipe AI', icon: Sparkles },
        { key: 'can_use_wellness_insights', label: 'Wellness Insights', description: 'Premium analytics', icon: TrendingUp },
        { key: 'can_use_chat_assistant', label: 'Chat Assistant', description: 'VIP priority support', icon: Sparkles },
        { key: 'can_use_advanced_analytics', label: 'Advanced Analytics', description: 'AI health predictions', icon: Rocket },
        { key: 'monthly_ai_requests_limit', label: 'Monthly AI Request Limit', description: '-1 for unlimited', type: 'number', icon: Zap },
      ]
    }
  ];

  const superAdminPermissions = [
    { key: 'can_manage_users', label: 'Manage Users', description: 'Create, edit, and view all users', icon: Users },
    { key: 'can_invite_users', label: 'Invite Users', description: 'Send user invitations', icon: UserCheck },
    { key: 'can_delete_users', label: 'Delete Users', description: 'Permanently delete user accounts', icon: AlertTriangle },
    { key: 'can_modify_user_roles', label: 'Modify User Roles', description: 'Change user roles and permissions', icon: UserCog },
    { key: 'can_manage_clients', label: 'Manage All Clients', description: 'View and edit all client profiles', icon: Users },
    { key: 'can_delete_clients', label: 'Delete Clients', description: 'Permanently delete client profiles', icon: AlertTriangle },
    { key: 'can_view_all_clients', label: 'View All Clients', description: 'Access to all client data', icon: Eye },
    { key: 'can_edit_all_meal_plans', label: 'Edit All Meal Plans', description: 'Modify any meal plan', icon: Settings },
    { key: 'can_delete_meal_plans', label: 'Delete Meal Plans', description: 'Permanently delete meal plans', icon: AlertTriangle },
    { key: 'can_view_financial_data', label: 'View Financial Data', description: 'Access financial reports and transactions', icon: Eye },
    { key: 'can_modify_financial_data', label: 'Modify Financial Data', description: 'Edit financial records', icon: Settings },
    { key: 'can_manage_team_members', label: 'Manage Team Members', description: 'Add, edit, and remove team members', icon: Users },
    { key: 'can_view_all_messages', label: 'View All Messages', description: 'Access all client-dietitian communications', icon: Eye },
    { key: 'can_manage_templates', label: 'Manage Templates', description: 'Create, edit, and delete templates', icon: Settings },
    { key: 'can_manage_recipes', label: 'Manage Recipes', description: 'Create, edit, and delete recipes', icon: Settings },
    { key: 'can_access_business_analytics', label: 'Access Business Analytics', description: 'View business performance data', icon: Eye },
    { key: 'can_modify_app_settings', label: 'Modify App Settings', description: 'Change app configuration', icon: Settings },
    { key: 'can_manage_permissions', label: 'Manage Permissions', description: 'Control access to security settings', icon: Shield }
  ];

  const teamMemberSettings = [
    { key: 'can_view_only_own_clients', label: 'View Only Own Clients', description: 'Restrict to own clients only', type: 'boolean' },
    { key: 'can_create_clients', label: 'Can Create Clients', description: 'Allow creating new clients', type: 'boolean' },
    { key: 'can_delete_clients', label: 'Can Delete Clients', description: 'Allow deleting clients', type: 'boolean' },
    { key: 'can_view_financial_data', label: 'Can View Financial Data', description: 'Access to financial information', type: 'boolean' },
    { key: 'can_manage_templates', label: 'Can Manage Templates', description: 'Create and edit templates', type: 'boolean' },
    { key: 'max_clients_allowed', label: 'Max Clients Allowed', description: 'Maximum number of clients (-1 for unlimited)', type: 'number' }
  ];

  const studentCoachSettings = [
    { key: 'can_view_only_own_clients', label: 'View Only Own Clients', description: 'Restrict to own clients only', type: 'boolean' },
    { key: 'can_create_clients', label: 'Can Create Clients', description: 'Allow creating new clients', type: 'boolean' },
    { key: 'can_delete_clients', label: 'Can Delete Clients', description: 'Allow deleting clients', type: 'boolean' },
    { key: 'can_access_business_tools', label: 'Can Access Business Tools', description: 'Access to business management features', type: 'boolean' },
    { key: 'can_manage_team', label: 'Can Manage Team', description: 'Manage team members', type: 'boolean' },
    { key: 'max_clients_allowed', label: 'Max Clients Allowed', description: 'Maximum number of clients', type: 'number' }
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Security Settings</h1>
            <p className="text-gray-600">Comprehensive access control and permissions management</p>
          </div>
          <Shield className="w-10 h-10 text-purple-500" />
        </div>

        {/* Warning Alert */}
        <Alert className="border-2 border-red-500 bg-red-50">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <AlertTitle className="text-red-900 font-bold">⚠️ Critical Settings</AlertTitle>
          <AlertDescription className="text-red-800">
            These settings control the entire app's security and feature access. Changes affect all users immediately.
          </AlertDescription>
        </Alert>

        {/* Settings Info */}
        {settings?.settings_metadata && (
          <Card className="border-none shadow-lg bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-blue-900">
                    <strong>Last Modified:</strong> {format(new Date(settings.settings_metadata.last_modified_date), 'PPpp')}
                  </p>
                  <p className="text-blue-800">
                    <strong>By:</strong> {settings.settings_metadata.last_modified_by}
                  </p>
                </div>
                <Badge className="bg-blue-600 text-white">
                  Version {settings.settings_metadata.version}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-6 bg-white/80 backdrop-blur shadow-lg">
            <TabsTrigger
              value="client_features"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white"
            >
              <Eye className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Client Features</span>
            </TabsTrigger>
            <TabsTrigger
              value="client_uploads"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white"
            >
              <Upload className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Upload Control</span>
            </TabsTrigger>
            <TabsTrigger
              value="ai_tools"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">AI Tools</span>
            </TabsTrigger>
            <TabsTrigger
              value="super_admin"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white"
            >
              <Crown className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Super Admin</span>
            </TabsTrigger>
            <TabsTrigger
              value="team_members"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white"
            >
              <UserCog className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Team Members</span>
            </TabsTrigger>
            <TabsTrigger
              value="student_coaches"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white"
            >
              <GraduationCap className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Student Coaches</span>
            </TabsTrigger>
          </TabsList>

          {/* Client Features & Permissions Tab */}
          <TabsContent value="client_features">
            <div className="space-y-6">
              <Alert className="bg-green-50 border-green-500">
                <Eye className="w-5 h-5 text-green-600" />
                <AlertDescription className="text-green-900">
                  <strong>Client Feature Control:</strong> Manage what features clients can see and which actions they can perform. Features are organized by category.
                </AlertDescription>
              </Alert>

              {clientFeatureSettings.map((group, idx) => (
                <Card key={idx} className="border-none shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                    <CardTitle>{group.category}</CardTitle>
                    <CardDescription className="text-white/90">
                      {group.category === 'Visibility' && 'Control which features appear in the client panel'}
                      {group.category === 'Edit Permissions' && 'Control what actions clients can perform'}
                      {group.category === 'Advanced Actions' && 'Control advanced client capabilities'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-3">
                    {group.items.map(setting => {
                      const IconComponent = setting.icon;
                      const isEnabled = formData.client_panel_settings?.[setting.key] ?? true;
                      const isDangerous = setting.key.includes('delete') || setting.key.includes('ai_recipe');

                      return (
                        <div
                          key={setting.key}
                          className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                            isEnabled
                              ? isDangerous
                                ? 'bg-orange-50 border-orange-300'
                                : 'bg-green-50 border-green-300'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-start gap-3 flex-1">
                            <IconComponent className={`w-5 h-5 mt-1 ${
                              isEnabled
                                ? isDangerous
                                  ? 'text-orange-600'
                                  : 'text-green-600'
                                : 'text-gray-400'
                            }`} />
                            <div>
                              <div className="flex items-center gap-2">
                                <Label className="font-semibold text-gray-900">{setting.label}</Label>
                                {isDangerous && isEnabled && (
                                  <Badge className="bg-orange-500 text-white text-xs">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Caution
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{setting.description}</p>
                            </div>
                          </div>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(checked) => updatePermission('client_panel_settings', setting.key, checked)}
                            className={isEnabled && isDangerous ? 'data-[state=checked]:bg-orange-500' : ''}
                          />
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Client Upload Permissions Tab */}
          <TabsContent value="client_uploads">
            <Card className="border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-6 h-6" />
                  Client Upload Permissions
                </CardTitle>
                <CardDescription className="text-white/90">
                  Control what types of files clients can upload
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <Alert className="bg-blue-50 border-blue-500">
                  <Upload className="w-5 h-5 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    Fine-grained control over file upload permissions. Some uploads (like progress photos) are recommended for client engagement.
                  </AlertDescription>
                </Alert>

                {uploadPermissions.map(permission => {
                  const IconComponent = permission.icon;
                  const isEnabled = formData.client_upload_permissions?.[permission.key] ?? false;

                  return (
                    <div
                      key={permission.key}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                        isEnabled ? 'bg-orange-50 border-orange-300' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <IconComponent className={`w-5 h-5 mt-1 ${
                          isEnabled ? 'text-orange-600' : 'text-gray-400'
                        }`} />
                        <div>
                          <Label className="font-semibold text-gray-900">{permission.label}</Label>
                          <p className="text-sm text-gray-600 mt-1">{permission.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => updatePermission('client_upload_permissions', permission.key, checked)}
                      />
                    </div>
                  );
                })}

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label className="font-semibold text-gray-900">Max File Size (MB)</Label>
                    <Input
                      type="number"
                      value={formData.client_upload_permissions?.max_file_size_mb ?? 10}
                      onChange={(e) => updatePermission('client_upload_permissions', 'max_file_size_mb', parseInt(e.target.value))}
                      className="h-12"
                    />
                    <p className="text-xs text-gray-600">Maximum size per file upload</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-gray-900">Allowed File Types</Label>
                    <Input
                      value={formData.client_upload_permissions?.allowed_file_types?.join(', ') ?? 'jpg, jpeg, png, pdf'}
                      onChange={(e) => updatePermission('client_upload_permissions', 'allowed_file_types', 
                        e.target.value.split(',').map(t => t.trim()).filter(t => t)
                      )}
                      className="h-12"
                      placeholder="jpg, png, pdf"
                    />
                    <p className="text-xs text-gray-600">Comma-separated file extensions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Tools by Membership Tab */}
          <TabsContent value="ai_tools">
            <div className="space-y-6">
              <Alert className="bg-purple-50 border-purple-500">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <AlertDescription className="text-purple-900">
                  <strong>AI Tools Access Control:</strong> Define which AI features are available for each membership tier. Set usage limits to manage costs.
                </AlertDescription>
              </Alert>

              {aiToolsByMembership.map((membership) => {
                const MembershipIcon = membership.icon;
                return (
                  <Card key={membership.tier} className="border-none shadow-lg">
                    <CardHeader className={`bg-gradient-to-r ${membership.color} text-white`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <MembershipIcon className="w-6 h-6" />
                          <div>
                            <CardTitle>{membership.label}</CardTitle>
                            <CardDescription className="text-white/90">
                              AI tools available for this membership tier
                            </CardDescription>
                          </div>
                        </div>
                        <Badge className={`${membership.badgeColor} text-white`}>
                          {membership.tier.replace('_membership', '').toUpperCase()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-3">
                      {membership.tools.map(tool => {
                        const ToolIcon = tool.icon;
                        const value = formData.client_ai_tools_access?.[membership.tier]?.[tool.key];
                        const isEnabled = tool.type === 'number' ? true : (value ?? false);

                        return (
                          <div
                            key={tool.key}
                            className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                              isEnabled && tool.type !== 'number'
                                ? 'bg-purple-50 border-purple-300'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-start gap-3 flex-1">
                              <ToolIcon className={`w-5 h-5 mt-1 ${
                                isEnabled && tool.type !== 'number' ? 'text-purple-600' : 'text-gray-400'
                              }`} />
                              <div className="flex-1">
                                <Label className="font-semibold text-gray-900">{tool.label}</Label>
                                <p className="text-sm text-gray-600 mt-1">{tool.description}</p>
                              </div>
                            </div>
                            {tool.type === 'number' ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={value ?? 50}
                                  onChange={(e) => updateNestedPermission('client_ai_tools_access', membership.tier, tool.key, parseInt(e.target.value))}
                                  className="w-24 h-10"
                                />
                                <span className="text-xs text-gray-600 whitespace-nowrap">requests/mo</span>
                              </div>
                            ) : (
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(checked) => updateNestedPermission('client_ai_tools_access', membership.tier, tool.key, checked)}
                              />
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Super Admin Permissions */}
          <TabsContent value="super_admin">
            <Card className="border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-6 h-6" />
                  Super Admin Permissions
                </CardTitle>
                <CardDescription className="text-white/90">
                  Control what super administrators can do in the system
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {superAdminPermissions.map(permission => {
                  const IconComponent = permission.icon;
                  const isEnabled = formData.super_admin_permissions?.[permission.key] ?? true;
                  const isDangerous = permission.key.includes('delete') || permission.key.includes('modify');

                  return (
                    <div
                      key={permission.key}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                        isEnabled
                          ? isDangerous
                            ? 'bg-red-50 border-red-300'
                            : 'bg-green-50 border-green-300'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <IconComponent className={`w-5 h-5 mt-1 ${
                          isEnabled
                            ? isDangerous
                              ? 'text-red-600'
                              : 'text-green-600'
                            : 'text-gray-400'
                        }`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <Label className="font-semibold text-gray-900">{permission.label}</Label>
                            {isDangerous && (
                              <Badge className="bg-red-500 text-white text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Dangerous
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{permission.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => updatePermission('super_admin_permissions', permission.key, checked)}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Member Restrictions */}
          <TabsContent value="team_members">
            <Card className="border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="w-6 h-6" />
                  Team Member Restrictions
                </CardTitle>
                <CardDescription className="text-white/90">
                  Set limitations for regular team members
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {teamMemberSettings.map(setting => {
                  const value = formData.team_member_restrictions?.[setting.key];
                  const isEnabled = setting.type === 'boolean' ? (value ?? true) : true;

                  return (
                    <div
                      key={setting.key}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                        isEnabled ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex-1">
                        <Label className="font-semibold text-gray-900">{setting.label}</Label>
                        <p className="text-sm text-gray-600 mt-1">{setting.description}</p>
                      </div>
                      {setting.type === 'boolean' ? (
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) => updatePermission('team_member_restrictions', setting.key, checked)}
                        />
                      ) : (
                        <Input
                          type="number"
                          value={value ?? -1}
                          onChange={(e) => updatePermission('team_member_restrictions', setting.key, parseInt(e.target.value))}
                          className="w-32"
                        />
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Student Coach Restrictions */}
          <TabsContent value="student_coaches">
            <Card className="border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-6 h-6" />
                  Student Coach Restrictions
                </CardTitle>
                <CardDescription className="text-white/90">
                  Set limitations for student health coaches
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {studentCoachSettings.map(setting => {
                  const value = formData.student_coach_restrictions?.[setting.key];
                  const isEnabled = setting.type === 'boolean' ? (value ?? true) : true;

                  return (
                    <div
                      key={setting.key}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                        isEnabled ? 'bg-orange-50 border-orange-300' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex-1">
                        <Label className="font-semibold text-gray-900">{setting.label}</Label>
                        <p className="text-sm text-gray-600 mt-1">{setting.description}</p>
                      </div>
                      {setting.type === 'boolean' ? (
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) => updatePermission('student_coach_restrictions', setting.key, checked)}
                        />
                      ) : (
                        <Input
                          type="number"
                          value={value ?? 50}
                          onChange={(e) => updatePermission('student_coach_restrictions', setting.key, parseInt(e.target.value))}
                          className="w-32"
                        />
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <Card className="border-none shadow-xl bg-gradient-to-r from-purple-500 to-indigo-500 sticky bottom-4">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <CheckCircle2 className="w-6 h-6" />
                <div>
                  <p className="font-semibold">Ready to save changes?</p>
                  <p className="text-sm text-white/80">Changes will apply immediately to all users</p>
                </div>
              </div>
              <Button
                onClick={handleSave}
                disabled={saveSettingsMutation.isPending}
                className="bg-white text-purple-600 hover:bg-gray-100 font-bold px-8"
                size="lg"
              >
                {saveSettingsMutation.isPending ? (
                  <>
                    <Settings className="w-5 h-5 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Save All Settings
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}