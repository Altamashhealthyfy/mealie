import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { X, Plus } from "lucide-react";

export default function ConditionalLogicBuilder({ question, allQuestions, onUpdate }) {
  const conditionalLogic = question.conditional_logic || {
    enabled: false,
    depends_on: '',
    condition: 'equals',
    value: ''
  };

  const updateLogic = (field, value) => {
    onUpdate({
      ...question,
      conditional_logic: {
        ...conditionalLogic,
        [field]: value
      }
    });
  };

  const availableQuestions = allQuestions.filter(q => 
    q.question_id !== question.question_id
  );

  const dependsOnQuestion = availableQuestions.find(q => 
    q.question_id === conditionalLogic.depends_on
  );

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-blue-900">
            Conditional Logic (Show/Hide Question)
          </Label>
          <Switch
            checked={conditionalLogic.enabled}
            onCheckedChange={(checked) => updateLogic('enabled', checked)}
          />
        </div>

        {conditionalLogic.enabled && (
          <div className="space-y-3 border-t border-blue-200 pt-3">
            <p className="text-xs text-blue-700">
              Show this question only when:
            </p>

            {/* Depends On Question */}
            <div className="space-y-2">
              <Label className="text-xs">Question</Label>
              <Select
                value={conditionalLogic.depends_on}
                onValueChange={(val) => updateLogic('depends_on', val)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select question..." />
                </SelectTrigger>
                <SelectContent>
                  {availableQuestions.map(q => (
                    <SelectItem key={q.question_id} value={q.question_id}>
                      {q.question_text}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Condition */}
            <div className="space-y-2">
              <Label className="text-xs">Condition</Label>
              <Select
                value={conditionalLogic.condition}
                onValueChange={(val) => updateLogic('condition', val)}
              >
                <SelectTrigger className="bg-white">
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

            {/* Value */}
            <div className="space-y-2">
              <Label className="text-xs">Value</Label>
              {dependsOnQuestion?.question_type === 'select' && dependsOnQuestion?.options ? (
                <Select
                  value={conditionalLogic.value}
                  onValueChange={(val) => updateLogic('value', val)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select value..." />
                  </SelectTrigger>
                  <SelectContent>
                    {dependsOnQuestion.options.map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={conditionalLogic.value}
                  onChange={(e) => updateLogic('value', e.target.value)}
                  placeholder="Enter value..."
                  className="bg-white"
                />
              )}
            </div>

            <div className="bg-blue-100 p-3 rounded text-xs text-blue-900">
              <strong>Preview:</strong> This question will appear when "{dependsOnQuestion?.question_text || '...'}" {conditionalLogic.condition.replace('_', ' ')} "{conditionalLogic.value || '...'}"
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}