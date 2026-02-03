import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Home,
  Calendar,
  ChefHat,
  Search,
  Heart,
  MessageSquare,
  ClipboardList,
  Utensils,
  Scale,
  BookOpen,
  User,
  CreditCard,
  AlertCircle,
  Loader2,
  Save,
  Eye,
  EyeOff,
  Users
} from "lucide-react";
import { toast } from "sonner";

export default function ClientAccessManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [bulkSettings, setBulkSettings] = useState({});
  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['coachClients', user?.email],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list();
      // Filter clients where coach email is in assigned_coach array or created by coach
      return allClients.filter(client => 
        client.assigned_coach?.includes(user?.email) || 
        client.created_by === user?.email
      );
    },
    enabled: !!user,
  });

  const { data: accessControl, isLoading: accessLoading } = useQuery({
    queryKey: ['clientAccessControl', selectedClient?.id],
    queryFn: async () => {
      const controls = await base44.entities.ClientAccessControl.filter({
        client_id: selectedClient?.id
      });
      return controls[0] || null;
    },
    enabled: !!selectedClient?.id,
  });

  const createAccessControlMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.ClientAccessControl.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clientAccessControl']);
      toast.success("Access settings created!");
    },
  });

  const updateAccessControlMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.ClientAccessControl.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clientAccessControl']);
      toast.success("Access settings updated!");
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (settingsData) => {
      const promises = filteredClients.map(async (client) => {
        const existingControls = await base44.entities.ClientAccessControl.filter({
          client_id: client.id
        });
        
        const data = {
          client_id: client.id,
          client_email: client.email,
          coach_email: user.email,
          ...settingsData
        };

        if (existingControls[0]) {
          return base44.entities.ClientAccessControl.update(existingControls[0].id, data);
        } else {
          return base44.entities.ClientAccessControl.create(data);
        }
      });

      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clientAccessControl']);
      toast.success(`Access settings applied to ${filteredClients.length} clients!`);
    },
  });

  const sections = [
    { key: 'show_my_dashboard', label: 'My Dashboard', icon: Home },
    { key: 'show_my_plans', label: 'My Plans', icon: CreditCard },
    { key: 'show_my_meal_plan', label: 'My Meal Plan', icon: Calendar },
    { key: 'show_food_log', label: 'Food Log', icon: Utensils },
    { key: 'show_my_progress', label: 'My Progress', icon: Scale },
    { key: 'show_mpess_wellness', label: 'MPESS Wellness', icon: Heart },
    { key: 'show_messages', label: 'Messages', icon: MessageSquare },
    { key: 'show_my_assessments', label: 'My Assessments', icon: ClipboardList },
    { key: 'show_my_appointments', label: 'My Appointments', icon: Calendar },
    { key: 'show_recipe_library', label: 'Recipe Library', icon: ChefHat },
    { key: 'show_food_lookup', label: 'Food Lookup', icon: Search },
    { key: 'show_resources', label: 'Resources', icon: BookOpen },
    { key: 'show_my_profile', label: 'My Profile', icon: User },
  ];

  const [settings, setSettings] = useState(() => {
    const initial = {};
    sections.forEach(section => {
      initial[section.key] = true;
    });
    return initial;
  });

  React.useEffect(() => {
    if (accessControl) {
      const newSettings = {};
      sections.forEach(section => {
        newSettings[section.key] = accessControl[section.key] ?? true;
      });
      setSettings(newSettings);
    } else if (selectedClient) {
      const defaultSettings = {};
      sections.forEach(section => {
        defaultSettings[section.key] = true;
      });
      setSettings(defaultSettings);
    }
  }, [accessControl, selectedClient]);

  React.useEffect(() => {
    const initial = {};
    sections.forEach(section => {
      initial[section.key] = true;
    });
    setBulkSettings(initial);
  }, []);

  const handleSave = () => {
    if (!selectedClient) {
      toast.error("Please select a client");
      return;
    }

    const data = {
      client_id: selectedClient.id,
      client_email: selectedClient.email,
      coach_email: user.email,
      ...settings
    };

    if (accessControl) {
      updateAccessControlMutation.mutate({ id: accessControl.id, data });
    } else {
      createAccessControlMutation.mutate(data);
    }
  };

  const handleBulkSave = () => {
    if (filteredClients.length === 0) {
      toast.error("No clients to update");
      return;
    }

    if (window.confirm(`Apply these settings to all ${filteredClients.length} clients?`)) {
      bulkUpdateMutation.mutate(bulkSettings);
    }
  };

  const filteredClients = clients.filter(client =>
    client.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const isDietitian = ['super_admin', 'team_member', 'student_coach', 'student_team_member'].includes(user?.user_type);

  if (!isDietitian) {
    return (
      <div className="p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-900">
            This feature is only available for health coaches.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Client Access Manager</h1>
          <p className="text-gray-600 mt-1">Control which menu sections are visible to each client</p>
        </div>

        <Tabs defaultValue="individual" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="individual">Individual Client</TabsTrigger>
            <TabsTrigger value="bulk">All Clients</TabsTrigger>
          </TabsList>

          <TabsContent value="individual">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              {/* Client List */}
              <Card className="lg:col-span-1 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Select Client</CardTitle>
              <CardDescription>Choose a client to manage their access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-3"
              />
              {clientsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                </div>
              ) : filteredClients.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No clients found</p>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {filteredClients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                        selectedClient?.id === client.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/50'
                      }`}
                    >
                      <p className="font-semibold text-gray-900">{client.full_name}</p>
                      <p className="text-xs text-gray-600">{client.email}</p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

              {/* Access Settings */}
              <Card className="lg:col-span-2 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Menu Access Settings</CardTitle>
              <CardDescription>
                {selectedClient
                  ? `Managing access for ${selectedClient.full_name}`
                  : 'Select a client to manage their menu access'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedClient ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Eye className="w-12 h-12 mb-4" />
                  <p>Select a client to configure their menu access</p>
                </div>
              ) : accessLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </div>
              ) : (
                <div className="space-y-6">
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertCircle className="w-4 h-4 text-blue-600" />
                    <AlertDescription className="text-blue-900 text-sm">
                      Toggle switches to show or hide sections in the client's menu. Changes take effect immediately after saving.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sections.map((section) => {
                      const Icon = section.icon;
                      return (
                        <div
                          key={section.key}
                          className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                            settings[section.key]
                              ? 'border-green-200 bg-green-50'
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`w-5 h-5 ${
                              settings[section.key] ? 'text-green-600' : 'text-gray-400'
                            }`} />
                            <Label
                              htmlFor={section.key}
                              className={`cursor-pointer ${
                                settings[section.key] ? 'text-gray-900' : 'text-gray-500'
                              }`}
                            >
                              {section.label}
                            </Label>
                          </div>
                          <Switch
                            id={section.key}
                            checked={settings[section.key]}
                            onCheckedChange={(checked) =>
                              setSettings({ ...settings, [section.key]: checked })
                            }
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                      onClick={handleSave}
                      className="bg-gradient-to-r from-orange-500 to-red-500"
                      disabled={createAccessControlMutation.isPending || updateAccessControlMutation.isPending}
                    >
                      {(createAccessControlMutation.isPending || updateAccessControlMutation.isPending) ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bulk">
            <Card className="mt-6 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Apply Settings to All Clients
                </CardTitle>
                <CardDescription>
                  Configure menu access for all {filteredClients.length} clients at once
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <AlertDescription className="text-amber-900 text-sm">
                      These settings will be applied to all {filteredClients.length} clients. Existing settings will be overwritten.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sections.map((section) => {
                      const Icon = section.icon;
                      return (
                        <div
                          key={section.key}
                          className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                            bulkSettings[section.key]
                              ? 'border-green-200 bg-green-50'
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`w-5 h-5 ${
                              bulkSettings[section.key] ? 'text-green-600' : 'text-gray-400'
                            }`} />
                            <Label
                              htmlFor={`bulk-${section.key}`}
                              className={`cursor-pointer ${
                                bulkSettings[section.key] ? 'text-gray-900' : 'text-gray-500'
                              }`}
                            >
                              {section.label}
                            </Label>
                          </div>
                          <Switch
                            id={`bulk-${section.key}`}
                            checked={bulkSettings[section.key]}
                            onCheckedChange={(checked) =>
                              setBulkSettings({ ...bulkSettings, [section.key]: checked })
                            }
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                      onClick={handleBulkSave}
                      className="bg-gradient-to-r from-orange-500 to-red-500"
                      disabled={bulkUpdateMutation.isPending || filteredClients.length === 0}
                    >
                      {bulkUpdateMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Applying to {filteredClients.length} clients...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Apply to All {filteredClients.length} Clients
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}