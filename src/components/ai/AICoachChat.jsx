import React, { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Loader2, AlertTriangle, Lightbulb, Zap, Bot, User, Trash2, MessageSquare, Bell, ClipboardList, CheckCircle2, Copy, HelpCircle, ChevronDown, ChevronUp, Users } from "lucide-react";

const FEATURE_GUIDE = [
  {
    title: "Dashboard",
    icon: "🏠",
    description: "Your main overview hub showing today's key stats, active client alerts, recent activity, and quick access to all tools.",
    benefits: ["See all clients at a glance", "Spot urgent issues quickly", "Track daily activity"],
    usage: "Open each day to review who needs attention, check unread messages, and take quick actions.",
  },
  {
    title: "Client Management",
    icon: "👥",
    description: "Add, search, and manage all your client profiles including their health data, goals, dietary preferences, and program status.",
    benefits: ["Centralized client records", "Filter by status/goal/plan", "Bulk actions support"],
    usage: "Use to onboard new clients, update profiles, assign meal plans, and monitor active vs. inactive clients.",
  },
  {
    title: "Meal Plans",
    icon: "🍽️",
    description: "Create AI-powered or manual meal plans tailored to each client's calorie targets, food preferences, and regional cuisine.",
    benefits: ["AI generates complete plans in seconds", "Disease-specific advanced plans", "Assign directly to client"],
    usage: "Select a client, choose Basic or Pro plan, configure preferences, and generate or build manually.",
  },
  {
    title: "Progress Review",
    icon: "📊",
    description: "Review client-submitted progress logs including weight, body measurements, photos, and wellness metrics.",
    benefits: ["See daily/weekly progress", "Leave feedback and ratings", "Track measurement trends"],
    usage: "Check daily for new submissions, review logs, add coach feedback, and mark entries as reviewed.",
  },
  {
    title: "AI Coach Insights",
    icon: "✨",
    description: "AI-powered analysis of client data including progress reports, risk assessments, educational material, and this chat assistant.",
    benefits: ["Weekly/monthly AI reports", "Risk flag detection", "Personalized education content"],
    usage: "Select a client, then choose a tab: Chat for questions, Progress Report for period analysis, Risk Assessment for red flags, Education for content.",
  },
  {
    title: "AI Coach Chat (This!)",
    icon: "🤖",
    description: "Ask any question about a selected client and get AI answers backed by their actual data — logs, goals, meal plans, and clinical intake.",
    benefits: ["Context-aware answers using real client data", "Proactive scan detects issues automatically", "Suggested check-in messages ready to copy"],
    usage: "Select a client, then type a question or use quick prompts. Use 'Proactive Scan' to auto-detect trends and 'Summarize' for a full status overview.",
  },
  {
    title: "Messages",
    icon: "💬",
    description: "Real-time messaging between coaches and clients, with support for group chats, file sharing, polls, and scheduled messages.",
    benefits: ["Direct client communication", "File and photo sharing", "Schedule messages in advance"],
    usage: "Click a client to open their chat. Use the '+' to attach files, create polls, or schedule a message for later.",
  },
  {
    title: "Appointments",
    icon: "📅",
    description: "Schedule, manage, and track client consultations and follow-ups with Google Calendar sync.",
    benefits: ["Google Calendar integration", "Automated reminders", "Track attendance and payment"],
    usage: "Click 'New Appointment', pick client and time, enable Google Calendar sync, then send reminders.",
  },
  {
    title: "MPESS Tracker",
    icon: "❤️",
    description: "Track client holistic wellness across Mind, Physical, Emotional, Social, and Spiritual dimensions.",
    benefits: ["Holistic health view beyond nutrition", "Coach review and notes", "Trend tracking over time"],
    usage: "Review client MPESS submissions, add your observations, and use insights in your coaching conversations.",
  },
  {
    title: "Risk Assessment",
    icon: "🛡️",
    description: "AI scans client data to identify health risks, warning signs, and areas requiring immediate attention.",
    benefits: ["Proactive risk detection", "Priority action list", "Escalation recommendations"],
    usage: "Go to AI Coach Insights → Risk Assessment tab, select a client, and click Generate to get a risk analysis.",
  },
  {
    title: "Progress Reports",
    icon: "📈",
    description: "Generate structured weekly or monthly AI reports summarizing weight trends, adherence, wellness, goals, and recommendations.",
    benefits: ["Ready-to-share client report", "Period comparison (week-over-week)", "Copy client message instantly"],
    usage: "AI Coach Insights → Progress Report tab → select Weekly or Monthly → Generate. Copy the client message to send directly.",
  },
  {
    title: "Resource Library",
    icon: "📚",
    description: "Upload and assign educational resources, PDFs, videos, and articles to clients.",
    benefits: ["Organized resource management", "Assign to specific clients", "Track client progress"],
    usage: "Upload resources in the library, then assign them to clients via the assign button.",
  },
  {
    title: "Recipes",
    icon: "🥗",
    description: "A database of healthy recipes with nutritional info, dietary tags, and regional preferences for meal planning.",
    benefits: ["Rich nutritional details", "Filter by diet type", "Use in meal plans"],
    usage: "Search by cuisine, diet type, or meal type. Add recipes to meal plans or share directly with clients.",
  },
  {
    title: "Gamification",
    icon: "🏆",
    description: "Motivate clients with points, badges, challenges, and leaderboards to boost engagement and consistency.",
    benefits: ["Increased client motivation", "Reward healthy behaviors", "Friendly competition"],
    usage: "Set up auto-award rules, create challenges, and monitor the leaderboard to keep clients engaged.",
  },
  {
    title: "Client Assessments",
    icon: "📝",
    description: "Create and assign custom health assessments to gather structured data from clients at any point in their journey.",
    benefits: ["Custom question templates", "Structured data collection", "Track changes over time"],
    usage: "Build an assessment template, assign it to a client, and review their responses in the assessment tracker.",
  },
];

