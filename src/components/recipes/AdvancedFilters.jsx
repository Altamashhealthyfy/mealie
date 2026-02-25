import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, ChevronDown } from "lucide-react";

export default function AdvancedFilters({
  macroFilters,
  setMacroFilters,
  ingredientExclusions,
  setIngredientExclusions,
  prepTimeMax,
  setPrepTimeMax,
  dietaryTags,
  setDietaryTags
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [ingredientInput, setIngredientInput] = useState("");

  const commonTags = [
    "high-protein", "low-carb", "vegan", "quick-meal",
    "keto", "gluten-free", "dairy-free", "low-calorie",
    "heart-healthy", "low-sodium", "high-fiber", "paleo"
  ];

  const addExcludedIngredient = (ingredient) => {
    if (ingredient.trim() && !ingredientExclusions.includes(ingredient.trim())) {
      setIngredientExclusions([...ingredientExclusions, ingredient.trim()]);
      setIngredientInput("");
    }
  };

  const removeExcludedIngredient = (ingredient) => {
    setIngredientExclusions(ingredientExclusions.filter(i => i !== ingredient));
  };

  const toggleTag = (tag) => {
    if (dietaryTags.includes(tag)) {
      setDietaryTags(dietaryTags.filter(t => t !== tag));
    } else {
      setDietaryTags([...dietaryTags, tag]);
    }
  };

  const hasActiveFilters = macroFilters.protein || macroFilters.carbs || macroFilters.fats ||
    ingredientExclusions.length > 0 || prepTimeMax || dietaryTags.length > 0;

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            🔍 Advanced Filters
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="gap-2"
          >
            Advanced <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      {showAdvanced && (
        <CardContent className="space-y-6">
          {/* Macro Filters */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Macro Targets (per serving)</Label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-600">Protein (g)</label>
                <Input
                  type="number"
                  placeholder="Min protein"
                  value={macroFilters.protein || ""}
                  onChange={(e) => setMacroFilters({...macroFilters, protein: e.target.value ? parseInt(e.target.value) : null})}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-600">Carbs (g)</label>
                <Input
                  type="number"
                  placeholder="Min carbs"
                  value={macroFilters.carbs || ""}
                  onChange={(e) => setMacroFilters({...macroFilters, carbs: e.target.value ? parseInt(e.target.value) : null})}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-600">Fats (g)</label>
                <Input
                  type="number"
                  placeholder="Min fats"
                  value={macroFilters.fats || ""}
                  onChange={(e) => setMacroFilters({...macroFilters, fats: e.target.value ? parseInt(e.target.value) : null})}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Prep Time */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Max Prep Time (minutes)</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                placeholder="e.g., 30"
                value={prepTimeMax || ""}
                onChange={(e) => setPrepTimeMax(e.target.value ? parseInt(e.target.value) : null)}
                className="flex-1 h-10"
              />
              {prepTimeMax && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPrepTimeMax(null)}
                  className="text-red-600 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Ingredient Exclusions */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Exclude Ingredients</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., sesame, coconut..."
                value={ingredientInput}
                onChange={(e) => setIngredientInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addExcludedIngredient(ingredientInput);
                  }
                }}
                className="flex-1"
              />
              <Button
                onClick={() => addExcludedIngredient(ingredientInput)}
                disabled={!ingredientInput.trim()}
                variant="outline"
                className="border-purple-300"
              >
                Add
              </Button>
            </div>
            {ingredientExclusions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {ingredientExclusions.map(ingredient => (
                  <Badge key={ingredient} variant="secondary" className="bg-red-100 text-red-800">
                    {ingredient}
                    <button
                      onClick={() => removeExcludedIngredient(ingredient)}
                      className="ml-1 hover:opacity-70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Dietary Tags */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Dietary Tags</Label>
            <div className="flex flex-wrap gap-2">
              {commonTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    dietaryTags.includes(tag)
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : 'bg-white border-2 border-purple-200 text-gray-700 hover:border-purple-400'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            {dietaryTags.length > 0 && (
              <p className="text-xs text-gray-600">
                Selected: {dietaryTags.length} tag{dietaryTags.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={() => {
                setMacroFilters({ protein: null, carbs: null, fats: null });
                setIngredientExclusions([]);
                setPrepTimeMax(null);
                setDietaryTags([]);
              }}
              className="w-full text-red-600 hover:bg-red-50 border-red-300"
            >
              <X className="w-4 h-4 mr-2" />
              Clear All Advanced Filters
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}