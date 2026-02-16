import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Trophy, Plus, Edit, Trash2, Users, Target, CheckCircle, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import ChallengeCard from "../components/gamification/ChallengeCard";

export default function CoachChallenges() {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [challengeData, setChallengeData] = useState({
    challenge_type: 'weight_loss',
    difficulty: 'medium',
    is_template: true,
    is_recurring: false,
    stages: [],
    auto_completion_rules: {
      enabled: false
    }
  });
  const [showStageBuilder, setShowStageBuilder] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: challenges } = useQuery({
    queryKey: ['challenges'],
    queryFn: async () => {
      const all = await base44.entities.Challenge.list();
      if (user?.user_type === 'super_admin') return all;
      return all.filter(c => c.created_by_coach === user?.email || c.is_template);
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: badges } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.Badge.list(),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingChallenge) {
        return await base44.entities.Challenge.update(editingChallenge.id, data);
      }
      return await base44.entities.Challenge.create({
        ...data,
        created_by_coach: user?.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      setShowCreateDialog(false);
      setEditingChallenge(null);
      setShowStageBuilder(false);
      setChallengeData({
        challenge_type: 'weight_loss',
        difficulty: 'medium',
        is_template: true,
        is_recurring: false,
        stages: [],
        auto_completion_rules: {
          enabled: false
        }
      });
      toast.success(editingChallenge ? "Challenge updated!" : "Challenge created!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Challenge.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      toast.success("Challenge deleted");
    },
  });

  const handleEdit = (challenge) => {
    setEditingChallenge(challenge);
    setChallengeData({
      title: challenge.title,
      description: challenge.description,
      challenge_type: challenge.challenge_type,
      duration_days: challenge.duration_days,
      target_metric: challenge.target_metric,
      target_value: challenge.target_value,
      points_reward: challenge.points_reward,
      badge_reward_id: challenge.badge_reward_id,
      is_template: challenge.is_template,
      difficulty: challenge.difficulty,
      is_recurring: challenge.is_recurring || false,
      recurring_pattern: challenge.recurring_pattern,
      stages: challenge.stages || [],
      auto_completion_rules: challenge.auto_completion_rules || { enabled: false }
    });
    setShowStageBuilder((challenge.stages?.length || 0) > 0);
    setShowCreateDialog(true);
  };

  const handleDelete = (challengeId) => {
    if (window.confirm('Delete this challenge?')) {
      deleteMutation.mutate(challengeId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
              <Trophy className="w-10 h-10 text-orange-500" />
              Challenge Manager
            </h1>
            <p className="text-gray-600 mt-2">Create engaging challenges for your clients</p>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingChallenge(null);
                  setChallengeData({
                    challenge_type: 'weight_loss',
                    difficulty: 'medium',
                    is_template: true,
                  });
                }}
                className="bg-gradient-to-r from-orange-500 to-red-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Challenge
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingChallenge ? 'Edit Challenge' : 'Create New Challenge'}</DialogTitle>
                <DialogDescription>Design a motivating challenge for your clients</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Challenge Title *</Label>
                  <Input
                    value={challengeData.title || ''}
                    onChange={(e) => setChallengeData({...challengeData, title: e.target.value})}
                    placeholder="e.g., 7-Day Hydration Hero, 30-Day Weight Loss Warrior"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    value={challengeData.description || ''}
                    onChange={(e) => setChallengeData({...challengeData, description: e.target.value})}
                    placeholder="Describe the challenge, rules, and what clients need to do..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Challenge Type *</Label>
                    <Select
                      value={challengeData.challenge_type}
                      onValueChange={(value) => setChallengeData({...challengeData, challenge_type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weight_loss">Weight Loss</SelectItem>
                        <SelectItem value="consistency">Consistency</SelectItem>
                        <SelectItem value="hydration">Hydration</SelectItem>
                        <SelectItem value="exercise">Exercise</SelectItem>
                        <SelectItem value="sleep">Sleep Quality</SelectItem>
                        <SelectItem value="meal_adherence">Meal Adherence</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Duration (days) *</Label>
                    <Input
                      type="number"
                      min="1"
                      max="90"
                      value={challengeData.duration_days || ''}
                      onChange={(e) => setChallengeData({...challengeData, duration_days: parseInt(e.target.value)})}
                      placeholder="7"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Target Metric</Label>
                    <Input
                      value={challengeData.target_metric || ''}
                      onChange={(e) => setChallengeData({...challengeData, target_metric: e.target.value})}
                      placeholder="e.g., weight, water_intake, steps"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Target Value</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={challengeData.target_value || ''}
                      onChange={(e) => setChallengeData({...challengeData, target_value: parseFloat(e.target.value)})}
                      placeholder="e.g., 2, 10000, 8"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Points Reward *</Label>
                    <Input
                      type="number"
                      min="10"
                      value={challengeData.points_reward || ''}
                      onChange={(e) => setChallengeData({...challengeData, points_reward: parseInt(e.target.value)})}
                      placeholder="100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select
                      value={challengeData.difficulty}
                      onValueChange={(value) => setChallengeData({...challengeData, difficulty: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Badge Reward (Optional)</Label>
                  <Select
                    value={challengeData.badge_reward_id || ''}
                    onValueChange={(value) => setChallengeData({...challengeData, badge_reward_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a badge to award..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>No Badge</SelectItem>
                      {badges.map(badge => (
                        <SelectItem key={badge.id} value={badge.id}>
                          {badge.icon} {badge.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is-recurring"
                      checked={challengeData.is_recurring || false}
                      onChange={(e) => setChallengeData({...challengeData, is_recurring: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="is-recurring" className="text-sm font-semibold">
                      🔄 Recurring Challenge
                    </Label>
                  </div>
                  {challengeData.is_recurring && (
                    <Select
                      value={challengeData.recurring_pattern || 'daily'}
                      onValueChange={(value) => setChallengeData({...challengeData, recurring_pattern: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select pattern..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-3 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">⚡ Auto-Completion Rules</Label>
                    <input
                      type="checkbox"
                      checked={challengeData.auto_completion_rules?.enabled || false}
                      onChange={(e) => setChallengeData({
                        ...challengeData,
                        auto_completion_rules: {
                          ...challengeData.auto_completion_rules,
                          enabled: e.target.checked
                        }
                      })}
                      className="w-4 h-4"
                    />
                  </div>
                  {challengeData.auto_completion_rules?.enabled && (
                    <div className="space-y-3">
                      <Select
                        value={challengeData.auto_completion_rules?.data_source || ''}
                        onValueChange={(value) => setChallengeData({
                          ...challengeData,
                          auto_completion_rules: {
                            ...challengeData.auto_completion_rules,
                            data_source: value
                          }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Data source..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="progress_log">Progress Log</SelectItem>
                          <SelectItem value="food_log">Food Log</SelectItem>
                          <SelectItem value="mpess_tracker">MPESS Tracker</SelectItem>
                          <SelectItem value="custom_metric">Custom Metric</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        placeholder="Metric field (e.g., water_intake, exercise_minutes)"
                        value={challengeData.auto_completion_rules?.metric_field || ''}
                        onChange={(e) => setChallengeData({
                          ...challengeData,
                          auto_completion_rules: {
                            ...challengeData.auto_completion_rules,
                            metric_field: e.target.value
                          }
                        })}
                      />

                      <Select
                        value={challengeData.auto_completion_rules?.condition || ''}
                        onValueChange={(value) => setChallengeData({
                          ...challengeData,
                          auto_completion_rules: {
                            ...challengeData.auto_completion_rules,
                            condition: value
                          }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Condition..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="greater_or_equal">Greater or Equal (≥)</SelectItem>
                          <SelectItem value="greater_than">Greater Than (&gt;)</SelectItem>
                          <SelectItem value="less_than">Less Than (&lt;)</SelectItem>
                          <SelectItem value="equals">Equals (=)</SelectItem>
                          <SelectItem value="consecutive_days">Consecutive Days</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        placeholder="Threshold value"
                        value={challengeData.auto_completion_rules?.threshold_value || ''}
                        onChange={(e) => setChallengeData({
                          ...challengeData,
                          auto_completion_rules: {
                            ...challengeData.auto_completion_rules,
                            threshold_value: parseFloat(e.target.value)
                          }
                        })}
                      />

                      {challengeData.auto_completion_rules?.condition === 'consecutive_days' && (
                        <Input
                          type="number"
                          placeholder="Number of consecutive days"
                          value={challengeData.auto_completion_rules?.consecutive_days_required || ''}
                          onChange={(e) => setChallengeData({
                            ...challengeData,
                            auto_completion_rules: {
                              ...challengeData.auto_completion_rules,
                              consecutive_days_required: parseInt(e.target.value)
                            }
                          })}
                        />
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">🎯 Multi-Stage Challenge</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowStageBuilder(!showStageBuilder)}
                    >
                      {showStageBuilder ? 'Hide' : 'Add'} Stages
                    </Button>
                  </div>
                  
                  {showStageBuilder && (
                    <div className="space-y-3">
                      {(challengeData.stages || []).map((stage, idx) => (
                        <div key={idx} className="p-3 bg-white rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold">Stage {stage.stage_number}</p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newStages = challengeData.stages.filter((_, i) => i !== idx);
                                setChallengeData({...challengeData, stages: newStages});
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                          <p className="text-sm text-gray-700">{stage.title}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">{stage.target_value} target</Badge>
                            <Badge className="bg-yellow-500">+{stage.points_reward} pts</Badge>
                          </div>
                        </div>
                      ))}
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          const newStage = {
                            stage_number: (challengeData.stages?.length || 0) + 1,
                            title: prompt('Stage title:', `Stage ${(challengeData.stages?.length || 0) + 1}`),
                            description: prompt('Stage description:'),
                            target_value: parseFloat(prompt('Target value:', '50')),
                            points_reward: parseInt(prompt('Points reward:', '50'))
                          };
                          if (newStage.title && newStage.target_value && newStage.points_reward) {
                            setChallengeData({
                              ...challengeData,
                              stages: [...(challengeData.stages || []), newStage]
                            });
                          }
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Stage
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is-template"
                    checked={challengeData.is_template || false}
                    onChange={(e) => setChallengeData({...challengeData, is_template: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="is-template" className="text-sm">
                    Make this a reusable template (visible to all coaches)
                  </Label>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={() => saveMutation.mutate(challengeData)}
                    disabled={saveMutation.isPending || !challengeData.title || !challengeData.duration_days || !challengeData.points_reward}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-500"
                  >
                    {saveMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {editingChallenge ? 'Update' : 'Create'} Challenge
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Challenges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {challenges.map(challenge => (
            <Card key={challenge.id} className="hover:shadow-lg transition-all">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{challenge.title}</CardTitle>
                  {challenge.created_by_coach === user?.email && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(challenge)}>
                        <Edit className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(challenge.id)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  )}
                </div>
                <CardDescription>{challenge.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge className="capitalize">{challenge.challenge_type.replace('_', ' ')}</Badge>
                  <Badge variant="outline">{challenge.duration_days} days</Badge>
                  <Badge className="bg-yellow-500">{challenge.points_reward} pts</Badge>
                  {challenge.is_template && <Badge className="bg-purple-500">Template</Badge>}
                  {challenge.is_recurring && <Badge className="bg-blue-500">🔄 Recurring</Badge>}
                  {challenge.stages?.length > 0 && <Badge className="bg-green-500">🎯 {challenge.stages.length} Stages</Badge>}
                  {challenge.auto_completion_rules?.enabled && <Badge className="bg-cyan-500">⚡ Auto</Badge>}
                </div>
                {challenge.target_metric && (
                  <p className="text-sm text-gray-600">
                    <strong>Target:</strong> {challenge.target_value} {challenge.target_metric}
                  </p>
                )}
                {challenge.stages?.length > 0 && (
                  <div className="text-xs text-gray-600 space-y-1 mt-2">
                    <p className="font-semibold">Stages:</p>
                    {challenge.stages.map((stage, idx) => (
                      <p key={idx}>• Stage {stage.stage_number}: {stage.title} (+{stage.points_reward} pts)</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {challenges.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Trophy className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 mb-4">No challenges created yet</p>
              <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-to-r from-orange-500 to-red-500">
                <Plus className="w-4 h-4 mr-2" />
                Create First Challenge
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}