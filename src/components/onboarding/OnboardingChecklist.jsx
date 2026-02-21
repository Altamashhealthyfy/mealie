import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, ArrowRight, Sparkles } from 'lucide-react';
import { createPageUrl } from '@/utils';

const ONBOARDING_TASKS = [
  {
    id: 'complete_profile',
    title: 'Complete Your Profile',
    description: 'Add basic info and health details',
    link: createPageUrl('Profile'),
    checkField: (client) => client?.age && client?.weight && client?.height && client?.goal
  },
  {
    id: 'view_meal_plan',
    title: 'View Your Meal Plan',
    description: 'Check your personalized nutrition plan',
    link: createPageUrl('MyAssignedMealPlan'),
    checkField: (client, mealPlan) => mealPlan?.id
  },
  {
    id: 'log_first_meal',
    title: 'Log Your First Meal',
    description: 'Track what you eat today',
    link: createPageUrl('FoodLog'),
    checkField: (client, mealPlan, foodLogs) => foodLogs?.length > 0
  },
  {
    id: 'submit_progress',
    title: 'Log Your Progress',
    description: 'Record weight and measurements',
    link: createPageUrl('ProgressTracking'),
    checkField: (client, mealPlan, foodLogs, progressLogs) => progressLogs?.length > 0
  },
  {
    id: 'message_coach',
    title: 'Message Your Coach',
    description: 'Introduce yourself and ask questions',
    link: createPageUrl('ClientCommunication'),
    checkField: (client, mealPlan, foodLogs, progressLogs, messages) => messages?.length > 0
  },
  {
    id: 'upload_report',
    title: 'Upload Health Reports (Optional)',
    description: 'Share blood work or medical reports',
    link: createPageUrl('ClientReportUpload'),
    checkField: (client, mealPlan, foodLogs, progressLogs, messages, reports) => reports?.length > 0
  }
];

export default function OnboardingChecklist({ 
  client, 
  mealPlan, 
  foodLogs = [], 
  progressLogs = [], 
  messages = [], 
  healthReports = [] 
}) {
  const completedTasks = ONBOARDING_TASKS.filter(task => 
    task.checkField(client, mealPlan, foodLogs, progressLogs, messages, healthReports)
  );
  
  const progress = (completedTasks.length / ONBOARDING_TASKS.length) * 100;

  if (completedTasks.length === ONBOARDING_TASKS.length) {
    return null; // Hide checklist when all tasks complete
  }

  return (
    <Card className="border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-500" />
            Get Started Checklist
          </CardTitle>
          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
            {completedTasks.length}/{ONBOARDING_TASKS.length}
          </Badge>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {ONBOARDING_TASKS.map(task => {
          const isCompleted = task.checkField(client, mealPlan, foodLogs, progressLogs, messages, healthReports);
          return (
            <div
              key={task.id}
              className={`p-3 rounded-lg border-2 transition-all ${
                isCompleted 
                  ? 'bg-green-50 border-green-300' 
                  : 'bg-white border-gray-200 hover:border-orange-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${isCompleted ? 'text-green-900 line-through' : 'text-gray-900'}`}>
                    {task.title}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {task.description}
                  </p>
                </div>
                {!isCompleted && (
                  <Button
                    onClick={() => window.location.href = task.link}
                    size="sm"
                    variant="ghost"
                    className="text-orange-600 hover:bg-orange-100 flex-shrink-0"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}