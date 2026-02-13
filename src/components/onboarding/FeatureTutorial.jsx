import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, X, ChefHat, Scale, MessageSquare, Heart, Upload, CheckCircle } from "lucide-react";

const tutorialSteps = [
  {
    title: "Welcome to Your Health Journey! 🎉",
    icon: CheckCircle,
    content: "Congratulations on completing your profile setup! Let's take a quick tour of the key features that will help you achieve your health goals.",
    image: null,
  },
  {
    title: "My Meal Plan 🍽️",
    icon: ChefHat,
    content: "Your coach will create a personalized meal plan based on your goals and preferences. You'll see daily meals with:\n\n• Specific food items and portions\n• Calories and macros (protein, carbs, fats)\n• Nutritional tips for each meal\n• Download option for offline access\n\nTip: Check your meal plan each morning to prepare for the day!",
    image: null,
  },
  {
    title: "Food Log 📝",
    icon: ChefHat,
    content: "Track what you actually eat throughout the day:\n\n• Log each meal with photos\n• Compare with your plan\n• Your coach reviews your logs to adjust plans\n• Track adherence percentage\n\nTip: Log meals right after eating for accuracy!",
    image: null,
  },
  {
    title: "Progress Tracking 📊",
    icon: Scale,
    content: "Monitor your transformation journey:\n\n• Log weight and measurements weekly\n• Upload progress photos\n• Track wellness metrics (energy, sleep, mood)\n• View beautiful charts and trends\n\nTip: Take measurements at the same time each week for consistency!",
    image: null,
  },
  {
    title: "MPESS Wellness ❤️",
    icon: Heart,
    content: "Holistic health tracking - Mind, Physical, Emotional, Social & Spiritual:\n\n• Daily wellness check-ins\n• Track habits beyond food\n• Understand root causes of health issues\n• Build sustainable lifestyle changes\n\nTip: Complete your MPESS log before bed each day!",
    image: null,
  },
  {
    title: "Messages & Coach Support 💬",
    icon: MessageSquare,
    content: "Stay connected with your health coach:\n\n• Ask questions anytime\n• Share challenges or wins\n• Get quick feedback\n• Receive motivational messages\n\nTip: Don't hesitate to message - your coach is here to help!",
    image: null,
  },
  {
    title: "Upload Medical Reports 📤",
    icon: Upload,
    content: "Share health reports securely:\n\n• Blood reports, prescriptions, scans\n• Coach reviews and provides insights\n• AI analysis highlights key metrics\n• Track health improvements over time\n\nTip: Upload reports as soon as you receive them!",
    image: null,
  },
];

export default function FeatureTutorial({ open, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = tutorialSteps[currentStep];
  const Icon = step.icon;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                <Icon className="w-6 h-6 text-white" />
              </div>
              {step.title}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Indicator */}
          <div className="flex justify-center gap-2">
            {tutorialSteps.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep
                    ? 'w-8 bg-gradient-to-r from-orange-500 to-red-500'
                    : idx < currentStep
                    ? 'w-2 bg-green-500'
                    : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
            <CardContent className="p-6">
              <div className="whitespace-pre-line text-gray-700 leading-relaxed">
                {step.content}
              </div>
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <span className="text-sm text-gray-600">
              {currentStep + 1} of {tutorialSteps.length}
            </span>

            <Button
              onClick={handleNext}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              {currentStep === tutorialSteps.length - 1 ? (
                <>
                  Get Started! 🚀
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}