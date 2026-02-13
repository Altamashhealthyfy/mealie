import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Target, Plus, Lightbulb } from "lucide-react";
import { format, addDays, addWeeks, addMonths } from "date-fns";

export default function SMARTGoalBuilder({ clientId, clientName }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [goalData, setGoalData] = useState({
    goal_type: 'weight',
    title: '',
    description: '',
    start_value: '',
    current_value: '',
    target_value: '',
    unit: 'kg',
    target_date: format(addWeeks(new Date(), 4), 'yyyy-MM-dd'),
    status: 'active',
    priority: 'high',
    notes: '',
    milestones: []
  });

  const saveGoalMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.ProgressGoal.create({
        ...data,
        client_id: clientId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clientGoals']);
      queryClient.invalidateQueries(['myProgressGoals']);
      setOpen(false);
      resetForm();
      alert('✅ SMART goal created successfully!');
    },
  });

  const resetForm = () => {
    setGoalData({
      goal_type: 'weight',
      title: '',
      description: '',
      start_value: '',
      current_value: '',
      target_value: '',
      unit: 'kg',
      target_date: format(addWeeks(new Date(), 4), 'yyyy-MM-dd'),
      status: 'active',
      priority: 'high',
      notes: '',
      milestones: []
    });
  };

  const goalTemplates = {
    weight: {
      title: "Lose 5kg in 8 weeks",
      description: "Achieve sustainable weight loss through nutrition and lifestyle changes",
      unit: "kg",
      timeframe: "8 weeks"
    },
    measurement: {
      title: "Reduce waist by 5cm in 6 weeks",
      description: "Target abdominal fat reduction through diet and exercise",
      unit: "cm",
      timeframe: "6 weeks"
    },
    habit: {
      title: "Log meals 6 days a week",
      description: "Build consistency in food tracking for better accountability",
      unit: "days",
      timeframe: "4 weeks"
    },
    wellness: {
      title: "Improve sleep quality to 8/10",
      description: "Enhance sleep through better routines and stress management",
      unit: "/10",
      timeframe: "4 weeks"
    }
  };

  const handleTemplateSelect = (type) => {
    const template = goalTemplates[type];
    const weeksMap = {
      "4 weeks": 4,
      "6 weeks": 6,
      "8 weeks": 8
    };
    
    setGoalData({
      ...goalData,
      goal_type: type,
      title: template.title,
      description: template.description,
      unit: template.unit,
      target_date: format(addWeeks(new Date(), weeksMap[template.timeframe]), 'yyyy-MM-dd')
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // SMART validation
    if (!goalData.title) {
      alert('❌ Specific: Please provide a clear goal title');
      return;
    }
    if (!goalData.target_value) {
      alert('❌ Measurable: Please set a target value to measure progress');
      return;
    }
    if (!goalData.target_date) {
      alert('❌ Time-bound: Please set a target completion date');
      return;
    }
    
    saveGoalMutation.mutate(goalData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
          <Plus className="w-4 h-4 mr-2" />
          Set SMART Goal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Target className="w-6 h-6 text-purple-600" />
            Create SMART Goal for {clientName}
          </DialogTitle>
        </DialogHeader>

        <Alert className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <Lightbulb className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>SMART Goals:</strong> Specific, Measurable, Achievable, Relevant, Time-bound
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Goal Templates */}
          <div className="space-y-2">
            <Label>Quick Templates (Optional)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={() => handleTemplateSelect('weight')} className="h-auto p-3 text-left">
                <div>
                  <p className="font-semibold text-sm">Weight Loss</p>
                  <p className="text-xs text-gray-600">8-week plan</p>
                </div>
              </Button>
              <Button type="button" variant="outline" onClick={() => handleTemplateSelect('measurement')} className="h-auto p-3 text-left">
                <div>
                  <p className="font-semibold text-sm">Body Measurement</p>
                  <p className="text-xs text-gray-600">6-week plan</p>
                </div>
              </Button>
              <Button type="button" variant="outline" onClick={() => handleTemplateSelect('habit')} className="h-auto p-3 text-left">
                <div>
                  <p className="font-semibold text-sm">Habit Building</p>
                  <p className="text-xs text-gray-600">4-week plan</p>
                </div>
              </Button>
              <Button type="button" variant="outline" onClick={() => handleTemplateSelect('wellness')} className="h-auto p-3 text-left">
                <div>
                  <p className="font-semibold text-sm">Wellness Metric</p>
                  <p className="text-xs text-gray-600">4-week plan</p>
                </div>
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Goal Type *</Label>
            <Select value={goalData.goal_type} onValueChange={(value) => setGoalData({...goalData, goal_type: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weight">Weight Goal</SelectItem>
                <SelectItem value="body_measurement">Body Measurement</SelectItem>
                <SelectItem value="wellness">Wellness Metric</SelectItem>
                <SelectItem value="habit">Habit/Behavior</SelectItem>
                <SelectItem value="nutrition">Nutrition Adherence</SelectItem>
                <SelectItem value="custom">Custom Goal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Goal Title (Specific) *</Label>
            <Input
              value={goalData.title}
              onChange={(e) => setGoalData({...goalData, title: e.target.value})}
              placeholder="e.g., Lose 5kg, Reduce waist by 5cm, Log meals 6 days/week"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Description (Relevant & Achievable) *</Label>
            <Textarea
              value={goalData.description}
              onChange={(e) => setGoalData({...goalData, description: e.target.value})}
              placeholder="Why is this goal important? How will achieving it improve health?"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Start Value</Label>
              <Input
                type="number"
                step="0.1"
                value={goalData.start_value}
                onChange={(e) => setGoalData({...goalData, start_value: e.target.value})}
                placeholder="Current"
              />
            </div>
            <div className="space-y-2">
              <Label>Target Value (Measurable) *</Label>
              <Input
                type="number"
                step="0.1"
                value={goalData.target_value}
                onChange={(e) => setGoalData({...goalData, target_value: e.target.value})}
                placeholder="Goal"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input
                value={goalData.unit}
                onChange={(e) => setGoalData({...goalData, unit: e.target.value})}
                placeholder="kg, cm, %"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Target Date (Time-bound) *</Label>
            <Input
              type="date"
              value={goalData.target_date}
              onChange={(e) => setGoalData({...goalData, target_date: e.target.value})}
              required
            />
            <div className="flex gap-2 text-xs">
              <Button type="button" variant="outline" size="sm" 
                onClick={() => setGoalData({...goalData, target_date: format(addWeeks(new Date(), 2), 'yyyy-MM-dd')})}>
                2 weeks
              </Button>
              <Button type="button" variant="outline" size="sm"
                onClick={() => setGoalData({...goalData, target_date: format(addWeeks(new Date(), 4), 'yyyy-MM-dd')})}>
                4 weeks
              </Button>
              <Button type="button" variant="outline" size="sm"
                onClick={() => setGoalData({...goalData, target_date: format(addMonths(new Date(), 2), 'yyyy-MM-dd')})}>
                2 months
              </Button>
              <Button type="button" variant="outline" size="sm"
                onClick={() => setGoalData({...goalData, target_date: format(addMonths(new Date(), 3), 'yyyy-MM-dd')})}>
                3 months
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={goalData.priority} onValueChange={(value) => setGoalData({...goalData, priority: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={goalData.status} onValueChange={(value) => setGoalData({...goalData, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Coach Notes</Label>
            <Textarea
              value={goalData.notes}
              onChange={(e) => setGoalData({...goalData, notes: e.target.value})}
              placeholder="Internal notes about this goal, action plan, checkpoints..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveGoalMutation.isPending}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {saveGoalMutation.isPending ? 'Creating...' : 'Create Goal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}