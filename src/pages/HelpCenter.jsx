import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Search, Home, Users, MessageSquare, Calendar, ChefHat,
  FileText, BarChart3, Settings, Heart, TrendingUp, BookOpen, Award, Lock,
  Zap, X, ChevronRight, CheckCircle2, ArrowRight, Star, Lightbulb,
  PlayCircle, Bell, Target, Dumbbell, Utensils, Scale, ClipboardList,
  Video, Image, Upload
} from 'lucide-react';
import { Input } from '@/components/ui/input';

const STEPS_GUIDE = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: '🚀',
    color: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50',
    borderColor: 'border-violet-200',
    badge: 'Start Here',
    badgeColor: 'bg-violet-100 text-violet-700',
    steps: [
      {
        step: 1,
        title: 'Complete Your Profile',
        icon: FileText,
        desc: 'Fill in all your personal details to unlock personalized recommendations.',
        details: [
          'Go to My Profile from the sidebar',
          'Enter your age, height, current weight & target weight',
          'Set your dietary preference (Veg / Non-Veg / Jain / Eggetarian)',
          'Choose your regional cuisine (North / South / West / East)',
          'Add your health conditions, lifestyle details & family history',
          'Review your auto-calculated BMR, TDEE & daily calorie targets'
        ]
      },
      {
        step: 2,
        title: 'Set Up Your Health Goals',
        icon: Target,
        desc: 'Define clear, measurable goals to track your progress effectively.',
        details: [
          'Navigate to My Progress → Goals section',
          'Click "Set New Goal" and choose goal type (Weight, Wellness, Habit)',
          'Set a specific target value and deadline',
          'Add motivational notes or reminders',
          'Your coach will review and guide your goal setting'
        ]
      },
      {
        step: 3,
        title: 'View Your Meal Plan',
        icon: ChefHat,
        desc: 'Access your personalized meal plan assigned by your coach.',
        details: [
          'Go to My Meal Plan in the sidebar',
          'Browse your day-wise meals: Breakfast, Mid-Morning, Lunch, Snack, Dinner',
          'Tap any meal to see full ingredients and portion sizes',
          'Check daily calorie and macro targets at the top',
          'Mark meals as completed after eating to track adherence'
        ]
      },
      {
        step: 4,
        title: 'Message Your Coach',
        icon: MessageSquare,
        desc: 'Establish communication with your health coach from day one.',
        details: [
          'Open Messages from the sidebar',
          'Send an introduction message to your coach',
          'Share any dietary concerns or preferences',
          'Ask questions about your meal plan or health goals',
          'Attach photos of your meals if needed'
        ]
      }
    ]
  },
  {
    id: 'daily-routine',
    title: 'Daily Routine',
    icon: '📅',
    color: 'from-orange-500 to-amber-500',
    bgLight: 'bg-orange-50',
    borderColor: 'border-orange-200',
    badge: 'Everyday',
    badgeColor: 'bg-orange-100 text-orange-700',
    steps: [
      {
        step: 1,
        title: 'Check Your Dashboard',
        icon: Home,
        desc: 'Start each day by reviewing your health stats and pending tasks.',
        details: [
          'Open the app and view your Home Dashboard',
          'Check today\'s calorie target and remaining budget',
          'Review active goals and progress bars',
          'See any new messages from your coach',
          'Check upcoming appointments for the day'
        ]
      },
      {
        step: 2,
        title: 'Log Your Meals',
        icon: Utensils,
        desc: 'Track every meal to monitor nutrition and stay on target.',
        details: [
          'Go to Food Log in the sidebar',
          'Select today\'s date and meal type (Breakfast, Lunch, etc.)',
          'Type meal name or use Food Lookup AI to search',
          'Enter portion size for accurate calorie counting',
          'Optionally add a photo of your meal',
          'See running totals for calories, protein, carbs & fats'
        ]
      },
      {
        step: 3,
        title: 'Track Your Weight',
        icon: Scale,
        desc: 'Log your weight consistently for accurate trend tracking.',
        details: [
          'Navigate to My Progress',
          'Click "Log Progress" button',
          'Enter today\'s weight in kg',
          'Optionally record body measurements (waist, chest, hips)',
          'Add wellness notes — mood, energy, sleep quality',
          'View the weight trend chart to see your journey'
        ]
      },
      {
        step: 4,
        title: 'Complete MPESS Wellness',
        icon: Heart,
        desc: 'Log your holistic wellness activities across all 5 dimensions.',
        details: [
          'Go to MPESS Wellness from the sidebar',
          'Check off completed Mind activities (affirmations, meditation)',
          'Log Physical activities (exercise, steps, hydration)',
          'Record Emotional practices (journaling, breathing exercises)',
          'Note Social connections (family time, community)',
          'Log Spiritual practices (gratitude, nature walks)',
          'Rate your overall wellness score for the day'
        ]
      }
    ]
  },
  {
    id: 'progress-tracking',
    title: 'Progress Tracking',
    icon: '📊',
    color: 'from-green-500 to-emerald-600',
    bgLight: 'bg-green-50',
    borderColor: 'border-green-200',
    badge: 'Weekly',
    badgeColor: 'bg-green-100 text-green-700',
    steps: [
      {
        step: 1,
        title: 'Review Your Progress Logs',
        icon: TrendingUp,
        desc: 'Analyze your weekly weight trend and wellness patterns.',
        details: [
          'Open My Progress and switch to Chart view',
          'Review your weight trend line over the past 30 days',
          'Check progress toward your target weight',
          'Compare weekly averages to spot improvements',
          'Look at body measurement changes alongside weight'
        ]
      },
      {
        step: 2,
        title: 'Track Meal Adherence',
        icon: ClipboardList,
        desc: 'Understand how closely you are following your meal plan.',
        details: [
          'Go to My Progress → Nutrition tab',
          'View your daily adherence percentage chart',
          'Compare actual calories vs. target calories',
          'Identify which meal types you miss most often',
          'Share adherence report with your coach in Messages'
        ]
      },
      {
        step: 3,
        title: 'Monitor Your Goals',
        icon: Target,
        desc: 'Review goal progress and update targets as needed.',
        details: [
          'Visit My Progress → Goals section',
          'See progress bars for each active goal',
          'Check estimated completion dates',
          'Log new progress entries for habit/wellness goals',
          'Discuss goal adjustments with your coach if needed'
        ]
      },
      {
        step: 4,
        title: 'Review MPESS Analytics',
        icon: BarChart3,
        desc: 'Analyze trends across all 5 wellness dimensions.',
        details: [
          'Go to MPESS Analytics in the sidebar',
          'View radar charts showing your 5-dimension wellness balance',
          'Identify which dimensions need more attention',
          'Track your streak for daily MPESS logging',
          'Share insights with your coach for holistic guidance'
        ]
      }
    ]
  },
  {
    id: 'coach-communication',
    title: 'Coach Communication',
    icon: '💬',
    color: 'from-blue-500 to-cyan-600',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200',
    badge: 'Ongoing',
    badgeColor: 'bg-blue-100 text-blue-700',
    steps: [
      {
        step: 1,
        title: 'Send Daily Updates',
        icon: MessageSquare,
        desc: 'Keep your coach informed with regular progress updates.',
        details: [
          'Open Messages and select your coach',
          'Send a daily check-in message with your weight and mood',
          'Share meal photos for coach feedback',
          'Report any challenges or cravings you\'re experiencing',
          'Ask for tips if you feel stuck or unmotivated'
        ]
      },
      {
        step: 2,
        title: 'Schedule Appointments',
        icon: Calendar,
        desc: 'Book regular coaching sessions for deeper guidance.',
        details: [
          'Go to My Appointments in the sidebar',
          'View upcoming scheduled calls with your coach',
          'Check appointment date, time and type (video/call)',
          'Join the video call using the link in the appointment',
          'Prepare your questions and progress notes before the call'
        ]
      },
      {
        step: 3,
        title: 'Share Progress Photos',
        icon: Image,
        desc: 'Visual progress photos help your coach give better feedback.',
        details: [
          'Go to My Progress and click "Log Progress"',
          'Scroll to Progress Photos section',
          'Upload Front, Side, and Back photos',
          'Photos are private and only visible to your coach',
          'Take photos at consistent times for fair comparison'
        ]
      },
      {
        step: 4,
        title: 'Upload Health Reports',
        icon: Upload,
        desc: 'Share lab reports and health documents with your coach.',
        details: [
          'Navigate to Upload Reports in the sidebar',
          'Click "Upload Report" and select your file (PDF/Image)',
          'Add a note describing what the report is about',
          'Your coach will review and provide dietary guidance',
          'Ideal reports: Blood tests, thyroid, cholesterol, diabetes panel'
        ]
      }
    ]
  },
  {
    id: 'motivation',
    title: 'Stay Motivated',
    icon: '🏆',
    color: 'from-yellow-500 to-orange-500',
    bgLight: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    badge: 'Rewards',
    badgeColor: 'bg-yellow-100 text-yellow-700',
    steps: [
      {
        step: 1,
        title: 'Earn Points & Badges',
        icon: Award,
        desc: 'Get rewarded for every healthy action you take in the app.',
        details: [
          'Earn points for logging meals, weight, and MPESS daily',
          'Get bonus points for hitting streaks (7-day, 30-day)',
          'Unlock badges for milestones like first 5kg lost',
          'View all your earned badges in the Achievements section',
          'Points accumulate toward special recognition from your coach'
        ]
      },
      {
        step: 2,
        title: 'Join Challenges',
        icon: Zap,
        desc: 'Participate in time-limited wellness challenges to stay engaged.',
        details: [
          'Check for active challenges in the app',
          'Join a water intake or meal adherence challenge',
          'Track daily challenge progress in your dashboard',
          'Earn special challenge badges upon completion',
          'Compete with other members on the leaderboard'
        ]
      },
      {
        step: 3,
        title: 'Celebrate Milestones',
        icon: Star,
        desc: 'Recognize and celebrate your wins, big and small.',
        details: [
          'Share milestone achievements with your coach in Messages',
          'Screenshot your progress charts to save your journey',
          'Set reward milestones (every 5kg lost = a treat)',
          'Review your badges and progress history regularly',
          'Let your coach know what\'s working so they can amplify it'
        ]
      }
    ]
  }
];

