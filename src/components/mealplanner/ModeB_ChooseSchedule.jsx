import React, { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ChevronDown, ChevronRight, X, CheckCircle,
  AlertTriangle, Save, Send, Loader2, Sparkles, RefreshCw, Plus,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import {
  SwapModal, EditModal, RegenerateSlotConfirm, AddOwnOptionPanel,
  OptionRowActions, OPTION_LABELS,
} from "./ModeB_SlotControls";

const SLOT_DEFS = [
  { key: "early_morning",  label: "Early Morning", order: 1, pct: 0.04 },
  { key: "breakfast",      label: "Breakfast",     order: 2, pct: 0.22 },
  { key: "mid_morning",    label: "Mid Morning",   order: 3, pct: 0.09 },
  { key: "lunch",          label: "Lunch",         order: 4, pct: 0.32 },
  { key: "evening_snack",  label: "Evening Snack", order: 5, pct: 0.09 },
  { key: "dinner",         label: "Dinner",        order: 6, pct: 0.24 },
];

// ─────────────────────────────────────────────────────────────
// ComboOptionRow — expandable with Swap / Edit / Remove
// OUTSIDE main component to prevent focus loss
// ─────────────────────────────────────────────────────────────
const ComboOptionRow = React.memo(function ComboOptionRow({
  opt, idx, planDuration, canRemove,
  onRemove, onUpdateDays, onSwap, onEdit,
}) {
  const [expanded, setExpanded] = useState(false);
  const label = opt.option_label || OPTION_LABELS[idx] || String(idx + 1);
  const name  = opt.meal_name || opt.dish_name || "—";

  return (
    <div className={`rounded-lg border ${opt.catalog_verified ? "bg-gray-50 border-gray-200" : "bg-orange-50 border-orange-200"}`}>
      <div className="flex items-center gap-2 p-2">
        <Badge className={`text-xs font-bold w-6 h-6 flex items-center justify-center p-0 rounded-full shrink-0 ${opt.catalog_verified ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
          {label}
        </Badge>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-800 text-sm leading-tight">{name}</p>
          <p className="text-xs text-gray-500">
            {opt.calories > 0 ? `${opt.calories} kcal · P${opt.protein}g · C${opt.carbs}g · F${opt.fat}g` : "macros not found"}
            {!opt.catalog_verified && <span className="ml-1 text-orange-500">· partial match</span>}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <input type="number" min="0" max={planDuration}
            defaultValue={opt.recommended_days || 0}
            key={`${idx}-${opt.recommended_days}`}
            onBlur={(e) => onUpdateDays(parseInt(e.target.value) || 0)}
            className="w-10 text-center border rounded p-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300" />
          <span className="text-xs text-gray-400">d</span>
          <OptionRowActions canRemove={canRemove} onRemove={onRemove} onSwap={onSwap} onEdit={onEdit} />
          {opt.components?.length > 0 && (
            <button type="button" onClick={() => setExpanded(e => !e)} className="p-1 text-gray-400 hover:text-gray-600">
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
      {expanded && opt.components?.length > 0 && (
        <div className="px-4 pb-2 border-t border-gray-200 pt-2 space-y-0.5">
          {opt.components.map((c, ci) => (
            <div key={ci} className="flex justify-between text-xs text-gray-600">
              <span>• {c.dish_name}{!c.catalog_verified && <span className="text-orange-400 ml-1">(not in catalog)</span>}</span>
              <span className="text-gray-400">{c.calories > 0 ? `${c.calories} kcal` : "—"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────
// SingleOptionRow — for breakfast / snack / early_morning
// OUTSIDE main component to prevent focus loss
// ─────────────────────────────────────────────────────────────
const SingleOptionRow = React.memo(function SingleOptionRow({
  opt, idx, planDuration, canRemove,
  onRemove, onUpdateDays, onSwap, onEdit,
}) {
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
      <Badge className={`text-xs font-bold w-6 h-6 flex items-center justify-center p-0 rounded-full shrink-0 ${opt.catalog_verified ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
        {opt.option_label || OPTION_LABELS[idx] || idx + 1}
      </Badge>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 text-sm truncate">{opt.dish_name}</p>
        <p className="text-xs text-gray-500">
          {opt.calories > 0 ? `${opt.calories} kcal · P${opt.protein}g · C${opt.carbs}g · F${opt.fat}g` : "macros not found"}
          {opt.portion_label && <span className="ml-1 text-gray-400">· {opt.portion_label}</span>}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <input type="number" min="0" max={planDuration}
          defaultValue={opt.recommended_days || 0}
          key={`${idx}-${opt.recommended_days}`}
          onBlur={(e) => onUpdateDays(parseInt(e.target.value) || 0)}
          className="w-10 text-center border rounded p-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300" />
        <span className="text-xs text-gray-400">d</span>
        <OptionRowActions canRemove={canRemove} onRemove={onRemove} onSwap={onSwap} onEdit={onEdit} />
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────
// SlotSection — the whole slot accordion
// OUTSIDE main component to prevent focus loss
// ─────────────────────────────────────────────────────────────
const SlotSection = React.memo(function SlotSection({
  slotDef, targetCal, planDuration, options, expanded,
  onToggle, onRemoveOption, onUpdateDays, onSwapOption, onEditOption,
  onRegenerateSlot, onAddOption, client,
}) {
  const [swapIdx, setSwapIdx]       = useState(null);
  const [editIdx, setEditIdx]       = useState(null);
  const [showRegen, setShowRegen]   = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [showAdd, setShowAdd]       = useState(false);

  const totalDays = options.reduce((s, o) => s + (o.recommended_days || 0), 0);
  const dayStatus = totalDays < planDuration ? "under" : totalDays === planDuration ? "exact" : "over";
  const dayColor  = dayStatus === "exact" ? "text-green-600" : dayStatus === "over" ? "text-red-600" : "text-orange-500";
  const slotTarget = Math.round((targetCal || 1400) * slotDef.pct);
  const isCombo    = slotDef.key === "lunch" || slotDef.key === "dinner";

  const handleRegenConfirm = async () => {
    setRegenLoading(true);
    try {
      const res = await base44.functions.invoke("regenerateModeBSlot", {
        clientId: client.id,
        slotKey: slotDef.key,
        planDuration,
      });
      if (!res.data?.success) throw new Error(res.data?.error || "Failed");
      onRegenerateSlot(slotDef.key, res.data.options);
      setShowRegen(false);
      toast.success(`${slotDef.label} options regenerated!`);
    } catch (err) {
      toast.error("Regenerate failed: " + err.message);
    } finally {
      setRegenLoading(false);
    }
  };

  return (
    <>
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <button type="button" onClick={onToggle}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            {expanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
            <span className="font-semibold text-gray-800 text-sm">{slotDef.label}</span>
            <span className="text-xs text-gray-400">~{slotTarget} kcal</span>
            {isCombo && <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">complete meals</span>}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{options.length} options</Badge>
            {totalDays > 0 && <span className={`text-xs font-semibold ${dayColor}`}>{totalDays}/{planDuration}d</span>}
          </div>
        </button>

        {expanded && (
          <div className="px-4 pb-4 border-t border-gray-100 space-y-2 pt-3">
            {options.map((opt, idx) =>
              isCombo ? (
                <ComboOptionRow key={idx} opt={opt} idx={idx} planDuration={planDuration}
                  canRemove={options.length > 2}
                  onRemove={() => onRemoveOption(slotDef.key, idx)}
                  onUpdateDays={(days) => onUpdateDays(slotDef.key, idx, days)}
                  onSwap={() => setSwapIdx(idx)}
                  onEdit={() => setEditIdx(idx)} />
              ) : (
                <SingleOptionRow key={idx} opt={opt} idx={idx} planDuration={planDuration}
                  canRemove={options.length > 2}
                  onRemove={() => onRemoveOption(slotDef.key, idx)}
                  onUpdateDays={(days) => onUpdateDays(slotDef.key, idx, days)}
                  onSwap={() => setSwapIdx(idx)}
                  onEdit={() => setEditIdx(idx)} />
              )
            )}

            {/* Day counter */}
            <div className={`text-xs font-medium px-2 py-1.5 rounded-lg ${
              dayStatus === "exact" ? "bg-green-50 text-green-700 border border-green-200" :
              dayStatus === "over"  ? "bg-red-50 text-red-700 border border-red-200" :
                                      "bg-orange-50 text-orange-700 border border-orange-200"
            }`}>
              {dayStatus === "exact" ? "✓ " : dayStatus === "over" ? "⚠ " : "→ "}
              Days assigned: {totalDays} / {planDuration}
              {dayStatus === "under" && ` — ${planDuration - totalDays} more needed`}
              {dayStatus === "over"  && ` — ${totalDays - planDuration} day(s) over`}
            </div>
            {options.length < 2 && <p className="text-xs text-orange-500 px-1">⚠ Minimum 2 options required</p>}

            {/* Regen slot confirm */}
            {showRegen && (
              <RegenerateSlotConfirm
                slotLabel={slotDef.label}
                loading={regenLoading}
                onConfirm={handleRegenConfirm}
                onCancel={() => setShowRegen(false)} />
            )}

            {/* Add own option panel */}
            {showAdd && (
              <AddOwnOptionPanel
                slotKey={slotDef.key}
                slotDef={slotDef}
                dietType={client?.food_preference}
                onAdd={(newOpt) => onAddOption(slotDef.key, newOpt)}
                onCancel={() => setShowAdd(false)} />
            )}

            {/* Bottom controls */}
            {!showRegen && !showAdd && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline"
                  className="flex-1 text-xs gap-1 text-amber-700 border-amber-300 hover:bg-amber-50"
                  onClick={() => setShowRegen(true)}>
                  <RefreshCw className="w-3 h-3" /> Regenerate slot
                </Button>
                <Button size="sm" variant="outline"
                  className="flex-1 text-xs gap-1 text-blue-700 border-blue-300 hover:bg-blue-50"
                  onClick={() => setShowAdd(true)}>
                  <Plus className="w-3 h-3" /> Add my own
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Swap modal */}
      {swapIdx !== null && options[swapIdx] && (
        <SwapModal
          opt={options[swapIdx]}
          slotKey={slotDef.key}
          dietType={client?.food_preference}
          onClose={() => setSwapIdx(null)}
          onConfirm={(newOpt) => {
            onSwapOption(slotDef.key, swapIdx, newOpt);
            setSwapIdx(null);
          }} />
      )}

      {/* Edit modal */}
      {editIdx !== null && options[editIdx] && (
        <EditModal
          opt={options[editIdx]}
          slotKey={slotDef.key}
          dietType={client?.food_preference}
          onClose={() => setEditIdx(null)}
          onConfirm={(editedOpt) => {
            onSwapOption(slotDef.key, editIdx, editedOpt);
            setEditIdx(null);
          }} />
      )}
    </>
  );
});

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function ModeB_ChooseSchedule({ client, onSaved }) {
  const queryClient = useQueryClient();
  const [step, setStep]                   = useState(1);
  const [planDuration, setPlanDuration]   = useState(10);
  const [validFrom, setValidFrom]         = useState(format(new Date(), "yyyy-MM-dd"));
  const [slots, setSlots]                 = useState({});
  const [expandedSlots, setExpandedSlots] = useState({});
  const [validationResult, setValidationResult] = useState(null);
  const [sendNote, setSendNote]           = useState("");
  const [sendMode, setSendMode]           = useState("options_card");
  const [savedPlanId, setSavedPlanId]     = useState(null);
  const [isGenerating, setIsGenerating]   = useState(false);
  const [isSaving, setIsSaving]           = useState(false);
  const [isSending, setIsSending]         = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [showRegenAll, setShowRegenAll]   = useState(false);
  const [regenAllLoading, setRegenAllLoading] = useState(false);

  const targetCal = client?.target_calories || 1400;
  const validUntil = validFrom
    ? format(addDays(new Date(validFrom), planDuration), "yyyy-MM-dd")
    : "";

  const toggleSlot = useCallback((key) => {
    setExpandedSlots(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ── Re-label all options in a slot sequentially ──
  const relabel = (opts) => opts.map((o, i) => ({ ...o, option_label: OPTION_LABELS[i] || String(i + 1) }));

  // ── Redistribute days evenly after add/remove ──
  const redistributeDays = (opts, total) => {
    const n = opts.length || 1;
    const base = Math.floor(total / n);
    const extra = total % n;
    return opts.map((o, i) => ({ ...o, recommended_days: base + (i < extra ? 1 : 0) }));
  };

  const removeOption = useCallback((slotKey, idx) => {
    setSlots(prev => {
      const filtered = prev[slotKey].filter((_, i) => i !== idx);
      return { ...prev, [slotKey]: relabel(redistributeDays(filtered, planDuration)) };
    });
  }, [planDuration]);

  const updateDays = useCallback((slotKey, idx, days) => {
    setSlots(prev => {
      const updated = [...(prev[slotKey] || [])];
      updated[idx] = { ...updated[idx], recommended_days: days };
      return { ...prev, [slotKey]: updated };
    });
  }, []);

  // Control 1 / 5: swap or edit an option
  const swapOption = useCallback((slotKey, idx, newOpt) => {
    setSlots(prev => {
      const updated = [...(prev[slotKey] || [])];
      updated[idx] = { ...newOpt, option_label: updated[idx].option_label, recommended_days: updated[idx].recommended_days };
      return { ...prev, [slotKey]: updated };
    });
  }, []);

  // Control 2: regenerate one slot
  const regenerateSlot = useCallback((slotKey, newOptions) => {
    setSlots(prev => ({ ...prev, [slotKey]: newOptions }));
  }, []);

  // Control 4: add own option
  const addOption = useCallback((slotKey, newOpt) => {
    setSlots(prev => {
      const existing = prev[slotKey] || [];
      const withNew = [...existing, newOpt];
      return { ...prev, [slotKey]: relabel(withNew) };
    });
  }, []);

  // ── Full AI generation ──
  const runGenerate = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setStep(2);
    try {
      const res = await base44.functions.invoke("generateModeBOptions", { clientId: client.id, planDuration });
      const data = res.data;
      if (!data?.success) throw new Error(data?.error || "Generation failed");
      setSlots(data.slots || {});
      const firstKeys = Object.keys(data.slots || {}).slice(0, 3);
      setExpandedSlots(Object.fromEntries(firstKeys.map(k => [k, true])));
      setStep(3);
      toast.success("AI generated meal options! Review and adjust days below.");
    } catch (err) {
      setGenerationError(err.message);
      setStep(1);
      toast.error("Generation failed: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Control 3: Regenerate All
  const handleRegenAll = async () => {
    setRegenAllLoading(true);
    try {
      const res = await base44.functions.invoke("generateModeBOptions", { clientId: client.id, planDuration });
      const data = res.data;
      if (!data?.success) throw new Error(data?.error || "Generation failed");
      setSlots(data.slots || {});
      const firstKeys = Object.keys(data.slots || {}).slice(0, 3);
      setExpandedSlots(Object.fromEntries(firstKeys.map(k => [k, true])));
      setShowRegenAll(false);
      toast.success("All options regenerated fresh!");
    } catch (err) {
      toast.error("Regenerate failed: " + err.message);
    } finally {
      setRegenAllLoading(false);
    }
  };

  // ── Validation ──
  const runValidation = useCallback(() => {
    const warnings = [];
    let worst_low = 0, worst_high = 0;
    for (const sd of SLOT_DEFS) {
      const opts = slots[sd.key] || [];
      if (opts.length === 0) continue;
      const cals = opts.map(o => o.calories).filter(c => c > 0);
      if (cals.length === 0) continue;
      worst_low  += Math.min(...cals);
      worst_high += Math.max(...cals);
    }
    if (worst_low > 0 && worst_low < targetCal - 150)
      warnings.push(`Lowest possible day = ${worst_low} kcal — ${(targetCal - 150) - worst_low} kcal below target.`);
    if (worst_high > targetCal + 150)
      warnings.push(`Highest possible day = ${worst_high} kcal — ${worst_high - (targetCal + 150)} kcal above target.`);
    for (const sd of SLOT_DEFS) {
      const opts = slots[sd.key] || [];
      if (opts.length > 0 && opts.length < 2)
        warnings.push(`"${sd.label}" has only 1 option — minimum 2 required.`);
      const total = opts.reduce((s, o) => s + (o.recommended_days || 0), 0);
      if (opts.length > 0 && total !== planDuration)
        warnings.push(`"${sd.label}" days assigned (${total}) ≠ plan duration (${planDuration}).`);
    }
    setValidationResult({ warnings, passed: warnings.length === 0, worst_low, worst_high });
    setStep(4);
  }, [slots, targetCal, planDuration]);

  // ── Save ──
  const handleSave = async (override = false) => {
    setIsSaving(true);
    try {
      const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
      const slotArray = SLOT_DEFS.map(sd => ({
        slot_name: sd.key,
        slot_order: sd.order,
        calorie_target: Math.round(targetCal * sd.pct),
        days_required: planDuration,
        options: (slots[sd.key] || []).map((o, i) => ({
          ...o,
          option_label: OPTION_LABELS[i] || String(i + 1),
          catalog_verified: o.catalog_verified !== false,
        })),
      })).filter(s => s.options.length > 0);

      const saved = await base44.entities.MealOptionsCard.create({
        client_id: client.id,
        client_name: client.full_name,
        coach_id: client.assigned_coach?.[0] || client.created_by,
        created_at: nowIST.toISOString(),
        valid_from: validFrom,
        valid_until: validUntil,
        plan_duration: planDuration,
        creation_mode: "B",
        validation_passed: validationResult?.passed || override,
        validation_warnings: validationResult?.warnings || [],
        slots: slotArray,
        is_sent_to_client: false,
        status: "draft",
      });
      setSavedPlanId(saved.id);
      toast.success("Plan saved as draft!");
      setStep(5);
    } catch (err) {
      toast.error("Save failed: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Send ──
  const handleSend = async () => {
    if (!savedPlanId) return;
    setIsSending(true);
    try {
      await base44.entities.MealOptionsCard.update(savedPlanId, {
        is_sent_to_client: true,
        status: "active",
        send_mode: sendMode,
        coach_note: sendNote || null,
      });
      toast.success("Plan sent to client! 🎉");
      queryClient.invalidateQueries(["mealOptionsCards", client.id]);
      onSaved?.();
    } catch (err) {
      toast.error("Send failed: " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const hasAtLeastOneValidSlot = SLOT_DEFS.some(sd => (slots[sd.key] || []).length >= 2);
  const allSlotsMinOptions = SLOT_DEFS.every(sd => {
    const opts = slots[sd.key] || [];
    return opts.length === 0 || opts.length >= 2;
  });

  const stepLabels = ["Setup", "Generating…", "Assign Days", "Validate", "Send"];

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-1 text-xs text-gray-500 overflow-x-auto pb-1">
        {stepLabels.map((s, i) => (
          <React.Fragment key={s}>
            <span className={`px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
              step === i + 1 ? "bg-blue-100 text-blue-700" :
              step > i + 1  ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}>
              {step > i + 1 ? "✓ " : ""}{s}
            </span>
            {i < stepLabels.length - 1 && <ChevronRight className="w-3 h-3 shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      {/* ── STEP 1: Setup ── */}
      {step === 1 && (
        <Card className="border-blue-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-blue-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Choose &amp; Schedule — Plan Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg text-sm space-y-0.5">
              <div><span className="font-medium text-blue-800">Client: </span><span className="text-gray-700">{client.full_name}</span></div>
              <div className="text-xs text-gray-500">{targetCal} kcal/day · {client.food_preference} · {client.goal?.replace(/_/g, " ")}</div>
            </div>
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-800">
              <strong>How this works:</strong> Claude reads your client's profile, filters the dish catalog, then generates 4–5 options per slot. You assign days and can swap, edit, or add your own options.
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Plan Duration</Label>
                <Select value={String(planDuration)} onValueChange={v => setPlanDuration(parseInt(v))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 Days</SelectItem>
                    <SelectItem value="10">10 Days</SelectItem>
                    <SelectItem value="15">15 Days</SelectItem>
                    <SelectItem value="30">30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Valid From</Label>
                <Input type="date" defaultValue={validFrom} className="h-9 text-sm"
                  onBlur={e => setValidFrom(e.target.value)} />
              </div>
            </div>
            {validUntil && <p className="text-xs text-gray-500">Valid until: <span className="font-medium">{validUntil}</span></p>}
            {generationError && (
              <Alert className="bg-red-50 border-red-200 py-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-xs text-red-700 ml-1">{generationError}</AlertDescription>
              </Alert>
            )}
            <Button onClick={runGenerate} className="w-full bg-blue-600 hover:bg-blue-700">
              <Sparkles className="w-4 h-4 mr-2" /> Generate Options →
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 2: Generating ── */}
      {step === 2 && (
        <Card className="border-blue-200 shadow-sm">
          <CardContent className="p-8 flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <div className="text-center">
              <p className="font-semibold text-gray-800">Claude is generating meal options…</p>
              <p className="text-sm text-gray-500 mt-1">Filtering dish catalog by diet type and conditions.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 3: Assign Days + Coach Controls ── */}
      {step === 3 && (
        <div className="space-y-3">
          {/* Top bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">Assign Days per Option</h3>
              <p className="text-xs text-gray-500 mt-0.5">Days per slot must total {planDuration}.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {/* Control 3: Regenerate All */}
              {!showRegenAll ? (
                <Button variant="outline" size="sm" className="text-xs gap-1 text-amber-700 border-amber-300 hover:bg-amber-50"
                  onClick={() => setShowRegenAll(true)}>
                  <RefreshCw className="w-3 h-3" /> Regenerate All
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowRegenAll(false)} disabled={regenAllLoading}>Cancel</Button>
                  <Button size="sm" className="text-xs bg-amber-500 hover:bg-amber-600 gap-1" onClick={handleRegenAll} disabled={regenAllLoading}>
                    {regenAllLoading ? <><Loader2 className="w-3 h-3 animate-spin" />Generating…</> : "Yes, regenerate all"}
                  </Button>
                </div>
              )}
              <Button
                onClick={runValidation}
                disabled={!hasAtLeastOneValidSlot || !allSlotsMinOptions}
                size="sm"
                className="text-xs bg-green-600 hover:bg-green-700 gap-1"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Validate &amp; Save
              </Button>
            </div>
          </div>

          {/* Slot sections */}
          {SLOT_DEFS.map(sd => {
            const opts = slots[sd.key] || [];
            if (opts.length === 0) return null;
            return (
              <SlotSection
                key={sd.key}
                slotDef={sd}
                targetCal={targetCal}
                planDuration={planDuration}
                options={opts}
                expanded={!!expandedSlots[sd.key]}
                client={client}
                onToggle={() => toggleSlot(sd.key)}
                onRemoveOption={removeOption}
                onUpdateDays={updateDays}
                onSwapOption={swapOption}
                onEditOption={swapOption}
                onRegenerateSlot={regenerateSlot}
                onAddOption={addOption}
              />
            );
          })}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setStep(1)}>← Back</Button>
            <Button
              onClick={runValidation}
              disabled={!hasAtLeastOneValidSlot || !allSlotsMinOptions}
              className="flex-1 bg-green-600 hover:bg-green-700 text-sm"
            >
              <CheckCircle className="w-4 h-4 mr-1" /> Validate &amp; Save
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Validation ── */}
      {step === 4 && validationResult && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">Validation Results</h3>
          <div className={`p-3 rounded-xl border ${validationResult.passed ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
            <p className="font-semibold text-sm mb-1">
              {validationResult.passed ? "✅ All checks passed!" : "⚠️ Warnings found"}
            </p>
            {validationResult.worst_low > 0 && (
              <p className="text-xs text-gray-600">
                Worst-case daily range: {validationResult.worst_low} – {validationResult.worst_high} kcal
                &nbsp;(target: {targetCal} ± 150 kcal)
              </p>
            )}
          </div>
          {validationResult.warnings.map((w, i) => (
            <Alert key={i} className="bg-amber-50 border-amber-300 py-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-800 ml-1">{w}</AlertDescription>
            </Alert>
          ))}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setStep(3)}>← Fix Issues</Button>
            {validationResult.passed ? (
              <Button onClick={() => handleSave(false)} disabled={isSaving} className="flex-1 bg-green-600 hover:bg-green-700 text-sm">
                {isSaving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Saving…</> : <><Save className="w-4 h-4 mr-1" />Save &amp; Continue</>}
              </Button>
            ) : (
              <>
                <Button onClick={() => handleSave(true)} disabled={isSaving} variant="outline" className="flex-1 border-amber-400 text-amber-700 text-xs">
                  {isSaving ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Saving…</> : "Save Anyway →"}
                </Button>
                <Button onClick={() => handleSave(false)} disabled={isSaving} className="flex-1 bg-green-600 hover:bg-green-700 text-xs">
                  {isSaving ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Saving…</> : <><Save className="w-3 h-3 mr-1" />Save &amp; Send</>}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 5: Send ── */}
      {step === 5 && (
        <div className="space-y-4">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <p className="font-semibold text-green-800 text-sm">✅ Plan saved successfully!</p>
              <p className="text-xs text-green-600 mt-1">Now choose how to send it to {client.full_name}.</p>
            </CardContent>
          </Card>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">How to send?</Label>
            <div className="grid gap-2">
              {[
                { val: "options_card", label: "Send Options Card",    desc: "Client sees all options, chooses freely each day" },
                { val: "day_by_day",   label: "Send Day-by-Day Plan", desc: "System auto-generates day-by-day using assigned days" },
                { val: "both",         label: "Send Both",            desc: "Client sees both views in their dashboard" },
              ].map(opt => (
                <label key={opt.val}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${sendMode === opt.val ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:bg-gray-50"}`}>
                  <input type="radio" name="sendMode" value={opt.val}
                    checked={sendMode === opt.val}
                    onChange={() => setSendMode(opt.val)}
                    className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Add note to client (optional)</Label>
            <Textarea placeholder="e.g. Please follow this plan for the next 10 days." rows={2}
              className="text-sm" defaultValue={sendNote} onBlur={e => setSendNote(e.target.value)} />
          </div>
          <Button onClick={handleSend} disabled={isSending} className="w-full bg-green-600 hover:bg-green-700">
            {isSending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</>
              : <><Send className="w-4 h-4 mr-2" />Confirm Send to Client</>}
          </Button>
        </div>
      )}
    </div>
  );
}