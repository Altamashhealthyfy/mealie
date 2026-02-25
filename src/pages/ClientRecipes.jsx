import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChefHat, Search, Heart, ShoppingCart, Sparkles,
  Star, Clock, Flame, Users, Loader2, Download,
  Eye, BookOpen, X, Calendar
} from "lucide-react";
import PantryManager from "@/components/recipes/PantryManager";
import AuthenticatedImage from "@/components/common/AuthenticatedImage";
import RecipeMatcher from "@/components/recipes/RecipeMatcher";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function RecipeCard({ recipe, isFav, onView, onDownload, onToggleFav, toggling }) {
  const [imgError, setImgError] = React.useState(false);
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const mealTypeColors = {
    breakfast: 'bg-yellow-100 text-yellow-700',
    lunch: 'bg-green-100 text-green-700',
    dinner: 'bg-blue-100 text-blue-700',
    snack: 'bg-purple-100 text-purple-700',
    post_dinner: 'bg-pink-100 text-pink-700',
  };
  const showImage = recipe.image_url && !imgError;
  return (
    <Card className="border-none shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden group cursor-pointer" onClick={onView}>
      <div className="h-36 overflow-hidden bg-gradient-to-br from-orange-100 to-amber-100 relative">
        {showImage && (
          <img
            src={recipe.image_url}
            alt={recipe.name}
            crossOrigin="use-credentials"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
        {!showImage && (
          <div className="w-full h-full flex items-center justify-center">
            <ChefHat className="w-12 h-12 text-orange-300" />
          </div>
        )}
        {/* Favourite Toggle Button */}
        <button
          onClick={e => { e.stopPropagation(); onToggleFav(recipe); }}
          disabled={toggling}
          className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-all ${isFav ? 'bg-red-500' : 'bg-white/90 hover:bg-red-50'}`}
        >
          {toggling ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
          ) : (
            <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-white text-white' : 'text-red-400'}`} />
          )}
        </button>
        {recipe.meal_type && (
          <div className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold ${mealTypeColors[recipe.meal_type] || 'bg-gray-100 text-gray-600'}`}>
            {recipe.meal_type}
          </div>
        )}
      </div>

      <CardContent className="p-3">
        <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-2 leading-tight">{recipe.name}</h3>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          {totalTime > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{totalTime}m</span>}
          {recipe.nutritional_info?.calories && <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" />{recipe.nutritional_info.calories} kcal</span>}
          {recipe.servings && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{recipe.servings}</span>}
        </div>
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMealType, setFilterMealType] = useState("");
  const [togglingId, setTogglingId] = useState(null);

  const queryClient = useQueryClient();

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
    queryFn: () => base44.entities.PantryIngredient.filter({ client_email: user?.email }),
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: favoriteRecipes } = useQuery({
    queryKey: ["favoriteRecipes", user?.email],
    queryFn: () => base44.entities.FavoriteRecipe.filter({ client_email: user?.email }),
    enabled: !!user?.email,
    initialData: [],
  });

  // Fetch assigned meal plan for this client
  const { data: assignedMealPlan } = useQuery({
    queryKey: ["assignedMealPlan", clientProfile?.id],
    queryFn: async () => {
      const plans = await base44.entities.MealPlan.filter({ client_id: clientProfile?.id, active: true });
      return plans[0] || null;
    },
    enabled: !!clientProfile?.id,
  });

  // Toggle favourite mutation
  const toggleFavMutation = useMutation({
    mutationFn: async (recipe) => {
      const existing = favoriteRecipes.find(f => f.recipe_id === recipe.id);
      if (existing) {
        await base44.entities.FavoriteRecipe.delete(existing.id);
      } else {
        await base44.entities.FavoriteRecipe.create({
          client_email: user.email,
          recipe_id: recipe.id,
          recipe_name: recipe.name,
        });
      }
    },
    onMutate: (recipe) => setTogglingId(recipe.id),
    onSettled: () => {
      setTogglingId(null);
      queryClient.invalidateQueries({ queryKey: ["favoriteRecipes", user?.email] });
    },
  });

  const favoriteRecipeIds = favoriteRecipes.map(f => f.recipe_id);
  const favoriteRecipesList = recipes.filter(r => favoriteRecipeIds.includes(r.id));

  const isFavorited = (recipe) => favoriteRecipeIds.includes(recipe.id);

  // Build meal plan recipes: extract meal names from assigned plan and match to recipes
  const mealPlanRecipes = React.useMemo(() => {
    if (!assignedMealPlan?.meals || recipes.length === 0) return [];
    const mealNames = [...new Set(assignedMealPlan.meals.map(m => m.meal_name?.toLowerCase().trim()).filter(Boolean))];
    return recipes.filter(r => mealNames.some(mn => r.name?.toLowerCase().includes(mn) || mn.includes(r.name?.toLowerCase())));
  }, [assignedMealPlan, recipes]);

  const mealTypes = [...new Set(recipes.map(r => r.meal_type).filter(Boolean))];
  const filteredRecipes = recipes.filter(r => {
    const matchesSearch = !searchQuery || r.name?.toLowerCase().includes(searchQuery.toLowerCase()) || r.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMealType = !filterMealType || r.meal_type === filterMealType;
    return matchesSearch && matchesMealType;
  });

  const downloadRecipe = (recipe) => {
    const content = `${recipe.name}\n\n${recipe.description || ''}\n\nMeal Type: ${recipe.meal_type}\nPrep: ${recipe.prep_time || 0} min | Cook: ${recipe.cook_time || 0} min | Servings: ${recipe.servings || '-'}\n\nINGREDIENTS\n${recipe.ingredients?.map((ing, i) => `${i + 1}. ${ing.item} - ${ing.quantity} ${ing.unit || ''}`).join('\n') || 'N/A'}\n\nINSTRUCTIONS\n${recipe.instructions?.map((step, i) => `Step ${i + 1}: ${step}`).join('\n') || 'N/A'}`;
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

  const cardProps = (recipe) => ({
    recipe,
    isFav: isFavorited(recipe),
    onView: () => setSelectedRecipe(recipe),
    onDownload: () => downloadRecipe(recipe),
    onToggleFav: (r) => toggleFavMutation.mutate(r),
    toggling: togglingId === recipe.id,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
      {/* Header */}
      <div className="bg-white border-b border-orange-100 px-4 md:px-8 py-4 md:py-5">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 mb-1">
            <ChefHat className="w-7 h-7 text-orange-500" />
            Recipe Library
          </h1>
          <p className="text-gray-500 text-sm">Discover healthy recipes tailored for you</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full bg-white shadow-sm border">
            <TabsTrigger value="library" className="flex items-center gap-1 text-xs sm:text-sm data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <BookOpen className="w-3.5 h-3.5" /> <span className="hidden sm:inline">All</span>
              {recipes.length > 0 && <span className="text-xs">({recipes.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="mealplan" className="flex items-center gap-1 text-xs sm:text-sm data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <Calendar className="w-3.5 h-3.5" /> <span className="hidden sm:inline">My Plan</span>
              {mealPlanRecipes.length > 0 && <span className="text-xs">({mealPlanRecipes.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="pantry" className="flex items-center gap-1 text-xs sm:text-sm data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <ShoppingCart className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Pantry</span>
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex items-center gap-1 text-xs sm:text-sm data-[state=active]:bg-green-500 data-[state=active]:text-white">
              <Sparkles className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Smart</span>
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-1 text-xs sm:text-sm data-[state=active]:bg-red-500 data-[state=active]:text-white">
              <Heart className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Saved</span>
              {favoriteRecipes.length > 0 && <span className="text-xs">({favoriteRecipes.length})</span>}
            </TabsTrigger>
          </TabsList>

          {/* All Recipes */}
          <TabsContent value="library" className="space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Search recipes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-white border-gray-200" />
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
                    {mt ? mt.charAt(0).toUpperCase() + mt.slice(1).replace('_', ' ') : 'All Types'}
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
                {filteredRecipes.map((recipe) => <RecipeCard key={recipe.id} {...cardProps(recipe)} />)}
              </div>
            )}
          </TabsContent>

          {/* My Meal Plan Recipes */}
          <TabsContent value="mealplan" className="space-y-4 mt-4">
            {!assignedMealPlan ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-14 h-14 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No meal plan assigned</h3>
                  <p className="text-gray-500">Your coach hasn't assigned a meal plan yet.</p>
                </CardContent>
              </Card>
            ) : mealPlanRecipes.length === 0 ? (
              <div className="space-y-4">
                <Card className="border-none shadow-sm bg-orange-50 border border-orange-200">
                  <CardContent className="p-4">
                    <p className="font-semibold text-orange-800">{assignedMealPlan.name}</p>
                    <p className="text-sm text-orange-600 mt-1">{assignedMealPlan.meals?.length || 0} meals in your plan</p>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-lg">
                  <CardContent className="p-12 text-center">
                    <ChefHat className="w-14 h-14 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No matching recipes found</h3>
                    <p className="text-gray-500 text-sm">Recipes from your meal plan aren't in the library yet.</p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-4">
                <Card className="border-none shadow-sm bg-orange-50 border border-orange-200">
                  <CardContent className="p-4">
                    <p className="font-semibold text-orange-800">{assignedMealPlan.name}</p>
                    <p className="text-sm text-orange-600 mt-1">{mealPlanRecipes.length} recipes from your plan</p>
                  </CardContent>
                </Card>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {mealPlanRecipes.map((recipe) => <RecipeCard key={recipe.id} {...cardProps(recipe)} />)}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Pantry Tab */}
          <TabsContent value="pantry" className="space-y-6 mt-4">
            <PantryManager clientEmail={user?.email} recipes={recipes} />
          </TabsContent>

          {/* Smart Suggestions Tab */}
          <TabsContent value="suggestions" className="space-y-6 mt-4">
            <RecipeMatcher recipes={recipes} pantryIngredients={pantryIngredients} onViewRecipe={setSelectedRecipe} />
          </TabsContent>

          {/* Saved / Favourites Tab */}
          <TabsContent value="favorites" className="space-y-4 mt-4">
            {favoriteRecipesList.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <Heart className="w-14 h-14 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No saved recipes yet</h3>
                  <p className="text-gray-500">Tap the ❤️ on any recipe to save it here!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {favoriteRecipesList.map((recipe) => <RecipeCard key={recipe.id} {...cardProps(recipe)} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Recipe Detail Dialog */}
        {selectedRecipe && (
          <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center justify-between pr-6">
                  <span className="line-clamp-2">{selectedRecipe.name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      onClick={() => toggleFavMutation.mutate(selectedRecipe)}
                      disabled={togglingId === selectedRecipe.id}
                      variant="outline"
                      size="sm"
                      className={isFavorited(selectedRecipe) ? 'border-red-300 text-red-500 hover:bg-red-50' : 'border-gray-200'}
                    >
                      <Heart className={`w-4 h-4 mr-1 ${isFavorited(selectedRecipe) ? 'fill-red-500 text-red-500' : ''}`} />
                      {isFavorited(selectedRecipe) ? 'Saved' : 'Save'}
                    </Button>
                    <Button onClick={() => downloadRecipe(selectedRecipe)} variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-1" /> Download
                    </Button>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5">
                {selectedRecipe.image_url && (
                  <div className="w-full h-56 rounded-xl overflow-hidden bg-gradient-to-br from-orange-100 to-amber-100">
                    <img
                      src={selectedRecipe.image_url}
                      alt={selectedRecipe.name}
                      className="w-full h-full object-cover"
                      crossOrigin="use-credentials"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                )}

                {selectedRecipe.description && <p className="text-gray-700 leading-relaxed">{selectedRecipe.description}</p>}

                <div className="flex flex-wrap gap-2">
                  {selectedRecipe.meal_type && <Badge className="bg-orange-100 text-orange-700 capitalize">{selectedRecipe.meal_type}</Badge>}
                  {selectedRecipe.food_preference && <Badge className="bg-green-100 text-green-700 capitalize">{selectedRecipe.food_preference}</Badge>}
                  {selectedRecipe.regional_cuisine && <Badge variant="outline" className="capitalize">{selectedRecipe.regional_cuisine}</Badge>}
                  {selectedRecipe.dietary_tags?.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 bg-blue-50 rounded-xl text-center"><Clock className="w-5 h-5 mx-auto text-blue-600 mb-1" /><p className="text-xs text-gray-500">Prep</p><p className="text-base font-bold">{selectedRecipe.prep_time || 0}m</p></div>
                  <div className="p-3 bg-orange-50 rounded-xl text-center"><Clock className="w-5 h-5 mx-auto text-orange-600 mb-1" /><p className="text-xs text-gray-500">Cook</p><p className="text-base font-bold">{selectedRecipe.cook_time || 0}m</p></div>
                  <div className="p-3 bg-green-50 rounded-xl text-center"><Users className="w-5 h-5 mx-auto text-green-600 mb-1" /><p className="text-xs text-gray-500">Serves</p><p className="text-base font-bold">{selectedRecipe.servings || '-'}</p></div>
                  <div className="p-3 bg-red-50 rounded-xl text-center"><Flame className="w-5 h-5 mx-auto text-red-600 mb-1" /><p className="text-xs text-gray-500">Kcal</p><p className="text-base font-bold">{selectedRecipe.nutritional_info?.calories || '-'}</p></div>
                </div>

                {(selectedRecipe.nutritional_info?.protein || selectedRecipe.nutritional_info?.carbs || selectedRecipe.nutritional_info?.fats) && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-red-50 rounded-xl"><p className="text-xs text-gray-500 mb-0.5">Protein</p><p className="text-xl font-bold text-red-600">{selectedRecipe.nutritional_info?.protein || 0}g</p></div>
                    <div className="p-3 bg-yellow-50 rounded-xl"><p className="text-xs text-gray-500 mb-0.5">Carbs</p><p className="text-xl font-bold text-yellow-600">{selectedRecipe.nutritional_info?.carbs || 0}g</p></div>
                    <div className="p-3 bg-purple-50 rounded-xl"><p className="text-xs text-gray-500 mb-0.5">Fats</p><p className="text-xl font-bold text-purple-600">{selectedRecipe.nutritional_info?.fats || 0}g</p></div>
                  </div>
                )}

                {selectedRecipe.ingredients?.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Ingredients</h3>
                    <div className="space-y-2">
                      {selectedRecipe.ingredients.map((ing, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                          <span className="text-gray-700 text-sm">{ing.item}</span>
                          <Badge variant="secondary" className="text-xs">{ing.quantity} {ing.unit || ''}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedRecipe.instructions?.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Instructions</h3>
                    <ol className="space-y-3">
                      {selectedRecipe.instructions.map((step, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="flex-shrink-0 w-7 h-7 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-xs">{i + 1}</span>
                          <p className="text-gray-700 leading-relaxed pt-0.5 text-sm">{step}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}