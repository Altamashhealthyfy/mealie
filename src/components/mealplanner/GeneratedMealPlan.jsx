import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar, Save, RefreshCw, ChefHat, Lightbulb, Edit, Check, X } from "lucide-react";

export default function GeneratedMealPlan({ plan, onSave, onGenerateNew, isSaving }) {
  const [editablePlan, setEditablePlan] = useState(plan);
  const [editingMeal, setEditingMeal] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const mealTypes = ["Early Morning", "Breakfast", "Mid-Morning", "Lunch", "Evening Snack", "Dinner"];

  const groupedMeals = {};
  editablePlan.meals?.forEach(meal => {
    if (!groupedMeals[meal.day]) {
      groupedMeals[meal.day] = [];
    }
    groupedMeals[meal.day].push(meal);
  });

  const handleEditMeal = (meal) => {
    setEditingMeal({...meal});
  };

  const handleSaveMealEdit = () => {
    const updatedMeals = editablePlan.meals.map(m => 
      m.day === editingMeal.day && m.meal_type === editingMeal.meal_type ? editingMeal : m
    );
    setEditablePlan({...editablePlan, meals: updatedMeals});
    setEditingMeal(null);
  };

  const handleSavePlan = () => {
    onSave(editablePlan);
  };

  const updateEditingMealItems = (itemsText) => {
    const items = itemsText.split('\n').filter(item => item.trim());
    setEditingMeal({...editingMeal, items});
  };

  const updateEditingMealPortions = (portionsText) => {
    const portions = portionsText.split('\n').filter(p => p.trim());
    setEditingMeal({...editingMeal, portion_sizes: portions});
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl mb-2">{editablePlan.plan_name}</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-blue-500 text-white">For: {editablePlan.client_name}</Badge>
                <Badge className="bg-orange-500 text-white">{editablePlan.duration} Days</Badge>
                <Badge className="bg-green-500 text-white capitalize">{editablePlan.food_preference}</Badge>
                <Badge className="bg-purple-500 text-white">{editablePlan.target_calories} kcal/day</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onGenerateNew}
                className="border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate New
              </Button>
              <Button
                onClick={handleSavePlan}
                disabled={isSaving}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save This Plan'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Meal Plan Tabs */}
      <Tabs defaultValue="day-1" className="space-y-4">
        <div className="bg-white/80 backdrop-blur rounded-xl p-2 shadow-lg overflow-x-auto">
          <TabsList className="flex flex-nowrap">
            {Object.keys(groupedMeals).sort((a, b) => a - b).map(day => (
              <TabsTrigger 
                key={day} 
                value={`day-${day}`}
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white whitespace-nowrap"
              >
                Day {day}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {Object.keys(groupedMeals).sort((a, b) => a - b).map(day => (
          <TabsContent key={day} value={`day-${day}`} className="space-y-4">
            {groupedMeals[day]
              .sort((a, b) => mealTypes.indexOf(a.meal_type) - mealTypes.indexOf(b.meal_type))
              .map((meal, idx) => (
                <Card key={idx} className="border-none shadow-lg bg-white/80 backdrop-blur hover:shadow-xl transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge variant="outline" className="text-orange-600 border-orange-300 mb-2">
                          {meal.meal_type}
                        </Badge>
                        <CardTitle className="text-2xl">{meal.meal_name}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-3xl font-bold text-orange-600">{meal.calories}</p>
                          <p className="text-xs text-gray-500">kcal</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditMeal(meal)}
                          className="text-blue-600 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <ChefHat className="w-4 h-4" />
                        Meal Items
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        {meal.items?.map((item, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <span className="text-gray-700">{item}</span>
                            <Badge variant="secondary">{meal.portion_sizes?.[i]}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1 p-3 bg-red-50 rounded-lg">
                        <p className="text-xs text-gray-600">Protein</p>
                        <p className="text-lg font-bold text-red-600">{meal.protein}g</p>
                      </div>
                      <div className="flex-1 p-3 bg-yellow-50 rounded-lg">
                        <p className="text-xs text-gray-600">Carbs</p>
                        <p className="text-lg font-bold text-yellow-600">{meal.carbs}g</p>
                      </div>
                      <div className="flex-1 p-3 bg-purple-50 rounded-lg">
                        <p className="text-xs text-gray-600">Fats</p>
                        <p className="text-lg font-bold text-purple-600">{meal.fats}g</p>
                      </div>
                    </div>

                    {meal.nutritional_tip && (
                      <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-green-900 mb-1">Nutritional Tip</p>
                            <p className="text-sm text-green-700">{meal.nutritional_tip}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit Meal Dialog */}
      <Dialog open={!!editingMeal} onOpenChange={() => setEditingMeal(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Edit Meal</DialogTitle>
          </DialogHeader>
          {editingMeal && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Meal Type</Label>
                  <Input value={editingMeal.meal_type} disabled className="bg-gray-50" />
                </div>
                <div className="space-y-2">
                  <Label>Day</Label>
                  <Input value={editingMeal.day} disabled className="bg-gray-50" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Meal Name</Label>
                <Input
                  value={editingMeal.meal_name}
                  onChange={(e) => setEditingMeal({...editingMeal, meal_name: e.target.value})}
                  placeholder="e.g., Vegetable Poha"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Food Items (one per line)</Label>
                  <Textarea
                    value={editingMeal.items?.join('\n') || ''}
                    onChange={(e) => updateEditingMealItems(e.target.value)}
                    rows={6}
                    placeholder="1 katori poha&#10;1 cup chai&#10;10 peanuts"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Portion Sizes (one per line)</Label>
                  <Textarea
                    value={editingMeal.portion_sizes?.join('\n') || ''}
                    onChange={(e) => updateEditingMealPortions(e.target.value)}
                    rows={6}
                    placeholder="1 katori&#10;1 cup&#10;10 pieces"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Calories</Label>
                  <Input
                    type="number"
                    value={editingMeal.calories}
                    onChange={(e) => setEditingMeal({...editingMeal, calories: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Protein (g)</Label>
                  <Input
                    type="number"
                    value={editingMeal.protein}
                    onChange={(e) => setEditingMeal({...editingMeal, protein: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Carbs (g)</Label>
                  <Input
                    type="number"
                    value={editingMeal.carbs}
                    onChange={(e) => setEditingMeal({...editingMeal, carbs: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fats (g)</Label>
                  <Input
                    type="number"
                    value={editingMeal.fats}
                    onChange={(e) => setEditingMeal({...editingMeal, fats: parseFloat(e.target.value)})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nutritional Tip</Label>
                <Textarea
                  value={editingMeal.nutritional_tip || ''}
                  onChange={(e) => setEditingMeal({...editingMeal, nutritional_tip: e.target.value})}
                  rows={3}
                  placeholder="Add a helpful nutritional tip..."
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setEditingMeal(null)}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveMealEdit}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}