import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sparkles,
  Target,
  FileText,
  Megaphone,
  TrendingUp,
  Lightbulb,
  Rocket,
  Crown,
  Loader2,
  Copy,
  CheckCircle2,
  ArrowRight
} from "lucide-react";

export default function BusinessGPTs() {
  const [activeGPT, setActiveGPT] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState({});
  const [output, setOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const userType = user?.user_type || 'team_member';
  const hasAdvancedAccess = ['super_admin', 'student_coach'].includes(userType);

  const basicGPTs = [
    {
      id: 'niche_finder',
      title: 'Niche Finder',
      description: 'Find your profitable health coaching niche',
      icon: Target,
      color: 'from-blue-500 to-cyan-500',
      questions: [
        {
          id: 'background',
          label: 'What is your background?',
          type: 'textarea',
          placeholder: 'E.g., I am a certified nutritionist with 5 years experience...'
        },
        {
          id: 'certifications',
          label: 'What certifications do you have?',
          type: 'textarea',
          placeholder: 'E.g., PCOS specialist, Diabetes educator, Sports nutrition...'
        },
        {
          id: 'interests',
          label: 'What health topics interest you most?',
          type: 'select',
          options: ['Weight Loss', 'PCOS', 'Diabetes', 'Thyroid', 'Pregnancy Nutrition', 'Kids Nutrition', 'Sports Nutrition', 'Gut Health', 'Other'],
          multiple: true
        },
        {
          id: 'location',
          label: 'Where are you based?',
          type: 'text',
          placeholder: 'E.g., Mumbai, India'
        },
        {
          id: 'target_audience',
          label: 'Who do you want to work with?',
          type: 'select',
          options: ['Working Women', 'New Mothers', 'Men 30-45', 'Teenagers', 'Athletes', 'Senior Citizens', 'Anyone'],
        },
        {
          id: 'experience',
          label: 'Any specific experience or success stories?',
          type: 'textarea',
          placeholder: 'E.g., I helped 50 women reverse PCOS naturally...'
        }
      ],
      generatePrompt: (answers) => `You are an expert health coaching business consultant specializing in the Indian market.

Based on this profile:
- Background: ${answers.background}
- Certifications: ${answers.certifications}
- Interests: ${answers.interests}
- Location: ${answers.location}
- Target Audience: ${answers.target_audience}
- Experience: ${answers.experience}

Suggest 5 SPECIFIC, PROFITABLE health coaching niches they should focus on.

For each niche, provide:
1. Niche Name (catchy and clear)
2. Exact Target Audience (be specific)
3. Why it's profitable in India (market size, demand, trends)
4. Their Competitive Advantage (based on their profile)
5. Pricing Potential (₹ range for 3-month program)
6. Quick Start Action Steps (3-5 actionable steps)

Format with clear headers and emojis for readability.`
    },
    {
      id: 'program_creator',
      title: 'Program Builder',
      description: 'Create structured coaching programs',
      icon: FileText,
      color: 'from-purple-500 to-pink-500',
      questions: [
        {
          id: 'program_goal',
          label: 'What is the main goal of your program?',
          type: 'text',
          placeholder: 'E.g., 3-month PCOS reversal'
        },
        {
          id: 'target_client',
          label: 'Who is this program for?',
          type: 'textarea',
          placeholder: 'E.g., Working women aged 25-40 with PCOS, struggling with irregular periods and weight gain...'
        },
        {
          id: 'duration',
          label: 'Program Duration',
          type: 'select',
          options: ['1 month', '2 months', '3 months', '6 months', '1 year', 'Ongoing']
        },
        {
          id: 'delivery_mode',
          label: 'How will you deliver this program?',
          type: 'select',
          options: ['1-on-1 coaching', 'Group coaching', 'Self-paced online', 'Hybrid (1-on-1 + group)'],
        },
        {
          id: 'budget',
          label: 'What price range are you targeting?',
          type: 'select',
          options: ['Budget (₹3,000-5,000)', 'Mid-range (₹8,000-15,000)', 'Premium (₹20,000-50,000)', 'Luxury (₹50,000+)']
        },
        {
          id: 'unique_feature',
          label: 'What makes your program unique?',
          type: 'textarea',
          placeholder: 'E.g., Includes personalized meal plans, weekly group calls, 24/7 WhatsApp support...'
        }
      ],
      generatePrompt: (answers) => `You are an expert at creating health coaching programs.

Create a complete coaching program based on:
- Goal: ${answers.program_goal}
- Target Client: ${answers.target_client}
- Duration: ${answers.duration}
- Delivery: ${answers.delivery_mode}
- Price Range: ${answers.budget}
- Unique Feature: ${answers.unique_feature}

Provide a COMPLETE program outline including:

1. PROGRAM NAME (catchy, benefit-focused, memorable)

2. TARGET AUDIENCE (be extremely specific)

3. PROGRAM STRUCTURE (week-by-week breakdown)
   - What happens each week
   - Key milestones
   - Deliverables

4. WHAT'S INCLUDED (detailed list)
   - Number of consultations
   - Meal plans included
   - Support channels
   - Bonus materials
   - Guarantees

5. PRICING STRATEGY (3 tiers)
   - Basic Tier: What's included + price
   - Standard Tier: What's included + price
   - Premium Tier: What's included + price

6. UNIQUE SELLING POINTS (5-7 points)
   What makes this program irresistible?

7. MARKETING ANGLE (how to sell it)
   - Main headline
   - Pain points it solves
   - Transformation promise
   - Social proof needed

8. SUCCESS METRICS (how you measure results)

Format professionally with clear sections and emojis.`
    },
    {
      id: 'content_ideas',
      title: 'Content Generator',
      description: 'Get 30 days of social media content ideas',
      icon: Lightbulb,
      color: 'from-orange-500 to-red-500',
      questions: [
        {
          id: 'niche',
          label: 'What is your niche/focus area?',
          type: 'text',
          placeholder: 'E.g., PCOS management for working women'
        },
        {
          id: 'platform',
          label: 'Which platform?',
          type: 'select',
          options: ['Instagram', 'Facebook', 'LinkedIn', 'YouTube', 'All Platforms']
        },
        {
          id: 'content_style',
          label: 'What content style do you prefer?',
          type: 'select',
          options: ['Educational', 'Motivational', 'Personal Stories', 'Mixed']
        },
        {
          id: 'audience_language',
          label: 'Audience language preference?',
          type: 'select',
          options: ['Hindi', 'English', 'Hinglish (Mix)', 'Regional (specify)']
        },
        {
          id: 'current_followers',
          label: 'Current follower count (approx)',
          type: 'select',
          options: ['0-100', '100-1000', '1000-5000', '5000-10000', '10000+']
        }
      ],
      generatePrompt: (answers) => `You are a social media content strategist for health coaches in India.

Create a 30-day content calendar for:
- Niche: ${answers.niche}
- Platform: ${answers.platform}
- Style: ${answers.content_style}
- Language: ${answers.audience_language}
- Current Following: ${answers.current_followers}

Create 30 posts (one per day) including:

FOR EACH POST PROVIDE:
1. Day Number
2. Post Type (Educational/Engagement/Transformation/Recipe/Tip/Quote/Story)
3. Content Idea (what to post about)
4. Caption Hook (first line to grab attention)
5. Content Outline (3-5 bullet points)
6. Call-to-Action (what you want them to do)
7. Hashtags (5-10 relevant hashtags)

MIX OF:
- 40% Educational posts (nutrition facts, myths vs facts, how-to)
- 20% Engagement posts (polls, questions, quizzes, fill in the blanks)
- 15% Transformation stories (client success, before/after templates)
- 15% Value posts (recipes, tips, hacks, checklists)
- 10% Call-to-action posts (book call, DM for plan, limited offer)

Make it SPECIFIC to Indian audience and their niche.
Use Indian examples, foods, festivals, and cultural context.

Format: Day X: [Type] - [Idea] - [Hook]`
    },
    {
      id: 'lead_strategy',
      title: 'Lead Generation Strategy',
      description: 'Get a complete lead generation plan',
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-500',
      questions: [
        {
          id: 'business_desc',
          label: 'Describe your coaching business',
          type: 'textarea',
          placeholder: 'E.g., I help women with PCOS lose weight naturally through personalized nutrition...'
        },
        {
          id: 'ideal_client',
          label: 'Describe your ideal client in detail',
          type: 'textarea',
          placeholder: 'E.g., Women aged 25-40, working professionals, living in metro cities, struggling with PCOS and weight gain, earning ₹5L+ per year...'
        },
        {
          id: 'budget',
          label: 'Monthly marketing budget',
          type: 'select',
          options: ['₹0 (Organic only)', '₹1,000-5,000', '₹5,000-10,000', '₹10,000-25,000', '₹25,000+']
        },
        {
          id: 'current_clients',
          label: 'How many clients do you have currently?',
          type: 'select',
          options: ['0-5', '5-10', '10-20', '20-50', '50+']
        },
        {
          id: 'time_available',
          label: 'Time you can spend on marketing daily',
          type: 'select',
          options: ['30 minutes', '1 hour', '2 hours', '3+ hours']
        }
      ],
      generatePrompt: (answers) => `You are a lead generation expert for health coaching businesses in India.

Create a complete lead generation strategy for:
- Business: ${answers.business_desc}
- Ideal Client: ${answers.ideal_client}
- Budget: ${answers.budget}
- Current Clients: ${answers.current_clients}
- Time Available: ${answers.time_available}

Provide:

1. LEAD MAGNET IDEAS (3 options to choose from)
   - What to offer for free
   - Why it will work
   - How to create it quickly

2. WHERE TO FIND IDEAL CLIENTS (specific platforms, groups, communities)
   - Online platforms (specific Facebook groups, Instagram hashtags)
   - Offline opportunities (events, meetups, collaborations)
   - Local strategies (gyms, clinics, corporate wellness)

3. ORGANIC STRATEGIES (no paid ads needed)
   - Daily action items
   - Content strategy
   - Engagement tactics
   - Collaboration ideas
   - Referral system

4. COLLABORATION OPPORTUNITIES (5-10 specific ideas)
   - Who to partner with
   - Win-win proposals
   - How to approach them

5. REFERRAL PROGRAM STRUCTURE
   - What to offer existing clients
   - How to ask for referrals
   - Incentive structure

6. WEEKLY ACTION PLAN (exactly what to do each week)
   Week 1: [Specific tasks]
   Week 2: [Specific tasks]
   Week 3: [Specific tasks]
   Week 4: [Specific tasks]

7. METRICS TO TRACK
   - What to measure
   - How to know it's working
   - When to adjust

Be SPECIFIC to Indian market and their niche. Give actionable steps, not generic advice.`
    },
  ];

  const advancedGPTs = [
    {
      id: 'landing_page',
      title: 'Landing Page Writer',
      description: 'Complete landing page copy that converts',
      icon: Rocket,
      color: 'from-yellow-500 to-orange-500',
      questions: [
        {
          id: 'program_name',
          label: 'Program/Service Name',
          type: 'text',
          placeholder: 'E.g., PCOS Freedom Program'
        },
        {
          id: 'main_benefit',
          label: 'Main benefit/transformation',
          type: 'text',
          placeholder: 'E.g., Reverse PCOS naturally in 90 days without medication'
        },
        {
          id: 'target_audience',
          label: 'Target Audience (be specific)',
          type: 'textarea',
          placeholder: 'E.g., Working women aged 25-40 with PCOS, struggling with weight gain, irregular periods, and low energy...'
        },
        {
          id: 'pain_points',
          label: 'Top 3 pain points your audience faces',
          type: 'textarea',
          placeholder: 'One per line:\n- Can\'t lose weight despite trying everything\n- Irregular periods affecting fertility\n- Constant fatigue and mood swings'
        },
        {
          id: 'what_included',
          label: 'What\'s included in your program?',
          type: 'textarea',
          placeholder: 'E.g., Personalized meal plans, weekly check-ins, 24/7 WhatsApp support, MPESS wellness tracking, recipe guide...'
        },
        {
          id: 'price',
          label: 'Price',
          type: 'text',
          placeholder: 'E.g., ₹15,000 for 3 months'
        },
        {
          id: 'guarantee',
          label: 'Do you offer a guarantee?',
          type: 'textarea',
          placeholder: 'E.g., Yes - if you follow the plan 90% and don\'t see results, full refund'
        }
      ],
      generatePrompt: (answers) => `You are a conversion copywriter expert for health coaching in India.

Write a COMPLETE landing page copy for:
- Program: ${answers.program_name}
- Main Benefit: ${answers.main_benefit}
- Target: ${answers.target_audience}
- Pain Points: ${answers.pain_points}
- Included: ${answers.what_included}
- Price: ${answers.price}
- Guarantee: ${answers.guarantee}

Create a landing page with these sections:

1. HEADLINE (attention-grabbing, benefit-focused)

2. SUBHEADLINE (clear promise)

3. PROBLEM SECTION (paint the picture of their struggles)
   - Use their language
   - Make them feel understood
   - 3-5 pain points

4. SOLUTION SECTION (introduce your program)
   - How it solves each problem
   - Why it works
   - What makes it different

5. HOW IT WORKS (3-5 step simple process)
   Step 1: [What happens]
   Step 2: [What happens]
   Etc.

6. WHAT'S INCLUDED (detailed bullet list)
   Make it feel valuable and comprehensive

7. TRANSFORMATION PROMISE (before vs after)
   Before: [Current state]
   After: [Desired state]

8. SOCIAL PROOF TEMPLATE (what testimonials to collect)
   - What format
   - What to highlight
   - How to display

9. PRICING SECTION (3 tiers with value stacking)
   Basic: ₹X - [What's included]
   Standard: ₹Y - [What's included + bonuses]
   Premium: ₹Z - [Everything + VIP benefits]

10. FAQ (Top 7-10 questions)
    Address objections preemptively

11. STRONG CTA (Multiple variations)
    - Main CTA (above fold)
    - Mid-page CTA
    - Final CTA (bottom)
    - Urgency/scarcity element

Use Indian context, relatable language, and emotional triggers.
Format professionally with clear section headers.`
    },
  ];

  const allGPTs = [...basicGPTs, ...(hasAdvancedAccess ? advancedGPTs : [])];

  const handleStartGPT = (gpt) => {
    setActiveGPT(gpt);
    setCurrentStep(1);
    setAnswers({});
    setOutput('');
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setOutput('');

    try {
      const prompt = activeGPT.generatePrompt(answers);
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
      });

      setOutput(response);
      setCurrentStep(activeGPT.questions.length + 1);
    } catch (error) {
      setOutput('Error generating content. Please try again.');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  };

  const currentQuestion = activeGPT?.questions[currentStep - 1];
  const isLastQuestion = currentStep === activeGPT?.questions.length;
  const canProceed = currentQuestion && answers[currentQuestion.id];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        {!activeGPT && (
          <>
            <div className="text-center space-y-4">
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg px-6 py-2">
                <Sparkles className="w-5 h-5 mr-2 inline" />
                Business GPT Tools
              </Badge>
              <h1 className="text-5xl font-bold text-gray-900">
                AI-Powered Business Building
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Answer simple questions, get expert business strategies
              </p>
            </div>

            {/* Tool Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {allGPTs.map((gpt) => (
                <Card key={gpt.id} className="border-none shadow-xl hover:shadow-2xl transition-all cursor-pointer" onClick={() => handleStartGPT(gpt)}>
                  <CardHeader>
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gpt.color} mx-auto mb-3 flex items-center justify-center shadow-lg`}>
                      <gpt.icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-center text-2xl">{gpt.title}</CardTitle>
                    <CardDescription className="text-center">{gpt.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-500">
                      Start <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Question Flow */}
        {activeGPT && !output && (
          <Card className="border-none shadow-2xl max-w-3xl mx-auto">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" onClick={() => setActiveGPT(null)}>
                  ← Back
                </Button>
                <Badge className="bg-blue-500 text-white">
                  Question {currentStep} of {activeGPT.questions.length}
                </Badge>
              </div>
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${activeGPT.color} mx-auto mb-3 flex items-center justify-center shadow-lg`}>
                <activeGPT.icon className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-center text-3xl">{activeGPT.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentQuestion && (
                <div className="space-y-4">
                  <Label className="text-xl font-semibold">{currentQuestion.label}</Label>
                  
                  {currentQuestion.type === 'text' && (
                    <Input
                      placeholder={currentQuestion.placeholder}
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      className="text-lg p-6"
                    />
                  )}

                  {currentQuestion.type === 'textarea' && (
                    <Textarea
                      placeholder={currentQuestion.placeholder}
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      rows={6}
                      className="text-lg p-4"
                    />
                  )}

                  {currentQuestion.type === 'select' && (
                    <Select
                      value={answers[currentQuestion.id] || ''}
                      onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                    >
                      <SelectTrigger className="text-lg p-6">
                        <SelectValue placeholder="Select an option..." />
                      </SelectTrigger>
                      <SelectContent>
                        {currentQuestion.options.map((option) => (
                          <SelectItem key={option} value={option} className="text-lg">
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              <div className="flex gap-4">
                {currentStep > 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="flex-1"
                  >
                    Previous
                  </Button>
                )}
                
                {!isLastQuestion ? (
                  <Button
                    onClick={() => setCurrentStep(currentStep + 1)}
                    disabled={!canProceed}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500"
                  >
                    Next <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleGenerate}
                    disabled={!canProceed || isGenerating}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-lg py-6"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Generate Strategy
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Progress Indicator */}
              <div className="flex gap-2 justify-center">
                {activeGPT.questions.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 w-8 rounded-full ${
                      index + 1 === currentStep
                        ? 'bg-blue-500'
                        : index + 1 < currentStep
                        ? 'bg-green-500'
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Output Section */}
        {output && (
          <Card className="border-none shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Your Custom Strategy</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={copyOutput}
                    className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                  >
                    {copiedOutput ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy All
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveGPT(null);
                      setOutput('');
                      setAnswers({});
                      setCurrentStep(1);
                    }}
                    className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                  >
                    Start New
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap bg-gray-50 p-6 rounded-lg border border-gray-200 text-sm leading-relaxed">
                  {output}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}