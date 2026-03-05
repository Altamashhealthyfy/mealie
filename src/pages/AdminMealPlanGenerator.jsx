import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Loader2, Download, ChefHat, AlertTriangle, CheckCircle, FileText, TrendingDown, TrendingUp, Stethoscope } from "lucide-react";
import { toast } from "sonner";

// ─── NUTRITION DB FROM EXCEL (MEALIEAPPDIETPLANNING4.xlsx) ───
const RECIPE_DB = [
  { name: 'Roti (plain)', cal: 102, protein: 3.9, carbs: 21.6, fats: 0.75, ingredients: ['30g Atta Whole Wheat', '20ml Water'], instructions: ['Knead dough', 'Roll thin', 'Cook on hot tawa both sides'], prep: 5, cook: 5 },
  { name: 'Ghee Roti', cal: 125, protein: 3.9, carbs: 21.6, fats: 3, ingredients: ['30g Atta Whole Wheat', '2.5ml Ghee', '20ml Water'], instructions: ['Knead dough', 'Roll thin', 'Cook on tawa', 'Apply ghee'], prep: 5, cook: 5 },
  { name: 'Plain Paratha', cal: 137, protein: 3.9, carbs: 21.6, fats: 3.6, ingredients: ['30g Atta Whole Wheat', '2.5ml Oil', '25ml Water'], instructions: ['Knead dough', 'Roll flat', 'Shallow fry on tawa with oil'], prep: 5, cook: 8 },
  { name: 'Aloo Paratha', cal: 198, protein: 5.3, carbs: 36.6, fats: 2.8, ingredients: ['30g Atta Whole Wheat', '70g Potato', '2.5ml Oil'], instructions: ['Mash potato with spices', 'Stuff in dough', 'Roll and cook on tawa'], prep: 10, cook: 10 },
  { name: 'Plain Rice (cooked)', cal: 180, protein: 3.5, carbs: 39.5, fats: 0.25, ingredients: ['50g Rice Raw', '120ml Water'], instructions: ['Wash rice', 'Add 2.5x water', 'Boil and simmer until cooked'], prep: 2, cook: 15 },
  { name: 'Brown Rice (cooked)', cal: 175, protein: 3.75, carbs: 36.5, fats: 1.35, ingredients: ['50g Brown Rice', '130ml Water'], instructions: ['Soak rice 20min', 'Boil with water', 'Simmer 25 min covered'], prep: 20, cook: 25 },
  { name: 'Moong Dal', cal: 163, protein: 10.3, carbs: 25.9, fats: 3, ingredients: ['40g Moong Dal', '20g Onion', '20g Tomato', '3ml Oil', '5g Ginger'], instructions: ['Pressure cook dal', 'Prepare tempering with onion tomato ginger', 'Add cooked dal and simmer'], prep: 5, cook: 20 },
  { name: 'Arhar Dal', cal: 156, protein: 9.6, carbs: 24.1, fats: 2.9, ingredients: ['40g Arhar Dal', '25g Tomato', '20g Onion', '3ml Oil', '5g Ginger'], instructions: ['Pressure cook dal 3 whistles', 'Prepare tempering', 'Combine and simmer 5 min'], prep: 5, cook: 20 },
  { name: 'Masoor Dal', cal: 155, protein: 11.1, carbs: 25.2, fats: 2.7, ingredients: ['40g Masoor Dal', '25g Tomato', '20g Onion', '3ml Oil'], instructions: ['Pressure cook masoor dal', 'Prepare onion tomato base', 'Add dal and cook 5 min'], prep: 5, cook: 18 },
  { name: 'Chana Dal', cal: 171, protein: 8.6, carbs: 25.2, fats: 3, ingredients: ['40g Chana Dal', '20g Onion', '20g Tomato', '3ml Oil'], instructions: ['Soak chana dal 30 min', 'Pressure cook 4 whistles', 'Temper with onion tomato'], prep: 30, cook: 25 },
  { name: 'Rajma', cal: 186, protein: 11, carbs: 29.9, fats: 3.7, ingredients: ['45g Rajma', '30g Onion', '30g Tomato', '5ml Oil', '5g Ginger'], instructions: ['Soak rajma overnight', 'Pressure cook 6–8 whistles', 'Prepare masala and combine'], prep: 480, cook: 30 },
  { name: 'Chole', cal: 214, protein: 9.9, carbs: 30.8, fats: 5.2, ingredients: ['45g Chickpea', '30g Onion', '30g Tomato', '5ml Oil'], instructions: ['Soak chickpeas overnight', 'Pressure cook', 'Prepare thick masala and simmer'], prep: 480, cook: 25 },
  { name: 'Vegetable Poha', cal: 267, protein: 5.7, carbs: 52.9, fats: 3.6, ingredients: ['60g Poha', '20g Onion', '15g Tomato', '3ml Oil', '20g Peas', '5g Coriander Leaves'], instructions: ['Wash poha and drain', 'Temper mustard seeds in oil', 'Add onion peas tomato', 'Add poha and mix well'], prep: 5, cook: 10 },
  { name: 'Vegetable Upma', cal: 267, protein: 7.1, carbs: 40.8, fats: 6.5, ingredients: ['50g Suji', '20g Onion', '15g Tomato', '5ml Oil', '15g Carrot', '15g Peas'], instructions: ['Dry roast suji till golden', 'Temper with vegetables', 'Add water and suji', 'Stir till thick'], prep: 5, cook: 15 },
  { name: 'Besan Cheela', cal: 183, protein: 10.4, carbs: 26.2, fats: 3.9, ingredients: ['40g Besan', '15g Onion', '15g Tomato', '5g Green Chilli', '5g Coriander', '3ml Oil'], instructions: ['Make thin batter with besan and water', 'Add veggies', 'Cook on non-stick tawa both sides'], prep: 5, cook: 10 },
  { name: 'Oats Porridge', cal: 257, protein: 13.6, carbs: 40.5, fats: 5, ingredients: ['50g Oats', '150ml Milk Low Fat'], instructions: ['Boil milk', 'Add oats and stir', 'Cook 3–4 min on low flame'], prep: 2, cook: 7 },
  { name: 'Vegetable Daliya', cal: 226, protein: 7.7, carbs: 42.3, fats: 3, ingredients: ['50g Daliya', '20g Onion', '20g Tomato', '20g Carrot', '20g Peas', '3ml Oil'], instructions: ['Dry roast daliya', 'Saute vegetables', 'Add daliya and water', 'Pressure cook 2 whistles'], prep: 5, cook: 20 },
  { name: 'Egg White Omelette', cal: 113, protein: 15.9, carbs: 5.8, fats: 3, ingredients: ['120g Egg White (3 eggs)', '20g Onion', '20g Tomato', '20g Capsicum', '3ml Oil'], instructions: ['Beat egg whites', 'Heat oil add veggies', 'Pour egg mix', 'Fold and cook'], prep: 5, cook: 7 },
  { name: 'Grilled Chicken Breast', cal: 193, protein: 32.4, carbs: 0.8, fats: 5.5, ingredients: ['100g Chicken Breast', '10ml Lemon Juice', '5g Ginger', '3ml Oil'], instructions: ['Marinate chicken with lemon ginger spices', 'Grill on hot pan 5–6 min each side', 'Rest 2 min before serving'], prep: 10, cook: 12 },
  { name: 'Grilled Fish', cal: 212, protein: 33.8, carbs: 0.4, fats: 7.5, ingredients: ['150g Fish', '10ml Lemon Juice', '3ml Oil', '5g Ginger'], instructions: ['Marinate fish with spices and lemon', 'Grill on high heat 4 min each side'], prep: 10, cook: 10 },
  { name: 'Green Salad', cal: 50, protein: 2.2, carbs: 10.4, fats: 0.4, ingredients: ['50g Cucumber', '40g Tomato', '30g Carrot', '30g Cabbage', '5g Coriander', '5ml Lemon Juice'], instructions: ['Chop all vegetables fine', 'Mix with lemon juice', 'Add salt and serve fresh'], prep: 5, cook: 0 },
  { name: 'Buttermilk / Chaas', cal: 82, protein: 6.7, carbs: 9.8, fats: 1.8, ingredients: ['200ml Buttermilk Low Fat', '1g Cumin Seeds'], instructions: ['Blend curd with water', 'Add roasted cumin powder and salt', 'Serve chilled'], prep: 2, cook: 0 },
  { name: 'Paneer Bhurji', cal: 289, protein: 17.2, carbs: 8.3, fats: 18.8, ingredients: ['80g Paneer Homemade', '25g Onion', '25g Tomato', '20g Capsicum', '3ml Oil'], instructions: ['Heat oil add onion', 'Add tomato capsicum and spices', 'Crumble paneer and mix well'], prep: 5, cook: 10 },
  { name: 'Spinach Sabzi', cal: 73, protein: 4.9, carbs: 7.4, fats: 4, ingredients: ['150g Spinach', '25g Onion', '20g Tomato', '3ml Oil', '5g Ginger'], instructions: ['Blanch spinach', 'Prepare onion tomato base', 'Add spinach and cook 5 min'], prep: 5, cook: 12 },
  { name: 'Bhindi Sabzi', cal: 87, protein: 3.1, carbs: 11.5, fats: 5, ingredients: ['120g Bhindi', '25g Onion', '20g Tomato', '4ml Oil'], instructions: ['Wash and dry bhindi thoroughly', 'Cut and cook in oil with onion', 'Add tomato and spices', 'Cook uncovered till done'], prep: 5, cook: 15 },
  { name: 'Mix Veg Soup', cal: 58, protein: 2.7, carbs: 12.3, fats: 0.4, ingredients: ['40g Carrot', '30g Cabbage', '20g Peas', '30g Tomato', '20g Onion'], instructions: ['Boil all vegetables', 'Blend partially', 'Season with pepper and salt'], prep: 5, cook: 15 },
  { name: 'Tomato Soup', cal: 33, protein: 1.4, carbs: 6.3, fats: 0.5, ingredients: ['150g Tomato', '20g Onion', '2ml Oil'], instructions: ['Roast tomatoes and onion', 'Blend smooth', 'Simmer with spices 5 min'], prep: 5, cook: 15 },
  { name: 'Roasted Makhana', cal: 87, protein: 2.4, carbs: 19, fats: 0.025, ingredients: ['25g Makhana'], instructions: ['Dry roast makhana in pan 5 min on low flame till crisp'], prep: 0, cook: 5 },
  { name: 'Roasted Chana', cal: 120, protein: 6.6, carbs: 17.4, fats: 2.1, ingredients: ['30g Roasted Chana'], instructions: ['Ready to eat. Dry roasted chana — serve as is'], prep: 0, cook: 0 },
  { name: 'Moong Sprouts Salad', cal: 52, protein: 3.5, carbs: 10.3, fats: 0.3, ingredients: ['80g Moong Sprouts', '30g Cucumber', '20g Tomato', '5ml Lemon Juice'], instructions: ['Steam sprouts lightly 2 min', 'Toss with cucumber tomato', 'Add lemon and salt'], prep: 5, cook: 2 },
  { name: 'Lemon Ginger Water', cal: 11, protein: 0.3, carbs: 2.8, fats: 0.05, ingredients: ['250ml Water', '15ml Lemon Juice', '5g Ginger', '3g Mint Leaves'], instructions: ['Boil water', 'Add ginger slices and mint', 'Cool slightly add lemon', 'Serve warm'], prep: 2, cook: 5 },
  { name: 'Methi Water', cal: 16, protein: 1.2, carbs: 2.9, fats: 0.3, ingredients: ['5g Methi Seeds', '200ml Water'], instructions: ['Soak methi seeds overnight in water', 'Strain and drink first thing in morning'], prep: 480, cook: 0 },
  { name: 'Haldi Water', cal: 9, protein: 0.2, carbs: 1.7, fats: 0.25, ingredients: ['200ml Water', '2g Haldi', '3g Ginger'], instructions: ['Boil water', 'Add turmeric and ginger', 'Simmer 2 min', 'Strain and drink warm'], prep: 2, cook: 5 },
  { name: 'Moong Dal Cheela', cal: 175, protein: 10.8, carbs: 26.8, fats: 3.2, ingredients: ['40g Moong Dal', '15g Onion', '5g Green Chilli', '5g Coriander', '3ml Oil'], instructions: ['Soak moong dal 2 hours', 'Blend to smooth batter', 'Spread thin on hot tawa', 'Cook both sides'], prep: 120, cook: 10 },
  { name: 'Fruit Yogurt Bowl', cal: 121, protein: 5.7, carbs: 19.2, fats: 2.5, ingredients: ['150g Curd Low Fat', '60g Apple', '5g Chia Seeds'], instructions: ['Take chilled curd in bowl', 'Chop apple fine', 'Mix with chia seeds and serve'], prep: 5, cook: 0 },
  { name: 'Soya Chunk Sabzi', cal: 222, protein: 23.5, carbs: 20.4, fats: 6.2, ingredients: ['40g Soya Chunks', '25g Onion', '30g Tomato', '25g Capsicum', '4ml Oil'], instructions: ['Boil soya chunks 10 min drain', 'Prepare masala base', 'Add soya and cook 10 min'], prep: 10, cook: 20 },
  { name: 'Lobhia (Cooked)', cal: 188, protein: 12.9, carbs: 28.6, fats: 4.4, ingredients: ['45g Lobhia', '25g Onion', '25g Tomato', '4ml Oil', '5g Ginger'], instructions: ['Soak lobhia 4 hours', 'Pressure cook 4 whistles', 'Prepare masala and combine'], prep: 240, cook: 25 },
  { name: 'Black Chana (Cooked)', cal: 210, protein: 10.2, carbs: 31.5, fats: 5, ingredients: ['45g Black Chana', '25g Onion', '25g Tomato', '4ml Oil'], instructions: ['Soak kala chana overnight', 'Pressure cook 6 whistles', 'Prepare spicy masala and cook together'], prep: 480, cook: 25 },
  { name: 'Peanut Butter Sandwich', cal: 310, protein: 12, carbs: 35, fats: 14, ingredients: ['2 slices Whole Wheat Bread (60g)', '2 tbsp Peanut Butter (30g)', '1 tsp Chia Seeds (5g)'], instructions: ['Toast bread slices', 'Spread peanut butter generously', 'Sprinkle chia seeds on top'], prep: 2, cook: 2 },
  { name: 'Banana Oat Smoothie', cal: 280, protein: 10, carbs: 48, fats: 5, ingredients: ['1 Banana (100g)', '30g Oats', '200ml Milk Low Fat', '5g Chia Seeds'], instructions: ['Blend all ingredients smooth', 'Serve chilled'], prep: 3, cook: 0 },
  { name: 'Paneer Tikka', cal: 230, protein: 16, carbs: 6, fats: 16, ingredients: ['100g Paneer Homemade', '20g Capsicum', '20g Onion', '5ml Curd', '2ml Oil'], instructions: ['Marinate paneer and veggies in curd spices', 'Grill or bake at high heat 10 min', 'Serve with green chutney'], prep: 30, cook: 10 },
  { name: 'Chia Seeds Water', cal: 49, protein: 1.7, carbs: 4.2, fats: 3.1, ingredients: ['10g Chia Seeds', '250ml Water'], instructions: ['Soak chia seeds in water overnight', 'Stir well and consume in morning'], prep: 480, cook: 0 },
  { name: 'Saunf Water', cal: 8, protein: 0.1, carbs: 1.8, fats: 0.1, ingredients: ['5g Saunf', '200ml Water'], instructions: ['Boil saunf in water 5 min', 'Strain and serve warm'], prep: 2, cook: 5 },
];

