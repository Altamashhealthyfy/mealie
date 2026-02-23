import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Zap, CheckCircle2, Copy, Trash2, Save, Plus, X, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

const PREDEFINED_CHECKUPS = [
  {
    name: 'Weekly Check-in',
    frequency: 'weekly',
    day: 'monday',
    time: '10:00',
    message: 'Hi! 👋 It\'s time for our weekly check-in. How\'s your plan going?',
    quickReplies: ['Going great! 💪', 'Struggling a bit 😕', 'Need help 🆘'],
    triggers: [
      { keyword: 'struggling', followUp: 'I\'m sorry to hear that. Let\'s schedule a call to discuss what\'s going wrong. Are you free this week?' },
      { keyword: 'need help', followUp: 'I\'m here for you! What specific area would you like help with — nutrition, exercise, or motivation?' },
    ],
  },
  {
    name: 'Meal Logging Reminder',
    frequency: 'daily',
    time: '20:00',
    message: 'Don\'t forget to log your meals today! 🍽️',
    quickReplies: ['All logged ✅', 'Missed a meal 😬', 'Will do it now!'],
    triggers: [],
  },
  {
    name: 'Monday Motivation',
    frequency: 'weekly',
    day: 'monday',
    time: '08:00',
    message: 'Monday motivation! 💪 How are you feeling about your goals this week?',
    quickReplies: ['Feeling great! 🔥', 'A bit tired 😴', 'Feeling unwell 🤒'],
    triggers: [
      { keyword: 'feeling unwell', followUp: 'Sorry to hear you\'re not feeling well 😔 Please rest and take care. Should we adjust your plan this week?' },
      { keyword: 'tired', followUp: 'Rest is important too! Let\'s make sure you\'re recovering properly. How was your sleep?' },
    ],
  },
  {
    name: 'Progress Check',
    frequency: 'weekly',
    day: 'friday',
    time: '18:00',
    message: 'End of week check-in! How did you do this week overall?',
    quickReplies: ['Crushed it! 🏆', 'Pretty good 👍', 'Not my best week 😔'],
    triggers: [
      { keyword: 'not my best', followUp: 'That\'s okay! Every week is a learning experience. What was the biggest challenge this week?' },
    ],
  },
];

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const defaultNewSchedule = {
  name: '',
  frequency: 'weekly',
  day: 'monday',
  time: '10:00',
  message: '',
  quickReplies: [],
  triggers: [],
};

