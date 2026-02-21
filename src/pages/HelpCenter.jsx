import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search, ChevronDown, Home, Users, MessageSquare, Calendar, ChefHat,
  FileText, BarChart3, Settings, Heart, TrendingUp, BookOpen, Award, Lock,
  Zap, Eye, X
} from 'lucide-react';
import { Input } from '@/components/ui/input';

const guideData = [
  {
    section: 'Dashboard Overview',
    icon: Home,
    color: 'from-blue-500 to-blue-600',
    description: 'Your central hub for viewing all important metrics and updates',
    guides: [
      {
        title: 'Dashboard Home',
        content: 'View key statistics, recent activity, and quick action cards. See your progress at a glance with charts showing weight trends, wellness metrics, and adherence to meal plans.'
      },
      {
        title: 'Action Items & Alerts',
        content: 'Get notified about pending tasks, overdue resources, upcoming appointments, and important health metrics that need attention.'
      },
      {
        title: 'Quick Stats Cards',
        content: 'Monitor your current weight, BMI, daily progress percentage, streak achievements, and upcoming milestones in one place.'
      }
    ]
  },
  {
    section: 'Client Management',
    icon: Users,
    color: 'from-green-500 to-green-600',
    description: 'Manage all your clients and their health journeys',
    guides: [
      {
        title: 'Client List',
        content: 'View all your clients with filters for status (active/inactive), plan tier (basic/advanced), and goals. See quick stats like weight change and plan status.'
      },
      {
        title: 'Client Profiles',
        content: 'Access detailed client information including health metrics, dietary preferences, lifestyle data, family history, goals, and compliance notes.'
      },
      {
        title: 'Bulk Client Import',
        content: 'Upload multiple clients at once using CSV file. Perfect for onboarding many clients quickly with their basic information.'
      },
      {
        title: 'Client Access Control',
        content: 'Control what features each client can see in their portal - from meal plans to food logs, resources, and assessments.'
      }
    ]
  },
  {
    section: 'Meal Planning & Nutrition',
    icon: ChefHat,
    color: 'from-orange-500 to-orange-600',
    description: 'Create and manage personalized meal plans',
    guides: [
      {
        title: 'Meal Planner',
        content: 'Create customized meal plans with AI assistance. Choose meal patterns (daily or 3-3-4), set calorie targets, and consider disease-specific requirements.'
      },
      {
        title: 'AI Meal Plan Generation',
        content: 'Use AI to auto-generate meal plans based on client goals, health conditions, dietary preferences, and MPESS lifestyle integration.'
      },
      {
        title: 'Recipe Library',
        content: 'Browse and search recipes with complete nutritional information. Filter by meal type, cuisine, dietary tags (vegan, gluten-free, etc.), and difficulty level.'
      },
      {
        title: 'Food Lookup Tool',
        content: 'Use AI to search and analyze food items. Get instant nutritional data and track macros for meal planning and food logging.'
      },
      {
        title: 'Pro Plans 💎',
        content: 'Access disease-reversal focused meal plans for conditions like diabetes, hypertension, and PCOS with specialized macro ratios and meal strategies.'
      }
    ]
  },
  {
    section: 'Progress Tracking',
    icon: TrendingUp,
    color: 'from-purple-500 to-purple-600',
    description: 'Monitor client progress and health improvements',
    guides: [
      {
        title: 'Progress Logs',
        content: 'Clients submit daily weight, measurements, wellness metrics (mood, energy, sleep), and symptoms. You can review, provide feedback, and rate progress.'
      },
      {
        title: 'Wellness Metrics',
        content: 'Track energy levels, sleep quality, stress, digestion, hunger patterns, menstrual cycles, and custom health markers defined by coaches.'
      },
      {
        title: 'Analytics & Reports',
        content: 'View detailed progress analytics including weight trends, macro adherence, wellness trends, compliance charts, and health metric improvements.'
      },
      {
        title: 'Client Progress Review',
        content: 'Review all client progress logs with filtering options. Identify patterns, track compliance, and provide personalized coaching feedback.'
      }
    ]
  },
  {
    section: 'Communication',
    icon: MessageSquare,
    color: 'from-pink-500 to-pink-600',
    description: 'Communicate with clients and teams',
    guides: [
      {
        title: 'Messages',
        content: 'Send 1-on-1 messages to clients or group messages to multiple clients. Share files, images, and receive read receipts for important messages.'
      },
      {
        title: 'Broadcast Notifications',
        content: 'Send announcements to all clients with custom messages about new resources, challenges, or important updates.'
      },
      {
        title: 'Scheduled Messages',
        content: 'Plan messages to be sent at specific times. Perfect for reminders, motivation messages, and time-zone appropriate notifications.'
      },
      {
        title: 'Message Polls',
        content: 'Create interactive polls in group chats to gather client feedback or make decisions collectively.'
      }
    ]
  },
  {
    section: 'Appointments & Scheduling',
    icon: Calendar,
    color: 'from-red-500 to-red-600',
    description: 'Manage consultations and follow-ups',
    guides: [
      {
        title: 'Appointments Calendar',
        content: 'View all scheduled appointments in a calendar view. Schedule new consultations, follow-ups, or assessments with clients.'
      },
      {
        title: 'Google Calendar Sync',
        content: 'Sync appointments with Google Calendar for seamless scheduling. Automatically create and update events with client details and video links.'
      },
      {
        title: 'Appointment Reminders',
        content: 'Automatic reminders are sent to clients before appointments. Set custom reminder times and notification preferences.'
      },
      {
        title: 'Recurring Appointments',
        content: 'Set up weekly, bi-weekly, or monthly recurring appointments for regular client check-ins and consultations.'
      }
    ]
  },
  {
    section: 'Resources & Education',
    icon: BookOpen,
    color: 'from-cyan-500 to-cyan-600',
    description: 'Provide learning materials to clients',
    guides: [
      {
        title: 'Resource Library',
        content: 'Upload PDFs, videos, articles, guides, and worksheets. Organize by category (nutrition, fitness, mental health, etc.) and difficulty level.'
      },
      {
        title: 'AI Resource Suggestions',
        content: 'Get AI-powered suggestions for which resources are most relevant to each client based on their goals, health conditions, and progress.'
      },
      {
        title: 'Resource Assignments',
        content: 'Assign resources to clients with due dates and assignment notes. Track which clients viewed and completed resources.'
      },
      {
        title: 'Resource Tracking',
        content: 'Monitor client interaction with resources - viewing, reading time, completion rates, and client feedback/ratings.'
      }
    ]
  },
  {
    section: 'Assessments & Goals',
    icon: FileText,
    color: 'from-indigo-500 to-indigo-600',
    description: 'Create and manage client assessments',
    guides: [
      {
        title: 'Assessment Templates',
        content: 'Create custom assessment forms with multiple question types. Use for health intake, progress reviews, or specific condition evaluations.'
      },
      {
        title: 'MPESS Assessment',
        content: 'Use the Mind-Physical-Emotional-Social-Spiritual framework for holistic wellness assessment. Track all dimensions of client wellbeing.'
      },
      {
        title: 'Client Goals',
        content: 'Set SMART goals with milestones for clients. Track progress toward weight loss, fitness, health metrics, and behavioral goals.'
      },
      {
        title: 'Goal Tracking',
        content: 'Monitor goal progress with visual charts. Celebrate milestone completions and adjust strategies based on performance.'
      }
    ]
  },
  {
    section: 'Gamification & Motivation',
    icon: Award,
    color: 'from-yellow-500 to-yellow-600',
    description: 'Motivate clients through games and rewards',
    guides: [
      {
        title: 'Points System',
        content: 'Clients earn points for completing activities like logging meals, submitting progress, completing resources, and meeting goals.'
      },
      {
        title: 'Badges & Achievements',
        content: 'Award badges for milestones (First 100 logs, 30-day streak, Weight goal reached). Create custom badges for your coaching programs.'
      },
      {
        title: 'Leaderboard',
        content: 'View client leaderboards showing top performers by points. Creates friendly competition and motivation.'
      },
      {
        title: 'Challenges',
        content: 'Create time-based challenges (7-day water intake challenge, 30-day meal plan adherence). Set rewards and track participation.'
      },
      {
        title: 'Bonus Awards',
        content: 'Manually award points or badges to clients for special achievements or as motivation for consistent effort.'
      }
    ]
  },
  {
    section: 'Analytics & Reports',
    icon: BarChart3,
    color: 'from-teal-500 to-teal-600',
    description: 'View detailed analytics and insights',
    guides: [
      {
        title: 'Client Analytics Dashboard',
        content: 'See aggregate statistics across all clients - average weight loss, program adherence, resource completion rates, and engagement metrics.'
      },
      {
        title: 'Individual Client Reports',
        content: 'Generate detailed progress reports for individual clients showing weight trends, macro adherence, wellness improvements, and goal progress.'
      },
      {
        title: 'Segmentation & Analytics',
        content: 'Analyze clients by segments (age, goal, health condition, plan tier). Compare performance across different client groups.'
      },
      {
        title: 'Platform Analytics',
        content: 'View platform-wide usage stats, feature adoption, client growth trends, and revenue analytics for your coaching business.'
      }
    ]
  },
  {
    section: 'Billing & Payments',
    icon: Lock,
    color: 'from-amber-500 to-amber-600',
    description: 'Manage payments and subscriptions',
    guides: [
      {
        title: 'Payment Gateway Setup',
        content: 'Configure Razorpay or Stripe to accept payments. Enable clients to purchase plans and coaches to setup payment collections.'
      },
      {
        title: 'Client Plans',
        content: 'Create paid meal plans or coaching packages. Set prices, features, and duration. Clients purchase and gain instant access.'
      },
      {
        title: 'Plan Management',
        content: 'Manage active subscriptions, handle cancellations, and view payment history. Track revenue from paid plans.'
      },
      {
        title: 'Payment History',
        content: 'View all transactions, refunds, and payment attempts. Export reports for accounting and financial tracking.'
      }
    ]
  },
  {
    section: 'Settings & Admin',
    icon: Settings,
    color: 'from-slate-500 to-slate-600',
    description: 'Configure your platform and team',
    guides: [
      {
        title: 'Coach Profile',
        content: 'Set up your business details, credentials, specializations, social media links, and custom branding for your client portal.'
      },
      {
        title: 'Team Management',
        content: 'Invite team members, assign roles (team member, student coach), and manage their access to clients and features.'
      },
      {
        title: 'Color Customization',
        content: 'Customize the platform colors to match your brand. Set primary colors, sidebar styling, and button colors.'
      },
      {
        title: 'Subscription Plans',
        content: 'Manage your own subscription to the Mealie platform. Upgrade plans for more clients, features, and API access.'
      },
      {
        title: 'Security Settings',
        content: 'Configure login requirements, two-factor authentication, data backup settings, and privacy policies for your platform.'
      }
    ]
  }
];

