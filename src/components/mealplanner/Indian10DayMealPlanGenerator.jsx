import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChefHat, Download } from "lucide-react";

const MEAL_PLAN_DATA = {
  earlyMorning: {
    default: [
      "Warm water with lemon",
      "Herbal tea (ginger, tulsi)",
      "Warm turmeric water",
      "Herbal tea with honey",
      "Warm lemon water with honey"
    ]
  },
  breakfast: {
    veg: [
      "Oats upma with vegetables",
      "Poha with peanuts",
      "Idli with sambar",
      "Dosa with chutney",
      "Besan cheela",
      "Ragi porridge",
      "Bajra khichdi"
    ],
    nonVeg: [
      "Egg white omelette with vegetables",
      "Boiled egg with whole wheat toast",
      "Egg white scramble with vegetables"
    ]
  },
  midMorning: {
    default: [
      "Apple with almonds",
      "Banana with walnuts",
      "Mosambi juice",
      "Papaya",
      "Orange",
      "Guava",
      "Mixed fruits"
    ]
  },
  lunch: {
    veg: [
      "Roti with chana dal curry",
      "Rice with dal and vegetables",
      "Roti with rajma curry",
      "Roti with mixed vegetable curry",
      "Biryani (vegetable)",
      "Khichdi with ghee",
      "Roti with kadhi"
    ],
    nonVeg: [
      "Grilled chicken breast with brown rice and steamed vegetables",
      "Chicken breast curry with roti",
      "Grilled chicken with salad",
      "Chicken breast biryani",
      "Grilled fish with roti and vegetables",
      "Fish curry with brown rice"
    ]
  },
  eveningSnacks: {
    default: [
      "Roasted chickpeas",
      "Puffed rice with vegetables",
      "Sprouted moong salad",
      "Cucumber and carrot sticks with hummus",
      "Roasted makhana",
      "Buttermilk with cumin",
      "Mixed vegetable soup"
    ]
  },
  dinner: {
    veg: [
      "Roti with moong dal curry",
      "Roti with mixed vegetable curry",
      "Roti with chana curry",
      "Roti with bottle gourd curry",
      "Roti with spinach and ricotta",
      "Roti with cucumber raita",
      "Roti with cabbage curry"
    ],
    nonVeg: [
      "Grilled chicken breast with steamed vegetables and roti",
      "Grilled fish with vegetables and roti",
      "Chicken breast curry with roti",
      "Boiled egg white with vegetable curry",
      "Egg white salad with vegetables"
    ]
  },
  postDinner: [
    "Saunf water",
    "Ajwain water",
    "Turmeric water",
    "Hing water",
    "Ginger water",
    "Chamomile tea"
  ]
};

const RICE_PAIRINGS = [
  "Dal and rice",
  "Rajma and rice",
  "Chhole and rice",
  "Kadhi and rice",
  "Veg mixed paneer pulao"
];

function generateMealPlan(preferences) {
  const {
    goal = "weight_loss",
    foodPreference = "veg",
    includeRice = 5,
    postDinnerOption = "ginger water"
  } = preferences;

  const plan = [];
  const riceSelected = new Set();

  for (let day = 1; day <= 10; day++) {
    const dayPlan = {
      day,
      earlyMorning: MEAL_PLAN_DATA.earlyMorning.default[Math.floor(Math.random() * MEAL_PLAN_DATA.earlyMorning.default.length)],
      breakfast: "",
      midMorning: MEAL_PLAN_DATA.midMorning.default[Math.floor(Math.random() * MEAL_PLAN_DATA.midMorning.default.length)],
      lunch: "",
      eveningSnacks: MEAL_PLAN_DATA.eveningSnacks.default[Math.floor(Math.random() * MEAL_PLAN_DATA.eveningSnacks.default.length)],
      dinner: "",
      postDinner: postDinnerOption
    };

    // Breakfast selection
    if (foodPreference === "non_veg" && Math.random() > 0.5) {
      dayPlan.breakfast = MEAL_PLAN_DATA.breakfast.nonVeg[Math.floor(Math.random() * MEAL_PLAN_DATA.breakfast.nonVeg.length)];
    } else {
      dayPlan.breakfast = MEAL_PLAN_DATA.breakfast.veg[Math.floor(Math.random() * MEAL_PLAN_DATA.breakfast.veg.length)];
    }

    // Lunch selection with rice consideration
    if (riceSelected.size < includeRice && Math.random() > 0.5) {
      const riceOption = RICE_PAIRINGS[Math.floor(Math.random() * RICE_PAIRINGS.length)];
      dayPlan.lunch = `${foodPreference === "non_veg" ? "Grilled chicken breast with brown rice and steamed vegetables" : riceOption}`;
      riceSelected.add(day);
    } else {
      if (foodPreference === "non_veg") {
        dayPlan.lunch = MEAL_PLAN_DATA.lunch.nonVeg[Math.floor(Math.random() * MEAL_PLAN_DATA.lunch.nonVeg.length)];
      } else {
        dayPlan.lunch = MEAL_PLAN_DATA.lunch.veg[Math.floor(Math.random() * MEAL_PLAN_DATA.lunch.veg.length)];
      }
    }

    // Dinner selection (no palak paneer, exclude night milk for weight loss)
    if (foodPreference === "non_veg") {
      dayPlan.dinner = MEAL_PLAN_DATA.dinner.nonVeg[Math.floor(Math.random() * MEAL_PLAN_DATA.dinner.nonVeg.length)];
    } else {
      dayPlan.dinner = MEAL_PLAN_DATA.dinner.veg[Math.floor(Math.random() * MEAL_PLAN_DATA.dinner.veg.length)];
    }

    plan.push(dayPlan);
  }

  return plan;
}

