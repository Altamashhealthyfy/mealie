import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Zap } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function TemplateAssignmentManager({ clients, coachEmail }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [selectedConstraints, setSelectedConstraints] = useState([]);

  const { data: templates = [] } = useQuery({
    queryKey: ['customMealTemplates', coachEmail],
    queryFn: async () => {
      if (!coachEmail) return [];
      return await base44.entities.CustomMealTemplate.filter({
        coach_email: coachEmail
      });
    },
    enabled: !!coachEmail,
  });

  const { data: constraints = [] } = useQuery({
    queryKey: ['mealPlanConstraints', coachEmail],
    queryFn: async () => {
      if (!coachEmail) return [];
      return await base44.entities.MealPlanConstraints.filter({
        coach_email: coachEmail
      });
    },
    enabled: !!coachEmail,
  });

  const { data: clientProfiles = [] } = useQuery({
    queryKey: ['clientTemplateProfiles'],
    queryFn: async () => {
      if (clients.length === 0) return [];
      const profiles = await base44.entities.User.list();
      return profiles.filter(p => p.custom_data?.assigned_templates || p.custom_data?.assigned_constraints);
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (data) => {
      // Store assignment in user custom data
      const assignmentData = {
        assigned_templates: data.templates,
        assigned_constraints: data.constraints,
        assignment_date: new Date().toISOString()
      };

      // Update user custom data
      await base44.auth.updateMe({
        custom_data: {
          ...clientProfiles.find(p => p.id === data.clientId)?.custom_data,
          ...assignmentData
        }
      });

      return assignmentData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clientTemplateProfiles']);
      setSelectedTemplates([]);
      setSelectedConstraints([]);
      setSelectedClient(null);
      setShowDialog(false);
    },
  });

  const handleAssign = () => {
    if (!selectedClient || (selectedTemplates.length === 0 && selectedConstraints.length === 0)) {
      alert("Select a client and at least one template or constraint");
      return;
    }

    assignMutation.mutate({
      clientId: selectedClient.id,
      templates: selectedTemplates,
      constraints: selectedConstraints
    });
  };

  const toggleTemplate = (templateId) => {
    setSelectedTemplates(prev =>
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const toggleConstraint = (constraintId) => {
    setSelectedConstraints(prev =>
      prev.includes(constraintId)
        ? prev.filter(id => id !== constraintId)
        : [...prev, constraintId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Assign Templates & Constraints</h3>
        <Button
          onClick={() => setShowDialog(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Assignment
        </Button>
      </div>

      {/* Templates Overview */}
      {templates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Available Meal Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templates.map((template) => (
                <div key={template.id} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-sm text-gray-900">{template.template_name}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {template.meal_options?.length || 0} meal options
                  </p>
                  <Badge className="mt-2 bg-blue-100 text-blue-800 text-xs">
                    {template.usage_count || 0} uses
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Constraints Overview */}
      {constraints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Available Constraint Sets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {constraints.map((constraint) => (
                <div key={constraint.id} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-sm text-gray-900">{constraint.constraint_name}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    <Zap className="w-3 h-3 inline mr-1" />
                    {constraint.excluded_meals?.length || 0} excluded meals
                  </p>
                  {constraint.is_default && (
                    <Badge className="mt-2 bg-purple-100 text-purple-800 text-xs">Default</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Templates Warning */}
      {templates.length === 0 && constraints.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">No templates or constraints created yet</p>
            <p className="text-sm text-gray-400 mt-2">Create custom meal templates and constraint sets first to assign them to clients</p>
          </CardContent>
        </Card>
      )}

      {/* Assignment Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Templates & Constraints to Client</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Client Selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">Select Client *</label>
              <Select
                value={selectedClient?.id || ''}
                onValueChange={(clientId) => {
                  const client = clients.find(c => c.id === clientId);
                  setSelectedClient(client);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.full_name} - {client.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Templates Selection */}
            {templates.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-semibold">Meal Templates</label>
                <ScrollArea className="h-40 border rounded p-3">
                  <div className="space-y-2">
                    {templates.map((template) => (
                      <div key={template.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedTemplates.includes(template.id)}
                          onCheckedChange={() => toggleTemplate(template.id)}
                        />
                        <label className="text-sm cursor-pointer flex-1">
                          {template.template_name}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Constraints Selection */}
            {constraints.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-semibold">Constraint Sets</label>
                <ScrollArea className="h-40 border rounded p-3">
                  <div className="space-y-2">
                    {constraints.map((constraint) => (
                      <div key={constraint.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedConstraints.includes(constraint.id)}
                          onCheckedChange={() => toggleConstraint(constraint.id)}
                        />
                        <label className="text-sm cursor-pointer flex-1">
                          {constraint.constraint_name}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  setSelectedClient(null);
                  setSelectedTemplates([]);
                  setSelectedConstraints([]);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                disabled={!selectedClient || (selectedTemplates.length === 0 && selectedConstraints.length === 0)}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Assign to Client
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}