import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Zap, Plus, Edit, Trash2, Play, Trophy, Award } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function AutoAwardRules() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, rule: null });
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    rule_name: '',
    description: '',
    trigger_type: 'progress_log_count',
    trigger_condition: { threshold: 10, comparison: 'greater_or_equal', time_period_days: 30 },
    award_type: 'points',
    points_to_award: 50,
    badge_to_award: '',
    award_message: '',
    is_active: true,
    is_repeatable: false,
    cooldown_days: 30
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: rules = [] } = useQuery({
    queryKey: ['autoAwardRules'],
    queryFn: () => base44.entities.AutoAwardRule.list(),
    enabled: !!user
  });

  const { data: badges = [] } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.Badge.list(),
    enabled: !!user
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    enabled: !!user
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AutoAwardRule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['autoAwardRules']);
      toast.success("Auto-award rule created");
      resetForm();
      setDialogOpen(false);
    },
    onError: () => toast.error("Failed to create rule")
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AutoAwardRule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['autoAwardRules']);
      toast.success("Rule updated");
      resetForm();
      setDialogOpen(false);
    },
    onError: () => toast.error("Failed to update rule")
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AutoAwardRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['autoAwardRules']);
      toast.success("Rule deleted");
      setDeleteDialog({ open: false, rule: null });
    },
    onError: () => toast.error("Failed to delete rule")
  });

  const testRuleMutation = useMutation({
    mutationFn: async (clientId) => {
      const response = await base44.functions.invoke('processAutoAwards', { client_id: clientId });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Processed! ${data.awards_given} awards given`);
      queryClient.invalidateQueries(['allPoints']);
      queryClient.invalidateQueries(['allClientBadges']);
    },
    onError: () => toast.error("Failed to process awards")
  });

  const resetForm = () => {
    setFormData({
      rule_name: '',
      description: '',
      trigger_type: 'progress_log_count',
      trigger_condition: { threshold: 10, comparison: 'greater_or_equal', time_period_days: 30 },
      award_type: 'points',
      points_to_award: 50,
      badge_to_award: '',
      award_message: '',
      is_active: true,
      is_repeatable: false,
      cooldown_days: 30
    });
    setEditingRule(null);
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setFormData({
      rule_name: rule.rule_name,
      description: rule.description || '',
      trigger_type: rule.trigger_type,
      trigger_condition: rule.trigger_condition || { threshold: 10, comparison: 'greater_or_equal' },
      award_type: rule.award_type,
      points_to_award: rule.points_to_award || 0,
      badge_to_award: rule.badge_to_award || '',
      award_message: rule.award_message || '',
      is_active: rule.is_active,
      is_repeatable: rule.is_repeatable || false,
      cooldown_days: rule.cooldown_days || 30
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const data = {
      ...formData,
      created_by_coach: user?.email
    };

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Zap className="w-8 h-8 text-orange-500" />
              Auto-Award Rules
            </h1>
            <p className="text-gray-600 mt-1">Automatically reward clients for progress milestones</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-500 to-red-600">
                <Plus className="w-5 h-5 mr-2" />
                Create Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingRule ? 'Edit' : 'Create'} Auto-Award Rule</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Rule Name</Label>
                  <Input
                    value={formData.rule_name}
                    onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                    placeholder="e.g., 7-Day Streak Award"
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what triggers this award"
                  />
                </div>

                <div>
                  <Label>Trigger Type</Label>
                  <Select value={formData.trigger_type} onValueChange={(value) => setFormData({ ...formData, trigger_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="progress_log_count">Progress Logs Count</SelectItem>
                      <SelectItem value="food_log_count">Food Logs Count</SelectItem>
                      <SelectItem value="weight_loss_milestone">Weight Loss Milestone</SelectItem>
                      <SelectItem value="consecutive_days">Consecutive Days Streak</SelectItem>
                      <SelectItem value="workout_count">Workout Count</SelectItem>
                      <SelectItem value="meal_adherence">Meal Adherence Average</SelectItem>
                      <SelectItem value="water_intake_goal">Water Intake Goal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Threshold</Label>
                    <Input
                      type="number"
                      value={formData.trigger_condition.threshold}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        trigger_condition: { ...formData.trigger_condition, threshold: Number(e.target.value) }
                      })}
                    />
                  </div>
                  <div>
                    <Label>Comparison</Label>
                    <Select 
                      value={formData.trigger_condition.comparison} 
                      onValueChange={(value) => setFormData({ 
                        ...formData, 
                        trigger_condition: { ...formData.trigger_condition, comparison: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">Equals</SelectItem>
                        <SelectItem value="greater_than">Greater Than</SelectItem>
                        <SelectItem value="greater_or_equal">Greater or Equal</SelectItem>
                        <SelectItem value="less_than">Less Than</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Time Period (days)</Label>
                  <Input
                    type="number"
                    value={formData.trigger_condition.time_period_days || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      trigger_condition: { ...formData.trigger_condition, time_period_days: Number(e.target.value) || undefined }
                    })}
                    placeholder="Leave empty for all time"
                  />
                </div>

                <div>
                  <Label>Award Type</Label>
                  <Select value={formData.award_type} onValueChange={(value) => setFormData({ ...formData, award_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="points">Points Only</SelectItem>
                      <SelectItem value="badge">Badge Only</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(formData.award_type === 'points' || formData.award_type === 'both') && (
                  <div>
                    <Label>Points to Award</Label>
                    <Input
                      type="number"
                      value={formData.points_to_award}
                      onChange={(e) => setFormData({ ...formData, points_to_award: Number(e.target.value) })}
                    />
                  </div>
                )}

                {(formData.award_type === 'badge' || formData.award_type === 'both') && (
                  <div>
                    <Label>Badge to Award</Label>
                    <Select value={formData.badge_to_award} onValueChange={(value) => setFormData({ ...formData, badge_to_award: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select badge" />
                      </SelectTrigger>
                      <SelectContent>
                        {badges.map(badge => (
                          <SelectItem key={badge.id} value={badge.id}>
                            {badge.icon} {badge.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>Award Message</Label>
                  <Input
                    value={formData.award_message}
                    onChange={(e) => setFormData({ ...formData, award_message: e.target.value })}
                    placeholder="Congratulations message"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Is Repeatable?</Label>
                  <Switch
                    checked={formData.is_repeatable}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_repeatable: checked })}
                  />
                </div>

                {formData.is_repeatable && (
                  <div>
                    <Label>Cooldown (days)</Label>
                    <Input
                      type="number"
                      value={formData.cooldown_days}
                      onChange={(e) => setFormData({ ...formData, cooldown_days: Number(e.target.value) })}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label>Is Active?</Label>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>

                <Button onClick={handleSubmit} className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingRule ? 'Update Rule' : 'Create Rule'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Rules List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map(rule => (
            <Card key={rule.id} className={rule.is_active ? 'border-green-200' : 'border-gray-200 opacity-60'}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{rule.rule_name}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                  </div>
                  <Badge className={rule.is_active ? 'bg-green-600' : 'bg-gray-400'}>
                    {rule.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-1">
                  <p><strong>Trigger:</strong> {rule.trigger_type.replace(/_/g, ' ')}</p>
                  <p><strong>Condition:</strong> {rule.trigger_condition?.comparison} {rule.trigger_condition?.threshold}</p>
                  {rule.trigger_condition?.time_period_days && (
                    <p><strong>Period:</strong> Last {rule.trigger_condition.time_period_days} days</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {(rule.award_type === 'points' || rule.award_type === 'both') && (
                    <Badge className="bg-orange-500 text-white">
                      <Trophy className="w-3 h-3 mr-1" />
                      {rule.points_to_award} pts
                    </Badge>
                  )}
                  {(rule.award_type === 'badge' || rule.award_type === 'both') && (
                    <Badge className="bg-purple-500 text-white">
                      <Award className="w-3 h-3 mr-1" />
                      Badge
                    </Badge>
                  )}
                  {rule.is_repeatable && (
                    <Badge variant="outline">Repeatable</Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(rule)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-red-600"
                    onClick={() => setDeleteDialog({ open: true, rule })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Select onValueChange={(clientId) => testRuleMutation.mutate(clientId)}>
                    <SelectTrigger className="h-9 w-32">
                      <SelectValue placeholder="Test on..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {rules.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Zap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No auto-award rules yet</p>
              <p className="text-gray-400 text-sm mt-2">Create rules to automatically reward client achievements</p>
            </CardContent>
          </Card>
        )}

        <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, rule: null })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Rule?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteDialog.rule?.rule_name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(deleteDialog.rule.id)}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}