export default function Indian10DayMealPlanGenerator({ onMealPlanGenerated }) {
  const [plan, setPlan] = useState(null);
  const [preferences, setPreferences] = useState({
    goal: "weight_loss",
    foodPreference: "veg",
    postDinnerOption: "ginger water"
  });

  const handleGeneratePlan = () => {
    const generatedPlan = generateMealPlan(preferences);
    setPlan(generatedPlan);
    if (onMealPlanGenerated) {
      onMealPlanGenerated(generatedPlan);
    }
  };

  const handleDownload = () => {
    const csv = generateCSV(plan);
    const element = document.createElement("a");
    const file = new Blob([csv], { type: "text/csv" });
    element.href = URL.createObjectURL(file);
    element.download = "10-day-meal-plan.csv";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const generateCSV = (mealPlan) => {
    const headers = ["Day", "Early Morning", "Breakfast", "Mid-Morning", "Lunch", "Evening Snacks", "Dinner", "Post-Dinner"];
    const rows = mealPlan.map(day => [
      day.day,
      day.earlyMorning,
      day.breakfast,
      day.midMorning,
      day.lunch,
      day.eveningSnacks,
      day.dinner,
      day.postDinner
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    return csv;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="w-5 h-5" />
            10-Day Indian Meal Plan Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preferences Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Client Goal</label>
              <Select value={preferences.goal} onValueChange={(value) => setPreferences({...preferences, goal: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weight_loss">Weight Loss</SelectItem>
                  <SelectItem value="weight_gain">Weight Gain</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="diabetes">Diabetes</SelectItem>
                  <SelectItem value="hyperlipidemia">Hyperlipidemia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Food Preference</label>
              <Select value={preferences.foodPreference} onValueChange={(value) => setPreferences({...preferences, foodPreference: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="veg">Vegetarian</SelectItem>
                  <SelectItem value="non_veg">Non-Vegetarian</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Post-Dinner Drink</label>
              <Select value={preferences.postDinnerOption} onValueChange={(value) => setPreferences({...preferences, postDinnerOption: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="saunf water">Saunf Water</SelectItem>
                  <SelectItem value="ajwain water">Ajwain Water</SelectItem>
                  <SelectItem value="turmeric water">Turmeric Water</SelectItem>
                  <SelectItem value="hing water">Hing Water</SelectItem>
                  <SelectItem value="ginger water">Ginger Water</SelectItem>
                  <SelectItem value="chamomile tea">Chamomile Tea</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleGeneratePlan} className="w-full bg-orange-600 hover:bg-orange-700">
            Generate 10-Day Plan
          </Button>

          {/* Meal Plan Display */}
          {plan && (
            <div className="space-y-4 mt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Generated Meal Plan</h3>
                <Button onClick={handleDownload} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-orange-50 border-b-2 border-orange-200">
                      <th className="border p-3 text-left font-semibold">Day</th>
                      <th className="border p-3 text-left font-semibold">Early Morning</th>
                      <th className="border p-3 text-left font-semibold">Breakfast</th>
                      <th className="border p-3 text-left font-semibold">Mid-Morning</th>
                      <th className="border p-3 text-left font-semibold">Lunch</th>
                      <th className="border p-3 text-left font-semibold">Evening Snacks</th>
                      <th className="border p-3 text-left font-semibold">Dinner</th>
                      <th className="border p-3 text-left font-semibold">Post-Dinner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.map((day) => (
                      <tr key={day.day} className="hover:bg-orange-50 border-b border-orange-100">
                        <td className="border p-3 font-semibold">{day.day}</td>
                        <td className="border p-3">{day.earlyMorning}</td>
                        <td className="border p-3">{day.breakfast}</td>
                        <td className="border p-3">{day.midMorning}</td>
                        <td className="border p-3">{day.lunch}</td>
                        <td className="border p-3">{day.eveningSnacks}</td>
                        <td className="border p-3">{day.dinner}</td>
                        <td className="border p-3">
                          <Badge className="bg-green-100 text-green-800">{day.postDinner}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                <p className="text-blue-900">
                  <strong>Notes:</strong> This meal plan includes only Indian cuisine options, excludes palak paneer at dinner, and contains no night milk for weight-loss clients. Rice is included on 4-5 days paired with dal, rajma, chhole, or kadhi.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}