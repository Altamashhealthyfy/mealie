
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Common Indian foods database with macros
const INDIAN_FOODS = [
  // Breakfast Items
  { name: "Poha", cal: 180, protein: 3, carbs: 38, fats: 2, unit: "1 katori (150g)" },
  { name: "Upma", cal: 220, protein: 5, carbs: 42, fats: 4, unit: "1 katori (150g)" },
  { name: "Idli", cal: 39, protein: 2, carbs: 8, fats: 0.2, unit: "1 piece (40g)" },
  { name: "Dosa", cal: 120, protein: 3, carbs: 24, fats: 2, unit: "1 medium (120g)" },
  { name: "Paratha", cal: 180, protein: 4, carbs: 28, fats: 6, unit: "1 medium (80g)" },
  { name: "Aloo Paratha", cal: 250, protein: 6, carbs: 35, fats: 9, unit: "1 stuffed (100g)" },
  { name: "Uttapam", cal: 150, protein: 4, carbs: 28, fats: 2, unit: "1 medium (150g)" },
  { name: "Daliya", cal: 180, protein: 6, carbs: 36, fats: 2, unit: "1 katori (150g)" },
  { name: "Oats", cal: 150, protein: 5, carbs: 27, fats: 3, unit: "1 bowl (40g dry)" },
  
  // Rotis/Breads
  { name: "Roti/Chapati", cal: 80, protein: 3, carbs: 16, fats: 1, unit: "1 medium (30g)" },
  { name: "Phulka", cal: 70, protein: 2.5, carbs: 14, fats: 0.5, unit: "1 medium (25g)" },
  
  // Rice
  { name: "Steamed Rice", cal: 130, protein: 2.5, carbs: 28, fats: 0.3, unit: "1 katori (100g)" },
  { name: "Brown Rice", cal: 110, protein: 2.6, carbs: 23, fats: 0.9, unit: "1 katori (100g)" },
  { name: "Jeera Rice", cal: 150, protein: 3, carbs: 30, fats: 2, unit: "1 katori (100g)" },
  
  // Dal/Lentils
  { name: "Dal Tadka", cal: 120, protein: 8, carbs: 18, fats: 2, unit: "1 katori (150g)" },
  { name: "Moong Dal", cal: 110, protein: 7, carbs: 17, fats: 1.5, unit: "1 katori (150g)" },
  { name: "Masoor Dal", cal: 115, protein: 8, carbs: 18, fats: 1, unit: "1 katori (150g)" },
  { name: "Chana Dal", cal: 140, protein: 9, carbs: 22, fats: 2, unit: "1 katori (150g)" },
  
  // Sabzi/Vegetables
  { name: "Mixed Veg Sabzi", cal: 100, protein: 3, carbs: 12, fats: 4, unit: "1 katori (200g)" },
  { name: "Aloo Gobi", cal: 120, protein: 2, carbs: 16, fats: 5, unit: "1 katori (200g)" },
  { name: "Palak Paneer", cal: 180, protein: 10, carbs: 8, fats: 12, unit: "1 katori (200g)" },
  { name: "Bhindi Masala", cal: 90, protein: 2, carbs: 10, fats: 5, unit: "1 katori (200g)" },
  { name: "Baingan Bharta", cal: 100, protein: 2, carbs: 12, fats: 5, unit: "1 katori (200g)" },
  
  // Paneer
  { name: "Paneer (raw/grilled)", cal: 265, protein: 18, carbs: 1.2, fats: 20, unit: "50g cubes" },
  { name: "Paneer Curry", cal: 220, protein: 12, carbs: 8, fats: 16, unit: "1 katori (150g)" },
  
  // Drinks
  { name: "Chai (with milk & sugar)", cal: 60, protein: 2, carbs: 10, fats: 2, unit: "1 cup (240ml)" },
  { name: "Green Tea", cal: 2, protein: 0, carbs: 0, fats: 0, unit: "1 cup (200ml)" },
  { name: "Milk (full fat)", cal: 150, protein: 8, carbs: 12, fats: 8, unit: "1 glass (200ml)" },
  { name: "Buttermilk", cal: 40, protein: 2, carbs: 5, fats: 1, unit: "1 glass (200ml)" },
  
  // Snacks
  { name: "Bhuna Chana", cal: 120, protein: 6, carbs: 20, fats: 2, unit: "1 katori (30g)" },
  { name: "Murmura", cal: 100, protein: 2, carbs: 22, fats: 0.5, unit: "1 katori (25g)" },
  { name: "Makhana", cal: 85, protein: 2, carbs: 17, fats: 1, unit: "1 katori (20g)" },
  { name: "Mixed Nuts", cal: 170, protein: 5, carbs: 6, fats: 15, unit: "1 handful (30g)" },
  
  // Fruits
  { name: "Apple", cal: 52, protein: 0.3, carbs: 14, fats: 0.2, unit: "1 medium (100g)" },
  { name: "Banana", cal: 89, protein: 1, carbs: 23, fats: 0.3, unit: "1 medium (100g)" },
  { name: "Orange", cal: 47, protein: 0.9, carbs: 12, fats: 0.1, unit: "1 medium (100g)" },
  { name: "Papaya", cal: 43, protein: 0.5, carbs: 11, fats: 0.1, unit: "1 bowl (100g)" },
  
  // Eggs & Non-Veg
  { name: "Boiled Egg", cal: 68, protein: 6, carbs: 0.6, fats: 5, unit: "1 whole egg (50g)" },
  { name: "Egg White", cal: 17, protein: 3.6, carbs: 0.2, fats: 0, unit: "1 egg white" },
  { name: "Chicken Breast (grilled)", cal: 165, protein: 31, carbs: 0, fats: 3.6, unit: "100g" },
  { name: "Fish (grilled)", cal: 120, protein: 26, carbs: 0, fats: 1.5, unit: "100g" },
  
  // Others
  { name: "Curd/Yogurt", cal: 60, protein: 3.5, carbs: 4.7, fats: 3, unit: "1 katori (100g)" },
  { name: "Salad (mixed veg)", cal: 30, protein: 1, carbs: 6, fats: 0.2, unit: "1 bowl (100g)" },
  { name: "Soup (vegetable)", cal: 50, protein: 2, carbs: 10, fats: 1, unit: "1 bowl (200ml)" },
];

