import React, { useState, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ChevronRight, Copy, Loader2, Save, Send, AlertTriangle,
  CheckCircle, Search, X
} from "lucide-react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SLOT_DEFS = [
  { key: "early_morning",   label: "Early Morning",          order: 1 },
  { key: "breakfast",       label: "Breakfast",              order: 2 },
  { key: "mid_morning",     label: "Mid Morning",            order: 3 },
  { key: "lunch_grain",     label: "Lunch — Grain",          order: 4 },
  { key: "lunch_dal",       label: "Lunch — Dal",            order: 5 },
  { key: "lunch_sabzi",     label: "Lunch — Sabzi",          order: 6 },
  { key: "evening_snack",   label: "Evening Snack",          order: 7 },
  { key: "dinner_grain",    label: "Dinner — Grain",         order: 8 },
  { key: "dinner_protein",  label: "Dinner — Protein/Sabzi", order: 9 },
];

const emptySlotEntry = () => ({
  dish_name: "",
  dish_id: null,
  portion_size: "medium",
  qty_note: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  slot_note: "",
  catalog_verified: false,
});

const emptyDay = () => ({
  day_note: "",
  slots: SLOT_DEFS.reduce((acc, s) => { acc[s.key] = emptySlotEntry(); return acc; }, {}),
});

