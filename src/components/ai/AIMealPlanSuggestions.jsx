import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, RefreshCw, ChefHat, Flame, Clock, Calendar, ExternalLink } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function AIMealPlanSuggestions({ clientId, client }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => base44.entities.Recipe.list("-created_date"),
    initialData: [],
  });

  const { data: progressLogs = [] } = useQuery({
    queryKey: ["progressLogs", clientId],
    queryFn: () => base44.entities.ProgressLog.filter({ client_id: clientId }),
    enabled: !!clientId,
    initialData: [],
  });

  const generateSuggestions = async () => {
    if (!client) return;
    setLoading(true);

    const recentProgress = progressLogs.slice(-5);
    const avgAdherence = recentProgress.length > 0
      ? Math.round(recentProgress.reduce((s, l) => s + (l.meal_adherence || 0), 0) / recentProgress.length)
      : null;

    const recipeList = recipes.slice(0, 80).map(r => ({
      id: r.id,
      name: r.name,
      meal_type: r.meal_type,
      food_preference: r.food_preference,
      calories: r.calories,
      protein: r.protein,
      tags: r.tags,
    }));

    const prompt = `You are a clinical dietitian AI. Based on this client's profile, suggest a personalized 7-day meal plan using their available recipe library.

CLIENT PROFILE:
- Name: ${client.full_name}
- Goal: ${client.goal?.replace(/_/g, ' ')}
- Food Preference: ${client.food_preference}
- Regional Preference: ${client.regional_preference}
- Target Calories: ${client.target_calories || 'Not set'} kcal/day
- Target Protein: ${client.target_protein || 'Not set'}g
- Target Carbs: ${client.target_carbs || 'Not set'}g
- Target Fats: ${client.target_fats || 'Not set'}g
- Weight: ${client.weight || 'Not set'} kg, Target: ${client.target_weight || 'Not set'} kg
- Meal Adherence (recent avg): ${avgAdherence !== null ? avgAdherence + '%' : 'No data'}

AVAILABLE RECIPES (partial list):
${JSON.stringify(recipeList, null, 1)}

Generate a 7-day weekly meal plan using ONLY recipes from the list above (matched by id). For each day (Monday–Sunday), suggest meals for: early_morning, breakfast, mid_morning, lunch, evening_snack, dinner.

Also provide:
1. Top 5 recipe recommendations specifically for this client's goal and preferences
2. 3 key nutritional observations/recommendations based on their profile

Return structured JSON.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          weekly_plan: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day: { type: "string" },
                meals: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      slot: { type: "string" },
                      recipe_id: { type: "string" },
                      recipe_name: { type: "string" },
                      calories: { type: "number" }
                    }
                  }
                },
                total_calories: { type: "number" }
              }
            }
          },
          top_recipes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                recipe_id: { type: "string" },
                recipe_name: { type: "string" },
                reason: { type: "string" }
              }
            }
          },
          observations: { type: "array", items: { type: "string" } }
        }
      }
    });

    setSuggestions(response);
    setLoading(false);
  };

  const getRecipeById = (id) => recipes.find(r => r.id === id);

  const SLOT_LABELS = {
    early_morning: "Early Morning",
    breakfast: "Breakfast",
    mid_morning: "Mid-Morning",
    lunch: "Lunch",
    evening_snack: "Evening Snack",
    dinner: "Dinner",
  };

  return (
    <div className="space-y-4">
      <Card className="border-none shadow-md bg-gradient-to-r from-gray-50 to-slate-50">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-600">
              AI generates a personalized 7-day meal plan using your recipe library, tailored to this client's goals, food preferences, and progress data.
            </p>
          </div>
          <Button
            onClick={generateSuggestions}
            disabled={loading}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 whitespace-nowrap flex-shrink-0 h-9 text-sm"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Generating...</>
            ) : suggestions ? (
              <><RefreshCw className="w-4 h-4 mr-1.5" />Regenerate</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-1.5" />Generate Plan</>
            )}
          </Button>
        </CardContent>
      </Card>

      {loading && (
        <Card className="border-none shadow-md">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-10 h-10 mx-auto text-orange-400 animate-spin mb-4" />
            <p className="text-gray-500 text-sm">Analyzing {client?.full_name}'s profile and matching recipes...</p>
            <p className="text-gray-400 text-xs mt-1">This may take 20-30 seconds</p>
          </CardContent>
        </Card>
      )}

      {!loading && !suggestions && (
        <Card className="border-none shadow-md border-dashed border-2 border-gray-200">
          <CardContent className="p-10 text-center">
            <ChefHat className="w-12 h-12 mx-auto opacity-20 text-orange-500 mb-4" />
            <p className="text-gray-500 text-sm">Click "Generate Plan" to get personalized meal plan suggestions for {client?.full_name}</p>
          </CardContent>
        </Card>
      )}

      {!loading && suggestions && (
        <div className="space-y-6">
          {/* Observations */}
          {suggestions.observations?.length > 0 && (
            <Card className="border-none shadow-md bg-blue-50">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold text-blue-800">Key Nutritional Observations</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {suggestions.observations.map((obs, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold text-sm mt-0.5">•</span>
                    <p className="text-sm text-blue-800">{obs}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Top Recipe Recommendations */}
          {suggestions.top_recipes?.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-orange-500" />
                Top Recommended Recipes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {suggestions.top_recipes.map((rec, i) => {
                  const recipe = getRecipeById(rec.recipe_id);
                  return (
                    <Card key={i} className="border border-orange-200 bg-orange-50/50">
                      <CardContent className="p-3 flex gap-3 items-start">
                        {recipe?.image_url ? (
                          <img src={recipe.image_url} alt={recipe.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                            <ChefHat className="w-6 h-6 text-orange-400" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{rec.recipe_name}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{rec.reason}</p>
                          {recipe && (
                            <div className="flex gap-2 mt-1">
                              <span className="text-[10px] flex items-center gap-0.5 text-gray-500">
                                <Flame className="w-3 h-3" /> {recipe.calories || '?'} kcal
                              </span>
                              <span className="text-[10px] flex items-center gap-0.5 text-gray-500">
                                <Clock className="w-3 h-3" /> {(recipe.prep_time || 0) + (recipe.cook_time || 0)} min
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Weekly Plan */}
          {suggestions.weekly_plan?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  7-Day Personalized Meal Plan
                </h3>
                <a
                  href={createPageUrl(`MealPlanner?client=${clientId}`)}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  Open in Meal Planner <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="space-y-3">
                {suggestions.weekly_plan.map((day, i) => (
                  <Card key={i} className="border border-gray-200">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-800 text-sm">{day.day}</h4>
                        <Badge className="text-xs bg-orange-100 text-orange-700">
                          <Flame className="w-3 h-3 mr-1" />
                          {day.total_calories || day.meals?.reduce((s, m) => s + (m.calories || 0), 0)} kcal
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                        {day.meals?.map((meal, j) => (
                          <div key={j} className="p-1.5 bg-gray-50 rounded text-xs">
                            <p className="text-gray-500 font-medium">{SLOT_LABELS[meal.slot] || meal.slot}</p>
                            <p className="text-gray-800 font-semibold line-clamp-1 mt-0.5">{meal.recipe_name}</p>
                            {meal.calories > 0 && <p className="text-gray-400">{meal.calories} kcal</p>}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}