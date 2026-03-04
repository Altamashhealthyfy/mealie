import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Stethoscope, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function InlineProPlanForm({ client, onSuccess, onCancel }) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    client_id: client.id,
    intake_date: format(new Date(), 'yyyy-MM-dd'),
    basic_info: {
      age: client.age || '',
      gender: client.gender || '',
      height: client.height || '',
      weight: client.weight || '',
      bmi: client.height && client.weight ? (client.weight / ((client.height / 100) ** 2)).toFixed(1) : '',
      activity_level: client.activity_level || ''
    },
    health_conditions: [],
    diet_type: client.food_preference === 'veg' ? 'Veg' : client.food_preference === 'non_veg' ? 'Non-Veg' : 'Veg',
    goal: client.goal ? [client.goal] : [],
    completed: false
  });

  const handleHealthConditionToggle = (condition) => {
    setFormData(prev => ({
      ...prev,
      health_conditions: prev.health_conditions.includes(condition)
        ? prev.health_conditions.filter(c => c !== condition)
        : [...prev.health_conditions, condition]
    }));
  };

  const handleGoalToggle = (goal) => {
    setFormData(prev => ({
      ...prev,
      goal: prev.goal.includes(goal)
        ? prev.goal.filter(g => g !== goal)
        : [...prev.goal, goal]
    }));
  };

  const handleSubmit = async () => {
    if (!formData.health_conditions.length) {
      toast.error('Please select at least one health condition');
      return;
    }
    if (!formData.goal?.length) {
      toast.error('Please select at least one goal');
      return;
    }

    setSaving(true);
    try {
      const finalData = {
        ...formData,
        basic_info: {
          ...formData.basic_info,
          age: parseFloat(formData.basic_info.age) || 0,
          height: parseFloat(formData.basic_info.height) || 0,
          weight: parseFloat(formData.basic_info.weight) || 0,
          bmi: parseFloat(formData.basic_info.bmi) || 0,
        },
        completed: true
      };

      await base44.entities.ClinicalIntake.create(finalData);
      toast.success('✅ Clinical intake saved! You can now generate pro plan.');
      onSuccess();
    } catch (error) {
      console.error("Save error:", error);
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert className="bg-purple-50 border-purple-300">
        <AlertDescription className="text-xs">
          Complete this quick clinical intake to generate a disease-specific pro meal plan
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Health Conditions *</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {['Diabetes', 'Thyroid', 'Liver', 'Kidney', 'Heart', 'Hormonal', 'Hypertension', 'Others'].map(condition => (
              <div key={condition} className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.health_conditions.includes(condition)}
                  onCheckedChange={() => handleHealthConditionToggle(condition)}
                />
                <Label className="text-xs cursor-pointer">{condition}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Goals *</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'weight_loss', label: 'Weight Loss' },
              { value: 'maintenance', label: 'Maintenance' },
              { value: 'energy', label: 'Energy' },
              { value: 'symptom_relief', label: 'Symptom Relief' },
              { value: 'disease_reversal', label: 'Disease Reversal' },
            ].map(({ value, label }) => (
              <div key={value} className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.goal?.includes(value)}
                  onCheckedChange={() => handleGoalToggle(value)}
                />
                <Label className="text-xs cursor-pointer">{label}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 text-xs"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-xs"
        >
          {saving ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="w-3 h-3 mr-1" />
              Save & Continue
            </>
          )}
        </Button>
      </div>
    </div>
  );
}