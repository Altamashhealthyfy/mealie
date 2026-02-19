import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Users, Plus, X } from "lucide-react";

const COMMON_CONDITIONS = [
  { key: "diabetes", label: "Diabetes (Type 1 or 2)" },
  { key: "hypertension", label: "Hypertension" },
  { key: "heart_disease", label: "Heart Disease / CAD" },
  { key: "stroke", label: "Stroke" },
  { key: "cancer", label: "Cancer (any type)" },
  { key: "thyroid", label: "Thyroid Disorders" },
  { key: "pcos", label: "PCOS / Hormonal Issues" },
  { key: "kidney_disease", label: "Kidney Disease" },
  { key: "obesity", label: "Obesity" },
  { key: "osteoporosis", label: "Osteoporosis" },
  { key: "alzheimers", label: "Alzheimer's / Dementia" },
  { key: "asthma", label: "Asthma / Respiratory" },
];

export default function FamilyHistorySection({ formData, onChange }) {
  const fh = formData.family_history || {};
  const conditions = fh.conditions || {};
  const [customCondition, setCustomCondition] = useState("");

  const setFH = (key, value) => onChange({ ...formData, family_history: { ...fh, [key]: value } });
  const toggleCondition = (key) => setFH('conditions', { ...conditions, [key]: !conditions[key] });

  const addCustom = () => {
    const trimmed = customCondition.trim();
    if (!trimmed) return;
    setFH('conditions', { ...conditions, [trimmed]: true });
    setCustomCondition("");
  };

  const customKeys = Object.keys(conditions).filter(k => !COMMON_CONDITIONS.find(c => c.key === k));

  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-teal-50 to-cyan-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-teal-600" />
          Family Health History
        </CardTitle>
        <CardDescription>Hereditary conditions that may influence your health plan</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Common conditions */}
        <div>
          <Label className="text-sm font-semibold text-gray-700 mb-3 block">Known Hereditary Conditions</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COMMON_CONDITIONS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-teal-50 transition-colors">
                <Checkbox
                  id={`fh_${key}`}
                  checked={!!conditions[key]}
                  onCheckedChange={() => toggleCondition(key)}
                  className="border-teal-400"
                />
                <label htmlFor={`fh_${key}`} className="text-sm cursor-pointer text-gray-700">{label}</label>
              </div>
            ))}
          </div>
        </div>

        {/* Custom conditions */}
        {customKeys.length > 0 && (
          <div>
            <Label className="text-xs text-gray-500 mb-2 block">Additional Conditions</Label>
            <div className="flex flex-wrap gap-2">
              {customKeys.map(k => (
                <span key={k} className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm">
                  {k}
                  <button onClick={() => {
                    const updated = { ...conditions };
                    delete updated[k];
                    setFH('conditions', updated);
                  }}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Add custom */}
        <div className="flex gap-2">
          <Input
            placeholder="Add other condition..."
            value={customCondition}
            onChange={e => setCustomCondition(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustom())}
            className="flex-1"
          />
          <Button type="button" variant="outline" onClick={addCustom} className="border-teal-400 text-teal-700">
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>

        {/* Relatives affected */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Family Members Affected</Label>
            <Input
              placeholder="e.g. Father, Maternal grandmother"
              value={fh.relatives_affected || ''}
              onChange={e => setFH('relatives_affected', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Prevalent Condition in Family</Label>
            <Input
              placeholder="Most common condition"
              value={fh.primary_concern || ''}
              onChange={e => setFH('primary_concern', e.target.value)}
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Additional Notes</Label>
          <Textarea
            placeholder="Any relevant family health information your coach should know..."
            className="resize-none h-20"
            value={fh.notes || ''}
            onChange={e => setFH('notes', e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}