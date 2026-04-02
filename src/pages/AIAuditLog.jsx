import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Search, ChevronDown, ChevronRight, AlertCircle, CheckCircle, Clock, DollarSign, Zap, Eye } from "lucide-react";

export default function AIAuditLog() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFunction, setFilterFunction] = useState("all");
  const [selectedLog, setSelectedLog] = useState(null);

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["aiCallLogs"],
    queryFn: () => base44.entities.AICallLog.list("-created_date", 200),
    enabled: user?.user_type === "super_admin",
    refetchInterval: 30000,
  });

  if (user && user.user_type !== "super_admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Access denied. Admins only.</p>
      </div>
    );
  }

  const filtered = logs.filter(log => {
    const matchSearch =
      !search ||
      log.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.client_email?.toLowerCase().includes(search.toLowerCase()) ||
      log.triggered_by?.toLowerCase().includes(search.toLowerCase()) ||
      log.function_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || log.status === filterStatus;
    const matchFn = filterFunction === "all" || log.function_name === filterFunction;
    return matchSearch && matchStatus && matchFn;
  });

  // Totals
  const totalTokens = filtered.reduce((s, l) => s + (l.total_tokens || 0), 0);
  const totalCost = filtered.reduce((s, l) => s + (l.estimated_cost_usd || 0), 0);
  const successCount = filtered.filter(l => l.status === "success").length;
  const errorCount = filtered.filter(l => l.status === "error").length;
  const avgDuration = filtered.length
    ? Math.round(filtered.reduce((s, l) => s + (l.duration_ms || 0), 0) / filtered.length)
    : 0;

  const statusBadge = (status) => {
    if (status === "success") return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Success</Badge>;
    if (status === "error") return <Badge className="bg-red-100 text-red-700"><AlertCircle className="w-3 h-3 mr-1" />Error</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 mr-1" />Timeout</Badge>;
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🤖 AI Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">Full traceability of all LLM calls — for debugging and billing</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="shadow-sm"><CardContent className="p-3 text-center">
          <p className="text-xs text-gray-500">Total Calls</p>
          <p className="text-2xl font-bold text-gray-800">{filtered.length}</p>
        </CardContent></Card>
        <Card className="shadow-sm"><CardContent className="p-3 text-center">
          <p className="text-xs text-gray-500">Success</p>
          <p className="text-2xl font-bold text-green-600">{successCount}</p>
        </CardContent></Card>
        <Card className="shadow-sm"><CardContent className="p-3 text-center">
          <p className="text-xs text-gray-500">Errors</p>
          <p className="text-2xl font-bold text-red-500">{errorCount}</p>
        </CardContent></Card>
        <Card className="shadow-sm"><CardContent className="p-3 text-center">
          <p className="text-xs text-gray-500">Total Tokens</p>
          <p className="text-2xl font-bold text-blue-600">{totalTokens.toLocaleString()}</p>
        </CardContent></Card>
        <Card className="shadow-sm"><CardContent className="p-3 text-center">
          <p className="text-xs text-gray-500">Est. Cost (USD)</p>
          <p className="text-2xl font-bold text-orange-600">${totalCost.toFixed(4)}</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input placeholder="Search client, email, coach..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="timeout">Timeout</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterFunction} onValueChange={setFilterFunction}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Functions</SelectItem>
            <SelectItem value="generateAIMealPlan">generateAIMealPlan</SelectItem>
            <SelectItem value="modifyMealPlan">modifyMealPlan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Log Table */}
      {isLoading ? (
        <p className="text-sm text-gray-500 text-center py-8">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No logs found.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-3 py-3 font-semibold text-gray-600">Time</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600">Function</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600">Client</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600">Coach</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600">Model</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600">Tokens</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600">Cost (USD)</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600">Duration</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600">Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => (
                <tr key={log.id} className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-orange-50 transition-colors`}>
                  <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                    {log.created_date ? format(new Date(log.created_date), "MMM d, HH:mm:ss") : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded text-xs">{log.function_name}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-gray-800">{log.client_name || "—"}</p>
                    <p className="text-gray-400">{log.client_email}</p>
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">{log.triggered_by || "—"}</td>
                  <td className="px-3 py-2.5 font-mono text-gray-600">{log.model || "—"}</td>
                  <td className="px-3 py-2.5">{statusBadge(log.status)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <p className="font-medium">{(log.total_tokens || 0).toLocaleString()}</p>
                    <p className="text-gray-400">{log.prompt_tokens || 0}↑ {log.completion_tokens || 0}↓</p>
                  </td>
                  <td className="px-3 py-2.5 font-medium text-orange-600">
                    {log.estimated_cost_usd ? `$${log.estimated_cost_usd.toFixed(5)}` : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">
                    {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <Button size="sm" variant="ghost" onClick={() => setSelectedLog(log)} className="h-7 px-2">
                      <Eye className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Dialog */}
      {selectedLog && (
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="font-mono text-purple-700">{selectedLog.function_name}</span>
                {statusBadge(selectedLog.status)}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Client</p>
                  <p className="font-medium">{selectedLog.client_name || "—"}</p>
                  <p className="text-gray-500">{selectedLog.client_email}</p>
                  <p className="text-gray-400 text-xs">ID: {selectedLog.client_id}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Triggered By</p>
                  <p className="font-medium">{selectedLog.triggered_by || "—"}</p>
                  <p className="text-gray-500">{selectedLog.created_date ? format(new Date(selectedLog.created_date), "MMM d yyyy, HH:mm:ss") : "—"}</p>
                </div>
              </div>

              {/* Tokens & Cost */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Prompt Tokens", value: (selectedLog.prompt_tokens || 0).toLocaleString() },
                  { label: "Completion Tokens", value: (selectedLog.completion_tokens || 0).toLocaleString() },
                  { label: "Total Tokens", value: (selectedLog.total_tokens || 0).toLocaleString() },
                  { label: "Est. Cost", value: selectedLog.estimated_cost_usd ? `$${selectedLog.estimated_cost_usd.toFixed(6)}` : "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-blue-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="font-bold text-blue-700">{value}</p>
                  </div>
                ))}
              </div>

              {/* Context Metadata */}
              {selectedLog.context_metadata && (
                <div className="bg-orange-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-orange-700 uppercase mb-2">Context</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selectedLog.context_metadata).map(([k, v]) => (
                      v != null && v !== "" && (
                        <span key={k} className="bg-white border border-orange-200 rounded px-2 py-0.5 text-xs">
                          <span className="text-gray-500">{k}:</span> <span className="font-medium">{Array.isArray(v) ? v.join(", ") : String(v)}</span>
                        </span>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {selectedLog.error_message && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-700 uppercase mb-1">Error</p>
                  <p className="text-red-700 font-mono text-xs">{selectedLog.error_message}</p>
                </div>
              )}

              {/* Prompt */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Prompt (full)</p>
                <pre className="bg-gray-900 text-green-400 rounded-lg p-3 text-xs overflow-x-auto max-h-48 whitespace-pre-wrap">
                  {selectedLog.full_prompt || selectedLog.prompt_summary || "—"}
                </pre>
              </div>

              {/* Response */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Response (full)</p>
                <pre className="bg-gray-900 text-blue-300 rounded-lg p-3 text-xs overflow-x-auto max-h-48 whitespace-pre-wrap">
                  {selectedLog.full_response || selectedLog.response_summary || "—"}
                </pre>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}