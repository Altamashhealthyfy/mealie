import React, { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ChevronDown, ChevronRight, Plus, X, CheckCircle,
  AlertTriangle, Save, Send, Loader2, Search
} from "lucide-react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";

const SLOT_DEFS = [
  { key: "early_morning",   label: "Early Morning",          order: 1, pct: 0.04 },
  { key: "breakfast",       label: "Breakfast",              order: 2, pct: 0.22 },
  { key: "mid_morning",     label: "Mid Morning",            order: 3, pct: 0.09 },
  { key: "lunch_grain",     label: "Lunch — Grain",          order: 4, pct: 0.14 },
  { key: "lunch_dal",       label: "Lunch — Dal",            order: 5, pct: 0.10 },
  { key: "lunch_sabzi",     label: "Lunch — Sabzi",          order: 6, pct: 0.08 },
  { key: "evening_snack",   label: "Evening Snack",          order: 7, pct: 0.09 },
  { key: "dinner_grain",    label: "Dinner — Grain",         order: 8, pct: 0.13 },
  { key: "dinner_protein",  label: "Dinner — Protein/Sabzi", order: 9, pct: 0.11 },
];

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"];

function getDietFilter(foodPref) {
  if (foodPref === "jain") return ["jain"];
  if (foodPref === "veg") return ["veg", "jain"];
  if (foodPref === "eggetarian") return ["veg", "jain", "egg", "eggetarian"];
  return null; // non_veg: show all
}

