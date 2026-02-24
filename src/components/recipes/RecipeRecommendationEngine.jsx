import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Sparkles, TrendingUp, Clock, Flame } from "lucide-react";

export default function RecipeRecommendationEngine({
  userEmail,
  recipes,
  pantryIngredients,
  onSelectRecipe,
  favoriteRecipeIds = [],
}) {
  // Fetch user's food logs for past behavior analysis
  const { data: foodLogs } = useQuery({
    queryKey: ["foodLogs", userEmail],
    queryFn: () => base44.entities.FoodLog.filter({ client_email: userEmail }),
    enabled: !!userEmail,
    initialData: [],
  });

  // Fetch favorite recipes for preference analysis
  const { data: favorites } = useQuery({
    queryKey: ["favoriteRecipes", userEmail],
    queryFn: () => base44.entities.FavoriteRecipe.filter({ client_email: userEmail }),
    enabled: !!userEmail,
    initialData: [],
  });

  // Calculate recipe scores based on multiple factors
  const recommendedRecipes = useMemo(() => {
    if (!recipes.length) return [];

    const pantryIngredientNames = pantryIngredients.map(p => p.ingredient_name.toLowerCase());
    const favoriteIds = favorites.map(f => f.recipe_id);
    
    // Extract frequently used cuisines and preferences from food logs
    const recentFoodItems = foodLogs.slice(0, 30).flatMap(log => log.items || []);
    
    return recipes
      .map((recipe) => {
        let score = 0;

        // 1. Pantry Match Score (0-30 points)
        if (recipe.ingredients && recipe.ingredients.length > 0) {
          const matchingIngredients = recipe.ingredients.filter(ing =>
            pantryIngredientNames.some(p => 
              p.includes(ing.item.toLowerCase()) || ing.item.toLowerCase().includes(p)
            )
          ).length;
          const matchPercentage = matchingIngredients / recipe.ingredients.length;
          score += matchPercentage * 30;
        }

        // 2. Favorite Pattern Score (0-25 points)
        // If similar cuisine/meal type was favorited before
        const similarFavorites = favorites.filter(fav => {
          const favRecipe = recipes.find(r => r.id === fav.recipe_id);
          return favRecipe && 
            (favRecipe.regional_cuisine === recipe.regional_cuisine ||
             favRecipe.meal_type === recipe.meal_type);
        });
        if (similarFavorites.length > 0) {
          score += Math.min(similarFavorites.length * 8, 25);
        }

        // 3. Rating Boost (0-15 points)
        const topRatedFavorite = favorites.find(f => f.recipe_id === recipe.id);
        if (topRatedFavorite?.user_rating) {
          score += topRatedFavorite.user_rating * 3;
        }

        // 4. Consistency Score (0-20 points)
        // Based on how often user cooks similar recipes
        if (recipe.usage_count) {
          score += Math.min(recipe.usage_count * 2, 20);
        }

        // 5. Recent Favorites Boost (0-10 points)
        if (favoriteIds.includes(recipe.id)) {
          score += 10;
        }

        // 6. New Discovery Bonus (0-5 points)
        // Slightly boost recipes not yet favorited
        if (!favoriteIds.includes(recipe.id) && score < 30) {
          score += 5;
        }

        return {
          ...recipe,
          score: Math.round(score),
          matchPercentage: recipe.ingredients 
            ? Math.round((recipe.ingredients.filter(ing =>
                pantryIngredientNames.some(p => 
                  p.includes(ing.item.toLowerCase()) || ing.item.toLowerCase().includes(p)
                )
              ).length / recipe.ingredients.length) * 100)
            : 0,
          reason: getRecommendationReason(score, recipe, favorites, pantryIngredientNames),
        };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [recipes, pantryIngredients, favorites, foodLogs]);

  const getRecommendationReason = (score, recipe, favorites, pantryNames) => {
    if (score > 70) return "🔥 Top Pick - Great match!";
    if (score > 50) {
      const hasRating = favorites.some(f => f.recipe_id === recipe.id);
      return hasRating ? "⭐ Your favorite cuisine" : "✨ Similar to favorites";
    }
    if (score > 30) return "🥘 Uses your pantry items";
    return "🌟 Worth trying";
  };

  if (recommendedRecipes.length === 0) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-12 text-center">
          <Sparkles className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No recommendations yet</h3>
          <p className="text-gray-600">
            Add items to your pantry and favorite recipes to get personalized recommendations.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
        <TrendingUp className="w-5 h-5 text-purple-600" />
        <p className="text-sm font-semibold text-purple-900">
          {recommendedRecipes.length} recipes tailored to your preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {recommendedRecipes.map((recipe) => (
          <Card
            key={recipe.id}
            className="border-none shadow-lg hover:shadow-xl transition-all overflow-hidden cursor-pointer group"
            onClick={() => onSelectRecipe(recipe)}
          >
            {recipe.image_url && (
              <div className="h-40 overflow-hidden bg-gray-100 relative">
                <img
                  src={recipe.image_url}
                  alt={recipe.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                {/* Score Badge */}
                <div className="absolute top-2 right-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full font-bold text-sm shadow-lg">
                  {recipe.score}
                </div>
              </div>
            )}

            <CardHeader className="pb-3">
              <CardTitle className="text-sm line-clamp-2">{recipe.name}</CardTitle>
              <p className="text-xs font-medium text-purple-600">{recipe.reason}</p>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Match percentage */}
              {recipe.matchPercentage > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                      style={{ width: `${recipe.matchPercentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-700">
                    {recipe.matchPercentage}%
                  </span>
                </div>
              )}

              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-xs capitalize">
                  {recipe.meal_type}
                </Badge>
                <Badge className="text-xs bg-green-100 text-green-800 capitalize">
                  {recipe.regional_cuisine}
                </Badge>
              </div>

              {/* Quick Stats */}
              <div className="flex items-center justify-between text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {(recipe.prep_time || 0) + (recipe.cook_time || 0)} min
                </div>
                <div className="flex items-center gap-1">
                  <Flame className="w-3 h-3" />
                  {recipe.calories} kcal
                </div>
              </div>

              {/* Favorite Status */}
              {favoriteRecipeIds.includes(recipe.id) && (
                <div className="flex items-center gap-1 text-red-600">
                  <Heart className="w-4 h-4 fill-current" />
                  <span className="text-xs font-semibold">Favorite</span>
                </div>
              )}

              <Button size="sm" className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                View Recipe
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}