const QUICK_TIPS = [
  { icon: '⏰', tip: 'Weigh yourself at the same time each day — preferably morning, after using the bathroom.' },
  { icon: '💧', tip: 'Log your water intake daily. Aim for 8-10 glasses (2-3 litres) per day.' },
  { icon: '📸', tip: 'Take progress photos every 4 weeks. Photos reveal changes that the scale often misses.' },
  { icon: '🥗', tip: 'Use the Food Lookup tool before eating out to make smart choices at restaurants.' },
  { icon: '😴', tip: 'Log your sleep quality in MPESS. Poor sleep directly affects weight and cravings.' },
  { icon: '📝', tip: 'Message your coach at least 3 times a week. More communication = better results.' },
  { icon: '🎯', tip: 'Review your goals every Sunday and plan your meals for the upcoming week.' },
  { icon: '🔔', tip: 'Enable notifications for meal reminders and check-in prompts to stay consistent.' },
  { icon: '🧘', tip: 'MPESS is not just fitness — track meditation, social time, and gratitude too.' },
  { icon: '📊', tip: 'Focus on weekly averages, not daily fluctuations. Weight can vary 1-2 kg day to day.' },
  { icon: '🍽️', tip: 'Mark meals as completed in your plan to easily track your adherence percentage.' },
  { icon: '💬', tip: 'Share a meal photo daily in chat — your coach can spot issues and adjust your plan.' },
];

