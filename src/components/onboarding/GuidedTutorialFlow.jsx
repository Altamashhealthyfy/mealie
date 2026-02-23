import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowRight, Lightbulb, CheckCircle, Lock, PlayCircle,
  AlertCircle, Target, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GUIDED_TUTORIAL_SECTIONS = [
  {
    id: 'dashboard',
    title: 'Your Dashboard',
    icon: '📊',
    duration: '2 min',
    description: 'Get a complete overview of your health metrics and daily progress',
    content: [
      {
        heading: 'What You\'ll See',
        items: [
          'Your key health metrics (weight, progress towards goals)',
          'Daily wellness tracking (mood, energy, sleep)',
          'Your meal plan for the day',
          'Messages and appointments with your coach',
          'Recent progress and achievements'
        ]
      },
      {
        heading: 'How to Use It',
        items: [
          'Check your dashboard daily for quick updates',
          'Click cards to dive deeper into specific areas',
          'Use action buttons to log meals, progress, or message your coach'
        ]
      }
    ],
    tips: [
      '💡 Set a daily reminder to check your dashboard in the morning',
      '💡 The dashboard adapts to your progress — check back often!'
    ]
  },
  {
    id: 'food_logging',
    title: 'Logging Your Meals',
    icon: '🍽️',
    duration: '3 min',
    description: 'Track your nutrition and stay accountable to your meal plan',
    content: [
      {
        heading: 'How to Log Meals',
        items: [
          'Go to "Food Log" from the sidebar',
          'Select the meal type (breakfast, lunch, dinner, etc.)',
          'Add items you ate with quantities',
          'Attach a photo if you\'d like your coach to review'
        ]
      },
      {
        heading: 'Why It Matters',
        items: [
          'Helps your coach adjust your plan based on your eating patterns',
          'Shows your meal adherence percentage',
          'Tracks your macro and calorie intake',
          'Identifies trends and areas for improvement'
        ]
      }
    ],
    tips: [
      '💡 Log meals as soon as you eat them for accuracy',
      '💡 Use the photo feature when trying new recipes your coach can review'
    ]
  },
  {
    id: 'progress_tracking',
    title: 'Tracking Your Progress',
    icon: '📈',
    duration: '3 min',
    description: 'Record measurements, photos, and wellness metrics to see your transformation',
    content: [
      {
        heading: 'What to Log',
        items: [
          'Weight: Log weekly for best results',
          'Body measurements: Track every 2 weeks',
          'Progress photos: Front, side, and back views',
          'Wellness metrics: Sleep, mood, energy, digestion, cravings',
          'Custom metrics: Anything specific to your goals'
        ]
      },
      {
        heading: 'Benefits',
        items: [
          'Visualize your transformation with photos',
          'Get detailed progress reports',
          'Stay motivated with milestone celebrations',
          'Help your coach tailor your plan'
        ]
      }
    ],
    tips: [
      '💡 Log at the same time each day (ideally morning before eating)',
      '💡 Progress takes time — celebrate small wins!'
    ]
  },
  {
    id: 'messaging',
    title: 'Communicating with Your Coach',
    icon: '💬',
    duration: '2 min',
    description: 'Ask questions, share concerns, and get personalized guidance',
    content: [
      {
        heading: 'How to Message',
        items: [
          'Open "Messages" from the sidebar',
          'Select your coach from the client list',
          'Type your message or attach photos',
          'Send and get a reply within 24 hours'
        ]
      },
      {
        heading: 'What to Share',
        items: [
          'Questions about your meal plan or portions',
          'Changes in how you\'re feeling or symptoms',
          'Photos of meals for coach feedback',
          'Challenges you\'re facing',
          'Updates on your progress and wins'
        ]
      }
    ],
    tips: [
      '💡 Don\'t wait — message your coach about any changes or concerns',
      '💡 Share food photos to get instant feedback on your choices'
    ]
  },
  {
    id: 'meal_plan',
    title: 'Following Your Meal Plan',
    icon: '🍳',
    duration: '4 min',
    description: 'Understand and customize your personalized nutrition plan',
    content: [
      {
        heading: 'Accessing Your Plan',
        items: [
          'Go to "My Meal Plan" from the sidebar',
          'View daily and weekly meal suggestions',
          'See portion sizes and meal timings',
          'Check nutrition info (calories, macros)'
        ]
      },
      {
        heading: 'Personalizing Your Plan',
        items: [
          'Scroll through options for each meal',
          'Message your coach if you don\'t like something',
          'Log what you actually ate in the Food Log',
          'Your coach can adjust based on your preferences'
        ]
      }
    ],
    tips: [
      '💡 Your plan is tailored to your goals — follow it for best results',
      '💡 Don\'t like a meal? Ask your coach for alternatives!'
    ]
  },
  {
    id: 'goals_tracking',
    title: 'Managing Your Goals',
    icon: '🎯',
    duration: '3 min',
    description: 'Set, track, and celebrate your health milestones',
    content: [
      {
        heading: 'Your Goals Include',
        items: [
          'Primary goal (weight loss, gain, muscle building, etc.)',
          'Target weight and timeline',
          'Health-specific goals (blood sugar control, energy, etc.)',
          'Habit goals (consistent water intake, sleep schedule, etc.)'
        ]
      },
      {
        heading: 'How to Stay on Track',
        items: [
          'View goals on your Dashboard',
          'Update values as you progress',
          'Celebrate milestones (every 5% progress is worth celebrating!)',
          'Adjust goals with your coach as you achieve them'
        ]
      }
    ],
    tips: [
      '💡 Break big goals into smaller milestones for motivation',
      '💡 Your coach gets notified when you hit milestones!'
    ]
  }
];

