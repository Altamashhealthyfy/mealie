import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2, Circle, Lock, Zap, BookOpen, MessageSquare,
  ChefHat, TrendingUp, Heart, Target, FileText
} from 'lucide-react';

const ONBOARDING_PHASES = [
  {
    id: 'profile',
    phase: 1,
    title: 'Complete Profile',
    description: 'Set up your basic health information',
    icon: Heart,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    substeps: [
      { id: 'basic', label: 'Basic Info', icon: Circle },
      { id: 'metrics', label: 'Body Metrics', icon: Circle },
      { id: 'health', label: 'Health Profile', icon: Circle },
    ]
  },
  {
    id: 'goals',
    phase: 2,
    title: 'Set Goals',
    description: 'Define your health and nutrition goals',
    icon: Target,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    substeps: [
      { id: 'goals_set', label: 'Create Goals', icon: Circle },
      { id: 'goals_confirm', label: 'Confirm Goals', icon: Circle },
    ]
  },
  {
    id: 'session',
    phase: 3,
    title: 'Schedule Session',
    description: 'Book your first coaching session',
    icon: Zap,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    substeps: [
      { id: 'session_select', label: 'Pick Time Slot', icon: Circle },
      { id: 'session_confirm', label: 'Confirm Booking', icon: Circle },
    ]
  },
  {
    id: 'tutorial',
    phase: 4,
    title: 'Learn the App',
    description: 'Walk through key features',
    icon: BookOpen,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    substeps: [
      { id: 'tutorial_progress', label: 'Progress Tracking', icon: Circle },
      { id: 'tutorial_messaging', label: 'Messaging', icon: Circle },
      { id: 'tutorial_meals', label: 'Meal Plans', icon: Circle },
      { id: 'tutorial_goals', label: 'Goals', icon: Circle },
    ]
  },
  {
    id: 'quick_start',
    phase: 5,
    title: 'Quick Start',
    description: 'Begin your health journey',
    icon: Zap,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    substeps: [
      { id: 'view_meal', label: 'View Meal Plan', icon: ChefHat },
      { id: 'log_meal', label: 'Log First Meal', icon: ChefHat },
      { id: 'log_progress', label: 'Log Progress', icon: TrendingUp },
      { id: 'message', label: 'Message Coach', icon: MessageSquare },
    ]
  }
];

