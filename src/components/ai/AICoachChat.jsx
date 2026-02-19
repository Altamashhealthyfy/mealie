import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Loader2, AlertTriangle, Lightbulb, Zap, Bot, User, Trash2, MessageSquare, Bell, ClipboardList, CheckCircle2, Copy } from "lucide-react";

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

export default function AICoachChat({ clientId, clientName }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Reset chat when client changes
  useEffect(() => {
    setMessages([]);
  }, [clientId]);

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
        clientId: clientId || null,
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

  return (
    <div className="flex flex-col h-full min-h-[500px]">
      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-semibold text-gray-700 mb-1">
              {clientName ? `Ask me about ${clientName}` : "AI Coach Assistant"}
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              {clientName
                ? "I have access to their progress logs, meal plans, goals, and clinical data."
                : "Select a client above for context-aware answers, or ask general nutrition questions."}
            </p>
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

      {/* Quick prompts (when chat has started) */}
      {messages.length > 0 && !loading && (
        <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto">
          {QUICK_PROMPTS.slice(0, 4).map((p, i) => (
            <button
              key={i}
              onClick={() => send(p)}
              className="text-xs bg-white border border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-gray-500 hover:text-purple-700 rounded-full px-2.5 py-1 transition-colors whitespace-nowrap shrink-0"
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