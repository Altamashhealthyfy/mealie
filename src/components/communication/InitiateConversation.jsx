import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MessageSquare, Loader2, Send, Users } from "lucide-react";

export default function InitiateConversation() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [messageText, setMessageText] = useState("");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false,
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['clientProfile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const clients = await base44.entities.Client.filter({ email: user.email });
      return clients[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: coaches = [] } = useQuery({
    queryKey: ['availableCoaches'],
    queryFn: async () => {
      const profiles = await base44.entities.CoachProfile.list();
      return profiles.filter(p => p.created_by && p.accepting_new_clients !== false);
    },
  });

  const initiateConversationMutation = useMutation({
    mutationFn: async (data) => {
      // Create initial message
      const message = await base44.entities.Message.create({
        client_id: clientProfile?.id,
        sender_type: 'client',
        sender_id: user?.email,
        sender_name: user?.full_name,
        message: data.messageText,
        read: false,
      });

      // Notify coach
      await base44.functions.invoke('notifyNewMessage', {
        message_id: message.id,
        client_id: clientProfile?.id,
        sender_type: 'client',
        sender_name: user?.full_name,
        message_preview: data.messageText.slice(0, 80),
      }).catch(() => {});

      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['realtimeMessages']);
      setMessageText("");
      setSelectedCoach(null);
      setOpen(false);
    },
  });

  const handleInitiateConversation = () => {
    if (!messageText.trim()) return;

    initiateConversationMutation.mutate({
      messageText: messageText.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Start New Conversation
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Start New Conversation
          </DialogTitle>
          <DialogDescription>
            Reach out to your health coach directly
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!clientProfile ? (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg">
              <p className="text-sm text-amber-900">
                Your profile needs to be set up first. Please contact your health coach to get started.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Coach
                </label>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-900">
                    {clientProfile?.assigned_coach ? (
                      Array.isArray(clientProfile.assigned_coach)
                        ? clientProfile.assigned_coach[0]
                        : clientProfile.assigned_coach
                    ) : (
                      "No coach assigned yet"
                    )}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Message
                </label>
                <Textarea
                  placeholder="Tell your coach what's on your mind..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="resize-none min-h-32"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    setMessageText("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInitiateConversation}
                  disabled={!messageText.trim() || initiateConversationMutation.isPending}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 flex items-center justify-center gap-2"
                >
                  {initiateConversationMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}