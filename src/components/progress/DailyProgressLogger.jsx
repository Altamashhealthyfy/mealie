import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Smile, Zap, Moon, CloudRain, Droplets, Dumbbell, CheckCircle, Flame } from "lucide-react";
import { format } from "date-fns";

export default function DailyProgressLogger({ clientId }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    weight: '',
    meal_adherence: 80,
    wellness_metrics: {
      mood: 'good',
      energy_level: 7,
      sleep_quality: 7,
      sleep_hours: 7,
      stress_level: 4,
      water_intake: 2,
      exercise_minutes: 30
    },
    notes: ''
  });

  const { data: todayLog } = useQuery({
    queryKey: ['todayProgressLog', clientId],
    queryFn: async () => {
      const logs = await base44.entities.ProgressLog.filter({ 
        client_id: clientId,
        date: format(new Date(), 'yyyy-MM-dd')
      });
      return logs[0] || null;
    },
    enabled: !!clientId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (todayLog) {
        return await base44.entities.ProgressLog.update(todayLog.id, data);
      }
      return await base44.entities.ProgressLog.create({ ...data, client_id: clientId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['todayProgressLog']);
      queryClient.invalidateQueries(['myProgressLogs']);
      alert('✅ Daily progress saved!');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const dataToSave = {
      ...formData,
      weight: formData.weight ? parseFloat(formData.weight) : undefined,
      meal_adherence: parseInt(formData.meal_adherence)
    };
    
    saveMutation.mutate(dataToSave);
  };

  React.useEffect(() => {
    if (todayLog) {
      setFormData({
        date: todayLog.date,
        weight: todayLog.weight || '',
        meal_adherence: todayLog.meal_adherence || 80,
        wellness_metrics: todayLog.wellness_metrics || formData.wellness_metrics,
        notes: todayLog.notes || ''
      });
    }
  }, [todayLog]);

  return (
    <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50 to-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-6 h-6 text-blue-600" />
          Daily Progress Check-In
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Alert className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
            <Flame className="w-4 h-4 text-orange-600" />
            <AlertDescription className="text-orange-900">
              <strong>Quick daily check-in!</strong> Log your weight and wellness to track progress
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Weight (kg)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => setFormData({...formData, weight: e.target.value})}
                placeholder="Enter today's weight"
              />
            </div>

            <div className="space-y-2">
              <Label>Meal Plan Adherence</Label>
              <div className="space-y-2">
                <Slider
                  value={[formData.meal_adherence]}
                  onValueChange={(value) => setFormData({...formData, meal_adherence: value[0]})}
                  max={100}
                  step={5}
                  className="py-4"
                />
                <div className="text-center">
                  <span className="text-2xl font-bold text-orange-600">{formData.meal_adherence}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Smile className="w-5 h-5 text-purple-600" />
              Wellness Metrics
            </h3>

            <div className="space-y-2">
              <Label>How do you feel today?</Label>
              <Select 
                value={formData.wellness_metrics.mood} 
                onValueChange={(value) => setFormData({
                  ...formData, 
                  wellness_metrics: {...formData.wellness_metrics, mood: value}
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">😄 Excellent</SelectItem>
                  <SelectItem value="good">😊 Good</SelectItem>
                  <SelectItem value="neutral">😐 Neutral</SelectItem>
                  <SelectItem value="poor">😕 Poor</SelectItem>
                  <SelectItem value="very_poor">😢 Very Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  Energy Level: {formData.wellness_metrics.energy_level}/10
                </Label>
                <Slider
                  value={[formData.wellness_metrics.energy_level]}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    wellness_metrics: {...formData.wellness_metrics, energy_level: value[0]}
                  })}
                  max={10}
                  min={1}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-500" />
                  Sleep Quality: {formData.wellness_metrics.sleep_quality}/10
                </Label>
                <Slider
                  value={[formData.wellness_metrics.sleep_quality]}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    wellness_metrics: {...formData.wellness_metrics, sleep_quality: value[0]}
                  })}
                  max={10}
                  min={1}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CloudRain className="w-4 h-4 text-red-500" />
                  Stress Level: {formData.wellness_metrics.stress_level}/10
                </Label>
                <Slider
                  value={[formData.wellness_metrics.stress_level]}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    wellness_metrics: {...formData.wellness_metrics, stress_level: value[0]}
                  })}
                  max={10}
                  min={1}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>Sleep Hours</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={formData.wellness_metrics.sleep_hours}
                  onChange={(e) => setFormData({
                    ...formData,
                    wellness_metrics: {...formData.wellness_metrics, sleep_hours: parseFloat(e.target.value)}
                  })}
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
                  value={formData.wellness_metrics.water_intake}
                  onChange={(e) => setFormData({
                    ...formData,
                    wellness_metrics: {...formData.wellness_metrics, water_intake: parseFloat(e.target.value)}
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-green-500" />
                  Exercise (minutes)
                </Label>
                <Input
                  type="number"
                  value={formData.wellness_metrics.exercise_minutes}
                  onChange={(e) => setFormData({
                    ...formData,
                    wellness_metrics: {...formData.wellness_metrics, exercise_minutes: parseInt(e.target.value)}
                  })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="How are you feeling? Any challenges or wins today?"
              rows={3}
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : todayLog ? 'Update Today\'s Log' : 'Save Today\'s Progress'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}