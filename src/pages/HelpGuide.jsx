import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Home, Users, Calendar, ChefHat, TrendingUp, MessageSquare, Heart, BookOpen,
  Sparkles, BarChart3, ClipboardList, FileText, Settings, Bell, Trophy, Gift,
  Share2, CreditCard, Shield, Search, CheckCircle2, ArrowRight, Zap, Loader2
} from 'lucide-react';

const dashboardSections = [
  {
    id: 'welcome',
    title: '👋 Welcome Section',
    icon: Home,
    color: 'from-blue-500 to-cyan-600',
    description: 'Your personalized greeting and quick overview',
    features: [
      'Displays your name and role in the platform',
      'Shows current date and time',
      'Quick motivational message for the day'
    ],
    benefits: [
      'Quick orientation when you log in',
      'Personal touch to the platform',
      'Immediate visibility of your status'
    ],
    usage: 'This appears at the top of your dashboard when you log in. Scroll past it to access your main dashboard content.'
  },
  {
    id: 'gamification',
    title: '🏆 Gamification Section (Points, Badges, Streaks)',
    icon: Trophy,
    color: 'from-yellow-500 to-orange-600',
    description: 'Motivation and engagement tracking system',
    features: [
      'Points Tracker: Earn points for logging meals, weight, and progress',
      'Streak Tracker: Track consecutive days of logging activity',
      'Badge System: Unlock badges for achievements and milestones',
      'Leaderboard: Compare progress with other clients (if enabled)'
    ],
    benefits: [
      'Stay motivated with visible progress',
      'Get rewarded for consistent actions',
      'Feel accomplished with badge unlocks',
      'Friendly competition for extra motivation'
    ],
    usage: 'Track your daily logging streak by submitting progress logs. Each log adds points. Complete challenges to unlock badges. Points accumulate and can lead to special rewards.'
  },
  {
    id: 'stats',
    title: '📊 Statistics Cards',
    icon: BarChart3,
    color: 'from-purple-500 to-pink-600',
    description: 'Your key health metrics at a glance',
    features: [
      'Current Weight: Your latest recorded weight',
      'Goal Progress: How close you are to your target',
      'Daily Macros: Protein, carbs, fats consumed today',
      'Meal Adherence: % of meal plan followed today',
      'Wellness Score: Overall health metric (1-10)'
    ],
    benefits: [
      'Instant overview of your progress',
      'Track daily nutrition goals',
      'Monitor adherence to meal plans',
      'See cumulative progress over time'
    ],
    usage: 'These cards update as you log food and progress. Check daily to stay aware of your nutrition and health goals.'
  },
  {
    id: 'wellness',
    title: '❤️ Wellness Trends (Energy, Sleep, Mood, Stress)',
    icon: Heart,
    color: 'from-red-500 to-pink-600',
    description: 'Track your holistic health beyond nutrition',
    features: [
      'Energy Levels: 1-10 scale tracking your daily energy',
      'Sleep Quality: Quality and hours slept each night',
      'Mood: Your emotional state (very poor to excellent)',
      'Stress Level: Daily stress rating (1-10)',
      'Trend Charts: See 7-day and 30-day trends'
    ],
    benefits: [
      'Understand correlation between diet, sleep, and mood',
      'Identify patterns in your wellness',
      'Provide context for your coach on your mental state',
      'Track overall quality of life improvements'
    ],
    usage: 'Log these metrics daily in your progress entry. Over time, you\'ll see trends that your coach can use to refine your nutrition plan.'
  },
  {
    id: 'mealplan',
    title: '🍽️ Active Meal Plan',
    icon: ChefHat,
    color: 'from-green-500 to-emerald-600',
    description: 'Your personalized nutrition roadmap',
    features: [
      'Daily meal structure with breakfast, lunch, dinner, snacks',
      'Specific food items and portion sizes',
      'Nutritional breakdown (calories, macros)',
      'Disease-specific insights (if applicable)',
      'Download and print options',
      'Feedback submission to coach'
    ],
    benefits: [
      'Structured guidance on what to eat',
      'Clear portion sizes to follow',
      'Nutrition targets aligned with your goals',
      'Easy-to-follow format'
    ],
    usage: 'Click "View Full Plan" to see your current week\'s meals. Download a printable version to keep in your kitchen. Submit feedback if you need adjustments.'
  },
  {
    id: 'progresslog',
    title: '📝 Daily Progress Logger',
    icon: ClipboardList,
    color: 'from-indigo-500 to-blue-600',
    description: 'Quick daily check-in and logging',
    features: [
      'One-click weight logging',
      'Wellness metrics (mood, energy, sleep, stress)',
      'Body measurements tracking',
      'Photo uploads for progress',
      'Notes section for observations',
      'Quick submit for daily tracking'
    ],
    benefits: [
      'Takes 2-3 minutes to complete daily',
      'Provides coach with daily insight',
      'Tracks patterns over time',
      'Visual progress with photos'
    ],
    usage: 'Submit daily, even if just one metric (like weight). More data helps your coach give better guidance. The more consistent you are, the better the insights.'
  },
  {
    id: 'macros',
    title: '🥗 Macro Adherence Dashboard',
    icon: Zap,
    color: 'from-cyan-500 to-blue-600',
    description: 'Your daily nutrition targets tracker',
    features: [
      'Daily Protein, Carbs, Fats targets',
      'Visual progress bars for each macro',
      'Percentage of target consumed',
      'Calorie total vs. target',
      'Trending performance over past week'
    ],
    benefits: [
      'See if you\'re meeting your nutrition targets',
      'Understand which macros need adjustment',
      'Track progress toward health goals',
      'Quick visual feedback'
    ],
    usage: 'Log your food in the Food Log to see real-time updates here. Aim to stay within 10% of your targets daily.'
  },
  {
    id: 'goals',
    title: '🎯 Active Goals',
    icon: Sparkles,
    color: 'from-orange-500 to-red-600',
    description: 'Your health and fitness objectives',
    features: [
      'Primary goal (e.g., weight loss, muscle gain)',
      'Target metrics and timelines',
      'Progress bars toward each goal',
      'Coach-set milestones',
      'Goal status (on track, needs attention)'
    ],
    benefits: [
      'Clear focus on what you\'re working toward',
      'Understand your health roadmap',
      'See progress over time',
      'Stay motivated with visible targets'
    ],
    usage: 'Review your goals weekly. Discuss with coach if you want to adjust targets. Focus on the top 2-3 goals at a time.'
  },
  {
    id: 'messages',
    title: '💬 Messages',
    icon: MessageSquare,
    color: 'from-green-500 to-teal-600',
    description: 'Direct communication with your coach',
    features: [
      '1-to-1 messaging with your assigned coach',
      'File and photo sharing capabilities',
      'Real-time notifications',
      'Message history and search',
      'Read receipts to see if coach saw your message'
    ],
    benefits: [
      'Quick access to coach for questions',
      'Share food photos, logs, or concerns',
      'Get timely feedback and guidance',
      'Build personal relationship with coach'
    ],
    usage: 'Click "Messages" in the sidebar. Type your question or share a photo. Coach usually responds within 24 hours.'
  },
  {
    id: 'foodlog',
    title: '🍴 Food Log',
    icon: Search,
    color: 'from-amber-500 to-orange-600',
    description: 'Track everything you eat and drink',
    features: [
      'Log meals (breakfast, lunch, dinner, snacks)',
      'Search food database with 100K+ foods',
      'Barcode scanning for packaged foods',
      'Portion size customization',
      'Meal photos for visual tracking',
      'Nutritional breakdown per meal'
    ],
    benefits: [
      'Awareness of what you eat',
      'Automatic calorie and macro calculation',
      'Identify eating patterns',
      'Build accountability'
    ],
    usage: 'Log immediately after eating for accuracy. Use the search to find foods. Adjust portion sizes to match what you ate. Your coach can review and provide feedback.'
  },
  {
    id: 'progress',
    title: '📈 My Progress',
    icon: TrendingUp,
    color: 'from-blue-500 to-indigo-600',
    description: 'Visual charts and detailed progress tracking',
    features: [
      'Weight trend chart (daily, weekly, monthly)',
      'Body measurement tracking over time',
      'Progress photo gallery',
      'Wellness metric trends (mood, sleep, stress)',
      'Adherence metrics',
      'Comparison to your baseline'
    ],
    benefits: [
      'See the bigger picture beyond daily fluctuations',
      'Understand your progress trajectory',
      'Stay motivated with visual improvements',
      'Identify seasonal or cyclical patterns'
    ],
    usage: 'Review weekly to see trends. Don\'t worry about daily changes. Share charts with coach during consultations.'
  },
  {
    id: 'mpess',
    title: '❤️ MPESS Wellness',
    icon: Heart,
    color: 'from-rose-500 to-pink-600',
    description: 'Holistic health assessment (Mind, Physical, Emotional, Social, Spiritual)',
    features: [
      'Mind: Mental clarity, focus, cognitive health',
      'Physical: Energy, strength, fitness',
      'Emotional: Mood, emotional stability, happiness',
      'Social: Relationships, community, connections',
      'Spiritual: Purpose, values, inner peace'
    ],
    benefits: [
      'Address health beyond just weight',
      'Understand root causes of eating behaviors',
      'Holistic approach to wellness',
      'Improve overall life quality'
    ],
    usage: 'Complete MPESS assessment at start, mid-point, and end of your program. Share results with coach for deeper insights.'
  },
  {
    id: 'recipes',
    title: '🥘 Recipe Library',
    icon: ChefHat,
    color: 'from-red-500 to-pink-600',
    description: 'Hundreds of healthy recipes tailored to you',
    features: [
      'Filter by meal type, cuisine, diet (veg/non-veg)',
      'Search by ingredient',
      'Step-by-step cooking instructions',
      'Full nutritional information',
      'Dietary tags (gluten-free, keto, etc.)',
      'Save favorite recipes',
      'Add to shopping list'
    ],
    benefits: [
      'Find recipes matching your diet preferences',
      'Learn to cook nutritious meals',
      'Meal prep inspiration',
      'Consistency in following meal plan'
    ],
    usage: 'Search recipes by cuisine or ingredient. Save favorites. Use for meal ideas when meal plan allows substitutions.'
  },
  {
    id: 'assessments',
    title: '📋 My Assessments',
    icon: ClipboardList,
    color: 'from-violet-500 to-purple-600',
    description: 'Custom health questionnaires and evaluations',
    features: [
      'Initial health assessment with your coach',
      'Periodic progress assessments',
      'Symptom and condition tracking',
      'Custom questions from your coach',
      'Assessment history and trends'
    ],
    benefits: [
      'Provide detailed health information to coach',
      'Track symptom improvements',
      'Measure program effectiveness',
      'Personalize your nutrition further'
    ],
    usage: 'Complete assessments when your coach assigns them. Be thorough and honest for best results.'
  },
  {
    id: 'appointments',
    title: '📅 My Appointments',
    icon: Calendar,
    color: 'from-indigo-500 to-purple-600',
    description: 'Schedule and track consultations with your coach',
    features: [
      'View upcoming appointments',
      'Appointment reminders',
      'Video call links for virtual sessions',
      'Add notes for your coach before appointment',
      'View past appointment notes'
    ],
    benefits: [
      'Never miss a session',
      'Prepare in advance for appointments',
      'Document progress and questions',
      'Build structured relationship with coach'
    ],
    usage: 'Check your appointments section weekly. Note down questions before your session. Join video calls 2-3 minutes early.'
  },
  {
    id: 'resources',
    title: '📚 My Resources',
    icon: BookOpen,
    color: 'from-cyan-500 to-blue-600',
    description: 'Educational materials assigned by your coach',
    features: [
      'PDFs, articles, videos, infographics',
      'Condition-specific educational content',
      'Track completion status',
      'Rate and review resources',
      'Download for offline access',
      'Coach feedback on your learning'
    ],
    benefits: [
      'Learn about your health condition',
      'Understand nutrition science',
      'Improve long-term health literacy',
      'Personalized education from coach'
    ],
    usage: 'Open resources your coach assigns. Mark as completed when done. Provide feedback on what you learned.'
  },
  {
    id: 'achievements',
    title: '🏅 My Achievements',
    icon: CheckCircle2,
    color: 'from-amber-500 to-yellow-600',
    description: 'Celebrate milestones and accomplishments',
    features: [
      'Weight loss milestones',
      'Consistency streaks',
      'Behavior change achievements',
      'Badge unlocks',
      'Coach recognition and praise',
      'Shareable achievement certificates'
    ],
    benefits: [
      'Celebrate progress and wins',
      'Stay motivated for long-term success',
      'Recognize hard work and dedication',
      'Build confidence'
    ],
    usage: 'Review achievements section when you need motivation. Share wins with coach and support system.'
  },
  {
    id: 'profile',
    title: '👤 My Profile',
    icon: Settings,
    color: 'from-gray-500 to-slate-600',
    description: 'Your personal health information and settings',
    features: [
      'Personal details (age, weight, height)',
      'Health goals and targets',
      'Dietary preferences (veg, non-veg, regional)',
      'Health conditions and allergies',
      'Family medical history',
      'Notification preferences',
      'Privacy settings'
    ],
    benefits: [
      'Personalize your experience',
      'Help coach understand your background',
      'Manage communication preferences',
      'Control your privacy'
    ],
    usage: 'Set up your profile completely during onboarding. Update as health status changes. Adjust notifications based on preference.'
  }
];

