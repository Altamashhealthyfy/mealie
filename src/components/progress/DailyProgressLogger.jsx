import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Scale, Moon, Battery, Brain, Heart, Droplets, Activity, Utensils, Calendar, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DailyProgressLogger({ clientProfile, existingLog, onSuccess }) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const [logData, setLogData] = useState(existingLog || {
    date: today,
    weight: clientProfile?.weight || '',
    wellness_metrics: {
      mood: 'neutral',
      energy_level: 5,
      sleep_quality: 5,
      sleep_hours: 7,
      stress_level: 5,
      water_intake: 2,
      exercise_minutes: 30
    },
    meal_adherence: 80,
    symptoms: [],
    notes: ''
  });

  const [newSymptom, setNewSymptom] = useState('');

  const saveLogMutation = useMutation({
    mutationFn: async (data) => {
      if (existingLog?.id) {
        return await base44.entities.ProgressLog.update(existingLog.id, data);
      }
      return await base44.entities.ProgressLog.create({
        ...data,
        client_id: clientProfile.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['progressLogs']);
      queryClient.invalidateQueries(['todayProgress']);
      toast.success('Progress logged successfully!');
      if (onSuccess) onSuccess();
    },
    onError: () => toast.error('Failed to save progress')
  });

  const handleSave = () => {
    if (!logData.weight && !logData.wellness_metrics.energy_level) {
      toast.error('Please log at least your weight or energy level');
      return;
    }
    saveLogMutation.mutate(logData);
  };

  const moodOptions = [
    { value: 'very_poor', label: '😢 Very Poor', color: 'bg-red-100 text-red-700' },
    { value: 'poor', label: '😕 Poor', color: 'bg-orange-100 text-orange-700' },
    { value: 'neutral', label: '😐 Okay', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'good', label: '🙂 Good', color: 'bg-green-100 text-green-700' },
    { value: 'excellent', label: '😄 Excellent', color: 'bg-blue-100 text-blue-700' }
  ];

  const addSymptom = () => {
    if (newSymptom.trim()) {
      setLogData({
        ...logData,
        symptoms: [...(logData.symptoms || []), newSymptom.trim()]
      });
      setNewSymptom('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Weight */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="w-5 h-5 text-purple-500" />
            Weight
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.1"
              placeholder="Enter weight"
              value={logData.weight}
              onChange={(e) => setLogData({ ...logData, weight: parseFloat(e.target.value) })}
              className="max-w-32"
            />
            <span className="text-sm text-gray-600">kg</span>
          </div>
        </CardContent>
      </Card>

      {/* Mood */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            How are you feeling today?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {moodOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setLogData({
                  ...logData,
                  wellness_metrics: { ...logData.wellness_metrics, mood: option.value }
                })}
                className={`p-3 rounded-lg border-2 transition text-sm font-medium ${
                  logData.wellness_metrics.mood === option.value
                    ? `${option.color} border-current`
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Energy, Sleep, Stress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Battery className="w-5 h-5 text-green-500" />
            Wellness Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Battery className="w-4 h-4" />
                Energy Level
              </label>
              <span className="text-sm font-bold text-green-600">{logData.wellness_metrics.energy_level}/10</span>
            </div>
            <Slider
              value={[logData.wellness_metrics.energy_level]}
              onValueChange={([value]) => setLogData({
                ...logData,
                wellness_metrics: { ...logData.wellness_metrics, energy_level: value }
              })}
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Moon className="w-4 h-4" />
                Sleep Quality
              </label>
              <span className="text-sm font-bold text-blue-600">{logData.wellness_metrics.sleep_quality}/10</span>
            </div>
            <Slider
              value={[logData.wellness_metrics.sleep_quality]}
              onValueChange={([value]) => setLogData({
                ...logData,
                wellness_metrics: { ...logData.wellness_metrics, sleep_quality: value }
              })}
              max={10}
              min={1}
              step={1}
            />
            <div className="flex items-center gap-2 mt-2">
              <Input
                type="number"
                step="0.5"
                placeholder="Hours"
                value={logData.wellness_metrics.sleep_hours}
                onChange={(e) => setLogData({
                  ...logData,
                  wellness_metrics: { ...logData.wellness_metrics, sleep_hours: parseFloat(e.target.value) }
                })}
                className="max-w-24"
              />
              <span className="text-sm text-gray-600">hours of sleep</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Stress Level
              </label>
              <span className="text-sm font-bold text-orange-600">{logData.wellness_metrics.stress_level}/10</span>
            </div>
            <Slider
              value={[logData.wellness_metrics.stress_level]}
              onValueChange={([value]) => setLogData({
                ...logData,
                wellness_metrics: { ...logData.wellness_metrics, stress_level: value }
              })}
              max={10}
              min={1}
              step={1}
            />
          </div>
        </CardContent>
      </Card>

      {/* Water & Exercise */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Droplets className="w-5 h-5 text-blue-500" />
            Water & Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-blue-500" />
            <Input
              type="number"
              step="0.5"
              placeholder="Liters"
              value={logData.wellness_metrics.water_intake}
              onChange={(e) => setLogData({
                ...logData,
                wellness_metrics: { ...logData.wellness_metrics, water_intake: parseFloat(e.target.value) }
              })}
              className="max-w-24"
            />
            <span className="text-sm text-gray-600">liters of water</span>
          </div>

          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-500" />
            <Input
              type="number"
              placeholder="Minutes"
              value={logData.wellness_metrics.exercise_minutes}
              onChange={(e) => setLogData({
                ...logData,
                wellness_metrics: { ...logData.wellness_metrics, exercise_minutes: parseInt(e.target.value) }
              })}
              className="max-w-24"
            />
            <span className="text-sm text-gray-600">minutes of exercise</span>
          </div>
        </CardContent>
      </Card>

      {/* Meal Adherence */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Utensils className="w-5 h-5 text-orange-500" />
            Meal Plan Adherence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">How well did you follow your meal plan?</span>
            <span className="text-sm font-bold text-orange-600">{logData.meal_adherence}%</span>
          </div>
          <Slider
            value={[logData.meal_adherence]}
            onValueChange={([value]) => setLogData({ ...logData, meal_adherence: value })}
            max={100}
            min={0}
            step={5}
          />
        </CardContent>
      </Card>

      {/* Symptoms */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Symptoms (if any)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Add symptom (e.g., headache, bloating)"
              value={newSymptom}
              onChange={(e) => setNewSymptom(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addSymptom()}
            />
            <Button onClick={addSymptom} size="icon" variant="outline">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {logData.symptoms?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {logData.symptoms.map((symptom, idx) => (
                <Badge key={idx} variant="secondary" className="gap-1">
                  {symptom}
                  <button
                    onClick={() => setLogData({
                      ...logData,
                      symptoms: logData.symptoms.filter((_, i) => i !== idx)
                    })}
                    className="ml-1 hover:text-red-600"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="How was your day? Any challenges or achievements?"
            value={logData.notes}
            onChange={(e) => setLogData({ ...logData, notes: e.target.value })}
            className="min-h-24"
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saveLogMutation.isPending}
        className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 h-12 text-lg font-semibold"
      >
        {saveLogMutation.isPending ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Calendar className="w-5 h-5 mr-2" />
            {existingLog ? 'Update' : 'Log'} Today's Progress
          </>
        )}
      </Button>
    </div>
  );
}