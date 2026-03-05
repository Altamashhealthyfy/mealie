import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Send, CheckCircle, ChefHat, Loader2, LayoutList, Table2 } from "lucide-react";
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

function TableView({ mealsByDay, days }) {
  const usedTypes = MEAL_ORDER.filter(type =>
    days.some(d => (mealsByDay[d] || []).some(m => m.meal_type === type))
  );

  return (
    <div className="space-y-4">
      {/* ── Meal Table ── */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-xs border-collapse">
          <thead>
            <tr className="bg-orange-50 border-b border-orange-200">
              <th className="text-left px-3 py-2.5 font-bold text-gray-700 sticky left-0 bg-orange-50 min-w-[55px] border-r border-orange-100">Day</th>
              {usedTypes.map(type => (
                <th key={type} className="text-left px-3 py-2.5 font-bold text-gray-700 min-w-[150px] border-r border-orange-100">
                  {MEAL_LABELS[type] || type}
                </th>
              ))}
              <th className="text-left px-3 py-2.5 font-bold text-gray-700 min-w-[90px]">Total</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day, idx) => {
              const meals = (mealsByDay[day] || []).sort(
                (a, b) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type)
              );
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
                  {usedTypes.map(type => {
                    const m = mealMap[type];
                    return (
                      <td key={type} className="px-3 py-3 align-top border-r border-gray-100">
                        {m ? (
                          <div className="space-y-1">
                            <p className="font-semibold text-gray-800 leading-tight">{m.meal_name || "—"}</p>
                            {m.items?.length > 0 && (
                              <ul className="space-y-0.5">
                                {m.items.map((item, j) => (
                                  <li key={j} className="text-gray-500 leading-snug flex gap-1">
                                    <span className="text-orange-300 shrink-0">•</span>
                                    <span>{item}{m.portion_sizes?.[j] ? ` — ${m.portion_sizes[j]}` : ""}</span>
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

      {/* ── MPESS Guidance ── */}
      <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
        <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-3">🌿 MPESS Holistic Guidance</h4>
        <div className="grid grid-cols-1 gap-2">
          {MPESS_TIPS.map((item) => (
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
function DetailView({ mealsByDay, days }) {
  const [selectedDay, setSelectedDay] = useState(days[0] || "1");

  const dayMeals = (mealsByDay[selectedDay] || []).sort(
    (a, b) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type)
  );

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
    </>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function MealPlanViewer({ plan, allPlanIds, onClose, onAssigned, onDeleted, hideActions }) {
  const [assigning, setAssigning] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [viewMode, setViewMode] = useState("detail"); // "detail" | "table"

  const mealsByDay = groupByDay(plan?.meals);
  const days = Object.keys(mealsByDay).sort((a, b) => Number(a) - Number(b));

  const MEAL_TYPES_USED = MEAL_ORDER.filter(type =>
    days.some(d => (mealsByDay[d] || []).some(m => m.meal_type === type))
  );

  const handleAssign = async () => {
    setAssigning(true);
    try {
      await Promise.all((allPlanIds || []).filter(id => id !== plan.id).map(id =>
        base44.entities.MealPlan.update(id, { active: false })
      ));
      await base44.entities.MealPlan.update(plan.id, { active: true });
      toast.success("Plan assigned as active!");
      onAssigned?.();
    } catch (e) {
      toast.error("Failed to assign plan");
    } finally {
      setAssigning(false);
    }
  };

  const handleDownloadPDF = () => {
    setDownloading(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
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

      if (viewMode === "table") {
        // ── TABLE PDF ──
        const usedTypes = MEAL_ORDER.filter(type =>
          days.some(d => (mealsByDay[d] || []).some(m => m.meal_type === type))
        );
        const colCount = usedTypes.length + 2; // Day + meals + Total
        const dayColW = 14;
        const totalColW = 22;
        const mealColW = Math.floor((usableW - dayColW - totalColW) / usedTypes.length);

        // Header row
        doc.setFillColor(255, 237, 213);
        doc.rect(margin, y, usableW, 7, "F");
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60, 60, 60);
        doc.text("Day", margin + 2, y + 5);
        usedTypes.forEach((type, i) => {
          doc.text(MEAL_LABELS[type] || type, margin + dayColW + i * mealColW + 1, y + 5);
        });
        doc.text("Total", margin + dayColW + usedTypes.length * mealColW + 1, y + 5);
        y += 7;

        days.forEach((day, idx) => {
          const meals = mealsByDay[day] || [];
          const mealMap = {};
          meals.forEach(m => { mealMap[m.meal_type] = m; });
          const totalCal = meals.reduce((s, m) => s + (m.calories || 0), 0);
          const totalProt = meals.reduce((s, m) => s + (m.protein || 0), 0);

          // Calculate row height (up to 2 lines per cell)
          const rowH = 10;
          checkPage(rowH + 2);

          if (idx % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(margin, y, usableW, rowH, "F");
          }

          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(234, 88, 12);
          doc.text(`Day ${day}`, margin + 2, y + 4);

          doc.setFont("helvetica", "normal");
          doc.setTextColor(50, 50, 50);
          usedTypes.forEach((type, i) => {
            const m = mealMap[type];
            const cellX = margin + dayColW + i * mealColW + 1;
            if (m) {
              const name = doc.splitTextToSize(m.meal_name || "—", mealColW - 2);
              doc.text(name[0] || "", cellX, y + 4);
              if (m.calories) {
                doc.setTextColor(150, 150, 150);
                doc.text(`${m.calories} kcal`, cellX, y + 8);
                doc.setTextColor(50, 50, 50);
              }
            } else {
              doc.setTextColor(180, 180, 180);
              doc.text("—", cellX, y + 4);
              doc.setTextColor(50, 50, 50);
            }
          });

          // Total col
          const totalX = margin + dayColW + usedTypes.length * mealColW + 1;
          doc.setFont("helvetica", "bold");
          doc.setTextColor(40, 40, 40);
          doc.text(`${totalCal} kcal`, totalX, y + 4);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(150, 150, 150);
          if (totalProt > 0) doc.text(`P:${Math.round(totalProt)}g`, totalX, y + 8);

          // Row border
          doc.setDrawColor(230, 230, 230);
          doc.line(margin, y + rowH, pageW - margin, y + rowH);
          y += rowH;
        });

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

          y += 4;
        });
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
            <Badge variant="outline">{plan.duration} Days</Badge>
            {plan.food_preference && <Badge variant="outline" className="capitalize">{plan.food_preference}</Badge>}
            {plan.target_calories && <Badge variant="outline">{plan.target_calories} kcal/day</Badge>}
            {plan.meal_pattern && <Badge variant="outline">{plan.meal_pattern}</Badge>}
            {plan.plan_tier === "advanced" && <Badge className="bg-purple-600 text-white text-xs">💎 Pro</Badge>}
            {plan.active && <Badge className="bg-green-500 text-white text-xs"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>}
          </div>
          <p className="text-xs text-gray-400">Created: {plan.created_date ? format(new Date(plan.created_date), "MMM d, yyyy") : "—"}</p>
        </div>

        {!hideActions && (
          <div className="flex gap-2 flex-wrap">
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

            {/* Download PDF — matches current view */}
            <Button size="sm" variant="outline" onClick={handleDownloadPDF} disabled={downloading}>
              {downloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3 mr-1" />}
              Download PDF
            </Button>

            {/* Assign */}
            {!plan.active ? (
              <Button size="sm" onClick={handleAssign} disabled={assigning} className="bg-green-500 hover:bg-green-600">
                {assigning ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                Assign to Client
              </Button>
            ) : (
              <Badge className="bg-green-100 text-green-700 border border-green-300 px-3 py-1">
                <CheckCircle className="w-3 h-3 mr-1" /> Assigned & Active
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {days.length > 0 ? (
        viewMode === "table" ? (
          <TableView mealsByDay={mealsByDay} days={days} />
        ) : (
          <DetailView mealsByDay={mealsByDay} days={days} />
        )
      ) : (
        <div className="text-center py-8">
          <ChefHat className="w-10 h-10 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No meal data available for this plan</p>
        </div>
      )}
    </div>
  );
}