const FAQS = [
  { q: 'How do I access my meal plan?', a: 'Go to "My Meal Plan" in the sidebar. Your coach will assign and update it. You\'ll see day-wise meals with ingredients and portions.' },
  { q: 'What is MPESS?', a: 'MPESS stands for Mind, Physical, Emotional, Social, and Spiritual wellness — a holistic health framework to track all dimensions of your well-being beyond just nutrition.' },
  { q: 'How often should I log my weight?', a: 'Aim to log your weight 3-5 times per week, ideally at the same time each day (morning is best). This gives your coach accurate trend data.' },
  { q: 'How do I contact my coach?', a: 'Use the Messages section in the sidebar to send direct messages to your coach. You can also share files, meal photos, and health reports.' },
  { q: 'What should I do if my meal plan needs changes?', a: 'Message your coach with specific foods you dislike or ingredients you\'re allergic to. They will update your plan within 24-48 hours.' },
  { q: 'How do I schedule a video call with my coach?', a: 'Go to My Appointments in the sidebar. Your coach will schedule sessions there. You\'ll receive a notification with the call link.' },
  { q: 'Where can I upload my blood test reports?', a: 'Navigate to "Upload Reports" in the sidebar. Upload PDF or image files and add a note. Your coach will review and provide dietary guidance.' },
  { q: 'How do I earn badges and points?', a: 'Points are automatically awarded when you log meals, weight, and MPESS activities daily. Badges unlock at specific milestones like 7-day streaks or 5kg lost.' },
];

