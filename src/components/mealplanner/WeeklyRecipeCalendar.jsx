import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChefHat, Plus, X, Search, Clock, Flame, Calendar } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEAL_SLOTS = [
  { key: "early_morning", label: "Early Morning", color: "bg-yellow-50 border-yellow-200" },
  { key: "breakfast", label: "Breakfast", color: "bg-orange-50 border-orange-200" },
  { key: "mid_morning", label: "Mid-Morning", color: "bg-green-50 border-green-200" },
  { key: "lunch", label: "Lunch", color: "bg-blue-50 border-blue-200" },
  { key: "evening_snack", label: "Evening Snack", color: "bg-purple-50 border-purple-200" },
  { key: "dinner", label: "Dinner", color: "bg-red-50 border-red-200" },
];

export default function WeeklyRecipeCalendar({ clientId }) {
  const queryClient = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null); // { day, slot }
  const [recipeSearch, setRecipeSearch] = useState("");
  const [mealTypeFilter, setMealTypeFilter] = useState("all");

  // calendar data: { "Monday_breakfast": [{recipeId, recipeName, calories}], ... }
  const [calendar, setCalendar] = useState({});

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => base44.entities.Recipe.list("-created_date"),
    initialData: [],
  });

  const { data: mealPlans = [] } = useQuery({
    queryKey: ["mealPlans", clientId],
    queryFn: () => base44.entities.MealPlan.filter({ client_id: clientId }),
    enabled: !!clientId,
    initialData: [],
  });

  // Load existing meal plan into calendar if available
  React.useEffect(() => {
    if (mealPlans.length > 0) {
      const activePlan = mealPlans.find(p => p.active) || mealPlans[0];
      if (activePlan?.meals) {
        const cal = {};
        activePlan.meals.forEach(meal => {
          const dayIndex = (meal.day - 1) % 7;
          const dayName = DAYS[dayIndex];
          const key = `${dayName}_${meal.meal_type}`;
          if (!cal[key]) cal[key] = [];
          cal[key].push({
            name: meal.meal_name,
            calories: meal.calories,
            items: meal.items,
          });
        });
        setCalendar(cal);
      }
    }
  }, [mealPlans]);

  const openPicker = (day, slot) => {
    setPickerTarget({ day, slot });
    setRecipeSearch("");
    setMealTypeFilter("all");
    setShowPicker(true);
  };

  const addRecipeToSlot = (recipe) => {
    if (!pickerTarget) return;
    const key = `${pickerTarget.day}_${pickerTarget.slot}`;
    setCalendar(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), { name: recipe.name, calories: recipe.calories || 0, recipeId: recipe.id }],
    }));
    setShowPicker(false);
  };

  const removeFromSlot = (day, slot, idx) => {
    const key = `${day}_${slot}`;
    setCalendar(prev => ({
      ...prev,
      [key]: (prev[key] || []).filter((_, i) => i !== idx),
    }));
  };

  const getDayCalories = (day) => {
    return MEAL_SLOTS.reduce((total, slot) => {
      const items = calendar[`${day}_${slot.key}`] || [];
      return total + items.reduce((s, r) => s + (r.calories || 0), 0);
    }, 0);
  };

  const filteredRecipes = recipes.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(recipeSearch.toLowerCase());
    const matchType = mealTypeFilter === "all" || r.meal_type === mealTypeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-bold text-gray-900">Weekly Recipe Calendar</h2>
          {clientId && (
            <Badge className="bg-blue-100 text-blue-700 text-xs">Client Plan View</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w - 1)}>← Prev</Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>This Week</Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w + 1)}>Next →</Button>
        </div>
      </div>

      {/* Weekly Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Header Row */}
          <div className="grid grid-cols-8 gap-1 mb-2">
            <div className="p-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Meal</div>
            {DAYS.map(day => (
              <div key={day} className="p-2 text-center">
                <p className="text-xs font-bold text-gray-700">{day.slice(0, 3)}</p>
                <p className="text-xs text-gray-400">{getDayCalories(day)} kcal</p>
              </div>
            ))}
          </div>

          {/* Meal Rows */}
          {MEAL_SLOTS.map(slot => (
            <div key={slot.key} className="grid grid-cols-8 gap-1 mb-1">
              <div className={`p-2 rounded-lg border text-xs font-medium text-gray-600 flex items-center ${slot.color}`}>
                {slot.label}
              </div>
              {DAYS.map(day => {
                const key = `${day}_${slot.key}`;
                const items = calendar[key] || [];
                return (
                  <div
                    key={day}
                    className={`min-h-[64px] rounded-lg border p-1.5 ${slot.color} relative group`}
                  >
                    {items.map((item, idx) => (
                      <div key={idx} className="flex items-start justify-between gap-1 mb-1">
                        <div>
                          <p className="text-[10px] font-semibold text-gray-800 leading-tight line-clamp-2">{item.name}</p>
                          {item.calories > 0 && (
                            <p className="text-[9px] text-gray-500">{item.calories} kcal</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeFromSlot(day, slot.key, idx)}
                          className="text-gray-400 hover:text-red-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => openPicker(day, slot.key)}
                      className="w-full mt-1 text-[10px] text-gray-400 hover:text-orange-500 flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Plus className="w-3 h-3" />
                      Add
                    </button>
                    {items.length === 0 && (
                      <button
                        onClick={() => openPicker(day, slot.key)}
                        className="w-full h-full flex items-center justify-center text-gray-300 hover:text-orange-400 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Recipe Picker Dialog */}
      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-orange-500" />
              Add Recipe — {pickerTarget?.day} {pickerTarget && MEAL_SLOTS.find(s => s.key === pickerTarget.slot)?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Search recipes..."
                  value={recipeSearch}
                  onChange={e => setRecipeSearch(e.target.value)}
                />
              </div>
              <Select value={mealTypeFilter} onValueChange={setMealTypeFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Meal type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="snack">Snack</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto pr-1">
              {filteredRecipes.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No recipes found</p>
              ) : filteredRecipes.map(recipe => (
                <button
                  key={recipe.id}
                  onClick={() => addRecipeToSlot(recipe)}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all flex items-center gap-3"
                >
                  {recipe.image_url ? (
                    <img src={recipe.image_url} alt={recipe.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <ChefHat className="w-6 h-6 text-orange-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{recipe.name}</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{recipe.description}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[10px] flex items-center gap-0.5 text-gray-500">
                        <Flame className="w-3 h-3" /> {recipe.calories || '?'} kcal
                      </span>
                      <span className="text-[10px] flex items-center gap-0.5 text-gray-500">
                        <Clock className="w-3 h-3" /> {(recipe.prep_time || 0) + (recipe.cook_time || 0)} min
                      </span>
                      <Badge className="text-[10px] capitalize bg-orange-100 text-orange-700 px-1.5 py-0">{recipe.meal_type}</Badge>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}