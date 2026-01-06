import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, FileText, Edit, Trash2, Copy } from "lucide-react";

export default function AssessmentTemplates() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    template_name: '',
    description: '',
    include_medical_history: true,
    include_lifestyle_habits: true,
    include_dietary_preferences: true,
    include_fitness_level: true,
    include_health_goals: true,
    custom_sections: [],
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
    });
    setShowDialog(true);
  };

  const addCustomSection = () => {
    setFormData({
      ...formData,
      custom_sections: [
        ...formData.custom_sections,
        {
          section_title: '',
          section_key: `section_${Date.now()}`,
          questions: [],
        },
      ],
    });
  };

  const updateSection = (index, field, value) => {
    const sections = [...formData.custom_sections];
    sections[index][field] = value;
    setFormData({ ...formData, custom_sections: sections });
  };

  const removeSection = (index) => {
    const sections = formData.custom_sections.filter((_, i) => i !== index);
    setFormData({ ...formData, custom_sections: sections });
  };

  const addQuestion = (sectionIndex) => {
    const sections = [...formData.custom_sections];
    sections[sectionIndex].questions.push({
      question_text: '',
      question_type: 'text',
      options: [],
      required: false,
    });
    setFormData({ ...formData, custom_sections: sections });
  };

  const updateQuestion = (sectionIndex, questionIndex, field, value) => {
    const sections = [...formData.custom_sections];
    sections[sectionIndex].questions[questionIndex][field] = value;
    setFormData({ ...formData, custom_sections: sections });
  };

  const removeQuestion = (sectionIndex, questionIndex) => {
    const sections = [...formData.custom_sections];
    sections[sectionIndex].questions = sections[sectionIndex].questions.filter((_, i) => i !== questionIndex);
    setFormData({ ...formData, custom_sections: sections });
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Assessment Templates</h1>
            <p className="text-gray-600">Create custom assessment templates for your clients</p>
          </div>
          <Button onClick={() => setShowDialog(true)} className="bg-gradient-to-r from-orange-500 to-red-500">
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        </div>

        <div className="grid gap-4">
          {templates.map(template => (
            <Card key={template.id} className="border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-6 h-6 text-orange-500" />
                      <h3 className="text-xl font-semibold">{template.template_name}</h3>
                    </div>
                    <p className="text-gray-600 mb-3">{template.description}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {template.include_medical_history && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">Medical</span>}
                      {template.include_lifestyle_habits && <span className="px-2 py-1 bg-green-100 text-green-700 rounded">Lifestyle</span>}
                      {template.include_dietary_preferences && <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">Diet</span>}
                      {template.include_fitness_level && <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">Fitness</span>}
                      {template.include_health_goals && <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded">Goals</span>}
                      {template.custom_sections?.length > 0 && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                          {template.custom_sections.length} Custom Sections
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm('Delete this template?')) {
                          deleteMutation.mutate(template.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={showDialog} onOpenChange={(open) => !open && handleDialogClose()}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Assessment Template'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={formData.template_name}
                  onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                  placeholder="e.g., Diabetes Management Assessment"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe this template"
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-lg font-semibold">Standard Sections</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Medical History</span>
                    <Switch
                      checked={formData.include_medical_history}
                      onCheckedChange={(val) => setFormData({ ...formData, include_medical_history: val })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Lifestyle Habits</span>
                    <Switch
                      checked={formData.include_lifestyle_habits}
                      onCheckedChange={(val) => setFormData({ ...formData, include_lifestyle_habits: val })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Dietary Preferences</span>
                    <Switch
                      checked={formData.include_dietary_preferences}
                      onCheckedChange={(val) => setFormData({ ...formData, include_dietary_preferences: val })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Fitness Level</span>
                    <Switch
                      checked={formData.include_fitness_level}
                      onCheckedChange={(val) => setFormData({ ...formData, include_fitness_level: val })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Health Goals</span>
                    <Switch
                      checked={formData.include_health_goals}
                      onCheckedChange={(val) => setFormData({ ...formData, include_health_goals: val })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Custom Sections</Label>
                  <Button variant="outline" size="sm" onClick={addCustomSection}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Section
                  </Button>
                </div>

                {formData.custom_sections.map((section, sIndex) => (
                  <Card key={sIndex} className="p-4">
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          value={section.section_title}
                          onChange={(e) => updateSection(sIndex, 'section_title', e.target.value)}
                          placeholder="Section title"
                          className="flex-1"
                        />
                        <Button variant="outline" size="sm" onClick={() => removeSection(sIndex)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>

                      <div className="space-y-2 ml-4">
                        {section.questions.map((q, qIndex) => (
                          <div key={qIndex} className="flex gap-2 items-start">
                            <Input
                              value={q.question_text}
                              onChange={(e) => updateQuestion(sIndex, qIndex, 'question_text', e.target.value)}
                              placeholder="Question"
                              className="flex-1"
                            />
                            <Select
                              value={q.question_type}
                              onValueChange={(val) => updateQuestion(sIndex, qIndex, 'question_type', val)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="textarea">Long Text</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="select">Dropdown</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button variant="outline" size="sm" onClick={() => removeQuestion(sIndex, qIndex)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="ghost" size="sm" onClick={() => addQuestion(sIndex)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Question
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleDialogClose} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={() => saveMutation.mutate(formData)}
                  disabled={saveMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-500"
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save Template'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}