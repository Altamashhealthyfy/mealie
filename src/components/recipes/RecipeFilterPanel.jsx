import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Filter, X } from "lucide-react";

const CUISINE_OPTIONS = [
  { value: "north", label: "North Indian", emoji: "🥘" },
  { value: "south", label: "South Indian", emoji: "🥥" },
  { value: "west", label: "West Indian", emoji: "🫔" },
  { value: "east", label: "East Indian", emoji: "🍛" },
  { value: "fusion", label: "Fusion", emoji: "🌮" },
  { value: "continental", label: "Continental", emoji: "🍝" },
  { value: "asian", label: "Asian", emoji: "🥢" },
  { value: "mediterranean", label: "Mediterranean", emoji: "🫒" },
];

const DIETARY_TAGS = [
  { value: "vegan", label: "Vegan", color: "green" },
  { value: "vegetarian", label: "Vegetarian", color: "blue" },
  { value: "gluten_free", label: "Gluten Free", color: "purple" },
  { value: "dairy_free", label: "Dairy Free", color: "yellow" },
  { value: "nut_free", label: "Nut Free", color: "red" },
  { value: "low_carb", label: "Low Carb", color: "orange" },
  { value: "high_protein", label: "High Protein", color: "pink" },
  { value: "keto", label: "Keto", color: "indigo" },
  { value: "paleo", label: "Paleo", color: "amber" },
  { value: "diabetic_friendly", label: "Diabetic Friendly", color: "cyan" },
  { value: "heart_healthy", label: "Heart Healthy", color: "rose" },
  { value: "low_sodium", label: "Low Sodium", color: "slate" },
];

const MEAL_TYPES = [
  { value: "breakfast", label: "Breakfast", emoji: "🥐" },
  { value: "lunch", label: "Lunch", emoji: "🍱" },
  { value: "dinner", label: "Dinner", emoji: "🍲" },
  { value: "snack", label: "Snack", emoji: "🍿" },
  { value: "post_dinner", label: "Post Dinner", emoji: "🍵" },
];

