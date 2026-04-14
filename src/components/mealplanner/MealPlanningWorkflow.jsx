import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { logAction } from "@/lib/logAction";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  Stethoscope, Sparkles, Save, Send,
  CheckCircle, AlertTriangle, Loader2, RefreshCw,
  ChevronDown, ChevronRight, MessageSquare,
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

  const [openSections, setOpenSections] = useState({ s1: true, s2: false, s3: false, s5: true, s6: true });
  const [selectedIntakeId, setSelectedIntakeId] = useState(latestIntake?.id || null);
  const [duration, setDuration] = useState(10);
  const [customDuration, setCustomDuration] = useState("");
  const [useCustomDuration, setUseCustomDuration] = useState(false);
  const effectiveDuration = useCustomDuration ? (parseInt(customDuration) || 10) : duration;

  // Step 2: Coach override rules — pre-populate with clinical notes + non-veg/egg frequency
  const defaultOverrideRules = [
    latestIntake?.additional_rules || latestIntake?.dietitian_remarks || '',
    latestIntake?.non_veg_frequency ? `Non-veg: ${latestIntake.non_veg_frequency} times in 10 days` : '',
    latestIntake?.egg_frequency ? `Eggs: ${latestIntake.egg_frequency} times in 10 days` : '',
    latestIntake?.non_veg_meal_times?.length ? `Non-veg meal times: ${latestIntake.non_veg_meal_times.join(', ')}` : '',
    latestIntake?.egg_preferred_meals?.length ? `Egg meal times: ${latestIntake.egg_preferred_meals.join(', ')}` : '',
  ].filter(Boolean).join('\n');
  const overrideRulesRef = useRef(defaultOverrideRules);
  const [overrideRules, setOverrideRules] = useState(defaultOverrideRules);
  // Keep ref in sync with state
  const handleOverrideRulesChange = (val) => {
    setOverrideRules(val);
    overrideRulesRef.current = val;
  };

  // Step 4: Generated plan
  const [generating, setGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [audit, setAudit] = useState(null);
  // Store conversation context for modifications
  const [conversationContext, setConversationContext] = useState(null); // { originalPrompt, assistantResponse }

  // Step 5: Modification chat
  const [modificationText, setModificationText] = useState('');
  const [modifying, setModifying] = useState(false);
  const [modificationHistory, setModificationHistory] = useState([]);

  // Step 6: Saving
  const [savingOnly, setSavingOnly] = useState(false);
  const [savingAssign, setSavingAssign] = useState(false);
  const saving = savingOnly || savingAssign;

  const selectedIntake = sortedIntakes.find(i => i.id === selectedIntakeId) || latestIntake;

  // Parse diagnostic
  const diagnostic = (() => {
    if (!selectedIntake?.diagnostic_notes) return null;
    try { return JSON.parse(selectedIntake.diagnostic_notes); } catch { return null; }
  })();

  // ── STEP 1 helpers ─────────────────────────────────────────────────────────
  const canProceedStep1 = !!selectedIntake;

  // ── STEP 3: Generate plan ───────────────────────────────────────────────────
  const generatePlan = async () => {
    console.log('🚀 generatePlan fired');
    setGenerating(true);
    const _genStart = Date.now();
    
    const timeoutId = setTimeout(() => {
      setGenerating(false);
      toast.error('⏱️ Generation took too long (3 min) — try a shorter plan (3-5 days)');
      logAction({ action: "generate_meal_plan", status: "error", pageSection: "MealPlanner", errorMessage: "AI generation timed out after 3 minutes", errorCode: "AI_TIMEOUT", userEmail: client?.created_by, metadata: { client_id: client?.id, plan_duration: effectiveDuration } });
    }, 180000);
    
    try {
      if (!client?.id) {
        toast.error('Client data not loaded. Please close and reopen the workflow.');
        clearTimeout(timeoutId);
        setGenerating(false);
        return;
      }

      const selectedIntake = sortedIntakes.find(i => i.id === selectedIntakeId) || latestIntake;
      const primaryCondition = diagnostic?.primary_conditions?.[0] || selectedIntake?.health_conditions?.[0] || null;
      const additionalConditions = diagnostic?.primary_conditions?.slice(1) || selectedIntake?.health_conditions?.slice(1) || [];

      // Resolve calorie target from override rules text or client profile
      const resolveCalories = () => {
        const rulesText = overrideRulesRef.current || selectedIntake?.additional_rules || selectedIntake?.dietitian_remarks || '';
        const calMatch = rulesText.match(/target\s*(\d{3,4})\s*kcal/i) || rulesText.match(/(\d{3,4})\s*kcal/i);
        if (calMatch) return parseInt(calMatch[1]);
        return client.target_calories || 1800;
      };

      const res = await base44.functions.invoke('generateAIMealPlan', {
        clientId: client.id,
        numDays: effectiveDuration,
        calorieTarget: resolveCalories(),
        dietType: selectedIntake?.diet_type || client.food_preference,
        condition: primaryCondition,
        additionalConditions,
        overrideGoal: client.goal || 'weight loss',
        modificationInstructions: overrideRulesRef.current || selectedIntake?.additional_rules || '',
        planTier: 'advanced',
      });

      clearTimeout(timeoutId);
      console.log('Step 4 - API response:', res);
      const d = res.data;
      if (!d || !d.meals || d.meals.length === 0) {
        console.error('❌ No meals in response:', d);
        toast.error('Generation returned empty plan. Check backend logs.');
        logAction({ action: "generate_meal_plan", status: "error", pageSection: "MealPlanner", errorMessage: "AI returned empty meal plan", errorCode: "AI_EMPTY_RESPONSE", userEmail: client?.created_by, metadata: { client_id: client?.id, plan_duration: effectiveDuration } });
        setGenerating(false);
        return;
      }
      const selectedIntakeForPlan = sortedIntakes.find(i => i.id === selectedIntakeId) || latestIntake;
      setGeneratedPlan({
        name: d.mealPlan?.name || `AI Meal Plan – ${effectiveDuration} Days`,
        duration: d.mealPlan?.duration || effectiveDuration,
        target_calories: d.calorie_compliance_audit?.target_calories || client.target_calories,
        food_preference: selectedIntakeForPlan?.diet_type || client.food_preference,
        meals: d.meals,
        mpess: d.mpess || [],
        overview: d.overview,
        nutritional_strategy: d.nutritional_strategy,
        macro_targets: d.macro_targets,
        day_summaries: d.day_summaries,
        decision_rules_applied: d.decision_rules || [],
        coach_notes: d.coach_notes,
        created_date: new Date().toISOString(),
        id: null,
      });
      // Store conversation context so modifications can continue the same Claude conversation
      if (d.conversationContext) {
        setConversationContext(d.conversationContext);
      }
      logAction({ action: "generate_meal_plan", status: "success", pageSection: "MealPlanner", durationMs: Date.now() - _genStart, metadata: { client_id: client?.id, plan_duration: effectiveDuration, food_preference: selectedIntake?.diet_type || client?.food_preference, meals_count: d.meals.length } });
      toast.success('✅ AI meal plan generated with HMRE engine!');
      setOpenSections(prev => ({ ...prev, s5: true, s6: true }));
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('❌ generatePlan error:', err);
      const errMsg = err.message || 'Unknown error';
      toast.error('❌ ' + errMsg);
      const errCode = errMsg.toLowerCase().includes('json') ? 'AI_PARSE_ERROR' : errMsg.toLowerCase().includes('timeout') ? 'AI_TIMEOUT' : null;
      logAction({ action: "generate_meal_plan", status: "error", pageSection: "MealPlanner", errorMessage: errMsg, errorCode: errCode, durationMs: Date.now() - _genStart, metadata: { client_id: client?.id, plan_duration: effectiveDuration } });
      if (err.response?.data) console.error('API error details:', err.response.data);
    }
    setGenerating(false);
  };

  // ── STEP 5: Modification via AI (continues the same Claude conversation) ──
  const applyModification = async () => {
    if (!modificationText.trim() || !generatedPlan) return;
    setModifying(true);
    try {
      if (!conversationContext?.originalPrompt || !conversationContext?.assistantResponse) {
        toast.error('Conversation context missing — please regenerate the plan first.');
        setModifying(false);
        return;
      }

      const res = await base44.functions.invoke('modifyMealPlan', {
        originalPrompt: conversationContext.originalPrompt,
        originalResponse: conversationContext.assistantResponse,
        modificationRequest: modificationText,
        clientId: client.id,
        clientName: client.full_name,
        clientEmail: client.email,
      });

      const d = res.data;
      if (!d?.success || !d.meals?.length) {
        throw new Error(d?.error || 'Modification returned no meals');
      }

      // Replace the entire meals array with the updated full plan
      setGeneratedPlan(prev => ({ ...prev, meals: d.meals }));

      // Update conversation context so next modification continues from here
      if (d.updatedAssistantResponse) {
        setConversationContext(prev => ({
          ...prev,
          assistantResponse: d.updatedAssistantResponse,
        }));
      }

      setModificationHistory(prev => [...prev, {
        request: modificationText,
        explanation: `Plan updated via continued Claude conversation (${d.meals.length} meals).`,
        ai_used: true,
        timestamp: new Date().toISOString(),
      }]);
      toast.success('✅ Plan modified with full dish catalog context!');
    } catch (err) {
      toast.error('Modification failed: ' + (err.message || 'Unknown error'));
    }
    setModificationText('');
    setModifying(false);
  };

  // ── STEP 6: Save ────────────────────────────────────────────────────────────
  const savePlan = async (assign = false) => {
    if (!generatedPlan) return;
    if (assign) setSavingAssign(true);
    else setSavingOnly(true);
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
        mpess: generatedPlan.mpess || [],
        food_preference: generatedPlan.food_preference || client.food_preference,
        regional_preference: client.regional_preference,
        plan_tier: 'advanced',
        disease_focus: generatedPlan.disease_focus || [],
        active: assign,
        conflict_resolution: modificationHistory.map(h => h.explanation).join(' | ') || '',
        generation_parameters: {
          duration: effectiveDuration,
          target_calories: generatedPlan.target_calories,
          modification_instructions: modificationHistory.map(h => h.request).join(' | '),
          generation_count: 1,
        },
      });

      logAction({ action: "save_meal_plan", status: "success", pageSection: "MealPlanner", metadata: { client_id: client.id, plan_name: generatedPlan.name, assigned: assign } });
      toast.success(assign ? '✅ Plan saved and assigned to client!' : '✅ Plan saved!');
      queryClient.invalidateQueries(['clientMealPlans', client.id]);
      queryClient.refetchQueries(['clientMealPlans', client.id]);
      if (assign) setSavingAssign(false);
      else setSavingOnly(false);
      if (assign && onPlanAssigned) onPlanAssigned();
      else if (onPlanSaved) onPlanSaved();
    } catch (err) {
      logAction({ action: "save_meal_plan", status: "error", pageSection: "MealPlanner", errorMessage: err.message, metadata: { client_id: client.id } });
      toast.error('Save failed: ' + (err.message || 'Unknown error'));
      if (assign) setSavingAssign(false);
      else setSavingOnly(false);
    }
  };

  // ── RENDER ──────────────────────────────────────────────────────────────────
  const toggle = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-3">

      {/* ─ STEP 1: Review Diagnostic ─ */}
      <SectionShell sectionKey="s1" icon={<Stethoscope />} title="Step 1 — Review Diagnostic" subtitle="Select the intake and review the clinical diagnostic before starting meal planning." color="purple" openSections={openSections} onToggle={toggle}
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
                  {[3, 7, 10, 15, 21, 30].map(d => (
                    <button key={d} onClick={() => { setDuration(d); setUseCustomDuration(false); }}
                      className={`px-3 py-1.5 rounded-full text-xs border font-medium transition-all ${!useCustomDuration && duration === d ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-600 hover:border-green-400'}`}>
                      {d} Days
                    </button>
                  ))}
                  <button onClick={() => setUseCustomDuration(true)}
                    className={`px-3 py-1.5 rounded-full text-xs border font-medium transition-all ${useCustomDuration ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-600 hover:border-green-400'}`}>
                    Custom
                  </button>
                </div>
                {useCustomDuration && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number" min={1} max={90}
                      placeholder="e.g. 14"
                      value={customDuration}
                      onChange={e => setCustomDuration(e.target.value)}
                      className="w-24 h-8 border rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                    <span className="text-xs text-gray-500">days (1–90)</span>
                  </div>
                )}
              </CardContent>
            </Card>
            <Button onClick={() => setOpenSections(prev => ({ ...prev, s1: false, s2: true }))} className="w-full bg-purple-600 hover:bg-purple-700">
              <ArrowRight className="w-4 h-4 mr-2" /> Proceed to Generate
            </Button>
          </>
        )}
      </SectionShell>



      {/* ─ STEP 2: Coach Override Rules ─ */}
      <SectionShell sectionKey="s2" icon={<MessageSquare />} title="Step 2 — Coach Override Rules" subtitle="Add or edit rules the AI must follow when generating the plan (calorie targets, restrictions, non-veg frequency, etc)." color="orange" openSections={openSections} onToggle={toggle}>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs text-gray-500">Pre-filled from clinical intake. Edit as needed before generating.</p>
            <textarea
              value={overrideRules}
              onChange={e => handleOverrideRulesChange(e.target.value)}
              rows={8}
              placeholder="e.g. Target 1600 kcal/day. No dairy. Non-veg 3 times in 10 days at dinner only. Avoid brinjal."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-y"
            />
            <p className="text-xs text-gray-400">💡 Tip: Mention calorie target, foods to avoid, meal frequency, or any clinical notes here.</p>
          </CardContent>
        </Card>
        <Button onClick={() => setOpenSections(prev => ({ ...prev, s2: false, s3: true }))} className="w-full bg-orange-500 hover:bg-orange-600">
          <ArrowRight className="w-4 h-4 mr-2" /> Proceed to Generate
        </Button>
      </SectionShell>

      {/* ─ STEP 3: Generate Plan ─ */}
      <SectionShell sectionKey="s3" icon={<Sparkles />} title="Step 3 — Generate Meal Plan" subtitle="Generate the plan using clinical data, calorie targets, macro ratios, and all override rules." color="green" openSections={openSections} onToggle={toggle}>
        {!selectedIntake ? (
          <Alert className="bg-amber-50 border-amber-300"><AlertTriangle className="w-4 h-4 text-amber-600" /><AlertDescription className="text-sm"><strong>Step 1 not completed.</strong> Select a clinical intake first.</AlertDescription></Alert>
        ) : (
          <Card className="border-none shadow-sm bg-green-50">
            <CardContent className="p-4 space-y-1 text-xs text-gray-700">
              <p className="font-semibold text-green-800 text-sm mb-2">Generation Parameters:</p>
              <p>📅 Duration: <strong>{effectiveDuration} days</strong></p>
              <p>🥗 Diet: <strong>{selectedIntake?.diet_type || client.food_preference || 'veg'}</strong></p>
              <p>🎯 Condition: <strong>{diagnostic?.primary_conditions?.[0] || selectedIntake?.health_conditions?.[0] || 'none'}</strong></p>
              <p>🔥 Calories: <strong>{client.target_calories || 1800} kcal (override from rules if specified)</strong></p>
              {overrideRules && <p className="text-orange-700 mt-1">⚙️ Override rules: {overrideRules.slice(0, 100)}{overrideRules.length > 100 ? '...' : ''}</p>}
            </CardContent>
          </Card>
        )}
        <Button
          onClick={generatePlan}
          disabled={generating || !selectedIntake}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-semibold py-3 disabled:opacity-50"
        >
          {generating
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating AI meal plan...</>
            : <><Sparkles className="w-4 h-4 mr-2" /> Generate {effectiveDuration}-Day Meal Plan</>}
        </Button>
      </SectionShell>

      {/* ─ STEP 5 & 6: Shown only after plan is generated ─ */}
      {generatedPlan && (
        <>
          {/* ─ STEP 5: Advise & Modify ─ */}
          <SectionShell sectionKey="s5" icon={<MessageSquare />} title="Step 4 — Review, Advise & Modify" subtitle="Review the generated plan. Request changes. AI will try database first, LLM only if needed." color="pink" openSections={openSections} onToggle={toggle}>
            {generatedPlan?.meals && (
              <AuditCard
                meals={generatedPlan.meals}
                targetCalories={generatedPlan.target_calories}
                targetProtein={client?.target_protein}
                targetCarbs={client?.target_carbs}
                targetFats={client?.target_fats}
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
            <ModificationCard modificationText={modificationText} setModificationText={setModificationText} applyModification={applyModification} modifying={modifying} />
            <Button variant="outline" onClick={() => { setGeneratedPlan(null); setAudit(null); }} className="w-full text-gray-600">
              <ArrowLeft className="w-4 h-4 mr-1" /> Discard & Regenerate
            </Button>
          </SectionShell>

          {/* ─ STEP 6: Save & Assign ─ */}
          <SectionShell sectionKey="s6" icon={<Save />} title="Step 5 — Save & Assign" subtitle="Save the plan to the client's records or assign it as the active plan." color="emerald" openSections={openSections} onToggle={toggle}>
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
              <Button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); savePlan(false); }}
                disabled={savingOnly || savingAssign}
                variant="outline"
                className="border-emerald-400 text-emerald-700"
              >
                {savingOnly ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Save Only
              </Button>
              <Button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); savePlan(true); }}
                disabled={savingOnly || savingAssign}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {savingAssign ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />} Save & Assign
              </Button>
            </div>
          </SectionShell>
        </>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

