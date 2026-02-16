import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Bell, Plus, Trash2, Edit, Clock, Mail, User, Calendar, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function ReminderManagement() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [selectedClient, setSelectedClient] = useState('');
  const [reminderData, setReminderData] = useState({
    reminder_type: 'daily_progress',
    frequency: 'daily',
    notification_method: 'both',
    time_of_day: '09:00',
    days_of_week: [],
    is_active: true,
    conditions: {
      only_if_not_completed: true,
      grace_period_hours: 2
    }
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      if (user?.user_type === 'super_admin') {
        return await base44.entities.Client.list();
      } else {
        return await base44.entities.Client.filter({ assigned_coach: user?.email });
      }
    },
    enabled: !!user
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ['reminders', user?.email],
    queryFn: () => base44.entities.ReminderSettings.filter({ coach_email: user?.email }),
    enabled: !!user
  });

  const createReminderMutation = useMutation({
    mutationFn: (data) => base44.entities.ReminderSettings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      setShowCreateDialog(false);
      setEditingReminder(null);
      resetForm();
      toast.success("Reminder created successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to create reminder: ${error.message}`);
    }
  });

  const updateReminderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ReminderSettings.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      setShowCreateDialog(false);
      setEditingReminder(null);
      resetForm();
      toast.success("Reminder updated successfully!");
    }
  });

  const deleteReminderMutation = useMutation({
    mutationFn: (id) => base44.entities.ReminderSettings.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success("Reminder deleted!");
    }
  });

  const toggleReminderMutation = useMutation({
    mutationFn: ({ id, isActive }) => 
      base44.entities.ReminderSettings.update(id, { is_active: isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success("Reminder updated!");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedClient) {
      toast.error("Please select a client");
      return;
    }

    const data = {
      ...reminderData,
      client_id: selectedClient,
      coach_email: user?.email
    };

    if (editingReminder) {
      updateReminderMutation.mutate({ id: editingReminder.id, data });
    } else {
      createReminderMutation.mutate(data);
    }
  };

  const handleEdit = (reminder) => {
    setEditingReminder(reminder);
    setSelectedClient(reminder.client_id);
    setReminderData({
      reminder_type: reminder.reminder_type,
      title: reminder.title,
      message: reminder.message,
      frequency: reminder.frequency,
      time_of_day: reminder.time_of_day,
      days_of_week: reminder.days_of_week || [],
      notification_method: reminder.notification_method,
      is_active: reminder.is_active,
      conditions: reminder.conditions || { only_if_not_completed: true }
    });
    setShowCreateDialog(true);
  };

  const resetForm = () => {
    setSelectedClient('');
    setReminderData({
      reminder_type: 'daily_progress',
      frequency: 'daily',
      notification_method: 'both',
      time_of_day: '09:00',
      days_of_week: [],
      is_active: true,
      conditions: {
        only_if_not_completed: true,
        grace_period_hours: 2
      }
    });
  };

  const toggleDay = (day) => {
    const days = reminderData.days_of_week || [];
    if (days.includes(day)) {
      setReminderData({
        ...reminderData,
        days_of_week: days.filter(d => d !== day)
      });
    } else {
      setReminderData({
        ...reminderData,
        days_of_week: [...days, day].sort()
      });
    }
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.full_name || 'Unknown';
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Bell className="w-8 h-8 text-orange-500" />
              Reminder Management
            </h1>
            <p className="text-gray-600 mt-1">Configure automated reminders for your clients</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Reminder
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingReminder ? 'Edit Reminder' : 'Create New Reminder'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Select Client</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.full_name} - {client.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Reminder Type</Label>
                  <Select
                    value={reminderData.reminder_type}
                    onValueChange={(value) => setReminderData({...reminderData, reminder_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily_progress">Daily Progress Log</SelectItem>
                      <SelectItem value="food_log">Food Log</SelectItem>
                      <SelectItem value="appointment">Appointment</SelectItem>
                      <SelectItem value="challenge">Challenge Engagement</SelectItem>
                      <SelectItem value="meal_plan_review">Meal Plan Review</SelectItem>
                      <SelectItem value="custom">Custom Reminder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Title</Label>
                  <Input
                    placeholder="Reminder title..."
                    value={reminderData.title || ''}
                    onChange={(e) => setReminderData({...reminderData, title: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label>Custom Message (Optional)</Label>
                  <Textarea
                    placeholder="Add a custom message..."
                    value={reminderData.message || ''}
                    onChange={(e) => setReminderData({...reminderData, message: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Frequency</Label>
                    <Select
                      value={reminderData.frequency}
                      onValueChange={(value) => setReminderData({...reminderData, frequency: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Time of Day</Label>
                    <Input
                      type="time"
                      value={reminderData.time_of_day || ''}
                      onChange={(e) => setReminderData({...reminderData, time_of_day: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Days of Week</Label>
                  <div className="flex gap-2">
                    {dayNames.map((day, idx) => (
                      <Button
                        key={idx}
                        type="button"
                        variant={(reminderData.days_of_week || []).includes(idx) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleDay(idx)}
                        className="flex-1"
                      >
                        {day}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Leave empty for all days</p>
                </div>

                <div>
                  <Label>Notification Method</Label>
                  <Select
                    value={reminderData.notification_method}
                    onValueChange={(value) => setReminderData({...reminderData, notification_method: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_app">In-App Only</SelectItem>
                      <SelectItem value="email">Email Only</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <Label htmlFor="only-if-not-completed" className="cursor-pointer">
                    Only send if action not completed
                  </Label>
                  <Switch
                    id="only-if-not-completed"
                    checked={reminderData.conditions?.only_if_not_completed || false}
                    onCheckedChange={(checked) => setReminderData({
                      ...reminderData,
                      conditions: {
                        ...reminderData.conditions,
                        only_if_not_completed: checked
                      }
                    })}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => {
                    setShowCreateDialog(false);
                    setEditingReminder(null);
                    resetForm();
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-gradient-to-r from-orange-500 to-red-500">
                    {editingReminder ? 'Update' : 'Create'} Reminder
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Reminders List */}
        <div className="grid gap-4">
          {reminders.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No reminders configured yet</p>
                <p className="text-sm text-gray-500 mt-2">Create your first reminder to automate client engagement</p>
              </CardContent>
            </Card>
          ) : (
            reminders.map(reminder => (
              <Card key={reminder.id} className={!reminder.is_active ? 'opacity-60' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {reminder.title}
                        {reminder.is_active ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-gray-400" />
                        )}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <User className="w-3 h-3" />
                        {getClientName(reminder.client_id)}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Switch
                        checked={reminder.is_active}
                        onCheckedChange={(checked) => 
                          toggleReminderMutation.mutate({ id: reminder.id, isActive: checked })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(reminder)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Delete this reminder?')) {
                            deleteReminderMutation.mutate(reminder.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge className="capitalize">{reminder.reminder_type.replace('_', ' ')}</Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {reminder.time_of_day}
                    </Badge>
                    <Badge variant="outline">{reminder.frequency}</Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {reminder.notification_method}
                    </Badge>
                  </div>
                  
                  {reminder.days_of_week?.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {reminder.days_of_week.map(d => dayNames[d]).join(', ')}
                      </span>
                    </div>
                  )}
                  
                  {reminder.message && (
                    <p className="text-sm text-gray-600 mt-2 italic">"{reminder.message}"</p>
                  )}
                  
                  {reminder.last_sent && (
                    <p className="text-xs text-gray-500 mt-2">
                      Last sent: {new Date(reminder.last_sent).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}