const coachDashboardSections = [
  {
    id: 'coach-dashboard',
    title: '📊 Coach Dashboard',
    icon: BarChart3,
    color: 'from-orange-500 to-red-600',
    description: 'Overview of all your clients and their progress',
    features: [
      'Client list with status overview',
      'Quick alerts for clients needing attention',
      'Recent activity feed',
      'This week\'s client appointments',
      'Unread messages counter',
      'Quick action buttons'
    ],
    benefits: [
      'Stay organized with multiple clients',
      'Prioritize based on urgent needs',
      'Never miss important client updates',
      'Quick access to most important information'
    ],
    usage: 'Check your dashboard first thing each day. Address red flags immediately. Respond to messages within 24 hours.'
  },
  {
    id: 'client-management',
    title: '👥 Client Management',
    icon: Users,
    color: 'from-blue-500 to-cyan-600',
    description: 'Add, organize, and manage all client information',
    features: [
      'Add new clients to your practice',
      'View complete client health history',
      'Edit client profile and health data',
      'Assign meal plans and resources',
      'Tag and filter clients by status/goal',
      'Bulk actions for multiple clients'
    ],
    benefits: [
      'Centralized client database',
      'Quick access to all health information',
      'Organized client management',
      'Efficient workflow'
    ],
    usage: 'Spend 10 minutes per new client setting up their profile completely. Update regularly as their health evolves.'
  },
  {
    id: 'meal-plans',
    title: '🍽️ Meal Plans',
    icon: ChefHat,
    color: 'from-green-500 to-emerald-600',
    description: 'Create and assign personalized meal plans',
    features: [
      'AI-powered meal plan generator',
      'Manual meal plan builder',
      'Disease-specific plans (pro feature)',
      'MPESS integration for holistic health',
      'Nutritional audit and balance',
      'Recipe search and selection',
      'Assign to multiple clients at once'
    ],
    benefits: [
      'Save time with AI generation',
      'Ensure balanced nutrition',
      'Personalized to each client\'s needs',
      'Address specific health conditions',
      'Incorporate lifestyle practices'
    ],
    usage: 'Create a basic plan in 5 minutes with AI. Review and adjust if needed. Share with client immediately. Update every 2-4 weeks.'
  },
  {
    id: 'progress-review',
    title: '📈 Progress Review',
    icon: TrendingUp,
    color: 'from-purple-500 to-pink-600',
    description: 'Review and analyze client progress logs',
    features: [
      'View all client submitted logs',
      'Charts and trends over time',
      'Filter by date range',
      'Add coach feedback and ratings',
      'Identify at-risk clients',
      'Compare to baseline and goals',
      'Export reports for presentations'
    ],
    benefits: [
      'Track client progress systematically',
      'Catch early warning signs',
      'Data-driven decision making',
      'Provide evidence-based feedback',
      'Share progress with clients'
    ],
    usage: 'Review logs 2-3 times weekly. Add constructive feedback. Flag concerning trends for follow-up. Use data in consultations.'
  },
  {
    id: 'ai-coach-insights',
    title: '✨ AI Coach Insights',
    icon: Sparkles,
    color: 'from-yellow-500 to-orange-600',
    description: 'AI-powered analysis and personalized recommendations',
    features: [
      'Progress Reports: Weekly/monthly summaries',
      'Risk Assessment: Auto-detection of health risks',
      'Chat: Ask questions about client data',
      'Educational Materials: AI-suggested content',
      'Proactive Scan: Auto-detect issues and suggest check-ins'
    ],
    benefits: [
      'Save time with AI analysis',
      'Catch health risks early',
      'Provide evidence-based guidance',
      'Personalize client education',
      'Proactive vs. reactive coaching'
    ],
    usage: 'Run Progress Report weekly for key clients. Use Risk Assessment monthly. Chat when you need quick answers about client data.'
  },
  {
    id: 'messages',
    title: '💬 Messages',
    icon: MessageSquare,
    color: 'from-teal-500 to-green-600',
    description: '1-to-1 communication with each client',
    features: [
      'Direct messaging with clients',
      'File and photo sharing',
      'Scheduled messages for later',
      'Message templates for common responses',
      'Notification management',
      'Message history and search'
    ],
    benefits: [
      'Quick and efficient communication',
      'Build personal relationships',
      'Share resources and guidance',
      'Save time with templates'
    ],
    usage: 'Respond within 24 hours. Use templates for common questions. Share resources and progress reports via messages.'
  },
  {
    id: 'appointments',
    title: '📅 Appointments',
    icon: Calendar,
    color: 'from-indigo-500 to-blue-600',
    description: 'Schedule and manage client consultations',
    features: [
      'Calendar view of all appointments',
      'Google Calendar sync',
      'Automated reminders to clients',
      'Video call links',
      'Client notes before appointment',
      'Appointment history'
    ],
    benefits: [
      'Organized scheduling',
      'Reduce no-shows with reminders',
      'Track client meeting history',
      'Prepare for appointments with notes',
      'Professional video calls'
    ],
    usage: 'Schedule recurring appointments. Enable auto-reminders. Review client notes 10 minutes before call.'
  },
  {
    id: 'resources',
    title: '📚 Resource Library',
    icon: BookOpen,
    color: 'from-blue-500 to-cyan-600',
    description: 'Manage and assign educational materials',
    features: [
      'Upload PDFs, videos, articles',
      'Tag by condition and goal',
      'AI-powered resource recommendations',
      'Track client completion and feedback',
      'Usage analytics',
      'Make public or private to clients'
    ],
    benefits: [
      'Educate clients on their conditions',
      'Build your knowledge library over time',
      'Improve client outcomes with education',
      'Track engagement with resources'
    ],
    usage: 'Upload 2-3 resources monthly. Assign based on client\'s condition and goals. Review completion rates.'
  },
  {
    id: 'recipes',
    title: '🥘 Recipes',
    icon: ChefHat,
    color: 'from-red-500 to-pink-600',
    description: 'Manage recipe database',
    features: [
      'Upload custom recipes with nutritional info',
      'Filter by cuisine, diet, meal type',
      'Tag by health condition benefit',
      'Rate and review recipes',
      'Track usage in meal plans'
    ],
    benefits: [
      'Build your own recipe collection',
      'Reuse favorite recipes across clients',
      'Condition-specific recipe suggestions',
      'Track what works best'
    ],
    usage: 'Add 5-10 go-to recipes you recommend often. Tag them appropriately. Update nutritional info annually.'
  },
  {
    id: 'mpess-tracker',
    title: '❤️ MPESS Tracker',
    icon: Heart,
    color: 'from-rose-500 to-pink-600',
    description: 'Track holistic wellness (Mind, Physical, Emotional, Social, Spiritual)',
    features: [
      'Client MPESS submissions',
      'Your review and notes',
      'Trend analysis over time',
      'Action items based on assessments',
      'Holistic coaching framework'
    ],
    benefits: [
      'Understand whole-person health',
      'Address root causes of eating behaviors',
      'Improve long-term outcomes',
      'Stand out with holistic approach'
    ],
    usage: 'Review MPESS submissions when clients submit. Add your observations. Use for designing interventions.'
  },
  {
    id: 'gamification',
    title: '🏆 Gamification Settings',
    icon: Trophy,
    color: 'from-yellow-500 to-orange-600',
    description: 'Motivate clients with points, badges, and challenges',
    features: [
      'Create custom challenges for clients',
      'Set up auto-award rules',
      'Award bonus points for achievements',
      'View leaderboard and engagement metrics',
      'Customize point values and rewards'
    ],
    benefits: [
      'Increase client motivation',
      'Improve adherence and consistency',
      'Make coaching fun and engaging',
      'Track engagement metrics'
    ],
    usage: 'Create weekly challenges (e.g., "Log 7 days straight"). Award bonus points for milestones. Monitor leaderboard weekly.'
  },
  {
    id: 'assessments',
    title: '📋 Client Assessments',
    icon: ClipboardList,
    color: 'from-violet-500 to-purple-600',
    description: 'Create custom health questionnaires',
    features: [
      'Design custom assessment templates',
      'Assign to clients',
      'Auto-analysis of responses',
      'Track changes over time',
      'Clinical intake forms'
    ],
    benefits: [
      'Gather detailed health information',
      'Standardize health intake',
      'Track progress with repeat assessments',
      'Build clinical documentation'
    ],
    usage: 'Create initial intake assessment. Use mid-point assessment at 4-6 weeks. Final assessment at program end.'
  },
  {
    id: 'team',
    title: '👥 Team Management',
    icon: Users,
    color: 'from-emerald-500 to-teal-600',
    description: 'Manage team members if you have a practice',
    features: [
      'Invite team members',
      'Assign permissions and roles',
      'Delegate client management',
      'Track team performance',
      'Team communication hub'
    ],
    benefits: [
      'Scale your practice',
      'Delegate responsibilities',
      'Maintain quality across team',
      'Efficient team workflows'
    ],
    usage: 'Add team members if you have a practice. Assign clients and permissions. Regular team syncs for alignment.'
  },
  {
    id: 'analytics',
    title: '📊 Analytics & Reports',
    icon: BarChart3,
    color: 'from-cyan-500 to-blue-600',
    description: 'Comprehensive practice analytics',
    features: [
      'Client outcome metrics',
      'Engagement tracking',
      'Adherence rates',
      'Success stories and case studies',
      'Practice growth metrics'
    ],
    benefits: [
      'Measure coaching effectiveness',
      'Identify successful interventions',
      'Track practice growth',
      'Share results with clients'
    ],
    usage: 'Review monthly. Export reports for client presentations. Use to refine your coaching approach.'
  }
];

