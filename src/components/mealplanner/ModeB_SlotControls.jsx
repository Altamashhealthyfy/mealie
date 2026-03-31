/**
 * ModeB_SlotControls
 * ─────────────────
 * Houses all 5 coach controls for Mode B:
 *   1. Swap one option from catalog
 *   2. Regenerate slot (via backend)
 *   3. Add own option (single or combo)
 *   4. Edit option / combo components
 *   (Control 3 — Regenerate All — lives in parent)
 *
 * All components defined OUTSIDE SlotSection to prevent focus loss.
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  X, RefreshCw, Plus, Pencil, ArrowLeftRight,
  ChevronDown, ChevronRight, Check, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];

// ─── Dish Search Hook ───────────────────────────────────────────────
function useDishSearch(dietType) {
  const { data: allDishes = [] } = useQuery({
    queryKey: ["dishCatalog_modeB"],
    queryFn: () => base44.entities.DishCatalog.filter({ status: "verified" }),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const search = useCallback(
    (query, slotFilter) => {
      if (!query || query.length < 2) return [];
      const q = query.toLowerCase();
      const dietMap = {
        jain:       ["jain"],
        veg:        ["veg", "jain", "all"],
        eggetarian: ["veg", "jain", "egg", "eggetarian", "all"],
        non_veg:    ["veg", "jain", "egg", "eggetarian", "non_veg", "all"],
      };
      const eligible = dietMap[(dietType || "veg").toLowerCase().replace(/[\s-]/g, "_")] || ["veg", "all"];
      return allDishes
        .filter(d =>
          eligible.includes(d.diet_type) &&
          (!slotFilter || d.slot === slotFilter) &&
          d.name?.toLowerCase().includes(q)
        )
        .slice(0, 12);
    },
    [allDishes, dietType]
  );

  const getByName = useCallback(
    (name) => {
      const n = name?.toLowerCase().replace(/\s*\(\d+\)\s*/g, "").trim();
      return allDishes.find(d => d.name?.toLowerCase() === n) || null;
    },
    [allDishes]
  );

  return { search, getByName };
}

// ─── Build option from catalog dish ────────────────────────────────
function buildOptionFromDish(dish, existingDays) {
  const cal = dish.medium_kcal || dish.calories || 0;
  const base = dish.calories || 1;
  const ratio = cal / base;
  return {
    dish_name: dish.name,
    dish_id: dish.dish_id || dish.id,
    portion_size: "medium",
    portion_label: dish.medium_label || "1 serving",
    calories: cal,
    protein: Math.round((dish.protein || 0) * ratio * 10) / 10,
    carbs:   Math.round((dish.carbs   || 0) * ratio * 10) / 10,
    fat:     Math.round((dish.fats    || 0) * ratio * 10) / 10,
    diet_type: dish.diet_type || "veg",
    catalog_verified: true,
    recommended_days: existingDays ?? 1,
  };
}

// ─── Build combo option from 3 catalog dishes ─────────────────────
function buildComboFromParts(grain, dal, sabzi, existingDays) {
  const parts = [grain, dal, sabzi].filter(Boolean);
  const components = parts.map(d => {
    const cal = d.medium_kcal || d.calories || 0;
    const base = d.calories || 1;
    const ratio = cal / base;
    return {
      dish_name: d.name,
      dish_id: d.dish_id || d.id,
      calories: cal,
      protein: Math.round((d.protein || 0) * ratio * 10) / 10,
      carbs:   Math.round((d.carbs   || 0) * ratio * 10) / 10,
      fat:     Math.round((d.fats    || 0) * ratio * 10) / 10,
      portion_label: d.medium_label || "1 serving",
      catalog_verified: true,
    };
  });
  const totCal  = components.reduce((s, c) => s + c.calories, 0);
  const totProt = components.reduce((s, c) => s + c.protein, 0);
  const totCarbs = components.reduce((s, c) => s + c.carbs, 0);
  const totFat  = components.reduce((s, c) => s + c.fat, 0);
  return {
    meal_name: parts.map(d => d.name).join(" + "),
    components,
    calories:  Math.round(totCal),
    protein:   Math.round(totProt  * 10) / 10,
    carbs:     Math.round(totCarbs * 10) / 10,
    fat:       Math.round(totFat   * 10) / 10,
    is_combo: true,
    catalog_verified: true,
    recommended_days: existingDays ?? 1,
  };
}

