import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail, Plus, Trash2, Edit, Play, Pause, Clock, Zap, Users,
  CheckCircle, AlertCircle, ChevronDown, ChevronUp, GitBranch,
  SkipForward, RefreshCw, XCircle, Eye, MousePointerClick
} from "lucide-react";
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

const CONDITION_LABELS = {
  email_not_opened: { label: "Email NOT opened", icon: Eye },
  link_clicked: { label: "Tracking link clicked", icon: MousePointerClick },
  link_not_clicked: { label: "Tracking link NOT clicked", icon: MousePointerClick },
};

const ACTION_LABELS = {
  go_to_step: "Jump to a specific step",
  resend_email: "Resend this email",
  end_sequence: "End the sequence",
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
      body: "<p>Hi {{client_name}},</p><p>Welcome! We're so excited to have you here.</p><p>Warm regards,<br/>{{coach_name}}</p>",
      conditions: []
    }
  ]
};

function ConditionalLogicEditor({ conditions = [], onChange, allSteps }) {
  const addCondition = () => {
    onChange([...conditions, { condition: "email_not_opened", check_after_days: 2, action: "resend_email", branch_step: null }]);
  };
  const removeCondition = (idx) => onChange(conditions.filter((_, i) => i !== idx));
  const updateCondition = (idx, updated) => onChange(conditions.map((c, i) => i === idx ? updated : c));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-gray-500 flex items-center gap-1">
          <GitBranch className="w-3 h-3" /> Conditional Branch (optional)
        </Label>
        {conditions.length === 0 && (
          <Button size="sm" variant="ghost" className="text-xs h-6 px-2 text-orange-600" onClick={addCondition}>
            <Plus className="w-3 h-3 mr-1" /> Add Branch
          </Button>
        )}
      </div>
      {conditions.map((cond, idx) => (
        <div key={idx} className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700">IF condition is met after this email:</span>
            <Button size="icon" variant="ghost" className="h-5 w-5 text-red-400" onClick={() => removeCondition(idx)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-gray-500">Condition</Label>
              <Select value={cond.condition} onValueChange={v => updateCondition(idx, { ...cond, condition: v })}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONDITION_LABELS).map(([value, { label }]) => (
                    <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Check after (days)</Label>
              <Input
                type="number"
                min={1}
                value={cond.check_after_days || 2}
                onChange={e => updateCondition(idx, { ...cond, check_after_days: parseInt(e.target.value) || 2 })}
                className="mt-1 h-8 text-xs"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-gray-500">Then do</Label>
              <Select value={cond.action} onValueChange={v => updateCondition(idx, { ...cond, action: v })}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTION_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {cond.action === 'go_to_step' && (
              <div>
                <Label className="text-xs text-gray-500">Jump to step #</Label>
                <Select value={String(cond.branch_step || '')} onValueChange={v => updateCondition(idx, { ...cond, branch_step: parseInt(v) })}>
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue placeholder="Pick step..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allSteps.map(s => (
                      <SelectItem key={s} value={String(s)} className="text-xs">Step {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <p className="text-xs text-blue-600 italic">
            If condition is NOT met, the sequence continues to the next step normally.
          </p>
        </div>
      ))}
    </div>
  );
}

function EmailStepEditor({ email, index, onChange, onDelete, isOnly, allSteps }) {
  const [expanded, setExpanded] = useState(true);
  const hasCondition = (email.conditions || []).length > 0;

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
            {email.delay_days === 0 ? "Immediately" : `After ${email.delay_days} day${email.delay_days !== 1 ? 's' : ''}`}
          </Badge>
          {hasCondition && (
            <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200" variant="outline">
              <GitBranch className="w-3 h-3 mr-1" /> Conditional
            </Badge>
          )}
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
                type="number" min={0}
                value={email.delay_days}
                onChange={e => onChange({ ...email, delay_days: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Step #</Label>
              <Input
                type="number" min={1}
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
              placeholder="Write your email content here..."
              rows={6}
              className="mt-1 font-mono text-xs"
            />
          </div>
          <div className="text-xs text-gray-400">
            Variables: {TEMPLATE_VARIABLES.map(v => (
              <code key={v} className="bg-gray-100 px-1 rounded mr-1">{v}</code>
            ))}
          </div>

          {/* Conditional Logic */}
          <ConditionalLogicEditor
            conditions={email.conditions || []}
            onChange={conditions => onChange({ ...email, conditions })}
            allSteps={allSteps.filter(s => s !== email.step)}
          />
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
      if (data.id) return base44.entities.EmailSequence.update(data.id, data);
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
        body: "<p>Hi {{client_name}},</p><p></p><p>Best regards,<br/>{{coach_name}}</p>",
        conditions: []
      }]
    }));
  };

  const updateEmail = (index, updated) => {
    setForm(f => { const emails = [...f.emails]; emails[index] = updated; return { ...f, emails }; });
  };

  const deleteEmail = (index) => {
    setForm(f => ({ ...f, emails: f.emails.filter((_, i) => i !== index) }));
  };

  const allSteps = form.emails.map(e => e.step).sort((a, b) => a - b);

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
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
            <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
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
                allSteps={allSteps}
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

function LogStatusBadge({ status }) {
  const cfg = {
    active:    { className: 'text-orange-600 border-orange-200 bg-orange-50', label: '● In Progress' },
    paused:    { className: 'text-blue-600 border-blue-200 bg-blue-50', label: '⏸ Paused' },
    completed: { className: 'text-green-600 border-green-200 bg-green-50', label: '✓ Completed' },
    failed:    { className: 'text-red-600 border-red-200 bg-red-50', label: '✗ Failed' },
    cancelled: { className: 'text-gray-500 border-gray-200 bg-gray-50', label: '○ Cancelled' },
  }[status] || { className: 'text-gray-500 border-gray-200', label: status };
  return <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>;
}

function LogCard({ log, onTogglePause }) {
  const [expanded, setExpanded] = useState(false);
  const sentCount = log.emails_sent?.filter(e => e.status === 'sent').length || 0;
  const isPaused = log.status === 'paused';
  const isActive = log.status === 'active';
  const awaitingCheck = log.awaiting_condition_check;

  const getStatusIcon = () => {
    if (log.status === 'completed') return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (log.status === 'failed') return <AlertCircle className="w-5 h-5 text-red-500" />;
    if (log.status === 'cancelled') return <XCircle className="w-5 h-5 text-gray-400" />;
    if (log.status === 'paused') return <Pause className="w-5 h-5 text-blue-500" />;
    return <Clock className="w-5 h-5 text-orange-500 animate-pulse" />;
  };

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {getStatusIcon()}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm text-gray-900">{log.sequence_name}</p>
                <LogStatusBadge status={log.status} />
                {awaitingCheck && (
                  <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-xs">
                    <GitBranch className="w-3 h-3 mr-1" /> Awaiting condition
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {log.client_name || log.client_email} · {TRIGGER_LABELS[log.trigger] || log.trigger}
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                <span>{sentCount} email{sentCount !== 1 ? 's' : ''} sent</span>
                {log.next_send_date && (isActive || awaitingCheck) && (
                  <span>· Next: {new Date(log.next_send_date).toLocaleDateString()}</span>
                )}
                {awaitingCheck && (
                  <span className="text-blue-500">
                    · Checking "{CONDITION_LABELS[awaitingCheck.condition]?.label}" on step {awaitingCheck.step}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {(isActive || isPaused) && (
              <Button
                size="sm"
                variant="outline"
                className={isPaused ? "text-green-600 border-green-300 hover:bg-green-50" : "text-blue-600 border-blue-300 hover:bg-blue-50"}
                onClick={() => onTogglePause(log)}
              >
                {isPaused ? <><Play className="w-3 h-3 mr-1" /> Resume</> : <><Pause className="w-3 h-3 mr-1" /> Pause</>}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setExpanded(e => !e)}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {expanded && (log.emails_sent?.length > 0) && (
          <div className="mt-3 border-t pt-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email History</p>
            {log.emails_sent.map((e, i) => (
              <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  {e.status === 'sent' ? <CheckCircle className="w-3 h-3 text-green-500" /> : <AlertCircle className="w-3 h-3 text-red-500" />}
                  <span className="text-gray-700">Step {e.step}: {e.subject}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  {e.opened && <span className="flex items-center gap-0.5 text-green-600"><Eye className="w-3 h-3" /> Opened</span>}
                  {e.link_clicked && <span className="flex items-center gap-0.5 text-blue-600"><MousePointerClick className="w-3 h-3" /> Clicked</span>}
                  {e.condition_evaluated && e.branch_taken && (
                    <span className="flex items-center gap-0.5 text-purple-600"><GitBranch className="w-3 h-3" /> {e.branch_taken}</span>
                  )}
                  <span>{e.sent_at ? new Date(e.sent_at).toLocaleDateString() : ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function EmailSequenceManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSequence, setEditingSequence] = useState(null);

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ['emailSequences'],
    queryFn: () => base44.entities.EmailSequence.list('-created_date'),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['emailSequenceLogs'],
    queryFn: () => base44.entities.EmailSequenceLog.list('-created_date', 100),
  });

  const toggleSequenceMutation = useMutation({
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

  const toggleLogPauseMutation = useMutation({
    mutationFn: async (log) => {
      if (log.status === 'paused') {
        // Resume: restore active status and recalculate next send if needed
        const updates = { status: 'active', paused_reason: null };
        if (!log.next_send_date && !log.awaiting_condition_check) {
          // Schedule next email for tomorrow
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          updates.next_send_date = tomorrow.toISOString();
        }
        return base44.entities.EmailSequenceLog.update(log.id, updates);
      } else {
        return base44.entities.EmailSequenceLog.update(log.id, {
          status: 'paused',
          paused_at: new Date().toISOString(),
          paused_reason: 'manual'
        });
      }
    },
    onSuccess: (_, log) => {
      queryClient.invalidateQueries({ queryKey: ['emailSequenceLogs'] });
      toast.success(log.status === 'paused' ? "Sequence resumed" : "Sequence paused");
    }
  });

  const manualTriggerMutation = useMutation({
    mutationFn: async ({ sequence }) => {
      const clientEmail = window.prompt("Enter client email to trigger sequence for:");
      if (!clientEmail) return;
      const clientName = window.prompt("Enter client name (optional):") || "";
      const clients = await base44.entities.Client.filter({ email: clientEmail });
      const client = clients[0];
      if (!client) { toast.error("Client not found"); return; }
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
        toast.success("Sequence triggered!");
      }
    }
  });

  const activeCount = sequences.filter(s => s.is_active).length;
  const totalEmailsSent = logs.reduce((sum, log) => sum + (log.emails_sent?.filter(e => e.status === 'sent').length || 0), 0);
  const activeRuns = logs.filter(l => l.status === 'active').length;
  const pausedRuns = logs.filter(l => l.status === 'paused').length;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="w-7 h-7 text-orange-500" />
            Email Sequences
          </h1>
          <p className="text-gray-500 text-sm mt-1">Automate email campaigns with conditional branching and smart follow-ups</p>
        </div>
        <Button
          onClick={() => { setEditingSequence(null); setDialogOpen(true); }}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Plus className="w-4 h-4 mr-2" /> New Sequence
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Play, color: 'green', value: activeCount, label: 'Active Sequences' },
          { icon: Mail, color: 'blue', value: totalEmailsSent, label: 'Emails Sent' },
          { icon: Clock, color: 'orange', value: activeRuns, label: 'In Progress' },
          { icon: Pause, color: 'purple', value: pausedRuns, label: 'Paused Runs' },
        ].map(({ icon: Icon, color, value, label }) => (
          <Card key={label} className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full bg-${color}-100 flex items-center justify-center`}>
                <Icon className={`w-5 h-5 text-${color}-600`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="sequences">
        <TabsList>
          <TabsTrigger value="sequences">Sequences ({sequences.length})</TabsTrigger>
          <TabsTrigger value="logs">
            Activity Log ({logs.length})
            {pausedRuns > 0 && <Badge className="ml-2 bg-blue-100 text-blue-700 border-blue-200 text-xs" variant="outline">{pausedRuns} paused</Badge>}
          </TabsTrigger>
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
                <Button className="mt-4 bg-orange-500 hover:bg-orange-600 text-white" onClick={() => { setEditingSequence(null); setDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" /> Create First Sequence
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sequences.map(seq => {
                const hasConditionals = (seq.emails || []).some(e => (e.conditions || []).length > 0);
                return (
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
                              {hasConditionals && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  <GitBranch className="w-3 h-3 mr-1" /> Has branches
                                </Badge>
                              )}
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
                          <Button size="sm" variant="outline" className="text-xs" onClick={() => manualTriggerMutation.mutate({ sequence: seq })} disabled={manualTriggerMutation.isPending}>
                            <Play className="w-3 h-3 mr-1" /> Test
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setEditingSequence(seq); setDialogOpen(true); }}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => toggleSequenceMutation.mutate({ id: seq.id, is_active: seq.is_active })}>
                            {seq.is_active ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-500" onClick={() => { if (window.confirm(`Delete "${seq.name}"?`)) deleteMutation.mutate(seq.id); }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No activity yet. Sequences will appear here once triggered.</div>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <LogCard
                  key={log.id}
                  log={log}
                  onTogglePause={(l) => toggleLogPauseMutation.mutate(l)}
                />
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