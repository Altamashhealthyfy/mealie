import React from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { startPlatformTour } from './PlatformGuide';

const TourButton = ({ variant = 'outline', size = 'sm' }) => {
  return (
    <Button onClick={startPlatformTour} variant={variant} size={size} id="start-tour-button">
      <HelpCircle className="w-4 h-4 mr-2" />
      Start Tour
    </Button>
  );
};

export default TourButton;