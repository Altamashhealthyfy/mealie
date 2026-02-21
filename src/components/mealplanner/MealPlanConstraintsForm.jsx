import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";

export default function MealPlanConstraintsForm({ onConstraintsChange, clientGoal, clientConditions }) {
  const [excludedMeals, setExcludedMeals] = useState([]);
  const [excludedIngredients, setExcludedIngredients] = useState([]);
  const [restrictions, setRestrictions] = useState([]);
  const [newMeal, setNewMeal] = useState("");
  const [newIngredient, setNewIngredient] = useState("");
  const [newRestriction, setNewRestriction] = useState("");

  const { data: savedConstraints = [] } = useQuery({
    queryKey: ['mealPlanConstraints'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.MealPlanConstraints.filter({
        coach_email: user?.email
      });
    },
  });

  const handleApplyConstraint = (constraint) => {
    setExcludedMeals([...new Set([...excludedMeals, ...constraint.excluded_meals])]);
    setExcludedIngredients([...new Set([...excludedIngredients, ...constraint.excluded_ingredients])]);
    setRestrictions([...new Set([...restrictions, ...constraint.dietary_restrictions])]);
    
    onConstraintsChange({
      excludedMeals: [...new Set([...excludedMeals, ...constraint.excluded_meals])],
      excludedIngredients: [...new Set([...excludedIngredients, ...constraint.excluded_ingredients])],
      restrictions: [...new Set([...restrictions, ...constraint.dietary_restrictions])]
    });
  };

  const updateConstraints = (meals, ingredients, rests) => {
    setExcludedMeals(meals);
    setExcludedIngredients(ingredients);
    setRestrictions(rests);
    onConstraintsChange({
      excludedMeals: meals,
      excludedIngredients: ingredients,
      restrictions: rests
    });
  };

  const addMeal = () => {
    if (newMeal.trim()) {
      updateConstraints([...excludedMeals, newMeal.trim()], excludedIngredients, restrictions);
      setNewMeal("");
    }
  };

  const addIngredient = () => {
    if (newIngredient.trim()) {
      updateConstraints(excludedMeals, [...excludedIngredients, newIngredient.trim()], restrictions);
      setNewIngredient("");
    }
  };

  const addRestriction = () => {
    if (newRestriction.trim()) {
      updateConstraints(excludedMeals, excludedIngredients, [...restrictions, newRestriction.trim()]);
      setNewRestriction("");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Constraint Presets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {savedConstraints.length === 0 ? (
            <p className="text-sm text-gray-500">No saved constraints. Create meal plan constraints first.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {savedConstraints.map((constraint) => (
                <Button
                  key={constraint.id}
                  variant="outline"
                  onClick={() => handleApplyConstraint(constraint)}
                  className="justify-start h-auto py-2 text-left"
                >
                  <div className="flex flex-col gap-1">
                    <p className="font-medium text-xs">{constraint.constraint_name}</p>
                    <p className="text-xs text-gray-600">
                      {constraint.excluded_meals?.length || 0} meals • {constraint.excluded_ingredients?.length || 0} ingredients
                    </p>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Excluded Meals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={newMeal}
              onChange={(e) => setNewMeal(e.target.value)}
              placeholder="e.g., 'palak paneer', 'fried items'"
              onKeyPress={(e) => e.key === 'Enter' && addMeal()}
            />
            <Button onClick={addMeal} variant="outline" size="sm">Add</Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {excludedMeals.map((meal, idx) => (
              <Badge key={idx} variant="secondary" className="gap-1">
                {meal}
                <button onClick={() => updateConstraints(excludedMeals.filter((_, i) => i !== idx), excludedIngredients, restrictions)}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Excluded Ingredients</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={newIngredient}
              onChange={(e) => setNewIngredient(e.target.value)}
              placeholder="e.g., 'sesame', 'coconut', 'nuts'"
              onKeyPress={(e) => e.key === 'Enter' && addIngredient()}
            />
            <Button onClick={addIngredient} variant="outline" size="sm">Add</Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {excludedIngredients.map((ingredient, idx) => (
              <Badge key={idx} variant="secondary" className="gap-1">
                {ingredient}
                <button onClick={() => updateConstraints(excludedMeals, excludedIngredients.filter((_, i) => i !== idx), restrictions)}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dietary Restrictions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={newRestriction}
              onChange={(e) => setNewRestriction(e.target.value)}
              placeholder="e.g., 'no night milk', 'no fruits after 6pm'"
              onKeyPress={(e) => e.key === 'Enter' && addRestriction()}
            />
            <Button onClick={addRestriction} variant="outline" size="sm">Add</Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {restrictions.map((restriction, idx) => (
              <Badge key={idx} variant="secondary" className="gap-1">
                {restriction}
                <button onClick={() => updateConstraints(excludedMeals, excludedIngredients, restrictions.filter((_, i) => i !== idx))}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}