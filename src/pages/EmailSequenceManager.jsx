import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Plus, Trash2, Edit, Play, Pause, Clock, Zap, Users, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const TRIGGER_LABELS = {
  new_client: "🎉 New Client Added",
  onboarding_complete: "✅ Onboarding Complete",
  meal_plan_assigned: "🍽️ Meal Plan Assigned",
  no_activity_7_days: "⏰ No Activity (7 days)",
  no_activity_14_days: "⏰ No Activity (14 days)",
  birthday: "🎂 Client Birthday",
  manual: "🖐️ Manual Trigger",
};

const TEMPLATE_VARIABLES = ["{{client_name}}", "{{coach_name}}"];

const DEFAULT_SEQUENCE = {
  name: "",
  description: "",
  trigger: "new_client",
  is_active: true,
  emails: [
    {
      step: 1,
      delay_days: 0,
      subject: "Welcome to your health journey, {{client_name}}! 🌟",
      body: "<p>Hi {{client_name}},</p><p>Welcome! We're so excited to have you here. Your journey to better health starts today.</p><p>Warm regards,<br/>{{coach_name}}</p>"
    }
  ]
};

function EmailStepEditor({ email, index, onChange, onDelete, isOnly }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 text-sm font-bold flex items-center justify-center">
            {index + 1}
          </div>
          <span className="font-medium text-gray-800 text-sm">{email.subject || `Email ${index + 1}`}</span>
          <Badge variant="outline" className="text-xs">
            {email.delay_days === 0 ? "Immediately" : `After ${email.delay_days} day${email.delay_days > 1 ? 's' : ''}`}
          </Badge>
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {!isOnly && (
            <Button size="icon" variant="ghost" className="text-red-500 h-7 w-7" onClick={onDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500">Delay (days after trigger)</Label>
              <Input
                type="number"
                min={0}
                value={email.delay_days}
                onChange={e => onChange({ ...email, delay_days: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Step #</Label>
              <Input
                type="number"
                min={1}
                value={email.step}
                onChange={e => onChange({ ...email, step: parseInt(e.target.value) || index + 1 })}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Subject</Label>
            <Input
              value={email.subject}
              onChange={e => onChange({ ...email, subject: e.target.value })}
              placeholder="Email subject..."
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Body (HTML supported)</Label>
            <Textarea
              value={email.body}
              onChange={e => onChange({ ...email, body: e.target.value })}
              placeholder="Write your email content here... Use {{client_name}} and {{coach_name}} as variables."
              rows={6}
              className="mt-1 font-mono text-xs"
            />
          </div>
          <div className="text-xs text-gray-400">
            Variables: {TEMPLATE_VARIABLES.map(v => (
              <code key={v} className="bg-gray-100 px-1 rounded mr-1">{v}</code>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SequenceDialog({ open, onClose, editingSequence }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(editingSequence || DEFAULT_SEQUENCE);

  React.useEffect(() => {
    setForm(editingSequence || { ...DEFAULT_SEQUENCE, emails: [{ ...DEFAULT_SEQUENCE.emails[0] }] });
  }, [editingSequence, open]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (data.id) {
        return base44.entities.EmailSequence.update(data.id, data);
      }
      return base44.entities.EmailSequence.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailSequences'] });
      toast.success(form.id ? "Sequence updated!" : "Sequence created!");
      onClose();
    }
  });

  const addEmail = () => {
    const lastStep = form.emails.length > 0 ? Math.max(...form.emails.map(e => e.step)) : 0;
    setForm(f => ({
      ...f,
      emails: [...f.emails, {
        step: lastStep + 1,
        delay_days: 3,
        subject: "",
        body: "<p>Hi {{client_name}},</p><p></p><p>Best regards,<br/>{{coach_name}}</p>"
      }]
    }));
  };

  const updateEmail = (index, updated) => {
    setForm(f => {
      const emails = [...f.emails];
      emails[index] = updated;
      return { ...f, emails };
    });
  };

  const deleteEmail = (index) => {
    setForm(f => ({ ...f, emails: f.emails.filter((_, i) => i !== index) }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit" : "Create"} Email Sequence</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Sequence Name</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Welcome Series"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Trigger</Label>
              <Select value={form.trigger} onValueChange={v => setForm(f => ({ ...f, trigger: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Description (optional)</Label>
            <Input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What does this sequence do?"
              className="mt-1"
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={form.is_active}
              onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))}
            />
            <Label>Active (emails will be sent automatically)</Label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Email Steps</Label>
              <Button size="sm" variant="outline" onClick={addEmail}>
                <Plus className="w-4 h-4 mr-1" /> Add Email
              </Button>
            </div>
            {[...form.emails].sort((a, b) => a.step - b.step).map((email, index) => (
              <EmailStepEditor
                key={index}
                email={email}
                index={index}
                onChange={(updated) => updateEmail(form.emails.indexOf(email), updated)}
                onDelete={() => deleteEmail(form.emails.indexOf(email))}
                isOnly={form.emails.length === 1}
              />
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending || !form.name || !form.trigger}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {saveMutation.isPending ? "Saving..." : "Save Sequence"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function EmailSequenceManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSequence, setEditingSequence] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ['emailSequences'],
    queryFn: () => base44.entities.EmailSequence.list('-created_date'),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['emailSequenceLogs'],
    queryFn: () => base44.entities.EmailSequenceLog.list('-created_date', 50),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.EmailSequence.update(id, { is_active: !is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['emailSequences'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EmailSequence.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailSequences'] });
      toast.success("Sequence deleted");
    }
  });

  const manualTriggerMutation = useMutation({
    mutationFn: async ({ sequence }) => {
      // For manual trigger, prompt for client
      const clientEmail = window.prompt("Enter client email to trigger sequence for:");
      if (!clientEmail) return;
      const clientName = window.prompt("Enter client name (optional):") || "";
      const clients = await base44.entities.Client.filter({ email: clientEmail });
      const client = clients[0];
      if (!client) {
        toast.error("Client not found with that email");
        return;
      }
      return base44.functions.invoke('triggerEmailSequence', {
        trigger: sequence.trigger,
        client_id: client.id,
        client_email: clientEmail,
        client_name: clientName || client.full_name
      });
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['emailSequenceLogs'] });
        toast.success("Sequence triggered successfully!");
      }
    }
  });

  const handleEdit = (seq) => {
    setEditingSequence(seq);
    setDialogOpen(true);
  };

  const activeCount = sequences.filter(s => s.is_active).length;
  const totalEmailsSent = logs.reduce((sum, log) => sum + (log.emails_sent?.filter(e => e.status === 'sent').length || 0), 0);
  const activeRuns = logs.filter(l => l.status === 'active').length;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="w-7 h-7 text-orange-500" />
            Email Sequences
          </h1>
          <p className="text-gray-500 text-sm mt-1">Automate email campaigns triggered by client events</p>
        </div>
        <Button
          onClick={() => { setEditingSequence(null); setDialogOpen(true); }}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Plus className="w-4 h-4 mr-2" /> New Sequence
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Play className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
              <p className="text-xs text-gray-500">Active Sequences</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalEmailsSent}</p>
              <p className="text-xs text-gray-500">Emails Sent</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{activeRuns}</p>
              <p className="text-xs text-gray-500">In Progress</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sequences">
        <TabsList>
          <TabsTrigger value="sequences">Sequences ({sequences.length})</TabsTrigger>
          <TabsTrigger value="logs">Activity Log ({logs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="sequences" className="mt-4">
          {isLoading ? (
            <div className="text-center py-12 text-gray-400">Loading sequences...</div>
          ) : sequences.length === 0 ? (
            <Card className="border-dashed border-2 border-gray-200">
              <CardContent className="py-16 text-center">
                <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No email sequences yet</p>
                <p className="text-gray-400 text-sm mt-1">Create your first sequence to start automating client emails</p>
                <Button
                  className="mt-4 bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={() => { setEditingSequence(null); setDialogOpen(true); }}
                >
                  <Plus className="w-4 h-4 mr-2" /> Create First Sequence
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sequences.map(seq => (
                <Card key={seq.id} className="border-none shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${seq.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                          <Zap className={`w-5 h-5 ${seq.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900">{seq.name}</h3>
                            <Badge className={seq.is_active ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'} variant="outline">
                              {seq.is_active ? '● Active' : '○ Paused'}
                            </Badge>
                          </div>
                          {seq.description && <p className="text-sm text-gray-500 mt-0.5">{seq.description}</p>}
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                              {TRIGGER_LABELS[seq.trigger] || seq.trigger}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {seq.emails?.length || 0} email{seq.emails?.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => manualTriggerMutation.mutate({ sequence: seq })}
                          disabled={manualTriggerMutation.isPending}
                        >
                          <Play className="w-3 h-3 mr-1" /> Test
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(seq)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleMutation.mutate({ id: seq.id, is_active: seq.is_active })}
                        >
                          {seq.is_active ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500"
                          onClick={() => {
                            if (window.confirm(`Delete "${seq.name}"?`)) deleteMutation.mutate(seq.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No activity yet. Sequences will appear here once triggered.</div>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <Card key={log.id} className="border-none shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {log.status === 'completed' ? <CheckCircle className="w-5 h-5 text-green-500" /> :
                         log.status === 'failed' ? <AlertCircle className="w-5 h-5 text-red-500" /> :
                         log.status === 'cancelled' ? <AlertCircle className="w-5 h-5 text-gray-400" /> :
                         <Clock className="w-5 h-5 text-orange-500" />}
                        <div>
                          <p className="font-medium text-sm text-gray-900">{log.sequence_name}</p>
                          <p className="text-xs text-gray-500">
                            {log.client_name || log.client_email} · {TRIGGER_LABELS[log.trigger] || log.trigger}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            log.status === 'completed' ? 'text-green-600 border-green-200' :
                            log.status === 'failed' ? 'text-red-600 border-red-200' :
                            log.status === 'active' ? 'text-orange-600 border-orange-200' :
                            'text-gray-500 border-gray-200'
                          }
                        >
                          {log.status}
                        </Badge>
                        <p className="text-xs text-gray-400 mt-1">
                          {log.emails_sent?.filter(e => e.status === 'sent').length || 0} sent
                          {log.next_send_date && log.status === 'active' && (
                            <> · Next: {new Date(log.next_send_date).toLocaleDateString()}</>
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <SequenceDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editingSequence={editingSequence}
      />
    </div>
  );
}