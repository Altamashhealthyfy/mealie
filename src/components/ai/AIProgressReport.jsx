import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Minus, Star, Target, Lightbulb, MessageSquare, Copy, CheckCheck, Activity, Zap, Moon, Flame } from "lucide-react";

const ratingConfig = {
  excellent: { color: "bg-green-100 text-green-800 border-green-300", icon: "🏆", label: "Excellent" },
  good: { color: "bg-blue-100 text-blue-800 border-blue-300", icon: "👍", label: "Good" },
  fair: { color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: "📊", label: "Fair" },
  needs_attention: { color: "bg-red-100 text-red-800 border-red-300", icon: "⚠️", label: "Needs Attention" },
};

const trendIcon = (trend) => {
  if (!trend) return null;
  if (trend === 'improving') return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (trend === 'declining') return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
};

const trendColor = (trend) => {
  if (trend === 'improving') return 'text-green-700 bg-green-50 border-green-200';
  if (trend === 'declining') return 'text-red-700 bg-red-50 border-red-200';
  return 'text-gray-700 bg-gray-50 border-gray-200';
};

const priorityColor = { high: 'bg-red-100 text-red-700', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-gray-100 text-gray-600' };

export default function AIProgressReport({ data }) {
  const [copiedMsg, setCopiedMsg] = useState(false);
  if (!data) return null;

  const rating = ratingConfig[data.overall_rating?.toLowerCase()] || ratingConfig.fair;

  const copyClientMessage = () => {
    if (data.client_message) {
      navigator.clipboard.writeText(data.client_message);
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2000);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header: Rating + Period */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Badge className={`border text-sm px-3 py-1.5 ${rating.color}`}>
            {rating.icon} {rating.label}
          </Badge>
          {data.report_period && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{data.report_period}</span>
          )}
        </div>
      </div>

      {/* Executive Summary */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-800 mb-1">Executive Summary</p>
              <p className="text-sm text-blue-900 leading-relaxed">{data.executive_summary}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weight + Adherence Trend Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: "⚖️ Weight Analysis", key: "weight_analysis", fallback: null },
          { label: "📋 Meal Adherence", key: "adherence_analysis", fallback: null },
        ].map(({ label, key }) => {
          const d = data[key];
          if (!d) return null;
          const isObj = typeof d === 'object';
          const trend = isObj ? d.trend : null;
          return (
            <Card key={key} className={`border ${trendColor(trend)}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-sm text-gray-800">{label}</p>
                  {trend && (
                    <div className="flex items-center gap-1.5">
                      {trendIcon(trend)}
                      <span className="text-xs font-medium capitalize">{trend?.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">{isObj ? d.summary : d}</p>
                {isObj && d.key_insight && (
                  <p className="mt-2 text-xs italic text-gray-500 border-t pt-2">{d.key_insight}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Wellness Row */}
      {data.wellness_observations && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-orange-800 mb-3">💚 Wellness Observations</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: <Zap className="w-3.5 h-3.5" />, label: "Energy", value: data.wellness_observations.energy },
                { icon: <Moon className="w-3.5 h-3.5" />, label: "Sleep", value: data.wellness_observations.sleep },
                { icon: <Flame className="w-3.5 h-3.5" />, label: "Stress", value: data.wellness_observations.stress },
                { icon: <Activity className="w-3.5 h-3.5" />, label: "Symptoms", value: data.wellness_observations.symptoms_noted },
              ].filter(i => i.value).map(({ icon, label, value }) => (
                <div key={label} className="bg-white rounded-lg p-2.5 shadow-sm">
                  <div className="flex items-center gap-1.5 text-orange-600 mb-1">{icon}<span className="text-xs font-semibold">{label}</span></div>
                  <p className="text-xs text-gray-600 leading-snug">{value}</p>
                </div>
              ))}
            </div>
            {data.activity_analysis && (
              <p className="text-xs text-gray-700 mt-3 border-t border-orange-200 pt-3">{data.activity_analysis}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Goal Progress */}
      {data.goal_progress?.length > 0 && (
        <Card className="border-indigo-200">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-indigo-800 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" /> Goal Progress
            </p>
            <div className="space-y-2">
              {data.goal_progress.map((g, i) => (
                <div key={i} className="flex items-start gap-3 bg-indigo-50 rounded-lg p-2.5">
                  <span className="text-xs font-bold text-indigo-400 mt-0.5 shrink-0">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-gray-800">{g.goal}</span>
                      {g.status && <Badge className="text-[10px] px-1.5 py-0 bg-white border">{g.status}</Badge>}
                    </div>
                    {g.comment && <p className="text-xs text-gray-600 mt-0.5">{g.comment}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achievements & Areas for Improvement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-green-200">
          <CardContent className="p-4">
            <p className="font-semibold text-green-800 mb-3 flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4" /> Achievements
            </p>
            <ul className="space-y-2">
              {data.achievements?.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <Star className="w-3.5 h-3.5 text-yellow-500 mt-0.5 shrink-0" /> {a}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardContent className="p-4">
            <p className="font-semibold text-orange-800 mb-3 flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4" /> Areas for Improvement
            </p>
            <ul className="space-y-2">
              {data.areas_for_improvement?.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-orange-500 mt-0.5 shrink-0">→</span> {a}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {data.recommendations?.length > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <p className="font-semibold text-purple-800 mb-3 flex items-center gap-2 text-sm">
              <Lightbulb className="w-4 h-4" /> Recommended Actions
            </p>
            <div className="space-y-2">
              {data.recommendations.map((r, i) => {
                const isObj = typeof r === 'object';
                return (
                  <div key={i} className="flex items-start gap-3 bg-white rounded-lg p-3 shadow-sm">
                    <span className="text-purple-500 font-bold text-sm shrink-0">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 font-medium">{isObj ? r.action : r}</p>
                      {isObj && r.reason && <p className="text-xs text-gray-500 mt-0.5">{r.reason}</p>}
                    </div>
                    {isObj && r.priority && (
                      <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${priorityColor[r.priority] || priorityColor.low}`}>
                        {r.priority}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Focus for next period */}
      {data.focus_for_next_period && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="p-4 flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-800 mb-1">Focus for Next Period</p>
              <p className="text-sm text-yellow-900">{data.focus_for_next_period}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Message */}
      {data.client_message && (
        <Card className="border-teal-300 bg-teal-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-teal-800 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Message for Client
              </p>
              <button
                onClick={copyClientMessage}
                className="flex items-center gap-1.5 text-xs text-teal-700 hover:text-teal-900 bg-white border border-teal-300 rounded-lg px-2.5 py-1 transition-colors"
              >
                {copiedMsg ? <><CheckCheck className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Message</>}
              </button>
            </div>
            <p className="text-sm text-teal-900 leading-relaxed italic">"{data.client_message}"</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}