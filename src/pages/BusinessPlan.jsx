import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Rocket,
  Target,
  Package,
  Users,
  FileText,
  Calendar,
  Download,
  Sparkles,
  CheckCircle2,
  Loader2,
  Copy,
  ChevronRight,
  ChevronLeft,
  Crown,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  BarChart,
  Zap,
  Heart,
  Globe
} from "lucide-react";

const MODULES = [
  {
    id: 1,
    title: "Niche & Avatar Clarity",
    icon: Target,
    color: "from-blue-500 to-cyan-500",
    questions: [
      "What health struggle inspired you to become a coach?",
      "Who do you feel called to serve?",
      "What condition would you love to work on for 5 years?",
      "What health topics can you talk about for hours?",
      "What type of advice do people ask you for?",
      "What certifications/skills do you already have?",
      "What change do you want your client to experience in 90 days?",
      "In which language will you coach: Hindi, English, or both?",
      "How do you want to deliver (1:1, group, WhatsApp)?",
      "Who would be your dream client?"
    ],
    prompt: (answers) => `You are a professional AI assistant for health coaches inside Healthyfy Institute.

Based on the following information about a health coach:

${answers.map((a, i) => `${i + 1}. ${MODULES[0].questions[i]}\nAnswer: ${a}`).join('\n\n')}

Generate the following:
1. A clear 1-line niche statement
2. Detailed client avatar including:
   - Main pain points
   - Goals and aspirations
   - Blocks preventing success
3. Three Instagram bio options (max 150 characters each)
4. A compelling "About Me" paragraph (150-200 words)

Format with clear section headers and make it specific to the Indian health coaching market.`
  },
  {
    id: 2,
    title: "Signature Offer (MPESS Based)",
    icon: Package,
    color: "from-purple-500 to-pink-500",
    questions: [
      "Program name ideas",
      "Core problem you solve",
      "End result in 90 days",
      "Your personal story or expertise",
      "What are your 5 program pillars?",
      "Map each pillar to MPESS (Mind/Physical/Emotional/Social/Spiritual)",
      "What makes your program different?",
      "What features do you want to add?",
      "What bonuses will you offer?",
      "Value (pseudo-price) of each element",
      "Launch price?",
      "Weekly delivery structure?"
    ],
    diamondSeed: "High-ticket signature offers using disease reversal are taught step-by-step in our Diamond Masterclass. Join the Diamond Showcase (check app banner) or contact 8826416947.",
    prompt: (answers) => `You are a professional AI assistant for health coaches inside Healthyfy Institute.

Based on this program information:

${answers.map((a, i) => `${i + 1}. ${MODULES[1].questions[i]}\nAnswer: ${a}`).join('\n\n')}

Generate:
1. A complete signature offer layout with program name, structure, and deliverables
2. MPESS-based transformation structure showing how each pillar addresses Mind/Physical/Emotional/Social/Spiritual wellness
3. Value stack breakdown showing each component with its value, total value, actual launch price, and savings percentage
4. Bonus stack that complements the main offer

Make it compelling for the Indian health coaching market with MPESS integration.`
  },
  {
    id: 3,
    title: "Membership Design",
    icon: Users,
    color: "from-orange-500 to-red-500",
    questions: [
      "Do you want Silver, Gold, Diamond levels?",
      "Duration of each (days/months)?",
      "Features in each level?",
      "Price per level?"
    ],
    diamondSeed: "Want to learn the freedom model of group sales and coaching? Join the Diamond Showcase (check app banner) or contact 8826416947.",
    prompt: (answers) => `You are a professional AI assistant for health coaches inside Healthyfy Institute.

Based on these membership preferences:

${answers.map((a, i) => `${i + 1}. ${MODULES[2].questions[i]}\nAnswer: ${a}`).join('\n\n')}

Create a professional membership table with level names, duration, detailed features comparison, pricing, and value proposition for upgrading.`
  },
  {
    id: 4,
    title: "100 Client Pain Points",
    icon: FileText,
    color: "from-green-500 to-emerald-500",
    questions: [
      "What's the main pain/problem you solve?"
    ],
    prompt: (answers) => `You are a professional AI assistant for health coaches inside Healthyfy Institute.

Main problem solved: ${answers[0]}

Generate exactly 100 pain points that your ideal clients experience, categorized as:
- PHYSICAL (20 pain points)
- EMOTIONAL (20 pain points)
- LIFESTYLE (20 pain points)
- BELIEF (20 pain points)
- NUTRITION (20 pain points)

Make them specific, relatable to Indian context, and written in the client's voice.`
  },
  {
    id: 5,
    title: "30-Day Social Media Calendar",
    icon: Calendar,
    color: "from-yellow-500 to-orange-500",
    questions: [
      "What platform will you use most?",
      "What type of content? (Reels, carousel, stories)",
      "Do you want captions, hooks, CTAs?"
    ],
    diamondSeed: "Want to learn advance AI Tools and viral reel scripts? Included in Diamond. Check app banner or contact 8826416947.",
    prompt: (answers) => `You are a professional AI assistant for health coaches inside Healthyfy Institute.

Platform: ${answers[0]}
Content type: ${answers[1]}
Include captions/hooks: ${answers[2]}

Create a complete 30-day social media content calendar with daily post ideas, 3 complete reel scripts, hashtags and CTAs. Make it specific to Indian health coaching audience.`
  },
  {
    id: 6,
    title: "Strategy Sheet Export",
    icon: Download,
    color: "from-indigo-500 to-purple-500",
    questions: [],
    diamondSeed: "Want expert audit? Join our Diamond Circle. Check app banner or contact 8826416947."
  },
  {
    id: 7,
    title: "Lead Generation & Sales",
    icon: Sparkles,
    color: "from-pink-500 to-rose-500",
    questions: [
      "What lead magnet will you offer? (Workshop, checklist, video)",
      "What result does it give?",
      "How will you collect leads? (Form, WhatsApp, page)",
      "What's your CTA?",
      "Do you want your clarity call script? (Yes/No)"
    ],
    prompt: (answers) => `You are a professional AI assistant for health coaches inside Healthyfy Institute.

Lead magnet: ${answers[0]}
Result: ${answers[1]}
Collection method: ${answers[2]}
CTA: ${answers[3]}
Call script needed: ${answers[4]}

Generate:
1. FUNNEL FLOW with clear step-by-step journey
2. GOOGLE FORM COPY with title, welcome message, qualifying questions, thank you message
3. WHATSAPP FOLLOW-UP SEQUENCE with 4 messages over 7 days
${answers[4]?.toLowerCase().includes('yes') ? '4. CONNECT CLARITY CALL SCRIPT with all 7 steps' : ''}

Make it specific to Indian health coaching context.`
  }
];

