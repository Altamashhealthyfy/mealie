import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare, Send, CheckCheck, Check, Loader2, ArrowDown,
  Paperclip, X, FileText, Image as ImageIcon, Video, File, Download,
  Users, Bell, Phone, History, ChevronUp, ChevronDown, Smile,
  Info, Calendar, Star, Zap, Heart, ThumbsUp, Clock, Menu
} from "lucide-react";
import VideoCallRoom from "@/components/communication/VideoCallRoom";
import VideoCallHistory from "@/components/communication/VideoCallHistory";
import { createSignalingChannel } from "@/components/communication/VideoCallSignaling";
import PushNotificationManager from "@/components/notifications/PushNotificationManager";
import ModernMessageBubble from "@/components/communication/ModernMessageBubble";
import MessageInputArea from "@/components/communication/MessageInputArea";
import ChatSidebar from "@/components/communication/ChatSidebar";

const QUICK_MESSAGES = [
  { label: "👍 On track!", text: "I'm on track with my diet today!" },
  { label: "❓ Need help", text: "I need some guidance, can we talk?" },
  { label: "✅ Done!", text: "I completed today's meal plan!" },
  { label: "💧 Water ✓", text: "I've completed my water intake goal today!" },
  { label: "🏋️ Workout ✓", text: "Completed my workout for today!" },
  { label: "😴 Sleep issue", text: "I've been having trouble sleeping, any tips?" },
];

const EMOJIS = ["😊", "👍", "❤️", "🙏", "💪", "😄", "🎉", "✅", "⭐", "🥗", "💧", "🏃"];

