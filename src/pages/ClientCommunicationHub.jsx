import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Search, Loader2, MessageSquare, Video, Users, TrendingUp, Calendar,
  AlertCircle, CheckCircle2, Phone
} from 'lucide-react';
import ClientProfileChat from '@/components/communication/ClientProfileChat';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

export default function ClientCommunicationHub() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [showVideoCall, setShowVideoCall] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch clients for this coach
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['coachClients', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      
      if (user.user_type === 'super_admin') {
        return await base44.entities.Client.list('-created_date', 100);
      }

      const allClients = await base44.entities.Client.list('-created_date', 100);
      return allClients.filter(client => {
        const coaches = Array.isArray(client.assigned_coach) 
          ? client.assigned_coach 
          : [client.assigned_coach];
        return client.created_by === user.email || coaches.includes(user.email);
      });
    },
    enabled: !!user?.email,
  });

  // Fetch unread messages count
  const { data: messageStats } = useQuery({
    queryKey: ['messageStats', user?.email],
    queryFn: async () => {
      const messages = await base44.entities.Message.list();
      const stats = {};
      clients.forEach(client => {
        const unread = messages.filter(m => 
          m.client_id === client.id && 
          !m.read && 
          m.sender_type !== 'dietitian'
        ).length;
        stats[client.id] = unread;
      });
      return stats;
    },
    enabled: !!user && clients.length > 0,
    refetchInterval: 5000,
  });

  const filteredClients = clients.filter(client =>
    client.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleVideoCall = () => {
    if (selectedClient) {
      navigate(createPageUrl('Communication'));
      // Focus on the selected client in communication page
      localStorage.setItem('focusClientId', selectedClient.id);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-blue-50 to-indigo-50 space-y-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <MessageSquare className="w-10 h-10 text-blue-600" />
            Communication Hub
          </h1>
          <p className="text-gray-600 text-lg">
            Direct messaging, file sharing, and video calls with your clients
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Clients List */}
          <div className="lg:col-span-1">
            <Card className="border-none shadow-lg sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  My Clients
                </CardTitle>
                <CardDescription>{clients.length} total</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  </div>
                ) : filteredClients.length === 0 ? (
                  <Alert className="bg-yellow-50 border-yellow-200">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800 ml-2">
                      No clients found
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredClients.map((client) => {
                      const unreadCount = messageStats?.[client.id] || 0;
                      const isSelected = selectedClient?.id === client.id;
                      
                      return (
                        <button
                          key={client.id}
                          onClick={() => setSelectedClient(client)}
                          className={`w-full p-3 rounded-lg text-left transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">
                                {client.full_name}
                              </p>
                              <p className={`text-xs truncate ${isSelected ? 'text-blue-100' : 'text-gray-600'}`}>
                                {client.email}
                              </p>
                            </div>
                            {unreadCount > 0 && (
                              <Badge className="bg-red-500 text-white text-xs flex-shrink-0">
                                {unreadCount}
                              </Badge>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            {selectedClient ? (
              <ClientProfileChat
                client={selectedClient}
                coachEmail={user?.email}
                isClient={false}
                onVideoCall={handleVideoCall}
                expanded={true}
              />
            ) : (
              <Card className="border-2 border-dashed border-gray-300 h-full flex items-center justify-center">
                <CardContent className="text-center p-12">
                  <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Select a Client
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Choose a client from the list to start messaging
                  </p>
                  <Button
                    onClick={() => navigate(createPageUrl('Communication'))}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Go to Full Communication Hub
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}