export default function HelpCenter() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState('steps');
  const [expandedStep, setExpandedStep] = useState(null);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [expandedGuide, setExpandedGuide] = useState(null);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-r from-orange-600 via-amber-500 to-green-500 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-60 h-60 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 py-12 md:py-16 text-center">
          <div className="text-5xl mb-4">📚</div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">Help Center</h1>
          <p className="text-white/90 text-base md:text-lg max-w-2xl mx-auto mb-8">
            Step-by-step guides, tips, and answers to help you get the most out of Mealie Pro
          </p>

          {/* Search */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search guides, tips, FAQs..."
              className="pl-12 pr-10 py-3 text-sm bg-white text-gray-900 border-0 rounded-xl shadow-lg focus:ring-2 focus:ring-orange-300"
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
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto py-2" style={{ scrollbarWidth: 'none' }}>
          {[
            { id: 'steps', label: 'Step-by-Step Guide', icon: PlayCircle },
            { id: 'tips', label: 'Quick Tips', icon: Lightbulb },
            { id: 'faq', label: 'FAQs', icon: MessageSquare },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                activeSection === tab.id
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Step-by-Step Guide */}
        {activeSection === 'steps' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-gray-900 mb-2">Step-by-Step Guide</h2>
              <p className="text-gray-500">Follow these detailed steps to make the most of every feature</p>
            </div>

            {filteredSteps.map((section, sIdx) => (
              <div key={sIdx} className={`rounded-2xl border-2 ${section.borderColor} overflow-hidden shadow-md`}>
                {/* Section Header */}
                <div className={`bg-gradient-to-r ${section.color} text-white p-5`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{section.icon}</span>
                      <div>
                        <h3 className="text-xl font-black">{section.title}</h3>
                        <Badge className={`mt-1 ${section.badgeColor} border-0 text-xs font-semibold`}>
                          {section.badge}
                        </Badge>
                      </div>
                    </div>
                    <span className="text-white/60 text-sm">{section.steps.length} steps</span>
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
                          className="w-full flex items-center gap-4 p-4 md:p-5 hover:bg-gray-50 transition-colors text-left"
                          onClick={() => setExpandedStep(isOpen ? null : key)}
                        >
                          {/* Step Number */}
                          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${section.color} text-white flex items-center justify-center text-sm font-black shrink-0`}>
                            {step.step}
                          </div>
                          <Icon className="w-5 h-5 text-gray-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900">{step.title}</p>
                            <p className="text-sm text-gray-500 mt-0.5">{step.desc}</p>
                          </div>
                          <div className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </div>
                        </button>

                        {isOpen && (
                          <div className={`px-5 pb-5 ${section.bgLight} border-t border-gray-100`}>
                            <div className="pt-4 space-y-2.5">
                              {step.details.map((detail, dIdx) => (
                                <div key={dIdx} className="flex items-start gap-3">
                                  <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${section.color} text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5`}>
                                    {dIdx + 1}
                                  </div>
                                  <p className="text-sm text-gray-700 leading-relaxed">{detail}</p>
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
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-gray-900 mb-2">Quick Tips & Best Practices</h2>
              <p className="text-gray-500">Pro tips to maximize your results on the platform</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {QUICK_TIPS.filter(t =>
                !searchTerm || t.tip.toLowerCase().includes(searchTerm.toLowerCase())
              ).map((item, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all flex items-start gap-4">
                  <span className="text-3xl shrink-0">{item.icon}</span>
                  <p className="text-sm text-gray-700 leading-relaxed">{item.tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQs */}
        {activeSection === 'faq' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-gray-900 mb-2">Frequently Asked Questions</h2>
              <p className="text-gray-500">Quick answers to common questions</p>
            </div>
            <div className="space-y-3">
              {filteredFaqs.map((faq, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 p-4 md:p-5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-orange-600 font-bold text-sm">Q</span>
                      </div>
                      <p className="font-semibold text-gray-900 text-sm md:text-base">{faq.q}</p>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200 ${expandedFaq === idx ? 'rotate-90' : ''}`} />
                  </button>
                  {expandedFaq === idx && (
                    <div className="px-5 pb-4 bg-orange-50 border-t border-orange-100">
                      <div className="flex items-start gap-3 pt-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-green-600 font-bold text-sm">A</span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{faq.a}</p>
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

        {/* Contact Coach Card */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 text-white text-center shadow-lg">
          <div className="text-4xl mb-3">🙋</div>
          <h3 className="text-xl font-black mb-2">Still need help?</h3>
          <p className="text-white/90 text-sm mb-4">Message your health coach directly for personalized support and guidance</p>
          <a
            href="/clientcommunication"
            className="inline-flex items-center gap-2 bg-white text-orange-600 font-bold px-6 py-3 rounded-xl hover:bg-orange-50 transition-colors text-sm"
          >
            <MessageSquare className="w-4 h-4" />
            Message My Coach
          </a>
        </div>

      </div>
    </div>
  );
}