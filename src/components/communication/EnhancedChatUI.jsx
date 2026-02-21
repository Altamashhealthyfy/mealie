import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Send,
  Check,
  CheckCheck,
  Paperclip,
  Loader2,
  Clock,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import TemplateMessagePanel from "./TemplateMessagePanel";

export default function EnhancedChatUI({ clientId, clientName, coachEmail, userType = "coach" }) {
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    fetchUser();
  }, []);

  // Fetch messages
  const { data: allMessages = [] } = useQuery({
    queryKey: ["clientMessages", clientId],
    queryFn: async () => {
      try {
        const msgs = await base44.entities.Message.filter({ client_id: clientId });
        return msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      } catch {
        return [];
      }
    },
    refetchInterval: 3000
  });

  useEffect(() => {
    setMessages(allMessages);
    scrollToBottom();
  }, [allMessages]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.data?.client_id === clientId) {
        if (event.type === 'create') {
          setMessages(prev => [...prev, event.data]);
        } else if (event.type === 'update') {
          setMessages(prev => prev.map(m => m.id === event.id ? event.data : m));
        }
      }
    });
    return unsubscribe;
  }, [clientId]);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (content) => {
      const messageData = {
        client_id: clientId,
        sender_type: userType === "coach" ? "dietitian" : "client",
        sender_id: currentUser?.email || coachEmail,
        sender_name: currentUser?.full_name || "Coach",
        message: content,
        content_type: "text",
        read: false
      };
      return base44.entities.Message.create(messageData);
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["clientMessages"] });
      setTimeout(scrollToBottom, 100);
    }
  });

  // Mark messages as read
  const markAsReadMutation = useMutation({
    mutationFn: async (messageIds) => {
      const now = new Date().toISOString();
      const promises = messageIds.map(id =>
        base44.entities.Message.update(id, {
          read: true,
          read_by: [
            ...(messages.find(m => m.id === id)?.read_by || []),
            { user_id: currentUser?.email, read_at: now }
          ]
        })
      );
      return Promise.all(promises);
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = () => {
    if (messageText.trim()) {
      sendMutation.mutate(messageText);
    }
  };

  const handleUseTemplate = (templateContent) => {
    setMessageText(templateContent);
    setShowTemplates(false);
  };

  // Mark unread messages as read when viewing
  useEffect(() => {
    const unreadIds = messages
      .filter(m => !m.read && m.sender_type !== userType)
      .map(m => m.id);
    if (unreadIds.length > 0) {
      markAsReadMutation.mutate(unreadIds);
    }
  }, [messages]);

  const getReadStatus = (message) => {
    if (!message.read_by || message.read_by.length === 0) {
      return <Clock className="w-4 h-4 text-gray-400" />;
    }
    if (message.read_by.length > 1) {
      return <CheckCheck className="w-4 h-4 text-blue-500" />;
    }
    return <Check className="w-4 h-4 text-gray-400" />;
  };

  return (
    <Card className="h-full flex flex-col border-none shadow-lg">
      <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-t-lg border-b-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-white">💬 Chat with {clientName}</CardTitle>
            <p className="text-sm text-orange-100 mt-1">Messages are encrypted and secure</p>
          </div>
          <Badge variant="outline" className="bg-white text-orange-600 border-white">
            {messages.filter(m => !m.read && m.sender_type !== userType).length} unread
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 space-y-4">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pb-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <p className="mb-2">No messages yet</p>
                <p className="text-sm">Start a conversation with {clientName}</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender_type === userType ? "justify-end" : "justify-start"}`}
              >
                {msg.sender_type !== userType && (
                  <Avatar className="w-8 h-8 bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {clientName.charAt(0)}
                  </Avatar>
                )}

                <div className={`flex flex-col max-w-xs lg:max-w-md ${msg.sender_type === userType ? "items-end" : "items-start"}`}>
                  <div
                    className={`rounded-lg px-4 py-2.5 break-words ${
                      msg.sender_type === userType
                        ? "bg-gradient-to-r from-orange-500 to-red-500 text-white"
                        : "bg-gray-200 text-gray-900"
                    }`}
                  >
                    <p className="text-sm">{msg.message}</p>
                    <p className={`text-xs mt-1 ${msg.sender_type === userType ? "text-orange-100" : "text-gray-600"}`}>
                      {format(new Date(msg.created_date), "HH:mm")}
                    </p>
                  </div>

                  {msg.sender_type === userType && (
                    <div className="flex items-center gap-1 mt-1 text-gray-500">
                      {getReadStatus(msg)}
                      {msg.read_by?.length > 0 && (
                        <span className="text-xs text-blue-600">
                          {msg.read_by.length > 1 ? "Read" : "Delivered"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Template Panel */}
        {showTemplates && userType === "coach" && (
          <div className="border-t pt-3">
            <TemplateMessagePanel
              coachEmail={coachEmail}
              onSelectTemplate={handleUseTemplate}
              clientName={clientName}
            />
          </div>
        )}

        {/* Message Input */}
        <div className="space-y-3 border-t pt-4">
          <div className="flex gap-2">
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Type your message..."
              className="flex-1"
              disabled={sendMutation.isPending}
            />
            {userType === "coach" && (
              <Button
                size="icon"
                variant="outline"
                onClick={() => setShowTemplates(!showTemplates)}
                className="border-orange-300 text-orange-600 hover:bg-orange-50"
              >
                📋
              </Button>
            )}
            <Button
              onClick={handleSendMessage}
              disabled={sendMutation.isPending || !messageText.trim()}
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white"
            >
              {sendMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500">Messages are sent and received in real-time</p>
        </div>
      </CardContent>
    </Card>
  );
}