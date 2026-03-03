import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Loader2, Zap, Users, AlertTriangle, CheckCircle } from "lucide-react";
import { createPageUrl } from "@/utils";
import AIMealPlanGenerator from "@/components/mealplanner/AIMealPlanGenerator";

export default function AIGenerateTab({
  isNoClientsMode, selectedClientId, setSelectedClientId,
  selectedClient, clients, mealPlans,
  planConfig, setPlanConfig,
  generating, generatedPlan, viewingPlan,
  generateMealPlan,
  user, coachPlan, coachSubscription, availableAICredits, usage,
  onGeneratedPlan,
  GeneratedMealPlanComponent,
  handleSavePlan, handleSaveAsTemplate, handleGenerateNew,
  savePlanMutation, updatePlanMutation
}) {
  if (isNoClientsMode) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-12 text-center">
          <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Clients Yet</h3>
          <p className="text-gray-600 mb-4">Add clients before generating meal plans</p>
          <Button onClick={() => window.location.href = createPageUrl('ClientManagement')}>
            <Users className="w-4 h-4 mr-2" />Manage Clients
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (generatedPlan !== null || viewingPlan !== null) {
    return (
      <GeneratedMealPlanComponent
        plan={viewingPlan || generatedPlan}
        onSave={viewingPlan ? null : handleSavePlan}
        onSaveAsTemplate={!viewingPlan ? handleSaveAsTemplate : null}
        onGenerateNew={handleGenerateNew}
        isSaving={savePlanMutation.isPending || updatePlanMutation.isPending}
      />
    );
  }

  return (
    <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-orange-500" />
          Generate New Meal Plan with AI
        </CardTitle>
        <CardDescription>
          {user?.user_type === 'student_coach' && coachPlan ? (
            availableAICredits > 0 ? '✅ FREE with your AI credits - Use templates to save credits!'
              : `⚠️ Costs ₹${coachPlan.ai_credit_price || 10} per plan - Use templates to save money!`
          ) : `⚠️ Costs ₹${coachPlan?.ai_credit_price || 10} per plan - Use templates to save money!`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="client" className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />Select Client *
          </Label>
          <Select value={selectedClientId || ''} onValueChange={setSelectedClientId}>
            <SelectTrigger id="client" className="h-12">
              <SelectValue placeholder="Choose a client..." />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => {
                const hasActivePlan = mealPlans.filter(p => p.client_id === client.id).some(p => p.active);
                return (
                  <SelectItem key={client.id} value={client.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{client.full_name}</span>
                      <Badge variant="outline" className="text-xs capitalize">{client.food_preference}</Badge>
                      <Badge className="text-xs">{client.target_calories} kcal</Badge>
                      {hasActivePlan && <Badge className="text-xs bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Has Plan</Badge>}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {selectedClient && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-lg">{selectedClient.full_name.charAt(0)}</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{selectedClient.full_name}</h3>
                <p className="text-sm text-gray-600">{selectedClient.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-600">Food:</span><Badge className="ml-2 capitalize">{selectedClient.food_preference}</Badge></div>
              <div><span className="text-gray-600">Region:</span><Badge className="ml-2 capitalize">{selectedClient.regional_preference}</Badge></div>
              <div><span className="text-gray-600">Target Calories:</span><span className="ml-2 font-semibold">{selectedClient.target_calories} kcal</span></div>
              <div><span className="text-gray-600">Goal:</span><Badge className="ml-2 capitalize">{selectedClient.goal?.replace('_', ' ')}</Badge></div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="duration">Duration</Label>
            <Select value={planConfig.duration.toString()} onValueChange={(v) => setPlanConfig({...planConfig, duration: parseInt(v)})}>
              <SelectTrigger id="duration"><SelectValue placeholder="Select duration" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 Days</SelectItem>
                <SelectItem value="10">10 Days</SelectItem>
                <SelectItem value="15">15 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="meal-pattern">Meal Pattern</Label>
            <Select value={planConfig.meal_pattern} onValueChange={(v) => setPlanConfig({...planConfig, meal_pattern: v})}>
              <SelectTrigger id="meal-pattern"><SelectValue placeholder="Select meal pattern" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily (Unique each day)</SelectItem>
                <SelectItem value="3-3-4">3-3-4 Pattern</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {user?.user_type === 'student_coach' && coachPlan ? (
          <Alert className={`border-2 ${availableAICredits > 0 ? 'border-green-500 bg-green-50' : 'border-yellow-500 bg-yellow-50'}`}>
            <AlertTriangle className={`w-5 h-5 ${availableAICredits > 0 ? 'text-green-600' : 'text-yellow-600'}`} />
            <AlertDescription className="ml-2">
              <p className={`font-semibold ${availableAICredits > 0 ? 'text-green-900' : 'text-yellow-900'}`}>
                {availableAICredits > 0 ? '✅ FREE Generation (using your AI credits)' : `💸 Cost: ₹${coachPlan.ai_credit_price || 10} per generation`}
              </p>
              <p className={`text-sm ${availableAICredits > 0 ? 'text-green-800' : 'text-yellow-800'}`}>
                AI Credits Available: {availableAICredits === Infinity ? 'Unlimited ∞' : availableAICredits}
              </p>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-2 border-yellow-500 bg-yellow-50">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <AlertDescription className="ml-2">
              <p className="font-semibold text-yellow-900">💸 This will cost ₹{coachPlan?.ai_credit_price || 10}</p>
              <p className="text-sm text-yellow-800">You've used {usage?.meal_plans_generated || 0} / {usage?.plan_limits?.meal_plans || 20} AI generations this month</p>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={generateMealPlan} disabled={generating || !selectedClientId}
            className="flex-1 h-12 sm:h-14 text-sm sm:text-base bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg">
            {generating ? (
              <><Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />Generating...</>
            ) : (
              <><Zap className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                {user?.user_type === 'student_coach' && coachPlan && availableAICredits > 0
                  ? 'Generate (FREE with credits)' : `Generate (₹${coachPlan?.ai_credit_price || 10})`}
              </>
            )}
          </Button>
          {selectedClient && (
            <AIMealPlanGenerator
              client={selectedClient}
              onPlanGenerated={(plan) => onGeneratedPlan(plan)}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}