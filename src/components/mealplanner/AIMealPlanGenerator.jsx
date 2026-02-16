import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Sparkles,
  Loader2,
  CheckCircle,
  Brain,
  TrendingUp,
  Info
} from "lucide-react";
import { toast } from "sonner";

export default function AIMealPlanGenerator({ client, onPlanGenerated }) {
  const [duration, setDuration] = useState(7);
  const [adaptFromFeedback, setAdaptFromFeedback] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateAIMealPlan', {
        clientId: client.id,
        duration: duration,
        adaptFromFeedback: adaptFromFeedback
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mealPlans'] });
      toast.success("AI meal plan generated successfully! 🎉");
      setIsOpen(false);
      if (onPlanGenerated) {
        onPlanGenerated(data.mealPlan);
      }
    },
    onError: (error) => {
      toast.error("Failed to generate meal plan: " + error.message);
    }
  });

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
          <Sparkles className="w-4 h-4 mr-2" />
          Generate AI Meal Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Brain className="w-6 h-6 text-purple-500" />
            AI Meal Plan Generator
          </DialogTitle>
          <DialogDescription>
            Create a personalized meal plan using AI for {client.full_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Client Summary */}
          <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Client Profile Summary</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p><strong>Goal:</strong> {client.goal?.replace(/_/g, ' ') || 'General health'}</p>
              <p><strong>Diet:</strong> {client.food_preference || 'Mixed'} • {client.regional_preference || 'All regions'}</p>
              {client.health_conditions && client.health_conditions.length > 0 && (
                <p><strong>Conditions:</strong> {client.health_conditions.map(c => c.replace(/_/g, ' ')).join(', ')}</p>
              )}
              {client.allergies && client.allergies.length > 0 && (
                <p className="text-red-600"><strong>Allergies:</strong> {client.allergies.join(', ')}</p>
              )}
            </CardContent>
          </Card>

          {/* Configuration */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Plan Duration (Days)</Label>
              <Input
                type="number"
                min="3"
                max="30"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 7)}
              />
              <p className="text-xs text-gray-500">Recommended: 7-14 days for best variety</p>
            </div>

            <div className="flex items-center justify-between border rounded-lg p-4">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  Adapt from Previous Progress
                </Label>
                <p className="text-xs text-gray-500">
                  Use client's recent progress logs and feedback to optimize the plan
                </p>
              </div>
              <Switch
                checked={adaptFromFeedback}
                onCheckedChange={setAdaptFromFeedback}
              />
            </div>
          </div>

          {/* AI Features */}
          <Alert className="bg-blue-50 border-blue-300">
            <Info className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-sm text-gray-700">
              <strong className="text-blue-700">AI will consider:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                <li>Health goals and target calories</li>
                <li>Dietary preferences and regional cuisine</li>
                <li>Food allergies and health conditions</li>
                <li>Daily routine and meal timing</li>
                <li>Client's food likes and dislikes</li>
                {adaptFromFeedback && <li>Recent progress and adherence patterns</li>}
              </ul>
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={generateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating with AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Meal Plan
                </>
              )}
            </Button>
          </div>

          {/* Success State */}
          {generateMutation.isSuccess && (
            <Alert className="bg-green-50 border-green-300">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-sm text-green-700">
                <strong>Success!</strong> AI meal plan has been generated and assigned to the client.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}