export default function AutomatedCheckInScheduler({ clientEmail, clientId, onSchedule, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [schedules, setSchedules] = useState(() => {
    const saved = localStorage.getItem(`checkup_schedules_${clientId}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [showNewSchedule, setShowNewSchedule] = useState(false);
  const [newSchedule, setNewSchedule] = useState(defaultNewSchedule);
  const [newQuickReply, setNewQuickReply] = useState('');
  const [newTriggerKeyword, setNewTriggerKeyword] = useState('');
  const [newTriggerFollowUp, setNewTriggerFollowUp] = useState('');

  const persist = (updated) => {
    setSchedules(updated);
    localStorage.setItem(`checkup_schedules_${clientId}`, JSON.stringify(updated));
  };

  const saveSchedule = () => {
    if (!newSchedule.name.trim() || !newSchedule.message.trim()) {
      toast.error('Please fill in name and message');
      return;
    }
    const schedule = { id: Date.now(), ...newSchedule, clientId, clientEmail, createdAt: new Date().toISOString() };
    const updated = [...schedules, schedule];
    persist(updated);
    onSchedule?.(schedule);
    setNewSchedule(defaultNewSchedule);
    setShowNewSchedule(false);
    toast.success('Check-in scheduled!');
  };

  const deleteSchedule = (id) => {
    persist(schedules.filter(s => s.id !== id));
    toast.success('Schedule removed');
  };

  const quickApplyPredefined = (predefined) => {
    const schedule = { id: Date.now(), ...predefined, clientId, clientEmail, createdAt: new Date().toISOString() };
    const updated = [...schedules, schedule];
    persist(updated);
    onSchedule?.(schedule);
    toast.success(`"${predefined.name}" scheduled!`);
  };

  const addQuickReply = () => {
    if (!newQuickReply.trim()) return;
    setNewSchedule({ ...newSchedule, quickReplies: [...newSchedule.quickReplies, newQuickReply.trim()] });
    setNewQuickReply('');
  };

  const removeQuickReply = (idx) => {
    setNewSchedule({ ...newSchedule, quickReplies: newSchedule.quickReplies.filter((_, i) => i !== idx) });
  };

  const addTrigger = () => {
    if (!newTriggerKeyword.trim() || !newTriggerFollowUp.trim()) {
      toast.error('Fill in both keyword and follow-up message');
      return;
    }
    setNewSchedule({
      ...newSchedule,
      triggers: [...newSchedule.triggers, { keyword: newTriggerKeyword.trim().toLowerCase(), followUp: newTriggerFollowUp.trim() }],
    });
    setNewTriggerKeyword('');
    setNewTriggerFollowUp('');
  };

  const removeTrigger = (idx) => {
    setNewSchedule({ ...newSchedule, triggers: newSchedule.triggers.filter((_, i) => i !== idx) });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}
          className="border-purple-300 text-purple-700 hover:bg-purple-50 w-full flex gap-2">
          <Calendar className="w-4 h-4" />
          Auto Check-in
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-500" />
            Automated Check-in Scheduler
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="schedules">My Schedules ({schedules.length})</TabsTrigger>
          </TabsList>

          {/* TEMPLATES TAB */}
          <TabsContent value="templates" className="space-y-3 mt-4">
            <p className="text-sm text-gray-500">Quick-apply predefined check-ins with triggers and quick replies:</p>
            <div className="grid gap-3 max-h-96 overflow-y-auto pr-1">
              {PREDEFINED_CHECKUPS.map((checkup, idx) => (
                <Card key={idx} className="border border-gray-200">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm mb-1">{checkup.name}</h4>
                        <div className="flex gap-1.5 mb-2 flex-wrap">
                          <Badge variant="outline" className="text-xs capitalize">
                            {checkup.frequency}{checkup.frequency === 'weekly' ? ` · ${checkup.day}` : ''}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />{checkup.time}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{checkup.message}</p>
                        {checkup.quickReplies?.length > 0 && (
                          <div className="flex gap-1 flex-wrap mb-1">
                            {checkup.quickReplies.map((r, i) => (
                              <span key={i} className="text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded-full px-2 py-0.5">{r}</span>
                            ))}
                          </div>
                        )}
                        {checkup.triggers?.length > 0 && (
                          <p className="text-xs text-orange-600 mt-1">⚡ {checkup.triggers.length} response trigger{checkup.triggers.length > 1 ? 's' : ''}</p>
                        )}
                      </div>
                      <Button size="sm" onClick={() => quickApplyPredefined(checkup)}
                        className="bg-green-500 hover:bg-green-600 text-white flex-shrink-0 h-8">
                        <Copy className="w-3 h-3 mr-1" /> Apply
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* MY SCHEDULES TAB */}
          <TabsContent value="schedules" className="space-y-4 mt-4">
            {schedules.length === 0 && !showNewSchedule && (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="mb-3 text-sm">No automated check-ins scheduled yet</p>
              </div>
            )}

            {schedules.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {schedules.map((s) => (
                  <Card key={s.id} className="border border-gray-200">
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm flex items-center gap-1.5 mb-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />{s.name}
                          </h4>
                          <div className="flex gap-1.5 flex-wrap mb-1">
                            <Badge variant="outline" className="text-xs capitalize">
                              {s.frequency}{s.frequency === 'weekly' ? ` · ${s.day}` : ''}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />{s.time}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 truncate">{s.message}</p>
                          <div className="flex gap-2 mt-1 text-xs text-gray-400">
                            {s.quickReplies?.length > 0 && <span>💬 {s.quickReplies.length} quick replies</span>}
                            {s.triggers?.length > 0 && <span>⚡ {s.triggers.length} triggers</span>}
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => deleteSchedule(s.id)}
                          className="text-red-500 hover:bg-red-50 h-7 w-7 p-0 flex-shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Button onClick={() => setShowNewSchedule(!showNewSchedule)} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-1" /> Create Custom Check-in
            </Button>

            {showNewSchedule && (
              <Card className="border-purple-200 bg-purple-50/40">
                <CardContent className="pt-5 space-y-4">
                  {/* Basic fields */}
                  <Input placeholder="Schedule name (e.g., Monday Check-in)" value={newSchedule.name}
                    onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })} />

                  <div className="grid grid-cols-3 gap-2">
                    <Select value={newSchedule.frequency} onValueChange={(v) => setNewSchedule({ ...newSchedule, frequency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    {newSchedule.frequency === 'weekly' && (
                      <Select value={newSchedule.day} onValueChange={(v) => setNewSchedule({ ...newSchedule, day: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DAYS.map(d => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                    <Input type="time" value={newSchedule.time}
                      onChange={(e) => setNewSchedule({ ...newSchedule, time: e.target.value })} />
                  </div>

                  <Textarea placeholder="Message to send to client..." value={newSchedule.message}
                    onChange={(e) => setNewSchedule({ ...newSchedule, message: e.target.value })}
                    rows={2} className="resize-none" />

                  {/* Quick Replies */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" /> Quick Reply Options
                    </label>
                    <div className="flex gap-2">
                      <Input placeholder="e.g. Feeling great! 💪" value={newQuickReply}
                        onChange={(e) => setNewQuickReply(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addQuickReply()}
                        className="h-8 text-sm" />
                      <Button size="sm" onClick={addQuickReply} variant="outline" className="h-8 px-3">
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    {newSchedule.quickReplies.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {newSchedule.quickReplies.map((r, i) => (
                          <span key={i} className="flex items-center gap-1 text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded-full px-2 py-0.5">
                            {r}
                            <button onClick={() => removeQuickReply(i)} className="ml-0.5 hover:text-red-500">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Response Triggers */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" /> Response Triggers
                      <span className="font-normal text-gray-400 ml-1">(auto follow-up when client replies with keyword)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Trigger keyword (e.g. unwell)" value={newTriggerKeyword}
                        onChange={(e) => setNewTriggerKeyword(e.target.value)} className="h-8 text-sm" />
                      <Input placeholder="Follow-up message to send" value={newTriggerFollowUp}
                        onChange={(e) => setNewTriggerFollowUp(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <Button size="sm" onClick={addTrigger} variant="outline" className="h-7 text-xs">
                      <Plus className="w-3 h-3 mr-1" /> Add Trigger
                    </Button>
                    {newSchedule.triggers.length > 0 && (
                      <div className="space-y-1.5 mt-1">
                        {newSchedule.triggers.map((t, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg text-xs">
                            <Zap className="w-3 h-3 text-orange-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-orange-700">"{t.keyword}"</span>
                              <span className="text-gray-500 mx-1">→</span>
                              <span className="text-gray-700">{t.followUp}</span>
                            </div>
                            <button onClick={() => removeTrigger(i)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 justify-end pt-1">
                    <Button variant="outline" size="sm" onClick={() => setShowNewSchedule(false)}>Cancel</Button>
                    <Button size="sm" onClick={saveSchedule} className="bg-purple-600 hover:bg-purple-700">
                      <Save className="w-3.5 h-3.5 mr-1" /> Save Schedule
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