export default function OnboardingProgressTracker({ 
  currentPhase = 1,
  completedPhases = [],
  completedSubsteps = {},
  showDetails = false,
  variant = 'compact' // 'compact' | 'detailed' | 'sidebar'
}) {
  const totalPhases = ONBOARDING_PHASES.length;
  const overallProgress = (completedPhases.length / totalPhases) * 100;
  
  const getPhaseStatus = (phaseId) => {
    if (completedPhases.includes(phaseId)) return 'completed';
    if (ONBOARDING_PHASES.find(p => p.id === phaseId)?.phase <= currentPhase) return 'active';
    return 'locked';
  };

  const getSubstepStatus = (phaseId, substepId) => {
    const key = `${phaseId}_${substepId}`;
    if (completedSubsteps[key]) return 'completed';
    if (getPhaseStatus(phaseId) === 'locked') return 'locked';
    return 'pending';
  };

  // Compact view - horizontal progress bar
  if (variant === 'compact') {
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-700">Onboarding Progress</span>
          <span className="text-sm font-bold text-orange-600">{completedPhases.length}/{totalPhases}</span>
        </div>
        <Progress value={overallProgress} className="h-2" />
      </div>
    );
  }

  // Sidebar view - vertical with phases
  if (variant === 'sidebar') {
    return (
      <Card className="border-none shadow-lg bg-gradient-to-b from-orange-50 to-amber-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" />
            Onboarding Journey
          </CardTitle>
          <div className="mt-3 space-y-2">
            <Progress value={overallProgress} className="h-2" />
            <p className="text-xs text-gray-600 text-center">{completedPhases.length}/{totalPhases} Phases Complete</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {ONBOARDING_PHASES.map((phase) => {
            const status = getPhaseStatus(phase.id);
            const Icon = phase.icon;
            return (
              <div
                key={phase.id}
                className={`p-3 rounded-lg border-2 transition-all ${
                  status === 'completed'
                    ? 'bg-green-50 border-green-300'
                    : status === 'active'
                    ? 'bg-white border-orange-300 shadow-sm'
                    : 'bg-gray-50 border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-start gap-2">
                  {status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : status === 'locked' ? (
                    <Lock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Icon className={`w-5 h-5 ${phase.color} flex-shrink-0 mt-0.5`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${status === 'completed' ? 'text-green-900 line-through' : 'text-gray-900'}`}>
                      {phase.title}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">{phase.description}</p>
                  </div>
                  <Badge className={`text-xs flex-shrink-0 ${
                    status === 'completed' ? 'bg-green-600' : status === 'active' ? 'bg-orange-500' : 'bg-gray-300'
                  } text-white`}>
                    Phase {phase.phase}
                  </Badge>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  // Detailed view - full breakdown with substeps
  return (
    <Card className="shadow-xl border-2 border-orange-200">
      <CardHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-orange-500" />
              Your Onboarding Journey
            </CardTitle>
            <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1">
              {completedPhases.length}/{totalPhases} Complete
            </Badge>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Overall Progress</span>
              <span className="font-bold text-orange-600">{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-3 rounded-lg" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {ONBOARDING_PHASES.map((phase, idx) => {
          const status = getPhaseStatus(phase.id);
          const Icon = phase.icon;
          const substepCompletion = phase.substeps.filter(
            s => getSubstepStatus(phase.id, s.id) === 'completed'
          ).length;
          const substepProgress = (substepCompletion / phase.substeps.length) * 100;

          return (
            <div
              key={phase.id}
              className={`border-2 rounded-xl p-4 transition-all ${
                status === 'completed'
                  ? 'bg-green-50 border-green-300'
                  : status === 'active'
                  ? `${phase.bgColor} border-orange-300 shadow-md`
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              {/* Phase Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    status === 'completed'
                      ? 'bg-green-200'
                      : status === 'active'
                      ? 'bg-white border-2 border-orange-300'
                      : 'bg-gray-200'
                  }`}>
                    {status === 'completed' ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    ) : status === 'locked' ? (
                      <Lock className="w-5 h-5 text-gray-500" />
                    ) : (
                      <Icon className={`w-5 h-5 ${phase.color}`} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-base ${
                      status === 'completed' ? 'text-green-900 line-through' : 'text-gray-900'
                    }`}>
                      Phase {phase.phase}: {phase.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-0.5">{phase.description}</p>
                  </div>
                </div>
                <Badge className={`flex-shrink-0 ${
                  status === 'completed'
                    ? 'bg-green-600'
                    : status === 'active'
                    ? 'bg-orange-500'
                    : 'bg-gray-400'
                } text-white`}>
                  {status === 'completed' ? '✓ Done' : status === 'active' ? 'In Progress' : 'Locked'}
                </Badge>
              </div>

              {/* Progress Bar for Phase */}
              {status !== 'locked' && (
                <div className="mb-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Phase Progress</span>
                    <span className="font-semibold text-gray-700">{substepCompletion}/{phase.substeps.length}</span>
                  </div>
                  <Progress value={substepProgress} className="h-2 rounded" />
                </div>
              )}

              {/* Substeps */}
              {showDetails && phase.substeps.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {phase.substeps.map((substep) => {
                    const substepStatus = getSubstepStatus(phase.id, substep.id);
                    const SubIcon = substep.icon;
                    return (
                      <div
                        key={substep.id}
                        className={`p-2 rounded-lg flex items-center gap-2 text-sm transition-all ${
                          substepStatus === 'completed'
                            ? 'bg-green-100 text-green-900'
                            : substepStatus === 'locked'
                            ? 'bg-gray-100 text-gray-500 opacity-50'
                            : 'bg-white border border-gray-200 text-gray-700'
                        }`}
                      >
                        {substepStatus === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        ) : substepStatus === 'locked' ? (
                          <Lock className="w-4 h-4 flex-shrink-0" />
                        ) : (
                          <SubIcon className="w-4 h-4 flex-shrink-0" />
                        )}
                        <span className="truncate">{substep.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Completion Message */}
        {completedPhases.length === totalPhases && (
          <div className="bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 rounded-xl p-4 text-center">
            <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="font-bold text-green-900">🎉 Onboarding Complete!</p>
            <p className="text-sm text-green-800 mt-1">You're all set to start your health journey!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}