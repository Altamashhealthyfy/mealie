import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, AlertTriangle, Sparkles, Loader2, Search } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

// ─── INGREDIENTS FROM EXCEL SHEET (MEALIEAPPDIETPLANNING4.xlsx - Sheet2) ───
const INGREDIENTS_DB = [
  { name: 'Atta Whole Wheat', kcal: 340, protein: 13, carbs: 72, fat: 2.5, unit: 'g', serving: '30g (1 roti)' },
  { name: 'Ghee', kcal: 900, protein: 0, carbs: 0, fat: 100, unit: 'ml', density: 0.91, serving: '5ml (1 tsp)' },
  { name: 'Oil', kcal: 900, protein: 0, carbs: 0, fat: 100, unit: 'ml', density: 0.92, serving: '5ml (1 tsp)' },
  { name: 'Potato / Aalu', kcal: 77, protein: 2, carbs: 17, fat: 0.1, unit: 'g', serving: '100g (1 medium)' },
  { name: 'Rice Raw', kcal: 360, protein: 7, carbs: 79, fat: 0.5, unit: 'g', serving: '50g dry' },
  { name: 'Moong Dal', kcal: 347, protein: 24, carbs: 59, fat: 1.2, unit: 'g', serving: '40g dry' },
  { name: 'Chana Dal', kcal: 360, protein: 20, carbs: 60, fat: 5, unit: 'g', serving: '40g dry' },
  { name: 'Arhar Dal', kcal: 343, protein: 22, carbs: 57, fat: 1.7, unit: 'g', serving: '40g dry' },
  { name: 'Masoor Dal', kcal: 353, protein: 26, carbs: 60, fat: 0.7, unit: 'g', serving: '40g dry' },
  { name: 'Rajma', kcal: 333, protein: 22, carbs: 60, fat: 1.5, unit: 'g', serving: '45g dry' },
  { name: 'Chole / Chickpea', kcal: 364, protein: 19, carbs: 61, fat: 6, unit: 'g', serving: '45g dry' },
  { name: 'Soyabean', kcal: 446, protein: 36, carbs: 30, fat: 20, unit: 'g', serving: '40g dry' },
  { name: 'Milk Low Fat', kcal: 42, protein: 3.4, carbs: 5, fat: 1, unit: 'ml', density: 1.03, serving: '200ml (1 glass)' },
  { name: 'Paneer Homemade', kcal: 265, protein: 18, carbs: 3, fat: 20, unit: 'g', serving: '50g' },
  { name: 'Curd / Yogurt Low Fat', kcal: 60, protein: 3.5, carbs: 4.5, fat: 1.5, unit: 'g', serving: '100g (1 katori)' },
  { name: 'Besan', kcal: 360, protein: 22, carbs: 58, fat: 5, unit: 'g', serving: '40g' },
  { name: 'Suji / Semolina', kcal: 360, protein: 12, carbs: 73, fat: 1, unit: 'g', serving: '50g' },
  { name: 'Oats', kcal: 389, protein: 17, carbs: 66, fat: 7, unit: 'g', serving: '50g dry' },
  { name: 'Ragi / Finger Millet', kcal: 336, protein: 7, carbs: 72, fat: 1.9, unit: 'g', serving: '30g' },
  { name: 'Bajra / Pearl Millet', kcal: 361, protein: 11, carbs: 67, fat: 5, unit: 'g', serving: '30g' },
  { name: 'Jowar / Sorghum', kcal: 349, protein: 10, carbs: 73, fat: 1.9, unit: 'g', serving: '30g' },
  { name: 'Barley', kcal: 354, protein: 12, carbs: 73, fat: 2.3, unit: 'g', serving: '40g' },
  { name: 'Daliya / Broken Wheat', kcal: 342, protein: 12, carbs: 74, fat: 1.5, unit: 'g', serving: '50g dry' },
  { name: 'Poha / Beaten Rice', kcal: 370, protein: 7, carbs: 80, fat: 1, unit: 'g', serving: '60g dry' },
  { name: 'Bread Whole Wheat', kcal: 247, protein: 9, carbs: 49, fat: 3, unit: 'g', serving: '30g (1 slice)' },
  { name: 'Onion', kcal: 40, protein: 1.1, carbs: 9.3, fat: 0.1, unit: 'g', serving: '50g (1 medium)' },
  { name: 'Tomato', kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2, unit: 'g', serving: '60g (1 medium)' },
  { name: 'Spinach / Palak', kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4, unit: 'g', serving: '100g (1 katori)' },
  { name: 'Lauki / Bottle Gourd', kcal: 15, protein: 0.6, carbs: 3.4, fat: 0.1, unit: 'g', serving: '150g' },
  { name: 'Bhindi / Okra', kcal: 33, protein: 2, carbs: 7.5, fat: 0.2, unit: 'g', serving: '100g' },
  { name: 'Brinjal / Eggplant', kcal: 25, protein: 1, carbs: 5.9, fat: 0.2, unit: 'g', serving: '100g' },
  { name: 'Cauliflower / Gobhi', kcal: 25, protein: 2, carbs: 5, fat: 0.3, unit: 'g', serving: '100g' },
  { name: 'Cabbage', kcal: 25, protein: 1.3, carbs: 5.8, fat: 0.1, unit: 'g', serving: '100g' },
  { name: 'Carrot', kcal: 41, protein: 0.9, carbs: 9.6, fat: 0.2, unit: 'g', serving: '80g (1 medium)' },
  { name: 'Peas / Matar', kcal: 81, protein: 5.4, carbs: 14, fat: 0.4, unit: 'g', serving: '50g' },
  { name: 'Capsicum / Bell Pepper', kcal: 31, protein: 1, carbs: 7, fat: 0.3, unit: 'g', serving: '80g' },
  { name: 'Mushroom', kcal: 22, protein: 3.1, carbs: 3.3, fat: 0.3, unit: 'g', serving: '100g' },
  { name: 'Cucumber / Kheera', kcal: 15, protein: 0.7, carbs: 3.6, fat: 0.1, unit: 'g', serving: '100g' },
  { name: 'Methi / Fenugreek Leaves', kcal: 49, protein: 4.4, carbs: 6, fat: 0.9, unit: 'g', serving: '50g' },
  { name: 'Radish / Mooli', kcal: 16, protein: 0.7, carbs: 3.4, fat: 0.1, unit: 'g', serving: '80g' },
  { name: 'Green Beans / French Beans', kcal: 31, protein: 1.8, carbs: 7, fat: 0.1, unit: 'g', serving: '100g' },
  { name: 'Broccoli', kcal: 34, protein: 2.8, carbs: 7, fat: 0.4, unit: 'g', serving: '100g' },
  { name: 'Spring Onion', kcal: 32, protein: 1.8, carbs: 7.3, fat: 0.2, unit: 'g', serving: '50g' },
  { name: 'Kaddu / Pumpkin', kcal: 26, protein: 1, carbs: 6.5, fat: 0.1, unit: 'g', serving: '150g' },
  { name: 'Tori / Ridge Gourd', kcal: 20, protein: 0.5, carbs: 4.4, fat: 0.2, unit: 'g', serving: '150g' },
  { name: 'Apple', kcal: 52, protein: 0.3, carbs: 14, fat: 0.2, unit: 'g', serving: '100g (1 medium)' },
  { name: 'Banana', kcal: 89, protein: 1.1, carbs: 23, fat: 0.3, unit: 'g', serving: '100g (1 medium)' },
  { name: 'Papaya', kcal: 43, protein: 0.5, carbs: 11, fat: 0.3, unit: 'g', serving: '150g (1 bowl)' },
  { name: 'Orange', kcal: 47, protein: 0.9, carbs: 12, fat: 0.1, unit: 'g', serving: '100g (1 medium)' },
  { name: 'Pomegranate', kcal: 83, protein: 1.7, carbs: 19, fat: 1.2, unit: 'g', serving: '100g' },
  { name: 'Guava', kcal: 68, protein: 2.6, carbs: 14, fat: 1, unit: 'g', serving: '100g (1 medium)' },
  { name: 'Pear', kcal: 57, protein: 0.4, carbs: 15, fat: 0.1, unit: 'g', serving: '100g (1 medium)' },
  { name: 'Chicken Breast', kcal: 165, protein: 31, carbs: 0, fat: 3.6, unit: 'g', serving: '100g' },
  { name: 'Fish', kcal: 130, protein: 22, carbs: 0, fat: 4.5, unit: 'g', serving: '100g' },
  { name: 'Egg White', kcal: 52, protein: 11, carbs: 0.7, fat: 0.2, unit: 'g', serving: '35g (1 egg white)' },
  { name: 'Egg Whole', kcal: 155, protein: 13, carbs: 1.1, fat: 11, unit: 'g', serving: '50g (1 whole egg)' },
  { name: 'Chia Seeds', kcal: 486, protein: 17, carbs: 42, fat: 31, unit: 'g', serving: '10g (2 tsp)' },
  { name: 'Flax Seeds', kcal: 534, protein: 18, carbs: 29, fat: 42, unit: 'g', serving: '10g (2 tsp)' },
  { name: 'Roasted Chana', kcal: 400, protein: 22, carbs: 58, fat: 7, unit: 'g', serving: '30g (1 handful)' },
  { name: 'Makhana / Fox Nuts', kcal: 347, protein: 9.7, carbs: 76, fat: 0.1, unit: 'g', serving: '25g (1 bowl)' },
  { name: 'Moong Sprouts', kcal: 30, protein: 3, carbs: 5.9, fat: 0.2, unit: 'g', serving: '80g (1 katori)' },
  { name: 'Nutreela / Soya Chunks', kcal: 345, protein: 52, carbs: 33, fat: 0.5, unit: 'g', serving: '40g dry' },
  { name: 'Lobhia / Black Eyed Peas', kcal: 336, protein: 24, carbs: 60, fat: 1.3, unit: 'g', serving: '45g dry' },
  { name: 'Black Chana / Kala Chana', kcal: 364, protein: 19, carbs: 63, fat: 6, unit: 'g', serving: '45g dry' },
  { name: 'Buttermilk / Chaas Low Fat', kcal: 40, protein: 3.3, carbs: 4.8, fat: 0.9, unit: 'ml', density: 1.03, serving: '200ml (1 glass)' },
  { name: 'Lemon Juice', kcal: 29, protein: 1.1, carbs: 9.3, fat: 0.3, unit: 'ml', density: 1.01, serving: '15ml (1 tbsp)' },
  { name: 'Ginger', kcal: 80, protein: 1.8, carbs: 18, fat: 0.8, unit: 'g', serving: '5g' },
  { name: 'Garlic', kcal: 149, protein: 6.4, carbs: 33, fat: 0.5, unit: 'g', serving: '5g (2 cloves)' },
  { name: 'Green Chilli', kcal: 40, protein: 2, carbs: 9.5, fat: 0.2, unit: 'g', serving: '10g' },
  { name: 'Coriander Leaves', kcal: 23, protein: 2.1, carbs: 3.7, fat: 0.5, unit: 'g', serving: '10g' },
  { name: 'Mint Leaves', kcal: 70, protein: 3.7, carbs: 15, fat: 0.9, unit: 'g', serving: '10g' },
  { name: 'Haldi / Turmeric', kcal: 354, protein: 8, carbs: 65, fat: 10, unit: 'g', serving: '2g (1 tsp)' },
  { name: 'Zeera / Cumin Seeds', kcal: 375, protein: 18, carbs: 44, fat: 22, unit: 'g', serving: '2g (1 tsp)' },
  { name: 'Saunf / Fennel Seeds', kcal: 345, protein: 15.8, carbs: 52, fat: 15, unit: 'g', serving: '5g (1 tsp)' },
  { name: 'Methi Seeds', kcal: 323, protein: 23, carbs: 58, fat: 6, unit: 'g', serving: '5g' },
  { name: 'Cinnamon', kcal: 247, protein: 4, carbs: 81, fat: 1.2, unit: 'g', serving: '2g (1 tsp)' },
  { name: 'Apple Cider Vinegar', kcal: 22, protein: 0, carbs: 0.9, fat: 0, unit: 'ml', density: 1.0, serving: '20ml' },
  { name: 'Green Salad Mix', kcal: 20, protein: 1.5, carbs: 3.5, fat: 0.2, unit: 'g', serving: '100g (1 plate)' },
  { name: 'Brown Rice', kcal: 350, protein: 7.5, carbs: 73, fat: 2.7, unit: 'g', serving: '50g dry' },
  { name: 'Sabudana', kcal: 350, protein: 0.2, carbs: 87, fat: 0.2, unit: 'g', serving: '50g dry' },
  { name: 'Muesli', kcal: 360, protein: 8, carbs: 73, fat: 6, unit: 'g', serving: '30g' },
  { name: 'Cornflakes', kcal: 357, protein: 8, carbs: 84, fat: 0.5, unit: 'g', serving: '30g' },
];

