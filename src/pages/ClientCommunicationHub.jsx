import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, 
  Mail, 
  FileText, 
  Send, 
  Search, 
  Filter, 
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Download,
  Eye,
  Paperclip,
  Users
} from "lucide-react";
import { format } from "date-fns";

export default function ClientCommunicationHub() {
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [composingMessage, setComposingMessage] = useState(false);
  
  const [newMessage, setNewMessage] = useState({
    type: "message",
    subject: "",
    content: "",
    is_important: false
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['allClients'],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list('-created_date', 500);
      return allClients;
    },
    initialData: [],
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['clientMessages', selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      const msgs = await base44.entities.Message.filter({ 
        client_id: selectedClient.id 
      });
      return msgs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!selectedClient?.id,
    initialData: [],
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['clientAppointments', selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      const appts = await base44.entities.Appointment.filter({ 
        client_id: selectedClient.id 
      });
      return appts.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!selectedClient?.id,
    initialData: [],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Message.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clientMessages']);
      setShowComposeDialog(false);
      setNewMessage({ type: "message", subject: "", content: "", is_important: false });
      alert("✅ Message sent successfully!");
    },
    onError: () => {
      alert("❌ Failed to send message. Please try again.");
    }
  });

  const filteredClients = clients.filter(client => {
    const query = searchQuery.toLowerCase();
    return (
      client.full_name?.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.phone?.toLowerCase().includes(query)
    );
  });

  const filteredCommunications = messages.filter(msg => {
    const matchesType = typeFilter === "all" || msg.sender_type === typeFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "read" && msg.read) ||
      (statusFilter === "unread" && !msg.read) ||
      (statusFilter === "important" && msg.is_important);
    
    let matchesDate = true;
    if (dateFilter !== "all") {
      const msgDate = new Date(msg.created_date);
      const now = new Date();
      if (dateFilter === "today") {
        matchesDate = msgDate.toDateString() === now.toDateString();
      } else if (dateFilter === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = msgDate >= weekAgo;
      } else if (dateFilter === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = msgDate >= monthAgo;
      }
    }
    
    return matchesType && matchesStatus && matchesDate;
  });

  const handleSendMessage = async () => {
    if (!selectedClient || !newMessage.content.trim()) {
      alert("Please select a client and enter a message");
      return;
    }

    setComposingMessage(true);
    try {
      await sendMessageMutation.mutateAsync({
        client_id: selectedClient.id,
        sender_type: 'dietitian',
        sender_id: user?.id,
        sender_name: user?.full_name,
        message: newMessage.content,
        is_important: newMessage.is_important,
        read: false
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
    setComposingMessage(false);
  };

  const getMessageIcon = (msg) => {
    if (msg.attachment_url) return <Paperclip className="w-4 h-4" />;
    if (msg.is_important) return <AlertCircle className="w-4 h-4" />;
    return <MessageSquare className="w-4 h-4" />;
  };

  const getCommunicationStats = () => {
    const total = messages.length;
    const unread = messages.filter(m => !m.read && m.sender_type === 'client').length;
    const important = messages.filter(m => m.is_important).length;
    const fromClient = messages.filter(m => m.sender_type === 'client').length;
    const fromDietitian = messages.filter(m => m.sender_type === 'dietitian').length;
    
    return { total, unread, important, fromClient, fromDietitian };
  };

  if (!selectedClient) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Client Communication Hub</h1>
            <p className="text-gray-600">Centralized communication logs and messaging for all clients</p>
          </div>

          <Card className="border-none shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-6 h-6" />
                Select a Client
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Search clients by name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <ScrollArea className="h-[600px]">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredClients.length === 0 ? (
                      <div className="col-span-full text-center py-12">
                        <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">No clients found</p>
                      </div>
                    ) : (
                      filteredClients.map(client => (
                        <Card 
                          key={client.id}
                          className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-500"
                          onClick={() => setSelectedClient(client)}
                        >
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <h3 className="font-semibold text-lg">{client.full_name}</h3>
                              <p className="text-sm text-gray-600">{client.email}</p>
                              {client.phone && (
                                <p className="text-sm text-gray-500">📞 {client.phone}</p>
                              )}
                              <div className="flex flex-wrap gap-2 pt-2">
                                <Badge variant="outline">{client.goal || 'No goal'}</Badge>
                                <Badge className="bg-blue-100 text-blue-700">
                                  {client.status || 'active'}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const stats = getCommunicationStats();

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedClient(null)}
              >
                ← Back to Clients
              </Button>
            </div>
            <h1 className="text-4xl font-bold text-gray-900">
              {selectedClient.full_name}
            </h1>
            <p className="text-gray-600">{selectedClient.email}</p>
          </div>
          <Button
            onClick={() => setShowComposeDialog(true)}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Message
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <MessageSquare className="w-8 h-8 mx-auto text-blue-600 mb-2" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-600">Total Messages</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <AlertCircle className="w-8 h-8 mx-auto text-orange-600 mb-2" />
              <p className="text-2xl font-bold">{stats.unread}</p>
              <p className="text-sm text-gray-600">Unread</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <AlertCircle className="w-8 h-8 mx-auto text-red-600 mb-2" />
              <p className="text-2xl font-bold">{stats.important}</p>
              <p className="text-sm text-gray-600">Important</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 mx-auto text-purple-600 mb-2" />
              <p className="text-2xl font-bold">{stats.fromClient}</p>
              <p className="text-sm text-gray-600">From Client</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <MessageSquare className="w-8 h-8 mx-auto text-green-600 mb-2" />
              <p className="text-2xl font-bold">{stats.fromDietitian}</p>
              <p className="text-sm text-gray-600">From You</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <span className="font-semibold text-gray-700">Filters:</span>
              </div>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="client">From Client</SelectItem>
                  <SelectItem value="dietitian">From Dietitian</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="important">Important</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>

              <Badge variant="outline" className="ml-auto">
                {filteredCommunications.length} of {messages.length} messages
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Communications Timeline */}
        <Tabs defaultValue="messages" className="space-y-4">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="messages">
              <MessageSquare className="w-4 h-4 mr-2" />
              Messages ({messages.length})
            </TabsTrigger>
            <TabsTrigger value="appointments">
              <Calendar className="w-4 h-4 mr-2" />
              Appointments ({appointments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="messages" className="space-y-4">
            {filteredCommunications.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <MessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No messages found</h3>
                  <p className="text-gray-600">Try adjusting your filters or send a new message</p>
                </CardContent>
              </Card>
            ) : (
              filteredCommunications.map(msg => (
                <Card 
                  key={msg.id}
                  className={`border-l-4 ${
                    msg.is_important ? 'border-l-red-500 bg-red-50' :
                    msg.sender_type === 'client' ? 'border-l-blue-500' : 'border-l-green-500'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getMessageIcon(msg)}
                          <span className="font-semibold text-gray-900">
                            {msg.sender_type === 'client' ? selectedClient.full_name : msg.sender_name || 'Dietitian'}
                          </span>
                          <Badge className={
                            msg.sender_type === 'client' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                          }>
                            {msg.sender_type === 'client' ? 'From Client' : 'From Dietitian'}
                          </Badge>
                          {msg.is_important && (
                            <Badge className="bg-red-100 text-red-700">Important</Badge>
                          )}
                          {msg.read ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-orange-600" />
                          )}
                        </div>
                        
                        <p className="text-gray-700 whitespace-pre-wrap mb-2">{msg.message}</p>
                        
                        {msg.attachment_url && (
                          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded mt-2">
                            <Paperclip className="w-4 h-4 text-gray-600" />
                            <span className="text-sm text-gray-700">{msg.attachment_name || 'Attachment'}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(msg.attachment_url, '_blank')}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {format(new Date(msg.created_date), 'MMM d, yyyy')}
                        </div>
                        <div>{format(new Date(msg.created_date), 'h:mm a')}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="appointments" className="space-y-4">
            {appointments.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No appointments</h3>
                  <p className="text-gray-600">No appointments scheduled with this client</p>
                </CardContent>
              </Card>
            ) : (
              appointments.map(appt => (
                <Card key={appt.id} className="border-l-4 border-l-purple-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-5 h-5 text-purple-600" />
                          <span className="font-semibold text-lg">{appt.title || 'Appointment'}</span>
                          <Badge className={
                            appt.status === 'completed' ? 'bg-green-100 text-green-700' :
                            appt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }>
                            {appt.status}
                          </Badge>
                        </div>
                        {appt.notes && (
                          <p className="text-gray-700 mb-2">{appt.notes}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>📅 {format(new Date(appt.date), 'MMM d, yyyy')}</span>
                          <span>🕐 {appt.time}</span>
                          <span>⏱️ {appt.duration} min</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Compose Message Dialog */}
        <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-green-600" />
                New Message to {selectedClient?.full_name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={newMessage.content}
                  onChange={(e) => setNewMessage({...newMessage, content: e.target.value})}
                  placeholder="Type your message here..."
                  rows={8}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="important"
                  checked={newMessage.is_important}
                  onChange={(e) => setNewMessage({...newMessage, is_important: e.target.checked})}
                  className="w-4 h-4"
                />
                <Label htmlFor="important" className="cursor-pointer">
                  Mark as important
                </Label>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowComposeDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={composingMessage || !newMessage.content.trim()}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
                >
                  {composingMessage ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}