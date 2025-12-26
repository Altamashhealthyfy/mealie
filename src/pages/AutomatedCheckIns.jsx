import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Mail, MessageSquare, Clock, Calendar, Settings, Users, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function AutomatedCheckIns() {
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [configData, setConfigData] = useState({});

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list('-created_date');
      if (user?.user_type === 'super_admin') {
        return allClients;
      }
      return allClients.filter(client => client.created_by === user?.email);
    },
    enabled: !!user,
  });

  const { data: configurations = [] } = useQuery({
    queryKey: ['checkInConfigurations'],
    queryFn: () => base44.entities.CheckInConfiguration.list(),
    initialData: [],
  });

  const { data: progressLogs = [] } = useQuery({
    queryKey: ['recentProgressLogs'],
    queryFn: () => base44.entities.ProgressLog.list('-date', 100),
    initialData: [],
  });

  const createConfigMutation = useMutation({
    mutationFn: (data) => base44.entities.CheckInConfiguration.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['checkInConfigurations']);
      setShowConfigDialog(false);
      setSelectedClient(null);
      alert('✅ Check-in configuration created!');
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CheckInConfiguration.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['checkInConfigurations']);
      setShowConfigDialog(false);
      setSelectedClient(null);
      alert('✅ Configuration updated!');
    },
  });

  const toggleConfigMutation = useMutation({
    mutationFn: ({ id, enabled }) => base44.entities.CheckInConfiguration.update(id, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries(['checkInConfigurations']);
    },
  });

  const handleConfigureClient = (client) => {
    setSelectedClient(client);
    const existingConfig = configurations.find(c => c.client_id === client.id);
    
    if (existingConfig) {
      setConfigData(existingConfig);
    } else {
      setConfigData({
        client_id: client.id,
        enabled: true,
        frequency: 'weekly',
        reminder_time: '09:00',
        reminder_method: 'email',
        check_in_type: ['weight', 'adherence'],
        coach_digest_enabled: true,
        inactivity_alert_days: 3,
      });
    }
    setShowConfigDialog(true);
  };

  const handleSaveConfig = () => {
    if (configData.id) {
      updateConfigMutation.mutate({ id: configData.id, data: configData });
    } else {
      createConfigMutation.mutate(configData);
    }
  };

  const handleToggleCheckInType = (type) => {
    const current = configData.check_in_type || [];
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    setConfigData({ ...configData, check_in_type: updated });
  };

  // Calculate inactive clients
  const inactiveClients = clients.filter(client => {
    const clientLogs = progressLogs.filter(log => log.client_id === client.id);
    if (clientLogs.length === 0) return true;
    
    const lastLog = clientLogs[0];
    const daysSince = Math.floor((new Date() - new Date(lastLog.date)) / (1000 * 60 * 60 * 24));
    return daysSince >= 3;
  });

  const clientsWithConfig = clients.filter(c => configurations.some(config => config.client_id === c.id && config.enabled));

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Automated Check-Ins</h1>
            <p className="text-gray-600">Set up automated reminders and activity digests</p>
          </div>
          <Bell className="w-12 h-12 text-orange-500" />
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Active Check-Ins</p>
                  <p className="text-3xl font-bold text-blue-600">{clientsWithConfig.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Inactive Clients</p>
                  <p className="text-3xl font-bold text-orange-600">{inactiveClients.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Mail className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Email Reminders</p>
                  <p className="text-3xl font-bold text-green-600">
                    {configurations.filter(c => c.reminder_method === 'email' || c.reminder_method === 'both').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Clients</p>
                  <p className="text-3xl font-bold text-purple-600">{clients.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="clients" className="space-y-6">
          <TabsList className="grid grid-cols-2 bg-white/80 backdrop-blur">
            <TabsTrigger value="clients">Client Check-Ins</TabsTrigger>
            <TabsTrigger value="inactive">Inactive Alerts</TabsTrigger>
          </TabsList>

          {/* Client Check-Ins */}
          <TabsContent value="clients">
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle>Configure Client Check-Ins</CardTitle>
                <CardDescription>Set up automated reminders for each client</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clients.map(client => {
                    const config = configurations.find(c => c.client_id === client.id);
                    const hasConfig = !!config;
                    
                    return (
                      <div key={client.id} className="p-4 border-2 border-gray-200 rounded-lg hover:border-orange-300 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-bold text-gray-900">{client.full_name}</h3>
                              {hasConfig && (
                                <Badge className={config.enabled ? "bg-green-500" : "bg-gray-400"}>
                                  {config.enabled ? 'Active' : 'Disabled'}
                                </Badge>
                              )}
                            </div>
                            {hasConfig && config.enabled && (
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {config.frequency} at {config.reminder_time}
                                </div>
                                <div className="flex items-center gap-1">
                                  {config.reminder_method === 'email' && <Mail className="w-4 h-4" />}
                                  {config.reminder_method === 'whatsapp' && <MessageSquare className="w-4 h-4" />}
                                  {config.reminder_method === 'both' && (
                                    <>
                                      <Mail className="w-4 h-4" />
                                      <MessageSquare className="w-4 h-4" />
                                    </>
                                  )}
                                  {config.reminder_method}
                                </div>
                                {config.last_reminder_sent && (
                                  <div className="text-xs">
                                    Last: {format(new Date(config.last_reminder_sent), 'MMM d, h:mm a')}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {hasConfig && (
                              <Switch
                                checked={config.enabled}
                                onCheckedChange={(checked) => 
                                  toggleConfigMutation.mutate({ id: config.id, enabled: checked })
                                }
                              />
                            )}
                            <Button
                              onClick={() => handleConfigureClient(client)}
                              size="sm"
                              variant="outline"
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              {hasConfig ? 'Edit' : 'Setup'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inactive Alerts */}
          <TabsContent value="inactive">
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                  Clients Needing Check-In ({inactiveClients.length})
                </CardTitle>
                <CardDescription>Clients who haven't logged progress in 3+ days</CardDescription>
              </CardHeader>
              <CardContent>
                {inactiveClients.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {inactiveClients.map(client => {
                      const lastLog = progressLogs.find(log => log.client_id === client.id);
                      const daysSince = lastLog 
                        ? Math.floor((new Date() - new Date(lastLog.date)) / (1000 * 60 * 60 * 24))
                        : 999;
                      
                      return (
                        <Card key={client.id} className="border-2 border-orange-200 bg-orange-50">
                          <CardContent className="p-4">
                            <h3 className="font-bold text-gray-900 mb-2">{client.full_name}</h3>
                            <p className="text-sm text-orange-700 mb-3">
                              {lastLog ? `${daysSince} days since last log` : 'Never logged'}
                            </p>
                            <Button
                              onClick={() => handleConfigureClient(client)}
                              size="sm"
                              className="w-full"
                              variant="outline"
                            >
                              Setup Reminder
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">All Clients Active!</h3>
                    <p className="text-gray-600">Everyone has logged activity recently</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Configuration Dialog */}
        <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Configure Check-Ins for {selectedClient?.full_name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900">Enable Automated Check-Ins</p>
                  <p className="text-sm text-gray-600">Send reminders to log progress</p>
                </div>
                <Switch
                  checked={configData.enabled}
                  onCheckedChange={(checked) => setConfigData({ ...configData, enabled: checked })}
                />
              </div>

              {configData.enabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Reminder Frequency</Label>
                      <Select 
                        value={configData.frequency} 
                        onValueChange={(value) => setConfigData({ ...configData, frequency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Reminder Time</Label>
                      <Input
                        type="time"
                        value={configData.reminder_time}
                        onChange={(e) => setConfigData({ ...configData, reminder_time: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Delivery Method</Label>
                    <Select 
                      value={configData.reminder_method} 
                      onValueChange={(value) => setConfigData({ ...configData, reminder_method: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email Only</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp Only</SelectItem>
                        <SelectItem value="both">Both Email & WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label>What to Track</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'weight', label: 'Weight', icon: '⚖️' },
                        { value: 'measurements', label: 'Measurements', icon: '📏' },
                        { value: 'mood', label: 'Mood', icon: '😊' },
                        { value: 'adherence', label: 'Adherence', icon: '✓' },
                        { value: 'photos', label: 'Photos', icon: '📸' },
                      ].map(item => (
                        <div
                          key={item.value}
                          onClick={() => handleToggleCheckInType(item.value)}
                          className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                            (configData.check_in_type || []).includes(item.value)
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{item.icon}</span>
                            <span className="font-semibold">{item.label}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">Coach Daily Digest</p>
                        <p className="text-sm text-gray-600">Receive daily activity summary</p>
                      </div>
                      <Switch
                        checked={configData.coach_digest_enabled}
                        onCheckedChange={(checked) => setConfigData({ ...configData, coach_digest_enabled: checked })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Inactivity Alert (days)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="14"
                        value={configData.inactivity_alert_days}
                        onChange={(e) => setConfigData({ ...configData, inactivity_alert_days: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfigDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveConfig}
                  disabled={createConfigMutation.isPending || updateConfigMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-500"
                >
                  {createConfigMutation.isPending || updateConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}