export default function AILaunchpad() {
  const [currentModule, setCurrentModule] = useState(0);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [generatedOutput, setGeneratedOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDiamondSeed, setShowDiamondSeed] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [allOutputs, setAllOutputs] = useState({});

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const userType = user?.user_type || 'team_member';
  const isSuperAdmin = userType === 'super_admin';

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl">
          <CardHeader>
            <AlertTriangle className="w-16 h-16 mx-auto text-orange-500 mb-4" />
            <CardTitle className="text-center text-2xl">Super Admin Only</CardTitle>
            <CardDescription className="text-center text-lg">
              AI Launchpad is only available to platform owners
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <AlertDescription>
                This strategic tool contains sensitive business methodology and is restricted to super admins.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const module = MODULES[currentModule];
  const progress = ((currentModule + 1) / MODULES.length) * 100;

  const handleAnswerChange = (value) => {
    setAnswers({
      ...answers,
      [`module${currentModule}_q${currentQuestion}`]: value
    });
  };

  const getCurrentAnswer = () => {
    return answers[`module${currentModule}_q${currentQuestion}`] || '';
  };

  const nextQuestion = () => {
    if (currentQuestion < module.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const generateOutput = async () => {
    const moduleAnswers = module.questions.map((_, i) => 
      answers[`module${currentModule}_q${i}`] || ''
    );

    setIsGenerating(true);
    setGeneratedOutput('');

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: module.prompt(moduleAnswers),
      });

      setGeneratedOutput(response);
      setAllOutputs({
        ...allOutputs,
        [currentModule]: response
      });
      setShowDiamondSeed(!!module.diamondSeed);
    } catch (error) {
      setGeneratedOutput('Error generating content. Please try again.');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const nextModule = () => {
    if (currentModule < MODULES.length - 1) {
      setCurrentModule(currentModule + 1);
      setCurrentQuestion(0);
      setGeneratedOutput('');
      setShowDiamondSeed(false);
    }
  };

  const prevModule = () => {
    if (currentModule > 0) {
      setCurrentModule(currentModule - 1);
      setCurrentQuestion(0);
      setGeneratedOutput('');
      setShowDiamondSeed(false);
    }
  };

  const exportStrategy = () => {
    const separator = "=".repeat(60);
    const dash = "-".repeat(60);
    
    let exportText = "YOUR COMPLETE BUSINESS STRATEGY\n";
    exportText += "Generated by Mealie Pro AI Launchpad\n";
    exportText += separator + "\n\n";

    MODULES.forEach((mod, i) => {
      if (allOutputs[i]) {
        exportText += "MODULE " + mod.id + ": " + mod.title.toUpperCase() + "\n";
        exportText += dash + "\n\n";
        exportText += allOutputs[i] + "\n\n";
        exportText += separator + "\n\n";
      }
    });

    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Business_Strategy_Mealie_Pro.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyAllOutputs = () => {
    let copyText = "YOUR COMPLETE BUSINESS STRATEGY\n\n";
    MODULES.forEach((mod, i) => {
      if (allOutputs[i]) {
        copyText += "MODULE " + mod.id + ": " + mod.title.toUpperCase() + "\n\n";
        copyText += allOutputs[i] + "\n\n";
        copyText += "---\n\n";
      }
    });
    
    navigator.clipboard.writeText(copyText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <Tabs defaultValue="launchpad" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur grid grid-cols-2 w-full max-w-md mx-auto">
            <TabsTrigger value="launchpad">
              <Rocket className="w-4 h-4 mr-2" />
              AI Launchpad
            </TabsTrigger>
            <TabsTrigger value="business">
              <TrendingUp className="w-4 h-4 mr-2" />
              Platform Business Plan
            </TabsTrigger>
          </TabsList>

          {/* AI Launchpad Tab */}
          <TabsContent value="launchpad" className="space-y-8">
            <div className="text-center space-y-4">
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg px-6 py-2">
                <Rocket className="w-5 h-5 mr-2 inline" />
                AI Launchpad
              </Badge>
              <h1 className="text-5xl font-bold text-gray-900">
                Launch Your Health Coaching Business
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Complete 7-module business strategy builder powered by AI
              </p>
            </div>

            <Card className="border-none shadow-xl">
              <CardContent className="p-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Module {currentModule + 1} of {MODULES.length}</span>
                    <span>{Math.round(progress)}% Complete</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-2xl">
              <CardHeader className={`bg-gradient-to-r ${module.color} text-white`}>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                    <module.icon className="w-8 h-8" />
                  </div>
                  <div>
                    <CardTitle className="text-3xl">Module {module.id}</CardTitle>
                    <CardDescription className="text-white/90 text-lg">{module.title}</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-8 space-y-6">
                {module.id === 6 ? (
                  <div className="space-y-6">
                    <Alert className="border-green-500 bg-green-50">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <AlertDescription className="text-lg">
                        <strong>Congratulations!</strong> You have completed 5 core modules. Your strategy is ready to export.
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button
                        onClick={exportStrategy}
                        size="lg"
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 h-20 text-lg"
                      >
                        <Download className="w-6 h-6 mr-2" />
                        Download as .txt File
                      </Button>
                      <Button
                        onClick={copyAllOutputs}
                        size="lg"
                        variant="outline"
                        className="h-20 text-lg border-2"
                      >
                        {copiedText ? (
                          <>
                            <CheckCircle2 className="w-6 h-6 mr-2" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-6 h-6 mr-2" />
                            Copy All Text
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="p-6 bg-gray-50 rounded-xl">
                      <h3 className="font-bold text-xl mb-4">Your Strategy Summary:</h3>
                      {Object.keys(allOutputs).length === 0 ? (
                        <p className="text-gray-600">No modules completed yet. Go back and complete the modules first.</p>
                      ) : (
                        <div className="space-y-2">
                          {MODULES.slice(0, 5).map((mod, i) => (
                            <div key={i} className="flex items-center gap-2">
                              {allOutputs[i] ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                              )}
                              <span className={allOutputs[i] ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                                {mod.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {module.diamondSeed && (
                      <Alert className="border-purple-500 bg-purple-50">
                        <Crown className="w-5 h-5 text-purple-600" />
                        <AlertDescription>
                          <strong>Diamond Seed:</strong> {module.diamondSeed}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : module.questions.length > 0 ? (
                  <div className="space-y-6">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600 mb-1">Question {currentQuestion + 1} of {module.questions.length}</p>
                      <p className="text-xl font-semibold text-gray-900">{module.questions[currentQuestion]}</p>
                    </div>

                    <Textarea
                      value={getCurrentAnswer()}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      rows={6}
                      placeholder="Type your answer here..."
                      className="text-lg"
                    />

                    <div className="flex gap-3">
                      {currentQuestion > 0 && (
                        <Button
                          variant="outline"
                          onClick={prevQuestion}
                          className="flex-1"
                        >
                          <ChevronLeft className="w-4 h-4 mr-2" />
                          Previous Question
                        </Button>
                      )}
                      {currentQuestion < module.questions.length - 1 ? (
                        <Button
                          onClick={nextQuestion}
                          className={`flex-1 bg-gradient-to-r ${module.color}`}
                        >
                          Next Question
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      ) : (
                        <Button
                          onClick={generateOutput}
                          disabled={isGenerating}
                          className={`flex-1 bg-gradient-to-r ${module.color}`}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              Generate Output
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    {generatedOutput && (
                      <div className="space-y-4">
                        <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                          <h3 className="font-bold text-xl text-green-900 mb-4 flex items-center gap-2">
                            <CheckCircle2 className="w-6 h-6" />
                            Generated Output
                          </h3>
                          <div className="prose max-w-none">
                            <div className="whitespace-pre-wrap bg-white p-4 rounded-lg border border-green-200">
                              {generatedOutput}
                            </div>
                          </div>
                        </div>

                        {showDiamondSeed && module.diamondSeed && (
                          <Alert className="border-purple-500 bg-purple-50">
                            <Crown className="w-5 h-5 text-purple-600" />
                            <AlertDescription>
                              <strong>Diamond Seed:</strong> {module.diamondSeed}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={prevModule}
                disabled={currentModule === 0}
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous Module
              </Button>
              <Button
                onClick={nextModule}
                disabled={currentModule === MODULES.length - 1}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500"
              >
                Next Module
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </TabsContent>

          {/* Business Plan Tab */}
          <TabsContent value="business" className="space-y-6">
            <div className="text-center space-y-4 mb-8">
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-lg px-6 py-2">
                <TrendingUp className="w-5 h-5 mr-2 inline" />
                Mealie Pro Platform
              </Badge>
              <h1 className="text-5xl font-bold text-gray-900">
                Business Plan
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Complete business strategy for running Mealie Pro as a SaaS platform for health coaches
              </p>
            </div>

            {/* Executive Summary */}
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                <CardTitle className="text-3xl">📊 Executive Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-4">
                <p className="text-lg text-gray-700 leading-relaxed">
                  <strong>Mealie Pro</strong> is a comprehensive SaaS platform designed specifically for Indian health coaches, nutritionists, and dietitians. The platform enables professionals to manage clients, create disease-reversal meal plans using the MPESS framework, and build profitable coaching businesses.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                    <h4 className="font-bold text-lg mb-2">🎯 Mission</h4>
                    <p className="text-sm text-gray-700">Empower health coaches with technology to reverse lifestyle diseases and transform lives through evidence-based nutrition</p>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                    <h4 className="font-bold text-lg mb-2">💡 Vision</h4>
                    <p className="text-sm text-gray-700">Become India's leading health coaching platform, serving 10,000+ coaches and impacting 1 million lives by 2027</p>
                  </div>
                  
                  <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                    <h4 className="font-bold text-lg mb-2">🌟 Value Prop</h4>
                    <p className="text-sm text-gray-700">Only platform combining disease reversal protocols, MPESS wellness, and complete business tools in one system</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Market Opportunity */}
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Globe className="w-8 h-8" />
                  Market Opportunity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-4">📈 Indian Health Coaching Market</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-lg mb-3">Market Size</h4>
                      <ul className="space-y-2 text-gray-700">
                        <li>• <strong>77M</strong> Indians with diabetes (2nd globally)</li>
                        <li>• <strong>315M</strong> with hypertension</li>
                        <li>• <strong>135M</strong> with obesity</li>
                        <li>• <strong>50,000+</strong> registered dietitians</li>
                        <li>• <strong>₹12,000 Cr</strong> health & wellness market</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-bold text-lg mb-3">Growth Drivers</h4>
                      <ul className="space-y-2 text-gray-700">
                        <li>• Rising lifestyle diseases post-COVID</li>
                        <li>• Digital health adoption surge</li>
                        <li>• Preventive care awareness</li>
                        <li>• Health insurance push</li>
                        <li>• Social media health influencers</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">🎯 Target Market</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-2 border-purple-200 bg-purple-50">
                      <CardHeader>
                        <CardTitle className="text-lg">Primary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="font-bold mb-2">Certified Dietitians/Nutritionists</p>
                        <ul className="text-sm space-y-1">
                          <li>• 25-45 years old</li>
                          <li>• BSc/MSc Nutrition</li>
                          <li>• Want to scale practice</li>
                          <li>• Tech-savvy</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-blue-200 bg-blue-50">
                      <CardHeader>
                        <CardTitle className="text-lg">Secondary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="font-bold mb-2">Health Coaches (Non-Medical)</p>
                        <ul className="text-sm space-y-1">
                          <li>• 30-50 years old</li>
                          <li>• Online certifications</li>
                          <li>• Building business</li>
                          <li>• Need credibility</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-green-200 bg-green-50">
                      <CardHeader>
                        <CardTitle className="text-lg">Tertiary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="font-bold mb-2">Training Institutes</p>
                        <ul className="text-sm space-y-1">
                          <li>• Health coaching schools</li>
                          <li>• Want platform for students</li>
                          <li>• Bulk licensing</li>
                          <li>• White-label needs</li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product Overview */}
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Package className="w-8 h-8" />
                  Product Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-4">🔥 Core Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-bold mb-2">Client Management</h4>
                        <ul className="text-sm space-y-1 text-gray-700">
                          <li>• Complete health profiles</li>
                          <li>• Lab reports tracking</li>
                          <li>• Progress monitoring</li>
                          <li>• MPESS wellness tracking</li>
                        </ul>
                      </div>

                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-bold mb-2">Meal Planning (2 Tiers)</h4>
                        <ul className="text-sm space-y-1 text-gray-700">
                          <li>• <strong>Basic:</strong> RDA/Calorie-based</li>
                          <li>• <strong>Advanced:</strong> Disease reversal</li>
                          <li>• AI-powered meal generation</li>
                          <li>• Indian recipes database</li>
                        </ul>
                      </div>

                      <div className="p-4 bg-purple-50 rounded-lg">
                        <h4 className="font-bold mb-2">MPESS Framework</h4>
                        <ul className="text-sm space-y-1 text-gray-700">
                          <li>• Mind wellness practices</li>
                          <li>• Physical health tracking</li>
                          <li>• Emotional check-ins</li>
                          <li>• Social & spiritual guidance</li>
                        </ul>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <h4 className="font-bold mb-2">Business Tools</h4>
                        <ul className="text-sm space-y-1 text-gray-700">
                          <li>• Marketing Hub (social media)</li>
                          <li>• Payment integration</li>
                          <li>• Team management</li>
                          <li>• White-label branding</li>
                        </ul>
                      </div>

                      <div className="p-4 bg-pink-50 rounded-lg">
                        <h4 className="font-bold mb-2">AI Launchpad</h4>
                        <ul className="text-sm space-y-1 text-gray-700">
                          <li>• 7-module business builder</li>
                          <li>• Niche & avatar finder</li>
                          <li>• Content calendar generator</li>
                          <li>• Sales scripts & funnels</li>
                        </ul>
                      </div>

                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <h4 className="font-bold mb-2">Communication</h4>
                        <ul className="text-sm space-y-1 text-gray-700">
                          <li>• Built-in messaging</li>
                          <li>• Appointment scheduling</li>
                          <li>• Progress reports</li>
                          <li>• Automated reminders</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">⚡ Unique Selling Points</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { title: "Disease Reversal Focus", desc: "Only platform with evidence-based disease reversal protocols for diabetes, PCOS, thyroid, etc." },
                      { title: "MPESS Holistic Wellness", desc: "Beyond nutrition - complete Mind, Physical, Emotional, Social, Spiritual framework" },
                      { title: "India-First Approach", desc: "Indian recipes, regional cuisines, ICMR data, local context" },
                      { title: "Complete Business System", desc: "Not just client management - includes marketing, sales, payments, team management" },
                      { title: "White-Label Capability", desc: "Students can use their own branding - train and scale your coaching institute" },
                      { title: "AI-Powered Intelligence", desc: "Smart meal generation, business strategy builder, content creation" }
                    ].map((usp, i) => (
                      <div key={i} className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-l-4 border-green-500">
                        <h4 className="font-bold mb-2">{usp.title}</h4>
                        <p className="text-sm text-gray-700">{usp.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Model */}
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                <CardTitle className="text-3xl flex items-center gap-2">
                  <DollarSign className="w-8 h-8" />
                  Revenue Model
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-4">💰 Pricing Tiers</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-2 border-gray-300">
                      <CardHeader className="bg-gray-50">
                        <CardTitle className="text-lg">Free Trial</CardTitle>
                        <p className="text-3xl font-bold text-gray-900">₹0</p>
                        <p className="text-sm text-gray-600">14 days</p>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <ul className="space-y-2 text-sm">
                          <li>✓ 5 clients max</li>
                          <li>✓ Basic meal plans</li>
                          <li>✓ All features access</li>
                          <li>✓ No credit card needed</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-blue-300 bg-blue-50">
                      <CardHeader className="bg-blue-100">
                        <CardTitle className="text-lg">Student</CardTitle>
                        <p className="text-3xl font-bold text-blue-900">₹999</p>
                        <p className="text-sm text-blue-700">/month</p>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <ul className="space-y-2 text-sm">
                          <li>✓ 25 clients</li>
                          <li>✓ Basic + Advanced plans</li>
                          <li>✓ Marketing Hub</li>
                          <li>✓ Email support</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-purple-300 bg-purple-50 relative">
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600">POPULAR</Badge>
                      <CardHeader className="bg-purple-100">
                        <CardTitle className="text-lg">Professional</CardTitle>
                        <p className="text-3xl font-bold text-purple-900">₹2,499</p>
                        <p className="text-sm text-purple-700">/month</p>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <ul className="space-y-2 text-sm">
                          <li>✓ 100 clients</li>
                          <li>✓ Everything in Student</li>
                          <li>✓ White-label branding</li>
                          <li>✓ Team members (3)</li>
                          <li>✓ Priority support</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-orange-300 bg-orange-50">
                      <CardHeader className="bg-orange-100">
                        <CardTitle className="text-lg">Institute</CardTitle>
                        <p className="text-3xl font-bold text-orange-900">₹9,999</p>
                        <p className="text-sm text-orange-700">/month</p>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <ul className="space-y-2 text-sm">
                          <li>✓ Unlimited clients</li>
                          <li>✓ Everything in Pro</li>
                          <li>✓ Unlimited team</li>
                          <li>✓ Custom domain</li>
                          <li>✓ Dedicated support</li>
                          <li>✓ API access</li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">📊 Revenue Projections (Year 1-3)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border p-3 text-left">Metric</th>
                          <th className="border p-3 text-center">Year 1</th>
                          <th className="border p-3 text-center">Year 2</th>
                          <th className="border p-3 text-center">Year 3</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border p-3 font-semibold">Total Users</td>
                          <td className="border p-3 text-center">500</td>
                          <td className="border p-3 text-center">2,000</td>
                          <td className="border p-3 text-center">5,000</td>
                        </tr>
                        <tr className="bg-blue-50">
                          <td className="border p-3">Student (₹999)</td>
                          <td className="border p-3 text-center">300 (60%)</td>
                          <td className="border p-3 text-center">1,200 (60%)</td>
                          <td className="border p-3 text-center">3,000 (60%)</td>
                        </tr>
                        <tr className="bg-purple-50">
                          <td className="border p-3">Professional (₹2,499)</td>
                          <td className="border p-3 text-center">150 (30%)</td>
                          <td className="border p-3 text-center">600 (30%)</td>
                          <td className="border p-3 text-center">1,500 (30%)</td>
                        </tr>
                        <tr className="bg-orange-50">
                          <td className="border p-3">Institute (₹9,999)</td>
                          <td className="border p-3 text-center">50 (10%)</td>
                          <td className="border p-3 text-center">200 (10%)</td>
                          <td className="border p-3 text-center">500 (10%)</td>
                        </tr>
                        <tr className="bg-green-100 font-bold">
                          <td className="border p-3">Monthly Recurring Revenue (MRR)</td>
                          <td className="border p-3 text-center">₹11.7 L</td>
                          <td className="border p-3 text-center">₹47 L</td>
                          <td className="border p-3 text-center">₹1.17 Cr</td>
                        </tr>
                        <tr className="bg-green-200 font-bold text-lg">
                          <td className="border p-3">Annual Recurring Revenue (ARR)</td>
                          <td className="border p-3 text-center">₹1.4 Cr</td>
                          <td className="border p-3 text-center">₹5.6 Cr</td>
                          <td className="border p-3 text-center">₹14 Cr</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <Alert className="border-green-500 bg-green-50">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <AlertDescription>
                    <strong>Conservative Estimates:</strong> Assumes 25% churn rate, 40% conversion from free trial, and organic + paid acquisition mix.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Go-to-Market Strategy */}
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-pink-500 to-rose-500 text-white">
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Zap className="w-8 h-8" />
                  Go-to-Market Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-4">🎯 Phase 1: Launch (Months 1-3)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-bold mb-2">Target Channels</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Instagram health coaches</li>
                        <li>• LinkedIn nutritionists</li>
                        <li>• WhatsApp groups</li>
                        <li>• Health coaching institutes</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-bold mb-2">Tactics</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Free masterclass webinars</li>
                        <li>• Case study videos</li>
                        <li>• Referral program (give 1 month free)</li>
                        <li>• Partner with 10 institutes</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">🚀 Phase 2: Growth (Months 4-12)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-bold mb-2">Content Marketing</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Daily Insta reels</li>
                        <li>• Blog posts (SEO)</li>
                        <li>• YouTube tutorials</li>
                        <li>• Free meal plan templates</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-orange-50 rounded-lg">
                      <h4 className="font-bold mb-2">Paid Advertising</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Facebook/Instagram ads</li>
                        <li>• Google Search ads</li>
                        <li>• YouTube pre-roll</li>
                        <li>• Budget: ₹2L/month</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-pink-50 rounded-lg">
                      <h4 className="font-bold mb-2">Partnerships</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Top health influencers</li>
                        <li>• Coaching certification bodies</li>
                        <li>• Health insurance companies</li>
                        <li>• Corporate wellness programs</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">⚡ Phase 3: Scale (Year 2+)</h3>
                  <div className="space-y-3">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-l-4 border-blue-500">
                      <strong>Enterprise Sales:</strong> Target large health coaching institutes with 50+ students for bulk licensing
                    </div>
                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-l-4 border-green-500">
                      <strong>International Expansion:</strong> Launch in US/UK/Australia for diaspora Indian health coaches
                    </div>
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-l-4 border-purple-500">
                      <strong>B2B2C Model:</strong> Partner with hospitals/clinics to provide platform to their nutritionists
                    </div>
                    <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border-l-4 border-orange-500">
                      <strong>Additional Revenue:</strong> Marketplace for meal prep services, supplement brands, lab tests
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Competitive Advantage */}
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Heart className="w-8 h-8" />
                  Why We'll Win
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold mb-3">🏆 Competitive Advantages</h3>
                    {[
                      "Disease Reversal Protocols (no competitor has this)",
                      "MPESS Holistic Framework (unique)",
                      "India-First (competitors are Western-focused)",
                      "Complete Business System (not just CRM)",
                      "White-Label for Training Institutes",
                      "AI-Powered Intelligence",
                      "Affordable Pricing (₹999 vs ₹5000+ competitors)"
                    ].map((adv, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-800">{adv}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-bold mb-3">🚧 Barriers to Entry</h3>
                    {[
                      "Deep health coaching domain expertise",
                      "ICMR data & Indian recipe database",
                      "MPESS framework IP",
                      "Disease reversal protocols (clinical validation)",
                      "Network effects (coaches invite coaches)",
                      "Brand reputation in Indian market",
                      "Platform switching costs (data migration)"
                    ].map((barrier, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                        <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-800">{barrier}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Plan */}
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-red-500 to-pink-500 text-white">
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Rocket className="w-8 h-8" />
                  Next Steps
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold mb-4">🎯 Immediate Actions (This Month)</h3>
                  {[
                    { task: "Launch free trial campaign", owner: "Marketing", deadline: "Week 1" },
                    { task: "Partner with 5 health coaching institutes", owner: "Sales", deadline: "Week 2" },
                    { task: "Create case study videos (3 coaches)", owner: "Marketing", deadline: "Week 3" },
                    { task: "Set up referral program", owner: "Product", deadline: "Week 4" },
                    { task: "Instagram daily content (30 posts)", owner: "Content", deadline: "Ongoing" }
                  ].map((action, i) => (
                    <div key={i} className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-l-4 border-purple-500 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-bold">{action.task}</p>
                          <p className="text-sm text-gray-600">{action.owner} • {action.deadline}</p>
                        </div>
                      </div>
                      <CheckCircle2 className="w-6 h-6 text-gray-300" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Alert className="border-green-500 bg-green-50">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <AlertDescription className="text-lg">
                <strong>🚀 Bottom Line:</strong> Mealie Pro has the potential to become the #1 health coaching platform in India with ₹14 Cr ARR by Year 3. The combination of disease reversal protocols, MPESS framework, and complete business tools creates an unbeatable value proposition. Time to execute! 💪
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}