// Defined OUTSIDE the main component so React never remounts it on parent re-renders
function SectionShell({ sectionKey, icon, title, subtitle, color, badge, children, openSections, onToggle }) {
  const colorMap = { purple: 'border-purple-300 bg-purple-50', blue: 'border-blue-300 bg-blue-50', orange: 'border-orange-300 bg-orange-50', green: 'border-green-300 bg-green-50', pink: 'border-pink-300 bg-pink-50', emerald: 'border-emerald-300 bg-emerald-50' };
  const textMap  = { purple: 'text-purple-700', blue: 'text-blue-700', orange: 'text-orange-700', green: 'text-green-700', pink: 'text-pink-700', emerald: 'text-emerald-700' };
  const isOpen = openSections[sectionKey];
  return (
    <div className={`rounded-xl border-2 overflow-hidden ${colorMap[color]}`}>
      <button className="w-full flex items-center justify-between px-4 py-3 text-left" onClick={() => onToggle(sectionKey)}>
        <div className="flex items-center gap-2">
          {React.cloneElement(icon, { className: `w-4 h-4 ${textMap[color]}` })}
          <span className={`font-bold text-sm ${textMap[color]}`}>{title}</span>
          {badge && <span className="ml-2">{badge}</span>}
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>
      <div className="px-4 pb-4 bg-white border-t border-gray-100 space-y-3 pt-3" style={{ display: isOpen ? 'block' : 'none' }}>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}



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
          {/* Non-veg / egg frequency */}
          {(intake.non_veg_frequency || intake.egg_frequency) && (
            <div className="p-2 bg-amber-50 rounded-lg">
              <p className="text-xs font-semibold text-amber-700 mb-1">🍗 Non-Veg & Egg Frequency:</p>
              {intake.non_veg_frequency && <p className="text-xs text-gray-700">• Non-veg: <strong>{intake.non_veg_frequency}</strong> times in 10 days {intake.non_veg_meal_times?.length ? `(${intake.non_veg_meal_times.join(', ')})` : ''}</p>}
              {intake.egg_frequency && <p className="text-xs text-gray-700">• Eggs: <strong>{intake.egg_frequency}</strong> times in 10 days {intake.egg_preferred_meals?.length ? `(${intake.egg_preferred_meals.join(', ')})` : ''}</p>}
            </div>
          )}
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

function ModificationCard({ modificationText, setModificationText, applyModification, modifying }) {
  return (
    <Card className="border-dashed border-2 border-pink-200">
      <CardHeader className="py-2 px-4 bg-pink-50"><CardTitle className="text-sm text-pink-800">Request Changes</CardTitle></CardHeader>
      <CardContent className="p-3 space-y-2">
        <Textarea value={modificationText} onChange={e => setModificationText(e.target.value)} placeholder="e.g. Replace oats at breakfast on days 3 and 7 with besan cheela." rows={3} className="text-sm" />
        <Button onClick={applyModification} disabled={modifying || !modificationText.trim()} className="w-full bg-pink-500 hover:bg-pink-600">
          {modifying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Applying changes...</> : <><RefreshCw className="w-4 h-4 mr-2" /> Apply Modifications</>}
        </Button>
      </CardContent>
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