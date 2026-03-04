import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Plus, X, CheckCircle, AlertTriangle, Edit2 } from "lucide-react";

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.9
};

function calcMetrics(intake, client) {
  const gender = intake.basic_info?.gender || client?.gender || 'female';
  const weight = parseFloat(intake.basic_info?.weight || client?.weight) || 60;
  const height = parseFloat(intake.basic_info?.height || client?.height) || 160;
  const age = parseFloat(intake.basic_info?.age || client?.age) || 30;
  const activityLevel = intake.basic_info?.activity_level || client?.activity_level || 'sedentary';

  const bmr = gender === 'male'
    ? (10 * weight) + (6.25 * height) - (5 * age) + 5
    : (10 * weight) + (6.25 * height) - (5 * age) - 161;

  const tdee = bmr * (ACTIVITY_MULTIPLIERS[activityLevel] || 1.2);
  const goals = Array.isArray(intake.goal) ? intake.goal : (intake.goal ? [intake.goal] : []);
  let targetCalories;
  if (goals.includes('weight_loss')) {
    targetCalories = Math.round(tdee - 400);
  } else if (goals.includes('muscle_gain') || goals.includes('weight_gain')) {
    targetCalories = Math.round(tdee + 300);
  } else {
    targetCalories = Math.round(tdee);
  }
  targetCalories = Math.max(1200, Math.min(2800, targetCalories));

  // Macros
  const proteinG = Math.round(weight * 1.2);
  const fatsG = Math.round((targetCalories * 0.25) / 9);
  const carbsG = Math.round((targetCalories - (proteinG * 4) - (fatsG * 9)) / 4);

  return { bmr: Math.round(bmr), tdee: Math.round(tdee), targetCalories, proteinG, fatsG, carbsG, goals, weight, height, age, gender, activityLevel };
}

