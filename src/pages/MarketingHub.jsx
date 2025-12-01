import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Instagram, 
  Facebook, 
  MessageCircle, 
  Mail, 
  Copy, 
  Sparkles,
  Loader2,
  CheckCircle,
  PlusCircle,
  Lock,
  Crown
} from "lucide-react";
import { useCoachPlanPermissions } from "@/components/permissions/useCoachPlanPermissions";
import { createPageUrl } from "@/utils";

export default function MarketingHub() {
  const { user, canAccessMarketingHub, isLoading: permissionsLoading } = useCoachPlanPermissions();

  // Check access for student_coach
  if (!permissionsLoading && user?.user_type === 'student_coach' && !canAccessMarketingHub) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl bg-gradient-to-br from-pink-50 to-rose-50">
          <CardHeader>
            <Lock className="w-16 h-16 mx-auto text-pink-500 mb-4" />
            <CardTitle className="text-center text-2xl">Feature Not Available</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Marketing Hub is not included in your current plan.
            </p>
            <Alert className="bg-white border-pink-300">
              <Crown className="w-5 h-5 text-pink-600" />
              <AlertDescription>
                Upgrade your plan to access Marketing Hub with templates and AI content creator.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => window.location.href = createPageUrl('CoachSubscriptions')}
              className="w-full bg-gradient-to-r from-pink-500 to-rose-500"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [generating, setGenerating] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('✅ Copied to clipboard!');
  };

  const socialMediaTemplates = [
    {
      category: "Instagram Posts",
      icon: Instagram,
      color: "from-pink-500 to-purple-500",
      templates: [
        {
          title: "Client Transformation Story",
          content: `🌟 TRANSFORMATION TUESDAY 🌟

Meet [Client Name] who:
❌ Struggled with [specific issue]
✅ Achieved [specific result]
⏰ In just [timeframe]

Here's what changed:
📊 Weight: [before] → [after]
💪 Energy: Low → High
😊 Confidence: Restored

Want similar results?
DM "TRANSFORM" to start your journey! 

#HealthTransformation #IndianNutrition #[YourNiche]`
        },
        {
          title: "Educational Tip",
          content: `💡 DID YOU KNOW? 💡

[Interesting health fact about Indian nutrition]

Here's why this matters:
1️⃣ [Benefit 1]
2️⃣ [Benefit 2]
3️⃣ [Benefit 3]

Try this today:
✅ [Simple action step]

Save this post 📌
Share with someone who needs this ❤️

Questions? Comment below! 👇

#HealthTips #Nutrition #WellnessCoach`
        },
        {
          title: "Before/After Post",
          content: `✨ 90-DAY TRANSFORMATION ✨

Swipe to see [Name]'s incredible journey! →

What we worked on:
🍽️ Customized Indian meal plans
🏃‍♀️ Sustainable lifestyle changes  
🧘‍♀️ MPESS holistic approach

Her Results:
📉 Weight: [X] kg lost
📈 Energy: 10x better
😴 Sleep: Improved drastically
💪 Strength: Gained muscle

Ready for YOUR transformation?
Link in bio OR DM "START" 

#Transformation #HealthCoach #MPESS`
        },
        {
          title: "Myth Buster",
          content: `🚫 MYTH VS FACT 🚫

MYTH: [Common misconception]
FACT: [Actual truth]

Why this myth is dangerous:
⚠️ [Consequence 1]
⚠️ [Consequence 2]

What you should do instead:
✅ [Correct approach]
✅ [Action step]

Save this & share with friends! 💫

Drop ❤️ if this helped you!

#HealthMyths #NutritionFacts #HealthCoach`
        },
        {
          title: "Testimonial Highlight",
          content: `💬 CLIENT LOVE 💬

"[Powerful testimonial quote]"
- [Client Name], [Age], [City]

This is why I do what I do! 🙏

Every transformation story fuels my passion to help MORE people achieve their health goals.

Are you next? 🌟
DM me to start your journey!

#ClientLove #Testimonial #HealthCoach`
        },
        {
          title: "Quick Tip Post",
          content: `⚡️ QUICK HEALTH TIP ⚡️

Want to [achieve specific goal]?
Try this simple trick:

🔹 [Tip detail]

When to do it:
⏰ [Best time]

Why it works:
💡 [Scientific reason in simple terms]

Try it today & tag me in your story! 📸

#HealthTips #QuickWin #Wellness`
        },
        {
          title: "Recipe Share",
          content: `🍲 HEALTHY RECIPE ALERT 🍲

[Recipe Name] 
Perfect for [specific goal]!

Ingredients:
• [Item 1]
• [Item 2]
• [Item 3]

How to make:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Nutrition per serving:
🔥 [Calories] kcal
💪 [Protein]g protein
🌾 [Carbs]g carbs

Save this recipe! 📌
Try & share your photo!

#HealthyRecipes #IndianFood #Nutrition`
        }
      ]
    },
    {
      category: "WhatsApp Messages",
      icon: MessageCircle,
      color: "from-green-500 to-emerald-500",
      templates: [
        {
          title: "New Client Welcome",
          content: `🌟 Welcome to [Your Business Name]! 🌟

Hi [Client Name]! 👋

I'm so excited to start this health journey with you!

Here's what happens next:

✅ Check your email for app login details
✅ Complete your profile (takes 2 mins)
✅ Review your personalized meal plan
✅ Our first consultation: [Date & Time]

Got questions? Just reply to this message!

Let's make amazing things happen together! 💪

Regards,
[Your Name]
[Your Business Name]`
        },
        {
          title: "Weekly Check-in",
          content: `Hi [Client Name]! 😊

Hope you're doing great!

Quick check-in:
📊 How's the meal plan working?
💪 Any challenges this week?
🎯 Progress updates?

Remember:
✅ Log your meals daily
✅ Track your progress
✅ Stay hydrated!

Need any adjustments? Let me know!

Keep crushing it! 🌟

[Your Name]`
        },
        {
          title: "Follow-up After Consultation",
          content: `Hi [Client Name]! 

Great talking to you today! 🙏

As discussed:
✅ New meal plan uploaded
✅ [Specific change made]
✅ Next check-in: [Date]

Action items for you:
1. [Action 1]
2. [Action 2]
3. [Action 3]

Questions? I'm just a message away!

You've got this! 💪

[Your Name]`
        },
        {
          title: "Lead Follow-up",
          content: `Hi [Name]! 👋

Thanks for your interest in [Program Name]!

I help people like you:
✅ [Benefit 1]
✅ [Benefit 2]
✅ [Benefit 3]

Next step:
📞 Free 15-min clarity call
🗓️ Pick your slot: [Calendly link]

Or simply reply with "INTERESTED" and I'll send details!

Looking forward to helping you! 🌟

[Your Name]
[Contact]`
        },
        {
          title: "Motivation Message",
          content: `🌟 MONDAY MOTIVATION 🌟

Hi [Name]!

Remember why you started:
💭 [Their specific goal]

This week, let's focus on:
🎯 [Specific action]

Small steps = BIG results!

One healthy choice at a time. You're doing amazing! 💪

Need support? I'm here!

Cheers,
[Your Name]`
        }
      ]
    },
    {
      category: "Email Templates",
      icon: Mail,
      color: "from-blue-500 to-cyan-500",
      templates: [
        {
          title: "Welcome Email",
          content: `Subject: Welcome to [Your Business Name]! 🎉

Hi [Client Name],

I'm thrilled to have you here!

Your personalized health journey starts TODAY.

✅ What's Included:
- Customized Indian meal plans
- Weekly check-ins
- 24/7 support via WhatsApp
- Progress tracking tools
- MPESS holistic wellness

📲 Login to your dashboard:
[App Link]
Email: [Their email]
Password: [Check your email]

📅 Our first call is scheduled for:
[Date & Time]

See you soon!

Warm regards,
[Your Name]
[Your Title]
[Your Business Name]
[Contact Details]`
        },
        {
          title: "Monthly Newsletter",
          content: `Subject: Your Monthly Wellness Newsletter 📰

Hi [Name]!

Here's what's new this month:

🌟 SUCCESS STORY:
[Brief client transformation]

💡 TIP OF THE MONTH:
[Health/nutrition tip]

🍽️ RECIPE:
[Quick healthy recipe]

📅 UPCOMING:
[Webinar/Workshop announcement]

🎁 EXCLUSIVE OFFER:
[Special discount/bonus]

Stay healthy!

[Your Name]
[Your Business Name]`
        },
        {
          title: "Re-engagement Email",
          content: `Subject: We Miss You! Come Back? ❤️

Hi [Name],

I noticed you haven't logged in for a while.

Everything okay?

I'm here to help if you're facing:
• Time management issues
• Motivation challenges
• Difficulty following the plan

Let's get back on track together!

Reply to this email or WhatsApp me at [Number].

Your health goals are still waiting! 🌟

[Your Name]`
        }
      ]
    },
    {
      category: "Reels & Short Videos",
      icon: Instagram,
      color: "from-orange-500 to-red-500",
      templates: [
        {
          title: "Transformation Reel",
          content: `🎬 REEL SCRIPT: TRANSFORMATION 🎬

HOOK (0-3 sec):
"I lost 15 kgs eating ONLY Indian food!"

PROBLEM (3-6 sec):
"I tried every diet - keto, IF, low-carb
Nothing worked because I missed my roti & dal!"

SOLUTION (6-12 sec):
"Then I discovered MPESS nutrition
Ate my favorite foods
Lost weight WITHOUT giving up anything!"

RESULT (12-18 sec):
"15 kgs down ✅
Energy up ✅
Indian food every day ✅"

CTA (18-20 sec):
"Want my method? DM 'INDIAN' 💪"

VISUALS: Before/after photos, meal plates, happy client

#Reels #Transformation #IndianDiet`
        },
        {
          title: "Educational Reel",
          content: `🎬 REEL SCRIPT: HEALTH MYTH 🎬

HOOK (0-3 sec):
"STOP eating [food] for weight loss!"
"Just kidding - here's the TRUTH 👇"

MYTH (3-6 sec):
"Everyone says [food] makes you fat"

FACT (6-12 sec):
"But actually... [scientific fact]
The real problem is [actual issue]"

SOLUTION (12-18 sec):
"Here's how to eat it RIGHT:
✅ [Tip 1]
✅ [Tip 2]
✅ [Tip 3]"

CTA (18-20 sec):
"Save this! Share with a friend!
Follow for more myths busted! 🎯"

VISUALS: Text overlays, food images, reactions

#HealthMyths #NutritionTips #FactCheck`
        },
        {
          title: "Day in the Life",
          content: `🎬 REEL SCRIPT: DAY IN LIFE 🎬

HOOK (0-2 sec):
"What I eat in a day as a health coach"

MORNING (2-6 sec):
6 AM: Warm lemon water
8 AM: [Breakfast] - [calories] kcal

MID-DAY (6-12 sec):
11 AM: [Snack]
1 PM: [Lunch] - [calories] kcal

EVENING (12-18 sec):
4 PM: Green tea + [snack]
7 PM: [Dinner] - [calories] kcal

TOTAL (18-20 sec):
"Total: [X] kcal
100% Indian food! 🇮🇳
DM for your custom plan!"

VISUALS: Food close-ups, eating shots

#WhatIEat #HealthyEating #IndianMeals`
        }
      ]
    }
  ];

  const handleGenerateCustom = async () => {
    if (!customPrompt.trim()) {
      alert('Please enter what you want to create');
      return;
    }

    setGenerating(true);

    try {
      const prompt = `You are a professional marketing content creator for health coaches.

Create engaging marketing content based on this request:
"${customPrompt}"

Make it:
- Compelling and emotionally resonant
- Action-oriented with clear CTAs
- Specific to Indian health coaching market
- Platform-appropriate (Instagram/Facebook/WhatsApp/Email)
- Include emojis and formatting
- Professional yet friendly tone

If it's a social media post, include relevant hashtags.
If it's an email, include subject line.
If it's a reel script, include timestamps and visual suggestions.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            content: { type: "string" },
            tips: { type: "array", items: { type: "string" } }
          }
        }
      });

      setGeneratedContent(response.content);

    } catch (error) {
      console.error(error);
      alert('Error generating content. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <Badge className="bg-gradient-to-r from-pink-500 to-rose-500 text-white text-lg px-6 py-2">
            <Sparkles className="w-5 h-5 mr-2 inline" />
            Marketing Content Hub
          </Badge>
          <h1 className="text-5xl font-bold text-gray-900">Marketing Hub</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Ready-made templates + AI content creator for your health coaching business
          </p>
        </div>

        <Tabs defaultValue="create" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur grid grid-cols-5">
            <TabsTrigger value="create">
              <PlusCircle className="w-4 h-4 mr-2" />
              AI Create
            </TabsTrigger>
            <TabsTrigger value="instagram">
              <Instagram className="w-4 h-4 mr-2" />
              Instagram
            </TabsTrigger>
            <TabsTrigger value="whatsapp">
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="w-4 h-4 mr-2" />
              Email
            </TabsTrigger>
            <TabsTrigger value="reels">
              <Instagram className="w-4 h-4 mr-2" />
              Reels
            </TabsTrigger>
          </TabsList>

          {/* AI CONTENT CREATOR TAB */}
          <TabsContent value="create">
            <Card className="border-none shadow-xl bg-gradient-to-br from-purple-50 to-pink-50">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-purple-500" />
                  AI Content Creator
                </CardTitle>
                <CardDescription>
                  Describe what content you want and AI will create it for you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base font-semibold">What do you want to create?</Label>
                  <Textarea
                    placeholder="Examples:&#10;• Instagram post about thyroid diet tips&#10;• WhatsApp message for new lead follow-up&#10;• Reel script about PCOS weight loss&#10;• Email for client who hasn't logged in&#10;• Facebook post about my signature program"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={6}
                    className="text-base"
                  />
                </div>

                <Button
                  onClick={handleGenerateCustom}
                  disabled={generating}
                  className="w-full h-14 text-lg bg-gradient-to-r from-purple-500 to-indigo-500"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating Your Content...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate Content with AI
                    </>
                  )}
                </Button>

                {generatedContent && (
                  <div className="space-y-4">
                    <Alert className="bg-green-50 border-green-500">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <AlertDescription className="ml-2">
                        <strong>✅ Content Generated!</strong>
                      </AlertDescription>
                    </Alert>

                    <div className="p-6 bg-white rounded-xl border-2 shadow-sm">
                      <pre className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                        {generatedContent}
                      </pre>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={() => copyToClipboard(generatedContent)}
                        className="flex-1 bg-green-500 hover:bg-green-600"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Content
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setGeneratedContent('');
                          setCustomPrompt('');
                        }}
                        className="flex-1"
                      >
                        Create New
                      </Button>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">💡 Quick Ideas:</h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Instagram post about PCOS diet",
                      "WhatsApp welcome message",
                      "Email for inactive clients",
                      "Reel script about weight loss",
                      "Facebook ad for free webinar"
                    ].map((idea, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="cursor-pointer hover:bg-blue-100 transition-colors"
                        onClick={() => setCustomPrompt(idea)}
                      >
                        {idea}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* EXISTING TEMPLATES TABS */}
          {socialMediaTemplates.map((category) => (
            <TabsContent 
              key={category.category} 
              value={category.category.toLowerCase().split(' ')[0]}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {category.templates.map((template, idx) => (
                  <Card key={idx} className="border-none shadow-lg bg-white/80 backdrop-blur hover:shadow-xl transition-all">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center`}>
                            <category.icon className="w-6 h-6 text-white" />
                          </div>
                          <CardTitle className="text-xl">{template.title}</CardTitle>
                        </div>
                        <Badge className={`bg-gradient-to-r ${category.color} text-white`}>
                          {category.category}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-lg border max-h-64 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                          {template.content}
                        </pre>
                      </div>

                      <Button
                        onClick={() => copyToClipboard(template.content)}
                        className={`w-full bg-gradient-to-r ${category.color} hover:opacity-90`}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Tips Card */}
        <Card className="border-2 border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <Sparkles className="w-6 h-6" />
              Pro Marketing Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-700">
            <p>✅ <strong>Consistency:</strong> Post 1-2 times daily on Instagram</p>
            <p>✅ <strong>Engagement:</strong> Reply to ALL comments within 1 hour</p>
            <p>✅ <strong>Stories:</strong> Share client wins, behind-the-scenes, tips daily</p>
            <p>✅ <strong>CTAs:</strong> Always have clear next step (DM, Link, Comment)</p>
            <p>✅ <strong>Authenticity:</strong> Share YOUR journey and struggles</p>
            <p>✅ <strong>Value First:</strong> 80% education, 20% selling</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}