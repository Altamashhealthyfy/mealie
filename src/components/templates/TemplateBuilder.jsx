import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Copy, Settings } from "lucide-react";
import QuestionBuilder from "./QuestionBuilder";

export default function TemplateBuilder({ formData, setFormData }) {
  const [expandedSections, setExpandedSections] = useState({});

  const addCustomSection = () => {
    setFormData({
      ...formData,
      custom_sections: [
        ...formData.custom_sections,
        {
          section_title: '',
          section_key: `section_${Date.now()}`,
          section_description: '',
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

  const duplicateSection = (index) => {
    const sections = [...formData.custom_sections];
    const duplicate = { 
      ...sections[index], 
      section_key: `section_${Date.now()}`,
      section_title: `${sections[index].section_title} (Copy)`
    };
    sections.splice(index + 1, 0, duplicate);
    setFormData({ ...formData, custom_sections: sections });
  };

  const moveSection = (index, direction) => {
    const sections = [...formData.custom_sections];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < sections.length) {
      [sections[index], sections[newIndex]] = [sections[newIndex], sections[index]];
      setFormData({ ...formData, custom_sections: sections });
    }
  };

  const toggleSection = (index) => {
    setExpandedSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const addQuestion = (sectionIndex, question) => {
    const sections = [...formData.custom_sections];
    sections[sectionIndex].questions.push({
      question_id: `q_${Date.now()}`,
      question_text: '',
      question_type: 'text',
      options: [],
      required: false,
      placeholder: '',
      help_text: '',
      conditional_logic: {
        enabled: false,
        depends_on: '',
        condition: 'equals',
        value: ''
      },
      validation: {},
      ...question
    });
    setFormData({ ...formData, custom_sections: sections });
  };

  const updateQuestion = (sectionIndex, questionIndex, updates) => {
    const sections = [...formData.custom_sections];
    sections[sectionIndex].questions[questionIndex] = {
      ...sections[sectionIndex].questions[questionIndex],
      ...updates
    };
    setFormData({ ...formData, custom_sections: sections });
  };

  const removeQuestion = (sectionIndex, questionIndex) => {
    const sections = [...formData.custom_sections];
    sections[sectionIndex].questions = sections[sectionIndex].questions.filter((_, i) => i !== questionIndex);
    setFormData({ ...formData, custom_sections: sections });
  };

  const duplicateQuestion = (sectionIndex, questionIndex) => {
    const sections = [...formData.custom_sections];
    const duplicate = { 
      ...sections[sectionIndex].questions[questionIndex],
      question_id: `q_${Date.now()}`,
      question_text: `${sections[sectionIndex].questions[questionIndex].question_text} (Copy)`
    };
    sections[sectionIndex].questions.splice(questionIndex + 1, 0, duplicate);
    setFormData({ ...formData, custom_sections: sections });
  };

  const moveQuestion = (sectionIndex, questionIndex, direction) => {
    const sections = [...formData.custom_sections];
    const questions = sections[sectionIndex].questions;
    const newIndex = direction === 'up' ? questionIndex - 1 : questionIndex + 1;
    if (newIndex >= 0 && newIndex < questions.length) {
      [questions[questionIndex], questions[newIndex]] = [questions[newIndex], questions[questionIndex]];
      setFormData({ ...formData, custom_sections: sections });
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card className="border-2 border-orange-200">
        <CardHeader>
          <CardTitle className="text-lg">Template Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Template Name *</Label>
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
              placeholder="Describe the purpose and usage of this template"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Tags (comma-separated)</Label>
            <Input
              value={formData.tags?.join(', ') || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
              })}
              placeholder="diabetes, weight-loss, nutrition"
            />
          </div>
        </CardContent>
      </Card>

      {/* Standard Sections */}
      <Card className="border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">Standard Sections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <span className="font-medium">Medical History</span>
              <p className="text-xs text-gray-600">Current medications, allergies, chronic conditions</p>
            </div>
            <Switch
              checked={formData.include_medical_history}
              onCheckedChange={(val) => setFormData({ ...formData, include_medical_history: val })}
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <span className="font-medium">Lifestyle Habits</span>
              <p className="text-xs text-gray-600">Sleep, stress, alcohol, smoking, water intake</p>
            </div>
            <Switch
              checked={formData.include_lifestyle_habits}
              onCheckedChange={(val) => setFormData({ ...formData, include_lifestyle_habits: val })}
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <span className="font-medium">Dietary Preferences</span>
              <p className="text-xs text-gray-600">Diet type, meal frequency, food preferences</p>
            </div>
            <Switch
              checked={formData.include_dietary_preferences}
              onCheckedChange={(val) => setFormData({ ...formData, include_dietary_preferences: val })}
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <span className="font-medium">Fitness Level</span>
              <p className="text-xs text-gray-600">Current activity level, exercise frequency</p>
            </div>
            <Switch
              checked={formData.include_fitness_level}
              onCheckedChange={(val) => setFormData({ ...formData, include_fitness_level: val })}
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <span className="font-medium">Health Goals</span>
              <p className="text-xs text-gray-600">Primary goal, target weight, timeline</p>
            </div>
            <Switch
              checked={formData.include_health_goals}
              onCheckedChange={(val) => setFormData({ ...formData, include_health_goals: val })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Custom Sections */}
      <Card className="border-2 border-green-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Custom Sections</CardTitle>
          <Button variant="outline" size="sm" onClick={addCustomSection}>
            <Plus className="w-4 h-4 mr-2" />
            Add Section
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.custom_sections.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No custom sections yet. Click "Add Section" to create one.</p>
            </div>
          ) : (
            formData.custom_sections.map((section, sIndex) => (
              <Card key={sIndex} className="border-2 border-purple-200 bg-purple-50/30">
                <CardContent className="p-4 space-y-3">
                  {/* Section Header */}
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col gap-1 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveSection(sIndex, 'up')}
                        disabled={sIndex === 0}
                        className="h-6 w-6 p-0"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveSection(sIndex, 'down')}
                        disabled={sIndex === formData.custom_sections.length - 1}
                        className="h-6 w-6 p-0"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <div className="flex gap-2">
                        <Input
                          value={section.section_title}
                          onChange={(e) => updateSection(sIndex, 'section_title', e.target.value)}
                          placeholder="Section title"
                          className="flex-1 font-medium"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleSection(sIndex)}
                        >
                          {expandedSections[sIndex] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>

                      {expandedSections[sIndex] && (
                        <>
                          <Textarea
                            value={section.section_description}
                            onChange={(e) => updateSection(sIndex, 'section_description', e.target.value)}
                            placeholder="Section description (optional)"
                            rows={2}
                          />

                          {/* Questions */}
                          <div className="space-y-3 ml-4 pl-4 border-l-2 border-purple-300">
                            {section.questions.map((question, qIndex) => (
                              <QuestionBuilder
                                key={qIndex}
                                question={question}
                                allQuestions={section.questions}
                                onUpdate={(updates) => updateQuestion(sIndex, qIndex, updates)}
                                onRemove={() => removeQuestion(sIndex, qIndex)}
                                onDuplicate={() => duplicateQuestion(sIndex, qIndex)}
                                onMove={(direction) => moveQuestion(sIndex, qIndex, direction)}
                                canMoveUp={qIndex > 0}
                                canMoveDown={qIndex < section.questions.length - 1}
                              />
                            ))}
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addQuestion(sIndex)}
                              className="w-full border-dashed"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Question
                            </Button>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => duplicateSection(sIndex)}
                        title="Duplicate section"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeSection(sIndex)}
                        title="Delete section"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  {!expandedSections[sIndex] && section.questions.length > 0 && (
                    <div className="text-xs text-gray-600 ml-12">
                      {section.questions.length} question{section.questions.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}