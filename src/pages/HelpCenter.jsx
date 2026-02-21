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
    section: 'Home Dashboard',
    icon: Home,
    color: 'from-blue-500 to-blue-600',
    description: 'Your personalized wellness hub with progress tracking',
    guides: [
      {
        title: 'Welcome Section',
        content: 'Get personalized welcome message about your Indian meal planning journey. Access Food Lookup and MPESS Tracker with one click.'
      },
      {
        title: 'Health Stats',
        content: 'View your current weight, active goals count, target daily calories, and MPESS wellness days tracked this week all at a glance.'
      },
      {
        title: 'Active Goals Overview',
        content: 'See your top 3 active goals with progress bars showing how close you are to achieving them. Track progress by unit (kg, days, etc.).'
      },
      {
        title: 'Quick Actions',
        content: 'Instantly access My Progress tracking, direct messaging with your coach, and MPESS Wellness tracking from the dashboard.'
      }
    ]
  },
  {
    section: 'My Progress',
    icon: TrendingUp,
    color: 'from-green-500 to-green-600',
    description: 'Track your weight, measurements, and wellness journey',
    guides: [
      {
        title: 'Weight Tracking',
        content: 'Log your current weight and track changes over time. View weight trend charts showing your progress towards your target weight.'
      },
      {
        title: 'Measurements',
        content: 'Record body measurements (chest, waist, hips, etc.) to track body composition changes alongside weight.'
      },
      {
        title: 'Wellness Metrics',
        content: 'Log mood, energy levels, sleep quality, stress, digestion, and hunger patterns to track your overall wellness beyond just weight.'
      },
      {
        title: 'Coach Feedback',
        content: 'Receive personalized feedback from your coach on your progress logs with suggestions and encouragement.'
      }
    ]
  },
  {
    section: 'Meal Planning & Nutrition',
    icon: ChefHat,
    color: 'from-orange-500 to-orange-600',
    description: 'Create and manage personalized Indian meal plans',
    guides: [
      {
        title: 'Food Lookup Tool',
        content: 'Use AI-powered search to find nutritional information for any Indian food. Get instant macros, calories, and dietary tags for informed meal planning.'
      },
      {
        title: 'My Meal Plan',
        content: 'View your assigned meal plan with daily breakdowns, recipes, and nutritional targets. Mark meals as completed to track adherence.'
      },
      {
        title: 'Recipe Library',
        content: 'Browse recipes tailored to Indian cuisine with complete nutritional info. Filter by meal type, dietary preference, and regional cuisine.'
      },
      {
        title: 'Food Log',
        content: 'Log your meals daily with photos or manual entry. Track calories, macros, and see how close you are to your daily targets.'
      }
    ]
  },
  {
    section: 'MPESS Wellness',
    icon: Heart,
    color: 'from-purple-500 to-purple-600',
    description: 'Track holistic wellness beyond nutrition',
    guides: [
      {
        title: 'MPESS Framework',
        content: 'Track Mind, Physical, Emotional, Social, and Spiritual wellness. Log affirmations, movement, journaling, social activities, and meditation.'
      },
      {
        title: 'Wellness Tracker',
        content: 'Record daily wellness practices across all 5 MPESS dimensions. Build streaks and celebrate consistency in holistic health.'
      },
      {
        title: 'MPESS Assessment',
        content: 'Complete comprehensive wellness assessments to evaluate your current state in each MPESS dimension and get personalized recommendations.'
      },
      {
        title: 'MPESS Analytics',
        content: 'View detailed analytics showing your progress in each wellness dimension with trends and insights for improvement.'
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
    section: 'Appointments & Goals',
    icon: Calendar,
    color: 'from-red-500 to-red-600',
    description: 'Schedule consultations and set wellness goals',
    guides: [
      {
        title: 'My Appointments',
        content: 'View and schedule appointments with your health coach. Get reminders before your scheduled consultation calls.'
      },
      {
        title: 'Appointment Reminders',
        content: 'Receive automatic reminders before your coaching sessions. Never miss an important check-in with your coach.'
      },
      {
        title: 'My Goals',
        content: 'Set SMART goals with your coach in areas like weight loss, fitness, wellness metrics, and behavioral changes.'
      },
      {
        title: 'Goal Progress',
        content: 'Track progress toward your set goals with visual indicators. Celebrate milestones and adjust strategies with coach guidance.'
      }
    ]
  },
  {
    section: 'Messages & Support',
    icon: MessageSquare,
    color: 'from-cyan-500 to-cyan-600',
    description: 'Direct communication with your health coach',
    guides: [
      {
        title: 'Direct Messaging',
        content: 'Send and receive messages directly with your health coach. Share updates, ask questions, and get personalized guidance anytime.'
      },
      {
        title: 'Chat Features',
        content: 'Share files, photos, and receive coaching feedback. See when your coach has read your messages for peace of mind.'
      },
      {
        title: 'Quick Response',
        content: 'Get prompt replies from your coach during their working hours. Set communication preferences for message timing.'
      },
      {
        title: 'Progress Sharing',
        content: 'Share your progress logs, meal photos, and wellness updates directly in chat for coach feedback and motivation.'
      }
    ]
  },
  {
    section: 'My Profile',
    icon: FileText,
    color: 'from-indigo-500 to-indigo-600',
    description: 'Manage your health information and preferences',
    guides: [
      {
        title: 'Personal Information',
        content: 'Complete your profile with age, height, weight, activity level, dietary preferences, and health goals for personalized recommendations.'
      },
      {
        title: 'Health Metrics',
        content: 'Store your health test results and medical data. Share this information with your coach for better personalized guidance.'
      },
      {
        title: 'Dietary Preferences',
        content: 'Set your food preferences (veg/non-veg), regional cuisine preferences, and any dietary restrictions or allergies.'
      },
      {
        title: 'Notification Settings',
        content: 'Customize when and how you receive reminders for meals, progress check-ins, and messages from your coach.'
      }
    ]
  },
  {
    section: 'Motivation & Rewards',
    icon: Award,
    color: 'from-yellow-500 to-yellow-600',
    description: 'Stay motivated through achievements and milestones',
    guides: [
      {
        title: 'Points & Streaks',
        content: 'Earn points for daily activities like logging meals, submitting progress, and completing wellness practices. Build streaks for consistency.'
      },
      {
        title: 'Badges & Achievements',
        content: 'Unlock badges for reaching milestones like your first 100 meal logs, 30-day streaks, or weight goals. Display your achievements proudly.'
      },
      {
        title: 'Leaderboard',
        content: 'See how you compare with other community members on the leaderboard. Friendly competition keeps you motivated.'
      },
      {
        title: 'Special Challenges',
        content: 'Participate in time-limited challenges (water intake challenges, meal plan adherence contests). Earn special badges and recognition.'
      }
    ]
  },
  {
    section: 'Reports & Insights',
    icon: BarChart3,
    color: 'from-teal-500 to-teal-600',
    description: 'View your wellness journey analytics',
    guides: [
      {
        title: 'Weight Progress Report',
        content: 'See detailed charts showing your weight journey over time. Track your progress toward your target weight with visual trends.'
      },
      {
        title: 'Wellness Trends',
        content: 'View analytics on your mood, energy, sleep quality, and other wellness metrics over time. Identify patterns and improvements.'
      },
      {
        title: 'Adherence Metrics',
        content: 'Track how well you\'re following your meal plan, logging meals, and completing wellness activities. See your consistency percentage.'
      },
      {
        title: 'Goal Performance',
        content: 'Review detailed analytics on each of your active goals. See progress rate, upcoming milestones, and estimated completion dates.'
      }
    ]
  },
  {
    section: 'Plans & Subscriptions',
    icon: Lock,
    color: 'from-amber-500 to-amber-600',
    description: 'View your plan options and settings',
    guides: [
      {
        title: 'My Plan',
        content: 'View details of your current membership plan and what features are included in your subscription level.'
      },
      {
        title: 'Available Plans',
        content: 'Explore different plan tiers to see what additional features and benefits you can unlock for your wellness journey.'
      },
      {
        title: 'Subscription Management',
        content: 'Manage your subscription, view renewal dates, and update payment information if needed.'
      },
      {
        title: 'Plan Benefits',
        content: 'Learn about unlimited access to meal plans, AI features, coach consultations, and premium resources included in your plan.'
      }
    ]
  },
  {
    section: 'Account & Settings',
    icon: Settings,
    color: 'from-slate-500 to-slate-600',
    description: 'Manage your account preferences and settings',
    guides: [
      {
        title: 'Account Settings',
        content: 'Update your email, password, and basic account information. Manage your login credentials securely.'
      },
      {
        title: 'Communication Preferences',
        content: 'Choose how often you want to receive reminders and notifications. Set your preferred contact times with your coach.'
      },
      {
        title: 'Privacy & Security',
        content: 'Review privacy settings, manage data sharing permissions, and see what information your coach can access.'
      },
      {
        title: 'Help & Support',
        content: 'Access the help center guides, contact support for issues, and provide feedback to help us improve your experience.'
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
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-green-500 text-white py-12 lg:py-16 px-4 lg:px-6">
        <div className="max-w-6xl mx-auto text-center space-y-4 lg:space-y-6">
          <div className="inline-block mb-4 lg:mb-6 animate-bounce">
            <span className="text-5xl lg:text-6xl">📚</span>
          </div>
          <div className="space-y-3 lg:space-y-4">
            <h1 className="text-3xl lg:text-6xl xl:text-7xl font-black tracking-tight">Mealie Pro Help Center</h1>
            <p className="text-base lg:text-xl text-white/95 max-w-3xl mx-auto leading-relaxed">
              Your complete guide to mastering the platform. Learn features, best practices, and get answers
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8 lg:py-16 space-y-6 lg:space-y-10">
        {/* Enhanced Search */}
        <div className="max-w-3xl mx-auto">
          <div className="relative group">
            <Search className="absolute left-4 lg:left-5 top-1/2 transform -translate-y-1/2 w-5 lg:w-6 h-5 lg:h-6 text-gray-400 group-focus-within:text-orange-500 transition flex-shrink-0" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search features, guides, and tips..."
              className="pl-12 lg:pl-14 pr-4 py-3.5 lg:py-4 text-sm lg:text-base border-2 border-gray-200 focus:border-orange-500 rounded-xl shadow-md focus:shadow-lg transition"
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
           <TabsList className="grid w-full grid-cols-2 bg-white/90 backdrop-blur-md border border-gray-200 rounded-xl p-1.5 shadow-sm">
            <TabsTrigger value="guides" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white text-sm lg:text-base font-semibold py-2.5 lg:py-3 transition-all">
              <BookOpen className="w-4 lg:w-5 h-4 lg:h-5 mr-2 lg:mr-2.5" />
              <span className="hidden sm:inline">Guides</span>
              <span className="sm:hidden">Guides</span>
            </TabsTrigger>
            <TabsTrigger value="tips" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white text-sm lg:text-base font-semibold py-2.5 lg:py-3 transition-all">
              <Zap className="w-4 lg:w-5 h-4 lg:h-5 mr-2 lg:mr-2.5" />
              <span className="hidden sm:inline">Quick Tips</span>
              <span className="sm:hidden">Tips</span>
            </TabsTrigger>
          </TabsList>

          {/* Guides Tab */}
          <TabsContent value="guides" className="space-y-6 lg:space-y-8 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {filteredGuides.map((guide, idx) => {
                const Icon = guide.icon;
                return (
                  <Card
                    key={idx}
                    className="hover:shadow-xl transition-all duration-300 overflow-hidden border-0 group cursor-pointer h-full"
                  >
                    <CardHeader className={`bg-gradient-to-r ${guide.color} text-white group-hover:shadow-lg transition-shadow p-6 lg:p-8`}>
                      <div className="flex items-start gap-4 lg:gap-5">
                        <Icon className="w-8 lg:w-10 h-8 lg:h-10 flex-shrink-0 mt-1" />
                        <div className="min-w-0">
                          <CardTitle className="text-xl lg:text-3xl font-black tracking-tight">{guide.section}</CardTitle>
                          <CardDescription className="text-white/85 mt-2.5 text-sm lg:text-base leading-relaxed">{guide.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-7 lg:pt-9 p-6 lg:p-8 space-y-5 lg:space-y-6">
                      {guide.guides.map((item, itemIdx) => (
                        <div key={itemIdx} className="pb-5 lg:pb-6 border-b border-gray-200 last:border-b-0 last:pb-0">
                          <h4 className="font-bold text-gray-900 mb-2.5 flex items-center gap-3 text-base lg:text-lg">
                            <span className="w-2.5 lg:w-3 h-2.5 lg:h-3 rounded-full bg-gradient-to-r from-orange-500 to-red-600 flex-shrink-0" />
                            {item.title}
                          </h4>
                          <p className="text-gray-600 text-sm lg:text-base leading-relaxed pl-5 lg:pl-6">{item.content}</p>
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
          <TabsContent value="tips" className="space-y-6 lg:space-y-8 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {[
                { icon: '📱', title: 'Start with Home Dashboard', desc: 'Check your home dashboard daily to see health stats, active goals, and quick action buttons for easy navigation.' },
                { icon: '⚖️', title: 'Log Your Weight Regularly', desc: 'Track weight at least 2-3 times per week for accurate trend charts. Consistency helps you see real progress.' },
                { icon: '🍽️', title: 'Use Food Lookup Tool', desc: 'Search Indian foods in the Food Lookup tool to get accurate nutritional info before logging meals.' },
                { icon: '💬', title: 'Message Your Coach', desc: 'Share your progress updates, meal photos, and questions with your coach directly in the Messages section.' },
                { icon: '🧘', title: 'Track MPESS Wellness', desc: 'Log daily practices in Mind, Physical, Emotional, Social & Spiritual wellness to build holistic health habits.' },
                { icon: '🎯', title: 'Review Your Goals Weekly', desc: 'Check your progress toward set goals each week and celebrate small wins to stay motivated.' }
              ].map((tip, idx) => (
                <Card key={idx} className="border-0 shadow-md hover:shadow-xl transition-all group h-full">
                  <CardContent className="p-6 lg:p-8">
                    <div className="flex gap-5 lg:gap-6">
                      <div className="text-5xl lg:text-6xl flex-shrink-0">{tip.icon}</div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-gray-900 mb-3 lg:mb-4 group-hover:text-orange-600 transition text-lg lg:text-xl">{tip.title}</h4>
                        <p className="text-gray-600 text-sm lg:text-base leading-relaxed">{tip.desc}</p>
                      </div>
                    </div>
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