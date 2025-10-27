import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  AlertTriangle
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
    outputs: [
      "1-line niche",
      "Client avatar (pain, goals, blocks)",
      "Insta bio (3 options)",
      "About me paragraph"
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
    outputs: [
      "Signature offer layout",
      "MPESS-based transformation structure",
      "Value stack + bonus stack"
    ],
    diamondSeed: "High-ticket signature offers using disease reversal are taught step-by-step in our Diamond Masterclass. Join the Diamond Showcase (check app banner) or contact 8826416947.",
    prompt: (answers) => `You are a professional AI assistant for health coaches inside Healthyfy Institute.

Based on this program information:

${answers.map((a, i) => `${i + 1}. ${MODULES[1].questions[i]}\nAnswer: ${a}`).join('\n\n')}

Generate:
1. A complete signature offer layout with program name, structure, and deliverables
2. MPESS-based transformation structure showing how each pillar addresses:
   - Mind wellness
   - Physical health
   - Emotional balance
   - Social connections
   - Spiritual growth
3. Value stack breakdown showing:
   - Each component with its value
   - Total value
   - Actual launch price
   - Savings percentage
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
    outputs: [
      "Membership table: Level | Duration | Features | Price"
    ],
    diamondSeed: "Want to learn the freedom model of group sales and coaching? Join the Diamond Showcase (check app banner) or contact 8826416947.",
    prompt: (answers) => `You are a professional AI assistant for health coaches inside Healthyfy Institute.

Based on these membership preferences:

${answers.map((a, i) => `${i + 1}. ${MODULES[2].questions[i]}\nAnswer: ${a}`).join('\n\n')}

Create a professional membership table with:
- Level names (Silver/Gold/Diamond or custom)
- Duration for each level
- Detailed features comparison
- Pricing for each tier
- Value proposition for upgrading

Format as a clear table and add recommendations for which clients suit which tier.`
  },
  {
    id: 4,
    title: "100 Client Pain Points",
    icon: FileText,
    color: "from-green-500 to-emerald-500",
    questions: [
      "What's the main pain/problem you solve?"
    ],
    outputs: [
      "100 pain points across Physical / Emotional / Lifestyle / Belief / Nutrition"
    ],
    prompt: (answers) => `You are a professional AI assistant for health coaches inside Healthyfy Institute.

Main problem solved: ${answers[0]}

Generate exactly 100 pain points that your ideal clients experience, categorized as:

PHYSICAL (20 pain points):
- Specific physical symptoms and conditions

EMOTIONAL (20 pain points):
- Emotional struggles and feelings

LIFESTYLE (20 pain points):
- Daily life challenges and habits

BELIEF (20 pain points):
- Mental blocks and limiting beliefs

NUTRITION (20 pain points):
- Food and eating related struggles

Make them specific, relatable to Indian context, and written in the client's voice ("I can't...", "I struggle with...", etc.)`
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
    outputs: [
      "30-day post plan",
      "3 reel scripts",
      "Hashtags + CTAs"
    ],
    diamondSeed: "Want to learn advance AI Tools and viral reel scripts? Included in Diamond. Check app banner or contact 8826416947.",
    prompt: (answers) => `You are a professional AI assistant for health coaches inside Healthyfy Institute.

Platform: ${answers[0]}
Content type: ${answers[1]}
Include captions/hooks: ${answers[2]}

Create a complete 30-day social media content calendar including:

For each day (Day 1-30):
- Post type (Educational/Engagement/Promotional/Behind-the-scenes)
- Content idea
- Caption hook (first line)
- Full caption (if requested)
- CTA
- Relevant hashtags

Also provide:
- 3 complete reel scripts with hooks, body, and CTAs
- A mix of content types throughout the month
- Strategic promotional posts (not too many)

Make it specific to Indian health coaching audience and their niche.`
  },
  {
    id: 6,
    title: "Strategy Sheet Export",
    icon: Download,
    color: "from-indigo-500 to-purple-500",
    questions: [],
    outputs: [
      "Complete strategy summary ready for export"
    ],
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
    outputs: [
      "Funnel flow",
      "Google Form copy",
      "WhatsApp follow-up message",
      "CONNECT clarity call script (if yes)"
    ],
    prompt: (answers) => `You are a professional AI assistant for health coaches inside Healthyfy Institute.

Lead magnet: ${answers[0]}
Result: ${answers[1]}
Collection method: ${answers[2]}
CTA: ${answers[3]}
Call script needed: ${answers[4]}

Generate:

1. FUNNEL FLOW:
   - Traffic source → Lead magnet → Follow-up → Sale
   - Clear step-by-step journey

2. GOOGLE FORM COPY:
   - Form title
   - Welcome message
   - 5-7 qualifying questions
   - Thank you message

3. WHATSAPP FOLLOW-UP SEQUENCE:
   - Message 1 (immediate): Thank you + deliver lead magnet
   - Message 2 (Day 2): Value-add tip
   - Message 3 (Day 4): Social proof
   - Message 4 (Day 7): Call invitation

${answers[4]?.toLowerCase().includes('yes') ? `
4. CONNECT CLARITY CALL SCRIPT:
   - Connect: Rapport building opening
   - Observe: Questions to understand situation
   - Name pain: Identify and articulate their struggle
   - Narrate: Share transformation possibility
   - Explain: Present your solution
   - Close: Ask for commitment
   - Thank: Graceful follow-up

Format as a conversational script with specific phrases.` : ''}

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
    let exportText = "🚀 YOUR COMPLETE BUSINESS STRATEGY\n";
    exportText += "Generated by Mealie Pro AI Launchpad\n";
    exportText += "=".repeat(60) + "\n\n";

    MODULES.forEach((mod, i) => {
      if (allOutputs[i]) {
        exportText += `MODULE ${mod.id}: ${mod.title.toUpperCase()}\n`;
        exportText += "-".repeat(60) + "\n\n";
        exportText += allOutputs[i] + "\n\n";
        exportText += "=".repeat(60) + "\n\n";
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
    let copyText = "🚀 YOUR COMPLETE BUSINESS STRATEGY\n\n";
    MODULES.forEach((mod, i) => {
      if (allOutputs[i]) {
        copyText += `MODULE ${mod.id}: ${mod.title.toUpperCase()}\n\n`;
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
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
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

        {/* Progress */}
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

        {/* Module Content */}
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
              // Strategy Export Module
              <div className="space-y-6">
                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <AlertDescription className="text-lg">
                    <strong>Congratulations!</strong> You've completed 5 core modules. Your strategy is ready to export.
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
                      <strong>💎 Diamond Seed:</strong> {module.diamondSeed}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : module.questions.length > 0 ? (
              // Question-based modules
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
                          <strong>💎 Diamond Seed:</strong> {module.diamondSeed}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Navigation */}
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
      </div>
    </div>
  );
}