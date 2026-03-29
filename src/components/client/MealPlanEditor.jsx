import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Pencil, Trash2, Plus, RefreshCw, Save, X, StickyNote,
  ChevronDown, ChevronUp, Loader2, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

const MEAL_ORDER = ["early_morning", "breakfast", "mid_morning", "lunch", "evening_snack", "dinner", "post_dinner"];
const MEAL_LABELS = {
  early_morning: "Early Morning",
  breakfast: "Breakfast",
  mid_morning: "Mid-Morning",
  lunch: "Lunch",
  evening_snack: "Evening Snack",
  dinner: "Dinner",
  post_dinner: "Post Dinner",
};

function getMealLabel(type = "") {
  const key = type.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  return MEAL_LABELS[key] || type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function groupByDay(meals = []) {
  const map = {};
  meals.forEach(m => {
    const d = m.day || 1;
    if (!map[d]) map[d] = [];
    map[d].push(m);
  });
  return map;
}

// ── Inline edit fields for a single meal ──────────────────────────────────────
function MealEditForm({ meal, onSave, onCancel }) {
  const [form, setForm] = useState({
    meal_name: meal.meal_name || "",
    calories: meal.calories || "",
    protein: meal.protein || "",
    carbs: meal.carbs || "",
    fats: meal.fats || "",
    portion: meal.portion_sizes?.[0] || "",
    note: meal.nutritional_tip || "",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    onSave({
      ...meal,
      meal_name: form.meal_name,
      calories: Number(form.calories) || 0,
      protein: Number(form.protein) || 0,
      carbs: Number(form.carbs) || 0,
      fats: Number(form.fats) || 0,
      portion_sizes: form.portion ? [form.portion] : meal.portion_sizes,
      nutritional_tip: form.note,
    });
  };

  return (
    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-600">Meal Name</label>
          <Input value={form.meal_name} onChange={e => set("meal_name", e.target.value)} className="h-7 text-sm mt-0.5" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Calories</label>
          <Input type="number" value={form.calories} onChange={e => set("calories", e.target.value)} className="h-7 text-sm mt-0.5" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Protein (g)</label>
          <Input type="number" value={form.protein} onChange={e => set("protein", e.target.value)} className="h-7 text-sm mt-0.5" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Carbs (g)</label>
          <Input type="number" value={form.carbs} onChange={e => set("carbs", e.target.value)} className="h-7 text-sm mt-0.5" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Fats (g)</label>
          <Input type="number" value={form.fats} onChange={e => set("fats", e.target.value)} className="h-7 text-sm mt-0.5" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-600">Portion</label>
          <Input value={form.portion} onChange={e => set("portion", e.target.value)} className="h-7 text-sm mt-0.5" placeholder="e.g. 1 bowl" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-600">Note / Tip</label>
          <Input value={form.note} onChange={e => set("note", e.target.value)} className="h-7 text-sm mt-0.5" placeholder="Optional nutritional tip" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={handleSave}>
          <Save className="w-3 h-3 mr-1" /> Save Meal
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCancel}>
          <X className="w-3 h-3 mr-1" /> Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Add Meal form ──────────────────────────────────────────────────────────────
function AddMealForm({ day, onAdd, onCancel }) {
  const [form, setForm] = useState({
    meal_type: "breakfast",
    meal_name: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    portion: "",
    note: "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAdd = () => {
    if (!form.meal_name.trim()) { toast.error("Meal name is required"); return; }
    onAdd({
      day: Number(day),
      meal_type: form.meal_type,
      meal_name: form.meal_name,
      calories: Number(form.calories) || 0,
      protein: Number(form.protein) || 0,
      carbs: Number(form.carbs) || 0,
      fats: Number(form.fats) || 0,
      portion_sizes: form.portion ? [form.portion] : [],
      nutritional_tip: form.note,
      items: [],
    });
  };

  return (
    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
      <p className="text-xs font-semibold text-green-700">➕ Add New Meal — Day {day}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-600">Meal Type</label>
          <Select value={form.meal_type} onValueChange={v => set("meal_type", v)}>
            <SelectTrigger className="h-7 text-sm mt-0.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEAL_ORDER.map(t => (
                <SelectItem key={t} value={t}>{MEAL_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-600">Meal Name *</label>
          <Input value={form.meal_name} onChange={e => set("meal_name", e.target.value)} className="h-7 text-sm mt-0.5" placeholder="e.g. Oats with banana" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Calories</label>
          <Input type="number" value={form.calories} onChange={e => set("calories", e.target.value)} className="h-7 text-sm mt-0.5" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Protein (g)</label>
          <Input type="number" value={form.protein} onChange={e => set("protein", e.target.value)} className="h-7 text-sm mt-0.5" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Carbs (g)</label>
          <Input type="number" value={form.carbs} onChange={e => set("carbs", e.target.value)} className="h-7 text-sm mt-0.5" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Fats (g)</label>
          <Input type="number" value={form.fats} onChange={e => set("fats", e.target.value)} className="h-7 text-sm mt-0.5" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-600">Portion</label>
          <Input value={form.portion} onChange={e => set("portion", e.target.value)} className="h-7 text-sm mt-0.5" placeholder="e.g. 1 bowl" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-600">Note / Tip</label>
          <Input value={form.note} onChange={e => set("note", e.target.value)} className="h-7 text-sm mt-0.5" placeholder="Optional" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={handleAdd}>
          <Plus className="w-3 h-3 mr-1" /> Add Meal
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCancel}>
          <X className="w-3 h-3 mr-1" /> Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Single editable meal card ──────────────────────────────────────────────────
function EditableMealCard({ meal, mealIndex, onUpdate, onRemove }) {
  const [mode, setMode] = useState(null); // null | "edit" | "note"
  const [swapName, setSwapName] = useState("");
  const [noteText, setNoteText] = useState(meal.nutritional_tip || "");
  const [confirmRemove, setConfirmRemove] = useState(false);

  const handleSaveEdit = (updatedMeal) => {
    onUpdate(updatedMeal);
    setMode(null);
  };

  const handleAddNote = () => {
    onUpdate({ ...meal, nutritional_tip: noteText });
    setMode(null);
  };

  return (
    <Card className="border border-orange-100 shadow-sm">
      <CardContent className="p-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">
              {getMealLabel(meal.meal_type)}
            </span>
            <p className="font-medium text-gray-900 text-sm leading-tight">{meal.meal_name || "—"}</p>
            {meal.nutritional_tip && (
              <p className="text-xs text-blue-600 italic mt-0.5">💡 {meal.nutritional_tip}</p>
            )}
          </div>
          {meal.calories > 0 && (
            <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded text-xs shrink-0">
              {meal.calories} cal
            </span>
          )}
        </div>

        {/* Macros */}
        <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1.5">
          {meal.protein > 0 && <span>P: <strong>{meal.protein}g</strong></span>}
          {meal.carbs > 0 && <span>C: <strong>{meal.carbs}g</strong></span>}
          {meal.fats > 0 && <span>F: <strong>{meal.fats}g</strong></span>}
          {meal.portion_sizes?.[0] && <span className="text-gray-400">· {meal.portion_sizes[0]}</span>}
        </div>

        {/* Edit mode action buttons */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          <button
            onClick={() => setMode(mode === "edit" ? null : "edit")}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
          >
            <Pencil className="w-3 h-3" /> Edit Details
          </button>
          <button
            onClick={() => setMode(mode === "note" ? null : "note")}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors"
          >
            <StickyNote className="w-3 h-3" /> {meal.nutritional_tip ? "Edit Note" : "Add Note"}
          </button>
          {!confirmRemove ? (
            <button
              onClick={() => setConfirmRemove(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-xs text-red-600 font-medium">Remove this meal?</span>
              <button
                onClick={onRemove}
                className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700"
              >Yes</button>
              <button
                onClick={() => setConfirmRemove(false)}
                className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
              >No</button>
            </div>
          )}
        </div>

        {/* Inline panels */}
        {mode === "edit" && (
          <MealEditForm
            meal={meal}
            onSave={handleSaveEdit}
            onCancel={() => setMode(null)}
          />
        )}

        {mode === "note" && (
          <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
            <label className="text-xs font-semibold text-purple-700">Note / Tip</label>
            <Input
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              className="h-7 text-sm"
              placeholder="Enter a nutritional note..."
            />
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs bg-purple-600 hover:bg-purple-700" onClick={handleAddNote}>
                <Save className="w-3 h-3 mr-1" /> Save Note
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setMode(null)}>
                <X className="w-3 h-3 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Day section ────────────────────────────────────────────────────────────────
function EditableDay({ day, meals, plan, onMealsUpdate }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const sortedMeals = [...meals].sort((a, b) => {
    const ai = MEAL_ORDER.indexOf(a.meal_type?.toLowerCase().replace(/\s+/g, "_")) ?? 99;
    const bi = MEAL_ORDER.indexOf(b.meal_type?.toLowerCase().replace(/\s+/g, "_")) ?? 99;
    return ai - bi;
  });

  const handleUpdateMeal = (updatedMeal, mealIdx) => {
    const newMeals = [...meals];
    newMeals[mealIdx] = updatedMeal;
    onMealsUpdate(day, newMeals);
  };

  const handleRemoveMeal = (mealIdx) => {
    const newMeals = meals.filter((_, i) => i !== mealIdx);
    onMealsUpdate(day, newMeals);
  };

  const handleAddMeal = (newMeal) => {
    onMealsUpdate(day, [...meals, newMeal]);
    setShowAddForm(false);
  };

  const handleRegenerateDay = async () => {
    if (!window.confirm(`Regenerate all meals for Day ${day}? This will replace only this day's meals.`)) return;
    setRegenerating(true);
    try {
      const params = plan.generation_parameters || {};
      const response = await base44.functions.invoke("generateAIMealPlan", {
        client_id: plan.client_id,
        duration: 1,
        target_calories: params.target_calories || plan.target_calories,
        target_protein: params.target_protein,
        target_carbs: params.target_carbs,
        target_fats: params.target_fats,
        goal: params.goal,
        food_preference: params.food_preference || plan.food_preference,
        regional_preference: params.regional_preference || plan.regional_preference,
        meal_frequency: params.meal_frequency,
        snack_preference: params.snack_preference,
        regenerate_single_day: true,
      });

      const generatedMeals = response?.data?.meals || [];
      const dayMeals = generatedMeals
        .filter(m => (m.day || 1) === 1)
        .map(m => ({ ...m, day: Number(day) }));

      if (dayMeals.length === 0) {
        toast.error("No meals returned from AI. Try again.");
        return;
      }
      onMealsUpdate(day, dayMeals);
      toast.success(`Day ${day} regenerated!`);
    } catch (e) {
      toast.error("Regeneration failed: " + (e.message || "Unknown error"));
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Day header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">Day {day}</span>
          <span className="text-xs text-gray-500">{meals.length} meal{meals.length !== 1 ? "s" : ""}</span>
        </div>
        <button
          onClick={handleRegenerateDay}
          disabled={regenerating}
          className="flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
        >
          {regenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Regenerate Day
        </button>
      </div>

      {/* Meal cards */}
      {sortedMeals.map((meal, i) => (
        <EditableMealCard
          key={i}
          meal={meal}
          mealIndex={i}
          onUpdate={(updated) => {
            const origIdx = meals.indexOf(meal);
            handleUpdateMeal(updated, origIdx === -1 ? i : origIdx);
          }}
          onRemove={() => {
            const origIdx = meals.indexOf(meal);
            handleRemoveMeal(origIdx === -1 ? i : origIdx);
          }}
        />
      ))}

      {/* Add meal */}
      {showAddForm ? (
        <AddMealForm day={day} onAdd={handleAddMeal} onCancel={() => setShowAddForm(false)} />
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-green-700 border border-dashed border-green-300 rounded-lg hover:bg-green-50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Meal to Day {day}
        </button>
      )}
    </div>
  );
}

// ── Main MealPlanEditor ────────────────────────────────────────────────────────
export default function MealPlanEditor({ plan, onSaved, onCancel }) {
  // Deep-clone meals so we don't mutate the original
  const [editedMeals, setEditedMeals] = useState(() => JSON.parse(JSON.stringify(plan.meals || [])));
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  const mealsByDay = groupByDay(editedMeals);
  const days = Object.keys(mealsByDay).sort((a, b) => Number(a) - Number(b));

  // Initialize selectedDay once we have days
  React.useEffect(() => {
    if (days.length > 0 && selectedDay === null) {
      setSelectedDay(days[0]);
    }
  }, [days.length]);

  const handleMealsUpdate = (day, newDayMeals) => {
    // Replace all meals for this day, keep others
    const otherMeals = editedMeals.filter(m => String(m.day) !== String(day));
    setEditedMeals([...otherMeals, ...newDayMeals]);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await base44.entities.MealPlan.update(plan.id, { meals: editedMeals });
      toast.success("Meal plan saved successfully!");
      onSaved(editedMeals);
    } catch (e) {
      toast.error("Save failed: " + (e.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Edit mode banner */}
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-lg px-4 py-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800 font-medium">
          You are editing this plan. Click <strong>Save All Changes</strong> when done.
        </p>
      </div>

      {/* Day tabs */}
      <div className="flex gap-1 flex-wrap">
        {days.map(d => (
          <button
            key={d}
            onClick={() => setSelectedDay(d)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              selectedDay === d
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"
            }`}
          >
            Day {d}
          </button>
        ))}
      </div>

      {/* Selected day editor */}
      {selectedDay && mealsByDay[selectedDay] && (
        <EditableDay
          key={selectedDay}
          day={selectedDay}
          meals={mealsByDay[selectedDay]}
          plan={plan}
          onMealsUpdate={handleMealsUpdate}
        />
      )}

      {/* Bottom actions */}
      <div className="flex gap-3 pt-2 border-t sticky bottom-0 bg-white py-3">
        <Button
          onClick={handleSaveAll}
          disabled={saving}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
          Save All Changes
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          <X className="w-4 h-4 mr-1" /> Cancel
        </Button>
      </div>
    </div>
  );
}