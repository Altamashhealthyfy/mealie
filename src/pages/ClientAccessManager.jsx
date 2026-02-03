import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

const menuSections = [
  { key: 'show_my_dashboard', label: '📊 My Dashboard' },
  { key: 'show_my_plans', label: '💳 My Plans' },
  { key: 'show_my_meal_plan', label: '🍽️ My Meal Plan' },
  { key: 'show_food_log', label: '📝 Food Log' },
  { key: 'show_my_progress', label: '📈 My Progress' },
  { key: 'show_mpess_wellness', label: '❤️ MPESS Wellness' },
  { key: 'show_messages', label: '💬 Messages' },
  { key: 'show_my_assessments', label: '📋 My Assessments' },
  { key: 'show_my_appointments', label: '📅 My Appointments' },
  { key: 'show_recipe_library', label: '🍳 Recipe Library' },
  { key: 'show_food_lookup', label: '🔍 Food Lookup' },
  { key: 'show_resources', label: '📚 Resources' },
  { key: 'show_my_profile', label: '👤 My Profile' },
];

export default function ClientAccessManager() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: coachPlan } = useQuery({
    queryKey: ['coachPlan', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const subs = await base44.entities.HealthCoachSubscription.filter({
        coach_email: user.email,
        status: 'active'
      });
      if (!subs[0]) return null;
      const plans = await base44.entities.HealthCoachPlan.filter({ id: subs[0].plan_id });
      return plans[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: clients } = useQuery({
    queryKey: ['myClients', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const allClients = await base44.entities.Client.filter({
        assigned_coach: { $in: [user.email] }
      });
      return allClients;
    },
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: accessControls } = useQuery({
    queryKey: ['clientAccessControls', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const controls = await base44.entities.ClientAccessControl.filter({
        coach_email: user.email
      });
      return controls;
    },
    enabled: !!user?.email,
    initialData: [],
  });

  const updateAccessMutation = useMutation({
    mutationFn: async ({ clientId, clientEmail, settings }) => {
      const existing = accessControls.find(ac => ac.client_id === clientId);
      if (existing) {
        return base44.entities.ClientAccessControl.update(existing.id, {
          ...settings,
          client_id: clientId,
          client_email: clientEmail,
          coach_email: user.email,
        });
      } else {
        return base44.entities.ClientAccessControl.create({
          client_id: clientId,
          client_email: clientEmail,
          coach_email: user.email,
          ...settings,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clientAccessControls']);
    },
  });

  const filteredClients = clients.filter(client =>
    client.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getClientAccessControl = (clientId) => {
    return accessControls.find(ac => ac.client_id === clientId) || {};
  };

  const handleToggleSection = (clientId, clientEmail, section) => {
    const control = getClientAccessControl(clientId);
    const settings = {
      show_my_dashboard: control.show_my_dashboard ?? true,
      show_my_plans: control.show_my_plans ?? true,
      show_my_meal_plan: control.show_my_meal_plan ?? true,
      show_food_log: control.show_food_log ?? true,
      show_my_progress: control.show_my_progress ?? true,
      show_mpess_wellness: control.show_mpess_wellness ?? true,
      show_messages: control.show_messages ?? true,
      show_my_assessments: control.show_my_assessments ?? true,
      show_my_appointments: control.show_my_appointments ?? true,
      show_recipe_library: control.show_recipe_library ?? true,
      show_food_lookup: control.show_food_lookup ?? true,
      show_resources: control.show_resources ?? true,
      show_my_profile: control.show_my_profile ?? true,
    };
    settings[section] = !settings[section];
    updateAccessMutation.mutate({ clientId, clientEmail, settings });
  };

  if (!coachPlan?.can_manage_client_access && user?.user_type !== 'super_admin') {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="w-5 h-5" />
          <AlertDescription>
            This feature is not included in your plan. Upgrade to Pro to control individual client menu access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Client Access Manager</h1>
          <p className="text-gray-600">Control which menu sections are visible to each client</p>
        </div>

        <div className="mb-6">
          <Input
            placeholder="Search clients by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>

        {filteredClients.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">No clients found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {filteredClients.map((client) => {
              const control = getClientAccessControl(client.id);
              return (
                <Card key={client.id} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{client.full_name}</CardTitle>
                        <p className="text-sm text-gray-500">{client.email}</p>
                      </div>
                      {selectedClient === client.id && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          Expanded
                        </span>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {menuSections.map(({ key, label }) => (
                        <div
                          key={key}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <label className="flex items-center gap-2 flex-1 cursor-pointer">
                            <span className="text-sm font-medium text-gray-700">{label}</span>
                          </label>
                          <Switch
                            checked={control[key] ?? true}
                            onCheckedChange={() => handleToggleSection(client.id, client.email, key)}
                            className="ml-2"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 text-xs text-gray-500">
                      {Object.values(control).filter(v => v === true).length || menuSections.length} of {menuSections.length} sections visible
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}