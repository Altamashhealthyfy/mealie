import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Zap, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function UsageLimitWarning({ usage, limits, type = "meal_plan" }) {
  if (!usage || !limits) return null;

  const typeConfig = {
    meal_plan: {
      current: usage.meal_plans_generated || 0,
      limit: limits.meal_plans || 20,
      label: "AI Meal Plans",
      cost: "₹10"
    },
    recipe: {
      current: usage.recipes_generated || 0,
      limit: limits.recipes || 50,
      label: "AI Recipes",
      cost: "₹5"
    },
    food_lookup: {
      current: usage.food_lookups || 0,
      limit: limits.food_lookups || 50,
      label: "Food Lookups",
      cost: "₹2"
    },
    business_gpt: {
      current: usage.business_gpt_queries || 0,
      limit: limits.business_gpts || 10,
      label: "Business GPT Queries",
      cost: "₹8"
    }
  };

  const config = typeConfig[type];
  const percentage = (config.current / config.limit) * 100;
  const remaining = config.limit - config.current;
  const isNearLimit = percentage >= 80;
  const isOverLimit = percentage >= 100;

  if (percentage < 50) return null; // Don't show if plenty remaining

  return (
    <Alert className={`border-2 ${
      isOverLimit ? 'bg-red-50 border-red-500' : 
      isNearLimit ? 'bg-yellow-50 border-yellow-500' : 
      'bg-blue-50 border-blue-500'
    }`}>
      {isOverLimit ? (
        <AlertTriangle className="w-5 h-5 text-red-600" />
      ) : (
        <Zap className="w-5 h-5 text-yellow-600" />
      )}
      <AlertDescription className="ml-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className={`font-semibold ${
              isOverLimit ? 'text-red-900' : 
              isNearLimit ? 'text-yellow-900' : 
              'text-blue-900'
            }`}>
              {isOverLimit 
                ? `⚠️ Monthly Limit Reached!` 
                : `📊 ${config.label} Usage`
              }
            </p>
            <Badge variant={isOverLimit ? "destructive" : isNearLimit ? "warning" : "secondary"}>
              {config.current} / {config.limit}
            </Badge>
          </div>

          <Progress value={Math.min(percentage, 100)} className="h-2" />

          {isOverLimit ? (
            <div className="space-y-2">
              <p className="text-sm text-red-800">
                🚨 You've used all {config.limit} {config.label.toLowerCase()} for this month.
              </p>
              <p className="text-sm text-red-800">
                <strong>Each additional generation costs {config.cost}</strong>
              </p>
              <div className="p-3 bg-green-100 border border-green-300 rounded-lg mt-2">
                <p className="text-sm font-semibold text-green-900 mb-1">
                  💡 Save Money: Use Templates Instead!
                </p>
                <p className="text-xs text-green-800">
                  Templates are FREE and unlimited. Clone a template and customize it manually in 5 minutes!
                </p>
              </div>
            </div>
          ) : isNearLimit ? (
            <div className="space-y-2">
              <p className="text-sm text-yellow-800">
                ⚠️ Only <strong>{remaining}</strong> {config.label.toLowerCase()} remaining this month!
              </p>
              <div className="p-3 bg-green-100 border border-green-300 rounded-lg mt-2">
                <p className="text-sm font-semibold text-green-900 mb-1">
                  💡 Pro Tip: Switch to Templates
                </p>
                <p className="text-xs text-green-800">
                  Save your AI generations for special cases. Use templates for regular clients - it's FREE!
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-blue-800">
              {remaining} {config.label.toLowerCase()} remaining this month
            </p>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}