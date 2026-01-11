import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Search, Calendar, Target, Save, Send } from 'lucide-react';
import { toast } from 'sonner';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function WeeklyMealPlanBuilder({ clientId, onComplete }) {
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState('');
  const [dailyGoals, setDailyGoals] = useState({
    calories: 2000,
    protein: 150,
    carbs: 200,
    fats: 65
  });
  const [meals, setMeals] = useState([]);
  const [notes, setNotes] = useState('');
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);
  const [currentSelection, setCurrentSelection] = useState({ day: '', mealType: '' });
  const [recipeSearch, setRecipeSearch] = useState('');

  const { data: recipes = [] } = useQuery({
    queryKey: ['allRecipes'],
    queryFn: () => base44.entities.Recipe.filter({ is_published: true }),
    initialData: []
  });

  const { data: client } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ id: clientId });
      return clients[0];
    },
    enabled: !!clientId
  });

  const createPlanMutation = useMutation({
    mutationFn: (data) => base44.entities.WeeklyMealPlan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['weeklyMealPlans']);
      toast.success('Weekly meal plan created!');
      if (onComplete) onComplete();
    },
    onError: () => toast.error('Failed to create meal plan')
  });

  const handleAddRecipe = (recipe) => {
    const nutritionPerServing = {
      calories: recipe.nutritional_info?.calories || 0,
      protein: recipe.nutritional_info?.protein || 0,
      carbs: recipe.nutritional_info?.carbs || 0,
      fats: recipe.nutritional_info?.fats || 0
    };

    const newMeal = {
      day: currentSelection.day,
      meal_type: currentSelection.mealType,
      recipe_id: recipe.id,
      recipe_name: recipe.name,
      servings: 1,
      ...nutritionPerServing,
      notes: ''
    };

    setMeals([...meals, newMeal]);
    setShowRecipeSelector(false);
    setCurrentSelection({ day: '', mealType: '' });
  };

  const handleRemoveMeal = (index) => {
    setMeals(meals.filter((_, i) => i !== index));
  };

  const handleUpdateServings = (index, servings) => {
    const updated = [...meals];
    const meal = updated[index];
    const factor = servings / (meal.servings || 1);
    
    updated[index] = {
      ...meal,
      servings,
      calories: Math.round(meal.calories * factor),
      protein: Math.round(meal.protein * factor),
      carbs: Math.round(meal.carbs * factor),
      fats: Math.round(meal.fats * factor)
    };
    
    setMeals(updated);
  };

  const calculateDayTotals = (day) => {
    const dayMeals = meals.filter(m => m.day === day);
    return dayMeals.reduce((acc, meal) => ({
      calories: acc.calories + (meal.calories || 0),
      protein: acc.protein + (meal.protein || 0),
      carbs: acc.carbs + (meal.carbs || 0),
      fats: acc.fats + (meal.fats || 0)
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
  };

  const handleSavePlan = (status = 'draft') => {
    if (!weekStart) {
      toast.error('Please select a week start date');
      return;
    }

    if (meals.length === 0) {
      toast.error('Please add at least one meal');
      return;
    }

    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    const planData = {
      client_id: clientId,
      week_start_date: weekStart,
      week_end_date: weekEndDate.toISOString().split('T')[0],
      daily_calorie_goal: dailyGoals.calories,
      daily_protein_goal: dailyGoals.protein,
      daily_carbs_goal: dailyGoals.carbs,
      daily_fats_goal: dailyGoals.fats,
      meals,
      status,
      notes,
      client_feedback: []
    };

    createPlanMutation.mutate(planData);
  };

  const filteredRecipes = recipes.filter(r =>
    r.name?.toLowerCase().includes(recipeSearch.toLowerCase()) ||
    r.meal_type?.toLowerCase().includes(currentSelection.mealType?.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Meal Plan Builder</CardTitle>
          {client && (
            <p className="text-sm text-gray-600">Creating plan for: {client.full_name}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Week Start Date</Label>
              <Input
                type="date"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
              />
            </div>
          </div>

          {/* Daily Goals */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4" />
              Daily Nutritional Goals
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Calories</Label>
                <Input
                  type="number"
                  value={dailyGoals.calories}
                  onChange={(e) => setDailyGoals({ ...dailyGoals, calories: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs">Protein (g)</Label>
                <Input
                  type="number"
                  value={dailyGoals.protein}
                  onChange={(e) => setDailyGoals({ ...dailyGoals, protein: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs">Carbs (g)</Label>
                <Input
                  type="number"
                  value={dailyGoals.carbs}
                  onChange={(e) => setDailyGoals({ ...dailyGoals, carbs: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs">Fats (g)</Label>
                <Input
                  type="number"
                  value={dailyGoals.fats}
                  onChange={(e) => setDailyGoals({ ...dailyGoals, fats: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div>
            <Label>Notes for Client</Label>
            <Textarea
              placeholder="Add any special instructions or notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Weekly Plan Grid */}
      <div className="grid gap-4">
        {DAYS.map(day => {
          const dayTotals = calculateDayTotals(day);
          const dayMeals = meals.filter(m => m.day === day);

          return (
            <Card key={day}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg capitalize">{day}</CardTitle>
                    <div className="flex gap-2 mt-1 text-xs">
                      <Badge variant="outline">{dayTotals.calories} cal</Badge>
                      <Badge variant="outline">{dayTotals.protein}g P</Badge>
                      <Badge variant="outline">{dayTotals.carbs}g C</Badge>
                      <Badge variant="outline">{dayTotals.fats}g F</Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {MEAL_TYPES.map(mealType => {
                  const mealForType = dayMeals.find(m => m.meal_type === mealType);

                  return (
                    <div key={mealType} className="border rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-sm capitalize">{mealType}</span>
                        {!mealForType && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCurrentSelection({ day, mealType });
                              setShowRecipeSelector(true);
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Recipe
                          </Button>
                        )}
                      </div>
                      {mealForType && (
                        <div className="bg-gray-50 rounded p-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{mealForType.recipe_name}</p>
                              <div className="flex gap-2 mt-1">
                                <Input
                                  type="number"
                                  value={mealForType.servings}
                                  onChange={(e) => {
                                    const idx = meals.findIndex(m => m === mealForType);
                                    handleUpdateServings(idx, parseFloat(e.target.value));
                                  }}
                                  className="w-20 h-7 text-xs"
                                  step="0.5"
                                  min="0.5"
                                />
                                <span className="text-xs text-gray-600 self-center">servings</span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">
                                {mealForType.calories} cal | {mealForType.protein}g P | {mealForType.carbs}g C | {mealForType.fats}g F
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const idx = meals.findIndex(m => m === mealForType);
                                handleRemoveMeal(idx);
                              }}
                              className="text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => handleSavePlan('draft')}>
          <Save className="w-4 h-4 mr-2" />
          Save as Draft
        </Button>
        <Button onClick={() => handleSavePlan('active')} className="bg-green-600 hover:bg-green-700">
          <Send className="w-4 h-4 mr-2" />
          Assign to Client
        </Button>
      </div>

      {/* Recipe Selector Dialog */}
      <Dialog open={showRecipeSelector} onOpenChange={setShowRecipeSelector}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Select Recipe for {currentSelection.day} - {currentSelection.mealType}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search recipes..."
                value={recipeSearch}
                onChange={(e) => setRecipeSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {filteredRecipes.map(recipe => (
                  <Card
                    key={recipe.id}
                    className="cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => handleAddRecipe(recipe)}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        {recipe.image_url && (
                          <img
                            src={recipe.image_url}
                            alt={recipe.name}
                            className="w-16 h-16 rounded object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium">{recipe.name}</h4>
                          <p className="text-sm text-gray-600 line-clamp-1">{recipe.description}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {recipe.nutritional_info?.calories || 0} cal
                            </Badge>
                            <Badge variant="outline" className="text-xs capitalize">
                              {recipe.meal_type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredRecipes.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No recipes found</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}