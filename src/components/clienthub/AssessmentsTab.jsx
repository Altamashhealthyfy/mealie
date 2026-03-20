import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ClipboardList, Plus, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AssessmentsTab({ clientId, client }) {
  const [showSendForm, setShowSendForm] = useState(false);
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
      setShowSendForm(false);
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
        <Button size="sm" onClick={() => setShowSendForm(true)} className="bg-blue-500 hover:bg-blue-600 text-white">
          <Plus className="w-4 h-4 mr-1" /> Send Assessment
        </Button>
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

      <Dialog open={showSendForm} onOpenChange={setShowSendForm}>
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
              <Button variant="outline" onClick={() => setShowSendForm(false)}>Cancel</Button>
              <Button disabled={!selectedTemplate || sendMutation.isPending} onClick={() => sendMutation.mutate()} className="bg-blue-500 hover:bg-blue-600 text-white">
                {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}