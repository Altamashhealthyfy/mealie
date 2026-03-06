import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, ChevronDown, ChevronUp, CheckCircle2, XCircle, Shield, Loader2, Eye, EyeOff } from "lucide-react";
import { debounce } from "lodash";

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

// Diet preference badge colors
const dietBadgeColors = {
  veg: "bg-green-100 text-green-800 border-green-300",
  jain: "bg-emerald-100 text-emerald-800 border-emerald-300",
  eggetarian: "bg-yellow-100 text-yellow-800 border-yellow-300",
  non_veg: "bg-red-100 text-red-800 border-red-300",
  mixed: "bg-gray-100 text-gray-800 border-gray-300",
};

function MealOptionRow({ item }) {
  const [open, setOpen] = useState(false);
  const hasExclusions = item.excluded_count > 0;
  const allExcluded = item.available_count === 0;

  return (
    <div className={`border rounded-lg overflow-hidden ${allExcluded ? 'border-red-200' : ''}`}>
      <button
        onClick={() => hasExclusions && setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-sm transition-colors ${hasExclusions ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'} ${allExcluded ? 'bg-red-50' : 'bg-white'}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={`font-medium truncate ${allExcluded ? 'text-red-700' : 'text-gray-700'}`}>{item.category}</span>
          <span className="text-xs text-gray-400 shrink-0">({item.total} options)</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {item.available_count > 0 && (
            <span className="text-xs font-semibold text-green-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              {item.available_count} available
            </span>
          )}
          {hasExclusions && (
            <span className={`text-xs font-semibold flex items-center gap-1 ${allExcluded ? 'text-red-700' : 'text-red-500'}`}>
              <XCircle className="w-3.5 h-3.5" />
              {item.excluded_count} excluded
              {open ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
            </span>
          )}
        </div>
      </button>

      {open && hasExclusions && (
        <div className="border-t bg-red-50 px-3 py-2 space-y-2">
          <p className="text-xs font-semibold text-red-600">Excluded options (AI cannot use these):</p>
          <div className="space-y-1">
            {item.excluded.map((ex, i) => (
              <div key={i} className="flex items-start gap-2 text-xs bg-white rounded p-2 border border-red-100">
                <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-gray-700 block">{ex.option}</span>
                  <Badge className="mt-1 bg-red-100 text-red-600 border-0 text-[10px]">{ex.reason}</Badge>
                </div>
              </div>
            ))}
          </div>
          {item.available_count > 0 && (
            <div className="mt-2 pt-2 border-t border-red-200">
              <p className="text-xs font-semibold text-green-700 mb-1">Still available ({item.available_count}):</p>
              <div className="flex flex-wrap gap-1">
                {item.available.map((opt, i) => (
                  <span key={i} className="text-[10px] bg-green-50 text-green-700 border border-green-200 rounded px-1.5 py-0.5">{opt.length > 50 ? opt.slice(0, 50) + '…' : opt}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PreGenerationDiagnostics({ client, additionalRestrictions, additionalAllergies, additionalConditions, overrideGoal, overrideCalories, overrideProtein, overrideCarbs, overrideFats, focusAreas, cuisineNotes }) {
  const [show, setShow] = useState(false);
  const [tab, setTab] = useState("options");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchPreview = useCallback(
    debounce(async (params) => {
      if (!params.clientId) return;
      setLoading(true);
      try {
        const res = await base44.functions.invoke('mealOptionsPreview', params);
        if (res.data?.success) setData(res.data);
      } catch (e) {
        console.error('Preview fetch failed', e);
      } finally {
        setLoading(false);
      }
    }, 600),
    []
  );

  useEffect(() => {
    if (show) {
      fetchPreview({
        clientId: client.id,
        additionalRestrictions,
        additionalAllergies,
        additionalConditions,
        overrideGoal: overrideGoal || undefined,
        overrideCalories: overrideCalories ? parseInt(overrideCalories) : undefined,
        overrideProtein: overrideProtein ? parseInt(overrideProtein) : undefined,
        overrideCarbs: overrideCarbs ? parseInt(overrideCarbs) : undefined,
        overrideFats: overrideFats ? parseInt(overrideFats) : undefined,
        focusAreas,
        cuisineNotes,
      });
    }
  }, [show, additionalRestrictions, additionalAllergies, additionalConditions, overrideGoal, overrideCalories, overrideProtein, overrideCarbs, overrideFats, focusAreas, cuisineNotes]);

  const mealOptionAnalysis = data?.meal_option_analysis || [];
  const decisionRules = data?.decision_rules || [];
  const totalAvailable = mealOptionAnalysis.reduce((sum, c) => sum + c.available_count, 0);
  const totalExcluded = mealOptionAnalysis.reduce((sum, c) => sum + c.excluded_count, 0);
  const totalOptions = mealOptionAnalysis.reduce((sum, c) => sum + c.total, 0);
  const foodPref = data?.food_preference || client.food_preference || 'mixed';

  return (
    <div className="border border-blue-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setShow(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-blue-800">Preview Meal Options & Rules</span>
          <Badge className={`text-xs border ${dietBadgeColors[foodPref] || dietBadgeColors.mixed}`}>
            {foodPref.charAt(0).toUpperCase() + foodPref.slice(1).replace('_', '-')}
          </Badge>
          {!show && totalExcluded > 0 && (
            <span className="text-xs text-red-600 font-medium">{totalExcluded} restricted</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
          {show ? (
            <span className="text-xs text-blue-600 flex items-center gap-1"><EyeOff className="w-3.5 h-3.5" /> Hide</span>
          ) : (
            <span className="text-xs text-blue-600 flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Show what AI can choose from</span>
          )}
        </div>
      </button>

      {show && (
        <div className="p-4 space-y-3 bg-white">
          {loading && !data ? (
            <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Analysing meal options...</span>
            </div>
          ) : data ? (
            <>
              {/* Tab switcher */}
              <div className="flex bg-gray-100 border rounded-lg p-1 gap-1">
                <button
                  onClick={() => setTab("options")}
                  className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors ${tab === "options" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  🍽️ Meal Options ({totalAvailable}/{totalOptions} available)
                </button>
                <button
                  onClick={() => setTab("rules")}
                  className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors ${tab === "rules" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  📋 Decision Rules ({decisionRules.length})
                </button>
              </div>

              {/* OPTIONS TAB */}
              {tab === "options" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-50 border rounded-lg p-2">
                      <p className="text-lg font-bold text-gray-800">{totalOptions}</p>
                      <p className="text-xs text-gray-500">Total Options</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                      <p className="text-lg font-bold text-green-700">{totalAvailable}</p>
                      <p className="text-xs text-green-600">Available to AI</p>
                    </div>
                    <div className={`border rounded-lg p-2 ${totalExcluded > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}>
                      <p className={`text-lg font-bold ${totalExcluded > 0 ? 'text-red-600' : 'text-gray-400'}`}>{totalExcluded}</p>
                      <p className={`text-xs ${totalExcluded > 0 ? 'text-red-500' : 'text-gray-400'}`}>Restricted</p>
                    </div>
                  </div>

                  {totalExcluded > 0 && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      ⚠️ {totalExcluded} options are restricted due to your current settings. Click any category below to see which dishes are excluded and why — adjust restrictions above if needed.
                    </p>
                  )}

                  <div className="space-y-1.5">
                    {mealOptionAnalysis.map((item, i) => (
                      <MealOptionRow key={i} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* RULES TAB */}
              {tab === "rules" && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">These rules guide the AI when generating the meal plan.</p>
                  {decisionRules.map((item, i) => (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${categoryColors[item.category] || "bg-white border-gray-200 text-gray-700"}`}>
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
                      <span className="text-sm leading-relaxed">{item.rule}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-400 text-center py-4">Click to load preview</p>
          )}
        </div>
      )}
    </div>
  );
}