
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Send,
  Search,
  CheckCheck,
  Clock,
  Loader2,
  ChevronDown,
  ArrowDown
} from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Communication() {
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = (e) => {
    const element = e.target;
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list('-created_date');
      
      if (user?.user_type === 'super_admin') {
        return allClients;
      }
      
      return allClients.filter(client => client.created_by === user?.email);
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: allMessages } = useQuery({
    queryKey: ['allMessages'],
    queryFn: () => base44.entities.Message.list('-created_date'),
    initialData: [],
    refetchInterval: 5000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      console.log("Sending message:", data);
      const result = await base44.entities.Message.create(data);
      console.log("Message sent successfully:", result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allMessages']);
      setMessageText("");
      setTimeout(() => scrollToBottom("smooth"), 100);
      setTimeout(() => textareaRef.current?.focus(), 150);
      alert("✅ Message sent successfully!");
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
      alert("❌ Failed to send message. Please try again.");
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Message.update(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['allMessages']);
    },
  });

  const handleSendMessage = async () => {
    console.log("handleSendMessage called");
    console.log("messageText:", messageText);
    console.log("selectedClient:", selectedClient);

    if (!selectedClient) {
      alert("⚠️ Please select a client first!");
      return;
    }

    if (!messageText.trim()) {
      alert("⚠️ Please enter a message!");
      return;
    }

    const messageData = {
      client_id: selectedClient.id,
      sender_type: 'dietitian',
      message: messageText.trim(),
      read: false,
    };

    console.log("Calling mutation with:", messageData);
    sendMessageMutation.mutate(messageData);
  };

  const clientMessages = selectedClient 
    ? allMessages.filter(m => m.client_id === selectedClient.id).sort((a, b) => 
        new Date(a.created_date) - new Date(b.created_date)
      )
    : [];

  useEffect(() => {
    if (selectedClient) {
      const unreadMessages = clientMessages.filter(
        m => !m.read && m.sender_type === 'client'
      );
      unreadMessages.forEach(msg => {
        markAsReadMutation.mutate(msg.id);
      });
    }
  }, [selectedClient?.id, clientMessages.length]);

  useEffect(() => {
    scrollToBottom("auto");
    setShowScrollButton(false);
  }, [clientMessages.length, selectedClient?.id]);

  const getLastMessage = (clientId) => {
    const messages = allMessages.filter(m => m.client_id === clientId);
    messages.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    return messages.length > 0 ? messages[0] : null;
  };

  const getUnreadCount = (clientId) => {
    return allMessages.filter(
      m => m.client_id === clientId && !m.read && m.sender_type === 'client'
    ).length;
  };

  const filteredClients = clients.filter(client =>
    client.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedClients = filteredClients.sort((a, b) => {
    const lastMsgA = getLastMessage(a.id);
    const lastMsgB = getLastMessage(b.id);
    if (!lastMsgA && !lastMsgB) return 0;
    if (!lastMsgA) return 1;
    if (!lastMsgB) return -1;
    return new Date(lastMsgB.created_date) - new Date(lastMsgA.created_date);
  });

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Messages</h1>
          <p className="text-gray-600">Communicate with your clients</p>
        </div>

        <Card className="border-none shadow-xl overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
          <div className="grid grid-cols-12 h-full">
            {/* Client List Sidebar */}
            <div className="col-span-12 md:col-span-4 border-r border-gray-200 flex flex-col">
              <CardHeader className="border-b border-gray-200 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>

              <div className="flex-1 overflow-hidden relative">
                <ScrollArea className="h-full" style={{ height: 'calc(100vh - 330px)' }}>
                  <div className="p-2">
                    {sortedClients.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-600">No clients found</p>
                      </div>
                    ) : (
                      sortedClients.map((client) => {
                        const lastMessage = getLastMessage(client.id);
                        const unreadCount = getUnreadCount(client.id);
                        const isSelected = selectedClient?.id === client.id;

                        return (
                          <div
                            key={client.id}
                            onClick={() => {
                              console.log("Selected client:", client);
                              setSelectedClient(client);
                            }}
                            className={`p-4 mb-2 rounded-xl cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                                : 'bg-gray-50 hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                                isSelected
                                  ? 'bg-white/20'
                                  : 'bg-gradient-to-br from-orange-500 to-red-500'
                              }`}>
                                <span className={`font-medium ${isSelected ? 'text-white' : 'text-white'}`}>
                                  {client.full_name.charAt(0)}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h3 className={`font-semibold truncate ${
                                    isSelected ? 'text-white' : 'text-gray-900'
                                  }`}>
                                    {client.full_name}
                                  </h3>
                                  {unreadCount > 0 && (
                                    <Badge className="bg-red-500 text-white ml-2">
                                      {unreadCount}
                                    </Badge>
                                  )}
                                </div>
                                {lastMessage && (
                                  <p className={`text-sm truncate ${
                                    isSelected ? 'text-white/80' : 'text-gray-600'
                                  }`}>
                                    {lastMessage.sender_type === 'dietitian' ? 'You: ' : ''}
                                    {lastMessage.message}
                                  </p>
                                )}
                                {lastMessage && (
                                  <p className={`text-xs mt-1 ${
                                    isSelected ? 'text-white/60' : 'text-gray-500'
                                  }`}>
                                    {format(new Date(lastMessage.created_date), 'MMM d, h:mm a')}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Chat Area */}
            <div className="col-span-12 md:col-span-8 flex flex-col">
              {selectedClient ? (
                <>
                  {/* Chat Header */}
                  <CardHeader className="border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">
                          {selectedClient.full_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <CardTitle className="text-xl">{selectedClient.full_name}</CardTitle>
                        <p className="text-sm text-gray-600">{selectedClient.email}</p>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Messages - With Full Scroll Control */}
                  <div className="flex-1 overflow-hidden relative">
                    <ScrollArea 
                      className="h-full" 
                      style={{ height: 'calc(100vh - 480px)' }}
                      onScrollCapture={handleScroll}
                    >
                      <div className="p-6 space-y-4">
                        {clientMessages.length === 0 ? (
                          <div className="text-center py-12">
                            <MessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                              No messages yet
                            </h3>
                            <p className="text-gray-600 mb-4">
                              Start the conversation with {selectedClient.full_name}
                            </p>
                            <Alert className="max-w-md mx-auto bg-blue-50 border-blue-300">
                              <AlertDescription className="text-sm text-blue-900">
                                👇 Use the message box below to send your first message!
                              </AlertDescription>
                            </Alert>
                          </div>
                        ) : (
                          clientMessages.map((message) => {
                            const isFromDietitian = message.sender_type === 'dietitian';

                            return (
                              <div
                                key={message.id}
                                className={`flex ${isFromDietitian ? 'justify-end' : 'justify-start'}`}
                              >
                                <div
                                  className={`max-w-[70%] rounded-2xl p-4 shadow-md ${
                                    isFromDietitian
                                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                                      : 'bg-gray-100 text-gray-900'
                                  }`}
                                >
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>
                                  <div className={`flex items-center gap-2 mt-2 text-xs ${
                                    isFromDietitian ? 'text-white/70' : 'text-gray-500'
                                  }`}>
                                    <span>{format(new Date(message.created_date), 'h:mm a')}</span>
                                    {isFromDietitian && (
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

                    {/* Scroll to Bottom Button */}
                    {showScrollButton && (
                      <Button
                        onClick={() => scrollToBottom("smooth")}
                        className="absolute bottom-4 right-4 rounded-full w-12 h-12 bg-orange-500 hover:bg-orange-600 shadow-xl z-10 flex items-center justify-center"
                        size="icon"
                      >
                        <ArrowDown className="w-6 h-6 text-white animate-bounce" />
                      </Button>
                    )}
                  </div>

                  {/* ✅ COMPACT Send Message Box */}
                  <div className="p-4 border-t-2 border-orange-500 bg-white flex-shrink-0">
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <Textarea
                          ref={textareaRef}
                          placeholder="Type your message..."
                          value={messageText}
                          onChange={(e) => {
                            console.log("Message text changed:", e.target.value);
                            setMessageText(e.target.value);
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              console.log("Enter pressed - sending message");
                              handleSendMessage();
                            }
                          }}
                          className="resize-none min-h-[60px] text-sm border-2 border-orange-300 focus:border-orange-500"
                          rows={2}
                          autoFocus
                        />
                      </div>
                      <Button
                        onClick={() => {
                          console.log("Send button clicked");
                          handleSendMessage();
                        }}
                        disabled={sendMessageMutation.isPending}
                        className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 h-[60px] px-6 font-semibold shadow-lg"
                      >
                        {sendMessageMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Send
                          </>
                        )}
                      </Button>
                    </div>
                    
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs font-mono">Enter</kbd> to send • 
                      <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs font-mono ml-1">Shift+Enter</kbd> for new line
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="w-20 h-20 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                      Select a client to start messaging
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Choose a client from the list on the left
                    </p>
                    <Alert className="max-w-md mx-auto bg-blue-50 border-blue-300">
                      <AlertDescription className="text-sm text-blue-900">
                        👈 Click on any client name to open the chat and send messages
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
