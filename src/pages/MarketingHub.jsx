import React from "react";
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
  Star
} from "lucide-react";

export default function MarketingHub() {
  const socialMediaTemplates = [
    {
      platform: "Instagram",
      icon: Instagram,
      color: "from-pink-500 to-purple-500",
      templates: [
        "Client transformation posts",
        "Nutrition tips carousel",
        "Recipe reels templates",
        "MPESS wellness quotes",
        "Before/After templates",
        "Testimonial stories"
      ]
    },
    {
      platform: "Facebook",
      icon: Facebook,
      color: "from-blue-500 to-cyan-500",
      templates: [
        "Group engagement posts",
        "Live session announcements",
        "Success story shares",
        "Educational content",
        "Event promotions",
        "Community challenges"
      ]
    },
    {
      platform: "WhatsApp",
      icon: MessageSquare,
      color: "from-green-500 to-emerald-500",
      templates: [
        "Welcome messages",
        "Daily motivation quotes",
        "Meal reminder templates",
        "Progress check-ins",
        "Appointment reminders",
        "Celebration messages"
      ]
    },
    {
      platform: "LinkedIn",
      icon: Linkedin,
      color: "from-blue-600 to-indigo-600",
      templates: [
        "Professional articles",
        "Case study posts",
        "Industry insights",
        "Success metrics",
        "Networking content",
        "Thought leadership"
      ]
    }
  ];

  const emailTemplates = [
    {
      title: "Welcome Email Sequence",
      description: "5-part onboarding series for new clients",
      tags: ["Onboarding", "Automation"]
    },
    {
      title: "Weekly Newsletter",
      description: "Nutrition tips and recipes",
      tags: ["Engagement", "Educational"]
    },
    {
      title: "Progress Check-in",
      description: "Monthly milestone celebration",
      tags: ["Retention", "Motivation"]
    },
    {
      title: "Re-engagement Campaign",
      description: "Win back inactive clients",
      tags: ["Recovery", "Sales"]
    },
    {
      title: "Referral Request",
      description: "Ask satisfied clients for referrals",
      tags: ["Growth", "Word-of-mouth"]
    },
    {
      title: "Special Offer",
      description: "Seasonal promotions",
      tags: ["Sales", "Limited-time"]
    }
  ];

  const contentIdeas = [
    {
      category: "Educational Content",
      icon: FileText,
      ideas: [
        "5 Common Nutrition Myths Debunked",
        "Understanding MPESS Framework",
        "Indian Superfoods Guide",
        "Portion Control Made Easy",
        "Reading Nutrition Labels",
        "Meal Prep 101"
      ]
    },
    {
      category: "Engagement Content",
      icon: Users,
      ideas: [
        "Client Success Stories",
        "Monday Motivation Posts",
        "Recipe of the Week",
        "Q&A Sessions",
        "Polls and Surveys",
        "Challenge Announcements"
      ]
    },
    {
      category: "Sales Content",
      icon: TrendingUp,
      ideas: [
        "Limited-Time Offers",
        "Free Consultation CTA",
        "Transformation Showcases",
        "Service Packages",
        "Early Bird Discounts",
        "Referral Bonuses"
      ]
    },
    {
      category: "Video Content",
      icon: Video,
      ideas: [
        "Quick Recipe Tutorials",
        "Client Testimonials",
        "Day in the Life",
        "Nutrition Tips",
        "Exercise Demos",
        "Behind the Scenes"
      ]
    }
  ];

  const pitchTemplates = [
    {
      title: "Elevator Pitch (30 seconds)",
      content: `"I help busy professionals lose weight and gain energy through personalized Indian meal plans and holistic wellness coaching. My clients see real results in just 90 days without giving up their favorite foods."`
    },
    {
      title: "Social Media Bio",
      content: `🥗 Certified Nutritionist & Health Coach
🇮🇳 Specialist in Indian Nutrition
💪 Helping you achieve your health goals
📍 [Your City]
📞 Book Free Consultation 👇`
    },
    {
      title: "WhatsApp Status",
      content: `🎉 Just helped another client lose 5kg this month!

Want to know their secret? 

It's not about crash diets or giving up your favorite foods.

DM me "TRANSFORM" for a FREE consultation! ✨`
    },
    {
      title: "Client Testimonial Request",
      content: `Hi [Name]! 

I'm so proud of your amazing progress! 🎉

Would you mind sharing a quick testimonial about your experience? It would help me support more people on their health journey.

Just a few sentences about:
- Your starting point
- What you achieved
- How you feel now

Thank you! 🙏`
    }
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
            Marketing Materials for Your Health Coaching Business
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Ready-to-use templates, content ideas, and strategies to grow your practice
          </p>
        </div>

        {/* Social Media Templates */}
        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-3">
              <Share2 className="w-8 h-8 text-orange-600" />
              Social Media Templates
            </CardTitle>
            <CardDescription>Professionally designed templates for all platforms</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {socialMediaTemplates.map((platform) => (
                <Card key={platform.platform} className="border-none shadow-lg hover:shadow-xl transition-all">
                  <CardHeader>
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${platform.color} mx-auto mb-3 flex items-center justify-center`}>
                      <platform.icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-center">{platform.platform}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {platform.templates.map((template, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Star className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{template}</span>
                        </li>
                      ))}
                    </ul>
                    <Button className={`w-full mt-4 bg-gradient-to-r ${platform.color}`}>
                      <Download className="w-4 h-4 mr-2" />
                      Download All
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Email Templates */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-3">
              <Mail className="w-8 h-8 text-blue-600" />
              Email Marketing Templates
            </CardTitle>
            <CardDescription>Proven email sequences that convert</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {emailTemplates.map((template, i) => (
                <Card key={i} className="border-none shadow-lg hover:shadow-xl transition-all bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg">{template.title}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {template.tags.map((tag) => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                    <Button variant="outline" className="w-full">
                      <FileText className="w-4 h-4 mr-2" />
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Content Ideas */}
        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-3">
              <ImageIcon className="w-8 h-8 text-purple-600" />
              Content Ideas Library
            </CardTitle>
            <CardDescription>Never run out of content ideas again</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {contentIdeas.map((category) => (
                <Card key={category.category} className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <category.icon className="w-6 h-6 text-white" />
                      </div>
                      <CardTitle className="text-xl">{category.category}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {category.ideas.map((idea, i) => (
                        <li key={i} className="flex items-start gap-2 p-2 bg-white rounded-lg hover:shadow transition-all">
                          <span className="text-purple-600 font-bold">{i + 1}.</span>
                          <span className="text-gray-700">{idea}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pitch Templates */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-green-600" />
              Pitch & Copy Templates
            </CardTitle>
            <CardDescription>Perfect words for every situation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pitchTemplates.map((template, i) => (
                <Card key={i} className="border-none shadow-lg bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg">{template.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-gray-50 rounded-lg mb-4 font-mono text-sm">
                      {template.content}
                    </div>
                    <Button variant="outline" className="w-full">
                      <Download className="w-4 h-4 mr-2" />
                      Copy to Clipboard
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Marketing Strategy Guide */}
        <Card className="border-none shadow-xl bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white">
          <CardContent className="p-12">
            <h2 className="text-4xl font-bold mb-6">Complete Marketing Strategy Guide</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <h3 className="text-2xl font-bold mb-3">Month 1-2</h3>
                <p className="text-lg opacity-90">Build Your Brand</p>
                <ul className="mt-4 space-y-2 opacity-90">
                  <li>• Create social profiles</li>
                  <li>• Design logo & branding</li>
                  <li>• Build initial content</li>
                  <li>• Launch website</li>
                </ul>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <h3 className="text-2xl font-bold mb-3">Month 3-4</h3>
                <p className="text-lg opacity-90">Grow Your Audience</p>
                <ul className="mt-4 space-y-2 opacity-90">
                  <li>• Post consistently (3x/week)</li>
                  <li>• Run free webinars</li>
                  <li>• Start email list</li>
                  <li>• Collaborate with others</li>
                </ul>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <h3 className="text-2xl font-bold mb-3">Month 5-6</h3>
                <p className="text-lg opacity-90">Scale Your Business</p>
                <ul className="mt-4 space-y-2 opacity-90">
                  <li>• Launch paid ads</li>
                  <li>• Run challenges</li>
                  <li>• Build partnerships</li>
                  <li>• Automate systems</li>
                </ul>
              </div>
            </div>
            <Button size="lg" className="bg-white text-orange-600 hover:bg-gray-100 text-lg px-8">
              <Download className="w-5 h-5 mr-2" />
              Download Full Marketing Playbook
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}