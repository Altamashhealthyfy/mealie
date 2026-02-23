import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Loader2, RefreshCw, ClipboardList,
  MessageSquare, CheckCircle2, AlertCircle, TrendingUp,
  Heart, Lightbulb, Copy, Check
} from "lucide-react";
import { toast } from "sonner";

const SENTIMENT_COLORS = {
  positive: "bg-green-100 text-green-700 border-green-200",
  neutral: "bg-gray-100 text-gray-700 border-gray-200",
  negative: "bg-red-100 text-red-700 border-red-200",
  mixed: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

export default function ConversationSummary({ messages, clientName }) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateSummary = async (force = false) => {
    if (messages.length < 3) {
      toast.info("Need at least 3 messages to summarize.");
      return;
    }
    setOpen(true);
    if (summary && !force) return;
    setSummary(null);
    setLoading(true);
    try {
      const conversation = messages
        .slice(-80)
        .map(m => `${m.sender_type === 'dietitian' ? 'Coach' : clientName}: ${m.attachment_url ? '[File/media shared]' : (m.message || '')}`)
        .join("\n");

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a professional health coaching assistant. Analyze the following conversation between a health coach and their client named "${clientName}".

Provide a structured, insightful analysis with:
1. overall_summary: 2-3 sentences capturing the essence of the conversation
2. key_topics: 3-6 bullet points of main topics discussed
3. action_items: specific follow-up tasks or commitments made (empty array if none)
4. client_status: 1-2 sentences on client's current state, mood, and progress
5. client_sentiment: one of "positive", "neutral", "negative", "mixed"
6. coach_recommendations: 2-3 actionable suggestions for the coach going forward
7. progress_highlights: any positive progress or wins mentioned (empty array if none)
8. concerns: any red flags or concerns that need attention (empty array if none)

Be concise, professional, and empathetic.

Conversation (last ${Math.min(messages.length, 80)} messages):
${conversation}`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_summary: { type: "string" },
            key_topics: { type: "array", items: { type: "string" } },
            action_items: { type: "array", items: { type: "string" } },
            client_status: { type: "string" },
            client_sentiment: { type: "string" },
            coach_recommendations: { type: "array", items: { type: "string" } },
            progress_highlights: { type: "array", items: { type: "string" } },
            concerns: { type: "array", items: { type: "string" } },
          }
        }
      });
      setSummary(result);
    } catch (err) {
      toast.error("Failed to generate summary. Please try again.");
      setOpen(false);
    }
    setLoading(false);
  };

  const handleCopy = () => {
    if (!summary) return;
    const text = [
      `AI Summary: Conversation with ${clientName}`,
      `\nOverview:\n${summary.overall_summary}`,
      summary.key_topics?.length ? `\nKey Topics:\n${summary.key_topics.map(t => `• ${t}`).join('\n')}` : '',
      summary.action_items?.length ? `\nAction Items:\n${summary.action_items.map(t => `✓ ${t}`).join('\n')}` : '',
      summary.client_status ? `\nClient Status:\n${summary.client_status}` : '',
      summary.coach_recommendations?.length ? `\nCoach Recommendations:\n${summary.coach_recommendations.map((r, i) => `${i+1}. ${r}`).join('\n')}` : '',
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Summary copied to clipboard");
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => generateSummary(false)}
        className="flex items-center gap-1 border-purple-300 text-purple-700 hover:bg-purple-50 h-7 px-2 text-xs"
        disabled={messages.length < 3}
        title={messages.length < 3 ? "Need more messages to summarize" : "AI Conversation Summary"}
      >
        <Sparkles className="w-3 h-3" />
        <span className="hidden lg:inline">Summary</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-purple-700 text-base">
                  <Sparkles className="w-5 h-5" />
                  AI Conversation Summary
                </DialogTitle>
                <p className="text-xs text-gray-500 mt-1">
                  {clientName} · {messages.length} messages analyzed
                </p>
              </div>
              {summary && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {summary.client_sentiment && (
                    <Badge className={`text-xs border ${SENTIMENT_COLORS[summary.client_sentiment] || SENTIMENT_COLORS.neutral}`}>
                      <Heart className="w-3 h-3 mr-1" />
                      {summary.client_sentiment}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-14 gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-purple-500" />
                </div>
                <Loader2 className="w-16 h-16 text-purple-400 animate-spin absolute inset-0" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">Analyzing conversation...</p>
                <p className="text-xs text-gray-400 mt-1">This may take a few seconds</p>
              </div>
            </div>
          ) : summary ? (
            <div className="space-y-3 mt-1">

              {/* Overview */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
                <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" /> Overview
                </p>
                <p className="text-sm text-gray-800 leading-relaxed">{summary.overall_summary}</p>
              </div>

              {/* Progress Highlights */}
              {summary.progress_highlights?.length > 0 && (
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Progress Highlights
                  </p>
                  <ul className="space-y-1.5">
                    {summary.progress_highlights.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Concerns */}
              {summary.concerns?.length > 0 && (
                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Concerns
                  </p>
                  <ul className="space-y-1.5">
                    {summary.concerns.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-800">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Key Topics */}
              {summary.key_topics?.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <ClipboardList className="w-3.5 h-3.5" /> Key Topics
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {summary.key_topics.map((topic, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-white border-blue-200 text-blue-700">{topic}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Items */}
              {summary.action_items?.length > 0 && (
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                  <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Action Items
                  </p>
                  <ul className="space-y-1.5">
                    {summary.action_items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-800">
                        <span className="w-5 h-5 rounded-full bg-orange-200 text-orange-700 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">{i+1}</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Client Status */}
              {summary.client_status && (
                <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
                  <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" /> Client Status
                  </p>
                  <p className="text-sm text-gray-800">{summary.client_status}</p>
                </div>
              )}

              {/* Coach Recommendations */}
              {summary.coach_recommendations?.length > 0 && (
                <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
                  <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Lightbulb className="w-3.5 h-3.5" /> Coach Recommendations
                  </p>
                  <ul className="space-y-1.5">
                    {summary.coach_recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-800">
                        <span className="text-yellow-500 font-bold mt-0.5 flex-shrink-0">→</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => generateSummary(true)}
                >
                  <RefreshCw className="w-3 h-3 mr-1" /> Regenerate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={handleCopy}
                >
                  {copied ? <Check className="w-3 h-3 mr-1 text-green-500" /> : <Copy className="w-3 h-3 mr-1" />}
                  {copied ? "Copied!" : "Copy Summary"}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}