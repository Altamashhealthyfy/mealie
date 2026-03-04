import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  PlayCircle, BookOpen, FileText, Brain, ChevronRight, ChevronLeft,
  CheckCircle2, XCircle, Trophy, Star, Clock, BarChart3, MessageSquare,
  Sparkles, TrendingUp, Lock, ArrowLeft, RefreshCw
} from "lucide-react";

// ─── DATA ────────────────────────────────────────────────────────────────────

const MODULES = [
  {
    id: "ai-insights",
    title: "AI Insights & Intelligence",
    icon: Sparkles,
    color: "from-purple-500 to-indigo-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    description: "Master the AI-powered tools to deliver personalised coaching at scale.",
    lessons: [
      {
        id: "ai-1",
        type: "article",
        title: "Understanding AI Insights Panel",
        duration: "5 min read",
        content: `
## What is the AI Insights Panel?

The AI Insights Panel analyses all your client data — weight trends, food logs, progress logs, and wellness scores — and surfaces **actionable recommendations** so you can intervene before problems escalate.

### Key Features
- **Risk Flags**: Clients showing declining adherence or stalled progress are highlighted automatically.
- **Pattern Detection**: The AI identifies patterns (e.g. "Client always skips dinner on Fridays") so you can address root causes.
- **Personalised Suggestions**: Each recommendation is specific to the individual client's data, not generic advice.

### How to Access
1. Open any **Client Hub** (Clients → Select Client)
2. Click the **AI Insights** tab
3. Review flagged items and apply suggestions

### Best Practices
- Review AI flags at least **twice a week**
- Always validate AI suggestions against your clinical knowledge
- Use insights as conversation starters, not prescriptions
        `
      },
      {
        id: "ai-2",
        type: "video",
        title: "Using AI to Generate Meal Plans",
        duration: "8 min watch",
        videoEmbed: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        summary: "Learn how the AI meal plan generator works, how to customise the prompt, and how to review & edit the generated plan before assigning it to your client."
      },
      {
        id: "ai-3",
        type: "guide",
        title: "Best Practices: AI-Assisted Coaching",
        duration: "6 min read",
        content: `
## Best Practices for AI-Assisted Coaching

### ✅ Do's
- **Review every AI-generated plan** before sending to a client — you are the expert.
- Use **AI Credits wisely**: generate drafts, then manually fine-tune.
- Cross-reference AI suggestions with the client's **clinical intake** data.
- Use the "Regenerate" button if the first output doesn't match the client's preferences.

### ❌ Don'ts
- Never send an AI plan without reviewing nutritional totals.
- Don't rely solely on AI for clients with complex medical conditions (diabetes, kidney disease, etc.).
- Avoid using AI insights as a substitute for regular check-ins.

### Prompt Tips
When the AI asks for context, be specific:
- ❌ "Give me a healthy plan"
- ✅ "Create a 7-day 1400 kcal vegetarian plan for a 35-year-old woman with PCOS, lactose intolerance, and a goal of weight loss"

The more detail you provide, the better the output.
        `
      }
    ],
    quiz: {
      title: "AI Insights Quiz",
      questions: [
        {
          q: "What should you always do before sending an AI-generated meal plan to a client?",
          options: ["Send it immediately", "Review and customise it", "Delete it and write manually", "Ask the client to review it"],
          correct: 1
        },
        {
          q: "Where do you find the AI Insights panel for a client?",
          options: ["Dashboard → Analytics", "Clients → Client Hub → AI Insights tab", "Settings → AI Tools", "Messages → AI Bot"],
          correct: 1
        },
        {
          q: "Which type of client requires extra care when using AI-generated plans?",
          options: ["Clients who prefer vegetarian food", "Clients with complex medical conditions", "Clients who exercise daily", "Clients who want weight gain"],
          correct: 1
        }
      ]
    }
  },
  {
    id: "analytics",
    title: "Advanced Analytics",
    icon: BarChart3,
    color: "from-blue-500 to-cyan-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    description: "Unlock the power of data to grow your coaching business and improve outcomes.",
    lessons: [
      {
        id: "an-1",
        type: "article",
        title: "Reading the Business Analytics Dashboard",
        duration: "7 min read",
        content: `
## Business Analytics Dashboard

The **Business Analytics Dashboard** gives you a bird's-eye view of your entire practice. Here's how to read and act on every metric.

### Key Metrics Explained

| Metric | What it means | Action |
|--------|--------------|--------|
| Active Clients | Clients with at least one active meal plan | Aim to keep ≥80% active |
| Avg. Adherence | Average meal plan compliance across all clients | Below 70%? Increase check-ins |
| Weight Goal Progress | % of clients on track to hit their target | Flag clients below 50% |
| Message Response Rate | How quickly you reply to clients | Keep under 4 hours |

### Segmentation
Use the **Segmentation** page to group clients by goal, status, or risk level. This helps you send targeted messages and make batch updates.

### Monthly Reports
Export monthly PDF reports to track your practice growth over time. Share these with your team or use them for business planning.
        `
      },
      {
        id: "an-2",
        type: "video",
        title: "Client Progress Analytics Deep Dive",
        duration: "10 min watch",
        videoEmbed: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        summary: "A walkthrough of the Client Progress Analytics page — weight charts, food log heatmaps, wellness trends, and how to generate PDF progress reports."
      },
      {
        id: "an-3",
        type: "guide",
        title: "Using Analytics to Reduce Client Drop-off",
        duration: "5 min read",
        content: `
## Reducing Client Drop-off with Analytics

Client drop-off is the #1 challenge in health coaching. Here's how to use data to prevent it.

### Early Warning Signs (watch for these weekly)
- No food logs in **3+ days**
- No progress log in **7+ days**
- Message left unread for **2+ days** (by client)
- Weight trend going in wrong direction for **2+ weeks**

### The 3-Step Intervention Protocol
1. **Detect**: Use the analytics dashboard to identify at-risk clients
2. **Connect**: Send a personalised check-in message within 24 hours
3. **Adjust**: Modify the meal plan or goals to re-engage the client

### Proactive Scheduling
Analytics data shows that clients who receive a **check-in call in week 3** are 60% less likely to drop off. Use the Appointments feature to schedule these proactively.
        `
      }
    ],
    quiz: {
      title: "Analytics Quiz",
      questions: [
        {
          q: "What does 'Avg. Adherence' measure?",
          options: ["How often you message clients", "Average meal plan compliance across all clients", "Client satisfaction score", "Number of meal plans created"],
          correct: 1
        },
        {
          q: "How many days without a food log should trigger a check-in?",
          options: ["1 day", "3+ days", "7 days", "14 days"],
          correct: 1
        },
        {
          q: "What is the 3-step intervention protocol?",
          options: ["Plan, Execute, Review", "Detect, Connect, Adjust", "Message, Call, Visit", "Analyse, Report, Archive"],
          correct: 1
        }
      ]
    }
  },
  {
    id: "communication",
    title: "Client Communication Strategies",
    icon: MessageSquare,
    color: "from-green-500 to-emerald-600",
    bg: "bg-green-50",
    border: "border-green-200",
    description: "Build stronger client relationships with proven communication frameworks.",
    lessons: [
      {
        id: "cm-1",
        type: "article",
        title: "The CARE Communication Framework",
        duration: "6 min read",
        content: `
## The CARE Framework for Client Communication

Every message you send should follow the **CARE** framework:

- **C** — Celebrate a win (even small ones)
- **A** — Acknowledge a challenge they're facing
- **R** — Recommend a specific action
- **E** — Encourage and express confidence in them

### Example Message (Weight Stall)

> "Hi Priya! 🎉 Great job logging your meals every day this week — that consistency is huge! I noticed your weight has stayed the same for two weeks, which is totally normal and often means your body is adjusting. I'd like to tweak your lunch to reduce carbs slightly — I've updated your plan. You've already lost 4 kg and you're doing brilliantly. Keep going! 💪"

### Timing Recommendations
| Touchpoint | Frequency | Channel |
|-----------|-----------|---------|
| Progress check-in | Weekly | Message |
| Meal plan update | Monthly or as needed | Message + Plan update |
| Motivational nudge | 2–3× per week | Message |
| Appointment reminder | 24 hours before | Automated |
        `
      },
      {
        id: "cm-2",
        type: "video",
        title: "Using Group Messaging & Broadcasts",
        duration: "7 min watch",
        videoEmbed: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        summary: "How to create client groups, send broadcast messages, run polls, and use pinned messages for important announcements."
      },
      {
        id: "cm-3",
        type: "guide",
        title: "Handling Difficult Conversations",
        duration: "8 min read",
        content: `
## Handling Difficult Conversations with Clients

Difficult conversations are inevitable. Here's how to handle them professionally.

### Scenario 1: Client Not Following the Plan
**Wrong approach**: "You haven't followed your plan at all this week."
**Right approach**: "I noticed things got tough this week — what got in the way? Let's figure out what we can adjust to make it easier."

### Scenario 2: Client Losing Motivation
- Revisit their **original 'why'** — what motivated them to start?
- Celebrate **non-scale victories** (more energy, better sleep, clothes fitting better)
- Consider adjusting goals to something more immediately achievable

### Scenario 3: Client Unhappy with Results
- Acknowledge their frustration without being defensive
- Review the data together transparently
- Set clear, realistic expectations going forward

### Professional Boundaries
- Keep communication within platform hours (e.g., 9am–8pm)
- Use scheduled messages for off-hours
- For urgent medical concerns, always refer to a qualified doctor

### Using Message Templates
The platform has pre-built message templates for common scenarios. Access them via Messages → Templates to save time while maintaining quality.
        `
      }
    ],
    quiz: {
      title: "Communication Quiz",
      questions: [
        {
          q: "What does the 'C' in the CARE framework stand for?",
          options: ["Check-in", "Celebrate a win", "Create a plan", "Calculate macros"],
          correct: 1
        },
        {
          q: "How often should you send motivational nudges to clients?",
          options: ["Once a month", "Every day", "2–3 times per week", "Only when they ask"],
          correct: 2
        },
        {
          q: "When a client is unhappy with results, what should you do first?",
          options: ["Offer a refund", "Acknowledge their frustration without being defensive", "Tell them they're not trying hard enough", "Reduce their calorie target immediately"],
          correct: 1
        }
      ]
    }
  },
  {
    id: "progress",
    title: "Progress Tracking Mastery",
    icon: TrendingUp,
    color: "from-orange-500 to-red-500",
    bg: "bg-orange-50",
    border: "border-orange-200",
    description: "Learn to interpret progress data and make evidence-based plan adjustments.",
    lessons: [
      {
        id: "pt-1",
        type: "article",
        title: "Beyond the Scale: Holistic Progress Tracking",
        duration: "6 min read",
        content: `
## Holistic Progress Tracking

Weight is just one metric. Great coaches track multiple dimensions of health.

### The 5 Pillars of Progress
1. **Body Composition**: Weight + measurements (waist, hips, arms, thighs)
2. **Energy Levels**: Tracked via daily wellness logs (1–10 score)
3. **Sleep Quality**: Logged in progress reports
4. **Dietary Adherence**: % of meals followed vs. planned
5. **MPESS Wellness**: Mind, Physical, Emotional, Social, Spiritual scores

### How to Track in the Platform
- Clients log progress via their portal (My Progress page)
- You review logs in Client Hub → Progress tab
- Weekly reviews take about 3–5 minutes per client

### Interpreting the Data
- **Weight plateau + good adherence**: May need calorie adjustment (usually –100 kcal)
- **Low adherence**: Focus on habit change, not plan change
- **Declining energy**: Check sleep and water intake, consider increasing carbs slightly
- **Good energy, slow weight loss**: Possibly underreporting food — increase accountability
        `
      },
      {
        id: "pt-2",
        type: "guide",
        title: "Creating Progress Reports for Clients",
        duration: "4 min read",
        content: `
## Creating Progress Reports

Progress reports are powerful tools for client retention and motivation.

### When to Create Reports
- At the **1-month mark** (first major milestone)
- Every **3 months** thereafter
- Before/after a plan change

### What to Include
1. Starting metrics vs. current metrics
2. Total weight change
3. Body measurement changes
4. Adherence score
5. Key achievements (non-scale wins)
6. Next 30-day goals

### How to Generate
1. Go to **Client Reports** in the sidebar
2. Select client and period
3. Add custom notes
4. Click "Generate PDF"
5. Download and share with client

### Using Reports for Retention
Sharing a well-formatted report showing real progress significantly increases client confidence and long-term engagement. Consider scheduling a brief call to walk through the report together.
        `
      }
    ],
    quiz: {
      title: "Progress Tracking Quiz",
      questions: [
        {
          q: "If a client has good adherence but a weight plateau, what adjustment should you consider?",
          options: ["Completely change the diet type", "Decrease calories by ~100 kcal", "Tell them to exercise more", "Stop the program"],
          correct: 1
        },
        {
          q: "What does MPESS stand for in wellness tracking?",
          options: ["Meal, Protein, Exercise, Sleep, Supplements", "Mind, Physical, Emotional, Social, Spiritual", "Motivation, Plan, Energy, Schedule, Support", "Macros, Progress, Energy, Stress, Sleep"],
          correct: 1
        },
        {
          q: "When is the best time to create a progress report for a new client?",
          options: ["After 1 week", "At the 1-month mark", "After 6 months", "Only when the client asks"],
          correct: 1
        }
      ]
    }
  }
];

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function LessonContent({ lesson, onComplete, isCompleted }) {
  return (
    <div className="space-y-6">
      {lesson.type === "video" && (
        <div className="space-y-4">
          <div className="aspect-video rounded-xl overflow-hidden bg-black shadow-lg">
            <iframe
              src={lesson.videoEmbed}
              title={lesson.title}
              className="w-full h-full"
              allowFullScreen
            />
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="font-semibold text-blue-900 mb-1">Summary</h4>
            <p className="text-blue-800 text-sm">{lesson.summary}</p>
          </div>
        </div>
      )}

      {(lesson.type === "article" || lesson.type === "guide") && (
        <div className="prose prose-sm max-w-none">
          <div className="bg-white rounded-xl p-6 shadow-sm border space-y-4">
            {lesson.content.trim().split('\n').map((line, i) => {
              if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold text-gray-900 mt-6 mb-2">{line.replace('## ', '')}</h2>;
              if (line.startsWith('### ')) return <h3 key={i} className="text-base font-semibold text-gray-800 mt-4 mb-1">{line.replace('### ', '')}</h3>;
              if (line.startsWith('- **')) {
                const match = line.match(/- \*\*(.+?)\*\*[:\s—–-]*(.*)/);
                return match ? (
                  <div key={i} className="flex gap-2 text-sm"><span className="text-orange-600 font-bold mt-0.5">•</span><span><strong>{match[1]}:</strong> {match[2]}</span></div>
                ) : <p key={i} className="text-sm text-gray-700">{line.replace(/\*\*/g, '')}</p>;
              }
              if (line.startsWith('- ') || line.startsWith('* ')) return <div key={i} className="flex gap-2 text-sm text-gray-700"><span className="text-orange-500 mt-1">•</span><span>{line.replace(/^[-*] /, '').replace(/\*\*/g, '')}</span></div>;
              if (line.match(/^\d\. /)) return <div key={i} className="flex gap-2 text-sm text-gray-700"><span className="font-bold text-orange-600">{line.match(/^(\d)/)[1]}.</span><span>{line.replace(/^\d\. /, '').replace(/\*\*/g, '')}</span></div>;
              if (line.startsWith('|')) return null; // skip table lines in simple renderer
              if (line.startsWith('> ')) return <blockquote key={i} className="border-l-4 border-orange-400 pl-4 italic text-gray-700 bg-orange-50 py-2 rounded-r">{line.replace('> ', '')}</blockquote>;
              if (line.trim() === '') return null;
              return <p key={i} className="text-sm text-gray-700 leading-relaxed">{line.replace(/\*\*/g, '')}</p>;
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        {isCompleted ? (
          <Badge className="bg-green-600 text-white flex items-center gap-1 px-4 py-2 text-sm">
            <CheckCircle2 className="w-4 h-4" /> Completed
          </Badge>
        ) : (
          <Button onClick={onComplete} className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
            Mark as Complete <CheckCircle2 className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}

function QuizComponent({ quiz, onFinish }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(false);

  const handleAnswer = (idx) => {
    if (selected !== null) return;
    setSelected(idx);
  };

  const handleNext = () => {
    const newAnswers = [...answers, { selected, correct: quiz.questions[current].correct }];
    setAnswers(newAnswers);
    if (current + 1 < quiz.questions.length) {
      setCurrent(current + 1);
      setSelected(null);
    } else {
      setFinished(true);
    }
  };

  const score = answers.filter(a => a.selected === a.correct).length;

  if (finished) {
    const pct = Math.round((score / quiz.questions.length) * 100);
    return (
      <div className="text-center space-y-6 py-8">
        <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center ${pct >= 70 ? 'bg-green-100' : 'bg-red-100'}`}>
          {pct >= 70 ? <Trophy className="w-12 h-12 text-green-600" /> : <RefreshCw className="w-12 h-12 text-red-500" />}
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">{pct >= 70 ? 'Well Done!' : 'Keep Practicing!'}</h3>
          <p className="text-gray-600 mt-1">You scored <strong>{score}/{quiz.questions.length}</strong> ({pct}%)</p>
        </div>
        <Progress value={pct} className="max-w-xs mx-auto" />
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => { setCurrent(0); setSelected(null); setAnswers([]); setFinished(false); }}>
            <RefreshCw className="w-4 h-4 mr-2" /> Retry Quiz
          </Button>
          {pct >= 70 && (
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={onFinish}>
              <CheckCircle2 className="w-4 h-4 mr-2" /> Complete Module
            </Button>
          )}
        </div>
      </div>
    );
  }

  const q = quiz.questions[current];
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">Question {current + 1} of {quiz.questions.length}</span>
        <Progress value={((current) / quiz.questions.length) * 100} className="w-32" />
      </div>
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="text-base font-semibold text-gray-900 mb-5">{q.q}</h3>
        <div className="space-y-3">
          {q.options.map((opt, idx) => {
            let style = "border-gray-200 hover:border-orange-300 hover:bg-orange-50 cursor-pointer";
            if (selected !== null) {
              if (idx === q.correct) style = "border-green-500 bg-green-50";
              else if (idx === selected && selected !== q.correct) style = "border-red-400 bg-red-50";
              else style = "border-gray-200 opacity-50";
            }
            return (
              <div
                key={idx}
                onClick={() => handleAnswer(idx)}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${style}`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 
                  ${selected === null ? 'bg-gray-100 text-gray-600' : idx === q.correct ? 'bg-green-500 text-white' : idx === selected ? 'bg-red-400 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-sm text-gray-800">{opt}</span>
                {selected !== null && idx === q.correct && <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" />}
                {selected !== null && idx === selected && selected !== q.correct && <XCircle className="w-4 h-4 text-red-500 ml-auto" />}
              </div>
            );
          })}
        </div>
      </div>
      {selected !== null && (
        <div className="flex justify-end">
          <Button onClick={handleNext} className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
            {current + 1 < quiz.questions.length ? 'Next Question' : 'See Results'} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function CoachTraining() {
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [activeTab, setActiveTab] = useState("lesson"); // "lesson" | "quiz"
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [completedModules, setCompletedModules] = useState(new Set());

  const moduleProgress = (mod) => {
    const total = mod.lessons.length;
    const done = mod.lessons.filter(l => completedLessons.has(l.id)).length;
    return Math.round((done / total) * 100);
  };

  const totalProgress = () => {
    const totalLessons = MODULES.reduce((s, m) => s + m.lessons.length, 0);
    return Math.round((completedLessons.size / totalLessons) * 100);
  };

  const markLessonComplete = (lessonId) => {
    setCompletedLessons(prev => new Set([...prev, lessonId]));
  };

  const markModuleComplete = (modId) => {
    setCompletedModules(prev => new Set([...prev, modId]));
    setSelectedModule(null);
    setSelectedLesson(null);
    setActiveTab("lesson");
  };

  // ── Lesson Detail View ───────────────────────────────────────
  if (selectedLesson) {
    const lesson = selectedModule.lessons.find(l => l.id === selectedLesson);
    const lessonIdx = selectedModule.lessons.findIndex(l => l.id === selectedLesson);
    const typeIcon = lesson.type === "video" ? PlayCircle : lesson.type === "guide" ? BookOpen : FileText;
    const TypeIcon = typeIcon;

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedLesson(null)} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Module
            </Button>
            <Badge variant="outline" className="capitalize flex items-center gap-1">
              <TypeIcon className="w-3 h-3" /> {lesson.type}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {lesson.duration}
            </Badge>
          </div>
          <Card className="border-none shadow-xl">
            <CardHeader className={`bg-gradient-to-r ${selectedModule.color} text-white rounded-t-xl`}>
              <CardTitle className="text-2xl">{lesson.title}</CardTitle>
              <p className="text-white/80 text-sm">{selectedModule.title}</p>
            </CardHeader>
            <CardContent className="p-6">
              <LessonContent
                lesson={lesson}
                isCompleted={completedLessons.has(lesson.id)}
                onComplete={() => markLessonComplete(lesson.id)}
              />
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <Button variant="outline" disabled={lessonIdx === 0} onClick={() => setSelectedLesson(selectedModule.lessons[lessonIdx - 1].id)} className="gap-2">
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            {lessonIdx < selectedModule.lessons.length - 1 ? (
              <Button onClick={() => setSelectedLesson(selectedModule.lessons[lessonIdx + 1].id)} className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white">
                Next Lesson <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={() => { setSelectedLesson(null); setActiveTab("quiz"); }} className="gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                Take Quiz <Brain className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Module View ───────────────────────────────────────────────
  if (selectedModule) {
    const prog = moduleProgress(selectedModule);
    const ModIcon = selectedModule.icon;
    const allLessonsDone = selectedModule.lessons.every(l => completedLessons.has(l.id));

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedModule(null); setActiveTab("lesson"); }} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> All Modules
          </Button>

          <Card className="border-none shadow-xl">
            <CardHeader className={`bg-gradient-to-r ${selectedModule.color} text-white rounded-t-xl`}>
              <div className="flex items-center gap-3">
                <ModIcon className="w-8 h-8" />
                <div>
                  <CardTitle className="text-2xl">{selectedModule.title}</CardTitle>
                  <p className="text-white/80 text-sm">{selectedModule.description}</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-white/80 mb-1">
                  <span>Module Progress</span><span>{prog}%</span>
                </div>
                <div className="w-full bg-white/30 rounded-full h-2">
                  <div className="bg-white h-2 rounded-full transition-all duration-500" style={{ width: `${prog}%` }} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Tabs */}
              <div className="flex gap-2 mb-6">
                <Button size="sm" variant={activeTab === "lesson" ? "default" : "outline"} onClick={() => setActiveTab("lesson")} className={activeTab === "lesson" ? "bg-gray-900" : ""}>
                  <BookOpen className="w-4 h-4 mr-2" /> Lessons
                </Button>
                <Button size="sm" variant={activeTab === "quiz" ? "default" : "outline"} onClick={() => setActiveTab("quiz")}
                  className={activeTab === "quiz" ? "bg-gray-900" : ""}
                  disabled={!allLessonsDone && !completedModules.has(selectedModule.id)}>
                  <Brain className="w-4 h-4 mr-2" /> Quiz
                  {!allLessonsDone && <Lock className="w-3 h-3 ml-2 text-gray-400" />}
                </Button>
              </div>

              {activeTab === "lesson" && (
                <div className="space-y-3">
                  {selectedModule.lessons.map((lesson, idx) => {
                    const done = completedLessons.has(lesson.id);
                    const TypeIcon = lesson.type === "video" ? PlayCircle : lesson.type === "guide" ? BookOpen : FileText;
                    const typeColor = lesson.type === "video" ? "text-blue-600" : lesson.type === "guide" ? "text-green-600" : "text-orange-600";
                    return (
                      <div
                        key={lesson.id}
                        onClick={() => setSelectedLesson(lesson.id)}
                        className="flex items-center gap-4 p-4 bg-white rounded-xl border hover:border-orange-300 hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-green-100' : 'bg-gray-100'}`}>
                          {done ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <span className="font-bold text-gray-500 text-sm">{idx + 1}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors truncate">{lesson.title}</h4>
                          <div className="flex items-center gap-3 mt-1">
                            <span className={`flex items-center gap-1 text-xs ${typeColor}`}>
                              <TypeIcon className="w-3 h-3" /> {lesson.type}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" /> {lesson.duration}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500 flex-shrink-0" />
                      </div>
                    );
                  })}
                  {!allLessonsDone && (
                    <p className="text-xs text-center text-gray-500 pt-2">Complete all lessons to unlock the quiz.</p>
                  )}
                </div>
              )}

              {activeTab === "quiz" && (
                <QuizComponent quiz={selectedModule.quiz} onFinish={() => markModuleComplete(selectedModule.id)} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Home View ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Coach Training Academy</h1>
          <p className="text-gray-600 max-w-xl mx-auto">Master advanced platform features with video tutorials, in-depth guides, and comprehension quizzes.</p>
        </div>

        {/* Overall Progress */}
        <Card className="border-none shadow-lg bg-gradient-to-r from-gray-900 to-gray-800 text-white">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1 w-full">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-semibold">Overall Training Progress</span>
                  <span>{totalProgress()}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3">
                  <div className="bg-gradient-to-r from-orange-400 to-red-400 h-3 rounded-full transition-all duration-700" style={{ width: `${totalProgress()}%` }} />
                </div>
                <p className="text-xs text-white/60 mt-2">{completedLessons.size} of {MODULES.reduce((s, m) => s + m.lessons.length, 0)} lessons completed · {completedModules.size} of {MODULES.length} modules passed</p>
              </div>
              {completedModules.size === MODULES.length && (
                <div className="flex items-center gap-2 bg-yellow-400 text-yellow-900 rounded-xl px-4 py-2 font-bold">
                  <Trophy className="w-5 h-5" /> Certified Coach!
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MODULES.map((mod) => {
            const prog = moduleProgress(mod);
            const ModIcon = mod.icon;
            const done = completedModules.has(mod.id);
            const lessonTypes = { video: 0, article: 0, guide: 0 };
            mod.lessons.forEach(l => lessonTypes[l.type]++);

            return (
              <Card
                key={mod.id}
                onClick={() => setSelectedModule(mod)}
                className={`border-2 ${mod.border} shadow-lg hover:shadow-xl transition-all cursor-pointer group ${done ? 'ring-2 ring-green-400' : ''}`}
              >
                <CardHeader className={`bg-gradient-to-r ${mod.color} text-white rounded-t-xl`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <ModIcon className="w-7 h-7" />
                      <CardTitle className="text-lg">{mod.title}</CardTitle>
                    </div>
                    {done && <Badge className="bg-white/20 text-white border-white/30"><Star className="w-3 h-3 mr-1" /> Passed</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <p className="text-sm text-gray-600">{mod.description}</p>
                  <div className="flex gap-2 flex-wrap">
                    {lessonTypes.video > 0 && <Badge variant="outline" className="text-blue-600 border-blue-200 text-xs"><PlayCircle className="w-3 h-3 mr-1" />{lessonTypes.video} Video{lessonTypes.video > 1 ? 's' : ''}</Badge>}
                    {lessonTypes.article > 0 && <Badge variant="outline" className="text-orange-600 border-orange-200 text-xs"><FileText className="w-3 h-3 mr-1" />{lessonTypes.article} Article{lessonTypes.article > 1 ? 's' : ''}</Badge>}
                    {lessonTypes.guide > 0 && <Badge variant="outline" className="text-green-600 border-green-200 text-xs"><BookOpen className="w-3 h-3 mr-1" />{lessonTypes.guide} Guide{lessonTypes.guide > 1 ? 's' : ''}</Badge>}
                    <Badge variant="outline" className="text-purple-600 border-purple-200 text-xs"><Brain className="w-3 h-3 mr-1" />Quiz</Badge>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span><span>{prog}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className={`bg-gradient-to-r ${mod.color} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${prog}%` }} />
                    </div>
                  </div>
                  <Button size="sm" className={`w-full bg-gradient-to-r ${mod.color} text-white group-hover:opacity-90 transition-opacity`}>
                    {prog === 0 ? 'Start Module' : prog === 100 ? 'Review Module' : 'Continue'} <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Legend */}
        <Card className="border-none shadow-md">
          <CardContent className="p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Content Types</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: PlayCircle, label: "Video Tutorials", color: "text-blue-600 bg-blue-50", desc: "Visual walkthroughs" },
                { icon: FileText, label: "Articles", color: "text-orange-600 bg-orange-50", desc: "Deep-dive reads" },
                { icon: BookOpen, label: "Best Practice Guides", color: "text-green-600 bg-green-50", desc: "Actionable frameworks" },
                { icon: Brain, label: "Quizzes", color: "text-purple-600 bg-purple-50", desc: "Test your knowledge" },
              ].map(({ icon: Icon, label, color, desc }) => (
                <div key={label} className={`flex items-start gap-3 p-3 rounded-xl ${color.split(' ')[1]}`}>
                  <Icon className={`w-5 h-5 mt-0.5 ${color.split(' ')[0]}`} />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}