export default function ClientCommunication() {
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("direct");
  const [groupMessageInputs, setGroupMessageInputs] = useState({});
  const [groupAttachedFiles, setGroupAttachedFiles] = useState({});
  const [groupUploading, setGroupUploading] = useState({});
  const [newMessageAlert, setNewMessageAlert] = useState(null);
  const [showSlidePanel, setShowSlidePanel] = useState(false);
  const [slideTab, setSlideTab] = useState("quick"); // "quick" | "emoji"
  const [showSidebar, setShowSidebar] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [activeVideoCall, setActiveVideoCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const groupFileInputRefs = useRef({});
  const signalingRef = useRef(null);
  const incomingChannelRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  const typingTimeoutRef = useRef(null);

  const handleTyping = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {}, 3000);
  };

  const formatToIST = (dateString) => {
    if (!dateString) return '';
    const utcString = dateString.includes('Z') ? dateString : dateString + 'Z';
    const date = new Date(utcString);
    if (isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true
    }).format(date);
  };

  const scrollToBottom = (behavior = "smooth") => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
  };

  const handleScroll = (e) => {
    const element = e.target;
    setShowScrollButton(element.scrollHeight - element.scrollTop - element.clientHeight > 100);
  };

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false,
  });

  const { data: clientProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['myClientProfile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const clients = await base44.entities.Client.filter({ email: user.email });
      if (clients.length > 0) return clients[0];
      const allClients = await base44.entities.Client.list();
      return allClients.find(c => c.email?.toLowerCase() === user.email?.toLowerCase()) || null;
    },
    enabled: !!user,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['myMessages', clientProfile?.id],
    queryFn: async () => {
      const msgs = await base44.entities.Message.filter({ client_id: clientProfile?.id });
      return msgs.filter(m => m.content_type !== 'video_signal')
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    enabled: !!clientProfile?.id,
    initialData: [],
    refetchInterval: 15000,
  });

  const { data: clientGroups = [] } = useQuery({
    queryKey: ['myClientGroups', clientProfile?.id],
    queryFn: async () => {
      if (!clientProfile?.id) return [];
      const allGroups = await base44.entities.ClientGroup.list();
      return allGroups.filter(g => g.client_ids?.includes(clientProfile.id));
    },
    enabled: !!clientProfile?.id,
    initialData: [],
    refetchInterval: 30000,
  });

  const { data: groupMessages = [] } = useQuery({
    queryKey: ['myGroupMessages', clientGroups.map(g => g.id).join(',')],
    queryFn: async () => {
      if (clientGroups.length === 0) return [];
      const msgs = await base44.entities.Message.list('-created_date', 500);
      return msgs.filter(m => clientGroups.some(g => m.group_id === g.id));
    },
    enabled: clientGroups.length > 0,
    initialData: [],
    refetchInterval: 15000,
  });

  const coachEmail = Array.isArray(clientProfile?.assigned_coach)
    ? clientProfile?.assigned_coach[0]
    : clientProfile?.assigned_coach;

  const { data: coachUser } = useQuery({
    queryKey: ['coachUser', coachEmail],
    queryFn: async () => {
      if (!coachEmail) return null;
      const users = await base44.entities.User.filter({ email: coachEmail });
      return users[0] || null;
    },
    enabled: !!coachEmail,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      const result = await base44.entities.Message.create(data);
      if (data.client_id) {
        base44.functions.invoke('notifyNewMessage', {
          message_id: result.id, client_id: data.client_id, group_id: data.group_id || null,
          sender_type: 'client', sender_name: user?.full_name || clientProfile?.full_name || 'Client',
          message_preview: data.message?.slice(0, 80) || null,
        }).catch(() => {});
        if (data.sender_type === 'client' && data.message) {
          base44.functions.invoke('processCheckInTriggers', {
            client_id: data.client_id, message_text: data.message, coach_email: coachEmail || '',
          }).catch(() => {});
        }
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myMessages']);
      setMessageText("");
      setAttachedFile(null);
      setShowSlidePanel(false);
      setTimeout(() => scrollToBottom("smooth"), 100);
      setTimeout(() => textareaRef.current?.focus(), 150);
    },
    onError: () => alert("❌ Failed to send message. Please try again."),
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (message) => {
      await base44.entities.Message.update(message.id, { read: true });
    },
    onSuccess: () => queryClient.invalidateQueries(['myMessages']),
  });

  useEffect(() => {
    messages.filter(m => !m.read && m.sender_type === 'dietitian')
      .forEach(msg => markAsReadMutation.mutate(msg));
  }, [messages.length]);

  useEffect(() => {
    // Auto-scroll to bottom on new messages only if already near bottom
    const container = messagesContainerRef.current;
    if (!container) { scrollToBottom("auto"); setShowScrollButton(false); return; }
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (isNearBottom) { scrollToBottom("smooth"); setShowScrollButton(false); }
    else { setShowScrollButton(true); }
  }, [messages.length]);

  useEffect(() => {
    if (!clientProfile?.id) return;
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if ((event.data?.client_id === clientProfile.id || clientGroups.some(g => g.id === event.data?.group_id))
        && (event.type === 'create' || event.type === 'update')) {
        queryClient.invalidateQueries(['myMessages']);
        queryClient.invalidateQueries(['myGroupMessages']);
      }
    });
    return () => unsubscribe();
  }, [clientProfile?.id, clientGroups]);

  useEffect(() => {
    const coachMessages = messages.filter(m => m.sender_type === 'dietitian');
    const count = coachMessages.length;
    if (prevMessageCountRef.current > 0 && count > prevMessageCountRef.current && activeTab === 'direct') {
      const latest = coachMessages[coachMessages.length - 1];
      setNewMessageAlert(latest?.message || 'New message from your coach');
      setTimeout(() => setNewMessageAlert(null), 4000);
    }
    prevMessageCountRef.current = count;
  }, [messages.length]);

  const startVideoCall = () => {
    if (!clientProfile?.id) return;
    // Stop incoming listener before creating outgoing channel to avoid conflicts
    incomingChannelRef.current?.stop();
    incomingChannelRef.current = null;
    const channel = createSignalingChannel({ clientId: clientProfile.id, senderType: 'client', senderEmail: user?.email });
    // Do NOT call channel.start() here — VideoCallRoom will call it
    signalingRef.current = channel;
    setActiveVideoCall({ clientId: clientProfile.id, coachName: coachUser?.full_name || 'Your Coach', channel });
  };

  const endVideoCall = () => { signalingRef.current?.stop(); signalingRef.current = null; setActiveVideoCall(null); };

  useEffect(() => {
    if (!clientProfile?.id || activeVideoCall) return;
    const channel = createSignalingChannel({ clientId: clientProfile.id, senderType: 'client', senderEmail: user?.email });
    channel.start();
    incomingChannelRef.current = channel;
    channel.onMessage((msg) => { if (msg.type === 'offer') setIncomingCall({ coachName: coachUser?.full_name || 'Your Coach', channel }); });
    return () => { channel.stop(); incomingChannelRef.current = null; };
  }, [clientProfile?.id, coachUser]);

  const acceptCall = () => {
    if (!incomingCall) return;
    // Stop the incoming listener; reuse its channel as the call channel (it already has the offer buffered)
    incomingChannelRef.current = null;
    signalingRef.current = incomingCall.channel;
    setActiveVideoCall({ clientId: clientProfile.id, coachName: incomingCall.coachName, channel: incomingCall.channel });
    setIncomingCall(null);
  };

  const rejectCall = () => {
    if (!incomingCall) return;
    incomingCall.channel.send({ type: 'end-call', roomId: clientProfile.id });
    incomingCall.channel.stop();
    setIncomingCall(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1073741824) { alert("⚠️ File size must be less than 1 GB"); return; }
    setAttachedFile(file);
  };

  const removeAttachment = () => { setAttachedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (type?.startsWith('video/')) return <Video className="w-4 h-4" />;
    if (type?.includes('pdf') || type?.includes('word') || type?.includes('document')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(1) + ' GB';
  };

  const handleDownload = async (url, filename) => {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl; link.download = filename || 'download';
    document.body.appendChild(link); link.click();
    document.body.removeChild(link); window.URL.revokeObjectURL(blobUrl);
  };

  const renderAttachment = (message, isFromClient) => {
    if (!message.attachment_url) return null;
    const isImage = message.attachment_type?.startsWith('image/');
    const isVideo = message.attachment_type?.startsWith('video/');
    if (isImage) return (
      <div className="relative group">
        <a href={message.attachment_url} target="_blank" rel="noopener noreferrer">
          <img src={message.attachment_url} alt={message.attachment_name} className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity" style={{ maxHeight: '300px' }} />
        </a>
        <button onClick={() => handleDownload(message.attachment_url, message.attachment_name)}
          className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition">
          <Download className="w-4 h-4" />
        </button>
      </div>
    );
    if (isVideo) return (
      <div className="relative group">
        <video controls className="max-w-full rounded-lg" style={{ maxHeight: '300px' }}>
          <source src={message.attachment_url} type={message.attachment_type} />
        </video>
      </div>
    );
    return (
      <button onClick={() => handleDownload(message.attachment_url, message.attachment_name)}
        className={`flex items-center gap-2 p-3 rounded-lg border transition-colors w-full text-left ${isFromClient ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
        {getFileIcon(message.attachment_type)}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{message.attachment_name || 'Attachment'}</p>
          {message.attachment_size && <p className={`text-xs ${isFromClient ? 'text-white/70' : 'text-gray-500'}`}>{formatFileSize(message.attachment_size)}</p>}
        </div>
        <Download className="w-4 h-4 flex-shrink-0" />
      </button>
    );
  };

  const handleSendMessage = async () => {
    if (!clientProfile) { alert("⚠️ Your profile is not set up yet. Please contact your dietitian."); return; }
    if (!messageText.trim() && !attachedFile) { alert("⚠️ Please enter a message or attach a file!"); return; }
    let messageData = { client_id: clientProfile.id, sender_type: 'client', message: messageText.trim() || '(File attachment)', read: false };
    if (attachedFile) {
      setUploading(true);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: attachedFile });
        messageData.attachment_url = file_url; messageData.attachment_name = attachedFile.name;
        messageData.attachment_type = attachedFile.type; messageData.attachment_size = attachedFile.size;
      } catch { alert("❌ File upload failed. Please try again."); setUploading(false); return; }
      setUploading(false);
    }
    sendMessageMutation.mutate(messageData);
  };

  const isClient = user?.user_type === 'client';

  if (userLoading || (isClient && profileLoading)) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto text-orange-500 mb-4 animate-spin" />
          <p className="text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (isClient && !clientProfile) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader><CardTitle>Profile Setup Required</CardTitle></CardHeader>
          <CardContent><p className="text-gray-600">Please wait for your dietitian to set up your client profile first.</p></CardContent>
        </Card>
      </div>
    );
  }

  const coachName = coachUser?.full_name || (coachEmail ? coachEmail.split('@')[0] : 'Your Health Coach');
  const totalMessages = messages.length;
  const myMessages = messages.filter(m => m.sender_type === 'client').length;
  const joinDate = clientProfile?.join_date ? new Date(clientProfile.join_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  return (
    <div className="flex flex-col overflow-hidden communication-page-height bg-[#f0f2f5]">
      {activeVideoCall && (
        <VideoCallRoom roomId={activeVideoCall.clientId} localName={user?.full_name || 'Me'}
          remoteName={activeVideoCall.coachName} isInitiator={false}
          signalingChannel={activeVideoCall.channel} onEnd={endVideoCall} />
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Chat Sidebar */}
        <ChatSidebar
          isOpen={showSidebar}
          onClose={() => setShowSidebar(false)}
          coachName={coachName}
          coachUser={coachUser}
          clientProfile={clientProfile}
          clientGroups={clientGroups}
          onStartCall={startVideoCall}
          onShowCallHistory={(show) => setShowCallHistory(show)}
          showCallHistory={showCallHistory}
          userEmail={user?.email}
          isClient={isClient}
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Top bar */}
          <div className="flex-shrink-0 px-3 py-2 bg-white border-b shadow-sm flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Button variant="ghost" size="sm" onClick={() => setShowSidebar(true)}
                className="h-9 w-9 p-0 flex-shrink-0 text-gray-600 hover:bg-gray-100 rounded-full">
                <Menu className="w-5 h-5" />
              </Button>
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-white font-bold text-sm">{coachName.charAt(0)}</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-gray-900 truncate">{coachName}</h1>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  <p className="text-xs text-green-600 font-medium">Health Coach · Online</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {incomingCall && (
                <div className="flex gap-1 animate-pulse">
                  <Button onClick={acceptCall} size="sm" className="bg-green-500 hover:bg-green-600 text-white h-8 px-2.5 text-xs font-semibold">
                    <Phone className="w-3 h-3 mr-1" /> Answer
                  </Button>
                  <Button onClick={rejectCall} size="sm" variant="destructive" className="h-8 px-2 text-xs">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
              <Button size="sm" onClick={startVideoCall}
                className="bg-green-500 hover:bg-green-600 text-white h-8 px-2 sm:px-3 flex items-center gap-1 rounded-full shadow-sm">
                <Phone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs font-medium">Video Call</span>
              </Button>
            </div>
          </div>

          {newMessageAlert && (
            <div className="mx-3 mt-2 p-2 bg-green-50 border border-green-300 rounded-xl flex items-center gap-2 flex-shrink-0">
              <Bell className="w-4 h-4 text-green-600 flex-shrink-0" />
              <p className="text-xs text-green-800 font-medium flex-1 truncate">New: {newMessageAlert}</p>
              <Button variant="ghost" size="sm" className="p-0.5 h-auto" onClick={() => setNewMessageAlert(null)}>
                <X className="w-3.5 h-3.5 text-green-700" />
              </Button>
            </div>
          )}

          {showCallHistory && (
            <div className="mx-3 mt-2 border border-purple-200 rounded-xl bg-purple-50 p-3 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-purple-800 text-sm flex items-center gap-1"><History className="w-3.5 h-3.5" /> Past Calls</h4>
                <Button variant="ghost" size="sm" onClick={() => setShowCallHistory(false)} className="h-6 w-6 p-0"><X className="w-4 h-4" /></Button>
              </div>
              <VideoCallHistory clientId={clientProfile?.id} />
            </div>
          )}

          <Card className="border-none shadow-none flex-1 flex flex-col min-h-0 overflow-hidden rounded-none bg-transparent">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <TabsList className="sticky top-0 z-10 rounded-none border-b bg-white w-full grid grid-cols-2 flex-shrink-0 h-10 px-2">
                <TabsTrigger value="direct" className="flex gap-1.5 items-center text-xs sm:text-sm font-medium rounded-none data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 data-[state=active]:bg-transparent">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Coach Chat
                  {messages.filter(m => !m.read && m.sender_type === 'dietitian').length > 0 && (
                    <Badge className="ml-0.5 bg-red-500 text-white text-xs h-4 min-w-4 flex items-center justify-center rounded-full px-1">
                      {messages.filter(m => !m.read && m.sender_type === 'dietitian').length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="groups" className="flex gap-1.5 text-xs sm:text-sm font-medium rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent">
                  <Users className="w-3.5 h-3.5" />
                  Groups {clientGroups.length > 0 && `(${clientGroups.length})`}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="direct" className="flex-1 mt-0 overflow-hidden min-h-0">
                <div className="flex flex-col h-full min-h-0">
                  {/* Messages Area */}
                  <div ref={messagesContainerRef} className="flex-1 overflow-y-auto relative min-h-0 bg-gradient-to-b from-white via-orange-50/30 to-white scrollbar-thin" style={{ overscrollBehavior: 'contain' }} onScroll={handleScroll}>
                    <div className="p-4 space-y-2">
                      {messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full py-20">
                                  <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center mb-4 shadow-xl">
                                    <MessageSquare className="w-12 h-12 text-orange-500" />
                                  </div>
                                  <h3 className="text-lg font-bold text-gray-900 mb-2">Let's get started!</h3>
                                  <p className="text-sm text-gray-600 text-center max-w-xs">Send your first message to {coachName} to begin your health journey</p>
                                </div>
                              ) : (
                                messages.map((message, idx) => {
                                  const isFromClient = message.sender_type === 'client';
                                  // Show date separator
                                  const msgDate = message.created_date ? new Date(message.created_date + (message.created_date.includes('Z') ? '' : 'Z')).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '';
                                  const prevMsgDate = idx > 0 && messages[idx-1].created_date ? new Date(messages[idx-1].created_date + (messages[idx-1].created_date.includes('Z') ? '' : 'Z')).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '';
                                  const showDateSep = idx === 0 || msgDate !== prevMsgDate;

                                  return (
                                    <React.Fragment key={message.id}>
                                      {showDateSep && msgDate && (
                                        <div className="flex items-center justify-center my-4">
                                          <div className="bg-gradient-to-r from-orange-100 to-red-100 backdrop-blur text-gray-700 text-xs font-bold px-4 py-2 rounded-full shadow-md border border-orange-200">
                                            {msgDate}
                                          </div>
                                        </div>
                                      )}
                                      <ModernMessageBubble
                                        message={message}
                                        isFromClient={isFromClient}
                                        formatToIST={formatToIST}
                                        handleDownload={handleDownload}
                                        getFileIcon={getFileIcon}
                                        formatFileSize={formatFileSize}
                                      />
                                    </React.Fragment>
                                  );
                                })
                              )}
                              <div ref={messagesEndRef} />
                            </div>
                    {showScrollButton && (
                      <button
                        onClick={() => scrollToBottom("smooth")}
                        className="fixed bottom-24 right-4 z-20 rounded-full w-10 h-10 bg-teal-600 hover:bg-teal-700 text-white shadow-xl flex items-center justify-center border-2 border-white transition-all"
                        style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}
                      >
                        <ArrowDown className="w-5 h-5 animate-bounce" />
                      </button>
                    )}
                    </div>
                    </div>

                    {/* Input Area Component - Sticky Footer */}
                    <div className="sticky bottom-0 z-10 flex-shrink-0 bg-white border-t">
                    <MessageInputArea
                    messageText={messageText}
                    setMessageText={setMessageText}
                    attachedFile={attachedFile}
                    setAttachedFile={setAttachedFile}
                    onSendMessage={handleSendMessage}
                    isLoading={sendMessageMutation.isPending}
                    isUploading={uploading}
                    textareaRef={textareaRef}
                    getFileIcon={getFileIcon}
                    formatFileSize={formatFileSize}
                    isGroup={false}
                    />
                    </div>
                    </TabsContent>

              <TabsContent value="groups" className="flex-1 mt-0 overflow-hidden min-h-0">
                {clientGroups.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center px-4">
                      <Users className="w-16 h-16 mx-auto text-gray-300 mb-3" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">No group messages</h3>
                      <p className="text-sm text-gray-500">Your coach hasn't added you to any groups yet</p>
                    </div>
                  </div>
                ) : clientGroups.length === 1 ? (
                  // Single group: full WhatsApp-style fixed layout
                  (() => {
                    const group = clientGroups[0];
                    const groupMsgs = groupMessages.filter(m => m.group_id === group.id)
                      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
                    const handleGroupFileSelect = (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      if (file.size > 1073741824) { alert("⚠️ File size must be less than 1 GB"); return; }
                      setGroupAttachedFiles({ ...groupAttachedFiles, [group.id]: file });
                    };
                    const removeGroupAttachment = () => {
                      setGroupAttachedFiles({ ...groupAttachedFiles, [group.id]: null });
                      if (groupFileInputRefs.current[group.id]) groupFileInputRefs.current[group.id].value = '';
                    };
                    const handleSendGroupMessage = async () => {
                      const message = groupMessageInputs[group.id] || "";
                      const attachedFile = groupAttachedFiles[group.id];
                      if (!message.trim() && !attachedFile) return;
                      let msgData = {
                        group_id: group.id, sender_type: 'client', sender_id: user?.id,
                        sender_name: user?.full_name || clientProfile?.full_name,
                        message: message.trim() || '(File attachment)', read: false,
                      };
                      if (attachedFile) {
                        setGroupUploading({ ...groupUploading, [group.id]: true });
                        try {
                          const { file_url } = await base44.integrations.Core.UploadFile({ file: attachedFile });
                          msgData.attachment_url = file_url; msgData.attachment_name = attachedFile.name;
                          msgData.attachment_type = attachedFile.type; msgData.attachment_size = attachedFile.size;
                        } catch { alert("❌ File upload failed."); setGroupUploading({ ...groupUploading, [group.id]: false }); return; }
                        setGroupUploading({ ...groupUploading, [group.id]: false });
                      }
                      await sendMessageMutation.mutateAsync(msgData);
                      setGroupMessageInputs({ ...groupMessageInputs, [group.id]: "" });
                      setGroupAttachedFiles({ ...groupAttachedFiles, [group.id]: null });
                      queryClient.invalidateQueries(['myGroupMessages']);
                    };
                    return (
                      <div className="flex flex-col h-full min-h-0">
                        {/* Group header */}
                        <div className="flex-shrink-0 px-3 py-2 bg-blue-50 border-b flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{group.name}</p>
                            {group.description && <p className="text-xs text-gray-500">{group.description}</p>}
                          </div>
                        </div>
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto min-h-0 bg-[#e5ddd5] p-3 space-y-1 scrollbar-thin">
                          {groupMsgs.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                              <p className="text-sm text-gray-500">No messages yet</p>
                            </div>
                          ) : groupMsgs.map(msg => {
                            const isFromClient = msg.sender_type === 'client';
                            return (
                              <div key={msg.id} className={`flex ${isFromClient ? 'justify-end' : 'justify-start'} mb-0.5`}>
                                <div className={`max-w-[82%] rounded-2xl px-3 py-2 shadow-sm ${isFromClient ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-sm' : 'bg-white text-gray-900 border border-gray-100 rounded-bl-sm'}`}>
                                  {!isFromClient && msg.sender_name && (
                                    <p className="text-xs font-semibold text-blue-600 mb-0.5">{msg.sender_name}</p>
                                  )}
                                  {msg.message && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>}
                                  {renderAttachment(msg, isFromClient)}
                                  <p className={`text-[10px] mt-0.5 ${isFromClient ? 'text-white/70 text-right' : 'text-gray-400'}`}>{formatToIST(msg.created_date)}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {/* Input */}
                        <div className="flex-shrink-0 px-2 py-2 bg-white border-t border-gray-200">
                          {groupAttachedFiles[group.id] && (
                            <div className="mb-1.5 px-2 py-1.5 bg-blue-50 rounded-xl border border-blue-200 flex items-center gap-2">
                              {getFileIcon(groupAttachedFiles[group.id].type)}
                              <p className="text-xs font-semibold text-gray-900 truncate flex-1">{groupAttachedFiles[group.id].name}</p>
                              <Button variant="ghost" size="sm" onClick={removeGroupAttachment} className="text-red-600 h-6 w-6 p-0"><X className="w-3.5 h-3.5" /></Button>
                            </div>
                          )}
                          <div className="flex items-end gap-1.5">
                            <input ref={(el) => groupFileInputRefs.current[group.id] = el} type="file" onChange={handleGroupFileSelect} className="hidden" accept="*/*" />
                            <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0 text-gray-500 hover:bg-gray-100 rounded-full"
                              onClick={() => groupFileInputRefs.current[group.id]?.click()}
                              disabled={groupUploading[group.id] || sendMessageMutation.isPending}>
                              <Paperclip className="w-5 h-5" />
                            </Button>
                            <Textarea placeholder="Message the group..."
                              value={groupMessageInputs[group.id] || ""}
                              onChange={(e) => setGroupMessageInputs({ ...groupMessageInputs, [group.id]: e.target.value })}
                              onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendGroupMessage(); } }}
                              className="resize-none min-h-[38px] max-h-28 text-sm border border-gray-200 focus:border-blue-400 bg-gray-50 rounded-2xl flex-1 min-w-0 px-3 py-2"
                              rows={1} disabled={groupUploading[group.id]} />
                            <Button onClick={handleSendGroupMessage} className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 h-9 w-9 flex-shrink-0 p-0 rounded-full shadow-md disabled:opacity-50"
                              disabled={!(groupMessageInputs[group.id] || "").trim() && !groupAttachedFiles[group.id] || sendMessageMutation.isPending || groupUploading[group.id]}>
                              {(sendMessageMutation.isPending || groupUploading[group.id]) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  // Multiple groups: scrollable list, each with fixed input
                  <div className="flex flex-col h-full min-h-0 overflow-y-auto">
                    <div className="p-3 space-y-4">
                      {clientGroups.map(group => {
                        const groupMsgs = groupMessages.filter(m => m.group_id === group.id)
                          .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
                        const handleGroupFileSelect = (e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          if (file.size > 1073741824) { alert("⚠️ File size must be less than 1 GB"); return; }
                          setGroupAttachedFiles({ ...groupAttachedFiles, [group.id]: file });
                        };
                        const removeGroupAttachment = () => {
                          setGroupAttachedFiles({ ...groupAttachedFiles, [group.id]: null });
                          if (groupFileInputRefs.current[group.id]) groupFileInputRefs.current[group.id].value = '';
                        };
                        const handleSendGroupMessage = async () => {
                          const message = groupMessageInputs[group.id] || "";
                          const attachedFile = groupAttachedFiles[group.id];
                          if (!message.trim() && !attachedFile) return;
                          let msgData = {
                            group_id: group.id, sender_type: 'client', sender_id: user?.id,
                            sender_name: user?.full_name || clientProfile?.full_name,
                            message: message.trim() || '(File attachment)', read: false,
                          };
                          if (attachedFile) {
                            setGroupUploading({ ...groupUploading, [group.id]: true });
                            try {
                              const { file_url } = await base44.integrations.Core.UploadFile({ file: attachedFile });
                              msgData.attachment_url = file_url; msgData.attachment_name = attachedFile.name;
                              msgData.attachment_type = attachedFile.type; msgData.attachment_size = attachedFile.size;
                            } catch { alert("❌ File upload failed."); setGroupUploading({ ...groupUploading, [group.id]: false }); return; }
                            setGroupUploading({ ...groupUploading, [group.id]: false });
                          }
                          await sendMessageMutation.mutateAsync(msgData);
                          setGroupMessageInputs({ ...groupMessageInputs, [group.id]: "" });
                          setGroupAttachedFiles({ ...groupAttachedFiles, [group.id]: null });
                          queryClient.invalidateQueries(['myGroupMessages']);
                        };
                        return (
                          <Card key={group.id} className="border-l-4 border-l-blue-500">
                            <CardHeader className="pb-2 pt-3 px-3 bg-blue-50">
                              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                                <Users className="w-4 h-4 text-blue-500" />{group.name}
                              </CardTitle>
                              {group.description && <p className="text-xs text-gray-500 mt-0.5">{group.description}</p>}
                            </CardHeader>
                            <CardContent className="p-2 sm:p-3">
                              <div className="space-y-2 max-h-72 overflow-y-auto mb-3 p-1 bg-[#e5ddd5] rounded-lg">
                                {groupMsgs.length === 0 ? (
                                  <p className="text-xs text-gray-500 text-center py-3">No messages yet</p>
                                ) : groupMsgs.map(msg => {
                                  const isFromClient = msg.sender_type === 'client';
                                  return (
                                    <div key={msg.id} className={`flex ${isFromClient ? 'justify-end' : 'justify-start'}`}>
                                      <div className={`max-w-[85%] rounded-xl p-2 text-xs sm:text-sm shadow-sm ${isFromClient ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' : 'bg-white text-gray-900 border border-gray-100'}`}>
                                        {!isFromClient && msg.sender_name && <p className="text-xs font-semibold text-blue-600 mb-0.5">{msg.sender_name}</p>}
                                        {msg.message && <p className="mb-1">{msg.message}</p>}
                                        {renderAttachment(msg, isFromClient)}
                                        <p className={`text-xs mt-0.5 ${isFromClient ? 'text-white/70' : 'text-gray-400'}`}>{formatToIST(msg.created_date)}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              {groupAttachedFiles[group.id] && (
                                <div className="mb-2 p-2 bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-2">
                                  {getFileIcon(groupAttachedFiles[group.id].type)}
                                  <p className="text-xs font-medium text-gray-900 truncate flex-1">{groupAttachedFiles[group.id].name}</p>
                                  <Button variant="ghost" size="sm" onClick={removeGroupAttachment} className="text-red-600 h-6 w-6 p-0"><X className="w-3.5 h-3.5" /></Button>
                                </div>
                              )}
                              <div className="flex gap-2 border-t pt-2">
                                <input ref={(el) => groupFileInputRefs.current[group.id] = el} type="file" onChange={handleGroupFileSelect} className="hidden" accept="*/*" />
                                <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0"
                                  onClick={() => groupFileInputRefs.current[group.id]?.click()}
                                  disabled={groupUploading[group.id] || sendMessageMutation.isPending}>
                                  <Paperclip className="w-3.5 h-3.5" />
                                </Button>
                                <Textarea placeholder="Message the group..."
                                  value={groupMessageInputs[group.id] || ""}
                                  onChange={(e) => setGroupMessageInputs({ ...groupMessageInputs, [group.id]: e.target.value })}
                                  onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendGroupMessage(); } }}
                                  className="resize-none min-h-[36px] text-sm flex-1" rows={1}
                                  disabled={groupUploading[group.id]} />
                                <Button onClick={handleSendGroupMessage} className="bg-blue-500 hover:bg-blue-600 h-9 px-3 flex-shrink-0"
                                  disabled={!(groupMessageInputs[group.id] || "").trim() && !groupAttachedFiles[group.id] || sendMessageMutation.isPending || groupUploading[group.id]}>
                                  {(sendMessageMutation.isPending || groupUploading[group.id]) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}