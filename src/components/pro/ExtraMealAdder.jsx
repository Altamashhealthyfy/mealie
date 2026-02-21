import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ExtraMealAdder({ meals, numberOfDays, onAddMeals }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState("1");
  const [newMeal, setNewMeal] = useState({
    meal_type: "snack",
    meal_name: "",
    items: [""],
    portion_sizes: [""],
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    sodium: 0,
    potassium: 0,
    disease_rationale: ""
  });

  const mealTypeOptions = ["breakfast", "snack", "lunch", "dinner", "dessert", "beverage"];

  const addItem = () => {
    setNewMeal({
      ...newMeal,
      items: [...newMeal.items, ""],
      portion_sizes: [...newMeal.portion_sizes, ""]
    });
  };

  const updateItem = (index, field, value) => {
    const updated = { ...newMeal };
    if (field === "item") {
      updated.items[index] = value;
    } else {
      updated.portion_sizes[index] = value;
    }
    setNewMeal(updated);
  };

  const removeItem = (index) => {
    setNewMeal({
      ...newMeal,
      items: newMeal.items.filter((_, i) => i !== index),
      portion_sizes: newMeal.portion_sizes.filter((_, i) => i !== index)
    });
  };

  const handleAddMeal = () => {
    if (!newMeal.meal_name || newMeal.items.some(i => !i)) {
      alert("⚠️ Please fill in meal name and all food items");
      return;
    }

    const mealToAdd = {
      day: parseInt(selectedDay),
      ...newMeal,
      items: newMeal.items.filter(i => i),
      portion_sizes: newMeal.portion_sizes.filter(i => i)
    };

    onAddMeals([mealToAdd]);

    // Reset form
    setNewMeal({
      meal_type: "snack",
      meal_name: "",
      items: [""],
      portion_sizes: [""],
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      sodium: 0,
      potassium: 0,
      disease_rationale: ""
    });
    setShowForm(false);
  };

  const daySummary = (day) => {
    const dayMeals = meals.filter(m => m.day === day);
    const totalCals = dayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
    return { mealCount: dayMeals.length, totalCals };
  };

  return (
    <Card className="border-2 border-blue-300 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-600" />
          Add Extra Meals/Snacks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-100 border-blue-300">
          <AlertDescription className="text-sm">
            💡 Add extra meals, snacks, or beverages to any day after generating the plan
          </AlertDescription>
        </Alert>

        {!showForm ? (
          <Button
            onClick={() => setShowForm(true)}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Extra Meal
          </Button>
        ) : (
          <div className="space-y-4 bg-white p-4 rounded-lg border border-blue-200">
            {/* Day Selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">Select Day *</label>
              <Tabs value={selectedDay} onValueChange={setSelectedDay}>
                <TabsList className="flex flex-wrap gap-1 h-auto bg-gray-100 p-1">
                  {Array.from({ length: numberOfDays }, (_, i) => i + 1).map(day => {
                    const { mealCount, totalCals } = daySummary(day);
                    return (
                      <TabsTrigger
                        key={day}
                        value={day.toString()}
                        className="text-xs px-2 py-1"
                        title={`${mealCount} meals, ${totalCals} kcal`}
                      >
                        D{day}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>
            </div>

            {/* Meal Type */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">Meal Type *</label>
              <select
                value={newMeal.meal_type}
                onChange={(e) => setNewMeal({ ...newMeal, meal_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                {mealTypeOptions.map(type => (
                  <option key={type} value={type} className="capitalize">
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Meal Name */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">Meal Name *</label>
              <Input
                value={newMeal.meal_name}
                onChange={(e) => setNewMeal({ ...newMeal, meal_name: e.target.value })}
                placeholder="e.g., Greek Yogurt with Berries"
                className="text-sm"
              />
            </div>

            {/* Food Items */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">Food Items *</label>
              <div className="space-y-2">
                {newMeal.items.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => updateItem(i, "item", e.target.value)}
                      placeholder="Food item"
                      className="text-xs flex-1 h-8"
                    />
                    <Input
                      value={newMeal.portion_sizes[i]}
                      onChange={(e) => updateItem(i, "portion", e.target.value)}
                      placeholder="Portion (e.g., 1 cup)"
                      className="text-xs w-24 h-8"
                    />
                    {newMeal.items.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeItem(i)}
                        className="px-2 text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addItem}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Item
              </Button>
            </div>

            {/* Nutrition Grid */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Calories", key: "calories", unit: "kcal" },
                { label: "Protein", key: "protein", unit: "g" },
                { label: "Carbs", key: "carbs", unit: "g" },
                { label: "Fats", key: "fats", unit: "g" },
                { label: "Sodium", key: "sodium", unit: "mg" },
                { label: "K+", key: "potassium", unit: "mg" }
              ].map(({ label, key, unit }) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600">{label} ({unit})</label>
                  <Input
                    type="number"
                    value={newMeal[key]}
                    onChange={(e) => setNewMeal({ ...newMeal, [key]: parseFloat(e.target.value) || 0 })}
                    className="text-xs h-8"
                  />
                </div>
              ))}
            </div>

            {/* Disease Rationale */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">Notes (Optional)</label>
              <Input
                value={newMeal.disease_rationale}
                onChange={(e) => setNewMeal({ ...newMeal, disease_rationale: e.target.value })}
                placeholder="Why this meal? Any notes?"
                className="text-sm"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                className="text-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddMeal}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Save className="w-4 h-4 mr-1" />
                Add Meal
              </Button>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="text-xs text-gray-600">
          <p>📊 Total meals in plan: {meals.length}</p>
        </div>
      </CardContent>
    </Card>
  );
}