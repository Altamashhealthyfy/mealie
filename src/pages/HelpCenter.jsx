import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Search, Home, MessageSquare, Calendar, ChefHat,
  FileText, BarChart3, Heart, TrendingUp, BookOpen, Award,
  Zap, X, ChevronRight, Star, Lightbulb,
  PlayCircle, Target, Utensils, Scale, ClipboardList,
  Users, DollarSign, Settings, Upload, Sparkles, LayoutDashboard,
  UserPlus, Bell, BarChart2, Stethoscope, Mail
} from 'lucide-react';
import { Input } from '@/components/ui/input';

const STEPS_GUIDE = [
  {
    id: 'getting-started',
    title: 'Getting Started as a Health Coach',
    icon: '🚀',
    color: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50',
    borderColor: 'border-violet-200',
    badge: 'Start Here',
    badgeColor: 'bg-violet-100 text-violet-700',
    steps: [
      {
        step: 1,
        title: 'Set Up Your Coach Profile',
        icon: FileText,
        desc: 'Complete your professional profile to build client trust and personalize your platform.',
        details: [
          'Go to Coach Profile Manager in the sidebar under Business Tools',
          'Add your full name, designation, and professional bio',
          'Upload your profile photo and business logo',
          'Set your custom branding name and tagline',
          'Configure your platform colors under Color Customization',
          'Add your business name, website, and social links'
        ]
      },
      {
        step: 2,
        title: 'Configure Payment Gateway',
        icon: DollarSign,
        desc: 'Set up Razorpay to accept payments from clients directly through the platform.',
        details: [
          'Go to Payment Gateway under Payment & Plans in the sidebar',
          'Enter your Razorpay Key ID and Key Secret',
          'Test the payment gateway with a dummy transaction',
          'Configure your billing currency and default plan prices',
          'Enable/disable payment gateway per your preference'
        ]
      },
      {
        step: 3,
        title: 'Create Client Packages',
        icon: Users,
        desc: 'Define subscription plans and packages to offer your clients.',
        details: [
          'Navigate to Clients Packages under Payment & Plans in the sidebar',
          'Click "Create New Plan" and enter plan name, duration, and price',
          'Define which features are included in each plan',
          'Set meal plan tier (Basic or Advanced) for each package',
          'Publish plans so clients can view and purchase them',
          'Assign plans to existing clients from the client profile'
        ]
      },
      {
        step: 4,
        title: 'Invite Your First Client',
        icon: UserPlus,
        desc: 'Add clients and give them login access — two steps required.',
        details: [
          'Step 1: Go to Clients in the sidebar and click "Add New Client"',
          'Fill in their name, email, health details, goal, and dietary preferences',
          'Step 2 (Important!): Go to Dashboard → Data → User and click "Invite User"',
          'Enter the SAME email used in the client profile and set user_type = "client"',
          'The client receives an email invitation to set their password',
          'Once logged in, the client can see their meal plan, progress, and messages'
        ]
      }
    ]
  },
  {
    id: 'client-management',
    title: 'Managing Clients Daily',
    icon: '👥',
    color: 'from-orange-500 to-amber-500',
    bgLight: 'bg-orange-50',
    borderColor: 'border-orange-200',
    badge: 'Everyday',
    badgeColor: 'bg-orange-100 text-orange-700',
    steps: [
      {
        step: 1,
        title: 'Review Your Dashboard',
        icon: LayoutDashboard,
        desc: 'Start your day by checking client alerts, pending tasks, and key metrics.',
        details: [
          'Open the Dietitian Dashboard from the sidebar',
          'Review new client progress logs submitted overnight',
          'Check unread messages from clients requiring response',
          'See upcoming appointments for the day',
          'Review clients who haven\'t logged progress in 3+ days',
          'Check AI Coach Insights for flagged clients needing attention'
        ]
      },
      {
        step: 2,
        title: 'Use Quick Actions on Client Cards',
        icon: Zap,
        desc: 'Take instant action on any client directly from the client list.',
        details: [
          'Go to Clients in the sidebar',
          'Each client card has an ⚡ Act button — click it to open Quick Actions',
          'Meal Plan tab: assign any existing meal plan directly to the client',
          'MPESS tab: create a custom wellness practice for the client',
          'Call tab: schedule a check-in or video call appointment instantly',
          'Notify tab: send a push notification or email reminder from pre-built templates'
        ]
      },
      {
        step: 3,
        title: 'Review Client Progress',
        icon: TrendingUp,
        desc: 'Monitor each client\'s weight, meals, and wellness metrics.',
        details: [
          'Go to Clients Feedback in the sidebar',
          'Click on a client to open their progress dashboard',
          'Review their weight trend chart and recent logs',
          'Check meal adherence percentage for the past week',
          'Look at MPESS wellness scores and trends',
          'Add coach feedback and rate their weekly progress'
        ]
      },
      {
        step: 4,
        title: 'Send Messages & Check-ins',
        icon: MessageSquare,
        desc: 'Stay connected with clients through regular communication.',
        details: [
          'Open Messages from the sidebar',
          'Select a client to open their chat window',
          'Use Message Templates for quick motivational messages',
          'Send meal plan updates, encouragement, or feedback',
          'Attach files, reports, or resource documents',
          'Schedule automated check-ins via the Automated Check-in Scheduler in the chat panel'
        ]
      }
    ]
  },
  {
    id: 'meal-plans',
    title: 'Creating Meal Plans',
    icon: '🍱',
    color: 'from-green-500 to-emerald-600',
    bgLight: 'bg-green-50',
    borderColor: 'border-green-200',
    badge: 'Core Feature',
    badgeColor: 'bg-green-100 text-green-700',
    steps: [
      {
        step: 1,
        title: 'Generate AI Meal Plan',
        icon: Sparkles,
        desc: 'Use AI to instantly generate a personalized meal plan for any client.',
        details: [
          'Go to Meal Plans in the sidebar',
          'Click "Create New Meal Plan" and select the client',
          'Choose plan tier: Basic (calorie-based) or Advanced (disease reversal)',
          'Enter duration (days), target calories, and food preference',
          'Click "Generate with AI" — the system builds the full plan in seconds',
          'Review and edit any meals before assigning to the client'
        ]
      },
      {
        step: 2,
        title: 'Customize & Edit Meals',
        icon: ChefHat,
        desc: 'Manually edit, swap, or add meals to any generated plan.',
        details: [
          'Open the generated meal plan and click on any day',
          'Click the edit icon on a meal to modify it',
          'Change meal name, food items, and portion sizes',
          'Update calorie and macro values as needed',
          'Add nutritional tips or disease rationale for advanced plans',
          'Use Meal Plan Constraints to set global restrictions for a client'
        ]
      },
      {
        step: 3,
        title: 'Use Meal Plan Templates',
        icon: FileText,
        desc: 'Save time by using pre-built templates for common client goals.',
        details: [
          'Go to Template Library in the sidebar',
          'Browse templates by category (Weight Loss, Diabetes, PCOS, etc.)',
          'Filter by food preference and regional cuisine',
          'Click "Use Template" and select the target client',
          'Customize the template before assigning',
          'Save your own frequently-used plans as new templates'
        ]
      },
      {
        step: 4,
        title: 'Assign & Share the Plan',
        icon: Upload,
        desc: 'Send the finalized meal plan to the client so they can view it in their app.',
        details: [
          'After editing, click "Assign to Client"',
          'The client immediately sees the plan in their "My Meal Plan" section',
          'Client gets a push notification about the new plan',
          'You can send a follow-up message explaining the plan',
          'Use the Download option to share a PDF version via WhatsApp or email'
        ]
      }
    ]
  },
  {
    id: 'analytics',
    title: 'Analytics & Reports',
    icon: '📊',
    color: 'from-blue-500 to-cyan-600',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200',
    badge: 'Insights',
    badgeColor: 'bg-blue-100 text-blue-700',
    steps: [
      {
        step: 1,
        title: 'View Client Analytics',
        icon: BarChart3,
        desc: 'Analyze all your clients\' progress trends from a single dashboard.',
        details: [
          'Go to Client Analytics in the sidebar',
          'See aggregate weight loss, adherence, and engagement metrics',
          'Filter by client group, goal type, or date range',
          'Spot clients with declining progress for early intervention',
          'Export reports as PDF or Excel for sharing'
        ]
      },
      {
        step: 2,
        title: 'Review Individual Client Reports',
        icon: FileText,
        desc: 'Generate detailed progress reports for individual clients.',
        details: [
          'Go to Client Progress in the sidebar',
          'Select a client and click "Generate Report"',
          'The report includes weight trend, adherence %, measurements, and wellness scores',
          'Add your coaching notes before sharing',
          'Download as PDF or share directly with the client in chat'
        ]
      },
      {
        step: 3,
        title: 'Use AI Coach Insights',
        icon: Sparkles,
        desc: 'Get AI-powered analysis and recommendations for each client.',
        details: [
          'Navigate to AI Coach Insights in the sidebar',
          'Select a client to generate an AI analysis',
          'AI reviews weight trend, food logs, MPESS, and adherence',
          'Get specific coaching recommendations and red flags',
          'Use insights to personalize your next session with the client',
          'AI can draft progress summaries and intervention messages'
        ]
      },
      {
        step: 4,
        title: 'Track Business Performance',
        icon: BarChart2,
        desc: 'Monitor revenue, client retention, and overall platform performance.',
        details: [
          'Go to Advanced Analytics or Platform Analytics in the sidebar',
          'Review monthly revenue, new clients, and churn rate',
          'Check which plan tiers are most popular',
          'Monitor client engagement levels across the platform',
          'Use Finance Manager under Business Tools to track payments and outstanding dues'
        ]
      }
    ]
  },
  {
    id: 'email-sequences',
    title: 'Email Sequences & Automation',
    icon: '📧',
    color: 'from-pink-500 to-rose-600',
    bgLight: 'bg-pink-50',
    borderColor: 'border-pink-200',
    badge: 'Automation',
    badgeColor: 'bg-pink-100 text-pink-700',
    steps: [
      {
        step: 1,
        title: 'Open Email Sequences',
        icon: Mail,
        desc: 'Set up automated drip email campaigns that are triggered when a new client joins.',
        details: [
          'Go to Email Sequences under Business Tools in the sidebar',
          'Create a sequence with multiple emails, each with a delay after the previous one',
          'Each email has its own subject, body, and delay (e.g. Day 1, Day 3, Day 7)',
          'Once a client is added, the sequence starts automatically',
          'Ideal for welcome sequences, onboarding tips, and habit reminders'
        ]
      },
      {
        step: 2,
        title: 'Set Up Automated Reminders',
        icon: Bell,
        desc: 'Create scheduled reminders for individual clients to keep them on track.',
        details: [
          'Go to Broadcast Notification under Business Tools',
          'Use the Check-in Scheduler panel to set per-client recurring messages',
          'Choose reminder type: meal logging, water intake, workout, wellbeing, or custom',
          'Set frequency (Daily, Weekly, Bi-weekly, Monthly) and time of day',
          'Reminders are sent as in-app push notifications and/or email'
        ]
      },
      {
        step: 3,
        title: 'Broadcast to All Clients',
        icon: Bell,
        desc: 'Send a single message to all clients or a specific group at once.',
        details: [
          'Go to Broadcast Notification in the Business Tools section',
          'Type your message or choose a template',
          'Select target: all clients, a specific group, or individual clients',
          'Send immediately or schedule for a specific time',
          'Great for announcements, challenge launches, and weekly motivation'
        ]
      },
      {
        step: 4,
        title: 'Configure Gmail for Email Delivery',
        icon: Upload,
        desc: 'Ensure Gmail is connected for all email automations to work.',
        details: [
          'Email reminders and sequences require the Gmail connector to be authorized',
          'Go to Dashboard → Settings → Connectors to verify Gmail is connected',
          'Once connected, all emails are sent from the authorized Gmail account',
          'Emails use a branded HTML template with your platform name',
          'Check Email Sequence Logs to monitor delivery status'
        ]
      }
    ]
  },
  {
    id: 'business-growth',
    title: 'Growing Your Business',
    icon: '💼',
    color: 'from-yellow-500 to-orange-500',
    bgLight: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    badge: 'Scale Up',
    badgeColor: 'bg-yellow-100 text-yellow-700',
    steps: [
      {
        step: 1,
        title: 'Set Up Gamification',
        icon: Award,
        desc: 'Increase client engagement and retention with points, badges, and challenges.',
        details: [
          'Go to Gamification Settings under Business Tools to enable the system',
          'Configure points for actions like meal logging, weight logging, MPESS',
          'Create badges for milestones (first week, 5kg lost, 30-day streak)',
          'Launch a Challenge via Challenge Manager for group motivation',
          'View the Leaderboard to celebrate top-performing clients'
        ]
      },
      {
        step: 2,
        title: 'Build Your Team',
        icon: Users,
        desc: 'Add nutritionists, assistants, or student coaches to your team.',
        details: [
          'Go to Team Management under Business Tools',
          'Invite team members with their email and assign a role',
          'Roles available: Team Member, Student Coach, Student Team Member',
          'Assign specific clients to different team members',
          'Control access permissions per role using User Permissions'
        ]
      },
      {
        step: 3,
        title: 'Use Marketing Hub',
        icon: Bell,
        desc: 'Promote your services and attract new clients through built-in tools.',
        details: [
          'Open Marketing Hub from the Business Tools section in the sidebar',
          'Generate AI-powered social media posts, email campaigns, and scripts',
          'Use Business GPTs for creating marketing content instantly',
          'Share your referral link via "Share My Link" to get new clients',
          'Use Broadcast Notification to send bulk updates to all clients'
        ]
      },
      {
        step: 4,
        title: 'Manage Resources & Content',
        icon: BookOpen,
        desc: 'Create and assign educational resources to enhance client education.',
        details: [
          'Go to Resource Library in the sidebar under Dietitian Tools',
          'Upload articles, videos, PDFs, or guides for clients',
          'Use AI to generate personalized resources for specific clients',
          'Assign resources to individual clients or client groups',
          'Track which resources clients have viewed and rated',
          'Use Template Library for ready-made meal plan and recipe templates'
        ]
      }
    ]
  }
];

