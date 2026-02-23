import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Loader2, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

export default function ConversationSummary({ messages, clientName }) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateSummary = async () => {
    if (messages.length < 3) {
      toast.info("Need at least 3 messages to summarize.");
      return;
    }
    setOpen(true);
    if (summary) return; // already generated
    setLoading(true);
    try {
      const conversation = messages
        .slice(-60) // last 60 messages max
        .map(m => `${m.sender_type === 'dietitian' ? 'Coach' : clientName}: ${m.attachment_url ? '[File attachment]' : m.message}`)
        .join("\n");

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a health coaching assistant. Summarize the following conversation between a health coach and their client "${clientName}". 
Provide:
1. A 2-3 sentence overall summary
2. Key topics discussed (bullet points)
3. Any action items or follow-ups mentioned
4. Client's current status/concerns if mentioned

Keep it concise and professional.

Conversation:
${conversation}`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_summary: { type: "string" },
            key_topics: { type: "array", items: { type: "string" } },
            action_items: { type: "array", items: { type: "string" } },
            client_status: { type: "string" }
          }
        }
      });
      setSummary(result);
    } catch (err) {
      toast.error("Failed to generate summary.");
      setOpen(false);
    }
    setLoading(false);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={generateSummary}
        className="flex items-center gap-1 border-purple-300 text-purple-700 hover:bg-purple-50 h-7 px-2 text-xs"
        disabled={messages.length < 3}
        title={messages.length < 3 ? "Need more messages to summarize" : "Summarize conversation with AI"}
      >
        <Sparkles className="w-3 h-3" />
        <span className="hidden lg:inline">Summary</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-700">
              <Sparkles className="w-5 h-5" />
              AI Conversation Summary
            </DialogTitle>
            <p className="text-xs text-gray-500">Conversation with {clientName} · {messages.length} messages</p>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              <p className="text-sm text-gray-500">Analyzing conversation...</p>
            </div>
          ) : summary ? (
            <div className="space-y-4 mt-2">
              {/* Overall Summary */}
              <div className="bg-purple-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Overview</p>
                <p className="text-sm text-gray-800 leading-relaxed">{summary.overall_summary}</p>
              </div>

              {/* Key Topics */}
              {summary.key_topics?.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Key Topics</p>
                  <ul className="space-y-1">
                    {summary.key_topics.map((topic, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-800">
                        <span className="text-blue-400 mt-0.5">•</span>
                        {topic}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Items */}
              {summary.action_items?.length > 0 && (
                <div className="bg-orange-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">Action Items</p>
                  <ul className="space-y-1">
                    {summary.action_items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-800">
                        <span className="text-orange-400 mt-0.5">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Client Status */}
              {summary.client_status && (
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Client Status</p>
                  <p className="text-sm text-gray-800">{summary.client_status}</p>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => { setSummary(null); generateSummary(); }}
              >
                <Sparkles className="w-3 h-3 mr-1" /> Regenerate
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}