// ── Defined OUTSIDE main component to prevent focus loss ──
const SlotSection = React.memo(function SlotSection({
  slotDef, targetCal, planDuration, options, expanded,
  onToggle, onAddOption, onRemoveOption, onUpdateDays,
}) {
  const [searchText, setSearchText] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const totalDays = options.reduce((s, o) => s + (o.recommended_days || 0), 0);
  const dayStatus = totalDays < planDuration ? "under" : totalDays === planDuration ? "exact" : "over";
  const dayColor = dayStatus === "exact" ? "text-green-600" : dayStatus === "over" ? "text-red-600" : "text-orange-500";

  const doSearch = useCallback(async (text) => {
    if (!text || text.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const results = await base44.entities.DishCatalog.filter({ slot: slotDef.key });
    const filtered = results.filter(d =>
      d.name?.toLowerCase().includes(text.toLowerCase())
    ).slice(0, 8);
    setSearchResults(filtered);
    setSearching(false);
  }, [slotDef.key]);

  const handleSearchBlur = useCallback((e) => {
    // Delay close to allow click on result
    setTimeout(() => setShowSearch(false), 200);
  }, []);

  const handleSelectDish = useCallback((dish) => {
    onAddOption(slotDef.key, dish);
    setSearchText("");
    setSearchResults([]);
    setShowSearch(false);
  }, [onAddOption, slotDef.key]);

  const slotTarget = Math.round((targetCal || 1400) * slotDef.pct);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
          <span className="font-semibold text-gray-800 text-sm">{slotDef.label}</span>
          <span className="text-xs text-gray-500">target {slotTarget} kcal ({Math.round(slotDef.pct * 100)}% of {targetCal})</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{options.length} options</Badge>
          {totalDays > 0 && (
            <span className={`text-xs font-medium ${dayColor}`}>
              {totalDays}/{planDuration} days
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 space-y-3">
          {/* Existing options */}
          {options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
              <Badge className="bg-blue-100 text-blue-700 text-xs font-bold w-6 h-6 flex items-center justify-center p-0 rounded-full shrink-0">
                {OPTION_LABELS[idx]}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{opt.dish_name}</p>
                <p className="text-xs text-gray-500">{opt.calories} kcal · P{opt.protein}g · C{opt.carbs}g · F{opt.fat}g · {opt.portion_size}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="number"
                  min="1"
                  max={planDuration}
                  value={opt.recommended_days || ""}
                  onBlur={(e) => onUpdateDays(slotDef.key, idx, parseInt(e.target.value) || 0)}
                  defaultValue={opt.recommended_days || ""}
                  className="w-12 text-center border rounded p-1 text-xs"
                  placeholder="days"
                />
                <span className="text-xs text-gray-500">days</span>
                <button type="button" onClick={() => onRemoveOption(slotDef.key, idx)}
                  className="ml-1 text-red-400 hover:text-red-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* Day counter */}
          {options.length > 0 && (
            <div className={`text-xs font-medium px-2 py-1 rounded ${
              dayStatus === "exact" ? "bg-green-50 text-green-700" :
              dayStatus === "over" ? "bg-red-50 text-red-700" :
              "bg-orange-50 text-orange-700"
            }`}>
              {dayStatus === "exact" ? "✓ " : dayStatus === "over" ? "⚠ " : "→ "}
              Days assigned: {totalDays} / {planDuration}
              {dayStatus === "under" && ` — need ${planDuration - totalDays} more day${planDuration - totalDays !== 1 ? "s" : ""}`}
              {dayStatus === "over" && ` — ${totalDays - planDuration} day${totalDays - planDuration !== 1 ? "s" : ""} over`}
            </div>
          )}

          {/* Add option */}
          {options.length < 6 && (
            <div className="relative">
              {!showSearch ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-dashed border-blue-300 text-blue-600 text-xs"
                  onClick={() => setShowSearch(true)}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Option
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                    <input
                      autoFocus
                      type="text"
                      placeholder={`Search dishes for ${slotDef.label}...`}
                      className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                      value={searchText}
                      onChange={(e) => { setSearchText(e.target.value); doSearch(e.target.value); }}
                      onBlur={handleSearchBlur}
                    />
                  </div>
                  {searching && <p className="text-xs text-gray-400 px-2">Searching...</p>}
                  {searchResults.length > 0 && (
                    <div className="border rounded-lg bg-white shadow-lg max-h-48 overflow-y-auto">
                      {searchResults.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onMouseDown={() => handleSelectDish(d)}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b last:border-0"
                        >
                          <span className="font-medium">{d.name}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            {d.medium_kcal || d.calories || "?"} kcal · {d.diet_type}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchText.length >= 2 && !searching && searchResults.length === 0 && (
                    <p className="text-xs text-gray-400 px-2">No dishes found. Try a different name.</p>
                  )}
                  <Button type="button" size="sm" variant="ghost" className="text-xs text-gray-400"
                    onClick={() => { setShowSearch(false); setSearchText(""); setSearchResults([]); }}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
          {options.length >= 2 && options.length < 6 && (
            <p className="text-xs text-green-600">✓ Min 2 options met · Max 6 allowed</p>
          )}
          {options.length < 2 && (
            <p className="text-xs text-orange-500">Minimum 2 options required per slot</p>
          )}
        </div>
      )}
    </div>
  );
});

export default function ModeB_ChooseSchedule({ client, onSaved }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1); // 1=setup, 2=slots, 3=validate, 4=send
  const [planDuration, setPlanDuration] = useState(10);
  const [validFrom, setValidFrom] = useState(format(new Date(), "yyyy-MM-dd"));
  const [expandedSlots, setExpandedSlots] = useState({ early_morning: true });
  const [slots, setSlots] = useState(() =>
    SLOT_DEFS.reduce((acc, s) => { acc[s.key] = []; return acc; }, {})
  );
  const [validationResult, setValidationResult] = useState(null);
  const [sendNote, setSendNote] = useState("");
  const [sendMode, setSendMode] = useState("options_card");
  const [savedPlanId, setSavedPlanId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const targetCal = client?.target_calories || 1400;
  const validUntil = validFrom ? format(addDays(new Date(validFrom), planDuration), "yyyy-MM-dd") : "";

  const toggleSlot = useCallback((key) => {
    setExpandedSlots(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const addOption = useCallback((slotKey, dish) => {
    setSlots(prev => {
      const existing = prev[slotKey] || [];
      if (existing.length >= 6) return prev;
      const portion_size = "medium";
      const calories = dish.medium_kcal || dish.calories || 0;
      const ratio = dish.calories > 0 ? calories / dish.calories : 1;
      return {
        ...prev,
        [slotKey]: [...existing, {
          dish_name: dish.name,
          dish_id: dish.dish_id || dish.id,
          portion_size,
          calories,
          protein: Math.round((dish.protein || 0) * ratio * 10) / 10,
          carbs: Math.round((dish.carbs || 0) * ratio * 10) / 10,
          fat: Math.round((dish.fats || 0) * ratio * 10) / 10,
          diet_type: dish.diet_type || "veg",
          catalog_verified: true,
          recommended_days: 0,
        }],
      };
    });
  }, []);

  const removeOption = useCallback((slotKey, idx) => {
    setSlots(prev => ({
      ...prev,
      [slotKey]: prev[slotKey].filter((_, i) => i !== idx),
    }));
  }, []);

  const updateDays = useCallback((slotKey, idx, days) => {
    setSlots(prev => {
      const updated = [...prev[slotKey]];
      updated[idx] = { ...updated[idx], recommended_days: days };
      return { ...prev, [slotKey]: updated };
    });
  }, []);

  // ── VALIDATION ──
  const runValidation = useCallback(() => {
    const warnings = [];
    let worst_low = 0, worst_high = 0;

    for (const sd of SLOT_DEFS) {
      const opts = slots[sd.key] || [];
      if (opts.length === 0) continue;
      const cals = opts.map(o => o.calories);
      worst_low  += Math.min(...cals);
      worst_high += Math.max(...cals);
    }

    if (worst_low < targetCal - 150) {
      const lowestSlot = SLOT_DEFS.find(sd => {
        const opts = slots[sd.key] || [];
        return opts.length > 0 && Math.min(...opts.map(o => o.calories)) === Math.min(...(slots[sd.key] || []).map(o => o.calories));
      });
      warnings.push(`Lowest possible day = ${worst_low} kcal — ${targetCal - 150 - worst_low} kcal below target. Consider a higher-calorie option in "${lowestSlot?.label || 'a slot'}".`);
    }
    if (worst_high > targetCal + 150) {
      warnings.push(`Highest possible day = ${worst_high} kcal — ${worst_high - (targetCal + 150)} kcal above target. Consider replacing a high-calorie option with a lighter one.`);
    }

    // Min options check
    for (const sd of SLOT_DEFS) {
      const opts = slots[sd.key] || [];
      if (opts.length > 0 && opts.length < 2) {
        warnings.push(`"${sd.label}" has only 1 option — minimum 2 required.`);
      }
    }

    setValidationResult({ warnings, passed: warnings.length === 0, worst_low, worst_high });
    setStep(3);
  }, [slots, targetCal]);

  // ── SAVE ──
  const handleSave = async (override = false) => {
    setIsSaving(true);
    try {
      const nowUTC = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istNow = new Date(nowUTC.getTime() + istOffset);

      const slotArray = SLOT_DEFS.map(sd => ({
        slot_name: sd.key,
        slot_order: sd.order,
        calorie_target: Math.round(targetCal * sd.pct),
        days_required: planDuration,
        options: (slots[sd.key] || []).map((o, i) => ({
          ...o,
          option_label: OPTION_LABELS[i],
          catalog_verified: o.catalog_verified !== false,
        })),
      })).filter(s => s.options.length > 0);

      const payload = {
        client_id: client.id,
        coach_id: client.assigned_coach?.[0] || client.created_by,
        created_at: istNow.toISOString(),
        valid_from: validFrom,
        valid_until: validUntil,
        plan_duration: planDuration,
        creation_mode: "B",
        validation_passed: validationResult?.passed || override,
        validation_warnings: validationResult?.warnings || [],
        slots: slotArray,
        is_sent_to_client: false,
        status: "draft",
        client_name: client.full_name,
      };

      const saved = await base44.entities.MealOptionsCard.create(payload);
      setSavedPlanId(saved.id);
      toast.success("Plan saved as draft!");
      setStep(4);
    } catch (err) {
      toast.error("Save failed: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ── SEND ──
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

  const allSlotsHaveMinOptions = SLOT_DEFS.every(sd => {
    const opts = slots[sd.key] || [];
    return opts.length === 0 || opts.length >= 2;
  });
  const hasAtLeastOneSlot = SLOT_DEFS.some(sd => (slots[sd.key] || []).length >= 2);

  // ── RENDER ──
  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
        {["Setup", "Build Slots", "Validate", "Send"].map((s, i) => (
          <React.Fragment key={s}>
            <span className={`px-2 py-0.5 rounded-full font-medium ${step === i + 1 ? "bg-blue-100 text-blue-700" : step > i + 1 ? "bg-green-100 text-green-700" : "bg-gray-100"}`}>
              {step > i + 1 ? "✓ " : ""}{s}
            </span>
            {i < 3 && <ChevronRight className="w-3 h-3" />}
          </React.Fragment>
        ))}
      </div>

      {/* STEP 1 — Setup */}
      {step === 1 && (
        <Card className="border-blue-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-blue-800">Plan Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg text-sm">
              <span className="font-medium text-blue-800">Client: </span>
              <span className="text-gray-700">{client.full_name}</span>
              <span className="ml-3 text-gray-500">· {targetCal} kcal/day · {client.food_preference}</span>
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
                <Input type="date" value={validFrom} className="h-9 text-sm"
                  onBlur={e => setValidFrom(e.target.value)}
                  defaultValue={validFrom} />
              </div>
            </div>

            {validUntil && (
              <p className="text-xs text-gray-500">Valid until: <span className="font-medium">{validUntil}</span></p>
            )}

            <Button onClick={() => setStep(2)} className="w-full bg-blue-600 hover:bg-blue-700">
              Continue → Build Slots
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STEP 2 — Slot Builder */}
      {step === 2 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 text-sm">Build Meal Slots</h3>
            <Button variant="ghost" size="sm" className="text-xs text-gray-500" onClick={() => setStep(1)}>
              ← Back to Setup
            </Button>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            For each slot: add at least 2 dish options. Set how many days each option should appear.
            Total days per slot should equal {planDuration}.
          </div>

          {SLOT_DEFS.map(sd => (
            <SlotSection
              key={sd.key}
              slotDef={sd}
              targetCal={targetCal}
              planDuration={planDuration}
              options={slots[sd.key] || []}
              expanded={!!expandedSlots[sd.key]}
              onToggle={() => toggleSlot(sd.key)}
              onAddOption={addOption}
              onRemoveOption={removeOption}
              onUpdateDays={updateDays}
            />
          ))}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setStep(1)} className="text-xs">← Back</Button>
            <Button
              onClick={runValidation}
              disabled={!hasAtLeastOneSlot || !allSlotsHaveMinOptions}
              className="flex-1 bg-green-600 hover:bg-green-700 text-sm"
            >
              <CheckCircle className="w-4 h-4 mr-1" /> Validate & Save
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3 — Validation */}
      {step === 3 && validationResult && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">Validation Results</h3>

          <div className={`p-3 rounded-xl border ${validationResult.passed ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
            <p className="font-semibold text-sm mb-1">
              {validationResult.passed ? "✅ All checks passed!" : "⚠️ Warnings found"}
            </p>
            <p className="text-xs text-gray-600">
              Worst case daily range: {validationResult.worst_low} – {validationResult.worst_high} kcal
              &nbsp;(target: {targetCal} ± 150 kcal)
            </p>
          </div>

          {validationResult.warnings.map((w, i) => (
            <Alert key={i} className="bg-amber-50 border-amber-300 py-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-800 ml-1">{w}</AlertDescription>
            </Alert>
          ))}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setStep(2)} className="text-xs">← Fix Issues</Button>
            {validationResult.passed ? (
              <Button onClick={() => handleSave(false)} disabled={isSaving} className="flex-1 bg-green-600 hover:bg-green-700 text-sm">
                {isSaving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-1" />Save & Continue</>}
              </Button>
            ) : (
              <Button onClick={() => handleSave(true)} disabled={isSaving} variant="outline" className="flex-1 border-amber-400 text-amber-700 text-sm">
                {isSaving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Saving...</> : "Save Anyway →"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* STEP 4 — Send to Client */}
      {step === 4 && (
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
                { val: "options_card", label: "Send Options Card", desc: "Client sees all options, chooses freely each day" },
                { val: "day_by_day", label: "Send Day-by-Day Plan", desc: "System auto-generates day-by-day using assigned days" },
                { val: "both", label: "Send Both", desc: "Client sees both tabs in their dashboard" },
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
            <Textarea
              placeholder="e.g. Please follow this plan for the next 10 days. Message me if you have any questions."
              rows={2}
              className="text-sm"
              defaultValue={sendNote}
              onBlur={e => setSendNote(e.target.value)}
            />
          </div>

          <Button onClick={handleSend} disabled={isSending} className="w-full bg-green-600 hover:bg-green-700">
            {isSending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
              : <><Send className="w-4 h-4 mr-2" />Confirm Send to Client</>}
          </Button>
        </div>
      )}
    </div>
  );
}