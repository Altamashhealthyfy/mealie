import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Scale, MessageCircle, ChefHat, TrendingUp, Heart, ArrowRight,
  ArrowLeft, CheckCircle, PlayCircle, Camera, ClipboardList, Target
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const tutorialSteps = [
  {
    id: "progress",
    icon: Scale,
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-50",
    title: "Log Your Progress",
    subtitle: "Track every milestone",
    description: "Logging your progress helps your coach tailor your plan. Here's how to do it:",
    steps: [
      { icon: Scale, text: "Go to 'My Progress' from the sidebar or dashboard" },
      { icon: Camera, text: "Log your weight and body measurements" },
      { icon: Heart, text: "Record your wellness metrics — sleep, mood, energy" },
      { icon: CheckCircle, text: "Add progress photos to visually track your transformation" },
    ],
    tip: "💡 Try to log at the same time each day for the most accurate tracking — ideally in the morning before eating.",
  },
  {
    id: "messaging",
    icon: MessageCircle,
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-green-50",
    title: "Message Your Coach",
    subtitle: "Direct line to your coach",
    description: "Your coach is here to support you! Reach them anytime through messaging:",
    steps: [
      { icon: MessageCircle, text: "Tap 'Messages' from the sidebar or bottom nav" },
      { icon: ClipboardList, text: "Send text, photos, or documents directly to your coach" },
      { icon: PlayCircle, text: "Share food photos or progress photos in chat" },
      { icon: CheckCircle, text: "Your coach will respond and adjust your plan as needed" },
    ],
    tip: "💡 Don't hesitate to message your coach about any changes — a meal you ate, how you're feeling, or if you have questions.",
  },
  {
    id: "meal_plan",
    icon: ChefHat,
    color: "from-orange-500 to-red-500",
    bgColor: "bg-orange-50",
    title: "Follow Your Meal Plan",
    subtitle: "Nutrition made easy",
    description: "Your personalized meal plan is designed just for you. Here's how to access it:",
    steps: [
      { icon: ChefHat, text: "Go to 'My Meal Plan' from the sidebar" },
      { icon: ClipboardList, text: "Browse your daily and weekly meal suggestions" },
      { icon: TrendingUp, text: "Log what you eat in 'Food Log' to track adherence" },
      { icon: MessageCircle, text: "Ask your coach to modify meals you don't enjoy" },
    ],
    tip: "💡 Your meal plan is tailored to your goals and preferences. The more you follow it, the faster you'll see results!",
  },
  {
    id: "goals",
    icon: Target,
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-50",
    title: "Track Your Goals",
    subtitle: "Stay motivated & focused",
    description: "Goals keep you focused on your journey. Here's how to use them:",
    steps: [
      { icon: Target, text: "View your goals on the Dashboard or 'My Progress'" },
      { icon: TrendingUp, text: "Update your current values regularly to see progress" },
      { icon: CheckCircle, text: "Celebrate milestones — your coach will be notified!" },
      { icon: Heart, text: "Set new goals as you achieve existing ones" },
    ],
    tip: "💡 Break big goals into smaller milestones. Celebrate every 5% progress — it keeps you motivated!",
  },
];

export default function AppTutorial({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = tutorialSteps[currentStep];
  const isLast = currentStep === tutorialSteps.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-4 md:p-8 flex flex-col items-center justify-center">
      <div className="max-w-2xl w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white mb-3">
            Quick Tutorial — Step {currentStep + 1} of {tutorialSteps.length}
          </Badge>
          <h2 className="text-2xl font-bold text-gray-900">How to Use Your App</h2>
          <p className="text-gray-600 mt-1">A quick guide to core features</p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {tutorialSteps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`h-2 rounded-full transition-all ${
                i === currentStep ? "w-8 bg-orange-500" : i < currentStep ? "w-2 bg-orange-300" : "w-2 bg-gray-300"
              }`}
            />
          ))}
        </div>

        {/* Main card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="shadow-2xl border-0 overflow-hidden">
              {/* Card header with gradient */}
              <div className={`bg-gradient-to-r ${step.color} p-6 text-white`}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                    <step.icon className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{step.title}</h3>
                    <p className="text-white/80">{step.subtitle}</p>
                  </div>
                </div>
              </div>

              <CardContent className="p-6 space-y-5">
                <p className="text-gray-700">{step.description}</p>

                {/* Steps */}
                <div className="space-y-3">
                  {step.steps.map((s, idx) => (
                    <div key={idx} className={`flex items-start gap-3 p-3 rounded-xl ${step.bgColor}`}>
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${step.color} text-white flex items-center justify-center flex-shrink-0 text-sm font-bold`}>
                        {idx + 1}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <s.icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="text-gray-700 text-sm">{s.text}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tip */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-amber-800 text-sm">{step.tip}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            onClick={() => setCurrentStep(prev => prev - 1)}
            disabled={currentStep === 0}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Previous
          </Button>

          {isLast ? (
            <Button
              onClick={onComplete}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white flex items-center gap-2 px-8"
            >
              <CheckCircle className="w-4 h-4" /> All Done — Go to Dashboard!
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentStep(prev => prev + 1)}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white flex items-center gap-2"
            >
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>

        <p className="text-center text-sm text-gray-500">
          You can always revisit these guides from the Help Center in the sidebar.
        </p>
      </div>
    </div>
  );
}