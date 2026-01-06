import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, Edit, Trash2, Calendar, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export default function GoalCard({ goal, onEdit, onDelete }) {
  const calculateProgress = () => {
    if (!goal.start_value || !goal.target_value || !goal.current_value) return 0;
    const total = Math.abs(goal.target_value - goal.start_value);
    const current = Math.abs(goal.current_value - goal.start_value);
    return Math.min(Math.round((current / total) * 100), 100);
  };

  const progress = calculateProgress();
  const daysRemaining = goal.target_date 
    ? Math.ceil((new Date(goal.target_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const statusColors = {
    active: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    paused: "bg-yellow-100 text-yellow-800",
    cancelled: "bg-red-100 text-red-800"
  };

  const priorityColors = {
    low: "border-gray-300",
    medium: "border-yellow-300",
    high: "border-red-300"
  };

  return (
    <Card className={`border-2 ${priorityColors[goal.priority]}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">{goal.title}</CardTitle>
              <Badge className={`${statusColors[goal.status]} mt-1`}>
                {goal.status}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => onEdit(goal)}>
              <Edit className="w-4 h-4 text-blue-500" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(goal.id)}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {goal.description && (
          <p className="text-sm text-gray-600">{goal.description}</p>
        )}

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3" />
          <div className="flex justify-between text-sm text-gray-600">
            <span>Start: {goal.start_value} {goal.unit}</span>
            <span>Current: {goal.current_value} {goal.unit}</span>
            <span>Target: {goal.target_value} {goal.unit}</span>
          </div>
        </div>

        {goal.target_date && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">
              Target: {format(new Date(goal.target_date), 'MMM d, yyyy')}
            </span>
            {daysRemaining !== null && daysRemaining > 0 && (
              <Badge variant="outline" className="ml-auto">
                {daysRemaining} days left
              </Badge>
            )}
          </div>
        )}

        {goal.status === 'completed' && goal.completed_date && (
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-700 font-medium">
              Completed on {format(new Date(goal.completed_date), 'MMM d, yyyy')}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}