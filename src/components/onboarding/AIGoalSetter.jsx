import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Loader2, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function AIGoalSetter({ client, onGoalsSet }) {
  const [step, setStep] = useState(1);
  const [customGoals, setCustomGoals] = useState("");
  const [generatedGoals, setGeneratedGoals] = useState(null);
  const [selectedGoals, setSelectedGoals] = useState([]);

  const generateGoalsMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a health coach creating personalized SMART goals for a new client. Generate 3-4 specific, measurable health goals based on their profile.

Client Profile:
- Name: ${client.full_name}
- Goal: ${client.goal?.replace(/_/g, ' ')}
- Current Weight: ${client.weight} kg | Target: ${client.target_weight} kg
- Health Conditions: ${client.health_conditions?.length ? client.health_conditions.join(', ') : 'None'}
- Activity Level: ${client.activity_level}
- Food Preference: ${client.food_preference}

Create SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound) that:
1. Align with their primary goal
2. Account for their health conditions
3. Are realistic based on their lifestyle
4. Include concrete metrics and timelines

Format each goal as: "[GOAL TITLE]: [DETAILED DESCRIPTION] (Timeline: [X weeks/months])"`,
        response_json_schema: {
          type: "object",
          properties: {
            goals: {
              type: "array",
              items: { type: "string" }
            },
            recommendation: { type: "string" }
          }
        }
      });
      return response;
    },
    onSuccess: (data) => {
      setGeneratedGoals(data);
      setStep(2);
    },
    onError: () => {
      toast.error("Failed to generate goals. Please try again.");
    }
  });

  const saveGoalsMutation = useMutation({
    mutationFn: async () => {
      const allGoals = [...selectedGoals, ...customGoals.split('\n').filter(g => g.trim())];
      
      // Create ProgressGoal records
      const goalData = allGoals.map(goal => ({
        client_id: client.id,
        goal_description: goal,
        target_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'in_progress',
        progress_percentage: 0
      }));

      await Promise.all(
        goalData.map(g => base44.entities.ProgressGoal?.create(g).catch(() => null))
      );

      // Update client with primary goal
      await base44.entities.Client.update(client.id, {
        goal: client.goal
      });

      return allGoals;
    },
    onSuccess: (goals) => {
      toast.success(`${goals.length} goals created successfully! 🎯`);
      if (onGoalsSet) onGoalsSet(goals);
    },
    onError: () => {
      toast.error("Failed to save goals.");
    }
  });

  return (
    <div className="space-y-6">
      {step === 1 && (
        <Card className="border-purple-100 bg-gradient-to-br from-purple-50 to-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Target className="w-5 h-5 text-purple-600" />
              Let's Set Your Health Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="bg-white border-purple-200">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <AlertDescription>
                I'll create personalized SMART goals based on your profile to help you succeed on your health journey.
              </AlertDescription>
            </Alert>

            <div className="p-4 bg-white rounded-lg border border-purple-100">
              <p className="text-sm text-gray-700 mb-3"><strong>Your Profile Summary:</strong></p>
              <div className="space-y-1 text-sm text-gray-600">
                <p>• Goal: <span className="font-semibold text-purple-700">{client.goal?.replace(/_/g, ' ')}</span></p>
                <p>• Weight Journey: <span className="font-semibold">{client.weight}kg → {client.target_weight}kg</span></p>
                {client.health_conditions?.length > 0 && (
                  <p>• Focus Areas: <span className="font-semibold text-orange-700">{client.health_conditions.join(', ')}</span></p>
                )}
              </div>
            </div>

            <Button
              onClick={() => generateGoalsMutation.mutate()}
              disabled={generateGoalsMutation.isPending}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
            >
              {generateGoalsMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Your Goals...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate My SMART Goals
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && generatedGoals && (
        <div className="space-y-6">
          <Card className="border-green-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Your Personalized Goals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-sm text-gray-700">
                  {generatedGoals.recommendation}
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                {generatedGoals.goals.map((goal, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:border-green-400 transition-colors"
                    onClick={() => {
                      if (selectedGoals.includes(goal)) {
                        setSelectedGoals(selectedGoals.filter(g => g !== goal));
                      } else {
                        setSelectedGoals([...selectedGoals, goal]);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded border mt-0.5 flex items-center justify-center ${
                        selectedGoals.includes(goal) ? 'bg-green-600 border-green-600' : 'border-gray-300'
                      }`}>
                        {selectedGoals.includes(goal) && <span className="text-white text-xs">✓</span>}
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed">{goal}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <Label className="text-sm font-semibold mb-2 block">Add Your Own Goals (Optional)</Label>
                <textarea
                  placeholder="Add additional goals, one per line..."
                  value={customGoals}
                  onChange={(e) => setCustomGoals(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg text-sm"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                >
                  Back
                </Button>
                <Button
                  onClick={() => saveGoalsMutation.mutate()}
                  disabled={selectedGoals.length === 0 || saveGoalsMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
                >
                  {saveGoalsMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving Goals...
                    </>
                  ) : (
                    `Save ${selectedGoals.length} Goal${selectedGoals.length !== 1 ? 's' : ''}`
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}