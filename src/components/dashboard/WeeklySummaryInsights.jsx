import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export default function WeeklySummaryInsights({ progressLogs, foodLogs, clientProfile, mpessLogs }) {
  const [summary, setSummary] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const generateSummary = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      
      // Prepare last 7 days of data
      const last7Days = progressLogs.filter(log => {
        const logDate = new Date(log.date);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return logDate >= sevenDaysAgo;
      });

      const weeklyFoodLogs = foodLogs.filter(log => {
        const logDate = new Date(log.date);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return logDate >= sevenDaysAgo;
      });

      const avgWeight = last7Days.length > 0 
        ? (last7Days.reduce((sum, log) => sum + (log.weight || 0), 0) / last7Days.length).toFixed(1)
        : 0;
      
      const avgEnergy = last7Days.length > 0
        ? (last7Days.reduce((sum, log) => sum + (log.wellness_metrics?.energy_level || 0), 0) / last7Days.length).toFixed(1)
        : 0;

      const mealAdherence = last7Days.length > 0
        ? Math.round((weeklyFoodLogs.length / (last7Days.length * 3)) * 100)
        : 0;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a health coaching assistant. Generate a brief, personalized weekly summary for a client named ${clientProfile?.full_name}.

Client Goal: ${clientProfile?.goal || 'Health improvement'}
Current Weight: ${clientProfile?.weight || 'Not set'} kg
Target Weight: ${clientProfile?.target_weight || 'Not set'} kg

Weekly Data:
- Days Tracked: ${last7Days.length}/7
- Average Weight: ${avgWeight} kg
- Average Energy Level: ${avgEnergy}/10
- Meal Adherence: ${mealAdherence}%
- Food Logs: ${weeklyFoodLogs.length} meals logged

Create a JSON response with:
{
  "headline": "A motivating 1-line summary",
  "keyHighlights": ["highlight 1", "highlight 2", "highlight 3"],
  "areasOfFocus": ["area 1", "area 2"],
  "actionItems": ["action 1", "action 2"],
  "motivationalMessage": "A personalized encouraging message"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            headline: { type: "string" },
            keyHighlights: { type: "array", items: { type: "string" } },
            areasOfFocus: { type: "array", items: { type: "string" } },
            actionItems: { type: "array", items: { type: "string" } },
            motivationalMessage: { type: "string" }
          }
        }
      });

      setIsLoading(false);
      return response;
    },
    onSuccess: (data) => {
      setSummary(data);
    },
  });

  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 mb-6">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-600" />
            <CardTitle className="text-2xl">Weekly Insights</CardTitle>
          </div>
          <Button
            size="sm"
            onClick={() => generateSummary.mutate()}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                AI Insights
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {!summary ? (
          <div className="text-center py-8 text-gray-600">
            <p className="mb-4">Click "AI Insights" to generate your personalized weekly summary</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Headline */}
            <div className="p-4 bg-white rounded-lg border-2 border-blue-200">
              <p className="text-lg font-bold text-blue-900">{summary.headline}</p>
            </div>

            {/* Key Highlights */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                Key Highlights
              </h4>
              <div className="space-y-2">
                {summary.keyHighlights.map((highlight, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-white rounded">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-sm text-gray-700">{highlight}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Areas of Focus */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Areas to Focus On</h4>
              <div className="flex flex-wrap gap-2">
                {summary.areasOfFocus.map((area, idx) => (
                  <Badge key={idx} className="bg-orange-100 text-orange-800">
                    {area}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Action Items */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">This Week's Actions</h4>
              <div className="space-y-2">
                {summary.actionItems.map((action, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-white rounded">
                    <span className="text-indigo-600 font-bold">{idx + 1}</span>
                    <span className="text-sm text-gray-700">{action}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Motivational Message */}
            <div className="p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border-l-4 border-purple-500">
              <p className="text-sm italic text-purple-900">💌 {summary.motivationalMessage}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}