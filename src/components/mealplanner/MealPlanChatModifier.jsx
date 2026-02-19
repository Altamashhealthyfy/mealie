import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Loader2, Sparkles, ChevronDown, ChevronUp, Bot, User } from "lucide-react";
import { toast } from "sonner";

const SUGGESTIONS = [
  "Replace breakfast on Day 1 with something lighter",
  "Remove all nuts from the plan",
  "Add more protein to every dinner",
  "Swap Day 3 lunch with a south Indian option",
  "Reduce calories on Day 2 by 200 kcal",
  "Make Day 5 meals completely vegan",
];

export default function MealPlanChatModifier({ plan, onPlanUpdated, planType = "standard" }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi! I can help you modify this meal plan. Just tell me what changes you'd like — e.g. \"Replace breakfast on Day 1\", \"Remove nuts\", \"Add more protein\", or \"Swap Day 3 lunch\".",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setLoading(true);

    try {
      // Build plan summary for context
      const planJson = JSON.stringify(plan, null, 2);

      const prompt = `You are a professional Indian dietitian assistant. A coach wants to modify the following meal plan.

CURRENT MEAL PLAN (JSON):
${planJson}

MODIFICATION REQUEST:
"${userText}"

Instructions:
- Apply ONLY the requested modification. Do NOT change anything else.
- Return the COMPLETE updated meal plan JSON with the same structure as the input.
- Keep all field names exactly the same.
- Recalculate calories/protein/carbs/fats for any changed meals using accurate ICMR values.
- If no structural change is needed, just explain why in the "message" field.

Respond with JSON in this format:
{
  "message": "Brief description of what was changed",
  "updated_plan": { ...the full updated plan object... }
}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            message: { type: "string" },
            updated_plan: { type: "object" },
          },
          required: ["message"],
        },
      });

      const assistantMsg = response.message || "Done! Plan updated.";
      setMessages((prev) => [...prev, { role: "assistant", text: assistantMsg }]);

      if (response.updated_plan && onPlanUpdated) {
        onPlanUpdated(response.updated_plan);
        toast.success("Meal plan updated! ✅");
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry, I couldn't apply that change. Please try rephrasing your request." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 print:hidden">
      <CardHeader
        className="cursor-pointer select-none pb-3"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-purple-800 text-lg">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Modify Plan with AI Chat
            <Badge className="bg-purple-600 text-white text-xs ml-1">New</Badge>
          </CardTitle>
          {open ? (
            <ChevronUp className="w-5 h-5 text-purple-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-purple-500" />
          )}
        </div>
        {!open && (
          <p className="text-sm text-purple-600 mt-1">
            Click to chat with AI and request changes to this meal plan
          </p>
        )}
      </CardHeader>

      {open && (
        <CardContent className="space-y-4 pt-0">
          {/* Chat history */}
          <div className="h-72 overflow-y-auto space-y-3 pr-1">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                    msg.role === "user"
                      ? "bg-purple-600 text-white rounded-br-sm"
                      : "bg-white border border-purple-200 text-gray-800 rounded-bl-sm shadow-sm"
                  }`}
                >
                  {msg.text}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-purple-200 rounded-2xl rounded-bl-sm px-4 py-2 shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick suggestions */}
          <div className="flex gap-2 flex-wrap">
            {SUGGESTIONS.slice(0, 3).map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                disabled={loading}
                className="text-xs bg-white border border-purple-300 text-purple-700 rounded-full px-3 py-1 hover:bg-purple-50 transition-colors disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Replace Day 2 breakfast with poha..."
              disabled={loading}
              className="flex-1 border-purple-300 focus:border-purple-500"
            />
            <Button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}