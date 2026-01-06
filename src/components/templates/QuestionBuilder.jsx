import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Trash2, Copy, ChevronUp, ChevronDown, Settings, Plus, X,
  Type, AlignLeft, Hash, List, CheckSquare, Circle, Sliders, Calendar, Upload
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const questionTypeIcons = {
  text: Type,
  textarea: AlignLeft,
  number: Hash,
  select: List,
  multiselect: CheckSquare,
  checkbox: CheckSquare,
  radio: Circle,
  scale: Sliders,
  date: Calendar,
  file: Upload
};

export default function QuestionBuilder({ 
  question, 
  allQuestions,
  onUpdate, 
  onRemove, 
  onDuplicate,
  onMove,
  canMoveUp,
  canMoveDown
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const Icon = questionTypeIcons[question.question_type] || Type;

  const needsOptions = ['select', 'multiselect', 'radio', 'checkbox'].includes(question.question_type);
  const needsScale = question.question_type === 'scale';

  const addOption = () => {
    onUpdate({
      options: [...(question.options || []), '']
    });
  };

  const updateOption = (index, value) => {
    const newOptions = [...(question.options || [])];
    newOptions[index] = value;
    onUpdate({ options: newOptions });
  };

  const removeOption = (index) => {
    const newOptions = (question.options || []).filter((_, i) => i !== index);
    onUpdate({ options: newOptions });
  };

  return (
    <Card className="p-4 bg-white border-2 border-gray-200">
      <div className="space-y-3">
        {/* Question Header */}
        <div className="flex items-start gap-2">
          <div className="flex flex-col gap-1 mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMove('up')}
              disabled={!canMoveUp}
              className="h-6 w-6 p-0"
            >
              <ChevronUp className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMove('down')}
              disabled={!canMoveDown}
              className="h-6 w-6 p-0"
            >
              <ChevronDown className="w-3 h-3" />
            </Button>
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex gap-2 flex-1">
                <Icon className="w-5 h-5 text-purple-600 mt-2 shrink-0" />
                <Input
                  value={question.question_text}
                  onChange={(e) => onUpdate({ question_text: e.target.value })}
                  placeholder="Enter your question"
                  className="flex-1"
                />
              </div>
              <Select
                value={question.question_type}
                onValueChange={(val) => onUpdate({ question_type: val })}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Short Text</SelectItem>
                  <SelectItem value="textarea">Long Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="select">Dropdown</SelectItem>
                  <SelectItem value="multiselect">Multi-Select</SelectItem>
                  <SelectItem value="checkbox">Checkboxes</SelectItem>
                  <SelectItem value="radio">Radio Buttons</SelectItem>
                  <SelectItem value="scale">Scale (1-10)</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="file">File Upload</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Options for select/radio/checkbox */}
            {needsOptions && (
              <div className="ml-8 space-y-2">
                <Label className="text-xs text-gray-600">Options:</Label>
                {(question.options || []).map((option, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={option}
                      onChange={(e) => updateOption(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      className="text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(idx)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  className="text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Option
                </Button>
              </div>
            )}

            {/* Scale Configuration */}
            {needsScale && (
              <div className="ml-8 grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Min Value</Label>
                  <Input
                    type="number"
                    value={question.scale_min || 1}
                    onChange={(e) => onUpdate({ scale_min: parseInt(e.target.value) })}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max Value</Label>
                  <Input
                    type="number"
                    value={question.scale_max || 10}
                    onChange={(e) => onUpdate({ scale_max: parseInt(e.target.value) })}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Min Label</Label>
                  <Input
                    value={question.scale_labels?.min_label || ''}
                    onChange={(e) => onUpdate({ 
                      scale_labels: { ...question.scale_labels, min_label: e.target.value }
                    })}
                    placeholder="e.g., Not at all"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max Label</Label>
                  <Input
                    value={question.scale_labels?.max_label || ''}
                    onChange={(e) => onUpdate({ 
                      scale_labels: { ...question.scale_labels, max_label: e.target.value }
                    })}
                    placeholder="e.g., Extremely"
                    className="text-sm"
                  />
                </div>
              </div>
            )}

            {/* Quick Settings */}
            <div className="flex items-center gap-4 ml-8 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={question.required}
                  onCheckedChange={(val) => onUpdate({ required: val })}
                />
                <span className="text-xs">Required</span>
              </label>

              <Dialog open={showAdvanced} onOpenChange={setShowAdvanced}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs">
                    <Settings className="w-3 h-3 mr-1" />
                    Advanced
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
                  <DialogHeader>
                    <DialogTitle>Advanced Settings</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Placeholder Text</Label>
                      <Input
                        value={question.placeholder || ''}
                        onChange={(e) => onUpdate({ placeholder: e.target.value })}
                        placeholder="Hint text for the user"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Help Text</Label>
                      <Textarea
                        value={question.help_text || ''}
                        onChange={(e) => onUpdate({ help_text: e.target.value })}
                        placeholder="Additional guidance for the user"
                        rows={2}
                      />
                    </div>

                    {/* Conditional Logic */}
                    <Card className="p-4 bg-blue-50">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="font-semibold">Conditional Logic</Label>
                          <Switch
                            checked={question.conditional_logic?.enabled || false}
                            onCheckedChange={(val) => onUpdate({
                              conditional_logic: { ...question.conditional_logic, enabled: val }
                            })}
                          />
                        </div>

                        {question.conditional_logic?.enabled && (
                          <>
                            <div className="space-y-2">
                              <Label className="text-xs">Show this question only if:</Label>
                              <Select
                                value={question.conditional_logic?.depends_on || ''}
                                onValueChange={(val) => onUpdate({
                                  conditional_logic: { ...question.conditional_logic, depends_on: val }
                                })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a question" />
                                </SelectTrigger>
                                <SelectContent>
                                  {allQuestions
                                    .filter(q => q.question_id !== question.question_id)
                                    .map(q => (
                                      <SelectItem key={q.question_id} value={q.question_id}>
                                        {q.question_text || 'Untitled Question'}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label className="text-xs">Condition</Label>
                                <Select
                                  value={question.conditional_logic?.condition || 'equals'}
                                  onValueChange={(val) => onUpdate({
                                    conditional_logic: { ...question.conditional_logic, condition: val }
                                  })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="equals">Equals</SelectItem>
                                    <SelectItem value="not_equals">Not Equals</SelectItem>
                                    <SelectItem value="contains">Contains</SelectItem>
                                    <SelectItem value="greater_than">Greater Than</SelectItem>
                                    <SelectItem value="less_than">Less Than</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs">Value</Label>
                                <Input
                                  value={question.conditional_logic?.value || ''}
                                  onChange={(e) => onUpdate({
                                    conditional_logic: { ...question.conditional_logic, value: e.target.value }
                                  })}
                                  placeholder="Value to compare"
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </Card>

                    {/* Validation */}
                    {(question.question_type === 'text' || question.question_type === 'textarea' || question.question_type === 'number') && (
                      <Card className="p-4 bg-orange-50">
                        <Label className="font-semibold mb-3 block">Validation Rules</Label>
                        <div className="grid grid-cols-2 gap-3">
                          {(question.question_type === 'text' || question.question_type === 'textarea') && (
                            <>
                              <div className="space-y-2">
                                <Label className="text-xs">Min Length</Label>
                                <Input
                                  type="number"
                                  value={question.validation?.min_length || ''}
                                  onChange={(e) => onUpdate({
                                    validation: { ...question.validation, min_length: parseInt(e.target.value) || undefined }
                                  })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Max Length</Label>
                                <Input
                                  type="number"
                                  value={question.validation?.max_length || ''}
                                  onChange={(e) => onUpdate({
                                    validation: { ...question.validation, max_length: parseInt(e.target.value) || undefined }
                                  })}
                                />
                              </div>
                            </>
                          )}
                          {question.question_type === 'number' && (
                            <>
                              <div className="space-y-2">
                                <Label className="text-xs">Min Value</Label>
                                <Input
                                  type="number"
                                  value={question.validation?.min_value || ''}
                                  onChange={(e) => onUpdate({
                                    validation: { ...question.validation, min_value: parseFloat(e.target.value) || undefined }
                                  })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Max Value</Label>
                                <Input
                                  type="number"
                                  value={question.validation?.max_value || ''}
                                  onChange={(e) => onUpdate({
                                    validation: { ...question.validation, max_value: parseFloat(e.target.value) || undefined }
                                  })}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </Card>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {question.conditional_logic?.enabled && (
                <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                  Conditional
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onDuplicate}
              title="Duplicate question"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRemove}
              title="Delete question"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}