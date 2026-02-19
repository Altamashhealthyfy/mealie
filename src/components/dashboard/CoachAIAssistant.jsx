import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  MessageSquare,
  ChevronDown,
  User,
  Bot,
  Lightbulb,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

const QUICK_PROMPTS = [
  { label: "📝 Draft client message", prompt: "Help me draft a personalized motivational message for a client who has been consistently losing weight but seems to be hitting a plateau." },
  { label: "🎯 Suggest challenge", prompt: "Suggest an appropriate 7-day challenge for a client whose goal is weight loss and has moderate activity level." },
  { label: "📊 Summarize progress", prompt: "What are the key metrics I should look at to summarize a client's 30-day progress trends?" },
  { label: "🥗 Nutrition query", prompt: "A client is asking whether they should take protein supplements on rest days. What should I advise?" },
  { label: "💪 Goal setting tips", prompt: "How should I set SMART goals for a client who wants to lose 10 kg in 3 months?" },
  { label: "🧘 MPESS guidance", prompt: "What MPESS practices should I recommend for a client with high stress and poor sleep quality?" },
];

const SYSTEM_PROMPT = `You are an expert AI assistant for health coaches and dietitians. You help coaches with:
1. Drafting personalized client messages based on progress data
2. Suggesting appropriate challenges or goals for clients
3. Summarizing client progress trends  
4. Answering common client queries about nutrition, fitness, and wellness
5. Providing guidance on meal planning and dietary advice
6. Recommending MPESS (Mind, Physical, Emotional, Social, Spiritual) practices

You have expertise in:
- Nutritional science and Indian regional cuisine
- Weight management and body composition
- Disease management through diet (diabetes, hypertension, PCOS, thyroid, etc.)
- Behavioral coaching and client motivation
- Exercise science and physical activity recommendations
- Wellness tracking and habit formation

Always provide practical, actionable advice. Be empathetic, professional, and evidence-based. Format responses clearly with bullet points or sections when helpful.`;

export default function CoachAIAssistant({ clients = [], progressLogs = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "👋 Hi! I'm your AI Coach Assistant. I can help you draft client messages, suggest challenges, summarize progress trends, and answer nutrition or fitness questions. What can I help you with today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [messages, isOpen]);

  const buildContextSummary = () => {
    const activeClients = clients.filter(c => c.status === 'active').length;
    const recentLogs = progressLogs.slice(0, 5);
    return `Coach context: ${clients.length} total clients (${activeClients} active). Recent progress logs available for ${recentLogs.length} entries.`;
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

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Button */}
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

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[calc(100vh-5rem)] flex flex-col bg-white rounded-2xl shadow-2xl border border-orange-100 overflow-hidden">
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
                <p className="text-xs opacity-80">Powered by AI</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
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
                    <ReactMarkdown
                      className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_ul]:my-1 [&_li]:my-0 [&_p]:my-1"
                    >
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
            <div className="flex items-center gap-1 mb-2">
              <Lightbulb className="w-3 h-3 text-orange-500" />
              <span className="text-xs text-gray-500 font-medium">Quick prompts</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(qp.prompt)}
                  disabled={isLoading}
                  className="flex-shrink-0 text-xs px-2.5 py-1.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors disabled:opacity-50"
                >
                  {qp.label}
                </button>
              ))}
            </div>
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