export default function GuidedTutorialFlow({ 
  onComplete, 
  completedSections = [],
  autoProgress = true,
  showProgressBar = true
}) {
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [expandedContent, setExpandedContent] = useState(0);
  const section = GUIDED_TUTORIAL_SECTIONS[currentSectionIdx];
  const isLast = currentSectionIdx === GUIDED_TUTORIAL_SECTIONS.length - 1;
  const progress = ((currentSectionIdx) / GUIDED_TUTORIAL_SECTIONS.length) * 100;

  const handleNext = () => {
    if (isLast) {
      onComplete?.();
    } else {
      setCurrentSectionIdx(prev => prev + 1);
      setExpandedContent(0);
    }
  };

  const handlePrevious = () => {
    if (currentSectionIdx > 0) {
      setCurrentSectionIdx(prev => prev - 1);
      setExpandedContent(0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-4 md:p-8 flex flex-col items-center justify-center">
      <div className="max-w-3xl w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-6 h-6 text-orange-500" />
            <h1 className="text-3xl font-bold text-gray-900">Feature Guide</h1>
          </div>
          <p className="text-gray-600 text-lg">Learn how to use each feature to succeed</p>
        </div>

        {/* Progress Bar */}
        {showProgressBar && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-gray-700">Tutorial Progress</span>
              <span className="text-orange-600 font-bold">
                {currentSectionIdx + 1} of {GUIDED_TUTORIAL_SECTIONS.length}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {/* Navigation Dots */}
        <div className="flex justify-center gap-2 flex-wrap">
          {GUIDED_TUTORIAL_SECTIONS.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setCurrentSectionIdx(i);
                setExpandedContent(0);
              }}
              className={`h-3 rounded-full transition-all ${
                i === currentSectionIdx
                  ? 'w-8 bg-orange-500'
                  : i < currentSectionIdx
                  ? 'w-3 bg-green-500'
                  : 'w-3 bg-gray-300'
              }`}
              title={GUIDED_TUTORIAL_SECTIONS[i].title}
            />
          ))}
        </div>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="shadow-2xl border-0 overflow-hidden">
              {/* Header with Icon */}
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="text-5xl">{section.icon}</div>
                    <div>
                      <h2 className="text-3xl font-bold">{section.title}</h2>
                      <p className="text-white/90 text-lg mt-1">{section.description}</p>
                    </div>
                  </div>
                  <Badge className="bg-white/20 text-white border border-white/40">
                    {section.duration}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-6 md:p-8 space-y-6">
                {/* Content Sections */}
                <div className="space-y-4">
                  {section.content.map((block, idx) => (
                    <div key={idx} className="border-2 border-gray-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedContent(expandedContent === idx ? -1 : idx)}
                        className="w-full p-4 bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <h3 className="font-bold text-lg text-gray-900">{block.heading}</h3>
                        <motion.div
                          animate={{ rotate: expandedContent === idx ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ArrowRight className="w-5 h-5 text-orange-500" />
                        </motion.div>
                      </button>
                      <AnimatePresence>
                        {expandedContent === idx && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white border-t-2 border-gray-200"
                          >
                            <ul className="p-4 space-y-3">
                              {block.items.map((item, itemIdx) => (
                                <li key={itemIdx} className="flex items-start gap-3">
                                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                  <span className="text-gray-700">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>

                {/* Tips */}
                <div className="space-y-2">
                  {section.tips.map((tip, idx) => (
                    <Alert key={idx} className="bg-amber-50 border-amber-200">
                      <Lightbulb className="w-4 h-4 text-amber-600" />
                      <AlertDescription className="text-amber-900 ml-2">
                        {tip}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>

                {/* Call to Action */}
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-blue-900 ml-2">
                    <strong>Next Step:</strong> When you finish this tutorial, you'll see this feature in the app. Come back to this guide anytime from the Help Center.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center gap-3">
          <Button
            onClick={handlePrevious}
            disabled={currentSectionIdx === 0}
            variant="outline"
            className="flex items-center gap-2"
            size="lg"
          >
            ← Previous
          </Button>

          <div className="text-center text-sm text-gray-600">
            {isLast ? (
              <span className="font-semibold">You're almost done! 🎉</span>
            ) : (
              <span>{GUIDED_TUTORIAL_SECTIONS.length - currentSectionIdx - 1} more sections</span>
            )}
          </div>

          <Button
            onClick={handleNext}
            className={`flex items-center gap-2 ${
              isLast
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
            }`}
            size="lg"
          >
            {isLast ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Finish & Go to Dashboard
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500">
          💡 This tutorial is always available in the Help Center for quick reference
        </p>
      </div>
    </div>
  );
}