// Look up a recipe from DB by approximate name match
function findInDB(recipeName) {
  const lower = recipeName.toLowerCase();
  return RECIPE_DB.find(r => lower.includes(r.name.toLowerCase()) || r.name.toLowerCase().includes(lower.split(' ')[0]));
}

const DISEASES = [
  "Diabetes Type 2", "Diabetes Type 1", "Prediabetes",
  "Hypothyroid", "Hyperthyroid",
  "Hypertension", "Heart Disease", "High Cholesterol",
  "Kidney Disease (CKD)", "Liver Disease / Fatty Liver",
  "PCOS / PCOD", "Anemia", "Osteoporosis", "IBS / Gut Issues",
  "Gout / Uric Acid", "GERD / Acidity",
];

const DIET_LABELS = { veg: "Vegetarian", non_veg: "Non-Vegetarian", egg: "Eggetarian", jain: "Jain" };

// Shared download utils
function downloadCSV(headers, rows, filename) {
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
function downloadTXT(content, filename) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
function buildTXT(mealPlan, kcal, numMeals, label, dietType) {
  const days = [...new Set(mealPlan.map(m => m.day))].sort((a, b) => a - b);
  let txt = `10-DAY ${label.toUpperCase()} MEAL PLAN\nDiet: ${dietType.toUpperCase()} | Target: ${kcal} kcal/day | Meals: ${numMeals}/day\n${"=".repeat(60)}\n\n`;
  days.forEach(day => {
    const dm = mealPlan.filter(m => m.day === day);
    txt += `DAY ${day} — Total: ${dm.reduce((s, m) => s + (m.calories || 0), 0)} kcal\n${"-".repeat(40)}\n`;
    dm.forEach(meal => {
      txt += `\n  ${meal.meal_type?.replace(/_/g, " ").toUpperCase()} — ${meal.meal_name} (${meal.calories} kcal)\n`;
      (meal.items || []).forEach((item, i) => txt += `    • ${item} — ${meal.portion_sizes?.[i] || ""}\n`);
      txt += `    Nutrition: P:${meal.protein}g C:${meal.carbs}g F:${meal.fats}g\n`;
      if (meal.disease_rationale) txt += `    Note: ${meal.disease_rationale}\n`;
    });
    txt += "\n";
  });
  return txt;
}

// ─── RESULTS PANEL (shared) ───
function ResultsPanel({ result, kcalTarget, numMeals, dietType, label, color }) {
  const [activeTab, setActiveTab] = useState("plan");

  const dlMealCSV = () => {
    downloadCSV(
      ["Day", "Meal Type", "Meal Name", "Items", "Portion Sizes", "Calories", "Protein (g)", "Carbs (g)", "Fats (g)", "Notes"],
      result.meal_plan.map(m => [m.day, m.meal_type?.replace(/_/g, " "), `"${m.meal_name}"`, `"${(m.items || []).join("; ")}"`, `"${(m.portion_sizes || []).join("; ")}"`, m.calories, m.protein, m.carbs, m.fats, `"${m.disease_rationale || ""}"`]),
      `meal_plan_${label.replace(/\s/g, "_")}_${kcalTarget}kcal.csv`
    );
    toast.success("Meal plan CSV downloaded!");
  };
  const dlRecipeCSV = () => {
    downloadCSV(
      ["Recipe Name", "Ingredients", "Instructions", "Prep (min)", "Cook (min)", "Servings", "Calories/Serving", "Protein (g)", "Carbs (g)", "Fats (g)", "Benefits", "Source"],
      (result.unique_recipes || []).map(r => [`"${r.recipe_name}"`, `"${(r.ingredients || []).join("; ")}"`, `"${(r.instructions || []).join(" | ")}"`, r.prep_time_mins || 0, r.cook_time_mins || 0, r.servings || 1, r.calories_per_serving || 0, r.protein_g || 0, r.carbs_g || 0, r.fats_g || 0, `"${r.disease_benefits || r.benefits || ""}"`, r.source || "DB"]),
      `recipes_${label.replace(/\s/g, "_")}_${kcalTarget}kcal.csv`
    );
    toast.success("Recipes CSV downloaded!");
  };
  const dlMealTXT = () => {
    downloadTXT(buildTXT(result.meal_plan, kcalTarget, numMeals, label, dietType), `meal_plan_${label.replace(/\s/g, "_")}_${kcalTarget}kcal.txt`);
    toast.success("Meal plan TXT downloaded!");
  };

  const days = [...new Set(result.meal_plan.map(m => m.day))].sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      {/* Stats + Downloads */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-xl shadow border border-green-200">
        <div className="flex gap-6 flex-wrap">
          {[
            { label: "Days", val: days.length, color: "text-indigo-600" },
            { label: "Total Meals", val: result.meal_plan.length, color: "text-orange-600" },
            { label: "Unique Recipes", val: result.unique_recipes?.length || 0, color: "text-green-600" },
            { label: "kcal/day", val: kcalTarget, color: "text-purple-600" },
          ].map(({ label, val, color }) => (
            <div key={label} className="text-center">
              <p className={`text-2xl font-bold ${color}`}>{val}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={dlMealCSV} size="sm" className="bg-teal-600 hover:bg-teal-700"><Download className="w-3 h-3 mr-1" />Plan CSV</Button>
          <Button onClick={dlMealTXT} size="sm" variant="outline" className="border-teal-400 text-teal-700"><Download className="w-3 h-3 mr-1" />Plan TXT</Button>
          <Button onClick={dlRecipeCSV} size="sm" className="bg-purple-600 hover:bg-purple-700"><Download className="w-3 h-3 mr-1" />Recipes CSV</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white shadow">
          <TabsTrigger value="plan"><FileText className="w-4 h-4 mr-1" />10-Day Plan</TabsTrigger>
          <TabsTrigger value="recipes"><ChefHat className="w-4 h-4 mr-1" />Recipes ({result.unique_recipes?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="space-y-3 mt-4">
          {days.map(day => {
            const dm = result.meal_plan.filter(m => m.day === day);
            const total = dm.reduce((s, m) => s + (m.calories || 0), 0);
            const p = dm.reduce((s, m) => s + (m.protein || 0), 0);
            const c = dm.reduce((s, m) => s + (m.carbs || 0), 0);
            const f = dm.reduce((s, m) => s + (m.fats || 0), 0);
            return (
              <Card key={day} className="border-none shadow-md">
                <CardHeader className={`${color} text-white py-3 px-5 flex flex-row items-center justify-between`}>
                  <CardTitle className="text-base">Day {day}</CardTitle>
                  <div className="flex gap-3 text-sm text-white/90">
                    <span className="font-bold text-yellow-200">{Math.round(total)} kcal</span>
                    <span>P:{Math.round(p)}g</span>
                    <span>C:{Math.round(c)}g</span>
                    <span>F:{Math.round(f)}g</span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 divide-y">
                  {dm.map((meal, i) => (
                    <div key={i} className="py-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold uppercase tracking-wide text-indigo-600">{meal.meal_type?.replace(/_/g, " ")}</span>
                        <Badge variant="outline" className="text-xs">{meal.calories} kcal</Badge>
                      </div>
                      <p className="font-semibold text-gray-800 mb-1">{meal.meal_name}</p>
                      <ul className="space-y-0.5">
                        {(meal.items || []).map((item, j) => (
                          <li key={j} className="flex justify-between text-sm text-gray-600">
                            <span>• {item}</span>
                            <span className="text-gray-400 ml-2 text-xs">{meal.portion_sizes?.[j]}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex gap-3 mt-1.5 text-xs">
                        <span className="text-red-500">P:{meal.protein}g</span>
                        <span className="text-yellow-500">C:{meal.carbs}g</span>
                        <span className="text-purple-500">F:{meal.fats}g</span>
                      </div>
                      {meal.disease_rationale && <p className="text-xs text-green-700 mt-1 italic">💡 {meal.disease_rationale}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="recipes" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(result.unique_recipes || []).map((recipe, i) => (
              <Card key={i} className="border-none shadow-md">
                <CardHeader className="bg-purple-700 text-white py-3 px-4">
                  <div className="flex justify-between gap-2">
                    <CardTitle className="text-sm font-bold">{recipe.recipe_name}</CardTitle>
                    <div className="flex gap-1 flex-shrink-0">
                      <Badge className="bg-white/20 text-white text-xs">{recipe.calories_per_serving} kcal</Badge>
                      {recipe.source === "DB" && <Badge className="bg-teal-400/80 text-white text-xs">📊 DB</Badge>}
                      {recipe.source === "AI" && <Badge className="bg-yellow-400/80 text-white text-xs">🤖 AI</Badge>}
                    </div>
                  </div>
                  <div className="text-xs text-purple-200 mt-1">Prep: {recipe.prep_time_mins}min • Cook: {recipe.cook_time_mins}min • Serves: {recipe.servings}</div>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-red-50 rounded p-1.5"><p className="text-xs text-gray-500">Protein</p><p className="font-bold text-red-600 text-sm">{recipe.protein_g}g</p></div>
                    <div className="bg-yellow-50 rounded p-1.5"><p className="text-xs text-gray-500">Carbs</p><p className="font-bold text-yellow-600 text-sm">{recipe.carbs_g}g</p></div>
                    <div className="bg-purple-50 rounded p-1.5"><p className="text-xs text-gray-500">Fats</p><p className="font-bold text-purple-600 text-sm">{recipe.fats_g}g</p></div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700 uppercase mb-1">Ingredients</p>
                    <ul className="text-xs text-gray-600 space-y-0.5">{(recipe.ingredients || []).map((ing, j) => <li key={j}>• {ing}</li>)}</ul>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700 uppercase mb-1">Method</p>
                    <ol className="text-xs text-gray-600 space-y-0.5">{(recipe.instructions || []).map((step, j) => <li key={j}>{j + 1}. {step}</li>)}</ol>
                  </div>
                  {(recipe.disease_benefits || recipe.benefits) && (
                    <Alert className="bg-green-50 border-green-200 py-1.5 px-3">
                      <AlertDescription className="text-xs text-green-800">💚 {recipe.disease_benefits || recipe.benefits}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── BUILD KB PROMPT SECTION ───
function buildKBPromptSection(knowledgeBase) {
  if (!knowledgeBase || knowledgeBase.length === 0) return '';
  const byCategory = {};
  for (const doc of knowledgeBase) {
    if (!byCategory[doc.category]) byCategory[doc.category] = [];
    byCategory[doc.category].push(doc);
  }
  let section = '\n## HEALTHYFY KNOWLEDGE BASE (AUTHORITATIVE CLINICAL RULES — FOLLOW STRICTLY)\n';
  section += 'These rules are set by the Healthyfy clinical team and OVERRIDE general AI knowledge.\n\n';
  for (const [category, docs] of Object.entries(byCategory)) {
    section += `### ${category}\n`;
    for (const doc of docs) {
      section += `- **${doc.name}**`;
      if (doc.description) section += `: ${doc.description}`;
      if (doc.ai_instruction) section += `\n  → ${doc.ai_instruction}`;
      section += '\n';
    }
    section += '\n';
  }
  return section;
}

// ─── WEIGHT LOSS / GAIN GENERATOR ───
function SimpleGoalGenerator({ goal, knowledgeBase = [] }) {
  const isLoss = goal === "weight_loss";
  const [kcalTarget, setKcalTarget] = useState(isLoss ? 1400 : 2200);
  const [numMeals, setNumMeals] = useState(6);
  const [dietType, setDietType] = useState("veg");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);

  const color = isLoss ? "bg-orange-600" : "bg-green-700";
  const label = isLoss ? "Weight Loss" : "Weight Gain";
  const calorieNote = isLoss ? "Deficit: 400–500 kcal below TDEE. High protein, high fibre, low fat." : "Surplus: 300–400 kcal above TDEE. High protein, healthy calorie-dense foods.";

  const buildPromptWithDBContext = () => {
    const dbRecipeNames = RECIPE_DB.map(r => r.name).join(", ");
    const kbSection = buildKBPromptSection(knowledgeBase);
    const calorieMin = kcalTarget - 50;
    const calorieMax = kcalTarget + 50;
    const dietLabel = DIET_LABELS[dietType] || dietType;

    const mealSeq = numMeals === 5
      ? "Early Morning, Breakfast, Lunch, Evening Snack, Dinner"
      : numMeals === 6
      ? "Early Morning, Breakfast, Mid-Morning, Lunch, Evening Snack, Dinner"
      : "Early Morning, Breakfast, Mid-Morning, Lunch, Evening Snack, Dinner, Post Dinner";

    const breakfastCal = Math.round(kcalTarget * (isLoss ? 0.22 : 0.25));
    const lunchCal = Math.round(kcalTarget * (isLoss ? 0.33 : 0.32));
    const dinnerCal = Math.round(kcalTarget * (isLoss ? 0.25 : 0.28));
    const snackCal = Math.round(kcalTarget * (isLoss ? 0.10 : 0.08));
    const midMorningCal = Math.round(kcalTarget * 0.08);

    return `# 10-Day ${label} Meal Plan Generator (No Disease)

Generate a complete, clinically accurate Indian **10-day ${label} meal plan** (no medical condition, healthy individual).

## PARAMETERS:
- **Daily Calorie Target:** ${kcalTarget} kcal (range: ${calorieMin}–${calorieMax} kcal)
- **Goal:** ${label} — ${calorieNote}
- **Meals per Day:** ${numMeals} (sequence: ${mealSeq})
- **Diet Type:** ${dietLabel}
- **Pattern:** 3-3-4 rotation (Days 1–3 Plan A, Days 4–6 Plan B, Days 7–10 Plan C)

## MEAL CALORIE BREAKDOWN:
- Early Morning (detox): ~10 kcal
- Breakfast: ~${breakfastCal} kcal
${numMeals >= 6 ? `- Mid-Morning: ~${midMorningCal} kcal` : ""}
- Lunch: ~${lunchCal} kcal
- Evening Snack: ~${snackCal} kcal
- Dinner: ~${dinnerCal} kcal
${numMeals >= 7 ? "- Post Dinner (herbal): ~2 kcal" : ""}
- **TOTAL: ${kcalTarget} kcal**

## ${label.toUpperCase()} SPECIFIC RULES:
${isLoss ? `- High protein (1.2–1.5g/kg body weight), high fibre, low fat
- Avoid sugar, maida, fried foods, processed foods
- Include pre-meal water (30 min before lunch and dinner)
- Light dinners: soup + sabzi + roti only
- No dairy at night
- Include detox water every morning` :
`- High calorie, high protein (1.6–2.0g/kg), moderate healthy fats
- Include calorie-dense healthy foods: peanut butter, banana, paneer, eggs, nuts
- 3 full meals + 2–3 snacks
- Add ghee/oil in moderation to increase calories
- Include protein at every meal
- Pre-workout and post-workout nutrition included`}

## PREFERRED RECIPE DATABASE (USE THESE FIRST — exact names for matching):
${dbRecipeNames}

**IMPORTANT**: When generating meals, PREFER dishes from the above list. Use EXACT names from this list when applicable. Only use different dishes if the list doesn't have a suitable option for that meal slot.

## DIET TYPE RULES:
${dietType === "veg" ? "Vegetarian: No meat, no eggs, no fish. Paneer, curd, dal, soya for protein." : ""}
${dietType === "non_veg" ? "Non-Veg: Include grilled/baked chicken or fish 2–3 days/week. Eggs allowed daily." : ""}
${dietType === "egg" ? "Eggetarian: Eggs allowed (boiled, omelette). No meat or fish." : ""}
${dietType === "jain" ? "Jain: NO onion, garlic, potato, carrot, radish, beets, turnip, brinjal. Only above-ground vegetables." : ""}

## STRICT RULES:
1. Generate ALL 10 days — never stop early
2. Each day MUST have EXACTLY ${numMeals} meals
3. Every day MUST total ${calorieMin}–${calorieMax} kcal
4. Authentic Indian cuisine only
5. Indian units: katori, spoon, glass, piece
6. Post Dinner (if included) = SAME herbal drink all 10 days

## OUTPUT FORMAT:
Return JSON with:
1. "meal_plan": array of ALL ${numMeals * 10} meal objects: day(1-10), meal_type, meal_name, items(array), portion_sizes(array), calories, protein, carbs, fats, disease_rationale(put goal-specific tip here)
2. "unique_recipes": for EVERY unique dish, provide: recipe_name(MUST match meal_plan exactly), ingredients(array), instructions(array), prep_time_mins, cook_time_mins, servings, calories_per_serving, protein_g, carbs_g, fats_g, benefits(string for ${label}), source("DB" if from above list, "AI" if generated by you)

CRITICAL: unique_recipes must have ONE entry per unique dish. Mark source="DB" for dishes from the preferred list above.`;
  };

  const handleGenerate = async () => {
    if (kcalTarget < 1000 || kcalTarget > 3500) { toast.error("Enter valid kcal (1000–3500)"); return; }
    setGenerating(true);
    setResult(null);
    try {
      const prompt = buildPromptWithDBContext();
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            meal_plan: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day: { type: "number" }, meal_type: { type: "string" }, meal_name: { type: "string" },
                  items: { type: "array", items: { type: "string" } }, portion_sizes: { type: "array", items: { type: "string" } },
                  calories: { type: "number" }, protein: { type: "number" }, carbs: { type: "number" }, fats: { type: "number" },
                  disease_rationale: { type: "string" },
                },
              },
            },
            unique_recipes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  recipe_name: { type: "string" }, ingredients: { type: "array", items: { type: "string" } },
                  instructions: { type: "array", items: { type: "string" } }, prep_time_mins: { type: "number" },
                  cook_time_mins: { type: "number" }, servings: { type: "number" }, calories_per_serving: { type: "number" },
                  protein_g: { type: "number" }, carbs_g: { type: "number" }, fats_g: { type: "number" },
                  benefits: { type: "string" }, source: { type: "string" },
                },
              },
            },
          },
        },
      });

      // Enrich recipes from DB where possible
      const enriched = (response.unique_recipes || []).map(recipe => {
        const dbMatch = findInDB(recipe.recipe_name);
        if (dbMatch && (!recipe.source || recipe.source !== "AI")) {
          return {
            ...recipe,
            ingredients: recipe.ingredients?.length ? recipe.ingredients : dbMatch.ingredients,
            instructions: recipe.instructions?.length ? recipe.instructions : dbMatch.instructions,
            prep_time_mins: recipe.prep_time_mins || dbMatch.prep,
            cook_time_mins: recipe.cook_time_mins || dbMatch.cook,
            calories_per_serving: recipe.calories_per_serving || dbMatch.cal,
            protein_g: recipe.protein_g || dbMatch.protein,
            carbs_g: recipe.carbs_g || dbMatch.carbs,
            fats_g: recipe.fats_g || dbMatch.fats,
            source: "DB",
          };
        }
        return { ...recipe, source: recipe.source || "AI" };
      });

      const dbCount = enriched.filter(r => r.source === "DB").length;
      const aiCount = enriched.filter(r => r.source === "AI").length;

      setResult({ ...response, unique_recipes: enriched });
      toast.success(`✅ Generated ${[...new Set(response.meal_plan.map(m => m.day))].length} days, ${enriched.length} recipes (${dbCount} from DB, ${aiCount} from AI)`);
    } catch (err) {
      toast.error("Generation failed: " + (err.message || "Unknown error"));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-xl">
        <CardHeader className={`${color} text-white rounded-t-xl`}>
          <CardTitle className="flex items-center gap-2">
            {isLoss ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
            {label} Plan Configuration
          </CardTitle>
          <p className="text-white/80 text-sm mt-1">{calorieNote}</p>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <Alert className={isLoss ? "bg-orange-50 border-orange-300" : "bg-green-50 border-green-300"}>
            <AlertDescription className="text-sm">
              📊 <strong>Nutrition Source Priority:</strong> Recipes will first use nutritional data from the Excel database ({RECIPE_DB.length} recipes) — AI fills in remaining dishes as fallback. Source shown on each recipe card.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="font-semibold">Daily Calorie Target (kcal) *</Label>
              <Input type="number" min={1000} max={3500} step={50} value={kcalTarget}
                onChange={e => setKcalTarget(parseInt(e.target.value) || (isLoss ? 1400 : 2200))} className="h-12 text-lg font-semibold" />
              <p className="text-xs text-gray-400">{isLoss ? "Typical: 1200–1600 kcal" : "Typical: 2000–2800 kcal"}</p>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Meals Per Day *</Label>
              <Select value={numMeals.toString()} onValueChange={v => setNumMeals(parseInt(v))}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 Meals</SelectItem>
                  <SelectItem value="6">6 Meals (Recommended)</SelectItem>
                  <SelectItem value="7">7 Meals (Full)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Diet Type *</Label>
              <Select value={dietType} onValueChange={setDietType}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="veg">🥦 Vegetarian</SelectItem>
                  <SelectItem value="non_veg">🍗 Non-Vegetarian</SelectItem>
                  <SelectItem value="egg">🥚 Eggetarian</SelectItem>
                  <SelectItem value="jain">🙏 Jain</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={generating}
            className={`w-full h-14 text-lg font-bold ${color} hover:opacity-90`}>
            {generating
              ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating 10-Day {label} Plan...</>
              : <><Sparkles className="w-5 h-5 mr-2" />Generate 10-Day {label} Meal Plan & Recipes</>}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <ResultsPanel result={result} kcalTarget={kcalTarget} numMeals={numMeals} dietType={dietType} label={label} color={color} />
      )}
    </div>
  );
}

// ─── DISEASE GENERATOR (existing logic) ───
function DiseaseGenerator() {
  const [kcalTarget, setKcalTarget] = useState(1600);
  const [numMeals, setNumMeals] = useState(7);
  const [dietType, setDietType] = useState("veg");
  const [selectedDiseases, setSelectedDiseases] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);

  const toggleDisease = d => setSelectedDiseases(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const handleGenerate = async () => {
    if (kcalTarget < 1000 || kcalTarget > 3500) { toast.error("Valid kcal 1000–3500"); return; }
    if (selectedDiseases.length === 0) { toast.error("Select at least one disease"); return; }
    setGenerating(true); setResult(null);
    try {
      const calorieMin = kcalTarget - 50, calorieMax = kcalTarget + 50;
      const mealSeq = numMeals === 5 ? "Early Morning, Breakfast, Lunch, Evening Snack, Dinner"
        : numMeals === 6 ? "Early Morning, Breakfast, Mid-Morning, Lunch, Evening Snack, Dinner"
        : "Early Morning, Breakfast, Mid-Morning, Lunch, Evening Snack, Dinner, Post Dinner";
      const bk = Math.round(kcalTarget * 0.22), mm = Math.round(kcalTarget * 0.08),
            lu = Math.round(kcalTarget * 0.33), es = Math.round(kcalTarget * 0.10), di = Math.round(kcalTarget * 0.25);
      const dietLabel = DIET_LABELS[dietType] || dietType;
      const dbRecipeNames = RECIPE_DB.map(r => r.name).join(", ");

      const prompt = `# Admin 10-Day Disease-Specific Meal Plan
Generate a complete 10-day Indian meal plan for: ${selectedDiseases.join(", ")}.
Diet: ${dietLabel} | Target: ${kcalTarget} kcal (${calorieMin}–${calorieMax}) | Meals: ${numMeals} (${mealSeq})
Breakdown: Early~10, Breakfast~${bk}, MidMorning~${mm}, Lunch~${lu}, Snack~${es}, Dinner~${di}, PostDinner~2 kcal
Disease Rules:
${selectedDiseases.includes("Diabetes Type 2") || selectedDiseases.includes("Prediabetes") ? "DIABETES: Low GI only, no sugar, no maida, max 4 rice days, high fibre, methi water AM\n" : ""}
${selectedDiseases.includes("Hypothyroid") || selectedDiseases.includes("Hyperthyroid") ? "THYROID: No raw cruciferous, selenium-rich foods, limit soy\n" : ""}
${selectedDiseases.includes("Hypertension") || selectedDiseases.includes("Heart Disease") ? "HEART/BP: Sodium <1500mg, no fried, DASH principles, high potassium\n" : ""}
${selectedDiseases.includes("High Cholesterol") ? "CHOLESTEROL: No whole eggs, no sat fat, oats and fibre daily\n" : ""}
${selectedDiseases.includes("Kidney Disease (CKD)") ? "KIDNEY: Limit K, P, Na. Low protein 0.6-0.8g/kg. No nuts in excess.\n" : ""}
${selectedDiseases.includes("PCOS / PCOD") ? "PCOS: Anti-inflammatory, low GI, high protein, chia/flax seeds\n" : ""}
${selectedDiseases.includes("IBS / Gut Issues") ? "IBS: Low FODMAP, cooked veggies only, curd daily\n" : ""}
${dietType === "jain" ? "JAIN: NO onion garlic potato carrot radish beets turnip brinjal\n" : ""}
PREFERRED RECIPES (use these first — mark source="DB"): ${dbRecipeNames}
STRICT: ALL 10 days, EXACTLY ${numMeals} meals/day, ${calorieMin}–${calorieMax} kcal/day, Indian cuisine, Indian units.
Return JSON: meal_plan (day 1-10, meal_type, meal_name, items, portion_sizes, calories, protein, carbs, fats, disease_rationale) and unique_recipes (recipe_name, ingredients, instructions, prep_time_mins, cook_time_mins, servings, calories_per_serving, protein_g, carbs_g, fats_g, disease_benefits, source "DB" or "AI").`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            meal_plan: { type: "array", items: { type: "object", properties: { day: { type: "number" }, meal_type: { type: "string" }, meal_name: { type: "string" }, items: { type: "array", items: { type: "string" } }, portion_sizes: { type: "array", items: { type: "string" } }, calories: { type: "number" }, protein: { type: "number" }, carbs: { type: "number" }, fats: { type: "number" }, disease_rationale: { type: "string" } } } },
            unique_recipes: { type: "array", items: { type: "object", properties: { recipe_name: { type: "string" }, ingredients: { type: "array", items: { type: "string" } }, instructions: { type: "array", items: { type: "string" } }, prep_time_mins: { type: "number" }, cook_time_mins: { type: "number" }, servings: { type: "number" }, calories_per_serving: { type: "number" }, protein_g: { type: "number" }, carbs_g: { type: "number" }, fats_g: { type: "number" }, disease_benefits: { type: "string" }, source: { type: "string" } } } },
          },
        },
      });

      // Enrich from DB
      const enriched = (response.unique_recipes || []).map(recipe => {
        const dbMatch = findInDB(recipe.recipe_name);
        if (dbMatch) return { ...recipe, ingredients: recipe.ingredients?.length ? recipe.ingredients : dbMatch.ingredients, instructions: recipe.instructions?.length ? recipe.instructions : dbMatch.instructions, prep_time_mins: recipe.prep_time_mins || dbMatch.prep, cook_time_mins: recipe.cook_time_mins || dbMatch.cook, calories_per_serving: recipe.calories_per_serving || dbMatch.cal, protein_g: recipe.protein_g || dbMatch.protein, carbs_g: recipe.carbs_g || dbMatch.carbs, fats_g: recipe.fats_g || dbMatch.fats, source: "DB" };
        return { ...recipe, source: recipe.source || "AI" };
      });

      setResult({ ...response, unique_recipes: enriched });
      const dbC = enriched.filter(r => r.source === "DB").length;
      toast.success(`✅ ${[...new Set(response.meal_plan.map(m => m.day))].length} days, ${enriched.length} recipes (${dbC} from DB, ${enriched.length - dbC} AI)`);
    } catch (err) { toast.error("Failed: " + (err.message || "Unknown error")); }
    finally { setGenerating(false); }
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-xl">
        <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-xl">
          <CardTitle className="flex items-center gap-2"><Stethoscope className="w-5 h-5" />Disease-Specific Configuration</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <Alert className="bg-indigo-50 border-indigo-300">
            <AlertDescription className="text-sm">📊 <strong>Nutrition Source Priority:</strong> DB recipes used first ({RECIPE_DB.length} available), AI fills gaps. Source shown on each recipe card.</AlertDescription>
          </Alert>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="font-semibold">Daily Calorie Target *</Label>
              <Input type="number" min={1000} max={3500} step={50} value={kcalTarget} onChange={e => setKcalTarget(parseInt(e.target.value) || 1600)} className="h-12 text-lg font-semibold" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Meals Per Day *</Label>
              <Select value={numMeals.toString()} onValueChange={v => setNumMeals(parseInt(v))}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 Meals</SelectItem>
                  <SelectItem value="6">6 Meals</SelectItem>
                  <SelectItem value="7">7 Meals (Full)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Diet Type *</Label>
              <Select value={dietType} onValueChange={setDietType}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="veg">🥦 Vegetarian</SelectItem>
                  <SelectItem value="non_veg">🍗 Non-Vegetarian</SelectItem>
                  <SelectItem value="egg">🥚 Eggetarian</SelectItem>
                  <SelectItem value="jain">🙏 Jain</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="font-semibold text-base">Disease / Condition *{selectedDiseases.length > 0 && <Badge className="ml-2 bg-indigo-100 text-indigo-700">{selectedDiseases.length} selected</Badge>}</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {DISEASES.map(d => (
                <div key={d} onClick={() => toggleDisease(d)} className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer text-sm transition-all select-none ${selectedDiseases.includes(d) ? "border-indigo-500 bg-indigo-50 text-indigo-800 font-medium" : "border-gray-200 bg-white text-gray-700 hover:border-indigo-300"}`}>
                  <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${selectedDiseases.includes(d) ? "border-indigo-500 bg-indigo-500" : "border-gray-300"}`}>
                    {selectedDiseases.includes(d) && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  {d}
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={generating || selectedDiseases.length === 0}
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90">
            {generating ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating...</> : <><Sparkles className="w-5 h-5 mr-2" />Generate 10-Day Disease Plan & Recipes</>}
          </Button>
        </CardContent>
      </Card>
      {result && <ResultsPanel result={result} kcalTarget={kcalTarget} numMeals={numMeals} dietType={dietType} label={`Disease - ${selectedDiseases[0]}`} color="bg-indigo-700" />}
    </div>
  );
}

// ─── MAIN PAGE ───
export default function AdminMealPlanGenerator() {
  const [mainTab, setMainTab] = useState("weight_loss");

  const { data: user } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });
  const isSuperAdmin = user?.user_type === "super_admin";

  const { data: knowledgeBase = [] } = useQuery({
    queryKey: ["healthyfyKnowledgeBase"],
    queryFn: () => base44.entities.HealthyfyKnowledgeBase.filter({ is_active: true }),
    enabled: !!isSuperAdmin,
  });

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <Alert className="max-w-md bg-red-50 border-red-500">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <AlertDescription><strong>Admin Only.</strong> This feature is restricted to super admins.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <ChefHat className="w-8 h-8 text-indigo-600" />Admin Meal Plan Generator
            </h1>
            <p className="text-gray-500 mt-1">10-day plans + unique recipes • DB nutrition first, AI fallback</p>
          </div>
          <Badge className="bg-indigo-600 text-white px-4 py-2">👑 Admin Only</Badge>
        </div>

        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList className="bg-white shadow w-full grid grid-cols-3">
            <TabsTrigger value="weight_loss" className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-orange-500" />Weight Loss
            </TabsTrigger>
            <TabsTrigger value="weight_gain" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />Weight Gain
            </TabsTrigger>
            <TabsTrigger value="disease" className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-indigo-600" />Disease-Specific
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weight_loss" className="mt-6">
            <SimpleGoalGenerator goal="weight_loss" />
          </TabsContent>
          <TabsContent value="weight_gain" className="mt-6">
            <SimpleGoalGenerator goal="weight_gain" />
          </TabsContent>
          <TabsContent value="disease" className="mt-6">
            <DiseaseGenerator />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}