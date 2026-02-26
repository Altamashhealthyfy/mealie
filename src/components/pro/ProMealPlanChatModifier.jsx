import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Bot, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";

const QUICK_SUGGESTIONS = [
  "Replace breakfast on Day 1 with something lighter",
  "Remove all nuts from the plan",
  "Add more protein to every dinner",
  "Swap Day 3 lunch with a diabetic-friendly option",
  "Make Day 2 meals more suitable for kidney issues",
];

export default function ProMealPlanChatModifier({ plan, onPlanUpdate }) {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I can help you modify this meal plan. Just tell me what changes you'd like — e.g. \"Replace breakfast on Day 1\", \"Remove nuts\", \"Add more protein\", or \"Swap Day 3 lunch\".",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || isLoading) return;

    setInput("");
    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setIsLoading(true);

    const mealPlan = plan.meal_plan || [];
    // Build a concise summary grouped by day
    const days = [...new Set(mealPlan.map(m => m.day))].sort((a, b) => a - b);
    const mealSummary = days.map(day => {
      const dayMeals = mealPlan.filter(m => m.day === day);
      return `Day ${day}:\n` + dayMeals.map(m => `  ${m.meal_type}: ${m.meal_name}`).join("\n");
    }).join("\n");

    // Get unique meal_types present in the plan for reference
    const mealTypes = [...new Set(mealPlan.map(m => m.meal_type))];

    const prompt = `You are a clinical dietitian AI helping modify a disease-specific meal plan.

Current meal plan structure (${days.length} days):
${mealSummary}

Valid meal_type values (use EXACTLY these): ${mealTypes.join(", ")}

The coach requests: "${userText}"

Instructions:
1. Identify exactly which meals need to change based on the request.
2. Return the modified meal(s) as "updated_meals". Each meal MUST use the EXACT meal_type values listed above.
3. Each meal must have: day (number), meal_type (exact string from list above), meal_name, items (array of strings), portion_sizes (array of strings), calories, protein, carbs, fats, sodium, potassium, disease_rationale.
4. Also provide a "summary" string explaining what was changed and why.
5. If unclear, explain in "summary" and return empty "updated_meals" array.`;

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            updated_meals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day: { type: "number" },
                  meal_type: { type: "string" },
                  meal_name: { type: "string" },
                  items: { type: "array", items: { type: "string" } },
                  portion_sizes: { type: "array", items: { type: "string" } },
                  calories: { type: "number" },
                  protein: { type: "number" },
                  carbs: { type: "number" },
                  fats: { type: "number" },
                  sodium: { type: "number" },
                  potassium: { type: "number" },
                  disease_rationale: { type: "string" },
                },
              },
            },
          },
        },
      });

      const { summary, updated_meals } = response;

      // Apply updates to plan
      if (updated_meals?.length > 0 && onPlanUpdate) {
        const newMealPlan = [...(plan.meal_plan || [])];
        updated_meals.forEach((updatedMeal) => {
          const idx = newMealPlan.findIndex(
            (m) => m.day === updatedMeal.day && m.meal_type?.toLowerCase() === updatedMeal.meal_type?.toLowerCase()
          );
          if (idx !== -1) {
            newMealPlan[idx] = { ...updatedMeal };
          } else {
            newMealPlan.push(updatedMeal);
          }
        });
        onPlanUpdate({ ...plan, meal_plan: newMealPlan });
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            summary +
            (updated_meals?.length > 0
              ? `\n\n✅ **${updated_meals.length} meal(s) updated** in the plan above.`
              : ""),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    }

    setIsLoading(false);
  };

  return (
    <div className="rounded-2xl border border-purple-200 bg-white shadow-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <span className="font-bold text-gray-900 text-base">Modify Plan with AI Chat</span>
          <Badge className="bg-purple-600 text-white text-xs">New</Badge>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>

      {isOpen && (
        <>
          {/* Messages */}
          <div className="px-4 py-3 space-y-3 min-h-[120px] max-h-[280px] overflow-y-auto bg-gray-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-purple-600 text-white rounded-br-sm"
                      : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <ReactMarkdown className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-0.5">
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100">
                  <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions */}
          <div className="px-4 pt-2 pb-1 bg-white border-t border-gray-100">
            <div className="flex flex-wrap gap-2 pb-1">
              {QUICK_SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  disabled={isLoading}
                  className="text-xs px-3 py-1.5 rounded-full border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="px-4 pb-4 bg-white">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="e.g. Replace Day 2 breakfast with poha..."
                disabled={isLoading}
                className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-gray-50 disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-all hover:scale-105 flex-shrink-0 bg-purple-600 hover:bg-purple-700"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}