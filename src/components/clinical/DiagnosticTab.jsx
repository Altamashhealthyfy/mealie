import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2, RefreshCw, CheckCircle, AlertTriangle, Stethoscope,
  FlaskConical, Heart, ShieldAlert, ClipboardList, Plus, Trash2, Save
} from "lucide-react";
import { toast } from "sonner";

/**
 * DiagnosticTab
 * Props:
 *  - clientId: string
 *  - intakeId: string — the ID of the latest ClinicalIntake record
 *  - intakeCompleted: boolean — whether the intake form has been completed
 */
export default function DiagnosticTab({ clientId, intakeId, intakeCompleted }) {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [newRule, setNewRule] = useState('');
  const [additionalRules, setAdditionalRules] = useState([]);
  const [rulesLoaded, setRulesLoaded] = useState(false);

  // Fetch the diagnostic from the ClinicalIntake record
  const { data: intakeRecord, isLoading } = useQuery({
    queryKey: ['diagnostic', clientId, intakeId],
    queryFn: async () => {
      if (!intakeId) return null;
      const records = await base44.entities.ClinicalIntake.filter({ id: intakeId });
      return records[0] || null;
    },
    enabled: !!intakeId,
    onSuccess: (record) => {
      if (!rulesLoaded && record) {
        // Load additional_rules from dietitian_remarks (stored as JSON array string)
        try {
          const parsed = record.dietitian_remarks ? JSON.parse(record.dietitian_remarks) : [];
          setAdditionalRules(Array.isArray(parsed) ? parsed : []);
        } catch {
          if (record.dietitian_remarks) {
            setAdditionalRules([{ rule: record.dietitian_remarks, added_by: 'previous', added_at: '' }]);
          }
        }
        setRulesLoaded(true);
      }
    }
  });

  const diagnostic = (() => {
    if (!intakeRecord?.diagnostic_notes) return null;
    try { return JSON.parse(intakeRecord.diagnostic_notes); } catch { return null; }
  })();

  const handleGenerate = async () => {
    if (!intakeId) return toast.error('No intake record found. Please complete the intake form first.');
    setGenerating(true);
    try {
      await base44.functions.invoke('generateDiagnostic', { clinicalIntakeId: intakeId });
      queryClient.invalidateQueries(['diagnostic', clientId, intakeId]);
      toast.success('✅ Diagnostic generated from knowledge base!');
    } catch (err) {
      toast.error('Failed to generate diagnostic: ' + (err.message || 'Unknown error'));
    }
    setGenerating(false);
  };

  const handleSaveRules = async () => {
    if (!intakeId) return;
    setSavingRules(true);
    try {
      await base44.entities.ClinicalIntake.update(intakeId, {
        dietitian_remarks: JSON.stringify(additionalRules),
      });
      queryClient.invalidateQueries(['diagnostic', clientId, intakeId]);
      toast.success('✅ Additional rules saved!');
    } catch (err) {
      toast.error('Failed to save rules.');
    }
    setSavingRules(false);
  };

  const handleAddRule = () => {
    if (!newRule.trim()) return;
    setAdditionalRules(prev => [...prev, { rule: newRule.trim(), added_at: new Date().toISOString() }]);
    setNewRule('');
  };

  const handleRemoveRule = (idx) => {
    setAdditionalRules(prev => prev.filter((_, i) => i !== idx));
  };

  if (!intakeCompleted && !intakeId) {
    return (
      <Alert className="bg-amber-50 border-amber-400">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Intake form not yet completed.</strong> Please complete and save the Clinical Intake form first. The diagnostic will be generated automatically upon saving.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading diagnostic...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-purple-600" />
            Clinical Diagnostic Report
          </h2>
          {diagnostic?.generated_at && (
            <p className="text-xs text-gray-500 mt-0.5">
              Generated: {new Date(diagnostic.generated_at).toLocaleString()} · Sources: {diagnostic.kb_sources_used?.disease_specific?.length || 0} disease KB + Blood Analysis + Body Type
            </p>
          )}
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
        >
          {generating
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            : <><RefreshCw className="w-4 h-4 mr-2" /> {diagnostic ? 'Re-generate' : 'Generate Diagnostic'}</>}
        </Button>
      </div>

      {!diagnostic ? (
        <Alert className="bg-indigo-50 border-indigo-300">
          <AlertDescription className="text-indigo-800">
            No diagnostic found. Click <strong>"Generate Diagnostic"</strong> to create one from the Healthyfy Knowledge Base. It will be saved and available here instantly.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* 1. Client Summary */}
          <DiagSection
            icon={<ClipboardList className="w-4 h-4 text-blue-600" />}
            title="1. Client Summary"
            color="blue"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              {[
                { label: 'Age', value: diagnostic.client_summary.age },
                { label: 'Gender', value: diagnostic.client_summary.gender },
                { label: 'Height', value: diagnostic.client_summary.height ? `${diagnostic.client_summary.height} cm` : '—' },
                { label: 'Weight', value: diagnostic.client_summary.weight ? `${diagnostic.client_summary.weight} kg` : '—' },
                { label: 'BMI', value: diagnostic.client_summary.bmi },
                { label: 'Activity', value: diagnostic.client_summary.activity_level?.replace('_', ' ') },
                { label: 'Diet Type', value: diagnostic.client_summary.diet_type },
              ].map(({ label, value }) => (
                <div key={label} className="bg-blue-50 rounded-lg p-2">
                  <p className="text-xs text-blue-600 font-medium">{label}</p>
                  <p className="font-semibold text-gray-800 capitalize">{value || '—'}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-2">
              <TagRow label="Health Conditions" tags={diagnostic.client_summary.health_conditions} color="red" />
              <TagRow label="Goals" tags={diagnostic.client_summary.goals?.map(g => g.replace(/_/g, ' '))} color="green" />
              <TagRow label="Allergies" tags={diagnostic.client_summary.allergies} color="orange" />
              <TagRow label="No-Go Foods" tags={diagnostic.client_summary.no_go_foods} color="gray" />
              {diagnostic.client_summary.medications?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Medications:</p>
                  <div className="flex flex-wrap gap-1">
                    {diagnostic.client_summary.medications.map((m, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {m.name}{m.dosage ? ` ${m.dosage}` : ''}{m.frequency ? ` · ${m.frequency}` : ''}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DiagSection>

          {/* 2. Blood Analysis Summary */}
          <DiagSection
            icon={<FlaskConical className="w-4 h-4 text-red-600" />}
            title="2. Blood Analysis Summary"
            color="red"
          >
            <p className="text-xs text-gray-500 mb-3">Source: {diagnostic.blood_analysis_summary.kb_source}</p>
            {diagnostic.blood_analysis_summary.markers?.length > 0 ? (
              <div className="space-y-2">
                {diagnostic.blood_analysis_summary.markers.map((m, i) => (
                  <div key={i} className={`flex gap-3 p-2 rounded-lg text-sm ${
                    m.status === 'Normal' ? 'bg-green-50 border border-green-200' :
                    m.status === 'Low' ? 'bg-blue-50 border border-blue-200' :
                    'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex-shrink-0 w-28">
                      <p className="font-semibold">{m.marker}</p>
                      <p className="text-xs">{m.value} {m.unit}</p>
                    </div>
                    <div>
                      <Badge className={`text-xs mb-1 ${
                        m.status === 'Normal' ? 'bg-green-600' :
                        m.status === 'Low' ? 'bg-blue-600' : 'bg-red-600'
                      } text-white`}>{m.status}</Badge>
                      <p className="text-xs text-gray-700">{m.interpretation}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No lab values entered in intake form.</p>
            )}
            {diagnostic.blood_analysis_summary.restrictions?.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-red-700 mb-1">⛔ Blood-Based Restrictions:</p>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
                  {diagnostic.blood_analysis_summary.restrictions.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
            {diagnostic.blood_analysis_summary.focus_nutrients?.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-blue-700 mb-1">🎯 Focus Nutrients:</p>
                <TagRow tags={diagnostic.blood_analysis_summary.focus_nutrients} color="blue" />
              </div>
            )}
          </DiagSection>

          {/* 3. Body Type / Holistic Summary */}
          <DiagSection
            icon={<Heart className="w-4 h-4 text-purple-600" />}
            title="3. Body Type & Holistic Summary"
            color="purple"
          >
            <p className="text-xs text-gray-500 mb-2">Source: {diagnostic.body_type_summary.kb_source}</p>
            {diagnostic.body_type_summary.body_type_connections?.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-semibold text-purple-700 mb-1">Body Type Connection:</p>
                <TagRow tags={diagnostic.body_type_summary.body_type_connections} color="purple" />
              </div>
            )}
            {diagnostic.body_type_summary.holistic_considerations?.length > 0 ? (
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {diagnostic.body_type_summary.holistic_considerations.map((h, i) => <li key={i}>{h}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 italic">No holistic data found in knowledge base for the selected conditions.</p>
            )}
          </DiagSection>

          {/* 4. Disease-Specific Clinical Considerations */}
          <DiagSection
            icon={<ShieldAlert className="w-4 h-4 text-orange-600" />}
            title="4. Disease-Specific Clinical Considerations"
            color="orange"
          >
            {diagnostic.disease_considerations?.length > 0 ? (
              <div className="space-y-4">
                {diagnostic.disease_considerations.map((d, i) => (
                  <div key={i} className="border border-orange-200 rounded-xl p-4 bg-orange-50">
                    <h4 className="font-bold text-orange-800 text-base mb-2">
                      🔬 {d.condition}{d.sub_type ? ` — ${d.sub_type}` : ''}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {d.foods_to_avoid?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-red-700 mb-1">⛔ Foods to Avoid:</p>
                          <TagRow tags={d.foods_to_avoid} color="red" />
                        </div>
                      )}
                      {d.foods_to_include?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-green-700 mb-1">✅ Foods to Include:</p>
                          <TagRow tags={d.foods_to_include} color="green" />
                        </div>
                      )}
                      {d.micronutrient_focus?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-blue-700 mb-1">🎯 Micronutrient Focus:</p>
                          <TagRow tags={d.micronutrient_focus} color="blue" />
                        </div>
                      )}
                      {d.supplements_recommended?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-indigo-700 mb-1">💊 Supplements:</p>
                          <TagRow tags={d.supplements_recommended} color="indigo" />
                        </div>
                      )}
                    </div>
                    {d.meal_timing_guidelines && (
                      <p className="text-xs text-gray-700 mt-2"><span className="font-semibold">⏰ Meal Timing:</span> {d.meal_timing_guidelines}</p>
                    )}
                    {d.calorie_guidelines && (
                      <p className="text-xs text-gray-700 mt-1"><span className="font-semibold">🔥 Calorie Guideline:</span> {d.calorie_guidelines}</p>
                    )}
                    {d.exercise_guidelines && (
                      <p className="text-xs text-gray-700 mt-1"><span className="font-semibold">🏃 Exercise:</span> {d.exercise_guidelines}</p>
                    )}
                    {d.medication_interactions?.length > 0 && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs font-semibold text-yellow-800 mb-1">⚠️ Medication-Food Interactions:</p>
                        <ul className="list-disc list-inside text-xs text-yellow-900 space-y-0.5">
                          {d.medication_interactions.map((m, j) => <li key={j}>{m}</li>)}
                        </ul>
                      </div>
                    )}
                    {d.conflict_rules && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-xs font-semibold text-red-800">⚡ Conflict Rule:</p>
                        <p className="text-xs text-red-700">{d.conflict_rules}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No disease-specific guidelines found in ClinicalKnowledgeBase for the selected conditions. Please ensure records exist in the Clinical Knowledge Base for: {diagnostic.client_summary.health_conditions?.join(', ')}.</p>
            )}
          </DiagSection>

          {/* 5. Combined Diagnostic Summary */}
          <DiagSection
            icon={<CheckCircle className="w-4 h-4 text-green-600" />}
            title="5. Combined Diagnostic Summary"
            color="green"
          >
            <div className="space-y-4">
              {diagnostic.combined_summary.final_restrictions?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-700 mb-1">⛔ Final Restrictions (for meal planning):</p>
                  <ul className="list-disc list-inside text-sm text-gray-800 space-y-0.5">
                    {diagnostic.combined_summary.final_restrictions.slice(0, 20).map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
              {diagnostic.combined_summary.final_priorities?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-700 mb-1">✅ Final Priorities (food emphasis):</p>
                  <ul className="list-disc list-inside text-sm text-gray-800 space-y-0.5">
                    {diagnostic.combined_summary.final_priorities.slice(0, 20).map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}
              {diagnostic.combined_summary.major_nutrition_focus?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-blue-700 mb-1">🎯 Major Nutrition Focus:</p>
                  <TagRow tags={diagnostic.combined_summary.major_nutrition_focus} color="blue" />
                </div>
              )}
              {diagnostic.combined_summary.practical_notes?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">📋 Practical Notes for Meal Planning:</p>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
                    {diagnostic.combined_summary.practical_notes.map((n, i) => <li key={i}>{n}</li>)}
                  </ul>
                </div>
              )}
              {diagnostic.combined_summary.medication_food_interactions?.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                  <p className="text-xs font-semibold text-yellow-800 mb-1">⚠️ Medication-Food Interactions Summary:</p>
                  <ul className="list-disc list-inside text-sm text-yellow-900 space-y-0.5">
                    {diagnostic.combined_summary.medication_food_interactions.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </DiagSection>
        </>
      )}

      {/* Additional Rules Section — always visible after intake is saved */}
      <Card className="border-2 border-dashed border-purple-300 shadow-md">
        <CardHeader className="bg-purple-50 py-3 px-4">
          <CardTitle className="text-purple-800 text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Additional Rules (Nutritionist / Dietitian / Coach)
          </CardTitle>
          <p className="text-xs text-purple-600 mt-1">
            Manually add extra clinical rules or considerations. These will be saved with the diagnostic and included in meal planning logic.
          </p>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {additionalRules.length > 0 && (
            <div className="space-y-2">
              {additionalRules.map((rule, i) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="flex-1 text-sm text-gray-800">{rule.rule}</p>
                  {rule.added_at && <p className="text-xs text-gray-400 flex-shrink-0">{new Date(rule.added_at).toLocaleDateString()}</p>}
                  <button onClick={() => handleRemoveRule(i)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              placeholder="e.g. Avoid millets due to client preference. Limit protein to 50g/day due to kidney function."
              rows={2}
              className="flex-1"
              onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleAddRule(); }}
            />
            <Button type="button" variant="outline" onClick={handleAddRule} className="self-end">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <Button
            type="button"
            onClick={handleSaveRules}
            disabled={savingRules}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            {savingRules
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving Rules...</>
              : <><Save className="w-4 h-4 mr-2" /> Save Additional Rules</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Utility components
function DiagSection({ icon, title, color, children }) {
  const colorMap = {
    blue: 'from-blue-500 to-blue-600',
    red: 'from-red-500 to-orange-500',
    purple: 'from-purple-500 to-indigo-500',
    orange: 'from-orange-500 to-amber-500',
    green: 'from-green-500 to-teal-500',
  };
  return (
    <Card className="border-none shadow-md">
      <CardHeader className={`bg-gradient-to-r ${colorMap[color]} text-white py-3 px-4`}>
        <CardTitle className="text-sm flex items-center gap-2">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

function TagRow({ label, tags, color }) {
  if (!tags?.length) return null;
  const colorMap = {
    red: 'bg-red-100 text-red-800',
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    orange: 'bg-orange-100 text-orange-800',
    purple: 'bg-purple-100 text-purple-800',
    indigo: 'bg-indigo-100 text-indigo-800',
    gray: 'bg-gray-100 text-gray-800',
  };
  return (
    <div>
      {label && <p className="text-xs font-semibold text-gray-600 mb-1">{label}:</p>}
      <div className="flex flex-wrap gap-1">
        {tags.map((tag, i) => (
          <span key={i} className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[color] || colorMap.gray}`}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}