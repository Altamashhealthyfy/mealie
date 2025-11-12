import React, { useState, useEffect, useRef } from "react";
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
  Loader2
} from "lucide-react";
import { format } from "date-fns";

export default function ClientCommunication() {
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['myClientProfile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      
      const clients = await base44.entities.Client.filter({ email: user.email });
      if (clients.length > 0) {
        return clients[0];
      }
      
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
    refetchInterval: 5000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.Message.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['myMessages']);
      setMessageText("");
      setTimeout(scrollToBottom, 100);
      textareaRef.current?.focus();
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Message.update(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['myMessages']);
    },
  });

  useEffect(() => {
    const unreadMessages = messages.filter(
      m => !m.read && m.sender_type === 'dietitian'
    );
    unreadMessages.forEach(msg => {
      markAsReadMutation.mutate(msg.id);
    });
  }, [messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const handleSendMessage = () => {
    if (!messageText.trim() || !clientProfile) {
      alert("Please enter a message");
      return;
    }

    sendMessageMutation.mutate({
      client_id: clientProfile.id,
      sender_type: 'client',
      message: messageText.trim(),
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
            <p className="text-sm text-gray-500">
              Once your profile is created, you'll be able to message your dietitian here.
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
            <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-orange-50 to-red-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Your Dietitian</CardTitle>
                  <p className="text-sm text-gray-600">Always here to help you 💚</p>
                </div>
              </div>
            </CardHeader>

            {/* Messages */}
            <ScrollArea className="flex-1 p-6 bg-gray-50">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No messages yet
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Start a conversation with your dietitian
                    </p>
                    <p className="text-sm text-gray-500">
                      💡 Use the message box below to send your first message
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
                          className={`max-w-[70%] rounded-2xl p-4 shadow-md ${
                            isFromClient
                              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                              : 'bg-white text-gray-900 border border-gray-200'
                          }`}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>
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
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input - ALWAYS VISIBLE AND PROMINENT */}
            <div className="p-4 border-t-2 border-orange-200 bg-white">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Textarea
                    ref={textareaRef}
                    placeholder="Type your message to your dietitian here..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="resize-none min-h-[80px] text-base border-2 border-gray-200 focus:border-orange-400"
                    rows={3}
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Press <kbd className="px-1 py-0.5 bg-gray-100 rounded">Enter</kbd> to send, 
                    <kbd className="px-1 py-0.5 bg-gray-100 rounded ml-1">Shift+Enter</kbd> for new line
                  </p>
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sendMessageMutation.isPending}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 h-[80px] px-6 text-lg font-semibold shadow-lg"
                  size="lg"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-6 h-6 mr-2" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}