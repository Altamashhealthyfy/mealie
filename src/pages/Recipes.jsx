import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import TourButton from "@/components/common/TourButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChefHat, Search, Clock, Users, Flame, Loader2, Download, Upload, Plus, Sparkles, Trash2, Edit, Filter, TrendingUp, AlertTriangle, Eye, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { createPageUrl } from "@/utils";
import ImageUploader from "@/components/common/ImageUploader";
import PersonalizedRecommendations from "@/components/recipes/PersonalizedRecommendations";
import RecipeSearchFilters from "@/components/recipes/RecipeSearchFilters";

export default function Recipes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [mealTypeFilter, setMealTypeFilter] = useState("all");
  const [foodPrefFilter, setFoodPrefFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [cookTimeFilter, setCookTimeFilter] = useState("all");
  const [dietaryFilter, setDietaryFilter] = useState("all");
  const [uploaderFilter, setUploaderFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("-created_date");
  const [calorieFilter, setCalorieFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [generatingRecipe, setGeneratingRecipe] = useState(false);
  const [fillingImages, setFillingImages] = useState(false);
  const [customRecipeRequest, setCustomRecipeRequest] = useState("");
  const [showManualUpload, setShowManualUpload] = useState(false);
  const [activeTab, setActiveTab] = useState("library");
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [showMacroAdjuster, setShowMacroAdjuster] = useState(false);
  const [showVariations, setShowVariations] = useState(false);
  const [adjustingRecipe, setAdjustingRecipe] = useState(null);
  const [variationRecipe, setVariationRecipe] = useState(null);
  const [adjustingMacros, setAdjustingMacros] = useState(false);
  const [generatingVariations, setGeneratingVariations] = useState(false);
  const [targetMacros, setTargetMacros] = useState({ calories: '', protein: '', carbs: '', fats: '' });
  const [variationRequest, setVariationRequest] = useState('');
  const [generatedVariations, setGeneratedVariations] = useState([]);

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

  const { data: securitySettings } = useQuery({
    queryKey: ['securitySettings'],
    queryFn: async () => {
      const settings = await base44.entities.AppSecuritySettings.list();
      return settings[0] || null;
    },
    enabled: !!user,
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

  const { data: coachSubscription } = useQuery({
    queryKey: ['coachSubscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.HealthCoachSubscription.filter({ 
        coach_email: user?.email,
        status: 'active'
      });
      return subs[0] || null;
    },
    enabled: !!user && user?.user_type === 'student_coach',
  });

  const { data: coachPlan } = useQuery({
    queryKey: ['coachPlan', coachSubscription?.plan_id],
    queryFn: async () => {
      if (!coachSubscription?.plan_id) return null;
      const plans = await base44.entities.HealthCoachPlan.filter({ id: coachSubscription.plan_id });
      return plans[0] || null;
    },
    enabled: !!coachSubscription?.plan_id,
  });

  const createRecipeMutation = useMutation({
    mutationFn: (data) => base44.entities.Recipe.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['recipes']);
      setCustomRecipeRequest("");
      setShowManualUpload(false);
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
      setShowManualUpload(false);
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
      alert("✅ Recipe updated successfully!");
    },
    onError: (error) => {
      console.error("Error updating recipe:", error);
      alert("Error updating the recipe. Please try again.");
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
      alert("Error deleting the recipe. Please try again.");
    }
  });

  const uploaderStats = React.useMemo(() => {
    const stats = {};
    recipes.forEach(recipe => {
      const uploader = recipe.created_by || 'Unknown';
      if (!stats[uploader]) {
        stats[uploader] = { email: uploader, count: 0 };
      }
      stats[uploader].count++;
    });
    return Object.values(stats).sort((a, b) => b.count - a.count);
  }, [recipes]);

  // Fuzzy search function
  const fuzzyMatch = (text, query) => {
    if (!query) return true;
    text = text.toLowerCase();
    query = query.toLowerCase();
    
    // Exact match
    if (text.includes(query)) return true;
    
    // Character-by-character similarity
    let textIndex = 0;
    let queryIndex = 0;
    let matchCount = 0;
    
    while (textIndex < text.length && queryIndex < query.length) {
      if (text[textIndex] === query[queryIndex]) {
        matchCount++;
        queryIndex++;
      }
      textIndex++;
    }
    
    // Allow 80% character match
    return matchCount / query.length >= 0.8;
  };

  const filteredRecipes = recipes.filter(recipe => {
    // Fuzzy name search
    const matchesSearch = fuzzyMatch(recipe.name, searchQuery) ||
                         recipe.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Ingredient search
    const matchesIngredient = !ingredientSearch || 
                             recipe.ingredients?.some(ing => 
                               ing.item.toLowerCase().includes(ingredientSearch.toLowerCase())
                             );
    
    const matchesMealType = mealTypeFilter === "all" || recipe.meal_type === mealTypeFilter;
    const matchesFoodPref = foodPrefFilter === "all" || recipe.food_preference === foodPrefFilter;
    const matchesRegion = regionFilter === "all" || recipe.regional_cuisine === regionFilter;
    
    // Cooking time filter
    const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
    const matchesCookTime = cookTimeFilter === "all" ||
                           (cookTimeFilter === "quick" && totalTime <= 30) ||
                           (cookTimeFilter === "medium" && totalTime > 30 && totalTime <= 60) ||
                           (cookTimeFilter === "long" && totalTime > 60);
    
    // Dietary restrictions filter
    const matchesDietary = dietaryFilter === "all" ||
                          recipe.tags?.some(tag => tag.toLowerCase().includes(dietaryFilter.toLowerCase()));
    
    const matchesUploader = uploaderFilter === "all" || recipe.created_by === uploaderFilter;
    
    return matchesSearch && matchesIngredient && matchesMealType && matchesFoodPref && 
           matchesRegion && matchesCookTime && matchesDietary && matchesUploader;
  });

  const generateCustomRecipe = async () => {
    if (!customRecipeRequest.trim()) {
      alert("Please enter a recipe request");
      return;
    }

    // Check credits for student_coach
    if (user?.user_type === 'student_coach') {
      const creditsIncluded = coachPlan?.ai_credits_included || 0;
      let availableCredits = 0;
      
      if (creditsIncluded !== -1) {
        const creditsUsed = coachSubscription?.ai_credits_used_this_month || 0;
        const creditsPurchased = coachSubscription?.ai_credits_purchased || 0;
        availableCredits = Math.max(0, creditsIncluded + creditsPurchased - creditsUsed);
      } else {
        availableCredits = Infinity;
      }

      if (availableCredits === 0) {
        const confirmed = window.confirm(
          `⚠️ No AI Credits Available!\n\n` +
          `Cost: ₹${coachPlan.ai_credit_price || 10} per recipe generation\n\n` +
          `Click OK to pay and generate, or Cancel to purchase credits in bulk.`
        );
        
        if (!confirmed) {
          window.location.href = createPageUrl('PurchaseAICredits');
          return;
        }

        try {
          const totalCost = coachPlan.ai_credit_price || 10;
          
          const orderResponse = await base44.functions.invoke('createCoachPayment', {
            coach_email: user.email,
            amount: totalCost,
            description: `1 AI Credit for Recipe Generation`,
            payment_type: 'ai_credits'
          });

          await new Promise((resolve, reject) => {
            const options = {
              key: process.env.RAZORPAY_KEY_ID || 'rzp_test_key',
              amount: totalCost * 100,
              currency: 'INR',
              name: 'Mealie Pro',
              description: '1 AI Credit',
              order_id: orderResponse.order_id,
              handler: async function (response) {
                try {
                  await base44.functions.invoke('verifyCoachPayment', {
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature
                  });

                  await base44.entities.HealthCoachSubscription.update(coachSubscription.id, {
                    ai_credits_purchased: (coachSubscription.ai_credits_purchased || 0) + 1
                  });

                  await base44.entities.AICreditsTransaction.create({
                    coach_email: user.email,
                    subscription_id: coachSubscription.id,
                    transaction_type: 'purchase',
                    credits_amount: 1,
                    cost: totalCost,
                    payment_id: response.razorpay_payment_id,
                    payment_status: 'completed',
                    description: `Purchased 1 AI credit for recipe generation`
                  });

                  queryClient.invalidateQueries(['coachSubscription']);
                  resolve(response);
                } catch (error) {
                  reject(error);
                }
              },
              modal: {
                ondismiss: function() {
                  reject(new Error('Payment cancelled'));
                }
              },
              theme: {
                color: '#F97316'
              }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
          });

          alert('✅ Payment successful! Generating recipe...');
        } catch (error) {
          console.error('Payment error:', error);
          alert('❌ Payment failed or cancelled. Please try again.');
          return;
        }
      }
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

      const imagePrompt = `Professional food photography of ${response.name}, ${response.description}. 
Beautiful plating, appetizing presentation, restaurant quality, natural lighting, 
${response.regional_cuisine} Indian cuisine style, vibrant colors, high resolution food photo`;

      const imageResult = await base44.integrations.Core.GenerateImage({
        prompt: imagePrompt
      });

      const recipeWithImage = {
        ...response,
        image_url: imageResult.url
      };

      createRecipeMutation.mutate(recipeWithImage);

      // Deduct AI credit for student_coach
      if (user?.user_type === 'student_coach' && coachSubscription) {
        try {
          await base44.entities.HealthCoachSubscription.update(coachSubscription.id, {
            ai_credits_used_this_month: (coachSubscription.ai_credits_used_this_month || 0) + 1
          });

          await base44.entities.AICreditsTransaction.create({
            coach_email: user.email,
            subscription_id: coachSubscription.id,
            transaction_type: 'usage',
            credits_amount: -1,
            usage_type: 'recipe_generation',
            description: `AI recipe generated: ${response.name}`
          });

          queryClient.invalidateQueries(['coachSubscription']);
        } catch (error) {
          console.error("Error recording AI credit usage:", error);
        }
      }
      
    } catch (error) {
      console.error("Error generating recipe:", error);
      alert("Error generating recipe. Please try again.");
    }

    setGeneratingRecipe(false);
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

Created by: ${recipe.created_by}
Added on: ${format(new Date(recipe.created_date), 'MMM d, yyyy')}

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
      name: recipe.name,
      description: recipe.description || "",
      meal_type: recipe.meal_type,
      food_preference: recipe.food_preference,
      regional_cuisine: recipe.regional_cuisine,
      prep_time: recipe.prep_time?.toString() || "",
      cook_time: recipe.cook_time?.toString() || "",
      servings: recipe.servings?.toString() || "",
      calories: recipe.calories?.toString() || "",
      protein: recipe.protein?.toString() || "",
      carbs: recipe.carbs?.toString() || "",
      fats: recipe.fats?.toString() || "",
      ingredients: recipe.ingredients || [{ item: "", quantity: "" }],
      instructions: recipe.instructions || [""],
      tags: recipe.tags?.join(', ') || "",
      image_url: recipe.image_url || ""
    });
    setShowManualUpload(true);
  };

  const handleDeleteRecipe = (recipe) => {
    if (window.confirm(`Are you sure you want to delete "${recipe.name}"? This action cannot be undone.`)) {
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

  // CRITICAL: Check if user is client
  const isClient = user?.user_type === 'client';
  const isSuperAdmin = user?.user_type === 'super_admin';
  const clientCanViewRecipes = securitySettings?.client_restrictions?.can_view_recipes ?? true;

  // Redirect clients if they don't have access
  React.useEffect(() => {
    if (user && isClient && !clientCanViewRecipes) {
      alert('⛔ Recipe Library is not available.\n\nContact your dietitian for recipe recommendations.');
      window.location.href = createPageUrl('Home');
    }
  }, [isClient, clientCanViewRecipes, user]);

  if (user && isClient && !clientCanViewRecipes) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              Access Restricted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-800">
              Recipe Library access is disabled. Contact your dietitian for recipe recommendations.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // PERMISSIONS: Clients can only view and download
  const canEditRecipe = (recipe) => {
    if (isClient) return false;
    return user?.user_type === 'super_admin' || recipe.created_by === user?.email;
  };
  
  const canDeleteRecipe = (recipe) => {
    if (isClient) return false;
    return user?.user_type === 'super_admin' || recipe.created_by === user?.email;
  };

  // PERMISSIONS: Upload and AI generation based on plan
  const canUploadRecipe = isSuperAdmin || (user?.user_type === 'student_coach' && coachPlan?.can_create_recipes);
  const canGenerateAIRecipe = isSuperAdmin || (user?.user_type === 'student_coach' && coachPlan?.can_create_recipes);

  const adjustRecipeMacros = async () => {
    if (!adjustingRecipe || !targetMacros.calories) {
      alert("Please specify target macros");
      return;
    }

    setAdjustingMacros(true);

    try {
      const prompt = `Adjust this recipe to meet the target nutritional goals while maintaining taste and authenticity:

Original Recipe:
- Name: ${adjustingRecipe.name}
- Current Calories: ${adjustingRecipe.calories} kcal
- Current Protein: ${adjustingRecipe.protein}g
- Current Carbs: ${adjustingRecipe.carbs}g
- Current Fats: ${adjustingRecipe.fats}g
- Ingredients: ${adjustingRecipe.ingredients?.map(ing => `${ing.item} (${ing.quantity})`).join(', ')}

Target Goals:
- Calories: ${targetMacros.calories} kcal
- Protein: ${targetMacros.protein || 'maintain proportion'}g
- Carbs: ${targetMacros.carbs || 'maintain proportion'}g
- Fats: ${targetMacros.fats || 'maintain proportion'}g

Provide adjusted ingredient quantities and any ingredient substitutions needed to meet these goals. Maintain the recipe's essence and taste profile.`;

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
            tags: { type: "array", items: { type: "string" } },
            adjustments_made: { type: "string" }
          }
        }
      });

      const adjustedRecipe = {
        ...response,
        image_url: adjustingRecipe.image_url
      };

      createRecipeMutation.mutate(adjustedRecipe);
      setShowMacroAdjuster(false);
      setTargetMacros({ calories: '', protein: '', carbs: '', fats: '' });
      alert("✅ Recipe adjusted and saved!");
    } catch (error) {
      console.error("Error adjusting recipe:", error);
      alert("Error adjusting recipe. Please try again.");
    }

    setAdjustingMacros(false);
  };

  const generateRecipeVariations = async () => {
    if (!variationRecipe || !variationRequest.trim()) {
      alert("Please specify what variations you want");
      return;
    }

    setGeneratingVariations(true);

    try {
      const prompt = `Generate recipe variations based on this request:

Original Recipe:
- Name: ${variationRecipe.name}
- Meal Type: ${variationRecipe.meal_type}
- Food Preference: ${variationRecipe.food_preference}
- Ingredients: ${variationRecipe.ingredients?.map(ing => `${ing.item} (${ing.quantity})`).join(', ')}
- Instructions: ${variationRecipe.instructions?.join(' → ')}

Variation Request: ${variationRequest}

Provide 3 creative variations that ${variationRequest}. Each should maintain similar nutritional profile and cooking technique.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            variations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  key_changes: { type: "array", items: { type: "string" } },
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
                  calories: { type: "number" },
                  protein: { type: "number" },
                  carbs: { type: "number" },
                  fats: { type: "number" }
                }
              }
            }
          }
        }
      });

      setGeneratedVariations(response.variations || []);
    } catch (error) {
      console.error("Error generating variations:", error);
      alert("Error generating variations. Please try again.");
    }

    setGeneratingVariations(false);
  };

  const saveVariationAsRecipe = (variation) => {
    const recipeData = {
      name: variation.name,
      description: variation.description,
      meal_type: variationRecipe.meal_type,
      food_preference: variationRecipe.food_preference,
      regional_cuisine: variationRecipe.regional_cuisine,
      ingredients: variation.ingredients,
      instructions: variation.instructions,
      prep_time: variationRecipe.prep_time,
      cook_time: variationRecipe.cook_time,
      servings: variationRecipe.servings,
      calories: variation.calories,
      protein: variation.protein,
      carbs: variation.carbs,
      fats: variation.fats,
      tags: [...(variationRecipe.tags || []), 'ai-variation'],
      image_url: variationRecipe.image_url
    };

    createRecipeMutation.mutate(recipeData);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Recipe Library</h1>
            <p className="text-gray-600">
              {isClient ? (
                <span className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  Browse delicious recipes from your dietitian
                </span>
              ) : (
                `Discover authentic Indian recipes (${recipes.length})`
              )}
            </p>
          </div>
          {canUploadRecipe && (
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setShowManualUpload(true);
                  setEditingRecipe(null);
                  setManualRecipeForm({
                    name: "", description: "", meal_type: "breakfast", food_preference: "veg", regional_cuisine: "north",
                    prep_time: "", cook_time: "", servings: "", calories: "", protein: "", carbs: "", fats: "",
                    ingredients: [{ item: "", quantity: "" }], instructions: [""], tags: "", image_url: ""
                  });
                }}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Recipe
              </Button>
              {canGenerateAIRecipe && (
                <Button
                  onClick={() => setActiveTab('ai-generate')}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Generate
                </Button>
              )}
              {isSuperAdmin && (
                <Button
                  onClick={async () => {
                    setFillingImages(true);
                    const res = await base44.functions.invoke('autoFillRecipeImages', {});
                    alert(res.data?.message || 'Done!');
                    queryClient.invalidateQueries(['recipes']);
                    setFillingImages(false);
                  }}
                  disabled={fillingImages}
                  variant="outline"
                  className="border-2 border-blue-500 text-blue-700 hover:bg-blue-50"
                >
                  {fillingImages ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                  Auto-Fill Images
                </Button>
              )}

            </div>
          )}
        </div>

        {/* CLIENT VIEW-ONLY NOTICE */}
        {isClient && (
          <Alert className="bg-blue-50 border-blue-500">
            <Eye className="w-5 h-5 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>View-Only Mode:</strong> You can browse and download recipes. Only your dietitian can upload, edit, or delete recipes.
            </AlertDescription>
          </Alert>
        )}

        {/* PLAN-BASED NOTICE for student_coach without recipe creation */}
        {user?.user_type === 'student_coach' && !coachPlan?.can_create_recipes && (
          <Alert className="bg-orange-50 border-orange-500">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <AlertDescription className="text-orange-900">
              <strong>Upgrade Required:</strong> Recipe creation and AI generation are not included in your current plan. Upgrade your subscription to unlock these features. You can view and download recipes.
            </AlertDescription>
          </Alert>
        )}
        
        {/* LIMITED ACCESS NOTICE for team members */}
        {user?.user_type === 'team_member' && (
          <Alert className="bg-orange-50 border-orange-500">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <AlertDescription className="text-orange-900">
              <strong>Limited Access:</strong> Only Super Admins and Health Coaches with recipe creation permission can upload or generate recipes. You can view, edit your own recipes, and download.
            </AlertDescription>
          </Alert>
        )}

        {/* TABS */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full">
            <TabsTrigger
              value="personalized"
              className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              For You
            </TabsTrigger>
            <TabsTrigger
              value="library"
              className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white"
            >
              <ChefHat className="w-4 h-4 mr-2" />
              All Recipes ({recipes.length})
            </TabsTrigger>
            {canGenerateAIRecipe && (
              <TabsTrigger
                value="ai-generate"
                className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Generate Recipe
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="personalized" className="space-y-6">
            <PersonalizedRecommendations onViewRecipe={setSelectedRecipe} />
          </TabsContent>

          <TabsContent value="library" className="space-y-6">
            <RecipeSearchFilters
              searchQuery={searchQuery} setSearchQuery={setSearchQuery}
              ingredientSearch={ingredientSearch} setIngredientSearch={setIngredientSearch}
              mealTypeFilter={mealTypeFilter} setMealTypeFilter={setMealTypeFilter}
              foodPrefFilter={foodPrefFilter} setFoodPrefFilter={setFoodPrefFilter}
              regionFilter={regionFilter} setRegionFilter={setRegionFilter}
              cookTimeFilter={cookTimeFilter} setCookTimeFilter={setCookTimeFilter}
              dietaryFilter={dietaryFilter} setDietaryFilter={setDietaryFilter}
              calorieFilter={calorieFilter} setCalorieFilter={setCalorieFilter}
              difficultyFilter={difficultyFilter} setDifficultyFilter={setDifficultyFilter}
              sortOrder={sortOrder} setSortOrder={setSortOrder}
              totalCount={recipes.length} filteredCount={filteredRecipes.length}
            />

            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 animate-spin mx-auto text-orange-500" />
              </div>
            ) : filteredRecipes.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <ChefHat className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Recipes Found</h3>
                  <p className="text-gray-600">Try adjusting your filters{!isClient ? ' or upload a recipe' : ''}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecipes.map((recipe) => (
              <Card
                key={recipe.id}
                className="border-none shadow-lg bg-white/80 backdrop-blur hover:shadow-xl transition-all group"
              >
                {recipe.image_url ? (
                   <div className="h-48 rounded-t-xl overflow-hidden relative">
                     <img 
                       src={recipe.image_url} 
                       alt={recipe.name}
                       className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                       referrerPolicy="no-referrer"
                       crossOrigin="anonymous"
                       onError={(e) => { e.currentTarget.style.display='none'; }}
                     />
                     {!isClient && (
                       <div className="absolute top-2 right-2 flex gap-2">
                         {canEditRecipe(recipe) && (
                           <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEditRecipe(recipe); }} className="bg-white/90 hover:bg-white text-blue-600 h-8 w-8 p-0">
                             <Edit className="w-4 h-4" />
                           </Button>
                         )}
                         {canDeleteRecipe(recipe) && (
                           <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteRecipe(recipe); }} className="bg-white/90 hover:bg-white text-red-600 h-8 w-8 p-0">
                             <Trash2 className="w-4 h-4" />
                           </Button>
                         )}
                       </div>
                     )}
                   </div>
                     ) : (
                      <div className="h-48 bg-gradient-to-br from-orange-100 via-amber-100 to-red-100 rounded-t-xl flex items-center justify-center relative">
                        <ChefHat className="w-16 h-16 text-orange-400 opacity-20" />
                        {!isClient && (
                          <div className="absolute top-2 right-2 flex gap-2">
                            {canEditRecipe(recipe) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditRecipe(recipe);
                                }}
                                className="bg-white/90 hover:bg-white text-blue-600 h-8 w-8 p-0"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            {canDeleteRecipe(recipe) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteRecipe(recipe);
                                }}
                                className="bg-white/90 hover:bg-white text-red-600 h-8 w-8 p-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <CardHeader>
                      <CardTitle className="text-xl line-clamp-2">{recipe.name}</CardTitle>
                      <p className="text-sm text-gray-600 line-clamp-2 mt-2">{recipe.description}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
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

                      <div className="text-xs text-gray-500 space-y-1">
                        <p>📥 {recipe.download_count || 0} downloads</p>
                        {!isClient && recipe.created_by && (
                          <p className="truncate">
                            👤 <span className="font-semibold">{recipe.created_by}</span>
                          </p>
                        )}
                        {isSuperAdmin && (
                          <p>📅 {format(new Date(recipe.created_date), 'MMM d, yyyy')}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Button
                          onClick={() => setSelectedRecipe(recipe)}
                          className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 h-12 font-semibold"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Recipe Details
                        </Button>
                        {canGenerateAIRecipe && (
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAdjustingRecipe(recipe);
                                setShowMacroAdjuster(true);
                              }}
                              variant="outline"
                              className="border-2 border-purple-500 text-purple-700 hover:bg-purple-50"
                            >
                              <TrendingUp className="w-4 h-4 mr-1" />
                              Adjust
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                setVariationRecipe(recipe);
                                setShowVariations(true);
                              }}
                              variant="outline"
                              className="border-2 border-pink-500 text-pink-700 hover:bg-pink-50"
                            >
                              <Sparkles className="w-4 h-4 mr-1" />
                              Vary
                            </Button>
                          </div>
                        )}
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadRecipe(recipe);
                          }}
                          variant="outline"
                          className="w-full h-11 border-2 border-green-500 text-green-700 hover:bg-green-50"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Recipe
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {canGenerateAIRecipe && (
            <TabsContent value="ai-generate" className="space-y-6">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-purple-500" />
                    AI Recipe Generator
                  </CardTitle>
                  <CardDescription>
                    Describe the recipe you want and AI will create it for you with nutritional info
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>What recipe would you like to create?</Label>
                    <Textarea
                      value={customRecipeRequest}
                      onChange={(e) => setCustomRecipeRequest(e.target.value)}
                      placeholder="E.g., High protein vegetarian breakfast under 300 calories with ingredients: oats, eggs, milk. Should be gluten-free and take less than 20 minutes."
                      disabled={generatingRecipe}
                      rows={4}
                    />
                  </div>

                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertDescription className="text-sm">
                      <strong>💡 Pro Tips:</strong> Specify ingredients, dietary restrictions (vegan, gluten-free, etc.), calorie/macro targets, cooking time, regional preferences, and difficulty level for best results.
                    </AlertDescription>
                  </Alert>
                  <Button
                    onClick={generateCustomRecipe}
                    disabled={generatingRecipe || !customRecipeRequest.trim()}
                    className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    {generatingRecipe ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Generating Recipe...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Generate Recipe
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* AI MACRO ADJUSTER DIALOG */}
        {canGenerateAIRecipe && (
          <Dialog open={showMacroAdjuster} onOpenChange={setShowMacroAdjuster}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-purple-500" />
                  AI Recipe Macro Adjuster
                </DialogTitle>
                <CardDescription>
                  Adjust "{adjustingRecipe?.name}" to meet your target nutritional goals
                </CardDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-sm">
                    <strong>Current Macros:</strong> {adjustingRecipe?.calories} kcal • 
                    {adjustingRecipe?.protein}g protein • {adjustingRecipe?.carbs}g carbs • 
                    {adjustingRecipe?.fats}g fats
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Target Calories (required)</Label>
                    <Input
                      type="number"
                      value={targetMacros.calories}
                      onChange={(e) => setTargetMacros({...targetMacros, calories: e.target.value})}
                      placeholder="e.g., 400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Target Protein (g, optional)</Label>
                    <Input
                      type="number"
                      value={targetMacros.protein}
                      onChange={(e) => setTargetMacros({...targetMacros, protein: e.target.value})}
                      placeholder="e.g., 30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Target Carbs (g, optional)</Label>
                    <Input
                      type="number"
                      value={targetMacros.carbs}
                      onChange={(e) => setTargetMacros({...targetMacros, carbs: e.target.value})}
                      placeholder="e.g., 45"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Target Fats (g, optional)</Label>
                    <Input
                      type="number"
                      value={targetMacros.fats}
                      onChange={(e) => setTargetMacros({...targetMacros, fats: e.target.value})}
                      placeholder="e.g., 15"
                    />
                  </div>
                </div>

                <Alert className="bg-amber-50 border-amber-200">
                  <AlertDescription className="text-xs text-amber-800">
                    AI will adjust ingredient quantities and suggest substitutions to meet your target macros while maintaining the recipe's essence.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowMacroAdjuster(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={adjustRecipeMacros}
                    disabled={adjustingMacros || !targetMacros.calories}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    {adjustingMacros ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adjusting Recipe...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Adjust & Save as New Recipe
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* AI RECIPE VARIATIONS DIALOG */}
        {canGenerateAIRecipe && (
          <Dialog open={showVariations} onOpenChange={(open) => {
            setShowVariations(open);
            if (!open) {
              setGeneratedVariations([]);
              setVariationRequest('');
            }
          }}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-pink-500" />
                  AI Recipe Variations & Substitutions
                </DialogTitle>
                <CardDescription>
                  Generate creative variations of "{variationRecipe?.name}"
                </CardDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>What variations would you like?</Label>
                  <Textarea
                    value={variationRequest}
                    onChange={(e) => setVariationRequest(e.target.value)}
                    placeholder="e.g., make it vegan, use gluten-free ingredients, reduce cooking time, make it spicier, swap paneer for tofu"
                    rows={3}
                    disabled={generatingVariations}
                  />
                </div>

                <Button
                  onClick={generateRecipeVariations}
                  disabled={generatingVariations || !variationRequest.trim()}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                >
                  {generatingVariations ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Variations...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Variations
                    </>
                  )}
                </Button>

                {generatedVariations.length > 0 && (
                  <div className="space-y-4 mt-6">
                    <h3 className="font-semibold text-lg">Generated Variations:</h3>
                    {generatedVariations.map((variation, index) => (
                      <Card key={index} className="border-2 border-pink-200">
                        <CardHeader>
                          <CardTitle className="text-lg">{variation.name}</CardTitle>
                          <CardDescription>{variation.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <p className="font-semibold text-sm mb-2">Key Changes:</p>
                            <div className="flex flex-wrap gap-2">
                              {variation.key_changes?.map((change, i) => (
                                <Badge key={i} variant="secondary">{change}</Badge>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-2 text-sm">
                            <div className="p-2 bg-red-50 rounded">
                              <p className="text-xs text-gray-600">Calories</p>
                              <p className="font-bold">{variation.calories}</p>
                            </div>
                            <div className="p-2 bg-blue-50 rounded">
                              <p className="text-xs text-gray-600">Protein</p>
                              <p className="font-bold">{variation.protein}g</p>
                            </div>
                            <div className="p-2 bg-yellow-50 rounded">
                              <p className="text-xs text-gray-600">Carbs</p>
                              <p className="font-bold">{variation.carbs}g</p>
                            </div>
                            <div className="p-2 bg-purple-50 rounded">
                              <p className="text-xs text-gray-600">Fats</p>
                              <p className="font-bold">{variation.fats}g</p>
                            </div>
                          </div>

                          <Button
                            onClick={() => saveVariationAsRecipe(variation)}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Save as New Recipe
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* MANUAL UPLOAD DIALOG - ADMIN ONLY */}
        {canUploadRecipe && (
          <Dialog open={showManualUpload} onOpenChange={(open) => {
            setShowManualUpload(open);
            if (!open) setEditingRecipe(null); // Clear editing state when dialog closes
          }}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {editingRecipe ? 'Edit Recipe' : 'Upload New Recipe'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipeName">Recipe Name *</Label>
                    <Input
                      id="recipeName"
                      value={manualRecipeForm.name}
                      onChange={(e) => setManualRecipeForm({...manualRecipeForm, name: e.target.value})}
                      placeholder="Paneer Tikka Masala"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mealType">Meal Type *</Label>
                    <Select
                      value={manualRecipeForm.meal_type}
                      onValueChange={(value) => setManualRecipeForm({...manualRecipeForm, meal_type: value})}
                    >
                      <SelectTrigger id="mealType">
                        <SelectValue placeholder="Select meal type" />
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
                    <Label htmlFor="foodPreference">Food Preference *</Label>
                    <Select
                      value={manualRecipeForm.food_preference}
                      onValueChange={(value) => setManualRecipeForm({...manualRecipeForm, food_preference: value})}
                    >
                      <SelectTrigger id="foodPreference">
                        <SelectValue placeholder="Select food preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="veg">Vegetarian</SelectItem>
                        <SelectItem value="non_veg">Non-Veg</SelectItem>
                        <SelectItem value="eggetarian">Eggetarian</SelectItem>
                        <SelectItem value="jain">Jain</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="regionalCuisine">Regional Cuisine *</Label>
                    <Select
                      value={manualRecipeForm.regional_cuisine}
                      onValueChange={(value) => setManualRecipeForm({...manualRecipeForm, regional_cuisine: value})}
                    >
                      <SelectTrigger id="regionalCuisine">
                        <SelectValue placeholder="Select regional cuisine" />
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={manualRecipeForm.description}
                    onChange={(e) => setManualRecipeForm({...manualRecipeForm, description: e.target.value})}
                    rows={3}
                    placeholder="Brief description of the recipe..."
                  />
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prepTime">Prep Time (min)</Label>
                    <Input
                      id="prepTime"
                      type="number"
                      value={manualRecipeForm.prep_time}
                      onChange={(e) => setManualRecipeForm({...manualRecipeForm, prep_time: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cookTime">Cook Time (min)</Label>
                    <Input
                      id="cookTime"
                      type="number"
                      value={manualRecipeForm.cook_time}
                      onChange={(e) => setManualRecipeForm({...manualRecipeForm, cook_time: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="servings">Servings</Label>
                    <Input
                      id="servings"
                      type="number"
                      value={manualRecipeForm.servings}
                      onChange={(e) => setManualRecipeForm({...manualRecipeForm, servings: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="calories">Calories</Label>
                    <Input
                      id="calories"
                      type="number"
                      value={manualRecipeForm.calories}
                      onChange={(e) => setManualRecipeForm({...manualRecipeForm, calories: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="protein">Protein (g)</Label>
                    <Input
                      id="protein"
                      type="number"
                      value={manualRecipeForm.protein}
                      onChange={(e) => setManualRecipeForm({...manualRecipeForm, protein: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="carbs">Carbs (g)</Label>
                    <Input
                      id="carbs"
                      type="number"
                      value={manualRecipeForm.carbs}
                      onChange={(e) => setManualRecipeForm({...manualRecipeForm, carbs: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fats">Fats (g)</Label>
                    <Input
                      id="fats"
                      type="number"
                      value={manualRecipeForm.fats}
                      onChange={(e) => setManualRecipeForm({...manualRecipeForm, fats: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Ingredients</Label>
                  {manualRecipeForm.ingredients.map((ing, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        placeholder="Item name"
                        value={ing.item}
                        onChange={(e) => updateIngredient(index, 'item', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Quantity"
                        value={ing.quantity}
                        onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                        className="w-32"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removeIngredient(index)}
                        disabled={manualRecipeForm.ingredients.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" onClick={addIngredient} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Ingredient
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Instructions</Label>
                  {manualRecipeForm.instructions.map((step, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Textarea
                        placeholder={`Step ${index + 1}`}
                        value={step}
                        onChange={(e) => updateInstruction(index, e.target.value)}
                        rows={2}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removeInstruction(index)}
                        disabled={manualRecipeForm.instructions.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" onClick={addInstruction} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Step
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input
                    id="tags"
                    value={manualRecipeForm.tags}
                    onChange={(e) => setManualRecipeForm({...manualRecipeForm, tags: e.target.value})}
                    placeholder="high-protein, low-carb, quick"
                  />
                </div>

                <ImageUploader
                  onImageUploaded={(url) => setManualRecipeForm({...manualRecipeForm, image_url: url})}
                  currentImageUrl={manualRecipeForm.image_url}
                  label="Recipe Photo"
                />

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowManualUpload(false);
                      setEditingRecipe(null);
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveManualRecipe}
                    disabled={createRecipeMutation.isPending || updateRecipeMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  >
                    {editingRecipe ? (updateRecipeMutation.isPending ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...</>) : 'Update Recipe') : (createRecipeMutation.isPending ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>) : 'Save Recipe')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* RECIPE DETAIL DIALOG */}
        {selectedRecipe && (
          <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-3xl flex-1">{selectedRecipe.name}</DialogTitle>
                  <Button
                    onClick={() => downloadRecipe(selectedRecipe)}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
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
              </DialogHeader>

              <div className="space-y-6 mt-6">
                {selectedRecipe.image_url && (
                  <div className="w-full h-64 rounded-xl overflow-hidden border-2 border-gray-200 bg-gradient-to-br from-orange-100 to-amber-100">
                    <img 
                      src={selectedRecipe.image_url} 
                      alt={selectedRecipe.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                )}

                {selectedRecipe.description && (
                  <p className="text-gray-700 leading-relaxed">{selectedRecipe.description}</p>
                )}

                {isSuperAdmin && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Added by</p>
                        <p className="font-semibold text-gray-900">{selectedRecipe.created_by}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Added on</p>
                        <p className="font-semibold text-gray-900">
                          {format(new Date(selectedRecipe.created_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
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

                {!isClient && (canEditRecipe(selectedRecipe) || canDeleteRecipe(selectedRecipe)) && (
                  <div className="flex gap-3 pt-4 border-t">
                    {canEditRecipe(selectedRecipe) && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedRecipe(null);
                          handleEditRecipe(selectedRecipe);
                        }}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Recipe
                      </Button>
                    )}
                    {canDeleteRecipe(selectedRecipe) && (
                      <Button
                        variant="destructive"
                        onClick={() => handleDeleteRecipe(selectedRecipe)}
                        disabled={deleteRecipeMutation.isPending}
                        className="flex-1"
                      >
                        {deleteRecipeMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Recipe
                          </>
                        )}
                      </Button>
                    )}
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