const QUICK_PROMPTS = [
  "Why is this client's adherence low?",
  "Suggest meal plan adjustments based on progress",
  "Are there any red flags I should be aware of?",
  "What are the best foods for their condition?",
  "How is their weight trending?",
  "What goals should we focus on next?",
  "Any medication-diet interactions to watch?",
  "What should I discuss at the next check-in?",
];

const SEVERITY_STYLES = {
  urgent: "bg-red-50 border-red-300 text-red-800",
  warning: "bg-amber-50 border-amber-300 text-amber-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
};
const SEVERITY_ICONS = {
  urgent: "🚨",
  warning: "⚠️",
  info: "ℹ️",
};
const STATUS_CONFIG = {
  on_track: { color: "bg-green-100 text-green-800 border-green-300", icon: "✅" },
  needs_attention: { color: "bg-amber-100 text-amber-800 border-amber-300", icon: "⚠️" },
  at_risk: { color: "bg-red-100 text-red-800 border-red-300", icon: "🚨" },
};

function AIMessage({ msg }) {
  const r = msg.reply;
  return (
    <div className="flex gap-3 items-start">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 space-y-2.5 min-w-0">
        {/* Main answer */}
        <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm p-3.5 shadow-sm">
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{r.answer}</p>
        </div>

        {/* Key observations */}
        {r.key_observations?.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5" /> Key Observations
            </p>
            <ul className="space-y-1">
              {r.key_observations.map((o, i) => (
                <li key={i} className="text-xs text-blue-800 flex items-start gap-1.5">
                  <span className="text-blue-400 shrink-0 mt-0.5">•</span>{o}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested actions */}
        {r.suggested_actions?.length > 0 && (
          <div className="bg-green-50 border border-green-100 rounded-xl p-3">
            <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Suggested Actions
            </p>
            <ol className="space-y-1">
              {r.suggested_actions.map((a, i) => (
                <li key={i} className="text-xs text-green-800 flex items-start gap-1.5">
                  <span className="font-bold text-green-500 shrink-0">{i + 1}.</span>{a}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Escalation flag */}
        {r.escalation_required && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-700">⚠ Escalation Recommended</p>
              <p className="text-xs text-red-600 mt-0.5">{r.escalation_reason}</p>
            </div>
          </div>
        )}

        {r.confidence && (
          <p className="text-xs text-gray-400 pl-1">Confidence: {r.confidence}</p>
        )}
      </div>
    </div>
  );
}

function UserMessage({ content }) {
  return (
    <div className="flex gap-3 items-start justify-end">
      <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl rounded-tr-sm p-3.5 max-w-[80%] shadow-sm">
        <p className="text-sm leading-relaxed">{content}</p>
      </div>
      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
        <User className="w-4 h-4 text-gray-600" />
      </div>
    </div>
  );
}

function FeatureGuideMessage() {
  const [expanded, setExpanded] = useState(null);
  return (
    <div className="flex gap-3 items-start">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shrink-0 mt-0.5">
        <HelpCircle className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 space-y-2 min-w-0">
        <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm p-3.5 shadow-sm">
          <p className="text-sm font-semibold text-gray-800 mb-1">📖 Platform Feature Guide</p>
          <p className="text-sm text-gray-600">Here's a breakdown of every feature on the dashboard — tap any feature to learn more.</p>
        </div>
        <div className="space-y-1.5">
          {FEATURE_GUIDE.map((f, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
              <button
                className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-gray-50 transition-colors text-left"
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{f.icon}</span>
                  <span className="text-sm font-semibold text-gray-800">{f.title}</span>
                </div>
                {expanded === i ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
              </button>
              {expanded === i && (
                <div className="px-3.5 pb-3.5 space-y-2.5 border-t border-gray-50">
                  <p className="text-xs text-gray-600 leading-relaxed pt-2">{f.description}</p>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="bg-green-50 rounded-lg p-2.5">
                      <p className="text-xs font-semibold text-green-700 mb-1">✅ Benefits</p>
                      <ul className="space-y-0.5">
                        {f.benefits.map((b, j) => <li key={j} className="text-xs text-green-800">• {b}</li>)}
                      </ul>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2.5">
                      <p className="text-xs font-semibold text-blue-700 mb-1">🔧 How to Use</p>
                      <p className="text-xs text-blue-800 leading-relaxed">{f.usage}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProactiveScanResult({ scan }) {
  const [copied, setCopied] = useState(null);
  const status = STATUS_CONFIG[scan.overall_status] || STATUS_CONFIG.needs_attention;

  const copyMsg = (msg, i) => {
    navigator.clipboard.writeText(msg);
    setCopied(i);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex gap-3 items-start">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0 mt-0.5">
        <Bell className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 space-y-2.5 min-w-0">
        <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm p-3.5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-gray-700">Proactive Status Scan</span>
            <Badge className={`border text-xs px-2 py-0.5 ${status.color}`}>{status.icon} {scan.overall_status?.replace(/_/g, ' ')}</Badge>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{scan.status_summary}</p>
        </div>

        {scan.proactive_alerts?.length > 0 && (
          <div className="space-y-2">
            {scan.proactive_alerts.map((alert, i) => (
              <div key={i} className={`border rounded-xl p-3 ${SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-xs font-semibold mb-1">{SEVERITY_ICONS[alert.severity]} {alert.issue}</p>
                    <p className="text-xs opacity-80 mb-2">{alert.detail}</p>
                    {alert.checkin_message && (
                      <div className="bg-white/70 rounded-lg p-2.5 mt-1">
                        <p className="text-xs font-medium opacity-70 mb-1">💬 Suggested check-in message:</p>
                        <p className="text-xs italic">"{alert.checkin_message}"</p>
                      </div>
                    )}
                  </div>
                  {alert.checkin_message && (
                    <button onClick={() => copyMsg(alert.checkin_message, i)} className="shrink-0 p-1.5 rounded-lg hover:bg-white/50 transition-colors" title="Copy message">
                      {copied === i ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 opacity-60" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {scan.follow_up_actions?.length > 0 && (
          <div className="bg-green-50 border border-green-100 rounded-xl p-3">
            <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Follow-up Actions
            </p>
            <ol className="space-y-1">
              {scan.follow_up_actions.map((a, i) => (
                <li key={i} className="text-xs text-green-800 flex items-start gap-1.5">
                  <span className="font-bold text-green-500 shrink-0">{i + 1}.</span>{a}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AICoachChat({ clientId, clientName, onClientChange }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(clientId);
  const [selectedClientName, setSelectedClientName] = useState(clientName);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch available clients
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        console.error('Auth error:', error);
        return null;
      }
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['aiCoachClients', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.Client.filter({ assigned_to: user?.email });
    },
    enabled: !!user,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Reset chat when client changes
  useEffect(() => {
    setMessages([]);
  }, [selectedClientId]);

  const handleClientChange = (newClientId) => {
    const selected = clients.find(c => c.id === newClientId);
    setSelectedClientId(newClientId);
    setSelectedClientName(selected?.full_name || '');
    setMessages([]);
    if (onClientChange) {
      onClientChange(newClientId, selected?.full_name);
    }
  };

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");

    const userMsg = { role: "user", content: q };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.slice(-6);
      const res = await base44.functions.invoke('aiCoachChat', {
        clientId: selectedClientId || null,
        message: q,
        history,
      });
      setMessages(prev => [...prev, { role: "ai", reply: res.data.reply }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: "ai",
        reply: { answer: "Sorry, I encountered an error. Please try again.", suggested_actions: [], key_observations: [], escalation_required: false }
      }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const runProactiveScan = async () => {
    if (!selectedClientId || scanning) return;
    setScanning(true);
    setMessages(prev => [...prev, { role: "user", content: "🔍 Run proactive status scan for this client" }]);
    try {
      const res = await base44.functions.invoke('aiCoachChat', {
        clientId: selectedClientId,
        message: "proactive_scan",
        mode: "proactive_scan",
        history: [],
      });
      setMessages(prev => [...prev, { role: "scan", scan: res.data.scan }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: "ai",
        reply: { answer: "Scan failed. Please try again.", suggested_actions: [], key_observations: [], escalation_required: false }
      }]);
    }
    setScanning(false);
  };

  const summarizeClient = () => send("Give me a full status summary of this client — cover weight trend, adherence, goal progress, wellness metrics, and top 2 priorities for this week.");

  const showFeatureGuide = () => {
    setMessages(prev => [...prev,
      { role: "user", content: "❓ Help me understand all the features on the dashboard" },
      { role: "feature_guide" }
    ]);
  };

  return (
    <div className="flex flex-col h-full min-h-[500px]">
      {/* Client Selector */}
      <div className="px-4 pt-4 border-b bg-white/80">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-gray-600" />
          <label className="text-xs font-semibold text-gray-700">Select Client</label>
        </div>
        <Select value={selectedClientId || ""} onValueChange={handleClientChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a client..." />
          </SelectTrigger>
          <SelectContent>
            {clients.length === 0 ? (
              <div className="p-2 text-xs text-gray-500 text-center">No clients found</div>
            ) : (
              clients.map(client => (
                <SelectItem key={client.id} value={client.id}>
                  {client.full_name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-semibold text-gray-700 mb-1">
              {selectedClientName ? `Ask me about ${selectedClientName}` : "AI Coach Assistant"}
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              {selectedClientName
                ? "I have access to their progress logs, meal plans, goals, and clinical data."
                : "Select a client above for context-aware answers, or ask general nutrition questions."}
            </p>
            <button
              onClick={showFeatureGuide}
              className="mb-4 flex items-center gap-2 mx-auto text-xs bg-teal-50 border border-teal-200 hover:bg-teal-100 text-teal-700 rounded-full px-4 py-2 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" /> How does each feature work?
            </button>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
              {QUICK_PROMPTS.slice(0, clientName ? 8 : 4).map((p, i) => (
                <button
                  key={i}
                  onClick={() => send(p)}
                  className="text-xs bg-white border border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-gray-600 hover:text-purple-700 rounded-full px-3 py-1.5 transition-colors shadow-sm"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          msg.role === "user"
            ? <UserMessage key={i} content={msg.content} />
            : msg.role === "scan"
            ? <ProactiveScanResult key={i} scan={msg.scan} />
            : msg.role === "feature_guide"
            ? <FeatureGuideMessage key={i} />
            : <AIMessage key={i} msg={msg} />
        ))}

        {loading && (
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm p-3.5 shadow-sm">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick action buttons (always visible when client selected) */}
      {clientId && (
        <div className="px-4 pb-2 border-t pt-2 flex gap-2 overflow-x-auto bg-gray-50/80">
          <button
            onClick={summarizeClient}
            disabled={loading || scanning}
            className="flex items-center gap-1.5 text-xs bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-full px-3 py-1.5 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <ClipboardList className="w-3.5 h-3.5" /> Summarize Client Status
          </button>
          <button
            onClick={runProactiveScan}
            disabled={loading || scanning}
            className="flex items-center gap-1.5 text-xs bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 rounded-full px-3 py-1.5 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
            Proactive Scan
          </button>
          <button
            onClick={showFeatureGuide}
            disabled={loading || scanning}
            className="flex items-center gap-1.5 text-xs bg-teal-50 border border-teal-200 hover:bg-teal-100 text-teal-700 rounded-full px-3 py-1.5 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <HelpCircle className="w-3.5 h-3.5" /> Feature Guide
          </button>
          {!loading && !scanning && QUICK_PROMPTS.slice(0, 3).map((p, i) => (
            <button
              key={i}
              onClick={() => send(p)}
              className="text-xs bg-white border border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-gray-500 hover:text-purple-700 rounded-full px-2.5 py-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-white/80 backdrop-blur-sm">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={clientName ? `Ask about ${clientName}... (Enter to send)` : "Ask a nutrition or coaching question..."}
            rows={1}
            className="flex-1 resize-none border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent max-h-32 overflow-y-auto"
            style={{ minHeight: '44px' }}
          />
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" onClick={() => setMessages([])} className="text-gray-400 hover:text-red-500 shrink-0 h-11 w-9">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shrink-0 h-11 w-11 p-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-center">AI responses are advisory only. Always apply clinical judgment.</p>
      </div>
    </div>
  );
}