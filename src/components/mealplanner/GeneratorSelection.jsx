import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Zap } from "lucide-react";
import SmartMealPlanGenerator from "@/components/mealplanner/SmartMealPlanGenerator";
import AIMealPlanGenerator from "@/components/mealplanner/AIMealPlanGenerator";

export default function GeneratorSelection({ 
  selectedClient, 
  generating, 
  generateMealPlan, 
  onPlanGenerated,
  user,
  coachPlan,
  availableAICredits
}) {
  if (!selectedClient) return null;

  return (
    <div className="space-y-4">
      <SmartMealPlanGenerator
        client={selectedClient}
        onPlanGenerated={onPlanGenerated}
      />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">Or use standard AI</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={generateMealPlan}
          disabled={generating}
          className="flex-1 h-12 sm:h-14 text-sm sm:text-base md:text-lg bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
              <span className="hidden sm:inline">Generating Meal Plan...</span>
              <span className="sm:hidden">Generating...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              {user?.user_type === 'student_coach' && coachPlan ? (
                availableAICredits > 0 ? (
                  <>
                    <span className="hidden md:inline">Standard AI Generation (FREE)</span>
                    <span className="md:hidden">Standard AI (FREE)</span>
                  </>
                ) : (
                  <>
                    <span className="hidden md:inline">Standard AI (₹{coachPlan.ai_credit_price || 10})</span>
                    <span className="md:hidden">Standard (₹{coachPlan.ai_credit_price || 10})</span>
                  </>
                )
              ) : (
                <>
                  <span className="hidden md:inline">Standard AI (₹{coachPlan?.ai_credit_price || 10})</span>
                  <span className="md:hidden">Standard AI (₹{coachPlan?.ai_credit_price || 10})</span>
                </>
              )}
            </>
          )}
        </Button>
        <AIMealPlanGenerator 
          client={selectedClient}
          onPlanGenerated={onPlanGenerated}
        />
      </div>
    </div>
  );
}