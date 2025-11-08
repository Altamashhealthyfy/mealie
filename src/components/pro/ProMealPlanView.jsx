import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Brain, Heart, Activity, Users, Sparkles } from "lucide-react";

export default function ProMealPlanView({ plan }) {
  const groupMealsByDay = () => {
    const days = {};
    plan.meal_plan.forEach(meal => {
      if (!days[meal.day]) days[meal.day] = [];
      days[meal.day].push(meal);
    });
    return days;
  };

  const mealsByDay = groupMealsByDay();

  return (
    <div className="space-y-6">
      {/* Decision Rules */}
      <Card className="border-none shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
          <CardTitle>✅ Decision Rules Applied</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ul className="space-y-2">
            {plan.decision_rules.map((rule, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{rule}</span>
              </li>
            ))}
          </ul>
          {plan.conflict_resolution && (
            <Alert className="mt-4 bg-blue-50 border-blue-500">
              <AlertDescription>
                <strong>Conflict Resolution:</strong> {plan.conflict_resolution}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Calculations */}
      <Card className="border-none shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
          <CardTitle>📊 Nutritional Calculations</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">BMR</p>
              <p className="text-2xl font-bold text-blue-600">{plan.calculations.bmr}</p>
              <p className="text-xs text-gray-500">kcal/day</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">TDEE</p>
              <p className="text-2xl font-bold text-cyan-600">{plan.calculations.tdee}</p>
              <p className="text-xs text-gray-500">kcal/day</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Target Calories</p>
              <p className="text-2xl font-bold text-orange-600">{plan.calculations.target_calories}</p>
              <p className="text-xs text-gray-500">kcal/day</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Macros (C/P/F)</p>
              <p className="text-xl font-bold text-purple-600">
                {plan.calculations.macros.carbs_g}/{plan.calculations.macros.protein_g}/{plan.calculations.macros.fats_g}g
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 10-Day Meal Plan */}
      <Card className="border-none shadow-lg">
        <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
          <CardTitle>🍽️ 10-Day Meal Plan (3-3-4 Rotation)</CardTitle>
          <p className="text-sm text-white/90 mt-1">
            Plan A: Days 1-3 | Plan B: Days 4-6 | Plan C: Days 7-10
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="1" className="space-y-4">
            <TabsList className="flex flex-wrap gap-2">
              {Object.keys(mealsByDay).map(day => (
                <TabsTrigger key={day} value={day}>
                  Day {day}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(mealsByDay).map(([day, meals]) => (
              <TabsContent key={day} value={day} className="space-y-4">
                {meals.map((meal, index) => (
                  <Card key={index} className="bg-gradient-to-br from-gray-50 to-white">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg capitalize">
                          {meal.meal_type.replace('_', ' ')}
                        </CardTitle>
                        <Badge className="bg-orange-100 text-orange-700">{meal.calories} kcal</Badge>
                      </div>
                      <p className="text-xl font-bold text-gray-900">{meal.meal_name}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="font-semibold text-gray-700 mb-2">Food Items:</p>
                        {meal.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm mb-1">
                            <span>{item}</span>
                            <span className="text-gray-600">{meal.portion_sizes[i]}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 pt-2 border-t">
                        <div className="text-center">
                          <p className="text-xs text-gray-600">Protein</p>
                          <p className="font-bold text-red-600">{meal.protein}g</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600">Carbs</p>
                          <p className="font-bold text-yellow-600">{meal.carbs}g</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600">Fats</p>
                          <p className="font-bold text-purple-600">{meal.fats}g</p>
                        </div>
                        {meal.sodium && (
                          <div className="text-center">
                            <p className="text-xs text-gray-600">Sodium</p>
                            <p className="font-bold text-blue-600">{meal.sodium}mg</p>
                          </div>
                        )}
                        {meal.potassium && (
                          <div className="text-center">
                            <p className="text-xs text-gray-600">Potassium</p>
                            <p className="font-bold text-green-600">{meal.potassium}mg</p>
                          </div>
                        )}
                      </div>

                      {meal.disease_rationale && (
                        <Alert className="bg-green-50 border-green-500">
                          <AlertDescription>
                            <strong>💡 Why this meal?</strong> {meal.disease_rationale}
                          </AlertDescription>
                        </Alert>
                      )}

                      {meal.nutritional_tip && !meal.disease_rationale && (
                        <Alert className="bg-blue-50 border-blue-500">
                          <AlertDescription>
                            <strong>💡 Tip:</strong> {meal.nutritional_tip}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* MPESS Integration */}
      {plan.mpess_integration && (
        <Card className="border-none shadow-lg">
          <CardHeader className="bg-gradient-to-r from-pink-500 to-rose-500 text-white">
            <CardTitle>🧘 MPESS Wellness Practices</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Tabs defaultValue="mind" className="space-y-4">
              <TabsList className="grid grid-cols-5">
                <TabsTrigger value="mind">
                  <Brain className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="physical">
                  <Activity className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="emotional">
                  <Heart className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="social">
                  <Users className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="spiritual">
                  <Sparkles className="w-4 h-4" />
                </TabsTrigger>
              </TabsList>

              {['mind', 'physical', 'emotional', 'social', 'spiritual'].map(key => (
                <TabsContent key={key} value={key} className="space-y-2">
                  <h3 className="font-bold text-lg capitalize mb-3">{key} Practices</h3>
                  {plan.mpess_integration[key]?.map((practice, index) => (
                    <div key={index} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-gray-700">{practice}</p>
                    </div>
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Audit Snapshot */}
      <Card className="border-none shadow-lg">
        <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
          <CardTitle>📊 Audit & Compliance Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Avg Calories/Day</p>
              <p className="text-xl font-bold text-indigo-600">
                {plan.audit_snapshot.avg_calories_per_day} kcal
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Calorie Range</p>
              <p className="text-xl font-bold text-purple-600">
                {plan.audit_snapshot.calorie_range}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Macro Split (C/P/F)</p>
              <p className="text-xl font-bold text-pink-600">
                {plan.audit_snapshot.macro_percentages.carbs}% / 
                {plan.audit_snapshot.macro_percentages.protein}% / 
                {plan.audit_snapshot.macro_percentages.fats}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Sodium</p>
              <p className="text-sm font-bold text-blue-600">
                {plan.audit_snapshot.sodium_compliance}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Potassium</p>
              <p className="text-sm font-bold text-green-600">
                {plan.audit_snapshot.potassium_compliance}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Variety Check</p>
              <p className="text-sm font-bold">
                {plan.audit_snapshot.variety_check ? (
                  <span className="text-green-600">✓ >20 unique items</span>
                ) : (
                  <span className="text-orange-600">⚠ Limited variety</span>
                )}
              </p>
            </div>
            {plan.audit_snapshot.medication_conflicts !== undefined && (
              <div>
                <p className="text-sm text-gray-600">Medication Conflicts</p>
                <p className="text-sm font-bold">
                  {plan.audit_snapshot.medication_conflicts ? (
                    <span className="text-red-600">⚠ Flagged</span>
                  ) : (
                    <span className="text-green-600">✓ No conflicts</span>
                  )}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">MPESS Integration</p>
              <p className="text-sm font-bold text-purple-600">
                {plan.audit_snapshot.mpess_integrated ? '✓ Integrated' : '○ Not included'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Alert className="bg-yellow-50 border-yellow-500">
        <AlertTriangle className="w-5 h-5 text-yellow-600" />
        <AlertDescription>
          <strong>⚠️ DISCLAIMER:</strong> This plan is educational and generated based on the provided clinical intake. Final approval and monitoring MUST come from a qualified dietitian or healthcare professional. Regular follow-ups and lab tests are essential.
        </AlertDescription>
      </Alert>
    </div>
  );
}