// ─── RECIPE TEMPLATES FROM EXCEL (pre-calculated nutrition) ───
const RECIPE_DB = [
  { name: 'Roti (plain)', cal: 102, protein: 3.9, carbs: 21.6, fats: 0.75, unit: '1 medium roti (30g atta)', type: 'recipe' },
  { name: 'Ghee Roti', cal: 125, protein: 3.9, carbs: 21.6, fats: 3, unit: '1 ghee roti', type: 'recipe' },
  { name: 'Plain Paratha', cal: 137, protein: 3.9, carbs: 21.6, fats: 3.6, unit: '1 medium paratha', type: 'recipe' },
  { name: 'Aloo Paratha', cal: 198, protein: 5.3, carbs: 36.6, fats: 2.8, unit: '1 stuffed paratha', type: 'recipe' },
  { name: 'Plain Rice (cooked)', cal: 180, protein: 3.5, carbs: 39.5, fats: 0.25, unit: '1 katori cooked (50g raw)', type: 'recipe' },
  { name: 'Moong Dal', cal: 163, protein: 10.3, carbs: 25.9, fats: 3, unit: '1 bowl cooked (40g dry)', type: 'recipe' },
  { name: 'Arhar Dal', cal: 156, protein: 9.6, carbs: 24.1, fats: 2.9, unit: '1 bowl cooked (40g dry)', type: 'recipe' },
  { name: 'Masoor Dal', cal: 155, protein: 11.1, carbs: 25.2, fats: 2.7, unit: '1 bowl cooked (40g dry)', type: 'recipe' },
  { name: 'Chana Dal', cal: 171, protein: 8.6, carbs: 25.2, fats: 3, unit: '1 bowl cooked (40g dry)', type: 'recipe' },
  { name: 'Rajma (cooked)', cal: 186, protein: 11, carbs: 29.9, fats: 3.7, unit: '1 bowl cooked (45g dry)', type: 'recipe' },
  { name: 'Chole (cooked)', cal: 214, protein: 9.9, carbs: 30.8, fats: 5.2, unit: '1 bowl cooked (45g dry)', type: 'recipe' },
  { name: 'Vegetable Poha', cal: 267, protein: 5.7, carbs: 52.9, fats: 3.6, unit: '1 bowl (60g poha + veggies)', type: 'recipe' },
  { name: 'Vegetable Upma', cal: 267, protein: 7.1, carbs: 40.8, fats: 6.5, unit: '1 bowl (50g suji + veggies)', type: 'recipe' },
  { name: 'Besan Cheela', cal: 183, protein: 10.4, carbs: 26.2, fats: 3.9, unit: '1 large cheela (40g besan)', type: 'recipe' },
  { name: 'Oats Porridge', cal: 257, protein: 13.6, carbs: 40.5, fats: 5, unit: '1 bowl (50g oats + milk)', type: 'recipe' },
  { name: 'Vegetable Daliya', cal: 226, protein: 7.7, carbs: 42.3, fats: 3, unit: '1 bowl (50g daliya + veggies)', type: 'recipe' },
  { name: 'Egg White Omelette (3 whites)', cal: 113, protein: 15.9, carbs: 5.8, fats: 3, unit: '1 large omelette', type: 'recipe' },
  { name: 'Grilled Chicken Breast', cal: 193, protein: 32.4, carbs: 0.8, fats: 5.5, unit: '100g piece', type: 'recipe' },
  { name: 'Grilled Fish', cal: 212, protein: 33.8, carbs: 0.4, fats: 7.5, unit: '150g piece', type: 'recipe' },
  { name: 'Green Salad', cal: 50, protein: 2.2, carbs: 10.4, fats: 0.4, unit: '1 full plate', type: 'recipe' },
  { name: 'Buttermilk / Chaas', cal: 82, protein: 6.7, carbs: 9.8, fats: 1.8, unit: '1 glass (200ml)', type: 'recipe' },
  { name: 'Paneer Bhurji', cal: 289, protein: 17.2, carbs: 8.3, fats: 18.8, unit: '1 bowl (80g paneer)', type: 'recipe' },
  { name: 'Spinach Sabzi', cal: 73, protein: 4.9, carbs: 7.4, fats: 4, unit: '1 bowl (150g palak)', type: 'recipe' },
  { name: 'Bhindi Sabzi', cal: 87, protein: 3.1, carbs: 11.5, fats: 5, unit: '1 bowl (120g bhindi)', type: 'recipe' },
  { name: 'Mix Veg Soup', cal: 58, protein: 2.7, carbs: 12.3, fats: 0.4, unit: '1 bowl (250ml)', type: 'recipe' },
  { name: 'Tomato Soup', cal: 33, protein: 1.4, carbs: 6.3, fats: 0.5, unit: '1 bowl (250ml)', type: 'recipe' },
  { name: 'Roasted Makhana', cal: 87, protein: 2.4, carbs: 19, fats: 0.025, unit: '1 bowl (25g)', type: 'recipe' },
  { name: 'Roasted Chana', cal: 120, protein: 6.6, carbs: 17.4, fats: 2.1, unit: '1 handful (30g)', type: 'recipe' },
  { name: 'Moong Sprouts Salad', cal: 52, protein: 3.5, carbs: 10.3, fats: 0.3, unit: '1 bowl (80g sprouts)', type: 'recipe' },
  { name: 'Lemon Ginger Water', cal: 11, protein: 0.3, carbs: 2.8, fats: 0.05, unit: '1 glass (300ml)', type: 'recipe' },
  { name: 'Methi Water', cal: 16, protein: 1.2, carbs: 2.9, fats: 0.3, unit: '1 glass (200ml)', type: 'recipe' },
  { name: 'Haldi Water', cal: 9, protein: 0.2, carbs: 1.7, fats: 0.25, unit: '1 glass (200ml)', type: 'recipe' },
  { name: 'ACV Water', cal: 5, protein: 0, carbs: 0.2, fats: 0, unit: '1 glass (220ml)', type: 'recipe' },
  { name: 'Chia Seeds Water', cal: 49, protein: 1.7, carbs: 4.2, fats: 3.1, unit: '1 glass (250ml)', type: 'recipe' },
  { name: 'Moong Dal Cheela', cal: 175, protein: 10.8, carbs: 26.8, fats: 3.2, unit: '1 cheela (40g moong)', type: 'recipe' },
  { name: 'Fruit Yogurt Bowl', cal: 121, protein: 5.7, carbs: 19.2, fats: 2.5, unit: '1 bowl (150g curd + fruit)', type: 'recipe' },
  { name: 'Soya Chunk Sabzi', cal: 222, protein: 23.5, carbs: 20.4, fats: 6.2, unit: '1 bowl (40g soya)', type: 'recipe' },
  { name: 'Lobhia (cooked)', cal: 188, protein: 12.9, carbs: 28.6, fats: 4.4, unit: '1 bowl cooked (45g dry)', type: 'recipe' },
  { name: 'Black Chana (cooked)', cal: 210, protein: 10.2, carbs: 31.5, fats: 5, unit: '1 bowl cooked (45g dry)', type: 'recipe' },
  { name: 'Sabudana Khichdi', cal: 245, protein: 1.5, carbs: 55, fats: 3, unit: '1 bowl (50g dry)', type: 'recipe' },
  { name: 'Brown Rice (cooked)', cal: 175, protein: 3.75, carbs: 36.5, fats: 1.35, unit: '1 katori cooked (50g raw)', type: 'recipe' },
];

