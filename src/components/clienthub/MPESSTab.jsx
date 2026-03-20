import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Heart, Plus, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const DOMAINS = ["mind", "physical", "emotional", "social", "spiritual"];
const DOMAIN_COLORS = {
  mind: "bg-purple-100 text-purple-700",
  physical: "bg-blue-100 text-blue-700",
  emotional: "bg-pink-100 text-pink-700",
  social: "bg-green-100 text-green-700",
  spiritual: "bg-amber-100 text-amber-700",
};

export default function MPESSTab({ clientId }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    mind: "", physical: "", emotional: "", social: "", spiritual: "", notes: ""
  });

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["mpessLogs", clientId],
    queryFn: () => base44.entities.MPESSTracker.filter({ client_id: clientId }, "-submission_date", 10),
    enabled: !!clientId,
  });

  const handleSave = async () => {
    setSaving(true);
    const submission_data = {};
    DOMAINS.forEach(d => { if (form[d]) submission_data[d] = { score: parseInt(form[d]) }; });
    await base44.entities.MPESSTracker.create({
      client_id: clientId,
      submission_date: form.date,
      submission_data,
      coach_reviewed: false,
    });
    toast.success("MPESS entry added!");
    setSaving(false);
    setShowForm(false);
    setForm({ date: new Date().toISOString().split("T")[0], mind: "", physical: "", emotional: "", social: "", spiritual: "", notes: "" });
    refetch();
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-pink-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">MPESS Wellness</h2>
        <Button size="sm" onClick={() => setShowForm(true)} className="bg-pink-500 hover:bg-pink-600 text-white">
          <Plus className="w-4 h-4 mr-1" /> New MPESS Entry
        </Button>
      </div>

      {logs.length === 0 ? (
        <Card className="border-none shadow">
          <CardContent className="p-10 text-center">
            <Heart className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No MPESS submissions yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const data = log.submission_data || {};
            return (
              <Card key={log.id} className={`border-none shadow bg-white ${!log.coach_reviewed ? "border-l-4 border-l-pink-400" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <p className="font-semibold text-gray-900">
                      {log.submission_date ? format(new Date(log.submission_date), "MMM d, yyyy") : "—"}
                    </p>
                    {log.coach_reviewed ? (
                      <Badge className="bg-green-100 text-green-700 text-xs shrink-0"><CheckCircle className="w-3 h-3 mr-1" />Reviewed</Badge>
                    ) : (
                      <Badge className="bg-pink-100 text-pink-700 text-xs shrink-0">Pending</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DOMAINS.map(domain => {
                      const val = data[domain];
                      const score = typeof val === "number" ? val : val?.score;
                      return (
                        <div key={domain} className={`rounded-lg px-3 py-1.5 text-xs text-center min-w-[70px] ${DOMAIN_COLORS[domain]}`}>
                          <p className="capitalize font-semibold">{domain}</p>
                          <p className="font-bold text-base">{score != null ? `${score}/10` : "—"}</p>
                        </div>
                      );
                    })}
                  </div>
                  {log.coach_notes && (
                    <p className="mt-2 text-xs text-green-700 bg-green-50 rounded p-2">💬 {log.coach_notes}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New MPESS Entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              {DOMAINS.map(d => (
                <div key={d}>
                  <Label className="capitalize">{d} Score (1–10)</Label>
                  <Input type="number" min="1" max="10" placeholder="—" value={form[d]} onChange={e => setForm(f => ({ ...f, [d]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-pink-500 hover:bg-pink-600 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}