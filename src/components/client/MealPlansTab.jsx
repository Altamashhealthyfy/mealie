import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ChefHat, Crown, Plus, Eye, Trash2, CheckCircle, Sparkles,
  BookOpen, Save, Loader2, ChevronDown, HelpCircle, Bot,
  Calendar, PenLine, Upload, ArrowLeft, Lock, Zap, AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import MealPlanViewer from "@/components/client/MealPlanViewer";
import AIMealPlanGenerator from "@/components/mealplanner/AIMealPlanGenerator";
import MealPlanningWorkflow from "@/components/mealplanner/MealPlanningWorkflow";
import MealPlanTemplateSelector from "@/components/mealplanner/MealPlanTemplateSelector";
import SaveAsTemplateDialog from "@/components/mealplanner/SaveAsTemplateDialog";
import ModeB_ChooseSchedule from "@/components/mealplanner/ModeB_ChooseSchedule";
import ModeC_BuildFromScratch from "@/components/mealplanner/ModeC_BuildFromScratch";
import BasicPlanCreator from "@/components/mealplanner/BasicPlanCreator";

// ── Config ─────────────────────────────────────────────────────────────────────
const UPGRADE_WHATSAPP_NUMBER = "919911510377"; // easy to change
const UPGRADE_URL = `https://wa.me/${UPGRADE_WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi, I want to upgrade my Mealie subscription to Mealie Pro")}`;

// ── Tooltip content per mode ──────────────────────────────────────────────────
const TOOLTIP_CONTENT = {
  basic_plan: {
    icon: "⚡",
    title: "How Basic Plan works",
    steps: [
      "Reads client profile — age, weight, diet type, goal",
      "Generates a simple healthy meal plan (no disease rules)",
      "⚠️ Not designed for medical conditions or clinical use",
      "For disease management use AI Generated Plan instead",
    ],
    time: "10 seconds",
    effort: "Just click generate",
    bestFor: "General healthy eating",
  },
  ai_options: {
    icon: "🤖",
    title: "How AI Generated Plan works",
    steps: [
      "You click Generate",
      "AI reads client's condition, diet type and calorie target",
      "AI suggests 4–5 meal options per slot (breakfast, lunch etc)",
      "You review — keep, swap or remove",
      "Send to client",
    ],
    time: "15–20 seconds",
    effort: "Review only",
    bestFor: "Most clients",
  },
  mode_b: {
    icon: "📅",
    title: "How AI Plan + My Schedule works",
    steps: [
      "AI generates complete meal options (same as AI Generated Plan)",
      "You assign days to each option: Moong Dal Cheela → 3 days, Ragi Dosa → 3 days, Oats Upma → 4 days",
      "System checks all combinations stay within calorie range",
      "Client sees options + day guide",
    ],
    time: "3–5 minutes",
    effort: "Assign days per option",
    bestFor: "Structured 10-day cycles",
  },
  mode_c: {
    icon: "✏️",
    title: "How My Own Plan works",
    steps: [
      "You choose every meal yourself — slot by slot, day by day",
      "Search any dish — system fills kcal and macros automatically",
      "Running calorie total shown live (green = on target)",
      "Copy Day 1 to other days to save time",
      "Save and send to client",
    ],
    time: "10–20 minutes",
    effort: "Full control",
    bestFor: "Complex or specific needs",
  },
};

// ── Plan type display labels (with emoji) ──────────────────────────────────────
function getPlanTypeLabel(plan) {
  if (plan.plan_tier === "advanced") {
    const mode = plan.generation_parameters?.mode || "";
    if (mode === "B" || plan.name?.toLowerCase().includes("schedule")) return "📅 AI Schedule";
    return "🏥 Clinical";
  }
  const mode = plan.generation_parameters?.mode || "";
  if (mode === "C" || plan.name?.toLowerCase().includes("scratch")) return "✏️ My Own";
  if (mode === "B") return "📅 AI Schedule";
  if (mode === "A" || plan.meals?.length > 0) return "🤖 AI Generated";
  return "⚡ Basic";
}

