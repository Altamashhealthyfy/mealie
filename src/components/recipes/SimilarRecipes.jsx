import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Flame } from "lucide-react";
import AuthenticatedImage from "@/components/common/AuthenticatedImage";

export default function SimilarRecipes({ recipe, allRecipes, onSelectRecipe }) {
  const similarRecipes = useMemo(() => {
    if (!recipe || !allRecipes.length) return [];

    const scored = allRecipes
      .filter(r => r.id !== recipe.id)
      .map(r => {
        let score = 0;

        // Same meal type (20 points)
        if (r.meal_type === recipe.meal_type) score += 20;

        // Same food preference (20 points)
        if (r.food_preference === recipe.food_preference) score += 20;

        // Same regional cuisine (20 points)
        if (r.regional_cuisine === recipe.regional_cuisine) score += 20;

        // Shared dietary tags (15 points per tag)
        const recipeTags = recipe.dietary_tags || [];
        const rTags = r.dietary_tags || [];
        const sharedTags = recipeTags.filter(t => rTags.includes(t)).length;
        score += sharedTags * 15;

        // Shared custom tags (10 points per tag)
        const recipeCustomTags = recipe.tags || [];
        const rCustomTags = r.tags || [];
        const sharedCustomTags = recipeCustomTags.filter(t => rCustomTags.includes(t)).length;
        score += sharedCustomTags * 10;

        // Similar prep time (within 15 minutes = 10 points)
        const timeDiff = Math.abs((recipe.prep_time || 0) + (recipe.cook_time || 0) - 
                                  ((r.prep_time || 0) + (r.cook_time || 0)));
        if (timeDiff <= 15) score += 10;

        // Similar calories (within 100 kcal = 10 points)
        const calDiff = Math.abs((recipe.calories || 0) - (r.calories || 0));
        if (calDiff <= 100) score += 10;

        return { recipe: r, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    return scored.map(s => s.recipe);
  }, [recipe, allRecipes]);

  if (!similarRecipes.length) return null;

  return (
    <div className="space-y-4 pt-6 border-t-2 border-gray-200">
      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        🍳 Similar Recipes You Might Like
      </h3>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {similarRecipes.map((r) => (
          <button
            key={r.id}
            onClick={() => onSelectRecipe(r)}
            className="group text-left transition-all"
          >
            <Card className="h-full border-none shadow-md hover:shadow-lg overflow-hidden">
              {r.image_url ? (
                <div className="h-32 overflow-hidden relative bg-gray-200">
                  <AuthenticatedImage
                    src={r.image_url}
                    alt={r.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="h-32 bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                  <span className="text-2xl">🍽️</span>
                </div>
              )}

              <CardContent className="p-3 space-y-2">
                <h4 className="font-semibold text-sm line-clamp-2 group-hover:text-purple-600 transition-colors">
                  {r.name}
                </h4>

                <div className="flex gap-1 flex-wrap">
                  {r.meal_type && (
                    <Badge className="bg-orange-100 text-orange-700 text-xs">
                      {r.meal_type}
                    </Badge>
                  )}
                  {r.food_preference && (
                    <Badge className="bg-green-100 text-green-700 text-xs">
                      {r.food_preference}
                    </Badge>
                  )}
                </div>

                <div className="space-y-1 text-xs text-gray-600">
                  {r.calories && (
                    <div className="flex items-center gap-1">
                      <Flame className="w-3 h-3" />
                      {r.calories} kcal
                    </div>
                  )}
                  {r.prep_time && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {(r.prep_time || 0) + (r.cook_time || 0)} min
                    </div>
                  )}
                  {r.servings && (
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {r.servings} servings
                    </div>
                  )}
                </div>

                <Button
                  className="w-full h-8 text-xs bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 mt-2"
                  onClick={() => onSelectRecipe(r)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}