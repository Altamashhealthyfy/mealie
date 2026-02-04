import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, Clock, Mail, Settings, Users, Calendar, Activity, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

export default function ReminderManagement() {
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [reminderSettings, setReminderSettings] = useState({
    progress_reminders_enabled: false,
    progress_reminder_frequency: 'daily',
    progress_reminder_time: '09:00',
    progress_reminder_days: [1, 2, 3, 4, 5],
    weigh_in_reminders: true,
    meal_log_reminders: true,
    exercise_reminders: true,
    mpess_reminders: true,
    appointment_reminders_enabled: true,
    appointment_reminder_hours_before: 24,
    reminder_method: 'both',
    custom_message: '',
    is_active: true
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      if (user?.user_type === 'super_admin' || user?.user_type === 'team_member') {
        return await base44.entities.Client.list('-created_date', 10000);
      } else {
        return await base44.entities.Client.filter({ assigned_coach: user?.email });
      }
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: allReminderSettings } = useQuery({
    queryKey: ['reminderSettings'],
    queryFn: async () => {
      if (user?.user_type === 'super_admin' || user?.user_type === 'team_member') {
        return await base44.entities.ReminderSettings.list('', 10000);
      } else {
        return await base44.entities.ReminderSettings.filter({ coach_email: user?.email });
      }
    },
    enabled: !!user,
    initialData: [],
  });

  const saveReminderMutation = useMutation({
    mutationFn: async (data) => {
      const existing = allReminderSettings.find(s => s.client_id === data.client_id);
      if (existing) {
        return await base44.entities.ReminderSettings.update(existing.id, data);
      } else {
        return await base44.entities.ReminderSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['reminderSettings']);
      setEditDialog(false);
      toast.success('Reminder settings saved successfully!');
    },
    onError: (error) => {
      toast.error('Failed to save settings: ' + error.message);
    }
  });

  const handleEditClient = (client) => {
    setSelectedClient(client);
    const existing = allReminderSettings.find(s => s.client_id === client.id);
    
    if (existing) {
      setReminderSettings({
        progress_reminders_enabled: existing.progress_reminders_enabled || false,
        progress_reminder_frequency: existing.progress_reminder_frequency || 'daily',
        progress_reminder_time: existing.progress_reminder_time || '09:00',
        progress_reminder_days: existing.progress_reminder_days || [1, 2, 3, 4, 5],
        weigh_in_reminders: existing.weigh_in_reminders ?? true,
        meal_log_reminders: existing.meal_log_reminders ?? true,
        exercise_reminders: existing.exercise_reminders ?? true,
        mpess_reminders: existing.mpess_reminders ?? true,
        appointment_reminders_enabled: existing.appointment_reminders_enabled ?? true,
        appointment_reminder_hours_before: existing.appointment_reminder_hours_before || 24,
        reminder_method: existing.reminder_method || 'both',
        custom_message: existing.custom_message || '',
        is_active: existing.is_active ?? true
      });
    } else {
      setReminderSettings({
        progress_reminders_enabled: false,
        progress_reminder_frequency: 'daily',
        progress_reminder_time: '09:00',
        progress_reminder_days: [1, 2, 3, 4, 5],
        weigh_in_reminders: true,
        meal_log_reminders: true,
        exercise_reminders: true,
        mpess_reminders: true,
        appointment_reminders_enabled: true,
        appointment_reminder_hours_before: 24,
        reminder_method: 'both',
        custom_message: '',
        is_active: true
      });
    }
    
    setEditDialog(true);
  };

  const handleSave = () => {
    saveReminderMutation.mutate({
      client_id: selectedClient.id,
      client_email: selectedClient.email,
      client_name: selectedClient.full_name,
      coach_email: user?.email,
      ...reminderSettings
    });
  };

  const filteredClients = clients.filter(c =>
    c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Reminder Management</h1>
            <p className="text-gray-600">Configure automated reminders for your clients</p>
          </div>
          <Bell className="w-10 h-10 text-orange-500" />
        </div>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map(client => {
            const settings = allReminderSettings.find(s => s.client_id === client.id);
            const hasReminders = settings?.progress_reminders_enabled || settings?.appointment_reminders_enabled;
            
            return (
              <Card key={client.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900">{client.full_name}</h3>
                      <p className="text-sm text-gray-600">{client.email}</p>
                    </div>
                    <Users className="w-5 h-5 text-gray-400" />
                  </div>

                  {settings && (
                    <div className="space-y-2 mb-4">
                      {settings.progress_reminders_enabled && (
                        <Badge className="bg-green-100 text-green-700">
                          <Activity className="w-3 h-3 mr-1" />
                          Progress Reminders
                        </Badge>
                      )}
                      {settings.appointment_reminders_enabled && (
                        <Badge className="bg-blue-100 text-blue-700">
                          <Calendar className="w-3 h-3 mr-1" />
                          Appointment Reminders
                        </Badge>
                      )}
                      {!settings.is_active && (
                        <Badge className="bg-red-100 text-red-700">Paused</Badge>
                      )}
                    </div>
                  )}

                  {!hasReminders && (
                    <p className="text-sm text-gray-500 mb-4">No reminders configured</p>
                  )}

                  <Button
                    onClick={() => handleEditClient(client)}
                    variant="outline"
                    className="w-full"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Configure Reminders
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {selectedClient && (
          <Dialog open={editDialog} onOpenChange={setEditDialog}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-orange-500" />
                  Reminder Settings: {selectedClient.full_name}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Master Switch */}
                <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-none">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">Master Control</p>
                        <p className="text-sm opacity-90">Enable/disable all reminders</p>
                      </div>
                      <Switch
                        checked={reminderSettings.is_active}
                        onCheckedChange={(checked) => setReminderSettings(prev => ({ ...prev, is_active: checked }))}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Progress Reminders */}
                <Card className="border-2 border-green-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Activity className="w-5 h-5 text-green-600" />
                      Progress Logging Reminders
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Enable Progress Reminders</Label>
                      <Switch
                        checked={reminderSettings.progress_reminders_enabled}
                        onCheckedChange={(checked) => setReminderSettings(prev => ({ ...prev, progress_reminders_enabled: checked }))}
                      />
                    </div>

                    {reminderSettings.progress_reminders_enabled && (
                      <>
                        <div className="space-y-2">
                          <Label>Reminder Frequency</Label>
                          <Select
                            value={reminderSettings.progress_reminder_frequency}
                            onValueChange={(value) => setReminderSettings(prev => ({ ...prev, progress_reminder_frequency: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Every Day</SelectItem>
                              <SelectItem value="every_2_days">Every 2 Days</SelectItem>
                              <SelectItem value="weekly">Specific Days of Week</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {reminderSettings.progress_reminder_frequency === 'weekly' && (
                          <div className="space-y-2">
                            <Label>Select Days</Label>
                            <div className="grid grid-cols-4 gap-2">
                              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <Checkbox
                                    checked={reminderSettings.progress_reminder_days?.includes(idx)}
                                    onCheckedChange={(checked) => {
                                      const days = [...(reminderSettings.progress_reminder_days || [])];
                                      if (checked) {
                                        days.push(idx);
                                      } else {
                                        const index = days.indexOf(idx);
                                        if (index > -1) days.splice(index, 1);
                                      }
                                      setReminderSettings(prev => ({ ...prev, progress_reminder_days: days }));
                                    }}
                                  />
                                  <Label className="text-sm">{day}</Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>Reminder Time</Label>
                          <Input
                            type="time"
                            value={reminderSettings.progress_reminder_time}
                            onChange={(e) => setReminderSettings(prev => ({ ...prev, progress_reminder_time: e.target.value }))}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>What to remind about:</Label>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={reminderSettings.weigh_in_reminders}
                                onCheckedChange={(checked) => setReminderSettings(prev => ({ ...prev, weigh_in_reminders: checked }))}
                              />
                              <Label>Daily Weigh-in</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={reminderSettings.meal_log_reminders}
                                onCheckedChange={(checked) => setReminderSettings(prev => ({ ...prev, meal_log_reminders: checked }))}
                              />
                              <Label>Meal Logging</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={reminderSettings.exercise_reminders}
                                onCheckedChange={(checked) => setReminderSettings(prev => ({ ...prev, exercise_reminders: checked }))}
                              />
                              <Label>Exercise Tracking</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={reminderSettings.mpess_reminders}
                                onCheckedChange={(checked) => setReminderSettings(prev => ({ ...prev, mpess_reminders: checked }))}
                              />
                              <Label>MPESS Wellness</Label>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Custom Message (Optional)</Label>
                          <Textarea
                            placeholder="Add a personal touch to the reminder..."
                            value={reminderSettings.custom_message}
                            onChange={(e) => setReminderSettings(prev => ({ ...prev, custom_message: e.target.value }))}
                            rows={3}
                          />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Appointment Reminders */}
                <Card className="border-2 border-blue-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      Appointment Reminders
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Enable Appointment Reminders</Label>
                      <Switch
                        checked={reminderSettings.appointment_reminders_enabled}
                        onCheckedChange={(checked) => setReminderSettings(prev => ({ ...prev, appointment_reminders_enabled: checked }))}
                      />
                    </div>

                    {reminderSettings.appointment_reminders_enabled && (
                      <div className="space-y-2">
                        <Label>Send Reminder (Hours Before)</Label>
                        <Select
                          value={reminderSettings.appointment_reminder_hours_before.toString()}
                          onValueChange={(value) => setReminderSettings(prev => ({ ...prev, appointment_reminder_hours_before: parseInt(value) }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 hour before</SelectItem>
                            <SelectItem value="2">2 hours before</SelectItem>
                            <SelectItem value="4">4 hours before</SelectItem>
                            <SelectItem value="12">12 hours before</SelectItem>
                            <SelectItem value="24">24 hours before</SelectItem>
                            <SelectItem value="48">48 hours before</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Reminder Method */}
                <Card className="border-2 border-purple-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Mail className="w-5 h-5 text-purple-600" />
                      Reminder Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={reminderSettings.reminder_method}
                      onValueChange={(value) => setReminderSettings(prev => ({ ...prev, reminder_method: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">Email + In-App Notification</SelectItem>
                        <SelectItem value="email">Email Only</SelectItem>
                        <SelectItem value="notification">In-App Notification Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                <div className="flex gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setEditDialog(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saveReminderMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-500"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    {saveReminderMutation.isPending ? 'Saving...' : 'Save Settings'}
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