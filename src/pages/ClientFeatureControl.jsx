import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Users, 
  Save, 
  Calendar,
  MessageSquare,
  ChefHat,
  TrendingUp,
  Heart,
  Utensils,
  Scale,
  User,
  FileText,
  Download,
  BarChart,
  AlertTriangle,
  Info,
  CheckCircle2,
  Eye,
  EyeOff
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ClientFeatureControl() {
  const queryClient = useQueryClient();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: securitySettings, isLoading } = useQuery({
    queryKey: ['securitySettings'],
    queryFn: async () => {
      const settings = await base44.entities.AppSecuritySettings.list();
      if (settings.length > 0) {
        return settings[0];
      }
      
      // Create default settings if none exist
      const defaultSettings = {
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
          show_dashboard_stats: true,
          allow_export_data: false,
        }
      };
      
      const created = await base44.entities.AppSecuritySettings.create(defaultSettings);
      return created;
    },
  });

  const [localSettings, setLocalSettings] = useState(null);

  React.useEffect(() => {
    if (securitySettings && !localSettings) {
      setLocalSettings(JSON.parse(JSON.stringify(securitySettings)));
    }
  }, [securitySettings]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (settings) => {
      if (securitySettings?.id) {
        return await base44.entities.AppSecuritySettings.update(securitySettings.id, settings);
      } else {
        return await base44.entities.AppSecuritySettings.create(settings);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['securitySettings']);
      setHasUnsavedChanges(false);
      alert('✅ Client feature settings saved successfully!');
    },
    onError: (error) => {
      console.error('Error saving settings:', error);
      alert('❌ Failed to save settings. Please try again.');
    }
  });

  const updateSetting = (path, value) => {
    setLocalSettings(prev => {
      const updated = { ...prev };
      const keys = path.split('.');
      let current = updated;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      setHasUnsavedChanges(true);
      return updated;
    });
  };

  const handleSave = () => {
    saveSettingsMutation.mutate(localSettings);
  };

  const handleResetToDefaults = () => {
    if (window.confirm('⚠️ Reset all client feature settings to default values?')) {
      const defaults = {
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
          show_dashboard_stats: true,
          allow_export_data: false,
        }
      };
      setLocalSettings(defaults);
      setHasUnsavedChanges(true);
    }
  };

  if (user?.user_type !== 'super_admin') {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-800">
              Only super administrators can access the Client Feature Control Panel.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !localSettings) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  const featureGroups = [
    {
      id: 'nutrition',
      title: 'Nutrition & Meal Planning',
      icon: ChefHat,
      color: 'from-orange-500 to-red-500',
      features: [
        {
          key: 'show_meal_plan',
          label: 'Show Meal Plan',
          description: 'Allow clients to view their assigned meal plans',
          icon: Calendar,
        },
        {
          key: 'allow_meal_plan_comments',
          label: 'Allow Meal Plan Comments',
          description: 'Let clients add comments or feedback on meal plans',
          icon: MessageSquare,
          parentKey: 'show_meal_plan',
        },
        {
          key: 'show_food_log',
          label: 'Show Food Log',
          description: 'Enable food logging feature for clients',
          icon: Utensils,
        },
        {
          key: 'allow_food_log_edit',
          label: 'Allow Food Log Edit',
          description: 'Let clients edit their food log entries',
          icon: FileText,
          parentKey: 'show_food_log',
        },
        {
          key: 'allow_food_log_delete',
          label: 'Allow Food Log Delete',
          description: 'Let clients delete their food log entries',
          icon: AlertTriangle,
          parentKey: 'show_food_log',
        },
        {
          key: 'show_nutritional_info',
          label: 'Show Nutritional Info',
          description: 'Display nutritional information and food lookup',
          icon: Info,
        },
      ]
    },
    {
      id: 'tracking',
      title: 'Progress & Wellness Tracking',
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-500',
      features: [
        {
          key: 'show_progress_tracking',
          label: 'Show Progress Tracking',
          description: 'Enable weight and measurement tracking',
          icon: Scale,
        },
        {
          key: 'allow_progress_edit',
          label: 'Allow Progress Edit',
          description: 'Let clients log and edit their progress data',
          icon: FileText,
          parentKey: 'show_progress_tracking',
        },
        {
          key: 'show_mpess_tracker',
          label: 'Show MPESS Tracker',
          description: 'Enable holistic wellness (MPESS) tracking',
          icon: Heart,
        },
        {
          key: 'allow_mpess_edit',
          label: 'Allow MPESS Edit',
          description: 'Let clients log their MPESS wellness data',
          icon: FileText,
          parentKey: 'show_mpess_tracker',
        },
        {
          key: 'show_dashboard_stats',
          label: 'Show Dashboard Stats',
          description: 'Display statistics and charts on client dashboard',
          icon: BarChart,
        },
      ]
    },
    {
      id: 'communication',
      title: 'Communication & Appointments',
      icon: MessageSquare,
      color: 'from-blue-500 to-cyan-500',
      features: [
        {
          key: 'show_messages',
          label: 'Show Messages',
          description: 'Enable messaging feature for clients',
          icon: MessageSquare,
        },
        {
          key: 'allow_message_sending',
          label: 'Allow Message Sending',
          description: 'Let clients send messages to dietitian',
          icon: MessageSquare,
          parentKey: 'show_messages',
        },
        {
          key: 'show_appointments',
          label: 'Show Appointments',
          description: 'Display appointment schedule to clients',
          icon: Calendar,
        },
        {
          key: 'allow_appointment_booking',
          label: 'Allow Appointment Booking',
          description: 'Let clients book their own appointments',
          icon: Calendar,
          parentKey: 'show_appointments',
        },
      ]
    },
    {
      id: 'profile_recipes',
      title: 'Profile & Recipes',
      icon: User,
      color: 'from-purple-500 to-indigo-500',
      features: [
        {
          key: 'show_profile',
          label: 'Show Profile',
          description: 'Allow clients to view their profile',
          icon: User,
        },
        {
          key: 'allow_profile_edit',
          label: 'Allow Profile Edit',
          description: 'Let clients edit their profile information',
          icon: FileText,
          parentKey: 'show_profile',
        },
        {
          key: 'show_recipes',
          label: 'Show Recipes',
          description: 'Display recipe library to clients (view-only)',
          icon: ChefHat,
        },
        {
          key: 'allow_recipe_download',
          label: 'Allow Recipe Download',
          description: 'Let clients download recipes as text files',
          icon: Download,
          parentKey: 'show_recipes',
        },
        {
          key: 'allow_export_data',
          label: 'Allow Data Export',
          description: 'Let clients export their data (advanced)',
          icon: Download,
        },
      ]
    },
  ];

  const countEnabledFeatures = () => {
    const settings = localSettings?.client_panel_settings || {};
    const total = Object.keys(settings).length;
    const enabled = Object.values(settings).filter(v => v === true).length;
    return { enabled, total };
  };

  const stats = countEnabledFeatures();

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Client Feature Control</h1>
                <p className="text-gray-600">Manage what clients can see and do in their panel</p>
              </div>
            </div>
          </div>
          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-lg px-4 py-2">
            Admin Only
          </Badge>
        </div>

        {/* Stats Card */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {stats.enabled} / {stats.total}
                  </h3>
                  <p className="text-gray-600">Features Enabled for Clients</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 mb-2">Completion</div>
                <div className="text-3xl font-bold text-blue-600">
                  {Math.round((stats.enabled / stats.total) * 100)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warning Alert */}
        <Alert className="bg-yellow-50 border-yellow-500">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          <AlertDescription className="text-yellow-900">
            <strong>Important:</strong> These settings control what ALL clients can see and do in their panel. 
            Changes take effect immediately after saving. Disabled features will be hidden from client accounts.
          </AlertDescription>
        </Alert>

        {/* Unsaved Changes Warning */}
        {hasUnsavedChanges && (
          <Alert className="bg-orange-50 border-orange-500">
            <Info className="w-5 h-5 text-orange-600" />
            <AlertDescription className="text-orange-900 flex items-center justify-between">
              <span><strong>Unsaved Changes:</strong> You have modified settings that haven't been saved yet.</span>
              <Button
                onClick={handleSave}
                disabled={saveSettingsMutation.isPending}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 ml-4"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Now
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Feature Groups */}
        <Tabs defaultValue="nutrition" className="space-y-6">
          <TabsList className="grid grid-cols-4 bg-white/80 backdrop-blur shadow-lg">
            {featureGroups.map(group => {
              const IconComponent = group.icon;
              return (
                <TabsTrigger
                  key={group.id}
                  value={group.id}
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white"
                >
                  <IconComponent className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">{group.title}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {featureGroups.map(group => (
            <TabsContent key={group.id} value={group.id}>
              <Card className="border-none shadow-xl bg-white/80 backdrop-blur">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${group.color} flex items-center justify-center shadow-lg`}>
                      <group.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">{group.title}</CardTitle>
                      <CardDescription>Configure features in this category</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {group.features.map(feature => {
                    const isEnabled = localSettings?.client_panel_settings?.[feature.key];
                    const parentEnabled = feature.parentKey ? 
                      localSettings?.client_panel_settings?.[feature.parentKey] : true;
                    const FeatureIcon = feature.icon;

                    return (
                      <div
                        key={feature.key}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          isEnabled 
                            ? 'bg-green-50 border-green-300' 
                            : 'bg-gray-50 border-gray-200'
                        } ${!parentEnabled ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isEnabled ? 'bg-green-500' : 'bg-gray-400'
                            }`}>
                              {isEnabled ? (
                                <Eye className="w-5 h-5 text-white" />
                              ) : (
                                <EyeOff className="w-5 h-5 text-white" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <FeatureIcon className="w-4 h-4 text-gray-600" />
                                <h3 className="font-semibold text-gray-900">{feature.label}</h3>
                                {isEnabled ? (
                                  <Badge className="bg-green-100 text-green-700 text-xs">Enabled</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">Disabled</Badge>
                                )}
                                {feature.parentKey && !parentEnabled && (
                                  <Badge variant="outline" className="text-xs text-yellow-700 border-yellow-300">
                                    Parent Disabled
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{feature.description}</p>
                            </div>
                          </div>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(checked) => 
                              updateSetting(`client_panel_settings.${feature.key}`, checked)
                            }
                            disabled={!parentEnabled}
                            className="data-[state=checked]:bg-green-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Action Buttons */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-orange-50 to-red-50">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <Button
                onClick={handleResetToDefaults}
                variant="outline"
                disabled={saveSettingsMutation.isPending}
                className="flex-1 h-14 text-base font-semibold"
              >
                Reset to Defaults
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveSettingsMutation.isPending || !hasUnsavedChanges}
                className="flex-1 h-14 text-base font-semibold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg"
              >
                {saveSettingsMutation.isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
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
            {!hasUnsavedChanges && (
              <div className="mt-4 flex items-center justify-center gap-2 text-green-700">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">All changes saved</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-purple-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-purple-600" />
              How This Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-purple-700 font-bold text-xs">1</span>
              </div>
              <p><strong>Visibility Control:</strong> Disabled features are completely hidden from the client's navigation and interface.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-purple-700 font-bold text-xs">2</span>
              </div>
              <p><strong>Permission Control:</strong> Even if visible, clients need specific permissions (e.g., "Allow Edit") to perform actions.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-purple-700 font-bold text-xs">3</span>
              </div>
              <p><strong>Parent Dependencies:</strong> Some features depend on parent features being enabled (e.g., "Allow Edit" requires "Show" to be enabled).</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-purple-700 font-bold text-xs">4</span>
              </div>
              <p><strong>Instant Effect:</strong> Changes take effect immediately after saving - clients will see the updated interface on their next page load.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}