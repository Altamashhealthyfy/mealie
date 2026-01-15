import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { tourConfigs, defaultTour } from "@/components/tours/tourConfigs";

export default function TourButton({ pageName, variant = 'outline', size = 'sm' }) {
  const [hasSeenTour, setHasSeenTour] = useState(false);

  useEffect(() => {
    const seenTours = JSON.parse(localStorage.getItem('seenTours') || '{}');
    const seen = seenTours[pageName] || false;
    setHasSeenTour(seen);
  }, [pageName]);

  const markTourAsSeen = () => {
    const seenTours = JSON.parse(localStorage.getItem('seenTours') || '{}');
    seenTours[pageName] = true;
    localStorage.setItem('seenTours', JSON.stringify(seenTours));
    setHasSeenTour(true);
  };

  const startTour = () => {
    const tourConfig = tourConfigs[pageName] || defaultTour;
    
    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      steps: tourConfig.steps,
      popoverClass: 'dashboard-tour-popover',
      onDestroyStarted: () => {
        if (!hasSeenTour) {
          markTourAsSeen();
        }
        driverObj.destroy();
      },
      onCloseClick: () => {
        markTourAsSeen();
        driverObj.destroy();
      },
    });

    driverObj.drive();
  };

  if (!tourConfigs[pageName]) {
    return null;
  }

  return (
    <Button
      onClick={startTour}
      variant={variant}
      size={size}
      className="flex items-center gap-2 bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 relative"
    >
      <HelpCircle className="w-4 h-4" />
      <span className="hidden md:inline">Page Tour</span>
      {!hasSeenTour && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
      )}
    </Button>
  );
}