function generateDefaultRules(intake, client) {
  const metrics = calcMetrics(intake, client);
  const conditions = intake.health_conditions || [];
  const rules = [];

  // Calorie rule
  rules.push(`Daily calorie target: ${metrics.targetCalories} kcal (BMR: ${metrics.bmr}, TDEE: ${metrics.tdee}, Goal: ${metrics.goals.join(', ') || 'maintenance'})`);

  // Macros
  rules.push(`Macros: Protein ~${metrics.proteinG}g | Carbs ~${metrics.carbsG}g | Fats ~${metrics.fatsG}g`);

  // Disease-specific rules
  if (conditions.includes('Diabetes')) {
    rules.push('Diabetes: Low GI foods, avoid refined sugars, limit rice to 4-5 days, prioritize complex carbs and fibre');
    rules.push('Diabetes: Include methi, karela, jamun, cinnamon regularly; control portion sizes');
    const hba1c = intake.lab_values?.hba1c;
    if (hba1c) rules.push(`HbA1c: ${hba1c}% — ${hba1c > 8 ? 'High — strict carb control required' : hba1c > 6.5 ? 'Moderate — monitor carb timing' : 'Within range — maintain current approach'}`);
  }
  if (conditions.includes('Thyroid')) {
    rules.push('Thyroid: Avoid raw cruciferous vegetables (goitrogens) in large quantities; prefer cooked form');
    rules.push('Thyroid: Include selenium-rich foods (nuts, seeds); ensure adequate iodine intake');
    const tsh = intake.lab_values?.tsh;
    if (tsh) rules.push(`TSH: ${tsh} mIU/L — ${tsh > 4.5 ? 'Hypothyroid — calorie-controlled, high fibre' : tsh < 0.4 ? 'Hyperthyroid — higher calorie needs' : 'Normal range'}`);
  }
  if (conditions.includes('Kidney')) {
    rules.push('Kidney: Restrict protein (0.8g/kg), potassium, phosphorus, and sodium as per GFR stage');
    rules.push('Kidney: Avoid high-potassium foods (bananas, tomatoes, spinach in large qty); prefer leached vegetables');
    const gfr = intake.lab_values?.gfr;
    const creatinine = intake.lab_values?.creatinine;
    if (gfr) rules.push(`GFR: ${gfr} mL/min — ${gfr < 30 ? 'Stage 4-5: Strict restriction needed' : gfr < 60 ? 'Stage 3: Moderate restriction' : 'Stage 1-2: Mild restriction'}`);
    if (creatinine) rules.push(`Creatinine: ${creatinine} mg/dL — ${creatinine > 1.5 ? 'Elevated — reduce protein load' : 'Within range'}`);
  }
  if (conditions.includes('Heart')) {
    rules.push('Heart: DASH diet approach, restrict sodium <1500mg/day, avoid saturated fats and trans fats');
    rules.push('Heart: Include omega-3 rich foods (flaxseeds, walnuts, fish); prefer steamed/grilled cooking');
    const cholesterol = intake.lab_values?.total_cholesterol;
    if (cholesterol) rules.push(`Total Cholesterol: ${cholesterol} mg/dL — ${cholesterol > 200 ? 'High — restrict dietary cholesterol, increase soluble fibre' : 'Within range'}`);
  }
  if (conditions.includes('Hypertension')) {
    rules.push('Hypertension: DASH diet, sodium <1500mg/day, increase potassium-rich foods, avoid pickles/processed foods');
  }
  if (conditions.includes('Liver')) {
    rules.push('Liver: Avoid fried/fatty foods, alcohol, raw shellfish; prefer easy-to-digest foods with adequate protein');
    const sgpt = intake.lab_values?.sgpt;
    const sgot = intake.lab_values?.sgot;
    if (sgpt) rules.push(`SGPT: ${sgpt} U/L — ${sgpt > 56 ? 'Elevated — strict fat restriction and no alcohol' : 'Normal'}`);
    if (sgot) rules.push(`SGOT: ${sgot} U/L — ${sgot > 40 ? 'Elevated — liver-protective diet required' : 'Normal'}`);
  }
  if (conditions.includes('Hormonal')) {
    rules.push('Hormonal: Anti-inflammatory diet, avoid processed foods and refined sugar; include phytoestrogen-rich foods');
    rules.push('Hormonal (PCOS if applicable): Low GI, high fibre, regular meal timings, avoid dairy in excess');
  }

  // Weight loss specific
  if (metrics.goals.includes('weight_loss')) {
    rules.push('Weight Loss: Pre-meal water (1 glass 30 min before lunch and dinner); light dinners; no dairy after 7 PM');
    rules.push(`Weight Loss: Caloric deficit of 400 kcal from TDEE (${metrics.tdee} kcal) = Target ${metrics.targetCalories} kcal`);
  }

  // Medication conflicts
  const meds = (intake.current_medications || []).filter(m => m.name);
  if (meds.length > 0) {
    rules.push(`Medications (${meds.map(m => m.name).join(', ')}): Check for food-drug interactions; avoid grapefruit with statins, consistent Vitamin K intake with blood thinners`);
  }

  // Diet type
  rules.push(`Diet type: ${intake.diet_type || 'Not specified'} — Meal options selected accordingly`);

  // Conflict resolution if multiple conditions
  if (conditions.length > 1) {
    rules.push(`Multi-condition conflict hierarchy: Kidney > Diabetes > Heart > Thyroid — stricter condition takes priority when restrictions conflict`);
  }

  return rules;
}

