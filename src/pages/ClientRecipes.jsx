import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ChefHat, Heart, Search, Plus, Clock, Users, Flame, 
  TrendingUp, Star, BookOpen, Loader2, AlertCircle, Eye, X 
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ClientRecipes() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [mealTypeFilter, setMealTypeFilter] = useState("all");
  const [foodPrefFilter, setFoodPrefFilter] = useState("all");
  const [viewingRecipe, setViewingRecipe] = useState(null);
  const [showAddRecipeDialog, setShowAddRecipeDialog] = useState(false);
  const [newRecipe, setNewRecipe] = useState({
    name: "",
    description: "",
    meal_type: "lunch",
    food_preference: "veg",
    regional_cuisine: "north",
    ingredients: [{ item: "", quantity: "" }],
    instructions: [""],
    prep_time: "",
    cook_time: "",
    servings: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    tags: ""
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['clientProfile', user?.email],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ email: user?.email });
      return clients[0] || null;
    },
    enabled: !!user,
  });

  const { data: recipes } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => base44.entities.Recipe.list('-created_date'),
    initialData: [],
  });

  const { data: favorites } = useQuery({
    queryKey: ['favoriteRecipes', clientProfile?.id],
    queryFn: () => base44.entities.FavoriteRecipe.filter({ client_id: clientProfile?.id }),
    enabled: !!clientProfile?.id,
    initialData: [],
  });

  const { data: mealPlan } = useQuery({
    queryKey: ['activeMealPlan', clientProfile?.id],
    queryFn: async () => {
      const plans = await base44.entities.MealPlan.filter({ 
        client_id: clientProfile?.id,
        active: true 
      });
      return plans[0] || null;
    },
    enabled: !!clientProfile?.id,
  });

  const addFavoriteMutation = useMutation({
    mutationFn: (recipe) => base44.entities.FavoriteRecipe.create({
      client_id: clientProfile.id,
      recipe_id: recipe.id,
      recipe_name: recipe.name
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['favoriteRecipes']);
      alert("❤️ Added to favorites!");
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: (favoriteId) => base44.entities.FavoriteRecipe.delete(favoriteId),
    onSuccess: () => {
      queryClient.invalidateQueries(['favoriteRecipes']);
      alert("🗑️ Removed from favorites");
    },
  });

  const createRecipeMutation = useMutation({
    mutationFn: (recipeData) => base44.entities.Recipe.create(recipeData),
    onSuccess: () => {
      queryClient.invalidateQueries(['recipes']);
      setShowAddRecipeDialog(false);
      setNewRecipe({
        name: "",
        description: "",
        meal_type: "lunch",
        food_preference: "veg",
        regional_cuisine: "north",
        ingredients: [{ item: "", quantity: "" }],
        instructions: [""],
        prep_time: "",
        cook_time: "",
        servings: "",
        calories: "",
        protein: "",
        carbs: "",
        fats: "",
        tags: ""
      });
      alert("✅ Recipe created successfully!");
    },
  });

  const isFavorite = (recipeId) => {
    return favorites.some(f => f.recipe_id === recipeId);
  };

  const getFavoriteId = (recipeId) => {
    return favorites.find(f => f.recipe_id === recipeId)?.id;
  };

  const toggleFavorite = (recipe) => {
    if (isFavorite(recipe.id)) {
      removeFavoriteMutation.mutate(getFavoriteId(recipe.id));
    } else {
      addFavoriteMutation.mutate(recipe);
    }
  };

  const handleAddIngredient = () => {
    setNewRecipe({
      ...newRecipe,
      ingredients: [...newRecipe.ingredients, { item: "", quantity: "" }]
    });
  };

  const handleRemoveIngredient = (index) => {
    setNewRecipe({
      ...newRecipe,
      ingredients: newRecipe.ingredients.filter((_, i) => i !== index)
    });
  };

  const handleAddInstruction = () => {
    setNewRecipe({
      ...newRecipe,
      instructions: [...newRecipe.instructions, ""]
    });
  };

  const handleRemoveInstruction = (index) => {
    setNewRecipe({
      ...newRecipe,
      instructions: newRecipe.instructions.filter((_, i) => i !== index)
    });
  };

  const handleSubmitRecipe = () => {
    if (!newRecipe.name.trim() || !newRecipe.ingredients[0].item) {
      alert("Please fill in recipe name and at least one ingredient");
      return;
    }

    const tagsArray = newRecipe.tags ? newRecipe.tags.split(',').map(t => t.trim()).filter(t => t) : [];

    createRecipeMutation.mutate({
      name: newRecipe.name,
      description: newRecipe.description,
      meal_type: newRecipe.meal_type,
      food_preference: newRecipe.food_preference,
      regional_cuisine: newRecipe.regional_cuisine,
      ingredients: newRecipe.ingredients.filter(ing => ing.item),
      instructions: newRecipe.instructions.filter(inst => inst.trim()),
      prep_time: newRecipe.prep_time ? parseInt(newRecipe.prep_time) : null,
      cook_time: newRecipe.cook_time ? parseInt(newRecipe.cook_time) : null,
      servings: newRecipe.servings ? parseInt(newRecipe.servings) : null,
      calories: newRecipe.calories ? parseInt(newRecipe.calories) : null,
      protein: newRecipe.protein ? parseFloat(newRecipe.protein) : null,
      carbs: newRecipe.carbs ? parseFloat(newRecipe.carbs) : null,
      fats: newRecipe.fats ? parseFloat(newRecipe.fats) : null,
      tags: tagsArray
    });
  };

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         recipe.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMealType = mealTypeFilter === "all" || recipe.meal_type === mealTypeFilter;
    const matchesFoodPref = foodPrefFilter === "all" || recipe.food_preference === foodPrefFilter;
    return matchesSearch && matchesMealType && matchesFoodPref;
  });

  const myRecipes = recipes.filter(r => r.created_by === user?.email);
  const favoriteRecipes = recipes.filter(r => isFavorite(r.id));

  const planRecipes = mealPlan?.meals?.map(meal => meal.meal_name).filter((v, i, a) => a.indexOf(v) === i) || [];

  if (!user || !clientProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Recipe Library</h1>
            <p className="text-gray-600">Explore recipes from your meal plan and discover new ones</p>
          </div>
          <Dialog open={showAddRecipeDialog} onOpenChange={setShowAddRecipeDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-500 to-red-500 h-12">
                <Plus className="w-5 h-5 mr-2" />
                Add My Recipe
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  <Plus className="w-6 h-6 text-orange-500" />
                  Create Custom Recipe
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Recipe Name *</Label>
                    <Input
                      placeholder="e.g., Paneer Tikka Masala"
                      value={newRecipe.name}
                      onChange={(e) => setNewRecipe({...newRecipe, name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Brief description of the recipe"
                      value={newRecipe.description}
                      onChange={(e) => setNewRecipe({...newRecipe, description: e.target.value})}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Meal Type</Label>
                    <Select value={newRecipe.meal_type} onValueChange={(value) => setNewRecipe({...newRecipe, meal_type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="breakfast">Breakfast</SelectItem>
                        <SelectItem value="lunch">Lunch</SelectItem>
                        <SelectItem value="dinner">Dinner</SelectItem>
                        <SelectItem value="snack">Snack</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Food Type</Label>
                    <Select value={newRecipe.food_preference} onValueChange={(value) => setNewRecipe({...newRecipe, food_preference: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="veg">Vegetarian</SelectItem>
                        <SelectItem value="non_veg">Non-Veg</SelectItem>
                        <SelectItem value="jain">Jain</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Cuisine</Label>
                    <Select value={newRecipe.regional_cuisine} onValueChange={(value) => setNewRecipe({...newRecipe, regional_cuisine: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="north">North Indian</SelectItem>
                        <SelectItem value="south">South Indian</SelectItem>
                        <SelectItem value="west">West Indian</SelectItem>
                        <SelectItem value="east">East Indian</SelectItem>
                        <SelectItem value="fusion">Fusion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Servings</Label>
                    <Input
                      type="number"
                      placeholder="2"
                      value={newRecipe.servings}
                      onChange={(e) => setNewRecipe({...newRecipe, servings: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Ingredients *</Label>
                  {newRecipe.ingredients.map((ing, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        placeholder="e.g., Paneer"
                        value={ing.item}
                        onChange={(e) => {
                          const updated = [...newRecipe.ingredients];
                          updated[idx].item = e.target.value;
                          setNewRecipe({...newRecipe, ingredients: updated});
                        }}
                        className="flex-1"
                      />
                      <Input
                        placeholder="e.g., 200g"
                        value={ing.quantity}
                        onChange={(e) => {
                          const updated = [...newRecipe.ingredients];
                          updated[idx].quantity = e.target.value;
                          setNewRecipe({...newRecipe, ingredients: updated});
                        }}
                        className="w-32"
                      />
                      {newRecipe.ingredients.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveIngredient(idx)}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={handleAddIngredient}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Ingredient
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Instructions</Label>
                  {newRecipe.instructions.map((inst, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-sm font-semibold text-gray-600 mt-2">{idx + 1}.</span>
                      <Textarea
                        placeholder="Step instruction"
                        value={inst}
                        onChange={(e) => {
                          const updated = [...newRecipe.instructions];
                          updated[idx] = e.target.value;
                          setNewRecipe({...newRecipe, instructions: updated});
                        }}
                        rows={2}
                        className="flex-1"
                      />
                      {newRecipe.instructions.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveInstruction(idx)}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={handleAddInstruction}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Step
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Prep Time (min)</Label>
                    <Input
                      type="number"
                      placeholder="15"
                      value={newRecipe.prep_time}
                      onChange={(e) => setNewRecipe({...newRecipe, prep_time: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cook Time (min)</Label>
                    <Input
                      type="number"
                      placeholder="30"
                      value={newRecipe.cook_time}
                      onChange={(e) => setNewRecipe({...newRecipe, cook_time: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Calories</Label>
                    <Input
                      type="number"
                      placeholder="350"
                      value={newRecipe.calories}
                      onChange={(e) => setNewRecipe({...newRecipe, calories: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Protein (g)</Label>
                    <Input
                      type="number"
                      placeholder="15"
                      value={newRecipe.protein}
                      onChange={(e) => setNewRecipe({...newRecipe, protein: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Carbs (g)</Label>
                    <Input
                      type="number"
                      placeholder="45"
                      value={newRecipe.carbs}
                      onChange={(e) => setNewRecipe({...newRecipe, carbs: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fats (g)</Label>
                    <Input
                      type="number"
                      placeholder="12"
                      value={newRecipe.fats}
                      onChange={(e) => setNewRecipe({...newRecipe, fats: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tags (comma-separated)</Label>
                  <Input
                    placeholder="e.g., high-protein, low-carb, quick"
                    value={newRecipe.tags}
                    onChange={(e) => setNewRecipe({...newRecipe, tags: e.target.value})}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddRecipeDialog(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitRecipe}
                    disabled={createRecipeMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
                  >
                    {createRecipeMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Recipe
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Recipes</p>
                  <p className="text-3xl font-bold text-gray-900">{recipes.length}</p>
                </div>
                <ChefHat className="w-12 h-12 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-pink-50 to-rose-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">My Favorites</p>
                  <p className="text-3xl font-bold text-gray-900">{favorites.length}</p>
                </div>
                <Heart className="w-12 h-12 text-pink-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">My Recipes</p>
                  <p className="text-3xl font-bold text-gray-900">{myRecipes.length}</p>
                </div>
                <BookOpen className="w-12 h-12 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur grid grid-cols-4">
            <TabsTrigger value="all">
              All Recipes ({recipes.length})
            </TabsTrigger>
            <TabsTrigger value="plan">
              From My Plan
            </TabsTrigger>
            <TabsTrigger value="favorites">
              <Heart className="w-4 h-4 mr-2" />
              Favorites ({favorites.length})
            </TabsTrigger>
            <TabsTrigger value="mine">
              My Recipes ({myRecipes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
              <CardContent className="p-6 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Search recipes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select value={mealTypeFilter} onValueChange={setMealTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Meal Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Meal Types</SelectItem>
                      <SelectItem value="breakfast">Breakfast</SelectItem>
                      <SelectItem value="lunch">Lunch</SelectItem>
                      <SelectItem value="dinner">Dinner</SelectItem>
                      <SelectItem value="snack">Snack</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={foodPrefFilter} onValueChange={setFoodPrefFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Food Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="veg">Vegetarian</SelectItem>
                      <SelectItem value="non_veg">Non-Veg</SelectItem>
                      <SelectItem value="jain">Jain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecipes.map((recipe) => (
                <Card key={recipe.id} className="border-none shadow-lg hover:shadow-xl transition-all overflow-hidden">
                  {recipe.image_url && (
                    <div className="w-full h-48 overflow-hidden">
                      <img 
                        src={recipe.image_url} 
                        alt={recipe.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-xl line-clamp-2">{recipe.name}</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFavorite(recipe)}
                        className={isFavorite(recipe.id) ? "text-pink-500" : "text-gray-400"}
                      >
                        <Heart className={`w-5 h-5 ${isFavorite(recipe.id) ? 'fill-current' : ''}`} />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{recipe.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-orange-100 text-orange-700 capitalize">
                        {recipe.meal_type}
                      </Badge>
                      <Badge className="bg-green-100 text-green-700 capitalize">
                        {recipe.food_preference}
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-700 capitalize">
                        {recipe.regional_cuisine}
                      </Badge>
                    </div>

                    {recipe.calories && (
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Flame className="w-4 h-4 text-orange-500" />
                          <span>{recipe.calories} kcal</span>
                        </div>
                        {recipe.prep_time && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-blue-500" />
                            <span>{recipe.prep_time + recipe.cook_time} min</span>
                          </div>
                        )}
                        {recipe.servings && (
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-purple-500" />
                            <span>{recipe.servings}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <Button
                      onClick={() => setViewingRecipe(recipe)}
                      className="w-full bg-gradient-to-r from-blue-500 to-cyan-500"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Recipe
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="plan" className="space-y-4">
            {mealPlan ? (
              <div className="space-y-4">
                <Alert className="bg-green-50 border-green-300">
                  <ChefHat className="w-5 h-5 text-green-600" />
                  <AlertDescription className="text-green-900">
                    Showing recipes from your active meal plan: <strong>{mealPlan.name}</strong>
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {planRecipes.map((mealName, idx) => {
                    const matchedRecipe = recipes.find(r => 
                      r.name.toLowerCase().includes(mealName.toLowerCase()) ||
                      mealName.toLowerCase().includes(r.name.toLowerCase())
                    );
                    
                    if (!matchedRecipe) return null;

                    return (
                      <Card key={idx} className="border-none shadow-lg hover:shadow-xl transition-all overflow-hidden">
                        {matchedRecipe.image_url && (
                          <div className="w-full h-48 overflow-hidden">
                            <img 
                              src={matchedRecipe.image_url} 
                              alt={matchedRecipe.name}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-xl line-clamp-2">{matchedRecipe.name}</CardTitle>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleFavorite(matchedRecipe)}
                              className={isFavorite(matchedRecipe.id) ? "text-pink-500" : "text-gray-400"}
                            >
                              <Heart className={`w-5 h-5 ${isFavorite(matchedRecipe.id) ? 'fill-current' : ''}`} />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <Badge className="bg-green-100 text-green-700">From Your Plan</Badge>
                          <Button
                            onClick={() => setViewingRecipe(matchedRecipe)}
                            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Recipe
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  }).filter(Boolean)}
                </div>
              </div>
            ) : (
              <Alert className="bg-yellow-50 border-yellow-300">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <AlertDescription className="text-yellow-900">
                  No active meal plan found. Contact your dietitian to get a meal plan.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="space-y-4">
            {favoriteRecipes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteRecipes.map((recipe) => (
                  <Card key={recipe.id} className="border-none shadow-lg hover:shadow-xl transition-all overflow-hidden">
                    {recipe.image_url && (
                      <div className="w-full h-48 overflow-hidden">
                        <img 
                          src={recipe.image_url} 
                          alt={recipe.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-xl line-clamp-2">{recipe.name}</CardTitle>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleFavorite(recipe)}
                          className="text-pink-500"
                        >
                          <Heart className="w-5 h-5 fill-current" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => setViewingRecipe(recipe)}
                        className="w-full bg-gradient-to-r from-pink-500 to-rose-500"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Recipe
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <Heart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No favorites yet</h3>
                  <p className="text-gray-600">Click the heart icon on any recipe to save it here!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="mine" className="space-y-4">
            {myRecipes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myRecipes.map((recipe) => (
                  <Card key={recipe.id} className="border-none shadow-lg hover:shadow-xl transition-all border-2 border-blue-200 overflow-hidden">
                    {recipe.image_url && (
                      <div className="w-full h-48 overflow-hidden">
                        <img 
                          src={recipe.image_url} 
                          alt={recipe.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge className="bg-blue-500 text-white mb-2">My Recipe</Badge>
                          <CardTitle className="text-xl line-clamp-2">{recipe.name}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => setViewingRecipe(recipe)}
                        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Recipe
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No custom recipes yet</h3>
                  <p className="text-gray-600 mb-4">Create your own recipes and save them here!</p>
                  <Button onClick={() => setShowAddRecipeDialog(true)} className="bg-orange-500">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Recipe
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Recipe Detail Dialog */}
        <Dialog open={!!viewingRecipe} onOpenChange={() => setViewingRecipe(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-start justify-between">
                <DialogTitle className="text-3xl">{viewingRecipe?.name}</DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleFavorite(viewingRecipe)}
                  className={isFavorite(viewingRecipe?.id) ? "text-pink-500" : "text-gray-400"}
                >
                  <Heart className={`w-6 h-6 ${isFavorite(viewingRecipe?.id) ? 'fill-current' : ''}`} />
                </Button>
              </div>
            </DialogHeader>

            {viewingRecipe && (
              <div className="space-y-6">
                {viewingRecipe.image_url && (
                  <div className="w-full h-64 md:h-96 overflow-hidden rounded-lg">
                    <img 
                      src={viewingRecipe.image_url} 
                      alt={viewingRecipe.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <p className="text-gray-700">{viewingRecipe.description}</p>

                <div className="flex flex-wrap gap-3">
                  <Badge className="bg-orange-100 text-orange-700 capitalize text-sm py-1">
                    {viewingRecipe.meal_type}
                  </Badge>
                  <Badge className="bg-green-100 text-green-700 capitalize text-sm py-1">
                    {viewingRecipe.food_preference}
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-700 capitalize text-sm py-1">
                    {viewingRecipe.regional_cuisine} Indian
                  </Badge>
                </div>

                {/* Timing & Servings */}
                <div className="grid grid-cols-3 gap-4">
                  {viewingRecipe.prep_time && (
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <Clock className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                      <p className="text-xs text-gray-600">Prep Time</p>
                      <p className="font-bold text-gray-900">{viewingRecipe.prep_time} min</p>
                    </div>
                  )}
                  {viewingRecipe.cook_time && (
                    <div className="p-3 bg-orange-50 rounded-lg text-center">
                      <Flame className="w-5 h-5 mx-auto text-orange-600 mb-1" />
                      <p className="text-xs text-gray-600">Cook Time</p>
                      <p className="font-bold text-gray-900">{viewingRecipe.cook_time} min</p>
                    </div>
                  )}
                  {viewingRecipe.servings && (
                    <div className="p-3 bg-purple-50 rounded-lg text-center">
                      <Users className="w-5 h-5 mx-auto text-purple-600 mb-1" />
                      <p className="text-xs text-gray-600">Servings</p>
                      <p className="font-bold text-gray-900">{viewingRecipe.servings}</p>
                    </div>
                  )}
                </div>

                {/* Nutrition Info */}
                {viewingRecipe.calories && (
                  <Card className="border-2 border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="text-lg">Nutritional Information (per serving)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <Flame className="w-6 h-6 mx-auto text-orange-500 mb-1" />
                          <p className="text-2xl font-bold text-gray-900">{viewingRecipe.calories}</p>
                          <p className="text-xs text-gray-600">Calories</p>
                        </div>
                        <div>
                          <TrendingUp className="w-6 h-6 mx-auto text-red-500 mb-1" />
                          <p className="text-2xl font-bold text-gray-900">{viewingRecipe.protein}g</p>
                          <p className="text-xs text-gray-600">Protein</p>
                        </div>
                        <div>
                          <TrendingUp className="w-6 h-6 mx-auto text-blue-500 mb-1" />
                          <p className="text-2xl font-bold text-gray-900">{viewingRecipe.carbs}g</p>
                          <p className="text-xs text-gray-600">Carbs</p>
                        </div>
                        <div>
                          <TrendingUp className="w-6 h-6 mx-auto text-yellow-500 mb-1" />
                          <p className="text-2xl font-bold text-gray-900">{viewingRecipe.fats}g</p>
                          <p className="text-xs text-gray-600">Fats</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Ingredients */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Star className="w-5 h-5 text-orange-500" />
                    Ingredients
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {viewingRecipe.ingredients?.map((ing, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <div className="w-2 h-2 bg-orange-500 rounded-full" />
                        <span className="text-gray-900">{ing.item}</span>
                        <span className="text-gray-600 ml-auto">{ing.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Instructions */}
                {viewingRecipe.instructions && viewingRecipe.instructions.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-blue-500" />
                      Instructions
                    </h3>
                    <div className="space-y-3">
                      {viewingRecipe.instructions.map((step, idx) => (
                        <div key={idx} className="flex gap-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-sm">{idx + 1}</span>
                          </div>
                          <p className="text-gray-700 pt-1">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {viewingRecipe.tags && viewingRecipe.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {viewingRecipe.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}