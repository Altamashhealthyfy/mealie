import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle2, Loader2, Save, RefreshCw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function MealPlanDiagnostic() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const clientIdFromParam = searchParams.get('client');
  
  const [selectedClientId, setSelectedClientId] = useState(clientIdFromParam || '');
  const [diagnostics, setDiagnostics] = useState(null);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [mealCount, setMealCount] = useState('4');
  const [durationDays, setDurationDays] = useState('7');
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [planVersions, setPlanVersions] = useState([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ['mealPlanClients'],
    queryFn: () => base44.entities.Client.list('-created_date', 100),
  });

  // Trigger Diagnostics
  const handleCalculateDiagnostics = async () => {
    if (!selectedClientId) {
      alert('Please select a client');
      return;
    }
    
    setLoadingDiagnostics(true);
    try {
      const response = await base44.functions.invoke('calculateMealPlanDiagnostics', {
        client_id: selectedClientId
      });
      setDiagnostics(response.data);
      setGeneratedPlan(null);
      setPlanVersions([]);
    } catch (error) {
      alert('Error calculating diagnostics: ' + error.message);
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  // Generate Meal Plan
  const handleGeneratePlan = async () => {
    if (!diagnostics) {
      alert('Please calculate diagnostics first');
      return;
    }

    setLoadingPlan(true);
    try {
      const response = await base44.functions.invoke('generateFinalMealPlan', {
        client_id: selectedClientId,
        diagnostics,
        meal_count: parseInt(mealCount),
        duration_days: parseInt(durationDays),
        previousPlanDishNames: planVersions.length > 0 ? 
          planVersions.flatMap(p => p.meals.map(m => m.meal_name)) : []
      });
      
      const newVersion = response.data;
      setPlanVersions([...planVersions, newVersion]);
      setCurrentVersionIndex(planVersions.length);
      setGeneratedPlan(newVersion);
    } catch (error) {
      alert('Error generating plan: ' + error.message);
    } finally {
      setLoadingPlan(false);
    }
  };

  // Save Plan to Database
  const savePlanMutation = useMutation({
    mutationFn: async (plan) => {
      return base44.entities.MealPlan.create(plan);
    },
    onSuccess: (savedPlan) => {
      alert('✅ Meal plan saved successfully!');
      // Redirect to client management to show saved plan
      setTimeout(() => {
        navigate(`${createPageUrl("ClientManagement")}`);
      }, 500);
    }
  });

  if (!diagnostics) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">Meal Plan Diagnostic Engine</h1>
          <p className="text-gray-600">Step 1: Select a client and analyze their profile</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Client Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Client</label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.full_name} ({client.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleCalculateDiagnostics}
              disabled={!selectedClientId || loadingDiagnostics}
              size="lg"
              className="w-full"
            >
              {loadingDiagnostics ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Analyze Client Profile'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPlan = planVersions[currentVersionIndex];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Meal Plan for {diagnostics.client_name}</h1>
        <p className="text-gray-600">Review diagnostics and generate personalized meal plans</p>
      </div>

      <Tabs defaultValue="diagnostics" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="diagnostics">📋 Diagnostics</TabsTrigger>
          <TabsTrigger value="generation">🍽️ Generate Plan</TabsTrigger>
          <TabsTrigger value="review" disabled={!currentPlan}>✅ Review & Save</TabsTrigger>
        </TabsList>

        {/* DIAGNOSTICS TAB */}
        <TabsContent value="diagnostics" className="space-y-4">
          {/* Nutritional Targets */}
          <Card>
            <CardHeader className="bg-blue-50">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                Calculated Nutritional Targets
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-600">IBW</p>
                  <p className="text-2xl font-bold">{diagnostics.nutritional_targets.ibw} kg</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-xs text-gray-600">BMR</p>
                  <p className="text-2xl font-bold">{diagnostics.nutritional_targets.bmr}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-xs text-gray-600">TDEE</p>
                  <p className="text-2xl font-bold">{diagnostics.nutritional_targets.tdee}</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-xs text-gray-600">Calorie Target</p>
                  <p className="text-2xl font-bold">{diagnostics.nutritional_targets.calorie_target}</p>
                </div>
                <div className="p-4 bg-pink-50 rounded-lg">
                  <p className="text-xs text-gray-600">BMI</p>
                  <p className="text-2xl font-bold">{diagnostics.health_analysis.bmi}</p>
                </div>
              </div>

              <div className="mt-6 grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Protein Target</label>
                  <p className="text-lg">{diagnostics.nutritional_targets.macros.protein_grams}g</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Carbs Target</label>
                  <p className="text-lg">{diagnostics.nutritional_targets.macros.carbs_grams}g</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Fats Target</label>
                  <p className="text-lg">{diagnostics.nutritional_targets.macros.fat_grams}g</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Health Analysis */}
          <Card>
            <CardHeader className="bg-green-50">
              <CardTitle>Health Analysis & Restrictions</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {diagnostics.health_analysis.health_conditions.length > 0 && (
                <div>
                  <p className="font-semibold mb-2">Active Health Conditions:</p>
                  <div className="flex flex-wrap gap-2">
                    {diagnostics.health_analysis.health_conditions.map(hc => (
                      <Badge key={hc} variant="outline">{hc}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold mb-2 text-red-700">Foods to AVOID:</p>
                  <div className="flex flex-wrap gap-2">
                    {diagnostics.health_analysis.foods_to_avoid.slice(0, 5).map((food, i) => (
                      <Badge key={i} className="bg-red-100 text-red-800">{food}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-semibold mb-2 text-green-700">Foods to EMPHASIZE:</p>
                  <div className="flex flex-wrap gap-2">
                    {diagnostics.health_analysis.foods_to_emphasize.slice(0, 5).map((food, i) => (
                      <Badge key={i} className="bg-green-100 text-green-800">{food}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              {diagnostics.health_analysis.cooking_rules.length > 0 && (
                <div>
                  <p className="font-semibold mb-2">Cooking Rules:</p>
                  <ul className="list-disc ml-5 space-y-1">
                    {diagnostics.health_analysis.cooking_rules.map((rule, i) => (
                      <li key={i}>{rule}</li>
                    ))}
                  </ul>
                </div>
              )}

              {diagnostics.health_analysis.medication_interactions && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>{diagnostics.health_analysis.medication_interactions}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Safety Flags */}
          {diagnostics.safety_flags.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-5 h-5" />
                  Safety Flags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {diagnostics.safety_flags.map((flag, i) => (
                    <li key={i} className="text-red-700">{flag}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* GENERATION TAB */}
        <TabsContent value="generation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configure & Generate Meal Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Meals Per Day</label>
                  <Select value={mealCount} onValueChange={setMealCount}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4 Meals</SelectItem>
                      <SelectItem value="5">5 Meals</SelectItem>
                      <SelectItem value="6">6 Meals</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Duration (Days)</label>
                  <Input 
                    type="number" 
                    min="1" 
                    max="30" 
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                  />
                </div>
              </div>

              <Button 
                onClick={handleGeneratePlan}
                disabled={loadingPlan}
                size="lg"
                className="w-full"
              >
                {loadingPlan ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  '🍽️ Generate Meal Plan'
                )}
              </Button>

              {planVersions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">View Version</label>
                  <div className="flex gap-2 flex-wrap">
                    {planVersions.map((_, idx) => (
                      <Button 
                        key={idx}
                        variant={currentVersionIndex === idx ? 'default' : 'outline'}
                        onClick={() => setCurrentVersionIndex(idx)}
                      >
                        v{idx + 1}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* REVIEW & SAVE TAB */}
        {currentPlan && (
          <TabsContent value="review" className="space-y-4">
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle>✅ Meal Plan Ready for Review</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Version {currentVersionIndex + 1} of {planVersions.length}</p>
                <p className="text-sm text-gray-600 mt-2">
                  {currentPlan.meals.length} meal entries across {durationDays} days
                </p>
              </CardContent>
            </Card>

            {/* Audit Snapshot */}
            <Card>
              <CardHeader>
                <CardTitle>Plan Summary</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Avg Daily Calories</p>
                  <p className="text-2xl font-bold">{currentPlan.audit_snapshot.avg_calories_per_day}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Macro Distribution</p>
                  <p className="text-sm">
                    <span className="font-semibold">P:</span> {currentPlan.audit_snapshot.macro_percentages.protein}% 
                    <span className="font-semibold ml-3">C:</span> {currentPlan.audit_snapshot.macro_percentages.carbs}% 
                    <span className="font-semibold ml-3">F:</span> {currentPlan.audit_snapshot.macro_percentages.fats}%
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Meal Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Meal Preview (First 3 Days)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentPlan.meals.slice(0, 12).map((meal, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded border">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">Day {meal.day} - {meal.meal_type}</p>
                        <p className="text-sm text-gray-700">{meal.meal_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{meal.calories} cal</p>
                        <p className="text-xs text-gray-600">P:{meal.protein}g C:{meal.carbs}g F:{meal.fats}g</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Save Button */}
            <Button 
              onClick={() => savePlanMutation.mutate(currentPlan)}
              disabled={savePlanMutation.isPending}
              size="lg"
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {savePlanMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Meal Plan to Database
                </>
              )}
            </Button>

            {/* Regenerate Option */}
            <Button 
              onClick={handleGeneratePlan}
              disabled={loadingPlan}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate Plan
            </Button>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}