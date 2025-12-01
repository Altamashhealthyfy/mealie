import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Rocket, Loader2, ArrowRight, CheckCircle, Copy, Download, Diamond, Lock, Crown } from "lucide-react";
import { useCoachPlanPermissions } from "@/components/permissions/useCoachPlanPermissions";
import { createPageUrl } from "@/utils";

export default function BusinessGPTs() {
  const { user, canAccessBusinessGpts, isLoading: permissionsLoading } = useCoachPlanPermissions();

  // Check access for student_coach
  if (!permissionsLoading && user?.user_type === 'student_coach' && !canAccessBusinessGpts) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <Card className="max-w-md border-none shadow-xl bg-white">
          <CardHeader>
            <Lock className="w-16 h-16 mx-auto text-purple-500 mb-4" />
            <CardTitle className="text-center text-2xl">Feature Not Available</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Business GPTs is not included in your current plan.
            </p>
            <Alert className="bg-purple-50 border-purple-300">
              <Crown className="w-5 h-5 text-purple-600" />
              <AlertDescription>
                Upgrade your plan to access AI Launchpad GPT and build your business strategy.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => window.location.href = createPageUrl('CoachSubscriptions')}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-500"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  const [currentModule, setCurrentModule] = useState(0);
  const [answers, setAnswers] = useState({});
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState(null);
  const [showDiamondSeed, setShowDiamondSeed] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // AI LAUNCHPAD GPT - Module-based flow
  const modules = [
    {
      id: 1,
      title: "MODULE 1: NICHE & AVATAR CLARITY",
      icon: "🎯",
      questions: [
        { id: "q1", text: "What health struggle inspired you to become a coach?" },
        { id: "q2", text: "Who do you feel called to serve?" },
        { id: "q3", text: "What condition would you love to work on for 5 years?" },
        { id: "q4", text: "What health topics can you talk about for hours?" },
        { id: "q5", text: "What type of advice do people ask you for?" },
        { id: "q6", text: "What certifications/skills do you already have?" },
        { id: "q7", text: "What change do you want your client to experience in 90 days?" },
        { id: "q8", text: "In which language will you coach: Hindi, English, or both?" },
        { id: "q9", text: "How do you want to deliver (1:1, group, WhatsApp)?" },
        { id: "q10", text: "Who would be your dream client?" }
      ],
      diamondSeed: "High-ticket signature offers using disease reversal are taught step-by-step in our Diamond Masterclass. Join the Diamond Showcase (check app banner) or contact 8826416947."
    },
    {
      id: 2,
      title: "MODULE 2: SIGNATURE OFFER (MPESS BASED)",
      icon: "💎",
      questions: [
        { id: "q1", text: "Program name ideas" },
        { id: "q2", text: "Core problem you solve" },
        { id: "q3", text: "End result in 90 days" },
        { id: "q4", text: "Your personal story or expertise" },
        { id: "q5", text: "What are your 5 program pillars?" },
        { id: "q6", text: "Map each pillar to MPESS (Mind/Physical/Emotional/Social/Spiritual)" },
        { id: "q7", text: "What makes your program different?" },
        { id: "q8", text: "What features do you want to add?" },
        { id: "q9", text: "What bonuses will you offer?" },
        { id: "q10", text: "Value (pseudo-price) of each element" },
        { id: "q11", text: "Launch price?" },
        { id: "q12", text: "Weekly delivery structure?" }
      ],
      diamondSeed: "High-ticket signature offers using disease reversal are taught step-by-step in our Diamond Masterclass. Join the Diamond Showcase (check app banner) or contact 8826416947."
    },
    {
      id: 3,
      title: "MODULE 3: MEMBERSHIP DESIGN",
      icon: "🏆",
      questions: [
        { id: "q1", text: "Do you want Silver, Gold, Diamond levels?" },
        { id: "q2", text: "Duration of each (days/months)?" },
        { id: "q3", text: "Features in each?" },
        { id: "q4", text: "Price per level?" }
      ],
      diamondSeed: "Want to learn the freedom model of group sales and coaching? Join the Diamond Showcase (check app banner) or contact 8826416947."
    },
    {
      id: 4,
      title: "MODULE 4: 100 CLIENT PAIN POINTS",
      icon: "🎯",
      questions: [
        { id: "q1", text: "What's the main pain/problem you solve?" }
      ],
      diamondSeed: null
    },
    {
      id: 5,
      title: "MODULE 5: 30-DAY SOCIAL MEDIA CALENDAR",
      icon: "📱",
      questions: [
        { id: "q1", text: "What platform will you use most?" },
        { id: "q2", text: "What type of content? (Reels, carousel, stories)" },
        { id: "q3", text: "Do you want captions, hooks, CTAs?" }
      ],
      diamondSeed: "Want to learn advance AI Tools and viral reel scripts? Included in Diamond. Check app banner or contact 8826416947."
    },
    {
      id: 6,
      title: "MODULE 6: STRATEGY SHEET EXPORT",
      icon: "📋",
      questions: [],
      diamondSeed: "Want expert audit? Join our Diamond Circle. Check app banner or contact 8826416947."
    },
    {
      id: 7,
      title: "MODULE 7: LEAD GENERATION & SALES",
      icon: "🚀",
      questions: [
        { id: "q1", text: "What lead magnet will you offer? (Workshop, checklist, video)" },
        { id: "q2", text: "What result does it give?" },
        { id: "q3", text: "How will you collect leads? (Form, WhatsApp, page)" },
        { id: "q4", text: "What's your CTA?" },
        { id: "q5", text: "Do you want your clarity call script?" }
      ],
      diamondSeed: null
    }
  ];

  const currentModuleData = modules[currentModule];
  const isLastQuestion = !currentModuleData.questions.length || 
    Object.keys(answers).filter(k => k.startsWith(`m${currentModule + 1}_`)).length === currentModuleData.questions.length;

  const handleGenerateModule = async () => {
    setGenerating(true);
    
    try {
      let prompt = `You are a professional AI business assistant for health coaches at Healthyfy Institute.
      
**${currentModuleData.title}**

Based on these answers:
${currentModuleData.questions.map((q, i) => `${i + 1}. ${q.text}\nAnswer: ${answers[`m${currentModule + 1}_q${i + 1}`] || 'Not provided'}`).join('\n\n')}

`;

      if (currentModule === 0) {
        prompt += `Generate:
1. A clear 1-line niche statement
2. Detailed client avatar with:
   - Main pain points (3-5 points)
   - Goals they want to achieve
   - Psychological blocks holding them back
3. Three Instagram bio options (each under 150 characters)
4. An "About Me" paragraph for their website/profile

Make it specific, emotionally resonant, and action-oriented.`;
      } else if (currentModule === 1) {
        prompt += `Generate:
1. Signature offer layout with program name and positioning
2. MPESS-based transformation structure (map pillars to Mind/Physical/Emotional/Social/Spiritual)
3. Value stack showing all components with pseudo-prices
4. Bonus stack
5. Total value vs launch price comparison
6. Weekly delivery structure

Make it compelling and high-value.`;
      } else if (currentModule === 2) {
        prompt += `Generate a membership tier comparison table with:
- Level names (Silver/Gold/Diamond or custom)
- Duration for each
- Features included
- Pricing
- Clear differentiation

Format as a professional table.`;
      } else if (currentModule === 3) {
        prompt += `Generate 100 client pain points across these 5 categories:
1. Physical Pain Points (20)
2. Emotional Pain Points (20)
3. Lifestyle Challenges (20)
4. Limiting Beliefs (20)
5. Nutrition Struggles (20)

Make them specific, relatable, and varied. These will be used for content creation.`;
      } else if (currentModule === 4) {
        prompt += `Generate a 30-day social media content calendar including:
1. Daily post themes
2. 3 ready-to-use reel scripts with hooks and CTAs
3. Carousel post ideas
4. Story prompts
5. Relevant hashtags (20-30)
6. Posting times suggestions
7. CTAs for each post type

Make it actionable and platform-specific.`;
      } else if (currentModule === 5) {
        prompt += `Create a comprehensive strategy sheet export with:
1. Summary of all answers from previous modules
2. Niche & Avatar
3. Signature Offer details
4. Membership structure
5. Pain points identified
6. Content calendar overview
7. Next action steps

Format as a professional business strategy document.`;
      } else if (currentModule === 6) {
        prompt += `Generate a lead generation and sales funnel including:
1. Lead magnet structure and content outline
2. Landing page copy template
3. Google Form questions for lead collection
4. WhatsApp follow-up message sequence (3 messages)
5. Email nurture sequence
${answers.m7_q5 === 'yes' || answers.m7_q5?.toLowerCase().includes('yes') ? '6. CONNECT clarity call script (Connect, Observe, Name pain, Narrate, Explain, Close, Thank)' : ''}

Make it conversion-focused with specific copy.`;
      }

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            output: { type: "string" }
          }
        }
      });

      setOutput(response.output);
      setShowDiamondSeed(!!currentModuleData.diamondSeed);

    } catch (error) {
      console.error(error);
      alert('Error generating content. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleNext = () => {
    setOutput(null);
    setShowDiamondSeed(false);
    if (currentModule < modules.length - 1) {
      setCurrentModule(currentModule + 1);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    alert('✅ Copied to clipboard!');
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentModuleData.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <Badge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-lg px-6 py-2">
            <Sparkles className="w-5 h-5 mr-2 inline" />
            AI Launchpad GPT
          </Badge>
          <h1 className="text-5xl font-bold text-gray-900">Launch Your Health Coaching Business</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Step-by-step AI assistant to build your niche, offer, content, and sales strategy
          </p>
        </div>

        {/* Progress Bar */}
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Your Progress</p>
              <p className="text-sm text-gray-600">Module {currentModule + 1} of {modules.length}</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${((currentModule + 1) / modules.length) * 100}%` }}
              ></div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {modules.map((mod, idx) => (
                <Badge 
                  key={idx}
                  className={idx === currentModule ? 'bg-purple-600' : idx < currentModule ? 'bg-green-600' : 'bg-gray-300'}
                >
                  {mod.icon} M{idx + 1}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Current Module */}
        {!output ? (
          <Card className="border-none shadow-xl">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
              <CardTitle className="text-2xl flex items-center gap-2">
                <span>{currentModuleData.icon}</span>
                {currentModuleData.title}
              </CardTitle>
              <CardDescription className="text-white/90">
                Answer these questions to generate your {currentModuleData.title.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {currentModuleData.questions.length === 0 ? (
                <Alert className="bg-blue-50 border-blue-500">
                  <AlertDescription>
                    <strong>🎉 Ready to export your complete strategy sheet!</strong>
                    <br/>Click "Generate" below to see your full business plan summary.
                  </AlertDescription>
                </Alert>
              ) : (
                currentModuleData.questions.map((question, qIdx) => (
                  <div key={question.id} className="space-y-2">
                    <Label className="text-base font-semibold text-gray-900">
                      {qIdx + 1}. {question.text}
                    </Label>
                    <Textarea
                      placeholder="Type your answer here..."
                      value={answers[`m${currentModule + 1}_${question.id}`] || ''}
                      onChange={(e) => setAnswers({
                        ...answers,
                        [`m${currentModule + 1}_${question.id}`]: e.target.value
                      })}
                      rows={3}
                      className="text-base"
                    />
                  </div>
                ))
              )}

              <Button
                onClick={handleGenerateModule}
                disabled={generating}
                className="w-full h-14 text-lg bg-gradient-to-r from-purple-500 to-indigo-500"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate {currentModuleData.title}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Generated Output */}
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <CheckCircle className="w-6 h-6" />
                  ✅ {currentModuleData.title} Generated!
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="p-6 bg-gray-50 rounded-xl border max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                    {output}
                  </pre>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleCopy}
                    className="flex-1"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Text
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDownload}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Diamond Seed (if applicable) */}
            {showDiamondSeed && currentModuleData.diamondSeed && (
              <Alert className="border-2 border-purple-500 bg-gradient-to-r from-purple-50 to-pink-50">
                <Diamond className="w-5 h-5 text-purple-600" />
                <AlertDescription className="ml-2">
                  <strong className="text-purple-900">💎 Diamond Masterclass Offer:</strong>
                  <br/>
                  <p className="text-gray-700 mt-2">{currentModuleData.diamondSeed}</p>
                </AlertDescription>
              </Alert>
            )}

            {/* Next Module Button */}
            {currentModule < modules.length - 1 ? (
              <Button
                onClick={handleNext}
                className="w-full h-14 text-lg bg-gradient-to-r from-blue-500 to-cyan-500"
              >
                Continue to Next Module <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            ) : (
              <Card className="border-none shadow-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold mb-2">🎉 Congratulations!</h2>
                  <p className="text-xl mb-6">You've completed the AI Launchpad!</p>
                  <p className="text-white/90">
                    You now have a complete business strategy. Review all modules above and start implementing!
                  </p>
                  <Button
                    onClick={() => {
                      setCurrentModule(0);
                      setOutput(null);
                      setAnswers({});
                    }}
                    className="mt-6 bg-white text-green-600 hover:bg-green-50"
                  >
                    <Rocket className="w-4 h-4 mr-2" />
                    Start New Strategy
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}