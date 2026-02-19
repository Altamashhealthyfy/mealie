import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, X, Send, Loader2, User, Bot, Lightbulb,
  TrendingDown, TrendingUp, AlertTriangle, BarChart2, ChevronDown, ChevronUp,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const QUICK_PROMPTS = [
  { label: "📝 Draft client message", prompt: "Help me draft a personalized motivational message for a client who has been consistently losing weight but seems to be hitting a plateau." },
  { label: "🎯 Suggest challenge", prompt: "Suggest an appropriate 7-day challenge for a client whose goal is weight loss and has moderate activity level." },
  { label: "📊 Summarize progress", prompt: "What are the key metrics I should look at to summarize a client's 30-day progress trends?" },
  { label: "🥗 Nutrition query", prompt: "A client is asking whether they should take protein supplements on rest days. What should I advise?" },
  { label: "💪 Goal setting tips", prompt: "How should I set SMART goals for a client who wants to lose 10 kg in 3 months?" },
  { label: "🧘 MPESS guidance", prompt: "What MPESS practices should I recommend for a client with high stress and poor sleep quality?" },
  { label: "📈 Analyze plateau", prompt: null, isAnalysis: true, analysisType: "plateau" },
  { label: "🔮 Predict trend", prompt: null, isAnalysis: true, analysisType: "prediction" },
  { label: "💡 Suggest intervention", prompt: null, isAnalysis: true, analysisType: "intervention" },
];

const SYSTEM_PROMPT = `You are an expert AI assistant for health coaches and dietitians. You help coaches with:
1. Drafting personalized client messages based on progress data
2. Suggesting appropriate challenges or goals for clients
3. Analyzing progress trends, detecting plateaus and regressions
4. Predicting future progress and providing confidence scores
5. Suggesting personalized interventions based on data patterns
6. Answering nutrition, fitness, and wellness questions

You have expertise in:
- Nutritional science and Indian regional cuisine
- Weight management and body composition
- Disease management through diet (diabetes, hypertension, PCOS, thyroid, etc.)
- Behavioral coaching and client motivation
- Exercise science and physical activity recommendations
- Wellness tracking and habit formation
- Statistical trend analysis for health outcomes

When analyzing data, always:
- Identify specific patterns with data points
- Provide a confidence score (%) for predictions
- Give actionable, evidence-based recommendations
- Be empathetic and practical in suggestions

Format responses clearly with markdown sections, bullet points, and bold key insights.`;

// ─── Analytics helpers ───────────────────────────────────────────────────────

function detectPlateauOrRegression(logs) {
  if (!logs || logs.length < 3) return null;
  const sorted = [...logs].filter(l => l.weight).sort((a, b) => new Date(a.date) - new Date(b.date));
  if (sorted.length < 3) return null;

  const recent = sorted.slice(-6);
  const weights = recent.map(l => l.weight);
  const first = weights[0], last = weights[weights.length - 1];
  const change = last - first;
  const avgChange = change / (weights.length - 1);
  const variance = weights.reduce((acc, w) => acc + Math.pow(w - (weights.reduce((s, x) => s + x, 0) / weights.length), 2), 0) / weights.length;

  const isPlateaued = Math.abs(change) < 0.5 && variance < 0.5;
  const isRegressing = change > 1.0;

  // Wellness trend
  const wellnessLogs = logs.filter(l => l.wellness_metrics?.energy_level).slice(-7);
  const avgEnergy = wellnessLogs.reduce((s, l) => s + (l.wellness_metrics?.energy_level || 0), 0) / (wellnessLogs.length || 1);
  const avgSleep = wellnessLogs.reduce((s, l) => s + (l.wellness_metrics?.sleep_hours || 0), 0) / (wellnessLogs.length || 1);
  const avgWater = wellnessLogs.reduce((s, l) => s + (l.wellness_metrics?.water_intake || 0), 0) / (wellnessLogs.length || 1);
  const avgExercise = wellnessLogs.reduce((s, l) => s + (l.wellness_metrics?.exercise_minutes || 0), 0) / (wellnessLogs.length || 1);

  return {
    isPlateaued,
    isRegressing,
    weightChange: change.toFixed(2),
    avgWeeklyChange: (avgChange * 7).toFixed(2),
    recentWeights: weights,
    dates: recent.map(l => l.date),
    avgEnergy: avgEnergy.toFixed(1),
    avgSleep: avgSleep.toFixed(1),
    avgWater: avgWater.toFixed(2),
    avgExercise: Math.round(avgExercise),
    logCount: logs.length,
  };
}

