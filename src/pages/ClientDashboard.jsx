import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import TourButton from "@/components/common/TourButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingDown, TrendingUp, Calendar, CheckCircle, Target, Activity, Heart, Scale, Flame, Award, AlertCircle, Download, FileText, ChefHat, MessageSquare, Send, Eye } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createPageUrl } from "@/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { jsPDF } from "jspdf";

export default function ClientDashboard() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = React.useState("");
  const [showFeedbackDialog, setShowFeedbackDialog] = React.useState(false);
  const [showPlanDialog, setShowPlanDialog] = React.useState(false);
  const [showDownloadOptionsDialog, setShowDownloadOptionsDialog] = React.useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['clientProfile', user?.email],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ email: user?.email });
      return clients[0] || null;
    },
    enabled: !!user,
  });

  const { data: progressLogs } = useQuery({
    queryKey: ['progressLogs', clientProfile?.id],
    queryFn: () => base44.entities.ProgressLog.filter({ client_id: clientProfile?.id }),
    enabled: !!clientProfile?.id,
    initialData: [],
  });

  const { data: foodLogs } = useQuery({
    queryKey: ['foodLogs', clientProfile?.id],
    queryFn: () => base44.entities.FoodLog.filter({ client_id: clientProfile?.id }),
    enabled: !!clientProfile?.id,
    initialData: [],
  });

  const { data: mealPlan } = useQuery({
    queryKey: ['activeMealPlan', clientProfile?.id],
    queryFn: async () => {
      const plans = await base44.entities.MealPlan.filter({ 
        client_id: clientProfile?.id,
        active: true 
      });
      return plans[0] || null;
    },
    enabled: !!clientProfile?.id,
  });

  const { data: goals } = useQuery({
    queryKey: ['goals', clientProfile?.id],
    queryFn: () => base44.entities.ProgressGoal.filter({ client_id: clientProfile?.id }),
    enabled: !!clientProfile?.id,
    initialData: [],
  });

  const { data: mpessLogs } = useQuery({
    queryKey: ['mpessLogs', user?.email],
    queryFn: () => base44.entities.MPESSTracker.filter({ created_by: user?.email }),
    enabled: !!user,
    initialData: [],
  });

  // Calculate statistics - AFTER all hooks, BEFORE early return
  const sortedProgressLogs = React.useMemo(() => 
    [...(progressLogs || [])].sort((a, b) => new Date(a.date) - new Date(b.date)),
    [progressLogs]
  );
  
  const latestProgress = React.useMemo(() => 
    sortedProgressLogs[sortedProgressLogs.length - 1],
    [sortedProgressLogs]
  );
  
  const initialWeight = clientProfile?.initial_weight || sortedProgressLogs[0]?.weight;
  const currentWeight = latestProgress?.weight || clientProfile?.weight;
  const targetWeight = clientProfile?.target_weight;
  const weightLost = initialWeight && currentWeight ? initialWeight - currentWeight : 0;
  const weightToGo = currentWeight && targetWeight ? currentWeight - targetWeight : 0;
  const progressPercentage = initialWeight && targetWeight && currentWeight 
    ? Math.round(((initialWeight - currentWeight) / (initialWeight - targetWeight)) * 100)
    : 0;

  const last7Days = React.useMemo(() => 
    (foodLogs || []).filter(log => {
      const daysDiff = differenceInDays(new Date(), new Date(log.date));
      return daysDiff <= 7;
    }).length,
    [foodLogs]
  );
  
  const adherencePercentage = Math.round((last7Days / (7 * 6)) * 100);

  const weightChartData = React.useMemo(() => 
    sortedProgressLogs
      .filter(log => log.weight)
      .map(log => ({
        date: format(new Date(log.date), 'MMM dd'),
        weight: log.weight,
        target: targetWeight
      })),
    [sortedProgressLogs, targetWeight]
  );

  const wellnessChartData = React.useMemo(() => 
    sortedProgressLogs
      .filter(log => log.wellness_metrics?.energy_level)
      .slice(-14)
      .map(log => ({
        date: format(new Date(log.date), 'MMM dd'),
        energy: log.wellness_metrics?.energy_level || 0,
        sleep: log.wellness_metrics?.sleep_quality || 0,
        stress: 10 - (log.wellness_metrics?.stress_level || 5)
      })),
    [sortedProgressLogs]
  );

  const mpessAdherence = React.useMemo(() => 
    (mpessLogs || []).slice(-7).map(log => {
      const total = [
        log.mind_practices?.affirmations_completed,
        log.physical_practices?.movement_done,
        log.emotional_practices?.journaling_done,
        log.social_practices?.bonding_activity_done,
        log.spiritual_practices?.meditation_done
      ].filter(Boolean).length;
      return {
        date: format(new Date(log.date), 'MMM dd'),
        completed: total
      };
    }),
    [mpessLogs]
  );

  const activeGoals = React.useMemo(() => 
    (goals || []).filter(g => g.status === 'active'),
    [goals]
  );

  // Today's wellness metrics
  const todayWellness = React.useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayLog = sortedProgressLogs.find(log => log.date === today);
    return todayLog?.wellness_metrics || null;
  }, [sortedProgressLogs]);

  const avgWellness = React.useMemo(() => {
    const recentLogs = sortedProgressLogs.slice(-7).filter(log => log.wellness_metrics);
    if (recentLogs.length === 0) return null;
    
    const avg = {
      energy: 0,
      sleep: 0,
      mood: 0,
      stress: 0
    };
    
    recentLogs.forEach(log => {
      avg.energy += log.wellness_metrics?.energy_level || 0;
      avg.sleep += log.wellness_metrics?.sleep_quality || 0;
      avg.stress += log.wellness_metrics?.stress_level || 0;
      // Convert mood to numeric
      const moodMap = { very_poor: 1, poor: 2, neutral: 3, good: 4, excellent: 5 };
      avg.mood += moodMap[log.wellness_metrics?.mood] || 3;
    });
    
    return {
      energy: (avg.energy / recentLogs.length).toFixed(1),
      sleep: (avg.sleep / recentLogs.length).toFixed(1),
      mood: (avg.mood / recentLogs.length).toFixed(1),
      stress: (avg.stress / recentLogs.length).toFixed(1)
    };
  }, [sortedProgressLogs]);

  const submitFeedbackMutation = useMutation({
    mutationFn: async (feedbackText) => {
      return await base44.entities.Message.create({
        client_id: clientProfile.id,
        sender_type: 'client',
        message: `📝 Meal Plan Feedback:\n\n${feedbackText}`,
        read: false
      });
    },
    onSuccess: () => {
      setFeedback("");
      setShowFeedbackDialog(false);
      alert("✅ Feedback submitted! Your dietitian will review it soon.");
    },
  });

  const handleDownloadPlan = (includeCalories) => {
    if (!mealPlan) return;

    const doc = new jsPDF();
    let yPos = 20;

    // Header with branding
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(249, 115, 22); // Orange color
    doc.text(`${mealPlan.name.toUpperCase()}`, 105, yPos, { align: 'center' });
    
    yPos += 10;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Meal Plan for ${clientProfile.full_name}`, 105, yPos, { align: 'center' });
    
    yPos += 15;
    
    // Plan Overview Section
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Plan Overview', 20, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Duration: ${mealPlan.duration} days`, 20, yPos);
    yPos += 5;
    if (includeCalories) {
      doc.text(`Target Calories: ${mealPlan.target_calories} kcal/day`, 20, yPos);
      yPos += 5;
    }
    doc.text(`Meal Pattern: ${mealPlan.meal_pattern || 'daily'}`, 20, yPos);
    yPos += 5;
    doc.text(`Food Preference: ${mealPlan.food_preference}`, 20, yPos);
    yPos += 5;
    doc.text(`Regional Cuisine: ${mealPlan.regional_preference}`, 20, yPos);
    yPos += 5;
    doc.text(`Created: ${format(new Date(mealPlan.created_date), 'MMM dd, yyyy')}`, 20, yPos);
    
    // Plan tier info
    if (mealPlan.plan_tier === 'advanced') {
      yPos += 5;
      doc.setTextColor(147, 51, 234); // Purple
      doc.text(`Plan Type: Advanced (Disease Reversal)`, 20, yPos);
      doc.setTextColor(0, 0, 0);
    }
    
    yPos += 12;
    doc.setDrawColor(249, 115, 22);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, 190, yPos);
    yPos += 10;

    // Meals by day
    const mealsByDay = {};
    mealPlan.meals.forEach(meal => {
      if (!mealsByDay[meal.day]) mealsByDay[meal.day] = [];
      mealsByDay[meal.day].push(meal);
    });

    Object.keys(mealsByDay).sort((a, b) => parseInt(a) - parseInt(b)).forEach(day => {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      // Day header with background
      doc.setFillColor(254, 243, 199); // Light orange
      doc.rect(15, yPos - 5, 180, 10, 'F');
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(234, 88, 12); // Dark orange
      doc.text(`DAY ${day}`, 20, yPos + 2);
      doc.setTextColor(0, 0, 0);
      yPos += 12;

      mealsByDay[day].forEach(meal => {
        if (yPos > 255) {
          doc.addPage();
          yPos = 20;
        }

        // Meal type and name
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(`${meal.meal_type.toUpperCase().replace(/_/g, ' ')}`, 20, yPos);
        yPos += 5;
        doc.setFontSize(10);
        doc.text(meal.meal_name, 20, yPos);
        yPos += 6;

        // Nutrition info box (only if includeCalories is true)
        if (includeCalories) {
          doc.setFontSize(9);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(100, 100, 100);
          const nutritionText = `${meal.calories || 0} kcal  •  Protein: ${meal.protein || 0}g  •  Carbs: ${meal.carbs || 0}g  •  Fats: ${meal.fats || 0}g`;
          doc.text(nutritionText, 20, yPos);
          doc.setTextColor(0, 0, 0);
          yPos += 6;
        }

        // Food items
        doc.setFontSize(9);
        meal.items.forEach((item, idx) => {
          if (yPos > 275) {
            doc.addPage();
            yPos = 20;
          }
          const itemText = `• ${item} - ${meal.portion_sizes[idx]}`;
          doc.text(itemText, 25, yPos);
          yPos += 4;
        });

        yPos += 2;

        // Advanced plan features
        if (mealPlan.plan_tier === 'advanced') {
          // Disease rationale
          if (meal.disease_rationale) {
            if (yPos > 265) {
              doc.addPage();
              yPos = 20;
            }
            doc.setFont(undefined, 'italic');
            doc.setTextColor(147, 51, 234); // Purple
            const rationaleLines = doc.splitTextToSize(`Disease Benefit: ${meal.disease_rationale}`, 160);
            rationaleLines.forEach(line => {
              doc.text(line, 25, yPos);
              yPos += 4;
            });
            doc.setTextColor(0, 0, 0);
            yPos += 2;
          }

          // Sodium/Potassium info (only if includeCalories is true)
          if (includeCalories && (meal.sodium || meal.potassium)) {
            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);
            let mineralsText = '';
            if (meal.sodium) mineralsText += `Sodium: ${meal.sodium}mg`;
            if (meal.potassium) mineralsText += (mineralsText ? '  •  ' : '') + `Potassium: ${meal.potassium}mg`;
            doc.text(mineralsText, 25, yPos);
            yPos += 4;
          }
        }

        // Nutritional tip
        if (meal.nutritional_tip) {
          if (yPos > 268) {
            doc.addPage();
            yPos = 20;
          }
          doc.setFontSize(9);
          doc.setFont(undefined, 'italic');
          doc.setTextColor(22, 163, 74); // Green
          const tipLines = doc.splitTextToSize(`💡 Tip: ${meal.nutritional_tip}`, 160);
          tipLines.forEach(line => {
            doc.text(line, 25, yPos);
            yPos += 4;
          });
          doc.setTextColor(0, 0, 0);
          doc.setFont(undefined, 'normal');
          yPos += 2;
        }

        yPos += 4;
      });

      // Day summary (only if includeCalories is true)
      if (includeCalories) {
        const dayTotal = mealsByDay[day].reduce((sum, m) => sum + (m.calories || 0), 0);
        const dayProtein = mealsByDay[day].reduce((sum, m) => sum + (m.protein || 0), 0);
        const dayCarbs = mealsByDay[day].reduce((sum, m) => sum + (m.carbs || 0), 0);
        const dayFats = mealsByDay[day].reduce((sum, m) => sum + (m.fats || 0), 0);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text(`Day ${day} Total: ${dayTotal} kcal  •  P: ${dayProtein}g  C: ${dayCarbs}g  F: ${dayFats}g`, 20, yPos);
        yPos += 10;
        doc.setFont(undefined, 'normal');
      } else {
        yPos += 2;
      }
      
      // Separator line
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(20, yPos, 190, yPos);
      yPos += 8;
    });

    // MPESS Integration (if available)
    if (mealPlan.mpess_integration && Object.keys(mealPlan.mpess_integration).length > 0) {
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(147, 51, 234); // Purple
      doc.text('MPESS Wellness Practices', 20, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 8;

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      
      const mpessCategories = {
        mind_practices: 'Mind',
        physical_practices: 'Physical',
        emotional_practices: 'Emotional',
        social_practices: 'Social',
        spiritual_practices: 'Spiritual'
      };

      Object.entries(mpessCategories).forEach(([key, label]) => {
        if (mealPlan.mpess_integration[key] && mealPlan.mpess_integration[key].length > 0) {
          doc.setFont(undefined, 'bold');
          doc.text(`${label}:`, 20, yPos);
          yPos += 4;
          doc.setFont(undefined, 'normal');
          mealPlan.mpess_integration[key].forEach(practice => {
            doc.text(`• ${practice}`, 25, yPos);
            yPos += 4;
          });
          yPos += 2;
        }
      });
    }

    // Footer
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    } else {
      yPos = 280;
    }
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${format(new Date(), 'MMMM dd, yyyy')}`, 105, yPos, { align: 'center' });

    const fileName = includeCalories 
      ? `${mealPlan.name.replace(/\s+/g, '-')}-with-calories.pdf`
      : `${mealPlan.name.replace(/\s+/g, '-')}-without-calories.pdf`;
    doc.save(fileName);
    
    setShowDownloadOptionsDialog(false);
  };

  // Early return AFTER all hooks are defined
  if (!user || !clientProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Welcome back, {clientProfile.full_name?.split(' ')[0]}! 👋
            </h1>
            <p className="text-gray-600">Here's your health journey progress</p>
          </div>
          <TourButton pageName="ClientDashboard" />
        </div>

        {/* Key Stats */}
        <div id="client-overview" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Current Weight</p>
                  <p className="text-3xl font-bold text-gray-900">{currentWeight || '--'}</p>
                  <p className="text-xs text-gray-500">kg</p>
                </div>
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                  <Scale className="w-6 h-6 text-white" />
                </div>
              </div>
              {weightLost !== 0 && (
                <div className="mt-3 flex items-center gap-1">
                  {weightLost > 0 ? (
                    <TrendingDown className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  )}
                  <span className={`text-sm font-semibold ${weightLost > 0 ? 'text-green-600' : 'text-blue-600'}`}>
                    {Math.abs(weightLost).toFixed(1)} kg {weightLost > 0 ? 'lost' : 'gained'}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Goal Progress</p>
                  <p className="text-3xl font-bold text-gray-900">{Math.max(0, progressPercentage)}%</p>
                  <p className="text-xs text-gray-500">{Math.abs(weightToGo).toFixed(1)} kg to go</p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all" 
                    style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-yellow-50 to-amber-50">
            <CardContent className="p-6">
              <div className="flex flex-col">
                <p className="text-sm text-gray-600 mb-2">Energy Level</p>
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-bold text-gray-900">
                    {todayWellness?.energy_level || avgWellness?.energy || '--'}
                  </p>
                  <span className="text-xs text-gray-500">/10</span>
                </div>
                {avgWellness && (
                  <p className="text-xs text-gray-500 mt-2">
                    7-day avg: {avgWellness.energy}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
            <CardContent className="p-6">
              <div className="flex flex-col">
                <p className="text-sm text-gray-600 mb-2">Sleep Quality</p>
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-bold text-gray-900">
                    {todayWellness?.sleep_quality || avgWellness?.sleep || '--'}
                  </p>
                  <span className="text-xs text-gray-500">/10</span>
                </div>
                {avgWellness && (
                  <p className="text-xs text-gray-500 mt-2">
                    7-day avg: {avgWellness.sleep}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-pink-50 to-rose-50">
            <CardContent className="p-6">
              <div className="flex flex-col">
                <p className="text-sm text-gray-600 mb-2">Mood Today</p>
                <p className="text-2xl font-bold text-gray-900 capitalize">
                  {todayWellness?.mood ? (
                    todayWellness.mood === 'excellent' ? '😄 Excellent' :
                    todayWellness.mood === 'good' ? '😊 Good' :
                    todayWellness.mood === 'neutral' ? '😐 Neutral' :
                    todayWellness.mood === 'poor' ? '😔 Poor' :
                    '😞 Very Poor'
                  ) : '--'}
                </p>
                {avgWellness && (
                  <p className="text-xs text-gray-500 mt-2">
                    7-day avg: {avgWellness.mood}/5
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardContent className="p-6">
              <div className="flex flex-col">
                <p className="text-sm text-gray-600 mb-2">Stress Level</p>
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-bold text-gray-900">
                    {todayWellness?.stress_level || avgWellness?.stress || '--'}
                  </p>
                  <span className="text-xs text-gray-500">/10</span>
                </div>
                {avgWellness && (
                  <p className="text-xs text-gray-500 mt-2">
                    7-day avg: {avgWellness.stress}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Wellness Metrics Grid - New Enhanced Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <Card className="border-none shadow-lg bg-gradient-to-br from-yellow-50 to-orange-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-yellow-600" />
                Energy Levels
              </CardTitle>
            </CardHeader>
            <CardContent>
              {wellnessChartData.length > 0 ? (
                <>
                  <div className="text-center mb-4">
                    <p className="text-5xl font-bold text-yellow-600">
                      {todayWellness?.energy_level || avgWellness?.energy || '--'}
                    </p>
                    <p className="text-sm text-gray-600">out of 10</p>
                    {todayWellness?.energy_level && avgWellness && (
                      <Badge className={
                        parseFloat(todayWellness.energy_level) > parseFloat(avgWellness.energy) 
                          ? 'bg-green-500 mt-2' 
                          : 'bg-gray-500 mt-2'
                      }>
                        {parseFloat(todayWellness.energy_level) > parseFloat(avgWellness.energy) ? '↑ Above avg' : '↓ Below avg'}
                      </Badge>
                    )}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full transition-all" 
                      style={{ width: `${((todayWellness?.energy_level || avgWellness?.energy || 0) / 10) * 100}%` }}
                    />
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p className="text-sm">No data yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                Sleep Quality
              </CardTitle>
            </CardHeader>
            <CardContent>
              {wellnessChartData.length > 0 ? (
                <>
                  <div className="text-center mb-4">
                    <p className="text-5xl font-bold text-indigo-600">
                      {todayWellness?.sleep_quality || avgWellness?.sleep || '--'}
                    </p>
                    <p className="text-sm text-gray-600">out of 10</p>
                    {todayWellness?.sleep_hours && (
                      <p className="text-xs text-gray-500 mt-1">
                        {todayWellness.sleep_hours} hours
                      </p>
                    )}
                    {todayWellness?.sleep_quality && avgWellness && (
                      <Badge className={
                        parseFloat(todayWellness.sleep_quality) > parseFloat(avgWellness.sleep) 
                          ? 'bg-green-500 mt-2' 
                          : 'bg-gray-500 mt-2'
                      }>
                        {parseFloat(todayWellness.sleep_quality) > parseFloat(avgWellness.sleep) ? '↑ Above avg' : '↓ Below avg'}
                      </Badge>
                    )}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-indigo-400 to-purple-500 h-3 rounded-full transition-all" 
                      style={{ width: `${((todayWellness?.sleep_quality || avgWellness?.sleep || 0) / 10) * 100}%` }}
                    />
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p className="text-sm">No data yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-pink-50 to-rose-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-600" />
                Mood & Wellbeing
              </CardTitle>
            </CardHeader>
            <CardContent>
              {wellnessChartData.length > 0 ? (
                <div className="text-center">
                  <p className="text-5xl mb-2">
                    {todayWellness?.mood === 'excellent' ? '😄' :
                     todayWellness?.mood === 'good' ? '😊' :
                     todayWellness?.mood === 'neutral' ? '😐' :
                     todayWellness?.mood === 'poor' ? '😔' :
                     todayWellness?.mood === 'very_poor' ? '😞' : '😐'}
                  </p>
                  <p className="text-lg font-bold text-gray-900 capitalize">
                    {todayWellness?.mood || 'Not logged'}
                  </p>
                  {avgWellness && (
                    <p className="text-xs text-gray-500 mt-2">
                      7-day mood avg: {avgWellness.mood}/5
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p className="text-sm">No data yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Current Meal Plan Summary */}
        {mealPlan ? (
          <Card id="meal-plan-summary" className="border-none shadow-lg mb-6 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <ChefHat className="w-6 h-6 text-green-600" />
                    Your Active Meal Plan
                  </CardTitle>
                  <CardDescription className="text-gray-700 mt-1">{mealPlan.name}</CardDescription>
                </div>
                <Badge className="bg-green-500 text-white">Active</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Duration</p>
                  <p className="text-xl font-bold text-gray-900">{mealPlan.duration} days</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Target Calories</p>
                  <p className="text-xl font-bold text-gray-900">{mealPlan.target_calories} kcal</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Food Type</p>
                  <p className="text-lg font-bold text-gray-900 capitalize">{mealPlan.food_preference}</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Cuisine</p>
                  <p className="text-lg font-bold text-gray-900 capitalize">{mealPlan.regional_preference}</p>
                </div>
              </div>

              <div className="p-4 bg-white border-2 border-green-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-900">Plan Details</p>
                  <Badge className="bg-blue-100 text-blue-700">
                    {mealPlan.meals?.length || 0} meals
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  {['early_morning', 'breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner'].map(mealType => {
                    const mealsOfType = mealPlan.meals?.filter(m => m.meal_type === mealType).length || 0;
                    return (
                      <div key={mealType} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-gray-700 capitalize">{mealType.replace('_', ' ')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
                  <DialogTrigger asChild>
                    <Button className="flex-1 bg-blue-500 hover:bg-blue-600">
                      <Eye className="w-4 h-4 mr-2" />
                      View Full Plan
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-2xl">{mealPlan.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {Array.from({ length: mealPlan.duration }, (_, i) => i + 1).map(day => {
                        const dayMeals = mealPlan.meals?.filter(m => m.day === day) || [];
                        const dayTotal = dayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
                        
                        return (
                          <div key={day} className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-xl font-bold text-gray-900">Day {day}</h3>
                              <Badge className="bg-orange-500">{dayTotal} kcal</Badge>
                            </div>
                            <div className="space-y-3">
                              {dayMeals.map((meal, idx) => (
                                <div key={idx} className="p-3 bg-white rounded-lg border">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="font-semibold text-gray-900 capitalize">
                                      {meal.meal_type.replace(/_/g, ' ')} - {meal.meal_name}
                                    </p>
                                    <Badge variant="outline">{meal.calories} kcal</Badge>
                                  </div>
                                  <div className="text-sm text-gray-700 space-y-1">
                                    {meal.items?.map((item, i) => (
                                      <p key={i}>• {item} - {meal.portion_sizes?.[i]}</p>
                                    ))}
                                  </div>
                                  {meal.nutritional_tip && (
                                    <p className="text-xs text-gray-600 mt-2 italic">💡 {meal.nutritional_tip}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </DialogContent>
                </Dialog>

                <Button 
                  onClick={() => setShowDownloadOptionsDialog(true)}
                  variant="outline"
                  className="flex-1 border-green-500 text-green-700 hover:bg-green-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Plan
                </Button>

                <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex-1 border-purple-500 text-purple-700 hover:bg-purple-50">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Give Feedback
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="text-2xl flex items-center gap-2">
                        <MessageSquare className="w-6 h-6 text-purple-600" />
                        Meal Plan Feedback
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Alert className="bg-blue-50 border-blue-300">
                        <AlertDescription className="text-blue-900">
                          Share your thoughts about your meal plan - what's working, what's challenging, or suggestions for improvement.
                        </AlertDescription>
                      </Alert>
                      
                      <Textarea
                        placeholder="Example: I'm enjoying the breakfast options but would like more variety in dinners. The portions are perfect for me..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={6}
                        className="resize-none"
                      />

                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowFeedbackDialog(false);
                            setFeedback("");
                          }}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => submitFeedbackMutation.mutate(feedback)}
                          disabled={!feedback.trim() || submitFeedbackMutation.isPending}
                          className="flex-1 bg-purple-500 hover:bg-purple-600"
                        >
                          {submitFeedbackMutation.isPending ? (
                            <>Sending...</>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Submit Feedback
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Alert className="mb-6 bg-yellow-50 border-yellow-500">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <AlertDescription className="text-yellow-900">
              <strong>No active meal plan assigned yet.</strong> Contact your dietitian to get your personalized meal plan.
            </AlertDescription>
          </Alert>
        )}

        {/* Weight Trend Chart */}
        <Card id="progress-summary" className="border-none shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-orange-500" />
              Weight Progress Over Time
            </CardTitle>
            <CardDescription>Track your weight changes and stay on target</CardDescription>
          </CardHeader>
          <CardContent>
            {weightChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weightChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="weight" stroke="#f97316" strokeWidth={3} name="Current Weight" />
                  <Line type="monotone" dataKey="target" stroke="#10b981" strokeDasharray="5 5" name="Target Weight" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Scale className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No weight data logged yet. Start tracking your progress!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Wellness Trends - Full Width Enhanced */}
        <Card className="border-none shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Heart className="w-6 h-6 text-red-500" />
              Wellness Trends - Last 14 Days
            </CardTitle>
            <CardDescription>Track your energy, sleep quality, and stress levels over time</CardDescription>
          </CardHeader>
          <CardContent>
            {wellnessChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={wellnessChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" />
                  <YAxis domain={[0, 10]} stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="energy" stroke="#f59e0b" strokeWidth={3} name="Energy Level" dot={{ fill: '#f59e0b', r: 5 }} />
                  <Line type="monotone" dataKey="sleep" stroke="#6366f1" strokeWidth={3} name="Sleep Quality" dot={{ fill: '#6366f1', r: 5 }} />
                  <Line type="monotone" dataKey="stress" stroke="#10b981" strokeWidth={3} name="Calm (Low Stress)" dot={{ fill: '#10b981', r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No wellness data yet. Start logging your daily metrics in Progress Tracking!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* MPESS Adherence */}
        <Card className="border-none shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <CheckCircle className="w-6 h-6 text-green-500" />
              MPESS Wellness Practices (Last 7 Days)
            </CardTitle>
            <CardDescription>Mind, Physical, Emotional, Social, Spiritual daily practices</CardDescription>
          </CardHeader>
          <CardContent>
            {mpessAdherence.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mpessAdherence}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" />
                  <YAxis domain={[0, 5]} stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="completed" fill="#8b5cf6" name="Practices Completed" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Start tracking your MPESS wellness practices!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Goals */}
        {activeGoals.length > 0 && (
          <Card className="border-none shadow-lg mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-500" />
                Your Active Goals
              </CardTitle>
              <CardDescription>Track your progress towards your health goals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeGoals.map((goal) => {
                  const progress = goal.start_value && goal.target_value 
                    ? Math.round(((goal.current_value - goal.start_value) / (goal.target_value - goal.start_value)) * 100)
                    : 0;
                  
                  return (
                    <div key={goal.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">{goal.title}</h4>
                          <p className="text-sm text-gray-600">{goal.description}</p>
                        </div>
                        <Badge className="bg-purple-500">
                          {goal.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-700 mb-2">
                        <span>Current: {goal.current_value} {goal.unit}</span>
                        <span>Target: {goal.target_value} {goal.unit}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full transition-all" 
                          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {progress}% complete • Target date: {goal.target_date ? format(new Date(goal.target_date), 'MMM dd, yyyy') : 'Not set'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Download Options Dialog */}
        <Dialog open={showDownloadOptionsDialog} onOpenChange={setShowDownloadOptionsDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl">Download Meal Plan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-gray-600">Choose your download format:</p>
              
              <Button
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                onClick={() => handleDownloadPlan(true)}
              >
                <FileText className="w-4 h-4 mr-2" />
                With Calories & Nutrition Info
              </Button>
              
              <Button
                variant="outline"
                className="w-full border-2 border-orange-500 text-orange-600 hover:bg-orange-50"
                onClick={() => handleDownloadPlan(false)}
              >
                <Download className="w-4 h-4 mr-2" />
                Without Calories (Food Items Only)
              </Button>
              
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowDownloadOptionsDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Recent Activity Summary */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                    <Scale className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Weight Logs</p>
                    <p className="text-sm text-gray-600">{progressLogs.length} entries</p>
                  </div>
                </div>
                {latestProgress && (
                  <Badge className="bg-orange-500">
                    Latest: {format(new Date(latestProgress.date), 'MMM dd')}
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <Flame className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Food Logs</p>
                    <p className="text-sm text-gray-600">{foodLogs.length} meals logged</p>
                  </div>
                </div>
                {foodLogs.length > 0 && (
                  <Badge className="bg-blue-500">
                    Last 7 days: {last7Days} meals
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                    <Heart className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">MPESS Tracking</p>
                    <p className="text-sm text-gray-600">{mpessLogs.length} days tracked</p>
                  </div>
                </div>
                {mpessLogs.length > 0 && (
                  <Badge className="bg-purple-500">
                    Latest: {format(new Date(mpessLogs[mpessLogs.length - 1]?.date), 'MMM dd')}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}