// ── ModeDropdown component ─────────────────────────────────────────────────────
function ModeDropdown({ onSelect, isBasicUser }) {
  const [open, setOpen] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
        setActiveTooltip(null);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleModeClick = (modeKey, isComingSoon, isProLocked) => {
    if (isComingSoon) return;
    if (isProLocked) {
      toast.error("This feature requires Mealie Pro. Contact Healthyfy to upgrade.", { duration: 4000 });
      return;
    }
    setOpen(false);
    setActiveTooltip(null);
    onSelect(modeKey);
  };

  const toggleTooltip = (e, key) => {
    e.stopPropagation();
    setActiveTooltip(prev => prev === key ? null : key);
  };

  // Mode definitions — Basic Plan always first
  const modes = [
    {
      key: "basic_plan",
      icon: <Zap className="w-5 h-5 text-yellow-500" />,
      label: "Basic Plan",
      description: "Simple healthy meal plan from client profile. No disease rules.",
      bestFor: "general healthy eating",
      popular: false,
      comingSoon: false,
      proOnly: false,
    },
    // divider after basic_plan (handled below)
    {
      key: "ai_options",
      icon: <Bot className="w-5 h-5 text-green-600" />,
      label: "AI Generated Plan",
      description: "AI creates complete meal options. You review and send.",
      bestFor: "quick clinical plans",
      popular: true,
      comingSoon: false,
      proOnly: true,
    },
    {
      key: "clinical_diet",
      icon: <Sparkles className="w-5 h-5 text-purple-600" />,
      label: "Clinical Diet Plan",
      description: "6-step clinical workflow: Diagnostic → Filter → Generate → Modify → Save.",
      bestFor: "disease management",
      popular: false,
      comingSoon: false,
      proOnly: true,
    },
    {
      key: "mode_b",
      icon: <Calendar className="w-5 h-5 text-blue-600" />,
      label: "AI Plan + My Schedule",
      description: "AI creates options. You decide how many days each meal repeats.",
      bestFor: "structured 10-day cycles",
      popular: false,
      comingSoon: false,
      proOnly: true,
    },
    {
      key: "mode_c",
      icon: <PenLine className="w-5 h-5 text-indigo-600" />,
      label: "My Own Plan",
      description: "You build every meal yourself. System calculates kcal + macros.",
      bestFor: "specific client needs",
      popular: false,
      comingSoon: false,
      proOnly: true,
    },
    {
      key: "mode_d",
      icon: <BookOpen className="w-5 h-5 text-gray-400" />,
      label: "Use a Template",
      description: "Pick from Dr. Sheenu's library or your saved plans.",
      bestFor: null,
      popular: false,
      comingSoon: false,
      proOnly: true,
      comingSoonLabel: true,
    },
    {
      key: "mode_e",
      icon: <Upload className="w-5 h-5 text-gray-400" />,
      label: "Upload My Plan",
      description: "Upload Excel or PDF meal plan.",
      bestFor: null,
      popular: false,
      comingSoon: false,
      proOnly: true,
      comingSoonLabel: true,
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        onClick={() => { setOpen(o => !o); setActiveTooltip(null); }}
        className="bg-green-600 hover:bg-green-700 text-white gap-2"
        size="sm"
      >
        <Plus className="w-4 h-4" />
        Create New Plan
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              How do you want to create this plan?
            </p>
          </div>

          <div className="py-1 max-h-[70vh] overflow-y-auto">
            {modes.map((mode, idx) => {
              const isProLocked = isBasicUser && mode.proOnly;
              const isDisabled = mode.comingSoonLabel;
              const tooltipData = TOOLTIP_CONTENT[mode.key];
              const isTooltipOpen = activeTooltip === mode.key;

              // Divider after basic_plan
              const showDivider = mode.key === "ai_options";
              // Divider before coming-soon section handled below

              return (
                <div key={mode.key}>
                  {showDivider && <div className="border-t border-gray-100 my-1" />}

                  {/* Mode row */}
                  <div
                    className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                      isDisabled
                        ? "cursor-not-allowed opacity-50"
                        : isProLocked
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer hover:bg-gray-50"
                    }`}
                    onClick={() => handleModeClick(mode.key, isDisabled, isProLocked)}
                  >
                    {/* Icon — show lock for pro-locked basic users */}
                    <div className="mt-0.5 shrink-0">
                      {isProLocked ? <Lock className="w-5 h-5 text-gray-400" /> : mode.icon}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-semibold ${isProLocked || isDisabled ? "text-gray-400" : "text-gray-800"}`}>
                          {mode.label}
                        </span>
                        {mode.popular && !isProLocked && (
                          <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full leading-none">
                            POPULAR
                          </span>
                        )}
                        {mode.comingSoonLabel && (
                          <span className="bg-gray-200 text-gray-500 text-[10px] font-semibold px-2 py-0.5 rounded-full leading-none">
                            Coming Soon
                          </span>
                        )}
                      </div>
                      {isProLocked ? (
                        <p className="text-xs mt-0.5 text-orange-500 font-medium">Upgrade to Mealie Pro to unlock</p>
                      ) : (
                        <>
                          <p className={`text-xs mt-0.5 ${isDisabled ? "text-gray-400" : "text-gray-500"}`}>
                            {mode.description}
                          </p>
                          {mode.bestFor && !isDisabled && (
                            <p className="text-[10px] text-gray-400 mt-0.5">Best for: {mode.bestFor}</p>
                          )}
                        </>
                      )}
                    </div>

                    {/* Help button — only for non-locked, non-coming-soon modes */}
                    {tooltipData && !isProLocked && !isDisabled && (
                      <button
                        onClick={(e) => toggleTooltip(e, mode.key)}
                        className={`shrink-0 mt-0.5 p-1 rounded-full transition-colors ${
                          isTooltipOpen
                            ? "bg-blue-100 text-blue-600"
                            : "text-gray-400 hover:text-blue-500 hover:bg-blue-50"
                        }`}
                        title="How does this work?"
                      >
                        <HelpCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Inline tooltip card */}
                  {isTooltipOpen && tooltipData && !isProLocked && (
                    <div
                      className="mx-3 mb-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs animate-in fade-in duration-150"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="font-bold text-gray-800 mb-2">
                        {tooltipData.icon} {tooltipData.title}
                      </p>
                      <ol className="space-y-1 text-gray-700 list-decimal list-inside mb-3">
                        {tooltipData.steps.map((step, i) => (
                          <li key={i} className="leading-relaxed">{step}</li>
                        ))}
                      </ol>
                      <div className="grid grid-cols-3 gap-2 border-t border-blue-200 pt-2">
                        <div>
                          <p className="text-gray-400 text-[10px]">⏱ Takes</p>
                          <p className="font-semibold text-gray-700">{tooltipData.time}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-[10px]">👆 Your effort</p>
                          <p className="font-semibold text-gray-700">{tooltipData.effort}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-[10px]">🎯 Best for</p>
                          <p className="font-semibold text-gray-700">{tooltipData.bestFor}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Divider before coming-soon section */}
                  {mode.key === "mode_c" && (
                    <div className="border-t border-gray-100 my-1" />
                  )}
                </div>
              );
            })}

            {/* Upgrade CTA for basic users */}
            {isBasicUser && (
              <div className="m-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-xs font-semibold text-orange-700 mb-1">🔒 Pro features locked</p>
                <p className="text-xs text-orange-600 mb-2">Upgrade to Mealie Pro to unlock AI plans, clinical workflows and more.</p>
                <a href={UPGRADE_URL} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs h-7">
                    Upgrade to Mealie Pro
                  </Button>
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── PlanCard ───────────────────────────────────────────────────────────────────
function PlanCard({ plan, onView, onSetActive, onSaveTemplate, onDelete, allPlanIds, isPending, isBasicUser }) {
  const typeLabel = getPlanTypeLabel(plan);
  const isBasicPlan = typeLabel === "⚡ Basic";
  return (
    <Card className={`border shadow-sm bg-white hover:shadow-md transition-all ${plan.active ? "border-l-4 border-l-green-500" : "border-gray-200"}`}>
      <CardContent className="p-4">
        {/* Basic plan disclaimer badge */}
        {isBasicPlan && isBasicUser && (
          <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="w-3 h-3 text-yellow-600 shrink-0" />
            <p className="text-xs text-yellow-700">⚠️ General plan — not for conditions</p>
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 text-sm truncate">{plan.name}</h3>
              {plan.active && <Badge className="bg-green-500 text-white text-xs"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>}
              {plan.plan_tier === "advanced" && <Badge className="bg-purple-600 text-white text-xs">💎 Pro</Badge>}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-1">
              <Badge variant="outline" className="text-xs">{plan.duration} Days</Badge>
              {plan.food_preference && <Badge variant="outline" className="text-xs capitalize">{plan.food_preference}</Badge>}
              {plan.target_calories && <Badge variant="outline" className="text-xs">{plan.target_calories} kcal</Badge>}
              <Badge variant="outline" className="text-xs text-gray-500">{typeLabel}</Badge>
            </div>
            <p className="text-xs text-gray-400">Created: {format(new Date(plan.created_date), "MMM d, yyyy")}</p>
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 text-xs h-7" onClick={() => onView(plan)}>
              <Eye className="w-3 h-3 mr-1" /> View
            </Button>
            {!plan.active && (
              <Button size="sm" variant="outline" className="text-green-600 border-green-300 text-xs h-7"
                onClick={() => onSetActive(plan.id)} disabled={isPending}>
                Assign
              </Button>
            )}
            <Button size="sm" variant="outline" className="text-orange-600 border-orange-200 text-xs h-7"
              onClick={() => onSaveTemplate(plan)}>
              <Save className="w-3 h-3 mr-1" /> Template
            </Button>
            <Button size="sm" variant="outline" className="text-red-600 border-red-200 text-xs h-7"
              onClick={() => { if (window.confirm(`Delete "${plan.name}"?`)) onDelete(plan.id); }}
              disabled={isPending}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Basic user locked overlay ──────────────────────────────────────────────────
function BasicUserLockedOverlay() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="text-4xl mb-4">🔒</div>
      <h3 className="text-lg font-bold text-gray-800 mb-2">Available in Mealie Pro</h3>
      <p className="text-gray-500 text-sm max-w-sm mb-4">
        Upgrade to Mealie Pro to access this feature.
      </p>
      <a href={UPGRADE_URL} target="_blank" rel="noopener noreferrer">
        <Button className="bg-orange-500 hover:bg-orange-600 text-white">
          Upgrade to Mealie Pro
        </Button>
      </a>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function MealPlansTab({ client, clinicalIntakes, mealPlans, isBasicUser = false }) {
  const queryClient = useQueryClient();
  const clientId = client?.id;

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: subscription } = useQuery({
    queryKey: ['coachSubscription', currentUser?.email],
    queryFn: () => base44.entities.HealthCoachSubscription.filter({
      coach_email: currentUser?.email,
      status: 'active'
    }).then(r => r[0] || null),
    enabled: !!currentUser?.email,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.user_type === 'super_admin';
  const hasProAccess = isAdmin || (
    subscription?.status === 'active' &&
    subscription?.plan_name?.toLowerCase().includes('pro')
  );

  // activeMode: null | 'basic' | 'ai_generated' | 'ai_schedule' | 'my_own'
  const [activeMode, setActiveMode] = useState(null);
  const [viewingPlan, setViewingPlan] = useState(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(null);
  const [savingTemplate, setSavingTemplate] = useState(null);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [filterType, setFilterType] = useState("all");

  const invalidatePlans = () => queryClient.invalidateQueries(["clientMealPlans", clientId]);

  const handlePlanSaved = (savedPlan) => {
    setShowWorkflow(false);
    setActiveMode(null);
    invalidatePlans();
    if (savedPlan) setTimeout(() => setViewingPlan(savedPlan), 500);
  };

  const deletePlanMutation = useMutation({
    mutationFn: (id) => base44.entities.MealPlan.delete(id),
    onSuccess: invalidatePlans,
  });

  const setActivePlanMutation = useMutation({
    mutationFn: async ({ planId, allPlanIds }) => {
      await Promise.all(allPlanIds.map(id => base44.entities.MealPlan.update(id, { active: false })));
      await base44.entities.MealPlan.update(planId, { active: true });
    },
    onSuccess: invalidatePlans,
  });

  const allPlanIds = mealPlans.map(p => p.id);

  // ── Filter plans ──────────────────────────────────────────────────────────
  // Basic users only see basic plans
  const visiblePlans = isBasicUser
    ? mealPlans.filter(p => getPlanTypeLabel(p) === "⚡ Basic")
    : mealPlans;

  const filteredPlans = visiblePlans.filter(plan => {
    if (filterType === "all") return true;
    const label = getPlanTypeLabel(plan);
    if (filterType === "ai_generated") return label === "🤖 AI Generated";
    if (filterType === "ai_schedule") return label === "📅 AI Schedule";
    if (filterType === "my_own") return label === "✏️ My Own";
    if (filterType === "clinical") return label === "🏥 Clinical";
    if (filterType === "basic") return label === "⚡ Basic";
    return true;
  });

  // Basic users get simplified filter pills
  const FILTER_PILLS = isBasicUser
    ? [
        { key: "all", label: "All" },
        { key: "basic", label: "Basic Plans" },
      ]
    : [
        { key: "all", label: "All" },
        { key: "ai_generated", label: "AI Generated" },
        { key: "ai_schedule", label: "AI + Schedule" },
        { key: "my_own", label: "My Own" },
        { key: "clinical", label: "Clinical" },
        { key: "basic", label: "Basic" },
      ];

  // ── Handle mode selection from dropdown ───────────────────────────────────
  const handleModeSelect = (modeKey) => {
    if (modeKey === "basic_plan")        setActiveMode("basic");
    else if (modeKey === "ai_options")   setActiveMode("ai_generated");
    else if (modeKey === "clinical_diet") setShowWorkflow(true);
    else if (modeKey === "mode_b")       setActiveMode("ai_schedule");
    else if (modeKey === "mode_c")       setActiveMode("my_own");
    else if (modeKey === "mode_d" || modeKey === "mode_e") {
      toast.info("Coming Soon");
    }
  };

  // ── Fullscreen mode views ─────────────────────────────────────────────────
  if (activeMode === "basic") {
    return (
      <BasicPlanCreator
        client={client}
        onBack={() => setActiveMode(null)}
        onPlanSaved={handlePlanSaved}
      />
    );
  }

  if (activeMode === "ai_generated") {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setActiveMode(null)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Meal Plans
        </button>
        <AIMealPlanGenerator
          client={client}
          clinicalIntakes={clinicalIntakes || []}
          inlineMode={true}
          onClose={() => setActiveMode(null)}
          onPlanGenerated={() => { invalidatePlans(); setActiveMode(null); }}
        />
      </div>
    );
  }

  if (activeMode === "ai_schedule") {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setActiveMode(null)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Meal Plans
        </button>
        <ModeB_ChooseSchedule
          client={client}
          onSaved={() => { invalidatePlans(); setActiveMode(null); toast.success("Options card sent to client!"); }}
        />
      </div>
    );
  }

  if (activeMode === "my_own") {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setActiveMode(null)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Meal Plans
        </button>
        <ModeC_BuildFromScratch
          client={client}
          onSaved={() => { invalidatePlans(); setActiveMode(null); }}
        />
      </div>
    );
  }

  // ── Default: plan list view ───────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-semibold text-gray-800">
          Meal Plans
          {mealPlans.length > 0 && (
            <span className="ml-2 text-xs text-gray-400 font-normal">({visiblePlans.length})</span>
          )}
        </h3>
        <ModeDropdown onSelect={handleModeSelect} isBasicUser={isBasicUser} />
      </div>



      {/* Plan list */}
      {visiblePlans.length === 0 ? (
        <div className="border-dashed border-2 border-gray-200 rounded-xl p-10 text-center">
          <ChefHat className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 mb-4">No meal plans yet.</p>
          <ModeDropdown onSelect={handleModeSelect} isBasicUser={isBasicUser} />
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="border-dashed border-2 border-gray-100 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-400">No plans match this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPlans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              allPlanIds={allPlanIds}
              onView={setViewingPlan}
              onSetActive={(planId) => setActivePlanMutation.mutate({ planId, allPlanIds })}
              onSaveTemplate={setSavingTemplate}
              onDelete={(id) => deletePlanMutation.mutate(id)}
              isPending={deletePlanMutation.isPending || setActivePlanMutation.isPending}
              isBasicUser={isBasicUser}
            />
          ))}

          {/* Pro Clinical Workflow CTA (only for pro users) */}
          {hasProAccess && (
            <div className="border border-purple-200 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-purple-800 text-sm">Generate a Clinical Pro Plan</p>
                <p className="text-xs text-purple-600">6-step workflow: Diagnostic → Filter → Review → Generate → Modify → Save</p>
              </div>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 shrink-0" onClick={() => setShowWorkflow(true)}>
                <Sparkles className="w-3 h-3 mr-1" /> Clinical Workflow
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Clinical Workflow ── */}
      <Dialog open={showWorkflow} onOpenChange={setShowWorkflow}>
        <DialogContent className="max-w-[98vw] w-full max-h-[96vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-700">
              <Sparkles className="w-5 h-5" /> Clinical Meal Planning Workflow — {client.full_name}
            </DialogTitle>
          </DialogHeader>
          <MealPlanningWorkflow
            client={client}
            clinicalIntakes={clinicalIntakes}
            mealPlans={mealPlans}
            onPlanSaved={handlePlanSaved}
            onPlanAssigned={handlePlanSaved}
          />
        </DialogContent>
      </Dialog>

      {/* ── Template Selector Dialog ── */}
      <Dialog open={!!showTemplateSelector} onOpenChange={() => setShowTemplateSelector(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-orange-500" /> Assign Template to {client.full_name}
            </DialogTitle>
          </DialogHeader>
          <MealPlanTemplateSelector
            client={client}
            onAssigned={() => { setShowTemplateSelector(null); invalidatePlans(); }}
            onClose={() => setShowTemplateSelector(null)}
          />
        </DialogContent>
      </Dialog>

      {/* ── Save as Template Dialog ── */}
      <Dialog open={!!savingTemplate} onOpenChange={() => setSavingTemplate(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="w-5 h-5 text-green-600" /> Save Plan as Template
            </DialogTitle>
          </DialogHeader>
          {savingTemplate && (
            <SaveAsTemplateDialog
              plan={savingTemplate}
              onSuccess={() => setSavingTemplate(null)}
              onCancel={() => setSavingTemplate(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── View Plan Dialog ── */}
      <Dialog open={!!viewingPlan} onOpenChange={() => setViewingPlan(null)}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="truncate">{viewingPlan?.name}</DialogTitle>
          </DialogHeader>
          {viewingPlan && (
            <MealPlanViewer
              plan={viewingPlan}
              allPlanIds={allPlanIds}
              onAssigned={() => { invalidatePlans(); setViewingPlan(null); }}
              onClose={() => setViewingPlan(null)}
              isCoach={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}