import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity } from "lucide-react";

export default function HealthMetricsSection({ formData, onChange }) {
  const m = formData.health_metrics || {};
  const set = (key, value) => onChange({ ...formData, health_metrics: { ...m, [key]: value } });

  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-rose-50 to-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-rose-500" />
          Health Metrics
        </CardTitle>
        <CardDescription>Blood pressure, cholesterol, blood sugar and other key markers</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Blood Pressure */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">Blood Pressure (mmHg)</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Systolic</Label>
              <Input type="number" placeholder="e.g. 120" value={m.bp_systolic || ''} onChange={e => set('bp_systolic', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Diastolic</Label>
              <Input type="number" placeholder="e.g. 80" value={m.bp_diastolic || ''} onChange={e => set('bp_diastolic', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Cholesterol */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">Cholesterol (mg/dL)</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: 'total_cholesterol', label: 'Total' },
              { key: 'ldl', label: 'LDL' },
              { key: 'hdl', label: 'HDL' },
              { key: 'triglycerides', label: 'Triglycerides' },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs text-gray-500">{label}</Label>
                <Input type="number" placeholder="mg/dL" value={m[key] || ''} onChange={e => set(key, e.target.value)} />
              </div>
            ))}
          </div>
        </div>

        {/* Blood Sugar */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">Blood Sugar</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Fasting (mg/dL)</Label>
              <Input type="number" placeholder="e.g. 90" value={m.fasting_glucose || ''} onChange={e => set('fasting_glucose', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Post-Prandial (mg/dL)</Label>
              <Input type="number" placeholder="e.g. 140" value={m.pp_glucose || ''} onChange={e => set('pp_glucose', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">HbA1c (%)</Label>
              <Input type="number" step="0.1" placeholder="e.g. 5.7" value={m.hba1c || ''} onChange={e => set('hba1c', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Thyroid */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">Thyroid</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: 'tsh', label: 'TSH (mIU/L)' },
              { key: 't3', label: 'T3 (ng/dL)' },
              { key: 't4', label: 'T4 (μg/dL)' },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs text-gray-500">{label}</Label>
                <Input type="number" step="0.01" placeholder="Value" value={m[key] || ''} onChange={e => set(key, e.target.value)} />
              </div>
            ))}
          </div>
        </div>

        {/* Other Markers */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">Other Markers</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Haemoglobin (g/dL)</Label>
              <Input type="number" step="0.1" placeholder="e.g. 13.5" value={m.haemoglobin || ''} onChange={e => set('haemoglobin', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Vitamin D (ng/mL)</Label>
              <Input type="number" step="0.1" placeholder="e.g. 40" value={m.vitamin_d || ''} onChange={e => set('vitamin_d', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Vitamin B12 (pg/mL)</Label>
              <Input type="number" placeholder="e.g. 400" value={m.vitamin_b12 || ''} onChange={e => set('vitamin_b12', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Uric Acid (mg/dL)</Label>
              <Input type="number" step="0.1" placeholder="e.g. 5.0" value={m.uric_acid || ''} onChange={e => set('uric_acid', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Creatinine (mg/dL)</Label>
              <Input type="number" step="0.01" placeholder="e.g. 0.9" value={m.creatinine || ''} onChange={e => set('creatinine', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Resting Heart Rate (bpm)</Label>
              <Input type="number" placeholder="e.g. 72" value={m.resting_heart_rate || ''} onChange={e => set('resting_heart_rate', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Date of last test */}
        <div className="space-y-1">
          <Label className="text-xs text-gray-500">Date of Last Lab Test</Label>
          <Input type="date" value={m.last_lab_date || ''} onChange={e => set('last_lab_date', e.target.value)} className="max-w-xs" />
        </div>
      </CardContent>
    </Card>
  );
}