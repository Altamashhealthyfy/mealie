
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
  Save,
  AlertTriangle,
  CheckCircle2,
  UserCog,
  Settings,
  Crown,
  GraduationCap,
  Sparkles,
  Upload,
  Zap,
  DollarSign,
  TrendingUp,
  MessageSquare,
  Calendar,
  ChefHat,
  Heart,
  User,
  FileText,
  Download,
  Camera,
  Trash2,
  Edit,
  Send
} from "lucide-react";
import { format } from "date-fns";

export default function FeatureControl() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("membership_plans");

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
      return getDefaultSettings();
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
      alert('✅ Feature control settings saved successfully!');
    },
    onError: (error) => {
      console.error('Error saving settings:', error);
      alert('❌ Failed to save settings. Please try again.');
    }
  });

  const handleSave = () => {
    saveSettingsMutation.mutate(formData);
  };

  const updatePlanFeature = (planKey, featureKey, value) => {
    setFormData(prev => ({
      ...prev,
      membership_plans: {
        ...prev.membership_plans,
        [planKey]: {
          ...prev.membership_plans?.[planKey],
          features: {
            ...prev.membership_plans?.[planKey]?.features,
            [featureKey]: value
          }
        }
      }
    }));
  };

  const updatePlanPrice = (planKey, priceKey, value) => {
    setFormData(prev => ({
      ...prev,
      membership_plans: {
        ...prev.membership_plans,
        [planKey]: {
          ...prev.membership_plans?.[planKey],
          [priceKey]: value
        }
      }
    }));
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
              Only Super Admins can access feature control settings.
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
          <p className="text-gray-600">Loading feature control settings...</p>
        </div>
      </div>
    );
  }

  const plans = [
    {
      key: 'basic_plan',
      name: 'Basic Plan',
      color: 'from-gray-500 to-slate-600',
      badgeColor: 'bg-gray-600',
      icon: Users,
      description: 'Essential features for basic clients'
    },
    {
      key: 'advanced_plan',
      name: 'Advanced Plan',
      color: 'from-blue-500 to-cyan-600',
      badgeColor: 'bg-blue-600',
      icon: TrendingUp,
      description: 'Advanced features for growing clients'
    },
    {
      key: 'pro_plan',
      name: 'Pro Plan',
      color: 'from-purple-500 to-pink-600',
      badgeColor: 'bg-purple-600',
      icon: Crown,
      description: 'Premium features with unlimited access'
    }
  ];

  const featureGroups = [
    {
      title: 'Meal Planning & Nutrition',
      icon: ChefHat,
      features: [
        { key: 'show_meal_plan', label: 'View Meal Plan', type: 'view', icon: Eye },
        { key: 'allow_meal_plan_comments', label: 'Comment on Meal Plan', type: 'edit', icon: MessageSquare },
        { key: 'show_food_log', label: 'View Food Log', type: 'view', icon: Eye },
        { key: 'allow_food_log_edit', label: 'Edit Food Log', type: 'edit', icon: Edit },
        { key: 'allow_food_log_delete', label: 'Delete Food Log Entries', type: 'delete', icon: Trash2 },
        { key: 'show_nutritional_info', label: 'View Nutritional Info', type: 'view', icon: Eye },
      ]
    },
    {
      title: 'Progress & Wellness',
      icon: Heart,
      features: [
        { key: 'show_progress_tracking', label: 'View Progress Tracking', type: 'view', icon: Eye },
        { key: 'allow_progress_edit', label: 'Log Progress', type: 'edit', icon: Edit },
        { key: 'allow_progress_delete', label: 'Delete Progress Entries', type: 'delete', icon: Trash2 },
        { key: 'show_mpess_tracker', label: 'View MPESS Tracker', type: 'view', icon: Eye },
        { key: 'allow_mpess_edit', label: 'Track MPESS', type: 'edit', icon: Edit },
        { key: 'show_dashboard_stats', label: 'View Dashboard Stats', type: 'view', icon: Eye },
      ]
    },
    {
      title: 'Communication & Appointments',
      icon: MessageSquare,
      features: [
        { key: 'show_messages', label: 'View Messages', type: 'view', icon: Eye },
        { key: 'allow_message_sending', label: 'Send Messages', type: 'edit', icon: Send },
        { key: 'show_appointments', label: 'View Appointments', type: 'view', icon: Eye },
        { key: 'allow_appointment_booking', label: 'Book Appointments', type: 'edit', icon: Calendar },
      ]
    },
    {
      title: 'Recipes & Library',
      icon: FileText,
      features: [
        { key: 'show_recipes', label: 'View Recipes', type: 'view', icon: Eye },
        { key: 'allow_recipe_download', label: 'Download Recipes', type: 'edit', icon: Download },
        { key: 'allow_recipe_upload', label: 'Upload Recipes', type: 'upload', icon: Upload },
        { key: 'allow_ai_recipe_generation', label: 'AI Recipe Generation', type: 'ai', icon: Sparkles },
      ]
    },
    {
      title: 'Profile & Data',
      icon: User,
      features: [
        { key: 'show_profile', label: 'View Profile', type: 'view', icon: Eye },
        { key: 'allow_profile_edit', label: 'Edit Profile', type: 'edit', icon: Edit },
        { key: 'allow_export_data', label: 'Export Data', type: 'edit', icon: Download },
      ]
    },
    {
      title: 'File Uploads',
      icon: Upload,
      features: [
        { key: 'can_upload_progress_photos', label: 'Upload Progress Photos', type: 'upload', icon: Camera },
        { key: 'can_upload_food_photos', label: 'Upload Food Photos', type: 'upload', icon: Camera },
        { key: 'can_upload_lab_reports', label: 'Upload Lab Reports', type: 'upload', icon: FileText },
        { key: 'can_upload_recipes', label: 'Upload Recipe Files', type: 'upload', icon: Upload },
        { key: 'can_upload_documents', label: 'Upload Documents', type: 'upload', icon: FileText },
      ]
    },
    {
      title: 'AI Tools & Features',
      icon: Sparkles,
      features: [
        { key: 'can_use_food_lookup_ai', label: 'Food Lookup AI', type: 'ai', icon: Sparkles },
        { key: 'can_generate_meal_plans', label: 'AI Meal Plan Generation', type: 'ai', icon: Zap },
        { key: 'can_generate_recipes', label: 'AI Recipe Generation', type: 'ai', icon: Sparkles },
        { key: 'can_use_wellness_insights', label: 'Wellness AI Insights', type: 'ai', icon: TrendingUp },
        { key: 'can_use_chat_assistant', label: 'AI Chat Assistant', type: 'ai', icon: MessageSquare },
        { key: 'can_use_advanced_analytics', label: 'Advanced AI Analytics', type: 'ai', icon: TrendingUp, proOnly: true },
      ]
    }
  ];

  const rolePermissions = {
    super_admin: {
      title: 'Super Admin Permissions',
      icon: Crown,
      color: 'from-purple-500 to-indigo-600',
      description: 'Full system access and control',
      categories: [
        {
          title: 'Dashboard & Users',
          permissions: [
            { key: 'can_view_dashboard', label: 'View Dashboard', type: 'view' },
            { key: 'can_manage_users', label: 'Manage Users', type: 'edit' },
            { key: 'can_invite_users', label: 'Invite Users', type: 'edit' },
            { key: 'can_delete_users', label: 'Delete Users', type: 'delete' },
            { key: 'can_modify_user_roles', label: 'Modify User Roles', type: 'edit' },
          ]
        },
        {
          title: 'Client Management',
          permissions: [
            { key: 'can_view_all_clients', label: 'View All Clients', type: 'view' },
            { key: 'can_create_clients', label: 'Create Clients', type: 'edit' },
            { key: 'can_edit_all_clients', label: 'Edit All Clients', type: 'edit' },
            { key: 'can_delete_clients', label: 'Delete Clients', type: 'delete' },
          ]
        },
        {
          title: 'Meal Plans',
          permissions: [
            { key: 'can_view_all_meal_plans', label: 'View All Meal Plans', type: 'view' },
            { key: 'can_create_meal_plans', label: 'Create Meal Plans', type: 'edit' },
            { key: 'can_edit_all_meal_plans', label: 'Edit All Meal Plans', type: 'edit' },
            { key: 'can_delete_meal_plans', label: 'Delete Meal Plans', type: 'delete' },
          ]
        },
        {
          title: 'Communication',
          permissions: [
            { key: 'can_view_all_messages', label: 'View All Messages', type: 'view' },
            { key: 'can_send_messages', label: 'Send Messages', type: 'edit' },
            { key: 'can_delete_messages', label: 'Delete Messages', type: 'delete' },
          ]
        },
        {
          title: 'Financial Data',
          permissions: [
            { key: 'can_view_financial_data', label: 'View Financial Data', type: 'view' },
            { key: 'can_edit_financial_data', label: 'Edit Financial Data', type: 'edit' },
            { key: 'can_delete_financial_data', label: 'Delete Financial Data', type: 'delete' },
          ]
        },
        {
          title: 'Templates',
          permissions: [
            { key: 'can_view_templates', label: 'View Templates', type: 'view' },
            { key: 'can_create_templates', label: 'Create Templates', type: 'edit' },
            { key: 'can_edit_templates', label: 'Edit Templates', type: 'edit' },
            { key: 'can_delete_templates', label: 'Delete Templates', type: 'delete' },
          ]
        },
        {
          title: 'Recipes',
          permissions: [
            { key: 'can_view_recipes', label: 'View Recipes', type: 'view' },
            { key: 'can_create_recipes', label: 'Create Recipes', type: 'edit' },
            { key: 'can_edit_all_recipes', label: 'Edit All Recipes', type: 'edit' },
            { key: 'can_delete_recipes', label: 'Delete Recipes', type: 'delete' },
          ]
        },
        {
          title: 'Files & Settings',
          permissions: [
            { key: 'can_upload_files', label: 'Upload Files', type: 'upload' },
            { key: 'can_delete_files', label: 'Delete Files', type: 'delete' },
            { key: 'can_access_business_analytics', label: 'Access Business Analytics', type: 'view' },
            { key: 'can_modify_app_settings', label: 'Modify App Settings', type: 'edit' },
            { key: 'can_manage_permissions', label: 'Manage Permissions', type: 'edit' },
            { key: 'can_manage_team_members', label: 'Manage Team Members', type: 'edit' },
          ]
        }
      ]
    },
    team_member: {
      title: 'Team Member Permissions',
      icon: UserCog,
      color: 'from-blue-500 to-cyan-600',
      description: 'Permissions for regular team members',
      categories: [
        {
          title: 'Dashboard & Clients',
          permissions: [
            { key: 'can_view_dashboard', label: 'View Dashboard', type: 'view' },
            { key: 'can_view_only_own_clients', label: 'View Only Own Clients', type: 'view' },
            { key: 'can_view_all_clients', label: 'View All Clients', type: 'view' },
            { key: 'can_create_clients', label: 'Create Clients', type: 'edit' },
            { key: 'can_edit_own_clients', label: 'Edit Own Clients', type: 'edit' },
            { key: 'can_edit_all_clients', label: 'Edit All Clients', type: 'edit' },
            { key: 'can_delete_own_clients', label: 'Delete Own Clients', type: 'delete' },
            { key: 'can_delete_all_clients', label: 'Delete All Clients', type: 'delete' },
          ]
        },
        {
          title: 'Meal Plans',
          permissions: [
            { key: 'can_view_own_meal_plans', label: 'View Own Meal Plans', type: 'view' },
            { key: 'can_view_all_meal_plans', label: 'View All Meal Plans', type: 'view' },
            { key: 'can_create_meal_plans', label: 'Create Meal Plans', type: 'edit' },
            { key: 'can_edit_own_meal_plans', label: 'Edit Own Meal Plans', type: 'edit' },
            { key: 'can_edit_all_meal_plans', label: 'Edit All Meal Plans', type: 'edit' },
            { key: 'can_delete_own_meal_plans', label: 'Delete Own Meal Plans', type: 'delete' },
            { key: 'can_delete_all_meal_plans', label: 'Delete All Meal Plans', type: 'delete' },
          ]
        },
        {
          title: 'Communication',
          permissions: [
            { key: 'can_view_own_messages', label: 'View Own Messages', type: 'view' },
            { key: 'can_view_all_messages', label: 'View All Messages', type: 'view' },
            { key: 'can_send_messages', label: 'Send Messages', type: 'edit' },
            { key: 'can_delete_own_messages', label: 'Delete Own Messages', type: 'delete' },
            { key: 'can_delete_all_messages', label: 'Delete All Messages', type: 'delete' },
          ]
        },
        {
          title: 'Financial Data',
          permissions: [
            { key: 'can_view_financial_data', label: 'View Financial Data', type: 'view' },
            { key: 'can_edit_financial_data', label: 'Edit Financial Data', type: 'edit' },
            { key: 'can_delete_financial_data', label: 'Delete Financial Data', type: 'delete' },
          ]
        },
        {
          title: 'Templates',
          permissions: [
            { key: 'can_view_templates', label: 'View Templates', type: 'view' },
            { key: 'can_create_templates', label: 'Create Templates', type: 'edit' },
            { key: 'can_edit_own_templates', label: 'Edit Own Templates', type: 'edit' },
            { key: 'can_edit_all_templates', label: 'Edit All Templates', type: 'edit' },
            { key: 'can_delete_own_templates', label: 'Delete Own Templates', type: 'delete' },
            { key: 'can_delete_all_templates', label: 'Delete All Templates', type: 'delete' },
          ]
        },
        {
          title: 'Recipes',
          permissions: [
            { key: 'can_view_recipes', label: 'View Recipes', type: 'view' },
            { key: 'can_create_recipes', label: 'Create Recipes', type: 'edit' },
            { key: 'can_edit_own_recipes', label: 'Edit Own Recipes', type: 'edit' },
            { key: 'can_edit_all_recipes', label: 'Edit All Recipes', type: 'edit' },
            { key: 'can_delete_own_recipes', label: 'Delete Own Recipes', type: 'delete' },
            { key: 'can_delete_all_recipes', label: 'Delete All Recipes', type: 'delete' },
          ]
        },
        {
          title: 'Files & Limits',
          permissions: [
            { key: 'can_upload_files', label: 'Upload Files', type: 'upload' },
            { key: 'can_delete_own_files', label: 'Delete Own Files', type: 'delete' },
            { key: 'can_delete_all_files', label: 'Delete All Files', type: 'delete' },
          ]
        }
      ],
      numericSettings: [
        { key: 'max_clients_allowed', label: 'Max Clients Allowed', description: '-1 for unlimited' },
        { key: 'max_file_size_mb', label: 'Max File Size (MB)', description: 'Maximum upload size' }
      ]
    },
    student_coach: {
      title: 'Student Coach Permissions',
      icon: GraduationCap,
      color: 'from-orange-500 to-red-600',
      description: 'Permissions for student health coaches',
      categories: [
        {
          title: 'Dashboard & Clients',
          permissions: [
            { key: 'can_view_dashboard', label: 'View Dashboard', type: 'view' },
            { key: 'can_view_only_own_clients', label: 'View Only Own Clients', type: 'view' },
            { key: 'can_view_all_clients', label: 'View All Clients', type: 'view' },
            { key: 'can_create_clients', label: 'Create Clients', type: 'edit' },
            { key: 'can_edit_own_clients', label: 'Edit Own Clients', type: 'edit' },
            { key: 'can_edit_all_clients', label: 'Edit All Clients', type: 'edit' },
            { key: 'can_delete_own_clients', label: 'Delete Own Clients', type: 'delete' },
            { key: 'can_delete_all_clients', label: 'Delete All Clients', type: 'delete' },
          ]
        },
        {
          title: 'Meal Plans',
          permissions: [
            { key: 'can_view_own_meal_plans', label: 'View Own Meal Plans', type: 'view' },
            { key: 'can_view_all_meal_plans', label: 'View All Meal Plans', type: 'view' },
            { key: 'can_create_meal_plans', label: 'Create Meal Plans', type: 'edit' },
            { key: 'can_edit_own_meal_plans', label: 'Edit Own Meal Plans', type: 'edit' },
            { key: 'can_edit_all_meal_plans', label: 'Edit All Meal Plans', type: 'edit' },
            { key: 'can_delete_own_meal_plans', label: 'Delete Own Meal Plans', type: 'delete' },
            { key: 'can_delete_all_meal_plans', label: 'Delete All Meal Plans', type: 'delete' },
          ]
        },
        {
          title: 'Communication',
          permissions: [
            { key: 'can_view_own_messages', label: 'View Own Messages', type: 'view' },
            { key: 'can_view_all_messages', label: 'View All Messages', type: 'view' },
            { key: 'can_send_messages', label: 'Send Messages', type: 'edit' },
            { key: 'can_delete_own_messages', label: 'Delete Own Messages', type: 'delete' },
            { key: 'can_delete_all_messages', label: 'Delete All Messages', type: 'delete' },
          ]
        },
        {
          title: 'Financial Data',
          permissions: [
            { key: 'can_view_financial_data', label: 'View Financial Data', type: 'view' },
            { key: 'can_edit_financial_data', label: 'Edit Financial Data', type: 'edit' },
            { key: 'can_delete_financial_data', label: 'Delete Financial Data', type: 'delete' },
          ]
        },
        {
          title: 'Templates',
          permissions: [
            { key: 'can_view_templates', label: 'View Templates', type: 'view' },
            { key: 'can_create_templates', label: 'Create Templates', type: 'edit' },
            { key: 'can_edit_own_templates', label: 'Edit Own Templates', type: 'edit' },
            { key: 'can_edit_all_templates', label: 'Edit All Templates', type: 'edit' },
            { key: 'can_delete_own_templates', label: 'Delete Own Templates', type: 'delete' },
            { key: 'can_delete_all_templates', label: 'Delete All Templates', type: 'delete' },
          ]
        },
        {
          title: 'Recipes',
          permissions: [
            { key: 'can_view_recipes', label: 'View Recipes', type: 'view' },
            { key: 'can_create_recipes', label: 'Create Recipes', type: 'edit' },
            { key: 'can_edit_own_recipes', label: 'Edit Own Recipes', type: 'edit' },
            { key: 'can_edit_all_recipes', label: 'Edit All Recipes', type: 'edit' },
            { key: 'can_delete_own_recipes', label: 'Delete Own Recipes', type: 'delete' },
            { key: 'can_delete_all_recipes', label: 'Delete All Recipes', type: 'delete' },
          ]
        },
        {
          title: 'Files & Business Tools',
          permissions: [
            { key: 'can_upload_files', label: 'Upload Files', type: 'upload' },
            { key: 'can_delete_own_files', label: 'Delete Own Files', type: 'delete' },
            { key: 'can_delete_all_files', label: 'Delete All Files', type: 'delete' },
            { key: 'can_access_business_tools', label: 'Access Business Tools', type: 'view' },
            { key: 'can_manage_team', label: 'Manage Team', type: 'edit' },
          ]
        }
      ],
      numericSettings: [
        { key: 'max_clients_allowed', label: 'Max Clients Allowed', description: 'Maximum number of clients' },
        { key: 'max_file_size_mb', label: 'Max File Size (MB)', description: 'Maximum upload size' }
      ]
    },
    client: {
      title: 'Client Base Restrictions',
      icon: Users,
      color: 'from-green-500 to-emerald-600',
      description: 'Base permissions for clients without a plan',
      categories: [
        {
          title: 'Meal Planning & Nutrition',
          permissions: [
            { key: 'can_view_meal_plan', label: 'View Meal Plan', type: 'view' },
            { key: 'can_comment_on_meal_plan', label: 'Comment on Meal Plan', type: 'edit' },
            { key: 'can_view_food_log', label: 'View Food Log', type: 'view' },
            { key: 'can_edit_food_log', label: 'Edit Food Log', type: 'edit' },
            { key: 'can_delete_food_log', label: 'Delete Food Log', type: 'delete' },
          ]
        },
        {
          title: 'Progress & Wellness',
          permissions: [
            { key: 'can_view_progress', label: 'View Progress', type: 'view' },
            { key: 'can_edit_progress', label: 'Edit Progress', type: 'edit' },
            { key: 'can_delete_progress', label: 'Delete Progress', type: 'delete' },
            { key: 'can_view_mpess', label: 'View MPESS', type: 'view' },
            { key: 'can_edit_mpess', label: 'Edit MPESS', type: 'edit' },
          ]
        },
        {
          title: 'Communication & Appointments',
          permissions: [
            { key: 'can_view_messages', label: 'View Messages', type: 'view' },
            { key: 'can_send_messages', label: 'Send Messages', type: 'edit' },
            { key: 'can_view_appointments', label: 'View Appointments', type: 'view' },
            { key: 'can_book_appointments', label: 'Book Appointments', type: 'edit' },
          ]
        },
        {
          title: 'Profile & Recipes',
          permissions: [
            { key: 'can_view_profile', label: 'View Profile', type: 'view' },
            { key: 'can_edit_profile', label: 'Edit Profile', type: 'edit' },
            { key: 'can_view_recipes', label: 'View Recipes', type: 'view' },
            { key: 'can_download_recipes', label: 'Download Recipes', type: 'edit' },
            { key: 'can_upload_recipes', label: 'Upload Recipes', type: 'upload' },
            { key: 'can_generate_ai_recipes', label: 'Generate AI Recipes', type: 'ai' },
          ]
        },
        {
          title: 'File Uploads',
          permissions: [
            { key: 'can_upload_progress_photos', label: 'Upload Progress Photos', type: 'upload' },
            { key: 'can_upload_food_photos', label: 'Upload Food Photos', type: 'upload' },
            { key: 'can_upload_lab_reports', label: 'Upload Lab Reports', type: 'upload' },
            { key: 'can_upload_documents', label: 'Upload Documents', type: 'upload' },
          ]
        },
        {
          title: 'AI Tools & Data',
          permissions: [
            { key: 'can_export_data', label: 'Export Data', type: 'edit' },
            { key: 'can_use_food_lookup_ai', label: 'Food Lookup AI', type: 'ai' },
            { key: 'can_use_wellness_insights', label: 'Wellness AI', type: 'ai' },
            { key: 'can_use_chat_assistant', label: 'Chat Assistant', type: 'ai' },
          ]
        }
      ],
      numericSettings: [
        { key: 'monthly_ai_requests_limit', label: 'Monthly AI Request Limit', description: 'AI usage limit' },
        { key: 'max_file_size_mb', label: 'Max File Size (MB)', description: 'Maximum upload size' }
      ]
    }
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'view': return 'text-blue-600';
      case 'edit': return 'text-green-600';
      case 'delete': return 'text-red-600';
      case 'upload': return 'text-orange-600';
      case 'ai': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getTypeBg = (type, enabled) => {
    if (!enabled) return 'bg-gray-50 border-gray-200';
    switch(type) {
      case 'view': return 'bg-blue-50 border-blue-300';
      case 'edit': return 'bg-green-50 border-green-300';
      case 'delete': return 'bg-red-50 border-red-300';
      case 'upload': return 'bg-orange-50 border-orange-300';
      case 'ai': return 'bg-purple-50 border-purple-300';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Feature Control</h1>
            <p className="text-gray-600">Comprehensive access control for plans and user roles</p>
          </div>
          <Shield className="w-10 h-10 text-purple-500" />
        </div>

        {/* Warning Alert */}
        <Alert className="border-2 border-orange-500 bg-orange-50">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <AlertTitle className="text-orange-900 font-bold">⚠️ System-Wide Settings</AlertTitle>
          <AlertDescription className="text-orange-800">
            Changes here affect all users and membership plans. Configure carefully before saving.
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

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 bg-white/80 backdrop-blur shadow-lg">
            <TabsTrigger
              value="membership_plans"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Membership Plans</span>
              <span className="sm:hidden">Plans</span>
            </TabsTrigger>
            <TabsTrigger
              value="super_admin"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white"
            >
              <Crown className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Super Admin</span>
              <span className="sm:hidden">Admin</span>
            </TabsTrigger>
            <TabsTrigger
              value="team_member"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white"
            >
              <UserCog className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Team Members</span>
              <span className="sm:hidden">Team</span>
            </TabsTrigger>
            <TabsTrigger
              value="student_coach"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white"
            >
              <GraduationCap className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Student Coaches</span>
              <span className="sm:hidden">Students</span>
            </TabsTrigger>
            <TabsTrigger
              value="client"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white"
            >
              <Users className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Client Restrictions</span>
              <span className="sm:hidden">Clients</span>
            </TabsTrigger>
          </TabsList>

          {/* Membership Plans Tab */}
          <TabsContent value="membership_plans">
            <div className="space-y-6">
              <Alert className="bg-purple-50 border-purple-500">
                <DollarSign className="w-5 h-5 text-purple-600" />
                <AlertDescription className="text-purple-900">
                  <strong>Plan-Based Access Control:</strong> Define what features each membership plan includes. Set pricing and control feature access per tier.
                </AlertDescription>
              </Alert>

              {plans.map(plan => {
                const PlanIcon = plan.icon;
                const planData = formData.membership_plans?.[plan.key] || {};
                
                return (
                  <Card key={plan.key} className="border-none shadow-xl">
                    <CardHeader className={`bg-gradient-to-r ${plan.color} text-white`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <PlanIcon className="w-6 h-6" />
                          <div>
                            <CardTitle className="text-2xl">{plan.name}</CardTitle>
                            <CardDescription className="text-white/90">{plan.description}</CardDescription>
                          </div>
                        </div>
                        <Badge className={`${plan.badgeColor} text-white text-lg px-4 py-2`}>
                          {plan.key.replace('_plan', '').toUpperCase()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      {/* Pricing Section */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-6 border-b">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-700">Plan Name</Label>
                          <Input
                            value={planData.plan_name || plan.name}
                            onChange={(e) => updatePlanPrice(plan.key, 'plan_name', e.target.value)}
                            className="h-12 text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-700">Monthly Price (₹)</Label>
                          <Input
                            type="number"
                            value={planData.monthly_price || 0}
                            onChange={(e) => updatePlanPrice(plan.key, 'monthly_price', parseInt(e.target.value))}
                            className="h-12 text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-700">Yearly Price (₹)</Label>
                          <Input
                            type="number"
                            value={planData.yearly_price || 0}
                            onChange={(e) => updatePlanPrice(plan.key, 'yearly_price', parseInt(e.target.value))}
                            className="h-12 text-base"
                          />
                        </div>
                      </div>

                      {/* Features Section */}
                      <div className="space-y-6">
                        {featureGroups.map(group => {
                          const GroupIcon = group.icon;
                          return (
                            <div key={group.title} className="space-y-3">
                              <div className="flex items-center gap-2 pb-2 border-b">
                                <GroupIcon className="w-5 h-5 text-gray-700" />
                                <h3 className="font-bold text-gray-900">{group.title}</h3>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {group.features.map(feature => {
                                  if (feature.proOnly && plan.key !== 'pro_plan') return null;
                                  
                                  const FeatureIcon = feature.icon;
                                  const isEnabled = planData.features?.[feature.key] ?? false;
                                  
                                  return (
                                    <div
                                      key={feature.key}
                                      className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                                        getTypeBg(feature.type, isEnabled)
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 flex-1">
                                        <FeatureIcon className={`w-4 h-4 ${isEnabled ? getTypeColor(feature.type) : 'text-gray-400'}`} />
                                        <Label className="text-sm font-medium text-gray-900 cursor-pointer">
                                          {feature.label}
                                        </Label>
                                      </div>
                                      <Switch
                                        checked={isEnabled}
                                        onCheckedChange={(checked) => updatePlanFeature(plan.key, feature.key, checked)}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}

                        {/* Numeric Settings */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                          <div className="space-y-2">
                            <Label className="font-semibold text-gray-900">Monthly AI Requests</Label>
                            <Input
                              type="number"
                              value={planData.features?.monthly_ai_requests_limit ?? 50}
                              onChange={(e) => updatePlanFeature(plan.key, 'monthly_ai_requests_limit', parseInt(e.target.value))}
                              className="h-10"
                            />
                            <p className="text-xs text-gray-600">-1 for unlimited</p>
                          </div>
                          <div className="space-y-2">
                            <Label className="font-semibold text-gray-900">Max File Size (MB)</Label>
                            <Input
                              type="number"
                              value={planData.features?.max_file_size_mb ?? 10}
                              onChange={(e) => updatePlanFeature(plan.key, 'max_file_size_mb', parseInt(e.target.value))}
                              className="h-10"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Role Permission Tabs */}
          {Object.entries(rolePermissions).map(([roleKey, roleData]) => {
            const RoleIcon = roleData.icon;
            const permissionKey = roleKey === 'super_admin' ? 'super_admin_permissions' : 
                                 roleKey === 'team_member' ? 'team_member_permissions' :
                                 roleKey === 'student_coach' ? 'student_coach_permissions' :
                                 'client_restrictions';
            
            return (
              <TabsContent key={roleKey} value={roleKey}>
                <Card className="border-none shadow-xl">
                  <CardHeader className={`bg-gradient-to-r ${roleData.color} text-white`}>
                    <div className="flex items-center gap-3">
                      <RoleIcon className="w-6 h-6" />
                      <div>
                        <CardTitle className="text-2xl">{roleData.title}</CardTitle>
                        <CardDescription className="text-white/90">{roleData.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {roleData.categories.map(category => (
                      <div key={category.title} className="space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <h3 className="font-bold text-gray-900">{category.title}</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {category.permissions.map(permission => {
                            const isEnabled = formData[permissionKey]?.[permission.key] ?? true;
                            
                            return (
                              <div
                                key={permission.key}
                                className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                                  getTypeBg(permission.type, isEnabled)
                                }`}
                              >
                                <Label className="text-sm font-medium text-gray-900 flex-1 cursor-pointer">
                                  {permission.label}
                                </Label>
                                <Switch
                                  checked={isEnabled}
                                  onCheckedChange={(checked) => updatePermission(permissionKey, permission.key, checked)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Numeric Settings */}
                    {roleData.numericSettings && (
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        {roleData.numericSettings.map(setting => (
                          <div key={setting.key} className="space-y-2">
                            <Label className="font-semibold text-gray-900">{setting.label}</Label>
                            <Input
                              type="number"
                              value={formData[permissionKey]?.[setting.key] ?? 0}
                              onChange={(e) => updatePermission(permissionKey, setting.key, parseInt(e.target.value))}
                              className="h-10"
                            />
                            <p className="text-xs text-gray-600">{setting.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>

        {/* Save Button */}
        <Card className="border-none shadow-xl bg-gradient-to-r from-purple-500 to-indigo-500 sticky bottom-4">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <CheckCircle2 className="w-6 h-6" />
                <div>
                  <p className="font-semibold">Ready to save changes?</p>
                  <p className="text-sm text-white/80">All settings will be applied immediately</p>
                </div>
              </div>
              <Button
                onClick={handleSave}
                disabled={saveSettingsMutation.isPending}
                className="bg-white text-purple-600 hover:bg-gray-100 font-bold px-8 h-12"
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

function getDefaultSettings() {
  return {
    membership_plans: {
      basic_plan: {
        plan_name: "Basic Plan",
        monthly_price: 999,
        yearly_price: 9999,
        currency: "INR",
        features: {
          show_meal_plan: true,
          allow_meal_plan_comments: false,
          show_food_log: true,
          allow_food_log_edit: true,
          allow_food_log_delete: false,
          show_progress_tracking: true,
          allow_progress_edit: true,
          allow_progress_delete: false,
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
          allow_export_data: false,
          can_upload_progress_photos: true,
          can_upload_food_photos: true,
          can_upload_lab_reports: true,
          can_upload_recipes: false,
          can_upload_documents: false,
          can_use_food_lookup_ai: true,
          can_generate_meal_plans: false,
          can_generate_recipes: false,
          can_use_wellness_insights: false,
          can_use_chat_assistant: false,
          monthly_ai_requests_limit: 50,
          max_file_size_mb: 10
        }
      },
      advanced_plan: {
        plan_name: "Advanced Plan",
        monthly_price: 2999,
        yearly_price: 29999,
        currency: "INR",
        features: {
          show_meal_plan: true,
          allow_meal_plan_comments: true,
          show_food_log: true,
          allow_food_log_edit: true,
          allow_food_log_delete: true,
          show_progress_tracking: true,
          allow_progress_edit: true,
          allow_progress_delete: true,
          show_mpess_tracker: true,
          allow_mpess_edit: true,
          show_messages: true,
          allow_message_sending: true,
          show_appointments: true,
          allow_appointment_booking: true,
          show_profile: true,
          allow_profile_edit: true,
          show_nutritional_info: true,
          show_recipes: true,
          allow_recipe_download: true,
          allow_recipe_upload: false,
          allow_ai_recipe_generation: true,
          show_dashboard_stats: true,
          allow_export_data: true,
          can_upload_progress_photos: true,
          can_upload_food_photos: true,
          can_upload_lab_reports: true,
          can_upload_recipes: false,
          can_upload_documents: true,
          can_use_food_lookup_ai: true,
          can_generate_meal_plans: false,
          can_generate_recipes: true,
          can_use_wellness_insights: true,
          can_use_chat_assistant: true,
          monthly_ai_requests_limit: 200,
          max_file_size_mb: 20
        }
      },
      pro_plan: {
        plan_name: "Pro Plan",
        monthly_price: 4999,
        yearly_price: 49999,
        currency: "INR",
        features: {
          show_meal_plan: true,
          allow_meal_plan_comments: true,
          show_food_log: true,
          allow_food_log_edit: true,
          allow_food_log_delete: true,
          show_progress_tracking: true,
          allow_progress_edit: true,
          allow_progress_delete: true,
          show_mpess_tracker: true,
          allow_mpess_edit: true,
          show_messages: true,
          allow_message_sending: true,
          show_appointments: true,
          allow_appointment_booking: true,
          show_profile: true,
          allow_profile_edit: true,
          show_nutritional_info: true,
          show_recipes: true,
          allow_recipe_download: true,
          allow_recipe_upload: true,
          allow_ai_recipe_generation: true,
          show_dashboard_stats: true,
          allow_export_data: true,
          can_upload_progress_photos: true,
          can_upload_food_photos: true,
          can_upload_lab_reports: true,
          can_upload_recipes: true,
          can_upload_documents: true,
          can_use_food_lookup_ai: true,
          can_generate_meal_plans: false,
          can_generate_recipes: true,
          can_use_wellness_insights: true,
          can_use_chat_assistant: true,
          can_use_advanced_analytics: true,
          monthly_ai_requests_limit: -1,
          max_file_size_mb: 50
        }
      }
    },
    super_admin_permissions: {
      can_view_dashboard: true,
      can_manage_users: true,
      can_invite_users: true,
      can_delete_users: true,
      can_modify_user_roles: true,
      can_view_all_clients: true,
      can_create_clients: true,
      can_edit_all_clients: true,
      can_delete_clients: true,
      can_view_all_meal_plans: true,
      can_create_meal_plans: true,
      can_edit_all_meal_plans: true,
      can_delete_meal_plans: true,
      can_view_all_messages: true,
      can_send_messages: true,
      can_delete_messages: true,
      can_view_financial_data: true,
      can_edit_financial_data: true,
      can_delete_financial_data: true,
      can_view_templates: true,
      can_create_templates: true,
      can_edit_templates: true,
      can_delete_templates: true,
      can_view_recipes: true,
      can_create_recipes: true,
      can_edit_all_recipes: true,
      can_delete_recipes: true,
      can_upload_files: true,
      can_delete_files: true,
      can_access_business_analytics: true,
      can_modify_app_settings: true,
      can_manage_permissions: true,
      can_manage_team_members: true
    },
    team_member_permissions: {
      can_view_dashboard: true,
      can_view_only_own_clients: true,
      can_view_all_clients: false,
      can_create_clients: true,
      can_edit_own_clients: true,
      can_edit_all_clients: false,
      can_delete_own_clients: false,
      can_delete_all_clients: false,
      can_view_own_meal_plans: true,
      can_view_all_meal_plans: false,
      can_create_meal_plans: true,
      can_edit_own_meal_plans: true,
      can_edit_all_meal_plans: false,
      can_delete_own_meal_plans: false,
      can_delete_all_meal_plans: false,
      can_view_own_messages: true,
      can_view_all_messages: false,
      can_send_messages: true,
      can_delete_own_messages: false,
      can_delete_all_messages: false,
      can_view_financial_data: false,
      can_edit_financial_data: false,
      can_delete_financial_data: false,
      can_view_templates: true,
      can_create_templates: false,
      can_edit_own_templates: false,
      can_edit_all_templates: false,
      can_delete_own_templates: false,
      can_delete_all_templates: false,
      can_view_recipes: true,
      can_create_recipes: true,
      can_edit_own_recipes: true,
      can_edit_all_recipes: false,
      can_delete_own_recipes: false,
      can_delete_all_recipes: false,
      can_upload_files: true,
      can_delete_own_files: false,
      can_delete_all_files: false,
      max_clients_allowed: -1,
      max_file_size_mb: 10
    },
    student_coach_permissions: {
      can_view_dashboard: true,
      can_view_only_own_clients: true,
      can_view_all_clients: false,
      can_create_clients: true,
      can_edit_own_clients: true,
      can_edit_all_clients: false,
      can_delete_own_clients: false,
      can_delete_all_clients: false,
      can_view_own_meal_plans: true,
      can_view_all_meal_plans: false,
      can_create_meal_plans: true,
      can_edit_own_meal_plans: true,
      can_edit_all_meal_plans: false,
      can_delete_own_meal_plans: false,
      can_delete_all_meal_plans: false,
      can_view_own_messages: true,
      can_view_all_messages: false,
      can_send_messages: true,
      can_delete_own_messages: false,
      can_delete_all_messages: false,
      can_view_financial_data: true,
      can_edit_financial_data: true,
      can_delete_financial_data: false,
      can_view_templates: true,
      can_create_templates: true,
      can_edit_own_templates: true,
      can_edit_all_templates: false,
      can_delete_own_templates: true,
      can_delete_all_templates: false,
      can_view_recipes: true,
      can_create_recipes: true,
      can_edit_own_recipes: true,
      can_edit_all_recipes: false,
      can_delete_own_recipes: true,
      can_delete_all_recipes: false,
      can_upload_files: true,
      can_delete_own_files: true,
      can_delete_all_files: false,
      can_access_business_tools: true,
      can_manage_team: true,
      max_clients_allowed: 50,
      max_file_size_mb: 20
    },
    client_restrictions: {
      can_view_meal_plan: true,
      can_comment_on_meal_plan: false,
      can_view_food_log: true,
      can_edit_food_log: true,
      can_delete_food_log: false,
      can_view_progress: true,
      can_edit_progress: true,
      can_delete_progress: false,
      can_view_mpess: true,
      can_edit_mpess: true,
      can_view_messages: true,
      can_send_messages: true,
      can_view_appointments: true,
      can_book_appointments: false,
      can_view_profile: true,
      can_edit_profile: true,
      can_view_recipes: true,
      can_download_recipes: true,
      can_upload_recipes: false,
      can_generate_ai_recipes: false,
      can_upload_progress_photos: true,
      can_upload_food_photos: true,
      can_upload_lab_reports: true,
      can_upload_documents: false,
      can_export_data: false,
      can_use_food_lookup_ai: true,
      can_use_wellness_insights: false,
      can_use_chat_assistant: false,
      monthly_ai_requests_limit: 30,
      max_file_size_mb: 10
    }
  };
}