// Combine all searchable items
const ALL_FOODS = [
  ...RECIPE_DB.map(r => ({ ...r, isRecipe: true })),
  ...INGREDIENTS_DB.map(i => ({
    name: i.name,
    cal: i.kcal,
    protein: i.protein,
    carbs: i.carbs,
    fats: i.fat,
    unit: i.serving || `per 100${i.unit}`,
    isIngredient: true,
    kcalPer100: i.kcal,
    servingUnit: i.unit,
    density: i.density,
  }))
];

export default function ManualMealPlanBuilder({ client, onSave, isSaving }) {
  const [duration, setDuration] = useState(7);
  const [meals, setMeals] = useState([]);
  const [currentDay, setCurrentDay] = useState(1);
  const [currentMealType, setCurrentMealType] = useState('breakfast');
  const [currentMeal, setCurrentMeal] = useState({ meal_name: '', items: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFood, setSelectedFood] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [gramAmount, setGramAmount] = useState(100);
  const [fetchingAI, setFetchingAI] = useState(false);

  const mealTypes = [
    { value: 'early_morning', label: 'Early Morning' },
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'mid_morning', label: 'Mid-Morning' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'evening_snack', label: 'Evening Snack' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'post_dinner', label: 'Post Dinner' }
  ];

  const filteredFoods = searchTerm.length >= 2
    ? ALL_FOODS.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 12)
    : [];

  const fetchAINutrition = async (foodName) => {
    setFetchingAI(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a clinical dietitian. Provide accurate nutritional data for: "${foodName}" using ICMR Indian food standards. Return one standard Indian serving.`,
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
        isAI: true,
        isRecipe: true,
      };
    } catch (error) {
      toast.error("Could not fetch nutrition data. Try again.");
      return null;
    } finally {
      setFetchingAI(false);
    }
  };

  const handleSearchWithAI = async () => {
    if (!searchTerm || searchTerm.length < 2) return;
    const aiFood = await fetchAINutrition(searchTerm);
    if (aiFood) {
      setSelectedFood(aiFood);
    }
  };

  // Calculate nutrition based on selection type
  const getNutritionForSelected = () => {
    if (!selectedFood) return null;
    if (selectedFood.isRecipe || selectedFood.isAI) {
      // Pre-calculated per serving, multiply by quantity
      return {
        calories: Math.round(selectedFood.cal * quantity),
        protein: Math.round(selectedFood.protein * quantity * 10) / 10,
        carbs: Math.round(selectedFood.carbs * quantity * 10) / 10,
        fats: Math.round(selectedFood.fats * quantity * 10) / 10,
        portionLabel: `${quantity} × ${selectedFood.unit}`
      };
    }
    if (selectedFood.isIngredient) {
      // Per 100g basis, use gramAmount
      const factor = gramAmount / 100;
      return {
        calories: Math.round(selectedFood.kcalPer100 * factor),
        protein: Math.round(selectedFood.protein * factor * 10) / 10,
        carbs: Math.round(selectedFood.carbs * factor * 10) / 10,
        fats: Math.round(selectedFood.fats * factor * 10) / 10,
        portionLabel: `${gramAmount}${selectedFood.servingUnit || 'g'}`
      };
    }
    return null;
  };

  const addFoodItem = () => {
    if (!selectedFood) return;
    const nutrition = getNutritionForSelected();
    if (!nutrition) return;

    setCurrentMeal(prev => ({
      ...prev,
      items: [...prev.items, {
        name: selectedFood.name,
        portionLabel: nutrition.portionLabel,
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fats: nutrition.fats,
      }]
    }));
    setSearchTerm('');
    setSelectedFood(null);
    setQuantity(1);
    setGramAmount(100);
  };

  const removeItem = (index) => {
    setCurrentMeal(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const getMealTotals = () => currentMeal.items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fats: acc.fats + item.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const saveMeal = () => {
    if (!currentMeal.meal_name || currentMeal.items.length === 0) {
      toast.error('Please add meal name and at least one food item');
      return;
    }
    const totals = getMealTotals();
    setMeals(prev => [...prev, {
      day: currentDay,
      meal_type: currentMealType,
      meal_name: currentMeal.meal_name,
      items: currentMeal.items.map(i => i.name),
      portion_sizes: currentMeal.items.map(i => i.portionLabel),
      calories: totals.calories,
      protein: Math.round(totals.protein * 10) / 10,
      carbs: Math.round(totals.carbs * 10) / 10,
      fats: Math.round(totals.fats * 10) / 10,
    }]);
    setCurrentMeal({ meal_name: '', items: [] });
    toast.success('✅ Meal added!');
  };

  const handleSavePlan = () => {
    if (meals.length === 0) { toast.error('Please add at least one meal'); return; }
    onSave({
      client_id: client.id,
      plan_name: `Manual Plan - ${client.full_name}`,
      duration,
      meal_pattern: 'daily',
      target_calories: client.target_calories,
      food_preference: client.food_preference,
      regional_preference: client.regional_preference,
      meals,
    });
  };

  const getDailyTotals = (day) => meals.filter(m => m.day === day).reduce(
    (acc, meal) => ({ calories: acc.calories + meal.calories, protein: acc.protein + meal.protein, carbs: acc.carbs + meal.carbs, fats: acc.fats + meal.fats }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const totals = getMealTotals();
  const nutrition = getNutritionForSelected();
  const currentDayMeals = meals.filter(m => m.day === currentDay);

  return (
    <div className="space-y-6">
      {/* Config */}
      <Card className="border-none shadow-lg">
        <CardHeader className="bg-slate-700 text-white">
          <CardTitle>Manual Meal Plan Builder</CardTitle>
          <p className="text-sm text-white/80">Nutritional values sourced from ICMR Indian Food Composition database</p>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duration (days)</Label>
              <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[7, 10, 14, 30].map(d => <SelectItem key={d} value={d.toString()}>{d} Days</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Day</Label>
              <Select value={currentDay.toString()} onValueChange={(v) => setCurrentDay(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: duration }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>Day {i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {currentDayMeals.length > 0 && (() => { const dt = getDailyTotals(currentDay); return (
            <Alert className="bg-slate-50 border-slate-300">
              <AlertDescription className="text-sm">
                <strong>Day {currentDay} Total:</strong> {dt.calories} kcal | P: {Math.round(dt.protein)}g | C: {Math.round(dt.carbs)}g | F: {Math.round(dt.fats)}g
              </AlertDescription>
            </Alert>
          )})()}
        </CardContent>
      </Card>

      {/* Meal Builder */}
      <Card className="border-none shadow-lg">
        <CardHeader className="bg-slate-600 text-white">
          <CardTitle>Add Meal for Day {currentDay}</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Meal Type</Label>
              <Select value={currentMealType} onValueChange={setCurrentMealType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mealTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Meal Name</Label>
              <Input placeholder="e.g., Vegetable Daliya Bowl" value={currentMeal.meal_name}
                onChange={(e) => setCurrentMeal(p => ({ ...p, meal_name: e.target.value }))} />
            </div>
          </div>

          {/* Food Search */}
          <div className="p-4 bg-slate-50 rounded-lg space-y-3 border border-slate-200">
            <div className="flex items-center justify-between">
              <Label className="text-slate-700 font-semibold">Search Food / Recipe</Label>
              <div className="flex gap-1">
                <Badge className="bg-teal-100 text-teal-700 text-xs">📊 Excel DB</Badge>
                <Badge className="bg-purple-100 text-purple-700 text-xs">
                  <Sparkles className="w-2.5 h-2.5 mr-1" />AI Fallback
                </Badge>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search dish or ingredient (e.g., daliya, moong dal, chicken...)"
                value={searchTerm}
                className="pl-9"
                onChange={(e) => { setSearchTerm(e.target.value); setSelectedFood(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && filteredFoods.length === 0) handleSearchWithAI(); }}
              />
            </div>

            {/* Dropdown */}
            {filteredFoods.length > 0 && !selectedFood && (
              <div className="bg-white border rounded-lg shadow-lg max-h-72 overflow-y-auto">
                {filteredFoods.map((food, i) => (
                  <div key={i} className="p-3 hover:bg-teal-50 cursor-pointer border-b last:border-b-0"
                    onClick={() => { setSelectedFood(food); setSearchTerm(food.name); }}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-sm truncate">{food.name}</p>
                          <Badge className={`text-xs flex-shrink-0 ${food.isRecipe ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'}`}>
                            {food.isRecipe ? '🍽 Recipe' : '🥕 Ingredient'}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500">{food.unit}</p>
                      </div>
                      <div className="text-right ml-3 flex-shrink-0">
                        <p className="text-sm font-bold text-orange-600">{food.cal} kcal</p>
                        <p className="text-xs text-gray-500">P:{food.protein}g C:{food.carbs}g F:{food.fats}g</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* AI fallback */}
            {searchTerm.length >= 2 && filteredFoods.length === 0 && !selectedFood && (
              <Button onClick={handleSearchWithAI} disabled={fetchingAI} className="w-full bg-purple-600 hover:bg-purple-700">
                {fetchingAI ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Fetching from AI...</> :
                  <><Sparkles className="w-4 h-4 mr-2" />Not found — Search with AI</>}
              </Button>
            )}

            {/* Selected food */}
            {selectedFood && (
              <div className="p-3 bg-green-50 border-2 border-green-300 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-green-900 flex items-center gap-2">
                      {selectedFood.name}
                      {selectedFood.isAI && <Badge className="bg-purple-500 text-white text-xs"><Sparkles className="w-2.5 h-2.5 mr-1" />AI</Badge>}
                      {selectedFood.isRecipe && !selectedFood.isAI && <Badge className="bg-teal-500 text-white text-xs">📊 DB</Badge>}
                    </p>
                    <p className="text-xs text-gray-600">{selectedFood.unit}</p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <p className="font-bold text-orange-600 text-sm">{selectedFood.cal} kcal/serving</p>
                  </div>
                </div>

                {/* Quantity controls */}
                {(selectedFood.isRecipe || selectedFood.isAI) ? (
                  <div className="flex items-center gap-3">
                    <Label className="text-sm w-28 flex-shrink-0">Servings:</Label>
                    <Input type="number" step="0.5" min="0.5" value={quantity}
                      onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                      className="w-24 h-9" />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Label className="text-sm w-28 flex-shrink-0">Amount ({selectedFood.servingUnit || 'g'}):</Label>
                    <Input type="number" step="5" min="5" value={gramAmount}
                      onChange={(e) => setGramAmount(parseFloat(e.target.value) || 100)}
                      className="w-24 h-9" />
                  </div>
                )}

                {/* Live nutrition preview */}
                {nutrition && (
                  <div className="grid grid-cols-4 gap-2 p-2 bg-white rounded-lg border border-green-200 text-center">
                    <div><p className="text-xs text-gray-500">Calories</p><p className="font-bold text-orange-600 text-sm">{nutrition.calories}</p></div>
                    <div><p className="text-xs text-gray-500">Protein</p><p className="font-bold text-red-600 text-sm">{nutrition.protein}g</p></div>
                    <div><p className="text-xs text-gray-500">Carbs</p><p className="font-bold text-yellow-600 text-sm">{nutrition.carbs}g</p></div>
                    <div><p className="text-xs text-gray-500">Fats</p><p className="font-bold text-purple-600 text-sm">{nutrition.fats}g</p></div>
                  </div>
                )}
              </div>
            )}

            <Button onClick={addFoodItem} disabled={!selectedFood || !nutrition} className="w-full bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4 mr-2" />Add to Meal
            </Button>
          </div>

          {/* Items list */}
          {currentMeal.items.length > 0 && (
            <div className="space-y-3">
              <Label>Added Items</Label>
              {currentMeal.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.portionLabel} · {item.calories} kcal</p>
                  </div>
                  <div className="text-right mr-3 text-xs text-gray-500">P:{item.protein}g C:{item.carbs}g F:{item.fats}g</div>
                  <Button variant="ghost" size="sm" onClick={() => removeItem(i)} className="text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="font-semibold mb-2 text-sm text-slate-700">Meal Totals:</h4>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div><p className="text-xs text-gray-500">Calories</p><p className="text-xl font-bold text-orange-600">{totals.calories}</p></div>
                  <div><p className="text-xs text-gray-500">Protein</p><p className="text-xl font-bold text-red-600">{Math.round(totals.protein)}g</p></div>
                  <div><p className="text-xs text-gray-500">Carbs</p><p className="text-xl font-bold text-yellow-600">{Math.round(totals.carbs)}g</p></div>
                  <div><p className="text-xs text-gray-500">Fats</p><p className="text-xl font-bold text-purple-600">{Math.round(totals.fats)}g</p></div>
                </div>
              </div>

              <Button onClick={saveMeal} className="w-full bg-slate-700 hover:bg-slate-800 h-12">
                <Save className="w-4 h-4 mr-2" />Save This Meal & Add Another
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {meals.length > 0 && (
        <Card className="border-none shadow-lg">
          <CardHeader className="bg-teal-700 text-white">
            <div className="flex items-center justify-between">
              <CardTitle>Plan Summary ({meals.length} meals)</CardTitle>
              <Button onClick={handleSavePlan} disabled={isSaving} className="bg-white text-teal-700 hover:bg-teal-50">
                {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save & Assign</>}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: duration }, (_, i) => i + 1).map(day => {
              const dayMeals = meals.filter(m => m.day === day);
              if (!dayMeals.length) return null;
              const dt = getDailyTotals(day);
              return (
                <div key={day} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold">Day {day}</h3>
                    <Badge className="bg-orange-100 text-orange-700">{dt.calories} kcal | P:{Math.round(dt.protein)}g C:{Math.round(dt.carbs)}g F:{Math.round(dt.fats)}g</Badge>
                  </div>
                  <div className="space-y-1">
                    {dayMeals.map((meal, idx) => (
                      <div key={idx} className="text-sm p-2 bg-gray-50 rounded flex justify-between">
                        <span><span className="font-medium capitalize">{meal.meal_type.replace('_', ' ')}:</span> {meal.meal_name}</span>
                        <span className="text-gray-500 ml-2">{meal.calories} kcal</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {meals.length < duration * 5 && (
              <Alert className="bg-yellow-50 border-yellow-400">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-sm">
                  {meals.length} of recommended {duration * 5} meals added. You can save with partial data.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}