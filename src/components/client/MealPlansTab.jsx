import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ChefHat, Crown, Plus, Eye, Trash2, CheckCircle, Sparkles,
  BookOpen, Save, Loader2, ChevronDown, HelpCircle, Bot,
  Calendar, PenLine, Upload, X, ArrowLeft
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

// ── Tooltip content per mode ──────────────────────────────────────────────────
const TOOLTIP_CONTENT = {
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

// ── Dropdown menu modes config ─────────────────────────────────────────────────
const MODES = [
  {
    key: "ai_options",
    icon: <Bot className="w-5 h-5 text-green-600" />,
    label: "AI Generated Plan",
    description: "AI creates complete meal options. You review and send.",
    bestFor: "quick clinical plans",
    popular: true,
    disabled: false,
  },
  {
    key: "mode_b",
    icon: <Calendar className="w-5 h-5 text-blue-600" />,
    label: "AI Plan + My Schedule",
    description: "AI creates options. You decide how many days each meal repeats.",
    bestFor: "structured 10-day cycles",
    popular: false,
    disabled: false,
  },
  {
    key: "mode_c",
    icon: <PenLine className="w-5 h-5 text-indigo-600" />,
    label: "My Own Plan",
    description: "You build every meal yourself. System calculates kcal + macros.",
    bestFor: "specific client needs",
    popular: false,
    disabled: false,
  },
  {
    key: "mode_d",
    icon: <BookOpen className="w-5 h-5 text-gray-400" />,
    label: "Use a Template",
    description: "Pick from Dr. Sheenu's library or your saved plans.",
    bestFor: null,
    popular: false,
    disabled: true,
    comingSoon: true,
  },
  {
    key: "mode_e",
    icon: <Upload className="w-5 h-5 text-gray-400" />,
    label: "Upload My Plan",
    description: "Upload Excel or PDF meal plan.",
    bestFor: null,
    popular: false,
    disabled: true,
    comingSoon: true,
  },
];

// ── Plan type display labels ───────────────────────────────────────────────────
function getPlanTypeLabel(plan) {
  if (plan.plan_tier === "advanced") {
    // Try to detect sub-type from name or generation_parameters
    const mode = plan.generation_parameters?.mode || "";
    if (mode === "B" || plan.name?.toLowerCase().includes("schedule")) return "AI + Schedule";
    return "Clinical Plan";
  }
  const mode = plan.generation_parameters?.mode || "";
  if (mode === "C" || plan.name?.toLowerCase().includes("scratch")) return "My Own Plan";
  if (mode === "B") return "AI + Schedule";
  if (mode === "A" || plan.meals?.length > 0) return "AI Generated";
  return "Basic Plan";
}

// ── ModeDropdown component ─────────────────────────────────────────────────────
function ModeDropdown({ onSelect }) {
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

  const handleModeClick = (mode) => {
    if (mode.disabled) return;
    setOpen(false);
    setActiveTooltip(null);
    onSelect(mode.key);
  };

  const toggleTooltip = (e, key) => {
    e.stopPropagation();
    setActiveTooltip(prev => prev === key ? null : key);
  };

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
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              How do you want to create this plan?
            </p>
          </div>

          <div className="py-1">
            {MODES.map((mode) => {
              const tooltipData = TOOLTIP_CONTENT[mode.key];
              const isTooltipOpen = activeTooltip === mode.key;

              return (
                <div key={mode.key}>
                  {/* Mode row */}
                  <div
                    className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                      mode.disabled
                        ? "cursor-not-allowed opacity-50"
                        : "cursor-pointer hover:bg-gray-50"
                    }`}
                    onClick={() => handleModeClick(mode)}
                  >
                    {/* Icon */}
                    <div className="mt-0.5 shrink-0">{mode.icon}</div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-semibold ${mode.disabled ? "text-gray-400" : "text-gray-800"}`}>
                          {mode.label}
                        </span>
                        {mode.popular && (
                          <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full leading-none">
                            POPULAR
                          </span>
                        )}
                        {mode.comingSoon && (
                          <span className="bg-gray-200 text-gray-500 text-[10px] font-semibold px-2 py-0.5 rounded-full leading-none">
                            Coming Soon
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-0.5 ${mode.disabled ? "text-gray-400" : "text-gray-500"}`}>
                        {mode.description}
                      </p>
                      {mode.bestFor && !mode.disabled && (
                        <p className="text-[10px] text-gray-400 mt-0.5">Best for: {mode.bestFor}</p>
                      )}
                    </div>

                    {/* Help button — active modes only */}
                    {tooltipData && !mode.disabled && (
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

                  {/* Tooltip card — expands inline below the row */}
                  {isTooltipOpen && tooltipData && (
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

                  {/* Divider before Coming Soon section */}
                  {mode.key === "mode_c" && (
                    <div className="border-t border-gray-100 my-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── PlanCard ───────────────────────────────────────────────────────────────────
function PlanCard({ plan, onView, onSetActive, onSaveTemplate, onDelete, allPlanIds, isPending }) {
  const typeLabel = getPlanTypeLabel(plan);
  return (
    <Card className={`border shadow-sm bg-white hover:shadow-md transition-all ${plan.active ? "border-l-4 border-l-green-500" : "border-gray-200"}`}>
      <CardContent className="p-4">
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

// ── Main component ─────────────────────────────────────────────────────────────
export default function MealPlansTab({ client, clinicalIntakes, mealPlans }) {
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

  // activeMode: null = list view, otherwise one of the mode keys
  const [activeMode, setActiveMode] = useState(null);
  const [viewingPlan, setViewingPlan] = useState(null);
  const [showBasicForm, setShowBasicForm] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(null);
  const [savingTemplate, setSavingTemplate] = useState(null);
  const [showWorkflow, setShowWorkflow] = useState(false);

  // Filter state for plan list
  const [filterType, setFilterType] = useState("all");

  const invalidatePlans = () => queryClient.invalidateQueries(["clientMealPlans", clientId]);

  const handlePlanSaved = (savedPlan) => {
    setShowWorkflow(false);
    setShowBasicForm(false);
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
  const filteredPlans = mealPlans.filter(plan => {
    if (filterType === "all") return true;
    const label = getPlanTypeLabel(plan).toLowerCase();
    if (filterType === "ai_generated") return label === "ai generated";
    if (filterType === "ai_schedule") return label === "ai + schedule";
    if (filterType === "my_own") return label === "my own plan";
    if (filterType === "clinical") return label === "clinical plan";
    if (filterType === "basic") return label === "basic plan";
    return true;
  });

  const FILTER_PILLS = [
    { key: "all", label: "All" },
    { key: "ai_generated", label: "AI Generated" },
    { key: "ai_schedule", label: "AI + Schedule" },
    { key: "my_own", label: "My Own" },
    { key: "clinical", label: "Clinical" },
    { key: "basic", label: "Basic" },
  ];

  // ── Handle mode selection from dropdown ───────────────────────────────────
  const handleModeSelect = (modeKey) => {
    if (modeKey === "ai_options") {
      setShowBasicForm(true);
    } else if (modeKey === "mode_b") {
      setActiveMode("mode_b");
    } else if (modeKey === "mode_c") {
      setActiveMode("mode_c");
    }
  };

  // ── Fullscreen mode views ─────────────────────────────────────────────────
  if (activeMode === "mode_b") {
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
          onSaved={() => {
            invalidatePlans();
            setActiveMode(null);
            toast.success("Options card sent to client!");
          }}
        />
      </div>
    );
  }

  if (activeMode === "mode_c") {
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
          onSaved={() => {
            invalidatePlans();
            setActiveMode(null);
          }}
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
            <span className="ml-2 text-xs text-gray-400 font-normal">({mealPlans.length})</span>
          )}
        </h3>
        <ModeDropdown onSelect={handleModeSelect} />
      </div>

      {/* Filter pills */}
      {mealPlans.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {FILTER_PILLS.map(pill => (
            <button
              key={pill.key}
              onClick={() => setFilterType(pill.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                filterType === pill.key
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-green-400"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      )}

      {/* Plan list */}
      {mealPlans.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="p-10 text-center">
            <ChefHat className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 mb-4">No meal plans yet.</p>
            <ModeDropdown onSelect={handleModeSelect} />
          </CardContent>
        </Card>
      ) : filteredPlans.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-100">
          <CardContent className="p-8 text-center">
            <p className="text-sm text-gray-400">No plans match this filter.</p>
          </CardContent>
        </Card>
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
            />
          ))}

          {/* Pro Clinical Workflow CTA (if has pro access) */}
          {hasProAccess && (
            <Card className="border border-purple-200 shadow-sm bg-gradient-to-r from-purple-50 to-indigo-50">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-purple-800 text-sm">Generate a Clinical Pro Plan</p>
                  <p className="text-xs text-purple-600">6-step workflow: Diagnostic → Filter → Review → Generate → Modify → Save</p>
                </div>
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700 shrink-0" onClick={() => setShowWorkflow(true)}>
                  <Sparkles className="w-3 h-3 mr-1" /> Clinical Workflow
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Clinical Workflow (fullscreen modal) ── */}
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

      {/* ── AI Generated Plan Dialog (Basic) ── */}
      <Dialog open={showBasicForm} onOpenChange={setShowBasicForm}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0">
          <AIMealPlanGenerator
            client={client}
            clinicalIntakes={clinicalIntakes || []}
            inlineMode={true}
            onClose={() => setShowBasicForm(false)}
            onPlanGenerated={() => { invalidatePlans(); setShowBasicForm(false); }}
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