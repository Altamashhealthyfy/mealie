import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, BookOpen, Database, ClipboardList, ExternalLink, Plus, Trash2, Edit2, Upload, Save, X, Check, AlertCircle, History, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORIES = ["Clinical Guidelines", "Meal Planning Rules", "Dish & Nutrient Databases", "Macro & Calorie Formulas", "Other"];

const categoryStyles = {
  "Clinical Guidelines":        { color: "bg-green-50 border-green-200",  badge: "bg-green-100 text-green-800",  icon: BookOpen },
  "Meal Planning Rules":        { color: "bg-orange-50 border-orange-200", badge: "bg-orange-100 text-orange-800", icon: ClipboardList },
  "Dish & Nutrient Databases":  { color: "bg-blue-50 border-blue-200",    badge: "bg-blue-100 text-blue-800",    icon: Database },
  "Macro & Calorie Formulas":   { color: "bg-purple-50 border-purple-200", badge: "bg-purple-100 text-purple-800", icon: FileText },
  "Other":                      { color: "bg-gray-50 border-gray-200",    badge: "bg-gray-100 text-gray-700",    icon: FileText },
};

const fileTypeColors = {
  PDF:   "bg-red-100 text-red-700",
  Excel: "bg-green-100 text-green-700",
  CSV:   "bg-teal-100 text-teal-700",
  Word:  "bg-blue-100 text-blue-700",
  Other: "bg-gray-100 text-gray-700",
};

const EMPTY_FORM = { name: "", description: "", category: "Clinical Guidelines", file_type: "PDF", file_url: "", ai_instruction: "", version: "", is_active: true, sort_order: 0 };