export default function HelpGuide() {
  const [expandedSection, setExpandedSection] = useState(null);

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const userType = user?.user_type === 'client' ? 'client' : 'coach';
  const sections = userType === 'client' ? dashboardSections : coachDashboardSections;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📖 Mealie Dashboard Help Guide</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Learn about every section of your personalized health coaching dashboard. This guide explains features, benefits, and how to use each tool effectively.
          </p>
        </div>

        {/* User Type Selector */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => { setUserType('client'); setExpandedSection(null); }}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              userType === 'client'
                ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
                : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-orange-300'
            }`}
          >
            👤 Client Dashboard
          </button>
          <button
            onClick={() => { setUserType('coach'); setExpandedSection(null); }}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              userType === 'coach'
                ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
                : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-orange-300'
            }`}
          >
            🏥 Coach Dashboard
          </button>
        </div>

        {/* Guide Sections */}
        <div className="space-y-3">
          {sections.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedSection === section.id;

            return (
              <Card
                key={section.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isExpanded ? 'ring-2 ring-orange-400' : ''
                }`}
                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${section.color}`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{section.title}</CardTitle>
                        <CardDescription className="text-sm mt-1">{section.description}</CardDescription>
                      </div>
                    </div>
                    <ArrowRight
                      className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 border-t">
                    <div className="space-y-4 mt-4">
                      {/* Features */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-yellow-600" />
                          Key Features
                        </h4>
                        <ul className="space-y-1">
                          {section.features.map((feature, i) => (
                            <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="text-orange-500 mt-1">•</span>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Benefits */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          Benefits
                        </h4>
                        <ul className="space-y-1">
                          {section.benefits.map((benefit, i) => (
                            <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="text-green-500 mt-1">✓</span>
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Usage Tips */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <h4 className="font-semibold text-blue-900 mb-1 text-sm">💡 How to Use</h4>
                        <p className="text-sm text-blue-800">{section.usage}</p>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Tips Footer */}
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-600" />
              Getting Started Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span className="font-bold text-orange-600">1.</span>
                <span>Complete your profile/client setup immediately - this personalizes your experience</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-orange-600">2.</span>
                <span>Check your dashboard daily - consistency is key to success</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-orange-600">3.</span>
                <span>Log meals and progress immediately after eating - accuracy matters</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-orange-600">4.</span>
                <span>Review trends weekly - focus on the bigger picture, not daily changes</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-orange-600">5.</span>
                <span>Communicate with coach - ask questions and share challenges early</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}