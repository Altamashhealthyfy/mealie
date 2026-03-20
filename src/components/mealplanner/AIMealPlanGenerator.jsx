import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, Loader2, AlertTriangle, CheckCircle2, Brain } from "lucide-react";
import { toast } from "sonner";

export default function AIMealPlanGenerator({ client, onPlanGenerated, inlineMode = false, onClose }) {
  const [isOpen, setIsOpen] = useState(false);
  const [duration, setDuration] = useState(7);
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('generateBasicMealPlan', {
        clientId: client.id,
        calorieTarget: client.target_calories,
        dietType: client.food_preference,
        numDays: duration,
        goal: client.goal,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mealPlans'] });
      setResult(data);
      toast.success("Meal plan generated! 🎉");
      if (onPlanGenerated) onPlanGenerated(data.mealPlan);
    },
    onError: (e) => toast.error("Failed: " + e.message),
  });

  const handleClose = () => {
    if (inlineMode) onClose?.();
    else setIsOpen(false);
  };

  const content = (
    <div className="p-5 space-y-5">
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        <Brain className="w-6 h-6 text-purple-500" />
        Generate Basic Meal Plan
        <Badge className="bg-purple-100 text-purple-700 border-0 ml-1">{client.full_name}</Badge>
      </h2>

      {!result ? (
        <>
          {/* 1. Client Summary */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
            <div className="text-center">
              <p className="text-xs text-purple-600 font-medium">Diet Type</p>
              <p className="text-sm font-semibold text-gray-800 capitalize">{client.food_preference?.replace(/_/g, ' ') || 'Mixed'}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-purple-600 font-medium">Calorie Target</p>
              <p className="text-sm font-semibold text-gray-800">{client.target_calories || client.tdee || 'Auto'} kcal</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-purple-600 font-medium">Goal</p>
              <p className="text-sm font-semibold text-gray-800 capitalize">{(client.goal || 'health_improvement').replace(/_/g, ' ')}</p>
            </div>
          </div>

          {/* 2. Duration Selector */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Plan Duration</label>
            <Select value={String(duration)} onValueChange={v => setDuration(parseInt(v))}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 Days</SelectItem>
                <SelectItem value="7">7 Days</SelectItem>
                <SelectItem value="10">10 Days</SelectItem>
                <SelectItem value="15">15 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 3. Warning Banner */}
          <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-300 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-800">Basic Plan — General Healthy Nutrition Only</p>
              <p className="text-xs text-yellow-700 mt-0.5">This plan does <strong>not</strong> account for medical conditions like Diabetes, PCOS, Thyroid, BP, or Kidney Disease. For disease-specific plans, use the <strong>Clinical Workflow</strong> instead.</p>
            </div>
          </div>

          {/* 4. Generate Button */}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="outline" onClick={handleClose} disabled={generateMutation.isPending}>Cancel</Button>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-6"
            >
              {generateMutation.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating {duration}-day plan...</>
                : <><Sparkles className="w-4 h-4 mr-2" />Generate {duration}-Day Plan</>}
            </Button>
          </div>
        </>
      ) : (
        /* Success State */
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
            <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-green-800">"{result.mealPlan?.name}" generated & saved!</p>
              <p className="text-xs text-green-700">{duration}-day plan assigned to client</p>
            </div>
          </div>
          <div className="flex justify-between gap-3 pt-2 border-t">
            <Button variant="outline" onClick={() => setResult(null)}>
              <Sparkles className="w-4 h-4 mr-2" />Generate Another
            </Button>
            <Button onClick={handleClose} className="bg-gradient-to-r from-green-500 to-emerald-600">
              Done — View in Meal Planner
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  if (inlineMode) return <div className="bg-white text-gray-900">{content}</div>;

  return (
    <Dialog open={isOpen} onOpenChange={v => { setIsOpen(v); if (!v) setResult(null); }}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
          <Sparkles className="w-4 h-4 mr-2" />Generate AI Meal Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg p-0 bg-white text-gray-900">
        {content}
      </DialogContent>
    </Dialog>
  );
}