import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Edit2, Trash2, Save } from "lucide-react";

export default function MealPlanConstraints() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingConstraint, setEditingConstraint] = useState(null);
  const [formData, setFormData] = useState({
    constraint_name: "",
    excluded_meals: "",
    excluded_ingredients: "",
    dietary_restrictions: "",
    preferred_meal_types: "",
    applies_to_goal: "all",
    applies_to_condition: [],
    is_default: false,
    notes: ""
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: constraints = [] } = useQuery({
    queryKey: ['mealPlanConstraints', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.MealPlanConstraints.filter({
        coach_email: user.email
      });
    },
    enabled: !!user?.email,
  });

  const createConstraintMutation = useMutation({
    mutationFn: (data) => {
      const processedData = {
        ...data,
        coach_email: user?.email,
        excluded_meals: data.excluded_meals ? data.excluded_meals.split('\n').map(m => m.trim()).filter(Boolean) : [],
        excluded_ingredients: data.excluded_ingredients ? data.excluded_ingredients.split('\n').map(i => i.trim()).filter(Boolean) : [],
        dietary_restrictions: data.dietary_restrictions ? data.dietary_restrictions.split('\n').map(r => r.trim()).filter(Boolean) : [],
        preferred_meal_types: data.preferred_meal_types ? data.preferred_meal_types.split('\n').map(p => p.trim()).filter(Boolean) : [],
        applies_to_condition: Array.isArray(data.applies_to_condition) ? data.applies_to_condition : []
      };
      return base44.entities.MealPlanConstraints.create(processedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['mealPlanConstraints']);
      resetForm();
      setShowDialog(false);
    },
  });

  const updateConstraintMutation = useMutation({
    mutationFn: (data) => {
      const processedData = {
        ...data,
        excluded_meals: data.excluded_meals ? data.excluded_meals.split('\n').map(m => m.trim()).filter(Boolean) : [],
        excluded_ingredients: data.excluded_ingredients ? data.excluded_ingredients.split('\n').map(i => i.trim()).filter(Boolean) : [],
        dietary_restrictions: data.dietary_restrictions ? data.dietary_restrictions.split('\n').map(r => r.trim()).filter(Boolean) : [],
        preferred_meal_types: data.preferred_meal_types ? data.preferred_meal_types.split('\n').map(p => p.trim()).filter(Boolean) : [],
        applies_to_condition: Array.isArray(data.applies_to_condition) ? data.applies_to_condition : []
      };
      return base44.entities.MealPlanConstraints.update(editingConstraint.id, processedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['mealPlanConstraints']);
      resetForm();
      setShowDialog(false);
    },
  });

  const deleteConstraintMutation = useMutation({
    mutationFn: (id) => base44.entities.MealPlanConstraints.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['mealPlanConstraints']);
    },
  });

  const resetForm = () => {
    setFormData({
      constraint_name: "",
      excluded_meals: "",
      excluded_ingredients: "",
      dietary_restrictions: "",
      preferred_meal_types: "",
      applies_to_goal: "all",
      applies_to_condition: [],
      is_default: false,
      notes: ""
    });
    setEditingConstraint(null);
  };

  const handleEdit = (constraint) => {
    setEditingConstraint(constraint);
    setFormData({
      constraint_name: constraint.constraint_name,
      excluded_meals: constraint.excluded_meals?.join('\n') || "",
      excluded_ingredients: constraint.excluded_ingredients?.join('\n') || "",
      dietary_restrictions: constraint.dietary_restrictions?.join('\n') || "",
      preferred_meal_types: constraint.preferred_meal_types?.join('\n') || "",
      applies_to_goal: constraint.applies_to_goal || "all",
      applies_to_condition: constraint.applies_to_condition || [],
      is_default: constraint.is_default || false,
      notes: constraint.notes || ""
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.constraint_name) {
      alert("Please enter a constraint name");
      return;
    }

    if (editingConstraint) {
      updateConstraintMutation.mutate(formData);
    } else {
      createConstraintMutation.mutate(formData);
    }
  };

  const goalOptions = {
    weight_loss: "Weight Loss",
    weight_gain: "Weight Gain",
    muscle_gain: "Muscle Gain",
    maintenance: "Maintenance",
    diabetes: "Diabetes",
    pcos: "PCOS",
    thyroid: "Thyroid",
    kidney: "Kidney Disease",
    heart: "Heart Health",
    all: "All Goals"
  };

  const conditionOptions = [
    { value: "hypertension", label: "Hypertension" },
    { value: "diabetes", label: "Diabetes" },
    { value: "pcos", label: "PCOS" },
    { value: "thyroid", label: "Thyroid Issues" },
    { value: "kidney_disease", label: "Kidney Disease" },
    { value: "heart_disease", label: "Heart Disease" },
    { value: "high_cholesterol", label: "High Cholesterol" }
  ];

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Meal Plan Constraints</h1>
            <p className="text-gray-600 mt-1">Create reusable constraint sets for meal plan generation</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowDialog(true);
            }}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Constraint Set
          </Button>
        </div>

        {constraints.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <p className="text-gray-500 mb-4">No constraint sets created yet</p>
              <p className="text-sm text-gray-400">Create constraint sets to quickly apply meal exclusions and restrictions</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {constraints.map((constraint) => (
              <Card key={constraint.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-base">{constraint.constraint_name}</CardTitle>
                      {constraint.is_default && (
                        <Badge className="mt-2 bg-blue-100 text-blue-800">Default</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(constraint)}
                        className="text-blue-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteConstraintMutation.mutate(constraint.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {constraint.notes && (
                    <p className="text-sm text-gray-600">{constraint.notes}</p>
                  )}
                  
                  <div className="space-y-2">
                    {constraint.excluded_meals?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-1">Excluded Meals:</p>
                        <div className="flex flex-wrap gap-1">
                          {constraint.excluded_meals.map((meal, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {meal}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {constraint.excluded_ingredients?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-1">Excluded Ingredients:</p>
                        <div className="flex flex-wrap gap-1">
                          {constraint.excluded_ingredients.map((ingredient, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {ingredient}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {constraint.dietary_restrictions?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-1">Restrictions:</p>
                        <div className="flex flex-wrap gap-1">
                          {constraint.dietary_restrictions.map((restriction, idx) => (
                            <Badge key={idx} className="bg-red-100 text-red-800 text-xs">
                              {restriction}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 border-t pt-2">
                    Applies to: <strong>{goalOptions[constraint.applies_to_goal]}</strong>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingConstraint ? "Edit Constraint Set" : "Create Constraint Set"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Constraint Set Name *</Label>
                <Input
                  value={formData.constraint_name}
                  onChange={(e) => setFormData({ ...formData, constraint_name: e.target.value })}
                  placeholder="e.g., 'Weight Loss Restrictions'"
                />
              </div>

              <div className="space-y-2">
                <Label>Applies To Goal *</Label>
                <Select
                  value={formData.applies_to_goal}
                  onValueChange={(value) => setFormData({ ...formData, applies_to_goal: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(goalOptions).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Applies To Conditions (Multiple)</Label>
                <div className="grid grid-cols-2 gap-3">
                  {conditionOptions.map((option) => (
                    <div key={option.value} className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.applies_to_condition.includes(option.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              applies_to_condition: [...formData.applies_to_condition, option.value]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              applies_to_condition: formData.applies_to_condition.filter(c => c !== option.value)
                            });
                          }
                        }}
                      />
                      <Label className="cursor-pointer text-sm">{option.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Excluded Meals (one per line)</Label>
                <Textarea
                  value={formData.excluded_meals}
                  onChange={(e) => setFormData({ ...formData, excluded_meals: e.target.value })}
                  placeholder="palak paneer&#10;fried items&#10;heavy gravies"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Excluded Ingredients (one per line)</Label>
                <Textarea
                  value={formData.excluded_ingredients}
                  onChange={(e) => setFormData({ ...formData, excluded_ingredients: e.target.value })}
                  placeholder="sesame&#10;coconut&#10;refined sugar"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Dietary Restrictions (one per line)</Label>
                <Textarea
                  value={formData.dietary_restrictions}
                  onChange={(e) => setFormData({ ...formData, dietary_restrictions: e.target.value })}
                  placeholder="no night milk&#10;no fruits after 6pm&#10;pre-meal water 30 min before lunch & dinner"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Preferred Meal Types (one per line)</Label>
                <Textarea
                  value={formData.preferred_meal_types}
                  onChange={(e) => setFormData({ ...formData, preferred_meal_types: e.target.value })}
                  placeholder="grilled options&#10;light meals&#10;high protein"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Why these restrictions? When should this be used?"
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                />
                <Label className="cursor-pointer">Use as default for this goal</Label>
              </div>

              <Alert className="bg-orange-50 border-orange-300">
                <AlertDescription className="text-sm text-orange-900">
                  These constraints will be applied during meal plan generation to automatically exclude meals and ensure compliance with dietary rules.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDialog(false);
                    resetForm();
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createConstraintMutation.isPending || updateConstraintMutation.isPending}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingConstraint ? "Update" : "Create"} Constraint
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}