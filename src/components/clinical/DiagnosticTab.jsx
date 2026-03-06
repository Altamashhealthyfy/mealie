import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2, RefreshCw, CheckCircle, AlertTriangle, Stethoscope,
  FlaskConical, Heart, ShieldAlert, ClipboardList, Plus, Trash2, Save,
  ChevronDown, ChevronRight, Calendar
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

/**
 * DiagnosticTab
 * Props:
 *  - clientId: string
 *  - clinicalIntakes: array — all ClinicalIntake records for the client
 *  - intakeCompleted: boolean
 */
export default function DiagnosticTab({ clientId, clinicalIntakes = [], intakeCompleted }) {
  const queryClient = useQueryClient();

  // Sort intakes descending by date (newest first)
  const sortedIntakes = [...clinicalIntakes].sort(
    (a, b) => new Date(b.intake_date || b.created_date) - new Date(a.intake_date || a.created_date)
  );

  // Track which intake is expanded
  const [expandedId, setExpandedId] = useState(null);

  // Auto-expand the first one that has a diagnostic
  useEffect(() => {
    if (sortedIntakes.length > 0 && expandedId === null) {
      const withDiag = sortedIntakes.find(i => !!i.diagnostic_notes);
      setExpandedId(withDiag?.id || sortedIntakes[0]?.id || null);
    }
  }, [sortedIntakes.length]);

  if (!intakeCompleted && sortedIntakes.length === 0) {
    return (
      <Alert className="bg-amber-50 border-amber-400">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Intake form not yet completed.</strong> Please complete and save the Clinical Intake form first. The diagnostic will be generated from there.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Stethoscope className="w-5 h-5 text-purple-600" />
        <h2 className="text-xl font-bold text-gray-900">Clinical Diagnostic History</h2>
        <Badge className="bg-purple-100 text-purple-700">{sortedIntakes.length} intake{sortedIntakes.length !== 1 ? 's' : ''}</Badge>
      </div>

      {sortedIntakes.length === 0 ? (
        <Alert className="bg-indigo-50 border-indigo-300">
          <AlertDescription className="text-indigo-800">
            No clinical intakes found. Complete the Clinical Intake form first.
          </AlertDescription>
        </Alert>
      ) : (
        sortedIntakes.map((intake, index) => (
          <DiagnosticEntry
            key={intake.id}
            intake={intake}
            index={index}
            total={sortedIntakes.length}
            isExpanded={expandedId === intake.id}
            onToggle={() => setExpandedId(expandedId === intake.id ? null : intake.id)}
            clientId={clientId}
            queryClient={queryClient}
            onRefresh={() => queryClient.invalidateQueries(['clientClinicalIntakes', clientId])}
          />
        ))
      )}
    </div>
  );
}

function DiagnosticEntry({ intake, index, total, isExpanded, onToggle, clientId, queryClient, onRefresh }) {
  const [generating, setGenerating] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [newRule, setNewRule] = useState('');
  const [additionalRules, setAdditionalRules] = useState([]);
  const [rulesLoaded, setRulesLoaded] = useState(false);

  const diagnostic = (() => {
    if (!intake?.diagnostic_notes) return null;
    try { return JSON.parse(intake.diagnostic_notes); } catch { return null; }
  })();

  // Load additional rules from dietitian_remarks once
  useEffect(() => {
    if (!rulesLoaded && intake) {
      try {
        const parsed = intake.dietitian_remarks ? JSON.parse(intake.dietitian_remarks) : [];
        setAdditionalRules(Array.isArray(parsed) ? parsed : []);
      } catch {
        if (intake.dietitian_remarks) {
          setAdditionalRules([{ rule: intake.dietitian_remarks, added_by: 'previous', added_at: '' }]);
        }
      }
      setRulesLoaded(true);
    }
  }, [intake?.id]);

  const handleGenerate = async () => {
    if (!intake.id) return;
    setGenerating(true);
    try {
      await base44.functions.invoke('generateDiagnostic', { clinicalIntakeId: intake.id });
      onRefresh();
      toast.success('✅ Diagnostic generated!');
    } catch (err) {
      toast.error('Failed to generate: ' + (err.message || 'Unknown error'));
    }
    setGenerating(false);
  };

  const handleSaveRules = async () => {
    setSavingRules(true);
    try {
      await base44.entities.ClinicalIntake.update(intake.id, {
        dietitian_remarks: JSON.stringify(additionalRules),
      });
      onRefresh();
      toast.success('✅ Rules saved!');
    } catch {
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

  const savedAt = diagnostic?.generated_at
    ? format(new Date(diagnostic.generated_at), "MMM d, yyyy · h:mm a")
    : null;

  return (
    <Card className={`border-none shadow-md transition-all ${index === 0 ? 'border-l-4 border-l-purple-500' : 'border-l-4 border-l-gray-200'}`}>
      {/* Collapsed Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 rounded-t-xl"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isExpanded
            ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
            : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          }
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-800">
              Intake #{total - index}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              {intake.intake_date ? format(new Date(intake.intake_date), "MMM d, yyyy") : "No date"}
            </span>
            {diagnostic ? (
              <Badge className="bg-green-100 text-green-700 text-xs">
                <CheckCircle className="w-3 h-3 mr-1" /> Diagnostic saved {savedAt ? `· ${savedAt}` : ''}
              </Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-700 text-xs">No diagnostic yet</Badge>
            )}
            {index === 0 && <Badge className="bg-purple-600 text-white text-xs">Latest</Badge>}
            <div className="flex flex-wrap gap-1">
              {intake.health_conditions?.slice(0, 3).map(c => (
                <Badge key={c} className="bg-red-100 text-red-700 text-xs">{c}</Badge>
              ))}
              {(intake.health_conditions?.length || 0) > 3 && (
                <Badge className="bg-gray-100 text-gray-600 text-xs">+{intake.health_conditions.length - 3}</Badge>
              )}
            </div>
          </div>
        </div>
        <Button
          size="sm"
          onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
          disabled={generating}
          className="ml-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex-shrink-0 text-xs"
        >
          {generating
            ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating...</>
            : <><RefreshCw className="w-3 h-3 mr-1" /> {diagnostic ? 'Re-generate' : 'Generate'}</>
          }
        </Button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <CardContent className="p-4 border-t border-gray-100 space-y-4">
          {!diagnostic ? (
            <Alert className="bg-indigo-50 border-indigo-300">
              <AlertDescription className="text-indigo-800">
                No diagnostic generated yet for this intake. Click <strong>"Generate"</strong> above.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* 1. Client Summary */}
              <DiagSection icon={<ClipboardList className="w-4 h-4 text-blue-600" />} title="1. Client Summary" color="blue">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {[
                    { label: 'Age', value: diagnostic.client_summary?.age },
                    { label: 'Gender', value: diagnostic.client_summary?.gender },
                    { label: 'Height', value: diagnostic.client_summary?.height ? `${diagnostic.client_summary.height} cm` : '—' },
                    { label: 'Weight', value: diagnostic.client_summary?.weight ? `${diagnostic.client_summary.weight} kg` : '—' },
                    { label: 'BMI', value: diagnostic.client_summary?.bmi },
                    { label: 'Activity', value: diagnostic.client_summary?.activity_level?.replace('_', ' ') },
                    { label: 'Diet Type', value: diagnostic.client_summary?.diet_type },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-blue-50 rounded-lg p-2">
                      <p className="text-xs text-blue-600 font-medium">{label}</p>
                      <p className="font-semibold text-gray-800 capitalize">{value || '—'}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-2">
                  <TagRow label="Health Conditions" tags={diagnostic.client_summary?.health_conditions} color="red" />
                  <TagRow label="Goals" tags={diagnostic.client_summary?.goals?.map(g => g.replace(/_/g, ' '))} color="green" />
                  <TagRow label="Allergies" tags={diagnostic.client_summary?.allergies} color="orange" />
                  <TagRow label="No-Go Foods" tags={diagnostic.client_summary?.no_go_foods} color="gray" />
                  {diagnostic.client_summary?.medications?.length > 0 && (
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

              {/* 2. Blood Analysis */}
              <DiagSection icon={<FlaskConical className="w-4 h-4 text-red-600" />} title="2. Blood Analysis Summary" color="red">
                <p className="text-xs text-gray-500 mb-3">Source: {diagnostic.blood_analysis_summary?.kb_source}</p>
                {diagnostic.blood_analysis_summary?.markers?.length > 0 ? (
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
                  <p className="text-sm text-gray-500 italic">No lab values entered.</p>
                )}
                {diagnostic.blood_analysis_summary?.restrictions?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-red-700 mb-1">⛔ Blood-Based Restrictions:</p>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
                      {diagnostic.blood_analysis_summary.restrictions.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
                {diagnostic.blood_analysis_summary?.focus_nutrients?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-blue-700 mb-1">🎯 Focus Nutrients:</p>
                    <TagRow tags={diagnostic.blood_analysis_summary.focus_nutrients} color="blue" />
                  </div>
                )}
              </DiagSection>

              {/* 3. Body Type */}
              <DiagSection icon={<Heart className="w-4 h-4 text-purple-600" />} title="3. Body Type & Holistic Summary" color="purple">
                <p className="text-xs text-gray-500 mb-2">Source: {diagnostic.body_type_summary?.kb_source}</p>
                {diagnostic.body_type_summary?.body_type_connections?.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-purple-700 mb-1">Body Type Connection:</p>
                    <TagRow tags={diagnostic.body_type_summary.body_type_connections} color="purple" />
                  </div>
                )}
                {diagnostic.body_type_summary?.holistic_considerations?.length > 0 ? (
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    {diagnostic.body_type_summary.holistic_considerations.map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 italic">No holistic data found.</p>
                )}
              </DiagSection>

              {/* 4. Disease-Specific */}
              <DiagSection icon={<ShieldAlert className="w-4 h-4 text-orange-600" />} title="4. Disease-Specific Clinical Considerations" color="orange">
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
                  <p className="text-sm text-gray-500 italic">No disease-specific guidelines found for: {diagnostic.client_summary?.health_conditions?.join(', ')}.</p>
                )}
              </DiagSection>

              {/* 5. Combined Summary */}
              <DiagSection icon={<CheckCircle className="w-4 h-4 text-green-600" />} title="5. Combined Diagnostic Summary" color="green">
                <div className="space-y-4">
                  {diagnostic.combined_summary?.final_restrictions?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-700 mb-1">⛔ Final Restrictions:</p>
                      <ul className="list-disc list-inside text-sm text-gray-800 space-y-0.5">
                        {diagnostic.combined_summary.final_restrictions.slice(0, 20).map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                  {diagnostic.combined_summary?.final_priorities?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-green-700 mb-1">✅ Final Priorities:</p>
                      <ul className="list-disc list-inside text-sm text-gray-800 space-y-0.5">
                        {diagnostic.combined_summary.final_priorities.slice(0, 20).map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    </div>
                  )}
                  {diagnostic.combined_summary?.major_nutrition_focus?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-blue-700 mb-1">🎯 Major Nutrition Focus:</p>
                      <TagRow tags={diagnostic.combined_summary.major_nutrition_focus} color="blue" />
                    </div>
                  )}
                  {diagnostic.combined_summary?.practical_notes?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1">📋 Practical Notes:</p>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
                        {diagnostic.combined_summary.practical_notes.map((n, i) => <li key={i}>{n}</li>)}
                      </ul>
                    </div>
                  )}
                  {diagnostic.combined_summary?.medication_food_interactions?.length > 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                      <p className="text-xs font-semibold text-yellow-800 mb-1">⚠️ Medication-Food Interactions:</p>
                      <ul className="list-disc list-inside text-sm text-yellow-900 space-y-0.5">
                        {diagnostic.combined_summary.medication_food_interactions.map((m, i) => <li key={i}>{m}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </DiagSection>
            </>
          )}

          {/* Additional Rules */}
          <Card className="border-2 border-dashed border-purple-300 shadow-sm">
            <CardHeader className="bg-purple-50 py-3 px-4">
              <CardTitle className="text-purple-800 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" /> Additional Rules (Coach / Dietitian)
              </CardTitle>
              <p className="text-xs text-purple-600 mt-1">
                Manually add extra clinical rules. Saved with this intake and used in meal planning.
              </p>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {additionalRules.length > 0 && (
                <div className="space-y-2">
                  {additionalRules.map((rule, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="flex-1 text-sm text-gray-800">{rule.rule}</p>
                      {rule.added_at && (
                        <p className="text-xs text-gray-400 flex-shrink-0">
                          {format(new Date(rule.added_at), "MMM d, yyyy")}
                        </p>
                      )}
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
                  placeholder="e.g. Avoid millets due to client preference..."
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
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  : <><Save className="w-4 h-4 mr-2" /> Save Rules</>}
              </Button>
            </CardContent>
          </Card>
        </CardContent>
      )}
    </Card>
  );
}

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