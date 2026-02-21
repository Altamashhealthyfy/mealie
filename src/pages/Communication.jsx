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
  Check,
  Clock,
  Loader2,
  ArrowDown,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Video,
  File,
  Download,
  Users,
  Star,
  Phone,
  CalendarClock,
  History
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import GroupMessaging from "@/components/communication/GroupMessaging";
import ScheduleMessageDialog from "@/components/communication/ScheduleMessageDialog";
import FileVersionHistory from "@/components/communication/FileVersionHistory";
import ReadReceiptIndicator from "@/components/communication/ReadReceiptIndicator";
import TypingIndicator from "@/components/communication/TypingIndicator";
import { useTypingIndicator } from "@/components/communication/useTypingIndicator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import ContentTypePicker from "@/components/communication/ContentTypePicker";
import PollCreator from "@/components/communication/PollCreator";
import PollDisplay from "@/components/communication/PollDisplay";
import VideoCallRoom from "@/components/communication/VideoCallRoom";
import VideoCallScheduler from "@/components/communication/VideoCallScheduler";
import VideoCallHistory from "@/components/communication/VideoCallHistory";
import { createSignalingChannel } from "@/components/communication/VideoCallSignaling";

export default function Communication() {
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [messageMode, setMessageMode] = useState('one-to-one'); // 'one-to-one' or 'group'
  const [isImportant, setIsImportant] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [contentType, setContentType] = useState('file');
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [activeVideoCall, setActiveVideoCall] = useState(null); // { clientId, clientName, channel }
  const [showScheduler, setShowScheduler] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const signalingRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { handleTyping, stopTyping } = useTypingIndicator(
    selectedClient?.id,
    null,
    user?.email,
    user?.full_name,
    'dietitian'
  );

  const formatToIST = (dateString) => {
    if (!dateString) return '';
    const utcString = dateString.includes('Z') ? dateString : dateString + 'Z';
    const date = new Date(utcString);
    if (isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const formatDateTimeIST = (dateString) => {
    if (!dateString) return '';
    const utcString = dateString.includes('Z') ? dateString : dateString + 'Z';
    const date = new Date(utcString);
    if (isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = (e) => {
    const element = e.target;
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  const { data: coaches } = useQuery({
    queryKey: ['coaches'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => ['super_admin', 'team_member', 'student_coach'].includes(u.user_type));
    },
    initialData: [],
  });

  const { data: clients } = useQuery({
    queryKey: ['clients', user?.email, user?.user_type],
    queryFn: async () => {
      // Don't load clients if user is a client themselves
      if (user?.user_type === 'client') {
        return [];
      }

      // Fetch all clients
      const allClients = await base44.entities.Client.list('-created_date', 100);

      // Super admin sees all clients
      if (user?.user_type === 'super_admin') {
        return allClients;
      }

      // Student coaches see clients they created OR clients assigned to them
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

      // Team members, student team members - only see clients they created
      if (['team_member', 'student_team_member'].includes(user?.user_type)) {
        return allClients.filter(client => client.created_by === user?.email);
      }
      
      return [];
    },
    enabled: !!user && user?.user_type !== 'client',
    initialData: [],
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: allMessages, isLoading: messagesLoading } = useQuery({
    queryKey: ['allMessages'],
    queryFn: () => base44.entities.Message.list('-created_date', 200),
    initialData: [],
    refetchInterval: 10000,
    staleTime: 5000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      const result = await base44.entities.Message.create(data);
      // Fire push notification (non-blocking)
      base44.functions.invoke('notifyNewMessage', {
        message_id: result.id,
        client_id: data.client_id || null,
        group_id: data.group_id || null,
        sender_type: 'dietitian',
        sender_name: user?.full_name || 'Your coach',
        message_preview: data.message?.slice(0, 80) || null,
      }).catch(() => {});
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allMessages']);
      setMessageText("");
      setAttachedFile(null);
      setIsImportant(false);
      setTimeout(() => scrollToBottom("smooth"), 100);
      setTimeout(() => textareaRef.current?.focus(), 150);
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message. Please try again.");
    }
  });

  const handleScheduledMessage = async (scheduledDateTime) => {
    if (!selectedClient && !selectedGroup) {
      toast({
        title: "Select recipient",
        description: "Choose a client or group first.",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    const messageData = {
      message: messageText.trim() || '(File attachment)',
      is_scheduled: true,
      scheduled_time: scheduledDateTime.toISOString(),
      is_important: isImportant,
      sender_type: 'dietitian',
    };

    if (selectedClient) messageData.client_id = selectedClient.id;
    if (selectedGroup) messageData.group_id = selectedGroup.id;

    if (attachedFile) {
      setUploading(true);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: attachedFile });
        messageData.attachment_url = file_url;
        messageData.attachment_name = attachedFile.name;
        messageData.attachment_type = attachedFile.type;
        messageData.attachment_size = attachedFile.size;
      } catch (error) {
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    sendMessageMutation.mutate(messageData);
    toast({
      title: "Message scheduled",
      description: `Message scheduled for ${scheduledDateTime.toLocaleString()}`,
      duration: 3000,
    });
  };

  const markAsReadMutation = useMutation({
    mutationFn: async (message) => {
      const updates = { read: true };
      
      // Add read receipt for important messages
      if (message.is_important) {
        const readBy = message.read_by || [];
        const alreadyRead = readBy.find(r => r.user_id === user?.email);
        
        if (!alreadyRead) {
          readBy.push({
            user_id: user?.email,
            read_at: new Date().toISOString()
          });
          updates.read_by = readBy;
        }
      }
      
      await base44.entities.Message.update(message.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allMessages']);
    },
  });

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1073741824) {
      toast({
        title: "File too large",
        description: "File size must be less than 1 GB",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setAttachedFile(file);
  };

  const handleContentTypeSelect = (type) => {
    setContentType(type);
    setAttachedFile(null);
    
    if (type === 'poll') {
      setShowPollCreator(true);
    } else if (fileInputRef.current) {
      // Set accept attribute based on content type
      const acceptTypes = {
        photo: 'image/*',
        video: 'video/*',
        audio: 'audio/*',
        file: '*/*'
      };
      fileInputRef.current.accept = acceptTypes[type] || '*/*';
      fileInputRef.current.click();
    }
  };

  const handlePollCreate = (pollData) => {
    setShowPollCreator(false);
    
    const messageData = {
      sender_type: 'dietitian',
      message: `📊 Poll: ${pollData.question}`,
      content_type: 'poll',
      poll_data: pollData,
      read: false,
      is_important: isImportant,
    };

    if (selectedClient) messageData.client_id = selectedClient.id;
    if (selectedGroup) messageData.group_id = selectedGroup.id;

    sendMessageMutation.mutate(messageData);
  };

  const removeAttachment = () => {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (type?.startsWith('video/')) return <Video className="w-4 h-4" />;
    if (type?.includes('pdf')) return <FileText className="w-4 h-4" />;
    if (type?.includes('word') || type?.includes('document')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(1) + ' GB';
  };

  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download file');
    }
  };

  const renderAttachment = (message, isFromDietitian) => {
    if (!message.attachment_url) return null;

    const isImage = message.attachment_type?.startsWith('image/');
    const isVideo = message.attachment_type?.startsWith('video/');

    if (isImage) {
      return (
        <div className="relative group">
          <a href={message.attachment_url} target="_blank" rel="noopener noreferrer">
            <img
              src={message.attachment_url}
              alt={message.attachment_name}
              className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              style={{ maxHeight: '300px' }}
            />
          </a>
          <button
            onClick={() => handleDownload(message.attachment_url, message.attachment_name)}
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      );
    }

    if (isVideo) {
      return (
        <div className="relative group">
          <video
            controls
            className="max-w-full rounded-lg"
            style={{ maxHeight: '300px' }}
          >
            <source src={message.attachment_url} type={message.attachment_type} />
            Your browser does not support the video tag.
          </video>
          <button
            onClick={() => handleDownload(message.attachment_url, message.attachment_name)}
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={() => handleDownload(message.attachment_url, message.attachment_name)}
        className={`flex items-center gap-2 p-3 rounded-lg border transition-colors w-full text-left ${
          isFromDietitian
            ? 'bg-white/10 border-white/20 hover:bg-white/20'
            : 'bg-white border-gray-200 hover:bg-gray-50'
        }`}
      >
        {getFileIcon(message.attachment_type)}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {message.attachment_name || 'Attachment'}
          </p>
          {message.attachment_size && (
            <p className={`text-xs ${isFromDietitian ? 'text-white/70' : 'text-gray-500'}`}>
              {formatFileSize(message.attachment_size)}
            </p>
          )}
        </div>
        <Download className="w-4 h-4 flex-shrink-0" />
      </button>
    );
  };

  const handleSendMessage = async () => {
    if (!selectedClient && !selectedGroup) {
      toast({
        title: "No recipient selected",
        description: "Please select a client or group first.",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    if (!messageText.trim() && !attachedFile) {
      toast({
        title: "Empty message",
        description: "Please enter a message or attach a file.",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    let messageData = {
      sender_type: 'dietitian',
      message: messageText.trim() || '(File attachment)',
      read: false,
      is_important: isImportant,
      content_type: attachedFile ? contentType : 'text',
    };

    if (selectedClient) messageData.client_id = selectedClient.id;
    if (selectedGroup) messageData.group_id = selectedGroup.id;

    if (attachedFile) {
      setUploading(true);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: attachedFile });
        messageData.attachment_url = file_url;
        messageData.attachment_name = attachedFile.name;
        messageData.attachment_type = attachedFile.type;
        messageData.attachment_size = attachedFile.size;
      } catch (error) {
        console.error("File upload failed:", error);
        toast({
          title: "File upload failed",
          description: "Please try again.",
          variant: "destructive",
          duration: 3000,
        });
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    sendMessageMutation.mutate(messageData);
  };

  const clientMessages = selectedClient 
    ? allMessages.filter(m => m.client_id === selectedClient.id && m.content_type !== 'video_signal').sort((a, b) => 
        new Date(a.created_date) - new Date(b.created_date)
      )
    : [];

  const startVideoCall = (client) => {
    const channel = createSignalingChannel({
      clientId: client.id,
      senderType: 'dietitian',
      senderEmail: user?.email,
    });
    channel.start();
    signalingRef.current = channel;
    setActiveVideoCall({ clientId: client.id, clientName: client.full_name, channel });
  };

  const endVideoCall = () => {
    signalingRef.current?.stop();
    signalingRef.current = null;
    setActiveVideoCall(null);
  };

  // Auto-select client from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('client');
    if (clientId && clients.length > 0) {
      const client = clients.find(c => c.id === clientId);
      if (client) {
        setSelectedClient(client);
      }
    }
  }, [clients]);

  useEffect(() => {
    if (selectedClient) {
      const unreadMessages = clientMessages.filter(
        m => !m.read && m.sender_type === 'client'
      );
      unreadMessages.forEach(msg => {
        markAsReadMutation.mutate(msg);
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

  // Filter clients by search query only (no message-based filtering)
  const filteredClients = clients.filter(client =>
    client.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort clients by last message, but show all clients (even without messages)
  const sortedClients = filteredClients.sort((a, b) => {
    const lastMsgA = getLastMessage(a.id);
    const lastMsgB = getLastMessage(b.id);
    
    // Both have no messages - sort alphabetically by name
    if (!lastMsgA && !lastMsgB) {
      return a.full_name.localeCompare(b.full_name);
    }
    // Only A has no message - push to bottom
    if (!lastMsgA) return 1;
    // Only B has no message - push to bottom
    if (!lastMsgB) return -1;
    // Both have messages - sort by most recent
    return new Date(lastMsgB.created_date) - new Date(lastMsgA.created_date);
  });

  // Redirect clients to their own communication page
  if (user?.user_type === 'client') {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl">
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              This page is for health coaches and team members only. Please use the "Messages" page from your client menu to communicate with your coach.
            </p>
            <Button 
              onClick={() => window.location.href = '/ClientCommunication'}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500"
            >
              Go to My Messages
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-8">
      {activeVideoCall && (
        <VideoCallRoom
          roomId={activeVideoCall.clientId}
          localName={user?.full_name || 'Coach'}
          remoteName={activeVideoCall.clientName}
          isInitiator={true}
          signalingChannel={activeVideoCall.channel}
          onEnd={endVideoCall}
        />
      )}
      
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 md:mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1 md:mb-2">Messages</h1>
            <p className="text-sm md:text-base text-gray-600">Communicate with your clients</p>
          </div>
          
        </div>

        <Card className="border-none shadow-xl overflow-hidden" style={{ height: 'calc(100vh - 160px)' }}>
          <Tabs defaultValue="direct" className="h-full flex flex-col">
            <TabsList className="rounded-none border-b w-full grid grid-cols-2 flex-shrink-0 mb-4">
              <TabsTrigger value="direct" className="flex gap-2">
                <MessageSquare className="w-4 h-4" />
                Direct Messages
              </TabsTrigger>
              <TabsTrigger value="groups" className="flex gap-2">
                <Users className="w-4 h-4" />
                Groups
              </TabsTrigger>
            </TabsList>

            <TabsContent value="direct" className="flex-1 mt-0 overflow-hidden">
              <div className="flex flex-col md:grid md:grid-cols-12 h-full">
                {/* Client List Sidebar */}
                <div className="flex md:col-span-4 border-r border-gray-200 flex-col h-full md:h-auto overflow-hidden">
              <CardHeader className="border-b border-gray-200 flex-shrink-0" id="message-clients-list">
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
                    {messagesLoading ? (
                      <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 mx-auto text-orange-500 animate-spin mb-3" />
                        <p className="text-gray-600">Loading messages...</p>
                      </div>
                    ) : sortedClients.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-600">{searchQuery ? 'No clients found' : 'No clients yet'}</p>
                        {!searchQuery && (
                          <p className="text-sm text-gray-500 mt-2">Add clients to start messaging</p>
                        )}
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
                                    {lastMessage.attachment_url ? '📎 ' + (lastMessage.attachment_name || 'Attachment') : 
                                      (() => {
                                        try {
                                          const parsed = JSON.parse(lastMessage.message);
                                          if (parsed?.type === 'end-call' || parsed?.type === 'offer' || parsed?.type === 'answer' || parsed?.type === 'ice-candidate') {
                                            return '📹 Video call';
                                          }
                                        } catch {}
                                        return lastMessage.message;
                                      })()
                                    }
                                  </p>
                                )}
                                {lastMessage && (
                                  <p className={`text-xs mt-1 ${
                                    isSelected ? 'text-white/60' : 'text-gray-500'
                                  }`}>
                                    {formatDateTimeIST(lastMessage.created_date)}
                                  </p>
                                )}
                                {client.assigned_coach && (
                                  <p className={`text-xs mt-1 ${
                                    isSelected ? 'text-white/80' : 'text-green-600'
                                  }`}>
                                    🎓 Coach: {coaches.find(c => c.email === client.assigned_coach)?.full_name || client.assigned_coach}
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
                <div className="flex md:col-span-8 flex-col h-full md:h-auto overflow-hidden">
              {selectedClient ? (
                <>
                  {/* Chat Header */}
                  <CardHeader className="border-b border-gray-200 flex-shrink-0 p-3 md:p-6" id="message-chat-area">
                    <div className="flex items-center gap-2 md:gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedClient(null)}
                        className="md:hidden mr-1"
                      >
                        ← Back
                      </Button>
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-medium text-sm md:text-base">
                          {selectedClient.full_name.charAt(0)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base md:text-xl truncate">{selectedClient.full_name}</CardTitle>
                        <p className="text-xs md:text-sm text-gray-600 truncate">{selectedClient.email}</p>
                        {selectedClient.assigned_coach && (
                          <p className="text-sm text-green-600 font-medium mt-1">
                            🎓 Coach: {coaches.find(c => c.email === selectedClient.assigned_coach)?.full_name || selectedClient.assigned_coach}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Video call actions */}
                    <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setShowCallHistory(!showCallHistory); }}
                        className="hidden sm:flex items-center gap-1 border-purple-300 text-purple-700 hover:bg-purple-50"
                      >
                        <History className="w-4 h-4" />
                        <span className="hidden md:inline">History</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowScheduler(true)}
                        className="hidden sm:flex items-center gap-1 border-orange-300 text-orange-700 hover:bg-orange-50"
                      >
                        <CalendarClock className="w-4 h-4" />
                        <span className="hidden md:inline">Schedule</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => startVideoCall(selectedClient)}
                        className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1"
                      >
                        <Phone className="w-4 h-4" />
                        <span className="hidden sm:inline">Video Call</span>
                      </Button>
                    </div>
                  </CardHeader>

                  {/* Call history panel */}
                  {showCallHistory && (
                    <div className="border-b border-gray-200 bg-purple-50 p-4 max-h-64 overflow-y-auto flex-shrink-0">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-purple-800 text-sm">Call History</h4>
                        <Button variant="ghost" size="sm" onClick={() => setShowCallHistory(false)} className="h-6 w-6 p-0">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <VideoCallHistory clientId={selectedClient.id} />
                    </div>
                  )}

                  {/* Scheduler dialog */}
                  <VideoCallScheduler
                    clientId={selectedClient.id}
                    clientName={selectedClient.full_name}
                    coachEmail={user?.email}
                    open={showScheduler}
                    onOpenChange={setShowScheduler}
                  />

                  {/* Messages */}
                  <div className="flex-1 overflow-hidden relative">
                    <ScrollArea 
                      className="h-full" 
                      style={{ height: 'calc(100vh - 400px)' }}
                      onScrollCapture={handleScroll}
                    >
                      <div className="p-3 md:p-6 space-y-3 md:space-y-4">
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
                                  className={`max-w-[85%] sm:max-w-[75%] md:max-w-[70%] rounded-2xl p-3 md:p-4 shadow-md ${
                                    isFromDietitian
                                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                                      : 'bg-gray-100 text-gray-900'
                                  }`}
                                >
                                  {message.message && (
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap mb-2">{message.message}</p>
                                  )}
                                  
                                  {renderAttachment(message, isFromDietitian)}

                                  {message.content_type === 'poll' && (
                                   <PollDisplay message={message} currentUserId={user?.id} />
                                  )}

                                  <div className={`flex items-center gap-2 mt-2 text-xs ${
                                   isFromDietitian ? 'text-white/70' : 'text-gray-500'
                                  }`}>
                                    <span>{formatToIST(message.created_date)}</span>
                                    {isFromDietitian && (
                                      message.read ? (
                                        <CheckCheck className="w-4 h-4 text-blue-300" />
                                      ) : (
                                        <Check className="w-4 h-4 text-white/70" />
                                      )
                                    )}
                                  </div>
                                  <ReadReceiptIndicator
                                    isImportant={message.is_important}
                                    readBy={message.read_by}
                                    createdDate={message.created_date}
                                  />
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div ref={messagesEndRef} />
                        </div>
                        <TypingIndicator 
                        clientId={selectedClient?.id} 
                        groupId={null}
                        currentUserEmail={user?.email}
                        />
                        </ScrollArea>

                    {showScrollButton && (
                      <Button
                        onClick={() => scrollToBottom("smooth")}
                        className="absolute bottom-4 right-4 rounded-full w-12 h-12 bg-orange-500 hover:bg-orange-600 shadow-xl z-10"
                        size="icon"
                      >
                        <ArrowDown className="w-6 h-6 text-white animate-bounce" />
                      </Button>
                    )}
                  </div>

                  {/* Send Message Box */}
                  <div className="p-2 sm:p-3 md:p-4 border-t-2 border-orange-500 bg-white flex-shrink-0" id="message-send-box">
                    {attachedFile && (
                      <div className="mb-2 md:mb-3 p-2 md:p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2">
                          {getFileIcon(attachedFile.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {attachedFile.name}
                            </p>
                            <p className="text-xs text-gray-600">
                              {formatFileSize(attachedFile.size)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={removeAttachment}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-end gap-2 md:gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="*/*"
                      />
                      <ContentTypePicker
                        selectedType={contentType}
                        onTypeSelect={handleContentTypeSelect}
                        disabled={uploading || sendMessageMutation.isPending}
                      />
                      <div className="flex items-center gap-2 bg-white p-2 rounded border border-orange-200">
                        <Checkbox
                          checked={isImportant}
                          onCheckedChange={setIsImportant}
                          className="h-4 w-4"
                        />
                        <Star className="w-3 h-3 text-yellow-500" />
                      </div>
                      <ScheduleMessageDialog onSchedule={handleScheduledMessage}>
                        <Button variant="outline" size="sm" className="h-[50px] md:h-[60px] flex-shrink-0">
                          <Clock className="w-4 h-4 mr-2" />
                          <span className="hidden sm:inline">Schedule</span>
                        </Button>
                      </ScheduleMessageDialog>
                      <div className="flex-1">
                        <Textarea
                          ref={textareaRef}
                          placeholder="Type your message..."
                          value={messageText}
                          onChange={(e) => {
                            setMessageText(e.target.value);
                            handleTyping();
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              stopTyping();
                              handleSendMessage();
                            }
                          }}
                          onBlur={stopTyping}
                          className="resize-none min-h-[50px] md:min-h-[60px] text-sm border-2 border-orange-300 focus:border-orange-500"
                          rows={2}
                          disabled={uploading}
                          autoFocus
                        />
                      </div>
                      <Button
                        onClick={handleSendMessage}
                        disabled={sendMessageMutation.isPending || uploading}
                        className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 h-[50px] md:h-[60px] px-3 md:px-6 font-semibold shadow-lg text-sm md:text-base"
                      >
                        {(sendMessageMutation.isPending || uploading) ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {uploading ? 'Uploading...' : 'Sending...'}
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
                      Select content type • Attach files up to 1 GB • 
                      <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs font-mono ml-1">Enter</kbd> to send
                    </p>

                    <PollCreator
                      open={showPollCreator}
                      onClose={() => setShowPollCreator(false)}
                      onCreatePoll={handlePollCreate}
                    />
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
            </TabsContent>

            <TabsContent value="groups" className="flex-1 mt-0 p-6 overflow-y-auto">
              <GroupMessaging userEmail={user?.email} />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}