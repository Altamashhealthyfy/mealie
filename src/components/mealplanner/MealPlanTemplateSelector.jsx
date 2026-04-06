import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChefHat, Search, CheckCircle, Loader2, BookOpen, Eye, Pencil, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import MealPlanViewer from "@/components/client/MealPlanViewer";
import MealPlanEditor from "@/components/client/MealPlanEditor";

export default function MealPlanTemplateSelector({ client, onAssigned, onClose }) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [assigning, setAssigning] = useState(null);
  const [viewingTemplate, setViewingTemplate] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const { data: templates = [], isLoading, refetch } = useQuery({
    queryKey: ["mealPlanTemplates"],
    queryFn: () => base44.entities.MealPlanTemplate.list("-times_used", 100),
  });

  const filtered = templates.filter(t => {
    const matchSearch = !search || t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
    const matchCat = categoryFilter === "all" || t.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const handleAssign = async (template) => {
    setAssigning(template.id);
    try {
      const existingPlans = await base44.entities.MealPlan.filter({ client_id: client.id });
      await Promise.all(existingPlans.map(p => base44.entities.MealPlan.update(p.id, { active: false })));

      await base44.entities.MealPlan.create({
        client_id: client.id,
        name: `${template.name} — ${client.full_name}`,
        duration: template.duration,
        meals: template.meals,
        target_calories: template.target_calories,
        food_preference: template.food_preference || client.food_preference,
        regional_preference: template.regional_preference || client.regional_preference,
        plan_tier: "basic",
        meal_pattern: "daily",
        active: true,
        decision_rules_applied: [`Assigned from template: ${template.name}`],
      });

      await base44.entities.MealPlanTemplate.update(template.id, {
        times_used: (template.times_used || 0) + 1,
      });

      toast.success(`Template "${template.name}" assigned to ${client.full_name}!`);
      onAssigned?.();
    } catch (e) {
      toast.error("Failed to assign template: " + e.message);
    }
    setAssigning(null);
  };

  const handleEditSaved = async (updatedMeals) => {
    if (!editingTemplate) return;
    try {
      await base44.entities.MealPlanTemplate.update(editingTemplate.id, { meals: updatedMeals });
      toast.success("Template updated!");
      refetch();
      setEditingTemplate(null);
    } catch (e) {
      toast.error("Failed to save template: " + e.message);
    }
  };

  // ── Inline edit view ──
  if (editingTemplate) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setEditingTemplate(null)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Templates
        </button>
        <p className="text-sm font-semibold text-gray-700">Editing: {editingTemplate.name}</p>
        <MealPlanEditor
          plan={editingTemplate}
          onSaved={handleEditSaved}
          onCancel={() => setEditingTemplate(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40 text-sm">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="weight_loss">Weight Loss</SelectItem>
            <SelectItem value="diabetes">Diabetes</SelectItem>
            <SelectItem value="pcos">PCOS</SelectItem>
            <SelectItem value="thyroid">Thyroid</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
            <SelectItem value="general">General</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-10 h-10 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No templates found</p>
          <p className="text-xs text-gray-400 mt-1">Create templates from existing plans via "Save as Template"</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {filtered.map(template => (
            <Card key={template.id} className="border border-gray-200 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900 text-sm">{template.name}</p>
                      {template.category && (
                        <Badge className="bg-orange-100 text-orange-700 text-xs capitalize">{template.category.replace(/_/g, " ")}</Badge>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-xs text-gray-500 mb-2 line-clamp-2">{template.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {template.duration && <Badge variant="outline" className="text-xs">{template.duration} Days</Badge>}
                      {template.target_calories && <Badge variant="outline" className="text-xs">{template.target_calories} kcal</Badge>}
                      {template.food_preference && <Badge variant="outline" className="text-xs capitalize">{template.food_preference}</Badge>}
                      {template.times_used > 0 && (
                        <Badge className="bg-green-50 text-green-700 text-xs border border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" /> Used {template.times_used}x
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleAssign(template)}
                      disabled={assigning === template.id}
                      className="bg-green-500 hover:bg-green-600 text-xs h-7"
                    >
                      {assigning === template.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <><CheckCircle className="w-3 h-3 mr-1" /> Assign</>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewingTemplate(template)}
                      className="text-blue-600 border-blue-200 text-xs h-7"
                    >
                      <Eye className="w-3 h-3 mr-1" /> View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingTemplate(template)}
                      className="text-amber-700 border-amber-300 text-xs h-7"
                    >
                      <Pencil className="w-3 h-3 mr-1" /> Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Template Dialog */}
      <Dialog open={!!viewingTemplate} onOpenChange={() => setViewingTemplate(null)}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="truncate">{viewingTemplate?.name}</DialogTitle>
          </DialogHeader>
          {viewingTemplate && (
            <MealPlanViewer
              plan={viewingTemplate}
              allPlanIds={[]}
              hideActions={true}
              isCoach={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}