
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChefHat, Search, Clock, Users, Flame, Loader2, Download, Upload, Plus, Image as ImageIcon, Sparkles, ArrowUpDown, Edit, Trash2, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { resizeImage } from "@/utils/imageResize";

export default function Recipes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [mealTypeFilter, setMealTypeFilter] = useState("all");
  const [foodPrefFilter, setFoodPrefFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("-created_date");
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [generatingRecipe, setGeneratingRecipe] = useState(false);
  const [customRecipeRequest, setCustomRecipeRequest] = useState("");
  const [showManualUpload, setShowManualUpload] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeTab, setActiveTab] = useState("library");

  const [manualRecipeForm, setManualRecipeForm] = useState({
    name: "",
    description: "",
    meal_type: "breakfast",
    food_preference: "veg",
    regional_cuisine: "north",
    prep_time: "",
    cook_time: "",
    servings: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    ingredients: [{ item: "", quantity: "" }],
    instructions: [""],
    tags: "",
    image_url: ""
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: recipes, isLoading } = useQuery({
    queryKey: ['recipes', sortOrder],
    queryFn: () => base44.entities.Recipe.list(sortOrder),
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
      setShowManualUpload(false);
      setManualRecipeForm({
        name: "",
        description: "",
        meal_type: "breakfast",
        food_preference: "veg",
        regional_cuisine: "north",
        prep_time: "",
        cook_time: "",
        servings: "",
        calories: "",
        protein: "",
        carbs: "",
        fats: "",
        ingredients: [{ item: "", quantity: "" }],
        instructions: [""],
        tags: "",
        image_url: ""
      });
      alert("✅ Recipe saved successfully!");
    },
    onError: (error) => {
      console.error("Error saving recipe:", error);
      alert("Error saving the recipe. Please try again.");
    }
  });

  const updateRecipeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Recipe.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['recipes']);
      setShowEditDialog(false);
      setEditingRecipe(null);
      setSelectedRecipe(null);
      setManualRecipeForm({
        name: "",
        description: "",
        meal_type: "breakfast",
        food_preference: "veg",
        regional_cuisine: "north",
        prep_time: "",
        cook_time: "",
        servings: "",
        calories: "",
        protein: "",
        carbs: "",
        fats: "",
        ingredients: [{ item: "", quantity: "" }],
        instructions: [""],
        tags: "",
        image_url: ""
      });
      alert("✅ Recipe updated successfully!");
    },
    onError: (error) => {
      console.error("Error updating recipe:", error);
      alert("Failed to update recipe. Please try again.");
    }
  });

  const deleteRecipeMutation = useMutation({
    mutationFn: (id) => base44.entities.Recipe.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['recipes']);
      setSelectedRecipe(null);
      alert("✅ Recipe deleted successfully!");
    },
    onError: (error) => {
      console.error("Error deleting recipe:", error);
      alert("Failed to delete recipe. Please try again.");
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Please select an image file");
      return;
    }

    setUploadingImage(true);
    try {
      // Resize image to max 1200x1200 (recommended: 1200x800 for recipe photos)
      const resizeResult = await resizeImage(file, 1200, 800, 0.9);
      
      if (resizeResult.wasResized) {
        alert(`📐 Image auto-resized from ${resizeResult.originalSize.width}x${resizeResult.originalSize.height} to ${resizeResult.newSize.width}x${resizeResult.newSize.height}`);
      }
      
      const result = await base44.integrations.Core.UploadFile({ file: resizeResult.file });
      setManualRecipeForm({
        ...manualRecipeForm,
        image_url: result.file_url
      });
      alert("✅ Image uploaded successfully!");
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveManualRecipe = () => {
    if (!manualRecipeForm.name.trim()) {
      alert("Please enter recipe name");
      return;
    }

    const tagsArray = manualRecipeForm.tags ? 
      manualRecipeForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : 
      [];

    const filteredIngredients = manualRecipeForm.ingredients.filter(
      ing => ing.item.trim() && ing.quantity.trim()
    );

    const filteredInstructions = manualRecipeForm.instructions.filter(
      step => step.trim()
    );

    const recipeData = {
      name: manualRecipeForm.name,
      description: manualRecipeForm.description,
      meal_type: manualRecipeForm.meal_type,
      food_preference: manualRecipeForm.food_preference,
      regional_cuisine: manualRecipeForm.regional_cuisine,
      prep_time: manualRecipeForm.prep_time ? parseInt(manualRecipeForm.prep_time) : null,
      cook_time: manualRecipeForm.cook_time ? parseInt(manualRecipeForm.cook_time) : null,
      servings: manualRecipeForm.servings ? parseInt(manualRecipeForm.servings) : null,
      calories: manualRecipeForm.calories ? parseInt(manualRecipeForm.calories) : null,
      protein: manualRecipeForm.protein ? parseFloat(manualRecipeForm.protein) : null,
      carbs: manualRecipeForm.carbs ? parseFloat(manualRecipeForm.carbs) : null,
      fats: manualRecipeForm.fats ? parseFloat(manualRecipeForm.fats) : null,
      ingredients: filteredIngredients.length > 0 ? filteredIngredients : null,
      instructions: filteredInstructions.length > 0 ? filteredInstructions : null,
      tags: tagsArray.length > 0 ? tagsArray : null,
      image_url: manualRecipeForm.image_url || null
    };

    if (editingRecipe) {
      updateRecipeMutation.mutate({ id: editingRecipe.id, data: recipeData });
    } else {
      createRecipeMutation.mutate(recipeData);
    }
  };

  const handleEditRecipe = (recipe) => {
    setEditingRecipe(recipe);
    setManualRecipeForm({
      name: recipe.name || "",
      description: recipe.description || "",
      meal_type: recipe.meal_type || "breakfast",
      food_preference: recipe.food_preference || "veg",
      regional_cuisine: recipe.regional_cuisine || "north",
      prep_time: recipe.prep_time?.toString() || "",
      cook_time: recipe.cook_time?.toString() || "",
      servings: recipe.servings?.toString() || "",
      calories: recipe.calories?.toString() || "",
      protein: recipe.protein?.toString() || "",
      carbs: recipe.carbs?.toString() || "",
      fats: recipe.fats?.toString() || "",
      ingredients: recipe.ingredients && recipe.ingredients.length > 0 ? recipe.ingredients : [{ item: "", quantity: "" }],
      instructions: recipe.instructions && recipe.instructions.length > 0 ? recipe.instructions : [""],
      tags: recipe.tags?.join(', ') || "",
      image_url: recipe.image_url || ""
    });
    setShowEditDialog(true);
    setSelectedRecipe(null);
  };

  const handleDeleteRecipe = (recipe) => {
    if (window.confirm(`Are you sure you want to delete "${recipe.name}"?\n\nThis action cannot be undone.`)) {
      deleteRecipeMutation.mutate(recipe.id);
    }
  };

  const addIngredient = () => {
    setManualRecipeForm({
      ...manualRecipeForm,
      ingredients: [...manualRecipeForm.ingredients, { item: "", quantity: "" }]
    });
  };

  const removeIngredient = (index) => {
    const newIngredients = manualRecipeForm.ingredients.filter((_, i) => i !== index);
    setManualRecipeForm({
      ...manualRecipeForm,
      ingredients: newIngredients.length > 0 ? newIngredients : [{ item: "", quantity: "" }]
    });
  };

  const updateIngredient = (index, field, value) => {
    const newIngredients = [...manualRecipeForm.ingredients];
    newIngredients[index][field] = value;
    setManualRecipeForm({
      ...manualRecipeForm,
      ingredients: newIngredients
    });
  };

  const addInstruction = () => {
    setManualRecipeForm({
      ...manualRecipeForm,
      instructions: [...manualRecipeForm.instructions, ""]
    });
  };

  const removeInstruction = (index) => {
    const newInstructions = manualRecipeForm.instructions.filter((_, i) => i !== index);
    setManualRecipeForm({
      ...manualRecipeForm,
      instructions: newInstructions.length > 0 ? newInstructions : [""]
    });
  };

  const updateInstruction = (index, value) => {
    const newInstructions = [...manualRecipeForm.instructions];
    newInstructions[index] = value;
    setManualRecipeForm({
      ...manualRecipeForm,
      instructions: newInstructions
    });
  };

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
${recipe.tags?.length > 0 ? `🏷️  Tags: ${recipe.tags.join(', ')}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Created by: ${recipe.created_by || 'Unknown'}
Generated from Mealie Recipe Library
www.mealie.com

Enjoy your cooking! 🍽️✨

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recipe.name.replace(/[^a-zA-Z0-9]/g, '_')}_Recipe.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const canEditDelete = (recipe) => {
    return user?.user_type === 'super_admin' || recipe.created_by === user?.email;
  };

  const RecipePhotoUpload = () => (
    <div className="space-y-2">
      <Label>Recipe Photo</Label>
      <div className="space-y-3">
        {manualRecipeForm.image_url && (
          <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-green-500">
            <img 
              src={manualRecipeForm.image_url} 
              alt="Recipe preview" 
              className="w-full h-full object-cover"
            />
            <Badge className="absolute top-2 right-2 bg-green-500">
              ✅ Uploaded
            </Badge>
          </div>
        )}
        <div className="p-6 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50">
          <div className="text-center">
            <ImageIcon className="w-12 h-12 mx-auto text-blue-500 mb-3" />
            <p className="text-sm font-semibold text-gray-900 mb-1">
              📐 Recommended Size: 1200 x 800 pixels
            </p>
            <p className="text-xs text-gray-600 mb-3">
              Images will be automatically resized if larger. JPG or PNG format.
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full p-2 border rounded-lg text-sm"
              disabled={uploadingImage}
            />
            {uploadingImage && (
              <div className="mt-3">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                <p className="text-sm text-blue-700">Uploading & optimizing image...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Recipe Library</h1>
            <p className="text-gray-600">Discover authentic Indian recipes ({recipes.length} total)</p>
          </div>
          <Dialog open={showManualUpload} onOpenChange={setShowManualUpload}>
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                onClick={() => {
                  setEditingRecipe(null);
                  setManualRecipeForm({
                    name: "",
                    description: "",
                    meal_type: "breakfast",
                    food_preference: "veg",
                    regional_cuisine: "north",
                    prep_time: "",
                    cook_time: "",
                    servings: "",
                    calories: "",
                    protein: "",
                    carbs: "",
                    fats: "",
                    ingredients: [{ item: "", quantity: "" }],
                    instructions: [""],
                    tags: "",
                    image_url: ""
                  });
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Upload Recipe
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  <Upload className="w-6 h-6 text-blue-600" />
                  Upload Recipe Manually
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <Alert className="bg-blue-50 border-blue-500">
                  <ImageIcon className="w-5 h-5 text-blue-600" />
                  <AlertDescription>
                    Add your own recipes with photos! Share your culinary creations with the community.
                  </AlertDescription>
                </Alert>

                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
                    <TabsTrigger value="instructions">Instructions</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4 mt-4">
                    <RecipePhotoUpload />

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2">
                        <Label>Recipe Name *</Label>
                        <Input
                          placeholder="e.g., Paneer Tikka Masala"
                          value={manualRecipeForm.name}
                          onChange={(e) => setManualRecipeForm({...manualRecipeForm, name: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2 col-span-2">
                        <Label>Description</Label>
                        <Textarea
                          placeholder="Brief description of the recipe..."
                          value={manualRecipeForm.description}
                          onChange={(e) => setManualRecipeForm({...manualRecipeForm, description: e.target.value})}
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Meal Type *</Label>
                        <Select
                          value={manualRecipeForm.meal_type}
                          onValueChange={(value) => setManualRecipeForm({...manualRecipeForm, meal_type: value})}
                        >
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
                        <Label>Food Preference *</Label>
                        <Select
                          value={manualRecipeForm.food_preference}
                          onValueChange={(value) => setManualRecipeForm({...manualRecipeForm, food_preference: value})}
                        >
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
                        <Label>Regional Cuisine *</Label>
                        <Select
                          value={manualRecipeForm.regional_cuisine}
                          onValueChange={(value) => setManualRecipeForm({...manualRecipeForm, regional_cuisine: value})}
                        >
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
                          placeholder="4"
                          value={manualRecipeForm.servings}
                          onChange={(e) => setManualRecipeForm({...manualRecipeForm, servings: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Prep Time (min)</Label>
                        <Input
                          type="number"
                          placeholder="15"
                          value={manualRecipeForm.prep_time}
                          onChange={(e) => setManualRecipeForm({...manualRecipeForm, prep_time: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Cook Time (min)</Label>
                        <Input
                          type="number"
                          placeholder="30"
                          value={manualRecipeForm.cook_time}
                          onChange={(e) => setManualRecipeForm({...manualRecipeForm, cook_time: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Calories (per serving)</Label>
                        <Input
                          type="number"
                          placeholder="350"
                          value={manualRecipeForm.calories}
                          onChange={(e) => setManualRecipeForm({...manualRecipeForm, calories: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Protein (g)</Label>
                        <Input
                          type="number"
                          placeholder="12"
                          value={manualRecipeForm.protein}
                          onChange={(e) => setManualRecipeForm({...manualRecipeForm, protein: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Carbs (g)</Label>
                        <Input
                          type="number"
                          placeholder="45"
                          value={manualRecipeForm.carbs}
                          onChange={(e) => setManualRecipeForm({...manualRecipeForm, carbs: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Fats (g)</Label>
                        <Input
                          type="number"
                          placeholder="10"
                          value={manualRecipeForm.fats}
                          onChange={(e) => setManualRecipeForm({...manualRecipeForm, fats: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2 col-span-2">
                        <Label>Tags (comma-separated)</Label>
                        <Input
                          placeholder="e.g., high-protein, quick, traditional"
                          value={manualRecipeForm.tags}
                          onChange={(e) => setManualRecipeForm({...manualRecipeForm, tags: e.target.value})}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="ingredients" className="space-y-4 mt-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-semibold">Ingredients</Label>
                      <Button onClick={addIngredient} variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Ingredient
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {manualRecipeForm.ingredients.map((ing, index) => (
                        <div key={index} className="flex gap-3 items-start">
                          <div className="flex-1 grid grid-cols-2 gap-3">
                            <Input
                              placeholder="Ingredient name"
                              value={ing.item}
                              onChange={(e) => updateIngredient(index, 'item', e.target.value)}
                            />
                            <Input
                              placeholder="Quantity (e.g., 2 cups, 100g)"
                              value={ing.quantity}
                              onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                            />
                          </div>
                          {manualRecipeForm.ingredients.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeIngredient(index)}
                              className="text-red-600"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="instructions" className="space-y-4 mt-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-semibold">Cooking Instructions</Label>
                      <Button onClick={addInstruction} variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Step
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {manualRecipeForm.instructions.map((step, index) => (
                        <div key={index} className="flex gap-3 items-start">
                          <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <Textarea
                              placeholder={`Step ${index + 1} instructions...`}
                              value={step}
                              onChange={(e) => updateInstruction(index, e.target.value)}
                              rows={3}
                            />
                          </div>
                          {manualRecipeForm.instructions.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeInstruction(index)}
                              className="text-red-600"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowManualUpload(false)}
                    className="flex-1"
                    disabled={createRecipeMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveManualRecipe}
                    disabled={createRecipeMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 h-12"
                  >
                    {createRecipeMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Saving Recipe...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 mr-2" />
                        Save Recipe
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Edit className="w-6 h-6 text-blue-600" />
                Edit Recipe
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <Alert className="bg-blue-50 border-blue-500">
                <ImageIcon className="w-5 h-5 text-blue-600" />
                <AlertDescription>
                  Update recipe details and photo
                </AlertDescription>
              </Alert>

              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
                  <TabsTrigger value="instructions">Instructions</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <RecipePhotoUpload />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label>Recipe Name *</Label>
                      <Input
                        placeholder="e.g., Paneer Tikka Masala"
                        value={manualRecipeForm.name}
                        onChange={(e) => setManualRecipeForm({...manualRecipeForm, name: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2 col-span-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Brief description of the recipe..."
                        value={manualRecipeForm.description}
                        onChange={(e) => setManualRecipeForm({...manualRecipeForm, description: e.target.value})}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Meal Type *</Label>
                      <Select
                        value={manualRecipeForm.meal_type}
                        onValueChange={(value) => setManualRecipeForm({...manualRecipeForm, meal_type: value})}
                      >
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
                      <Label>Food Preference *</Label>
                      <Select
                        value={manualRecipeForm.food_preference}
                        onValueChange={(value) => setManualRecipeForm({...manualRecipeForm, food_preference: value})}
                      >
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
                      <Label>Regional Cuisine *</Label>
                      <Select
                        value={manualRecipeForm.regional_cuisine}
                        onValueChange={(value) => setManualRecipeForm({...manualRecipeForm, regional_cuisine: value})}
                      >
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
                        placeholder="4"
                        value={manualRecipeForm.servings}
                        onChange={(e) => setManualRecipeForm({...manualRecipeForm, servings: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Prep Time (min)</Label>
                      <Input
                        type="number"
                        placeholder="15"
                        value={manualRecipeForm.prep_time}
                        onChange={(e) => setManualRecipeForm({...manualRecipeForm, prep_time: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Cook Time (min)</Label>
                      <Input
                        type="number"
                        placeholder="30"
                        value={manualRecipeForm.cook_time}
                        onChange={(e) => setManualRecipeForm({...manualRecipeForm, cook_time: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Calories (per serving)</Label>
                      <Input
                        type="number"
                        placeholder="350"
                        value={manualRecipeForm.calories}
                        onChange={(e) => setManualRecipeForm({...manualRecipeForm, calories: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Protein (g)</Label>
                      <Input
                        type="number"
                        placeholder="12"
                        value={manualRecipeForm.protein}
                        onChange={(e) => setManualRecipeForm({...manualRecipeForm, protein: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Carbs (g)</Label>
                      <Input
                        type="number"
                        placeholder="45"
                        value={manualRecipeForm.carbs}
                        onChange={(e) => setManualRecipeForm({...manualRecipeForm, carbs: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Fats (g)</Label>
                      <Input
                        type="number"
                        placeholder="10"
                        value={manualRecipeForm.fats}
                        onChange={(e) => setManualRecipeForm({...manualRecipeForm, fats: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2 col-span-2">
                      <Label>Tags (comma-separated)</Label>
                      <Input
                        placeholder="e.g., high-protein, quick, traditional"
                        value={manualRecipeForm.tags}
                        onChange={(e) => setManualRecipeForm({...manualRecipeForm, tags: e.target.value})}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="ingredients" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-semibold">Ingredients</Label>
                    <Button onClick={addIngredient} variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Ingredient
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {manualRecipeForm.ingredients.map((ing, index) => (
                      <div key={index} className="flex gap-3 items-start">
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <Input
                            placeholder="Ingredient name"
                            value={ing.item}
                            onChange={(e) => updateIngredient(index, 'item', e.target.value)}
                          />
                          <Input
                            placeholder="Quantity (e.g., 2 cups, 100g)"
                            value={ing.quantity}
                            onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                          />
                        </div>
                        {manualRecipeForm.ingredients.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeIngredient(index)}
                            className="text-red-600"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="instructions" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-semibold">Cooking Instructions</Label>
                    <Button onClick={addInstruction} variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Step
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {manualRecipeForm.instructions.map((step, index) => (
                      <div key={index} className="flex gap-3 items-start">
                        <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <Textarea
                            placeholder={`Step ${index + 1} instructions...`}
                            value={step}
                            onChange={(e) => updateInstruction(index, e.target.value)}
                            rows={3}
                          />
                        </div>
                        {manualRecipeForm.instructions.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeInstruction(index)}
                            className="text-red-600"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditDialog(false);
                    setEditingRecipe(null);
                  }}
                  className="flex-1"
                  disabled={updateRecipeMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveManualRecipe}
                  disabled={updateRecipeMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 h-12"
                >
                  {updateRecipeMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Updating Recipe...
                    </>
                  ) : (
                    <>
                      <Edit className="w-5 h-5 mr-2" />
                      Update Recipe
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur grid grid-cols-2">
            <TabsTrigger value="library" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
              <ChefHat className="w-4 h-4 mr-2" />
              Recipe Library ({recipes.length})
            </TabsTrigger>
            <TabsTrigger value="generate" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white">
              <Sparkles className="w-4 h-4 mr-2" />
              AI Generate
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-6">
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger>
                      <ArrowUpDown className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-created_date">
                        <div className="flex items-center gap-2">
                          <span>🆕</span>
                          <span>Newest First</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="created_date">
                        <div className="flex items-center gap-2">
                          <span>🗓️</span>
                          <span>Oldest First</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="name">
                        <div className="flex items-center gap-2">
                          <span>🔤</span>
                          <span>Name (A-Z)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="-name">
                        <div className="flex items-center gap-2">
                          <span>🔤</span>
                          <span>Name (Z-A)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
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

            <Card className="border-none shadow-lg bg-gradient-to-r from-blue-50 to-cyan-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-900">
                    Showing {filteredRecipes.length} of {recipes.length} recipes
                  </span>
                  <Badge className="bg-blue-600 text-white text-sm">
                    {sortOrder === '-created_date' && '🆕 Newest First'}
                    {sortOrder === 'created_date' && '🗓️ Oldest First'}
                    {sortOrder === 'name' && '🔤 A-Z'}
                    {sortOrder === '-name' && '🔤 Z-A'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 animate-spin mx-auto text-orange-500" />
              </div>
            ) : filteredRecipes.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <ChefHat className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Recipes Found</h3>
                  <p className="text-gray-600">Try adjusting your filters or upload a recipe</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRecipes.map((recipe) => (
                  <Card
                    key={recipe.id}
                    className="border-none shadow-lg bg-white/80 backdrop-blur hover:shadow-xl transition-all group"
                  >
                    <div className="relative">
                      {recipe.image_url ? (
                        <div className="h-48 rounded-t-xl overflow-hidden cursor-pointer" onClick={() => setSelectedRecipe(recipe)}>
                          <img 
                            src={recipe.image_url} 
                            alt={recipe.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div className="h-48 bg-gradient-to-br from-orange-100 via-amber-100 to-red-100 rounded-t-xl flex items-center justify-center cursor-pointer" onClick={() => setSelectedRecipe(recipe)}>
                          <ChefHat className="w-16 h-16 text-orange-400 opacity-20" />
                        </div>
                      )}
                      {canEditDelete(recipe) && (
                        <div className="absolute top-2 right-2 flex gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditRecipe(recipe);
                            }}
                            className="bg-white/90 hover:bg-white"
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRecipe(recipe);
                            }}
                            className="bg-white/90 hover:bg-white"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    <CardHeader className="cursor-pointer" onClick={() => setSelectedRecipe(recipe)}>
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
                    <CardContent className="cursor-pointer" onClick={() => setSelectedRecipe(recipe)}>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-4">{recipe.description}</p>
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
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
                      <div className="pt-3 border-t border-gray-200">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <User className="w-3 h-3" />
                          <span className="truncate">By: {recipe.created_by || 'Unknown'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="generate" className="space-y-6">
            <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-indigo-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  Generate Custom Recipe with AI
                </CardTitle>
                <CardDescription>Describe what you'd like to cook and AI will create a detailed recipe</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="E.g., High-protein South Indian breakfast under 400 calories, or Paneer sabji for lunch"
                  value={customRecipeRequest}
                  onChange={(e) => setCustomRecipeRequest(e.target.value)}
                  className="text-lg h-12"
                />
                <Button
                  onClick={generateCustomRecipe}
                  disabled={generatingRecipe || createRecipeMutation.isPending}
                  className="w-full h-14 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
                >
                  {(generatingRecipe || createRecipeMutation.isPending) ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating Recipe...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate & Save Recipe
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-600">
                  💡 Tip: Generated recipes are automatically saved to your library
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {selectedRecipe && (
          <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-3xl flex-1">{selectedRecipe.name}</DialogTitle>
                  <div className="flex gap-2">
                    {canEditDelete(selectedRecipe) && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => handleEditRecipe(selectedRecipe)}
                          className="text-blue-600 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleDeleteRecipe(selectedRecipe)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </>
                    )}
                    <Button
                      onClick={() => downloadRecipe(selectedRecipe)}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
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
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>Created by: <strong>{selectedRecipe.created_by || 'Unknown'}</strong></span>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-6">
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
