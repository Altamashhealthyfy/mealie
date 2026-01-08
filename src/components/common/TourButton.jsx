import React from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { resetTour } from './PageTour';

export default function TourButton({ pageName, variant = "outline", size = "sm" }) {
  const handleClick = () => {
    resetTour(pageName);
  };

  return (
    <Button
      onClick={handleClick}
      variant={variant}
      size={size}
      className="gap-2"
    >
      <HelpCircle className="w-4 h-4" />
      Start Tour
    </Button>
  );
}