export default function HelpCenter() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('guides');

  const filteredGuides = guideData.filter(guide => {
    const matchesSearch = guide.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guide.guides.some(g => g.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.content.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 overflow-hidden">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-green-500 text-white py-8 lg:py-12 px-4 lg:px-6">
        <div className="max-w-6xl mx-auto text-center space-y-2 lg:space-y-4">
          <div className="inline-block mb-2 lg:mb-4">
            <span className="text-3xl lg:text-5xl">📚</span>
          </div>
          <h1 className="text-2xl lg:text-5xl xl:text-6xl font-bold">Mealie Pro Help Center</h1>
          <p className="text-sm lg:text-lg xl:text-xl text-white/90 max-w-2xl mx-auto px-2">
            Your complete guide to mastering the platform. Learn features, best practices, and get answers
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6 lg:py-12 space-y-4 lg:space-y-8">
        {/* Enhanced Search */}
        <div className="max-w-3xl mx-auto">
          <div className="relative group">
            <Search className="absolute left-3 lg:left-4 top-1/2 transform -translate-y-1/2 w-4 lg:w-5 h-4 lg:h-5 text-gray-400 group-focus-within:text-orange-500 transition flex-shrink-0" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search features, guides, and tips..."
              className="pl-10 lg:pl-12 pr-10 lg:pr-4 py-3 lg:py-4 text-sm lg:text-base border-2 border-gray-200 focus:border-orange-500 rounded-xl shadow-sm focus:shadow-md transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 lg:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 lg:w-5 h-4 lg:h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur border border-gray-200 rounded-xl p-1">
            <TabsTrigger value="guides" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white text-xs lg:text-sm py-2 lg:py-2.5">
              <BookOpen className="w-3 lg:w-4 h-3 lg:h-4 mr-1 lg:mr-2" />
              <span className="hidden sm:inline">Guides</span>
              <span className="sm:hidden">Guides</span>
            </TabsTrigger>
            <TabsTrigger value="tips" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white text-xs lg:text-sm py-2 lg:py-2.5">
              <Zap className="w-3 lg:w-4 h-3 lg:h-4 mr-1 lg:mr-2" />
              <span className="hidden sm:inline">Quick Tips</span>
              <span className="sm:hidden">Tips</span>
            </TabsTrigger>
            <TabsTrigger value="plans" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white text-xs lg:text-sm py-2 lg:py-2.5">
              <Eye className="w-3 lg:w-4 h-3 lg:h-4 mr-1 lg:mr-2" />
              <span className="hidden sm:inline">Plans</span>
              <span className="sm:hidden">Plans</span>
            </TabsTrigger>
          </TabsList>

          {/* Guides Tab */}
          <TabsContent value="guides" className="space-y-4 lg:space-y-6 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {filteredGuides.map((guide, idx) => {
                const Icon = guide.icon;
                return (
                  <Card
                    key={idx}
                    className="hover:shadow-xl transition-all duration-300 overflow-hidden border-0 group cursor-pointer"
                  >
                    <CardHeader className={`bg-gradient-to-r ${guide.color} text-white group-hover:shadow-lg transition-shadow p-4 lg:p-6`}>
                      <div className="flex items-start gap-2 lg:gap-3">
                        <Icon className="w-6 lg:w-8 h-6 lg:h-8 flex-shrink-0" />
                        <div className="min-w-0">
                          <CardTitle className="text-base lg:text-xl">{guide.section}</CardTitle>
                          <CardDescription className="text-white/85 mt-1 text-xs lg:text-sm line-clamp-2">{guide.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 lg:pt-6 p-4 lg:p-6 space-y-2 lg:space-y-3">
                      {guide.guides.map((item, itemIdx) => (
                        <div key={itemIdx} className="pb-2 lg:pb-3 border-b border-gray-100 last:border-b-0">
                          <h4 className="font-semibold text-gray-900 mb-1 flex items-center gap-2 text-xs lg:text-sm">
                            <span className="w-1.5 lg:w-2 h-1.5 lg:h-2 rounded-full bg-gradient-to-r from-orange-500 to-red-600 flex-shrink-0" />
                            {item.title}
                          </h4>
                          <p className="text-gray-600 text-xs leading-relaxed">{item.content}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredGuides.length === 0 && (
              <div className="text-center py-12 lg:py-16">
                <Search className="w-12 lg:w-16 h-12 lg:h-16 mx-auto text-gray-300 mb-3 lg:mb-4" />
                <p className="text-gray-600 font-medium text-base lg:text-lg">No guides found for "{searchTerm}"</p>
                <p className="text-gray-400 text-xs lg:text-sm mt-2">Try searching for a different feature or keyword</p>
              </div>
            )}
          </TabsContent>

          {/* Quick Tips Tab */}
          <TabsContent value="tips" className="space-y-4 lg:space-y-6 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {[
                { icon: '🎯', title: 'Start with Dashboard', desc: 'Review the main dashboard to understand your key metrics and action items.' },
                { icon: '⚙️', title: 'Setup Your Profile First', desc: 'Complete your coach profile with credentials and branding before inviting clients.' },
                { icon: '🍽️', title: 'Create Meal Plans', desc: 'Use the AI meal planner to quickly generate personalized plans for new clients.' },
                { icon: '🏆', title: 'Use Gamification', desc: 'Enable challenges, points, and badges to keep clients motivated and engaged.' },
                { icon: '📊', title: 'Regular Reviews', desc: 'Check Client Progress Review weekly to identify clients needing extra support.' },
                { icon: '📚', title: 'Share Resources', desc: 'Build your resource library and use AI suggestions to assign relevant materials.' }
              ].map((tip, idx) => (
                <Card key={idx} className="border-0 shadow-sm hover:shadow-lg transition-all group">
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex gap-3 lg:gap-4">
                      <div className="text-3xl lg:text-4xl flex-shrink-0">{tip.icon}</div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 mb-1 lg:mb-2 group-hover:text-orange-600 transition text-sm lg:text-base">{tip.title}</h4>
                        <p className="text-gray-600 text-xs lg:text-sm leading-relaxed">{tip.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="plans" className="space-y-4 lg:space-y-6 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              {[
                { icon: '⭐', name: 'Basic', color: 'blue', features: ['Essential features', 'Meal plans', 'Client management', 'Progress tracking', 'Basic messaging'] },
                { icon: '💎', name: 'Pro', color: 'orange', features: ['Everything in Basic', 'Pro meal plans', 'Advanced analytics', 'Team management', 'Payment processing'], highlight: true },
                { icon: '👑', name: 'Premium', color: 'purple', features: ['Everything in Pro', 'Custom domain', 'White-label branding', 'Unlimited team', 'API access', 'Priority support'] }
              ].map((plan, idx) => (
                <Card key={idx} className={`border-2 transition-all ${plan.highlight ? 'border-orange-500 shadow-lg' : 'border-gray-200'} overflow-hidden`}>
                  <CardHeader className={`bg-gradient-to-r ${plan.color === 'blue' ? 'from-blue-50 to-blue-100' : plan.color === 'orange' ? 'from-orange-50 to-orange-100' : 'from-purple-50 to-purple-100'} p-4 lg:p-6`}>
                    <div className="flex items-center gap-2 lg:gap-3 mb-2">
                      <span className="text-2xl lg:text-3xl">{plan.icon}</span>
                      <CardTitle className={`text-base lg:text-xl ${plan.color === 'blue' ? 'text-blue-900' : plan.color === 'orange' ? 'text-orange-900' : 'text-purple-900'}`}>
                        {plan.name}
                      </CardTitle>
                    </div>
                    {plan.highlight && <Badge className="bg-orange-600 w-fit text-xs">Most Popular</Badge>}
                  </CardHeader>
                  <CardContent className="pt-4 lg:pt-6 p-4 lg:p-6">
                    <ul className="space-y-2 lg:space-y-3">
                      {plan.features.map((feature, fidx) => (
                        <li key={fidx} className="flex items-center gap-2 text-xs lg:text-sm text-gray-700">
                          <div className={`w-1.5 lg:w-2 h-1.5 lg:h-2 rounded-full flex-shrink-0 ${plan.color === 'blue' ? 'bg-blue-600' : plan.color === 'orange' ? 'bg-orange-600' : 'bg-purple-600'}`} />
                          <span className="leading-tight">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          </Tabs>
          </div>
          </div>
          );
          }