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
      element: '.sidebar-header',
      popover: {
        title: '🎯 Welcome to Your Dashboard',
        description: 'This is your command center. Here you can see all your clients, meal plans, and key metrics at a glance.'
      }
    },
    {
      element: '#dashboard-stats',
      popover: {
        title: '📊 Key Metrics',
        description: 'Monitor your practice growth with real-time stats on clients, meal plans, messages, and appointments.'
      }
    },
    {
      element: '#client-growth',
      popover: {
        title: '📈 Client Growth Chart',
        description: 'Track your practice growth over time. See how many active clients and new sign-ups you have.'
      }
    },
    {
      element: '#quick-actions',
      popover: {
        title: '⚡ Quick Actions',
        description: 'Speed up your workflow with one-click access to common tasks like adding clients or creating meal plans.'
      }
    }
  ],
  ClientManagement: [
    {
      element: '.sidebar-header',
      popover: {
        title: '👥 Client Management Hub',
        description: 'This is where you manage all your clients - add new ones, update profiles, and track their progress.'
      }
    },
    {
      element: '#client-table-header',
      popover: {
        title: '🔍 Search & Filter',
        description: 'Quickly find clients by name, email, or filter by status (active, inactive, completed).'
      }
    },
    {
      element: '#add-client-btn',
      popover: {
        title: '➕ Add New Client',
        description: 'Click here to onboard a new client. You\'ll set up their profile, health goals, and preferences.'
      }
    },
    {
      element: '#client-table',
      popover: {
        title: '📋 Your Clients',
        description: 'View all client details including contact info, health goals, current status, and quick action buttons for messaging and meal plans.'
      }
    }
  ],
  ClientAnalyticsDashboard: [
    {
      element: '.sidebar-header',
      popover: {
        title: '📊 Advanced Analytics',
        description: 'Get deep insights into your client data - progress, adherence, and wellness metrics.'
      }
    },
    {
      element: '#analytics-filters',
      popover: {
        title: '🔍 Filter by Client',
        description: 'Select a client to see their detailed analytics and performance metrics.'
      }
    },
    {
      element: '#metric-selector',
      popover: {
        title: '📈 Choose Metrics',
        description: 'View different analytics: overview, progress tracking, engagement, needs attention, and module usage.'
      }
    },
    {
      element: '#analytics-charts',
      popover: {
        title: '📊 Visual Analytics',
        description: 'See comprehensive charts showing adherence rates, weight trends, wellness scores, and goal progress.'
      }
    }
  ],
  ClientReports: [
    {
      element: '.sidebar-header',
      popover: {
        title: '📄 Client Reports',
        description: 'Generate professional progress reports to share with clients or track their journey.'
      }
    },
    {
      element: '#client-selector',
      popover: {
        title: '👤 Select Client',
        description: 'Choose which client\'s report you want to generate.'
      }
    },
    {
      element: '#report-period',
      popover: {
        title: '📅 Select Period',
        description: 'Choose between monthly or quarterly reports to track progress over time.'
      }
    },
    {
      element: '#report-preview',
      popover: {
        title: '👁️ Preview Report',
        description: 'See a preview of the report with key metrics like weight change, adherence, and wellness data before downloading.'
      }
    }
  ],
  MealPlanner: [
    {
      element: '.sidebar-header',
      popover: {
        title: '🍽️ Meal Plan Creator',
        description: 'Create personalized meal plans for your clients using AI or manual templates.'
      }
    },
    {
      element: '#plan-tabs',
      popover: {
        title: '📑 Plan Options',
        description: 'Choose between templates, manual creation, AI generation, or manage your saved plans.'
      }
    },
    {
      element: '#client-selector',
      popover: {
        title: '👤 Select Client',
        description: 'Choose which client this meal plan is for.'
      }
    },
    {
      element: '#meal-plan-builder',
      popover: {
        title: '🎨 Build Meal Plan',
        description: 'Create day-by-day meals with recipes, nutrition info, portions, and special notes.'
      }
    },
    {
      element: '#plan-actions',
      popover: {
        title: '💾 Save & Assign',
        description: 'Save the meal plan and assign it to the client. They\'ll see it in their dashboard.'
      }
    }
  ],
  Appointments: [
    {
      element: '.sidebar-header',
      popover: {
        title: '📅 Appointment Management',
        description: 'Schedule, manage, and track all your client appointments and consultations.'
      }
    },
    {
      element: '#appointment-stats',
      popover: {
        title: '📊 Quick Stats',
        description: 'See your appointment summary - today, upcoming, completed, and total appointments.'
      }
    },
    {
      element: '#appointment-filters',
      popover: {
        title: '🔍 Filter Appointments',
        description: 'Filter by status, mode (online/offline), coach, or date range to find specific appointments.'
      }
    },
    {
      element: '#appointments-calendar',
      popover: {
        title: '📋 Appointment List',
        description: 'View all appointments with client details, time, meeting link, and edit/delete options.'
      }
    },
    {
      element: '#create-appointment-btn',
      popover: {
        title: '➕ Schedule New',
        description: 'Click here to schedule a new appointment. Set time, mode, meeting link, and notes.'
      }
    }
  ],
  Communication: [
    {
      element: '.sidebar-header',
      popover: {
        title: '💬 Client Messaging',
        description: 'Direct communication channel with all your clients. Send messages and files.'
      }
    },
    {
      element: '#client-list-header',
      popover: {
        title: '🔍 Search Clients',
        description: 'Find clients by name or email to start chatting with them.'
      }
    },
    {
      element: '#client-list',
      popover: {
        title: '👥 Client List',
        description: 'All your clients are listed here. Click on a client to open the chat and see conversation history.'
      }
    },
    {
      element: '#message-area',
      popover: {
        title: '💬 Chat Area',
        description: 'Type your message here. You can send text, images, documents, and other files.'
      }
    },
    {
      element: '#message-input',
      popover: {
        title: '📎 Attach Files',
        description: 'Click the paperclip icon to attach documents, images, or any files you want to share.'
      }
    }
  ],
  ClientAssessments: [
    {
      element: '.sidebar-header',
      popover: {
        title: '📋 Client Assessments',
        description: 'Create custom health assessments and track your clients\' responses and progress.'
      }
    },
    {
      element: '#assessment-stats',
      popover: {
        title: '📊 Assessment Overview',
        description: 'See how many assessments are pending, completed, or in progress for your clients.'
      }
    },
    {
      element: '#assessment-tabs',
      popover: {
        title: '📑 Filter By Status',
        description: 'Switch between different views to see pending, completed, or all assessments.'
      }
    },
    {
      element: '#assign-assessment-btn',
      popover: {
        title: '➕ Assign Assessment',
        description: 'Click here to create a new assessment for a client.'
      }
    }
  ],
  Recipes: [
    {
      element: '.sidebar-header',
      popover: {
        title: '🍳 Recipe Library',
        description: 'Browse, create, and manage recipes to use in meal plans. Includes nutrition info and instructions.'
      }
    },
    {
      element: '#recipe-filters',
      popover: {
        title: '🔍 Filter Recipes',
        description: 'Filter by meal type, food preference, cuisine, and dietary tags.'
      }
    },
    {
      element: '#add-recipe-btn',
      popover: {
        title: '➕ Add New Recipe',
        description: 'Create a new recipe with ingredients, portions, instructions, and nutritional values.'
      }
    },
    {
      element: '#recipe-list',
      popover: {
        title: '📋 Recipes',
        description: 'View all recipes with nutrition details. Use them when building meal plans.'
      }
    }
  ],
  ProgressTracking: [
    {
      element: '.sidebar-header',
      popover: {
        title: '📊 Your Progress',
        description: 'Track your health journey with weight logs, wellness metrics, and goal progress.'
      }
    },
    {
      element: '#stats-cards',
      popover: {
        title: '📈 Your Stats',
        description: 'See your current weight, goal progress, energy levels, and other wellness metrics at a glance.'
      }
    },
    {
      element: '#log-progress-btn',
      popover: {
        title: '📝 Log Progress',
        description: 'Record your weight, measurements, photos, and wellness metrics for the day.'
      }
    },
    {
      element: '#progress-charts',
      popover: {
        title: '📊 View Trends',
        description: 'See your weight progress and wellness trends visualized in easy-to-understand charts.'
      }
    }
  ],
  MyAssignedMealPlan: [
    {
      element: '.sidebar-header',
      popover: {
        title: '🍽️ Your Meal Plan',
        description: 'View your personalized meal plan assigned by your dietitian.'
      }
    },
    {
      element: '#plan-overview',
      popover: {
        title: '📋 Plan Details',
        description: 'See meal plan duration, target calories, food preferences, and cuisine type.'
      }
    },
    {
      element: '#daily-meals',
      popover: {
        title: '📅 Daily Meals',
        description: 'Click on each day to see all meals, ingredients, portions, and nutritional information.'
      }
    },
    {
      element: '#meal-actions',
      popover: {
        title: '⚙️ Plan Actions',
        description: 'View full plan, download as PDF, or give feedback to your dietitian.'
      }
    }
  ],
  FoodLog: [
    {
      element: '.sidebar-header',
      popover: {
        title: '🍴 Food Logging',
        description: 'Track everything you eat and drink. Get nutritional insights and monitor your intake.'
      }
    },
    {
      element: '#date-selector',
      popover: {
        title: '📅 Select Date',
        description: 'Choose the date you want to log meals for. You can log past or future meals.'
      }
    },
    {
      element: '#add-meal-btn',
      popover: {
        title: '➕ Add Meal',
        description: 'Click to add a new meal. Search for foods or select from your meal plan.'
      }
    },
    {
      element: '#daily-summary',
      popover: {
        title: '📊 Daily Summary',
        description: 'See your total calories, protein, carbs, and fats for the day compared to your targets.'
      }
    }
  ],
  ClientDashboard: [
    {
      element: '.sidebar-header',
      popover: {
        title: '👋 Welcome to Your Health Dashboard',
        description: 'Your personal health hub. Track progress, view meal plans, and connect with your dietitian.'
      }
    },
    {
      element: '#client-overview',
      popover: {
        title: '📊 Quick Stats',
        description: 'See your current weight, goal progress, energy levels, sleep quality, mood, and stress levels.'
      }
    },
    {
      element: '#meal-plan-summary',
      popover: {
        title: '🍽️ Active Meal Plan',
        description: 'View your current meal plan. You can view the full plan, download it as PDF, or give feedback.'
      }
    },
    {
      element: '#progress-summary',
      popover: {
        title: '📈 Weight Progress',
        description: 'See how your weight has changed over time with a visual chart. Track progress towards your goal.'
      }
    }
  ],
  MPESSTracker: [
    {
      element: '.sidebar-header',
      popover: {
        title: '🧘 MPESS Wellness Tracking',
        description: 'Track your Mental, Physical, Emotional, Social, and Spiritual wellness daily.'
      }
    },
    {
      element: '#date-selector',
      popover: {
        title: '📅 Select Date',
        description: 'Choose which date you want to track wellness practices for.'
      }
    },
    {
      element: '#mpess-tabs',
      popover: {
        title: '📑 Wellness Categories',
        description: 'Click on each category to log practices for Mind, Physical, Emotional, Social, and Spiritual wellness.'
      }
    },
    {
      element: '#daily-rating',
      popover: {
        title: '⭐ Daily Rating',
        description: 'Rate your overall day from 1-5 based on how you felt and your wellness practices.'
      }
    }
  ],
  FoodLookup: [
    {
      element: '.sidebar-header',
      popover: {
        title: '🔍 Food Nutrition Lookup',
        description: 'Search for any food and get detailed nutritional information, benefits, and alternatives.'
      }
    },
    {
      element: '#search-input',
      popover: {
        title: '🔎 Search Foods',
        description: 'Type any food name to get instant nutritional data, health benefits, and cooking tips.'
      }
    },
    {
      element: '#nutrition-results',
      popover: {
        title: '📊 Nutrition Info',
        description: 'See calories, macros, micronutrients, health benefits, and food alternatives.'
      }
    }
  ],
  PlatformColorCustomization: [
    {
      element: '.sidebar-header',
      popover: {
        title: '🎨 Platform Branding',
        description: 'Customize all colors for your platform, health coach panel, and client panel.'
      }
    },
    {
      element: '#color-tabs',
      popover: {
        title: '📑 Select Panel',
        description: 'Choose which panel to customize: Platform, Health Coach, or Client interface.'
      }
    },
    {
      element: '#primary-colors',
      popover: {
        title: '🌈 Gradient Colors',
        description: 'Set the primary gradient colors used for buttons, headers, and highlights.'
      }
    },
    {
      element: '#accent-colors',
      popover: {
        title: '✨ Accent Colors',
        description: 'Customize sidebar background, text colors, and accent colors.'
      }
    },
    {
      element: '#color-preview',
      popover: {
        title: '👁️ Live Preview',
        description: 'See how your color choices look in real-time before saving.'
      }
    }
  ],
  TeamManagement: [
    {
      element: '.sidebar-header',
      popover: {
        title: '👥 Team Management',
        description: 'Manage your team members, assign roles, and set permissions.'
      }
    },
    {
      element: '#team-list',
      popover: {
        title: '👤 Team Members',
        description: 'View all team members with their roles and contact information.'
      }
    },
    {
      element: '#add-member-btn',
      popover: {
        title: '➕ Add Team Member',
        description: 'Click here to invite a new team member and assign their role and permissions.'
      }
    }
  ],
  CoachSubscriptions: [
    {
      element: '.sidebar-header',
      popover: {
        title: '💳 Subscription Plans',
        description: 'View available subscription plans and manage your current subscription.'
      }
    },
    {
      element: '#plans-list',
      popover: {
        title: '📋 Available Plans',
        description: 'See all subscription tiers with features and pricing.'
      }
    },
    {
      element: '#current-subscription',
      popover: {
        title: '✅ Your Plan',
        description: 'View your current active subscription and renewal date.'
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