import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, FileSpreadsheet, CheckCircle, AlertTriangle, Sparkles, PenLine, Plus, Trash2, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

const MEAL_TYPES = ["early_morning", "breakfast", "mid_morning", "lunch", "evening_snack", "dinner", "post_dinner"];

// ── Tab 1: File Upload ──────────────────────────────────────────────────────
function downloadSample() {
  const rows = [
    ["Day", "Meal Type", "Meal Name", "Food Items (comma separated)", "Portion Sizes (comma separated)", "Calories (kcal)", "Protein (g)", "Carbs (g)", "Fats (g)"],
    [1, "early_morning", "Warm Lemon Water", "Warm water, Lemon juice", "1 glass, 1 tsp", 10, 0, 2, 0],
    [1, "breakfast", "Oats Porridge", "Rolled oats, Milk, Banana", "1 bowl, 150ml, 1 small", 320, 12, 55, 6],
    [1, "mid_morning", "Apple", "Apple", "1 medium", 80, 0.5, 20, 0],
    [1, "lunch", "Dal Rice", "Moong dal, Brown rice, Salad", "1 katori, 1 cup, 1 plate", 450, 18, 72, 5],
    [1, "evening_snack", "Green Tea + Almonds", "Green tea, Almonds", "1 cup, 5 nos", 70, 3, 4, 5],
    [1, "dinner", "Sabzi Roti", "Palak sabzi, Wheat roti, Curd", "1 katori, 2 rotis, 1 katori", 380, 14, 58, 8],
    [2, "breakfast", "Besan Cheela", "Besan, Onion, Tomato", "2 medium cheelas", 280, 14, 40, 6],
    [2, "lunch", "Rajma Rice", "Rajma, Brown rice, Salad", "1 katori, 1 cup, 1 plate", 480, 20, 78, 6],
    [2, "dinner", "Moong Dal Khichdi", "Yellow moong dal, Rice, Ghee", "1 bowl, 1 cup, 1 tsp", 350, 15, 60, 5],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  // Column widths
  ws["!cols"] = [{ wch: 6 }, { wch: 16 }, { wch: 22 }, { wch: 38 }, { wch: 32 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Meal Plan");
  XLSX.writeFile(wb, "sample_meal_plan.xlsx");
}

function FileUploadTab({ client, onSaved }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [planName, setPlanName] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setExtracted(null);
    setError(null);
    if (!planName) setPlanName(f.name.replace(/\.[^.]+$/, ""));
    // Auto-extract immediately on file select
    extractFile(f);
  };

  // Try to parse Excel directly (works for our known format)
  const tryDirectExcelParse = (f) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
          if (rows.length < 2) { reject(new Error("No data")); return; }

          // Detect header row — look for "Day" in first column
          const header = rows[0].map(h => String(h).toLowerCase().trim());
          const dayIdx = header.findIndex(h => h === "day");
          if (dayIdx === -1) { reject(new Error("No Day column")); return; }

          const mealTypeIdx = header.findIndex(h => h.includes("meal type") || h.includes("meal_type"));
          const mealNameIdx = header.findIndex(h => h.includes("meal name") || h.includes("meal_name"));
          const foodItemsIdx = header.findIndex(h => h.includes("food item") || h.includes("items"));
          const portionIdx = header.findIndex(h => h.includes("portion"));
          const calIdx = header.findIndex(h => h.includes("calor"));
          const protIdx = header.findIndex(h => h.includes("protein"));
          const carbIdx = header.findIndex(h => h.includes("carb"));
          const fatIdx = header.findIndex(h => h.includes("fat"));

          if (mealTypeIdx === -1 || mealNameIdx === -1) { reject(new Error("Missing columns")); return; }

          const meals = [];
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const day = parseInt(row[dayIdx]) || 0;
            if (!day) continue;
            const mealType = String(row[mealTypeIdx] || "").toLowerCase().replace(/\s+/g, "_");
            if (!mealType) continue;
            const itemsRaw = foodItemsIdx !== -1 ? String(row[foodItemsIdx] || "") : "";
            const portionsRaw = portionIdx !== -1 ? String(row[portionIdx] || "") : "";
            meals.push({
              day,
              meal_type: mealType,
              meal_name: String(row[mealNameIdx] || ""),
              items: itemsRaw ? itemsRaw.split(",").map(s => s.trim()).filter(Boolean) : [],
              portion_sizes: portionsRaw ? portionsRaw.split(",").map(s => s.trim()).filter(Boolean) : [],
              calories: calIdx !== -1 ? parseFloat(row[calIdx]) || 0 : 0,
              protein: protIdx !== -1 ? parseFloat(row[protIdx]) || 0 : 0,
              carbs: carbIdx !== -1 ? parseFloat(row[carbIdx]) || 0 : 0,
              fats: fatIdx !== -1 ? parseFloat(row[fatIdx]) || 0 : 0,
            });
          }

          if (meals.length === 0) { reject(new Error("No meal rows found")); return; }
          const duration = Math.max(...meals.map(m => m.day));
          resolve({ meals, duration });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("File read error"));
      reader.readAsArrayBuffer(f);
    });
  };

  const extractFile = async (f) => {
    setExtracting(true);
    setError(null);
    try {
      // Try direct parse first (fast, works for our Excel format)
      if (f.name.match(/\.(xlsx|xls|csv)$/i)) {
        try {
          const result = await tryDirectExcelParse(f);
          setExtracted(result);
          toast.success(`Extracted ${result.meals.length} meal entries!`);
          return;
        } catch {
          // Fall through to AI extraction
        }
      }

      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            meals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day: { type: "number" },
                  meal_type: { type: "string" },
                  meal_name: { type: "string" },
                  items: { type: "array", items: { type: "string" } },
                  portion_sizes: { type: "array", items: { type: "string" } },
                  calories: { type: "number" },
                  protein: { type: "number" },
                  carbs: { type: "number" },
                  fats: { type: "number" },
                }
              }
            },
            duration: { type: "number" },
            target_calories: { type: "number" },
          }
        }
      });
      if (result.status !== "success" || !result.output?.meals?.length) {
        throw new Error(`Could not extract meal data from this file. ${result.details ? result.details : ""} \n\nTip: Download our sample Excel file above to see the expected format, then re-upload.`);
      }
      setExtracted(result.output);
      toast.success(`Extracted ${result.output.meals.length} meal entries!`);
    } catch (e) {
      setError(e.message);
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async (assign = false) => {
    if (!extracted) return;
    setSaving(true);
    try {
      if (assign) {
        const existingPlans = await base44.entities.MealPlan.filter({ client_id: client.id });
        await Promise.all(existingPlans.map(p => base44.entities.MealPlan.update(p.id, { active: false })));
      }
      await base44.entities.MealPlan.create({
        client_id: client.id,
        name: planName || `Uploaded Plan — ${client.full_name}`,
        duration: extracted.duration || Math.max(...extracted.meals.map(m => m.day || 1)),
        meals: extracted.meals,
        target_calories: extracted.target_calories || null,
        food_preference: client.food_preference,
        regional_preference: client.regional_preference,
        plan_tier: "basic",
        meal_pattern: "daily",
        active: assign,
        decision_rules_applied: ["Uploaded from file"],
      });
      toast.success(assign ? "Plan saved and assigned!" : "Plan saved!");
      onSaved?.();
    } catch (e) {
      toast.error("Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Download sample */}
      <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl">
        <div>
          <p className="text-xs font-semibold text-blue-800">📄 Not sure about the format?</p>
          <p className="text-xs text-blue-600 mt-0.5">Download our sample Excel file to get started.</p>
        </div>
        <Button size="sm" variant="outline" onClick={downloadSample} className="border-blue-400 text-blue-700 hover:bg-blue-100 gap-1.5 shrink-0">
          <Download className="w-3.5 h-3.5" /> Sample
        </Button>
      </div>

      {/* Plan name */}
      <div className="space-y-1">
        <Label className="text-xs font-medium">Plan Name</Label>
        <Input value={planName} onChange={e => setPlanName(e.target.value)} placeholder="e.g. 10-Day Diabetic Plan" className="text-sm" />
      </div>

      {/* Drop zone */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
        onClick={() => fileInputRef.current?.click()}
      >
        {extracting ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-sm text-blue-600 font-medium">Extracting with AI…</p>
            <p className="text-xs text-gray-400">This may take a few seconds</p>
          </div>
        ) : file ? (
          <>
            <FileSpreadsheet className="w-10 h-10 mx-auto text-green-500 mb-2" />
            <p className="text-sm font-semibold text-gray-700">{file.name}</p>
            <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
          </>
        ) : (
          <>
            <FileSpreadsheet className="w-10 h-10 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 font-medium">Click to select file</p>
            <p className="text-xs text-gray-400 mt-1">Supports .xlsx, .csv, .pdf — AI extracts automatically</p>
          </>
        )}
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.pdf" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Error */}
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <AlertDescription className="text-red-700 text-xs whitespace-pre-line">
            {error}
            <button
              onClick={() => file && extractFile(file)}
              className="mt-2 block underline text-red-600 hover:text-red-800 font-medium"
            >
              Try again
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Extracted preview */}
      {extracted && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="font-semibold text-green-800 text-sm">Extraction successful!</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs text-center">
            <div className="bg-white rounded-lg p-2">
              <p className="text-gray-400">Meals</p>
              <p className="font-bold text-gray-800">{extracted.meals?.length}</p>
            </div>
            <div className="bg-white rounded-lg p-2">
              <p className="text-gray-400">Days</p>
              <p className="font-bold text-gray-800">{extracted.duration || Math.max(...extracted.meals.map(m => m.day || 1))}</p>
            </div>
            <div className="bg-white rounded-lg p-2">
              <p className="text-gray-400">Target kcal</p>
              <p className="font-bold text-gray-800">{extracted.target_calories || "—"}</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              const rows = [
                ["Day", "Meal Type", "Meal Name", "Food Items", "Portion Sizes", "Calories (kcal)", "Protein (g)", "Carbs (g)", "Fats (g)"],
                ...extracted.meals.map(m => [
                  m.day, m.meal_type, m.meal_name,
                  (m.items || []).join(", "),
                  (m.portion_sizes || []).join(", "),
                  m.calories, m.protein, m.carbs, m.fats
                ])
              ];
              const ws = XLSX.utils.aoa_to_sheet(rows);
              ws["!cols"] = [{wch:6},{wch:16},{wch:22},{wch:38},{wch:32},{wch:16},{wch:12},{wch:12},{wch:10}];
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Meal Plan");
              XLSX.writeFile(wb, `${planName || "meal_plan"}.xlsx`);
            }}
            className="w-full text-sm border-green-300 text-green-700 hover:bg-green-50 gap-2"
          >
            <Download className="w-4 h-4" /> Download as Excel
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={saving} className="text-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Only"}
            </Button>
            <Button onClick={() => handleSave(true)} disabled={saving} className="bg-green-600 hover:bg-green-700 text-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & Assign"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 2: Manual Entry ────────────────────────────────────────────────────
const EMPTY_MEAL = () => ({ day: 1, meal_type: "breakfast", meal_name: "", items: [""], portion_sizes: [""], calories: "", protein: "", carbs: "", fats: "" });

function ManualEntryTab({ client, onSaved }) {
  const [planName, setPlanName] = useState("");
  const [numDays, setNumDays] = useState(7);
  const [meals, setMeals] = useState([EMPTY_MEAL()]);
  const [saving, setSaving] = useState(false);

  const updateMeal = (idx, field, value) => {
    setMeals(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const updateItem = (mealIdx, itemIdx, value) => {
    setMeals(prev => prev.map((m, i) => {
      if (i !== mealIdx) return m;
      const items = [...(m.items || [])];
      items[itemIdx] = value;
      return { ...m, items };
    }));
  };

  const addItem = (mealIdx) => {
    setMeals(prev => prev.map((m, i) => i === mealIdx ? { ...m, items: [...(m.items || []), ""] } : m));
  };

  const removeItem = (mealIdx, itemIdx) => {
    setMeals(prev => prev.map((m, i) => {
      if (i !== mealIdx) return m;
      const items = m.items.filter((_, j) => j !== itemIdx);
      return { ...m, items: items.length ? items : [""] };
    }));
  };

  const addMeal = () => setMeals(prev => [...prev, EMPTY_MEAL()]);

  const removeMeal = (idx) => setMeals(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async (assign = false) => {
    if (!planName.trim()) { toast.error("Please enter a plan name"); return; }
    if (meals.some(m => !m.meal_name.trim())) { toast.error("Please fill in all meal names"); return; }
    setSaving(true);
    try {
      const cleanMeals = meals.map(m => ({
        ...m,
        day: parseInt(m.day) || 1,
        calories: parseFloat(m.calories) || 0,
        protein: parseFloat(m.protein) || 0,
        carbs: parseFloat(m.carbs) || 0,
        fats: parseFloat(m.fats) || 0,
        items: m.items.filter(Boolean),
        portion_sizes: m.portion_sizes?.filter(Boolean) || [],
      }));
      if (assign) {
        const existingPlans = await base44.entities.MealPlan.filter({ client_id: client.id });
        await Promise.all(existingPlans.map(p => base44.entities.MealPlan.update(p.id, { active: false })));
      }
      await base44.entities.MealPlan.create({
        client_id: client.id,
        name: planName,
        duration: numDays,
        meals: cleanMeals,
        food_preference: client.food_preference,
        regional_preference: client.regional_preference,
        plan_tier: "basic",
        meal_pattern: "daily",
        active: assign,
        decision_rules_applied: ["Manually entered"],
      });
      toast.success(assign ? "Plan saved and assigned!" : "Plan saved!");
      onSaved?.();
    } catch (e) {
      toast.error("Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-medium">Plan Name</Label>
          <Input value={planName} onChange={e => setPlanName(e.target.value)} placeholder="e.g. 7-Day Healthy Plan" className="text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">Duration (days)</Label>
          <Input type="number" min={1} max={90} value={numDays} onChange={e => setNumDays(parseInt(e.target.value) || 7)} className="text-sm" />
        </div>
      </div>

      {/* Meal rows */}
      <div className="space-y-3">
        {meals.map((meal, idx) => (
          <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-white space-y-3 relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Meal {idx + 1}</span>
              {meals.length > 1 && (
                <button onClick={() => removeMeal(idx)} className="text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Day + Meal type + Meal name */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Day</Label>
                <Input type="number" min={1} max={numDays} value={meal.day}
                  onChange={e => updateMeal(idx, "day", parseInt(e.target.value) || 1)}
                  className="text-sm h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Meal Type</Label>
                <Select value={meal.meal_type} onValueChange={v => updateMeal(idx, "meal_type", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MEAL_TYPES.map(t => (
                      <SelectItem key={t} value={t} className="text-xs capitalize">{t.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Meal Name</Label>
                <Input value={meal.meal_name} onChange={e => updateMeal(idx, "meal_name", e.target.value)}
                  placeholder="e.g. Oats Porridge" className="text-sm h-8" />
              </div>
            </div>

            {/* Food items */}
            <div className="space-y-1">
              <Label className="text-xs">Food Items</Label>
              {(meal.items || [""]).map((item, j) => (
                <div key={j} className="flex gap-1.5">
                  <Input value={item} onChange={e => updateItem(idx, j, e.target.value)}
                    placeholder={`Item ${j + 1}`} className="text-xs h-7 flex-1" />
                  {meal.items.length > 1 && (
                    <button onClick={() => removeItem(idx, j)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => addItem(idx)} className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 mt-1">
                <Plus className="w-3 h-3" /> Add item
              </button>
            </div>

            {/* Macros */}
            <div className="grid grid-cols-4 gap-2">
              {[["calories", "Kcal"], ["protein", "Protein (g)"], ["carbs", "Carbs (g)"], ["fats", "Fats (g)"]].map(([field, label]) => (
                <div key={field} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Input type="number" min={0} value={meal[field]}
                    onChange={e => updateMeal(idx, field, e.target.value)}
                    placeholder="0" className="text-xs h-7" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" onClick={addMeal} className="w-full text-sm border-dashed gap-2 text-blue-600 border-blue-300 hover:bg-blue-50">
        <Plus className="w-4 h-4" /> Add Another Meal
      </Button>

      {/* Save actions */}
      <div className="grid grid-cols-2 gap-2 pt-2">
        <Button variant="outline" onClick={() => handleSave(false)} disabled={saving} className="text-sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Only"}
        </Button>
        <Button onClick={() => handleSave(true)} disabled={saving} className="bg-green-600 hover:bg-green-700 text-sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & Assign"}
        </Button>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function UploadMealPlan({ client, onSaved, onBack }) {
  const [tab, setTab] = useState("upload");

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-600" /> Add Meal Plan
        </h3>
        <p className="text-xs text-gray-500 mt-1">Upload a file or enter meals manually.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setTab("upload")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all ${
            tab === "upload" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" /> Upload File
        </button>
        <button
          onClick={() => setTab("manual")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all border-l border-gray-200 ${
            tab === "manual" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          <PenLine className="w-4 h-4" /> Manual Entry
        </button>
      </div>

      {/* Tab content */}
      {tab === "upload" ? (
        <FileUploadTab client={client} onSaved={onSaved} />
      ) : (
        <ManualEntryTab client={client} onSaved={onSaved} />
      )}
    </div>
  );
}