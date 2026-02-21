import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, MessageSquare, UserCheck } from "lucide-react";
import EnhancedChatUI from "@/components/communication/EnhancedChatUI";

export default function DirectChat() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatList, setChatList] = useState([]);

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

  // For coaches: fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ["clientsList", currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      try {
        const allClients = await base44.entities.Client.filter({
          assigned_to: currentUser.email,
          status: "active"
        });
        return allClients;
      } catch {
        return [];
      }
    },
    enabled: !!currentUser?.email && currentUser?.user_type !== "client"
  });

  // For clients: fetch assigned coach
  const { data: coachProfile } = useQuery({
    queryKey: ["coachProfile", currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      try {
        const profiles = await base44.entities.CoachProfile.filter({
          created_by: currentUser.email
        });
        return profiles[0] || null;
      } catch {
        return null;
      }
    },
    enabled: !!currentUser?.email && currentUser?.user_type === "client"
  });

  // Fetch messages for each client
  const { data: allMessages = [] } = useQuery({
    queryKey: ["allChatMessages", currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      try {
        const messages = await base44.entities.Message.list();
        return messages.filter(m => 
          m.sender_id === currentUser.email || 
          m.client_id === currentUser.email
        );
      } catch {
        return [];
      }
    },
    refetchInterval: 3000
  });

  // Build chat list based on user type
  useEffect(() => {
    if (currentUser?.user_type !== "client" && clients.length > 0) {
      // Coach view: list of clients
      const chats = clients.map(client => {
        const clientMessages = allMessages.filter(m => m.client_id === client.id);
        const unreadCount = clientMessages.filter(m => !m.read && m.sender_type !== "dietitian").length;
        const lastMessage = clientMessages[clientMessages.length - 1];

        return {
          id: client.id,
          name: client.full_name,
          email: client.email,
          avatar: client.profile_photo_url,
          lastMessage: lastMessage?.message || "No messages yet",
          lastMessageTime: lastMessage?.created_date,
          unreadCount,
          type: "client"
        };
      });
      setChatList(chats);
    } else if (currentUser?.user_type === "client" && coachProfile) {
      // Client view: coach
      const coachMessages = allMessages.filter(m => 
        (m.sender_id === coachProfile.created_by || m.client_id === currentUser.email)
      );
      const unreadCount = coachMessages.filter(m => !m.read && m.sender_type !== "client").length;
      const lastMessage = coachMessages[coachMessages.length - 1];

      setChatList([{
        id: coachProfile.id,
        name: coachProfile.business_name,
        email: coachProfile.created_by,
        avatar: coachProfile.logo_url,
        lastMessage: lastMessage?.message || "No messages yet",
        lastMessageTime: lastMessage?.created_date,
        unreadCount,
        type: "coach"
      }]);
    }
  }, [clients, coachProfile, allMessages, currentUser]);

  const filteredChats = chatList.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!currentUser) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (selectedChat) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
        <Button
          variant="outline"
          onClick={() => setSelectedChat(null)}
          className="mb-4 w-fit"
        >
          ← Back to Chats
        </Button>
        <div className="flex-1">
          <EnhancedChatUI
            clientId={selectedChat.id}
            clientName={selectedChat.name}
            coachEmail={currentUser.email}
            userType={currentUser.user_type === "client" ? "client" : "coach"}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">💬 Direct Messages</h1>
          <p className="text-gray-600">Real-time communication with read receipts and templates</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat List Sidebar */}
          <Card className="lg:col-span-1 border-none shadow-lg h-fit">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-t-lg border-b-0">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Conversations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {filteredChats.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <UserCheck className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No conversations yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredChats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => setSelectedChat(chat)}
                      className="w-full text-left p-3 rounded-lg hover:bg-orange-50 transition-colors border-2 border-transparent hover:border-orange-300"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{chat.name}</p>
                          <p className="text-xs text-gray-600 truncate mt-1">{chat.lastMessage}</p>
                        </div>
                        {chat.unreadCount > 0 && (
                          <Badge className="bg-red-500 text-white flex-shrink-0">
                            {chat.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Empty State */}
          <Card className="lg:col-span-2 border-none shadow-lg flex items-center justify-center min-h-96 bg-gradient-to-br from-blue-50 to-purple-50">
            <CardContent className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Select a conversation</h3>
              <p className="text-gray-500 max-w-sm">Choose from your conversations on the left to start chatting. Messages are encrypted and delivered in real-time.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}