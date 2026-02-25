import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, X, Plus, BookOpen, Target } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SmartMealPlanGenerator({ client, onPlanGenerated }) {
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState({
    duration: 7,
    dietary_restrictions: [],
    cuisine_preferences: [],
    target_calories: client?.target_calories || "",
    target_protein: client?.target_protein || "",
    target_carbs: client?.target_carbs || "",
    target_fats: client?.target_fats || "",
  });
  const [restrictionInput, setRestrictionInput] = useState("");
  const [availableRecipeCount, setAvailableRecipeCount] = useState(null);

  const commonRestrictions = [
    "dairy", "gluten", "nuts", "soy", "eggs", "coconut", 
    "sesame", "peanuts", "shellfish", "sugar"
  ];

  const cuisineOptions = [
    { value: "north", label: "North Indian" },
    { value: "south", label: "South Indian" },
    { value: "west", label: "West Indian" },
    { value: "east", label: "East Indian" },
  ];

  const addRestriction = (restriction) => {
    if (!formData.dietary_restrictions.includes(restriction)) {
      setFormData({
        ...formData,
        dietary_restrictions: [...formData.dietary_restrictions, restriction]
      });
    }
    setRestrictionInput("");
  };

  const removeRestriction = (restriction) => {
    setFormData({
      ...formData,
      dietary_restrictions: formData.dietary_restrictions.filter(r => r !== restriction)
    });
  };

  const toggleCuisine = (cuisine) => {
    if (formData.cuisine_preferences.includes(cuisine)) {
      setFormData({
        ...formData,
        cuisine_preferences: formData.cuisine_preferences.filter(c => c !== cuisine)
      });
    } else {
      setFormData({
        ...formData,
        cuisine_preferences: [...formData.cuisine_preferences, cuisine]
      });
    }
  };

  const handleGenerate = async () => {
    if (!client) {
      alert("Please select a client first");
      return;
    }

    if (!formData.target_calories) {
      alert("Please specify target calories");
      return;
    }

    setGenerating(true);

    try {
      const response = await base44.functions.invoke('generateSmartMealPlan', {
        client_id: client.id,
        duration: formData.duration,
        dietary_restrictions: formData.dietary_restrictions,
        cuisine_preferences: formData.cuisine_preferences.length > 0 
          ? formData.cuisine_preferences 
          : null,
        target_calories: parseInt(formData.target_calories),
        target_protein: formData.target_protein ? parseInt(formData.target_protein) : null,
        target_carbs: formData.target_carbs ? parseInt(formData.target_carbs) : null,
        target_fats: formData.target_fats ? parseInt(formData.target_fats) : null,
        food_preference: client.food_preference,
        regional_preference: client.regional_preference
      });

      if (response.data.success) {
        setAvailableRecipeCount(response.data.available_recipes_count);
        
        const generatedPlan = {
          plan_name: response.data.plan.plan_name,
          meals: response.data.plan.meals,
          client_id: client.id,
          client_name: client.full_name,
          duration: formData.duration,
          meal_pattern: 'daily',
          food_preference: client.food_preference,
          regional_preference: client.regional_preference,
          target_calories: formData.target_calories,
          from_smart_generator: true,
          recipes_used_from_library: response.data.plan.total_recipes_from_library
        };

        onPlanGenerated(generatedPlan);
        
        alert(
          `✅ Smart meal plan generated!\n\n` +
          `📚 Used ${response.data.plan.total_recipes_from_library} recipes from your library\n` +
          `📅 ${formData.duration} days with ${response.data.plan.meals.length} meals\n\n` +
          `Available recipes:\n` +
          `• Breakfast: ${response.data.available_recipes_count.breakfast}\n` +
          `• Lunch: ${response.data.available_recipes_count.lunch}\n` +
          `• Dinner: ${response.data.available_recipes_count.dinner}\n` +
          `• Snacks: ${response.data.available_recipes_count.snack}`
        );
      } else {
        alert("Failed to generate meal plan. Please try again.");
      }
    } catch (error) {
      console.error("Generation error:", error);
      alert("Error generating smart meal plan. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="border-2 border-green-500 bg-gradient-to-br from-green-50 to-emerald-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-900">
          <BookOpen className="w-6 h-6" />
          Smart Plan Generator (Uses Recipe Library)
        </CardTitle>
        <CardDescription>
          Generate meal plans using recipes from your existing library with custom preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Alert className="bg-blue-50 border-blue-300">
          <AlertDescription className="text-blue-900 text-sm">
            <strong>💡 How it works:</strong> AI will select recipes from your library that match your dietary restrictions and preferences, then build a personalized weekly meal plan.
          </AlertDescription>
        </Alert>

        {/* Duration */}
        <div className="space-y-2">
          <Label className="font-semibold flex items-center gap-2">
            <Target className="w-4 h-4" />
            Plan Duration
          </Label>
          <Select
            value={formData.duration.toString()}
            onValueChange={(value) => setFormData({...formData, duration: parseInt(value)})}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 Days (1 Week)</SelectItem>
              <SelectItem value="10">10 Days</SelectItem>
              <SelectItem value="14">14 Days (2 Weeks)</SelectItem>
              <SelectItem value="21">21 Days (3 Weeks)</SelectItem>
              <SelectItem value="30">30 Days (1 Month)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Dietary Restrictions */}
        <div className="space-y-3">
          <Label className="font-semibold">Dietary Restrictions</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {commonRestrictions.map(restriction => (
              <button
                key={restriction}
                type="button"
                onClick={() => addRestriction(restriction)}
                className={`px-3 py-1.5 text-sm rounded-full border-2 transition-all ${
                  formData.dietary_restrictions.includes(restriction)
                    ? 'bg-red-100 border-red-500 text-red-700 cursor-not-allowed'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-red-300'
                }`}
                disabled={formData.dietary_restrictions.includes(restriction)}
              >
                {restriction}
              </button>
            ))}
          </div>

          {formData.dietary_restrictions.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-semibold text-red-900 mb-2">Active Restrictions:</p>
              <div className="flex flex-wrap gap-2">
                {formData.dietary_restrictions.map(restriction => (
                  <Badge key={restriction} className="bg-red-500 text-white flex items-center gap-1">
                    {restriction}
                    <button
                      onClick={() => removeRestriction(restriction)}
                      className="ml-1 hover:bg-red-600 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Input
              placeholder="Add custom restriction (e.g., mushroom, garlic)"
              value={restrictionInput}
              onChange={(e) => setRestrictionInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && restrictionInput.trim()) {
                  addRestriction(restrictionInput.trim());
                }
              }}
            />
            <Button
              type="button"
              onClick={() => {
                if (restrictionInput.trim()) {
                  addRestriction(restrictionInput.trim());
                }
              }}
              variant="outline"
              disabled={!restrictionInput.trim()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Cuisine Preferences */}
        <div className="space-y-3">
          <Label className="font-semibold">Cuisine Preferences (Optional)</Label>
          <p className="text-xs text-gray-600">Select specific cuisines or leave empty for all</p>
          <div className="grid grid-cols-2 gap-2">
            {cuisineOptions.map(cuisine => (
              <button
                key={cuisine.value}
                type="button"
                onClick={() => toggleCuisine(cuisine.value)}
                className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                  formData.cuisine_preferences.includes(cuisine.value)
                    ? 'bg-green-100 border-green-500 text-green-700'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-green-300'
                }`}
              >
                {cuisine.label}
              </button>
            ))}
          </div>
        </div>

        {/* Macro Targets */}
        <div className="space-y-3">
          <Label className="font-semibold">Macro Targets</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">Calories (kcal) *</Label>
              <Input
                type="number"
                value={formData.target_calories}
                onChange={(e) => setFormData({...formData, target_calories: e.target.value})}
                placeholder="1800"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Protein (g)</Label>
              <Input
                type="number"
                value={formData.target_protein}
                onChange={(e) => setFormData({...formData, target_protein: e.target.value})}
                placeholder="60"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Carbs (g)</Label>
              <Input
                type="number"
                value={formData.target_carbs}
                onChange={(e) => setFormData({...formData, target_carbs: e.target.value})}
                placeholder="200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Fats (g)</Label>
              <Input
                type="number"
                value={formData.target_fats}
                onChange={(e) => setFormData({...formData, target_fats: e.target.value})}
                placeholder="50"
              />
            </div>
          </div>
        </div>

        {availableRecipeCount && (
          <Alert className="bg-purple-50 border-purple-300">
            <AlertDescription className="text-purple-900 text-sm">
              <strong>📚 Recipe Library Status:</strong>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <span>Breakfast: {availableRecipeCount.breakfast} recipes</span>
                <span>Lunch: {availableRecipeCount.lunch} recipes</span>
                <span>Dinner: {availableRecipeCount.dinner} recipes</span>
                <span>Snacks: {availableRecipeCount.snack} recipes</span>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleGenerate}
          disabled={generating || !formData.target_calories}
          className="w-full h-14 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
        >
          {generating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generating from Recipe Library...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Generate Smart Meal Plan
            </>
          )}
        </Button>

        <Alert className="bg-amber-50 border-amber-300">
          <AlertDescription className="text-amber-900 text-xs">
            <strong>Note:</strong> The more recipes in your library, the better the AI can match your preferences. If certain meal types have limited recipes, AI will suggest simple traditional alternatives.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}