import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, FileText, Edit, Trash2, Copy, Eye } from "lucide-react";
import TemplateBuilder from "../components/templates/TemplateBuilder";

export default function AssessmentTemplates() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [viewingTemplate, setViewingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    template_name: '',
    description: '',
    include_medical_history: true,
    include_lifestyle_habits: true,
    include_dietary_preferences: true,
    include_fitness_level: true,
    include_health_goals: true,
    custom_sections: [],
    tags: [],
    version: 1,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: templates } = useQuery({
    queryKey: ['assessmentTemplates', user?.email],
    queryFn: async () => {
      if (user?.user_type === 'super_admin') {
        return await base44.entities.AssessmentTemplate.list('-created_date');
      }
      return await base44.entities.AssessmentTemplate.filter({ created_by: user?.email }, '-created_date');
    },
    enabled: !!user,
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingTemplate) {
        return base44.entities.AssessmentTemplate.update(editingTemplate.id, data);
      }
      return base44.entities.AssessmentTemplate.create({ ...data, created_by: user.email });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['assessmentTemplates']);
      handleDialogClose();
      alert('Template saved successfully!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AssessmentTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['assessmentTemplates']);
      alert('Template deleted!');
    },
  });

  const handleDialogClose = () => {
    setShowDialog(false);
    setEditingTemplate(null);
    setFormData({
      template_name: '',
      description: '',
      include_medical_history: true,
      include_lifestyle_habits: true,
      include_dietary_preferences: true,
      include_fitness_level: true,
      include_health_goals: true,
      custom_sections: [],
      tags: [],
      version: 1,
    });
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name,
      description: template.description,
      include_medical_history: template.include_medical_history,
      include_lifestyle_habits: template.include_lifestyle_habits,
      include_dietary_preferences: template.include_dietary_preferences,
      include_fitness_level: template.include_fitness_level,
      include_health_goals: template.include_health_goals,
      custom_sections: template.custom_sections || [],
      tags: template.tags || [],
      version: template.version || 1,
    });
    setShowDialog(true);
  };

  const handleDuplicate = (template) => {
    setFormData({
      template_name: `${template.template_name} (Copy)`,
      description: template.description,
      include_medical_history: template.include_medical_history,
      include_lifestyle_habits: template.include_lifestyle_habits,
      include_dietary_preferences: template.include_dietary_preferences,
      include_fitness_level: template.include_fitness_level,
      include_health_goals: template.include_health_goals,
      custom_sections: template.custom_sections || [],
      tags: template.tags || [],
      version: 1,
    });
    setShowDialog(true);
  };

  const getTotalQuestions = (template) => {
    return (template.custom_sections || []).reduce((total, section) => 
      total + (section.questions || []).length, 0
    );
  };

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1 md:mb-2">Assessment Templates</h1>
            <p className="text-sm md:text-base text-gray-600">Create custom assessment templates for your clients</p>
          </div>
          <Button onClick={() => setShowDialog(true)} className="bg-gradient-to-r from-orange-500 to-red-500 w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        </div>

        <div className="grid gap-3 md:gap-4">
          {templates.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="p-6 md:p-12 text-center">
                <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Templates Yet</h3>
                <p className="text-gray-600 mb-4">Create your first assessment template to get started</p>
                <Button onClick={() => setShowDialog(true)} className="bg-gradient-to-r from-orange-500 to-red-500">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            templates.map(template => (
              <Card key={template.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3 md:gap-4">
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-center gap-2 md:gap-3 mb-2">
                        <FileText className="w-5 h-5 md:w-6 md:h-6 text-orange-500" />
                        <h3 className="text-lg md:text-xl font-semibold truncate">{template.template_name}</h3>
                        {template.version > 1 && (
                          <Badge variant="outline" className="text-xs">v{template.version}</Badge>
                        )}
                      </div>
                      <p className="text-gray-600 mb-3">{template.description}</p>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        {template.include_medical_history && <Badge className="bg-blue-100 text-blue-700">Medical</Badge>}
                        {template.include_lifestyle_habits && <Badge className="bg-green-100 text-green-700">Lifestyle</Badge>}
                        {template.include_dietary_preferences && <Badge className="bg-purple-100 text-purple-700">Diet</Badge>}
                        {template.include_fitness_level && <Badge className="bg-orange-100 text-orange-700">Fitness</Badge>}
                        {template.include_health_goals && <Badge className="bg-pink-100 text-pink-700">Goals</Badge>}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {template.custom_sections?.length > 0 && (
                          <span>📝 {template.custom_sections.length} custom sections</span>
                        )}
                        {getTotalQuestions(template) > 0 && (
                          <span>❓ {getTotalQuestions(template)} questions</span>
                        )}
                        {template.tags?.length > 0 && (
                          <div className="flex gap-1">
                            {template.tags.map((tag, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setViewingTemplate(template)}
                        title="Preview template"
                        className="flex-1 sm:flex-none"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEdit(template)}
                        title="Edit template"
                        className="flex-1 sm:flex-none"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDuplicate(template)}
                        title="Duplicate template"
                        className="flex-1 sm:flex-none"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm('Delete this template?')) {
                            deleteMutation.mutate(template.id);
                          }
                        }}
                        title="Delete template"
                        className="flex-1 sm:flex-none"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={(open) => !open && handleDialogClose()}>
          <DialogContent className="w-[95vw] max-w-6xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg md:text-2xl">
                {editingTemplate ? '✏️ Edit Template' : '➕ Create Assessment Template'}
              </DialogTitle>
            </DialogHeader>
            
            <TemplateBuilder formData={formData} setFormData={setFormData} />

            <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-white">
              <Button variant="outline" onClick={handleDialogClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => saveMutation.mutate(formData)}
                disabled={saveMutation.isPending || !formData.template_name}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500"
              >
                {saveMutation.isPending ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        {viewingTemplate && (
          <Dialog open={!!viewingTemplate} onOpenChange={() => setViewingTemplate(null)}>
            <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg md:text-2xl">👁️ Template Preview: {viewingTemplate.template_name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <p className="text-gray-600">{viewingTemplate.description}</p>
                
                {viewingTemplate.tags?.length > 0 && (
                  <div className="flex gap-2">
                    {viewingTemplate.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                )}

                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Standard Sections Included:</h3>
                  <div className="flex flex-wrap gap-2">
                    {viewingTemplate.include_medical_history && <Badge className="bg-blue-500">Medical History</Badge>}
                    {viewingTemplate.include_lifestyle_habits && <Badge className="bg-green-500">Lifestyle Habits</Badge>}
                    {viewingTemplate.include_dietary_preferences && <Badge className="bg-purple-500">Dietary Preferences</Badge>}
                    {viewingTemplate.include_fitness_level && <Badge className="bg-orange-500">Fitness Level</Badge>}
                    {viewingTemplate.include_health_goals && <Badge className="bg-pink-500">Health Goals</Badge>}
                  </div>
                </div>

                {viewingTemplate.custom_sections?.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Custom Sections:</h3>
                    {viewingTemplate.custom_sections.map((section, idx) => (
                      <Card key={idx} className="p-4 bg-purple-50">
                        <h4 className="font-semibold mb-2">{section.section_title}</h4>
                        {section.section_description && (
                          <p className="text-sm text-gray-600 mb-3">{section.section_description}</p>
                        )}
                        <div className="space-y-2 ml-4">
                          {section.questions?.map((q, qIdx) => (
                            <div key={qIdx} className="flex items-start gap-2 text-sm">
                              <span className="text-gray-500">{qIdx + 1}.</span>
                              <div className="flex-1">
                                <p className="font-medium">{q.question_text}</p>
                                <div className="flex gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">{q.question_type}</Badge>
                                  {q.required && <Badge variant="outline" className="text-xs text-red-600">Required</Badge>}
                                  {q.conditional_logic?.enabled && (
                                    <Badge variant="outline" className="text-xs text-blue-600">Conditional</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}