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
import { Sparkles, Calendar, Loader2, Plus, Users, Eye, CheckCircle, Copy, AlertTriangle, Zap, Star, Download, Clock, Target, TrendingUp, Edit, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { createPageUrl } from "@/utils";

import GeneratedMealPlan from "@/components/mealplanner/GeneratedMealPlan";
import UsageLimitWarning from "@/components/mealplanner/UsageLimitWarning";
import ManualMealPlanBuilder from "@/components/mealplanner/ManualMealPlanBuilder";

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
      const myTemplates = await base44.entities.MealPlanTemplate.filter({ created_by: user?.email });
      const publicTemplates = await base44.entities.MealPlanTemplate.filter({ is_public: true });
      return [...myTemplates, ...publicTemplates];
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

  const availableAICredits = React.useMemo(() => {
    if (!coachSubscription || !coachPlan) return 0;
    
    const creditsIncluded = coachPlan.ai_credits_included || 0;
    if (creditsIncluded === -1) return Infinity; // Unlimited
    
    const creditsUsed = coachSubscription.ai_credits_used_this_month || 0;
    const creditsPurchased = coachSubscription.ai_credits_purchased || 0;
    
    return Math.max(0, creditsIncluded + creditsPurchased - creditsUsed);
  }, [coachSubscription, coachPlan]);

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

  const saveTemplateMutation = useMutation({
    mutationFn: (templateData) => base44.entities.MealPlanTemplate.create(templateData),
    onSuccess: () => {
      queryClient.invalidateQueries(['mealPlanTemplates']);
      alert("✅ Template saved! You can now use it unlimited times for FREE!");
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
      alert("Please select a client first");
      return;
    }

    setGeneratedPlan({
      plan_name: `${template.name} - ${selectedClient.full_name}`,
      meals: template.meals,
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
        queryClient.invalidateQueries(['mealPlanTemplates']);
    }).catch(console.error);

    setActiveTab("generate");
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
        alert(`⚠️ No AI Credits Available!\n\nYou've used all your AI credits for this month.\n\nPurchase additional credits to continue generating meal plans.\n\nPrice: ₹${coachPlan.ai_credit_price || 10} per credit`);
        return;
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

  const canEditTemplate = (template) => {
    return user?.user_type === 'super_admin' || 
           user?.user_type === 'team_member' || 
           template.created_by === user?.email;
    };

    const canContributeTemplates = user?.user_type === 'super_admin' || 
                                  user?.user_type === 'team_member' || 
                                  user?.user_type === 'student_coach';

  const canDeleteTemplate = (template) => {
    return user?.user_type === 'super_admin' || 
           user?.user_type === 'team_member' || 
           template.created_by === user?.email;
    };

    const filteredTemplates = templates.filter(template => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(query) ||
      template.description?.toLowerCase().includes(query) ||
      template.category?.toLowerCase().includes(query) ||
      template.food_preference?.toLowerCase().includes(query) ||
      template.tags?.some(tag => tag.toLowerCase().includes(query))
    );
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
                    <strong>Low on credits!</strong> You have {availableAICredits} AI credits remaining. Purchase more to continue generating.
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
                    <p>✅ Generate 1 AI meal plan (costs ₹10)</p>
                    <p>✅ Save it as template (FREE forever)</p>
                    <p>✅ Use for 100 clients (₹0 instead of ₹1000!)</p>
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
                    <CardTitle className="text-lg">Select Client to Assign Template</CardTitle>
                    <CardDescription>First, select a client to whom you'd like to assign or customize a template. Then pick a template below.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={selectedClientId || ''}
                      onValueChange={setSelectedClientId}
                    >
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

                <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
                  <CardContent className="p-4">
                    <Input
                      placeholder="🔍 Search templates by name, category, food type, tags..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-12 text-base"
                    />
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

                        <Button
                          onClick={() => cloneTemplate(template)}
                          disabled={!selectedClient}
                          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Clone & Customize
                        </Button>

                        {canEditTemplate(template) && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditTemplate(template)}
                              className="flex-1"
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            {canDeleteTemplate(template) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteTemplate(template)}
                                className="flex-1 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Delete
                              </Button>
                            )}
                          </div>
                        )}
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
                isSaving={savePlanMutation.isPending}
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
                    ⚠️ Costs ₹10 per plan - Use templates instead to save money!
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

                  <Alert className="border-2 border-yellow-500 bg-yellow-50">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <AlertDescription className="ml-2">
                      <div className="space-y-2">
                        <p className="font-semibold text-yellow-900">💸 This will cost ₹10</p>
                        <p className="text-sm text-yellow-800">
                          You've used {usage?.meal_plans_generated || 0} / {usage?.plan_limits?.meal_plans || 20} AI generations this month
                        </p>
                        <div className="p-3 bg-green-100 border border-green-300 rounded-lg mt-2">
                          <p className="text-sm font-semibold text-green-900 mb-1">💡 Save Money!</p>
                          <p className="text-xs text-green-800">
                            After generating, click "Save as Template" to reuse it FREE unlimited times!
                          </p>
                          {user?.user_type === 'student_coach' && coachPlan && (
                            <p className="text-xs text-green-800 mt-2">
                              💳 Available Credits: {availableAICredits === Infinity ? 'Unlimited' : availableAICredits}
                            </p>
                          )}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <Button
                    onClick={generateMealPlan}
                    disabled={generating || !selectedClientId}
                    className="w-full h-14 text-lg bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Generating Meal Plan...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 mr-2" />
                        Generate with AI (₹10)
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <GeneratedMealPlan 
                plan={viewingPlan || generatedPlan} 
                onSave={viewingPlan ? null : handleSavePlan}
                onSaveAsTemplate={!viewingPlan && generatedPlan?.from_template !== true ? () => handleSaveAsTemplate(generatedPlan) : null}
                onGenerateNew={handleGenerateNew}
                isSaving={savePlanMutation.isPending}
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
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              className="flex-1"
                              onClick={() => handleViewPlan(plan)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
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
                  <p className="font-semibold text-red-900 mb-2">💸 Each additional plan costs ₹10</p>
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
                    Generate Anyway (₹10)
                  </Button>
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}