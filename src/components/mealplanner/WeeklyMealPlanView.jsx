import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Target, Utensils } from 'lucide-react';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function WeeklyMealPlanView({ plan }) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getMealsForDay = (day) => {
    return plan.meals?.filter(m => m.day === day) || [];
  };

  const calculateDayTotals = (day) => {
    const meals = getMealsForDay(day);
    return meals.reduce((acc, meal) => ({
      calories: acc.calories + (meal.calories || 0),
      protein: acc.protein + (meal.protein || 0),
      carbs: acc.carbs + (meal.carbs || 0),
      fats: acc.fats + (meal.fats || 0)
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-orange-500" />
            <CardTitle>
              {formatDate(plan.week_start_date)} - {formatDate(plan.week_end_date)}
            </CardTitle>
          </div>
          <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
            {plan.status}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-blue-500" />
              <span className="font-medium">Daily Goals</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-gray-50 rounded p-2">
                <p className="text-xs text-gray-600">Calories</p>
                <p className="font-semibold">{plan.daily_calorie_goal}</p>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <p className="text-xs text-gray-600">Protein</p>
                <p className="font-semibold">{plan.daily_protein_goal}g</p>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <p className="text-xs text-gray-600">Carbs</p>
                <p className="font-semibold">{plan.daily_carbs_goal}g</p>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <p className="text-xs text-gray-600">Fats</p>
                <p className="font-semibold">{plan.daily_fats_goal}g</p>
              </div>
            </div>
          </div>

          {plan.notes && (
            <div>
              <p className="font-medium mb-1">Notes</p>
              <p className="text-sm text-gray-600">{plan.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Breakdown */}
      <div className="grid gap-4">
        {DAYS.map(day => {
          const meals = getMealsForDay(day);
          const totals = calculateDayTotals(day);

          return (
            <Card key={day}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg capitalize">{day}</CardTitle>
                  <div className="flex gap-1 text-xs">
                    <Badge variant="outline">{totals.calories} cal</Badge>
                    <Badge variant="outline">{totals.protein}g P</Badge>
                    <Badge variant="outline">{totals.carbs}g C</Badge>
                    <Badge variant="outline">{totals.fats}g F</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {meals.length === 0 ? (
                  <p className="text-sm text-gray-500">No meals planned</p>
                ) : (
                  <div className="space-y-2">
                    {meals.map((meal, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-start gap-3">
                          <Utensils className="w-4 h-4 text-gray-500 mt-1" />
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-1">
                              <div>
                                <p className="font-medium text-sm">{meal.recipe_name}</p>
                                <Badge variant="outline" className="text-xs capitalize mt-1">
                                  {meal.meal_type}
                                </Badge>
                              </div>
                              <span className="text-xs text-gray-600">{meal.servings} serving(s)</span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              {meal.calories} cal | {meal.protein}g P | {meal.carbs}g C | {meal.fats}g F
                            </p>
                            {meal.notes && (
                              <p className="text-xs text-gray-500 mt-1 italic">{meal.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}