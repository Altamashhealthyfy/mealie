import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles, X, Send, Loader2, ChevronDown, ChevronUp,
  TrendingUp, MessageSquare, FileText, Zap, Copy, CheckCheck
} from "lucide-react";

const QUICK_PROMPTS = [
  { icon: "📊", label: "Progress Summary", prompt: "Give me a concise progress summary for this client based on their data." },
  { icon: "💬", label: "Talking Points", prompt: "Suggest 5 personalized talking points for my next interaction with this client." },
  { icon: "📝", label: "Follow-up Message", prompt: "Draft a warm, motivating follow-up message I can send to this client." },
  { icon: "📈", label: "Action Plan", prompt: "Suggest a 2-week action plan for this client based on their goal and current progress." },
  { icon: "⚠️", label: "Risk Flags", prompt: "Are there any compliance or health risk flags I should be aware of for this client?" },
  { icon: "🎯", label: "Goal Review", prompt: "Review this client's goals and suggest if they need any adjustments." },
];

export default function CoachAIAssistantPanel({ client, messages = [], progressLogs = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const buildClientContext = () => {
    const recentProgress = progressLogs.slice(0, 5).map(l =>
      `• ${l.date}: weight=${l.weight || 'N/A'}kg, mood=${l.wellness_metrics?.mood || 'N/A'}, adherence=${l.meal_adherence || 'N/A'}%`
    ).join("\n");

    const recentMessages = messages.slice(-10).map(m =>
      `[${m.sender_type === 'dietitian' ? 'Coach' : 'Client'}]: ${(m.message || '').slice(0, 150)}`
    ).join("\n");

    return `
CLIENT PROFILE:
- Name: ${client?.full_name || 'Unknown'}
- Age: ${client?.age || 'N/A'}, Gender: ${client?.gender || 'N/A'}
- Goal: ${client?.goal?.replace(/_/g, ' ') || 'N/A'}
- Current Weight: ${client?.weight || 'N/A'} kg, Target: ${client?.target_weight || 'N/A'} kg
- Initial Weight: ${client?.initial_weight || 'N/A'} kg
- Activity Level: ${client?.activity_level?.replace(/_/g, ' ') || 'N/A'}
- Food Preference: ${client?.food_preference || 'N/A'}
- Status: ${client?.status || 'N/A'}
- Target Calories: ${client?.target_calories || 'N/A'} kcal
- Target Protein: ${client?.target_protein || 'N/A'}g | Carbs: ${client?.target_carbs || 'N/A'}g | Fats: ${client?.target_fats || 'N/A'}g
- Notes: ${client?.notes || 'None'}

RECENT PROGRESS LOGS (last 5):
${recentProgress || 'No progress logs available'}

RECENT MESSAGES (last 10):
${recentMessages || 'No messages yet'}
`.trim();
  };

  const sendMessage = async (promptText) => {
    const text = promptText || input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    setChat(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const context = buildClientContext();
    const systemPrompt = `You are an expert AI health coach assistant helping a dietitian/coach manage their client. 
You have access to the client's profile, progress logs, and recent message history.
Be concise, practical, and actionable. Use Indian health context where relevant.
Always be empathetic and professional. Format responses with clear sections when appropriate.

${context}`;

    try {
      const conversationHistory = chat.map(m => `${m.role === 'user' ? 'Coach' : 'AI'}: ${m.content}`).join("\n");
      const fullPrompt = `${systemPrompt}\n\nConversation so far:\n${conversationHistory}\n\nCoach's request: ${text}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: fullPrompt,
      });

      setChat(prev => [...prev, { role: "assistant", content: result }]);
    } catch (err) {
      setChat(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't generate a response. Please try again." }]);
    }
    setLoading(false);
  };

  const copyText = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!client) return null;

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-full shadow-2xl px-4 py-3 transition-all hover:scale-105"
        >
          <Sparkles className="w-5 h-5" />
          <span className="font-semibold text-sm">AI Assistant</span>
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl border border-purple-200 flex flex-col overflow-hidden"
          style={{ maxHeight: "82vh" }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-white" />
              <div>
                <p className="text-white font-bold text-sm">AI Coach Assistant</p>
                <p className="text-purple-200 text-xs">{client?.full_name}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Quick Prompts */}
          {chat.length === 0 && (
            <div className="p-3 border-b flex-shrink-0 bg-purple-50">
              <p className="text-xs font-semibold text-purple-700 mb-2">Quick Actions</p>
              <div className="grid grid-cols-2 gap-1.5">
                {QUICK_PROMPTS.map((qp, i) => (
                  <button key={i} onClick={() => sendMessage(qp.prompt)}
                    className="text-left text-xs px-2.5 py-2 rounded-lg bg-white border border-purple-100 hover:border-purple-400 hover:bg-purple-50 transition-colors">
                    <span className="mr-1">{qp.icon}</span>
                    {qp.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-3 space-y-3">
              {chat.length === 0 && (
                <div className="text-center py-6">
                  <Sparkles className="w-10 h-10 mx-auto text-purple-300 mb-2" />
                  <p className="text-sm text-gray-500">Ask me anything about {client?.full_name}</p>
                  <p className="text-xs text-gray-400 mt-1">Or pick a quick action above</p>
                </div>
              )}
              {chat.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] rounded-xl px-3 py-2 text-xs leading-relaxed relative group ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.role === 'assistant' && (
                      <button onClick={() => copyText(msg.content, idx)}
                        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded p-0.5 shadow">
                        {copied === idx
                          ? <CheckCheck className="w-3 h-3 text-green-500" />
                          : <Copy className="w-3 h-3 text-gray-400" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-xl px-3 py-2 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 text-purple-500 animate-spin" />
                    <span className="text-xs text-gray-500">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          {/* Quick prompts button if chat has started */}
          {chat.length > 0 && (
            <div className="px-3 pt-2 flex-shrink-0 flex flex-wrap gap-1">
              {QUICK_PROMPTS.slice(0, 3).map((qp, i) => (
                <button key={i} onClick={() => sendMessage(qp.prompt)}
                  className="text-xs px-2 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 transition-colors">
                  {qp.icon} {qp.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t flex-shrink-0 flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask about this client..."
              className="resize-none text-sm min-h-[40px] max-h-24 flex-1"
              rows={1}
              disabled={loading}
            />
            <Button onClick={() => sendMessage()} disabled={!input.trim() || loading}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 h-10 w-10 p-0 flex-shrink-0">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}