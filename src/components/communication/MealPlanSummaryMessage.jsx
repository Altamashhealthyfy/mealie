import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Send, FileText } from "lucide-react";

export default function MealPlanSummaryMessage({ mealPlan, client, trigger }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isSending, setIsSending] = useState(false);

  const sendMealPlanMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();

      // Format meal plan summary
      const summaryText = formatMealPlanSummary(data.mealPlan, data.feedback);

      // Create message
      await base44.entities.Message.create({
        client_id: data.client.id,
        sender_type: 'dietitian',
        sender_id: user?.email,
        sender_name: 'Coach',
        message: summaryText,
        content_type: 'text',
        read: false,
        is_important: true
      });

      // Send push notification
      try {
        await base44.functions.invoke('sendPushNotification', {
          user_email: data.client.email,
          title: 'Your Meal Plan Summary',
          body: `${data.mealPlan.name} - ${data.mealPlan.duration} days`,
          action_url: '/MyAssignedMealPlan'
        });
      } catch (err) {
        console.log('Push failed');
      }

      // Create notification
      await base44.entities.Notification.create({
        user_email: data.client.email,
        type: 'meal_plan_update',
        title: 'Meal Plan Summary from Coach',
        message: `Check your ${data.mealPlan.name}`,
        priority: 'high',
        link: '/MyAssignedMealPlan',
        read: false
      }).catch(() => {});

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setFeedback("");
      setShowDialog(false);
    }
  });

  const formatMealPlanSummary = (plan, coachFeedback) => {
    let summary = `📋 **${plan.name}**\n`;
    summary += `Duration: ${plan.duration} days\n`;
    summary += `Target Calories: ${plan.target_calories} cal/day\n`;
    summary += `Food Preference: ${plan.food_preference}\n\n`;

    if (plan.meal_pattern) {
      summary += `Meal Pattern: ${plan.meal_pattern}\n\n`;
    }

    if (coachFeedback) {
      summary += `📝 **Coach's Notes:**\n${coachFeedback}\n\n`;
    }

    summary += `💡 **What to do next:**\n`;
    summary += `1. Review your meal plan\n`;
    summary += `2. Check daily meal options\n`;
    summary += `3. Log your meals each day\n`;
    summary += `4. Reach out with any questions\n\n`;

    summary += `View your complete plan in "My Meal Plan" section.`;

    return summary;
  };

  const handleSend = () => {
    setIsSending(true);
    sendMealPlanMutation.mutate({ mealPlan, client, feedback });
    setTimeout(() => setIsSending(false), 1000);
  };

  return (
    <>
      {trigger ? (
        trigger({ onClick: () => setShowDialog(true) })
      ) : (
        <Button
          onClick={() => setShowDialog(true)}
          variant="outline"
          size="sm"
          className="text-blue-600"
        >
          <Send className="w-4 h-4 mr-2" />
          Send via Message
        </Button>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Send Meal Plan Summary
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Card className="bg-gray-50">
              <CardContent className="p-4 space-y-2">
                <p className="font-semibold">{mealPlan.name}</p>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div>Duration: {mealPlan.duration} days</div>
                  <div>Calories: {mealPlan.target_calories}/day</div>
                  <div>Food Pref: {mealPlan.food_preference}</div>
                  <div>Client: {client.full_name}</div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>Coach's Feedback (Optional)</Label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Add personalized notes or feedback about this meal plan..."
                rows={4}
              />
            </div>

            <Alert className="bg-blue-50 border-blue-300">
              <AlertDescription className="text-sm text-blue-900">
                The meal plan summary will be sent via message with push notification and in-app alert.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  setFeedback("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={isSending || sendMealPlanMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Send to {client.full_name}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}