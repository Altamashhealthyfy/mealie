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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit2, Trash2, Copy } from "lucide-react";

export default function CustomMealTemplateManager() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [mealOptions, setMealOptions] = useState([{
    meal_name: "",
    items: [],
    portion_sizes: [],
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0
  }]);

  const [formData, setFormData] = useState({
    template_name: "",
    description: "",
    meal_type: "breakfast",
    dietary_tags: [],
    is_public: false
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['customMealTemplates', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.CustomMealTemplate.filter({
        coach_email: user.email
      });
    },
    enabled: !!user?.email,
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.CustomMealTemplate.create({
      ...data,
      coach_email: user?.email,
      meal_options: mealOptions.filter(m => m.meal_name)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['customMealTemplates']);
      resetForm();
      setShowDialog(false);
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.CustomMealTemplate.update(editingTemplate.id, {
      ...data,
      meal_options: mealOptions.filter(m => m.meal_name)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['customMealTemplates']);
      resetForm();
      setShowDialog(false);
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.CustomMealTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['customMealTemplates']);
    },
  });

  const resetForm = () => {
    setFormData({
      template_name: "",
      description: "",
      meal_type: "breakfast",
      dietary_tags: [],
      is_public: false
    });
    setMealOptions([{
      meal_name: "",
      items: [],
      portion_sizes: [],
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0
    }]);
    setEditingTemplate(null);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name,
      description: template.description || "",
      meal_type: template.meal_type,
      dietary_tags: template.dietary_tags || [],
      is_public: template.is_public
    });
    setMealOptions(template.meal_options || []);
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.template_name || mealOptions.filter(m => m.meal_name).length === 0) {
      alert("Please enter template name and at least one meal option");
      return;
    }

    if (editingTemplate) {
      updateTemplateMutation.mutate(formData);
    } else {
      createTemplateMutation.mutate(formData);
    }
  };

  const updateMealOption = (index, field, value) => {
    const updated = [...mealOptions];
    updated[index] = { ...updated[index], [field]: value };
    setMealOptions(updated);
  };

  const mealTypeLabels = {
    breakfast: "🍳 Breakfast",
    midmorning: "🥤 Mid-Morning",
    lunch: "🍽️ Lunch",
    evening_snack: "🥜 Evening Snack",
    dinner: "🍲 Dinner",
    post_dinner: "🌿 Post Dinner"
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Custom Meal Templates</h3>
        <Button
          onClick={() => {
            resetForm();
            setShowDialog(true);
          }}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">No custom meal templates yet. Create one to reuse meal combinations.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-base">{template.template_name}</CardTitle>
                    <Badge className="mt-2 bg-green-100 text-green-800">
                      {mealTypeLabels[template.meal_type]}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(template)}
                      className="text-blue-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTemplateMutation.mutate(template.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {template.description && (
                  <p className="text-sm text-gray-600">{template.description}</p>
                )}
                
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Meal Options:</p>
                  {template.meal_options?.map((option, idx) => (
                    <div key={idx} className="text-xs bg-gray-50 p-2 rounded mb-2">
                      <p className="font-medium">{option.meal_name}</p>
                      <p className="text-gray-600">{option.calories} cal | P: {option.protein}g | C: {option.carbs}g | F: {option.fats}g</p>
                    </div>
                  ))}
                </div>

                {template.dietary_tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.dietary_tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <p className="text-xs text-gray-500">
                  Used {template.usage_count || 0} times
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
              {editingTemplate ? "Edit Meal Template" : "Create Custom Meal Template"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  value={formData.template_name}
                  onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                  placeholder="e.g., 'Light Breakfast Options'"
                />
              </div>

              <div className="space-y-2">
                <Label>Meal Type *</Label>
                <Select
                  value={formData.meal_type}
                  onValueChange={(value) => setFormData({ ...formData, meal_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(mealTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What's this template for?"
                rows={2}
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="font-semibold">Meal Options</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setMealOptions([...mealOptions, {
                    meal_name: "",
                    items: [],
                    portion_sizes: [],
                    calories: 0,
                    protein: 0,
                    carbs: 0,
                    fats: 0
                  }])}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Option
                </Button>
              </div>

              {mealOptions.map((option, idx) => (
                <Card key={idx} className="bg-gray-50">
                  <CardContent className="p-4 space-y-3">
                    <Input
                      value={option.meal_name}
                      onChange={(e) => updateMealOption(idx, 'meal_name', e.target.value)}
                      placeholder="Meal name (e.g., 'Oats with Berries')"
                    />
                    
                    <Textarea
                      value={option.items?.join('\n') || ''}
                      onChange={(e) => updateMealOption(idx, 'items', e.target.value.split('\n').filter(i => i.trim()))}
                      placeholder="Items (one per line)"
                      rows={2}
                    />

                    <Textarea
                      value={option.portion_sizes?.join('\n') || ''}
                      onChange={(e) => updateMealOption(idx, 'portion_sizes', e.target.value.split('\n').filter(i => i.trim()))}
                      placeholder="Portion sizes (one per line)"
                      rows={2}
                    />

                    <div className="grid grid-cols-4 gap-2">
                      <Input
                        type="number"
                        value={option.calories}
                        onChange={(e) => updateMealOption(idx, 'calories', parseFloat(e.target.value))}
                        placeholder="Calories"
                      />
                      <Input
                        type="number"
                        value={option.protein}
                        onChange={(e) => updateMealOption(idx, 'protein', parseFloat(e.target.value))}
                        placeholder="Protein (g)"
                      />
                      <Input
                        type="number"
                        value={option.carbs}
                        onChange={(e) => updateMealOption(idx, 'carbs', parseFloat(e.target.value))}
                        placeholder="Carbs (g)"
                      />
                      <Input
                        type="number"
                        value={option.fats}
                        onChange={(e) => updateMealOption(idx, 'fats', parseFloat(e.target.value))}
                        placeholder="Fats (g)"
                      />
                    </div>

                    {mealOptions.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-full text-red-600"
                        onClick={() => setMealOptions(mealOptions.filter((_, i) => i !== idx))}
                      >
                        Remove Option
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.is_public}
                onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
              />
              <Label className="cursor-pointer">Share with other coaches</Label>
            </div>

            <Alert className="bg-blue-50 border-blue-300">
              <AlertDescription className="text-sm text-blue-900">
                Save meal combinations to reuse across multiple meal plans quickly.
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
                disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {editingTemplate ? "Update" : "Create"} Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}