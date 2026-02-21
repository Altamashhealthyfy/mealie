import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Send,
  Edit2,
  Trash2,
  Search,
  Save,
  X
} from "lucide-react";

export default function TemplateMessagePanel({ coachEmail, onSelectTemplate, clientName = "" }) {
  const [showDialog, setShowDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "greeting",
    description: "",
    variables: []
  });
  const queryClient = useQueryClient();

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ["messageTemplates", coachEmail],
    queryFn: async () => {
      try {
        const result = await base44.entities.MessageTemplate.filter({ coach_email: coachEmail });
        return result;
      } catch {
        return [];
      }
    }
  });

  // Save template mutation
  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingTemplate) {
        return base44.entities.MessageTemplate.update(editingTemplate.id, data);
      }
      return base44.entities.MessageTemplate.create({ ...data, coach_email: coachEmail });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messageTemplates"] });
      resetForm();
      setShowDialog(false);
    }
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MessageTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messageTemplates"] })
  });

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      category: "greeting",
      description: "",
      variables: []
    });
    setEditingTemplate(null);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setFormData(template);
    setShowDialog(true);
  };

  const handleUseTemplate = (template) => {
    let content = template.content;
    // Replace variables
    if (clientName) {
      content = content.replace(/{client_name}/g, clientName);
    }
    onSelectTemplate(content);
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categoryColors = {
    greeting: "bg-blue-100 text-blue-800",
    check_in: "bg-purple-100 text-purple-800",
    motivation: "bg-green-100 text-green-800",
    meal_plan: "bg-orange-100 text-orange-800",
    progress_feedback: "bg-cyan-100 text-cyan-800",
    appointment_reminder: "bg-yellow-100 text-yellow-800",
    congratulations: "bg-pink-100 text-pink-800",
    assistance: "bg-red-100 text-red-800",
    other: "bg-gray-100 text-gray-800"
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="greeting">Greeting</SelectItem>
            <SelectItem value="check_in">Check-in</SelectItem>
            <SelectItem value="motivation">Motivation</SelectItem>
            <SelectItem value="meal_plan">Meal Plan</SelectItem>
            <SelectItem value="progress_feedback">Progress Feedback</SelectItem>
            <SelectItem value="appointment_reminder">Appointment</SelectItem>
            <SelectItem value="congratulations">Congratulations</SelectItem>
            <SelectItem value="assistance">Assistance</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => { resetForm(); setShowDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          New
        </Button>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="border-2 hover:shadow-md transition-all">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-gray-900 truncate">{template.title}</h4>
                    <Badge className={`text-xs mt-1 ${categoryColors[template.category]}`}>
                      {template.category.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditTemplate(template)}
                      className="h-7 w-7 p-0"
                    >
                      <Edit2 className="w-3 h-3 text-blue-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(template.id)}
                      className="h-7 w-7 p-0"
                    >
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2 mb-2">{template.content}</p>
                <Button
                  size="sm"
                  onClick={() => handleUseTemplate(template)}
                  className="w-full h-7 text-xs bg-gradient-to-r from-orange-500 to-red-500 text-white"
                >
                  <Send className="w-3 h-3 mr-1" />
                  Use Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">No templates found. Create one to get started!</p>
        </div>
      )}

      {/* Template Editor Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Template Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Weekly Check-in"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="greeting">Greeting</SelectItem>
                  <SelectItem value="check_in">Check-in</SelectItem>
                  <SelectItem value="motivation">Motivation</SelectItem>
                  <SelectItem value="meal_plan">Meal Plan</SelectItem>
                  <SelectItem value="progress_feedback">Progress Feedback</SelectItem>
                  <SelectItem value="appointment_reminder">Appointment Reminder</SelectItem>
                  <SelectItem value="congratulations">Congratulations</SelectItem>
                  <SelectItem value="assistance">Assistance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Message Content *</label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Type your message. Use {client_name} for dynamic values"
                rows={5}
              />
              <p className="text-xs text-gray-500">
                Available variables: {'{client_name}'}, {'{weight}'}, {'{goal}'}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="When to use this template"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => saveMutation.mutate(formData)}
                disabled={!formData.title || !formData.content || saveMutation.isPending}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Save Template"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}