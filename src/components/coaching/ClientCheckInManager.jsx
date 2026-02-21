import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Bell, Trash2, Edit2, Plus, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function ClientCheckInManager({ client }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [selectedDays, setSelectedDays] = useState([]);

  const [formData, setFormData] = useState({
    message_type: 'meal_logging',
    frequency: 'daily',
    schedule_time: '09:00',
    send_push_notification: true,
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    max_sends: '',
    notes: '',
    custom_message: ''
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['checkInSchedules', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      return await base44.entities.ClientCheckInSchedule.filter({
        client_id: client.id
      });
    },
    enabled: !!client?.id,
  });

  const createScheduleMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientCheckInSchedule.create({
      ...data,
      client_id: client.id,
      client_email: client.email,
      coach_email: user?.email,
      days_of_week: selectedDays.length > 0 ? selectedDays : undefined
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['checkInSchedules', client?.id]);
      resetForm();
      setShowDialog(false);
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientCheckInSchedule.update(editingSchedule.id, {
      ...data,
      days_of_week: selectedDays.length > 0 ? selectedDays : editingSchedule.days_of_week
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['checkInSchedules', client?.id]);
      resetForm();
      setShowDialog(false);
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientCheckInSchedule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['checkInSchedules', client?.id]);
    },
  });

  const toggleScheduleMutation = useMutation({
    mutationFn: (schedule) => 
      base44.entities.ClientCheckInSchedule.update(schedule.id, {
        is_active: !schedule.is_active
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['checkInSchedules', client?.id]);
    },
  });

  const resetForm = () => {
    setFormData({
      message_type: 'meal_logging',
      frequency: 'daily',
      schedule_time: '09:00',
      send_push_notification: true,
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: '',
      max_sends: '',
      notes: '',
      custom_message: ''
    });
    setSelectedDays([]);
    setEditingSchedule(null);
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      message_type: schedule.message_type,
      frequency: schedule.frequency,
      schedule_time: schedule.schedule_time,
      send_push_notification: schedule.send_push_notification,
      start_date: schedule.start_date || '',
      end_date: schedule.end_date || '',
      max_sends: schedule.max_sends || '',
      notes: schedule.notes || '',
      custom_message: schedule.custom_message || ''
    });
    setSelectedDays(schedule.days_of_week || []);
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (editingSchedule) {
      updateScheduleMutation.mutate(formData);
    } else {
      createScheduleMutation.mutate(formData);
    }
  };

  const messageTypeLabels = {
    meal_logging: '🍽️ Meal Logging',
    water_intake: '💧 Water Intake',
    workout: '💪 Workout',
    wellbeing: '🧘 Wellbeing Check',
    custom: '💬 Custom Message'
  };

  const frequencyLabels = {
    daily: 'Daily',
    weekly: 'Weekly',
    biweekly: 'Biweekly',
    monthly: 'Monthly'
  };

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Automated Check-In Reminders</h3>
        <Button
          onClick={() => {
            resetForm();
            setShowDialog(true);
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Reminder
        </Button>
      </div>

      {schedules.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Bell className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No check-in reminders set up yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <Card key={schedule.id} className={schedule.is_active ? '' : 'opacity-60'}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-blue-100 text-blue-800">
                        {messageTypeLabels[schedule.message_type]}
                      </Badge>
                      <Badge variant="outline">
                        <Clock className="w-3 h-3 mr-1" />
                        {schedule.schedule_time}
                      </Badge>
                      {!schedule.is_active && (
                        <Badge className="bg-gray-100 text-gray-700">Paused</Badge>
                      )}
                    </div>

                    <p className="text-sm text-gray-700 mb-2">
                      <strong>{frequencyLabels[schedule.frequency]}</strong>
                      {schedule.frequency === 'weekly' && schedule.days_of_week && (
                        <span className="text-gray-600 ml-2">
                          on {schedule.days_of_week.map(d => days[d]).join(', ')}
                        </span>
                      )}
                      {schedule.frequency === 'monthly' && (
                        <span className="text-gray-600 ml-2">
                          on day {schedule.day_of_month}
                        </span>
                      )}
                    </p>

                    {schedule.send_push_notification && (
                      <p className="text-xs text-blue-600 flex items-center gap-1">
                        <Bell className="w-3 h-3" />
                        Push notifications enabled
                      </p>
                    )}

                    {schedule.last_sent_date && (
                      <p className="text-xs text-gray-500 mt-1">
                        Last sent: {format(new Date(schedule.last_sent_date), 'MMM d, yyyy h:mm a')}
                      </p>
                    )}

                    {schedule.times_sent > 0 && (
                      <p className="text-xs text-gray-500">
                        Sent {schedule.times_sent} time{schedule.times_sent !== 1 ? 's' : ''}
                        {schedule.max_sends && ` / ${schedule.max_sends}`}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleScheduleMutation.mutate(schedule)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      {schedule.is_active ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(schedule)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? 'Edit Check-In Reminder' : 'Create Check-In Reminder'}
            </DialogTitle>
            <DialogDescription>
              Schedule automated messages for {client?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Message Type *</Label>
              <Select
                value={formData.message_type}
                onValueChange={(value) => setFormData({ ...formData, message_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meal_logging">🍽️ Meal Logging Reminder</SelectItem>
                  <SelectItem value="water_intake">💧 Water Intake Reminder</SelectItem>
                  <SelectItem value="workout">💪 Workout Reminder</SelectItem>
                  <SelectItem value="wellbeing">🧘 Wellbeing Check-In</SelectItem>
                  <SelectItem value="custom">💬 Custom Message</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.message_type === 'custom' && (
              <div className="space-y-2">
                <Label>Custom Message *</Label>
                <Textarea
                  value={formData.custom_message}
                  onChange={(e) => setFormData({ ...formData, custom_message: e.target.value })}
                  placeholder="Enter your custom message"
                  rows={3}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Frequency *</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => {
                  setFormData({ ...formData, frequency: value });
                  setSelectedDays([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.frequency === 'weekly' && (
              <div className="space-y-2">
                <Label>Select Days</Label>
                <div className="grid grid-cols-7 gap-2">
                  {days.map((day, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant={selectedDays.includes(index) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSelectedDays(
                          selectedDays.includes(index)
                            ? selectedDays.filter(d => d !== index)
                            : [...selectedDays, index]
                        );
                      }}
                      className="h-9"
                    >
                      {day}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {formData.frequency === 'monthly' && (
              <div className="space-y-2">
                <Label>Day of Month (1-31) *</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="1"
                  value={editingSchedule?.day_of_month || ''}
                  onChange={(e) => setFormData({ ...formData, day_of_month: parseInt(e.target.value) })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Time to Send *</Label>
              <Input
                type="time"
                value={formData.schedule_time}
                onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>End Date (Optional)</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Max Sends (Optional)</Label>
              <Input
                type="number"
                min="1"
                placeholder="Leave empty for unlimited"
                value={formData.max_sends}
                onChange={(e) => setFormData({ ...formData, max_sends: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.send_push_notification}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, send_push_notification: checked })
                }
              />
              <Label className="cursor-pointer">Send push notifications</Label>
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Coaching notes"
                rows={2}
              />
            </div>

            <Alert className="bg-blue-50 border-blue-300">
              <AlertDescription className="text-sm text-blue-900">
                This client will receive automated reminders based on this schedule with optional push notifications.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  resetForm();
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {editingSchedule ? 'Update' : 'Create'} Reminder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}