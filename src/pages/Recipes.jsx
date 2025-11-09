import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChefHat, Search, Clock, Users, Flame, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Recipes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [mealTypeFilter, setMealTypeFilter] = useState("all");
  const [foodPrefFilter, setFoodPrefFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [generatingRecipe, setGeneratingRecipe] = useState(false);
  const [customRecipeRequest, setCustomRecipeRequest] = useState("");

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: recipes, isLoading } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => base44.entities.Recipe.list('-created_date'),
    initialData: [],
  });

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ created_by: user?.email });
      return profiles[0] || null;
    },
    enabled: !!user,
  });

  const createRecipeMutation = useMutation({
    mutationFn: (data) => base44.entities.Recipe.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['recipes']);
      setCustomRecipeRequest("");
      alert("✅ Recipe generated and saved successfully!");
    },
    onError: (error) => {
      console.error("Error saving generated recipe:", error);
      alert("Error saving the generated recipe. Please try again.");
    }
  });

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         recipe.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMealType = mealTypeFilter === "all" || recipe.meal_type === mealTypeFilter;
    const matchesFoodPref = foodPrefFilter === "all" || recipe.food_preference === foodPrefFilter;
    const matchesRegion = regionFilter === "all" || recipe.regional_cuisine === regionFilter;
    
    return matchesSearch && matchesMealType && matchesFoodPref && matchesRegion;
  });

  const generateCustomRecipe = async () => {
    if (!customRecipeRequest.trim()) {
      alert("Please enter a recipe request");
      return;
    }

    setGeneratingRecipe(true);

    try {
      const prompt = `Create a detailed Indian recipe based on this request: "${customRecipeRequest}"

${userProfile ? `User preferences: ${userProfile.food_preference}, ${userProfile.regional_preference} region` : ''}

Provide:
- Recipe name
- Brief description
- Meal type (breakfast/lunch/dinner/snack)
- Food preference (veg/non_veg/jain)
- Regional cuisine
- Detailed ingredients with quantities
- Step-by-step instructions
- Prep and cook time
- Number of servings
- Nutrition information per serving (calories, protein, carbs, fats)
- Relevant tags (e.g., high-protein, low-carb, quick, traditional)`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            meal_type: { type: "string" },
            food_preference: { type: "string" },
            regional_cuisine: { type: "string" },
            ingredients: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item: { type: "string" },
                  quantity: { type: "string" }
                }
              }
            },
            instructions: { type: "array", items: { type: "string" } },
            prep_time: { type: "number" },
            cook_time: { type: "number" },
            servings: { type: "number" },
            calories: { type: "number" },
            protein: { type: "number" },
            carbs: { type: "number" },
            fats: { type: "number" },
            tags: { type: "array", items: { type: "string" } }
          }
        }
      });

      createRecipeMutation.mutate(response);
      
    } catch (error) {
      console.error("Error invoking LLM or parsing response:", error);
      alert("Error generating recipe. Please try again.");
    }

    setGeneratingRecipe(false);
  };

  // Get recipe icon based on meal type
  const getRecipeIcon = (mealType) => {
    const icons = {
      breakfast: '🍳',
      lunch: '🍛',
      dinner: '🍽️',
      snack: '🥤'
    };
    return icons[mealType] || '🍴';
  };

  // Get cuisine emoji
  const getCuisineEmoji = (cuisine) => {
    const emojis = {
      north: '🫓',
      south: '🥥',
      west: '🌶️',
      east: '🍚',
      fusion: '✨'
    };
    return emojis[cuisine] || '🍽️';
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Recipe Library</h1>
            <p className="text-gray-600">Discover authentic Indian recipes ({recipes.length} total)</p>
          </div>
          <ChefHat className="w-10 h-10 text-orange-500" />
        </div>

        {/* Generate Custom Recipe */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-orange-500" />
              Generate Custom Recipe with AI
            </CardTitle>
            <CardDescription>Describe what you'd like to cook and AI will create a detailed recipe</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="E.g., High-protein South Indian breakfast under 400 calories, or Paneer sabji for lunch"
              value={customRecipeRequest}
              onChange={(e) => setCustomRecipeRequest(e.target.value)}
              className="text-lg"
            />
            <Button
              onClick={generateCustomRecipe}
              disabled={generatingRecipe || createRecipeMutation.isPending}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              {(generatingRecipe || createRecipeMutation.isPending) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Recipe...
                </>
              ) : (
                <>
                  <ChefHat className="w-4 h-4 mr-2" />
                  Generate & Save Recipe
                </>
              )}
            </Button>
            <p className="text-xs text-gray-600">
              💡 Tip: Generated recipes are automatically saved to your library and can be used in meal plans
            </p>
          </CardContent>
        </Card>

        {/* Search and Filters */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Search recipes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
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
              <Select value={foodPrefFilter} onValueChange={setFoodPrefFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Food Preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="veg">Vegetarian</SelectItem>
                  <SelectItem value="non_veg">Non-Veg</SelectItem>
                  <SelectItem value="jain">Jain</SelectItem>
                </SelectContent>
              </Select>
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="north">North Indian</SelectItem>
                  <SelectItem value="south">South Indian</SelectItem>
                  <SelectItem value="west">West Indian</SelectItem>
                  <SelectItem value="east">East Indian</SelectItem>
                  <SelectItem value="fusion">Fusion</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Recipe Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-orange-500" />
          </div>
        ) : filteredRecipes.length === 0 ? (
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <ChefHat className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Recipes Found</h3>
              <p className="text-gray-600">Try adjusting your filters or generate a custom recipe</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => (
              <Card
                key={recipe.id}
                className="border-none shadow-lg bg-white/80 backdrop-blur hover:shadow-xl transition-all cursor-pointer group"
                onClick={() => setSelectedRecipe(recipe)}
              >
                {/* Recipe Icon Header - No more mismatched images! */}
                <div className="h-32 bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center rounded-t-xl">
                  <div className="text-center">
                    <div className="text-6xl mb-2">
                      {getRecipeIcon(recipe.meal_type)}
                    </div>
                    <div className="text-2xl">
                      {getCuisineEmoji(recipe.regional_cuisine)}
                    </div>
                  </div>
                </div>
                
                <CardHeader>
                  <CardTitle className="text-xl line-clamp-2">{recipe.name}</CardTitle>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge className="bg-orange-100 text-orange-700 capitalize">
                      {recipe.meal_type}
                    </Badge>
                    <Badge className="bg-green-100 text-green-700 capitalize">
                      {recipe.food_preference}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {recipe.regional_cuisine}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm line-clamp-2 mb-4">{recipe.description}</p>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{(recipe.prep_time || 0) + (recipe.cook_time || 0)} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{recipe.servings} servings</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Flame className="w-4 h-4" />
                      <span>{recipe.calories} kcal</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Recipe Detail Dialog */}
        {selectedRecipe && (
          <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-5xl">
                    {getRecipeIcon(selectedRecipe.meal_type)}
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-3xl">{selectedRecipe.name}</DialogTitle>
                  </div>
                  <div className="text-3xl">
                    {getCuisineEmoji(selectedRecipe.regional_cuisine)}
                  </div>
                </div>
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
                  {selectedRecipe.tags?.map(tag => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                {selectedRecipe.description && (
                  <p className="text-gray-700 leading-relaxed">{selectedRecipe.description}</p>
                )}

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