const QUICK_TIPS = [
  { icon: '🔑', tip: 'Clients need TWO steps to log in: (1) Create their Client Profile, then (2) Invite them as a User from Dashboard → Data → User. The email must match exactly!' },
  { icon: '⚡', tip: 'Use the Quick Actions (⚡ Act) button on each client card to instantly assign meal plans, schedule calls, or send push notifications without opening the client profile.' },
  { icon: '📋', tip: 'Always fill out a client\'s full profile before generating a meal plan — AI uses their health data to personalize the plan.' },
  { icon: '🤖', tip: 'Use AI Coach Insights every Monday to get a weekly summary of all your clients\' progress and alerts.' },
  { icon: '📅', tip: 'Schedule appointments at least 48 hours in advance so clients receive reminders and can prepare.' },
  { icon: '💬', tip: 'Use Message Templates for recurring messages like weekly motivational notes — saves time and keeps you consistent.' },
  { icon: '🏷️', tip: 'Tag clients with goals (Diabetes, PCOS, Weight Loss) to quickly filter and manage them in analytics.' },
  { icon: '🍱', tip: 'Use Meal Plan Constraints to set global dietary rules per client — the AI will respect them when generating plans.' },
  { icon: '📊', tip: 'Review Client Analytics every Friday to catch clients with declining adherence before they drop off.' },
  { icon: '🏆', tip: 'Launch a new 7-day challenge each month to boost client engagement and platform activity.' },
  { icon: '📧', tip: 'Set up an Email Sequence for new clients so they automatically receive onboarding tips on Day 1, Day 3, and Day 7 without manual effort.' },
  { icon: '👥', tip: 'Assign team members to handle client messages so you can focus on high-value tasks like meal planning and calls.' },
  { icon: '📢', tip: 'Use Broadcast Notification to send motivational messages to all clients at once — great for Monday mornings.' },
  { icon: '💎', tip: 'Upsell clients from Basic to Advanced plans by showing them disease-specific meal plans in the Pro Plans section.' },
  { icon: '🔗', tip: 'Share your referral link via WhatsApp groups to attract new clients from your existing network.' },
];