export default function DiagnosticReview({ client, intake, foodPreferences, numberOfDays, mealPattern, onConfirm }) {
  const metrics = calcMetrics(intake, client);
  const [rules, setRules] = useState([]);
  const [newRule, setNewRule] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingText, setEditingText] = useState("");

  useEffect(() => {
    setRules(generateDefaultRules(intake, client));
  }, [intake, client]);

  const addRule = () => {
    if (newRule.trim()) {
      setRules([...rules, newRule.trim()]);
      setNewRule("");
    }
  };

  const removeRule = (index) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const startEdit = (index) => {
    setEditingIndex(index);
    setEditingText(rules[index]);
  };

  const saveEdit = () => {
    if (editingText.trim()) {
      const updated = [...rules];
      updated[editingIndex] = editingText.trim();
      setRules(updated);
    }
    setEditingIndex(null);
    setEditingText("");
  };

  const handleConfirm = () => {
    onConfirm(rules);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl p-5">
        <h2 className="text-xl font-bold mb-1">🔬 Diagnostic Review & Decision Rules</h2>
        <p className="text-indigo-100 text-sm">
          Review the computed diagnostics and clinical decision rules. Edit, add, or remove rules before generating the meal plan.
        </p>
      </div>

      {/* Client Summary */}
      <Card className="border-none shadow-md">
        <CardHeader className="bg-slate-50 pb-3">
          <CardTitle className="text-base text-slate-700">Client: {client?.full_name}</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Age / Gender', value: `${metrics.age}y / ${metrics.gender}` },
              { label: 'Height / Weight', value: `${metrics.height}cm / ${metrics.weight}kg` },
              { label: 'Activity Level', value: metrics.activityLevel.replace(/_/g, ' ') },
              { label: 'Conditions', value: (intake.health_conditions || []).join(', ') || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-sm font-semibold text-gray-800 capitalize">{value}</p>
              </div>
            ))}
          </div>

          {/* Calorie & Macro Calculations */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'BMR', value: `${metrics.bmr}`, unit: 'kcal/day', color: 'text-blue-600' },
              { label: 'TDEE', value: `${metrics.tdee}`, unit: 'kcal/day', color: 'text-cyan-600' },
              { label: 'Target Calories', value: `${metrics.targetCalories}`, unit: 'kcal/day', color: 'text-orange-600' },
              { label: 'Protein', value: `${metrics.proteinG}g`, unit: '/day', color: 'text-red-600' },
              { label: 'Carbs / Fats', value: `${metrics.carbsG}g / ${metrics.fatsG}g`, unit: '/day', color: 'text-purple-600' },
            ].map(({ label, value, unit, color }) => (
              <div key={label} className="text-center bg-gray-50 rounded-xl p-3 border">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`text-lg font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-400">{unit}</p>
              </div>
            ))}
          </div>

          {/* Lab Values Highlight */}
          {intake.lab_values && Object.keys(intake.lab_values).filter(k => intake.lab_values[k] !== '' && intake.lab_values[k] != null).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(intake.lab_values).filter(([, v]) => v !== '' && v != null).map(([key, val]) => (
                <Badge key={key} variant="outline" className="text-xs">
                  {key.replace(/_/g, ' ').toUpperCase()}: {val}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decision Rules */}
      <Card className="border-none shadow-md">
        <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Clinical Decision Rules ({rules.length})
          </CardTitle>
          <p className="text-green-50 text-sm mt-1">These rules will guide the AI meal plan generation. Edit freely.</p>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {rules.map((rule, index) => (
            <div key={index} className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-100">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              {editingIndex === index ? (
                <div className="flex-1 flex gap-2">
                  <Input
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    className="text-sm flex-1"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                  />
                  <Button size="sm" onClick={saveEdit} className="bg-green-600 hover:bg-green-700 shrink-0">Save</Button>
                </div>
              ) : (
                <span className="flex-1 text-sm text-gray-700">{rule}</span>
              )}
              {editingIndex !== index && (
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => startEdit(index)} className="text-blue-400 hover:text-blue-600">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => removeRule(index)} className="text-red-400 hover:text-red-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Add Rule */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-dashed border-gray-200">
            <Input
              placeholder="Add a custom decision rule..."
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addRule()}
              className="text-sm"
            />
            <Button onClick={addRule} size="sm" className="bg-green-600 hover:bg-green-700 shrink-0">
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Food Preferences Summary */}
      {foodPreferences && (
        <Card className="border-none shadow-md">
          <CardHeader className="bg-purple-50 border-b">
            <CardTitle className="text-base text-purple-800">Food Preferences Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { label: '✅ Recommended', items: foodPreferences.recommendedFoods || [], color: 'bg-green-100 text-green-800' },
                { label: '❤️ Liked', items: foodPreferences.likedFoods || [], color: 'bg-blue-100 text-blue-800' },
                { label: '❌ Disliked', items: foodPreferences.dislikedFoods || [], color: 'bg-red-100 text-red-800' },
              ].map(({ label, items, color }) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-gray-600 mb-2">{label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {items.length > 0 ? items.map(f => (
                      <Badge key={f} className={`text-xs ${color}`}>{f}</Badge>
                    )) : <span className="text-xs text-gray-400 italic">None specified</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Alert className="bg-amber-50 border-amber-300">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-sm text-amber-900">
          <strong>Review carefully before generating.</strong> The AI will strictly follow these decision rules. Make sure all conditions, lab values, and dietary restrictions are correctly captured.
        </AlertDescription>
      </Alert>

      {/* Generate Button */}
      <Button
        onClick={handleConfirm}
        className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-purple-500 to-indigo-500 hover:opacity-90"
      >
        <Sparkles className="w-5 h-5 mr-2" />
        Generate Therapeutic Meal Plan →
      </Button>
    </div>
  );
}