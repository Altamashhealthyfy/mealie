import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, BookOpen, Apple, Ban, Clock, Heart, HelpCircle, Sparkles } from "lucide-react";

function Section({ icon, title, children, color = "blue" }) {
  const [open, setOpen] = useState(true);
  const colorMap = {
    green: "bg-green-50 border-green-200 text-green-800",
    red: "bg-red-50 border-red-200 text-red-800",
    blue: "bg-blue-50 border-blue-200 text-blue-800",
    orange: "bg-orange-50 border-orange-200 text-orange-800",
    purple: "bg-purple-50 border-purple-200 text-purple-800",
  };
  return (
    <Card className={`border ${colorMap[color]}`}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between p-4">
        <span className="font-semibold text-sm flex items-center gap-2">{icon} {title}</span>
        {open ? <ChevronUp className="w-4 h-4 opacity-60" /> : <ChevronDown className="w-4 h-4 opacity-60" />}
      </button>
      {open && <CardContent className="pt-0 px-4 pb-4">{children}</CardContent>}
    </Card>
  );
}

export default function AIEducationMaterial({ data }) {
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Title & Intro */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-5 h-5" />
          <h3 className="font-bold text-lg">{data.title}</h3>
        </div>
        <p className="text-sm text-indigo-100 leading-relaxed">{data.introduction}</p>
      </div>

      {/* Key Nutrients */}
      {data.key_nutrients?.length > 0 && (
        <Section icon={<Sparkles className="w-4 h-4" />} title="Key Nutrients to Focus On" color="blue">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {data.key_nutrients.map((n, i) => (
              <div key={i} className="bg-white rounded-xl p-3 shadow-sm border border-blue-100">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="font-semibold text-blue-800 text-sm">{n.nutrient}</p>
                  {n.daily_target && <Badge className="text-xs bg-blue-100 text-blue-700 border-0">{n.daily_target}</Badge>}
                </div>
                <p className="text-xs text-gray-600 mb-2">{n.why_important}</p>
                {n.food_sources?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {n.food_sources.map((f, j) => (
                      <span key={j} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{f}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Foods to Include / Avoid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.foods_to_include?.length > 0 && (
          <Section icon={<Apple className="w-4 h-4" />} title="Foods to Include" color="green">
            <ul className="mt-2 space-y-1.5">
              {data.foods_to_include.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-green-500 shrink-0">✓</span>{f}
                </li>
              ))}
            </ul>
          </Section>
        )}
        {data.foods_to_avoid?.length > 0 && (
          <Section icon={<Ban className="w-4 h-4" />} title="Foods to Avoid" color="red">
            <ul className="mt-2 space-y-1.5">
              {data.foods_to_avoid.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-red-500 shrink-0">✗</span>{f}
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      {/* Meal Timing */}
      {data.meal_timing_tips?.length > 0 && (
        <Section icon={<Clock className="w-4 h-4" />} title="Meal Timing Tips" color="orange">
          <ul className="mt-2 space-y-1.5">
            {data.meal_timing_tips.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-orange-500 shrink-0">•</span>{t}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Lifestyle Factors */}
      {data.lifestyle_factors?.length > 0 && (
        <Section icon={<Heart className="w-4 h-4" />} title="Lifestyle Factors" color="purple">
          <ul className="mt-2 space-y-1.5">
            {data.lifestyle_factors.map((l, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-purple-500 shrink-0">→</span>{l}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Myths vs Facts */}
      {data.myths_vs_facts?.length > 0 && (
        <Section icon={<HelpCircle className="w-4 h-4" />} title="Myths vs Facts" color="blue">
          <div className="mt-2 space-y-3">
            {data.myths_vs_facts.map((m, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-red-50 rounded-lg p-2.5 text-xs">
                  <p className="font-semibold text-red-700 mb-1">❌ Myth</p>
                  <p className="text-red-800">{m.myth}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2.5 text-xs">
                  <p className="font-semibold text-green-700 mb-1">✅ Fact</p>
                  <p className="text-green-800">{m.fact}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Motivational Message */}
      {data.motivational_message && (
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-2xl p-4 text-center">
          <p className="text-2xl mb-2">🌟</p>
          <p className="text-sm text-orange-900 font-medium leading-relaxed italic">"{data.motivational_message}"</p>
        </div>
      )}
    </div>
  );
}