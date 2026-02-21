import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Zap, Plus, X, Copy, Edit2, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_TEMPLATES = [
  {
    id: 1,
    category: 'Encouragement',
    text: "Great progress this week! 🎉 Keep it up - you're doing amazing. Let me know if you have any questions about your meal plan.",
    icon: '🎉'
  },
  {
    id: 2,
    category: 'Check-in',
    text: "Hi! Just checking in to see how you're doing with your plan. How are you feeling about the macros? Any challenges so far?",
    icon: '👋'
  },
  {
    id: 3,
    category: 'Reminder',
    text: "Reminder: Please log your meals for today and share your progress update. This helps me give you better personalized guidance! 📝",
    icon: '📝'
  },
  {
    id: 4,
    category: 'Accountability',
    text: "I noticed you haven't logged in the past few days. Let's get back on track! Your health goals are important. When can we chat about any barriers you're facing?",
    icon: '💪'
  },
  {
    id: 5,
    category: 'Celebration',
    text: "Wow! You've hit a milestone! 🏆 I'm so proud of your consistency. This is exactly the kind of dedication that leads to lasting change.",
    icon: '🏆'
  },
];

export default function QuickReplyPanel({ selectedClient, onSelectTemplate, disabled = false }) {
  const [showPanel, setShowPanel] = useState(false);
  const [customTemplates, setCustomTemplates] = useState(() => {
    const saved = localStorage.getItem('quick_reply_templates');
    return saved ? JSON.parse(saved) : [];
  });
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newTemplate, setNewTemplate] = useState({ category: '', text: '', icon: '💬' });

  const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates];

  const saveTemplate = () => {
    if (!newTemplate.category.trim() || !newTemplate.text.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (editingId) {
      const updated = customTemplates.map(t => 
        t.id === editingId ? { ...newTemplate, id: editingId } : t
      );
      setCustomTemplates(updated);
      localStorage.setItem('quick_reply_templates', JSON.stringify(updated));
      toast.success('Template updated');
    } else {
      const template = {
        id: Date.now(),
        ...newTemplate
      };
      const updated = [...customTemplates, template];
      setCustomTemplates(updated);
      localStorage.setItem('quick_reply_templates', JSON.stringify(updated));
      toast.success('Template saved');
    }

    setNewTemplate({ category: '', text: '', icon: '💬' });
    setEditingId(null);
    setShowAddTemplate(false);
  };

  const deleteTemplate = (id) => {
    const updated = customTemplates.filter(t => t.id !== id);
    setCustomTemplates(updated);
    localStorage.setItem('quick_reply_templates', JSON.stringify(updated));
    toast.success('Template deleted');
  };

  const startEdit = (template) => {
    setNewTemplate({ category: template.category, text: template.text, icon: template.icon });
    setEditingId(template.id);
    setShowAddTemplate(true);
  };

  const cancelEdit = () => {
    setNewTemplate({ category: '', text: '', icon: '💬' });
    setEditingId(null);
    setShowAddTemplate(false);
  };

  if (!selectedClient) {
    return (
      <div className="text-center text-gray-500 text-sm py-2">
        Select a client to view quick replies
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPanel(!showPanel)}
          disabled={disabled}
          className="w-full flex gap-2 border-yellow-300 text-yellow-700 hover:bg-yellow-50"
        >
          <Zap className="w-4 h-4" />
          Quick Replies
        </Button>
      </div>

      {showPanel && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Quick Response Templates</CardTitle>
              <Dialog open={showAddTemplate} onOpenChange={setShowAddTemplate}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingId(null);
                      setNewTemplate({ category: '', text: '', icon: '💬' });
                    }}
                    className="h-8"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    New
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingId ? 'Edit Template' : 'Create Quick Reply Template'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Icon (e.g., 🎉)"
                        value={newTemplate.icon}
                        onChange={(e) => setNewTemplate({ ...newTemplate, icon: e.target.value })}
                        maxLength="2"
                        className="w-20"
                      />
                      <Input
                        placeholder="Category (e.g., Encouragement)"
                        value={newTemplate.category}
                        onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                    <Textarea
                      placeholder="Template text..."
                      value={newTemplate.text}
                      onChange={(e) => setNewTemplate({ ...newTemplate, text: e.target.value })}
                      rows={5}
                      className="resize-none"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={cancelEdit}>Cancel</Button>
                      <Button onClick={saveTemplate} className="bg-yellow-500 hover:bg-yellow-600">
                        <Save className="w-4 h-4 mr-2" />
                        Save Template
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {allTemplates.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">No templates yet</p>
            ) : (
              allTemplates.map((template) => {
                const isCustom = customTemplates.some(t => t.id === template.id);
                return (
                  <div
                    key={template.id}
                    className="p-3 bg-white rounded-lg border border-yellow-200 hover:border-yellow-400 transition-all group"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-lg">{template.icon}</span>
                      <div className="flex-1 min-w-0">
                        <Badge variant="outline" className="text-xs mb-1">
                          {template.category}
                        </Badge>
                        <p className="text-xs leading-relaxed text-gray-700">
                          {template.text}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          onSelectTemplate(template.text);
                          setShowPanel(false);
                          toast.success('Template added to message');
                        }}
                        className="h-7 text-xs hover:bg-yellow-100"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Use
                      </Button>
                      {isCustom && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(template)}
                            className="h-7 text-xs hover:bg-blue-100"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTemplate(template.id)}
                            className="h-7 text-xs hover:bg-red-100"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}