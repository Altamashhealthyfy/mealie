import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Send, CheckCircle, ChefHat, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// Group meals by day
function groupByDay(meals = []) {
  const map = {};
  meals.forEach((meal) => {
    const d = meal.day || 1;
    if (!map[d]) map[d] = [];
    map[d].push(meal);
  });
  return map;
}

const MEAL_ORDER = ["early_morning", "breakfast", "mid_morning", "lunch", "evening_snack", "dinner", "post_dinner"];

export default function MealPlanViewer({ plan, allPlanIds, onClose, onAssigned, onDeleted }) {
  const [assigning, setAssigning] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const mealsByDay = groupByDay(plan?.meals);
  const days = Object.keys(mealsByDay).sort((a, b) => a - b);
  const [selectedDay, setSelectedDay] = useState(days[0] || "1");

  const dayMeals = (mealsByDay[selectedDay] || []).sort((a, b) => {
    return MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type);
  });

  const handleAssign = async () => {
    setAssigning(true);
    try {
      // Deactivate all others, activate this one
      await Promise.all(allPlanIds.filter(id => id !== plan.id).map(id =>
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

  const handleDownload = () => {
    setDownloading(true);
    try {
      const lines = [];
      lines.push(`MEAL PLAN: ${plan.name}`);
      lines.push(`Client: ${plan.client_id}`);
      lines.push(`Duration: ${plan.duration} days | Pattern: ${plan.meal_pattern || "daily"}`);
      lines.push(`Calories: ${plan.target_calories || "—"} kcal/day`);
      lines.push("=".repeat(60));

      days.forEach((day) => {
        lines.push(`\nDAY ${day}`);
        lines.push("-".repeat(40));
        const meals = (mealsByDay[day] || []).sort((a, b) =>
          MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type)
        );
        meals.forEach((meal) => {
          lines.push(`\n[${meal.meal_type?.toUpperCase().replace(/_/g, " ")}] ${meal.meal_name || ""}`);
          if (meal.items?.length) {
            meal.items.forEach((item, i) => {
              lines.push(`  • ${item}${meal.portion_sizes?.[i] ? " — " + meal.portion_sizes[i] : ""}`);
            });
          }
          const macros = [];
          if (meal.calories) macros.push(`Cal: ${meal.calories} kcal`);
          if (meal.protein) macros.push(`P: ${meal.protein}g`);
          if (meal.carbs) macros.push(`C: ${meal.carbs}g`);
          if (meal.fats) macros.push(`F: ${meal.fats}g`);
          if (macros.length) lines.push(`  ${macros.join(" | ")}`);
          if (meal.nutritional_tip) lines.push(`  💡 ${meal.nutritional_tip}`);
        });
      });

      const blob = new Blob([lines.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${plan.name?.replace(/\s+/g, "_") || "meal_plan"}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Plan downloaded!");
    } catch (e) {
      toast.error("Download failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Plan Header */}
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
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleDownload} disabled={downloading}>
            {downloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3 mr-1" />}
            Download
          </Button>
          {!plan.active && (
            <Button size="sm" onClick={handleAssign} disabled={assigning} className="bg-green-500 hover:bg-green-600">
              {assigning ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
              Assign to Client
            </Button>
          )}
          {plan.active && (
            <Badge className="bg-green-100 text-green-700 border border-green-300 px-3 py-1">
              <CheckCircle className="w-3 h-3 mr-1" /> Assigned & Active
            </Badge>
          )}
        </div>
      </div>

      {/* Day Selector */}
      {days.length > 0 ? (
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

          {/* Meals for Selected Day */}
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
                        {meal.meal_name && (
                          <p className="font-medium text-gray-900 text-sm">{meal.meal_name}</p>
                        )}
                      </div>
                      <div className="flex gap-1 text-xs text-gray-500 shrink-0">
                        {meal.calories && <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded">{meal.calories} cal</span>}
                      </div>
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
                      {meal.protein && <span>P: <strong>{meal.protein}g</strong></span>}
                      {meal.carbs && <span>C: <strong>{meal.carbs}g</strong></span>}
                      {meal.fats && <span>F: <strong>{meal.fats}g</strong></span>}
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
      ) : (
        <div className="text-center py-8">
          <ChefHat className="w-10 h-10 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No meal data available for this plan</p>
        </div>
      )}
    </div>
  );
}