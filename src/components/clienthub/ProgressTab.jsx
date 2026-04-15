import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, Scale, Plus, TrendingUp, TrendingDown, Zap, Activity,
  Ruler, Heart, MessageCircle, CheckCircle, Calendar, Minus
} from "lucide-react";
import { format, parseISO, subDays } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar
} from "recharts";
import { toast } from "sonner";

const SYMPTOM_LABELS = {
  improving:  { label: "Improving",    color: "bg-green-100 text-green-700",  dot: "bg-green-500" },
  same:       { label: "Same",         color: "bg-blue-100 text-blue-700",    dot: "bg-blue-500" },
  worsening:  { label: "Worsening",    color: "bg-orange-100 text-orange-700",dot: "bg-orange-500" },
  much_worse: { label: "Much Worse",   color: "bg-red-100 text-red-700",      dot: "bg-red-500" },
};

const EMPTY_FORM = {
  date: new Date().toISOString().split("T")[0],
  weight: "",
  measurements: { waist: "", hips: "", chest: "", arms: "", thighs: "" },
  energy_level: "",
  symptom_status: "",
  meal_adherence: "",
  sleep_quality: "",
  stress_level: "",
  notes: "",
};

export default function ProgressTab({ clientId, client }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [activeChart, setActiveChart] = useState("weight");

  // All progress logs for this client (coach view — no auth filter)
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["progressTabLogs", clientId],
    queryFn: () => base44.entities.ProgressLog.filter({ client_id: clientId }, "-date", 50),
    enabled: !!clientId,
  });

  // Separate symptom check-in logs (those submitted via SymptomCheckIn page)
  const checkInLogs = logs.filter(l => l.log_type === "symptom_checkin");
  // Standard progress logs
  const progressLogs = logs.filter(l => l.log_type !== "symptom_checkin");

  const saveMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.ProgressLog.create({ ...data, client_id: clientId, log_type: "progress" }),
    onSuccess: () => {
      toast.success("Progress logged!");
      queryClient.invalidateQueries(["progressTabLogs", clientId]);
      queryClient.invalidateQueries(["clientProgressLogs", clientId]);
      setShowForm(false);
      setForm(EMPTY_FORM);
    },
  });

  const handleSave = () => {
    const payload = {
      date: form.date,
      weight: form.weight ? parseFloat(form.weight) : undefined,
      measurements: Object.fromEntries(
        Object.entries(form.measurements).filter(([, v]) => v !== "").map(([k, v]) => [k, parseFloat(v)])
      ),
      wellness_metrics: {
        energy_level: form.energy_level ? parseInt(form.energy_level) : undefined,
        sleep_quality: form.sleep_quality ? parseInt(form.sleep_quality) : undefined,
        stress_level: form.stress_level ? parseInt(form.stress_level) : undefined,
      },
      symptom_status: form.symptom_status || undefined,
      meal_adherence: form.meal_adherence ? parseFloat(form.meal_adherence) : undefined,
      notes: form.notes || undefined,
    };
    saveMutation.mutate(payload);
  };

  // Computed stats
  const latestLog = progressLogs[0];
  const prevLog = progressLogs[1];
  const currentWeight = latestLog?.weight || client?.weight;
  const prevWeight = prevLog?.weight;
  const weightDiff = currentWeight && prevWeight ? (currentWeight - prevWeight).toFixed(1) : null;
  const totalLost = client?.initial_weight && currentWeight
    ? (client.initial_weight - currentWeight).toFixed(1)
    : null;

  // Chart data — last 30 days of progress logs with weight
  const chartData = progressLogs
    .filter(l => l.weight && l.date)
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-20)
    .map(l => ({
      date: format(parseISO(l.date), "MMM d"),
      weight: l.weight,
      energy: l.wellness_metrics?.energy_level || null,
      waist: l.measurements?.waist || null,
    }));

  // Symptom trend for last 10 check-ins
  const symptomTrend = checkInLogs.slice(0, 10).reverse().map(l => ({
    date: l.date ? format(parseISO(l.date), "MMM d") : "—",
    status: l.symptom_status,
    energy: l.energy_level,
  }));

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Progress Tracking</h2>
        <Button size="sm" onClick={() => setShowForm(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus className="w-4 h-4 mr-1" /> Log Progress
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Current Weight" value={currentWeight ? `${currentWeight} kg` : "—"} icon={<Scale className="w-5 h-5 text-orange-500" />} bg="bg-orange-50" />
        <StatCard label="Target Weight" value={client?.target_weight ? `${client.target_weight} kg` : "—"} icon={<TrendingDown className="w-5 h-5 text-green-500" />} bg="bg-green-50" />
        <StatCard
          label="Last Change"
          value={weightDiff ? `${parseFloat(weightDiff) > 0 ? "+" : ""}${weightDiff} kg` : "—"}
          icon={weightDiff && parseFloat(weightDiff) < 0
            ? <TrendingDown className="w-5 h-5 text-green-500" />
            : <TrendingUp className="w-5 h-5 text-red-400" />}
          bg={weightDiff && parseFloat(weightDiff) < 0 ? "bg-green-50" : "bg-red-50"}
          valueClass={weightDiff && parseFloat(weightDiff) < 0 ? "text-green-600" : "text-red-500"}
        />
        <StatCard label="Total Lost" value={totalLost ? `${totalLost} kg` : "—"} icon={<TrendingDown className="w-5 h-5 text-purple-500" />} bg="bg-purple-50" valueClass="text-purple-600" />
      </div>

      {/* Tabs: Charts / Logs / Symptom Check-ins */}
      <Tabs defaultValue="logs">
        <TabsList className="bg-white/80 w-full h-auto">
          <TabsTrigger value="logs" className="flex-1 text-xs sm:text-sm">📋 Progress Logs</TabsTrigger>
          <TabsTrigger value="charts" className="flex-1 text-xs sm:text-sm">📈 Charts</TabsTrigger>
          <TabsTrigger value="symptoms" className="flex-1 text-xs sm:text-sm">
            💚 Symptom Check-ins
            {checkInLogs.length > 0 && <Badge className="ml-1 bg-green-500 text-white text-xs px-1">{checkInLogs.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* ── PROGRESS LOGS ── */}
        <TabsContent value="logs" className="mt-3 space-y-3">
          {progressLogs.length === 0 ? (
            <EmptyState icon={<Scale className="w-12 h-12 text-gray-300" />} message="No progress logs yet." />
          ) : (
            progressLogs.map(log => <ProgressLogCard key={log.id} log={log} />)
          )}
        </TabsContent>

        {/* ── CHARTS ── */}
        <TabsContent value="charts" className="mt-3 space-y-4">
          {chartData.length < 2 ? (
            <EmptyState icon={<TrendingUp className="w-12 h-12 text-gray-300" />} message="Log at least 2 entries to see charts." />
          ) : (
            <>
              {/* Weight Chart */}
              <Card className="border-none shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Scale className="w-4 h-4 text-orange-500" /> Weight Trend (kg)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" style={{ fontSize: 11 }} />
                      <YAxis domain={["dataMin - 1", "dataMax + 1"]} style={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="weight" stroke="#f97316" strokeWidth={2} dot={{ r: 4, fill: "#f97316" }} name="Weight (kg)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Energy Chart */}
              {chartData.some(d => d.energy) && (
                <Card className="border-none shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-500" /> Energy Level (1–10)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={chartData.filter(d => d.energy)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" style={{ fontSize: 11 }} />
                        <YAxis domain={[0, 10]} style={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="energy" fill="#eab308" name="Energy" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Waist Chart */}
              {chartData.some(d => d.waist) && (
                <Card className="border-none shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Ruler className="w-4 h-4 text-blue-500" /> Waist Measurement (cm)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={chartData.filter(d => d.waist)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" style={{ fontSize: 11 }} />
                        <YAxis domain={["dataMin - 2", "dataMax + 2"]} style={{ fontSize: 11 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="waist" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: "#3b82f6" }} name="Waist (cm)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ── SYMPTOM CHECK-INS ── */}
        <TabsContent value="symptoms" className="mt-3 space-y-3">
          {checkInLogs.length === 0 ? (
            <EmptyState icon={<Heart className="w-12 h-12 text-gray-300" />} message="No symptom check-ins submitted yet. They appear here when the client responds to the automated 3-day check-in." />
          ) : (
            <>
              {/* Symptom Trend Summary */}
              <Card className="border-none shadow bg-gradient-to-r from-green-50 to-emerald-50">
                <CardContent className="p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Last {Math.min(10, checkInLogs.length)} check-ins</p>
                  <div className="flex flex-wrap gap-2">
                    {symptomTrend.map((entry, i) => {
                      const meta = SYMPTOM_LABELS[entry.status] || { label: entry.status, color: "bg-gray-100 text-gray-700", dot: "bg-gray-400" };
                      return (
                        <div key={i} className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${meta.dot}`} />
                          <span className="text-xs text-gray-400 mt-1">{entry.date}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {Object.entries(SYMPTOM_LABELS).map(([key, meta]) => {
                      const count = checkInLogs.filter(l => l.symptom_status === key).length;
                      if (!count) return null;
                      return (
                        <Badge key={key} className={`${meta.color} text-xs`}>
                          {meta.label}: {count}
                        </Badge>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {checkInLogs.map(log => <SymptomCheckInCard key={log.id} log={log} />)}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Log Progress Dialog ── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Progress for {client?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Date */}
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>

            {/* Weight */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1"><Scale className="w-4 h-4 text-orange-500" /> Weight (kg)</Label>
              <Input type="number" step="0.1" placeholder="e.g. 72.5" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} />
            </div>

            {/* Measurements */}
            <div className="space-y-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <Label className="flex items-center gap-1"><Ruler className="w-4 h-4 text-blue-500" /> Measurements (cm) — optional</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "waist", label: "Waist" },
                  { key: "hips", label: "Hips" },
                  { key: "chest", label: "Chest" },
                  { key: "arms", label: "Arms" },
                  { key: "thighs", label: "Thighs" },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <Input type="number" step="0.1" placeholder="cm"
                      value={form.measurements[key]}
                      onChange={e => setForm(f => ({ ...f, measurements: { ...f.measurements, [key]: e.target.value } }))} />
                  </div>
                ))}
              </div>
            </div>

            {/* Energy Level */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Zap className="w-4 h-4 text-yellow-500" /> Energy Level (1–10)</Label>
              <div className="flex gap-1">
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button key={n} type="button" onClick={() => setForm(f => ({ ...f, energy_level: n.toString() }))}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                      form.energy_level === n.toString()
                        ? "bg-yellow-500 text-white border-yellow-600"
                        : "border-gray-200 bg-white text-gray-600 hover:border-yellow-400"
                    }`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Symptom Status */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Heart className="w-4 h-4 text-red-400" /> Symptom Status</Label>
              <Select value={form.symptom_status} onValueChange={v => setForm(f => ({ ...f, symptom_status: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="improving">😊 Improving</SelectItem>
                  <SelectItem value="same">😐 About the Same</SelectItem>
                  <SelectItem value="worsening">😟 Worsening</SelectItem>
                  <SelectItem value="much_worse">😰 Much Worse</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sleep Quality */}
            <div className="space-y-1">
              <Label>Sleep Quality (1–10)</Label>
              <Input type="number" min="1" max="10" placeholder="e.g. 7" value={form.sleep_quality}
                onChange={e => setForm(f => ({ ...f, sleep_quality: e.target.value }))} />
            </div>

            {/* Meal Adherence */}
            <div className="space-y-1">
              <Label>Meal Adherence (%)</Label>
              <Input type="number" min="0" max="100" placeholder="0–100" value={form.meal_adherence}
                onChange={e => setForm(f => ({ ...f, meal_adherence: e.target.value }))} />
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea placeholder="Any observations, challenges, or updates..." value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" disabled={saveMutation.isPending} onClick={handleSave}>
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Progress"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function StatCard({ label, value, icon, bg, valueClass = "text-orange-600" }) {
  return (
    <Card className={`border-none shadow ${bg}`}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="shrink-0">{icon}</div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className={`font-bold text-lg ${valueClass}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon, message }) {
  return (
    <Card className="border-none shadow">
      <CardContent className="p-10 text-center space-y-3">
        <div className="mx-auto w-fit">{icon}</div>
        <p className="text-sm text-gray-500">{message}</p>
      </CardContent>
    </Card>
  );
}

function ProgressLogCard({ log }) {
  const symptomMeta = log.symptom_status ? SYMPTOM_LABELS[log.symptom_status] : null;
  const hasMeasurements = log.measurements && Object.values(log.measurements).some(v => v);
  return (
    <Card className="border-none shadow bg-white">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-gray-900 text-sm">{log.date ? format(parseISO(log.date), "MMMM d, yyyy") : "—"}</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {log.weight && <Badge variant="outline" className="text-xs">⚖️ {log.weight} kg</Badge>}
              {log.wellness_metrics?.energy_level && <Badge variant="outline" className="text-xs">⚡ Energy: {log.wellness_metrics.energy_level}/10</Badge>}
              {log.wellness_metrics?.sleep_quality && <Badge variant="outline" className="text-xs">😴 Sleep: {log.wellness_metrics.sleep_quality}/10</Badge>}
              {log.meal_adherence != null && (
                <Badge className={`text-xs ${log.meal_adherence >= 80 ? "bg-green-100 text-green-700" : log.meal_adherence >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                  🍽️ {log.meal_adherence}%
                </Badge>
              )}
              {symptomMeta && <Badge className={`text-xs ${symptomMeta.color}`}>{symptomMeta.label}</Badge>}
            </div>
          </div>
        </div>

        {hasMeasurements && (
          <div className="bg-blue-50 rounded-lg p-2">
            <p className="text-xs font-medium text-blue-700 mb-1">Measurements (cm)</p>
            <div className="flex flex-wrap gap-3 text-xs text-gray-600">
              {Object.entries(log.measurements).filter(([, v]) => v).map(([k, v]) => (
                <span key={k} className="capitalize">{k}: <strong>{v}</strong></span>
              ))}
            </div>
          </div>
        )}

        {log.notes && <p className="text-sm text-gray-500 italic bg-gray-50 rounded p-2">"{log.notes}"</p>}
      </CardContent>
    </Card>
  );
}

function SymptomCheckInCard({ log }) {
  const meta = SYMPTOM_LABELS[log.symptom_status] || { label: log.symptom_status, color: "bg-gray-100 text-gray-700" };
  const isWorse = log.symptom_status === "worsening" || log.symptom_status === "much_worse";
  return (
    <Card className={`border-none shadow bg-white ${isWorse ? "border-l-4 border-l-red-400" : "border-l-4 border-l-green-400"}`}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-gray-900 text-sm">{log.date ? format(parseISO(log.date), "MMMM d, yyyy") : "—"}</p>
            <div className="flex flex-wrap gap-2 mt-1">
              <Badge className={`text-xs ${meta.color}`}>{meta.label}</Badge>
              {log.energy_level && <Badge variant="outline" className="text-xs">⚡ Energy: {log.energy_level}/5</Badge>}
              {log.digestive_health && <Badge variant="outline" className="text-xs">🫁 {log.digestive_health}</Badge>}
            </div>
          </div>
          {isWorse && <Badge className="bg-red-100 text-red-700 text-xs shrink-0">⚠️ Alert Sent</Badge>}
        </div>
        {log.worsening_details && (
          <div className="bg-red-50 border border-red-200 rounded p-2">
            <p className="text-xs text-red-700 font-medium">Client reported:</p>
            <p className="text-sm text-red-800 italic">"{log.worsening_details}"</p>
          </div>
        )}
        {log.notes && <p className="text-sm text-gray-500 italic bg-gray-50 rounded p-2">"{log.notes}"</p>}
      </CardContent>
    </Card>
  );
}