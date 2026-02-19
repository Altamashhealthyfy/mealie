import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, ShieldCheck, ShieldAlert, Shield, Zap } from "lucide-react";

const riskColors = {
  high: "bg-red-100 text-red-800 border-red-300",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
  low: "bg-green-100 text-green-800 border-green-300",
};

const riskIcons = {
  high: <ShieldAlert className="w-4 h-4 text-red-600" />,
  medium: <AlertTriangle className="w-4 h-4 text-yellow-600" />,
  low: <ShieldCheck className="w-4 h-4 text-green-600" />,
};

const ScoreMeter = ({ score }) => {
  const pct = (score / 10) * 100;
  const color = score >= 7 ? "bg-red-500" : score >= 4 ? "bg-yellow-500" : "bg-green-500";
  const label = score >= 7 ? "High Risk" : score >= 4 ? "Moderate Risk" : "Low Risk";
  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
        <div className={`h-3 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-gray-700 w-20">{score}/10 – {label}</span>
    </div>
  );
};

export default function AIRiskAssessment({ data }) {
  if (!data) return null;

  return (
    <div className="space-y-5">
      {/* Overall Score */}
      <Card className="border-none shadow-md bg-gradient-to-r from-gray-50 to-slate-50">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-600 mb-2">Overall Risk Score</p>
              <ScoreMeter score={data.overall_risk_score || 0} />
            </div>
            <Badge className={`border text-sm px-3 py-1.5 ${riskColors[data.overall_risk_level?.toLowerCase()] || riskColors.medium}`}>
              {data.overall_risk_level?.toUpperCase() || 'MODERATE'} RISK
            </Badge>
          </div>
          {data.summary && (
            <p className="text-sm text-gray-600 mt-3 leading-relaxed border-t pt-3">{data.summary}</p>
          )}
        </CardContent>
      </Card>

      {/* Risk Categories */}
      <div className="space-y-3">
        {data.risks?.map((risk, i) => {
          const level = risk.risk_level?.toLowerCase();
          return (
            <Card key={i} className={`border-l-4 ${level === 'high' ? 'border-l-red-500' : level === 'medium' ? 'border-l-yellow-500' : 'border-l-green-500'}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    {riskIcons[level] || <Shield className="w-4 h-4 text-gray-500" />}
                    <p className="font-semibold text-gray-800 text-sm">{risk.category}</p>
                  </div>
                  <Badge className={`border text-xs shrink-0 ${riskColors[level] || riskColors.medium}`}>
                    {risk.risk_level?.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-gray-700 mb-3">{risk.description}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {risk.warning_signs?.length > 0 && (
                    <div className="bg-red-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-red-700 mb-1.5">⚠ Warning Signs</p>
                      <ul className="space-y-1">
                        {risk.warning_signs.map((s, j) => (
                          <li key={j} className="text-xs text-red-800">• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {risk.interventions?.length > 0 && (
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-green-700 mb-1.5">✅ Interventions</p>
                      <ul className="space-y-1">
                        {risk.interventions.map((s, j) => (
                          <li key={j} className="text-xs text-green-800">• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Priority Actions */}
      {data.priority_actions?.length > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <p className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" /> Priority Actions
            </p>
            <div className="space-y-2">
              {data.priority_actions.map((a, i) => (
                <div key={i} className="flex items-start gap-2.5 bg-white rounded-lg p-2.5 text-sm text-gray-700 shadow-sm">
                  <span className="font-bold text-purple-600 shrink-0">{i + 1}.</span>
                  {a}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.follow_up_timeline && (
        <p className="text-xs text-gray-500 text-center">⏱ Recommended follow-up: {data.follow_up_timeline}</p>
      )}
    </div>
  );
}