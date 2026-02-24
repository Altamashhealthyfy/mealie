import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ChefHat, Search, Heart, ShoppingCart, Sparkles, 
  Star, Clock, Flame, Users, Loader2, Download, 
  Eye, AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import PantryManager from "@/components/recipes/PantryManager";
import RecipeMatcher from "@/components/recipes/RecipeMatcher";
import RecipeRecommendationEngine from "@/components/recipes/RecipeRecommendationEngine";
import RecipeFilterPanel from "@/components/recipes/RecipeFilterPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ClientRecipes() {
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [activeTab, setActiveTab] = useState("recommendations");
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [personalNotes, setPersonalNotes] = useState("");
  const [filters, setFilters] = useState({
    cuisines: [],
    dietaryTags: [],
    mealTypes: [],
  });

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: clientProfile } = useQuery({
    queryKey: ["clientProfile", user?.email],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ email: user?.email });
      return clients[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: recipes, isLoading: recipesLoading } = useQuery({
    queryKey: ["recipes", clientProfile?.id],
    queryFn: async () => {
      // Get published recipes and coach-assigned recipes
      const allRecipes = await base44.entities.Recipe.list();
      return allRecipes.filter(r => r.is_published === true || r.is_published !== false);
    },
    enabled: !!clientProfile?.id,
    initialData: [],
  });

  const { data: pantryIngredients } = useQuery({
    queryKey: ["pantry", user?.email],
    queryFn: () =>
      base44.entities.PantryIngredient.filter({ client_email: user?.email }),
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: favoriteRecipes } = useQuery({
    queryKey: ["favoriteRecipes", user?.email],
    queryFn: () =>
      base44.entities.FavoriteRecipe.filter({ client_email: user?.email }),
    enabled: !!user?.email,
    initialData: [],
  });

  const favoriteRecipeIds = favoriteRecipes.map(f => f.recipe_id);
  const favoriteRecipesList = recipes.filter(r => favoriteRecipeIds.includes(r.id));

  const isFavorited = (recipe) => favoriteRecipeIds.includes(recipe.id);
  
  const getUserRating = (recipe) => {
    const fav = favoriteRecipes.find(f => f.recipe_id === recipe.id);
    return fav?.user_rating || 0;
  };

  // Apply filters to recipes
  const filteredRecipes = recipes.filter(recipe => {
    // Cuisine filter
    if (filters.cuisines.length > 0 && !filters.cuisines.includes(recipe.regional_cuisine)) {
      return false;
    }

    // Meal type filter
    if (filters.mealTypes.length > 0 && !filters.mealTypes.includes(recipe.meal_type)) {
      return false;
    }

    // Dietary tags filter - recipe must match ALL selected dietary tags
    if (filters.dietaryTags.length > 0) {
      const recipeTags = recipe.dietary_tags || [];
      const hasAllTags = filters.dietaryTags.every(tag =>
        recipeTags.includes(tag)
      );
      if (!hasAllTags) return false;
    }

    return true;
  });

  const downloadRecipe = (recipe) => {
    const content = `
╔══════════════════════════════════════════════════════════════╗
║                      ${recipe.name.toUpperCase()}                      
╚══════════════════════════════════════════════════════════════╝

${recipe.description || ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 RECIPE DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🍽️  Meal Type: ${recipe.meal_type.toUpperCase()}
🥗  Food Preference: ${recipe.food_preference.toUpperCase()}
🌍  Regional Cuisine: ${recipe.regional_cuisine.toUpperCase()}

⏱️  Prep Time: ${recipe.prep_time} minutes
🔥  Cook Time: ${recipe.cook_time} minutes
⏰  Total Time: ${(recipe.prep_time || 0) + (recipe.cook_time || 0)} minutes
👥  Servings: ${recipe.servings}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 NUTRITIONAL INFORMATION (Per Serving)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 Calories: ${recipe.calories} kcal
💪 Protein: ${recipe.protein}g
🌾 Carbs: ${recipe.carbs}g
🥑 Fats: ${recipe.fats}g

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛒 INGREDIENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${recipe.ingredients?.map((ing, i) => `${i + 1}. ${ing.item} - ${ing.quantity}`).join('\n') || 'No ingredients listed'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👨‍🍳 INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${recipe.instructions?.map((step, i) => `Step ${i + 1}:\n${step}\n`).join('\n') || 'No instructions provided'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Enjoy your cooking! 🍽️✨
`.trim();

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${recipe.name.replace(/[^a-zA-Z0-9]/g, "_")}_Recipe.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (userLoading || recipesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!clientProfile) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-orange-500" />
              Profile Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">
              Please complete your profile setup to access recipes.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <ChefHat className="w-8 h-8 text-orange-500" />
              Recipe Discovery
            </h1>
            <p className="text-gray-600">
              Discover what you can cook with ingredients you have
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full md:w-auto">
            <TabsTrigger
              value="recommendations"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI Picks
            </TabsTrigger>
            <TabsTrigger
              value="pantry"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Pantry ({pantryIngredients.length})
            </TabsTrigger>
            <TabsTrigger
              value="suggestions"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white"
            >
              <Search className="w-4 h-4 mr-2" />
              Browse
            </TabsTrigger>
            <TabsTrigger
              value="favorites"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
            >
              <Heart className="w-4 h-4 mr-2" />
              Favorites ({favoriteRecipes.length})
            </TabsTrigger>
          </TabsList>

          {/* Pantry Tab */}
          <TabsContent value="pantry" className="space-y-6 mt-6">
            <PantryManager clientEmail={user?.email} recipes={recipes} />
          </TabsContent>

          {/* Recipe Suggestions Tab */}
          <TabsContent value="suggestions" className="space-y-6 mt-6">
            <RecipeMatcher
              recipes={recipes}
              pantryIngredients={pantryIngredients}
              onViewRecipe={setSelectedRecipe}
            />
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value="favorites" className="space-y-6 mt-6">
            {favoriteRecipesList.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <Heart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No favorite recipes yet
                  </h3>
                  <p className="text-gray-600">
                    Start saving your favorite recipes from the suggestions!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteRecipesList.map((recipe) => {
                  const rating = getUserRating(recipe);
                  const favorite = favoriteRecipes.find(f => f.recipe_id === recipe.id);

                  return (
                    <Card
                      key={recipe.id}
                      className="border-none shadow-lg hover:shadow-xl transition-all overflow-hidden"
                    >
                      {recipe.image_url && (
                        <div className="h-48 overflow-hidden bg-gray-100">
                          <img
                            src={recipe.image_url}
                            alt={recipe.name}
                            className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                          />
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
                        {/* User Rating */}
                        {rating > 0 && (
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

                        {/* Personal Notes */}
                        {favorite?.personal_notes && (
                          <p className="text-sm text-gray-600 italic p-3 bg-gray-50 rounded-lg">
                            "{favorite.personal_notes}"
                          </p>
                        )}

                        {/* Recipe Stats */}
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {(recipe.prep_time || 0) + (recipe.cook_time || 0)} min
                          </div>
                          <div className="flex items-center gap-1">
                            <Flame className="w-4 h-4" />
                            {recipe.calories} kcal
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {recipe.servings}
                          </div>
                        </div>

                        {favorite?.times_cooked > 0 && (
                          <Badge className="bg-purple-100 text-purple-800">
                            🍳 Cooked {favorite.times_cooked} time{favorite.times_cooked > 1 ? 's' : ''}
                          </Badge>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button
                            onClick={() => setSelectedRecipe(recipe)}
                            className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                          <Button
                            onClick={() => downloadRecipe(recipe)}
                            variant="outline"
                            className="flex-1"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Recipe Detail Dialog */}
        {selectedRecipe && (
          <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center justify-between">
                  <span>{selectedRecipe.name}</span>
                  <Button
                    onClick={() => downloadRecipe(selectedRecipe)}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {selectedRecipe.image_url && (
                  <div className="w-full h-64 rounded-xl overflow-hidden border-2 border-gray-200">
                    <img
                      src={selectedRecipe.image_url}
                      alt={selectedRecipe.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {selectedRecipe.description && (
                  <p className="text-gray-700 leading-relaxed">
                    {selectedRecipe.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-orange-100 text-orange-700 capitalize">
                    {selectedRecipe.meal_type}
                  </Badge>
                  <Badge className="bg-green-100 text-green-700 capitalize">
                    {selectedRecipe.food_preference}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {selectedRecipe.regional_cuisine}
                  </Badge>
                  {selectedRecipe.dietary_tags?.map(tag => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 rounded-xl text-center">
                    <Clock className="w-6 h-6 mx-auto text-blue-600 mb-2" />
                    <p className="text-sm text-gray-600">Prep</p>
                    <p className="text-lg font-bold">{selectedRecipe.prep_time} min</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-xl text-center">
                    <Clock className="w-6 h-6 mx-auto text-orange-600 mb-2" />
                    <p className="text-sm text-gray-600">Cook</p>
                    <p className="text-lg font-bold">{selectedRecipe.cook_time} min</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl text-center">
                    <Users className="w-6 h-6 mx-auto text-green-600 mb-2" />
                    <p className="text-sm text-gray-600">Servings</p>
                    <p className="text-lg font-bold">{selectedRecipe.servings}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-xl text-center">
                    <Flame className="w-6 h-6 mx-auto text-red-600 mb-2" />
                    <p className="text-sm text-gray-600">Calories</p>
                    <p className="text-lg font-bold">{selectedRecipe.calories}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-red-50 rounded-xl">
                    <p className="text-sm text-gray-600 mb-1">Protein</p>
                    <p className="text-2xl font-bold text-red-600">{selectedRecipe.protein}g</p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-xl">
                    <p className="text-sm text-gray-600 mb-1">Carbs</p>
                    <p className="text-2xl font-bold text-yellow-600">{selectedRecipe.carbs}g</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-xl">
                    <p className="text-sm text-gray-600 mb-1">Fats</p>
                    <p className="text-2xl font-bold text-purple-600">{selectedRecipe.fats}g</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Ingredients</h3>
                  <div className="space-y-2">
                    {selectedRecipe.ingredients?.map((ing, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">{ing.item}</span>
                        <Badge variant="secondary">{String(ing.quantity || '')} {ing.unit || ''}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Instructions</h3>
                  <ol className="space-y-3">
                    {selectedRecipe.instructions?.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold">
                          {i + 1}
                        </span>
                        <p className="text-gray-700 leading-relaxed pt-1">{step}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}