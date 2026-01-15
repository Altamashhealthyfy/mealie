// Tour configurations for each page
export const tourConfigs = {
  DietitianDashboard: {
    title: "Dietitian Dashboard Tour",
    steps: [
      {
        element: '#dietitian-tools-nav',
        popover: {
          title: '📊 Dashboard Navigation',
          description: 'Access all your core tools: analytics, reports, and client management from here.',
          side: 'right',
          align: 'start'
        }
      },
      {
        element: '#notification-bell-container',
        popover: {
          title: '🔔 Notifications',
          description: 'Stay updated with client activities, messages, and important reminders.',
          side: 'bottom',
          align: 'end'
        }
      }
    ]
  },

  ClientManagement: {
    title: "Client Management Tour",
    steps: [
      {
        popover: {
          title: '👥 Welcome to Client Management',
          description: 'Manage all your clients, track their progress, and view detailed profiles from this central hub.',
        }
      },
      {
        element: '.search-clients',
        popover: {
          title: '🔍 Search & Filter',
          description: 'Quickly find clients using search and filters. Filter by status, goals, health conditions, and more.',
          side: 'bottom'
        }
      },
      {
        element: '.add-client-btn',
        popover: {
          title: '➕ Add New Client',
          description: 'Click here to onboard a new client. You can invite them via email or create their profile manually.',
          side: 'left'
        }
      }
    ]
  },

  Communication: {
    title: "Messaging Tour",
    steps: [
      {
        popover: {
          title: '💬 Client Communication',
          description: 'Message your clients individually or in groups. Send files, schedule messages, and track read receipts.',
        }
      },
      {
        element: '.client-list',
        popover: {
          title: '📋 Client List',
          description: 'Select a client to start a conversation. Unread messages are highlighted.',
          side: 'right'
        }
      },
      {
        element: '.message-input',
        popover: {
          title: '✍️ Send Messages',
          description: 'Type your message here. Attach files, schedule for later, or mark as important.',
          side: 'top'
        }
      }
    ]
  },

  MealPlanner: {
    title: "Meal Planner Tour",
    steps: [
      {
        popover: {
          title: '🍽️ Meal Planning Made Easy',
          description: 'Create personalized meal plans for your clients. Use AI assistance or build manually.',
        }
      },
      {
        element: '.ai-generate-btn',
        popover: {
          title: '🤖 AI-Powered Generation',
          description: 'Let AI create meal plans based on client preferences, health conditions, and dietary requirements.',
          side: 'bottom'
        }
      },
      {
        element: '.manual-builder',
        popover: {
          title: '🛠️ Manual Builder',
          description: 'Build meal plans manually for complete control. Drag and drop recipes or create custom meals.',
          side: 'left'
        }
      }
    ]
  },

  Recipes: {
    title: "Recipe Management Tour",
    steps: [
      {
        popover: {
          title: '🍳 Recipe Library',
          description: 'Manage your recipe collection. Create new recipes, import from templates, or use AI generation.',
        }
      },
      {
        element: '.recipe-search',
        popover: {
          title: '🔍 Search Recipes',
          description: 'Find recipes by name, ingredients, dietary tags, or nutritional values.',
          side: 'bottom'
        }
      },
      {
        element: '.create-recipe-btn',
        popover: {
          title: '➕ Create Recipe',
          description: 'Add new recipes manually or use AI to generate recipes based on ingredients and preferences.',
          side: 'left'
        }
      }
    ]
  },

  ResourceLibraryEnhanced: {
    title: "Resource Library Tour",
    steps: [
      {
        popover: {
          title: '📚 Resource Library',
          description: 'Upload and manage resources for your clients: articles, videos, PDFs, workout plans, and more.',
        }
      },
      {
        element: '.upload-resource-btn',
        popover: {
          title: '📤 Upload Resources',
          description: 'Upload files, add links, or create custom categories for better organization.',
          side: 'bottom'
        }
      },
      {
        element: '.assign-resource-btn',
        popover: {
          title: '👤 Assign to Clients',
          description: 'Assign resources to specific clients and track their progress.',
          side: 'left'
        }
      }
    ]
  },

  ClientDashboard: {
    title: "Client Dashboard Tour",
    steps: [
      {
        popover: {
          title: '🏠 Welcome to Your Dashboard',
          description: 'Your personalized health journey starts here. Track progress, view meal plans, and stay connected with your dietitian.',
        }
      },
      {
        element: '.meal-plan-card',
        popover: {
          title: '🍽️ Today\'s Meal Plan',
          description: 'View your personalized meal plan for today. Mark meals as completed as you go.',
          side: 'bottom'
        }
      },
      {
        element: '.progress-card',
        popover: {
          title: '📊 Your Progress',
          description: 'Track your weight, measurements, and wellness metrics over time.',
          side: 'top'
        }
      }
    ]
  },

  ClientCommunication: {
    title: "Client Messages Tour",
    steps: [
      {
        popover: {
          title: '💬 Stay Connected',
          description: 'Message your dietitian anytime. Share updates, ask questions, or send photos of your meals.',
        }
      },
      {
        element: '.message-compose',
        popover: {
          title: '✍️ Send Message',
          description: 'Type your message and attach files if needed. Your dietitian will be notified.',
          side: 'top'
        }
      }
    ]
  },

  FoodLog: {
    title: "Food Log Tour",
    steps: [
      {
        popover: {
          title: '🍴 Food Log',
          description: 'Track everything you eat to help your dietitian monitor your nutrition and provide better guidance.',
        }
      },
      {
        element: '.add-meal-btn',
        popover: {
          title: '➕ Log Your Meals',
          description: 'Add meals manually or use AI to analyze food photos and get nutritional information.',
          side: 'bottom'
        }
      }
    ]
  },

  Appointments: {
    title: "Appointments Tour",
    steps: [
      {
        popover: {
          title: '📅 Appointment Management',
          description: 'Schedule and manage appointments with your clients. Sync with Google Calendar automatically.',
        }
      },
      {
        element: '.calendar-view',
        popover: {
          title: '🗓️ Calendar View',
          description: 'See all your appointments at a glance. Click on any date to schedule a new appointment.',
          side: 'bottom'
        }
      },
      {
        element: '.create-appointment-btn',
        popover: {
          title: '➕ Schedule Appointment',
          description: 'Book appointments with clients. Add video call links and send automatic reminders.',
          side: 'left'
        }
      }
    ]
  },

  ClientAnalyticsDashboard: {
    title: "Analytics Dashboard Tour",
    steps: [
      {
        popover: {
          title: '📊 Client Analytics',
          description: 'Deep dive into your practice metrics. Track client progress, engagement, and business growth.',
        }
      },
      {
        element: '.metrics-overview',
        popover: {
          title: '📈 Key Metrics',
          description: 'View high-level stats: total clients, active plans, revenue, and engagement rates.',
          side: 'bottom'
        }
      },
      {
        element: '.client-progress-chart',
        popover: {
          title: '📉 Progress Trends',
          description: 'Visualize client weight loss, adherence rates, and overall health improvements.',
          side: 'top'
        }
      }
    ]
  },

  MarketingHub: {
    title: "Marketing Hub Tour",
    steps: [
      {
        popover: {
          title: '📣 Marketing Hub',
          description: 'Grow your practice with ready-made content, templates, and social media tools.',
        }
      },
      {
        element: '.content-templates',
        popover: {
          title: '📝 Content Templates',
          description: 'Access pre-designed posts, graphics, and captions for social media and marketing.',
          side: 'bottom'
        }
      },
      {
        element: '.ai-content-generator',
        popover: {
          title: '🤖 AI Content Creator',
          description: 'Generate custom marketing content using AI based on your niche and audience.',
          side: 'left'
        }
      }
    ]
  },

  ClientFinanceManager: {
    title: "Finance Manager Tour",
    steps: [
      {
        popover: {
          title: '💰 Finance Management',
          description: 'Track payments, invoices, and revenue. Manage client subscriptions and payment plans.',
        }
      },
      {
        element: '.revenue-overview',
        popover: {
          title: '💵 Revenue Overview',
          description: 'See your total revenue, pending payments, and monthly trends at a glance.',
          side: 'bottom'
        }
      },
      {
        element: '.payment-records',
        popover: {
          title: '📋 Payment Records',
          description: 'View and manage all client payments. Send payment reminders and track installments.',
          side: 'top'
        }
      }
    ]
  },

  PurchaseAICredits: {
    title: "AI Credits Tour",
    steps: [
      {
        popover: {
          title: '✨ AI Credits',
          description: 'Buy AI credits to generate meal plans, recipes, and content. Credits never expire.',
        }
      },
      {
        element: '.credits-balance',
        popover: {
          title: '💎 Your Balance',
          description: 'See how many AI credits you have available. Each credit = 1 AI generation.',
          side: 'bottom'
        }
      },
      {
        element: '.purchase-form',
        popover: {
          title: '🛒 Purchase Credits',
          description: 'Select how many credits you need and complete payment. Instant activation.',
          side: 'top'
        }
      }
    ]
  },

  TeamManagement: {
    title: "Team Management Tour",
    steps: [
      {
        popover: {
          title: '👥 Team Management',
          description: 'Add team members, assign roles, and collaborate with your nutrition team.',
        }
      },
      {
        element: '.add-member-btn',
        popover: {
          title: '➕ Add Team Member',
          description: 'Invite dietitians or assistants to join your team. Set their permissions and access levels.',
          side: 'bottom'
        }
      },
      {
        element: '.team-list',
        popover: {
          title: '👨‍⚕️ Your Team',
          description: 'View all team members, their roles, and client assignments. Track their activity.',
          side: 'left'
        }
      }
    ]
  },

  CoachSubscriptions: {
    title: "My Subscription Tour",
    steps: [
      {
        popover: {
          title: '💎 Coach Plans',
          description: 'Choose the best plan for your practice. Unlock features, increase client limits, and scale your business.',
        }
      },
      {
        element: '.plan-features',
        popover: {
          title: '✅ Plan Features',
          description: 'Each plan includes different features. Compare and select what works best for you.',
          side: 'bottom'
        }
      },
      {
        element: '.subscribe-btn',
        popover: {
          title: '🚀 Subscribe Now',
          description: 'Start your subscription with instant activation. Cancel anytime, no contracts.',
          side: 'left'
        }
      }
    ]
  },

  CouponManagement: {
    title: "Coupon Management Tour",
    steps: [
      {
        popover: {
          title: '🎟️ Coupon System',
          description: 'Create and manage discount coupons for AI credits, coach plans, and client subscriptions.',
        }
      },
      {
        element: '.create-coupon-btn',
        popover: {
          title: '➕ Create Coupon',
          description: 'Set up promotional codes with custom discounts, usage limits, and expiration dates.',
          side: 'bottom'
        }
      },
      {
        element: '.coupon-list',
        popover: {
          title: '📋 Active Coupons',
          description: 'Track coupon usage, view redemption stats, and manage active promotions.',
          side: 'top'
        }
      }
    ]
  }
};

// Default tour for pages without specific configuration
export const defaultTour = {
  title: "Page Tour",
  steps: [
    {
      popover: {
        title: '👋 Welcome!',
        description: 'This is a brief tour of this page. Click Next to learn more about the features available here.',
      }
    }
  ]
};