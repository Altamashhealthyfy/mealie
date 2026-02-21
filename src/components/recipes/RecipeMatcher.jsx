import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ChefHat, CheckCircle2, AlertCircle, Clock, Flame, 
  Star, Eye, Lock
} from "lucide-react";

export default function RecipeMatcher({ recipes = [], pantryIngredients = [], onViewRecipe }) {
  const normalizeIngredient = (ing) => ing.toLowerCase().trim();

  // Calculate recipe matches
  const recipeMatches = useMemo(() => {
    return recipes.map(recipe => {
      const recipeIngs = recipe.ingredients || [];
      const pantryIngsLower = pantryIngredients.map(p => normalizeIngredient(p.ingredient_name));

      // Find matching and missing ingredients
      const matchedCount = recipeIngs.filter(ing =>
        pantryIngsLower.some(pIng => pIng.includes(normalizeIngredient(ing.item)) || normalizeIngredient(ing.item).includes(pIng))
      ).length;

      const missingIngredients = recipeIngs.filter(ing =>
        !pantryIngsLower.some(pIng => pIng.includes(normalizeIngredient(ing.item)) || normalizeIngredient(ing.item).includes(pIng))
      );

      const matchPercentage = recipeIngs.length > 0 ? Math.round((matchedCount / recipeIngs.length) * 100) : 0;

      return {
        ...recipe,
        matchedCount,
        missingCount: missingIngredients.length,
        missingIngredients,
        matchPercentage,
        canMake: missingIngredients.length === 0
      };
    }).sort((a, b) => {
      // Sort by: canMake first, then by match percentage
      if (a.canMake !== b.canMake) return a.canMake ? -1 : 1;
      return b.matchPercentage - a.matchPercentage;
    });
  }, [recipes, pantryIngredients]);

  const canMakeCount = recipeMatches.filter(r => r.canMake).length;
  const almostReadyCount = recipeMatches.filter(r => !r.canMake && r.matchPercentage >= 75).length;

  if (pantryIngredients.length === 0) {
    return (
      <Alert className="bg-blue-50 border-blue-300">
        <ChefHat className="w-5 h-5 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>Start by adding ingredients to your pantry</strong> to see which recipes you can make!
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-4">
            <div className="text-center">
              <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-gray-900">{canMakeCount}</p>
              <p className="text-sm text-gray-600">Can Make Now</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-yellow-50 to-amber-50">
          <CardContent className="p-4">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-gray-900">{almostReadyCount}</p>
              <p className="text-sm text-gray-600">Almost Ready (75%+)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardContent className="p-4">
            <div className="text-center">
              <ChefHat className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-gray-900">{recipeMatches.length}</p>
              <p className="text-sm text-gray-600">Total Recipes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recipe List */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ChefHat className="w-6 h-6 text-orange-500" />
          Recipe Suggestions
        </h3>

        {recipeMatches.map(recipe => (
          <Card
            key={recipe.id}
            className={`border-none shadow-lg overflow-hidden transition-all ${
              recipe.canMake
                ? "bg-green-50/50 border-l-4 border-green-500"
                : "bg-white hover:shadow-xl"
            }`}
          >
            <CardContent className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-bold text-gray-900 line-clamp-2">
                    {recipe.name}
                  </h4>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge variant="outline" className="text-xs capitalize">
                      {recipe.meal_type}
                    </Badge>
                    <Badge className="text-xs bg-green-100 text-green-800 capitalize">
                      {recipe.food_preference}
                    </Badge>
                  </div>
                </div>

                {recipe.canMake && (
                  <Badge className="bg-green-600 text-white whitespace-nowrap flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Ready!
                  </Badge>
                )}
              </div>

              {/* Match Info */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-semibold text-gray-700">
                      Match: {recipe.matchedCount}/{recipe.ingredients?.length || 0}
                    </span>
                    <span className="text-sm font-bold text-orange-600">
                      {recipe.matchPercentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        recipe.canMake
                          ? "bg-green-500"
                          : recipe.matchPercentage >= 75
                          ? "bg-yellow-500"
                          : "bg-orange-500"
                      }`}
                      style={{ width: `${recipe.matchPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Recipe Details */}
              <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {(recipe.prep_time || 0) + (recipe.cook_time || 0)} min
                </div>
                <div className="flex items-center gap-1">
                  <Flame className="w-4 h-4" />
                  {recipe.calories} kcal
                </div>
                {recipe.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    {recipe.rating}
                  </div>
                )}
              </div>

              {/* Missing Ingredients */}
              {recipe.missingCount > 0 && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm font-semibold text-amber-900 mb-2">
                    🛒 Missing {recipe.missingCount} ingredient{recipe.missingCount > 1 ? 's' : ''}:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recipe.missingIngredients.map((ing, idx) => (
                      <Badge key={idx} variant="outline" className="bg-white border-amber-300">
                        {ing.item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => onViewRecipe(recipe)}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Recipe
                </Button>
                {!recipe.canMake && (
                  <Button
                    variant="outline"
                    className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-50"
                    disabled
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Get Items
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}