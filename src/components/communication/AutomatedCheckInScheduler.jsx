import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Zap, CheckCircle2, Copy, Trash2, Save } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const PREDEFINED_CHECKUPS = [
  {
    name: 'Weekly Check-in',
    frequency: 'weekly',
    day: 'monday',
    time: '10:00',
    message: 'Hi! 👋 It\'s time for our weekly check-in. How\'s your plan going? Any wins or challenges to discuss?',
  },
  {
    name: 'Meal Logging Reminder',
    frequency: 'daily',
    time: '20:00',
    message: 'Don\'t forget to log your meals today! 🍽️ This helps me track your progress and give better guidance.',
  },
  {
    name: 'Monday Motivation',
    frequency: 'weekly',
    day: 'monday',
    time: '08:00',
    message: 'Monday motivation! 💪 You\'ve got this! Let\'s make this week amazing. How are you feeling about your goals?',
  },
  {
    name: 'Progress Photo Request',
    frequency: 'weekly',
    day: 'friday',
    time: '18:00',
    message: 'End of week check-in! 📸 Could you share a progress photo or update on how you\'re feeling? I\'d love to see your progress!',
  },
];

export default function AutomatedCheckInScheduler({ clientEmail, clientId, onSchedule, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [schedules, setSchedules] = useState(() => {
    const saved = localStorage.getItem(`checkup_schedules_${clientId}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [showNewSchedule, setShowNewSchedule] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    frequency: 'weekly',
    day: 'monday',
    time: '10:00',
    message: '',
  });

  const saveSchedule = () => {
    if (!newSchedule.name.trim() || !newSchedule.message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    const schedule = {
      id: Date.now(),
      ...newSchedule,
      clientId,
      clientEmail,
      createdAt: new Date().toISOString(),
    };

    const updated = [...schedules, schedule];
    setSchedules(updated);
    localStorage.setItem(`checkup_schedules_${clientId}`, JSON.stringify(updated));
    
    onSchedule(schedule);
    setNewSchedule({ name: '', frequency: 'weekly', day: 'monday', time: '10:00', message: '' });
    setShowNewSchedule(false);
    toast.success('Check-in scheduled!');
  };

  const deleteSchedule = (id) => {
    const updated = schedules.filter(s => s.id !== id);
    setSchedules(updated);
    localStorage.setItem(`checkup_schedules_${clientId}`, JSON.stringify(updated));
    toast.success('Schedule removed');
  };

  const quickApplyPredefined = (predefined) => {
    const schedule = {
      id: Date.now(),
      ...predefined,
      clientId,
      clientEmail,
      createdAt: new Date().toISOString(),
    };
    const updated = [...schedules, schedule];
    setSchedules(updated);
    localStorage.setItem(`checkup_schedules_${clientId}`, JSON.stringify(updated));
    onSchedule(schedule);
    toast.success(`"${predefined.name}" scheduled!`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="border-purple-300 text-purple-700 hover:bg-purple-50 w-full flex gap-2"
        >
          <Calendar className="w-4 h-4" />
          Auto Check-in
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Automated Check-in Scheduler
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">Predefined</TabsTrigger>
            <TabsTrigger value="schedules">
              Your Schedules ({schedules.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-3 mt-4">
            <p className="text-sm text-gray-600 mb-3">
              Quick-apply predefined check-in schedules:
            </p>
            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {PREDEFINED_CHECKUPS.map((checkup, idx) => (
                <Card key={idx}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">{checkup.name}</h4>
                        <div className="flex gap-2 mb-2 flex-wrap">
                          <Badge variant="outline" className="text-xs capitalize">
                            {checkup.frequency}
                            {checkup.frequency === 'weekly' ? ` on ${checkup.day}` : ''}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {checkup.time}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-700">{checkup.message}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => quickApplyPredefined(checkup)}
                        className="bg-green-500 hover:bg-green-600 text-white flex-shrink-0"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Apply
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="schedules" className="space-y-4 mt-4">
            {schedules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-3">No automated check-ins scheduled yet</p>
                <Button onClick={() => setShowNewSchedule(true)} variant="outline">
                  Create First Schedule
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {schedules.map((schedule) => (
                  <Card key={schedule.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            {schedule.name}
                          </h4>
                          <div className="flex gap-2 mb-2 flex-wrap">
                            <Badge variant="outline" className="text-xs capitalize">
                              {schedule.frequency}
                              {schedule.frequency === 'weekly' ? ` on ${schedule.day}` : ''}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              {schedule.time}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-700">{schedule.message}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteSchedule(schedule.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Button
              onClick={() => setShowNewSchedule(!showNewSchedule)}
              variant="outline"
              className="w-full mt-4"
            >
              + Create Custom Schedule
            </Button>

            {showNewSchedule && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6 space-y-4">
                  <Input
                    placeholder="Schedule name (e.g., Monday Check-in)"
                    value={newSchedule.name}
                    onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Select value={newSchedule.frequency} onValueChange={(v) => setNewSchedule({ ...newSchedule, frequency: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                    {newSchedule.frequency === 'weekly' && (
                      <Select value={newSchedule.day} onValueChange={(v) => setNewSchedule({ ...newSchedule, day: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((d) => (
                            <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Input
                      type="time"
                      value={newSchedule.time}
                      onChange={(e) => setNewSchedule({ ...newSchedule, time: e.target.value })}
                    />
                  </div>
                  <Textarea
                    placeholder="Message to send..."
                    value={newSchedule.message}
                    onChange={(e) => setNewSchedule({ ...newSchedule, message: e.target.value })}
                    rows={3}
                    className="resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowNewSchedule(false)}>
                      Cancel
                    </Button>
                    <Button onClick={saveSchedule} className="bg-blue-500 hover:bg-blue-600">
                      <Save className="w-4 h-4 mr-2" />
                      Save Schedule
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}