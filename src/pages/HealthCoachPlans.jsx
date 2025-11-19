import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, Plus, Edit, Trash2, Crown, Check, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function HealthCoachPlans() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    plan_name: "",
    plan_description: "",
    monthly_price: 0,
    yearly_price: 0,
    features: [],
    max_clients: -1,
    can_add_payment_gateway: false,
    can_create_client_plans: false,
    can_access_pro_plans: false,
    ai_generation_limit: -1,
    status: "active",
    sort_order: 0
  });
  const [featureInput, setFeatureInput] = useState("");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: plans } = useQuery({
    queryKey: ['healthCoachPlans'],
    queryFn: async () => {
      const allPlans = await base44.entities.HealthCoachPlan.list('sort_order');
      return allPlans;
    },
    initialData: [],
  });

  const createPlanMutation = useMutation({
    mutationFn: (data) => base44.entities.HealthCoachPlan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['healthCoachPlans']);
      setShowDialog(false);
      resetForm();
      alert('✅ Health coach plan created successfully!');
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HealthCoachPlan.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['healthCoachPlans']);
      setShowDialog(false);
      resetForm();
      alert('✅ Plan updated successfully!');
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id) => base44.entities.HealthCoachPlan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['healthCoachPlans']);
      alert('✅ Plan deleted successfully!');
    },
  });

  const resetForm = () => {
    setFormData({
      plan_name: "",
      plan_description: "",
      monthly_price: 0,
      yearly_price: 0,
      features: [],
      max_clients: -1,
      can_add_payment_gateway: false,
      can_create_client_plans: false,
      can_access_pro_plans: false,
      ai_generation_limit: -1,
      status: "active",
      sort_order: 0
    });
    setFeatureInput("");
    setEditingPlan(null);
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      plan_name: plan.plan_name,
      plan_description: plan.plan_description || "",
      monthly_price: plan.monthly_price,
      yearly_price: plan.yearly_price,
      features: plan.features || [],
      max_clients: plan.max_clients,
      can_add_payment_gateway: plan.can_add_payment_gateway,
      can_create_client_plans: plan.can_create_client_plans,
      can_access_pro_plans: plan.can_access_pro_plans || false,
      ai_generation_limit: plan.ai_generation_limit,
      status: plan.status,
      sort_order: plan.sort_order || 0
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.plan_name || !formData.monthly_price) {
      alert('Please fill in plan name and monthly price');
      return;
    }

    if (editingPlan) {
      updatePlanMutation.mutate({ id: editingPlan.id, data: formData });
    } else {
      createPlanMutation.mutate(formData);
    }
  };

  const handleDelete = (planId) => {
    if (confirm('Are you sure you want to delete this plan? This cannot be undone.')) {
      deletePlanMutation.mutate(planId);
    }
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

  if (user?.user_type !== 'super_admin') {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="w-5 h-5" />
          <AlertDescription>
            Only Super Admins can manage health coach plans.
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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Health Coach Plans</h1>
            <p className="text-gray-600">Manage subscription plans for health coaches</p>
          </div>
          <Button onClick={() => { resetForm(); setShowDialog(true); }} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-5 h-5 mr-2" />
            Create Plan
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">{plan.plan_name}</CardTitle>
                  <Badge className={plan.status === 'active' ? 'bg-green-600' : 'bg-gray-600'}>
                    {plan.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <p className="text-3xl font-bold text-gray-900">₹{plan.monthly_price}</p>
                  <p className="text-sm text-gray-600">per month</p>
                  {plan.yearly_price > 0 && (
                    <p className="text-lg font-semibold text-gray-700 mt-2">₹{plan.yearly_price}/year</p>
                  )}
                </div>

                <p className="text-gray-700">{plan.plan_description}</p>

                <div className="space-y-2">
                  {plan.features?.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t space-y-1 text-sm text-gray-600">
                  <p>Max Clients: {plan.max_clients === -1 ? 'Unlimited' : plan.max_clients}</p>
                  <p>AI Limit: {plan.ai_generation_limit === -1 ? 'Unlimited' : plan.ai_generation_limit}/month</p>
                  <p>Payment Gateway: {plan.can_add_payment_gateway ? 'Yes' : 'No'}</p>
                  <p>Create Plans: {plan.can_create_client_plans ? 'Yes' : 'No'}</p>
                  <p>Pro Plans 💎: {plan.can_access_pro_plans ? 'Yes' : 'No'}</p>
                </div>

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
              <DialogTitle>{editingPlan ? 'Edit' : 'Create'} Health Coach Plan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plan Name *</Label>
                  <Input
                    value={formData.plan_name}
                    onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                    placeholder="e.g., Pro Coach Plan"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                  />
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
                  <Label>Monthly Price (₹) *</Label>
                  <Input
                    type="number"
                    value={formData.monthly_price}
                    onChange={(e) => setFormData({ ...formData, monthly_price: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Yearly Price (₹)</Label>
                  <Input
                    type="number"
                    value={formData.yearly_price}
                    onChange={(e) => setFormData({ ...formData, yearly_price: parseInt(e.target.value) })}
                  />
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Clients (-1 = unlimited)</Label>
                  <Input
                    type="number"
                    value={formData.max_clients}
                    onChange={(e) => setFormData({ ...formData, max_clients: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>AI Generation Limit (-1 = unlimited)</Label>
                  <Input
                    type="number"
                    value={formData.ai_generation_limit}
                    onChange={(e) => setFormData({ ...formData, ai_generation_limit: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <Label>Can Add Payment Gateway</Label>
                  <Switch
                    checked={formData.can_add_payment_gateway}
                    onCheckedChange={(checked) => setFormData({ ...formData, can_add_payment_gateway: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <Label>Can Create Client Plans</Label>
                  <Switch
                    checked={formData.can_create_client_plans}
                    onCheckedChange={(checked) => setFormData({ ...formData, can_create_client_plans: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded border border-purple-200">
                  <div>
                    <Label>Can Access Pro Plans 💎</Label>
                    <p className="text-xs text-gray-600 mt-1">Disease-Specific Clinical Meal Planning</p>
                  </div>
                  <Switch
                    checked={formData.can_access_pro_plans}
                    onCheckedChange={(checked) => setFormData({ ...formData, can_access_pro_plans: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <Label>Status Active</Label>
                  <Switch
                    checked={formData.status === 'active'}
                    onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? 'active' : 'inactive' })}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button onClick={() => setShowDialog(false)} variant="outline">Cancel</Button>
                <Button onClick={handleSubmit} className="bg-purple-600 hover:bg-purple-700">
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