function ChangeLogPanel({ item }) {
  const [open, setOpen] = useState(false);
  const log = item.change_log || [];
  if (log.length === 0) return null;
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium"
      >
        <History className="w-3.5 h-3.5" />
        {log.length} version{log.length !== 1 ? 's' : ''} history
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <div className="mt-2 border-l-2 border-purple-200 pl-3 space-y-2">
          {[...log].reverse().map((entry, i) => (
            <div key={i} className="text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-purple-700">v{entry.version_number}</span>
                {entry.version_label && <span className="text-gray-500 bg-gray-100 px-1.5 rounded">{entry.version_label}</span>}
                <span className="text-gray-400">{entry.changed_at ? new Date(entry.changed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                {entry.changed_by && <span className="text-gray-400">by {entry.changed_by}</span>}
              </div>
              {entry.change_summary && <p className="text-gray-600 mt-0.5 italic">"{entry.change_summary}"</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HealthyfyResources() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [changeSummary, setChangeSummary] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["healthyfyKB"],
    queryFn: () => base44.entities.HealthyfyKnowledgeBase.list("sort_order", 200),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingId && editingItem) {
        // Increment version and record change log entry
        const prevLog = editingItem.change_log || [];
        const prevVersionNumber = editingItem.version_number || 1;
        const newVersionNumber = prevVersionNumber + 1;
        const logEntry = {
          version_number: prevVersionNumber,
          version_label: editingItem.version || '',
          changed_at: new Date().toISOString(),
          changed_by: (await base44.auth.me())?.email || 'admin',
          change_summary: changeSummary || 'Updated',
          snapshot: {
            name: editingItem.name,
            description: editingItem.description || '',
            category: editingItem.category,
            file_type: editingItem.file_type,
            file_url: editingItem.file_url || '',
            ai_instruction: editingItem.ai_instruction || '',
            version: editingItem.version || '',
            is_active: editingItem.is_active !== false,
          }
        };
        return base44.entities.HealthyfyKnowledgeBase.update(editingId, {
          ...data,
          version_number: newVersionNumber,
          change_log: [...prevLog, logEntry],
        });
      }
      // New record: initialize version_number = 1
      return base44.entities.HealthyfyKnowledgeBase.create({ ...data, version_number: 1, change_log: [] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["healthyfyKB"] });
      setShowForm(false);
      setEditingId(null);
      setEditingItem(null);
      setChangeSummary("");
      setForm(EMPTY_FORM);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.HealthyfyKnowledgeBase.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["healthyfyKB"] }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.HealthyfyKnowledgeBase.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["healthyfyKB"] }),
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, file_url }));
    setUploading(false);
  };

  const handleEdit = (r) => {
    setEditingId(r.id);
    setEditingItem(r);
    setChangeSummary("");
    setForm({ name: r.name || "", description: r.description || "", category: r.category || "Clinical Guidelines", file_type: r.file_type || "PDF", file_url: r.file_url || "", ai_instruction: r.ai_instruction || "", version: r.version || "", is_active: r.is_active !== false, sort_order: r.sort_order || 0 });
    setShowForm(true);
  };

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = resources.filter((r) => r.category === cat);
    return acc;
  }, {});

  const activeCount = resources.filter((r) => r.is_active !== false).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Healthyfy Knowledge Base</h1>
                <p className="text-sm text-gray-500">Rules & Reference Documents for the AI Meal Plan Generator</p>
              </div>
            </div>
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span><strong>AI Reference:</strong> All active documents below are treated as rules by the AI Meal Plan Generator. Toggle a document off to exclude it.</span>
            </div>
          </div>
          <Button
            onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); }}
            className="bg-gradient-to-r from-orange-500 to-red-600 text-white flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Resource
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {CATEGORIES.slice(0, 4).map((cat) => {
            const style = categoryStyles[cat];
            return (
              <div key={cat} className="bg-white rounded-xl border border-gray-200 p-3 text-center shadow-sm">
                <p className="text-2xl font-bold text-orange-600">{grouped[cat]?.length || 0}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-tight">{cat}</p>
              </div>
            );
          })}
        </div>

        {/* Add / Edit Form */}
        {showForm && (
          <Card className="mb-6 border-2 border-orange-300 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{editingId ? "Edit Resource" : "Add New Resource"}</span>
                <button onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}><X className="w-4 h-4 text-gray-400" /></button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Document Name *</label>
                  <Input placeholder="e.g. PCOS Holistic Plan" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Version / Date</label>
                  <Input placeholder="e.g. v2, March 2026" value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Category *</label>
                  <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">File Type *</label>
                  <Select value={form.file_type} onValueChange={(v) => setForm((f) => ({ ...f, file_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["PDF", "Excel", "CSV", "Word", "Other"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Description</label>
                <Input placeholder="What does this document contain?" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">AI Instruction (How should the AI use this?)</label>
                <Input placeholder="e.g. Use this as primary dish catalog when selecting meals for Indian patients" value={form.ai_instruction} onChange={(e) => setForm((f) => ({ ...f, ai_instruction: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Upload File</label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer flex items-center gap-2 px-4 py-2 border-2 border-dashed border-orange-300 rounded-lg text-sm text-orange-600 hover:bg-orange-50 transition-colors">
                    <Upload className="w-4 h-4" />
                    {uploading ? "Uploading..." : "Choose File"}
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  </label>
                  {form.file_url && (
                    <a href={form.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 flex items-center gap-1 hover:underline">
                      <ExternalLink className="w-3.5 h-3.5" /> View uploaded
                    </a>
                  )}
                  {!form.file_url && (
                    <Input className="flex-1 text-xs" placeholder="…or paste a direct URL" value={form.file_url} onChange={(e) => setForm((f) => ({ ...f, file_url: e.target.value }))} />
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}>Cancel</Button>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-orange-500 to-red-600 text-white"
                  disabled={!form.name || saveMutation.isPending}
                  onClick={() => saveMutation.mutate(form)}
                >
                  <Save className="w-4 h-4 mr-1" /> {saveMutation.isPending ? "Saving..." : "Save Resource"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resource Categories */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading resources...</div>
        ) : (
          <div className="space-y-6">
            {CATEGORIES.map((cat) => {
              const items = grouped[cat] || [];
              if (items.length === 0) return null;
              const style = categoryStyles[cat];
              const Icon = style.icon;
              return (
                <Card key={cat} className={`border-2 ${style.color}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Icon className="w-5 h-5" />
                      {cat}
                      <Badge className={style.badge}>{items.length} file{items.length !== 1 ? "s" : ""}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div key={item.id} className={`flex items-start justify-between gap-4 bg-white rounded-lg p-3 border shadow-sm ${item.is_active === false ? "opacity-50" : "border-gray-100"}`}>
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-sm text-gray-800">{item.name}</p>
                                {item.version && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{item.version}</span>}
                                {item.is_active === false && <span className="text-xs text-gray-400 italic">inactive</span>}
                              </div>
                              {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
                              {item.ai_instruction && (
                                <p className="text-xs text-orange-600 mt-1 italic">🤖 {item.ai_instruction}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge className={fileTypeColors[item.file_type] || fileTypeColors.Other}>{item.file_type}</Badge>
                            {item.file_url ? (
                              <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                                <ExternalLink className="w-3.5 h-3.5" /> View
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400 italic">No file</span>
                            )}
                            <button
                              onClick={() => toggleActiveMutation.mutate({ id: item.id, is_active: item.is_active === false })}
                              title={item.is_active === false ? "Activate" : "Deactivate"}
                              className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${item.is_active !== false ? "bg-green-100 text-green-600 hover:bg-green-200" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleEdit(item)} className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center justify-center">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => { if (window.confirm("Delete this resource?")) deleteMutation.mutate(item.id); }}
                              className="w-6 h-6 rounded-full bg-red-100 text-red-500 hover:bg-red-200 flex items-center justify-center"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {resources.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-orange-200">
                <BookOpen className="w-12 h-12 text-orange-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No resources yet</p>
                <p className="text-sm text-gray-400 mt-1">Click "Add Resource" to upload your first document</p>
              </div>
            )}
          </div>
        )}

        {/* Footer note */}
        {resources.length > 0 && (
          <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 text-center">
            ✅ <strong>{activeCount} active resource{activeCount !== 1 ? "s" : ""}</strong> are currently being referenced as rules by the AI Meal Plan Generator.
          </div>
        )}
      </div>
    </div>
  );
}