// ── Defined OUTSIDE to prevent focus loss ──
const DishSearchInput = React.memo(function DishSearchInput({ slotKey, value, onSelect, onManual }) {
  const [searchText, setSearchText] = useState(value || "");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDrop, setShowDrop] = useState(false);

  const doSearch = useCallback(async (text) => {
    if (!text || text.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await base44.entities.DishCatalog.filter({ slot: slotKey });
      setResults(res.filter(d => d.name?.toLowerCase().includes(text.toLowerCase())).slice(0, 8));
    } catch { setResults([]); }
    setSearching(false);
  }, [slotKey]);

  const handleChange = useCallback((e) => {
    const v = e.target.value;
    setSearchText(v);
    setShowDrop(true);
    doSearch(v);
    onManual(v);
  }, [doSearch, onManual]);

  const handlePick = useCallback((dish) => {
    setSearchText(dish.name);
    setShowDrop(false);
    onSelect(dish);
  }, [onSelect]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 w-3 h-3 text-gray-400" />
        <input
          type="text"
          value={searchText}
          onChange={handleChange}
          onFocus={() => searchText.length >= 2 && setShowDrop(true)}
          onBlur={() => setTimeout(() => setShowDrop(false), 200)}
          placeholder="Search dish or type manually..."
          className="w-full pl-6 pr-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
        />
      </div>
      {showDrop && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-xl z-30 max-h-44 overflow-y-auto">
          {searching && <p className="text-xs text-gray-400 px-3 py-2">Searching...</p>}
          {results.map(d => (
            <button key={d.id} type="button" onMouseDown={() => handlePick(d)}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-xs border-b last:border-0">
              <span className="font-medium">{d.name}</span>
              <span className="text-gray-400 ml-1">· {d.medium_kcal || d.calories || "?"}kcal · {d.diet_type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

const SlotRow = React.memo(function SlotRow({ slotDef, entry, onChange }) {
  const handleManual = useCallback((name) => {
    onChange(slotDef.key, "dish_name", name);
    onChange(slotDef.key, "catalog_verified", false);
  }, [onChange, slotDef.key]);

  const handleSelect = useCallback((dish) => {
    const portion = "medium";
    const cal = dish.medium_kcal || dish.calories || 0;
    const ratio = dish.calories > 0 ? cal / dish.calories : 1;
    onChange(slotDef.key, "__batch__", {
      dish_name: dish.name,
      dish_id: dish.dish_id || dish.id,
      portion_size: portion,
      calories: cal,
      protein: Math.round((dish.protein || 0) * ratio * 10) / 10,
      carbs: Math.round((dish.carbs || 0) * ratio * 10) / 10,
      fat: Math.round((dish.fats || 0) * ratio * 10) / 10,
      catalog_verified: true,
      qty_note: dish.medium_label || "",
    });
    // When portion changes, auto-update macros
  }, [onChange, slotDef.key]);

  const handlePortionChange = useCallback(async (portion) => {
    onChange(slotDef.key, "portion_size", portion);
    if (!entry.dish_id) return;
    // Find dish and update kcal/macros
    const dishes = await base44.entities.DishCatalog.filter({ dish_id: entry.dish_id });
    const dish = dishes[0];
    if (!dish) return;
    const kcalKey = portion === "small" ? dish.small_kcal : portion === "large" ? dish.large_kcal : dish.medium_kcal;
    const labelKey = portion === "small" ? dish.small_label : portion === "large" ? dish.large_label : dish.medium_label;
    const base = dish.calories || 0;
    const ratio = base > 0 ? (kcalKey || base) / base : 1;
    onChange(slotDef.key, "__batch__", {
      portion_size: portion,
      calories: kcalKey || dish.calories || 0,
      protein: Math.round((dish.protein || 0) * ratio * 10) / 10,
      carbs: Math.round((dish.carbs || 0) * ratio * 10) / 10,
      fat: Math.round((dish.fats || 0) * ratio * 10) / 10,
      qty_note: labelKey || entry.qty_note,
    });
  }, [entry.dish_id, entry.qty_note, onChange, slotDef.key]);

  const isManual = !entry.catalog_verified && entry.dish_name;

  return (
    <div className="grid grid-cols-12 gap-1 items-start py-2 border-b border-gray-100 last:border-0">
      <div className="col-span-12 sm:col-span-1 flex items-center pt-1">
        <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">{slotDef.label.split("—")[0]}</span>
      </div>
      <div className="col-span-12 sm:col-span-3">
        <DishSearchInput slotKey={slotDef.key} value={entry.dish_name} onSelect={handleSelect} onManual={handleManual} />
        {isManual && <span className="text-xs text-orange-500">Manual entry</span>}
      </div>
      <div className="col-span-12 sm:col-span-2">
        {entry.dish_name && entry.dish_id ? (
          <Select value={entry.portion_size || "medium"} onValueChange={handlePortionChange}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <input type="text" placeholder="qty/portion"
            className="w-full px-2 py-1 text-xs border rounded"
            defaultValue={entry.qty_note}
            onBlur={e => onChange(slotDef.key, "qty_note", e.target.value)} />
        )}
      </div>
      <div className="col-span-3 sm:col-span-1">
        <input type="number" placeholder="kcal"
          className={`w-full px-2 py-1 text-xs border rounded ${isManual ? "border-orange-300" : ""}`}
          value={entry.calories || ""}
          readOnly={entry.catalog_verified}
          onChange={e => onChange(slotDef.key, "calories", parseFloat(e.target.value) || "")} />
      </div>
      <div className="col-span-3 sm:col-span-1">
        <input type="number" placeholder="P(g)"
          className="w-full px-2 py-1 text-xs border rounded"
          value={entry.protein || ""}
          readOnly={entry.catalog_verified}
          onChange={e => onChange(slotDef.key, "protein", parseFloat(e.target.value) || "")} />
      </div>
      <div className="col-span-3 sm:col-span-1">
        <input type="number" placeholder="C(g)"
          className="w-full px-2 py-1 text-xs border rounded"
          value={entry.carbs || ""}
          readOnly={entry.catalog_verified}
          onChange={e => onChange(slotDef.key, "carbs", parseFloat(e.target.value) || "")} />
      </div>
      <div className="col-span-3 sm:col-span-1">
        <input type="number" placeholder="F(g)"
          className="w-full px-2 py-1 text-xs border rounded"
          value={entry.fat || ""}
          readOnly={entry.catalog_verified}
          onChange={e => onChange(slotDef.key, "fat", parseFloat(e.target.value) || "")} />
      </div>
      <div className="col-span-12 sm:col-span-2">
        <input type="text" placeholder="note (e.g. Any 3 days)"
          className="w-full px-2 py-1 text-xs border rounded"
          defaultValue={entry.slot_note}
          onBlur={e => onChange(slotDef.key, "slot_note", e.target.value)} />
      </div>
    </div>
  );
});

export default function ModeC_BuildFromScratch({ client, onSaved }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [planDuration, setPlanDuration] = useState(7);
  const [validFrom, setValidFrom] = useState(format(new Date(), "yyyy-MM-dd"));
  const [activeDay, setActiveDay] = useState(1);
  const [days, setDays] = useState(() => Array.from({ length: 7 }, (_, i) => ({ day: i + 1, ...emptyDay() })));
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyTargets, setCopyTargets] = useState([]);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedPlanId, setSavedPlanId] = useState(null);

  const targetCal = client?.target_calories || 1400;
  const validUntil = validFrom ? format(addDays(new Date(validFrom), planDuration), "yyyy-MM-dd") : "";

  // Sync days array when duration changes
  const handleDurationChange = useCallback((dur) => {
    const d = parseInt(dur);
    setPlanDuration(d);
    setDays(prev => {
      if (d > prev.length) {
        const extra = Array.from({ length: d - prev.length }, (_, i) => ({
          day: prev.length + i + 1, ...emptyDay()
        }));
        return [...prev, ...extra];
      }
      return prev.slice(0, d);
    });
    if (activeDay > d) setActiveDay(d);
  }, [activeDay]);

  // Update a slot field for the active day
  const handleSlotChange = useCallback((slotKey, field, value) => {
    setDays(prev => {
      const updated = [...prev];
      const dayData = { ...updated[activeDay - 1] };
      if (field === "__batch__") {
        dayData.slots = { ...dayData.slots, [slotKey]: { ...dayData.slots[slotKey], ...value } };
      } else {
        dayData.slots = { ...dayData.slots, [slotKey]: { ...dayData.slots[slotKey], [field]: value } };
      }
      updated[activeDay - 1] = dayData;
      return updated;
    });
  }, [activeDay]);

  const handleDayNote = useCallback((e) => {
    const val = e.target.value;
    setDays(prev => {
      const updated = [...prev];
      updated[activeDay - 1] = { ...updated[activeDay - 1], day_note: val };
      return updated;
    });
  }, [activeDay]);

  // Copy current day to all days
  const handleCopyToAll = useCallback(() => {
    if (!window.confirm(`This will overwrite all other days with Day ${activeDay}'s content. Continue?`)) return;
    const source = days[activeDay - 1];
    setDays(prev => prev.map((d, i) =>
      i === activeDay - 1 ? d : { ...d, slots: JSON.parse(JSON.stringify(source.slots)), day_note: source.day_note }
    ));
    toast.success("Copied to all days!");
  }, [activeDay, days]);

  const handleCopyToSelected = useCallback(() => {
    const source = days[activeDay - 1];
    setDays(prev => prev.map((d, i) =>
      copyTargets.includes(i + 1)
        ? { ...d, slots: JSON.parse(JSON.stringify(source.slots)), day_note: source.day_note }
        : d
    ));
    setShowCopyModal(false);
    setCopyTargets([]);
    toast.success(`Copied to ${copyTargets.length} day(s)!`);
  }, [activeDay, days, copyTargets]);

  // Day macro totals
  const dayTotals = useMemo(() => {
    return days.map(d => {
      let cal = 0, prot = 0, carb = 0, fat = 0;
      SLOT_DEFS.forEach(s => {
        const e = d.slots[s.key];
        if (e?.calories) cal += parseFloat(e.calories) || 0;
        if (e?.protein) prot += parseFloat(e.protein) || 0;
        if (e?.carbs) carb += parseFloat(e.carbs) || 0;
        if (e?.fat) fat += parseFloat(e.fat) || 0;
      });
      return { cal: Math.round(cal), prot: Math.round(prot * 10) / 10, carb: Math.round(carb * 10) / 10, fat: Math.round(fat * 10) / 10 };
    });
  }, [days]);

  const activeTotals = dayTotals[activeDay - 1] || {};
  const calDiff = activeTotals.cal - targetCal;
  const calColor = Math.abs(calDiff) <= 100 ? "text-green-600" : Math.abs(calDiff) <= 200 ? "text-orange-500" : "text-red-600";
  const calBg = Math.abs(calDiff) <= 100 ? "bg-green-50 border-green-200" : Math.abs(calDiff) <= 200 ? "bg-orange-50 border-orange-200" : "bg-red-50 border-red-200";

  const handleSave = async (asDraft = true) => {
    setIsSaving(true);
    try {
      const nowUTC = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istNow = new Date(nowUTC.getTime() + istOffset);
      const planName = `${client.full_name} — Build From Scratch (${planDuration}d) | ${format(istNow, "dd MMM yyyy h:mm a")} IST`;

      const meals = [];
      days.forEach(d => {
        SLOT_DEFS.forEach(s => {
          const e = d.slots[s.key];
          if (!e?.dish_name) return;
          meals.push({
            day: d.day,
            meal_type: s.key,
            meal_name: e.dish_name,
            items: [e.dish_name],
            portion_sizes: [e.qty_note || e.portion_size || "medium"],
            calories: parseFloat(e.calories) || 0,
            protein: parseFloat(e.protein) || 0,
            carbs: parseFloat(e.carbs) || 0,
            fats: parseFloat(e.fat) || 0,
            slot_note: e.slot_note || "",
            catalog_verified: e.catalog_verified !== false,
          });
        });
      });

      const dayObjects = days.map((d, i) => ({
        day_number: d.day,
        day_note: d.day_note || "",
        daily_total_kcal: dayTotals[i].cal,
        daily_total_protein: dayTotals[i].prot,
        daily_total_carbs: dayTotals[i].carb,
        daily_total_fat: dayTotals[i].fat,
      }));

      const saved = await base44.entities.MealPlan.create({
        client_id: client.id,
        name: planName,
        duration: planDuration,
        meals,
        food_preference: client.food_preference || "veg",
        regional_preference: client.regional_preference || "all",
        target_calories: targetCal,
        active: !asDraft,
        plan_tier: "basic",
        creation_mode: "C",
        valid_from: validFrom,
        valid_until: validUntil,
        day_objects: dayObjects,
        created_at_ist: istNow.toISOString(),
      });

      setSavedPlanId(saved.id);
      queryClient.invalidateQueries(["clientMealPlans", client.id]);
      toast.success(asDraft ? "Saved as draft!" : "Plan saved and activated!");
      onSaved?.(saved);
    } catch (err) {
      toast.error("Save failed: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) { toast.error("Enter a template name"); return; }
    setIsSaving(true);
    try {
      const meals = [];
      days.forEach(d => {
        SLOT_DEFS.forEach(s => {
          const e = d.slots[s.key];
          if (!e?.dish_name) return;
          meals.push({
            day: d.day,
            meal_type: s.key,
            meal_name: e.dish_name,
            items: [e.dish_name],
            portion_sizes: [e.qty_note || e.portion_size || "medium"],
            calories: parseFloat(e.calories) || 0,
            protein: parseFloat(e.protein) || 0,
            carbs: parseFloat(e.carbs) || 0,
            fats: parseFloat(e.fat) || 0,
          });
        });
      });
      await base44.entities.MealPlanTemplate.create({
        name: templateName,
        description: `Created via Build From Scratch for ${client.full_name}`,
        category: "general",
        duration: planDuration,
        target_calories: targetCal,
        food_preference: client.food_preference || "veg",
        regional_preference: client.regional_preference || "all",
        meals,
        is_public: false,
        times_used: 0,
        tags: [client.food_preference || "veg", `${targetCal}cal`, `${planDuration}days`],
      });
      toast.success("Template saved!");
      setShowSaveTemplate(false);
    } catch (err) {
      toast.error("Failed: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (step === 1) {
    return (
      <Card className="border-indigo-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-indigo-800">Build From Scratch — Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-indigo-50 rounded-lg text-sm">
            <span className="font-medium text-indigo-800">Client: </span>
            <span className="text-gray-700">{client.full_name}</span>
            <span className="ml-3 text-gray-500">· {targetCal} kcal/day · {client.food_preference}</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Plan Duration</Label>
              <Select value={String(planDuration)} onValueChange={handleDurationChange}>
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
          <Button onClick={() => setStep(2)} className="w-full bg-indigo-600 hover:bg-indigo-700">
            Continue → Build Day-by-Day
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Day tabs */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="text-xs text-gray-400 shrink-0" onClick={() => setStep(1)}>← Setup</Button>
        <div className="flex gap-1 overflow-x-auto pb-1 flex-1">
          {Array.from({ length: planDuration }, (_, i) => i + 1).map(d => {
            const t = dayTotals[d - 1] || {};
            const diff = (t.cal || 0) - targetCal;
            const dotColor = !t.cal ? "bg-gray-300" : Math.abs(diff) <= 100 ? "bg-green-400" : Math.abs(diff) <= 200 ? "bg-orange-400" : "bg-red-400";
            return (
              <button key={d} type="button" onClick={() => setActiveDay(d)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${activeDay === d ? "bg-indigo-600 text-white shadow" : "bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50"}`}>
                <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                Day {d}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day header */}
      <div className={`flex items-center justify-between p-3 rounded-xl border ${calBg}`}>
        <div>
          <span className="font-semibold text-sm text-gray-800">Day {activeDay} of {planDuration}</span>
          <span className="ml-3 text-xs text-gray-500">Target: {targetCal} kcal</span>
        </div>
        <div className="text-right">
          <span className={`font-bold text-sm ${calColor}`}>{activeTotals.cal || 0} kcal</span>
          {activeTotals.cal > 0 && (
            <span className={`text-xs ml-1 ${calColor}`}>
              ({calDiff > 0 ? "+" : ""}{calDiff} kcal)
            </span>
          )}
          <div className="text-xs text-gray-500">P{activeTotals.prot || 0}g · C{activeTotals.carb || 0}g · F{activeTotals.fat || 0}g</div>
        </div>
      </div>

      {/* Copy controls */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="text-xs" onClick={handleCopyToAll}>
          <Copy className="w-3 h-3 mr-1" /> Copy to all days
        </Button>
        <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowCopyModal(true)}>
          <Copy className="w-3 h-3 mr-1" /> Copy to selected days →
        </Button>
      </div>

      {/* Day note */}
      <div>
        <Label className="text-xs font-medium text-gray-600">Day note for client (optional)</Label>
        <input
          type="text"
          placeholder="e.g. Light day — avoid heavy exercise"
          defaultValue={days[activeDay - 1]?.day_note || ""}
          onBlur={handleDayNote}
          className="w-full mt-1 px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300"
        />
      </div>

      {/* Slot grid header */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-3">
          <div className="grid grid-cols-12 gap-1 mb-2 text-xs font-semibold text-gray-500 hidden sm:grid">
            <div className="col-span-1">Slot</div>
            <div className="col-span-3">Dish</div>
            <div className="col-span-2">Portion</div>
            <div className="col-span-1">Kcal</div>
            <div className="col-span-1">Prot</div>
            <div className="col-span-1">Carb</div>
            <div className="col-span-1">Fat</div>
            <div className="col-span-2">Note</div>
          </div>

          {SLOT_DEFS.map(sd => (
            <SlotRow
              key={`${activeDay}-${sd.key}`}
              slotDef={sd}
              entry={days[activeDay - 1]?.slots[sd.key] || emptySlotEntry()}
              onChange={handleSlotChange}
            />
          ))}
        </CardContent>
      </Card>

      {/* Day summary */}
      <Card className={`border ${calBg}`}>
        <CardContent className="p-3">
          <p className="font-semibold text-sm text-gray-800">Day {activeDay} Summary</p>
          <div className="flex flex-wrap gap-4 mt-1 text-sm">
            <span className={`font-bold ${calColor}`}>
              {activeTotals.cal || 0} / {targetCal} kcal
              {activeTotals.cal > 0 && <span className="ml-1">{Math.abs(calDiff) <= 100 ? "✓ On target" : Math.abs(calDiff) <= 200 ? "~ Near target" : "⚠ Off target"}</span>}
            </span>
            <span className="text-gray-600">P: {activeTotals.prot || 0}g</span>
            <span className="text-gray-600">C: {activeTotals.carb || 0}g</span>
            <span className="text-gray-600">F: {activeTotals.fat || 0}g</span>
          </div>
        </CardContent>
      </Card>

      {/* Save buttons */}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button variant="outline" size="sm" className="text-xs border-gray-300" onClick={() => handleSave(true)} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
          Save as Draft
        </Button>
        <Button variant="outline" size="sm" className="text-xs border-indigo-300 text-indigo-700" onClick={() => setShowSaveTemplate(true)}>
          <Save className="w-3 h-3 mr-1" /> Save as Template
        </Button>
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs flex-1" onClick={() => handleSave(false)} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
          Preview & Save
        </Button>
      </div>

      {/* Copy to selected modal */}
      <Dialog open={showCopyModal} onOpenChange={setShowCopyModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Copy Day {activeDay} to selected days</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-gray-500">Select days to copy to (will overwrite):</p>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: planDuration }, (_, i) => i + 1)
                .filter(d => d !== activeDay)
                .map(d => (
                  <label key={d} className="flex items-center gap-1 text-xs cursor-pointer">
                    <input type="checkbox" checked={copyTargets.includes(d)}
                      onChange={e => setCopyTargets(prev =>
                        e.target.checked ? [...prev, d] : prev.filter(x => x !== d)
                      )} />
                    Day {d}
                  </label>
                ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => { setShowCopyModal(false); setCopyTargets([]); }}>Cancel</Button>
              <Button size="sm" className="flex-1 text-xs bg-indigo-600 hover:bg-indigo-700"
                disabled={copyTargets.length === 0}
                onClick={handleCopyToSelected}>
                Copy to {copyTargets.length} day(s)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save as template modal */}
      <Dialog open={showSaveTemplate} onOpenChange={setShowSaveTemplate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Save as Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Template name *</Label>
              <Input placeholder="e.g. Veg 1400 kcal 7-day plan"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                className="mt-1 h-9 text-sm" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setShowSaveTemplate(false)}>Cancel</Button>
              <Button size="sm" className="flex-1 text-xs bg-green-600 hover:bg-green-700"
                onClick={handleSaveTemplate} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                Save to My Templates
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}