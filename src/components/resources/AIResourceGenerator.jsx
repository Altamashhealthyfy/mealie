import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';

const RESOURCE_TYPES = [
  { value: 'article', label: '📝 Educational Article', description: 'Informative guide addressing specific gaps' },
  { value: 'recipe_collection', label: '🍽️ Recipe Collection', description: 'Personalized recipes matching diet' },
  { value: 'workout_routine', label: '💪 Workout Routine', description: 'Custom exercise plan for goals' },
  { value: 'meal_plan', label: '📅 Weekly Meal Plan', description: 'Complete 7-day nutritional plan' }
];

export default function AIResourceGenerator({ client, onResourceGenerated }) {
  const [selectedType, setSelectedType] = useState('article');
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const { data: progressLogs } = useQuery({
    queryKey: ['progressLogs', client?.id],
    queryFn: async () => {
      return await base44.entities.ProgressLog.filter(
        { client_id: client?.id },
        '-date',
        20
      );
    },
    enabled: !!client?.id
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const identifiedGaps = extractGaps(progressLogs || [], client);
      const response = await base44.functions.invoke('generateAIResources', {
        clientId: client.id,
        resourceType: selectedType,
        clientGoals: selectedGoals.length > 0 ? selectedGoals : [client.goal],
        identifiedGaps
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('🎉 AI resource generated successfully!');
      setShowForm(false);
      setSelectedGoals([]);
      onResourceGenerated?.(data.resource);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to generate resource');
    }
  });

  const extractGaps = (logs, clientData) => {
    const gaps = [];
    if (logs.length === 0) {
      gaps.push('nutrition_tracking', 'water_intake');
      return gaps;
    }
    const avgMood = logs.reduce((sum, log) => {
      const moodValues = { very_poor: 1, poor: 2, neutral: 3, good: 4, excellent: 5 };
      return sum + (moodValues[log.wellness_metrics?.mood] || 3);
    }, 0) / logs.length;
    if (avgMood < 3) gaps.push('stress_management', 'mental_health');
    const avgSleep = logs.reduce((sum, log) => sum + (log.wellness_metrics?.sleep_hours || 0), 0) / logs.length;
    if (avgSleep < 7) gaps.push('sleep_optimization');
    return gaps;
  };

  const selectedTypeObj = RESOURCE_TYPES.find(t => t.value === selectedType);

  if (!showForm) {
    return (
      <Button
        onClick={() => setShowForm(true)}
        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Generate AI Resource
      </Button>
    );
  }

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI-Powered Resource Generator
            </CardTitle>
            <CardDescription>Create personalized content based on client goals and progress gaps</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowForm(false)}
            className="text-gray-500"
          >
            ✕
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Resource Type Selection */}
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-3">Select Resource Type</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {RESOURCE_TYPES.map(type => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  selectedType === type.value
                    ? 'border-purple-500 bg-white shadow-md'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-sm">{type.label}</div>
                <div className="text-xs text-gray-600 mt-1">{type.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Goals Selection */}
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">Client Goals</label>
          <div className="space-y-2">
            {[client?.goal, 'health_improvement', 'disease_reversal', 'performance'].map(goal => (
              <label key={goal} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedGoals.includes(goal)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedGoals([...selectedGoals, goal]);
                    } else {
                      setSelectedGoals(selectedGoals.filter(g => g !== goal));
                    }
                  }}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 capitalize">{goal?.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2 text-sm text-blue-900">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Smart Personalization</div>
            <div className="text-xs mt-1 text-blue-800">
              This will analyze {client?.full_name}'s progress gaps and goals to create highly relevant content.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Resource
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowForm(false)}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}