import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OnboardingTooltip({ 
  targetId, 
  title, 
  message, 
  position = 'bottom',
  onDismiss,
  delay = 500 
}) {
  const [show, setShow] = useState(false);
  const [targetElement, setTargetElement] = useState(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const timer = setTimeout(() => {
      const element = document.getElementById(targetId);
      if (element) {
        setTargetElement(element);
        const rect = element.getBoundingClientRect();
        
        let top, left;
        if (position === 'bottom') {
          top = rect.bottom + window.scrollY + 10;
          left = rect.left + window.scrollX + (rect.width / 2);
        } else if (position === 'top') {
          top = rect.top + window.scrollY - 10;
          left = rect.left + window.scrollX + (rect.width / 2);
        } else if (position === 'right') {
          top = rect.top + window.scrollY + (rect.height / 2);
          left = rect.right + window.scrollX + 10;
        } else if (position === 'left') {
          top = rect.top + window.scrollY + (rect.height / 2);
          left = rect.left + window.scrollX - 10;
        }
        
        setCoords({ top, left });
        setShow(true);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [targetId, position, delay]);

  const handleDismiss = () => {
    setShow(false);
    setTimeout(onDismiss, 300);
  };

  if (!show || !targetElement) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: position === 'bottom' ? -20 : 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ type: 'spring', damping: 20 }}
        className="fixed z-50"
        style={{
          top: `${coords.top}px`,
          left: `${coords.left}px`,
          transform: position === 'bottom' || position === 'top' 
            ? 'translateX(-50%)' 
            : position === 'right' 
              ? 'translateY(-50%)' 
              : 'translate(-100%, -50%)'
        }}
      >
        <div className="relative bg-white rounded-lg shadow-2xl border-2 border-orange-300 p-4 max-w-xs">
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-lg">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="mt-6 space-y-2">
            <p className="font-bold text-gray-900">{title}</p>
            <p className="text-sm text-gray-600">{message}</p>
            <Button
              onClick={handleDismiss}
              size="sm"
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 mt-3"
            >
              Got it!
            </Button>
          </div>

          {/* Arrow pointer */}
          {position === 'bottom' && (
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-l-2 border-t-2 border-orange-300 rotate-45" />
          )}
          {position === 'top' && (
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-r-2 border-b-2 border-orange-300 rotate-45" />
          )}
          {position === 'right' && (
            <div className="absolute top-1/2 -left-2 transform -translate-y-1/2 w-4 h-4 bg-white border-l-2 border-b-2 border-orange-300 rotate-45" />
          )}
          {position === 'left' && (
            <div className="absolute top-1/2 -right-2 transform -translate-y-1/2 w-4 h-4 bg-white border-r-2 border-t-2 border-orange-300 rotate-45" />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}