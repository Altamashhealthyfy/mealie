import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar, ChefHat, Utensils, Lightbulb, CheckCircle2, History, CalendarDays } from "lucide-react";
import { logAction } from "@/lib/logAction";

import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";

export default function MyAssignedMealPlan() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState("current"); // "current" or "history"
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [dateFilter, setDateFilter] = useState(null);

  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const margin = 14;
      const pageW = doc.internal.pageSize.getWidth();
      let y = 0;

      const PURPLE = [108, 95, 199];
      const DARK = [30, 30, 30];
      const GRAY = [100, 100, 100];
      const LIGHT = [240, 238, 255];
      const WHITE = [255, 255, 255];

      const addPage = () => { doc.addPage(); y = 20; };
      const checkPage = (needed = 20) => { if (y + needed > 275) addPage(); };

      // ── COVER HEADER ──
      doc.setFillColor(...PURPLE);
      doc.rect(0, 0, pageW, 42, 'F');

      doc.setFontSize(20);
      doc.setTextColor(...WHITE);
      doc.setFont('helvetica', 'bold');
      doc.text('MEALIE PRO', margin, 16);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Powered by Healthyfy Institute', margin, 24);

      doc.setFontSize(9);
      doc.text('app.mealiepro.com', pageW - margin, 24, { align: 'right' });

      y = 52;

      // ── PLAN TITLE ──
      doc.setFontSize(16);
      doc.setTextColor(...DARK);
      doc.setFont('helvetica', 'bold');
      const planTitle = assignedPlan?.name || displayedPlan?.name || 'My Meal Plan';
      const titleLines = doc.splitTextToSize(planTitle, pageW - margin * 2);
      doc.text(titleLines, margin, y);
      y += titleLines.length * 7 + 4;

      // ── PLAN META ──
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY);
      const meta = [
        displayedPlan?.duration ? `Duration: ${displayedPlan.duration} Days` : '',
        displayedPlan?.food_preference ? `Diet: ${displayedPlan.food_preference}` : '',
        displayedPlan?.target_calories ? `Target: ${displayedPlan.target_calories} kcal/day` : '',
      ].filter(Boolean).join('  |  ');
      doc.text(meta, margin, y); y += 6;

      // Divider line
      doc.setDrawColor(...PURPLE);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageW - margin, y); y += 8;

      // ── SLOT ORDER AND LABELS ──
      const slotOrder = ['early_morning','breakfast','mid_morning','lunch','evening_snack','dinner'];
      const slotLabels = {
        early_morning: 'Early Morning',
        breakfast: 'Breakfast',
        mid_morning: 'Mid Morning',
        lunch: 'Lunch',
        evening_snack: 'Evening Snack',
        dinner: 'Dinner'
      };

      // ── GROUP MEALS BY DAY ──
      const mealsByDay = {};
      (displayedPlan?.meals || []).forEach(m => {
        if (!mealsByDay[m.day]) mealsByDay[m.day] = [];
        mealsByDay[m.day].push(m);
      });

      // ── RENDER EACH DAY ──
      const sortedDays = Object.keys(mealsByDay).sort((a, b) => Number(a) - Number(b));

      for (const day of sortedDays) {
        checkPage(40);

        // Day header bar
        doc.setFillColor(...PURPLE);
        doc.roundedRect(margin, y, pageW - margin * 2, 10, 2, 2, 'F');
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...WHITE);
        doc.text(`DAY ${day}`, margin + 4, y + 7);

        // Daily calorie total
        const dayTotal = mealsByDay[day].reduce((sum, m) => sum + (m.calories || 0), 0);
        doc.setFontSize(9);
        doc.text(`Total: ${dayTotal} kcal`, pageW - margin - 4, y + 7, { align: 'right' });
        y += 14;

        // Sort meals by slot order
        const sorted = mealsByDay[day].sort((a, b) =>
          slotOrder.indexOf(a.meal_type) - slotOrder.indexOf(b.meal_type)
        );

        for (const meal of sorted) {
          checkPage(28);

          // Meal slot background
          doc.setFillColor(...LIGHT);
          doc.roundedRect(margin, y, pageW - margin * 2, 24, 1.5, 1.5, 'F');

          // Slot label
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...PURPLE);
          doc.text(slotLabels[meal.meal_type] || meal.meal_type, margin + 3, y + 7);

          // Calories badge
          doc.setFillColor(...PURPLE);
          doc.roundedRect(pageW - margin - 28, y + 2, 26, 8, 2, 2, 'F');
          doc.setFontSize(8);
          doc.setTextColor(...WHITE);
          doc.text(`${meal.calories || 0} kcal`, pageW - margin - 15, y + 7.5, { align: 'center' });

          // Meal name
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...DARK);
          const nameLines = doc.splitTextToSize(meal.meal_name || '', pageW - margin * 2 - 35);
          doc.text(nameLines, margin + 3, y + 14);

          // Portion
          const portionText = Array.isArray(meal.portion_sizes) ? meal.portion_sizes.join(', ') : meal.portion_sizes;
          if (portionText) {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...GRAY);
            const portionLines = doc.splitTextToSize(`Portion: ${portionText}`, pageW - margin * 2 - 10);
            doc.text(portionLines, margin + 3, y + 20);
          }

          // Macros row
          const macroY = y + (portionText ? 26 : 22);
          checkPage(10);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...GRAY);
          const macroText = `P: ${meal.protein || 0}g  |  C: ${meal.carbs || 0}g  |  F: ${meal.fats || 0}g`;
          doc.text(macroText, margin + 3, macroY);

          // Notes / nutritional tip
          const noteVal = meal.nutritional_tip || meal.notes;
          if (noteVal) {
            checkPage(8);
            doc.setFontSize(7.5);
            doc.setTextColor(100, 120, 0);
            const noteLines = doc.splitTextToSize(`* ${noteVal}`, pageW - margin * 2 - 6);
            doc.text(noteLines, margin + 3, macroY + 5);
            y += noteLines.length * 4;
          }

          y += portionText ? 32 : 28;
        }

        y += 6;
      }

      // ── MPESS SECTION ──
      const mpess = displayedPlan?.mpess?.[0];
      if (mpess && (mpess.sleep || mpess.movement || mpess.stress)) {
        checkPage(60);

        doc.setFillColor(...PURPLE);
        doc.rect(0, y, pageW, 12, 'F');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...WHITE);
        doc.text('MPESS — YOUR WELLNESS GUIDANCE', margin, y + 8);
        y += 18;

        const mpessItems = [
          { label: 'Sleep', value: mpess.sleep },
          { label: 'Stress Management', value: mpess.stress },
          { label: 'Movement', value: mpess.movement },
          { label: 'Mindfulness', value: mpess.mindfulness },
          { label: 'Pranayam', value: mpess.pranayam }
        ];

        for (const item of mpessItems) {
          if (!item.value) continue;
          checkPage(20);

          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...PURPLE);
          doc.text(item.label, margin, y); y += 5;

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...DARK);
          const lines = doc.splitTextToSize(item.value, pageW - margin * 2);
          doc.text(lines, margin, y);
          y += lines.length * 5 + 6;
        }
      }

      // ── FOOTER ON EVERY PAGE ──
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        const footY = doc.internal.pageSize.getHeight() - 10;
        doc.setFillColor(...PURPLE);
        doc.rect(0, footY - 4, pageW, 14, 'F');
        doc.setFontSize(8);
        doc.setTextColor(...WHITE);
        doc.setFont('helvetica', 'normal');
        doc.text('Mealie Pro — Powered by Healthyfy Institute', margin, footY + 4);
        doc.text(`Page ${i} of ${totalPages}`, pageW - margin, footY + 4, { align: 'right' });
      }

      // ── SAVE ──
      const safeName = (displayedPlan?.name || 'meal-plan')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .slice(0, 50);
      doc.save(`${safeName}.pdf`);

    logAction({ action: "export_meal_plan", status: "success", pageSection: "ClientMealPlan", metadata: { plan_name: displayedPlan?.name, client_id: clientProfile?.id } }).catch(() => {});
    } catch(err) {
      logAction({ action: "export_meal_plan", status: "error", pageSection: "ClientMealPlan", errorMessage: err.message }).catch(() => {});
      console.error('PDF error:', err);
      alert('Could not generate PDF: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };


  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
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
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: assignedPlan, refetch: refetchAssignedPlan } = useQuery({
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
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });

  const { data: allMealPlans, refetch: refetchAllPlans } = useQuery({
    queryKey: ['allClientMealPlans', clientProfile?.id],
    queryFn: async () => {
      // Get all meal plans for this client (active and inactive)
      const plans = await base44.entities.MealPlan.filter({ 
        client_id: clientProfile?.id
      });
      return plans.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!clientProfile,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });

  // Log view_meal_plan when plan is loaded
  useEffect(() => {
    if (assignedPlan && clientProfile) {
      logAction({ action: "view_meal_plan", status: "success", pageSection: "ClientMealPlan", userEmail: user?.email, userType: "client", metadata: { plan_id: assignedPlan.id, plan_name: assignedPlan.name, client_id: clientProfile.id } });
    }
  }, [assignedPlan?.id]);

  // Real-time subscription: auto-refetch when coach saves a new plan for this client
  useEffect(() => {
    if (!clientProfile?.id) return;
    const unsubscribe = base44.entities.MealPlan.subscribe((event) => {
      if (event.data?.client_id === clientProfile.id) {
        refetchAssignedPlan();
        refetchAllPlans();
      }
    });
    return () => unsubscribe();
  }, [clientProfile?.id]);

  // Filter plans by date if date filter is set
  const filteredPlans = useMemo(() => {
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

  const today = new Date().toISOString().split('T')[0];

  // tickedMeals: { [meal_type]: logId | true } — source of truth for UI
  const [tickedMeals, setTickedMeals] = useState({});
  const [tickedInitialized, setTickedInitialized] = useState(false);

  const { data: todayLogs } = useQuery({
    queryKey: ['foodLogs', clientProfile?.id, today],
    queryFn: () => base44.entities.FoodLog.filter({ client_id: clientProfile?.id, date: today }),
    enabled: !!clientProfile?.id,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Seed tickedMeals from server data once loaded
  useEffect(() => {
    if (!todayLogs) return;
    const seeded = {};
    todayLogs.forEach(log => {
      if (log.source === 'meal_plan' || log.plan_adherent === true) {
        seeded[log.meal_type] = log.id;
      }
    });
    setTickedMeals(seeded);
    setTickedInitialized(true);
  }, [todayLogs]);

  const isMealTicked = (meal) => !!tickedMeals[meal.meal_type];

  const handleMealTick = async (meal) => {
    const existingLogId = tickedMeals[meal.meal_type];

    if (existingLogId) {
      // Optimistic untick
      setTickedMeals(prev => { const n = {...prev}; delete n[meal.meal_type]; return n; });
      // Delete all logs for this meal_type today (clean up any duplicates too)
      const allForSlot = todayLogs?.filter(l => l.meal_type === meal.meal_type && (l.source === 'meal_plan' || l.plan_adherent));
      for (const log of (allForSlot || [])) {
        await base44.entities.FoodLog.delete(log.id);
      }
    } else {
      // Optimistic tick
      setTickedMeals(prev => ({ ...prev, [meal.meal_type]: 'pending' }));
      const created = await base44.entities.FoodLog.create({
        client_id: clientProfile?.id,
        date: today,
        meal_type: meal.meal_type,
        food_items: meal.meal_name,
        meal_name: meal.meal_name,
        calories: meal.calories || 0,
        protein: meal.protein || 0,
        carbs: meal.carbs || 0,
        fats: meal.fats || 0,
        notes: meal.nutritional_tip || '',
        source: 'meal_plan',
        plan_adherent: true,
        meal_plan_id: assignedPlan?.id,
        items: meal.items || [],
        portion_sizes: meal.portion_sizes || [],
      });
      setTickedMeals(prev => ({ ...prev, [meal.meal_type]: created?.id || 'done' }));
    }
    queryClient.invalidateQueries(['foodLogs', clientProfile?.id, today]);
    queryClient.invalidateQueries(['todayFoodLogs']);
  };

  const groupedMeals = useMemo(() => {
    const ORDER = {"early_morning":0,"early morning":0,"breakfast":1,"mid_morning":2,"mid morning":2,"lunch":3,"evening_snack":4,"evening snack":4,"snack":4,"dinner":5,"post_dinner":6,"post dinner":6};
    const getOrder = (t) => ORDER[(t || '').toLowerCase().trim()] ?? 999;
    const groups = {};
    (displayedPlan?.meals || []).forEach(meal => {
      const day = meal.day;
      if (!groups[day]) groups[day] = [];
      groups[day].push(meal);
    });
    Object.keys(groups).forEach(day => {
      groups[day].sort((a, b) => getOrder(a.meal_type) - getOrder(b.meal_type));
    });
    return groups;
  }, [displayedPlan]);

  const toggleMealComplete = async (day, meal) => {
    // Delegated to handleMealTick
    handleMealTick(meal);
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
              <button
                onClick={handleDownload}
                disabled={downloading}
                style={{
                  display:'flex', alignItems:'center', gap:'8px',
                  background: downloading ? '#9B8FD8' : '#6C5FC7',
                  color:'white', padding:'10px 20px', borderRadius:'8px',
                  border:'none', cursor: downloading ? 'not-allowed' : 'pointer',
                  fontWeight:'bold', fontSize:'14px'
                }}>
                {downloading ? '⏳ Generating PDF...' : '📄 Download My Plan'}
              </button>
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
              {groupedMeals[day].map((meal, idx) => {
                  const isCurrentDay = viewMode === "current";
                  const ticked = isCurrentDay && isMealTicked(meal);

                  return (
                    <Card 
                      key={idx} 
                      className={`border-none shadow-lg bg-white/80 backdrop-blur hover:shadow-xl transition-all ${
                        ticked ? 'opacity-70' : ''
                      }`}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            {isCurrentDay && (
                              <button
                                onClick={() => handleMealTick(meal)}
                                style={{
                                  width: '26px', height: '26px', borderRadius: '6px', flexShrink: 0, marginTop: '2px',
                                  border: ticked ? '2px solid #16a34a' : '2px solid #d1d5db',
                                  background: ticked ? '#16a34a' : '#fff',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                {ticked && (
                                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <path d="M2 7L5.5 10.5L12 3.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </button>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge variant="outline" className="text-orange-600 border-orange-300 capitalize">
                                  {meal.meal_type.replace('_', ' ')}
                                </Badge>
                                {ticked && (
                                  <Badge className="bg-green-500 text-white">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    ✅ Logged Today
                                  </Badge>
                                )}
                              </div>
                              <CardTitle className={`text-xl md:text-2xl ${ticked ? 'line-through text-gray-500' : ''}`}>
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

      {/* MPESS Wellness Section — using exact TableView pattern */}
      {displayedPlan?.mpess && displayedPlan.mpess.length > 0 && (
        <div className="mt-8 max-w-7xl mx-auto">
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
            <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-3">🌿 MPESS Holistic Guidance</h4>
            <div className="grid grid-cols-1 gap-2">
              {displayedPlan.mpess[0] ? (
                [
                  { icon: "😴", label: "Sleep", key: "sleep" },
                  { icon: "🧘", label: "Stress", key: "stress" },
                  { icon: "🏃", label: "Movement", key: "movement" },
                  { icon: "🧠", label: "Mindfulness", key: "mindfulness" },
                  { icon: "🌬️", label: "Pranayam", key: "pranayam" },
                ].filter(f => displayedPlan.mpess[0][f.key]).map(({ icon, label, key }) => (
                  <div key={key} className="flex gap-2 items-start">
                    <span className="font-semibold text-purple-700 text-xs min-w-[100px] shrink-0">{icon} {label}</span>
                    <span className="text-xs text-purple-600">{displayedPlan.mpess[0][key]}</span>
                  </div>
                ))
              ) : null}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}