export default function ManualMealPlanBuilder({ client, onSave, isSaving }) {
  const [duration, setDuration] = useState(7);
  const [meals, setMeals] = useState([]);
  const [currentDay, setCurrentDay] = useState(1);
  const [currentMealType, setCurrentMealType] = useState('breakfast');
  const [currentMeal, setCurrentMeal] = useState({
    meal_name: '',
    items: [],
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFood, setSelectedFood] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [fetchingAI, setFetchingAI] = useState(false);

  const mealTypes = [
    { value: 'early_morning', label: 'Early Morning' },
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'mid_morning', label: 'Mid-Morning' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'evening_snack', label: 'Evening Snack' },
    { value: 'dinner', label: 'Dinner' }
  ];

  const filteredFoods = searchTerm.length > 0
    ? INDIAN_FOODS.filter(food => 
        food.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const fetchAINutrition = async (foodName) => {
    setFetchingAI(true);
    try {
      const prompt = `You are a nutrition expert specializing in Indian foods.

Provide detailed nutritional information for: "${foodName}"

Return ONLY the following structure (use ICMR Indian food database standards):

Food Name: [exact name]
Standard Unit: [e.g., "1 katori (150g)" OR "1 piece (50g)" OR "1 cup (240ml)"]
Calories: [number]
Protein: [number in grams]
Carbs: [number in grams]
Fats: [number in grams]

IMPORTANT:
- Use traditional Indian units (katori, cup, piece, bowl)
- Base it on one standard serving
- Use ICMR data if available
- Be accurate and specific`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            unit: { type: "string" },
            calories: { type: "number" },
            protein: { type: "number" },
            carbs: { type: "number" },
            fats: { type: "number" }
          },
          required: ["name", "unit", "calories", "protein", "carbs", "fats"]
        }
      });

      return {
        name: response.name,
        cal: response.calories,
        protein: response.protein,
        carbs: response.carbs,
        fats: response.fats,
        unit: response.unit,
        isAI: true
      };
    } catch (error) {
      console.error("AI nutrition fetch error:", error);
      alert("Could not fetch nutrition data. Please try again.");
      return null;
    } finally {
      setFetchingAI(false);
    }
  };

  const handleSearchWithAI = async () => {
    if (!searchTerm || searchTerm.length < 2) return;

    // Check if already in database
    const existingFood = INDIAN_FOODS.find(
      food => food.name.toLowerCase() === searchTerm.toLowerCase()
    );

    if (existingFood) {
      setSelectedFood(existingFood);
      return;
    }

    // Not in database - fetch from AI
    if (filteredFoods.length === 0 && searchTerm.length >= 2) {
      const aiFood = await fetchAINutrition(searchTerm);
      if (aiFood) {
        setSelectedFood(aiFood);
        setSearchTerm(aiFood.name);
      }
    }
  };

  const addFoodItem = () => {
    if (!selectedFood || quantity <= 0) return;

    const newItem = {
      name: selectedFood.name,
      quantity: quantity,
      unit: selectedFood.unit,
      calories: Math.round(selectedFood.cal * quantity),
      protein: Math.round(selectedFood.protein * quantity * 10) / 10,
      carbs: Math.round(selectedFood.carbs * quantity * 10) / 10,
      fats: Math.round(selectedFood.fats * quantity * 10) / 10,
    };

    setCurrentMeal({
      ...currentMeal,
      items: [...currentMeal.items, newItem]
    });

    setSearchTerm('');
    setSelectedFood(null);
    setQuantity(1);
  };

  const removeItem = (index) => {
    setCurrentMeal({
      ...currentMeal,
      items: currentMeal.items.filter((_, i) => i !== index)
    });
  };

  const getMealTotals = () => {
    return currentMeal.items.reduce((acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fats: acc.fats + item.fats,
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
  };

  const saveMeal = () => {
    if (!currentMeal.meal_name || currentMeal.items.length === 0) {
      alert('Please add meal name and at least one food item');
      return;
    }

    const totals = getMealTotals();
    const newMeal = {
      day: currentDay,
      meal_type: currentMealType,
      meal_name: currentMeal.meal_name,
      items: currentMeal.items.map(i => i.name),
      portion_sizes: currentMeal.items.map(i => `${i.quantity} ${i.unit}`),
      calories: totals.calories,
      protein: Math.round(totals.protein * 10) / 10,
      carbs: Math.round(totals.carbs * 10) / 10,
      fats: Math.round(totals.fats * 10) / 10,
    };

    setMeals([...meals, newMeal]);
    setCurrentMeal({ meal_name: '', items: [] });
    alert('✅ Meal added! Add more meals or save the plan.');
  };

  const handleSavePlan = () => {
    if (meals.length === 0) {
      alert('Please add at least one meal');
      return;
    }

    const planData = {
      client_id: client.id,
      plan_name: `Manual Plan - ${client.full_name}`,
      duration: duration,
      meal_pattern: 'daily',
      target_calories: client.target_calories,
      food_preference: client.food_preference,
      regional_preference: client.regional_preference,
      meals: meals,
    };

    onSave(planData);
  };

  const getDailyTotals = (day) => {
    const dayMeals = meals.filter(m => m.day === day);
    return dayMeals.reduce((acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.protein,
      carbs: acc.carbs + meal.carbs,
      fats: acc.fats + meal.fats,
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
  };

  const totals = getMealTotals();

  return (
    <div className="space-y-6">
      {/* Plan Configuration */}
      <Card className="border-none shadow-lg">
        <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
          <CardTitle>Manual Meal Plan Builder</CardTitle>
          <p className="text-sm text-white/90">Build meal plans manually with auto-calculated macros</p>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duration (days)</Label>
              <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 Days</SelectItem>
                  <SelectItem value="10">10 Days</SelectItem>
                  <SelectItem value="14">14 Days</SelectItem>
                  <SelectItem value="30">30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Day</Label>
              <Select value={currentDay.toString()} onValueChange={(v) => setCurrentDay(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: duration }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      Day {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Day Summary */}
          {meals.filter(m => m.day === currentDay).length > 0 && (
            <Alert className="bg-blue-50 border-blue-500">
              <AlertDescription>
                <strong>Day {currentDay} Total:</strong> {getDailyTotals(currentDay).calories} kcal | 
                P: {getDailyTotals(currentDay).protein}g | 
                C: {getDailyTotals(currentDay).carbs}g | 
                F: {getDailyTotals(currentDay).fats}g
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Meal Builder */}
      <Card className="border-none shadow-lg">
        <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
          <CardTitle>Add Meal for Day {currentDay}</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Meal Type</Label>
              <Select value={currentMealType} onValueChange={setCurrentMealType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mealTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Meal Name</Label>
              <Input
                placeholder="e.g., Poha with vegetables"
                value={currentMeal.meal_name}
                onChange={(e) => setCurrentMeal({...currentMeal, meal_name: e.target.value})}
              />
            </div>
          </div>

          {/* Food Search & Add with AI */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <Label>Search & Add Food Items</Label>
              <Badge className="bg-purple-100 text-purple-700">
                <Sparkles className="w-3 h-3 mr-1" />
                AI Powered
              </Badge>
            </div>

            <Alert className="bg-blue-50 border-blue-500">
              <AlertDescription className="text-sm">
                💡 <strong>New!</strong> Not in database? Type any food name and press "Search with AI" to get instant nutrition data!
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Input
                  placeholder="Type food name (e.g., sambhar, khichdi, puri...)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => {
                    // Only trigger AI search if Enter is pressed and no local foods are found
                    if (e.key === 'Enter' && filteredFoods.length === 0 && searchTerm.length >= 2) {
                      handleSearchWithAI();
                    }
                  }}
                />
                {/* Autocomplete Dropdown */}
                {filteredFoods.length > 0 && searchTerm.length > 0 && (
                  <div className="bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredFoods.slice(0, 10).map((food, index) => (
                      <div
                        key={index}
                        className="p-3 hover:bg-orange-50 cursor-pointer border-b last:border-b-0"
                        onClick={() => {
                          setSelectedFood(food);
                          setSearchTerm(food.name);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{food.name}</p>
                            <p className="text-xs text-gray-600">{food.unit}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-orange-600">{food.cal} kcal</p>
                            <p className="text-xs text-gray-600">P:{food.protein}g C:{food.carbs}g F:{food.fats}g</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* AI Search Button - only shows when no results in database and nothing selected */}
                {searchTerm.length >= 2 && filteredFoods.length === 0 && !selectedFood && (
                  <Button
                    onClick={handleSearchWithAI}
                    disabled={fetchingAI}
                    className="w-full bg-gradient-to-r from-purple-500 to-indigo-500"
                  >
                    {fetchingAI ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Fetching nutrition data...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Search with AI
                      </>
                    )}
                  </Button>
                )}

                {/* Selected Food Display */}
                {selectedFood && (
                  <div className="p-3 bg-green-50 border-2 border-green-300 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-green-900">
                          {selectedFood.name}
                          {selectedFood.isAI && (
                            <Badge className="ml-2 bg-purple-500 text-white text-xs">
                              <Sparkles className="w-3 h-3 mr-1" />
                              AI
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-gray-700">{selectedFood.unit}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-600">{selectedFood.cal} kcal</p>
                        <p className="text-xs text-gray-600">
                          P:{selectedFood.protein}g C:{selectedFood.carbs}g F:{selectedFood.fats}g
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  placeholder="Qty"
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                />
              </div>
            </div>

            <Button
              onClick={addFoodItem}
              disabled={!selectedFood}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add to Meal
            </Button>
          </div>

          {/* Current Meal Items */}
          {currentMeal.items.length > 0 && (
            <div className="space-y-3">
              <Label>Meal Items</Label>
              {currentMeal.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-600">
                      {item.quantity} {item.unit} • {item.calories} kcal
                    </p>
                  </div>
                  <div className="text-right mr-4">
                    <p className="text-xs text-gray-600">
                      P:{item.protein}g C:{item.carbs}g F:{item.fats}g
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              {/* Meal Totals */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200">
                <h4 className="font-semibold mb-2">Meal Totals:</h4>
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Calories</p>
                    <p className="text-xl font-bold text-orange-600">{totals.calories}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Protein</p>
                    <p className="text-xl font-bold text-red-600">{totals.protein}g</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Carbs</p>
                    <p className="text-xl font-bold text-yellow-600">{totals.carbs}g</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Fats</p>
                    <p className="text-xl font-bold text-purple-600">{totals.fats}g</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={saveMeal}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 h-12"
              >
                <Save className="w-4 h-4 mr-2" />
                Save This Meal & Add Another
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Summary */}
      {meals.length > 0 && (
        <Card className="border-none shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
            <div className="flex items-center justify-between">
              <CardTitle>Plan Summary ({meals.length} meals added)</CardTitle>
              <Button
                onClick={handleSavePlan}
                disabled={isSaving}
                className="bg-white text-green-600 hover:bg-green-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save & Assign Plan
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: duration }, (_, i) => {
                const day = i + 1;
                const dayMeals = meals.filter(m => m.day === day);
                const dayTotals = getDailyTotals(day);
                
                if (dayMeals.length === 0) return null;

                return (
                  <div key={day} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-lg">Day {day}</h3>
                      <Badge className="bg-orange-100 text-orange-700">
                        {dayTotals.calories} kcal
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {dayMeals.map((meal, idx) => (
                        <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
                          <span className="font-medium capitalize">
                            {meal.meal_type.replace('_', ' ')}:
                          </span>
                          <span className="ml-2">{meal.meal_name}</span>
                          <span className="ml-2 text-gray-600">({meal.calories} kcal)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {meals.length < (duration * 6) && (
              <Alert className="mt-4 bg-yellow-50 border-yellow-500">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <AlertDescription>
                  <strong>Note:</strong> You've added {meals.length} meals out of {duration * 6} recommended 
                  (6 meals per day for {duration} days). You can save with partial data.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
