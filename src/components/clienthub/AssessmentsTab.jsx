import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ClipboardList, Plus, CheckCircle, Clock, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const QUESTION_TYPES = [
  { value: "text", label: "Short Text" },
  { value: "textarea", label: "Long Text" },
  { value: "number", label: "Number" },
  { value: "select", label: "Single Choice" },
  { value: "multiselect", label: "Multiple Choice" },
  { value: "rating", label: "Rating (1–10)" },
  { value: "yesno", label: "Yes / No" },
];

const emptyQuestion = () => ({ text: "", type: "text", options: "" });

// ── Create Assessment Form ──────────────────────────────────────────────────
function CreateAssessmentForm({ client, onSuccess, onCancel }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [saving, setSaving] = useState(false);

  const updateQ = (idx, field, value) =>
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));

  const addQ = () => setQuestions(prev => [...prev, emptyQuestion()]);
  const removeQ = (idx) => setQuestions(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Please enter an assessment title"); return; }
    if (questions.some(q => !q.text.trim())) { toast.error("Please fill in all question texts"); return; }
    setSaving(true);
    try {
      const formattedQuestions = questions.map((q, i) => ({
        id: `q${i + 1}`,
        question: q.text,
        type: q.type,
        options: (q.type === "select" || q.type === "multiselect")
          ? q.options.split(",").map(o => o.trim()).filter(Boolean)
          : [],
        required: true,
      }));

      await base44.entities.ClientAssessment.create({
        client_id: client.id,
        title,
        description,
        client_name: client.full_name,
        client_email: client.email,
        status: "pending",
        assigned_date: new Date().toISOString().split("T")[0],
        questions: formattedQuestions,
        source: "custom",
      });
      toast.success("Assessment created and sent!");
      onSuccess();
    } catch (e) {
      toast.error("Failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      {/* Title & Description */}
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs font-medium">Assessment Title *</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Weekly Health Check-in" className="text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">Description (optional)</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Brief instructions for the client..." rows={2} className="text-sm" />
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Questions ({questions.length})</p>
        {questions.map((q, idx) => (
          <div key={idx} className="border border-gray-200 rounded-xl p-3 bg-gray-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500">Q{idx + 1}</span>
              {questions.length > 1 && (
                <button onClick={() => removeQ(idx)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Input
              value={q.text}
              onChange={e => updateQ(idx, "text", e.target.value)}
              placeholder="Question text..."
              className="text-sm"
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <Select value={q.type} onValueChange={v => updateQ(idx, "type", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(q.type === "select" || q.type === "multiselect") && (
              <Input
                value={q.options}
                onChange={e => updateQ(idx, "options", e.target.value)}
                placeholder="Options (comma separated): Yes, No, Maybe"
                className="text-xs h-8"
              />
            )}
          </div>
        ))}

        <Button variant="outline" onClick={addQ} className="w-full text-xs border-dashed gap-1 text-blue-600 border-blue-300 hover:bg-blue-50">
          <Plus className="w-3.5 h-3.5" /> Add Question
        </Button>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1 sticky bottom-0 bg-white pb-1">
        <Button variant="outline" onClick={onCancel} className="flex-1 text-sm">Cancel</Button>
        <Button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create & Send"}
        </Button>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function AssessmentsTab({ clientId, client }) {
  const [mode, setMode] = useState(null); // null | "template" | "create"
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const qc = useQueryClient();

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ["clientAssessmentsTab", clientId],
    queryFn: () => base44.entities.ClientAssessment.filter({ client_id: clientId }, "-created_date", 20),
    enabled: !!clientId,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["assessmentTemplates"],
    queryFn: () => base44.entities.AssessmentTemplate.filter({ active: true }),
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const tmpl = templates.find(t => t.id === selectedTemplate);
      await base44.entities.ClientAssessment.create({
        client_id: clientId,
        template_id: selectedTemplate,
        title: tmpl?.template_name || "Assessment",
        client_name: client?.full_name,
        client_email: client?.email,
        status: "pending",
        assigned_date: new Date().toISOString().split("T")[0],
      });
    },
    onSuccess: () => {
      toast.success("Assessment sent!");
      setMode(null);
      setSelectedTemplate("");
      qc.invalidateQueries(["clientAssessmentsTab", clientId]);
    },
  });

  const statusConfig = {
    pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700", icon: Clock },
    in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700", icon: Clock },
    completed: { label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle },
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Assessments</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setMode("template")} className="text-sm border-blue-300 text-blue-700 hover:bg-blue-50">
            <ClipboardList className="w-4 h-4 mr-1" /> Use Template
          </Button>
          <Button size="sm" onClick={() => setMode("create")} className="bg-blue-500 hover:bg-blue-600 text-white">
            <Plus className="w-4 h-4 mr-1" /> Create New
          </Button>
        </div>
      </div>

      {assessments.length === 0 ? (
        <Card className="border-none shadow">
          <CardContent className="p-10 text-center">
            <ClipboardList className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No assessments sent yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {assessments.map((a) => {
            const sc = statusConfig[a.status] || statusConfig.pending;
            const Icon = sc.icon;
            return (
              <Card key={a.id} className="border-none shadow bg-white">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{a.title || "Assessment"}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Sent: {a.assigned_date ? format(new Date(a.assigned_date), "MMM d, yyyy") : (a.created_date ? format(new Date(a.created_date), "MMM d, yyyy") : "—")}
                      {a.completed_date && ` · Completed: ${format(new Date(a.completed_date), "MMM d, yyyy")}`}
                    </p>
                  </div>
                  <Badge className={`${sc.color} text-xs shrink-0 flex items-center gap-1`}>
                    <Icon className="w-3 h-3" />{sc.label}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Use Template Dialog */}
      <Dialog open={mode === "template"} onOpenChange={open => !open && setMode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Send Assessment to {client?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Select Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger><SelectValue placeholder="Choose a template..." /></SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.template_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setMode(null)}>Cancel</Button>
              <Button disabled={!selectedTemplate || sendMutation.isPending} onClick={() => sendMutation.mutate()} className="bg-blue-500 hover:bg-blue-600 text-white">
                {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Assessment Dialog */}
      <Dialog open={mode === "create"} onOpenChange={open => !open && setMode(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Assessment for {client?.full_name}</DialogTitle></DialogHeader>
          <CreateAssessmentForm
            client={client}
            onSuccess={() => { setMode(null); qc.invalidateQueries(["clientAssessmentsTab", clientId]); }}
            onCancel={() => setMode(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}