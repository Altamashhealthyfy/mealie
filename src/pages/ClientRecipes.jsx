import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ChefHat, Search, Heart, ShoppingCart, Sparkles, 
  Star, Clock, Flame, Users, Loader2, Download, 
  Eye, AlertCircle, BookOpen, Filter, X
} from "lucide-react";
import PantryManager from "@/components/recipes/PantryManager";
import RecipeMatcher from "@/components/recipes/RecipeMatcher";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function RecipeCard({ recipe, isFav, rating, personalNotes, timesCocked, onView, onDownload }) {
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const mealTypeColors = {
    breakfast: 'bg-yellow-100 text-yellow-700',
    lunch: 'bg-green-100 text-green-700',
    dinner: 'bg-blue-100 text-blue-700',
    snack: 'bg-purple-100 text-purple-700',
    post_dinner: 'bg-pink-100 text-pink-700',
  };
  return (
    <Card className="border-none shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden group cursor-pointer" onClick={onView}>
      {/* Image / Placeholder */}
      <div className="h-36 overflow-hidden bg-gradient-to-br from-orange-100 to-amber-100 relative">
        {recipe.image_url ? (
          <img src={recipe.image_url} alt={recipe.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ChefHat className="w-12 h-12 text-orange-300" />
          </div>
        )}
        {isFav && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center shadow-sm">
            <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
          </div>
        )}
        {recipe.meal_type && (
          <div className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold ${mealTypeColors[recipe.meal_type] || 'bg-gray-100 text-gray-600'}`}>
            {recipe.meal_type}
          </div>
        )}
      </div>

      <CardContent className="p-3">
        <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-2 leading-tight">{recipe.name}</h3>
        
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          {totalTime > 0 && (
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{totalTime}m</span>
          )}
          {recipe.nutritional_info?.calories && (
            <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" />{recipe.nutritional_info.calories} kcal</span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{recipe.servings}</span>
          )}
        </div>

        {rating > 0 && (
          <div className="flex gap-0.5 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-3 h-3 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
            ))}
          </div>
        )}

        <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
          <Button onClick={onView} size="sm" className="flex-1 h-7 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-lg">
            <Eye className="w-3 h-3 mr-1" /> View
          </Button>
          <Button onClick={onDownload} size="sm" variant="outline" className="h-7 w-7 p-0 rounded-lg border-gray-200">
            <Download className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ClientRecipes() {
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [activeTab, setActiveTab] = useState("library");
  const [userRating, setUserRating] = useState(0);
  const [personalNotes, setPersonalNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMealType, setFilterMealType] = useState("");

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
    queryKey: ["recipes"],
    queryFn: () => base44.entities.Recipe.filter({ is_published: true }),
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

  const mealTypes = [...new Set(recipes.map(r => r.meal_type).filter(Boolean))];
  const filteredRecipes = recipes.filter(r => {
    const matchesSearch = !searchQuery || r.name?.toLowerCase().includes(searchQuery.toLowerCase()) || r.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMealType = !filterMealType || r.meal_type === filterMealType;
    return matchesSearch && matchesMealType;
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
      {/* Header */}
      <div className="bg-white border-b border-orange-100 px-4 md:px-8 py-4 md:py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 mb-1">
            <ChefHat className="w-7 h-7 text-orange-500" />
            Recipe Library
          </h1>
          <p className="text-gray-500 text-sm">Discover healthy recipes tailored for you</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <TabsList className="grid grid-cols-4 w-full sm:w-auto bg-white shadow-sm border">
              <TabsTrigger value="library" className="flex items-center gap-1.5 text-xs sm:text-sm data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                <BookOpen className="w-3.5 h-3.5" /> All
                {recipes.length > 0 && <span className="text-xs">({recipes.length})</span>}
              </TabsTrigger>
              <TabsTrigger value="pantry" className="flex items-center gap-1.5 text-xs sm:text-sm data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                <ShoppingCart className="w-3.5 h-3.5" /> Pantry
              </TabsTrigger>
              <TabsTrigger value="suggestions" className="flex items-center gap-1.5 text-xs sm:text-sm data-[state=active]:bg-green-500 data-[state=active]:text-white">
                <Sparkles className="w-3.5 h-3.5" /> Smart
              </TabsTrigger>
              <TabsTrigger value="favorites" className="flex items-center gap-1.5 text-xs sm:text-sm data-[state=active]:bg-red-500 data-[state=active]:text-white">
                <Heart className="w-3.5 h-3.5" /> Saved
                {favoriteRecipes.length > 0 && <span className="text-xs">({favoriteRecipes.length})</span>}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* All Recipes / Library Tab */}
          <TabsContent value="library" className="space-y-4 mt-4">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search recipes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white border-gray-200"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {['', ...mealTypes].map(mt => (
                  <button key={mt || 'all'} onClick={() => setFilterMealType(mt)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterMealType === mt ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}>
                    {mt ? mt.charAt(0).toUpperCase() + mt.slice(1) : 'All Types'}
                  </button>
                ))}
              </div>
            </div>

            {filteredRecipes.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <Search className="w-14 h-14 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No recipes found</h3>
                  <p className="text-gray-500 text-sm">{searchQuery ? 'Try a different search term' : 'No recipes available yet'}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredRecipes.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} isFav={isFavorited(recipe)} onView={() => setSelectedRecipe(recipe)} onDownload={() => downloadRecipe(recipe)} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Pantry Tab */}
          <TabsContent value="pantry" className="space-y-6 mt-4">
            <PantryManager clientEmail={user?.email} recipes={recipes} />
          </TabsContent>

          {/* Recipe Suggestions Tab */}
          <TabsContent value="suggestions" className="space-y-6 mt-4">
            <RecipeMatcher
              recipes={recipes}
              pantryIngredients={pantryIngredients}
              onViewRecipe={setSelectedRecipe}
            />
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value="favorites" className="space-y-4 mt-4">
            {favoriteRecipesList.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <Heart className="w-14 h-14 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No saved recipes yet</h3>
                  <p className="text-gray-500">Browse the library and save your favorites!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {favoriteRecipesList.map((recipe) => {
                  const rating = getUserRating(recipe);
                  const favorite = favoriteRecipes.find(f => f.recipe_id === recipe.id);
                  return (
                    <RecipeCard key={recipe.id} recipe={recipe} isFav={true} rating={rating} personalNotes={favorite?.personal_notes} timesCocked={favorite?.times_cooked} onView={() => setSelectedRecipe(recipe)} onDownload={() => downloadRecipe(recipe)} />
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
                        <Badge variant="secondary">{ing.quantity}</Badge>
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