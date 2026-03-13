import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  Stethoscope, ChefHat, Filter, UserCheck, Sparkles, Save, Send,
  CheckCircle, AlertTriangle, Loader2, Plus, Trash2, RefreshCw,
  ChevronDown, ChevronRight, XCircle, Eye, EyeOff, MessageSquare,
  ArrowRight, ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import MealPlanViewer from "@/components/client/MealPlanViewer";



export default function MealPlanningWorkflow({ client, clinicalIntakes, mealPlans, onPlanSaved, onPlanAssigned }) {
  const queryClient = useQueryClient();

  // Sorted intakes newest first
  const sortedIntakes = [...(clinicalIntakes || [])].sort(
    (a, b) => new Date(b.intake_date || b.created_date) - new Date(a.intake_date || a.created_date)
  );
  const latestIntake = sortedIntakes[0];

  const [openSections, setOpenSections] = useState({ s1: true, s2: false, s3: false, s4: false, s5: true, s6: true });
  const [selectedIntakeId, setSelectedIntakeId] = useState(latestIntake?.id || null);
  const [duration, setDuration] = useState(10);

  // Step 2: Filter results
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterResult, setFilterResult] = useState(null); // { allowed, blocked, decisionRules, diagnostic, client, intake }
  const [manualRules, setManualRules] = useState([]);
  const [newRule, setNewRule] = useState('');

  // Step 3: Nutritionist overrides
  const [extraAllowed, setExtraAllowed] = useState([]); // meals manually added
  const [manuallyBlocked, setManuallyBlocked] = useState([]); // meal ids manually blocked by nutritionist
  const [finalRules, setFinalRules] = useState([]);
  const [newFinalRule, setNewFinalRule] = useState('');

  // Step 4: Generated plan
  const [generating, setGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [audit, setAudit] = useState(null);

  // Step 5: Modification chat
  const [modificationText, setModificationText] = useState('');
  const [modifying, setModifying] = useState(false);
  const [modificationHistory, setModificationHistory] = useState([]);

  // Step 6: Saving
  const [saving, setSaving] = useState(false);

  const selectedIntake = sortedIntakes.find(i => i.id === selectedIntakeId) || latestIntake;

  // Parse diagnostic
  const diagnostic = (() => {
    if (!selectedIntake?.diagnostic_notes) return null;
    try { return JSON.parse(selectedIntake.diagnostic_notes); } catch { return null; }
  })();

  // ── STEP 1 helpers ─────────────────────────────────────────────────────────
  const canProceedStep1 = !!selectedIntake;

  // ── STEP 2: Filter meals ────────────────────────────────────────────────────
  const runFilter = async () => {
    setFilterLoading(true);
    try {
      const res = await base44.functions.invoke('filterMealOptions', {
        clientId: client.id,
        intakeId: selectedIntakeId,
        manualRules,
      });
      setFilterResult(res.data);
      setOpenSections(prev => ({ ...prev, s2: false, s3: true }));
      toast.success('✅ Meal options filtered from database');
    } catch (err) {
      toast.error('Filter failed: ' + (err.message || 'Unknown error'));
    }
    setFilterLoading(false);
  };

  // ── STEP 3: Nutritionist overrides ─────────────────────────────────────────
  const getFinalAllowedMeals = () => {
    if (!filterResult) return [];
    const fromFilter = (filterResult.allowed || []).filter(m => !manuallyBlocked.includes(m.id));
    return [...fromFilter, ...extraAllowed];
  };

  const toggleBlockMeal = (meal) => {
    if (manuallyBlocked.includes(meal.id)) {
      setManuallyBlocked(prev => prev.filter(id => id !== meal.id));
    } else {
      setManuallyBlocked(prev => [...prev, meal.id]);
    }
  };

  const addExtraMeal = (name, mealType, cal) => {
    if (!name.trim()) return;
    const newMeal = {
      id: `manual_${Date.now()}`,
      name: name.trim(),
      meal_type: mealType,
      approx_calories: parseInt(cal) || 200,
      tags: ['manual'],
      category: 'Manual',
    };
    setExtraAllowed(prev => [...prev, newMeal]);
  };

  // ── STEP 4: Generate plan ───────────────────────────────────────────────────
  const generatePlan = async () => {
    setGenerating(true);
    try {
      const primaryCondition = diagnostic?.primary_conditions?.[0] || (intake?.health_conditions?.[0] || null);
      const additionalConditions = diagnostic?.primary_conditions?.slice(1) || intake?.health_conditions?.slice(1) || [];

      const res = await base44.functions.invoke('generateAIMealPlan', {
        clientId: client.id,
        duration,
        calorieTarget: filterResult?.client?.target_calories || client.target_calories,
        dietType: intake?.diet_type || client.food_preference,
        condition: primaryCondition,
        numDays: duration,
        additionalConditions,
        overrideGoal: diagnostic?.goals?.[0] || client.goal,
      });

      setGeneratedPlan({ ...res.data.mealPlan, meals: res.data.meals, created_date: new Date().toISOString(), id: null });
      toast.success('✅ AI meal plan generated with HMRE engine!');
      setOpenSections(prev => ({ ...prev, s5: true, s6: true }));
    } catch (err) {
      toast.error('Generation failed: ' + (err.message || 'Unknown error'));
    }
    setGenerating(false);
  };

  // ── STEP 5: Modification via AI ────────────────────────────────────────────
  const applyModification = async () => {
    if (!modificationText.trim() || !generatedPlan) return;
    setModifying(true);
    try {
      const prompt = `You are a clinical nutritionist AI assistant. You have a meal plan and the nutritionist wants modifications.

CURRENT PLAN SUMMARY:
- Duration: ${generatedPlan.duration} days
- Target Calories: ${generatedPlan.target_calories} kcal/day
- Conditions: ${(generatedPlan.disease_focus || []).join(', ')}
- Total meals: ${(generatedPlan.meals || []).length}

CURRENT MEALS (first 5 days sample):
${JSON.stringify((generatedPlan.meals || []).filter(m => m.day <= 5).slice(0, 20), null, 2)}

MODIFICATION REQUEST:
"${modificationText}"

RULES:
- Try to use foods from the Healthyfy database of Indian meals first.
- If substitution is from database: return modified meals array only for the affected days/slots.
- If AI must suggest: clearly flag it as AI suggestion and explain why database didn't have it.
- Maintain calorie targets, disease restrictions, and all clinical rules.
- Return ONLY the modified meals that need to change.

Return JSON: { modified_meals: [...same structure as input meals...], ai_suggestions_used: boolean, explanation: string }`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            modified_meals: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  day: { type: 'number' },
                  meal_type: { type: 'string' },
                  meal_name: { type: 'string' },
                  items: { type: 'array', items: { type: 'string' } },
                  portion_sizes: { type: 'array', items: { type: 'string' } },
                  calories: { type: 'number' },
                  protein: { type: 'number' },
                  carbs: { type: 'number' },
                  fats: { type: 'number' },
                  nutritional_tip: { type: 'string' },
                  disease_rationale: { type: 'string' },
                },
              },
            },
            ai_suggestions_used: { type: 'boolean' },
            explanation: { type: 'string' },
          },
        },
      });

      if (response?.modified_meals?.length > 0) {
        // Merge modified meals into plan
        const updatedMeals = [...(generatedPlan.meals || [])];
        for (const mod of response.modified_meals) {
          const idx = updatedMeals.findIndex(m => m.day === mod.day && m.meal_type === mod.meal_type);
          if (idx >= 0) updatedMeals[idx] = mod;
          else updatedMeals.push(mod);
        }
        setGeneratedPlan(prev => ({ ...prev, meals: updatedMeals }));
        setModificationHistory(prev => [...prev, {
          request: modificationText,
          explanation: response.explanation || '',
          ai_used: response.ai_suggestions_used || false,
          timestamp: new Date().toISOString(),
        }]);
        toast.success(response.ai_suggestions_used
          ? '⚠️ Modified using AI (database option not available)'
          : '✅ Modified using database options');
      } else {
        toast.info('No changes were made. Try rephrasing your request.');
      }
    } catch (err) {
      toast.error('Modification failed: ' + (err.message || 'Unknown error'));
    }
    setModificationText('');
    setModifying(false);
  };

  // ── STEP 6: Save ────────────────────────────────────────────────────────────
  const savePlan = async (assign = false) => {
    if (!generatedPlan) return;
    setSaving(true);
    try {
      const allPlanIds = (mealPlans || []).map(p => p.id);

      // If assigning, deactivate all existing plans first
      if (assign && allPlanIds.length > 0) {
        await Promise.all(allPlanIds.map(id => base44.entities.MealPlan.update(id, { active: false })));
      }

      const saved = await base44.entities.MealPlan.create({
        client_id: client.id,
        name: generatedPlan.name,
        duration: generatedPlan.duration,
        meal_pattern: 'daily',
        target_calories: generatedPlan.target_calories,
        meals: generatedPlan.meals,
        food_preference: generatedPlan.food_preference || client.food_preference,
        regional_preference: client.regional_preference,
        plan_tier: 'advanced',
        disease_focus: generatedPlan.disease_focus || [],
        active: assign,
        decision_rules_applied: generatedPlan.decision_rules_applied || [],
        conflict_resolution: modificationHistory.map(h => h.explanation).join(' | ') || '',
        generation_parameters: {
          duration,
          target_calories: generatedPlan.target_calories,
          modification_instructions: modificationHistory.map(h => h.request).join(' | '),
          generation_count: 1,
        },
      });

      toast.success(assign ? '✅ Plan saved and assigned to client!' : '✅ Plan saved!');
      queryClient.invalidateQueries(['clientMealPlans', client.id]);
      onPlanSaved?.(saved);
      if (assign) onPlanAssigned?.(saved);
    } catch (err) {
      toast.error('Save failed: ' + (err.message || 'Unknown error'));
    }
    setSaving(false);
  };

  // ── RENDER ──────────────────────────────────────────────────────────────────
  const toggle = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const SectionShell = ({ sectionKey, icon, title, subtitle, color, badge, children }) => {
    const colorMap = { purple: 'border-purple-300 bg-purple-50', blue: 'border-blue-300 bg-blue-50', orange: 'border-orange-300 bg-orange-50', green: 'border-green-300 bg-green-50', pink: 'border-pink-300 bg-pink-50', emerald: 'border-emerald-300 bg-emerald-50' };
    const textMap =  { purple: 'text-purple-700', blue: 'text-blue-700', orange: 'text-orange-700', green: 'text-green-700', pink: 'text-pink-700', emerald: 'text-emerald-700' };
    const isOpen = openSections[sectionKey];
    return (
      <div className={`rounded-xl border-2 overflow-hidden ${colorMap[color]}`}>
        <button
          className="w-full flex items-center justify-between px-4 py-3 text-left"
          onClick={() => toggle(sectionKey)}
        >
          <div className="flex items-center gap-2">
            {React.cloneElement(icon, { className: `w-4 h-4 ${textMap[color]}` })}
            <span className={`font-bold text-sm ${textMap[color]}`}>{title}</span>
            {badge && <span className="ml-2">{badge}</span>}
          </div>
          {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </button>
        {isOpen && (
          <div className="px-4 pb-4 bg-white border-t border-gray-100 space-y-3 pt-3">
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">

      {/* ─ STEP 1: Review Diagnostic ─ */}
      <SectionShell sectionKey="s1" icon={<Stethoscope />} title="Step 1 — Review Diagnostic" subtitle="Select the intake and review the clinical diagnostic before starting meal planning." color="purple"
        badge={diagnostic ? <Badge className="bg-green-100 text-green-700 text-xs"><CheckCircle className="w-3 h-3 mr-1 inline" />Ready</Badge> : <Badge className="bg-amber-100 text-amber-700 text-xs">Pending</Badge>}
      >
        {sortedIntakes.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-500 self-center">Intake to use:</span>
            {sortedIntakes.map((intake, idx) => (
              <button key={intake.id} onClick={() => setSelectedIntakeId(intake.id)}
                className={`px-3 py-1 rounded-full text-xs border transition-all ${selectedIntakeId === intake.id ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-300 text-gray-600'}`}>
                Intake #{sortedIntakes.length - idx} — {intake.intake_date ? format(new Date(intake.intake_date), 'MMM d, yyyy') : 'No date'}
              </button>
            ))}
          </div>
        )}
        {!selectedIntake ? (
          <Alert className="bg-amber-50 border-amber-300"><AlertTriangle className="w-4 h-4 text-amber-600" /><AlertDescription>No clinical intake found. Complete the Clinical Intake form first.</AlertDescription></Alert>
        ) : !diagnostic ? (
          <Alert className="bg-orange-50 border-orange-300"><AlertTriangle className="w-4 h-4 text-orange-600" /><AlertDescription>No diagnostic generated. Go to the Diagnostic tab and generate one first.</AlertDescription></Alert>
        ) : (
          <>
            <DiagnosticSummaryCard diagnostic={diagnostic} intake={selectedIntake} />
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Plan Duration</p>
                <div className="flex gap-2 flex-wrap">
                  {[7, 10, 15, 21, 30].map(d => (
                    <button key={d} onClick={() => setDuration(d)}
                      className={`px-3 py-1.5 rounded-full text-xs border font-medium transition-all ${duration === d ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-600 hover:border-green-400'}`}>
                      {d} Days
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Button onClick={() => setOpenSections(prev => ({ ...prev, s1: false, s2: true }))} className="w-full bg-purple-600 hover:bg-purple-700">
              <ArrowRight className="w-4 h-4 mr-2" /> Proceed to Filter Meal Options
            </Button>
          </>
        )}
      </SectionShell>

      {/* ─ STEP 2: Filter Meal Options ─ */}
      <SectionShell sectionKey="s2" icon={<Filter />} title="Step 2 — Filter Meal Options" subtitle="Filter all meals from the Healthyfy database against diagnostic rules, allergies, diet type, and disease restrictions." color="blue"
        badge={filterResult ? <Badge className="bg-green-100 text-green-700 text-xs"><CheckCircle className="w-3 h-3 mr-1 inline" />{new Set(filterResult.allowed?.map(m=>m.name)).size} allowed</Badge> : null}
      >
        <Card className="border-dashed border-2 border-blue-200 shadow-none">
          <CardHeader className="py-3 px-4 bg-blue-50">
            <CardTitle className="text-sm text-blue-800 flex items-center gap-2"><Plus className="w-4 h-4" /> Pre-Filter Manual Rules (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {manualRules.map((r, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="flex-1 text-xs text-gray-700">{r.rule}</p>
                <button onClick={() => setManualRules(prev => prev.filter((_, j) => j !== i))}><Trash2 className="w-3 h-3 text-red-400" /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <Textarea value={newRule} onChange={e => setNewRule(e.target.value)} placeholder="e.g. Avoid all millets. No rice at dinner." rows={2} className="flex-1 text-xs" />
              <Button size="sm" variant="outline" onClick={() => { if (newRule.trim()) { setManualRules(prev => [...prev, { rule: newRule.trim(), added_at: new Date().toISOString() }]); setNewRule(''); } }} className="self-end"><Plus className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>
        <Button onClick={runFilter} disabled={filterLoading} className="w-full bg-blue-600 hover:bg-blue-700">
          {filterLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Filtering...</> : <><Filter className="w-4 h-4 mr-2" /> Run Meal Filter</>}
        </Button>
        {filterResult && (
          <>
            <DecisionRulesCard rules={filterResult.decisionRules} />
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-green-200 shadow-sm"><CardContent className="p-3 text-center"><CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-1" /><p className="text-2xl font-bold text-green-600">{new Set(filterResult.allowed?.map(m => m.name)).size || 0}</p><p className="text-xs text-gray-500">Allowed Dishes</p></CardContent></Card>
              <Card className="border-red-200 shadow-sm"><CardContent className="p-3 text-center"><XCircle className="w-6 h-6 text-red-400 mx-auto mb-1" /><p className="text-2xl font-bold text-red-500">{new Set(filterResult.blocked?.map(m => m.name)).size || 0}</p><p className="text-xs text-gray-500">Blocked Dishes</p></CardContent></Card>
            </div>
            <BlockedMealsSection blocked={filterResult.blocked || []} />
          </>
        )}
      </SectionShell>

      {/* ─ STEP 3: Nutritionist Review ─ */}
      <SectionShell sectionKey="s3" icon={<UserCheck />} title="Step 3 — Nutritionist Review & Override" subtitle="Add meals, remove meals, add extra rules. Your input is the final authority." color="orange"
        badge={<Badge className="bg-orange-100 text-orange-700 text-xs">{getFinalAllowedMeals().length} approved</Badge>}
      >
        <AllowedMealsReview
          allowed={filterResult?.allowed || []}
          manuallyBlocked={manuallyBlocked}
          onToggleBlock={toggleBlockMeal}
          extraAllowed={extraAllowed}
          onAddExtra={addExtraMeal}
          onRemoveExtra={(id) => setExtraAllowed(prev => prev.filter(m => m.id !== id))}
        />
        <Card className="border-dashed border-2 border-orange-200">
          <CardHeader className="py-3 px-4 bg-orange-50"><CardTitle className="text-sm text-orange-800 flex items-center gap-2"><Plus className="w-4 h-4" /> Final Override Rules</CardTitle></CardHeader>
          <CardContent className="p-3 space-y-2">
            {finalRules.map((r, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-100 rounded-lg">
                <p className="flex-1 text-xs text-gray-700">{r.rule}</p>
                <button onClick={() => setFinalRules(prev => prev.filter((_, j) => j !== i))}><Trash2 className="w-3 h-3 text-red-400" /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <Textarea value={newFinalRule} onChange={e => setNewFinalRule(e.target.value)} placeholder="e.g. Increase protein at breakfast. No legumes at dinner." rows={2} className="flex-1 text-xs" />
              <Button size="sm" variant="outline" onClick={() => { if (newFinalRule.trim()) { setFinalRules(prev => [...prev, { rule: newFinalRule.trim(), added_at: new Date().toISOString() }]); setNewFinalRule(''); } }} className="self-end"><Plus className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl text-sm text-gray-600">
          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
          <span><strong>{getFinalAllowedMeals().length}</strong> meals approved for plan generation.</span>
        </div>
      </SectionShell>

      {/* ─ STEP 4: Generate Plan ─ */}
      <SectionShell sectionKey="s4" icon={<Sparkles />} title="Step 4 — Generate Meal Plan" subtitle="Build the plan using allowed meals, calorie targets, macro ratios, Indian meal structure, and all clinical rules." color="green">
        {!filterResult ? (
          <Alert className="bg-amber-50 border-amber-300"><AlertTriangle className="w-4 h-4 text-amber-600" /><AlertDescription className="text-sm"><strong>Step 2 not completed.</strong> Run the Meal Filter first.</AlertDescription></Alert>
        ) : getFinalAllowedMeals().length === 0 ? (
          <Alert className="bg-red-50 border-red-300"><AlertTriangle className="w-4 h-4 text-red-600" /><AlertDescription className="text-sm"><strong>No approved meals.</strong> Go to Step 3 and unblock or add meals.</AlertDescription></Alert>
        ) : (
          <Card className="border-none shadow-sm bg-green-50">
            <CardContent className="p-4 space-y-2 text-sm">
              <p className="font-semibold text-green-800 mb-2">Generation Parameters:</p>
              {(filterResult?.decisionRules || []).slice(0, 5).map((r, i) => (
                <div key={i} className="flex gap-2">
                  <Badge className={`text-xs shrink-0 ${getCategoryColor(r.category)}`}>{r.category}</Badge>
                  <span className="text-gray-700 text-xs">{r.rule}</span>
                </div>
              ))}
              <p className="text-xs text-gray-500 mt-1">+ {finalRules.length} manual override rules · {getFinalAllowedMeals().length} approved meals · <strong>{duration} days</strong></p>
            </CardContent>
          </Card>
        )}
        <Button
          onClick={generatePlan}
          disabled={generating || !filterResult}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-semibold py-3 disabled:opacity-50"
        >
          {generating
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating AI meal plan...</>
            : <><Sparkles className="w-4 h-4 mr-2" /> Generate {duration}-Day Meal Plan</>}
        </Button>
      </SectionShell>

      {/* ─ STEP 5 & 6: Shown only after plan is generated ─ */}
      {generatedPlan && (
        <>
          {/* ─ STEP 5: Advise & Modify ─ */}
          <SectionShell sectionKey="s5" icon={<MessageSquare />} title="Step 5 — Review, Advise & Modify" subtitle="Review the generated plan. Request changes. AI will try database first, LLM only if needed." color="pink">
            {generatedPlan?.meals && (
              <AuditCard
                meals={generatedPlan.meals}
                targetCalories={generatedPlan.target_calories}
                targetProtein={filterResult?.client?.target_protein}
                targetCarbs={filterResult?.client?.target_carbs}
                targetFats={filterResult?.client?.target_fats}
              />
            )}
            <div className="border rounded-xl overflow-hidden">
              <MealPlanViewer plan={generatedPlan} allPlanIds={[]} hideActions={true} />
            </div>
            {generatedPlan.mpess_recommendations?.length > 0 && (
              <Card className="border-purple-200 shadow-sm">
                <CardHeader className="py-2 px-4 bg-purple-50"><CardTitle className="text-xs text-purple-700 font-bold uppercase">🌿 MPESS Holistic Recommendations</CardTitle></CardHeader>
                <CardContent className="p-3">
                  <ul className="space-y-1">{generatedPlan.mpess_recommendations.map((r, i) => <li key={i} className="text-xs text-gray-700 flex gap-2"><span className="text-purple-400 shrink-0">•</span>{r}</li>)}</ul>
                </CardContent>
              </Card>
            )}
            {modificationHistory.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500">Modification History ({modificationHistory.length}):</p>
                {modificationHistory.map((h, i) => (
                  <div key={i} className={`p-2 rounded-lg text-xs border ${h.ai_used ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
                    <p className="font-medium">{h.request}</p>
                    <p className="text-gray-500 mt-0.5">{h.explanation}</p>
                    {h.ai_used && <Badge className="bg-yellow-400 text-yellow-900 text-xs mt-1">AI suggestion used</Badge>}
                  </div>
                ))}
              </div>
            )}
            <Card className="border-dashed border-2 border-pink-200">
              <CardHeader className="py-2 px-4 bg-pink-50"><CardTitle className="text-sm text-pink-800">Request Changes</CardTitle></CardHeader>
              <CardContent className="p-3 space-y-2">
                <Textarea value={modificationText} onChange={e => setModificationText(e.target.value)} placeholder="e.g. Replace oats at breakfast on days 3 and 7 with besan cheela." rows={3} className="text-sm" />
                <Button onClick={applyModification} disabled={modifying || !modificationText.trim()} className="w-full bg-pink-500 hover:bg-pink-600">
                  {modifying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Applying changes...</> : <><RefreshCw className="w-4 h-4 mr-2" /> Apply Modifications</>}
                </Button>
              </CardContent>
            </Card>
            <Button variant="outline" onClick={() => { setGeneratedPlan(null); setAudit(null); }} className="w-full text-gray-600">
              <ArrowLeft className="w-4 h-4 mr-1" /> Discard & Regenerate
            </Button>
          </SectionShell>

          {/* ─ STEP 6: Save & Assign ─ */}
          <SectionShell sectionKey="s6" icon={<Save />} title="Step 6 — Save & Assign" subtitle="Save the plan to the client's records or assign it as the active plan." color="emerald">
            <Card className="border-none shadow-sm bg-emerald-50">
              <CardContent className="p-4 text-sm space-y-2">
                <p className="font-semibold text-emerald-800">{generatedPlan.name}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{generatedPlan.duration} Days</Badge>
                  <Badge variant="outline">{generatedPlan.target_calories} kcal/day</Badge>
                  <Badge variant="outline" className="capitalize">{generatedPlan.food_preference}</Badge>
                  <Badge className="bg-purple-600 text-white text-xs">💎 Pro Clinical</Badge>
                </div>
                <p className="text-xs text-gray-500">{(generatedPlan.meals || []).length} meal slots · {modificationHistory.length} modification{modificationHistory.length !== 1 ? 's' : ''} applied</p>
              </CardContent>
            </Card>
            {mealPlans?.some(p => p.active) && (
              <Alert className="bg-amber-50 border-amber-300"><AlertTriangle className="w-4 h-4 text-amber-600" /><AlertDescription className="text-sm">There is already an active plan. Assigning this plan will deactivate it.</AlertDescription></Alert>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => savePlan(false)} disabled={saving} variant="outline" className="border-emerald-400 text-emerald-700">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save Only
              </Button>
              <Button onClick={() => savePlan(true)} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Save & Assign
              </Button>
            </div>
          </SectionShell>
        </>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────



function DiagnosticSummaryCard({ diagnostic, intake }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="border-purple-200 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          <span className="font-semibold text-sm text-gray-800">Diagnostic Summary — {intake.intake_date ? format(new Date(intake.intake_date), 'MMM d, yyyy') : '—'}</span>
          {diagnostic ? <Badge className="bg-green-100 text-green-700 text-xs"><CheckCircle className="w-3 h-3 mr-1" />Generated</Badge> : <Badge className="bg-amber-100 text-amber-700 text-xs">Missing</Badge>}
        </div>
      </div>
      {expanded && (
        <CardContent className="px-4 pb-4 space-y-3 text-sm border-t border-gray-100">
          <div className="flex flex-wrap gap-1">
            {intake.health_conditions?.map(c => <Badge key={c} className="bg-red-100 text-red-700 text-xs">{c}</Badge>)}
          </div>
          {diagnostic?.combined_summary?.final_restrictions?.slice(0, 8).map((r, i) => (
            <p key={i} className="text-xs text-gray-700 flex gap-1"><span className="text-red-400">⛔</span>{r}</p>
          ))}
          {diagnostic?.combined_summary?.final_priorities?.slice(0, 5).map((p, i) => (
            <p key={i} className="text-xs text-gray-700 flex gap-1"><span className="text-green-500">✅</span>{p}</p>
          ))}
          {/* Manual rules from dietitian_remarks */}
          {intake.dietitian_remarks && (() => {
            try {
              const rules = JSON.parse(intake.dietitian_remarks);
              return Array.isArray(rules) && rules.length > 0 ? (
                <div className="p-2 bg-purple-50 rounded-lg">
                  <p className="text-xs font-semibold text-purple-700 mb-1">Nutritionist Manual Rules:</p>
                  {rules.map((r, i) => <p key={i} className="text-xs text-gray-700">• {r.rule}</p>)}
                </div>
              ) : null;
            } catch { return null; }
          })()}
        </CardContent>
      )}
    </Card>
  );
}

function DecisionRulesCard({ rules = [] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="border-blue-200 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <span className="text-sm font-semibold text-blue-700">Decision Rules Applied ({rules.length})</span>
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </div>
      {expanded && (
        <CardContent className="px-4 pb-3 space-y-1 border-t">
          {rules.map((r, i) => (
            <div key={i} className="flex gap-2 text-xs">
              <Badge className={`shrink-0 text-xs ${getCategoryColor(r.category)}`}>{r.category}</Badge>
              <span className="text-gray-700">{r.rule}</span>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

function BlockedMealsSection({ blocked }) {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState('all');

  const typeColors = { disease: 'bg-red-100 text-red-700', allergy: 'bg-orange-100 text-orange-700', diet: 'bg-blue-100 text-blue-700', dislike: 'bg-gray-100 text-gray-700', no_go: 'bg-purple-100 text-purple-700', blood_marker: 'bg-yellow-100 text-yellow-700', manual_rule: 'bg-pink-100 text-pink-700' };

  const types = [...new Set(blocked.flatMap(m => m.block_reasons?.map(r => r.type) || []))];
  const filtered = filter === 'all' ? blocked : blocked.filter(m => m.block_reasons?.some(r => r.type === filter));

  return (
    <Card className="border-red-100 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <span className="text-sm font-semibold text-red-600">⛔ Blocked Dishes ({new Set(blocked.map(m => m.name)).size}) — click to review</span>
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </div>
      {expanded && (
        <CardContent className="px-4 pb-3 border-t space-y-3">
          <div className="flex flex-wrap gap-1">
            <button onClick={() => setFilter('all')} className={`px-2 py-0.5 rounded-full text-xs border ${filter === 'all' ? 'bg-gray-700 text-white border-transparent' : 'border-gray-300 text-gray-600'}`}>All</button>
            {types.map(t => <button key={t} onClick={() => setFilter(t)} className={`px-2 py-0.5 rounded-full text-xs border capitalize ${filter === t ? 'bg-red-500 text-white border-transparent' : 'border-gray-300 text-gray-600'}`}>{t.replace('_', ' ')}</button>)}
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {filtered.slice(0, 50).map((meal, i) => (
              <div key={i} className="p-2 bg-red-50 border border-red-100 rounded-lg">
                <p className="text-xs font-semibold text-gray-800">{meal.name}</p>
                {meal.block_reasons?.map((r, j) => (
                  <p key={j} className="text-xs text-red-600 mt-0.5">
                    <span className={`inline-block px-1 py-0.5 rounded text-xs mr-1 ${typeColors[r.type] || 'bg-gray-100 text-gray-600'}`}>{r.type?.replace('_', ' ')}</span>
                    {r.reason}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function AllowedMealsReview({ allowed, manuallyBlocked, onToggleBlock, extraAllowed, onAddExtra, onRemoveExtra }) {
  const [expanded, setExpanded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMealName, setNewMealName] = useState('');
  const [newMealType, setNewMealType] = useState('breakfast');
  const [newMealCal, setNewMealCal] = useState('');

  const groupedByType = {};
  [...allowed, ...extraAllowed].forEach(m => {
    const t = m.meal_type || 'other';
    if (!groupedByType[t]) groupedByType[t] = [];
    groupedByType[t].push(m);
  });

  return (
    <Card className="border-green-200 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <span className="text-sm font-semibold text-green-700">✅ Allowed Dishes ({new Set([...allowed, ...extraAllowed].map(m => m.name)).size}) — click to review & modify</span>
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </div>
      {expanded && (
        <CardContent className="px-4 pb-3 border-t space-y-3">
          <p className="text-xs text-gray-500">{manuallyBlocked.length > 0 ? `You have manually blocked ${manuallyBlocked.length} meal(s).` : 'Click the eye icon to block a meal from the plan.'}</p>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {Object.entries(groupedByType).map(([type, meals]) => (
              <div key={type}>
                <p className="text-xs font-bold text-gray-600 capitalize mb-1">{type.replace(/_/g, ' ')}</p>
                {meals.map(meal => (
                  <div key={meal.id} className={`flex items-center gap-2 p-1.5 rounded-lg text-xs ${manuallyBlocked.includes(meal.id) ? 'bg-red-50 border border-red-200 line-through text-gray-400' : 'bg-green-50 border border-green-100 text-gray-700'} ${meal.tags?.includes('manual') ? 'border-orange-200 bg-orange-50' : ''}`}>
                    {meal.tags?.includes('manual') && <Badge className="bg-orange-200 text-orange-800 text-xs">Manual</Badge>}
                    <span className="flex-1">{meal.name}</span>
                    <span className="text-gray-400">{meal.approx_calories}cal</span>
                    {meal.tags?.includes('manual') ? (
                      <button onClick={() => onRemoveExtra(meal.id)} className="text-red-400"><Trash2 className="w-3 h-3" /></button>
                    ) : (
                      <button onClick={() => onToggleBlock(meal)} title={manuallyBlocked.includes(meal.id) ? 'Unblock' : 'Block this meal'}>
                        {manuallyBlocked.includes(meal.id) ? <Eye className="w-3 h-3 text-green-500" /> : <EyeOff className="w-3 h-3 text-gray-400" />}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Add manual meal */}
          {!showAddForm ? (
            <Button size="sm" variant="outline" onClick={() => setShowAddForm(true)} className="w-full border-dashed border-orange-300 text-orange-600">
              <Plus className="w-3 h-3 mr-1" /> Add Meal Manually
            </Button>
          ) : (
            <div className="p-3 border border-orange-200 rounded-xl bg-orange-50 space-y-2">
              <input className="w-full border rounded-lg px-2 py-1 text-xs" placeholder="Meal name (e.g. Ragi Dosa with Sambar)" value={newMealName} onChange={e => setNewMealName(e.target.value)} />
              <div className="flex gap-2">
                <select className="flex-1 border rounded-lg px-2 py-1 text-xs" value={newMealType} onChange={e => setNewMealType(e.target.value)}>
                  {['early_morning', 'breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner'].map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
                <input className="w-20 border rounded-lg px-2 py-1 text-xs" placeholder="~Cal" value={newMealCal} onChange={e => setNewMealCal(e.target.value)} type="number" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { onAddExtra(newMealName, newMealType, newMealCal); setNewMealName(''); setNewMealCal(''); setShowAddForm(false); }} className="flex-1 bg-orange-500 hover:bg-orange-600 text-xs">Add</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)} className="flex-1 text-xs">Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function AuditCard({ meals, targetCalories, targetProtein, targetCarbs, targetFats }) {
  // Compute averages live from actual meal entries (always in sync with viewer)
  const daysMap = {};
  for (const m of meals || []) {
    if (!daysMap[m.day]) daysMap[m.day] = { cal: 0, prot: 0, carbs: 0, fats: 0 };
    daysMap[m.day].cal   += m.calories || 0;
    daysMap[m.day].prot  += m.protein  || 0;
    daysMap[m.day].carbs += m.carbs    || 0;
    daysMap[m.day].fats  += m.fats     || 0;
  }
  const days = Object.values(daysMap);
  const dayCount = days.length || 1;
  const avgCal   = Math.round(days.reduce((s, d) => s + d.cal,   0) / dayCount);
  const avgProt  = Math.round(days.reduce((s, d) => s + d.prot,  0) / dayCount);
  const avgCarbs = Math.round(days.reduce((s, d) => s + d.carbs, 0) / dayCount);
  const avgFats  = Math.round(days.reduce((s, d) => s + d.fats,  0) / dayCount);
  const tCal = targetCalories || 1800;
  const deviation = Math.abs(avgCal - tCal);
  const tenPct = Math.round(tCal * 0.10);
  const isGood = deviation <= tenPct;
  const compliance = isGood
    ? `✅ Within 10% (±${tenPct} kcal) — Avg: ${avgCal} kcal`
    : `⚠️ Out of 10% range — Avg: ${avgCal} kcal, Target: ${tCal} kcal (±${deviation} kcal off)`;

  return (
    <Card className={`border-none shadow-sm ${isGood ? 'bg-green-50' : 'bg-amber-50'}`}>
      <CardContent className="p-4">
        <p className="text-sm font-semibold text-gray-800 mb-2">📊 Plan Audit</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="bg-white rounded-lg p-2 text-center">
            <p className="text-gray-500">Avg Cal/Day</p>
            <p className="font-bold text-orange-600">{avgCal} kcal</p>
            <p className="text-gray-400">Target: {tCal}</p>
          </div>
          <div className="bg-white rounded-lg p-2 text-center">
            <p className="text-gray-500">Avg Protein</p>
            <p className="font-bold text-blue-600">{avgProt}g</p>
            <p className="text-gray-400">Target: {targetProtein || '—'}g</p>
          </div>
          <div className="bg-white rounded-lg p-2 text-center">
            <p className="text-gray-500">Avg Carbs</p>
            <p className="font-bold text-green-600">{avgCarbs}g</p>
            <p className="text-gray-400">Target: {targetCarbs || '—'}g</p>
          </div>
          <div className="bg-white rounded-lg p-2 text-center">
            <p className="text-gray-500">Avg Fats</p>
            <p className="font-bold text-yellow-600">{avgFats}g</p>
            <p className="text-gray-400">Target: {targetFats || '—'}g</p>
          </div>
        </div>
        <p className={`text-xs mt-2 font-medium ${isGood ? 'text-green-700' : 'text-amber-700'}`}>
          Calorie compliance: {compliance}
        </p>
      </CardContent>
    </Card>
  );
}

function getCategoryColor(category) {
  const map = {
    'Calorie Target': 'bg-orange-100 text-orange-700',
    'Macros': 'bg-blue-100 text-blue-700',
    'Diet Type': 'bg-green-100 text-green-700',
    'Clinical Condition': 'bg-red-100 text-red-700',
    'Blood Marker': 'bg-yellow-100 text-yellow-700',
    'Allergy': 'bg-pink-100 text-pink-700',
    'No-Go': 'bg-purple-100 text-purple-700',
    'Non-Veg Frequency': 'bg-amber-100 text-amber-700',
    'Egg Frequency': 'bg-amber-100 text-amber-700',
    'Manual Override': 'bg-indigo-100 text-indigo-700',
  };
  return map[category] || 'bg-gray-100 text-gray-600';
}