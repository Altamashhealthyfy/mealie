import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, TrendingUp, Star, Target, Lightbulb } from "lucide-react";

const ratingConfig = {
  excellent: { color: "bg-green-100 text-green-800 border-green-300", icon: "🏆" },
  good: { color: "bg-blue-100 text-blue-800 border-blue-300", icon: "👍" },
  fair: { color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: "📊" },
  needs_attention: { color: "bg-red-100 text-red-800 border-red-300", icon: "⚠️" },
};

export default function AIProgressReport({ data }) {
  if (!data) return null;
  const rating = ratingConfig[data.overall_rating?.toLowerCase()] || ratingConfig.fair;

  return (
    <div className="space-y-5">
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

      {/* Overall Rating */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-600">Overall Progress Rating:</span>
        <Badge className={`border ${rating.color} text-sm px-3 py-1`}>
          {rating.icon} {data.overall_rating?.replace(/_/g, ' ')?.toUpperCase()}
        </Badge>
      </div>

      {/* Analysis Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: "Weight Analysis", content: data.weight_analysis, color: "border-green-400 bg-green-50", icon: "⚖️" },
          { title: "Adherence Analysis", content: data.adherence_analysis, color: "border-purple-400 bg-purple-50", icon: "📋" },
          { title: "Wellness Observations", content: data.wellness_observations, color: "border-orange-400 bg-orange-50", icon: "💚" },
        ].map(({ title, content, color, icon }) => (
          <Card key={title} className={`border-l-4 ${color}`}>
            <CardContent className="p-4">
              <p className="font-semibold text-gray-800 mb-2 text-sm">{icon} {title}</p>
              <p className="text-xs text-gray-700 leading-relaxed">{content}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Achievements & Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-green-200">
          <CardContent className="p-4">
            <p className="font-semibold text-green-800 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Key Achievements
            </p>
            <ul className="space-y-2">
              {data.achievements?.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <Star className="w-3.5 h-3.5 text-yellow-500 mt-0.5 shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardContent className="p-4">
            <p className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Areas for Improvement
            </p>
            <ul className="space-y-2">
              {data.areas_for_improvement?.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-orange-500 mt-0.5 shrink-0">→</span>
                  {a}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card className="border-indigo-200 bg-indigo-50">
        <CardContent className="p-4">
          <p className="font-semibold text-indigo-800 mb-3 flex items-center gap-2">
            <Target className="w-4 h-4" /> Personalized Recommendations (Next 30 Days)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.recommendations?.map((r, i) => (
              <div key={i} className="flex items-start gap-2 bg-white rounded-lg p-2.5 text-sm text-gray-700 shadow-sm">
                <span className="text-indigo-500 font-bold shrink-0">{i + 1}.</span>
                {r}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Next Check-in Focus */}
      {data.next_check_in_focus && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="p-4 flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-800 mb-1">Next Check-in Focus</p>
              <p className="text-sm text-yellow-900">{data.next_check_in_focus}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}