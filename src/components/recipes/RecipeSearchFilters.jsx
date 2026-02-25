import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function RecipeSearchFilters({
  searchQuery, setSearchQuery,
  ingredientSearch, setIngredientSearch,
  mealTypeFilter, setMealTypeFilter,
  foodPrefFilter, setFoodPrefFilter,
  regionFilter, setRegionFilter,
  cookTimeFilter, setCookTimeFilter,
  dietaryFilter, setDietaryFilter,
  calorieFilter, setCalorieFilter,
  difficultyFilter, setDifficultyFilter,
  sortOrder, setSortOrder,
  totalCount, filteredCount,
}) {
  const hasActiveFilters = searchQuery || ingredientSearch || mealTypeFilter !== "all" ||
    foodPrefFilter !== "all" || regionFilter !== "all" || cookTimeFilter !== "all" ||
    dietaryFilter !== "all" || calorieFilter !== "all" || difficultyFilter !== "all";

  const clearAll = () => {
    setSearchQuery(""); setIngredientSearch("");
    setMealTypeFilter("all"); setFoodPrefFilter("all"); setRegionFilter("all");
    setCookTimeFilter("all"); setDietaryFilter("all"); setCalorieFilter("all");
    setDifficultyFilter("all");
  };

  return (
    <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
      <CardContent className="p-5 space-y-4">
        {/* Row 1: search inputs + meal type + sort */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search name, cuisine, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by ingredient..."
              value={ingredientSearch}
              onChange={(e) => setIngredientSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={mealTypeFilter} onValueChange={setMealTypeFilter}>
            <SelectTrigger><SelectValue placeholder="Meal Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Meals</SelectItem>
              <SelectItem value="breakfast">🌅 Breakfast</SelectItem>
              <SelectItem value="lunch">☀️ Lunch</SelectItem>
              <SelectItem value="dinner">🌙 Dinner</SelectItem>
              <SelectItem value="snack">🍎 Snack</SelectItem>
              <SelectItem value="post_dinner">🌛 Post Dinner</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger><SelectValue placeholder="Sort by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="-created_date">🆕 Newest First</SelectItem>
              <SelectItem value="created_date">🗓️ Oldest First</SelectItem>
              <SelectItem value="name">🔤 Name A-Z</SelectItem>
              <SelectItem value="-name">🔤 Name Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Row 2: all other filters */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Select value={foodPrefFilter} onValueChange={setFoodPrefFilter}>
            <SelectTrigger><SelectValue placeholder="Diet Pref." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="veg">🥬 Veg</SelectItem>
              <SelectItem value="non_veg">🍗 Non-Veg</SelectItem>
              <SelectItem value="eggetarian">🥚 Eggetarian</SelectItem>
              <SelectItem value="jain">🌿 Jain</SelectItem>
            </SelectContent>
          </Select>
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger><SelectValue placeholder="Cuisine" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              <SelectItem value="north">North Indian</SelectItem>
              <SelectItem value="south">South Indian</SelectItem>
              <SelectItem value="west">West Indian</SelectItem>
              <SelectItem value="east">East Indian</SelectItem>
              <SelectItem value="fusion">Fusion</SelectItem>
              <SelectItem value="continental">Continental</SelectItem>
              <SelectItem value="asian">Asian</SelectItem>
              <SelectItem value="mediterranean">Mediterranean</SelectItem>
            </SelectContent>
          </Select>
          <Select value={cookTimeFilter} onValueChange={setCookTimeFilter}>
            <SelectTrigger><SelectValue placeholder="Prep Time" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Duration</SelectItem>
              <SelectItem value="quick">⚡ Quick (≤30 min)</SelectItem>
              <SelectItem value="medium">⏱️ Medium (30-60 min)</SelectItem>
              <SelectItem value="long">🕐 Long (&gt;60 min)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dietaryFilter} onValueChange={setDietaryFilter}>
            <SelectTrigger><SelectValue placeholder="Dietary Tag" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Diets</SelectItem>
              <SelectItem value="vegan">🌱 Vegan</SelectItem>
              <SelectItem value="vegetarian">🥦 Vegetarian</SelectItem>
              <SelectItem value="gluten_free">🌾 Gluten-Free</SelectItem>
              <SelectItem value="high_protein">💪 High Protein</SelectItem>
              <SelectItem value="low_carb">🥗 Low Carb</SelectItem>
              <SelectItem value="keto">🥑 Keto</SelectItem>
              <SelectItem value="dairy_free">🥛 Dairy-Free</SelectItem>
              <SelectItem value="diabetic_friendly">🩺 Diabetic Friendly</SelectItem>
              <SelectItem value="heart_healthy">❤️ Heart Healthy</SelectItem>
              <SelectItem value="low_sodium">🧂 Low Sodium</SelectItem>
              <SelectItem value="high_fiber">🌾 High Fiber</SelectItem>
            </SelectContent>
          </Select>
          <Select value={calorieFilter} onValueChange={setCalorieFilter}>
            <SelectTrigger><SelectValue placeholder="Calories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Calories</SelectItem>
              <SelectItem value="low">🟢 Low (≤200 kcal)</SelectItem>
              <SelectItem value="medium">🟡 Medium (200-500)</SelectItem>
              <SelectItem value="high">🔴 High (&gt;500 kcal)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger><SelectValue placeholder="Difficulty" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Difficulty</SelectItem>
              <SelectItem value="easy">🟢 Easy</SelectItem>
              <SelectItem value="medium">🟡 Medium</SelectItem>
              <SelectItem value="hard">🔴 Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results summary + clear */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Filter className="w-4 h-4 text-blue-500" />
            <span>
              Showing <strong className="text-gray-900">{filteredCount}</strong> of <strong className="text-gray-900">{totalCount}</strong> recipes
            </span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">Filters active</Badge>
            )}
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1">
              <X className="w-3 h-3" /> Clear filters
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}