const FAQS = [
  { q: 'How do I add a new client and give them login access?', a: 'Two steps are required. Step 1: Go to Clients → Add New Client, fill in their details. Step 2: Go to Dashboard → Data → User → Invite User. Enter the SAME email you used in the client profile and set user_type = "client". The client will receive an email invitation to set their password.' },
  { q: 'Why can\'t my client log in even though I added them?', a: 'Creating a Client Profile is NOT the same as giving login access. You must separately invite them as a user from Dashboard → Data → User with role "client". Make sure the email matches exactly (same spelling, no extra spaces).' },
  { q: 'How does AI meal plan generation work?', a: 'Go to Meal Plans, select a client, and click "Generate with AI". The AI uses the client\'s health profile, goal, food preferences, and any constraints you\'ve set to build a full day-wise meal plan instantly.' },
  { q: 'What are Quick Actions on client cards?', a: 'Each client card in the Clients page has an ⚡ Act button. Clicking it opens a Quick Actions panel with 4 tabs: Meal Plan (assign existing plans), MPESS (create wellness practices), Call (schedule appointments), and Notify (send push notifications or emails).' },
  { q: 'How do Email Sequences work?', a: 'Go to Email Sequences under Business Tools. Create a sequence with multiple emails, each with a specific delay (e.g., Day 1, Day 3, Day 7). When a new client is added or you trigger the sequence manually, emails are sent automatically on the configured schedule. Requires Gmail connector to be authorized.' },
  { q: 'Can I set dietary restrictions for AI-generated plans?', a: 'Yes. Go to Meal Plan Constraints under Business Tools and define excluded meals, ingredients, or special rules for each client. The AI will follow these rules when generating plans.' },
  { q: 'What is the difference between Basic and Advanced meal plan tiers?', a: 'Basic plans are calorie and RDA-based for general health goals. Advanced plans are designed for disease reversal (Diabetes, PCOS, Thyroid, etc.) with specific nutrient targets and disease rationale for each meal.' },
  { q: 'How do I review a client\'s progress?', a: 'Go to Clients Feedback and select the client. You can view their weight trend, meal adherence %, MPESS scores, and latest progress logs. You can also add coach feedback and star ratings.' },
  { q: 'How do I schedule a video call with a client?', a: 'You can do it from two places: (1) Appointments in the sidebar → New Appointment, or (2) Use the ⚡ Quick Actions on any client card → Call tab, which lets you schedule a check-in instantly.' },
  { q: 'How do I send a notification to all my clients at once?', a: 'Go to Broadcast Notification under Business Tools. Type your message, select your target (all clients or a specific group), and click Send. You can also schedule it for a later time.' },
  { q: 'How do I add team members?', a: 'Go to Team Management under Business Tools. Invite team members by email and assign them a role (Team Member, Student Coach, etc.). Use User Permissions to control what each role can access.' },
  { q: 'Where can I see my revenue and payments?', a: 'Go to Finance Manager under Business Tools to track all client payments, outstanding dues, and revenue summaries. Payment Gateway Settings lets you configure Razorpay for accepting online payments.' },
  { q: 'How does the gamification system work?', a: 'Enable gamification in Gamification Settings. Clients earn points for daily actions (logging meals, weight, MPESS). Badges are awarded at milestones. You can run group challenges via Challenge Manager.' },
  { q: 'What automated reminders are available?', a: 'You can set automated check-in reminders per client from the Communication page (Automated Check-in Scheduler). These can be for meal logging, water intake, workout, wellbeing, or custom messages. Additionally, Email Sequences send drip emails automatically when new clients join.' },
];

