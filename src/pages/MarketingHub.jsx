import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Share2,
  Download,
  Mail,
  MessageSquare,
  Instagram,
  Facebook,
  Linkedin,
  FileText,
  Video,
  Image as ImageIcon,
  Megaphone,
  TrendingUp,
  Users,
  Star,
  Copy,
  CheckCircle
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function MarketingHub() {
  const [copiedIndex, setCopiedIndex] = React.useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const userType = user?.user_type || 'team_admin';
  const isStudentCoach = userType === 'student_coach';

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const socialMediaTemplates = [
    {
      platform: "Instagram",
      icon: Instagram,
      color: "from-pink-500 to-purple-500",
      templates: [
        {
          title: "Client Transformation Post",
          content: "🎉 Another amazing transformation!\n\n✅ Lost 8kg in 60 days\n✅ Improved energy levels\n✅ Better sleep quality\n\nNo crash diets. No starving.\nJust sustainable Indian nutrition! 💪\n\nReady for your transformation?\nDM \"TRANSFORM\" to start!\n\n#WeightLoss #IndianNutrition #Transformation"
        },
        {
          title: "Monday Motivation",
          content: "🌟 New Week, New Goals!\n\nRemember:\n• Small steps lead to big changes\n• Consistency > Perfection\n• You're stronger than you think\n\nLet's crush this week together! 💪\n\n#MondayMotivation #HealthGoals #Wellness"
        },
        {
          title: "Recipe Share",
          content: "🥗 Healthy Recipe Alert!\n\nTrying my High-Protein Moong Dal Cheela:\n📌 12g protein per serving\n📌 Only 180 calories\n📌 Ready in 15 minutes\n\nSave this for your next breakfast!\nRecipe in bio 👆\n\n#HealthyRecipes #IndianFood #HighProtein"
        }
      ]
    },
    {
      platform: "WhatsApp Status",
      icon: MessageSquare,
      color: "from-green-500 to-emerald-500",
      templates: [
        {
          title: "Daily Tip",
          content: "💡 Today's Nutrition Tip:\n\nDrink water 30 minutes before meals.\n\nWhy?\n✓ Better digestion\n✓ Controls portions\n✓ Boosts metabolism\n\nTry it today! 💧"
        },
        {
          title: "Client Win",
          content: "🎊 Client Update!\n\nPriya lost 3kg this month!\n\nHer secret?\n→ Following her meal plan\n→ Daily 30min walk\n→ Tracking progress\n\nYou can do it too! 💪\nDM for consultation"
        },
        {
          title: "Limited Offer",
          content: "🔥 SPECIAL OFFER 🔥\n\nFirst 5 people get:\n✅ Free consultation\n✅ Personalized meal plan\n✅ 24/7 support\n\nOnly 2 spots left!\nMessage NOW ⚡"
        }
      ]
    },
    {
      platform: "Facebook",
      icon: Facebook,
      color: "from-blue-500 to-cyan-500",
      templates: [
        {
          title: "Weekly Tips Post",
          content: "📚 5 Tips for Healthy Indian Eating:\n\n1️⃣ Replace white rice with brown rice\n2️⃣ Add dal/legumes to every meal\n3️⃣ Use ghee instead of refined oil\n4️⃣ Eat seasonal vegetables\n5️⃣ Stay hydrated (8-10 glasses)\n\nWhich tip will you start with? Comment below! 👇"
        },
        {
          title: "Live Session Announcement",
          content: "🔴 LIVE SESSION THIS SATURDAY!\n\n📅 Date: This Saturday, 6 PM\n📍 Topic: \"How to Lose Weight with Indian Food\"\n🎁 Bonus: Free meal plan PDF\n\nSet reminder and join live!\nFree for everyone! 🎉"
        }
      ]
    }
  ];

  const emailTemplates = [
    {
      title: "Welcome Email",
      subject: "Welcome to Your Health Journey! 🎉",
      body: `Hi [Client Name],

Welcome to my nutrition coaching program! I'm so excited to work with you.

🎯 Here's what happens next:
1. Complete your health assessment
2. Receive your personalized meal plan
3. Start seeing results in 2 weeks!

📱 Save my number: [Your Number]
💬 WhatsApp me anytime for support

Let's crush your goals together! 💪

Best regards,
[Your Name]
Certified Nutritionist`
    },
    {
      title: "Weekly Check-in",
      subject: "Your Weekly Progress Check-in 📊",
      body: `Hi [Client Name],

How was your week? Let's track your progress!

Please share:
✓ Current weight
✓ How you're feeling (energy, sleep, mood)
✓ Any challenges faced
✓ Wins & celebrations!

Remember: Progress isn't always about the scale. 
Non-scale victories matter too! 🌟

Reply to this email or WhatsApp me.

Cheers,
[Your Name]`
    },
    {
      title: "Referral Request",
      subject: "Help Your Friends Get Healthy Too! 💚",
      body: `Hi [Client Name],

I'm so proud of your progress! You've been doing amazing! 🎉

I have a small favor to ask:

Do you know anyone who might benefit from my nutrition coaching?

For every friend you refer:
🎁 They get 20% off their first month
🎁 You get 1 free consultation session

Just have them mention your name when they contact me!

Thank you for trusting me with your health journey!

Best,
[Your Name]`
    }
  ];

  const contentIdeas = [
    {
      category: "Educational (Post 2x/week)",
      ideas: [
        "Myth vs Fact: Common nutrition misconceptions",
        "Protein-rich Indian foods for vegetarians",
        "How to read nutrition labels",
        "Best foods for PCOS/thyroid/diabetes",
        "Portion control guide for Indian meals",
        "Healthy alternatives for your favorite foods"
      ]
    },
    {
      category: "Engagement (Post 3x/week)",
      ideas: [
        "Before/After client transformations",
        "Quick poll: What's your biggest challenge?",
        "Recipe of the week with demo",
        "Q&A sessions (answer follower questions)",
        "This or That food choices",
        "Share your meal prep Sunday photos"
      ]
    },
    {
      category: "Promotional (Post 1x/week)",
      ideas: [
        "Limited slots available announcement",
        "Special offer this week only",
        "Free consultation day",
        "Testimonial compilation video",
        "Success story spotlight",
        "New program launch"
      ]
    }
  ];

  const contentCalendar = [
    { day: "Monday", post: "Motivation + Transformation", time: "9 AM" },
    { day: "Tuesday", post: "Educational Tip", time: "12 PM" },
    { day: "Wednesday", post: "Recipe/Meal Prep", time: "6 PM" },
    { day: "Thursday", post: "Client Success Story", time: "10 AM" },
    { day: "Friday", post: "Weekend Challenge/Poll", time: "7 PM" },
    { day: "Saturday", post: "Q&A or Live Session", time: "6 PM" },
    { day: "Sunday", post: "Week Recap + Next Week Goals", time: "8 AM" }
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-lg px-6 py-2">
            <Megaphone className="w-5 h-5 mr-2 inline" />
            Marketing Hub
          </Badge>
          <h1 className="text-5xl font-bold text-gray-900">
            {isStudentCoach ? 'Grow Your Health Coaching Business' : 'Marketing Materials & Strategies'}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {isStudentCoach 
              ? 'Everything you need to attract clients and build your practice'
              : 'Ready-to-use templates and content for your marketing efforts'
            }
          </p>
        </div>

        {isStudentCoach && (
          <Alert className="border-blue-500 bg-blue-50">
            <Star className="w-5 h-5 text-blue-600" />
            <AlertDescription className="text-gray-800">
              <strong>🎓 For Student Coaches:</strong> Use these templates to market YOUR services with YOUR brand name. 
              Customize them with your business name, contact details, and unique offerings!
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="social" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur grid grid-cols-4 w-full">
            <TabsTrigger value="social">Social Media</TabsTrigger>
            <TabsTrigger value="email">Email Templates</TabsTrigger>
            <TabsTrigger value="content">Content Ideas</TabsTrigger>
            <TabsTrigger value="calendar">Content Calendar</TabsTrigger>
          </TabsList>

          {/* Social Media Templates */}
          <TabsContent value="social" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {socialMediaTemplates.map((platform, platformIndex) => (
                <Card key={platformIndex} className="border-none shadow-xl">
                  <CardHeader>
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${platform.color} mx-auto mb-3 flex items-center justify-center shadow-lg`}>
                      <platform.icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-center text-2xl">{platform.platform}</CardTitle>
                    <CardDescription className="text-center">{platform.templates.length} ready-to-use templates</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {platform.templates.map((template, idx) => {
                      const templateIndex = `${platformIndex}-${idx}`;
                      return (
                        <Card key={idx} className="border border-gray-200">
                          <CardHeader>
                            <CardTitle className="text-sm font-semibold">{template.title}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="bg-gray-50 p-3 rounded-lg mb-3 font-mono text-xs whitespace-pre-line">
                              {template.content}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => copyToClipboard(template.content, templateIndex)}
                            >
                              {copiedIndex === templateIndex ? (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4 mr-2" />
                                  Copy Text
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Email Templates */}
          <TabsContent value="email" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {emailTemplates.map((template, idx) => (
                <Card key={idx} className="border-none shadow-xl">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-2xl">{template.title}</CardTitle>
                        <CardDescription className="text-lg mt-1">Subject: {template.subject}</CardDescription>
                      </div>
                      <Mail className="w-10 h-10 text-blue-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 p-6 rounded-lg mb-4 font-mono text-sm whitespace-pre-line border border-gray-200">
                      {template.body}
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => copyToClipboard(template.body, `email-${idx}`)}
                      >
                        {copiedIndex === `email-${idx}` ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Body
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => copyToClipboard(template.subject, `subject-${idx}`)}
                      >
                        {copiedIndex === `subject-${idx}` ? 'Copied!' : 'Copy Subject'}
                      </Button>
                    </div>
                    <Alert className="mt-4 border-orange-200 bg-orange-50">
                      <AlertDescription className="text-sm">
                        💡 <strong>Tip:</strong> Replace [Client Name], [Your Name], and [Your Number] with actual details before sending!
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Content Ideas */}
          <TabsContent value="content" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {contentIdeas.map((category, idx) => (
                <Card key={idx} className="border-none shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-xl">{category.category}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {category.ideas.map((idea, i) => (
                        <li key={i} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <Badge variant="outline" className="mt-0.5">{i + 1}</Badge>
                          <span className="text-sm text-gray-700">{idea}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Content Calendar */}
          <TabsContent value="calendar" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-3xl">Weekly Content Calendar</CardTitle>
                <CardDescription>Consistent posting schedule for maximum engagement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {contentCalendar.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="w-24">
                        <Badge className="bg-orange-500 text-white text-sm">{item.day}</Badge>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{item.post}</p>
                      </div>
                      <div>
                        <Badge variant="outline">{item.time}</Badge>
                      </div>
                    </div>
                  ))}
                </div>

                <Alert className="mt-6 border-blue-500 bg-blue-50">
                  <AlertDescription>
                    <strong>📌 Pro Tip:</strong> Post consistently at the same times each day. Your audience will expect your content and engagement will increase!
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Quick Action Guide */}
            <Card className="border-none shadow-xl bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader>
                <CardTitle className="text-2xl">Quick Start: First Week Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-lg">
                    <h4 className="font-bold mb-2">✅ Day 1: Introduction Post</h4>
                    <p className="text-sm text-gray-700">Introduce yourself, your qualifications, and what you do. Share your story!</p>
                  </div>
                  <div className="p-4 bg-white rounded-lg">
                    <h4 className="font-bold mb-2">✅ Day 2: Educational Content</h4>
                    <p className="text-sm text-gray-700">Share a nutrition myth vs fact. Make it relatable to Indian eating habits.</p>
                  </div>
                  <div className="p-4 bg-white rounded-lg">
                    <h4 className="font-bold mb-2">✅ Day 3: Recipe Share</h4>
                    <p className="text-sm text-gray-700">Post a simple healthy Indian recipe with macros. Make it visually appealing!</p>
                  </div>
                  <div className="p-4 bg-white rounded-lg">
                    <h4 className="font-bold mb-2">✅ Day 4: Engagement Post</h4>
                    <p className="text-sm text-gray-700">Ask a question or run a poll. "What's your biggest nutrition challenge?"</p>
                  </div>
                  <div className="p-4 bg-white rounded-lg">
                    <h4 className="font-bold mb-2">✅ Day 5: Transformation (If Available)</h4>
                    <p className="text-sm text-gray-700">Share a success story or your own journey. Inspire your audience!</p>
                  </div>
                  <div className="p-4 bg-white rounded-lg">
                    <h4 className="font-bold mb-2">✅ Day 6: Live/Q&A</h4>
                    <p className="text-sm text-gray-700">Go live or do a Q&A in stories. Build connection with followers.</p>
                  </div>
                  <div className="p-4 bg-white rounded-lg">
                    <h4 className="font-bold mb-2">✅ Day 7: Call-to-Action</h4>
                    <p className="text-sm text-gray-700">Soft sell your services. "DM for free consultation" or "Limited slots open"</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* CTA for Students */}
        {isStudentCoach && (
          <Card className="border-none shadow-2xl bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white">
            <CardContent className="p-12 text-center">
              <h2 className="text-4xl font-bold mb-4">Ready to Grow Your Practice?</h2>
              <p className="text-xl mb-8 opacity-90">
                Use these templates, stay consistent, and watch your client base grow! 🚀
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Button size="lg" className="bg-white text-orange-600 hover:bg-gray-100 text-lg px-8">
                  <Download className="w-5 h-5 mr-2" />
                  Download All Templates
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}