function predictTrend(logs) {
  if (!logs || logs.length < 5) return null;
  const sorted = [...logs].filter(l => l.weight).sort((a, b) => new Date(a.date) - new Date(b.date));
  if (sorted.length < 5) return null;

  // Linear regression on weight
  const n = sorted.length;
  const xVals = sorted.map((_, i) => i);
  const yVals = sorted.map(l => l.weight);
  const xMean = xVals.reduce((s, x) => s + x, 0) / n;
  const yMean = yVals.reduce((s, y) => s + y, 0) / n;
  const slope = xVals.reduce((s, x, i) => s + (x - xMean) * (yVals[i] - yMean), 0) /
                xVals.reduce((s, x) => s + Math.pow(x - xMean, 2), 0);
  const intercept = yMean - slope * xMean;

  // Predicted weight in 30 and 60 days (assuming avg log frequency)
  const daySpan = (new Date(sorted[n - 1].date) - new Date(sorted[0].date)) / (1000 * 60 * 60 * 24);
  const logsPerDay = n / (daySpan || 1);
  const predict30 = intercept + slope * (n + 30 * logsPerDay);
  const predict60 = intercept + slope * (n + 60 * logsPerDay);

  // R² confidence
  const ssRes = yVals.reduce((s, y, i) => s + Math.pow(y - (intercept + slope * i), 2), 0);
  const ssTot = yVals.reduce((s, y) => s + Math.pow(y - yMean, 2), 0);
  const rSquared = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);
  const confidence = Math.round(rSquared * 100);

  return {
    currentWeight: yVals[n - 1].toFixed(1),
    predict30: predict30.toFixed(1),
    predict60: predict60.toFixed(1),
    weeklyRate: (slope * 7 * logsPerDay).toFixed(2),
    confidence,
    trend: slope < -0.01 ? "losing" : slope > 0.01 ? "gaining" : "maintaining",
    dataPoints: n,
  };
}

