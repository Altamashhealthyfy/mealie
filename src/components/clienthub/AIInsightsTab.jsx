import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, RefreshCw, Brain } from "lucide-react";

export default function AIInsightsTab({ clientId, client }) {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState(null);
  const [activeType, setActiveType] = useState(null);

  const INSIGHT_TYPES = [
    { id: "client_insights", label: "Client Insights", icon: Brain, color: "bg-emerald-500" },
    { id: "progress_report", label: "Progress Report", icon: Sparkles, color: "bg-blue-500" },
    { id: "risk_assessment", label: "Risk Assessment", icon: Sparkles, color: "bg-red-500" },
  ];

  const generate = async (type) => {
    setLoading(true);
    setActiveType(type);
    const res = await base44.functions.invoke("aiClientInsights", { type, clientId });
    setInsight({ type, data: res.data?.data || res.data });
    setLoading(false);
  };

  const renderInsight = (data) => {
    if (!data) return null;
    if (typeof data === "string") return <p className="text-sm text-gray-700 whitespace-pre-wrap">{data}</p>;
    if (data.summary) return (
      <div className="space-y-3">
        {data.summary && <p className="text-sm text-gray-700">{data.summary}</p>}
        {data.key_observations?.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Key Observations</p>
            <ul className="space-y-1">{data.key_observations.map((o, i) => <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-orange-400 shrink-0">•</span>{o}</li>)}</ul>
          </div>
        )}
        {data.recommendations?.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Recommendations</p>
            <ul className="space-y-1">{data.recommendations.map((r, i) => <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-green-500 shrink-0">→</span>{r}</li>)}</ul>
          </div>
        )}
        {data.risk_flags?.length > 0 && (
          <div>
            <p className="text-xs font-bold text-red-500 uppercase mb-1">⚠️ Risk Flags</p>
            <ul className="space-y-1">{data.risk_flags.map((r, i) => <li key={i} className="text-sm text-red-600 flex gap-2"><span className="shrink-0">!</span>{r}</li>)}</ul>
          </div>
        )}
      </div>
    );
    return <pre className="text-xs text-gray-600 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-gray-900">AI Insights</h2>
        <Badge className="bg-purple-100 text-purple-700 border border-purple-300 text-xs">Beta</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {INSIGHT_TYPES.map(t => (
          <Button key={t.id} size="sm" onClick={() => generate(t.id)} disabled={loading}
            className={`${t.color} hover:opacity-90 text-white`}>
            {loading && activeType === t.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
            {t.label}
          </Button>
        ))}
      </div>

      {loading && (
        <Card className="border-none shadow">
          <CardContent className="p-10 text-center">
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-purple-400 mb-3" />
            <p className="text-gray-500 text-sm">AI is analyzing {client?.full_name}'s data...</p>
            <p className="text-xs text-gray-400 mt-1">This may take 15–30 seconds</p>
          </CardContent>
        </Card>
      )}

      {!loading && insight && (
        <Card className="border-none shadow bg-white">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-800 capitalize">{insight.type.replace(/_/g, " ")}</p>
              <Button size="sm" variant="ghost" onClick={() => generate(insight.type)} className="text-purple-600 text-xs">
                <RefreshCw className="w-3 h-3 mr-1" /> Regenerate
              </Button>
            </div>
            {renderInsight(insight.data)}
          </CardContent>
        </Card>
      )}

      {!loading && !insight && (
        <Card className="border-none shadow border-dashed border-2 border-purple-200">
          <CardContent className="p-10 text-center">
            <Sparkles className="w-12 h-12 mx-auto text-purple-200 mb-3" />
            <p className="text-gray-500 text-sm">Click a button above to generate AI insights for {client?.full_name}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}