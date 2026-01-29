import React, { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export const useClientTutorial = () => {
  const startTutorial = () => {
    const driverObj = driver({
      showProgress: true,
      allowClose: true,
      popoverClass: 'dashboard-tour-popover',
      steps: [
        {
          element: '#dashboard-welcome',
          popover: {
            title: '👋 Welcome to Your Dashboard!',
            description: 'This is your central hub where you can track your progress, view meal plans, and communicate with your coach.',
            position: 'bottom',
          },
        },
        {
          element: '#meal-plan-section',
          popover: {
            title: '🍽️ Your Meal Plan',
            description: 'Access your personalized meal plan here. Your coach will create custom plans based on your goals and preferences.',
            position: 'right',
          },
        },
        {
          element: '#food-log-section',
          popover: {
            title: '📝 Food Log',
            description: 'Track what you eat daily! Log your meals to help your coach monitor your progress and make adjustments.',
            position: 'left',
          },
        },
        {
          element: '#progress-section',
          popover: {
            title: '📊 Progress Tracking',
            description: 'Monitor your weight, measurements, and photos. See how far you\'ve come on your health journey!',
            position: 'top',
          },
        },
        {
          element: '#messages-section',
          popover: {
            title: '💬 Messages',
            description: 'Stay connected with your coach! Ask questions, share updates, and get personalized guidance.',
            position: 'bottom',
          },
        },
        {
          element: '#resources-section',
          popover: {
            title: '📚 Resources',
            description: 'Access recipes, articles, workouts, and educational materials shared by your coach.',
            position: 'left',
          },
        },
        {
          popover: {
            title: '🎉 You\'re All Set!',
            description: 'Start exploring the app and track your health journey. Your coach is here to support you every step of the way!',
          },
        },
      ],
      onDestroyed: () => {
        localStorage.setItem('client-tutorial-completed', 'true');
      },
    });

    driverObj.drive();
  };

  return { startTutorial };
};

export default function ClientTutorial({ autoStart = false }) {
  const { startTutorial } = useClientTutorial();

  useEffect(() => {
    const hasCompletedTutorial = localStorage.getItem('client-tutorial-completed');
    if (autoStart && !hasCompletedTutorial) {
      // Delay to ensure DOM elements are ready
      setTimeout(() => {
        startTutorial();
      }, 1000);
    }
  }, [autoStart]);

  return null;
}