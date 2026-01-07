import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, Loader2, CheckCircle, Edit } from "lucide-react";

export default function ManualTemplateBuilder({ onSave, isSaving }) {
  const [templateConfig, setTemplateConfig] = useState({
    name: "",
    description: "",
    duration: 7,
    target_calories: 1800,
    food_preference: "veg",
    regional_preference: "all",
  });

  const [meals, setMeals] = useState([]);
  const [currentMeal, setCurrentMeal] = useState({
    day: 1,
    meal_type: "breakfast",
    meal_name: "",
    items: [],
    portion_sizes: [],
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    nutritional_tip: ""
  });

  const [currentItem, setCurrentItem] = useState("");
  const [currentPortion, setCurrentPortion] = useState("");

  const addFoodItem = () => {
    if (!currentItem.trim() || !currentPortion.trim()) {
      alert("Please enter both food item and portion size");
      return;
    }

    setCurrentMeal({
      ...currentMeal,
      items: [...currentMeal.items, currentItem.trim()],
      portion_sizes: [...currentMeal.portion_sizes, currentPortion.trim()]
    });

    setCurrentItem("");
    setCurrentPortion("");
  };

  const removeFoodItem = (index) => {
    setCurrentMeal({
      ...currentMeal,
      items: currentMeal.items.filter((_, i) => i !== index),
      portion_sizes: currentMeal.portion_sizes.filter((_, i) => i !== index)
    });
  };

  const addMealToTemplate = () => {
    if (!currentMeal.meal_name.trim() || currentMeal.items.length === 0) {
      alert("Please add meal name and at least one food item");
      return;
    }

    setMeals([...meals, { ...currentMeal }]);
    
    // Reset current meal but keep day number
    setCurrentMeal({
      day: currentMeal.day,
      meal_type: "breakfast",
      meal_name: "",
      items: [],
      portion_sizes: [],
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      nutritional_tip: ""
    });
  };

  const removeMeal = (index) => {
    setMeals(meals.filter((_, i) => i !== index));
  };

  const handleSaveTemplate = () => {
    if (!templateConfig.name.trim()) {
      alert("Please enter template name");
      return;
    }

    if (meals.length === 0) {
      alert("Please add at least one meal to the template");
      return;
    }

    onSave({
      name: templateConfig.name,
      description: templateConfig.description,
      category: "general",
      duration: templateConfig.duration,
      target_calories: templateConfig.target_calories,
      food_preference: templateConfig.food_preference,
      regional_preference: templateConfig.regional_preference,
      meals: meals,
      is_public: false,
      times_used: 0
    });
  };

  const mealsByDay = {};
  meals.forEach(meal => {
    if (!mealsByDay[meal.day]) {
      mealsByDay[meal.day] = [];
    }
    mealsByDay[meal.day].push(meal);
  });

  return (
    <div className="space-y-6">
      {/* Template Configuration */}
      <Card className="border-2 border-indigo-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-indigo-600" />
            Template Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input
                placeholder="e.g., Veg 1800 Cal - 7 Days"
                value={templateConfig.name}
                onChange={(e) => setTemplateConfig({...templateConfig, name: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Duration (days) *</Label>
              <Select
                value={templateConfig.duration.toString()}
                onValueChange={(value) => setTemplateConfig({...templateConfig, duration: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 Days</SelectItem>
                  <SelectItem value="10">10 Days</SelectItem>
                  <SelectItem value="15">15 Days</SelectItem>
                  <SelectItem value="21">21 Days</SelectItem>
                  <SelectItem value="30">30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Calories *</Label>
              <Input
                type="number"
                placeholder="1800"
                value={templateConfig.target_calories}
                onChange={(e) => setTemplateConfig({...templateConfig, target_calories: parseInt(e.target.value)})}
              />
            </div>

            <div className="space-y-2">
              <Label>Food Preference *</Label>
              <Select
                value={templateConfig.food_preference}
                onValueChange={(value) => setTemplateConfig({...templateConfig, food_preference: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="veg">Vegetarian</SelectItem>
                  <SelectItem value="non_veg">Non-Veg</SelectItem>
                  <SelectItem value="eggetarian">Eggetarian</SelectItem>
                  <SelectItem value="jain">Jain</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Regional Preference *</Label>
              <Select
                value={templateConfig.regional_preference}
                onValueChange={(value) => setTemplateConfig({...templateConfig, regional_preference: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="north">North Indian</SelectItem>
                  <SelectItem value="south">South Indian</SelectItem>
                  <SelectItem value="west">West Indian</SelectItem>
                  <SelectItem value="east">East Indian</SelectItem>
                  <SelectItem value="all">All Regions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              placeholder="Template description..."
              value={templateConfig.description}
              onChange={(e) => setTemplateConfig({...templateConfig, description: e.target.value})}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Add Meals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-600" />
            Add Meals to Template
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Day *</Label>
              <Select
                value={currentMeal.day.toString()}
                onValueChange={(value) => setCurrentMeal({...currentMeal, day: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: templateConfig.duration }, (_, i) => i + 1).map(day => (
                    <SelectItem key={day} value={day.toString()}>Day {day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Meal Type *</Label>
              <Select
                value={currentMeal.meal_type}
                onValueChange={(value) => setCurrentMeal({...currentMeal, meal_type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="early_morning">Early Morning</SelectItem>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="mid_morning">Mid-Morning</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="evening_snack">Evening Snack</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Meal Name *</Label>
            <Input
              placeholder="e.g., Poha with Vegetables"
              value={currentMeal.meal_name}
              onChange={(e) => setCurrentMeal({...currentMeal, meal_name: e.target.value})}
            />
          </div>

          {/* Add Food Items */}
          <div className="space-y-3">
            <Label className="font-semibold">Food Items & Portions</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Food item (e.g., Poha)"
                value={currentItem}
                onChange={(e) => setCurrentItem(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Portion (e.g., 1 bowl 150g)"
                value={currentPortion}
                onChange={(e) => setCurrentPortion(e.target.value)}
                className="flex-1"
              />
              <Button onClick={addFoodItem} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {currentMeal.items.length > 0 && (
              <div className="space-y-2">
                {currentMeal.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <span className="flex-1 text-sm">{item}</span>
                    <span className="flex-1 text-sm text-gray-600">{currentMeal.portion_sizes[index]}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFoodItem(index)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nutrition Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Calories</Label>
              <Input
                type="number"
                placeholder="300"
                value={currentMeal.calories || ""}
                onChange={(e) => setCurrentMeal({...currentMeal, calories: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <Label>Protein (g)</Label>
              <Input
                type="number"
                placeholder="15"
                value={currentMeal.protein || ""}
                onChange={(e) => setCurrentMeal({...currentMeal, protein: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <Label>Carbs (g)</Label>
              <Input
                type="number"
                placeholder="40"
                value={currentMeal.carbs || ""}
                onChange={(e) => setCurrentMeal({...currentMeal, carbs: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <Label>Fats (g)</Label>
              <Input
                type="number"
                placeholder="5"
                value={currentMeal.fats || ""}
                onChange={(e) => setCurrentMeal({...currentMeal, fats: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nutritional Tip (optional)</Label>
            <Textarea
              placeholder="e.g., Rich in iron and fiber..."
              value={currentMeal.nutritional_tip}
              onChange={(e) => setCurrentMeal({...currentMeal, nutritional_tip: e.target.value})}
              rows={2}
            />
          </div>

          <Button
            onClick={addMealToTemplate}
            className="w-full bg-green-500 hover:bg-green-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add This Meal to Template
          </Button>
        </CardContent>
      </Card>

      {/* Preview Added Meals */}
      {meals.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Template Meals ({meals.length} meals added)
              </CardTitle>
              <Badge className="bg-blue-600 text-white">
                {Object.keys(mealsByDay).length} / {templateConfig.duration} days
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {Array.from({ length: templateConfig.duration }, (_, i) => i + 1).map(day => {
              const dayMeals = mealsByDay[day] || [];
              if (dayMeals.length === 0) return null;

              return (
                <div key={day} className="p-4 bg-gray-50 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Day {day}</h3>
                    <Badge>{dayMeals.length} meals</Badge>
                  </div>
                  <div className="space-y-2">
                    {dayMeals.map((meal, idx) => {
                      const globalIndex = meals.findIndex(m => m === meal);
                      return (
                        <div key={idx} className="p-3 bg-white border rounded flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="capitalize text-xs">
                                {meal.meal_type.replace('_', ' ')}
                              </Badge>
                              <span className="font-medium text-sm">{meal.meal_name}</span>
                            </div>
                            <p className="text-xs text-gray-600">
                              {meal.items.join(', ')}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <Badge className="bg-orange-100 text-orange-700 text-xs">
                                {meal.calories} kcal
                              </Badge>
                              <Badge className="bg-blue-100 text-blue-700 text-xs">
                                P: {meal.protein}g
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMeal(globalIndex)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Save Template */}
      {meals.length > 0 && (
        <Alert className="bg-green-50 border-green-500">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <AlertDescription>
            Ready to save! You've added {meals.length} meals across {Object.keys(mealsByDay).length} days.
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleSaveTemplate}
        disabled={isSaving || meals.length === 0}
        className="w-full h-14 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Saving Template...
          </>
        ) : (
          <>
            <CheckCircle className="w-5 h-5 mr-2" />
            Save Template ({meals.length} meals)
          </>
        )}
      </Button>
    </div>
  );
}