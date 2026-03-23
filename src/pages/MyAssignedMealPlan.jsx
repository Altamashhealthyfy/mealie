import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, ChefHat, Utensils, Lightbulb, CheckCircle2, History, CalendarDays } from "lucide-react";
import jsPDF from 'jspdf';
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";

export default function MyAssignedMealPlan() {
  const [completedMeals, setCompletedMeals] = useState({});
  const [viewMode, setViewMode] = useState("current"); // "current" or "history"
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [dateFilter, setDateFilter] = useState(null);

  const handleDownload = () => {
    const plan = displayedPlan;
    const doc = new jsPDF();
    const margin = 15;
    let y = 20;

    doc.setFontSize(16);
    doc.setTextColor(108, 95, 199);
    doc.text(plan?.name || 'My Meal Plan', margin, y); y += 8;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`${plan?.duration} Days | ${plan?.food_preference} | ${plan?.target_calories} kcal/day`, margin, y); y += 10;

    const slotOrder = ['early_morning','breakfast','mid_morning','lunch','evening_snack','dinner'];
    const slotLabels = {
      early_morning: 'Early Morning', breakfast: 'Breakfast', mid_morning: 'Mid Morning',
      lunch: 'Lunch', evening_snack: 'Evening Snack', dinner: 'Dinner'
    };

    const mealsByDay = {};
    (plan?.meals || []).forEach(m => {
      if (!mealsByDay[m.day]) mealsByDay[m.day] = [];
      mealsByDay[m.day].push(m);
    });

    Object.keys(mealsByDay).sort((a,b) => a-b).forEach(day => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.setTextColor(108, 95, 199);
      doc.text(`Day ${day}`, margin, y); y += 7;

      const sorted = mealsByDay[day].sort((a,b) =>
        slotOrder.indexOf(a.meal_type) - slotOrder.indexOf(b.meal_type)
      );

      sorted.forEach(meal => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text(`${slotLabels[meal.meal_type] || meal.meal_type}: `, margin + 4, y);
        doc.setFont(undefined, 'normal');
        const nameLines = doc.splitTextToSize(`${meal.meal_name} — ${meal.calories} kcal`, 160);
        doc.text(nameLines, margin + 4, y);
        y += nameLines.length * 5 + 3;
      });
      y += 5;
    });

    const mpess = plan?.mpess_integration;
    if (mpess) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.setTextColor(108, 95, 199);
      doc.text('MPESS Holistic Guidance', margin, y); y += 7;
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      if (mpess.mind?.length) { doc.text(`Mind: ${mpess.mind.join(', ')}`, margin, y); y += 6; }
      if (mpess.physical?.length) { doc.text(`Physical: ${mpess.physical.join(', ')}`, margin, y); y += 6; }
      if (mpess.emotional?.length) { doc.text(`Emotional: ${mpess.emotional.join(', ')}`, margin, y); y += 6; }
      if (mpess.spiritual?.length) { doc.text(`Spiritual: ${mpess.spiritual.join(', ')}`, margin, y); y += 6; }
    }

    doc.save(`${plan?.name || 'meal-plan'}.pdf`);
  };


  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['myClientProfile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      
      // Try to find client by email match
      const clients = await base44.entities.Client.filter({ email: user.email });
      if (clients.length > 0) {
        return clients[0];
      }
      
      // If not found, try by checking if this user's email is in any client record
      // (in case email doesn't match exactly)
      const allClients = await base44.entities.Client.list();
      const matchingClient = allClients.find(c => 
        c.email?.toLowerCase() === user.email?.toLowerCase()
      );
      
      return matchingClient || null;
    },
    enabled: !!user,
  });

  const { data: assignedPlan } = useQuery({
    queryKey: ['myAssignedMealPlan', clientProfile?.id],
    queryFn: async () => {
      // Get meal plans assigned to this client
      const plans = await base44.entities.MealPlan.filter({ 
        client_id: clientProfile?.id,
        active: true 
      });
      return plans[0] || null;
    },
    enabled: !!clientProfile,
  });

  const { data: allMealPlans } = useQuery({
    queryKey: ['allClientMealPlans', clientProfile?.id],
    queryFn: async () => {
      // Get all meal plans for this client (active and inactive)
      const plans = await base44.entities.MealPlan.filter({ 
        client_id: clientProfile?.id
      });
      return plans.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!clientProfile,
  });

  // Filter plans by date if date filter is set
  const filteredPlans = React.useMemo(() => {
    if (!allMealPlans) return [];
    if (!dateFilter) return allMealPlans;
    
    return allMealPlans.filter(plan => {
      const planDate = new Date(plan.created_date);
      const filterDate = new Date(dateFilter);
      return planDate.toDateString() === filterDate.toDateString();
    });
  }, [allMealPlans, dateFilter]);

  const displayedPlan = viewMode === "current" 
    ? assignedPlan 
    : (selectedPlanId ? allMealPlans?.find(p => p.id === selectedPlanId) : filteredPlans?.[0]);

  const mealTypeOrder = {
    "early_morning": 0,
    "breakfast": 1,
    "mid_morning": 2,
    "lunch": 3,
    "evening_snack": 4,
    "dinner": 5,
    "post_dinner": 6
  };

  const groupedMeals = {};
  displayedPlan?.meals?.forEach(meal => {
    if (!groupedMeals[meal.day]) {
      groupedMeals[meal.day] = [];
    }
    groupedMeals[meal.day].push(meal);
  });

  const toggleMealComplete = async (day, meal) => {
    const key = `${day}-${meal.meal_type}`;
    const isNowCompleted = !completedMeals[key];

    setCompletedMeals(prev => ({
      ...prev,
      [key]: isNowCompleted
    }));

    if (isNowCompleted && clientProfile?.id) {
      // Auto-create food log entry from prescribed meal
      await base44.entities.FoodLog.create({
        client_id: clientProfile.id,
        date: format(new Date(), 'yyyy-MM-dd'),
        meal_type: meal.meal_type,
        meal_name: meal.meal_name,
        items: meal.items || [],
        portion_sizes: meal.portion_sizes || [],
        calories: meal.calories || 0,
        protein: meal.protein || 0,
        carbs: meal.carbs || 0,
        fats: meal.fats || 0,
        notes: 'Followed prescribed plan ✅',
      });
    }
  };

  if (!clientProfile) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl">
          <CardHeader>
            <CardTitle>No Client Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Your dietitian needs to create your client profile first.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!assignedPlan && viewMode === "current") {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">My Meal Plan</h1>
              <p className="text-gray-600">Your personalized nutrition plan</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setViewMode("history")}
              className="border-orange-500 text-orange-600"
            >
              <History className="w-4 h-4 mr-2" />
              View Previous Plans
            </Button>
          </div>

          <Card className="border-none shadow-xl">
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Meal Plan Assigned Yet
              </h3>
              <p className="text-gray-600 mb-4">
                Your dietitian will create and assign a personalized meal plan for you soon.
              </p>
              <p className="text-sm text-gray-500">
                In the meantime, you can track your MPESS wellness and message your dietitian.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!displayedPlan && viewMode === "current" && clientProfile) {
    return <div style={{padding:'2rem'}}>Loading your meal plan...</div>;
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Meal Plan</h1>
            <p className="text-gray-600">Follow your personalized nutrition plan</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={viewMode === "current" ? "default" : "outline"}
              onClick={() => {
                setViewMode("current");
                setSelectedPlanId(null);
                setDateFilter(null);
              }}
              className={viewMode === "current" ? "bg-orange-500" : "border-orange-500 text-orange-600"}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Current Plan
            </Button>
            <Button
              variant={viewMode === "history" ? "default" : "outline"}
              onClick={() => setViewMode("history")}
              className={viewMode === "history" ? "bg-orange-500" : "border-orange-500 text-orange-600"}
            >
              <History className="w-4 h-4 mr-2" />
              Previous Plans
            </Button>
            {displayedPlan && (
              <Button
                onClick={handleDownload}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                📄 Download PDF
              </Button>
            )}
          </div>
        </div>

        {/* Previous Plans Section */}
        {viewMode === "history" && (
          <Card className="border-none shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Previous Meal Plans
                </CardTitle>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="border-orange-500 text-orange-600">
                      <CalendarDays className="w-4 h-4 mr-2" />
                      {dateFilter ? format(dateFilter, 'MMM dd, yyyy') : 'Filter by Date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={dateFilter}
                      onSelect={(date) => {
                        setDateFilter(date);
                        setSelectedPlanId(null);
                      }}
                    />
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => setDateFilter(null)}
                      >
                        Clear Filter
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </CardHeader>
            <CardContent>
              {(dateFilter ? filteredPlans : allMealPlans)?.length > 0 ? (
                <div className="space-y-3">
                  {(dateFilter ? filteredPlans : allMealPlans).map(plan => (
                    <div
                      key={plan.id}
                      onClick={() => {
                        setSelectedPlanId(plan.id);
                        setDateFilter(null);
                      }}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedPlanId === plan.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{plan.name}</h3>
                          <div className="flex flex-wrap gap-2 mb-2">
                            <Badge className="bg-orange-500 text-white">{plan.duration} Days</Badge>
                            <Badge className="bg-blue-500 text-white capitalize">{plan.food_preference}</Badge>
                            <Badge className="bg-purple-500 text-white">{plan.target_calories} kcal/day</Badge>
                            {plan.active && <Badge className="bg-green-500 text-white">Active</Badge>}
                          </div>
                          <p className="text-sm text-gray-600">
                            Created: {format(new Date(plan.created_date), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No previous meal plans found{dateFilter ? ' for this date' : ''}.</p>
                  {dateFilter && (
                    <Button
                      variant="link"
                      onClick={() => setDateFilter(null)}
                      className="text-orange-600 mt-2"
                    >
                      Clear date filter
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!displayedPlan && viewMode === "history" && (
          <Card className="border-none shadow-xl">
            <CardContent className="p-12 text-center">
              <History className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Select a Plan to View
              </h3>
              <p className="text-gray-600">
                Choose a meal plan from the list above to view its details.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Plan Overview */}
        {displayedPlan && (
          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-3xl mb-2">{displayedPlan.name}</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-orange-500 text-white">{displayedPlan.duration} Days</Badge>
                    <Badge className="bg-blue-500 text-white capitalize">{displayedPlan.food_preference}</Badge>
                    <Badge className="bg-green-500 text-white capitalize">{displayedPlan.regional_preference}</Badge>
                    <Badge className="bg-purple-500 text-white">{displayedPlan.target_calories} kcal/day</Badge>
                    {displayedPlan.active && <Badge className="bg-green-500 text-white">Active</Badge>}
                    {viewMode === "history" && (
                      <Badge variant="outline">
                        Created: {format(new Date(displayedPlan.created_date), 'MMM dd, yyyy')}
                      </Badge>
                    )}
                  </div>
                </div>
                <Utensils className="w-12 h-12 text-orange-500" />
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Daily Meal Plans */}
        {displayedPlan && (
          <Tabs defaultValue={`day-${Object.keys(groupedMeals).sort((a, b) => a - b)[0]}`} className="space-y-4">
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
                .sort((a, b) => (mealTypeOrder[a.meal_type] || 999) - (mealTypeOrder[b.meal_type] || 999))
                .map((meal, idx) => {
                  const mealKey = `${day}-${meal.meal_type}`;
                  const isCompleted = completedMeals[mealKey];

                  return (
                    <Card 
                      key={idx} 
                      className={`border-none shadow-lg bg-white/80 backdrop-blur hover:shadow-xl transition-all ${
                        isCompleted ? 'opacity-60' : ''
                      }`}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <Checkbox
                              checked={isCompleted}
                              onCheckedChange={() => toggleMealComplete(day, meal)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-orange-600 border-orange-300">
                                  {meal.meal_type}
                                </Badge>
                                {isCompleted && (
                                  <Badge className="bg-green-500 text-white">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Completed
                                  </Badge>
                                )}
                              </div>
                              <CardTitle className={`text-2xl ${isCompleted ? 'line-through text-gray-500' : ''}`}>
                                {meal.meal_name}
                              </CardTitle>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-bold text-orange-600">{meal.calories}</p>
                            <p className="text-xs text-gray-500">kcal</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <ChefHat className="w-4 h-4" />
                            What to Eat
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
                  );
                })}
            </TabsContent>
          ))}
          </Tabs>
        )}
      </div>


    </div>
  );
}