import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar, Save, RefreshCw, ChefHat, Lightbulb, Edit, Check, X, Download, Copy, FileText, Printer, Loader2, CheckCircle, Star, Plus, TrendingUp, AlertCircle, Calculator } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";
import MealPlanChatModifier from "./MealPlanChatModifier";
import MealPlanPDFDownload from "./MealPlanPDFDownload";

export default function GeneratedMealPlan({ plan, onSave, onSaveAsTemplate, onGenerateNew, isSaving }) {
  const [editablePlan, setEditablePlan] = useState(plan);

  const handleChatUpdate = (updatedPlan) => {
    setEditablePlan(prev => ({ ...prev, ...updatedPlan }));
  };
  const [editingMeal, setEditingMeal] = useState(null);
  const [copiedText, setCopiedText] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [showPDFDialog, setShowPDFDialog] = useState(false);

  React.useEffect(() => {
    setEditablePlan(plan);
  }, [plan]);

  const mealTypes = ["Early Morning", "Breakfast", "Mid-Morning", "Lunch", "Evening Snack", "Dinner"];

  const groupedMeals = {};
  editablePlan.meals?.forEach(meal => {
    if (!groupedMeals[meal.day]) {
      groupedMeals[meal.day] = [];
    }
    groupedMeals[meal.day].push(meal);
  });

  // Calculate daily totals
  const calculateDayTotals = (dayNumber) => {
    const dayMeals = groupedMeals[dayNumber] || [];
    return dayMeals.reduce((totals, meal) => ({
      calories: totals.calories + (meal.calories || 0),
      protein: totals.protein + (meal.protein || 0),
      carbs: totals.carbs + (meal.carbs || 0),
      fats: totals.fats + (meal.fats || 0),
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
  };

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
    onSave({ ...editablePlan, id: plan?.id });
  };

  const updateEditingMealItems = (itemsText) => {
    const items = itemsText.split('\n').filter(item => item.trim());
    setEditingMeal({...editingMeal, items});
  };

  const updateEditingMealPortions = (portionsText) => {
    const portions = portionsText.split('\n').filter(p => p.trim());
    setEditingMeal({...editingMeal, portion_sizes: portions});
  };

  const recalculateMealMacros = async () => {
    if (!editingMeal || !editingMeal.items || editingMeal.items.length === 0) {
      alert("Please add food items first");
      return;
    }

    setRecalculating(true);

    try {
      const itemsWithPortions = editingMeal.items.map((item, i) =>
        `${item} - ${editingMeal.portion_sizes?.[i] || 'standard portion'}`
      ).join('\n');

      const prompt = `Calculate the nutritional values for this Indian meal:

Meal Items:
${itemsWithPortions}

Provide accurate calculations for:
- Total Calories (kcal)
- Total Protein (grams)
- Total Carbohydrates (grams)
- Total Fats (grams)

Use ICMR data and standard Indian portion sizes. Be precise.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            calories: { type: "number" },
            protein: { type: "number" },
            carbs: { type: "number" },
            fats: { type: "number" }
          },
          required: ["calories", "protein", "carbs", "fats"]
        }
      });

      setEditingMeal({
        ...editingMeal,
        calories: Math.round(response.calories),
        protein: Math.round(response.protein),
        carbs: Math.round(response.carbs),
        fats: Math.round(response.fats)
      });

      alert("✅ Macros recalculated successfully!");

    } catch (error) {
      alert("Error recalculating macros. Please enter manually.");
      console.error(error);
    } finally {
      setRecalculating(false);
    }
  };

  // Export functions
  const generateTextFormat = () => {
    let text = `${editablePlan.plan_name}\n`;
    text += `Client: ${editablePlan.client_name}\n`;
    text += `Duration: ${editablePlan.duration} Days\n`;
    text += `Target: ${editablePlan.target_calories} kcal/day\n`;
    text += `Food Preference: ${editablePlan.food_preference}\n`;
    text += `Regional: ${editablePlan.regional_preference || 'N/A'}\n\n`;
    text += `${'='.repeat(60)}\n\n`;

    Object.keys(groupedMeals).sort((a, b) => parseInt(a) - parseInt(b)).forEach(day => {
      const dayTotals = calculateDayTotals(day);
      text += `DAY ${day} - Total: ${Math.round(dayTotals.calories)} kcal\n`;
      text += `${'-'.repeat(60)}\n\n`;

      groupedMeals[day]
        .sort((a, b) => mealTypes.indexOf(a.meal_type) - mealTypes.indexOf(b.meal_type))
        .forEach(meal => {
          text += `${meal.meal_type.toUpperCase()}: ${meal.meal_name}\n`;
          text += `Calories: ${meal.calories} | Protein: ${meal.protein}g | Carbs: ${meal.carbs}g | Fats: ${meal.fats}g\n\n`;

          text += `Food Items:\n`;
          meal.items?.forEach((item, i) => {
            text += `  • ${item} - ${meal.portion_sizes?.[i] || 'As needed'}\n`;
          });

          if (meal.nutritional_tip) {
            text += `\n💡 Tip: ${meal.nutritional_tip}\n`;
          }

          text += `\n`;
        });

      text += `\n`;
    });

    return text;
  };

  const copyToClipboard = () => {
    const text = generateTextFormat();
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const downloadAsText = () => {
    const text = generateTextFormat();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${editablePlan.plan_name.replace(/\s+/g, '_')}_${editablePlan.client_name.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const printPlan = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 print:shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-3xl mb-2">{editablePlan.plan_name}</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-blue-500 text-white">For: {editablePlan.client_name}</Badge>
                <Badge className="bg-orange-500 text-white">{editablePlan.duration} Days</Badge>
                <Badge className="bg-green-500 text-white capitalize">{editablePlan.food_preference}</Badge>
                <Badge className="bg-purple-500 text-white">{editablePlan.target_calories} kcal/day</Badge>
              </div>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button
                variant="outline"
                onClick={copyToClipboard}
                className="border-green-500 text-green-600 hover:bg-green-50"
              >
                {copiedText ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Text
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={downloadAsText}
                className="border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Download .txt
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPDFDialog(true)}
                className="border-purple-500 text-purple-600 hover:bg-purple-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Alert className="border-green-500 bg-green-50 print:hidden">
        <FileText className="w-4 h-4 text-green-600" />
        <AlertDescription className="text-gray-800">
          <strong>📋 Export Options:</strong> Copy the text to paste in WhatsApp/Email, download as .txt file to edit further, or print to PDF for professional sharing with clients.
        </AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 print:hidden">
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-3">
            {onSave && (
              <Button
                onClick={handleSavePlan}
                disabled={isSaving}
                className="flex-1 min-w-[200px] h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {plan?.id ? 'Updating Plan...' : 'Assigning to Client...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    {plan?.id ? 'Update Plan' : 'Assign to Client'}
                  </>
                )}
              </Button>
            )}

            {onSaveAsTemplate && (
              <Button
                onClick={() => onSaveAsTemplate(editablePlan)}
                variant="outline"
                className="flex-1 min-w-[200px] h-12 border-2 border-purple-500 text-purple-700 hover:bg-purple-50"
              >
                <Star className="w-5 h-5 mr-2" />
                Save as Template (FREE Forever!)
              </Button>
            )}

            <Button
              onClick={onGenerateNew}
              variant="outline"
              className="flex-1 min-w-[200px] h-12"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Another Plan
            </Button>
          </div>

          {onSaveAsTemplate && (
            <div className="mt-4 p-4 bg-purple-100 border-2 border-purple-300 rounded-lg">
              <p className="text-sm font-semibold text-purple-900 mb-1">
                💡 Pro Tip: Save as Template First!
              </p>
              <p className="text-xs text-purple-800">
                Once saved as template, you can use it for unlimited clients for FREE.
                Just clone and make small tweaks in 5 minutes!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Chat Modifier */}
      <MealPlanChatModifier plan={editablePlan} onPlanUpdated={handleChatUpdate} />

      {/* Meal Plan Tabs */}
      <Tabs defaultValue="day-1" className="space-y-4 print:hidden">
        <div className="bg-white/80 backdrop-blur rounded-xl p-2 shadow-lg overflow-x-auto">
          <TabsList className="flex flex-nowrap">
            {Object.keys(groupedMeals).sort((a, b) => parseInt(a) - parseInt(b)).map(day => {
              const dayTotals = calculateDayTotals(day);
              const targetCals = editablePlan.target_calories || 2000;
              const difference = dayTotals.calories - targetCals;
              const isOnTrack = Math.abs(difference) <= (targetCals * 0.1);

              return (
                <TabsTrigger
                  key={day}
                  value={`day-${day}`}
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white whitespace-nowrap flex flex-col items-center py-2 px-4"
                >
                  <span className="font-semibold">Day {day}</span>
                  <div className="flex items-center gap-1 mt-1 text-xs">
                    <span>{Math.round(dayTotals.calories)} kcal</span>
                    {!isOnTrack && (
                      <AlertCircle className="w-3 h-3 text-red-400" />
                    )}
                  </div>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {Object.keys(groupedMeals).sort((a, b) => parseInt(a) - parseInt(b)).map(day => {
          const dayTotals = calculateDayTotals(day);
          const targetCals = editablePlan.target_calories || 2000;
          const difference = dayTotals.calories - targetCals;
          const isOnTrack = Math.abs(difference) <= (targetCals * 0.1);

          return (
            <TabsContent key={day} value={`day-${day}`} className="space-y-4">
              {/* Daily Summary Card */}
              <Card className={`border-2 ${
                isOnTrack
                  ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50'
                  : difference > 0
                  ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-red-50'
                  : 'border-blue-500 bg-gradient-to-br from-blue-50 to-cyan-50'
              }`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className={`w-6 h-6 ${
                        isOnTrack ? 'text-green-600' : difference > 0 ? 'text-orange-600' : 'text-blue-600'
                      }`} />
                      Day {day} Summary
                    </CardTitle>
                    <Badge className={`${
                      isOnTrack
                        ? 'bg-green-500'
                        : difference > 0
                        ? 'bg-orange-500'
                        : 'bg-blue-500'
                    } text-white text-lg px-4 py-1`}>
                      {isOnTrack ? '✓ On Track' : difference > 0 ? `+${Math.round(difference)} kcal` : `${Math.round(difference)} kcal`}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 bg-white rounded-xl shadow-md text-center">
                      <p className="text-sm text-gray-600 mb-1">Total Calories</p>
                      <p className="text-3xl font-bold text-orange-600">{Math.round(dayTotals.calories)}</p>
                      <p className="text-xs text-gray-500">Target: {targetCals}</p>
                    </div>
                    <div className="p-4 bg-white rounded-xl shadow-md text-center">
                      <p className="text-sm text-gray-600 mb-1">Protein</p>
                      <p className="text-3xl font-bold text-red-600">{Math.round(dayTotals.protein)}g</p>
                    </div>
                    <div className="p-4 bg-white rounded-xl shadow-md text-center">
                      <p className="text-sm text-gray-600 mb-1">Carbs</p>
                      <p className="text-3xl font-bold text-yellow-600">{Math.round(dayTotals.carbs)}g</p>
                    </div>
                    <div className="p-4 bg-white rounded-xl shadow-md text-center">
                      <p className="text-sm text-gray-600 mb-1">Fats</p>
                      <p className="text-3xl font-bold text-purple-600">{Math.round(dayTotals.fats)}g</p>
                    </div>
                  </div>

                  {!isOnTrack && (
                    <Alert className={`mt-4 ${
                      difference > 0
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-blue-500 bg-blue-50'
                    }`}>
                      <AlertCircle className={`w-4 h-4 ${
                        difference > 0 ? 'text-orange-600' : 'text-blue-600'
                      }`} />
                      <AlertDescription className={`ml-2 ${
                        difference > 0 ? 'text-orange-900' : 'text-blue-900'
                      }`}>
                        {difference > 0
                          ? `⚠️ Day ${day} is ${Math.round(difference)} calories ABOVE target. Consider reducing portion sizes or swapping high-calorie items.`
                          : `💡 Day ${day} is ${Math.abs(Math.round(difference))} calories BELOW target. Consider adding snacks or increasing portions.`
                        }
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Meal Cards */}
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
          );
        })}
      </Tabs>

      {/* Printable version */}
      <div className="hidden print:block">
        <h1 className="text-3xl font-bold mb-4">{editablePlan.plan_name}</h1>
        <div className="mb-6">
          <p><strong>Client:</strong> {editablePlan.client_name}</p>
          <p><strong>Duration:</strong> {editablePlan.duration} Days</p>
          <p><strong>Target:</strong> {editablePlan.target_calories} kcal/day</p>
          <p><strong>Food Preference:</strong> {editablePlan.food_preference}</p>
          <p><strong>Regional:</strong> {editablePlan.regional_preference || 'N/A'}</p>
        </div>

        {Object.keys(groupedMeals).sort((a, b) => parseInt(a) - parseInt(b)).map(day => (
          <div key={day} className="mb-8 page-break-after">
            <h2 className="text-2xl font-bold mb-4 border-b-2 pb-2">Day {day}</h2>
            {groupedMeals[day]
              .sort((a, b) => mealTypes.indexOf(a.meal_type) - mealTypes.indexOf(b.meal_type))
              .map((meal, idx) => (
                <div key={idx} className="mb-6 border-l-4 border-orange-500 pl-4">
                  <h3 className="text-xl font-semibold mb-2">{meal.meal_type}: {meal.meal_name}</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {meal.calories} kcal | Protein: {meal.protein}g | Carbs: {meal.carbs}g | Fats: {meal.fats}g
                  </p>
                  <ul className="list-disc list-inside mb-2">
                    {meal.items?.map((item, i) => (
                      <li key={i}>{item} - {meal.portion_sizes?.[i] || 'As needed'}</li>
                    ))}
                  </ul>
                  {meal.nutritional_tip && (
                    <p className="text-sm italic text-green-700">💡 {meal.nutritional_tip}</p>
                  )}
                </div>
              ))}
          </div>
        ))}
      </div>

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
                    placeholder="1 small katori (150g)&#10;1 cup (240ml)&#10;10 pieces"
                  />
                </div>
              </div>

              {/* AI Recalculate Button */}
              <Alert className="border-2 border-blue-500 bg-blue-50">
                <Calculator className="w-5 h-5 text-blue-600" />
                <AlertDescription className="ml-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-blue-900 mb-1">🤖 AI Macro Calculator</p>
                      <p className="text-sm text-blue-800">
                        Changed the items? Click below to auto-calculate calories & macros using AI
                      </p>
                    </div>
                    <Button
                      onClick={recalculateMealMacros}
                      disabled={recalculating}
                      className="ml-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                    >
                      {recalculating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Calculating...
                        </>
                      ) : (
                        <>
                          <Calculator className="w-4 h-4 mr-2" />
                          Recalculate
                        </>
                      )}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>

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

      <style>{`
        @media print {
          @page {
            margin: 2cm;
          }
          .page-break-after {
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  );
}