function buildAnalyticsContext(clients, progressLogs, selectedClientId) {
  const client = clients.find(c => c.id === selectedClientId);
  const clientLogs = selectedClientId
    ? progressLogs.filter(l => l.client_id === selectedClientId)
    : progressLogs;

  const analysis = detectPlateauOrRegression(clientLogs);
  const prediction = predictTrend(clientLogs);

  return { client, clientLogs, analysis, prediction };
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CoachAIAssistant({ clients = [], progressLogs = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("chat"); // "chat" | "analytics"
  const [selectedClientId, setSelectedClientId] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "👋 Hi! I'm your AI Coach Assistant. I can help you **draft client messages**, **analyze progress trends**, **detect plateaus**, **predict outcomes**, and suggest **personalized interventions**. What can I help you with today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsResult, setAnalyticsResult] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && activeTab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [messages, isOpen, activeTab]);

  const buildContextSummary = () => {
    const activeClients = clients.filter(c => c.status === 'active').length;
    return `Coach context: ${clients.length} total clients (${activeClients} active). ${progressLogs.length} total progress log entries available.`;
  };

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || isLoading) return;

    setInput("");
    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setIsLoading(true);

    const contextSummary = buildContextSummary();
    const fullPrompt = `${SYSTEM_PROMPT}\n\nContext: ${contextSummary}\n\nConversation:\n${newMessages.map(m => `${m.role === 'user' ? 'Coach' : 'Assistant'}: ${m.content}`).join('\n')}\n\nAssistant:`;

    const response = await base44.integrations.Core.InvokeLLM({ prompt: fullPrompt });
    setMessages(prev => [...prev, { role: "assistant", content: response }]);
    setIsLoading(false);
  };

  const runAnalysis = async (type) => {
    const { client, clientLogs, analysis, prediction } = buildAnalyticsContext(clients, progressLogs, selectedClientId);

    if (clientLogs.length < 3) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "⚠️ Not enough progress data to run a meaningful analysis. Please select a client with at least 3 progress log entries."
      }]);
      setActiveTab("chat");
      return;
    }

    let prompt = "";
    const clientName = client?.full_name || "the selected client";
    const dataSnippet = JSON.stringify({ analysis, prediction }, null, 2);

    if (type === "plateau") {
      prompt = `${SYSTEM_PROMPT}

A health coach needs you to analyze a potential plateau or regression for ${clientName}.

Computed analytics from their progress logs:
${dataSnippet}

Please provide:
1. **Plateau/Regression Assessment** — Is this client plateaued, regressing, or progressing normally? Be specific.
2. **Root Cause Analysis** — Based on the wellness metrics (energy, sleep, water, exercise), identify likely causes.
3. **Severity Rating** — Rate 1–5 (1=minor, 5=critical) and explain why.
4. **Immediate Actions** — 3 specific actions the coach should take this week.`;
    } else if (type === "prediction") {
      prompt = `${SYSTEM_PROMPT}

A health coach wants a future progress prediction for ${clientName}.

Computed analytics and trend data:
${dataSnippet}

Please provide:
1. **Trend Summary** — Describe the current trend clearly.
2. **30-Day Prediction** — Expected weight/metric at 30 days with confidence score (${prediction?.confidence}% based on R²).
3. **60-Day Prediction** — Expected weight/metric at 60 days.
4. **Risk Factors** — What could cause the prediction to be wrong?
5. **Confidence Explanation** — Explain what the ${prediction?.confidence}% confidence score means practically for the coach.`;
    } else if (type === "intervention") {
      prompt = `${SYSTEM_PROMPT}

A health coach needs personalized intervention suggestions for ${clientName} based on their current progress patterns.

Computed analytics:
${dataSnippet}

Client goal: ${client?.goal || "not specified"}. Food preference: ${client?.food_preference || "not specified"}.

Please provide:
1. **Plan Adjustment Recommendations** — Specific changes to meal plan, calorie targets, or macros based on the trend.
2. **Behavioral Interventions** — 3 habit changes or coaching tactics suited to this client's patterns.
3. **MPESS Suggestions** — Which MPESS pillar needs attention and specific practices.
4. **Communication Script** — A short script the coach can use when speaking to this client about the intervention.
5. **Success Metrics** — How should the coach measure if the intervention is working after 2 weeks?`;
    }

    setActiveTab("chat");
    setMessages(prev => [...prev, {
      role: "user",
      content: type === "plateau" ? `Analyze plateau/regression for ${clientName}` :
               type === "prediction" ? `Predict future trend for ${clientName}` :
               `Suggest interventions for ${clientName}`
    }]);
    setIsLoading(true);

    const response = await base44.integrations.Core.InvokeLLM({ prompt });
    setMessages(prev => [...prev, { role: "assistant", content: response }]);
    setIsLoading(false);
  };

  const handleQuickPrompt = (qp) => {
    if (qp.isAnalysis) {
      runAnalysis(qp.analysisType);
    } else {
      sendMessage(qp.prompt);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Compute live stats for selected client
  const { analysis, prediction } = buildAnalyticsContext(clients, progressLogs, selectedClientId);
  const activeClients = clients.filter(c => c.status === 'active');

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95"
          style={{ background: "linear-gradient(135deg, #f97316, #dc2626)" }}
          title="AI Coach Assistant"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[620px] max-h-[calc(100vh-5rem)] flex flex-col bg-white rounded-2xl shadow-2xl border border-orange-100 overflow-hidden">
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #f97316, #dc2626)" }}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-sm">AI Coach Assistant</p>
                <p className="text-xs opacity-80">Insights · Predictions · Interventions</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Client Selector + Tab Bar */}
          <div className="px-3 pt-2 pb-1 bg-white border-b border-gray-100 flex-shrink-0 space-y-2">
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="🔍 Focus on a client (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>All clients</SelectItem>
                {activeClients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Mini stats when client is selected */}
            {selectedClientId && analysis && (
              <div className="flex gap-2 flex-wrap">
                {analysis.isPlateaued && (
                  <Badge className="bg-amber-100 text-amber-700 text-xs flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Plateau detected
                  </Badge>
                )}
                {analysis.isRegressing && (
                  <Badge className="bg-red-100 text-red-700 text-xs flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" /> Regression
                  </Badge>
                )}
                {!analysis.isPlateaued && !analysis.isRegressing && (
                  <Badge className="bg-green-100 text-green-700 text-xs flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> On track
                  </Badge>
                )}
                {prediction && (
                  <Badge className="bg-blue-100 text-blue-700 text-xs flex items-center gap-1">
                    <BarChart2 className="w-3 h-3" /> {prediction.confidence}% confidence
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-br-sm"
                      : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <ReactMarkdown className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_ul]:my-1 [&_li]:my-0 [&_p]:my-1">
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-3.5 h-3.5 text-gray-600" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100">
                  <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-2 border-t border-gray-100 bg-white flex-shrink-0">
            <div className="flex items-center gap-1 mb-1.5">
              <Lightbulb className="w-3 h-3 text-orange-500" />
              <span className="text-xs text-gray-500 font-medium">Quick prompts</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickPrompt(qp)}
                  disabled={isLoading}
                  className={`flex-shrink-0 text-xs px-2.5 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${
                    qp.isAnalysis
                      ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                      : "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                  }`}
                >
                  {qp.label}
                </button>
              ))}
            </div>
            {!selectedClientId && (
              <p className="text-xs text-gray-400 mt-1">💡 Select a client above to enable plateau detection, trend prediction & interventions</p>
            )}
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 bg-white flex-shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about coaching..."
                disabled={isLoading}
                className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-gray-50 disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-all hover:scale-105 active:scale-95 flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #f97316, #dc2626)" }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}