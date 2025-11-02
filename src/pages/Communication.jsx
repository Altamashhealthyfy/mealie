
import React, { useState } from "react";
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
  Paperclip,
  Image as ImageIcon,
  CheckCheck,
  Clock
} from "lucide-react";
import { format } from "date-fns";

export default function Communication() {
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list('-created_date');
      
      // Super admin sees ALL clients
      if (user?.user_type === 'super_admin') {
        return allClients;
      }
      
      // Team members, student coaches - only see THEIR OWN clients
      return allClients.filter(client => client.created_by === user?.email);
    },
    enabled: !!user, // Ensure this query only runs once user data is available
    initialData: [],
  });

  const { data: allMessages } = useQuery({
    queryKey: ['allMessages'],
    queryFn: () => base44.entities.Message.list('-created_date'),
    initialData: [],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.Message.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['allMessages']);
      setMessageText("");
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Message.update(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['allMessages']);
    },
  });

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedClient) return;

    sendMessageMutation.mutate({
      client_id: selectedClient.id,
      sender_type: 'dietitian',
      message: messageText,
      read: false,
    });
  };

  // Get messages for selected client
  const clientMessages = selectedClient 
    ? allMessages.filter(m => m.client_id === selectedClient.id).sort((a, b) => 
        new Date(a.created_date) - new Date(b.created_date)
      )
    : [];

  // Mark unread messages as read when viewing
  React.useEffect(() => {
    if (selectedClient) {
      const unreadMessages = clientMessages.filter(
        m => !m.read && m.sender_type === 'client'
      );
      unreadMessages.forEach(msg => {
        markAsReadMutation.mutate(msg.id);
      });
    }
  }, [selectedClient?.id, clientMessages.length]);

  // Get last message for each client
  const getLastMessage = (clientId) => {
    const messages = allMessages.filter(m => m.client_id === clientId);
    // Sort in descending order to get the latest message
    messages.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    return messages.length > 0 ? messages[0] : null;
  };

  // Get unread count for each client
  const getUnreadCount = (clientId) => {
    return allMessages.filter(
      m => m.client_id === clientId && !m.read && m.sender_type === 'client'
    ).length;
  };

  // Filter clients by search
  const filteredClients = clients.filter(client =>
    client.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort clients by last message time
  const sortedClients = filteredClients.sort((a, b) => {
    const lastMsgA = getLastMessage(a.id);
    const lastMsgB = getLastMessage(b.id);
    if (!lastMsgA && !lastMsgB) return 0; // Both have no messages, keep original order
    if (!lastMsgA) return 1; // A has no messages, B does, so B comes first
    if (!lastMsgB) return -1; // B has no messages, A does, so A comes first
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
              <CardHeader className="border-b border-gray-200">
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

              <ScrollArea className="flex-1">
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
                          onClick={() => setSelectedClient(client)}
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

            {/* Chat Area */}
            <div className="col-span-12 md:col-span-8 flex flex-col">
              {selectedClient ? (
                <>
                  {/* Chat Header */}
                  <CardHeader className="border-b border-gray-200">
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

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-6">
                    <div className="space-y-4">
                      {clientMessages.length === 0 ? (
                        <div className="text-center py-12">
                          <MessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            No messages yet
                          </h3>
                          <p className="text-gray-600">
                            Start the conversation with {selectedClient.full_name}
                          </p>
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
                                className={`max-w-[70%] rounded-2xl p-4 ${
                                  isFromDietitian
                                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                                    : 'bg-gray-100 text-gray-900'
                                }`}
                              >
                                <p className="text-sm leading-relaxed">{message.message}</p>
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
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="w-20 h-20 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                      Select a client
                    </h3>
                    <p className="text-gray-600">
                      Choose a client from the list to start messaging
                    </p>
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
