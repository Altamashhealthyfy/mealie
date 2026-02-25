import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, Sparkles, RefreshCw, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle, Activity, MessageSquare, Brain,
  Zap, Target, Heart, Clock, ArrowRight
} from "lucide-react";

const RISK_COLORS = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-green-100 text-green-800 border-green-200",
};

const TREND_ICON = {
  improving: <TrendingUp className="w-4 h-4 text-green-500" />,
  declining: <TrendingDown className="w-4 h-4 text-red-500" />,
  stable: <Minus className="w-4 h-4 text-gray-400" />,
};

export default function ClientInsightsPanel({ clientId, client }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  const { data: progressLogs = [] } = useQuery({
    queryKey: ["progressLogs", clientId],
    queryFn: () => base44.entities.ProgressLog.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["clientMessages", clientId],
    queryFn: async () => {
      const msgs = await base44.entities.Message.filter({ client_id: clientId });
      return msgs.filter(m => m.content_type !== "video_signal")
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
        .slice(0, 50);
    },
    enabled: !!clientId,
  });

  const { data: foodLogs = [] } = useQuery({
    queryKey: ["foodLogs", clientId],
    queryFn: () => base44.entities.FoodLog.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const handleGenerate = async () => {
    setLoading(true);
    const sortedLogs = [...progressLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
    const recent = sortedLogs.slice(0, 20);
    const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentFood = foodLogs.filter(f => new Date(f.date || f.created_date) >= cutoff30);

    const clientMsgs = messages.filter(m => m.sender_type === "client").slice(0, 20);
    const coachMsgs = messages.filter(m => m.sender_type === "dietitian").slice(0, 10);
    const lastClientMsg = clientMsgs[0]?.created_date;
    const daysSinceLastMsg = lastClientMsg
      ? Math.floor((Date.now() - new Date(lastClientMsg)) / 86400000)
      : null;

    const avgAdherence = recent.filter(l => l.meal_adherence != null).length
      ? (recent.filter(l => l.meal_adherence != null).reduce((s, l) => s + l.meal_adherence, 0) /
         recent.filter(l => l.meal_adherence != null).length).toFixed(1)
      : null;

    const weightTrend = recent.filter(l => l.weight).slice(0, 6);
    const weightChange = weightTrend.length >= 2
      ? (weightTrend[0].weight - weightTrend[weightTrend.length - 1].weight).toFixed(1)
      : null;

    const moods = recent.filter(l => l.wellness_metrics?.mood).map(l => l.wellness_metrics.mood);
    const energies = recent.filter(l => l.wellness_metrics?.energy_level).map(l => l.wellness_metrics.energy_level);
    const avgEnergy = energies.length ? (energies.reduce((s, v) => s + v, 0) / energies.length).toFixed(1) : null;

    const prompt = `You are an expert AI dietitian coach analyst. Analyze this client's data holistically and provide actionable insights for their coach.

CLIENT: ${client?.full_name}, Age: ${client?.age || "N/A"}, Gender: ${client?.gender || "N/A"}
Goal: ${client?.goal?.replace(/_/g, " ") || "N/A"}
Current Weight: ${client?.weight || "N/A"} kg | Target: ${client?.target_weight || "N/A"} kg
Food Preference: ${client?.food_preference || "N/A"} | Activity: ${client?.activity_level?.replace(/_/g, " ") || "N/A"}
Status: ${client?.status || "active"}

PROGRESS DATA (last ${recent.length} logs):
- Weight change (last ${weightTrend.length} entries): ${weightChange !== null ? (weightChange > 0 ? "+" : "") + weightChange + " kg" : "insufficient data"}
- Avg meal adherence: ${avgAdherence !== null ? avgAdherence + "%" : "N/A"}
- Avg energy level: ${avgEnergy !== null ? avgEnergy + "/10" : "N/A"}
- Recent moods: ${moods.slice(0, 5).join(", ") || "N/A"}
- Food logs last 30 days: ${recentFood.length}

COMMUNICATION PATTERNS:
- Total messages: ${messages.length}
- Client messages (last 50): ${clientMsgs.length}
- Days since last client message: ${daysSinceLastMsg !== null ? daysSinceLastMsg : "unknown"}
- Recent client messages: ${clientMsgs.slice(0, 5).map(m => m.message?.slice(0, 80)).filter(Boolean).join(" | ") || "None"}
- Recent coach messages: ${coachMsgs.slice(0, 3).map(m => m.message?.slice(0, 60)).filter(Boolean).join(" | ") || "None"}

FOOD LOG ACTIVITY: ${recentFood.length} logs in last 30 days

Analyze this comprehensively and provide:
1. Key trends summary (weight, adherence, wellness)
2. Communication engagement level and any silence/disengagement red flags
3. Risk flags (high/medium/low) — each must be specific and actionable
4. Proactive intervention suggestions with specific timing
5. Positive highlights to acknowledge
6. Suggested coach message to send the client right now`;

    const schema = {
      type: "object",
      properties: {
        overall_status: { type: "string", description: "on_track / needs_attention / at_risk / inactive" },
        overall_summary: { type: "string" },
        key_trends: {
          type: "array",
          items: {
            type: "object",
            properties: {
              area: { type: "string" },
              trend: { type: "string", description: "improving / stable / declining / insufficient_data" },
              insight: { type: "string" },
              data_point: { type: "string" }
            }
          }
        },
        communication_analysis: {
          type: "object",
          properties: {
            engagement_level: { type: "string", description: "high / moderate / low / silent" },
            days_since_last_message: { type: "number" },
            sentiment: { type: "string" },
            notable_patterns: { type: "array", items: { type: "string" } },
            coach_action_needed: { type: "boolean" }
          }
        },
        risk_flags: {
          type: "array",
          items: {
            type: "object",
            properties: {
              flag: { type: "string" },
              severity: { type: "string", description: "high / medium / low" },
              reason: { type: "string" },
              suggested_action: { type: "string" }
            }
          }
        },
        positive_highlights: { type: "array", items: { type: "string" } },
        proactive_interventions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              intervention: { type: "string" },
              timing: { type: "string" },
              expected_impact: { type: "string" }
            }
          }
        },
        suggested_coach_message: { type: "string" }
      }
    };

    try {
      const result = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema });
      setInsights(result);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const statusColors = {
    on_track: "bg-green-100 text-green-800 border-green-300",
    needs_attention: "bg-yellow-100 text-yellow-800 border-yellow-300",
    at_risk: "bg-red-100 text-red-800 border-red-300",
    inactive: "bg-gray-100 text-gray-700 border-gray-300",
  };

  const engagementColors = {
    high: "text-green-600",
    moderate: "text-blue-600",
    low: "text-yellow-600",
    silent: "text-red-600",
  };

  return (
    <div className="space-y-4">
      {/* Generate button */}
      <Card className="border-none shadow-md bg-gradient-to-r from-emerald-50 to-teal-50">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-600">
              Analyzes progress logs, meal adherence, food logs, and communication patterns to surface trends, risks, and recommended interventions.
            </p>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm flex-shrink-0 h-9"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
            ) : insights ? (
              <><RefreshCw className="w-4 h-4 mr-2" /> Re-analyze</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Generate Insights</>
            )}
          </Button>
        </CardContent>
      </Card>

      {loading && (
        <Card className="border-none shadow-md">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-10 h-10 mx-auto text-emerald-400 animate-spin mb-4" />
            <p className="text-gray-600 text-sm font-medium">Analyzing {client?.full_name}'s data...</p>
            <p className="text-gray-400 text-xs mt-1">Checking progress, meal logs & communication patterns</p>
          </CardContent>
        </Card>
      )}

      {!loading && insights && (
        <>
          {/* Overall Status */}
          <Card className="border-none shadow-md">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge className={`${statusColors[insights.overall_status] || statusColors.needs_attention} border text-xs font-semibold px-2.5 py-1 capitalize`}>
                      {insights.overall_status?.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-xs text-gray-400">Overall Status</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{insights.overall_summary}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Trends */}
          {insights.key_trends?.length > 0 && (
            <Card className="border-none shadow-md">
              <CardHeader className="pb-2 pt-4 px-4 sm:px-5">
                <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" /> Key Trends
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-5 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {insights.key_trends.map((t, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="mt-0.5 flex-shrink-0">{TREND_ICON[t.trend] || TREND_ICON.stable}</div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-700 capitalize">{t.area}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{t.insight}</p>
                        {t.data_point && <p className="text-xs text-gray-400 mt-1 font-mono">{t.data_point}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Risk Flags */}
          {insights.risk_flags?.length > 0 && (
            <Card className="border-none shadow-md">
              <CardHeader className="pb-2 pt-4 px-4 sm:px-5">
                <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" /> Risk Flags
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-5 pb-4 space-y-2">
                {insights.risk_flags.map((r, i) => (
                  <div key={i} className={`p-3 rounded-xl border ${RISK_COLORS[r.severity] || RISK_COLORS.medium}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`${RISK_COLORS[r.severity] || RISK_COLORS.medium} border text-[10px] font-bold uppercase px-1.5 py-0`}>
                            {r.severity}
                          </Badge>
                          <p className="text-xs font-semibold">{r.flag}</p>
                        </div>
                        <p className="text-xs opacity-80">{r.reason}</p>
                        {r.suggested_action && (
                          <div className="flex items-start gap-1 mt-1.5">
                            <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0 opacity-70" />
                            <p className="text-xs font-medium">{r.suggested_action}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Communication Analysis */}
          {insights.communication_analysis && (
            <Card className="border-none shadow-md">
              <CardHeader className="pb-2 pt-4 px-4 sm:px-5">
                <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-500" /> Communication Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-5 pb-4">
                <div className="flex flex-wrap gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">Engagement:</span>
                    <span className={`text-xs font-bold capitalize ${engagementColors[insights.communication_analysis.engagement_level] || "text-gray-600"}`}>
                      {insights.communication_analysis.engagement_level}
                    </span>
                  </div>
                  {insights.communication_analysis.days_since_last_message != null && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500">Last message:</span>
                      <span className="text-xs font-semibold text-gray-700">{insights.communication_analysis.days_since_last_message}d ago</span>
                    </div>
                  )}
                  {insights.communication_analysis.sentiment && (
                    <div className="flex items-center gap-2">
                      <Heart className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500">Sentiment:</span>
                      <span className="text-xs font-semibold text-gray-700 capitalize">{insights.communication_analysis.sentiment}</span>
                    </div>
                  )}
                </div>
                {insights.communication_analysis.notable_patterns?.length > 0 && (
                  <ul className="space-y-1">
                    {insights.communication_analysis.notable_patterns.map((p, i) => (
                      <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className="text-purple-400 mt-0.5">•</span> {p}
                      </li>
                    ))}
                  </ul>
                )}
                {insights.communication_analysis.coach_action_needed && (
                  <div className="mt-3 flex items-center gap-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
                    <Zap className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                    <p className="text-xs font-semibold text-orange-700">Coach action recommended — reach out soon</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Proactive Interventions */}
          {insights.proactive_interventions?.length > 0 && (
            <Card className="border-none shadow-md">
              <CardHeader className="pb-2 pt-4 px-4 sm:px-5">
                <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-500" /> Proactive Interventions
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-5 pb-4 space-y-2">
                {insights.proactive_interventions.map((iv, i) => (
                  <div key={i} className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                    <p className="text-xs font-semibold text-indigo-800">{iv.intervention}</p>
                    <div className="flex flex-wrap gap-3 mt-1.5">
                      {iv.timing && <span className="text-xs text-indigo-600">⏱ {iv.timing}</span>}
                      {iv.expected_impact && <span className="text-xs text-indigo-500">💡 {iv.expected_impact}</span>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Positive Highlights */}
          {insights.positive_highlights?.length > 0 && (
            <Card className="border-none shadow-md">
              <CardHeader className="pb-2 pt-4 px-4 sm:px-5">
                <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" /> Positive Highlights
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-5 pb-4">
                <ul className="space-y-1.5">
                  {insights.positive_highlights.map((h, i) => (
                    <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" /> {h}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Suggested Coach Message */}
          {insights.suggested_coach_message && (
            <Card className="border-none shadow-md border-l-4 border-l-emerald-500">
              <CardHeader className="pb-2 pt-4 px-4 sm:px-5">
                <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-500" /> Suggested Message to Send Client
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-5 pb-4">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-sm text-gray-700 leading-relaxed italic">
                  "{insights.suggested_coach_message}"
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!loading && !insights && (
        <Card className="border-none shadow-md border-dashed border-2 border-gray-200">
          <CardContent className="p-10 text-center">
            <Brain className="w-14 h-14 mx-auto opacity-20 text-emerald-600 mb-4" />
            <p className="text-gray-500 text-sm">Click "Generate Insights" to get a full AI analysis of {client?.full_name}'s progress, meal adherence, and communication patterns.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}