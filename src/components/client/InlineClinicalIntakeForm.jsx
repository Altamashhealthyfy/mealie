import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plus, X, CheckCircle, Sparkles, Loader2, ChevronDown,
  Heart, Brain, Users
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { toast } from "sonner";
import IntakeTemplateDownload from "@/components/client/IntakeTemplateDownload";

/**
 * InlineClinicalIntakeForm
 * Props:
 *  - clientId: string
 *  - prefillData: object | null  — prefill the form with existing intake data (for "Update New Intake" or "Edit")
 *  - isViewOnly: boolean         — when true, all fields are disabled (View mode)
 *  - onSuccess: () => void       — called after successful save
 *  - onCancel: () => void
 */
export default function InlineClinicalIntakeForm({ clientId, prefillData, isViewOnly = false, onSuccess, onCancel }) {
  const queryClient = useQueryClient();

  const emptyForm = {
    client_id: clientId,
    intake_date: format(new Date(), 'yyyy-MM-dd'),
    basic_info: { age: '', gender: '', height: '', weight: '', bmi: '', activity_level: '' },
    health_conditions: [],
    stage_severity: '',
    current_medications: [],
    lab_values: {},
    diet_type: '',
    likes_dislikes_allergies: { likes: [], dislikes: [], allergies: [], no_go_foods: [] },
    daily_routine: {},
    cooking_style: {},
    goal: [],
    symptom_goals: [],
    mpess_preferences: { mind: true, physical: true, emotional: true, social: true, spiritual: true },
    completed: false,
  };

  const [formData, setFormData] = useState(emptyForm);
  const [medications, setMedications] = useState([{ name: '', dosage: '', frequency: '' }]);
  const [symptomGoalsText, setSymptomGoalsText] = useState('');
  const [likesText, setLikesText] = useState('');
  const [dislikesText, setDislikesText] = useState('');
  const [allergiesText, setAllergiesText] = useState('');
  const [noGoText, setNoGoText] = useState('');
  const [saving, setSaving] = useState(false);

  // Collapsible states
  const [isHealthConditionsOpen, setIsHealthConditionsOpen] = useState(true);
  const [isMedicationsOpen, setIsMedicationsOpen] = useState(false);
  const [isLabValuesOpen, setIsLabValuesOpen] = useState(false);
  const [isDietPreferencesOpen, setIsDietPreferencesOpen] = useState(false);
  const [isDailyRoutineOpen, setIsDailyRoutineOpen] = useState(false);
  const [isCookingStyleOpen, setIsCookingStyleOpen] = useState(false);
  const [isGoalsOpen, setIsGoalsOpen] = useState(false);
  const [isMpessOpen, setIsMpessOpen] = useState(false);

  // Load prefill data
  useEffect(() => {
    if (prefillData) {
      const loadedGoal = prefillData.goal;
      setFormData({
        ...emptyForm,
        ...prefillData,
        client_id: clientId,
        intake_date: prefillData?.id ? (prefillData.intake_date || format(new Date(), 'yyyy-MM-dd')) : format(new Date(), 'yyyy-MM-dd'),
        goal: Array.isArray(loadedGoal) ? loadedGoal : (loadedGoal ? [loadedGoal] : []),
        basic_info: {
          age: prefillData.basic_info?.age ?? '',
          gender: prefillData.basic_info?.gender ?? '',
          height: prefillData.basic_info?.height ?? '',
          weight: prefillData.basic_info?.weight ?? '',
          bmi: prefillData.basic_info?.bmi ?? '',
          activity_level: prefillData.basic_info?.activity_level ?? '',
        },
      });
      if (prefillData.current_medications?.length > 0) {
        setMedications(prefillData.current_medications);
      }
      if (prefillData.symptom_goals?.length > 0) setSymptomGoalsText(prefillData.symptom_goals.join('\n'));
      if (prefillData.likes_dislikes_allergies) {
        setLikesText(prefillData.likes_dislikes_allergies.likes?.join(', ') || '');
        setDislikesText(prefillData.likes_dislikes_allergies.dislikes?.join(', ') || '');
        setAllergiesText(prefillData.likes_dislikes_allergies.allergies?.join(', ') || '');
        setNoGoText(prefillData.likes_dislikes_allergies.no_go_foods?.join(', ') || '');
      }
    }
  }, [prefillData, clientId]);

  // Auto-calculate BMI
  useEffect(() => {
    const height = parseFloat(formData.basic_info.height);
    const weight = parseFloat(formData.basic_info.weight);
    if (height > 0 && weight > 0) {
      const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
      setFormData(prev => ({ ...prev, basic_info: { ...prev.basic_info, bmi: parseFloat(bmi) } }));
    }
  }, [formData.basic_info.height, formData.basic_info.weight]);

  const handleGoalToggle = (goal) => {
    if (isViewOnly) return;
    setFormData(prev => ({
      ...prev,
      goal: prev.goal.includes(goal) ? prev.goal.filter(g => g !== goal) : [...prev.goal, goal],
    }));
  };

  const handleHealthConditionToggle = (condition) => {
    if (isViewOnly) return;
    setFormData(prev => ({
      ...prev,
      health_conditions: prev.health_conditions.includes(condition)
        ? prev.health_conditions.filter(c => c !== condition)
        : [...prev.health_conditions, condition],
    }));
  };

  const addMedication = () => setMedications([...medications, { name: '', dosage: '', frequency: '' }]);
  const removeMedication = (i) => setMedications(medications.filter((_, idx) => idx !== i));
  const updateMedication = (i, field, value) => {
    const updated = [...medications];
    updated[i][field] = value;
    setMedications(updated);
  };



  const buildFinalData = () => ({
    ...formData,
    client_id: clientId,
    intake_date: prefillData?.id ? (formData.intake_date || format(new Date(), 'yyyy-MM-dd')) : format(new Date(), 'yyyy-MM-dd'),
    basic_info: {
      ...formData.basic_info,
      age: parseFloat(formData.basic_info.age) || 0,
      height: parseFloat(formData.basic_info.height) || 0,
      weight: parseFloat(formData.basic_info.weight) || 0,
      bmi: parseFloat(formData.basic_info.bmi) || 0,
    },
    goal: Array.isArray(formData.goal) ? formData.goal : (formData.goal ? [formData.goal] : []),
    current_medications: medications.filter(m => m.name),
    symptom_goals: symptomGoalsText.split('\n').filter(s => s.trim()),
    likes_dislikes_allergies: {
      likes: likesText.split(',').map(s => s.trim()).filter(Boolean),
      dislikes: dislikesText.split(',').map(s => s.trim()).filter(Boolean),
      allergies: allergiesText.split(',').map(s => s.trim()).filter(Boolean),
      no_go_foods: noGoText.split(',').map(s => s.trim()).filter(Boolean),
    },
    completed: true,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.basic_info.age) return toast.error('Please enter age');
    if (!formData.basic_info.gender) return toast.error('Please select gender');
    if (!formData.basic_info.height) return toast.error('Please enter height');
    if (!formData.basic_info.weight) return toast.error('Please enter weight');
    if (!formData.basic_info.activity_level) return toast.error('Please select activity level');
    if (!formData.health_conditions.length) return toast.error('Please select at least one health condition');
    if (!formData.diet_type) return toast.error('Please select diet type');
    if (!formData.goal?.length) return toast.error('Please select at least one goal');

    setSaving(true);
    try {
      let saved;
      if (prefillData?.id) {
        saved = await base44.entities.ClinicalIntake.update(prefillData.id, buildFinalData());
        queryClient.invalidateQueries(['clientClinicalIntakes', clientId]);
        toast.success('✅ Clinical intake updated! Re-generating diagnostic...');
      } else {
        saved = await base44.entities.ClinicalIntake.create(buildFinalData());
        queryClient.invalidateQueries(['clientClinicalIntakes', clientId]);
        toast.success('✅ Clinical intake saved! Generating diagnostic...');
      }
      if (saved?.id) {
        try {
          await base44.functions.invoke('generateDiagnostic', { clinicalIntakeId: saved.id });
          queryClient.invalidateQueries(['diagnostic', clientId, saved.id]);
          toast.success('✅ Diagnostic generated from Knowledge Base!');
        } catch {
          toast.error('Intake saved but diagnostic generation failed. Retry from the Diagnostic tab.');
        }
      }
      onSuccess?.();
    } catch (err) {
      toast.error('Failed to save. Please try again.');
    }
    setSaving(false);
  };

  const disabled = isViewOnly;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">


      {isViewOnly && (
        <Alert className="bg-blue-50 border-blue-300">
          <AlertDescription className="text-blue-700 text-sm">
            📋 View mode — this intake record is read-only.
            {prefillData?.intake_date && ` Recorded on ${format(new Date(prefillData.intake_date), 'MMM d, yyyy')}.`}
          </AlertDescription>
        </Alert>
      )}

      {/* 1. Basic Info */}
      <Card className="border-none shadow-md">
        <CardHeader className="bg-slate-100 py-3 px-4">
          <CardTitle className="text-slate-800 text-sm">1. Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Age *', key: 'age', type: 'number', placeholder: '35' },
              { label: 'Height (cm) *', key: 'height', type: 'number', placeholder: '165' },
              { label: 'Weight (kg) *', key: 'weight', type: 'number', placeholder: '70' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <Input type={type} placeholder={placeholder} disabled={disabled}
                  value={formData.basic_info[key]} className={disabled ? 'bg-gray-50' : ''}
                  onChange={(e) => setFormData({ ...formData, basic_info: { ...formData.basic_info, [key]: e.target.value } })} />
              </div>
            ))}
            <div className="space-y-1">
              <Label className="text-xs">Gender *</Label>
              <Select value={formData.basic_info.gender} disabled={disabled}
                onValueChange={(v) => setFormData({ ...formData, basic_info: { ...formData.basic_info, gender: v } })}>
                <SelectTrigger className={disabled ? 'bg-gray-50' : ''}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">BMI (Auto)</Label>
              <Input type="number" value={formData.basic_info.bmi || ''} disabled className="bg-gray-100" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Activity Level *</Label>
              <Select value={formData.basic_info.activity_level} disabled={disabled}
                onValueChange={(v) => setFormData({ ...formData, basic_info: { ...formData.basic_info, activity_level: v } })}>
                <SelectTrigger className={disabled ? 'bg-gray-50' : ''}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentary</SelectItem>
                  <SelectItem value="lightly_active">Lightly Active</SelectItem>
                  <SelectItem value="moderately_active">Moderately Active</SelectItem>
                  <SelectItem value="very_active">Very Active</SelectItem>
                  <SelectItem value="extremely_active">Extremely Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Health Conditions */}
      <Collapsible open={isHealthConditionsOpen} onOpenChange={setIsHealthConditionsOpen}>
        <Card className="border-none shadow-md">
          <CollapsibleTrigger asChild>
            <CardHeader className="bg-gradient-to-r from-red-500 to-orange-500 text-white cursor-pointer py-3 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">2. Health Conditions *</CardTitle>
              <ChevronDown className={`h-4 w-4 transition-transform ${isHealthConditionsOpen ? 'rotate-180' : ''}`} />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['Diabetes', 'Thyroid', 'Liver', 'Kidney', 'Heart', 'Hormonal', 'Hypertension', 'Others'].map(c => (
                  <div key={c} className="flex items-center space-x-2">
                    <Checkbox checked={formData.health_conditions.includes(c)} disabled={disabled}
                      onCheckedChange={() => handleHealthConditionToggle(c)} />
                    <Label className="cursor-pointer text-sm">{c}</Label>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Stage / Severity</Label>
                <Input placeholder="e.g. Stage 3 CKD" disabled={disabled} value={formData.stage_severity}
                  className={disabled ? 'bg-gray-50' : ''}
                  onChange={(e) => setFormData({ ...formData, stage_severity: e.target.value })} />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* 3. Medications */}
      <Collapsible open={isMedicationsOpen} onOpenChange={setIsMedicationsOpen}>
        <Card className="border-none shadow-md">
          <CollapsibleTrigger asChild>
            <CardHeader className="bg-slate-100 cursor-pointer py-3 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-slate-800 text-sm">3. Current Medications</CardTitle>
              <ChevronDown className={`h-4 w-4 transition-transform text-slate-600 ${isMedicationsOpen ? 'rotate-180' : ''}`} />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-4 space-y-2">
              {!disabled && (
                <Button type="button" variant="secondary" size="sm" onClick={addMedication}>
                  <Plus className="w-4 h-4 mr-1" /> Add Medication
                </Button>
              )}
              {medications.map((med, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-2 bg-gray-50 rounded-lg">
                  <Input placeholder="Name" disabled={disabled} value={med.name} className={disabled ? 'bg-gray-100' : ''}
                    onChange={(e) => updateMedication(i, 'name', e.target.value)} />
                  <Input placeholder="Dosage" disabled={disabled} value={med.dosage} className={disabled ? 'bg-gray-100' : ''}
                    onChange={(e) => updateMedication(i, 'dosage', e.target.value)} />
                  <Input placeholder="Frequency" disabled={disabled} value={med.frequency} className={disabled ? 'bg-gray-100' : ''}
                    onChange={(e) => updateMedication(i, 'frequency', e.target.value)} />
                  {!disabled && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeMedication(i)}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* 4. Lab Values */}
      <Collapsible open={isLabValuesOpen} onOpenChange={setIsLabValuesOpen}>
        <Card className="border-none shadow-md">
          <CollapsibleTrigger asChild>
            <CardHeader className="bg-slate-100 cursor-pointer py-3 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-slate-800 text-sm">4. Lab Values (Optional)</CardTitle>
              <ChevronDown className={`h-4 w-4 transition-transform text-slate-600 ${isLabValuesOpen ? 'rotate-180' : ''}`} />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: 'TSH (mIU/L)', key: 'tsh', placeholder: '0.4-4.0' },
                  { label: 'HbA1c (%)', key: 'hba1c', placeholder: '<5.7' },
                  { label: 'Total Cholesterol', key: 'total_cholesterol', placeholder: '<200' },
                  { label: 'LDL (mg/dL)', key: 'ldl', placeholder: '<100' },
                  { label: 'HDL (mg/dL)', key: 'hdl', placeholder: '>40' },
                  { label: 'Triglycerides', key: 'triglycerides', placeholder: '<150' },
                  { label: 'SGOT (U/L)', key: 'sgot', placeholder: '5-40' },
                  { label: 'SGPT (U/L)', key: 'sgpt', placeholder: '7-56' },
                  { label: 'Creatinine', key: 'creatinine', placeholder: '0.6-1.2' },
                  { label: 'Vitamin D', key: 'vitamin_d', placeholder: '30-100' },
                  { label: 'Vitamin B12', key: 'vitamin_b12', placeholder: '200-900' },
                  { label: 'Urea (mg/dL)', key: 'urea', placeholder: '15-45' },
                  { label: 'BUN (mg/dL)', key: 'bun', placeholder: '7-21' },
                  { label: 'Uric Acid', key: 'uric_acid', placeholder: '3.5-7.2' },
                  { label: 'GFR (mL/min)', key: 'gfr', placeholder: '>90' },
                  { label: 'Sodium', key: 'sodium', placeholder: '135-145' },
                  { label: 'Potassium', key: 'potassium', placeholder: '3.5-5.0' },
                ].map(({ label, key, placeholder }) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <Input type="number" step="0.01" placeholder={placeholder} disabled={disabled}
                      className={disabled ? 'bg-gray-50' : ''}
                      value={formData.lab_values[key] || ''}
                      onChange={(e) => setFormData({ ...formData, lab_values: { ...formData.lab_values, [key]: e.target.value ? parseFloat(e.target.value) : '' } })} />
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* 5. Diet Preferences */}
      <Collapsible open={isDietPreferencesOpen} onOpenChange={setIsDietPreferencesOpen}>
        <Card className="border-none shadow-md">
          <CollapsibleTrigger asChild>
            <CardHeader className="bg-slate-100 cursor-pointer py-3 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-slate-800 text-sm">5. Diet Preferences *</CardTitle>
              <ChevronDown className={`h-4 w-4 transition-transform text-slate-600 ${isDietPreferencesOpen ? 'rotate-180' : ''}`} />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Diet Type *</Label>
                <Select value={formData.diet_type} disabled={disabled}
                  onValueChange={(v) => setFormData({ ...formData, diet_type: v })}>
                  <SelectTrigger className={disabled ? 'bg-gray-50' : ''}><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Veg">Vegetarian</SelectItem>
                    <SelectItem value="Non-Veg">Non-Vegetarian</SelectItem>
                    <SelectItem value="Vegan">Vegan</SelectItem>
                    <SelectItem value="Jain">Jain</SelectItem>
                    <SelectItem value="Eggetarian">Eggetarian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Non-Veg Preferences - always visible */}
              <div className="space-y-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <h4 className="font-semibold text-orange-800 text-sm">🍗 Non-Veg Preferences</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Non-Veg Times in 10 Days</Label>
                    <Select disabled={disabled}
                      value={formData.non_veg_frequency_per_10_days?.toString() || ''}
                      onValueChange={(val) => setFormData({ ...formData, non_veg_frequency_per_10_days: parseInt(val) })}>
                      <SelectTrigger className={disabled ? 'bg-gray-50' : ''}><SelectValue placeholder="Select frequency" /></SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6,7,8,9,10].map(n => (
                          <SelectItem key={n} value={n.toString()}>{n} time{n > 1 ? 's' : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Preferred Meal Times for Non-Veg</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {['breakfast', 'lunch', 'dinner', 'evening_snack'].map(meal => {
                        const selected = (formData.non_veg_preferred_meals || []).includes(meal);
                        return (
                          <button key={meal} type="button" disabled={disabled}
                            onClick={() => !disabled && setFormData(prev => ({
                              ...prev,
                              non_veg_preferred_meals: selected
                                ? (prev.non_veg_preferred_meals || []).filter(m => m !== meal)
                                : [...(prev.non_veg_preferred_meals || []), meal]
                            }))}
                            className={`px-2 py-1 rounded-full text-xs font-medium border-2 transition-all ${selected ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400'}`}>
                            {meal.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Egg Preferences - always visible */}
              <div className="space-y-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-semibold text-yellow-800 text-sm">🥚 Egg Preferences</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Egg Times in 10 Days</Label>
                    <Select disabled={disabled}
                      value={formData.egg_frequency_per_10_days?.toString() || ''}
                      onValueChange={(val) => setFormData({ ...formData, egg_frequency_per_10_days: parseInt(val) })}>
                      <SelectTrigger className={disabled ? 'bg-gray-50' : ''}><SelectValue placeholder="Select frequency" /></SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6,7,8,9,10].map(n => (
                          <SelectItem key={n} value={n.toString()}>{n} time{n > 1 ? 's' : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Preferred Meal Times for Eggs</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {['breakfast', 'lunch', 'dinner', 'evening_snack'].map(meal => {
                        const selected = (formData.egg_preferred_meals || []).includes(meal);
                        return (
                          <button key={meal} type="button" disabled={disabled}
                            onClick={() => !disabled && setFormData(prev => ({
                              ...prev,
                              egg_preferred_meals: selected
                                ? (prev.egg_preferred_meals || []).filter(m => m !== meal)
                                : [...(prev.egg_preferred_meals || []), meal]
                            }))}
                            className={`px-2 py-1 rounded-full text-xs font-medium border-2 transition-all ${selected ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white text-gray-700 border-gray-300 hover:border-yellow-400'}`}>
                            {meal.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {[
                { label: 'Foods You Like', value: likesText, setter: setLikesText, placeholder: 'idli, dosa, brown rice...' },
                { label: 'Foods You Dislike', value: dislikesText, setter: setDislikesText, placeholder: 'bitter gourd, cabbage...' },
                { label: 'Allergies', value: allergiesText, setter: setAllergiesText, placeholder: 'peanuts, dairy...' },
                { label: 'No-Go Foods', value: noGoText, setter: setNoGoText, placeholder: 'onion, garlic...' },
              ].map(({ label, value, setter, placeholder }) => (
                <div key={label} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Textarea rows={2} placeholder={placeholder} disabled={disabled} value={value}
                    className={disabled ? 'bg-gray-50' : ''}
                    onChange={(e) => setter(e.target.value)} />
                </div>
              ))}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* 6. Daily Routine */}
      <Collapsible open={isDailyRoutineOpen} onOpenChange={setIsDailyRoutineOpen}>
        <Card className="border-none shadow-md">
          <CollapsibleTrigger asChild>
            <CardHeader className="bg-slate-100 cursor-pointer py-3 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-slate-800 text-sm">6. Daily Routine & Meal Timings</CardTitle>
              <ChevronDown className={`h-4 w-4 transition-transform text-slate-600 ${isDailyRoutineOpen ? 'rotate-180' : ''}`} />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: 'Wake Up', key: 'wake_up' },
                  { label: 'Breakfast', key: 'breakfast_time' },
                  { label: 'Lunch', key: 'lunch_time' },
                  { label: 'Dinner', key: 'dinner_time' },
                  { label: 'Sleep', key: 'sleep_time' },
                ].map(({ label, key }) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <Input type="time" disabled={disabled} className={disabled ? 'bg-gray-50' : ''}
                      value={formData.daily_routine[key] || ''}
                      onChange={(e) => setFormData({ ...formData, daily_routine: { ...formData.daily_routine, [key]: e.target.value } })} />
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* 7. Goals */}
      <Collapsible open={isGoalsOpen} onOpenChange={setIsGoalsOpen}>
        <Card className="border-none shadow-md">
          <CollapsibleTrigger asChild>
            <CardHeader className="bg-slate-100 cursor-pointer py-3 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-slate-800 text-sm">7. Your Goals *</CardTitle>
              <ChevronDown className={`h-4 w-4 transition-transform text-slate-600 ${isGoalsOpen ? 'rotate-180' : ''}`} />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { value: 'weight_loss', label: '⚖️ Weight Loss' },
                  { value: 'maintenance', label: '🔄 Maintenance' },
                  { value: 'energy', label: '⚡ Energy' },
                  { value: 'symptom_relief', label: '💊 Symptom Relief' },
                  { value: 'disease_reversal', label: '🏥 Disease Reversal' },
                  { value: 'muscle_gain', label: '💪 Muscle Gain' },
                ].map(({ value, label }) => {
                  const selected = formData.goal?.includes(value);
                  return (
                    <button key={value} type="button" disabled={disabled}
                      onClick={() => handleGoalToggle(value)}
                      className={`flex items-center gap-2 p-2 rounded-lg border-2 text-xs font-medium transition-all text-left
                        ${selected ? 'border-green-500 bg-green-50 text-green-800' : 'border-gray-200 bg-white text-gray-700 hover:border-green-300'}
                        ${disabled ? 'cursor-default opacity-80' : 'cursor-pointer'}`}>
                      <div className={`w-3 h-3 rounded border-2 flex items-center justify-center flex-shrink-0
                        ${selected ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                        {selected && <CheckCircle className="w-2 h-2 text-white" />}
                      </div>
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Specific Symptoms for Relief</Label>
                <Textarea rows={3} disabled={disabled} className={disabled ? 'bg-gray-50' : ''}
                  placeholder={"One per line:\nReduce fatigue\nControl blood sugar spikes"}
                  value={symptomGoalsText} onChange={(e) => setSymptomGoalsText(e.target.value)} />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* 8. MPESS */}
      <Collapsible open={isMpessOpen} onOpenChange={setIsMpessOpen}>
        <Card className="border-none shadow-md">
          <CollapsibleTrigger asChild>
            <CardHeader className="bg-slate-100 cursor-pointer py-3 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-slate-800 text-sm">8. MPESS Wellness Integration</CardTitle>
              <ChevronDown className={`h-4 w-4 transition-transform text-slate-600 ${isMpessOpen ? 'rotate-180' : ''}`} />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-4 space-y-2">
              {[
                { key: 'mind', icon: Brain, title: 'Mind', desc: 'Meditation, journaling' },
                { key: 'physical', icon: Heart, title: 'Physical', desc: 'Yoga, movement' },
                { key: 'emotional', icon: Heart, title: 'Emotional', desc: 'Stress management' },
                { key: 'social', icon: Users, title: 'Social', desc: 'Lifestyle habits' },
                { key: 'spiritual', icon: Sparkles, title: 'Spiritual', desc: 'Affirmations' },
              ].map(({ key, icon: Icon, title, desc }) => (
                <div key={key} className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-purple-600" />
                    <div>
                      <p className="font-medium text-sm">{title}</p>
                      <p className="text-xs text-gray-600">{desc}</p>
                    </div>
                  </div>
                  <Checkbox disabled={disabled} checked={formData.mpess_preferences[key]}
                    onCheckedChange={(checked) => !disabled && setFormData({ ...formData, mpess_preferences: { ...formData.mpess_preferences, [key]: checked } })} />
                </div>
              ))}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Action Buttons */}
      {!isViewOnly && (
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}
            className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><CheckCircle className="w-4 h-4 mr-2" /> {prefillData?.id ? 'Update Intake' : 'Save New Intake'}</>}
          </Button>
        </div>
      )}
      {isViewOnly && (
        <div className="flex justify-end pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>Close</Button>
        </div>
      )}
    </form>
  );
}