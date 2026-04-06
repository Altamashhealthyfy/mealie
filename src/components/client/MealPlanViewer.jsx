import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Send, CheckCircle, ChefHat, Loader2, LayoutList, Table2, Pencil, CalendarDays } from "lucide-react";
import MealPlanEditor from "@/components/client/MealPlanEditor";
import ModeB_ChooseSchedule from "@/components/mealplanner/ModeB_ChooseSchedule";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

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

// Normalize meal_type to a consistent lowercase_underscore key
function normalizeMealType(raw = "") {
  return raw.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
}

function getMealLabel(raw = "") {
  const key = normalizeMealType(raw);
  if (MEAL_LABELS[key]) return MEAL_LABELS[key];
  // Fallback: capitalize words
  return raw.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function getSortIndex(raw = "") {
  const key = normalizeMealType(raw);
  const idx = MEAL_ORDER.indexOf(key);
  return idx === -1 ? 99 : idx;
}

function groupByDay(meals = []) {
  const map = {};
  meals.forEach((meal) => {
    const d = meal.day || 1;
    if (!map[d]) map[d] = [];
    map[d].push(meal);
  });
  return map;
}

// ─── TABLE VIEW ─────────────────────────────────────────────────────────────
const MPESS_TIPS = [
  { label: "Mind 🧠", tip: "10 min morning meditation or deep breathing to reduce stress hormones that spike blood sugar." },
  { label: "Physical 🏃", tip: "30-min brisk walk after dinner; light yoga / stretching in the morning." },
  { label: "Emotional 💛", tip: "Journaling 3 gratitudes before bed to improve sleep quality and emotional resilience." },
  { label: "Social 🤝", tip: "Share one healthy meal with family or a friend this week for positive reinforcement." },
  { label: "Spiritual 🌿", tip: "5-min mindful eating practice — chew slowly, eat without screens, appreciate each bite." },
];

function TableView({ mealsByDay, days, mpess }) {
  // Collect ALL unique raw meal_type values across all days, sorted by MEAL_ORDER
  const rawTypesSet = new Set();
  days.forEach(d => (mealsByDay[d] || []).forEach(m => { if (m.meal_type) rawTypesSet.add(m.meal_type); }));
  const usedRawTypes = Array.from(rawTypesSet).sort((a, b) => getSortIndex(a) - getSortIndex(b));

  // Use day 1 MPESS as representative (same for all days in rotation model)
  const mpessEntry = mpess?.find(m => String(m.day) === "1") || mpess?.[0];

  return (
    <div className="space-y-4">
      {/* ── Meal Table ── */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table style={{ tableLayout: "fixed", minWidth: `${55 + usedRawTypes.length * 180 + 100}px` }} className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-orange-50 border-b border-orange-200">
              <th style={{ width: 55, minWidth: 55 }} className="text-left px-3 py-2.5 font-bold text-gray-700 sticky left-0 bg-orange-50 border-r border-orange-100">Day</th>
              {usedRawTypes.map(type => (
                <th key={type} style={{ width: 180, minWidth: 150 }} className="text-left px-3 py-2.5 font-bold text-gray-700 border-r border-orange-100">
                  {getMealLabel(type)}
                </th>
              ))}
              <th style={{ width: 100, minWidth: 90 }} className="text-left px-3 py-2.5 font-bold text-gray-700">Total</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day, idx) => {
              const meals = (mealsByDay[day] || []).sort((a, b) => getSortIndex(a.meal_type) - getSortIndex(b.meal_type));
              const totalCal = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
              const totalProtein = meals.reduce((sum, m) => sum + (m.protein || 0), 0);
              const totalCarbs = meals.reduce((sum, m) => sum + (m.carbs || 0), 0);
              const totalFats = meals.reduce((sum, m) => sum + (m.fats || 0), 0);
              const mealMap = {};
              meals.forEach(m => { mealMap[m.meal_type] = m; });

              return (
                <tr key={day} className={`border-b border-gray-100 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                  <td className="px-3 py-3 font-bold text-orange-600 sticky left-0 bg-inherit border-r border-gray-100 align-top">
                    Day {day}
                  </td>
                  {usedRawTypes.map(type => {
                    const m = mealMap[type];
                    return (
                      <td key={type} style={{ wordWrap: "break-word", whiteSpace: "normal" }} className="px-3 py-3 align-top border-r border-gray-100">
                        {m ? (
                          <div className="space-y-1">
                            <p className="font-semibold text-gray-800 leading-tight break-words">{m.meal_name || "—"}</p>
                            {m.items?.length > 0 && (
                              <ul className="space-y-0.5">
                                {m.items.map((item, j) => (
                                  <li key={j} className="text-gray-500 leading-snug flex gap-1">
                                    <span className="text-orange-300 shrink-0">•</span>
                                    <span className="break-words">{item}{m.portion_sizes?.[j] ? ` — ${m.portion_sizes[j]}` : ""}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {m.calories > 0 && <span className="text-orange-600 font-medium">{m.calories} kcal</span>}
                              {m.protein > 0 && <span className="text-blue-500">P:{m.protein}g</span>}
                              {m.carbs > 0 && <span className="text-green-500">C:{m.carbs}g</span>}
                              {m.fats > 0 && <span className="text-yellow-600">F:{m.fats}g</span>}
                            </div>
                          </div>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 align-top">
                    <p className="font-bold text-gray-800">{totalCal} kcal</p>
                    {totalProtein > 0 && <p className="text-blue-500 text-xs">P:{Math.round(totalProtein)}g</p>}
                    {totalCarbs > 0 && <p className="text-green-500 text-xs">C:{Math.round(totalCarbs)}g</p>}
                    {totalFats > 0 && <p className="text-yellow-600 text-xs">F:{Math.round(totalFats)}g</p>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── MPESS Guidance — use actual data if available, fallback to tips ── */}
      <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
        <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-3">🌿 MPESS Holistic Guidance</h4>
        <div className="grid grid-cols-1 gap-2">
          {mpessEntry ? (
            [
              { icon: "😴", label: "Sleep", key: "sleep" },
              { icon: "🧘", label: "Stress", key: "stress" },
              { icon: "🏃", label: "Movement", key: "movement" },
              { icon: "🧠", label: "Mindfulness", key: "mindfulness" },
              { icon: "🌬️", label: "Pranayam", key: "pranayam" },
            ].filter(f => mpessEntry[f.key]).map(({ icon, label, key }) => (
              <div key={key} className="flex gap-2 items-start">
                <span className="font-semibold text-purple-700 text-xs min-w-[100px] shrink-0">{icon} {label}</span>
                <span className="text-xs text-purple-600">{mpessEntry[key]}</span>
              </div>
            ))
          ) : MPESS_TIPS.map((item) => (
            <div key={item.label} className="flex gap-2 items-start">
              <span className="font-semibold text-purple-700 text-xs min-w-[90px] shrink-0">{item.label}</span>
              <span className="text-xs text-purple-600">{item.tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── DETAIL VIEW ─────────────────────────────────────────────────────────────
function DetailView({ mealsByDay, days, mpess }) {
  const [selectedDay, setSelectedDay] = useState(days[0] || "1");

  const dayMeals = (mealsByDay[selectedDay] || []).sort(
    (a, b) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type)
  );

  const dayMpess = mpess?.find(m => String(m.day) === String(selectedDay));

  return (
    <>
      <div className="flex gap-1 flex-wrap">
        {days.map((d) => (
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

      <div className="space-y-3">
        {dayMeals.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No meals for this day</p>
        ) : (
          dayMeals.map((meal, i) => (
            <Card key={i} className="border border-orange-100 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">
                      {meal.meal_type?.replace(/_/g, " ")}
                    </span>
                    {meal.meal_name && <p className="font-medium text-gray-900 text-sm">{meal.meal_name}</p>}
                  </div>
                  {meal.calories && (
                    <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded text-xs shrink-0">
                      {meal.calories} cal
                    </span>
                  )}
                </div>

                {meal.items?.length > 0 && (
                  <ul className="space-y-0.5 mb-2">
                    {meal.items.map((item, j) => (
                      <li key={j} className="text-xs text-gray-700 flex items-start gap-1">
                        <span className="text-orange-400 mt-0.5">•</span>
                        <span>{item}{meal.portion_sizes?.[j] ? ` — ${meal.portion_sizes[j]}` : ""}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {meal.ingredients?.length > 0 && (
                  <div className="mt-1 mb-2 p-2 bg-amber-50 rounded-lg">
                    <p className="text-xs font-semibold text-amber-700 mb-1">🧄 Ingredients:</p>
                    <p className="text-xs text-amber-800 leading-relaxed">{meal.ingredients.join(" | ")}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                  {meal.protein > 0 && <span>P: <strong>{meal.protein}g</strong></span>}
                  {meal.carbs > 0 && <span>C: <strong>{meal.carbs}g</strong></span>}
                  {meal.fats > 0 && <span>F: <strong>{meal.fats}g</strong></span>}
                </div>

                {(meal.nutritional_tip || meal.disease_rationale) && (
                  <p className="mt-2 text-xs text-blue-600 bg-blue-50 rounded p-1.5 italic">
                    💡 {meal.nutritional_tip || meal.disease_rationale}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* MPESS for selected day */}
      {dayMpess && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 mt-2">
          <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-3">🌿 MPESS — Day {selectedDay}</h4>
          <div className="space-y-2">
            {[
              { icon: "😴", label: "Sleep", key: "sleep" },
              { icon: "🧘", label: "Stress", key: "stress" },
              { icon: "🏃", label: "Movement", key: "movement" },
              { icon: "🧠", label: "Mindfulness", key: "mindfulness" },
              { icon: "🌬️", label: "Pranayam", key: "pranayam" },
            ].map(({ icon, label, key }) => dayMpess[key] ? (
              <div key={key} className="flex gap-2 items-start">
                <span className="text-sm shrink-0">{icon}</span>
                <div>
                  <span className="text-xs font-semibold text-purple-700">{label}: </span>
                  <span className="text-xs text-purple-600">{dayMpess[key]}</span>
                </div>
              </div>
            ) : null)}
          </div>
        </div>
      )}
    </>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function MealPlanViewer({ plan, allPlanIds, onClose, onAssigned, onDeleted, hideActions, isCoach }) {
  const [assigning, setAssigning] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [viewMode, setViewMode] = useState("detail"); // "detail" | "table"
  const [editMode, setEditMode] = useState(false);
  const [localPlan, setLocalPlan] = useState(plan);
  const [showSchedule, setShowSchedule] = useState(false);

  // Keep localPlan in sync if parent `plan` prop changes
  useEffect(() => { setLocalPlan(plan); }, [plan]);

  const activePlan = localPlan;
  const mealsByDay = groupByDay(activePlan?.meals);
  const days = Object.keys(mealsByDay).sort((a, b) => Number(a) - Number(b));

  const MEAL_TYPES_USED = MEAL_ORDER.filter(type =>
    days.some(d => (mealsByDay[d] || []).some(m => m.meal_type === type))
  );

  const handleSaved = (updatedMeals) => {
    setLocalPlan(prev => ({ ...prev, meals: updatedMeals }));
    setEditMode(false);
  };

  const handleAssign = async () => {
    setAssigning(true);
    try {
      await Promise.all((allPlanIds || []).filter(id => id !== activePlan.id).map(id =>
        base44.entities.MealPlan.update(id, { active: false })
      ));
      await base44.entities.MealPlan.update(activePlan.id, { active: true });
      toast.success("Plan assigned as active!");
      onAssigned?.();
    } catch (e) {
      toast.error("Failed to assign plan");
    } finally {
      setAssigning(false);
    }
  };

  const getMpessData = (plan) => {
    // Always prefer mpess array (has sleep/stress/movement/mindfulness/pranayam)
    if (plan.mpess && Array.isArray(plan.mpess) && plan.mpess.length > 0) return plan.mpess[0];
    return null;
  };

  const addMpessPage = (doc, plan, margin, usableW) => {
    const mpessData = getMpessData(plan);
    if (!mpessData || !(mpessData.sleep || mpessData.movement || mpessData.stress || mpessData.mindfulness || mpessData.pranayam)) return;

    doc.addPage();
    let y = 20;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(108, 95, 199);
    doc.text("MPESS - Holistic Guidance", margin, y);
    y += 10;
    doc.setDrawColor(180, 150, 220);
    doc.line(margin, y, doc.internal.pageSize.getWidth() - margin, y);
    y += 8;

    const mpessItems = [
      { label: "Sleep:", key: "sleep" },
      { label: "Stress:", key: "stress" },
      { label: "Movement:", key: "movement" },
      { label: "Mindfulness:", key: "mindfulness" },
      { label: "Pranayam:", key: "pranayam" },
    ];

    mpessItems.forEach(({ label, key }) => {
      const value = mpessData[key];
      if (!value) return;
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(108, 95, 199);
      doc.text(label, margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 20, 80);
      const lines = doc.splitTextToSize(value, usableW - 30);
      doc.text(lines, margin + 30, y);
      y += lines.length * 5 + 4;
    });
  };

  const handleDownloadPDF = () => {
    setDownloading(true);
    try {
      console.log('📋 MPESS for PDF:', JSON.stringify(plan.mpess?.slice(0,1)));
      const isTable = viewMode === "table";
      const doc = new jsPDF({ orientation: isTable ? "landscape" : "portrait", unit: "mm", format: isTable ? "a3" : "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 14;
      const usableW = pageW - margin * 2;
      let y = 14;

      const checkPage = (needed = 8) => {
        if (y + needed > 280) { doc.addPage(); y = 14; }
      };

      // Title
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      doc.text(plan.name || "Meal Plan", margin, y);
      y += 7;

      // Meta line
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      const meta = [
        plan.duration ? `${plan.duration} Days` : "",
        plan.food_preference || "",
        plan.target_calories ? `${plan.target_calories} kcal/day` : "",
        plan.meal_pattern || "",
      ].filter(Boolean).join("  |  ");
      doc.text(meta, margin, y);
      y += 5;
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, pageW - margin, y);
      y += 4;

      if (isTable) {
        // ── TABLE PDF (A3 Landscape) ──
        const usedTypes = MEAL_ORDER.filter(type =>
          days.some(d => (mealsByDay[d] || []).some(m => m.meal_type === type))
        );
        const dayColW = 16;
        const totalColW = 28;
        const mealColW = Math.floor((usableW - dayColW - totalColW) / usedTypes.length);

        // Header row
        doc.setFillColor(255, 237, 213);
        doc.rect(margin, y, usableW, 8, "F");
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60, 60, 60);
        doc.text("Day", margin + 2, y + 5.5);
        usedTypes.forEach((type, i) => {
          doc.text(MEAL_LABELS[type] || type, margin + dayColW + i * mealColW + 2, y + 5.5);
        });
        doc.text("Total", margin + dayColW + usedTypes.length * mealColW + 2, y + 5.5);
        y += 8;

        days.forEach((day, idx) => {
          const meals = mealsByDay[day] || [];
          const mealMap = {};
          meals.forEach(m => { mealMap[m.meal_type] = m; });
          const totalCal = meals.reduce((s, m) => s + (m.calories || 0), 0);
          const totalProt = meals.reduce((s, m) => s + (m.protein || 0), 0);

          // Pre-calculate row height based on wrapped text
          doc.setFontSize(8);
          let maxLines = 1;
          usedTypes.forEach(type => {
            const m = mealMap[type];
            if (m?.meal_name) {
              const lines = doc.splitTextToSize(m.meal_name, mealColW - 3).length;
              if (lines > maxLines) maxLines = lines;
            }
          });
          const rowH = Math.max(12, maxLines * 5 + 5);
          checkPage(rowH + 2);

          if (idx % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(margin, y, usableW, rowH, "F");
          }

          doc.setFont("helvetica", "bold");
          doc.setTextColor(234, 88, 12);
          doc.text(`Day ${day}`, margin + 2, y + 5);

          doc.setFont("helvetica", "normal");
          doc.setTextColor(50, 50, 50);
          usedTypes.forEach((type, i) => {
            const m = mealMap[type];
            const cellX = margin + dayColW + i * mealColW + 2;
            if (m) {
              const nameLines = doc.splitTextToSize(m.meal_name || "—", mealColW - 3);
              doc.text(nameLines, cellX, y + 5);
              if (m.calories) {
                doc.setTextColor(150, 100, 0);
                doc.text(`${m.calories} kcal`, cellX, y + rowH - 2);
                doc.setTextColor(50, 50, 50);
              }
            } else {
              doc.setTextColor(180, 180, 180);
              doc.text("—", cellX, y + 5);
              doc.setTextColor(50, 50, 50);
            }
          });

          // Total col
          const totalX = margin + dayColW + usedTypes.length * mealColW + 2;
          doc.setFont("helvetica", "bold");
          doc.setTextColor(40, 40, 40);
          doc.text(`${totalCal} kcal`, totalX, y + 5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 100, 100);
          if (totalProt > 0) doc.text(`P:${Math.round(totalProt)}g`, totalX, y + 10);

          doc.setDrawColor(220, 220, 220);
          doc.line(margin, y + rowH, pageW - margin, y + rowH);
          y += rowH;
        });

        // MPESS section at end of table PDF
        addMpessPage(doc, plan, margin, usableW);

      } else {
        // ── DETAIL PDF ──
        days.forEach((day) => {
          checkPage(12);
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(234, 88, 12);
          doc.text(`DAY ${day}`, margin, y);
          y += 5;
          doc.setDrawColor(253, 186, 116);
          doc.line(margin, y, pageW - margin, y);
          y += 3;

          const meals = (mealsByDay[day] || []).sort(
            (a, b) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type)
          );

          meals.forEach((meal) => {
            checkPage(14);
            // Meal type label
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(180, 80, 20);
            doc.text((meal.meal_type || "").toUpperCase().replace(/_/g, " "), margin, y);
            if (meal.calories) {
              doc.setTextColor(150, 100, 20);
              doc.text(`${meal.calories} cal`, pageW - margin - 18, y);
            }
            y += 4;

            // Meal name
            if (meal.meal_name) {
              doc.setFontSize(9);
              doc.setFont("helvetica", "bold");
              doc.setTextColor(30, 30, 30);
              doc.text(meal.meal_name, margin, y);
              y += 4;
            }

            // Items
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(70, 70, 70);
            (meal.items || []).forEach((item, i) => {
              checkPage(5);
              const line = `• ${item}${meal.portion_sizes?.[i] ? " — " + meal.portion_sizes[i] : ""}`;
              const wrapped = doc.splitTextToSize(line, usableW - 4);
              doc.text(wrapped, margin + 2, y);
              y += wrapped.length * 4;
            });

            // Macros
            const macros = [];
            if (meal.protein) macros.push(`P: ${meal.protein}g`);
            if (meal.carbs) macros.push(`C: ${meal.carbs}g`);
            if (meal.fats) macros.push(`F: ${meal.fats}g`);
            if (macros.length) {
              checkPage(5);
              doc.setFont("helvetica", "bold");
              doc.setTextColor(100, 100, 100);
              doc.text(macros.join("  "), margin, y);
              y += 4;
            }

            // Ingredients
            if (meal.ingredients?.length > 0) {
              checkPage(6);
              doc.setFont("helvetica", "bold");
              doc.setTextColor(180, 120, 20);
              doc.text("Ingredients:", margin, y);
              y += 4;
              doc.setFont("helvetica", "normal");
              doc.setTextColor(120, 80, 20);
              const ingLine = meal.ingredients.join(" | ");
              const ingWrapped = doc.splitTextToSize(ingLine, usableW - 4);
              ingWrapped.forEach(line => { checkPage(4); doc.text(line, margin + 2, y); y += 4; });
            }

            // Tip
            if (meal.nutritional_tip || meal.disease_rationale) {
              checkPage(6);
              doc.setFont("helvetica", "italic");
              doc.setTextColor(59, 130, 246);
              const tip = doc.splitTextToSize(`💡 ${meal.nutritional_tip || meal.disease_rationale}`, usableW - 4);
              doc.text(tip, margin + 2, y);
              y += tip.length * 4 + 1;
            }

            y += 3;
          });

          // MPESS for this day — stored as plan.mpess array
          const mpessSource = (plan.mpess && Array.isArray(plan.mpess)) ? plan.mpess : [];
          const dayMpessEntry = mpessSource.find(m => String(m.day) === String(day)) || getMpessData(plan);

          if (dayMpessEntry && (dayMpessEntry.sleep || dayMpessEntry.movement || dayMpessEntry.stress || dayMpessEntry.mindfulness || dayMpessEntry.pranayam)) {
            checkPage(30);
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(107, 33, 168);
            doc.text("MPESS — Holistic Guidance", margin, y);
            y += 5;
            const mpessFields = [
              { label: "Sleep", key: "sleep" },
              { label: "Stress", key: "stress" },
              { label: "Movement", key: "movement" },
              { label: "Mindfulness", key: "mindfulness" },
              { label: "Pranayam", key: "pranayam" },
            ];
            mpessFields.forEach(({ label, key }) => {
              if (dayMpessEntry[key]) {
                checkPage(8);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(107, 33, 168);
                doc.text(`${label}:`, margin, y);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(88, 28, 135);
                const wrapped = doc.splitTextToSize(dayMpessEntry[key], usableW - 20);
                doc.text(wrapped, margin + 18, y);
                y += wrapped.length * 4 + 1;
              }
            });
          }

          y += 4;
        });

        // MPESS page at end of detail PDF
        addMpessPage(doc, plan, margin, usableW);
      }

      doc.save(`${plan.name?.replace(/\s+/g, "_") || "meal_plan"}_${viewMode}.pdf`);
      toast.success("PDF downloaded!");
    } catch (e) {
      console.error(e);
      toast.error("PDF generation failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b">
        <div>
          <div className="flex flex-wrap gap-2 mb-1">
            <Badge variant="outline">{activePlan.duration} Days</Badge>
            {activePlan.food_preference && <Badge variant="outline" className="capitalize">{activePlan.food_preference}</Badge>}
            {activePlan.target_calories && <Badge variant="outline">{activePlan.target_calories} kcal/day</Badge>}
            {activePlan.meal_pattern && <Badge variant="outline">{activePlan.meal_pattern}</Badge>}
            {activePlan.plan_tier === "advanced" && <Badge className="bg-purple-600 text-white text-xs">💎 Pro</Badge>}
            {activePlan.active && <Badge className="bg-green-500 text-white text-xs"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>}
          </div>
          <p className="text-xs text-gray-400">Created: {activePlan.created_date ? format(new Date(activePlan.created_date), "MMM d, yyyy") : "—"}</p>
        </div>

        {!hideActions && (
          <div className="flex gap-2 flex-wrap">
            {/* Edit Plan — coaches only, not in edit mode */}
            {isCoach && !editMode && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditMode(true)}
                className="border-amber-400 text-amber-700 hover:bg-amber-50"
              >
                <Pencil className="w-3 h-3 mr-1" /> Edit Plan
              </Button>
            )}

            {/* Only show view/download/assign when NOT in edit mode */}
            {!editMode && (
              <>
                {/* View Toggle */}
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setViewMode("detail")}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-all ${
                      viewMode === "detail" ? "bg-orange-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                    title="Detail View"
                  >
                    <LayoutList className="w-3 h-3" /> Detail
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-all border-l border-gray-200 ${
                      viewMode === "table" ? "bg-orange-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                    title="Table View"
                  >
                    <Table2 className="w-3 h-3" /> Table
                  </button>
                </div>

                {/* Download PDF */}
                <Button size="sm" variant="outline" onClick={handleDownloadPDF} disabled={downloading}>
                  {downloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3 mr-1" />}
                  Download PDF
                </Button>

                {/* Schedule */}
                {isCoach && (
                  <Button size="sm" variant="outline" onClick={() => setShowSchedule(true)} className="border-blue-300 text-blue-600 hover:bg-blue-50">
                    <CalendarDays className="w-3 h-3 mr-1" /> Schedule
                  </Button>
                )}

                {/* Assign */}
                {!activePlan.active ? (
                  <Button size="sm" onClick={handleAssign} disabled={assigning} className="bg-green-500 hover:bg-green-600">
                    {assigning ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                    Assign to Client
                  </Button>
                ) : (
                  <Badge className="bg-green-100 text-green-700 border border-green-300 px-3 py-1">
                    <CheckCircle className="w-3 h-3 mr-1" /> Assigned & Active
                  </Badge>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Content — Edit Mode or View Mode */}
      {editMode ? (
        <MealPlanEditor
          plan={activePlan}
          onSaved={handleSaved}
          onCancel={() => setEditMode(false)}
        />
      ) : days.length > 0 ? (
        viewMode === "table" ? (
          <TableView mealsByDay={mealsByDay} days={days} mpess={activePlan?.mpess} />
        ) : (
          <DetailView mealsByDay={mealsByDay} days={days} mpess={activePlan?.mpess} />
        )
      ) : (
        <div className="text-center py-8">
          <ChefHat className="w-10 h-10 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No meal data available for this plan</p>
        </div>
      )}

      {/* Schedule Dialog */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" /> Schedule — {activePlan.name}
            </DialogTitle>
          </DialogHeader>
          <ModeB_ChooseSchedule
            client={{ id: activePlan.client_id }}
            skipSetup={true}
            onSaved={() => { setShowSchedule(false); toast.success("Schedule saved!"); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}