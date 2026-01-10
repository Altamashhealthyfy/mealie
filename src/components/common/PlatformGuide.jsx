import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "@/globals.css";

const platformSteps = [
  {
    element: '.sidebar-header',
    popover: {
      title: 'Welcome to Mealie!',
      description: 'This is your branding section. Your logo and business name appear here, creating a white-labeled experience for your clients.'
    }
  },
  {
    element: '#dietitian-tools-nav',
    popover: {
      title: 'Dietitian Tools',
      description: 'This is your command center for client management. You can manage clients, create meal plans, schedule appointments, and communicate with your clients.'
    }
  },
  {
    element: '#payment-plans-nav',
    popover: {
      title: 'Payment & Plans',
      description: 'Manage your subscription, client payment plans, payment gateway, and view your payment history here.'
    }
  },
  {
    element: '#business-tools-nav',
    popover: {
      title: 'Business Tools',
      description: 'Access tools to grow your business, like marketing, team management, and platform branding.'
    }
  },
    {
    element: '.sidebar-footer',
    popover: {
      title: 'Your Profile',
      description: 'Your profile information is displayed here. You can also log out from this section.'
    }
  },
  {
    element: '#notification-bell-container',
    popover: {
        title: 'Notifications',
        description: 'Stay updated with notifications about client activities and important alerts.'
    }
  },
  {
    element: '#start-tour-button',
    popover: {
      title: 'Start Tour',
      description: 'You can restart this platform guide anytime by clicking this button.'
    }
  }
];

const pageSpecificTours = {
  DietitianDashboard: [
    {
      element: '#dashboard-stats',
      popover: {
        title: '📊 Dashboard Overview',
        description: 'See all your key metrics at a glance - total clients, new clients, meal plans, and more.'
      }
    },
    {
      element: '#client-growth',
      popover: {
        title: '📈 Client Growth',
        description: 'Track your practice growth over time with active clients and new sign-ups.'
      }
    },
    {
      element: '#quick-actions',
      popover: {
        title: '⚡ Quick Actions',
        description: 'Jump straight into common tasks like adding clients or creating meal plans.'
      }
    }
  ],
  ClientManagement: [
    {
      element: '#client-table',
      popover: {
        title: '👥 Client List',
        description: 'Manage all your clients here. View their progress, assign meal plans, and communicate.'
      }
    },
    {
      element: '#add-client-btn',
      popover: {
        title: '➕ Add New Client',
        description: 'Click here to add a new client to your practice.'
      }
    }
  ],
  ClientAnalyticsDashboard: [
    {
      element: '#analytics-filters',
      popover: {
        title: '🔍 Analytics Filters',
        description: 'Filter clients by metrics to see detailed performance insights.'
      }
    },
    {
      element: '#analytics-charts',
      popover: {
        title: '📊 Charts & Data',
        description: 'View comprehensive analytics including adherence, weight trends, and wellness scores.'
      }
    }
  ],
  MealPlanner: [
    {
      element: '#meal-plan-builder',
      popover: {
        title: '🍽️ Meal Plan Builder',
        description: 'Create personalized meal plans for your clients with AI assistance.'
      }
    },
    {
      element: '#client-selector',
      popover: {
        title: '👤 Select Client',
        description: 'Choose which client this meal plan is for.'
      }
    }
  ],
  Appointments: [
    {
      element: '#appointments-calendar',
      popover: {
        title: '📅 Appointment Calendar',
        description: 'View and manage all client appointments here.'
      }
    },
    {
      element: '#create-appointment-btn',
      popover: {
        title: '➕ Schedule New',
        description: 'Click here to schedule a new appointment with a client.'
      }
    }
  ],
  Communication: [
    {
      element: '#client-list',
      popover: {
        title: '👥 Client List',
        description: 'Select a client to view and send messages.'
      }
    },
    {
      element: '#message-area',
      popover: {
        title: '💬 Message Area',
        description: 'Chat with your clients here. You can send text and attach files.'
      }
    }
  ]
};

export const startPageTour = (pageName = 'Default') => {
  const steps = pageSpecificTours[pageName] || platformSteps;
  const driverObj = driver({
      showProgress: true,
      popoverClass: 'dashboard-tour-popover',
      steps: steps
  });
  driverObj.drive();
};

export const startPlatformTour = () => {
  startPageTour('Default');
};