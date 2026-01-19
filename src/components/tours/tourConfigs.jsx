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
  },

  ClientReports: {
    title: "Client Reports Tour",
    steps: [
      {
        popover: {
          title: '📊 Client Reports',
          description: 'Generate comprehensive reports for your clients including progress, nutrition analysis, and health metrics.',
        }
      },
      {
        element: '.select-client',
        popover: {
          title: '👤 Select Client',
          description: 'Choose which client you want to generate a report for.',
          side: 'bottom'
        }
      },
      {
        element: '.generate-report-btn',
        popover: {
          title: '📄 Generate Report',
          description: 'Create detailed PDF reports to share with clients or for your records.',
          side: 'left'
        }
      }
    ]
  },

  TemplateLibrary: {
    title: "Template Library Tour",
    steps: [
      {
        popover: {
          title: '📚 Template Library',
          description: 'Access pre-made meal plan templates, recipes, and assessment forms to save time.',
        }
      },
      {
        element: '.template-categories',
        popover: {
          title: '🗂️ Browse Templates',
          description: 'Find templates organized by category: meal plans, recipes, assessments, and more.',
          side: 'bottom'
        }
      },
      {
        element: '.use-template-btn',
        popover: {
          title: '✨ Use Template',
          description: 'Select any template to customize it for your clients or add to your library.',
          side: 'left'
        }
      }
    ]
  },

  ClientAssessments: {
    title: "Client Assessments Tour",
    steps: [
      {
        popover: {
          title: '📋 Client Assessments',
          description: 'View completed assessments from your clients and track their health journey.',
        }
      },
      {
        element: '.assessment-list',
        popover: {
          title: '📝 Assessment History',
          description: 'See all assessments submitted by clients with timestamps and responses.',
          side: 'bottom'
        }
      },
      {
        element: '.view-assessment-btn',
        popover: {
          title: '👁️ Review Responses',
          description: 'Click to view detailed responses and analyze client health data.',
          side: 'left'
        }
      }
    ]
  },

  AssessmentTemplates: {
    title: "Assessment Templates Tour",
    steps: [
      {
        popover: {
          title: '📋 Assessment Templates',
          description: 'Create custom assessment forms to collect client health information.',
        }
      },
      {
        element: '.create-template-btn',
        popover: {
          title: '➕ Create Template',
          description: 'Build custom forms with various question types: text, multiple choice, scales, and more.',
          side: 'bottom'
        }
      },
      {
        element: '.template-list',
        popover: {
          title: '📚 Your Templates',
          description: 'Manage your assessment templates. Assign them to clients for completion.',
          side: 'top'
        }
      }
    ]
  },

  FoodLookup: {
    title: "Food Lookup Tour",
    steps: [
      {
        popover: {
          title: '🔍 Food Database',
          description: 'Search thousands of foods to get detailed nutritional information instantly.',
        }
      },
      {
        element: '.search-food',
        popover: {
          title: '🥗 Search Foods',
          description: 'Type any food name to get calories, macros, vitamins, and minerals.',
          side: 'bottom'
        }
      },
      {
        element: '.ai-lookup-btn',
        popover: {
          title: '🤖 AI Food Analysis',
          description: 'Use AI to analyze food photos or describe dishes for instant nutrition info.',
          side: 'left'
        }
      }
    ]
  },

  HealthCoachPlans: {
    title: "Health Coach Plans Tour",
    steps: [
      {
        popover: {
          title: '💎 Platform Plans',
          description: 'Manage subscription plans for health coaches. Set features, limits, and pricing.',
        }
      },
      {
        element: '.create-plan-btn',
        popover: {
          title: '➕ Create Plan',
          description: 'Add new subscription tiers with custom features and client limits.',
          side: 'bottom'
        }
      },
      {
        element: '.plan-features',
        popover: {
          title: '⚙️ Plan Features',
          description: 'Configure what features each plan includes: AI credits, team size, white label, etc.',
          side: 'left'
        }
      }
    ]
  },

  ClientPlanBuilder: {
    title: "Client Plan Builder Tour",
    steps: [
      {
        popover: {
          title: '🎯 Client Plan Builder',
          description: 'Create subscription plans that your clients can purchase directly from your landing pages.',
        }
      },
      {
        element: '.plan-details',
        popover: {
          title: '📝 Plan Details',
          description: 'Set plan name, description, duration, and what\'s included in the package.',
          side: 'bottom'
        }
      },
      {
        element: '.pricing-section',
        popover: {
          title: '💰 Pricing',
          description: 'Configure pricing, payment options, and whether to allow installments.',
          side: 'left'
        }
      }
    ]
  },

  CoachPaymentSetup: {
    title: "Payment Setup Tour",
    steps: [
      {
        popover: {
          title: '💳 Payment Gateway Setup',
          description: 'Connect your Razorpay account to start accepting payments from clients.',
        }
      },
      {
        element: '.razorpay-keys',
        popover: {
          title: '🔑 API Keys',
          description: 'Enter your Razorpay API keys to enable payment processing.',
          side: 'bottom'
        }
      },
      {
        element: '.test-payment-btn',
        popover: {
          title: '✅ Test Payment',
          description: 'Test your payment setup before going live with clients.',
          side: 'left'
        }
      }
    ]
  },

  ClientPlanManagement: {
    title: "Client Plans Tour",
    steps: [
      {
        popover: {
          title: '📦 Assign Client Plans',
          description: 'Assign subscription plans to clients and track their active memberships.',
        }
      },
      {
        element: '.assign-plan-btn',
        popover: {
          title: '➕ Assign Plan',
          description: 'Select a client and assign them a subscription plan manually.',
          side: 'bottom'
        }
      },
      {
        element: '.active-plans',
        popover: {
          title: '✅ Active Plans',
          description: 'View all active client subscriptions and their expiration dates.',
          side: 'top'
        }
      }
    ]
  },

  PaymentHistory: {
    title: "Payment History Tour",
    steps: [
      {
        popover: {
          title: '💵 Payment History',
          description: 'View all payment transactions from clients including subscriptions and one-time purchases.',
        }
      },
      {
        element: '.payment-filters',
        popover: {
          title: '🔍 Filter Payments',
          description: 'Filter by date range, payment status, or client to find specific transactions.',
          side: 'bottom'
        }
      },
      {
        element: '.export-btn',
        popover: {
          title: '📥 Export Data',
          description: 'Download payment records as CSV for accounting and tax purposes.',
          side: 'left'
        }
      }
    ]
  },

  PlatformBrandingTracker: {
    title: "Platform Branding Tour",
    steps: [
      {
        popover: {
          title: '🎨 White Label Branding',
          description: 'Customize the platform with your logo, business name, and branding colors.',
        }
      },
      {
        element: '.logo-upload',
        popover: {
          title: '🖼️ Upload Logo',
          description: 'Upload your business logo to replace the default branding.',
          side: 'bottom'
        }
      },
      {
        element: '.business-info',
        popover: {
          title: '📝 Business Info',
          description: 'Add your business name, tagline, and contact information.',
          side: 'left'
        }
      }
    ]
  },

  PlatformColorCustomization: {
    title: "Color Customization Tour",
    steps: [
      {
        popover: {
          title: '🎨 Color Theme',
          description: 'Customize the platform colors to match your brand identity.',
        }
      },
      {
        element: '.color-picker',
        popover: {
          title: '🌈 Choose Colors',
          description: 'Select primary, secondary, and accent colors for the interface.',
          side: 'bottom'
        }
      },
      {
        element: '.preview-section',
        popover: {
          title: '👁️ Live Preview',
          description: 'See your color changes in real-time before saving.',
          side: 'left'
        }
      }
    ]
  },

  AdminSubscriptionManager: {
    title: "Subscription Manager Tour",
    steps: [
      {
        popover: {
          title: '👑 Admin Subscription Manager',
          description: 'Manage all coach subscriptions, grant access, and handle billing issues.',
        }
      },
      {
        element: '.subscription-list',
        popover: {
          title: '📋 All Subscriptions',
          description: 'View active, expired, and pending subscriptions across all coaches.',
          side: 'bottom'
        }
      },
      {
        element: '.manual-grant-btn',
        popover: {
          title: '✅ Manual Access',
          description: 'Grant or revoke subscription access manually for testing or support.',
          side: 'left'
        }
      }
    ]
  },

  UserPermissionManagement: {
    title: "Permission Management Tour",
    steps: [
      {
        popover: {
          title: '🔐 User Permissions',
          description: 'Control what features each user type can access in the platform.',
        }
      },
      {
        element: '.permission-matrix',
        popover: {
          title: '⚙️ Permission Settings',
          description: 'Set granular permissions for coaches, team members, and clients.',
          side: 'bottom'
        }
      },
      {
        element: '.save-permissions-btn',
        popover: {
          title: '💾 Save Changes',
          description: 'Save permission changes to apply them across the platform.',
          side: 'left'
        }
      }
    ]
  },

  WebinarPerformanceTracker: {
    title: "Webinar Tracker Tour",
    steps: [
      {
        popover: {
          title: '🎥 Webinar Performance',
          description: 'Track webinar registrations, attendance, and conversion metrics.',
        }
      },
      {
        element: '.webinar-list',
        popover: {
          title: '📅 Your Webinars',
          description: 'View all past and upcoming webinars with performance stats.',
          side: 'bottom'
        }
      },
      {
        element: '.analytics-chart',
        popover: {
          title: '📊 Analytics',
          description: 'See registration rates, show-up rates, and post-webinar conversions.',
          side: 'top'
        }
      }
    ]
  },

  BusinessGPTs: {
    title: "Business GPTs Tour",
    steps: [
      {
        popover: {
          title: '🤖 AI Business Tools',
          description: 'Use AI assistants to help with content creation, client communication, and business tasks.',
        }
      },
      {
        element: '.gpt-selector',
        popover: {
          title: '🎯 Choose Assistant',
          description: 'Select from marketing, nutrition, client support, or general business AI assistants.',
          side: 'bottom'
        }
      },
      {
        element: '.chat-interface',
        popover: {
          title: '💬 Chat with AI',
          description: 'Ask questions, generate content, or get business advice from AI.',
          side: 'left'
        }
      }
    ]
  },

  BroadcastNotification: {
    title: "Broadcast Notification Tour",
    steps: [
      {
        popover: {
          title: '📢 Broadcast Messages',
          description: 'Send notifications to all clients or specific groups at once.',
        }
      },
      {
        element: '.message-composer',
        popover: {
          title: '✍️ Compose Message',
          description: 'Write your message and choose notification priority level.',
          side: 'bottom'
        }
      },
      {
        element: '.audience-selector',
        popover: {
          title: '👥 Select Audience',
          description: 'Send to all clients, active clients only, or specific groups.',
          side: 'left'
        }
      }
    ]
  },

  TemplateLibraryManager: {
    title: "Template Manager Tour",
    steps: [
      {
        popover: {
          title: '📚 Template Upload',
          description: 'Upload templates for the community library that other coaches can use.',
        }
      },
      {
        element: '.upload-template',
        popover: {
          title: '📤 Upload',
          description: 'Upload meal plans, recipes, or assessment templates to share.',
          side: 'bottom'
        }
      },
      {
        element: '.template-stats',
        popover: {
          title: '📊 Usage Stats',
          description: 'See how many coaches are using your templates.',
          side: 'left'
        }
      }
    ]
  },

  UsageDashboard: {
    title: "Usage Dashboard Tour",
    steps: [
      {
        popover: {
          title: '📊 Platform Usage',
          description: 'Monitor AI credit usage, feature adoption, and platform analytics.',
        }
      },
      {
        element: '.usage-metrics',
        popover: {
          title: '📈 Metrics Overview',
          description: 'Track AI credits consumed, active users, and feature utilization.',
          side: 'bottom'
        }
      },
      {
        element: '.cost-analysis',
        popover: {
          title: '💰 Cost Analysis',
          description: 'View operational costs and revenue per coach.',
          side: 'top'
        }
      }
    ]
  },

  VerticalManagement: {
    title: "Verticals Dashboard Tour",
    steps: [
      {
        popover: {
          title: '🎯 Vertical Management',
          description: 'Organize clients by niche or specialty: weight loss, diabetes, PCOS, sports nutrition, etc.',
        }
      },
      {
        element: '.create-vertical-btn',
        popover: {
          title: '➕ Create Vertical',
          description: 'Define new practice verticals with specific templates and protocols.',
          side: 'bottom'
        }
      },
      {
        element: '.vertical-stats',
        popover: {
          title: '📊 Vertical Stats',
          description: 'Track performance and client outcomes by vertical.',
          side: 'left'
        }
      }
    ]
  },

  BulkImport: {
    title: "Bulk Import Tour",
    steps: [
      {
        popover: {
          title: '📥 Bulk Import',
          description: 'Import multiple clients, recipes, or data from CSV/Excel files.',
        }
      },
      {
        element: '.upload-file',
        popover: {
          title: '📄 Upload File',
          description: 'Upload your CSV or Excel file with client or recipe data.',
          side: 'bottom'
        }
      },
      {
        element: '.field-mapping',
        popover: {
          title: '🗺️ Map Fields',
          description: 'Match your file columns to platform fields for accurate import.',
          side: 'left'
        }
      }
    ]
  },

  TeamAttendance: {
    title: "Team Attendance Tour",
    steps: [
      {
        popover: {
          title: '⏰ Team Attendance',
          description: 'Track team member attendance, working hours, and productivity.',
        }
      },
      {
        element: '.attendance-calendar',
        popover: {
          title: '📅 Attendance Calendar',
          description: 'View team attendance patterns and identify trends.',
          side: 'bottom'
        }
      },
      {
        element: '.mark-attendance-btn',
        popover: {
          title: '✅ Mark Attendance',
          description: 'Record attendance for team members manually or set up automatic tracking.',
          side: 'left'
        }
      }
    ]
  },

  FeatureControl: {
    title: "Feature Control Tour",
    steps: [
      {
        popover: {
          title: '🎛️ Feature Flags',
          description: 'Enable or disable platform features for testing or gradual rollout.',
        }
      },
      {
        element: '.feature-list',
        popover: {
          title: '🚩 Feature Toggles',
          description: 'Turn features on/off without code deployment.',
          side: 'bottom'
        }
      },
      {
        element: '.beta-features',
        popover: {
          title: '🧪 Beta Features',
          description: 'Enable experimental features for testing with select users.',
          side: 'left'
        }
      }
    ]
  },

  PlatformReference: {
    title: "Platform Reference Tour",
    steps: [
      {
        popover: {
          title: '📖 Documentation',
          description: 'Complete platform documentation and reference guides.',
        }
      },
      {
        element: '.search-docs',
        popover: {
          title: '🔍 Search',
          description: 'Search documentation to find answers quickly.',
          side: 'bottom'
        }
      },
      {
        element: '.doc-categories',
        popover: {
          title: '📚 Categories',
          description: 'Browse documentation by feature category.',
          side: 'left'
        }
      }
    ]
  },

  MealPlansPro: {
    title: "Pro Meal Plans Tour",
    steps: [
      {
        popover: {
          title: '💎 Clinical Meal Plans',
          description: 'Advanced disease-specific meal planning for diabetes, PCOS, heart health, and more.',
        }
      },
      {
        element: '.disease-selector',
        popover: {
          title: '🏥 Select Condition',
          description: 'Choose the health condition to create evidence-based meal plans.',
          side: 'bottom'
        }
      },
      {
        element: '.ai-generate-pro',
        popover: {
          title: '🤖 AI Clinical Plans',
          description: 'Generate medically-informed meal plans using AI with clinical protocols.',
          side: 'left'
        }
      }
    ]
  },

  PaymentGatewaySettings: {
    title: "Payment Gateway Tour",
    steps: [
      {
        popover: {
          title: '💳 Payment Configuration',
          description: 'Configure Razorpay payment gateway for client subscriptions.',
        }
      },
      {
        element: '.api-credentials',
        popover: {
          title: '🔑 API Credentials',
          description: 'Enter your Razorpay API keys to enable payment processing.',
          side: 'bottom'
        }
      },
      {
        element: '.webhook-setup',
        popover: {
          title: '🔗 Webhook URL',
          description: 'Configure webhook URL in Razorpay for automatic payment verification.',
          side: 'left'
        }
      }
    ]
  },

  LandingPageBuilder: {
    title: "Landing Page Builder Tour",
    steps: [
      {
        popover: {
          title: '🎨 Page Builder',
          description: 'Create beautiful landing pages with drag-and-drop sections.',
        }
      },
      {
        element: '.add-section',
        popover: {
          title: '➕ Add Sections',
          description: 'Add hero, features, testimonials, and CTA sections to your page.',
          side: 'bottom'
        }
      },
      {
        element: '.publish-btn',
        popover: {
          title: '🚀 Publish',
          description: 'Publish your landing page and get a public link to share.',
          side: 'left'
        }
      }
    ]
  },

  MyAssignedMealPlan: {
    title: "My Meal Plan Tour",
    steps: [
      {
        popover: {
          title: '🍽️ Your Meal Plan',
          description: 'View your personalized meal plan created by your dietitian.',
        }
      },
      {
        element: '.meal-schedule',
        popover: {
          title: '📅 Daily Schedule',
          description: 'See your meals organized by breakfast, lunch, dinner, and snacks.',
          side: 'bottom'
        }
      },
      {
        element: '.mark-complete-btn',
        popover: {
          title: '✅ Track Progress',
          description: 'Mark meals as completed to track your adherence.',
          side: 'left'
        }
      }
    ]
  },

  ProgressTracking: {
    title: "Progress Tracking Tour",
    steps: [
      {
        popover: {
          title: '📊 Track Progress',
          description: 'Log your weight, measurements, and wellness metrics to monitor your journey.',
        }
      },
      {
        element: '.add-entry-btn',
        popover: {
          title: '➕ Add Entry',
          description: 'Record your current weight, measurements, and how you\'re feeling.',
          side: 'bottom'
        }
      },
      {
        element: '.progress-charts',
        popover: {
          title: '📈 Progress Charts',
          description: 'Visualize your progress over time with interactive charts.',
          side: 'top'
        }
      }
    ]
  },

  MPESSTracker: {
    title: "MPESS Wellness Tour",
    steps: [
      {
        popover: {
          title: '🧘 Holistic Wellness',
          description: 'Track Mind, Physical, Emotional, Social, and Spiritual wellness practices.',
        }
      },
      {
        element: '.wellness-categories',
        popover: {
          title: '🌟 5 Pillars',
          description: 'Balance all aspects of health: mental, physical, emotional, social, spiritual.',
          side: 'bottom'
        }
      },
      {
        element: '.daily-log-btn',
        popover: {
          title: '📝 Daily Log',
          description: 'Log your wellness activities each day to build healthy habits.',
          side: 'left'
        }
      }
    ]
  },

  ClientAppointments: {
    title: "My Appointments Tour",
    steps: [
      {
        popover: {
          title: '📅 Your Appointments',
          description: 'View and manage your scheduled consultations with your dietitian.',
        }
      },
      {
        element: '.upcoming-appointments',
        popover: {
          title: '🔜 Upcoming Sessions',
          description: 'See your next appointments with date, time, and video call links.',
          side: 'bottom'
        }
      },
      {
        element: '.appointment-history',
        popover: {
          title: '📋 History',
          description: 'Review past appointments and notes from your dietitian.',
          side: 'top'
        }
      }
    ]
  },

  ClientRecipes: {
    title: "Recipe Library Tour",
    steps: [
      {
        popover: {
          title: '🍳 Recipe Collection',
          description: 'Browse healthy recipes recommended by your dietitian.',
        }
      },
      {
        element: '.recipe-filters',
        popover: {
          title: '🔍 Filter Recipes',
          description: 'Find recipes by meal type, dietary preference, or nutritional goals.',
          side: 'bottom'
        }
      },
      {
        element: '.favorite-btn',
        popover: {
          title: '❤️ Save Favorites',
          description: 'Save recipes you love to your favorites for quick access.',
          side: 'left'
        }
      }
    ]
  },

  Profile: {
    title: "My Profile Tour",
    steps: [
      {
        popover: {
          title: '👤 Your Profile',
          description: 'View and update your personal information and health details.',
        }
      },
      {
        element: '.personal-info',
        popover: {
          title: '📝 Personal Info',
          description: 'Update your contact information and profile photo.',
          side: 'bottom'
        }
      },
      {
        element: '.health-info',
        popover: {
          title: '🏥 Health Info',
          description: 'Keep your health conditions, allergies, and medications up to date.',
          side: 'left'
        }
      }
    ]
  },

  ClientPlans: {
    title: "My Plans Tour",
    steps: [
      {
        popover: {
          title: '📦 Your Subscriptions',
          description: 'View your active subscription plans and purchase history.',
        }
      },
      {
        element: '.active-plan',
        popover: {
          title: '✅ Active Plan',
          description: 'See your current plan details, features, and renewal date.',
          side: 'bottom'
        }
      },
      {
        element: '.upgrade-btn',
        popover: {
          title: '⬆️ Upgrade',
          description: 'Upgrade to a premium plan for more features and personalized support.',
          side: 'left'
        }
      }
    ]
  },

  ClientResourceTracker: {
    title: "Resources Tour",
    steps: [
      {
        popover: {
          title: '📚 Learning Resources',
          description: 'Access educational content, videos, and guides shared by your dietitian.',
        }
      },
      {
        element: '.resource-categories',
        popover: {
          title: '🗂️ Categories',
          description: 'Browse resources by type: articles, videos, workout plans, and more.',
          side: 'bottom'
        }
      },
      {
        element: '.assigned-resources',
        popover: {
          title: '🎯 Assigned to You',
          description: 'View resources specifically assigned to you by your dietitian.',
          side: 'left'
        }
      }
    ]
  },

  AddTeamAppointment: {
    title: "Team Appointment Tour",
    steps: [
      {
        popover: {
          title: '👥 Team Scheduling',
          description: 'Schedule appointments and assign them to team members.',
        }
      },
      {
        element: '.team-member-select',
        popover: {
          title: '👤 Assign to Team',
          description: 'Choose which team member will handle this appointment.',
          side: 'bottom'
        }
      },
      {
        element: '.appointment-details',
        popover: {
          title: '📝 Appointment Details',
          description: 'Set date, time, duration, and meeting link for the session.',
          side: 'left'
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