import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, ChevronDown, ChevronUp, CheckCircle2, XCircle, Shield } from "lucide-react";

const categoryColors = {
  "Calorie Target": "bg-orange-50 border-orange-200 text-orange-800",
  "Macros": "bg-yellow-50 border-yellow-200 text-yellow-800",
  "Diet Type": "bg-green-50 border-green-200 text-green-800",
  "Medical Condition": "bg-red-50 border-red-200 text-red-800",
  "Allergy": "bg-red-50 border-red-200 text-red-800",
  "Restriction": "bg-blue-50 border-blue-200 text-blue-800",
  "Focus": "bg-purple-50 border-purple-200 text-purple-800",
  "Cuisine": "bg-teal-50 border-teal-200 text-teal-800",
};

function MealOptionRow({ item }) {
  const [open, setOpen] = useState(false);
  const hasExclusions = item.excluded_count > 0;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => hasExclusions && setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-sm transition-colors ${hasExclusions ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'} bg-white`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-gray-700 truncate">{item.category}</span>
          <span className="text-xs text-gray-400 shrink-0">({item.total} total)</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-green-700 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            {item.available_count} available
          </span>
          {hasExclusions && (
            <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5 text-red-500" />
              {item.excluded_count} restricted
              {open ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
            </span>
          )}
        </div>
      </button>

      {open && hasExclusions && (
        <div className="border-t bg-red-50 px-3 py-2 space-y-1.5">
          <p className="text-xs font-semibold text-red-600 mb-2">Restricted options (not used by AI):</p>
          {item.excluded.map((ex, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-gray-700">{ex.option}</span>
                <Badge className="ml-2 bg-red-100 text-red-600 border-0 text-[10px]">{ex.reason}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DiagnosticsPanel({ result, generationCount, modificationInstructions }) {
  const [show, setShow] = useState(false);
  const [tab, setTab] = useState("rules");

  const decisionRules = result?.decision_rules || [];
  const mealOptionAnalysis = result?.meal_option_analysis || [];
  const totalAvailable = mealOptionAnalysis.reduce((sum, c) => sum + c.available_count, 0);
  const totalExcluded = mealOptionAnalysis.reduce((sum, c) => sum + c.excluded_count, 0);
  const totalOptions = mealOptionAnalysis.reduce((sum, c) => sum + c.total, 0);

  return (
    <div>
      <button
        onClick={() => setShow(v => !v)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Activity className="w-4 h-4" />
        {show ? "Hide" : "Show"} Generation Diagnostics
        {show ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {show && (
        <Card className="mt-3 border-gray-200 bg-gray-50">
          <CardContent className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-600" />
              <p className="text-sm font-semibold text-gray-700">Plan Generation Diagnostics</p>
              {generationCount > 1 && (
                <Badge className="bg-amber-100 text-amber-700 border-0 text-xs ml-auto">Generation #{generationCount}</Badge>
              )}
            </div>

            {/* Tab switcher */}
            <div className="flex bg-white border rounded-lg p-1 gap-1">
              <button
                onClick={() => setTab("rules")}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors ${tab === "rules" ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-700"}`}
              >
                📋 Decision Rules ({decisionRules.length})
              </button>
              <button
                onClick={() => setTab("options")}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors ${tab === "options" ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-700"}`}
              >
                🍽️ Meal Options ({totalAvailable}/{totalOptions})
              </button>
            </div>

            {/* RULES TAB */}
            {tab === "rules" && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">These rules will guide the AI meal plan generation.</p>
                {decisionRules.map((item, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${categoryColors[item.category] || "bg-white border-gray-200 text-gray-700"}`}>
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
                    <span className="text-sm leading-relaxed">{item.rule}</span>
                  </div>
                ))}
                {modificationInstructions && (
                  <div className="flex items-start gap-3 p-3 rounded-xl border bg-amber-50 border-amber-200 text-amber-800">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <span className="text-sm leading-relaxed">Coach modification: {modificationInstructions}</span>
                  </div>
                )}
              </div>
            )}

            {/* OPTIONS TAB */}
            {tab === "options" && (
              <div className="space-y-3">
                {/* Summary bar */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white border rounded-lg p-2">
                    <p className="text-lg font-bold text-gray-800">{totalOptions}</p>
                    <p className="text-xs text-gray-500">Total Options</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                    <p className="text-lg font-bold text-green-700">{totalAvailable}</p>
                    <p className="text-xs text-green-600">Available to AI</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                    <p className="text-lg font-bold text-red-600">{totalExcluded}</p>
                    <p className="text-xs text-red-500">Restricted / Excluded</p>
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  Click any category with restricted items to see exactly which options were excluded and why.
                </p>

                <div className="space-y-1.5">
                  {mealOptionAnalysis.map((item, i) => (
                    <MealOptionRow key={i} item={item} />
                  ))}
                </div>
              </div>
            )}

            {/* Plan metadata */}
            {result?.mealPlan && (
              <div className="p-2 bg-white border rounded text-xs text-gray-500 border-t pt-3">
                Plan ID: <span className="font-mono text-gray-700">{result.mealPlan.id}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}