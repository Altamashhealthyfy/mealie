import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Check, X, Users, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import CouponInput from "@/components/payments/CouponInput";

export default function ClientPlanBuilder() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    plan_name: "",
    plan_description: "",
    health_focus: [],
    duration_days: 30,
    price: 0,
    features: [],
    is_global: false,
    status: "active"
  });
  const [healthFocusInput, setHealthFocusInput] = useState("");
  const [featureInput, setFeatureInput] = useState("");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: coachSubscription } = useQuery({
    queryKey: ['myCoachSubscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.HealthCoachSubscription.filter({
        coach_email: user?.email,
        status: 'active'
      });
      return subs[0] || null;
    },
    enabled: !!user && user.user_type === 'student_coach',
  });

  const { data: subscriptionPlan } = useQuery({
    queryKey: ['coachPlanDetails', coachSubscription?.plan_id],
    queryFn: async () => {
      if (!coachSubscription?.plan_id) return null;
      const plan = await base44.entities.HealthCoachPlan.filter({ id: coachSubscription.plan_id });
      return plan[0] || null;
    },
    enabled: !!coachSubscription?.plan_id,
  });

  const { data: myPlans } = useQuery({
    queryKey: ['myClientPlans', user?.email],
    queryFn: async () => {
      if (user?.user_type === 'super_admin') {
        return await base44.entities.ClientPlanDefinition.list('-created_date');
      }
      return await base44.entities.ClientPlanDefinition.filter({ coach_email: user?.email });
    },
    enabled: !!user,
    initialData: [],
  });

  const createPlanMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientPlanDefinition.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['myClientPlans']);
      setShowDialog(false);
      resetForm();
      alert('✅ Client plan created successfully!');
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientPlanDefinition.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['myClientPlans']);
      setShowDialog(false);
      resetForm();
      alert('✅ Plan updated successfully!');
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientPlanDefinition.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['myClientPlans']);
      alert('✅ Plan deleted successfully!');
    },
  });

  const resetForm = () => {
    setFormData({
      plan_name: "",
      plan_description: "",
      health_focus: [],
      duration_days: 30,
      price: 0,
      features: [],
      is_global: false,
      status: "active"
    });
    setHealthFocusInput("");
    setFeatureInput("");
    setEditingPlan(null);
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      plan_name: plan.plan_name,
      plan_description: plan.plan_description || "",
      health_focus: plan.health_focus || [],
      duration_days: plan.duration_days,
      price: plan.price,
      features: plan.features || [],
      is_global: plan.is_global || false,
      status: plan.status
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.plan_name || !formData.price) {
      alert('Please fill in plan name and price');
      return;
    }

    const data = {
      ...formData,
      coach_email: user?.email,
      is_global: user?.user_type === 'super_admin' ? formData.is_global : false
    };

    if (editingPlan) {
      updatePlanMutation.mutate({ id: editingPlan.id, data });
    } else {
      createPlanMutation.mutate(data);
    }
  };

  const handleDelete = (planId) => {
    if (confirm('Are you sure you want to delete this plan?')) {
      deletePlanMutation.mutate(planId);
    }
  };

  const addHealthFocus = () => {
    if (healthFocusInput.trim()) {
      setFormData({ ...formData, health_focus: [...formData.health_focus, healthFocusInput.trim()] });
      setHealthFocusInput("");
    }
  };

  const removeHealthFocus = (index) => {
    setFormData({ ...formData, health_focus: formData.health_focus.filter((_, i) => i !== index) });
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setFormData({ ...formData, features: [...formData.features, featureInput.trim()] });
      setFeatureInput("");
    }
  };

  const removeFeature = (index) => {
    setFormData({ ...formData, features: formData.features.filter((_, i) => i !== index) });
  };

  const canCreatePlans = user?.user_type === 'super_admin' || 
                         user?.user_type === 'team_member' ||
                         (user?.user_type === 'student_coach' && subscriptionPlan?.can_create_client_plans);

  if (!canCreatePlans) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Alert className="max-w-md border-orange-500 bg-orange-50">
          <Lock className="w-5 h-5 text-orange-600" />
          <AlertDescription className="text-orange-900">
            <strong>Upgrade Required:</strong> Your current plan doesn't include the ability to create client plans. Please upgrade your subscription to access this feature.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Client Plans</h1>
            <p className="text-gray-600">Create custom health plans for your clients</p>
          </div>
          <Button onClick={() => { resetForm(); setShowDialog(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-5 h-5 mr-2" />
            Create Plan
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {myPlans.map((plan) => (
            <Card key={plan.id} className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{plan.plan_name}</CardTitle>
                  <div className="flex gap-2">
                    {plan.is_global && <Badge className="bg-purple-600">Global</Badge>}
                    <Badge className={plan.status === 'active' ? 'bg-green-600' : 'bg-gray-600'}>
                      {plan.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <p className="text-3xl font-bold text-gray-900">₹{plan.price}</p>
                  <p className="text-sm text-gray-600">{plan.duration_days} days program</p>
                </div>

                <p className="text-gray-700">{plan.plan_description}</p>

                {plan.health_focus?.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Health Focus:</p>
                    <div className="flex flex-wrap gap-2">
                      {plan.health_focus.map((focus, idx) => (
                        <Badge key={idx} variant="outline">{focus}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {plan.features?.length > 0 && (
                  <div className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button onClick={() => handleEdit(plan)} variant="outline" className="flex-1">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button onClick={() => handleDelete(plan.id)} variant="destructive" className="flex-1">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPlan ? 'Edit' : 'Create'} Client Plan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plan Name *</Label>
                  <Input
                    value={formData.plan_name}
                    onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                    placeholder="e.g., Weight Loss Plan"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.plan_description}
                  onChange={(e) => setFormData({ ...formData, plan_description: e.target.value })}
                  placeholder="Describe what this plan offers"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price (₹) *</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration (Days)</Label>
                  <Input
                    type="number"
                    value={formData.duration_days}
                    onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Health Focus Areas</Label>
                <div className="flex gap-2">
                  <Input
                    value={healthFocusInput}
                    onChange={(e) => setHealthFocusInput(e.target.value)}
                    placeholder="e.g., Diabetes, Weight Loss"
                    onKeyPress={(e) => e.key === 'Enter' && addHealthFocus()}
                  />
                  <Button onClick={addHealthFocus} type="button">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.health_focus.map((focus, idx) => (
                    <Badge key={idx} variant="outline" className="flex items-center gap-1">
                      {focus}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeHealthFocus(idx)} />
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Features</Label>
                <div className="flex gap-2">
                  <Input
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    placeholder="Add a feature"
                    onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                  />
                  <Button onClick={addFeature} type="button">Add</Button>
                </div>
                <div className="space-y-2 mt-2">
                  {formData.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{feature}</span>
                      <Button onClick={() => removeFeature(idx)} variant="ghost" size="sm">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {user?.user_type === 'super_admin' && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <Label>Make Global (Available to all coaches)</Label>
                  <input
                    type="checkbox"
                    checked={formData.is_global}
                    onChange={(e) => setFormData({ ...formData, is_global: e.target.checked })}
                    className="w-5 h-5"
                  />
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4">
                <Button onClick={() => setShowDialog(false)} variant="outline">Cancel</Button>
                <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
                  {editingPlan ? 'Update' : 'Create'} Plan
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}