import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const tourConfigs = {
  // Client Pages
  ClientDashboard: [
    {
      element: '#client-overview',
      popover: {
        title: '👋 Welcome to Your Dashboard',
        description: 'This is your health journey dashboard. Here you can see your progress, upcoming appointments, and important metrics.',
        position: 'bottom'
      }
    },
    {
      element: '#progress-summary',
      popover: {
        title: '📊 Your Progress',
        description: 'Track your weight, measurements, and wellness metrics here.',
        position: 'bottom'
      }
    },
    {
      element: '#upcoming-appointments',
      popover: {
        title: '📅 Appointments',
        description: 'View and manage your upcoming appointments with your health coach.',
        position: 'top'
      }
    }
  ],

  MyAssignedMealPlan: [
    {
      element: '#meal-plan-tabs',
      popover: {
        title: '🍽️ Your Meal Plan',
        description: 'Navigate through your daily meal plan. Each tab represents a day of your plan.',
        position: 'bottom'
      }
    },
    {
      element: '#meal-card',
      popover: {
        title: '✅ Track Your Meals',
        description: 'Click the checkbox to mark meals as completed. This helps track your adherence.',
        position: 'left'
      }
    }
  ],

  FoodLog: [
    {
      element: '#food-log-calendar',
      popover: {
        title: '📝 Food Logging',
        description: 'Log what you eat daily to track your nutrition and stay accountable.',
        position: 'bottom'
      }
    },
    {
      element: '#add-food-log',
      popover: {
        title: '➕ Add New Entry',
        description: 'Click here to log your meals, snacks, and drinks throughout the day.',
        position: 'left'
      }
    }
  ],

  ProgressTracking: [
    {
      element: '#progress-stats',
      popover: {
        title: '📈 Track Your Progress',
        description: 'Monitor your weight, measurements, and wellness metrics over time.',
        position: 'bottom'
      }
    },
    {
      element: '#progress-charts',
      popover: {
        title: '📊 Visual Progress',
        description: 'See your progress visualized in charts and graphs for better insights.',
        position: 'top'
      }
    },
    {
      element: '#log-progress-btn',
      popover: {
        title: '✏️ Log New Entry',
        description: 'Record your current weight, measurements, and wellness data here.',
        position: 'left'
      }
    }
  ],

  MPESSTracker: [
    {
      popover: {
        title: '🧘 MPESS Wellness Framework',
        description: 'Track your Mind, Physical, Emotional, Social, and Spiritual wellness practices daily for holistic health.',
        position: 'center'
      }
    }
  ],

  ClientCommunication: [
    {
      element: '#message-chat-area',
      popover: {
        title: '💬 Message Your Coach',
        description: 'Stay connected with your health coach. Ask questions, share updates, and get support.',
        position: 'left'
      }
    },
    {
      element: '#message-send-box',
      popover: {
        title: '📤 Send Messages',
        description: 'Type your message and press Enter or click Send. You can also attach files.',
        position: 'top'
      }
    }
  ],

  ClientAppointments: [
    {
      element: '#appointments-list',
      popover: {
        title: '📅 Your Appointments',
        description: 'View all your scheduled appointments with your health coach.',
        position: 'bottom'
      }
    }
  ],

  // Health Coach Pages
  DietitianDashboard: [
    {
      element: '#dashboard-stats',
      popover: {
        title: '📊 Dashboard Overview',
        description: 'Get a quick snapshot of your practice: total clients, active plans, and key metrics.',
        position: 'bottom'
      }
    },
    {
      element: '#recent-clients',
      popover: {
        title: '👥 Recent Clients',
        description: 'View your most recently active clients and their progress at a glance.',
        position: 'top'
      }
    },
    {
      element: '#action-items',
      popover: {
        title: '✅ Action Items',
        description: 'Stay on top of pending tasks, follow-ups, and important client needs.',
        position: 'left'
      }
    }
  ],

  ClientManagement: [
    {
      element: '#client-search',
      popover: {
        title: '🔍 Find Clients',
        description: 'Search and filter your clients by name, status, goal, or assigned coach.',
        position: 'bottom'
      }
    },
    {
      element: '#add-client-btn',
      popover: {
        title: '➕ Add New Client',
        description: 'Click here to onboard a new client to your practice.',
        position: 'left'
      }
    },
    {
      element: '#client-list',
      popover: {
        title: '📋 Client List',
        description: 'View all your clients, their status, and quick actions like viewing profile or messaging.',
        position: 'top'
      }
    }
  ],

  Communication: [
    {
      element: '#message-clients-list',
      popover: {
        title: '💬 Client Messages',
        description: 'All your client conversations in one place. Click on a client to view and respond.',
        position: 'right'
      }
    },
    {
      element: '#message-chat-area',
      popover: {
        title: '📨 Chat Interface',
        description: 'Send messages, share files, and stay connected with your clients.',
        position: 'left'
      }
    },
    {
      element: '#message-send-box',
      popover: {
        title: '✍️ Send Messages',
        description: 'Type your message and attach files if needed. Press Enter or click Send.',
        position: 'top'
      }
    }
  ],

  MealPlanner: [
    {
      element: '#meal-plan-selector',
      popover: {
        title: '🍽️ Meal Planning',
        description: 'Create personalized meal plans for your clients using AI or manual templates.',
        position: 'bottom'
      }
    },
    {
      element: '#client-selector',
      popover: {
        title: '👤 Select Client',
        description: 'Choose the client you want to create a meal plan for.',
        position: 'bottom'
      }
    },
    {
      element: '#generate-options',
      popover: {
        title: '✨ Generation Options',
        description: 'Use AI for smart meal plans or build manually for full control.',
        position: 'left'
      }
    }
  ],

  Appointments: [
    {
      element: '#appointments-calendar',
      popover: {
        title: '📅 Appointment Calendar',
        description: 'Manage all your client appointments. View, schedule, and track consultations.',
        position: 'bottom'
      }
    },
    {
      element: '#add-appointment-btn',
      popover: {
        title: '➕ Schedule New',
        description: 'Click here to schedule a new appointment with a client.',
        position: 'left'
      }
    }
  ],

  Recipes: [
    {
      element: '#recipe-library',
      popover: {
        title: '📖 Recipe Library',
        description: 'Browse, search, and manage recipes for your meal plans.',
        position: 'bottom'
      }
    },
    {
      element: '#add-recipe-btn',
      popover: {
        title: '➕ Add Recipe',
        description: 'Create new recipes or import from your collection.',
        position: 'left'
      }
    }
  ],

  FoodLookup: [
    {
      element: '#food-search',
      popover: {
        title: '🔍 Food Lookup',
        description: 'Search for any food item to get detailed nutritional information powered by AI.',
        position: 'bottom'
      }
    }
  ],

  ClientAnalyticsDashboard: [
    {
      element: '#analytics-overview',
      popover: {
        title: '📊 Client Analytics',
        description: 'Deep dive into client progress, trends, and outcomes across your practice.',
        position: 'bottom'
      }
    },
    {
      element: '#analytics-filters',
      popover: {
        title: '🎯 Filter Data',
        description: 'Filter by date range, client group, or specific metrics to analyze performance.',
        position: 'left'
      }
    }
  ],

  TemplateLibrary: [
    {
      element: '#template-categories',
      popover: {
        title: '📚 Meal Plan Templates',
        description: 'Access pre-made meal plan templates to save time when creating plans.',
        position: 'bottom'
      }
    },
    {
      element: '#template-search',
      popover: {
        title: '🔍 Find Templates',
        description: 'Search by calories, diet type, duration, or health conditions.',
        position: 'left'
      }
    }
  ],

  ClientAssessments: [
    {
      element: '#assessment-list',
      popover: {
        title: '📋 Client Assessments',
        description: 'View and manage health assessments for comprehensive client evaluation.',
        position: 'bottom'
      }
    }
  ],

  TeamManagement: [
    {
      element: '#team-members',
      popover: {
        title: '👥 Your Team',
        description: 'Manage team members, assign roles, and track their performance.',
        position: 'bottom'
      }
    },
    {
      element: '#add-team-member-btn',
      popover: {
        title: '➕ Add Team Member',
        description: 'Invite new team members to collaborate on client management.',
        position: 'left'
      }
    }
  ],

  ClientFinanceManager: [
    {
      element: '#finance-summary',
      popover: {
        title: '💰 Financial Overview',
        description: 'Track payments, subscriptions, and revenue from your clients.',
        position: 'bottom'
      }
    },
    {
      element: '#add-transaction-btn',
      popover: {
        title: '➕ Record Transaction',
        description: 'Quickly add client payments or expenses here.',
        position: 'left'
      }
    }
  ],

  MarketingHub: [
    {
      element: '#marketing-tools',
      popover: {
        title: '📢 Marketing Tools',
        description: 'Access tools to grow your practice: email campaigns, social media, and lead generation.',
        position: 'bottom'
      }
    }
  ],

  BusinessGPTs: [
    {
      element: '#gpt-tools',
      popover: {
        title: '🤖 AI Business Tools',
        description: 'Use AI assistants for content creation, client communication, and business tasks.',
        position: 'bottom'
      }
    }
  ]
};

export default function PageTour({ pageName, autoStart = false }) {
  useEffect(() => {
    const tourKey = `tour_completed_${pageName}`;
    const hasCompletedTour = localStorage.getItem(tourKey);

    if (tourConfigs[pageName] && (!hasCompletedTour || autoStart)) {
      const timeoutId = setTimeout(() => {
        const driverObj = driver({
          popoverClass: 'dashboard-tour-popover',
          showProgress: true,
          steps: tourConfigs[pageName],
          onDestroyStarted: () => {
            localStorage.setItem(tourKey, 'true');
            driverObj.destroy();
          },
          nextBtnText: 'Next →',
          prevBtnText: '← Back',
          doneBtnText: 'Got it! ✓'
        });

        driverObj.drive();
      }, 800);

      return () => clearTimeout(timeoutId);
    }
  }, [pageName, autoStart]);

  return null;
}

export function resetTour(pageName) {
  const tourKey = `tour_completed_${pageName}`;
  localStorage.removeItem(tourKey);
  window.location.reload();
}

export function resetAllTours() {
  Object.keys(tourConfigs).forEach(pageName => {
    localStorage.removeItem(`tour_completed_${pageName}`);
  });
  window.location.reload();
}