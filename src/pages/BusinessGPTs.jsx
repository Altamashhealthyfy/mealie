import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  CheckCircle2
} from "lucide-react";

export default function BusinessGPTs() {
  const [activeGPT, setActiveGPT] = useState(null);
  const [input, setInput] = useState("");
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
      prompt: (input) => `You are an expert health coaching business consultant specializing in the Indian market.

User input: ${input}

Based on their background, interests, and local market, suggest 5 profitable health coaching niches they could focus on.

For each niche, provide:
1. Niche name
2. Target audience
3. Why it's profitable in India
4. Competitive advantage
5. Pricing potential (₹)
6. Quick start action steps

Format as clear sections with emojis for readability.`,
      placeholder: "Tell me about your background, certifications, interests, and location. E.g., 'I'm a nutritionist in Mumbai, interested in women's health, certified in PCOS management'"
    },
    {
      id: 'program_creator',
      title: 'Program Builder',
      description: 'Create structured coaching programs',
      icon: FileText,
      color: 'from-purple-500 to-pink-500',
      prompt: (input) => `You are an expert at creating health coaching programs.

User wants to create: ${input}

Create a complete coaching program outline including:
1. Program name (catchy and clear)
2. Target audience
3. Duration and structure (weeks/modules)
4. What's included (consultations, meal plans, support)
5. Deliverables for clients
6. Pricing strategy (with 3 tiers)
7. Unique selling points
8. Marketing angle

Format professionally with clear sections.`,
      placeholder: "Describe the program you want to create. E.g., '3-month PCOS reversal program for working women'"
    },
    {
      id: 'content_ideas',
      title: 'Content Generator',
      description: 'Get 30 days of social media content ideas',
      icon: Lightbulb,
      color: 'from-orange-500 to-red-500',
      prompt: (input) => `You are a social media content strategist for health coaches.

Their niche/focus: ${input}

Create a 30-day content calendar with post ideas including:
- Educational posts (nutrition facts, myths vs facts)
- Engagement posts (polls, questions, quizzes)
- Transformation stories (template)
- Recipe shares
- Tips and hacks
- Call-to-action posts

Format as:
Day 1: [Post type] - [Idea] - [Caption hook]

Make it specific to Indian audience and their niche.`,
      placeholder: "What's your niche or focus area? E.g., 'Weight loss for busy professionals' or 'PCOS management'"
    },
    {
      id: 'lead_strategy',
      title: 'Lead Generation Strategy',
      description: 'Get a complete lead generation plan',
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-500',
      prompt: (input) => `You are a lead generation expert for health coaching businesses in India.

Their business: ${input}

Create a complete lead generation strategy including:
1. Lead magnet ideas (3 options)
2. Where to find ideal clients (platforms, groups, communities)
3. Organic strategies (no paid ads initially)
4. Collaboration opportunities
5. Referral program structure
6. Weekly action plan

Be specific to Indian market and their niche.`,
      placeholder: "Describe your coaching business and ideal client. E.g., 'I help women with thyroid issues, targeting age 30-45, metro cities'"
    },
  ];

  const advancedGPTs = [
    {
      id: 'landing_page',
      title: 'Landing Page Writer',
      description: 'Complete landing page copy that converts',
      icon: Rocket,
      color: 'from-yellow-500 to-orange-500',
      prompt: (input) => `You are a conversion copywriter expert for health coaching businesses.

Program/Service: ${input}

Write a complete landing page copy including:
1. Headline (attention-grabbing)
2. Subheadline (clear benefit)
3. Problem section (pain points they relate to)
4. Solution section (how you help)
5. How it works (3-5 step process)
6. What's included (detailed list)
7. Transformation promise
8. Social proof template (what to include)
9. Pricing section (3 tiers with value stacking)
10. FAQ (top 5 questions)
11. Strong CTA (multiple variations)

Use Indian context, relatable language, and emotional triggers. Format professionally with section headers.`,
      placeholder: "Describe your program/service in detail. E.g., '3-month diabetes reversal program with personalized meal plans, weekly check-ins, and 24/7 WhatsApp support'"
    },
    {
      id: 'sales_script',
      title: 'Sales Call Script',
      description: 'Consultation call script that closes',
      icon: Megaphone,
      color: 'from-pink-500 to-rose-500',
      prompt: (input) => `You are a sales coach for health coaching businesses.

Their program: ${input}

Create a consultation call script including:
1. Warm opening (build rapport)
2. Discovery questions (find pain points)
3. Qualification questions (are they right fit?)
4. Presentation (introduce solution naturally)
5. Handling objections (price, time, doubt)
6. Closing techniques (3 options)
7. Post-call follow-up strategy

Format as conversational script with [Coach:] and [Client:] sections.
Include exact phrases that work in Indian context.`,
      placeholder: "What program/service are you selling in the consultation? E.g., 'My 3-month weight loss program priced at ₹25,000'"
    },
    {
      id: 'automation_sequence',
      title: 'Email Automation Sequence',
      description: 'Complete email nurture sequences',
      icon: FileText,
      color: 'from-indigo-500 to-purple-500',
      prompt: (input) => `You are an email marketing expert for health coaches.

Their business: ${input}

Create a complete email automation sequence for new leads:

WELCOME SEQUENCE (5 emails):
Email 1: Welcome + set expectations
Email 2: Share your story + build trust
Email 3: Provide quick win/free value
Email 4: Address common objections
Email 5: Soft sell invitation

For each email provide:
- Subject line (3 variations)
- Preview text
- Email body (formatted)
- CTA

Use Indian context and relatable language.`,
      placeholder: "Describe your business and what you want leads to do. E.g., 'PCOS coaching, want them to book free consultation call'"
    },
    {
      id: 'competitor_analysis',
      title: 'Competitive Intelligence',
      description: 'Analyze competition and find gaps',
      icon: Target,
      color: 'from-cyan-500 to-blue-500',
      prompt: (input) => `You are a business strategy analyst for health coaching.

Their niche: ${input}

Provide competitive intelligence including:
1. What successful coaches in this niche typically offer
2. Common pricing ranges in Indian market
3. Gap analysis (what they're missing)
4. Your differentiation opportunities
5. Positioning strategy
6. Quick wins to stand out

Be specific to Indian health coaching market.`,
      placeholder: "What niche are you in? E.g., 'Weight loss coaching for women in their 30s-40s'"
    },
  ];

  const handleGenerate = async (gpt) => {
    if (!input.trim()) {
      alert('Please enter your details first');
      return;
    }

    setActiveGPT(gpt);
    setIsGenerating(true);
    setOutput('');

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: gpt.prompt(input),
      });

      setOutput(response);
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

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg px-6 py-2">
            <Sparkles className="w-5 h-5 mr-2 inline" />
            Business GPT Tools
          </Badge>
          <h1 className="text-5xl font-bold text-gray-900">
            AI-Powered Business Building
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Find your niche, create programs, generate content, and build a profitable health coaching business
          </p>
        </div>

        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur grid grid-cols-2 w-full max-w-md mx-auto">
            <TabsTrigger value="basic">🥉 Basic Tools</TabsTrigger>
            <TabsTrigger value="advanced">
              <Crown className="w-4 h-4 mr-1 inline" />
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* Basic Tools */}
          <TabsContent value="basic" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {basicGPTs.map((gpt) => (
                <Card key={gpt.id} className="border-none shadow-xl hover:shadow-2xl transition-all">
                  <CardHeader>
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gpt.color} mx-auto mb-3 flex items-center justify-center shadow-lg`}>
                      <gpt.icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-center text-2xl">{gpt.title}</CardTitle>
                    <CardDescription className="text-center">{gpt.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder={gpt.placeholder}
                      value={activeGPT?.id === gpt.id ? input : ''}
                      onChange={(e) => {
                        setActiveGPT(gpt);
                        setInput(e.target.value);
                      }}
                      rows={4}
                      className="mb-4"
                    />
                    <Button
                      onClick={() => handleGenerate(gpt)}
                      disabled={isGenerating || !input.trim()}
                      className={`w-full bg-gradient-to-r ${gpt.color}`}
                    >
                      {isGenerating && activeGPT?.id === gpt.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Advanced Tools */}
          <TabsContent value="advanced" className="space-y-6">
            {!hasAdvancedAccess ? (
              <Card className="border-none shadow-xl bg-gradient-to-br from-purple-50 to-pink-50">
                <CardContent className="p-12 text-center">
                  <Crown className="w-16 h-16 mx-auto text-purple-500 mb-4" />
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">Advanced Tools Locked</h2>
                  <p className="text-lg text-gray-600 mb-6">
                    Upgrade to Professional or Premium tier to access advanced business tools
                  </p>
                  <Badge className="bg-purple-500 text-white text-lg px-6 py-3">
                    Available in Professional & Premium Plans
                  </Badge>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {advancedGPTs.map((gpt) => (
                  <Card key={gpt.id} className="border-none shadow-xl hover:shadow-2xl transition-all">
                    <CardHeader>
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gpt.color} mx-auto mb-3 flex items-center justify-center shadow-lg`}>
                        <gpt.icon className="w-8 h-8 text-white" />
                      </div>
                      <CardTitle className="text-center text-2xl">{gpt.title}</CardTitle>
                      <CardDescription className="text-center">{gpt.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder={gpt.placeholder}
                        value={activeGPT?.id === gpt.id ? input : ''}
                        onChange={(e) => {
                          setActiveGPT(gpt);
                          setInput(e.target.value);
                        }}
                        rows={4}
                        className="mb-4"
                      />
                      <Button
                        onClick={() => handleGenerate(gpt)}
                        disabled={isGenerating || !input.trim()}
                        className={`w-full bg-gradient-to-r ${gpt.color}`}
                      >
                        {isGenerating && activeGPT?.id === gpt.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Output Section */}
        {output && (
          <Card className="border-none shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Generated Output</CardTitle>
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
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap bg-gray-50 p-6 rounded-lg border border-gray-200 font-mono text-sm">
                  {output}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* How to Use */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardHeader>
            <CardTitle className="text-2xl">💡 How to Use These Tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg">
                <h4 className="font-bold mb-2">1. Be Specific</h4>
                <p className="text-sm text-gray-700">The more details you provide, the better the output. Include your background, target audience, location, and goals.</p>
              </div>
              <div className="p-4 bg-white rounded-lg">
                <h4 className="font-bold mb-2">2. Iterate</h4>
                <p className="text-sm text-gray-700">Don't like the first output? Refine your input and regenerate. AI gets better with more context.</p>
              </div>
              <div className="p-4 bg-white rounded-lg">
                <h4 className="font-bold mb-2">3. Customize</h4>
                <p className="text-sm text-gray-700">Generated content is a starting point. Edit, add your personality, and make it uniquely yours.</p>
              </div>
              <div className="p-4 bg-white rounded-lg">
                <h4 className="font-bold mb-2">4. Take Action</h4>
                <p className="text-sm text-gray-700">These tools give you the roadmap. Now execute! Start with one tool, implement fully, then move to the next.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}