import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, Users, UserCheck, Loader2, Bell } from "lucide-react";
import { toast } from "sonner";

export default function BroadcastNotification() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("announcement");
  const [priority, setPriority] = useState("normal");
  const [link, setLink] = useState("");
  const [targetAudience, setTargetAudience] = useState("all");
  const [selectedClients, setSelectedClients] = useState([]);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isDietitian = ['super_admin', 'team_member', 'student_coach', 'student_team_member'].includes(user?.user_type);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allClientUsers'],
    queryFn: async () => {
      if (user?.user_type !== 'super_admin') return [];
      const users = await base44.entities.User.list();
      return users.filter(u => u.user_type === 'client');
    },
    enabled: !!user && user?.user_type === 'super_admin',
    retry: 0,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['allClients'],
    queryFn: async () => {
      return await base44.entities.Client.list('-created_date', 200);
    },
    enabled: isDietitian,
  });

  const broadcastMutation = useMutation({
    mutationFn: async () => {
      let targetEmails = [];

      if (targetAudience === 'all') {
        // All registered client users
        targetEmails = allUsers.map(u => u.email);
      } else if (targetAudience === 'selected') {
        // Only selected clients
        targetEmails = selectedClients;
      } else if (targetAudience === 'active') {
        // Only active clients
        const activeClients = clients.filter(c => c.status === 'active');
        const activeEmails = activeClients.map(c => c.email).filter(Boolean);
        // Match with registered users
        targetEmails = allUsers.filter(u => activeEmails.includes(u.email)).map(u => u.email);
      }

      // Remove duplicates
      targetEmails = [...new Set(targetEmails)];

      // Create notifications for all target users
      const notifications = targetEmails.map(email => ({
        user_email: email,
        title,
        message,
        type,
        priority,
        link: link || null,
        read: false,
      }));

      await base44.entities.Notification.bulkCreate(notifications);
      return targetEmails.length;
    },
    onSuccess: (count) => {
      toast.success(`Notification sent to ${count} clients!`);
      setTitle("");
      setMessage("");
      setLink("");
      setSelectedClients([]);
      queryClient.invalidateQueries(['allNotifications']);
    },
    onError: () => {
      toast.error("Failed to send broadcast notification");
    },
  });

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedClients(allUsers.map(u => u.email));
    } else {
      setSelectedClients([]);
    }
  };

  const handleSelectClient = (email, checked) => {
    if (checked) {
      setSelectedClients([...selectedClients, email]);
    } else {
      setSelectedClients(selectedClients.filter(e => e !== email));
    }
  };

  const handleSend = () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Please fill in title and message");
      return;
    }

    if (targetAudience === 'selected' && selectedClients.length === 0) {
      toast.error("Please select at least one client");
      return;
    }

    if (window.confirm(`Send notification to ${
      targetAudience === 'all' ? 'all clients' : 
      targetAudience === 'selected' ? `${selectedClients.length} selected clients` :
      'all active clients'
    }?`)) {
      broadcastMutation.mutate();
    }
  };

  if (!isDietitian) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Only health coaches and team members can send broadcast notifications.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Broadcast Notification</h1>
          <p className="text-gray-600">Send notifications to your clients</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Clients</p>
                  <p className="text-3xl font-bold text-gray-900">{allUsers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Clients</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {clients.filter(c => c.status === 'active').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Selected</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {targetAudience === 'selected' ? selectedClients.length : 
                     targetAudience === 'all' ? allUsers.length :
                     clients.filter(c => c.status === 'active').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Broadcast Form */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Notification Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter notification title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  placeholder="Enter notification message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="announcement">📢 Announcement</SelectItem>
                      <SelectItem value="reminder">⏰ Reminder</SelectItem>
                      <SelectItem value="update">📰 Update</SelectItem>
                      <SelectItem value="alert">⚠️ Alert</SelectItem>
                      <SelectItem value="promotion">🎉 Promotion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="link">Link (Optional)</Label>
                <Input
                  id="link"
                  placeholder="e.g., /my-meal-plan"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                />
                <p className="text-xs text-gray-500">Page link to redirect users when they click the notification</p>
              </div>

              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select value={targetAudience} onValueChange={setTargetAudience}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    <SelectItem value="active">Active Clients Only</SelectItem>
                    <SelectItem value="selected">Selected Clients</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleSend}
                disabled={broadcastMutation.isPending}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600"
              >
                {broadcastMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Broadcast
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Client Selection */}
          {targetAudience === 'selected' && (
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Select Clients
                  </span>
                  <Badge>{selectedClients.length} selected</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 pb-3 border-b">
                    <Checkbox
                      id="select-all"
                      checked={selectedClients.length === allUsers.length && allUsers.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <Label htmlFor="select-all" className="font-semibold cursor-pointer">
                      Select All ({allUsers.length})
                    </Label>
                  </div>

                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {allUsers.map((user) => (
                      <div key={user.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                        <Checkbox
                          id={user.id}
                          checked={selectedClients.includes(user.email)}
                          onCheckedChange={(checked) => handleSelectClient(user.email, checked)}
                        />
                        <Label htmlFor={user.id} className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-sm">{user.full_name}</p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview */}
          {targetAudience !== 'selected' && (
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {type === 'announcement' ? '📢' : 
                       type === 'reminder' ? '⏰' :
                       type === 'update' ? '📰' :
                       type === 'alert' ? '⚠️' : '🎉'}
                    </span>
                    <h3 className="font-bold text-gray-900">
                      {title || "Notification Title"}
                    </h3>
                    {priority === 'high' && (
                      <Badge className="bg-red-500 text-white text-xs">High Priority</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">
                    {message || "Your notification message will appear here..."}
                  </p>
                  {link && (
                    <p className="text-xs text-blue-600">🔗 {link}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">Just now</p>
                </div>

                <div className="mt-6 space-y-3">
                  <h4 className="font-semibold text-sm text-gray-700">Will be sent to:</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span>
                      {targetAudience === 'all' ? 
                        `All ${allUsers.length} registered clients` :
                        `${clients.filter(c => c.status === 'active').length} active clients`}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}