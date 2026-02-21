import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Search, Heart, Clock, Users, Flame, Star, Share2, 
  Plus, Loader2, Filter, ChefHat, TrendingUp 
} from "lucide-react";
import { format } from "date-fns";

export default function RecipeDiscovery({ clientId, clientEmail }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [personalNotes, setPersonalNotes] = useState("");
  const [mealTypeFilter, setMealTypeFilter] = useState("all");
  const [dietaryFilter, setDietaryFilter] = useState("all");
  const [cookTimeFilter, setCookTimeFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: recipes, isLoading } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => base44.entities.Recipe.filter({ is_published: true }),
    initialData: [],
  });

  const { data: favoriteRecipes } = useQuery({
    queryKey: ["favoriteRecipes", clientEmail],
    queryFn: () => 
      base44.entities.FavoriteRecipe.filter({ client_email: clientEmail }),
    enabled: !!clientEmail,
    initialData: [],
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (recipe) => {
      const existing = favoriteRecipes.find(f => f.recipe_id === recipe.id);
      if (existing) {
        await base44.entities.FavoriteRecipe.delete(existing.id);
        return { action: "removed" };
      } else {
        await base44.entities.FavoriteRecipe.create({
          client_email: clientEmail,
          recipe_id: recipe.id,
          recipe_name: recipe.name,
        });
        return { action: "added" };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favoriteRecipes"] });
    },
  });

  const rateRecipeMutation = useMutation({
    mutationFn: async (ratingData) => {
      const favorite = favoriteRecipes.find(f => f.recipe_id === selectedRecipe.id);
      if (favorite) {
        await base44.entities.FavoriteRecipe.update(favorite.id, ratingData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favoriteRecipes"] });
      setShowRatingDialog(false);
      setUserRating(0);
      setPersonalNotes("");
    },
  });

  const isFavorited = (recipe) => 
    favoriteRecipes.some(f => f.recipe_id === recipe.id);

  const getUserRating = (recipe) => {
    const fav = favoriteRecipes.find(f => f.recipe_id === recipe.id);
    return fav?.user_rating || 0;
  };

  // Advanced filtering
  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => {
      const matchesSearch = 
        recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.ingredients?.some(ing => 
          ing.item.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        recipe.tags?.some(tag => 
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesMealType = 
        mealTypeFilter === "all" || recipe.meal_type === mealTypeFilter;

      const matchesDietary = 
        dietaryFilter === "all" || 
        recipe.dietary_tags?.includes(dietaryFilter) ||
        recipe.tags?.some(tag => tag.toLowerCase() === dietaryFilter.toLowerCase());

      const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
      const matchesCookTime =
        cookTimeFilter === "all" ||
        (cookTimeFilter === "quick" && totalTime <= 30) ||
        (cookTimeFilter === "medium" && totalTime > 30 && totalTime <= 60) ||
        (cookTimeFilter === "long" && totalTime > 60);

      return matchesSearch && matchesMealType && matchesDietary && matchesCookTime;
    });
  }, [recipes, searchQuery, mealTypeFilter, dietaryFilter, cookTimeFilter]);

  const handleRateRecipe = () => {
    if (!selectedRecipe) return;
    
    const ratingData = {
      user_rating: userRating,
      ...(personalNotes && { personal_notes: personalNotes }),
      times_cooked: (favoriteRecipes.find(f => f.recipe_id === selectedRecipe.id)?.times_cooked || 0) + 1,
      last_cooked_date: format(new Date(), 'yyyy-MM-dd'),
    };

    rateRecipeMutation.mutate(ratingData);
  };

  const addToMealPlan = async (recipe) => {
    if (!clientId) return;
    // This would trigger a dialog to select which meal plan
    // For now, we'll show a message
    alert(`Recipe "${recipe.name}" can be added to your meal plan!`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
        <CardContent className="p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search recipes by name, ingredients, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Select value={mealTypeFilter} onValueChange={setMealTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Meal Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Meals</SelectItem>
                <SelectItem value="breakfast">Breakfast</SelectItem>
                <SelectItem value="lunch">Lunch</SelectItem>
                <SelectItem value="dinner">Dinner</SelectItem>
                <SelectItem value="snack">Snack</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dietaryFilter} onValueChange={setDietaryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Dietary" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Diets</SelectItem>
                <SelectItem value="vegan">Vegan</SelectItem>
                <SelectItem value="vegetarian">Vegetarian</SelectItem>
                <SelectItem value="gluten_free">Gluten-Free</SelectItem>
                <SelectItem value="high_protein">High Protein</SelectItem>
                <SelectItem value="low_carb">Low Carb</SelectItem>
              </SelectContent>
            </Select>

            <Select value={cookTimeFilter} onValueChange={setCookTimeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Cooking Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Times</SelectItem>
                <SelectItem value="quick">⚡ Quick (≤30 min)</SelectItem>
                <SelectItem value="medium">⏱️ Medium (30-60 min)</SelectItem>
                <SelectItem value="long">🕐 Long (&gt;60 min)</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-lg">
              <Filter className="w-4 h-4 text-blue-600 mr-2" />
              <span className="text-sm font-semibold text-gray-700">
                {filteredRecipes.length} recipes
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recipes Grid */}
      {filteredRecipes.length === 0 ? (
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <ChefHat className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No recipes found
            </h3>
            <p className="text-gray-600">Try adjusting your filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => {
            const isFav = isFavorited(recipe);
            const rating = getUserRating(recipe);
            
            return (
              <Card
                key={recipe.id}
                className="border-none shadow-lg hover:shadow-xl transition-all overflow-hidden group"
              >
                {recipe.image_url && (
                  <div className="h-48 overflow-hidden relative bg-gray-100">
                    <img
                      src={recipe.image_url}
                      alt={recipe.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <button
                      onClick={() => toggleFavoriteMutation.mutate(recipe)}
                      className={`absolute top-3 right-3 p-2 rounded-full transition-all ${
                        isFav
                          ? "bg-red-500 text-white"
                          : "bg-white/80 text-gray-700 hover:bg-white"
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${isFav ? "fill-current" : ""}`} />
                    </button>
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="text-lg line-clamp-2">
                    {recipe.name}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {recipe.meal_type}
                    </Badge>
                    <Badge className="text-xs bg-green-100 text-green-800 capitalize">
                      {recipe.food_preference}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {recipe.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {recipe.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{(recipe.prep_time || 0) + (recipe.cook_time || 0)} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Flame className="w-4 h-4" />
                      <span>{recipe.calories} kcal</span>
                    </div>
                  </div>

                  {/* Nutritional Info */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg text-xs">
                    <div className="text-center">
                      <p className="text-gray-600">Protein</p>
                      <p className="font-bold text-gray-900">{recipe.protein}g</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600">Carbs</p>
                      <p className="font-bold text-gray-900">{recipe.carbs}g</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600">Fats</p>
                      <p className="font-bold text-gray-900">{recipe.fats}g</p>
                    </div>
                  </div>

                  {/* User Rating */}
                  {isFav && rating > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg">
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-semibold text-gray-700">
                        {rating}.0
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-2">
                    <Button
                      onClick={() => setSelectedRecipe(recipe)}
                      className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                    >
                      View Details
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => {
                          setSelectedRecipe(recipe);
                          if (isFav) {
                            setShowRatingDialog(true);
                          } else {
                            toggleFavoriteMutation.mutate(recipe);
                          }
                        }}
                        variant={isFav ? "default" : "outline"}
                        className={isFav ? "bg-red-500 hover:bg-red-600" : ""}
                      >
                        <Heart className="w-4 h-4 mr-1" />
                        {isFav ? "Rated" : "Save"}
                      </Button>
                      <Button
                        onClick={() => addToMealPlan(recipe)}
                        variant="outline"
                        className="border-green-500 text-green-700 hover:bg-green-50"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Plan
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Recipe Detail Dialog */}
      {selectedRecipe && !showRatingDialog && (
        <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">{selectedRecipe.name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {selectedRecipe.image_url && (
                <img
                  src={selectedRecipe.image_url}
                  alt={selectedRecipe.name}
                  className="w-full h-64 object-cover rounded-lg"
                />
              )}

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{selectedRecipe.meal_type}</Badge>
                <Badge className="bg-green-100 text-green-800">
                  {selectedRecipe.food_preference}
                </Badge>
                {selectedRecipe.dietary_tags?.map(tag => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-blue-50 rounded text-center">
                  <p className="text-xs text-gray-600">Prep</p>
                  <p className="font-bold">{selectedRecipe.prep_time} min</p>
                </div>
                <div className="p-3 bg-orange-50 rounded text-center">
                  <p className="text-xs text-gray-600">Cook</p>
                  <p className="font-bold">{selectedRecipe.cook_time} min</p>
                </div>
                <div className="p-3 bg-green-50 rounded text-center">
                  <p className="text-xs text-gray-600">Servings</p>
                  <p className="font-bold">{selectedRecipe.servings}</p>
                </div>
                <div className="p-3 bg-red-50 rounded text-center">
                  <p className="text-xs text-gray-600">Calories</p>
                  <p className="font-bold">{selectedRecipe.calories}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-red-50 rounded text-center">
                  <p className="text-xs text-gray-600">Protein</p>
                  <p className="text-xl font-bold text-red-600">{selectedRecipe.protein}g</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded text-center">
                  <p className="text-xs text-gray-600">Carbs</p>
                  <p className="text-xl font-bold text-yellow-600">{selectedRecipe.carbs}g</p>
                </div>
                <div className="p-3 bg-purple-50 rounded text-center">
                  <p className="text-xs text-gray-600">Fats</p>
                  <p className="text-xl font-bold text-purple-600">{selectedRecipe.fats}g</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold mb-2">Ingredients</h4>
                <ul className="space-y-1">
                  {selectedRecipe.ingredients?.map((ing, i) => (
                    <li key={i} className="text-sm text-gray-700">
                      • {ing.item} - {ing.quantity}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-bold mb-2">Instructions</h4>
                <ol className="space-y-2">
                  {selectedRecipe.instructions?.map((step, i) => (
                    <li key={i} className="text-sm text-gray-700">
                      <span className="font-semibold">Step {i + 1}:</span> {step}
                    </li>
                  ))}
                </ol>
              </div>

              <Button
                onClick={() => {
                  setShowRatingDialog(true);
                  if (!isFavorited(selectedRecipe)) {
                    toggleFavoriteMutation.mutate(selectedRecipe);
                  }
                }}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                <Star className="w-4 h-4 mr-2" />
                Rate This Recipe
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Rating Dialog */}
      {showRatingDialog && selectedRecipe && (
        <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Rate "{selectedRecipe.name}"</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3">How did you like it?</p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setUserRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= userRating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Personal Notes (Optional)
                </label>
                <textarea
                  value={personalNotes}
                  onChange={(e) => setPersonalNotes(e.target.value)}
                  placeholder="Write your thoughts about this recipe..."
                  className="w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowRatingDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRateRecipe}
                  disabled={userRating === 0 || rateRecipeMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                >
                  {rateRecipeMutation.isPending ? "Saving..." : "Save Rating"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}