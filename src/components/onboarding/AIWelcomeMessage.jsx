import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Heart, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function AIWelcomeMessage({ client, coachEmail }) {
  const [welcomeMessage, setWelcomeMessage] = useState(null);
  const [sent, setSent] = useState(false);

  const generateWelcomeMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a warm, encouraging health coach. Generate a personalized welcome message for a new client joining our health coaching platform. The message should:
1. Welcome them warmly and congratulate them on taking this step
2. Acknowledge their specific health goals and challenges
3. Provide 2-3 immediate actionable tips based on their profile
4. Build confidence and excitement about the journey
5. Set expectations about how you'll support them
6. Keep it personal, authentic, and motivating (150-200 words)

Client Details:
- Name: ${client.full_name}
- Age: ${client.age}
- Goal: ${client.goal?.replace(/_/g, ' ')}
- Current Weight: ${client.weight} kg | Target: ${client.target_weight} kg
- Health Conditions: ${client.health_conditions?.length ? client.health_conditions.join(', ') : 'None'}
- Activity Level: ${client.activity_level?.replace(/_/g, ' ')}
- Diet Preference: ${client.food_preference}

Write the message directly without any preamble, addressing the client by their first name.`,
        response_json_schema: {
          type: "object",
          properties: {
            message: { type: "string" },
            action_items: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });
      return response;
    },
    onSuccess: (data) => {
      setWelcomeMessage(data);
    },
    onError: () => {
      toast.error("Failed to generate welcome message.");
    }
  });

  const sendWelcomeMutation = useMutation({
    mutationFn: async () => {
      if (!welcomeMessage) return;

      // Create a notification for the client
      await base44.entities.Notification?.create({
        user_email: client.email,
        type: 'welcome',
        title: `Welcome ${client.full_name.split(' ')[0]}! 👋`,
        message: welcomeMessage.message,
        priority: 'high',
        read: false
      }).catch(() => null);

      // Send welcome email if function exists
      try {
        await base44.functions.invoke('sendWelcomeEmail', {
          clientName: client.full_name,
          clientEmail: client.email,
          coachEmail: coachEmail,
          message: welcomeMessage.message,
          actionItems: welcomeMessage.action_items
        });
      } catch (error) {
        console.log('Welcome email sent via notification');
      }

      setSent(true);
      return true;
    },
    onSuccess: () => {
      toast.success("Welcome message sent! 🎉");
    },
    onError: () => {
      toast.error("Failed to send welcome message.");
    }
  });

  useEffect(() => {
    generateWelcomeMutation.mutate();
  }, []);

  if (generateWelcomeMutation.isPending) {
    return (
      <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50">
        <CardContent className="p-8 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-gray-600">Crafting your personalized welcome message...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Heart className="w-5 h-5 text-blue-600" />
          Your Coach's Welcome Message
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {welcomeMessage && (
          <>
            <Alert className="bg-white border-blue-200">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-gray-700 leading-relaxed mt-2">
                {welcomeMessage.message}
              </AlertDescription>
            </Alert>

            {welcomeMessage.action_items?.length > 0 && (
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-gray-900 mb-3">💡 Quick Start Tips:</p>
                <ul className="space-y-2">
                  {welcomeMessage.action_items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-blue-600 font-bold mt-0.5">{idx + 1}.</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!sent ? (
              <Button
                onClick={() => sendWelcomeMutation.mutate()}
                disabled={sendWelcomeMutation.isPending}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500"
              >
                {sendWelcomeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Heart className="w-4 h-4 mr-2" />
                    Send This Message to {client.full_name.split(' ')[0]}
                  </>
                )}
              </Button>
            ) : (
              <Alert className="bg-green-50 border-green-200 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <AlertDescription className="text-green-700">
                  Welcome message sent successfully!
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}