import React, { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function DashboardTour({ tourKey, steps, onComplete }) {
  useEffect(() => {
    const hasSeenTour = localStorage.getItem(`tour_completed_${tourKey}`);
    
    if (!hasSeenTour) {
      const driverObj = driver({
        showProgress: true,
        showButtons: ['next', 'previous', 'close'],
        steps: steps,
        onDestroyStarted: () => {
          localStorage.setItem(`tour_completed_${tourKey}`, 'true');
          if (onComplete) onComplete();
          driverObj.destroy();
        },
        popoverClass: 'dashboard-tour-popover',
        progressText: '{{current}} of {{total}}',
        nextBtnText: 'Next →',
        prevBtnText: '← Previous',
        doneBtnText: 'Finish ✓',
      });

      // Show tour after a small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        driverObj.drive();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [tourKey, steps, onComplete]);

  return null;
}

export function TourSkipPrompt({ tourKey, onStart, onSkip }) {
  const [show, setShow] = React.useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem(`tour_completed_${tourKey}`);
    if (!hasSeenTour) {
      setShow(true);
    }
  }, [tourKey]);

  if (!show) return null;

  const handleStart = () => {
    setShow(false);
    if (onStart) onStart();
  };

  const handleSkip = () => {
    localStorage.setItem(`tour_completed_${tourKey}`, 'true');
    setShow(false);
    if (onSkip) onSkip();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm">
      <div className="bg-white rounded-xl shadow-2xl border-2 border-orange-500 p-6 animate-in fade-in slide-in-from-bottom-4">
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">👋</span>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-900 mb-2">
              Welcome! First time here?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Would you like a quick guided tour to learn how to use this dashboard?
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleStart}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                size="sm"
              >
                Start Tour 🚀
              </Button>
              <Button
                onClick={handleSkip}
                variant="outline"
                size="sm"
              >
                Skip
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}