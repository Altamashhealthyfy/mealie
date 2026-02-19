import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Calendar, Loader2, Plus, Users, Eye, CheckCircle, Copy, AlertTriangle, Zap, Star, Download, Clock, Target, TrendingUp, Edit, Trash2, CreditCard, FileText, Table, Filter, X } from "lucide-react";
import * as XLSX from 'xlsx';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { createPageUrl } from "@/utils";

import GeneratedMealPlan from "@/components/mealplanner/GeneratedMealPlan";
import UsageLimitWarning from "@/components/mealplanner/UsageLimitWarning";
import ManualMealPlanBuilder from "@/components/mealplanner/ManualMealPlanBuilder";
import ManualTemplateBuilder from "@/components/mealplanner/ManualTemplateBuilder";
import AIMealPlanGenerator from "@/components/mealplanner/AIMealPlanGenerator";

export default function MealPlanner() {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [viewingPlan, setViewingPlan] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [activeTab, setActiveTab] = useState("templates");
  const [showAIWarning, setShowAIWarning] = useState(false);
  const [showEditTemplateDialog, setShowEditTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAITemplateDialog, setShowAITemplateDialog] = useState(false);
  const [generatingAITemplate, setGeneratingAITemplate] = useState(false);
  const [aiGeneratedTemplate, setAiGeneratedTemplate] = useState(null);
  const [aiTemplateForm, setAiTemplateForm] = useState({
    name: "",
    target_calories: "",
    food_preference: "veg",
    regional_preference: "all",
    duration: "7",
    description: "",
    disease_focus: [],
    goal: "",
    age: "",
    height: "",
    weight: "",
    bmi: "",
    bmi_file: null,
    weight_loss_target: "",
    portion_size: "medium"
  });
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [templateToAssign, setTemplateToAssign] = useState(null);
  const [assignmentStartDate, setAssignmentStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showManualTemplateDialog, setShowManualTemplateDialog] = useState(false);
  const [manualTemplateData, setManualTemplateData] = useState(null);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [templateFilters, setTemplateFilters] = useState({
    disease: "all",
    goal: "all",
    foodPreference: "all",
    regionalPreference: "all",
    calorieRange: "all",
    duration: "all"
  });
  const [planConfig, setPlanConfig] = useState({
    duration: 10,
    meal_pattern: 'daily',
  });

  // ALL HOOKS MUST BE CALLED AT THE TOP - BEFORE ANY CONDITIONAL RETURNS
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list('-created_date');
      
      if (user?.user_type === 'super_admin') {
        return allClients;
      }
      
      // For student_coach - show clients they created OR clients assigned to them
      if (user?.user_type === 'student_coach') {
        return allClients.filter(client => {
          const assignedCoaches = Array.isArray(client.assigned_coach) 
            ? client.assigned_coach 
            : client.assigned_coach 
              ? [client.assigned_coach] 
              : [];
          return client.created_by === user?.email || assignedCoaches.includes(user?.email);
        });
      }
      
      return allClients.filter(client => client.created_by === user?.email);
    },
    enabled: !!user && user?.user_type !== 'client',
    initialData: [],
  });

  const { data: mealPlans } = useQuery({
    queryKey: ['mealPlans'],
    queryFn: async () => {
      const allPlans = await base44.entities.MealPlan.list('-created_date');
      
      if (user?.user_type === 'super_admin') {
        return allPlans;
      }
      
      return allPlans.filter(plan => plan.created_by === user?.email);
    },
    enabled: !!user && user?.user_type !== 'client',
    initialData: [],
  });

  const { data: templates } = useQuery({
    queryKey: ['mealPlanTemplates'],
    queryFn: async () => {
      // Fetch all templates - coaches can see all templates
      const allTemplates = await base44.entities.MealPlanTemplate.list('-created_date');
      return allTemplates;
    },
    enabled: !!user && user?.user_type !== 'client',
    initialData: [],
  });

  const { data: coachSubscription } = useQuery({
    queryKey: ['coachSubscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.HealthCoachSubscription.filter({ 
        coach_email: user?.email,
        status: 'active'
      });
      return subs[0] || null;
    },
    enabled: !!user && user?.user_type === 'student_coach',
  });

  const { data: coachPlan } = useQuery({
    queryKey: ['coachPlan', coachSubscription?.plan_id],
    queryFn: async () => {
      if (!coachSubscription?.plan_id) return null;
      const plans = await base44.entities.HealthCoachPlan.filter({ id: coachSubscription.plan_id });
      return plans[0] || null;
    },
    enabled: !!coachSubscription?.plan_id,
  });

  const { data: usage } = useQuery({
    queryKey: ['usage', user?.email, format(new Date(), 'yyyy-MM')],
    queryFn: async () => {
      if (!user?.email) return null;
      const currentMonth = format(new Date(), 'yyyy-MM');
      const usageRecords = await base44.entities.UsageTracking.filter({
        user_email: user?.email,
        month: currentMonth
      });
      return usageRecords[0] || {
        meal_plans_generated: 0,
        plan_limits: { meal_plans: 20, recipes: 50, food_lookups: 50, business_gpts: 10 }
      };
    },
    enabled: !!user && user?.user_type !== 'client',
  });

  // ALL useMemo MUST be after ALL useQuery hooks
  const availableAICredits = React.useMemo(() => {
    if (!coachSubscription || !coachPlan) return 0;
    
    const creditsIncluded = coachPlan.ai_credits_included || 0;
    if (creditsIncluded === -1) return Infinity; // Unlimited
    
    const creditsUsed = coachSubscription.ai_credits_used_this_month || 0;
    const creditsPurchased = coachSubscription.ai_credits_purchased || 0;
    
    return Math.max(0, creditsIncluded + creditsPurchased - creditsUsed);
  }, [coachSubscription, coachPlan]);

  const saveTemplateMutation = useMutation({
    mutationFn: (templateData) => base44.entities.MealPlanTemplate.create(templateData),
    onSuccess: () => {
      queryClient.invalidateQueries(['mealPlanTemplates']);
      alert("✅ Template saved! You can now use it unlimited times for FREE!");
    },
  });

  const saveAITemplateMutation = useMutation({
    mutationFn: (templateData) => base44.entities.MealPlanTemplate.create(templateData),
    onSuccess: () => {
      queryClient.invalidateQueries(['mealPlanTemplates']);
      setShowAITemplateDialog(false);
      setAiGeneratedTemplate(null);
      setAiTemplateForm({
        name: "",
        target_calories: "",
        food_preference: "veg",
        regional_preference: "all",
        duration: "7",
        description: "",
        disease_focus: [],
        goal: "",
        age: "",
        height: "",
        weight: "",
        bmi: "",
        bmi_file: null,
        weight_loss_target: "",
        portion_size: "medium"
      });
        alert("✅ AI template created successfully! Use it unlimited times for FREE!");
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MealPlanTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['mealPlanTemplates']);
      setShowEditTemplateDialog(false);
      setEditingTemplate(null);
      alert("✅ Template updated successfully!");
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.MealPlanTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['mealPlanTemplates']);
      alert("✅ Template deleted successfully!");
    },
  });

  const savePlanMutation = useMutation({
    mutationFn: (planData) => base44.entities.MealPlan.create(planData),
    onSuccess: async () => {
      await queryClient.invalidateQueries(['mealPlans']);
      setGeneratedPlan(null);
      setSelectedClientId(null);
      alert(`✅ Meal plan assigned successfully!\n\nClient will see it in their "My Meal Plan" page`);
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MealPlan.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries(['mealPlans']);
      setGeneratedPlan(null);
      setSelectedClientId(null);
      alert(`✅ Meal plan updated successfully!`);
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id) => base44.entities.MealPlan.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries(['mealPlans']);
      alert(`✅ Meal plan deleted successfully!`);
    },
  });

  const updateUsageMutation = useMutation({
    mutationFn: async ({ type }) => {
      if (!user?.email) throw new Error("User email is not available for usage tracking.");
      const currentMonth = format(new Date(), 'yyyy-MM');
      const usageRecords = await base44.entities.UsageTracking.filter({
        user_email: user?.email,
        month: currentMonth
      });
      
      if (usageRecords.length > 0) {
        const current = usageRecords[0];
        return await base44.entities.UsageTracking.update(current.id, {
          meal_plans_generated: (current.meal_plans_generated || 0) + (type === 'meal_plan' ? 1 : 0),
        });
      } else {
        return await base44.entities.UsageTracking.create({
          user_email: user?.email,
          month: currentMonth,
          meal_plans_generated: type === 'meal_plan' ? 1 : 0,
          plan_limits: { meal_plans: 20, recipes: 50, food_lookups: 50, business_gpts: 10 }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['usage']);
    },
  });

  // Listen for external view meal plan events
  React.useEffect(() => {
    const handleExternalView = (event) => {
      if (event.detail?.plan) {
        setViewingPlan(event.detail.plan);
        setActiveTab("generate");
      }
    };

    window.addEventListener('viewMealPlan', handleExternalView);
    return () => window.removeEventListener('viewMealPlan', handleExternalView);
  }, []);

  // REDIRECT CLIENTS AWAY - After all hooks are defined
  React.useEffect(() => {
    if (user && user.user_type === 'client') {
      alert('⛔ This page is only for dietitians and team members.\n\nClients cannot create meal plans.');
      window.location.href = createPageUrl('MyAssignedMealPlan');
    }
  }, [user]);

  // Check URL parameters for pre-selected client
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('client');
    if (clientId && clients.length > 0) {
      setSelectedClientId(clientId);
      setActiveTab("generate");
    }
  }, [clients]);

  // NOW CONDITIONAL RETURNS ARE SAFE - After all hooks
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        <p className="ml-2 text-gray-600">Loading...</p>
      </div>
    );
  }

  if (user && user.user_type === 'client') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md border-none shadow-xl bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-800 mb-4">
              ⛔ Clients cannot create meal plans. Only dietitians and team members have access to this page.
            </p>
            <p className="text-sm text-red-700">
              Redirecting you to your meal plan page...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const cloneTemplate = (template) => {
    if (!selectedClient) {
      alert("⚠️ Please select a client first before customizing a template");
      return;
    }

    if (!template.meals || template.meals.length === 0) {
      alert("❌ This template has no meals. Please choose a different template.");
      return;
    }

    try {
      console.log('🔵 Cloning template:', template.name);
      console.log('📊 Template duration:', template.duration, 'days');
      console.log('🍽️ Template meals count:', template.meals.length);
      
      // Get unique days in the template and sort them
      const uniqueDays = [...new Set(template.meals.map(m => m.day))].sort((a, b) => a - b);
      console.log('📅 Template has meals for days:', uniqueDays);
      
      if (uniqueDays.length === 0) {
        alert("❌ Template has no valid meal days. Please choose a different template.");
        return;
      }

      // Group meals by day and meal type
      const mealsByDay = {};
      const mealTypesByDay = {};
      template.meals.forEach(meal => {
        if (!mealsByDay[meal.day]) {
          mealsByDay[meal.day] = [];
          mealTypesByDay[meal.day] = new Set();
        }
        mealsByDay[meal.day].push(meal);
        mealTypesByDay[meal.day].add(meal.meal_type);
      });

      // Validate template has multiple meal types per day
      const firstDay = uniqueDays[0];
      const mealTypesInFirstDay = mealTypesByDay[firstDay];
      console.log('🍽️ Meal types in first day:', Array.from(mealTypesInFirstDay));
      
      if (mealTypesInFirstDay.size < 3) {
        const confirmed = window.confirm(
          `⚠️ WARNING: Incomplete Template!\n\n` +
          `This template only has ${mealTypesInFirstDay.size} meal type(s) per day:\n` +
          `${Array.from(mealTypesInFirstDay).join(', ')}\n\n` +
          `A complete meal plan should have 5-6 meals:\n` +
          `- Early Morning\n- Breakfast\n- Mid-Morning\n- Lunch\n- Evening Snack\n- Dinner\n\n` +
          `Do you want to customize it anyway?\n` +
          `(You can add missing meals manually after)`
        );
        
        if (!confirmed) return;
      }

      console.log('📋 Meals per template day:', Object.keys(mealsByDay).map(day => 
        `Day ${day}: ${mealsByDay[day].length} meals (${Array.from(mealTypesByDay[day]).join(', ')})`
      ).join('\n'));

      // Expand meals to cover all days by repeating the pattern
      const expandedMeals = [];
      for (let targetDay = 1; targetDay <= template.duration; targetDay++) {
        // Use modulo to cycle through available days
        const sourceDayIndex = (targetDay - 1) % uniqueDays.length;
        const sourceDay = uniqueDays[sourceDayIndex];
        
        // Copy all meals from source day to target day
        const sourceDayMeals = mealsByDay[sourceDay] || [];
        sourceDayMeals.forEach(meal => {
          expandedMeals.push({
            ...meal,
            day: targetDay
          });
        });
        
        console.log(`✅ Day ${targetDay}: Copied ${sourceDayMeals.length} meals from template day ${sourceDay} (${Array.from(mealTypesByDay[sourceDay]).join(', ')})`);
      }

      console.log('✅ Total expanded meals:', expandedMeals.length);
      console.log('📊 Meals per day:', expandedMeals.reduce((acc, meal) => {
        acc[meal.day] = (acc[meal.day] || 0) + 1;
        return acc;
      }, {}));

      if (expandedMeals.length === 0) {
        alert("❌ Failed to expand template. No meals generated.");
        return;
      }

      setGeneratedPlan({
        plan_name: `${template.name} - ${selectedClient.full_name}`,
        meals: expandedMeals,
        client_id: selectedClient.id,
        client_name: selectedClient.full_name,
        duration: template.duration,
        meal_pattern: 'daily',
        food_preference: template.food_preference,
        regional_preference: template.regional_preference,
        target_calories: template.target_calories,
        from_template: true,
        template_id: template.id
      });

      base44.entities.MealPlanTemplate.update(template.id, {
        times_used: (template.times_used || 0) + 1
      }).then(() => {
          // Invalidate and refetch to ensure template stays available for reuse
       queryClient.invalidateQueries({ queryKey: ['mealPlanTemplates'] });
       await queryClient.refetchQueries({ queryKey: ['mealPlanTemplates'] });
      }).catch(console.error);

      setActiveTab("generate");
    } catch (error) {
      console.error("❌ Error cloning template:", error);
      alert("❌ Failed to customize template. Please try again.");
    }
  };

  const openAssignDialog = (template) => {
    if (!selectedClient) {
      alert("⚠️ Please select a client first before assigning a template");
      return;
    }
    setTemplateToAssign(template);
    setAssignmentStartDate(format(new Date(), 'yyyy-MM-dd'));
    setShowAssignDialog(true);
  };

  const assignTemplateDirectly = async (template, startDate) => {
    if (!selectedClient) {
      alert("⚠️ Please select a client first before assigning a template");
      return;
    }

    if (!template.meals || template.meals.length === 0) {
      alert("❌ This template has no meals. Please choose a different template.");
      return;
    }

    try {
      console.log('🔵 Assigning template directly:', template.name);
      console.log('📊 Template duration:', template.duration, 'days');
      console.log('🍽️ Template meals count:', template.meals.length);
      
      // Get unique days in the template and sort them
      const uniqueDays = [...new Set(template.meals.map(m => m.day))].sort((a, b) => a - b);
      console.log('📅 Template has meals for days:', uniqueDays);
      
      if (uniqueDays.length === 0) {
        alert("❌ Template has no valid meal days. Please choose a different template.");
        return;
      }

      // Group meals by day and meal type
      const mealsByDay = {};
      const mealTypesByDay = {};
      template.meals.forEach(meal => {
        if (!mealsByDay[meal.day]) {
          mealsByDay[meal.day] = [];
          mealTypesByDay[meal.day] = new Set();
        }
        mealsByDay[meal.day].push(meal);
        mealTypesByDay[meal.day].add(meal.meal_type);
      });

      // Validate template has multiple meal types per day
      const firstDay = uniqueDays[0];
      const mealTypesInFirstDay = mealTypesByDay[firstDay];
      console.log('🍽️ Meal types in first day:', Array.from(mealTypesInFirstDay));
      
      // Show detailed confirmation with meal type info
      const mealSummary = uniqueDays.map(day => 
        `Day ${day}: ${mealsByDay[day].length} meals (${Array.from(mealTypesByDay[day]).join(', ')})`
      ).join('\n');
      
      const hasIncompleteDays = Array.from(Object.values(mealTypesByDay)).some(types => types.size < 3);
      
      const confirmed = window.confirm(
        `${hasIncompleteDays ? '⚠️ WARNING: Incomplete Template!\n\n' : '✅ '}Assign "${template.name}" to ${selectedClient.full_name}?\n\n` +
        `📅 Duration: ${template.duration} days\n` +
        `🍽️ Template Meals Breakdown:\n${mealSummary}\n\n` +
        (hasIncompleteDays ? `⚠️ Some days have less than 3 meal types!\n` +
        `A complete plan should have 5-6 meals per day:\n` +
        `- Early Morning, Breakfast, Mid-Morning, Lunch, Evening Snack, Dinner\n\n` : '') +
        `🔄 All ${template.duration} days will be assigned.\n` +
        `You can edit it later from "My Plans" tab.\n\n` +
        `Continue with assignment?`
      );

      if (!confirmed) return;

      console.log('📋 Meals per template day:', Object.keys(mealsByDay).map(day => 
        `Day ${day}: ${mealsByDay[day].length} meals (${Array.from(mealTypesByDay[day]).join(', ')})`
      ).join('\n'));

      // Expand meals to cover all days by repeating the pattern
      const expandedMeals = [];
      for (let targetDay = 1; targetDay <= template.duration; targetDay++) {
        // Use modulo to cycle through available days
        const sourceDayIndex = (targetDay - 1) % uniqueDays.length;
        const sourceDay = uniqueDays[sourceDayIndex];
        
        // Copy all meals from source day to target day
        const sourceDayMeals = mealsByDay[sourceDay] || [];
        sourceDayMeals.forEach(meal => {
          expandedMeals.push({
            ...meal,
            day: targetDay
          });
        });
        
        console.log(`✅ Day ${targetDay}: Copied ${sourceDayMeals.length} meals from template day ${sourceDay} (${Array.from(mealTypesByDay[sourceDay]).join(', ')})`);
      }

      console.log('✅ Total expanded meals:', expandedMeals.length);
      console.log('📊 Meals per assigned day:', expandedMeals.reduce((acc, meal) => {
        acc[meal.day] = (acc[meal.day] || 0) + 1;
        return acc;
      }, {}));

      if (expandedMeals.length === 0) {
        alert("❌ Failed to expand template. No meals generated.");
        return;
      }

      // Verify we have meals for all days
      const assignedDays = [...new Set(expandedMeals.map(m => m.day))];
      if (assignedDays.length !== template.duration) {
        console.error('⚠️ Warning: Not all days have meals!', {
          expected: template.duration,
          actual: assignedDays.length,
          days: assignedDays
        });
      }

      await savePlanMutation.mutateAsync({
        client_id: selectedClient.id,
        name: `${template.name} - ${selectedClient.full_name}`,
        duration: template.duration,
        meal_pattern: 'daily',
        target_calories: template.target_calories,
        meals: expandedMeals,
        food_preference: template.food_preference,
        regional_preference: template.regional_preference,
        active: true,
        created_by: user?.email,
      });

      await base44.entities.MealPlanTemplate.update(template.id, {
        times_used: (template.times_used || 0) + 1
      });

      // Create notification for client
      await base44.entities.Notification.create({
        user_email: selectedClient.email,
        type: 'meal_plan_assigned',
        title: 'New Meal Plan Assigned',
        message: `Your health coach has assigned you a new meal plan: "${template.name}". Duration: ${template.duration} days. Start date: ${format(new Date(startDate), 'MMM d, yyyy')}`,
        link: createPageUrl('MyAssignedMealPlan'),
        priority: 'high'
      });

      queryClient.invalidateQueries(['mealPlanTemplates']);

      alert(`✅ Successfully assigned ${expandedMeals.length} meals across ${template.duration} days to ${selectedClient.full_name}!\n\n📅 Start Date: ${format(new Date(startDate), 'MMM d, yyyy')}\n📧 Notification sent to client`);

      setShowAssignDialog(false);
      setTemplateToAssign(null);
      setActiveTab("saved");
    } catch (error) {
      console.error("❌ Failed to assign template:", error);
      alert(`❌ Failed to assign template: ${error.message}\n\nPlease try again or contact support if the issue persists.`);
    }
  };

  const generateMealPlan = async () => {
    if (!selectedClient) {
      alert("Please select a client first");
      return;
    }

    // Check AI credits for student_coach
    if (user?.user_type === 'student_coach') {
      if (!coachPlan || !coachSubscription) {
        alert("⚠️ No active subscription found.\n\nPlease subscribe to a plan to use AI generation.");
        return;
      }

      if (availableAICredits === 0) {
        const confirmed = window.confirm(
          `⚠️ No AI Credits Available!\n\n` +
          `Cost: ₹${coachPlan.ai_credit_price || 10} per generation\n\n` +
          `Click OK to pay and generate, or Cancel to purchase credits in bulk.`
        );
        
        if (!confirmed) {
          window.location.href = createPageUrl('PurchaseAICredits');
          return;
        }

        // Process payment for 1 credit
        try {
          const totalCost = coachPlan.ai_credit_price || 10;
          
          const orderResponse = await base44.functions.invoke('createCoachPayment', {
            coach_email: user.email,
            amount: totalCost,
            description: `1 AI Credit for Meal Plan Generation`,
            payment_type: 'ai_credits'
          });

          await new Promise((resolve, reject) => {
            const options = {
              key: process.env.RAZORPAY_KEY_ID || 'rzp_test_key',
              amount: totalCost * 100,
              currency: 'INR',
              name: 'Mealie Pro',
              description: '1 AI Credit',
              order_id: orderResponse.order_id,
              handler: async function (response) {
                try {
                  await base44.functions.invoke('verifyCoachPayment', {
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature
                  });

                  await base44.entities.HealthCoachSubscription.update(coachSubscription.id, {
                    ai_credits_purchased: (coachSubscription.ai_credits_purchased || 0) + 1
                  });

                  await base44.entities.AICreditsTransaction.create({
                    coach_email: user.email,
                    subscription_id: coachSubscription.id,
                    transaction_type: 'purchase',
                    credits_amount: 1,
                    cost: totalCost,
                    payment_id: response.razorpay_payment_id,
                    payment_status: 'completed',
                    description: `Purchased 1 AI credit for meal plan generation`
                  });

                  queryClient.invalidateQueries(['coachSubscription']);
                  resolve(response);
                } catch (error) {
                  reject(error);
                }
              },
              modal: {
                ondismiss: function() {
                  reject(new Error('Payment cancelled'));
                }
              },
              theme: {
                color: '#F97316'
              }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
          });

          alert('✅ Payment successful! Generating meal plan...');
        } catch (error) {
          console.error('Payment error:', error);
          alert('❌ Payment failed or cancelled. Please try again.');
          return;
        }
      }
    }

    setGenerating(true);

    try {
      const isWeightGain = selectedClient.goal === 'weight_gain' || selectedClient.goal === 'muscle_gain';
      const isWeightLoss = selectedClient.goal === 'weight_loss';
      
      const calorieDistribution = isWeightLoss 
        ? "Breakfast: 35%, Lunch: 35%, Dinner: 20% (LIGHTEST), Snacks: 10%"
        : isWeightGain
        ? "Breakfast: 35%, Lunch: 35%, Dinner: 30%, Snacks: 15%"
        : "Breakfast: 30%, Lunch: 35%, Dinner: 25%, Snacks: 10%";

      const earlyMorningDrink = isWeightGain
        ? "1 glass warm water (250ml) with 5-6 soaked almonds + 2 dates\n   - SAME drink every day for all 10 days\n   - NO coconut water, NO green tea for weight gain"
        : "1 glass warm water (250ml) with lemon juice (half lemon)\n   - SAME drink every day for all 10 days\n   - NO coconut water, NO green tea in early morning";

      const dinnerOptions = isWeightLoss
        ? `**LIGHT DINNER OPTIONS for weight loss (20% calories max):**
   - Soup + Grilled paneer cubes (50g)
   - Soup + 1 small roti + sautéed veggies
   - Plain dosa sautéed with veggies
   - Small bowl khichdi (1 small katori)
   - Oats upma (1 small bowl)
   - Daliya (broken wheat) upma (1 small katori)
   - Uttapam (1 small) with veggies
   - Sautéed paneer with veggies (50g paneer + 1 bowl veggies)
   - 1 small roti + sabji (1 small katori)
   - Light khichdi with minimal ghee
   
   **CRITICAL: Keep dinners simple and traditional - NO complex items**
   **CRITICAL: Dinner must be LIGHTEST meal - only 20% of daily calories**`
        : `**SUBSTANTIAL DINNER OPTIONS for weight gain/maintenance:**
   - 2 rotis + sabji + dal
   - Khichdi bowl with ghee + curd
   - Oats upma with nuts
   - 2 dosas with chutney + sambar
   - Uttapam with veggies + raita
   - Paneer curry + 2 rotis
   - Daliya with milk and dry fruits
   - Substantial portions for 30% calories`;

      const prompt = `Generate a personalized ${planConfig.duration}-day Indian meal plan with the following details:

Food Preference: ${selectedClient.food_preference}
Regional Preference: ${selectedClient.regional_preference}
Goal: ${selectedClient.goal}
Daily Calories: ${selectedClient.target_calories} kcal
Protein: ${selectedClient.target_protein}g
Carbs: ${selectedClient.target_carbs}g
Fats: ${selectedClient.target_fats}g
Meal Pattern: ${planConfig.meal_pattern}

CRITICAL REQUIREMENTS:

1. PORTION SIZES (MANDATORY) - USE CORRECT UNITS:
   
   **Flatbreads/Pancakes - COUNT IN PIECES:**
   - Roti/Chapati: "2 medium roti (60g total)" NOT katori
   - Paratha: "1 stuffed paratha (80g)" NOT katori
   - Cheela: "1 medium cheela (100g)" NOT katori
   - Dosa: "1 medium dosa (120g)" NOT katori
   - Uttapam: "1 uttapam (150g)" NOT katori
   - Thepla: "2 thepla (70g total)" NOT katori
   
   **Cooked Foods - USE KATORI/BOWL:**
   - Dal: "1 small katori (150g cooked)"
   - Sabji: "1 medium katori (200g cooked)"
   - Rice: "1 small katori (100g cooked)"
   - Khichdi: "1 medium bowl (250g cooked)"
   - Poha: "1 medium katori (150g cooked)"
   - Upma: "1 small katori (150g cooked)"
   - Oats: "1 small bowl (150g cooked)"
   - Daliya: "1 small katori (150g cooked)"
   
   **Drinks - USE CUPS/GLASSES:**
   - Chai/Coffee: "1 cup (240ml)"
   - Milk: "1 glass (200ml)"
   - Buttermilk: "1 glass (200ml)"
   - Soup: "1 bowl (200-250ml)"
   - Green tea: "1 cup (200ml)"
   - Vegetable juice: "1 glass (200ml)"
   
   **Salads/Raita:**
   - "1 small bowl salad (100g)"
   - "1 small katori raita (100g)"
   
   **Snacks - COUNT IN PIECES OR KATORI:**
   - Idli: "2 idli (100g total)" NOT katori
   - Dhokla: "2 pieces (100g)" NOT katori
   - Bhuna chana: "1 small katori (30g)"
   - Murmura: "1 small katori (25g)"
   - Makhana: "1 small katori (20g)"
   - Khakra: "2-3 pieces (30g)"
   
   **Protein Items:**
   - Paneer: "50g cubes (for curry/sabji)"
   - Grilled paneer: "50g cubes"
   
   ALWAYS mention if raw or cooked: "100g cooked rice" or "50g raw oats"

2. KEEP IT SIMPLE - AVOID THESE COMPLEX ITEMS:
   ❌ NO Paneer tikka
   ❌ NO Tofu tikka
   ❌ NO Bread pakora
   ❌ NO Quinoa (not traditional Indian)
   ❌ NO Fusion items
   
   ✅ ONLY Simple, traditional Indian food
   ✅ Home-style cooking
   ✅ Easy to prepare meals

3. CALORIE DISTRIBUTION (STRICTLY FOLLOW):
   ${calorieDistribution}
   
   **CRITICAL: Each day's total calories MUST be EXACTLY ${selectedClient.target_calories} kcal**
   - Calculate meal-wise: Early Morning + Breakfast + Mid-Morning + Lunch + Evening + Dinner = ${selectedClient.target_calories}
   - Adjust portion sizes to match EXACT daily target
   - If total is over/under, reduce/increase portions accordingly
   ${isWeightLoss ? '- Dinner MUST be lightest meal - maximum 20% of daily calories' : ''}
   ${isWeightGain ? '- Weight gain needs substantial dinner - 30% of daily calories' : ''}

4. EARLY MORNING (6-7 AM) - SAME FOR ALL ${planConfig.duration} DAYS:
   ${earlyMorningDrink}
   
   CRITICAL RULES:
   - Give the EXACT SAME early morning drink for ALL ${planConfig.duration} days
   - DO NOT rotate or change the drink
   - DO NOT use coconut water in early morning
   - DO NOT use green tea in early morning
   - Only warm water with specified ingredients

5. LUNCH GUIDELINES - ONLY ROTI-SABJI OR DAL-RICE:
   
   **CRITICAL: Lunch MUST be ONLY one of these two patterns:**
   
   **Pattern 1: Roti + Sabji**
   - 2-3 roti (adjust quantity based on calories)
   - 1 medium katori sabji
   - Optional: 1 small katori raita OR salad
   - Examples: 2 roti + aloo gobi + cucumber raita
             3 roti + palak paneer + onion salad
             2 roti + bhindi masala + green salad
   
   **Pattern 2: Dal + Rice**
   - 1 small katori dal
   - 1 small katori rice
   - Optional: 1 small katori sabji OR raita
   - Examples: Dal tadka + jeera rice + baingan bharta
             Moong dal + brown rice + raita
             Masoor dal + rice + aloo sabji
   
   **NEVER give for lunch:**
   - ❌ Dosa, idli, uttapam (these are breakfast/dinner items)
   - ❌ Upma, poha, daliya (these are breakfast items)
   - ❌ Khichdi (this is dinner item)
   - ❌ Oats (these are breakfast/dinner items)
   - ❌ Soup-based meals (these are dinner items)
   
   **ALWAYS for lunch:**
   - ✅ Roti + Sabji combination OR
   - ✅ Dal + Rice combination
   - ✅ Traditional home-style lunch

6. EVENING SNACK GUIDELINES - SIMPLE & FILLING FOR WEIGHT LOSS:
   
   **CRITICAL: Evening snacks MUST be from these options ONLY:**
   
   **Hot Drinks with Snacks:**
   - Green tea (1 cup) + Bhuna chana (1 small katori 30g)
   - Green tea (1 cup) + Murmura (1 small katori 25g)
   - Green tea (1 cup) + Makhana (1 small katori 20g)
   - Green tea (1 cup) + 2-3 Khakra (30g)
   - Green tea (1 cup) + Mixed seeds (pumpkin/sunflower, 1 tbsp)
   
   **Vegetable Juice Options:**
   - Carrot juice (1 glass 200ml) + handful almonds (5-6 pieces)
   - Beetroot juice (1 glass 200ml) + bhuna chana (1 small katori)
   - Mixed veg juice (1 glass 200ml) + makhana (1 small katori)
   - Cucumber juice (1 glass 200ml) + 2-3 khakra
   
   **Fruit Options (occasionally):**
   - 1 apple + green tea
   - 1 orange + handful almonds
   - 1 bowl papaya + green tea
   
   **Traditional Options:**
   - Buttermilk (1 glass) + bhuna chana
   - Coconut water (1 glass) + makhana
   - Sprouts salad (1 small bowl)
   
   **IMPORTANT:**
   - These snacks are FILLING and LOW-CALORIE
   - Perfect for weight loss
   - Green tea helps boost metabolism
   - Bhuna chana/makhana/murmura are crunchy and satisfying
   - Vegetable juices provide nutrients without too many calories
   - Keep portions SMALL but satisfying

7. DINNER GUIDELINES - VARIETY OF LIGHT/SUBSTANTIAL OPTIONS:
   
   ${dinnerOptions}
   
   **IMPORTANT: Rotate between different dinner options across ${planConfig.duration} days**
   - Keep dinners SIMPLE and TRADITIONAL
   - Include mix of roti-sabji, khichdi, oats, daliya, dosa, uttapam
   - If soup is included, ALWAYS add protein/carb accompaniment
   - NO paneer tikka, NO quinoa, NO fusion items

8. MEAL VARIETY (OTHER MEALS):
   - Create DIFFERENT meals for each day (NOT for early morning)
   - Include traditional roti-sabji combinations (MANDATORY for lunch)
   - ${selectedClient.food_preference === 'non_veg' ? 'Include chicken, fish, eggs, lamb, mutton options across different days' : ''}
   - Avoid repetition - maximum 2 times for same meal across ${planConfig.duration} days
   - Keep everything SIMPLE and HOME-STYLE

9. FOOD COMBINATIONS FOR ${selectedClient.goal.toUpperCase().replace('_', ' ')}:
   ${isWeightGain 
     ? '- High-calorie dense foods: dry fruits, full-fat dairy, healthy fats\n   - Protein at every meal: paneer, legumes, eggs, chicken\n   - Avoid: Low-cal drinks, excessive fiber, diet foods'
     : '- High fiber vegetables and whole grains\n   - Lean proteins\n   - Moderate healthy fats\n   - Light dinner - keep it simple and traditional\n   - Evening snacks MUST be low-calorie but filling (green tea with chana/murmura/makhana)'}

10. MEAL STRUCTURE (6 meals daily):
   - Early Morning (6-7 AM): ${isWeightGain ? 'Warm water with soaked dry fruits/dates (SAME for all days)' : 'Warm lemon water (SAME for all days)'}
   - Breakfast (8-9 AM): Main meal with protein + carbs (varied - idli/dosa/poha/paratha etc)
   - Mid-Morning (11 AM): Fruit/snack
   - Lunch (1-2 PM): ONLY Roti+Sabji OR Dal+Rice - NO OTHER OPTIONS
   - Evening Snack (4-5 PM): Green tea with chana/murmura/makhana OR vegetable juice options
   - Dinner (7-8 PM): ${isWeightLoss ? 'LIGHTEST meal (20% calories) - simple options like khichdi/oats/daliya/dosa/roti-sabji' : 'Substantial meal with variety'}

11. ${selectedClient.food_preference === 'non_veg' ? 'NON-VEG OPTIONS:\n   - Include chicken, fish, eggs across week\n   - Add lamb/mutton options (2-3 times)\n   - Specify cooking method: grilled, boiled, curry, etc.\n   - Keep preparations SIMPLE' : ''}

12. TRADITIONAL INDIAN MEALS:
   - Include dal-chawal-roti-sabji pattern for lunch EVERY DAY
   - Regional dishes from ${selectedClient.regional_preference} India
   - Home-style cooking methods
   - SIMPLE preparations - no fusion, no complex items
   - Focus on traditional, easy-to-make meals

13. DAILY CALORIE ACCURACY:
   **CRITICAL: EACH DAY MUST TOTAL EXACTLY ${selectedClient.target_calories} KCAL**
   - Calculate totals: Early Morning + Breakfast + Mid-Morning + Lunch + Evening + Dinner
   - Adjust portion sizes to reach EXACT target
   - If Day 1 = 1850 kcal but target is 1800, reduce portions
   - If Day 2 = 1750 kcal but target is 1800, increase portions
   - ALL ${planConfig.duration} DAYS must have SAME total calories (${selectedClient.target_calories} kcal)

Return structured meal plan with:
- SAME early morning drink for all ${planConfig.duration} days
- CORRECT portion units (pieces for cheela/roti, katori for dal/sabji)
- LUNCH: ONLY Roti+Sabji OR Dal+Rice - strictly follow this
- EVENING: Green tea with chana/murmura/makhana OR vegetable juice - strictly follow this
- DINNER: Simple, traditional, light options
- SIMPLE meals - NO paneer tikka, NO quinoa, NO fusion items
- Exact measurements with weight in grams
- Day-wise variety (except early morning)
- Proper calorie distribution
- **CRITICAL: EACH DAY TOTALS EXACTLY ${selectedClient.target_calories} KCAL**
- Macro breakdown per meal
- Short nutritional tip for each meal`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            plan_name: { type: "string" },
            meals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day: { type: "number" },
                  meal_type: { type: "string" },
                  meal_name: { type: "string" },
                  items: { type: "array", items: { type: "string" } },
                  portion_sizes: { type: "array", items: { type: "string" } },
                  calories: { type: "number" },
                  protein: { type: "number" },
                  carbs: { type: "number" },
                  fats: { type: "number" },
                  nutritional_tip: { type: "string" }
                }
              }
            }
          }
        }
      });

      setGeneratedPlan({
        ...response,
        client_id: selectedClient.id,
        client_name: selectedClient.full_name,
        duration: planConfig.duration,
        meal_pattern: planConfig.meal_pattern,
        food_preference: selectedClient.food_preference,
        regional_preference: selectedClient.regional_preference,
        target_calories: selectedClient.target_calories,
      });

      // Deduct AI credit for student_coach
      if (user?.user_type === 'student_coach' && coachSubscription) {
        try {
          await base44.entities.HealthCoachSubscription.update(coachSubscription.id, {
            ai_credits_used_this_month: (coachSubscription.ai_credits_used_this_month || 0) + 1
          });

          await base44.entities.AICreditsTransaction.create({
            coach_email: user.email,
            subscription_id: coachSubscription.id,
            transaction_type: 'usage',
            credits_amount: -1,
            usage_type: 'meal_plan_generation',
            description: `AI meal plan generated for ${selectedClient.full_name}`
          });

          queryClient.invalidateQueries(['coachSubscription']);
        } catch (error) {
          console.error("Error recording AI credit usage:", error);
        }
      }

      await updateUsageMutation.mutateAsync({ type: 'meal_plan' });

    } catch (error) {
      alert("Error generating meal plan. Please try again.");
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleSavePlan = (editedPlan) => {
    if (!editedPlan) return;
    
    // Check if this is an update to existing plan
    if (editedPlan.id) {
      updatePlanMutation.mutate({
        id: editedPlan.id,
        data: {
          name: editedPlan.plan_name,
          duration: editedPlan.duration,
          meal_pattern: editedPlan.meal_pattern,
          target_calories: editedPlan.target_calories,
          meals: editedPlan.meals,
          food_preference: editedPlan.food_preference,
          regional_preference: editedPlan.regional_preference,
        }
      });
    } else {
      savePlanMutation.mutate({
        client_id: editedPlan.client_id,
        name: editedPlan.plan_name,
        duration: editedPlan.duration,
        meal_pattern: editedPlan.meal_pattern,
        target_calories: editedPlan.target_calories,
        meals: editedPlan.meals,
        food_preference: editedPlan.food_preference,
        regional_preference: editedPlan.regional_preference,
        active: true,
        created_by: user?.email,
      });
    }
  };

  const handleSaveAsTemplate = (plan) => {
    const templateName = prompt("Enter template name:", `${plan.food_preference} ${plan.target_calories} cal - ${plan.duration} days`);
    if (!templateName) return;

    saveTemplateMutation.mutate({
      name: templateName,
      description: `Template for ${plan.food_preference}, ${plan.target_calories} kcal, ${plan.duration} days`,
      category: "general",
      duration: plan.duration,
      target_calories: plan.target_calories,
      food_preference: plan.food_preference,
      regional_preference: plan.regional_preference,
      meals: plan.meals,
      is_public: false,
      times_used: 0,
      created_by: user?.email
    });
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setShowEditTemplateDialog(true);
  };

  const handleSaveTemplateEdit = () => {
    if (!editingTemplate.name.trim()) {
      alert("Please enter template name");
      return;
    }

    updateTemplateMutation.mutate({
      id: editingTemplate.id,
      data: {
        name: editingTemplate.name,
        description: editingTemplate.description,
        is_public: editingTemplate.is_public,
        category: editingTemplate.category,
        food_preference: editingTemplate.food_preference,
        regional_preference: editingTemplate.regional_preference,
        target_calories: editingTemplate.target_calories,
        duration: editingTemplate.duration
      }
    });
  };

  const handleDeleteTemplate = (template) => {
    if (window.confirm(`Are you sure you want to delete "${template.name}"?\n\nThis action cannot be undone.`)) {
      deleteTemplateMutation.mutate(template.id);
    }
  };

  const handleGenerateAITemplate = async () => {
    // Calculate target calories if not set
    let targetCalories = aiTemplateForm.target_calories;
    if (!targetCalories && aiTemplateForm.age && aiTemplateForm.height && aiTemplateForm.weight) {
      const age = parseFloat(aiTemplateForm.age);
      const height = parseFloat(aiTemplateForm.height);
      const weight = parseFloat(aiTemplateForm.weight);
      
      const bmrMale = (10 * weight) + (6.25 * height) - (5 * age) + 5;
      const bmrFemale = (10 * weight) + (6.25 * height) - (5 * age) - 161;
      const bmr = (bmrMale + bmrFemale) / 2;
      const tdee = bmr * 1.375;
      
      if (aiTemplateForm.goal === 'weight_loss') {
        targetCalories = Math.round(tdee - 500);
      } else if (aiTemplateForm.goal === 'weight_gain' || aiTemplateForm.goal === 'muscle_gain') {
        targetCalories = Math.round(tdee + 300);
      } else {
        targetCalories = Math.round(tdee);
      }
    }

    if (!targetCalories || !aiTemplateForm.duration) {
      alert("Please fill in age, height, weight, and duration to generate the template");
      return;
    }

    setGeneratingAITemplate(true);
    try {
      targetCalories = parseInt(targetCalories);
      const duration = parseInt(aiTemplateForm.duration);

      const prompt = `Generate a complete ${duration}-day Indian meal plan template with ALL meal types for EVERY day.

Target Calories: ${targetCalories} kcal per day
Food Preference: ${aiTemplateForm.food_preference}
Regional Preference: ${aiTemplateForm.regional_preference}
Goal: ${aiTemplateForm.goal.replace('_', ' ').toUpperCase()}
${aiTemplateForm.disease_focus.length > 0 ? `Disease Focus: ${aiTemplateForm.disease_focus.join(', ')}` : ''}

CRITICAL REQUIREMENTS:

1. COMPLETE MEAL STRUCTURE - EVERY DAY MUST HAVE ALL 6 MEALS:
   - Early Morning (6-7 AM)
   - Breakfast (8-9 AM)
   - Mid-Morning (11 AM)
   - Lunch (1-2 PM)
   - Evening Snack (4-5 PM)
   - Dinner (7-8 PM)

2. TOTAL MEALS REQUIRED: ${duration * 6} meals (${duration} days × 6 meals per day)

3. EARLY MORNING - SAME FOR ALL ${duration} DAYS:
   - Give the EXACT SAME early morning drink for ALL days
   - DO NOT rotate or vary this meal
   - Example: "1 glass warm water (250ml) with lemon juice"

4. VARIETY ACROSS DAYS (except early morning):
   - Create DIFFERENT meals for breakfast, lunch, dinner across days
   - Do NOT repeat the same meal more than 2 times
   - Rotate between different cuisines and preparations

5. LUNCH - ONLY TRADITIONAL OPTIONS:
   - MUST be either: Roti + Sabji OR Dal + Rice
   - Example: "2 roti + aloo gobi + cucumber raita"
   - Example: "Dal tadka + jeera rice + baingan bharta"

6. PORTION SIZES - USE CORRECT UNITS:
   - Flatbreads: "2 medium roti (60g total)" NOT katori
   - Cooked foods: "1 small katori dal (150g cooked)"
   - Drinks: "1 glass milk (200ml)"

7. CALORIE DISTRIBUTION PER DAY (MUST TOTAL ${targetCalories} kcal):
   - Early Morning: 0-50 kcal
   - Breakfast: 30-35% (${Math.round(targetCalories * 0.32)} kcal)
   - Mid-Morning: 8-10% (${Math.round(targetCalories * 0.09)} kcal)
   - Lunch: 30-35% (${Math.round(targetCalories * 0.32)} kcal)
   - Evening: 8-10% (${Math.round(targetCalories * 0.09)} kcal)
   - Dinner: 20-25% (${Math.round(targetCalories * 0.22)} kcal)

8. EACH MEAL MUST INCLUDE:
   - day: day number (1 to ${duration})
   - meal_type: "early_morning", "breakfast", "mid_morning", "lunch", "evening_snack", "dinner"
   - meal_name: descriptive name
   - items: array of food items
   - portion_sizes: array matching items
   - calories, protein, carbs, fats: nutritional values
   - nutritional_tip: short health tip

Return EXACTLY ${duration * 6} meals with proper variety and complete nutrition data.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            meals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day: { type: "number" },
                  meal_type: { type: "string" },
                  meal_name: { type: "string" },
                  items: { type: "array", items: { type: "string" } },
                  portion_sizes: { type: "array", items: { type: "string" } },
                  calories: { type: "number" },
                  protein: { type: "number" },
                  carbs: { type: "number" },
                  fats: { type: "number" },
                  nutritional_tip: { type: "string" }
                }
              }
            }
          }
        }
      });

      setAiGeneratedTemplate(response.meals);
      alert(`✅ Generated ${response.meals.length} meals! Review and save as template.`);
    } catch (error) {
      console.error("AI generation error:", error);
      alert("Failed to generate template. Please try again.");
    } finally {
      setGeneratingAITemplate(false);
    }
  };

  const handleSaveAITemplate = () => {
    if (!aiTemplateForm.name.trim()) {
      alert("Please enter a template name");
      return;
    }

    if (!aiGeneratedTemplate || aiGeneratedTemplate.length === 0) {
      alert("No meals generated yet");
      return;
    }

    // Calculate target calories if not set
    let targetCalories = aiTemplateForm.target_calories;
    if (!targetCalories && aiTemplateForm.age && aiTemplateForm.height && aiTemplateForm.weight) {
      const age = parseFloat(aiTemplateForm.age);
      const height = parseFloat(aiTemplateForm.height);
      const weight = parseFloat(aiTemplateForm.weight);
      
      const bmrMale = (10 * weight) + (6.25 * height) - (5 * age) + 5;
      const bmrFemale = (10 * weight) + (6.25 * height) - (5 * age) - 161;
      const bmr = (bmrMale + bmrFemale) / 2;
      const tdee = bmr * 1.375;
      
      if (aiTemplateForm.goal === 'weight_loss') {
        targetCalories = Math.round(tdee - 500);
      } else if (aiTemplateForm.goal === 'weight_gain' || aiTemplateForm.goal === 'muscle_gain') {
        targetCalories = Math.round(tdee + 300);
      } else {
        targetCalories = Math.round(tdee);
      }
    }

    if (!targetCalories) {
      alert("Unable to determine target calories. Please fill in age, height, and weight.");
      return;
    }

    saveAITemplateMutation.mutate({
      name: aiTemplateForm.name,
      description: aiTemplateForm.description || `AI-generated ${aiTemplateForm.duration}-day meal plan template`,
      category: aiTemplateForm.goal || "general",
      duration: parseInt(aiTemplateForm.duration),
      target_calories: parseInt(targetCalories),
      food_preference: aiTemplateForm.food_preference,
      regional_preference: aiTemplateForm.regional_preference,
      meals: aiGeneratedTemplate,
      is_public: false,
      times_used: 0,
      tags: [
        aiTemplateForm.food_preference,
        `${targetCalories}cal`,
        `${aiTemplateForm.duration}days`,
        "ai-generated",
        ...(aiTemplateForm.disease_focus || [])
      ],
      disease_focus: aiTemplateForm.disease_focus || []
    });
  };

  const getSampleTemplateData = () => {
    return {
      name: "Sample Meal Plan Template - 7 Days",
      description: "This is a sample template showing the required format for importing meal plans",
      category: "general",
      duration: 7,
      target_calories: 1800,
      food_preference: "veg",
      regional_preference: "north",
      tags: ["sample", "veg", "1800cal"],
      meals: [
        {
          day: 1,
          meal_type: "early_morning",
          meal_name: "Warm Lemon Water",
          items: ["Warm water", "Lemon juice"],
          portion_sizes: ["1 glass (250ml)", "Half lemon"],
          calories: 10,
          protein: 0,
          carbs: 2,
          fats: 0,
          nutritional_tip: "Helps kickstart metabolism and aids digestion"
        },
        {
          day: 1,
          meal_type: "breakfast",
          meal_name: "Poha with Vegetables",
          items: ["Poha", "Mixed vegetables", "Peanuts", "Curry leaves"],
          portion_sizes: ["1 medium katori (150g)", "1 small katori (100g)", "1 tbsp (10g)", "Few leaves"],
          calories: 350,
          protein: 8,
          carbs: 55,
          fats: 10,
          nutritional_tip: "Rich in iron and fiber, light on stomach"
        },
        {
          day: 1,
          meal_type: "mid_morning",
          meal_name: "Apple with Almonds",
          items: ["Apple", "Almonds"],
          portion_sizes: ["1 medium (150g)", "5-6 pieces (10g)"],
          calories: 150,
          protein: 3,
          carbs: 25,
          fats: 5,
          nutritional_tip: "Provides sustained energy and healthy fats"
        },
        {
          day: 1,
          meal_type: "lunch",
          meal_name: "Roti with Dal and Sabji",
          items: ["Whole wheat roti", "Moong dal", "Mixed vegetable sabji", "Cucumber salad"],
          portion_sizes: ["2 medium (60g)", "1 small katori (150g)", "1 medium katori (200g)", "1 small bowl (100g)"],
          calories: 550,
          protein: 18,
          carbs: 85,
          fats: 12,
          nutritional_tip: "Complete balanced meal with protein, carbs and fiber"
        },
        {
          day: 1,
          meal_type: "evening_snack",
          meal_name: "Green Tea with Bhuna Chana",
          items: ["Green tea", "Bhuna chana"],
          portion_sizes: ["1 cup (240ml)", "1 small katori (30g)"],
          calories: 120,
          protein: 5,
          carbs: 18,
          fats: 2,
          nutritional_tip: "Light snack that boosts metabolism"
        },
        {
          day: 1,
          meal_type: "dinner",
          meal_name: "Vegetable Khichdi with Raita",
          items: ["Khichdi (rice + moong dal)", "Mixed vegetables", "Curd raita"],
          portion_sizes: ["1 small bowl (200g)", "1 small katori (100g)", "1 small katori (100g)"],
          calories: 450,
          protein: 15,
          carbs: 70,
          fats: 8,
          nutritional_tip: "Easy to digest, perfect for dinner"
        }
      ]
    };
  };

  const handleDownloadSampleJSON = () => {
    const sampleTemplate = getSampleTemplateData();
    const dataStr = JSON.stringify(sampleTemplate, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample-meal-plan-template.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSampleExcel = () => {
    const sampleTemplate = getSampleTemplateData();
    
    // Create metadata sheet
    const metadataSheet = XLSX.utils.json_to_sheet([{
      'Template Name': sampleTemplate.name,
      'Description': sampleTemplate.description,
      'Category': sampleTemplate.category,
      'Duration (Days)': sampleTemplate.duration,
      'Target Calories': sampleTemplate.target_calories,
      'Food Preference': sampleTemplate.food_preference,
      'Regional Preference': sampleTemplate.regional_preference,
      'Tags': sampleTemplate.tags.join(', ')
    }]);

    // Create meals sheet
    const mealsData = sampleTemplate.meals.map(meal => ({
      'Day': meal.day,
      'Meal Type': meal.meal_type,
      'Meal Name': meal.meal_name,
      'Items': meal.items.join(' | '),
      'Portion Sizes': meal.portion_sizes.join(' | '),
      'Calories': meal.calories,
      'Protein (g)': meal.protein,
      'Carbs (g)': meal.carbs,
      'Fats (g)': meal.fats,
      'Nutritional Tip': meal.nutritional_tip
    }));
    const mealsSheet = XLSX.utils.json_to_sheet(mealsData);

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Template Info');
    XLSX.utils.book_append_sheet(workbook, mealsSheet, 'Meals');

    // Download
    XLSX.writeFile(workbook, 'sample-meal-plan-template.xlsx');
  };

  const handleDownloadSampleWord = () => {
    const sampleTemplate = getSampleTemplateData();
    
    let content = `MEAL PLAN TEMPLATE - SAMPLE FORMAT\n`;
    content += `=====================================\n\n`;
    content += `Template Name: ${sampleTemplate.name}\n`;
    content += `Description: ${sampleTemplate.description}\n`;
    content += `Category: ${sampleTemplate.category}\n`;
    content += `Duration: ${sampleTemplate.duration} days\n`;
    content += `Target Calories: ${sampleTemplate.target_calories} kcal\n`;
    content += `Food Preference: ${sampleTemplate.food_preference}\n`;
    content += `Regional Preference: ${sampleTemplate.regional_preference}\n`;
    content += `Tags: ${sampleTemplate.tags.join(', ')}\n\n`;
    content += `=====================================\n\n`;
    content += `MEALS:\n\n`;

    sampleTemplate.meals.forEach((meal, index) => {
      content += `Meal ${index + 1}:\n`;
      content += `  Day: ${meal.day}\n`;
      content += `  Meal Type: ${meal.meal_type}\n`;
      content += `  Meal Name: ${meal.meal_name}\n`;
      content += `  Items: ${meal.items.join(' | ')}\n`;
      content += `  Portion Sizes: ${meal.portion_sizes.join(' | ')}\n`;
      content += `  Calories: ${meal.calories}\n`;
      content += `  Protein: ${meal.protein}g\n`;
      content += `  Carbs: ${meal.carbs}g\n`;
      content += `  Fats: ${meal.fats}g\n`;
      content += `  Nutritional Tip: ${meal.nutritional_tip}\n\n`;
    });

    content += `\n=====================================\n`;
    content += `HOW TO USE:\n`;
    content += `1. Copy this format and modify with your meal plan data\n`;
    content += `2. Save as .txt or .doc file\n`;
    content += `3. Upload in the Import Template section\n`;
    content += `4. System will automatically parse and create your template\n`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample-meal-plan-template.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportTemplate = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileName = file.name.toLowerCase();
      let templateData;

      if (fileName.endsWith('.json')) {
        // Handle JSON import
        const text = await file.text();
        const importedData = JSON.parse(text);

        if (!importedData.meals || !Array.isArray(importedData.meals)) {
          alert("Invalid template file: Missing meals array");
          return;
        }

        if (!importedData.name || !importedData.duration || !importedData.target_calories) {
          alert("Invalid template file: Missing required fields (name, duration, target_calories)");
          return;
        }

        templateData = {
          name: importedData.name,
          description: importedData.description || "Imported template",
          category: importedData.category || "general",
          duration: importedData.duration,
          target_calories: importedData.target_calories,
          food_preference: importedData.food_preference || "veg",
          regional_preference: importedData.regional_preference || "all",
          meals: importedData.meals,
          is_public: false,
          times_used: 0,
          tags: importedData.tags || ["imported"]
        };
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Handle Excel import
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        // Read metadata
        const metadataSheet = workbook.Sheets[workbook.SheetNames[0]];
        const metadata = XLSX.utils.sheet_to_json(metadataSheet)[0];

        // Read meals
        const mealsSheet = workbook.Sheets[workbook.SheetNames[1]];
        const mealsData = XLSX.utils.sheet_to_json(mealsSheet);

        const meals = mealsData.map(row => ({
          day: parseInt(row['Day']),
          meal_type: row['Meal Type'],
          meal_name: row['Meal Name'],
          items: row['Items'].split(' | '),
          portion_sizes: row['Portion Sizes'].split(' | '),
          calories: parseFloat(row['Calories']),
          protein: parseFloat(row['Protein (g)']),
          carbs: parseFloat(row['Carbs (g)']),
          fats: parseFloat(row['Fats (g)']),
          nutritional_tip: row['Nutritional Tip']
        }));

        templateData = {
          name: metadata['Template Name'],
          description: metadata['Description'] || "Imported from Excel",
          category: metadata['Category'] || "general",
          duration: parseInt(metadata['Duration (Days)']),
          target_calories: parseInt(metadata['Target Calories']),
          food_preference: metadata['Food Preference'] || "veg",
          regional_preference: metadata['Regional Preference'] || "all",
          meals: meals,
          is_public: false,
          times_used: 0,
          tags: metadata['Tags'] ? metadata['Tags'].split(', ') : ["imported"]
        };
      } else if (fileName.endsWith('.txt') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
        // Handle Word/Text import
        const text = await file.text();
        
        // Parse text format
        const lines = text.split('\n');
        let metadata = {};
        let meals = [];
        let currentMeal = null;

        lines.forEach(line => {
          line = line.trim();
          if (!line) return;

          if (line.includes('Template Name:')) metadata.name = line.split('Template Name:')[1].trim();
          else if (line.includes('Description:')) metadata.description = line.split('Description:')[1].trim();
          else if (line.includes('Category:')) metadata.category = line.split('Category:')[1].trim();
          else if (line.includes('Duration:')) metadata.duration = parseInt(line.match(/\d+/)[0]);
          else if (line.includes('Target Calories:')) metadata.target_calories = parseInt(line.match(/\d+/)[0]);
          else if (line.includes('Food Preference:')) metadata.food_preference = line.split('Food Preference:')[1].trim();
          else if (line.includes('Regional Preference:')) metadata.regional_preference = line.split('Regional Preference:')[1].trim();
          else if (line.includes('Tags:')) metadata.tags = line.split('Tags:')[1].trim().split(', ');
          else if (line.startsWith('Meal ') && line.includes(':')) {
            if (currentMeal) meals.push(currentMeal);
            currentMeal = {};
          }
          else if (currentMeal) {
            if (line.includes('Day:')) currentMeal.day = parseInt(line.split('Day:')[1].trim());
            else if (line.includes('Meal Type:')) currentMeal.meal_type = line.split('Meal Type:')[1].trim();
            else if (line.includes('Meal Name:')) currentMeal.meal_name = line.split('Meal Name:')[1].trim();
            else if (line.includes('Items:')) currentMeal.items = line.split('Items:')[1].trim().split(' | ');
            else if (line.includes('Portion Sizes:')) currentMeal.portion_sizes = line.split('Portion Sizes:')[1].trim().split(' | ');
            else if (line.includes('Calories:')) currentMeal.calories = parseFloat(line.match(/[\d.]+/)[0]);
            else if (line.includes('Protein:')) currentMeal.protein = parseFloat(line.match(/[\d.]+/)[0]);
            else if (line.includes('Carbs:')) currentMeal.carbs = parseFloat(line.match(/[\d.]+/)[0]);
            else if (line.includes('Fats:')) currentMeal.fats = parseFloat(line.match(/[\d.]+/)[0]);
            else if (line.includes('Nutritional Tip:')) currentMeal.nutritional_tip = line.split('Nutritional Tip:')[1].trim();
          }
        });
        
        if (currentMeal) meals.push(currentMeal);

        templateData = {
          name: metadata.name || "Imported Template",
          description: metadata.description || "Imported from Word/Text",
          category: metadata.category || "general",
          duration: metadata.duration || 7,
          target_calories: metadata.target_calories || 1800,
          food_preference: metadata.food_preference || "veg",
          regional_preference: metadata.regional_preference || "all",
          meals: meals,
          is_public: false,
          times_used: 0,
          tags: metadata.tags || ["imported"]
        };
      } else {
        alert("Unsupported file format. Please upload JSON, Excel (.xlsx, .xls), or Text/Word (.txt, .doc) files.");
        event.target.value = '';
        return;
      }

      if (!templateData.meals || templateData.meals.length === 0) {
        alert("No meals found in the template file.");
        return;
      }

      saveTemplateMutation.mutate(templateData);
      event.target.value = '';
      alert(`✅ Successfully imported template with ${templateData.meals.length} meals!`);
    } catch (error) {
      console.error("Import error:", error);
      alert(`Failed to import template: ${error.message}\n\nPlease ensure the file format matches the sample template.`);
      event.target.value = '';
    }
  };

  const canEditTemplate = (template) => {
    return user?.user_type === 'super_admin' || 
           user?.user_type === 'team_member' || 
           user?.user_type === 'student_coach' ||
           user?.user_type === 'student_team_member' ||
           template.created_by === user?.email;
    };

    const canContributeTemplates = user?.user_type === 'super_admin' || 
                                  user?.user_type === 'team_member' || 
                                  user?.user_type === 'student_coach' ||
                                  user?.user_type === 'student_team_member';

  const canDeleteTemplate = (template) => {
    return user?.user_type === 'super_admin' || 
           user?.user_type === 'team_member' || 
           user?.user_type === 'student_coach' ||
           user?.user_type === 'student_team_member' ||
           template.created_by === user?.email;
    };

    const filteredTemplates = templates.filter(template => {
    // Text search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        template.name.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query) ||
        template.category?.toLowerCase().includes(query) ||
        template.food_preference?.toLowerCase().includes(query) ||
        template.tags?.some(tag => tag.toLowerCase().includes(query))
      );
      if (!matchesSearch) return false;
    }

    // Disease filter
    if (templateFilters.disease !== "all") {
      const templateDiseases = template.disease_focus || [];
      if (!templateDiseases.includes(templateFilters.disease)) return false;
    }

    // Goal filter (based on category)
    if (templateFilters.goal !== "all") {
      if (template.category !== templateFilters.goal) return false;
    }

    // Food preference filter
    if (templateFilters.foodPreference !== "all") {
      if (template.food_preference !== templateFilters.foodPreference) return false;
    }

    // Regional preference filter
    if (templateFilters.regionalPreference !== "all") {
      if (template.regional_preference !== templateFilters.regionalPreference) return false;
    }

    // Calorie range filter
    if (templateFilters.calorieRange !== "all") {
      const calories = template.target_calories;
      if (templateFilters.calorieRange === "low" && (calories < 1000 || calories > 1500)) return false;
      if (templateFilters.calorieRange === "medium" && (calories < 1500 || calories > 2000)) return false;
      if (templateFilters.calorieRange === "high" && (calories < 2000 || calories > 3000)) return false;
    }

    // Duration filter
    if (templateFilters.duration !== "all") {
      const duration = template.duration;
      if (templateFilters.duration === "7" && duration !== 7) return false;
      if (templateFilters.duration === "10" && duration !== 10) return false;
      if (templateFilters.duration === "15" && duration !== 15) return false;
      if (templateFilters.duration === "21" && duration !== 21) return false;
      if (templateFilters.duration === "30" && duration !== 30) return false;
    }

    return true;
    });

    const handleGenerateNew = () => {
    setGeneratedPlan(null);
    setGenerating(false);
    setViewingPlan(null);
  };

  const handleViewPlan = (plan) => {
    const client = clients.find(c => c.id === plan.client_id);
    setViewingPlan({
      ...plan,
      plan_name: plan.name,
      client_name: client?.full_name || 'Unknown Client',
      client_id: plan.client_id,
    });
    setActiveTab("generate");
  };

  const handleDeletePlan = (plan) => {
    const client = clients.find(c => c.id === plan.client_id);
    const confirmed = window.confirm(
      `⚠️ Delete Diet Plan?\n\n` +
      `Plan: ${plan.name}\n` +
      `Client: ${client?.full_name || 'Unknown'}\n` +
      `Duration: ${plan.duration} days\n\n` +
      `This will remove the plan from the client's account.\n` +
      `This action cannot be undone.\n\n` +
      `Continue with deletion?`
    );
    
    if (confirmed) {
      deletePlanMutation.mutate(plan.id);
    }
  };

  if (clients.length === 0) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl">
          <CardHeader>
            <CardTitle>No Clients Yet</CardTitle>
            <CardDescription>Add clients before generating meal plans or using templates</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => window.location.href = createPageUrl('ClientManagement')}>
              <Users className="w-4 h-4 mr-2" />
              Add Your First Client
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Meal Planner</h1>
            <p className="text-gray-600">Generate, use templates, or create manually</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <Calendar className="w-10 h-10 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{mealPlans.length}</p>
                <p className="text-xs text-gray-600">My Plans</p>
              </div>
            </div>
          </div>
        </div>

        {user?.user_type === 'student_coach' && coachPlan && (
          <Card className="border-none shadow-lg bg-gradient-to-r from-purple-50 to-pink-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">AI Credits Available</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {availableAICredits === Infinity ? '∞' : availableAICredits}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Plan Includes</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {coachPlan.ai_credits_included === -1 ? 'Unlimited' : coachPlan.ai_credits_included === 0 ? 'None' : `${coachPlan.ai_credits_included} credits/month`}
                  </p>
                  <p className="text-xs text-gray-500">₹{coachPlan.ai_credit_price || 10} per extra credit</p>
                </div>
              </div>
              {availableAICredits < 5 && availableAICredits !== Infinity && (
                <Alert className="mt-4 bg-orange-50 border-orange-300">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <AlertDescription className="text-orange-900">
                    <strong>Low on credits!</strong> You have {availableAICredits} AI credits remaining.
                    <Button
                      onClick={() => window.location.href = createPageUrl('PurchaseAICredits')}
                      variant="outline"
                      size="sm"
                      className="ml-3 bg-white hover:bg-orange-50 border-orange-300"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Buy More
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
        {user?.user_type !== 'student_coach' && (
          <UsageLimitWarning usage={usage} limits={usage?.plan_limits} type="meal_plan" />
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur grid grid-cols-4">
            <TabsTrigger value="templates" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white">
              <Star className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="manual" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
              <Edit className="w-4 h-4 mr-2" />
              Manual
            </TabsTrigger>
            <TabsTrigger value="generate" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
              <Plus className="w-4 h-4 mr-2" />
              AI Generate
            </TabsTrigger>
            <TabsTrigger value="saved" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white">
              <Calendar className="w-4 h-4 mr-2" />
              My Plans ({mealPlans.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-6">
            {templates.length === 0 ? (
              <Card className="border-none shadow-xl bg-gradient-to-br from-green-50 to-emerald-50">
                <CardContent className="p-12 text-center">
                  <Star className="w-16 h-16 mx-auto text-green-500 mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Create Your First Template!</h3>
                  <p className="text-gray-600 mb-6">Templates save you money - use them unlimited times for FREE!</p>
                  <div className="space-y-2 text-sm text-gray-700 text-left max-w-md mx-auto">
                    <p>✅ Generate 1 AI meal plan (costs ₹{coachPlan?.ai_credit_price || 10})</p>
                    <p>✅ Save it as template (FREE forever)</p>
                    <p>✅ Use for 100 clients (₹0 instead of ₹{(coachPlan?.ai_credit_price || 10) * 100}!)</p>
                  </div>
                  <Button 
                    className="mt-6 bg-gradient-to-r from-green-500 to-emerald-500"
                    onClick={() => setActiveTab("generate")}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Generate Your First Template
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      Select Client to Assign Template
                    </CardTitle>
                    <CardDescription>
                      ⚠️ <strong>Important:</strong> First select a client, then choose a template below to assign or customize it.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!selectedClientId && (
                      <Alert className="mb-4 bg-yellow-50 border-yellow-300">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        <AlertDescription className="text-yellow-900">
                          <strong>No client selected!</strong> Please choose a client from the dropdown below.
                        </AlertDescription>
                      </Alert>
                    )}
                    <Select
                      value={selectedClientId || ''}
                      onValueChange={setSelectedClientId}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="🔍 Choose a client..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => {
                          const clientPlans = mealPlans.filter(p => p.client_id === client.id);
                          const hasActivePlan = clientPlans.some(p => p.active);
                          return (
                            <SelectItem key={client.id} value={client.id}>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{client.full_name}</span>
                                <Badge variant="outline" className="text-xs capitalize">
                                  {client.food_preference}
                                </Badge>
                                <Badge className="text-xs">{client.target_calories} kcal</Badge>
                                {hasActivePlan && (
                                  <Badge className="text-xs bg-green-500">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Has Plan
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {(user?.user_type === 'super_admin' || user?.user_type === 'team_member' || coachPlan?.can_generate_ai_templates) && (
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <Button
                        onClick={() => setShowAITemplateDialog(true)}
                        className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 h-12"
                      >
                        <Sparkles className="w-5 h-5 mr-2" />
                        AI Generate Template
                      </Button>
                      <Button
                        onClick={() => setShowManualTemplateDialog(true)}
                        variant="outline"
                        className="h-12 border-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50"
                      >
                        <Edit className="w-5 h-5 mr-2" />
                        Create Manual Template
                      </Button>
                    </div>
                    
                    <Card className="border-2 border-dashed border-green-300 bg-green-50/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-semibold text-green-900 mb-1">Import Meal Plan Template</p>
                            <p className="text-sm text-green-700">Upload JSON, Excel (.xlsx), or Word/Text (.txt, .doc) file</p>
                          </div>
                          <div className="flex gap-2">
                            <div className="relative">
                              <Button
                                onClick={() => setShowDownloadOptions(!showDownloadOptions)}
                                variant="outline"
                                size="sm"
                                className="border-green-600 text-green-700 hover:bg-green-100"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download Sample
                              </Button>
                              {showDownloadOptions && (
                                <div className="absolute top-full mt-1 right-0 bg-white border-2 border-green-500 rounded-lg shadow-lg z-10 w-48">
                                  <button
                                    onClick={() => {
                                      handleDownloadSampleJSON();
                                      setShowDownloadOptions(false);
                                    }}
                                    className="w-full px-4 py-2 text-left hover:bg-green-50 flex items-center gap-2 text-sm"
                                  >
                                    <FileText className="w-4 h-4 text-blue-600" />
                                    <span>JSON Format</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleDownloadSampleExcel();
                                      setShowDownloadOptions(false);
                                    }}
                                    className="w-full px-4 py-2 text-left hover:bg-green-50 flex items-center gap-2 text-sm border-t"
                                  >
                                    <Table className="w-4 h-4 text-green-600" />
                                    <span>Excel Format</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleDownloadSampleWord();
                                      setShowDownloadOptions(false);
                                    }}
                                    className="w-full px-4 py-2 text-left hover:bg-green-50 flex items-center gap-2 text-sm border-t rounded-b-lg"
                                  >
                                    <FileText className="w-4 h-4 text-orange-600" />
                                    <span>Text/Word Format</span>
                                  </button>
                                </div>
                              )}
                            </div>
                            <Button
                              onClick={() => document.getElementById('import-template-file').click()}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Import Template
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <input
                      id="import-template-file"
                      type="file"
                      accept=".json,.xlsx,.xls,.txt,.doc,.docx"
                      className="hidden"
                      onChange={handleImportTemplate}
                    />
                  </div>
                )}

                {user?.user_type === 'student_coach' && !coachPlan?.can_generate_ai_templates && (
                  <Alert className="border-orange-500 bg-orange-50">
                    <Crown className="w-5 h-5 text-orange-600" />
                    <AlertDescription className="text-orange-900">
                      <strong>Upgrade Required!</strong> AI Template Generation is not included in your plan. 
                      <Button
                        onClick={() => window.location.href = createPageUrl('CoachSubscriptions')}
                        variant="link"
                        className="p-0 h-auto ml-1 text-orange-700 underline"
                      >
                        Upgrade your plan
                      </Button> to access this feature.
                    </AlertDescription>
                  </Alert>
                )}

                <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-gray-600" />
                        <h3 className="font-semibold text-gray-900">Filter Templates</h3>
                      </div>
                      {(templateFilters.disease !== "all" || templateFilters.goal !== "all" || 
                        templateFilters.foodPreference !== "all" || templateFilters.regionalPreference !== "all" || 
                        templateFilters.calorieRange !== "all" || templateFilters.duration !== "all") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTemplateFilters({
                            disease: "all",
                            goal: "all",
                            foodPreference: "all",
                            regionalPreference: "all",
                            calorieRange: "all",
                            duration: "all"
                          })}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Clear Filters
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Disease Focus</Label>
                        <Select
                          value={templateFilters.disease}
                          onValueChange={(value) => setTemplateFilters({...templateFilters, disease: value})}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Diseases</SelectItem>
                            <SelectItem value="diabetes_type1">Diabetes Type 1</SelectItem>
                            <SelectItem value="diabetes_type2">Diabetes Type 2</SelectItem>
                            <SelectItem value="prediabetes">Prediabetes</SelectItem>
                            <SelectItem value="hypertension">Hypertension</SelectItem>
                            <SelectItem value="pcos">PCOS</SelectItem>
                            <SelectItem value="thyroid_hypo">Hypothyroid</SelectItem>
                            <SelectItem value="thyroid_hyper">Hyperthyroid</SelectItem>
                            <SelectItem value="fatty_liver">Fatty Liver</SelectItem>
                            <SelectItem value="high_cholesterol">High Cholesterol</SelectItem>
                            <SelectItem value="ibs">IBS</SelectItem>
                            <SelectItem value="gerd">GERD</SelectItem>
                            <SelectItem value="kidney_disease">Kidney Disease</SelectItem>
                            <SelectItem value="heart_disease">Heart Disease</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Goal Target</Label>
                        <Select
                          value={templateFilters.goal}
                          onValueChange={(value) => setTemplateFilters({...templateFilters, goal: value})}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Goals</SelectItem>
                            <SelectItem value="weight_loss">Weight Loss</SelectItem>
                            <SelectItem value="weight_gain">Weight Gain</SelectItem>
                            <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                            <SelectItem value="diabetes">Diabetes</SelectItem>
                            <SelectItem value="pcos">PCOS</SelectItem>
                            <SelectItem value="thyroid">Thyroid</SelectItem>
                            <SelectItem value="general">General Health</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Food Preference</Label>
                        <Select
                          value={templateFilters.foodPreference}
                          onValueChange={(value) => setTemplateFilters({...templateFilters, foodPreference: value})}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="veg">Vegetarian</SelectItem>
                            <SelectItem value="non_veg">Non-Veg</SelectItem>
                            <SelectItem value="eggetarian">Eggetarian</SelectItem>
                            <SelectItem value="jain">Jain</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Regional Preference</Label>
                        <Select
                          value={templateFilters.regionalPreference}
                          onValueChange={(value) => setTemplateFilters({...templateFilters, regionalPreference: value})}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Regions</SelectItem>
                            <SelectItem value="north">North Indian</SelectItem>
                            <SelectItem value="south">South Indian</SelectItem>
                            <SelectItem value="west">West Indian</SelectItem>
                            <SelectItem value="east">East Indian</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Calorie Range</Label>
                        <Select
                          value={templateFilters.calorieRange}
                          onValueChange={(value) => setTemplateFilters({...templateFilters, calorieRange: value})}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Ranges</SelectItem>
                            <SelectItem value="low">Low (1000-1500 cal)</SelectItem>
                            <SelectItem value="medium">Medium (1500-2000 cal)</SelectItem>
                            <SelectItem value="high">High (2000-3000 cal)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Duration</Label>
                        <Select
                          value={templateFilters.duration}
                          onValueChange={(value) => setTemplateFilters({...templateFilters, duration: value})}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Durations</SelectItem>
                            <SelectItem value="7">7 Days</SelectItem>
                            <SelectItem value="10">10 Days</SelectItem>
                            <SelectItem value="15">15 Days</SelectItem>
                            <SelectItem value="21">21 Days</SelectItem>
                            <SelectItem value="30">30 Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Input
                      placeholder="🔍 Search templates by name, category, tags..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-12 text-base"
                    />

                    <div className="flex items-center justify-between pt-2 border-t">
                      <p className="text-sm text-gray-600">
                        Showing <span className="font-semibold text-gray-900">{filteredTemplates.length}</span> of {templates.length} templates
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {filteredTemplates.length === 0 && searchQuery ? (
                  <Card className="border-none shadow-lg">
                    <CardContent className="p-12 text-center">
                      <p className="text-gray-600">No templates found matching "{searchQuery}"</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map((template) => (
                    <Card key={template.id} className="border-none shadow-lg bg-white/80 backdrop-blur hover:shadow-xl transition-all">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                          </div>
                          <div className="flex gap-1">
                            {template.is_public && (
                              <Badge className="bg-purple-100 text-purple-700">Public</Badge>
                            )}
                            {template.created_by === user?.email && (
                              <Badge className="bg-blue-100 text-blue-700">My Template</Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge className="bg-orange-100 text-orange-700 capitalize">
                            {template.food_preference}
                          </Badge>
                          <Badge className="bg-blue-100 text-blue-700">
                            {template.target_calories} kcal
                          </Badge>
                          <Badge className="bg-green-100 text-green-700">
                            {template.duration} days
                          </Badge>
                        </div>

                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm font-semibold text-green-900">
                            ✅ Used {template.times_used || 0} times
                          </p>
                          <p className="text-xs text-green-700">FREE - Unlimited uses!</p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => openAssignDialog(template)}
                            disabled={!selectedClient}
                            className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!selectedClient ? "Please select a client first" : "Assign template directly to client"}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Assign Now
                          </Button>
                          <Button
                            onClick={() => cloneTemplate(template)}
                            disabled={!selectedClient}
                            variant="outline"
                            className="flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!selectedClient ? "Please select a client first" : "Customize template before assigning"}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Customize
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    ))}
                    </div>
                    )}
                    </div>
                    )}
                    </TabsContent>

          <TabsContent value="manual" className="space-y-6">
            {!selectedClientId ? (
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Select Client to Build Manual Plan</CardTitle>
                  <CardDescription>Choose a client to whom you'd like to create a meal plan manually.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={selectedClientId || ''} onValueChange={setSelectedClientId}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Choose a client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => {
                          const clientPlans = mealPlans.filter(p => p.client_id === client.id);
                          const hasActivePlan = clientPlans.some(p => p.active);
                          return (
                            <SelectItem key={client.id} value={client.id}>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{client.full_name}</span>
                                <Badge variant="outline" className="text-xs capitalize">
                                  {client.food_preference}
                                </Badge>
                                <Badge className="text-xs">{client.target_calories} kcal</Badge>
                                {hasActivePlan && (
                                  <Badge className="text-xs bg-green-500">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Has Plan
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            ) : (
              <ManualMealPlanBuilder
                client={selectedClient}
                onSave={handleSavePlan}
                isSaving={savePlanMutation.isPending || updatePlanMutation.isPending}
              />
            )}
          </TabsContent>

          <TabsContent value="generate" className="space-y-6">
            {generatedPlan === null && viewingPlan === null ? (
              <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-orange-500" />
                    Generate New Meal Plan with AI
                  </CardTitle>
                  <CardDescription>
                    {user?.user_type === 'student_coach' && coachPlan ? (
                      availableAICredits > 0 ? (
                        '✅ FREE with your AI credits - Use templates to save credits!'
                      ) : (
                        `⚠️ Costs ₹${coachPlan.ai_credit_price || 10} per plan - Use templates to save money!`
                      )
                    ) : (
                      `⚠️ Costs ₹${coachPlan?.ai_credit_price || 10} per plan - Use templates to save money!`
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="client" className="text-base font-semibold flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Select Client *
                    </Label>
                    <Select
                      value={selectedClientId || ''}
                      onValueChange={setSelectedClientId}
                    >
                      <SelectTrigger id="client" className="h-12">
                        <SelectValue placeholder="Choose a client..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => {
                          const clientPlans = mealPlans.filter(p => p.client_id === client.id);
                          const hasActivePlan = clientPlans.some(p => p.active);
                          return (
                            <SelectItem key={client.id} value={client.id}>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{client.full_name}</span>
                                <Badge variant="outline" className="text-xs capitalize">
                                  {client.food_preference}
                                </Badge>
                                <Badge className="text-xs">{client.target_calories} kcal</Badge>
                                {hasActivePlan && (
                                  <Badge className="text-xs bg-green-500">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Has Plan
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedClient && (
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-lg">
                            {selectedClient.full_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{selectedClient.full_name}</h3>
                          <p className="text-sm text-gray-600">{selectedClient.email}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Food:</span>
                          <Badge className="ml-2 capitalize">{selectedClient.food_preference}</Badge>
                        </div>
                        <div>
                          <span className="text-gray-600">Region:</span>
                          <Badge className="ml-2 capitalize">{selectedClient.regional_preference}</Badge>
                        </div>
                        <div>
                          <span className="text-gray-600">Target Calories:</span>
                          <span className="ml-2 font-semibold">{selectedClient.target_calories} kcal</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Goal:</span>
                          <Badge className="ml-2 capitalize">{selectedClient.goal?.replace('_', ' ')}</Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration</Label>
                      <Select
                        value={planConfig.duration.toString()}
                        onValueChange={(value) => setPlanConfig({...planConfig, duration: parseInt(value)})}
                      >
                        <SelectTrigger id="duration">
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 Days</SelectItem>
                          <SelectItem value="10">10 Days</SelectItem>
                          <SelectItem value="15">15 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="meal-pattern">Meal Pattern</Label>
                      <Select
                        value={planConfig.meal_pattern}
                        onValueChange={(value) => setPlanConfig({...planConfig, meal_pattern: value})}
                      >
                        <SelectTrigger id="meal-pattern">
                          <SelectValue placeholder="Select meal pattern" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily (Unique each day)</SelectItem>
                          <SelectItem value="3-3-4">3-3-4 Pattern (3+3+4 days rotation)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {user?.user_type === 'student_coach' && coachPlan ? (
                    <Alert className={`border-2 ${availableAICredits > 0 ? 'border-green-500 bg-green-50' : 'border-yellow-500 bg-yellow-50'}`}>
                      <AlertTriangle className={`w-5 h-5 ${availableAICredits > 0 ? 'text-green-600' : 'text-yellow-600'}`} />
                      <AlertDescription className="ml-2">
                        <div className="space-y-2">
                          <p className={`font-semibold ${availableAICredits > 0 ? 'text-green-900' : 'text-yellow-900'}`}>
                            {availableAICredits > 0 ? '✅ FREE Generation (using your AI credits)' : `💸 Cost: ₹${coachPlan.ai_credit_price || 10} per generation`}
                          </p>
                          <p className={`text-sm ${availableAICredits > 0 ? 'text-green-800' : 'text-yellow-800'}`}>
                            AI Credits Available: {availableAICredits === Infinity ? 'Unlimited ∞' : availableAICredits}
                          </p>
                          <div className="p-3 bg-blue-100 border border-blue-300 rounded-lg mt-2">
                            <p className="text-sm font-semibold text-blue-900 mb-1">💡 Save Money!</p>
                            <p className="text-xs text-blue-800">
                              After generating, click "Save as Template" to reuse it FREE unlimited times!
                            </p>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="border-2 border-yellow-500 bg-yellow-50">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      <AlertDescription className="ml-2">
                        <div className="space-y-2">
                          <p className="font-semibold text-yellow-900">💸 This will cost ₹{coachPlan?.ai_credit_price || 10}</p>
                          <p className="text-sm text-yellow-800">
                            You've used {usage?.meal_plans_generated || 0} / {usage?.plan_limits?.meal_plans || 20} AI generations this month
                          </p>
                          <div className="p-3 bg-green-100 border border-green-300 rounded-lg mt-2">
                            <p className="text-sm font-semibold text-green-900 mb-1">💡 Save Money!</p>
                            <p className="text-xs text-green-800">
                              After generating, click "Save as Template" to reuse it FREE unlimited times!
                            </p>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-3">
                    <Button
                      onClick={generateMealPlan}
                      disabled={generating || !selectedClientId}
                      className="flex-1 h-14 text-lg bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Generating Meal Plan...
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5 mr-2" />
                          {user?.user_type === 'student_coach' && coachPlan ? (
                            availableAICredits > 0 ? 'Generate Meal Plan (FREE with credits)' : `Generate Meal Plan (₹${coachPlan.ai_credit_price || 10})`
                          ) : (
                            `Generate with AI (₹${coachPlan?.ai_credit_price || 10})`
                          )}
                        </>
                      )}
                    </Button>
                    {selectedClient && (
                      <AIMealPlanGenerator 
                        client={selectedClient}
                        onPlanGenerated={(plan) => {
                          setGeneratedPlan(plan);
                          setViewingPlan(plan);
                        }}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <GeneratedMealPlan 
                plan={viewingPlan || generatedPlan} 
                onSave={viewingPlan ? null : handleSavePlan}
                onSaveAsTemplate={!viewingPlan && generatedPlan?.from_template !== true ? () => handleSaveAsTemplate(generatedPlan) : null}
                onGenerateNew={handleGenerateNew}
                isSaving={savePlanMutation.isPending || updatePlanMutation.isPending}
              />
            )}
          </TabsContent>

          <TabsContent value="saved">
            {mealPlans.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Plans Created Yet</h3>
                  <p className="text-gray-600 mb-4">Create a new plan or clone a template to get started</p>
                  <Button 
                    onClick={() => setActiveTab("templates")}
                    className="bg-gradient-to-r from-green-500 to-emerald-500"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Browse Templates (FREE)
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4">
                  {mealPlans.map((plan) => {
                    const planClient = clients.find(c => c.id === plan.client_id);
                    return (
                      <Card key={plan.id} className="border-none shadow-lg bg-white/80 backdrop-blur hover:shadow-xl transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                                {plan.active && (
                                  <Badge className="bg-green-500 text-white">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Active
                                  </Badge>
                                )}
                              </div>
                              {planClient ? (
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                                    <span className="text-white font-medium text-sm">
                                      {planClient.full_name.charAt(0)}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">{planClient.full_name}</p>
                                    <p className="text-xs text-gray-600">{planClient.email}</p>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-red-600 mb-3">⚠️ Client not found</p>
                              )}
                              <div className="flex flex-wrap gap-2">
                                <Badge className="bg-orange-100 text-orange-700">{plan.duration} Days</Badge>
                                <Badge className="bg-blue-100 text-blue-700 capitalize">{plan.food_preference}</Badge>
                                <Badge className="bg-green-100 text-green-700 capitalize">{plan.regional_preference}</Badge>
                                <Badge className="bg-gray-100 text-gray-700">{plan.target_calories} kcal</Badge>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-sm text-gray-600">Created</p>
                              <p className="text-sm font-semibold">{format(new Date(plan.created_date), 'MMM d, yyyy')}</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button 
                              variant="outline" 
                              className="flex-1"
                              onClick={() => handleViewPlan(plan)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Button>
                            <Button 
                              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                              onClick={() => {
                                const editPlan = {
                                  ...plan,
                                  plan_name: plan.name,
                                  client_name: planClient?.full_name || 'Unknown Client'
                                };
                                setGeneratedPlan(editPlan);
                                setActiveTab("generate");
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Plan
                            </Button>
                            <Button 
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => handleDeletePlan(plan)}
                              disabled={deletePlanMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={showEditTemplateDialog} onOpenChange={setShowEditTemplateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Edit className="w-6 h-6 text-blue-600" />
                Edit Meal Plan Template
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  value={editingTemplate?.name || ""}
                  onChange={(e) => setEditingTemplate({...editingTemplate, name: e.target.value})}
                  placeholder="Template name"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingTemplate?.description || ""}
                  onChange={(e) => setEditingTemplate({...editingTemplate, description: e.target.value})}
                  placeholder="Description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={editingTemplate?.category || "general"}
                    onValueChange={(value) => setEditingTemplate({...editingTemplate, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weight_loss">Weight Loss</SelectItem>
                      <SelectItem value="weight_gain">Weight Gain</SelectItem>
                      <SelectItem value="diabetes">Diabetes</SelectItem>
                      <SelectItem value="pcos">PCOS</SelectItem>
                      <SelectItem value="thyroid">Thyroid</SelectItem>
                      <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Target Calories</Label>
                  <Input
                    type="number"
                    value={editingTemplate?.target_calories || ""}
                    onChange={(e) => setEditingTemplate({...editingTemplate, target_calories: parseInt(e.target.value)})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Food Preference</Label>
                  <Select
                    value={editingTemplate?.food_preference || "veg"}
                    onValueChange={(value) => setEditingTemplate({...editingTemplate, food_preference: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="veg">Vegetarian</SelectItem>
                      <SelectItem value="non_veg">Non-Veg</SelectItem>
                      <SelectItem value="jain">Jain</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Regional Preference</Label>
                  <Select
                    value={editingTemplate?.regional_preference || "all"}
                    onValueChange={(value) => setEditingTemplate({...editingTemplate, regional_preference: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="north">North Indian</SelectItem>
                      <SelectItem value="south">South Indian</SelectItem>
                      <SelectItem value="west">West Indian</SelectItem>
                      <SelectItem value="east">East Indian</SelectItem>
                      <SelectItem value="all">All Regions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Duration (days)</Label>
                  <Input
                    type="number"
                    value={editingTemplate?.duration || ""}
                    onChange={(e) => setEditingTemplate({...editingTemplate, duration: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is-public"
                  checked={editingTemplate?.is_public || false}
                  onChange={(e) => setEditingTemplate({...editingTemplate, is_public: e.target.checked})}
                  className="w-4 h-4"
                />
                <Label htmlFor="is-public" className="text-sm">Make public (visible to all coaches)</Label>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditTemplateDialog(false);
                    setEditingTemplate(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveTemplateEdit}
                  disabled={updateTemplateMutation.isPending}
                  className="flex-1 bg-blue-500 h-12"
                >
                  {updateTemplateMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showAIWarning} onOpenChange={setShowAIWarning}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                Monthly Limit Reached!
              </DialogTitle>
              <DialogDescription className="space-y-4 pt-4">
                <p className="text-lg">You've used all {user?.user_type === 'student_coach' && coachPlan ? (coachPlan.ai_generation_limit === -1 ? 'unlimited' : coachPlan.ai_generation_limit) : (usage?.plan_limits?.meal_plans || 20)} AI generations for this month.</p>

                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                  <p className="font-semibold text-red-900 mb-2">💸 Each additional plan costs ₹{coachPlan?.ai_credit_price || 10}</p>
                  <p className="text-sm text-red-800">This will be added to your monthly bill.</p>
                </div>

                <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                  <p className="font-semibold text-green-900 mb-2">✅ Better Option: Use Templates!</p>
                  <p className="text-sm text-green-800 mb-3">
                    Templates are FREE and unlimited. Clone one and customize in 5 minutes!
                  </p>
                  <Button 
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500"
                    onClick={() => {
                      setShowAIWarning(false);
                      setActiveTab("templates");
                    }}
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Browse Templates (FREE)
                  </Button>
                </div>

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setShowAIWarning(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1 bg-red-500 hover:bg-red-600"
                    onClick={() => {
                      setShowAIWarning(false);
                      generateMealPlan(); 
                    }}
                  >
                    Generate Anyway (₹{coachPlan?.ai_credit_price || 10})
                  </Button>
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Calendar className="w-6 h-6 text-blue-600" />
                Assign Template to Client
              </DialogTitle>
              <DialogDescription>
                Set a start date for the meal plan and notify the client
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {templateToAssign && selectedClient && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="space-y-2 text-sm">
                    <p><strong>Template:</strong> {templateToAssign.name}</p>
                    <p><strong>Client:</strong> {selectedClient.full_name}</p>
                    <p><strong>Duration:</strong> {templateToAssign.duration} days</p>
                    <p><strong>Calories:</strong> {templateToAssign.target_calories} kcal</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="start-date">Plan Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={assignmentStartDate}
                  onChange={(e) => setAssignmentStartDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="h-12"
                />
                <p className="text-xs text-gray-600">
                  The client will start following this plan from the selected date
                </p>
              </div>

              <Alert className="bg-green-50 border-green-300">
                <AlertDescription className="text-green-900 text-sm">
                  ✅ Client will receive a notification about their new meal plan
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAssignDialog(false);
                    setTemplateToAssign(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => assignTemplateDirectly(templateToAssign, assignmentStartDate)}
                  disabled={savePlanMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 h-12"
                >
                  {savePlanMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Assign Plan
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showAITemplateDialog} onOpenChange={setShowAITemplateDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-orange-500" />
                AI Generate Complete Meal Plan Template
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <Alert className="bg-orange-50 border-orange-500">
                <Sparkles className="w-5 h-5 text-orange-600" />
                <AlertDescription>
                  AI will generate a complete {aiTemplateForm.duration}-day meal plan with ALL 6 meals per day ({parseInt(aiTemplateForm.duration) * 6} total meals) - ready to use unlimited times FREE!
                </AlertDescription>
              </Alert>

              {!aiGeneratedTemplate ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-semibold text-gray-900 flex items-center gap-2">
                      📏 Portion Size Reference Guide
                    </Label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setAiTemplateForm({...aiTemplateForm, portion_size: 'small'})}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          aiTemplateForm.portion_size === 'small'
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 bg-white hover:border-orange-300'
                        }`}
                      >
                        <p className="font-semibold text-gray-900">Small Bowl</p>
                        <p className="text-gray-600">150gm</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiTemplateForm({...aiTemplateForm, portion_size: 'medium'})}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          aiTemplateForm.portion_size === 'medium'
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 bg-white hover:border-orange-300'
                        }`}
                      >
                        <p className="font-semibold text-gray-900">Medium Bowl</p>
                        <p className="text-gray-600">200gm</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiTemplateForm({...aiTemplateForm, portion_size: 'large'})}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          aiTemplateForm.portion_size === 'large'
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 bg-white hover:border-orange-300'
                        }`}
                      >
                        <p className="font-semibold text-gray-900">Large Bowl</p>
                        <p className="text-gray-600">250gm</p>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Age</Label>
                      <Input
                        type="number"
                        placeholder="30"
                        value={aiTemplateForm.age}
                        onChange={(e) => setAiTemplateForm({...aiTemplateForm, age: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Height (cm)</Label>
                      <Input
                        type="number"
                        placeholder="170"
                        value={aiTemplateForm.height}
                        onChange={(e) => {
                          const newHeight = e.target.value;
                          
                          // Auto-calculate goal based on BMI
                          if (newHeight && aiTemplateForm.weight) {
                            const bmi = aiTemplateForm.weight / Math.pow(newHeight / 100, 2);
                            let autoGoal;
                            if (bmi > 25) {
                              autoGoal = 'weight_loss';
                            } else if (bmi < 18.5) {
                              autoGoal = 'weight_gain';
                            } else {
                              autoGoal = 'maintenance';
                            }
                            setAiTemplateForm({...aiTemplateForm, height: newHeight, goal: autoGoal});
                          } else {
                            setAiTemplateForm({...aiTemplateForm, height: newHeight});
                          }
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Weight (kg)</Label>
                      <Input
                        type="number"
                        placeholder="70"
                        value={aiTemplateForm.weight}
                        onChange={(e) => {
                          const newWeight = e.target.value;
                          
                          // Auto-calculate goal based on BMI
                          if (aiTemplateForm.height && newWeight) {
                            const bmi = newWeight / Math.pow(aiTemplateForm.height / 100, 2);
                            let autoGoal;
                            if (bmi > 25) {
                              autoGoal = 'weight_loss';
                            } else if (bmi < 18.5) {
                              autoGoal = 'weight_gain';
                            } else {
                              autoGoal = 'maintenance';
                            }
                            setAiTemplateForm({...aiTemplateForm, weight: newWeight, goal: autoGoal});
                          } else {
                            setAiTemplateForm({...aiTemplateForm, weight: newWeight});
                          }
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>BMI (Auto-calculated)</Label>
                      <Input
                        type="text"
                        value={
                          aiTemplateForm.height && aiTemplateForm.weight
                            ? (aiTemplateForm.weight / Math.pow(aiTemplateForm.height / 100, 2)).toFixed(1)
                            : ''
                        }
                        disabled
                        placeholder="Fill height and weight to calculate"
                        className="bg-gray-50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Target Calories * (Auto-calculated)</Label>
                      <Input
                        type="text"
                        value={(() => {
                          if (!aiTemplateForm.age || !aiTemplateForm.height || !aiTemplateForm.weight) return '';
                          
                          const age = parseFloat(aiTemplateForm.age);
                          const height = parseFloat(aiTemplateForm.height);
                          const weight = parseFloat(aiTemplateForm.weight);
                          
                          // Mifflin-St Jeor equation (using average for both genders)
                          const bmrMale = (10 * weight) + (6.25 * height) - (5 * age) + 5;
                          const bmrFemale = (10 * weight) + (6.25 * height) - (5 * age) - 161;
                          const bmr = (bmrMale + bmrFemale) / 2;
                          
                          // TDEE for lightly active
                          const tdee = bmr * 1.375;
                          
                          // Adjust based on goal
                          let targetCalories = tdee;
                          if (aiTemplateForm.goal === 'weight_loss') {
                            targetCalories = tdee - 500; // 500 cal deficit for ~0.5kg/week loss
                          } else if (aiTemplateForm.goal === 'weight_gain' || aiTemplateForm.goal === 'muscle_gain') {
                            targetCalories = tdee + 300; // 300 cal surplus
                          }
                          
                          return Math.round(targetCalories);
                        })()}
                        disabled
                        placeholder="Fill age, height, weight, and select goal"
                        className="bg-gray-50"
                      />
                      <p className="text-xs text-gray-600">
                        Based on Mifflin-St Jeor equation and {aiTemplateForm.goal === 'weight_loss' ? '500 cal deficit' : aiTemplateForm.goal === 'weight_gain' || aiTemplateForm.goal === 'muscle_gain' ? '300 cal surplus' : 'maintenance'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Duration (days) *</Label>
                      <Select
                        value={aiTemplateForm.duration}
                        onValueChange={(value) => setAiTemplateForm({...aiTemplateForm, duration: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 Days</SelectItem>
                          <SelectItem value="10">10 Days</SelectItem>
                          <SelectItem value="15">15 Days</SelectItem>
                          <SelectItem value="21">21 Days</SelectItem>
                          <SelectItem value="30">30 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Goal Target * (Auto-selected)</Label>
                      <Select
                        value={aiTemplateForm.goal}
                        onValueChange={(value) => setAiTemplateForm({...aiTemplateForm, goal: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Will auto-select based on BMI" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weight_loss">Weight Loss</SelectItem>
                          <SelectItem value="weight_gain">Weight Gain</SelectItem>
                          <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="health_improvement">Health Improvement</SelectItem>
                          <SelectItem value="disease_reversal">Disease Reversal</SelectItem>
                        </SelectContent>
                      </Select>
                      {aiTemplateForm.height && aiTemplateForm.weight && (
                        <p className="text-xs text-gray-600">
                          {(() => {
                            const bmi = aiTemplateForm.weight / Math.pow(aiTemplateForm.height / 100, 2);
                            if (bmi > 25) return '⚠️ BMI > 25: Weight Loss recommended';
                            if (bmi < 18.5) return '⚠️ BMI < 18.5: Weight Gain recommended';
                            return '✅ BMI Normal: Maintenance recommended';
                          })()}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Food Preference *</Label>
                      <Select
                        value={aiTemplateForm.food_preference}
                        onValueChange={(value) => setAiTemplateForm({...aiTemplateForm, food_preference: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="veg">Vegetarian</SelectItem>
                          <SelectItem value="non_veg">Non-Veg</SelectItem>
                          <SelectItem value="eggetarian">Eggetarian</SelectItem>
                          <SelectItem value="jain">Jain</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Regional Preference *</Label>
                      <Select
                        value={aiTemplateForm.regional_preference}
                        onValueChange={(value) => setAiTemplateForm({...aiTemplateForm, regional_preference: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="north">North Indian</SelectItem>
                          <SelectItem value="south">South Indian</SelectItem>
                          <SelectItem value="west">West Indian</SelectItem>
                          <SelectItem value="east">East Indian</SelectItem>
                          <SelectItem value="all">All Regions</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Disease Focus (Optional)</Label>
                    <div className="p-4 bg-gray-50 border rounded-lg">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                          { value: "diabetes_type1", label: "Diabetes Type 1" },
                          { value: "diabetes_type2", label: "Diabetes Type 2" },
                          { value: "prediabetes", label: "Prediabetes" },
                          { value: "hypertension", label: "Hypertension" },
                          { value: "pcos", label: "PCOS" },
                          { value: "thyroid_hypo", label: "Hypothyroid" },
                          { value: "thyroid_hyper", label: "Hyperthyroid" },
                          { value: "fatty_liver", label: "Fatty Liver" },
                          { value: "high_cholesterol", label: "High Cholesterol" },
                          { value: "ibs", label: "IBS" },
                          { value: "gerd", label: "GERD" },
                          { value: "kidney_disease", label: "Kidney Disease" },
                          { value: "heart_disease", label: "Heart Disease" },
                        ].map((disease) => (
                          <label key={disease.value} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={aiTemplateForm.disease_focus.includes(disease.value)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAiTemplateForm({
                                    ...aiTemplateForm,
                                    disease_focus: [...aiTemplateForm.disease_focus, disease.value]
                                  });
                                } else {
                                  setAiTemplateForm({
                                    ...aiTemplateForm,
                                    disease_focus: aiTemplateForm.disease_focus.filter(d => d !== disease.value)
                                  });
                                }
                              }}
                              className="w-4 h-4"
                            />
                            <span className="text-sm">{disease.label}</span>
                          </label>
                        ))}
                      </div>
                      {aiTemplateForm.disease_focus.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm font-medium text-gray-700">Selected: {aiTemplateForm.disease_focus.length} disease(s)</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {aiTemplateForm.disease_focus.map(disease => (
                              <Badge key={disease} className="bg-red-100 text-red-700">
                                {disease.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={handleGenerateAITemplate}
                    disabled={generatingAITemplate}
                    className="w-full h-14 bg-gradient-to-r from-orange-500 to-red-500"
                  >
                    {generatingAITemplate ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Generating {parseInt(aiTemplateForm.duration) * 6} meals...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Generate Complete Meal Plan
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert className="bg-green-50 border-green-500">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <AlertDescription>
                      ✅ Successfully generated {aiGeneratedTemplate.length} meals! Review and save as template.
                    </AlertDescription>
                  </Alert>

                  <div className="p-4 bg-white border-2 rounded-lg max-h-64 overflow-y-auto">
                    <h3 className="font-bold mb-3">Generated Meals Summary:</h3>
                    {Array.from({ length: parseInt(aiTemplateForm.duration) }, (_, i) => i + 1).map(day => {
                      const dayMeals = aiGeneratedTemplate.filter(m => m.day === day);
                      return (
                        <div key={day} className="mb-3 p-3 bg-gray-50 rounded">
                          <p className="font-semibold text-sm">Day {day} ({dayMeals.length} meals):</p>
                          <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                            {dayMeals.map((meal, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span className="capitalize text-gray-600">{meal.meal_type.replace('_', ' ')}:</span>
                                <span className="font-medium">{meal.meal_name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Template Name *</Label>
                      <Input
                        placeholder="e.g., Veg 1800 cal - 7 days Template"
                        value={aiTemplateForm.name}
                        onChange={(e) => setAiTemplateForm({...aiTemplateForm, name: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Description (optional)</Label>
                      <Textarea
                        placeholder="Description"
                        value={aiTemplateForm.description}
                        onChange={(e) => setAiTemplateForm({...aiTemplateForm, description: e.target.value})}
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAiGeneratedTemplate(null);
                        setAiTemplateForm({
                          name: "",
                          target_calories: "",
                          food_preference: "veg",
                          regional_preference: "all",
                          duration: "7",
                          description: "",
                          disease_focus: [],
                          goal: "",
                          age: "",
                          height: "",
                          weight: "",
                          bmi: "",
                          bmi_file: null,
                          weight_loss_target: "",
                          portion_size: "medium"
                        });
                      }}
                      className="flex-1"
                    >
                      Start Over
                    </Button>
                    <Button
                      onClick={handleSaveAITemplate}
                      disabled={saveAITemplateMutation.isPending}
                      className="flex-1 bg-green-500 h-12"
                    >
                      {saveAITemplateMutation.isPending ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Save as Template
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Manual Template Creation Dialog */}
        <Dialog open={showManualTemplateDialog} onOpenChange={setShowManualTemplateDialog}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Edit className="w-6 h-6 text-indigo-600" />
                Create Manual Template
              </DialogTitle>
            </DialogHeader>

            <ManualTemplateBuilder
              onSave={(templateData) => {
                saveTemplateMutation.mutate(templateData);
                setShowManualTemplateDialog(false);
              }}
              isSaving={saveTemplateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
        </div>
        </div>
        );
        }