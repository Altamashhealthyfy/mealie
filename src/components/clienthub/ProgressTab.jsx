import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Scale, Plus, TrendingUp, TrendingDown, Utensils, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function ProgressTab({ clientId, client }) {
  const [showLogForm, setShowLogForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], weight: "", notes: "", meal_adherence: "" });

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["progressLogs", clientId],
    queryFn: () => base44.entities.ProgressLog.filter({ client_id: clientId }, "-date", 10),
    enabled: !!clientId,
  });

  const { data: foodLogs = [] } = useQuery({
    queryKey: ["foodLogs", clientId],
    queryFn: () => base44.entities.FoodLog.filter({ client_id: clientId }, "-date", 7),
    enabled: !!clientId,
  });

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.ProgressLog.create({
      client_id: clientId,
      date: form.date,
      weight: form.weight ? parseFloat(form.weight) : undefined,
      notes: form.notes,
      meal_adherence: form.meal_adherence ? parseFloat(form.meal_adherence) : undefined,
    });
    toast.success("Progress logged!");
    setSaving(false);
    setShowLogForm(false);
    setForm({ date: new Date().toISOString().split("T")[0], weight: "", notes: "", meal_adherence: "" });
    refetch();
  };

  const latestWeight = logs[0]?.weight;
  const prevWeight = logs[1]?.weight;
  const weightDiff = latestWeight && prevWeight ? (latestWeight - prevWeight).toFixed(1) : null;

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Progress Logs</h2>
        <Button size="sm" onClick={() => setShowLogForm(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus className="w-4 h-4 mr-1" /> Log Progress
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-none shadow bg-orange-50">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-gray-500">Current Weight</p>
            <p className="text-2xl font-bold text-orange-600">{latestWeight || client?.weight || "—"}</p>
            <p className="text-xs text-gray-400">kg</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow bg-green-50">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-gray-500">Target Weight</p>
            <p className="text-2xl font-bold text-green-600">{client?.target_weight || "—"}</p>
            <p className="text-xs text-gray-400">kg</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow bg-blue-50">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-gray-500">Last Change</p>
            <p className="text-2xl font-bold text-blue-600 flex items-center justify-center gap-1">
              {weightDiff ? (
                <>
                  {parseFloat(weightDiff) < 0 ? <TrendingDown className="w-4 h-4 text-green-500" /> : <TrendingUp className="w-4 h-4 text-red-400" />}
                  {Math.abs(weightDiff)}
                </>
              ) : "—"}
            </p>
            <p className="text-xs text-gray-400">kg</p>
          </CardContent>
        </Card>
      </div>

      {logs.length === 0 ? (
        <Card className="border-none shadow">
          <CardContent className="p-10 text-center">
            <Scale className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No progress logs yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id} className="border-none shadow bg-white">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{log.date ? format(new Date(log.date), "MMM d, yyyy") : "—"}</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-600">
                      {log.weight && <span>⚖️ <strong>{log.weight} kg</strong></span>}
                      {log.meal_adherence != null && <span>🍽️ <strong>{log.meal_adherence}%</strong> adherence</span>}
                      {log.wellness_metrics?.energy_level && <span>⚡ Energy: <strong>{log.wellness_metrics.energy_level}/10</strong></span>}
                      {log.wellness_metrics?.mood && <span className="capitalize">😊 <strong>{log.wellness_metrics.mood}</strong></span>}
                    </div>
                    {log.notes && <p className="text-sm text-gray-500 mt-1 italic">{log.notes}</p>}
                  </div>
                  {log.reviewed && <Badge className="bg-green-100 text-green-700 text-xs shrink-0">Reviewed</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Meal Adherence Section */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Utensils className="w-4 h-4 text-orange-500" />
          Meal Adherence
        </h3>
        {logs.filter(l => l.meal_adherence != null).length === 0 ? (
          <Card className="border-none shadow bg-gray-50">
            <CardContent className="p-4 text-center text-sm text-gray-400">No adherence data logged yet.</CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {logs.filter(l => l.meal_adherence != null).map(log => (
              <Card key={log.id} className="border-none shadow bg-white">
                <CardContent className="p-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">{log.date ? format(new Date(log.date), "MMM d, yyyy") : "—"}</p>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, log.meal_adherence)}%`,
                          backgroundColor: log.meal_adherence >= 80 ? '#22c55e' : log.meal_adherence >= 50 ? '#f59e0b' : '#ef4444'
                        }}
                      />
                    </div>
                    <Badge className={log.meal_adherence >= 80 ? "bg-green-100 text-green-700" : log.meal_adherence >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}>
                      {log.meal_adherence}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Food Log Section */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-500" />
          Recent Food Log (Last 7 entries)
        </h3>
        {foodLogs.length === 0 ? (
          <Card className="border-none shadow bg-gray-50">
            <CardContent className="p-4 text-center text-sm text-gray-400">No food logs recorded yet.</CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {foodLogs.map(log => (
              <Card key={log.id} className="border-none shadow bg-white">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-700">{log.date ? format(new Date(log.date), "MMM d") : "—"}</p>
                        <Badge variant="outline" className="text-xs capitalize">{log.meal_type?.replace(/_/g, ' ')}</Badge>
                      </div>
                      {log.meal_name && <p className="text-sm font-semibold text-gray-800 truncate">{log.meal_name}</p>}
                      {log.items?.length > 0 && (
                        <p className="text-xs text-gray-500 truncate">{log.items.slice(0, 3).join(', ')}{log.items.length > 3 ? '...' : ''}</p>
                      )}
                      {log.notes && <p className="text-xs text-gray-400 italic mt-1">{log.notes}</p>}
                    </div>
                    {log.calories && <span className="text-xs text-orange-600 font-bold shrink-0">{log.calories} kcal</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showLogForm} onOpenChange={setShowLogForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Log Progress</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div><Label>Weight (kg)</Label><Input type="number" placeholder="e.g. 72.5" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} /></div>
            <div><Label>Meal Adherence (%)</Label><Input type="number" placeholder="0-100" value={form.meal_adherence} onChange={e => setForm(f => ({ ...f, meal_adherence: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea placeholder="Any notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowLogForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}