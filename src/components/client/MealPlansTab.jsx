import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ChefHat, Crown, Plus, Eye, Trash2, CheckCircle, Sparkles,
  BookOpen, Save, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import MealPlanViewer from "@/components/client/MealPlanViewer";
import InlineMealPlanForm from "@/components/client/InlineMealPlanForm";
import AIMealPlanGenerator from "@/components/mealplanner/AIMealPlanGenerator";
import MealPlanningWorkflow from "@/components/mealplanner/MealPlanningWorkflow";
import MealPlanTemplateSelector from "@/components/mealplanner/MealPlanTemplateSelector";
import SaveAsTemplateDialog from "@/components/mealplanner/SaveAsTemplateDialog";

export default function MealPlansTab({ client, clinicalIntakes, mealPlans, hasProAccess }) {
  const queryClient = useQueryClient();
  const clientId = client?.id;

  const [activeSubTab, setActiveSubTab] = useState("basic");
  const [viewingPlan, setViewingPlan] = useState(null);
  const [showBasicForm, setShowBasicForm] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(null); // "basic" | "pro" | null
  const [savingTemplate, setSavingTemplate] = useState(null); // plan object
  const [showWorkflow, setShowWorkflow] = useState(false);

  const invalidatePlans = () => queryClient.invalidateQueries(["clientMealPlans", clientId]);

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

  const basicPlans = mealPlans.filter(p => !p.plan_tier || p.plan_tier === "basic");
  const proPlans = mealPlans.filter(p => p.plan_tier === "advanced");
  const allPlanIds = mealPlans.map(p => p.id);

  const PlanCard = ({ plan }) => (
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
            </div>
            <p className="text-xs text-gray-400">Created: {format(new Date(plan.created_date), "MMM d, yyyy")}</p>
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 text-xs h-7" onClick={() => setViewingPlan(plan)}>
              <Eye className="w-3 h-3 mr-1" /> View
            </Button>
            {!plan.active && (
              <Button size="sm" variant="outline" className="text-green-600 border-green-300 text-xs h-7"
                onClick={() => setActivePlanMutation.mutate({ planId: plan.id, allPlanIds })}
                disabled={setActivePlanMutation.isPending}>
                Assign
              </Button>
            )}
            <Button size="sm" variant="outline" className="text-orange-600 border-orange-200 text-xs h-7"
              onClick={() => setSavingTemplate(plan)}>
              <Save className="w-3 h-3 mr-1" /> Template
            </Button>
            <Button size="sm" variant="outline" className="text-red-600 border-red-200 text-xs h-7"
              onClick={() => { if (window.confirm(`Delete "${plan.name}"?`)) deletePlanMutation.mutate(plan.id); }}
              disabled={deletePlanMutation.isPending}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="bg-white/90 border border-gray-200 rounded-xl p-1 w-full flex gap-1">
          <TabsTrigger value="basic" className="flex-1 text-xs sm:text-sm rounded-lg data-[state=active]:bg-green-500 data-[state=active]:text-white">
            <ChefHat className="w-3.5 h-3.5 mr-1" /> Basic Plans
            {basicPlans.length > 0 && <Badge className="ml-1 bg-green-100 text-green-700 text-xs">{basicPlans.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="pro" className="flex-1 text-xs sm:text-sm rounded-lg data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            <Crown className="w-3.5 h-3.5 mr-1" /> Pro Plans
            {proPlans.length > 0 && <Badge className="ml-1 bg-purple-100 text-purple-700 text-xs">{proPlans.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex-1 text-xs sm:text-sm rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            <BookOpen className="w-3.5 h-3.5 mr-1" /> Templates
          </TabsTrigger>
        </TabsList>

        {/* ── BASIC PLANS ── */}
        <TabsContent value="basic" className="space-y-3 mt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-gray-800">Basic Meal Plans</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs border-green-300 text-green-700"
                onClick={() => setShowTemplateSelector("basic")}>
                <BookOpen className="w-3 h-3 mr-1" /> From Template
              </Button>
              <Button size="sm" className="bg-green-500 hover:bg-green-600 text-xs"
                onClick={() => setShowBasicForm(true)}>
                <Plus className="w-3 h-3 mr-1" /> Generate Basic Plan
              </Button>
            </div>
          </div>

          {basicPlans.length === 0 ? (
            <Card className="border-dashed border-2 border-gray-200">
              <CardContent className="p-8 text-center">
                <ChefHat className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500 mb-3">No basic plans yet</p>
                <div className="flex gap-2 justify-center">
                  <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={() => setShowBasicForm(true)}>
                    <Sparkles className="w-3 h-3 mr-1" /> AI Generate
                  </Button>
                  <Button size="sm" variant="outline" className="border-green-300 text-green-700" onClick={() => setShowTemplateSelector("basic")}>
                    <BookOpen className="w-3 h-3 mr-1" /> Use Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {basicPlans.map(plan => <PlanCard key={plan.id} plan={plan} />)}
            </div>
          )}
        </TabsContent>

        {/* ── PRO PLANS ── */}
        <TabsContent value="pro" className="space-y-3 mt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-gray-800">Pro Clinical Plans</h3>
            <div className="flex gap-2">
              {hasProAccess && (
                <>
                  <Button size="sm" variant="outline" className="text-xs border-purple-300 text-purple-700"
                    onClick={() => setShowTemplateSelector("pro")}>
                    <BookOpen className="w-3 h-3 mr-1" /> From Template
                  </Button>
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-xs"
                    onClick={() => setShowWorkflow(true)}>
                    <Sparkles className="w-3 h-3 mr-1" /> Clinical Workflow
                  </Button>
                </>
              )}
            </div>
          </div>

          {!hasProAccess ? (
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-8 text-center">
                <Crown className="w-10 h-10 mx-auto text-purple-300 mb-3" />
                <p className="text-sm font-semibold text-purple-700 mb-1">Pro Plan Access Required</p>
                <p className="text-xs text-purple-500">Upgrade your subscription to access clinical meal planning with diagnostic integration</p>
              </CardContent>
            </Card>
          ) : proPlans.length === 0 ? (
            <Card className="border-dashed border-2 border-purple-200">
              <CardContent className="p-8 text-center">
                <Crown className="w-10 h-10 mx-auto text-purple-300 mb-3" />
                <p className="text-sm text-gray-500 mb-3">No pro plans yet</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => setShowWorkflow(true)}>
                    <Sparkles className="w-3 h-3 mr-1" /> Start Clinical Workflow
                  </Button>
                  <Button size="sm" variant="outline" className="border-purple-300 text-purple-700" onClick={() => setShowTemplateSelector("pro")}>
                    <BookOpen className="w-3 h-3 mr-1" /> Use Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {proPlans.map(plan => <PlanCard key={plan.id} plan={plan} />)}
              {/* Clinical Workflow card */}
              <Card className="border border-purple-200 shadow-sm bg-gradient-to-r from-purple-50 to-indigo-50">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-purple-800 text-sm">Generate Another Pro Plan</p>
                    <p className="text-xs text-purple-600">6-step clinical workflow: Diagnostic → Filter → Review → Generate → Modify → Save</p>
                  </div>
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700 shrink-0" onClick={() => setShowWorkflow(true)}>
                    <Sparkles className="w-3 h-3 mr-1" /> Open Workflow
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ── TEMPLATES TAB ── */}
        <TabsContent value="templates" className="space-y-3 mt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-gray-800">Assign a Template to this Client</h3>
          </div>
          <Card className="border-orange-200 shadow-sm">
            <CardContent className="p-4">
              <MealPlanTemplateSelector
                client={client}
                onAssigned={() => {
                  invalidatePlans();
                  toast.success("Template assigned! Go to Basic Plans to view it.");
                  setActiveSubTab("basic");
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Clinical Workflow (fullscreen modal) ── */}
      <Dialog open={showWorkflow} onOpenChange={setShowWorkflow}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-700">
              <Sparkles className="w-5 h-5" /> Clinical Meal Planning Workflow — {client.full_name}
            </DialogTitle>
          </DialogHeader>
          <MealPlanningWorkflow
            client={client}
            clinicalIntakes={clinicalIntakes}
            mealPlans={mealPlans}
            onPlanSaved={() => { invalidatePlans(); }}
            onPlanAssigned={() => { invalidatePlans(); setShowWorkflow(false); setActiveSubTab("pro"); }}
          />
        </DialogContent>
      </Dialog>

      {/* ── Basic Plan Dialog ── */}
      <Dialog open={showBasicForm} onOpenChange={setShowBasicForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Basic Meal Plan — {client.full_name}</DialogTitle>
          </DialogHeader>
          <InlineMealPlanForm
            client={client}
            onSuccess={() => { setShowBasicForm(false); invalidatePlans(); setActiveSubTab("basic"); }}
            onCancel={() => setShowBasicForm(false)}
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
            onAssigned={() => {
              setShowTemplateSelector(null);
              invalidatePlans();
              setActiveSubTab(showTemplateSelector === "pro" ? "pro" : "basic");
            }}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="truncate">{viewingPlan?.name}</DialogTitle>
          </DialogHeader>
          {viewingPlan && (
            <MealPlanViewer
              plan={viewingPlan}
              allPlanIds={allPlanIds}
              onAssigned={() => { invalidatePlans(); setViewingPlan(null); }}
              onClose={() => setViewingPlan(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}