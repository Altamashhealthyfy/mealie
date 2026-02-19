import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Sparkles, Target, Heart, Zap, Award } from 'lucide-react';
import { motion } from 'framer-motion';

const STEPS = [
  { icon: Sparkles, label: 'Welcome', color: 'text-purple-500' },
  { icon: Heart, label: 'Profile', color: 'text-red-500' },
  { icon: Target, label: 'Goals', color: 'text-blue-500' },
  { icon: Zap, label: 'Preferences', color: 'text-yellow-500' },
  { icon: Award, label: 'Complete', color: 'text-green-500' }
];

export default function OnboardingProgressCard({ currentStep, pointsEarned }) {
  const progress = (currentStep / STEPS.length) * 100;

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Onboarding Progress
          </CardTitle>
          <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white">
            +{pointsEarned} Points
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step Indicators */}
        <div className="flex justify-between gap-2">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = currentStep > idx + 1;
            const isCurrent = currentStep === idx + 1;

            return (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.1 }}
                className={`flex flex-col items-center gap-1 flex-1`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    isCompleted || isCurrent
                      ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                      : 'bg-white border-2 border-gray-300 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <Icon className={`w-5 h-5 ${step.color}`} />
                  )}
                </div>
                <span className="text-xs font-semibold text-gray-600 text-center">
                  {step.label}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-700">
              Step {currentStep} of {STEPS.length}
            </span>
            <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2.5" />
        </div>

        {/* Motivation Text */}
        <div className="text-center text-sm text-gray-600 italic">
          {currentStep === 1 && "Let's get started on your health journey! 🚀"}
          {currentStep === 2 && "Tell us about yourself so we can personalize everything. 📋"}
          {currentStep === 3 && "Your goals guide our coaching - be specific! 🎯"}
          {currentStep === 4 && "Customize your experience for better engagement. ⚙️"}
          {currentStep === 5 && "You're all set! Welcome to the community! 🎉"}
        </div>
      </CardContent>
    </Card>
  );
}