export default function HelpCenter() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState('steps');
  const [expandedStep, setExpandedStep] = useState(null);
  const [expandedFaq, setExpandedFaq] = useState(null);

  const filteredSteps = STEPS_GUIDE.filter(section =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.steps.some(s =>
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.desc.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const filteredFaqs = FAQS.filter(f =>
    f.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.a.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 pb-24 md:pb-6">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-r from-orange-600 via-amber-500 to-green-500 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-8 md:top-10 left-10 w-32 md:w-40 h-32 md:h-40 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-8 md:bottom-10 right-10 md:right-20 w-40 md:w-60 h-40 md:h-60 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 py-8 md:py-16 text-center">
          <div className="text-4xl md:text-5xl mb-3 md:mb-4">📚</div>
          <h1 className="text-2xl md:text-5xl font-black tracking-tight mb-2 md:mb-3">Help Center</h1>
          <p className="text-white/90 text-sm md:text-lg max-w-2xl mx-auto mb-6 md:mb-8">
            Step-by-step guides, tips, and answers to help you get the most out of Mealie Pro
          </p>

          {/* Search */}
           <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 md:w-5 h-4 md:h-5 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search guides, tips, FAQs..."
              className="pl-10 md:pl-12 pr-8 md:pr-10 py-2.5 md:py-3 text-xs md:text-sm bg-white text-gray-900 border-0 rounded-xl shadow-lg focus:ring-2 focus:ring-orange-300"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-2 md:px-4 flex gap-1 overflow-x-auto py-1.5 md:py-2" style={{ scrollbarWidth: 'none' }}>
           {[
             { id: 'steps', label: 'Step-by-Step Guide', icon: PlayCircle },
             { id: 'tips', label: 'Quick Tips', icon: Lightbulb },
             { id: 'faq', label: 'FAQs', icon: MessageSquare },
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveSection(tab.id)}
               className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1.5 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${
                 activeSection === tab.id
                   ? 'bg-orange-500 text-white shadow-md'
                   : 'text-gray-600 hover:bg-gray-100'
               }`}
             >
               <tab.icon className="w-3.5 md:w-4 h-3.5 md:h-4" />
               {tab.label}
             </button>
           ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-3 md:px-4 py-6 md:py-8 space-y-6 md:space-y-8">

         {/* Step-by-Step Guide */}
         {activeSection === 'steps' && (
           <div className="space-y-4 md:space-y-6">
             <div className="text-center">
               <h2 className="text-xl md:text-2xl font-black text-gray-900 mb-1 md:mb-2">Step-by-Step Guide</h2>
               <p className="text-xs md:text-sm text-gray-500">Follow these detailed steps to make the most of every feature</p>
             </div>

            {filteredSteps.map((section, sIdx) => (
              <div key={sIdx} className={`rounded-xl md:rounded-2xl border-2 ${section.borderColor} overflow-hidden shadow-md`}>
                {/* Section Header */}
                <div className={`bg-gradient-to-r ${section.color} text-white p-3 md:p-5`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                      <span className="text-2xl md:text-3xl flex-shrink-0">{section.icon}</span>
                      <div className="min-w-0">
                        <h3 className="text-base md:text-xl font-black truncate">{section.title}</h3>
                        <Badge className={`mt-0.5 md:mt-1 ${section.badgeColor} border-0 text-[10px] md:text-xs font-semibold`}>
                          {section.badge}
                        </Badge>
                      </div>
                    </div>
                    <span className="text-white/60 text-[10px] md:text-sm flex-shrink-0">{section.steps.length} steps</span>
                  </div>
                </div>

                {/* Steps */}
                <div className={`${section.bgLight} divide-y divide-gray-100`}>
                  {section.steps.map((step, stIdx) => {
                    const key = `${sIdx}-${stIdx}`;
                    const isOpen = expandedStep === key;
                    const Icon = step.icon;
                    return (
                      <div key={stIdx} className="bg-white">
                        <button
                          className="w-full flex items-center gap-2 md:gap-4 p-2.5 md:p-5 hover:bg-gray-50 transition-colors text-left"
                          onClick={() => setExpandedStep(isOpen ? null : key)}
                        >
                          <div className={`w-7 md:w-9 h-7 md:h-9 rounded-full bg-gradient-to-br ${section.color} text-white flex items-center justify-center text-[10px] md:text-sm font-black shrink-0`}>
                            {step.step}
                          </div>
                          <Icon className="w-4 md:w-5 h-4 md:h-5 text-gray-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 text-sm md:text-base">{step.title}</p>
                            <p className="text-xs md:text-sm text-gray-500 mt-0.5">{step.desc}</p>
                          </div>
                          <div className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
                            <ChevronRight className="w-4 md:w-5 h-4 md:h-5 text-gray-400" />
                          </div>
                        </button>

                        {isOpen && (
                          <div className={`px-3 md:px-5 pb-3 md:pb-5 ${section.bgLight} border-t border-gray-100`}>
                            <div className="pt-3 md:pt-4 space-y-2 md:space-y-2.5">
                              {step.details.map((detail, dIdx) => (
                                <div key={dIdx} className="flex items-start gap-2 md:gap-3">
                                  <div className={`w-5 md:w-6 h-5 md:h-6 rounded-full bg-gradient-to-br ${section.color} text-white flex items-center justify-center text-[10px] md:text-xs font-bold shrink-0 mt-0.5`}>
                                    {dIdx + 1}
                                  </div>
                                  <p className="text-xs md:text-sm text-gray-700 leading-relaxed">{detail}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {filteredSteps.length === 0 && (
              <div className="text-center py-16">
                <Search className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No guides found for "{searchTerm}"</p>
              </div>
            )}
          </div>
        )}

        {/* Quick Tips */}
        {activeSection === 'tips' && (
          <div className="space-y-4 md:space-y-6">
            <div className="text-center">
              <h2 className="text-xl md:text-2xl font-black text-gray-900 mb-1 md:mb-2">Quick Tips & Best Practices</h2>
              <p className="text-xs md:text-sm text-gray-500">Pro tips for health coaches to save time and get better client outcomes</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
              {QUICK_TIPS.filter(t =>
                !searchTerm || t.tip.toLowerCase().includes(searchTerm.toLowerCase())
              ).map((item, idx) => (
                <div key={idx} className="bg-white rounded-lg md:rounded-xl border border-gray-200 p-3 md:p-4 shadow-sm hover:shadow-md transition-all flex items-start gap-3 md:gap-4">
                  <span className="text-2xl md:text-3xl shrink-0">{item.icon}</span>
                  <p className="text-xs md:text-sm text-gray-700 leading-relaxed">{item.tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQs */}
        {activeSection === 'faq' && (
          <div className="space-y-4 md:space-y-6">
            <div className="text-center">
              <h2 className="text-xl md:text-2xl font-black text-gray-900 mb-1 md:mb-2">Frequently Asked Questions</h2>
              <p className="text-xs md:text-sm text-gray-500">Common questions from health coaches on using the platform</p>
            </div>
            <div className="space-y-2 md:space-y-3">
              {filteredFaqs.map((faq, idx) => (
                <div key={idx} className="bg-white rounded-lg md:rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between gap-2 md:gap-4 p-3 md:p-5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                      <div className="w-7 md:w-8 h-7 md:h-8 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-orange-600 font-bold text-[10px] md:text-sm">Q</span>
                      </div>
                      <p className="font-semibold text-gray-900 text-xs md:text-base">{faq.q}</p>
                    </div>
                    <ChevronRight className={`w-4 md:w-5 h-4 md:h-5 text-gray-400 shrink-0 transition-transform duration-200 ${expandedFaq === idx ? 'rotate-90' : ''}`} />
                  </button>
                  {expandedFaq === idx && (
                    <div className="px-3 md:px-5 pb-3 md:pb-4 bg-orange-50 border-t border-orange-100">
                      <div className="flex items-start gap-2 md:gap-3 pt-2 md:pt-3">
                        <div className="w-7 md:w-8 h-7 md:h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-green-600 font-bold text-[10px] md:text-sm">A</span>
                        </div>
                        <p className="text-xs md:text-sm text-gray-700 leading-relaxed">{faq.a}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {filteredFaqs.length === 0 && (
                <div className="text-center py-12">
                  <Search className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No FAQs found for "{searchTerm}"</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Support Card */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 text-white text-center shadow-lg">
          <div className="text-4xl mb-3">🙋</div>
          <h3 className="text-xl font-black mb-2">Need more support?</h3>
          <p className="text-white/90 text-sm mb-4">Use the AI Coach Insights feature for smart client analysis, or reach out to your platform admin for technical help.</p>
          <a
            href="/aicoachinsights"
            className="inline-flex items-center gap-2 bg-white text-orange-600 font-bold px-6 py-3 rounded-xl hover:bg-orange-50 transition-colors text-sm"
          >
            <Sparkles className="w-4 h-4" />
            Open AI Coach Insights
          </a>
        </div>

      </div>
    </div>
  );
}