import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Users, AlertCircle, CheckCircle, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

export default function BroadcastMessagePanel() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedClients, setSelectedClients] = useState([]);
  const [sendingStatus, setSendingStatus] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['coachClients', user?.email, user?.user_type],
    queryFn: async () => {
      if (!user?.email) return [];
      
      // Get all clients
      const allClients = await base44.entities.Client.list();
      
      // Filter based on user type
      if (user?.user_type === 'super_admin') {
        return allClients;
      }
      
      if (user?.user_type === 'student_coach') {
        return allClients.filter(client => {
          const assignedCoaches = Array.isArray(client.assigned_coach) 
            ? client.assigned_coach 
            : client.assigned_coach 
              ? [client.assigned_coach] 
              : [];
          return client.created_by === user?.email || assignedCoaches.includes(user?.email);
        });
      }
      
      if (['team_member', 'student_team_member'].includes(user?.user_type)) {
        return allClients.filter(client => client.created_by === user?.email);
      }
      
      return [];
    },
    enabled: !!user?.email,
  });

  const sendBroadcastMutation = useMutation({
    mutationFn: async (data) => {
      const targetClients = data.clients.length === clients.length 
        ? clients 
        : clients.filter(c => data.clients.includes(c.id));

      setSendingStatus({ stage: 'sending', sent: 0, total: targetClients.length });
      
      const results = [];
      for (const client of targetClients) {
        try {
          // Create message
          const messageResult = await base44.entities.Message.create({
            client_id: client.id,
            sender_type: 'dietitian',
            sender_id: user?.email,
            sender_name: 'Coach',
            message: data.message,
            content_type: 'text',
            read: false,
            is_important: data.is_important || false
          });

          // Send push notification
          try {
            await base44.functions.invoke('sendPushNotification', {
              user_email: client.email,
              title: 'Message from Your Coach',
              body: data.message.substring(0, 100),
              action_url: '/ClientCommunication'
            });
          } catch (err) {
            console.log('Push notification failed for', client.email);
          }

          // Create notification
          await base44.entities.Notification.create({
            user_email: client.email,
            type: 'new_message',
            title: 'New Message from Coach',
            message: data.message.substring(0, 100),
            priority: data.is_important ? 'high' : 'normal',
            link: '/ClientCommunication',
            read: false
          }).catch(() => {});

          results.push({ client: client.email, success: true });
          setSendingStatus(prev => ({
            ...prev,
            sent: prev.sent + 1
          }));
        } catch (error) {
          results.push({ client: client.email, success: false, error: error.message });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      setSendingStatus({
        stage: 'complete',
        sent: results.filter(r => r.success).length,
        total: results.length,
        results
      });
      
      setTimeout(() => {
        queryClient.invalidateQueries(['coachClients']);
        setMessage("");
        setSelectedClients([]);
        setTimeout(() => {
          setSendingStatus(null);
          setShowDialog(false);
        }, 2000);
      }, 1000);
    },
    onError: (error) => {
      setSendingStatus({
        stage: 'error',
        error: error.message
      });
    }
  });

  const handleSend = () => {
    if (!message.trim()) {
      alert("Please enter a message");
      return;
    }

    if (selectedClients.length === 0) {
      alert("Please select at least one client");
      return;
    }

    sendBroadcastMutation.mutate({
      message,
      clients: selectedClients,
      is_important: false
    });
  };

  const toggleClientSelection = (clientId) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const toggleAllClients = () => {
    if (selectedClients.length === clients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(clients.map(c => c.id));
    }
  };

  const filteredClients = clients.filter(client =>
    client.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        className="bg-blue-600 hover:bg-blue-700"
      >
        <Send className="w-4 h-4 mr-2" />
        Send Broadcast Message
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Broadcast Message to Clients
            </DialogTitle>
          </DialogHeader>

          {sendingStatus ? (
            <div className="space-y-4">
              {sendingStatus.stage === 'sending' && (
                <Alert className="bg-blue-50 border-blue-300">
                  <AlertDescription className="text-blue-900">
                    Sending messages... {sendingStatus.sent}/{sendingStatus.total}
                  </AlertDescription>
                </Alert>
              )}

              {sendingStatus.stage === 'complete' && (
                <Alert className="bg-green-50 border-green-300">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-green-900 mt-2">
                    Successfully sent to {sendingStatus.sent}/{sendingStatus.total} clients
                  </AlertDescription>
                </Alert>
              )}

              {sendingStatus.stage === 'error' && (
                <Alert className="bg-red-50 border-red-300">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <AlertDescription className="text-red-900 mt-2">
                    Error: {sendingStatus.error}
                  </AlertDescription>
                </Alert>
              )}

              {sendingStatus.results && (
                <ScrollArea className="h-40 border rounded p-3">
                  {sendingStatus.results.map((result, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm mb-2">
                      {result.success ? (
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      )}
                      <span>{result.client}</span>
                    </div>
                  ))}
                </ScrollArea>
              )}

              <Button
                onClick={() => {
                  setSendingStatus(null);
                  setShowDialog(false);
                }}
                className="w-full"
              >
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="font-semibold">Select Clients ({selectedClients.length}/{clients.length})</Label>
                  {clients.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={toggleAllClients}
                    >
                      {selectedClients.length === clients.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  )}
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search clients by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 text-sm"
                  />
                </div>

                <ScrollArea className="h-48 border rounded p-3">
                  {clients.length === 0 ? (
                    <p className="text-sm text-gray-500">No clients assigned</p>
                  ) : filteredClients.length === 0 ? (
                    <p className="text-sm text-gray-500">No clients match your search</p>
                  ) : (
                    <div className="space-y-2">
                      {filteredClients.map((client) => (
                        <div key={client.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                          <Checkbox
                            checked={selectedClients.includes(client.id)}
                            onCheckedChange={() => toggleClientSelection(client.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{client.full_name}</p>
                            <p className="text-xs text-gray-500 truncate">{client.email}</p>
                          </div>
                          {client.status === 'active' && (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              <div className="space-y-2">
                <Label>Message *</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your broadcast message here..."
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">
                  {message.length} characters
                </p>
              </div>

              <Alert className="bg-blue-50 border-blue-300">
                <AlertDescription className="text-sm text-blue-900">
                  This message will be sent to all selected clients with push notifications and in-app alerts.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDialog(false);
                    setMessage("");
                    setSelectedClients([]);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={selectedClients.length === 0 || !message.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send to {selectedClients.length} Client{selectedClients.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}