export default function RecipeFilterPanel({
  recipes,
  selectedCuisines = [],
  selectedDietaryTags = [],
  selectedMealTypes = [],
  onFiltersChange,
}) {
  const [openAccordion, setOpenAccordion] = React.useState("");

  const activeFilters = useMemo(() => {
    return [
      ...selectedCuisines,
      ...selectedDietaryTags,
      ...selectedMealTypes,
    ].length;
  }, [selectedCuisines, selectedDietaryTags, selectedMealTypes]);

  const handleCuisineChange = (cuisine) => {
    const updated = selectedCuisines.includes(cuisine)
      ? selectedCuisines.filter(c => c !== cuisine)
      : [...selectedCuisines, cuisine];
    onFiltersChange({
      cuisines: updated,
      dietaryTags: selectedDietaryTags,
      mealTypes: selectedMealTypes,
    });
  };

  const handleDietaryTagChange = (tag) => {
    const updated = selectedDietaryTags.includes(tag)
      ? selectedDietaryTags.filter(t => t !== tag)
      : [...selectedDietaryTags, tag];
    onFiltersChange({
      cuisines: selectedCuisines,
      dietaryTags: updated,
      mealTypes: selectedMealTypes,
    });
  };

  const handleMealTypeChange = (mealType) => {
    const updated = selectedMealTypes.includes(mealType)
      ? selectedMealTypes.filter(m => m !== mealType)
      : [...selectedMealTypes, mealType];
    onFiltersChange({
      cuisines: selectedCuisines,
      dietaryTags: selectedDietaryTags,
      mealTypes: updated,
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      cuisines: [],
      dietaryTags: [],
      mealTypes: [],
    });
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-orange-600" />
            <CardTitle>Filter Recipes</CardTitle>
            {activeFilters > 0 && (
              <Badge className="bg-orange-600">{activeFilters}</Badge>
            )}
          </div>
          {activeFilters > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-red-600 hover:bg-red-50"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <Accordion value={openAccordion} onValueChange={setOpenAccordion} type="single" collapsible>
          {/* Cuisine Filter */}
          <AccordionItem value="cuisine">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2 text-left">
                <span className="font-semibold">Cuisine Type</span>
                {selectedCuisines.length > 0 && (
                  <Badge className="bg-green-100 text-green-800">
                    {selectedCuisines.length}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              {CUISINE_OPTIONS.map((cuisine) => (
                <div key={cuisine.value} className="flex items-center gap-3">
                  <Checkbox
                    id={`cuisine-${cuisine.value}`}
                    checked={selectedCuisines.includes(cuisine.value)}
                    onCheckedChange={() => handleCuisineChange(cuisine.value)}
                  />
                  <Label
                    htmlFor={`cuisine-${cuisine.value}`}
                    className="cursor-pointer flex-1 flex items-center gap-2"
                  >
                    <span className="text-lg">{cuisine.emoji}</span>
                    {cuisine.label}
                  </Label>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>

          {/* Meal Type Filter */}
          <AccordionItem value="mealtype">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2 text-left">
                <span className="font-semibold">Meal Type</span>
                {selectedMealTypes.length > 0 && (
                  <Badge className="bg-blue-100 text-blue-800">
                    {selectedMealTypes.length}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              {MEAL_TYPES.map((meal) => (
                <div key={meal.value} className="flex items-center gap-3">
                  <Checkbox
                    id={`meal-${meal.value}`}
                    checked={selectedMealTypes.includes(meal.value)}
                    onCheckedChange={() => handleMealTypeChange(meal.value)}
                  />
                  <Label
                    htmlFor={`meal-${meal.value}`}
                    className="cursor-pointer flex-1 flex items-center gap-2"
                  >
                    <span className="text-lg">{meal.emoji}</span>
                    {meal.label}
                  </Label>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>

          {/* Dietary Tags Filter */}
          <AccordionItem value="dietary">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2 text-left">
                <span className="font-semibold">Dietary Preferences</span>
                {selectedDietaryTags.length > 0 && (
                  <Badge className="bg-purple-100 text-purple-800">
                    {selectedDietaryTags.length}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              {DIETARY_TAGS.map((tag) => (
                <div key={tag.value} className="flex items-center gap-3">
                  <Checkbox
                    id={`dietary-${tag.value}`}
                    checked={selectedDietaryTags.includes(tag.value)}
                    onCheckedChange={() => handleDietaryTagChange(tag.value)}
                  />
                  <Label
                    htmlFor={`dietary-${tag.value}`}
                    className="cursor-pointer flex-1"
                  >
                    <Badge variant="outline" className={`bg-${tag.color}-50 text-${tag.color}-800 border-${tag.color}-200`}>
                      {tag.label}
                    </Badge>
                  </Label>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Active Filters Display */}
        {activeFilters > 0 && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <p className="text-xs font-semibold text-gray-600 uppercase">Active Filters:</p>
            <div className="flex flex-wrap gap-2">
              {selectedCuisines.map(c => {
                const opt = CUISINE_OPTIONS.find(o => o.value === c);
                return (
                  <Badge
                    key={c}
                    className="bg-green-100 text-green-800 cursor-pointer hover:bg-green-200"
                    onClick={() => handleCuisineChange(c)}
                  >
                    {opt?.emoji} {opt?.label} ×
                  </Badge>
                );
              })}
              {selectedMealTypes.map(m => {
                const opt = MEAL_TYPES.find(o => o.value === m);
                return (
                  <Badge
                    key={m}
                    className="bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200"
                    onClick={() => handleMealTypeChange(m)}
                  >
                    {opt?.emoji} {opt?.label} ×
                  </Badge>
                );
              })}
              {selectedDietaryTags.map(t => {
                const opt = DIETARY_TAGS.find(o => o.value === t);
                return (
                  <Badge
                    key={t}
                    className="bg-purple-100 text-purple-800 cursor-pointer hover:bg-purple-200"
                    onClick={() => handleDietaryTagChange(t)}
                  >
                    {opt?.label} ×
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}