// ─── DishSearchInput — inline typeahead ───────────────────────────
export const DishSearchInput = React.memo(function DishSearchInput({
  placeholder, slotFilter, dietType, onSelect, initialValue = "",
}) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const { search } = useDishSearch(dietType);

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const r = search(v, slotFilter);
      setResults(r);
      setOpen(r.length > 0);
    }, 300);
  };

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder={placeholder || "Search dish…"}
        className="h-8 text-xs"
      />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto mt-0.5">
          {results.map(d => (
            <button
              key={d.id || d.dish_id || d.name}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs"
              onMouseDown={(e) => { e.preventDefault(); onSelect(d); setQuery(d.name); setOpen(false); }}
            >
              <span className="font-medium text-gray-800">{d.name}</span>
              <span className="text-gray-400 ml-2">{d.medium_kcal || d.calories || 0} kcal</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

// ─── ComboBuilder — grain + dal + sabzi picker ────────────────────
export const ComboBuilder = React.memo(function ComboBuilder({
  slotKey, dietType, onConfirm, existingDays, confirmLabel = "Use this combo",
}) {
  const [grain, setGrain]  = useState(null);
  const [dal,   setDal]    = useState(null);
  const [sabzi, setSabzi]  = useState(null);

  const grainSlot = slotKey === "lunch" ? "lunch_grain" : "dinner_grain";
  const dalSlot   = slotKey === "lunch" ? "lunch_dal"   : "dinner_prot";
  const sabziSlot = "lunch_sabzi";

  const previewName = [grain, dal, sabzi].filter(Boolean).map(d => d.name).join(" + ");
  const previewKcal = [grain, dal, sabzi].filter(Boolean).reduce((s, d) => s + (d.medium_kcal || d.calories || 0), 0);

  return (
    <div className="space-y-2">
      <DishSearchInput placeholder="Search grain…" slotFilter={grainSlot} dietType={dietType} onSelect={setGrain}
        initialValue={grain?.name || ""} />
      <DishSearchInput placeholder="Search dal / protein…" slotFilter={dalSlot} dietType={dietType} onSelect={setDal}
        initialValue={dal?.name || ""} />
      <DishSearchInput placeholder="Search sabzi / side…" slotFilter={sabziSlot} dietType={dietType} onSelect={setSabzi}
        initialValue={sabzi?.name || ""} />
      {previewName && (
        <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-800">
          <p className="font-medium">{previewName}</p>
          <p className="text-indigo-600">{previewKcal} kcal combined</p>
        </div>
      )}
      <Button
        size="sm"
        disabled={!grain || !dal}
        onClick={() => onConfirm(buildComboFromParts(grain, dal, sabzi, existingDays))}
        className="w-full text-xs bg-indigo-600 hover:bg-indigo-700"
      >
        {confirmLabel}
      </Button>
    </div>
  );
});

// ─── SwapModal — swap one option with catalog pick ────────────────
export const SwapModal = React.memo(function SwapModal({
  opt, slotKey, dietType, onConfirm, onClose,
}) {
  const isCombo = slotKey === "lunch" || slotKey === "dinner";
  const name = opt.meal_name || opt.dish_name || "this option";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-800 text-sm">Replace "{name.slice(0, 30)}" with…</p>
          <button type="button" onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>

        {isCombo ? (
          <ComboBuilder slotKey={slotKey} dietType={dietType}
            existingDays={opt.recommended_days}
            confirmLabel="Use this combo"
            onConfirm={(combo) => { onConfirm(combo); onClose(); }} />
        ) : (
          <DishSearchInput
            placeholder={`Search replacement for ${name.slice(0, 20)}…`}
            slotFilter={slotKey === "evening_snack" ? "evening_snack" : slotKey}
            dietType={dietType}
            onSelect={(d) => { onConfirm(buildOptionFromDish(d, opt.recommended_days)); onClose(); }}
          />
        )}
      </div>
    </div>
  );
});

// ─── EditModal — edit single option or combo components ──────────
export const EditModal = React.memo(function EditModal({
  opt, slotKey, dietType, onConfirm, onClose,
}) {
  const isCombo = slotKey === "lunch" || slotKey === "dinner";

  if (isCombo) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-800 text-sm">Edit combo</p>
            <button type="button" onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <ComboBuilder slotKey={slotKey} dietType={dietType}
            existingDays={opt.recommended_days}
            confirmLabel="Save changes"
            onConfirm={(combo) => { onConfirm({ ...combo, recommended_days: opt.recommended_days }); onClose(); }} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-800 text-sm">Edit option</p>
          <button type="button" onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <DishSearchInput
          placeholder="Search new dish…"
          slotFilter={slotKey === "evening_snack" ? "evening_snack" : slotKey}
          dietType={dietType}
          initialValue={opt.dish_name || ""}
          onSelect={(d) => { onConfirm(buildOptionFromDish(d, opt.recommended_days)); onClose(); }}
        />
      </div>
    </div>
  );
});

// ─── RegenerateSlotConfirm — inline confirmation ──────────────────
export const RegenerateSlotConfirm = React.memo(function RegenerateSlotConfirm({
  slotLabel, loading, onConfirm, onCancel,
}) {
  return (
    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
      <p className="text-xs font-medium text-amber-800">
        Regenerate <strong>{slotLabel}</strong> options? Current options will be replaced.
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="text-xs flex-1 border-amber-400 text-amber-700"
          onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button size="sm" className="text-xs flex-1 bg-amber-500 hover:bg-amber-600"
          onClick={onConfirm} disabled={loading}>
          {loading ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Generating…</> : "Yes, regenerate"}
        </Button>
      </div>
    </div>
  );
});

// ─── AddOwnOptionPanel — add manual single dish or combo ──────────
export const AddOwnOptionPanel = React.memo(function AddOwnOptionPanel({
  slotKey, slotDef, dietType, onAdd, onCancel,
}) {
  const isCombo = slotKey === "lunch" || slotKey === "dinner";

  if (isCombo) {
    return (
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
        <p className="text-xs font-semibold text-blue-800">Build your {slotDef.label} combo</p>
        <ComboBuilder slotKey={slotKey} dietType={dietType} existingDays={1}
          confirmLabel="Add this combo"
          onConfirm={(combo) => { onAdd(combo); onCancel(); }} />
        <Button size="sm" variant="ghost" className="text-xs w-full text-gray-500" onClick={onCancel}>Cancel</Button>
      </div>
    );
  }

  return (
    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
      <p className="text-xs font-semibold text-blue-800">Add a dish to {slotDef.label}</p>
      <DishSearchInput
        placeholder="Search dish to add…"
        slotFilter={slotKey === "evening_snack" ? "evening_snack" : slotKey}
        dietType={dietType}
        onSelect={(d) => { onAdd(buildOptionFromDish(d, 1)); onCancel(); }}
      />
      <Button size="sm" variant="ghost" className="text-xs w-full text-gray-500" onClick={onCancel}>Cancel</Button>
    </div>
  );
});

// ─── OptionRowActions — Swap / Edit / Remove buttons ─────────────
export const OptionRowActions = React.memo(function OptionRowActions({
  onSwap, onEdit, onRemove, canRemove,
}) {
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <button type="button" onClick={onSwap}
        title="Swap with catalog"
        className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-blue-600 transition-colors">
        <ArrowLeftRight className="w-3.5 h-3.5" />
      </button>
      <button type="button" onClick={onEdit}
        title="Edit"
        className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-green-600 transition-colors">
        <Pencil className="w-3.5 h-3.5" />
      </button>
      {canRemove ? (
        <button type="button" onClick={onRemove}
          title="Remove"
          className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-red-600 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      ) : (
        <button type="button" disabled title="Minimum 2 options required"
          className="p-1 rounded opacity-30 cursor-not-allowed text-gray-300">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
});

export { buildOptionFromDish, buildComboFromParts, OPTION_LABELS };