import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Loader2, Save, Send, Plus, X } from "lucide-react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// ── Constants ──────────────────────────────────────────────────────────────
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

const emptyDish = () => ({
  dish_name: "",
  dish_id: null,
  portion_size: "medium",
  portion_label: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  dish_note: "",
  catalog_verified: false,
  // stored for S/M/L switching
  _dish_ref: null,
});

const emptyDay = () =>
  SLOT_DEFS.reduce((acc, s) => { acc[s.key] = [emptyDish()]; return acc; }, {});

// ── Diet filter ────────────────────────────────────────────────────────────
function dietEligible(dish, foodPref) {
  const t = (dish.diet_type || "").toLowerCase();
  if (foodPref === "jain")       return t === "jain";
  if (foodPref === "veg")        return ["veg", "jain", "all"].includes(t);
  if (foodPref === "eggetarian") return ["veg", "jain", "egg", "eggetarian", "all"].includes(t);
  return true; // non_veg — all
}

// ── DishSearchInput — defined OUTSIDE main component ──────────────────────
const DishSearchInput = React.memo(function DishSearchInput({
  value, allDishes, foodPref, onSelect, onManualCommit,
}) {
  const [text, setText] = useState(value || "");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);

  // Sync when value resets (e.g., day switch)
  useEffect(() => { setText(value || ""); }, [value]);

  const search = useCallback((q) => {
    if (!q || q.length < 2) { setResults([]); setOpen(false); return; }
    const lower = q.toLowerCase();
    const hits = allDishes
      .filter(d => dietEligible(d, foodPref) && d.name?.toLowerCase().includes(lower))
      .slice(0, 8);
    setResults(hits);
    setOpen(hits.length > 0);
  }, [allDishes, foodPref]);

  const handleChange = useCallback((e) => {
    const v = e.target.value;
    setText(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 300);
  }, [search]);

  const handlePick = useCallback((dish) => {
    setText(dish.name);
    setOpen(false);
    setResults([]);
    onSelect(dish);
  }, [onSelect]);

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      setOpen(false);
      if (text !== value) onManualCommit(text);
    }, 200);
  }, [text, value, onManualCommit]);

  return (
    <div className="relative">
      <input
        type="text"
        value={text}
        onChange={handleChange}
        onFocus={() => text.length >= 2 && search(text)}
        onBlur={handleBlur}
        placeholder="Search dish or type..."
        className="w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-indigo-300"
      />
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-xl z-40 max-h-44 overflow-y-auto">
          {results.map(d => (
            <button key={d.id || d.dish_id} type="button"
              onMouseDown={() => handlePick(d)}
              className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 text-xs border-b last:border-0">
              <span className="font-medium">{d.name}</span>
              <span className="text-gray-400 ml-1">· {d.medium_kcal || d.calories || "?"}kcal</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

// ── SlotBlock — one slot with all its dish rows ───────────────────────────
const SlotBlock = React.memo(function SlotBlock({
  slotDef, rows, targetCal, allDishes, foodPref,
  onAddRow, onRemoveRow, onSelectDish, onManualCommit, onPortionChange, onNoteBlur,
}) {
  const slotKcal = rows.reduce((s, r) => s + (parseFloat(r.calories) || 0), 0);
  const slotTarget = Math.round(targetCal * slotDef.pct);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white mb-2">
      {/* Slot header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
        <div>
          <span className="font-semibold text-sm text-gray-800">{slotDef.label}</span>
          <span className="text-xs text-gray-400 ml-2">target {slotTarget} kcal ({Math.round(slotDef.pct * 100)}% of {targetCal})</span>
        </div>
        {slotKcal > 0 && (
          <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
            {Math.round(slotKcal)} kcal
          </span>
        )}
      </div>

      {/* Dish rows */}
      <div className="px-3 pt-2 pb-1 space-y-2">
        {rows.map((row, idx) => (
          <DishRow
            key={idx}
            row={row}
            rowIdx={idx}
            slotKey={slotDef.key}
            allDishes={allDishes}
            foodPref={foodPref}
            canRemove={rows.length > 1}
            onSelect={(dish) => onSelectDish(slotDef.key, idx, dish)}
            onManualCommit={(name) => onManualCommit(slotDef.key, idx, name)}
            onPortionChange={(size) => onPortionChange(slotDef.key, idx, size)}
            onNoteBlur={(note) => onNoteBlur(slotDef.key, idx, note)}
            onRemove={() => onRemoveRow(slotDef.key, idx)}
          />
        ))}

        {/* Add Dish button — always visible, no limit */}
        <button
          type="button"
          onClick={() => onAddRow(slotDef.key)}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 py-1 font-medium"
        >
          <Plus className="w-3.5 h-3.5" /> Add Dish
        </button>
      </div>
    </div>
  );
});

// ── DishRow — defined OUTSIDE ──────────────────────────────────────────────
const DishRow = React.memo(function DishRow({
  row, slotKey, allDishes, foodPref,
  canRemove, onSelect, onManualCommit, onPortionChange, onNoteBlur, onRemove,
}) {
  const isManual = !row.catalog_verified && !!row.dish_name;
  const hasCatalog = row.catalog_verified && row.dish_id;

  return (
    <div className="flex flex-wrap items-start gap-1.5 py-1.5 border-b border-gray-100 last:border-0">
      {/* Dish search */}
      <div className="w-full sm:w-48 shrink-0">
        <DishSearchInput
          value={row.dish_name}
          allDishes={allDishes}
          foodPref={foodPref}
          onSelect={onSelect}
          onManualCommit={onManualCommit}
        />
        {isManual && <span className="text-xs text-orange-500 leading-none">Manual — not in catalog</span>}
      </div>

      {/* S/M/L toggle — only for catalog dishes */}
      {hasCatalog && (
        <div className="flex items-center gap-0.5 shrink-0">
          {["small", "medium", "large"].map(size => (
            <button
              key={size}
              type="button"
              onClick={() => onPortionChange(size)}
              className={`px-2 py-1 text-xs rounded font-semibold border transition-colors ${
                row.portion_size === size
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-indigo-50"
              }`}
            >
              {size[0].toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {/* Portion label */}
      <div className="shrink-0">
        {hasCatalog ? (
          <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-200 inline-block min-w-[80px]">
            {row.portion_label || "—"}
          </span>
        ) : (
          <input
            type="text"
            placeholder="qty / portion"
            defaultValue={row.portion_label}
            onBlur={e => onNoteBlur("__portion_label__" + e.target.value)}
            className="w-24 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-indigo-300"
          />
        )}
      </div>

      {/* Kcal / macros — read-only if catalog */}
      {["calories", "protein", "carbs", "fat"].map((field, fi) => (
        <input
          key={field}
          type="number"
          placeholder={["kcal","P","C","F"][fi]}
          value={row[field] || ""}
          readOnly={row.catalog_verified}
          onChange={row.catalog_verified ? undefined : (e) => {
            // manual override handled by parent via onManualCommit mechanism
            // We need a separate callback for this — handled via onNoteBlur trick
          }}
          onBlur={row.catalog_verified ? undefined : (e) => onNoteBlur(`__${field}__${e.target.value}`)}
          className={`w-14 px-1.5 py-1 text-xs border rounded text-center ${
            row.catalog_verified
              ? "bg-gray-100 text-gray-600 cursor-not-allowed"
              : "border-orange-300 focus:outline-none focus:ring-1 focus:ring-orange-300"
          }`}
        />
      ))}

      {/* Dish note */}
      <input
        type="text"
        placeholder="note..."
        defaultValue={row.dish_note}
        onBlur={e => onNoteBlur(e.target.value)}
        className="flex-1 min-w-[80px] px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-gray-300"
      />

      {/* Remove */}
      <button type="button" onClick={onRemove}
        className={`p-1 rounded ${canRemove ? "text-red-400 hover:text-red-600" : "text-gray-200 cursor-not-allowed"}`}
        disabled={!canRemove}>
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
});

// ── Main component ─────────────────────────────────────────────────────────
export default function ModeC_BuildFromScratch({ client, onSaved }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [planDuration, setPlanDuration] = useState(7);
  const [validFrom, setValidFrom] = useState(format(new Date(), "yyyy-MM-dd"));
  const [activeDay, setActiveDay] = useState(1);
  const [days, setDays] = useState(() =>
    Array.from({ length: 7 }, (_, i) => ({ day: i + 1, day_note: "", slots: emptyDay() }))
  );
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyTargets, setCopyTargets] = useState([]);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const targetCal = client?.target_calories || 1400;
  const foodPref = (client?.food_preference || "veg").toLowerCase();
  const validUntil = validFrom ? format(addDays(new Date(validFrom), planDuration), "yyyy-MM-dd") : "";

  // ── Load DishCatalog ONCE on mount ──
  const { data: allDishes = [] } = useQuery({
    queryKey: ["dishCatalog"],
    queryFn: () => base44.entities.DishCatalog.list(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // ── Duration change ──
  const handleDurationChange = useCallback((dur) => {
    const d = parseInt(dur);
    setPlanDuration(d);
    setDays(prev => {
      if (d > prev.length) {
        const extra = Array.from({ length: d - prev.length }, (_, i) => ({
          day: prev.length + i + 1, day_note: "", slots: emptyDay(),
        }));
        return [...prev, ...extra];
      }
      return prev.slice(0, d);
    });
    setActiveDay(a => Math.min(a, d));
  }, []);

  // ── Add / remove dish rows ──
  const addRow = useCallback((slotKey) => {
    setDays(prev => {
      const updated = [...prev];
      const day = { ...updated[activeDay - 1] };
      day.slots = { ...day.slots, [slotKey]: [...(day.slots[slotKey] || []), emptyDish()] };
      updated[activeDay - 1] = day;
      return updated;
    });
  }, [activeDay]);

  const removeRow = useCallback((slotKey, rowIdx) => {
    setDays(prev => {
      const updated = [...prev];
      const day = { ...updated[activeDay - 1] };
      const rows = [...(day.slots[slotKey] || [])];
      if (rows.length <= 1) {
        // Reset to one empty row rather than removing
        rows[0] = emptyDish();
      } else {
        rows.splice(rowIdx, 1);
      }
      day.slots = { ...day.slots, [slotKey]: rows };
      updated[activeDay - 1] = day;
      return updated;
    });
  }, [activeDay]);

  // ── Select dish from catalog ──
  const selectDish = useCallback((slotKey, rowIdx, dish) => {
    const calories = dish.medium_kcal || dish.calories || 0;
    const base = dish.calories || 1;
    const ratio = calories / base;
    setDays(prev => {
      const updated = [...prev];
      const day = { ...updated[activeDay - 1] };
      const rows = [...(day.slots[slotKey] || [])];
      rows[rowIdx] = {
        dish_name: dish.name,
        dish_id: dish.dish_id || dish.id,
        portion_size: "medium",
        portion_label: dish.medium_label || "",
        calories,
        protein: Math.round((dish.protein || 0) * ratio * 10) / 10,
        carbs:   Math.round((dish.carbs   || 0) * ratio * 10) / 10,
        fat:     Math.round((dish.fats    || 0) * ratio * 10) / 10,
        dish_note: rows[rowIdx]?.dish_note || "",
        catalog_verified: true,
        _dish_ref: dish,
      };
      day.slots = { ...day.slots, [slotKey]: rows };
      updated[activeDay - 1] = day;
      return updated;
    });
  }, [activeDay]);

  // ── Manual commit (typed dish name, no catalog match) ──
  const manualCommit = useCallback((slotKey, rowIdx, name) => {
    if (!name) return;
    setDays(prev => {
      const updated = [...prev];
      const day = { ...updated[activeDay - 1] };
      const rows = [...(day.slots[slotKey] || [])];
      // Only update name + clear catalog fields if it changed
      if (rows[rowIdx]?.dish_name === name) return prev;
      rows[rowIdx] = {
        ...rows[rowIdx],
        dish_name: name,
        dish_id: null,
        catalog_verified: false,
        _dish_ref: null,
      };
      day.slots = { ...day.slots, [slotKey]: rows };
      updated[activeDay - 1] = day;
      return updated;
    });
  }, [activeDay]);

  // ── S/M/L portion switch ──
  const portionChange = useCallback((slotKey, rowIdx, size) => {
    setDays(prev => {
      const updated = [...prev];
      const day = { ...updated[activeDay - 1] };
      const rows = [...(day.slots[slotKey] || [])];
      const row = rows[rowIdx];
      if (!row?.catalog_verified || !row._dish_ref) return prev;
      const dish = row._dish_ref;
      const kcal  = size === "small" ? dish.small_kcal  : size === "large" ? dish.large_kcal  : dish.medium_kcal;
      const label = size === "small" ? dish.small_label : size === "large" ? dish.large_label : dish.medium_label;
      const base = dish.calories || 1;
      const ratio = (kcal || base) / base;
      rows[rowIdx] = {
        ...row,
        portion_size: size,
        portion_label: label || "",
        calories: kcal || dish.calories || 0,
        protein: Math.round((dish.protein || 0) * ratio * 10) / 10,
        carbs:   Math.round((dish.carbs   || 0) * ratio * 10) / 10,
        fat:     Math.round((dish.fats    || 0) * ratio * 10) / 10,
      };
      day.slots = { ...day.slots, [slotKey]: rows };
      updated[activeDay - 1] = day;
      return updated;
    });
  }, [activeDay]);

  // ── Note blur handler (handles dish_note + manual macro overrides) ──
  const noteBlur = useCallback((slotKey, rowIdx, raw) => {
    setDays(prev => {
      const updated = [...prev];
      const day = { ...updated[activeDay - 1] };
      const rows = [...(day.slots[slotKey] || [])];
      const row = { ...rows[rowIdx] };

      if (raw.startsWith("__portion_label__")) {
        row.portion_label = raw.slice("__portion_label__".length);
      } else if (raw.startsWith("__calories__")) {
        row.calories = parseFloat(raw.slice("__calories__".length)) || "";
      } else if (raw.startsWith("__protein__")) {
        row.protein = parseFloat(raw.slice("__protein__".length)) || "";
      } else if (raw.startsWith("__carbs__")) {
        row.carbs = parseFloat(raw.slice("__carbs__".length)) || "";
      } else if (raw.startsWith("__fat__")) {
        row.fat = parseFloat(raw.slice("__fat__".length)) || "";
      } else {
        row.dish_note = raw;
      }

      rows[rowIdx] = row;
      day.slots = { ...day.slots, [slotKey]: rows };
      updated[activeDay - 1] = day;
      return updated;
    });
  }, [activeDay]);

  // ── Day note ──
  const handleDayNote = useCallback((e) => {
    const val = e.target.value;
    setDays(prev => {
      const updated = [...prev];
      updated[activeDay - 1] = { ...updated[activeDay - 1], day_note: val };
      return updated;
    });
  }, [activeDay]);

  // ── Copy to all ──
  const handleCopyToAll = useCallback(() => {
    if (!window.confirm(`Overwrite all other days with Day ${activeDay}? Continue?`)) return;
    const src = days[activeDay - 1];
    setDays(prev => prev.map((d, i) =>
      i === activeDay - 1 ? d : { ...d, slots: JSON.parse(JSON.stringify(src.slots)), day_note: src.day_note }
    ));
    toast.success("Copied to all days!");
  }, [activeDay, days]);

  const handleCopyToSelected = useCallback(() => {
    const src = days[activeDay - 1];
    setDays(prev => prev.map((d, i) =>
      copyTargets.includes(i + 1)
        ? { ...d, slots: JSON.parse(JSON.stringify(src.slots)), day_note: src.day_note }
        : d
    ));
    setShowCopyModal(false);
    setCopyTargets([]);
    toast.success(`Copied to ${copyTargets.length} day(s)!`);
  }, [activeDay, days, copyTargets]);

  // ── Day totals ──
  const dayTotals = useMemo(() => {
    return days.map(d => {
      let cal = 0, prot = 0, carb = 0, fat = 0;
      SLOT_DEFS.forEach(s => {
        (d.slots[s.key] || []).forEach(r => {
          cal  += parseFloat(r.calories) || 0;
          prot += parseFloat(r.protein)  || 0;
          carb += parseFloat(r.carbs)    || 0;
          fat  += parseFloat(r.fat)      || 0;
        });
      });
      return {
        cal:  Math.round(cal),
        prot: Math.round(prot * 10) / 10,
        carb: Math.round(carb * 10) / 10,
        fat:  Math.round(fat  * 10) / 10,
      };
    });
  }, [days]);

  const activeTotals = dayTotals[activeDay - 1] || {};
  const calDiff = (activeTotals.cal || 0) - targetCal;
  const calColor = Math.abs(calDiff) <= 100 ? "text-green-600" : Math.abs(calDiff) <= 200 ? "text-orange-500" : "text-red-600";
  const calBg    = Math.abs(calDiff) <= 100 ? "bg-green-50 border-green-200" : Math.abs(calDiff) <= 200 ? "bg-orange-50 border-orange-200" : "bg-red-50 border-red-200";

  // ── Build save payload ──
  const buildDayPayload = useCallback((d, totals) => {
    const filledSlots = SLOT_DEFS
      .map(s => {
        const dishes = (d.slots[s.key] || []).filter(r => r.dish_name?.trim());
        if (!dishes.length) return null;
        const slotKcal = dishes.reduce((sum, r) => sum + (parseFloat(r.calories) || 0), 0);
        return {
          slot_name: s.key,
          slot_order: s.order,
          slot_total_kcal:    Math.round(slotKcal),
          slot_total_protein: Math.round(dishes.reduce((sum, r) => sum + (parseFloat(r.protein) || 0), 0) * 10) / 10,
          slot_total_carbs:   Math.round(dishes.reduce((sum, r) => sum + (parseFloat(r.carbs)   || 0), 0) * 10) / 10,
          slot_total_fat:     Math.round(dishes.reduce((sum, r) => sum + (parseFloat(r.fat)     || 0), 0) * 10) / 10,
          dishes: dishes.map(r => ({
            dish_name:       r.dish_name,
            dish_id:         r.dish_id || null,
            portion_size:    r.portion_size || "medium",
            portion_label:   r.portion_label || "",
            calories:        parseFloat(r.calories) || 0,
            protein:         parseFloat(r.protein)  || 0,
            carbs:           parseFloat(r.carbs)    || 0,
            fat:             parseFloat(r.fat)      || 0,
            dish_note:       r.dish_note || "",
            catalog_verified: r.catalog_verified !== false,
          })),
        };
      })
      .filter(Boolean);

    return {
      day_number: d.day,
      day_note: d.day_note || "",
      slots: filledSlots,
      daily_total_kcal:    totals.cal,
      daily_total_protein: totals.prot,
      daily_total_carbs:   totals.carb,
      daily_total_fat:     totals.fat,
    };
  }, []);

  // ── Save ──
  const handleSave = async (asDraft = true) => {
    setIsSaving(true);
    try {
      const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
      const planName = `${client.full_name} — Build From Scratch (${planDuration}d) | ${format(nowIST, "dd MMM yyyy h:mm a")} IST`;

      // Flatten to MealPlan.meals format (one row per dish per day)
      const meals = [];
      days.forEach(d => {
        SLOT_DEFS.forEach(s => {
          const dishRows = (d.slots[s.key] || []).filter(r => r.dish_name?.trim());
          if (!dishRows.length) return;
          meals.push({
            day: d.day,
            meal_type: s.key,
            meal_name: dishRows.map(r => r.dish_name).join(" + "),
            items: dishRows.map(r => r.dish_name),
            portion_sizes: dishRows.map(r => r.portion_label || r.portion_size || "medium"),
            calories: Math.round(dishRows.reduce((s2, r) => s2 + (parseFloat(r.calories) || 0), 0)),
            protein:  Math.round(dishRows.reduce((s2, r) => s2 + (parseFloat(r.protein)  || 0), 0) * 10) / 10,
            carbs:    Math.round(dishRows.reduce((s2, r) => s2 + (parseFloat(r.carbs)    || 0), 0) * 10) / 10,
            fats:     Math.round(dishRows.reduce((s2, r) => s2 + (parseFloat(r.fat)      || 0), 0) * 10) / 10,
          });
        });
      });

      const dayObjects = days.map((d, i) => buildDayPayload(d, dayTotals[i] || {}));

      await base44.entities.MealPlan.create({
        client_id:          client.id,
        name:               planName,
        duration:           planDuration,
        meals,
        food_preference:    client.food_preference || "veg",
        regional_preference: client.regional_preference || "all",
        target_calories:    targetCal,
        active:             !asDraft,
        plan_tier:          "basic",
        creation_mode:      "C",
        valid_from:         validFrom,
        valid_until:        validUntil,
        day_objects:        dayObjects,
        created_at_ist:     nowIST.toISOString(),
      });

      queryClient.invalidateQueries(["clientMealPlans", client.id]);
      toast.success(asDraft ? "Saved as draft!" : "Plan saved and activated!");
      onSaved?.();
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
          (d.slots[s.key] || []).filter(r => r.dish_name?.trim()).forEach(r => {
            meals.push({
              day: d.day, meal_type: s.key, meal_name: r.dish_name,
              items: [r.dish_name], portion_sizes: [r.portion_label || r.portion_size || "medium"],
              calories: parseFloat(r.calories) || 0, protein: parseFloat(r.protein) || 0,
              carbs: parseFloat(r.carbs) || 0, fats: parseFloat(r.fat) || 0,
            });
          });
        });
      });
      await base44.entities.MealPlanTemplate.create({
        name: templateName,
        description: `Created via Build From Scratch for ${client.full_name}`,
        category: "general", duration: planDuration,
        target_calories: targetCal, food_preference: client.food_preference || "veg",
        regional_preference: client.regional_preference || "all",
        meals, is_public: false, times_used: 0,
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

  // ── STEP 1: Setup ──
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

  // ── STEP 2: Day builder ──
  return (
    <div className="space-y-3">
      {/* Day tabs */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="text-xs text-gray-400 shrink-0" onClick={() => setStep(1)}>← Setup</Button>
        <div className="flex gap-1 overflow-x-auto pb-1 flex-1">
          {Array.from({ length: planDuration }, (_, i) => i + 1).map(d => {
            const t = dayTotals[d - 1] || {};
            const diff = (t.cal || 0) - targetCal;
            const dot = !t.cal ? "bg-gray-300" : Math.abs(diff) <= 100 ? "bg-green-400" : Math.abs(diff) <= 200 ? "bg-orange-400" : "bg-red-400";
            return (
              <button key={d} type="button" onClick={() => setActiveDay(d)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  activeDay === d ? "bg-indigo-600 text-white shadow" : "bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50"
                }`}>
                <span className={`w-2 h-2 rounded-full ${dot}`} />
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
          {(activeTotals.cal || 0) > 0 && (
            <span className={`text-xs ml-1 ${calColor}`}>({calDiff > 0 ? "+" : ""}{calDiff})</span>
          )}
          <div className="text-xs text-gray-500 mt-0.5">P{activeTotals.prot || 0}g · C{activeTotals.carb || 0}g · F{activeTotals.fat || 0}g</div>
        </div>
      </div>

      {/* Copy controls */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="text-xs" onClick={handleCopyToAll}>
          <Copy className="w-3 h-3 mr-1" /> Copy to all days
        </Button>
        <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowCopyModal(true)}>
          <Copy className="w-3 h-3 mr-1" /> Copy to selected →
        </Button>
      </div>

      {/* Day note */}
      <div>
        <Label className="text-xs font-medium text-gray-600">Day note for client (optional)</Label>
        <input
          type="text"
          placeholder="e.g. Light day — avoid heavy exercise"
          key={`day-note-${activeDay}`}
          defaultValue={days[activeDay - 1]?.day_note || ""}
          onBlur={handleDayNote}
          className="w-full mt-1 px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300"
        />
      </div>

      {/* Slot blocks */}
      <div>
        {SLOT_DEFS.map(sd => {
          const rows = days[activeDay - 1]?.slots[sd.key] || [emptyDish()];
          return (
            <SlotBlock
              key={`${activeDay}-${sd.key}`}
              slotDef={sd}
              rows={rows}
              targetCal={targetCal}
              allDishes={allDishes}
              foodPref={foodPref}
              onAddRow={addRow}
              onRemoveRow={removeRow}
              onSelectDish={selectDish}
              onManualCommit={manualCommit}
              onPortionChange={portionChange}
              onNoteBlur={noteBlur}
            />
          );
        })}
      </div>

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
          Preview &amp; Save
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
                disabled={copyTargets.length === 0} onClick={handleCopyToSelected}>
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
                value={templateName} onChange={e => setTemplateName(e.target.value)}
                className="mt-1 h-9 text-sm" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setShowSaveTemplate(false)}>Cancel</Button>
              <Button size="sm" className="flex-1 text-xs bg-green-600 hover:bg-green-700"
                onClick={handleSaveTemplate} disabled={isSaving}>
                {isSaving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                Save to My Templates
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}