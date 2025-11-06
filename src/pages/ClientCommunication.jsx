
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Send,
  CheckCheck,
  Clock,
  Paperclip
} from "lucide-react";
import { format } from "date-fns";

export default function ClientCommunication() {
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState("");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Get client profile
  const { data: clientProfile } = useQuery({
    queryKey: ['myClientProfile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      
      // Try to find client by email match
      const clients = await base44.entities.Client.filter({ email: user.email });
      if (clients.length > 0) {
        return clients[0];
      }
      
      // If not found, try case-insensitive search
      const allClients = await base44.entities.Client.list();
      const matchingClient = allClients.find(c => 
        c.email?.toLowerCase() === user.email?.toLowerCase()
      );
      
      return matchingClient || null;
    },
    enabled: !!user,
  });

  const { data: messages } = useQuery({
    queryKey: ['myMessages', clientProfile?.id],
    queryFn: async () => {
      const msgs = await base44.entities.Message.filter({ 
        client_id: clientProfile?.id 
      });
      return msgs.sort((a, b) => 
        new Date(a.created_date) - new Date(b.created_date)
      );
    },
    enabled: !!clientProfile?.id,
    initialData: [],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.Message.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['myMessages']);
      setMessageText("");
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Message.update(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['myMessages']);
    },
  });

  // Mark unread messages as read
  React.useEffect(() => {
    const unreadMessages = messages.filter(
      m => !m.read && m.sender_type === 'dietitian'
    );
    unreadMessages.forEach(msg => {
      markAsReadMutation.mutate(msg.id);
    });
  }, [messages.length]);

  const handleSendMessage = () => {
    if (!messageText.trim() || !clientProfile) return;

    sendMessageMutation.mutate({
      client_id: clientProfile.id,
      sender_type: 'client',
      message: messageText,
      read: false,
    });
  };

  if (!clientProfile) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl">
          <CardHeader>
            <CardTitle>Profile Setup Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Please wait for your dietitian to set up your client profile first.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Messages</h1>
          <p className="text-gray-600">Chat with your dietitian</p>
        </div>

        <Card className="border-none shadow-xl overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
          <div className="flex flex-col h-full">
            {/* Chat Header */}
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Your Dietitian</CardTitle>
                  <p className="text-sm text-gray-600">Always here to help</p>
                </div>
              </div>
            </CardHeader>

            {/* Messages */}
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No messages yet
                    </h3>
                    <p className="text-gray-600">
                      Start a conversation with your dietitian
                    </p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isFromClient = message.sender_type === 'client';

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isFromClient ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl p-4 ${
                            isFromClient
                              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{message.message}</p>
                          <div className={`flex items-center gap-2 mt-2 text-xs ${
                            isFromClient ? 'text-white/70' : 'text-gray-500'
                          }`}>
                            <span>{format(new Date(message.created_date), 'h:mm a')}</span>
                            {isFromClient && (
                              message.read ? (
                                <CheckCheck className="w-3 h-3" />
                              ) : (
                                <Clock className="w-3 h-3" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-end gap-2">
                <Button variant="ghost" size="icon" className="flex-shrink-0">
                  <Paperclip className="w-5 h-5 text-gray-500" />
                </Button>
                <Textarea
                  placeholder="Type your message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="resize-none"
                  rows={2}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sendMessageMutation.isPending}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 flex-shrink-0"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
