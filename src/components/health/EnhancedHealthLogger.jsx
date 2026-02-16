import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Smile,
  Frown,
  Meh,
  Zap,
  Moon,
  CloudRain,
  Droplets,
  Dumbbell,
  Activity,
  Plus,
  X,
  Heart,
  AlertCircle
} from "lucide-react";

export default function EnhancedHealthLogger({ formData, setFormData, clientProfile }) {
  const [newSymptom, setNewSymptom] = useState("");
  const [newCraving, setNewCraving] = useState("");

  const commonSymptoms = [
    "Headache", "Fatigue", "Bloating", "Nausea", "Dizziness",
    "Joint Pain", "Muscle Soreness", "Insomnia", "Heartburn", 
    "Constipation", "Diarrhea", "Anxiety", "Brain Fog"
  ];

  const moodIcons = {
    excellent: { icon: Smile, color: "text-green-500", label: "😄 Excellent" },
    good: { icon: Smile, color: "text-blue-500", label: "😊 Good" },
    neutral: { icon: Meh, color: "text-yellow-500", label: "😐 Neutral" },
    poor: { icon: Frown, color: "text-orange-500", label: "😕 Poor" },
    very_poor: { icon: Frown, color: "text-red-500", label: "😢 Very Poor" }
  };

  const addSymptom = (symptom) => {
    const symptoms = formData.symptoms || [];
    if (!symptoms.includes(symptom)) {
      setFormData({
        ...formData,
        symptoms: [...symptoms, symptom]
      });
    }
    setNewSymptom("");
  };

  const removeSymptom = (symptom) => {
    setFormData({
      ...formData,
      symptoms: (formData.symptoms || []).filter(s => s !== symptom)
    });
  };

  const addCraving = () => {
    if (newCraving.trim()) {
      const cravings = formData.wellness_metrics?.cravings || [];
      setFormData({
        ...formData,
        wellness_metrics: {
          ...formData.wellness_metrics,
          cravings: [...cravings, newCraving.trim()]
        }
      });
      setNewCraving("");
    }
  };

  const removeCraving = (index) => {
    const cravings = formData.wellness_metrics?.cravings || [];
    setFormData({
      ...formData,
      wellness_metrics: {
        ...formData.wellness_metrics,
        cravings: cravings.filter((_, i) => i !== index)
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Mood Selection with Visual Feedback */}
      <div className="space-y-3">
        <Label className="text-base font-semibold flex items-center gap-2">
          <Heart className="w-5 h-5 text-pink-500" />
          How are you feeling today?
        </Label>
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(moodIcons).map(([mood, { icon: Icon, color, label }]) => (
            <button
              key={mood}
              type="button"
              onClick={() => setFormData({
                ...formData,
                wellness_metrics: { ...formData.wellness_metrics, mood }
              })}
              className={`p-4 border-2 rounded-xl transition-all ${
                formData.wellness_metrics?.mood === mood
                  ? 'border-orange-500 bg-orange-50 shadow-lg'
                  : 'border-gray-200 hover:border-orange-300'
              }`}
            >
              <Icon className={`w-8 h-8 mx-auto ${color}`} />
              <p className="text-xs mt-2 text-center">{mood.replace('_', ' ')}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Energy, Sleep, Stress with Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            Energy Level: <span className="font-bold">{formData.wellness_metrics?.energy_level || 5}/10</span>
          </Label>
          <Slider
            value={[formData.wellness_metrics?.energy_level || 5]}
            onValueChange={([value]) => setFormData({
              ...formData,
              wellness_metrics: { ...formData.wellness_metrics, energy_level: value }
            })}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-indigo-500" />
            Sleep Quality: <span className="font-bold">{formData.wellness_metrics?.sleep_quality || 5}/10</span>
          </Label>
          <Slider
            value={[formData.wellness_metrics?.sleep_quality || 5]}
            onValueChange={([value]) => setFormData({
              ...formData,
              wellness_metrics: { ...formData.wellness_metrics, sleep_quality: value }
            })}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Poor</span>
            <span>Great</span>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-red-500" />
            Stress Level: <span className="font-bold">{formData.wellness_metrics?.stress_level || 5}/10</span>
          </Label>
          <Slider
            value={[formData.wellness_metrics?.stress_level || 5]}
            onValueChange={([value]) => setFormData({
              ...formData,
              wellness_metrics: { ...formData.wellness_metrics, stress_level: value }
            })}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-indigo-500" />
            Sleep Hours
          </Label>
          <Input
            type="number"
            step="0.5"
            min="0"
            max="24"
            value={formData.wellness_metrics?.sleep_hours || ''}
            onChange={(e) => setFormData({
              ...formData,
              wellness_metrics: { ...formData.wellness_metrics, sleep_hours: parseFloat(e.target.value) || 0 }
            })}
            placeholder="7.5"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-blue-500" />
            Water Intake (liters)
          </Label>
          <Input
            type="number"
            step="0.5"
            min="0"
            value={formData.wellness_metrics?.water_intake || ''}
            onChange={(e) => setFormData({
              ...formData,
              wellness_metrics: { ...formData.wellness_metrics, water_intake: parseFloat(e.target.value) || 0 }
            })}
            placeholder="2.5"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-green-500" />
            Exercise (minutes)
          </Label>
          <Input
            type="number"
            min="0"
            value={formData.wellness_metrics?.exercise_minutes || ''}
            onChange={(e) => setFormData({
              ...formData,
              wellness_metrics: { ...formData.wellness_metrics, exercise_minutes: parseInt(e.target.value) || 0 }
            })}
            placeholder="30"
          />
        </div>
      </div>

      {/* Digestion & Hunger */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Digestion Quality (1-10)</Label>
          <Slider
            value={[formData.wellness_metrics?.digestion_quality || 5]}
            onValueChange={([value]) => setFormData({
              ...formData,
              wellness_metrics: { ...formData.wellness_metrics, digestion_quality: value }
            })}
            min={1}
            max={10}
            step={1}
          />
          <p className="text-sm text-center font-semibold">{formData.wellness_metrics?.digestion_quality || 5}/10</p>
        </div>

        <div className="space-y-2">
          <Label>Hunger Levels</Label>
          <Select
            value={formData.wellness_metrics?.hunger_levels || ''}
            onValueChange={(value) => setFormData({
              ...formData,
              wellness_metrics: { ...formData.wellness_metrics, hunger_levels: value }
            })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select hunger level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="very_low">Very Low</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="very_high">Very High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Bowel Movement</Label>
          <Select
            value={formData.wellness_metrics?.bowel_movement || ''}
            onValueChange={(value) => setFormData({
              ...formData,
              wellness_metrics: { ...formData.wellness_metrics, bowel_movement: value }
            })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select pattern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="irregular">Irregular</SelectItem>
              <SelectItem value="constipation">Constipation</SelectItem>
              <SelectItem value="diarrhea">Diarrhea</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Symptoms Tracking */}
      <div className="space-y-3 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
        <Label className="text-base font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          Symptoms Experienced Today
        </Label>
        
        <div className="flex flex-wrap gap-2">
          {commonSymptoms.map(symptom => (
            <Badge
              key={symptom}
              variant={(formData.symptoms || []).includes(symptom) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => {
                if ((formData.symptoms || []).includes(symptom)) {
                  removeSymptom(symptom);
                } else {
                  addSymptom(symptom);
                }
              }}
            >
              {symptom}
            </Badge>
          ))}
        </div>

        {(formData.symptoms || []).length > 0 && (
          <div className="mt-3 space-y-2">
            <Label className="text-sm">Selected Symptoms:</Label>
            <div className="flex flex-wrap gap-2">
              {(formData.symptoms || []).map((symptom, idx) => (
                <Badge key={idx} className="bg-red-500 text-white">
                  {symptom}
                  <button
                    type="button"
                    onClick={() => removeSymptom(symptom)}
                    className="ml-2 hover:bg-red-600 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Add custom symptom..."
            value={newSymptom}
            onChange={(e) => setNewSymptom(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), newSymptom && addSymptom(newSymptom))}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => newSymptom && addSymptom(newSymptom)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Cravings */}
      <div className="space-y-3 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
        <Label className="text-base font-semibold">Food Cravings</Label>
        
        {(formData.wellness_metrics?.cravings || []).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {(formData.wellness_metrics?.cravings || []).map((craving, idx) => (
              <Badge key={idx} className="bg-yellow-500 text-white">
                {craving}
                <button
                  type="button"
                  onClick={() => removeCraving(idx)}
                  className="ml-2 hover:bg-yellow-600 rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="What did you crave? (e.g., Sugar, Chocolate)"
            value={newCraving}
            onChange={(e) => setNewCraving(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCraving())}
          />
          <Button type="button" variant="outline" onClick={addCraving}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* For Female Clients - Menstrual Tracking */}
      {clientProfile?.gender === 'female' && (
        <div className="space-y-3 p-4 bg-pink-50 border-2 border-pink-200 rounded-lg">
          <Label className="text-base font-semibold">Menstrual Cycle Tracking</Label>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Cycle Day</Label>
              <Input
                type="number"
                min="1"
                max="35"
                value={formData.wellness_metrics?.menstrual_cycle_day || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  wellness_metrics: {
                    ...formData.wellness_metrics,
                    menstrual_cycle_day: parseInt(e.target.value) || 0
                  }
                })}
                placeholder="Day of cycle"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Symptoms (if any)</Label>
            <div className="flex flex-wrap gap-2">
              {['Cramps', 'Bloating', 'Mood Swings', 'Fatigue', 'Headache', 'Tender Breasts'].map(symptom => (
                <Badge
                  key={symptom}
                  variant={(formData.wellness_metrics?.menstrual_symptoms || []).includes(symptom) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    const symptoms = formData.wellness_metrics?.menstrual_symptoms || [];
                    setFormData({
                      ...formData,
                      wellness_metrics: {
                        ...formData.wellness_metrics,
                        menstrual_symptoms: symptoms.includes(symptom)
                          ? symptoms.filter(s => s !== symptom)
                          : [...symptoms, symptom]
                      }
                    });
                  }}
                >
                  {symptom}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <Droplets className="w-4 h-4 text-blue-500" />
            Water (liters)
          </Label>
          <Input
            type="number"
            step="0.5"
            min="0"
            value={formData.wellness_metrics?.water_intake || ''}
            onChange={(e) => setFormData({
              ...formData,
              wellness_metrics: { ...formData.wellness_metrics, water_intake: parseFloat(e.target.value) || 0 }
            })}
            placeholder="2.5"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <Dumbbell className="w-4 h-4 text-green-500" />
            Exercise (min)
          </Label>
          <Input
            type="number"
            min="0"
            value={formData.wellness_metrics?.exercise_minutes || ''}
            onChange={(e) => setFormData({
              ...formData,
              wellness_metrics: { ...formData.wellness_metrics, exercise_minutes: parseInt(e.target.value) || 0 }
            })}
            placeholder="30"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <Moon className="w-4 h-4 text-indigo-500" />
            Sleep (hours)
          </Label>
          <Input
            type="number"
            step="0.5"
            min="0"
            max="24"
            value={formData.wellness_metrics?.sleep_hours || ''}
            onChange={(e) => setFormData({
              ...formData,
              wellness_metrics: { ...formData.wellness_metrics, sleep_hours: parseFloat(e.target.value) || 0 }
            })}
            placeholder="7.5"
          />
        </div>
      </div>
    </div>
  );
}