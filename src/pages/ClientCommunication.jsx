import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare,
  Send,
  CheckCheck,
  Check,
  Loader2,
  ArrowDown,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Video,
  File,
  Download,
  Users
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ClientCommunication() {
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("direct");
  const [groupMessages, setGroupMessages] = useState({});
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const formatToIST = (dateString) => {
    if (!dateString) return '';
    // Ensure proper UTC parsing by appending 'Z' if not present
    const utcString = dateString.includes('Z') ? dateString : dateString + 'Z';
    const date = new Date(utcString);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
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

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['myClientProfile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      
      const clients = await base44.entities.Client.filter({ email: user.email });
      if (clients.length > 0) {
        return clients[0];
      }
      
      const allClients = await base44.entities.Client.list();
      const matchingClient = allClients.find(c => 
        c.email?.toLowerCase() === user.email?.toLowerCase()
      );
      
      return matchingClient || null;
    },
    enabled: !!user,
  });

  const { data: messages } = useQuery({
    queryKey: ['myMessages', clientProfile?.id],
    queryFn: async () => {
      const msgs = await base44.entities.Message.filter({ 
        client_id: clientProfile?.id 
      });
      return msgs.sort((a, b) => 
        new Date(a.created_date) - new Date(b.created_date)
      );
    },
    enabled: !!clientProfile?.id,
    initialData: [],
    refetchInterval: 5000,
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
    refetchInterval: 5000,
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
    refetchInterval: 5000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      const result = await base44.entities.Message.create(data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myMessages']);
      setMessageText("");
      setAttachedFile(null);
      setTimeout(() => scrollToBottom("smooth"), 100);
      setTimeout(() => textareaRef.current?.focus(), 150);
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
      alert("❌ Failed to send message. Please try again.");
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Message.update(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['myMessages']);
    },
  });

  useEffect(() => {
    const unreadMessages = messages.filter(
      m => !m.read && m.sender_type === 'dietitian'
    );
    unreadMessages.forEach(msg => {
      markAsReadMutation.mutate(msg.id);
    });
  }, [messages.length]);

  useEffect(() => {
    scrollToBottom("auto");
    setShowScrollButton(false);
  }, [messages.length]);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1073741824) {
      alert("⚠️ File size must be less than 1 GB");
      return;
    }

    setAttachedFile(file);
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

  const renderAttachment = (message, isFromClient) => {
    if (!message.attachment_url) return null;

    const isImage = message.attachment_type?.startsWith('image/');
    const isVideo = message.attachment_type?.startsWith('video/');

    if (isImage) {
      return (
        <a href={message.attachment_url} target="_blank" rel="noopener noreferrer">
          <img
            src={message.attachment_url}
            alt={message.attachment_name}
            className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            style={{ maxHeight: '300px' }}
          />
        </a>
      );
    }

    if (isVideo) {
      return (
        <video
          controls
          className="max-w-full rounded-lg"
          style={{ maxHeight: '300px' }}
        >
          <source src={message.attachment_url} type={message.attachment_type} />
          Your browser does not support the video tag.
        </video>
      );
    }

    return (
      <a
        href={message.attachment_url}
        target="_blank"
        rel="noopener noreferrer"
        download={message.attachment_name}
        className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
          isFromClient
            ? 'bg-white/10 border-white/20 hover:bg-white/20'
            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
        }`}
      >
        {getFileIcon(message.attachment_type)}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {message.attachment_name || 'Attachment'}
          </p>
          {message.attachment_size && (
            <p className={`text-xs ${isFromClient ? 'text-white/70' : 'text-gray-500'}`}>
              {formatFileSize(message.attachment_size)}
            </p>
          )}
        </div>
        <Download className="w-4 h-4 flex-shrink-0" />
      </a>
    );
  };

  const handleSendMessage = async () => {
    if (!clientProfile) {
      alert("⚠️ Your profile is not set up yet. Please contact your dietitian.");
      return;
    }

    if (!messageText.trim() && !attachedFile) {
      alert("⚠️ Please enter a message or attach a file!");
      return;
    }

    let messageData = {
      client_id: clientProfile.id,
      sender_type: 'client',
      message: messageText.trim() || '(File attachment)',
      read: false,
    };

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
        alert("❌ File upload failed. Please try again.");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    sendMessageMutation.mutate(messageData);
  };

  if (!clientProfile) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl">
          <CardHeader>
            <CardTitle>Profile Setup Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Please wait for your dietitian to set up your client profile first.
            </p>
            <p className="text-sm text-gray-500">
              Once your profile is created, you'll be able to message your dietitian here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Messages</h1>
          <p className="text-gray-600">
            Chat with {clientProfile?.assigned_coach ? 
              clientProfile.assigned_coach.split('@')[0] : 
              'your health coach'}
          </p>
        </div>

        <Card className="border-none shadow-xl overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="rounded-none border-b w-full grid grid-cols-2">
              <TabsTrigger value="direct" className="flex gap-2">
                <MessageSquare className="w-4 h-4" />
                Direct
              </TabsTrigger>
              <TabsTrigger value="groups" className="flex gap-2">
                <Users className="w-4 h-4" />
                Groups {clientGroups.length > 0 && `(${clientGroups.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="direct" className="flex-1 mt-0">
            <div className="flex flex-col h-full">
            {/* Chat Header */}
            <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-orange-50 to-red-50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base sm:text-lg md:text-xl break-words">
                    {clientProfile?.assigned_coach ? 
                      clientProfile.assigned_coach.split('@')[0].charAt(0).toUpperCase() + 
                      clientProfile.assigned_coach.split('@')[0].slice(1) : 
                      'Your Health Coach'}
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-gray-600">Always here to help you 💚</p>
                </div>
              </div>
            </CardHeader>

            {/* Messages */}
            <div className="flex-1 overflow-hidden bg-gray-50 relative">
              <ScrollArea 
                className="h-full" 
                style={{ height: 'calc(100vh - 380px)' }}
                onScrollCapture={handleScroll}
              >
                <div className="p-2 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        No messages yet
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Start a conversation with your dietitian
                      </p>
                      <Alert className="max-w-md mx-auto bg-blue-50 border-blue-300">
                        <AlertDescription className="text-sm text-blue-900">
                          👇 Use the message box below to send your first message!
                        </AlertDescription>
                      </Alert>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isFromClient = message.sender_type === 'client';

                      return (
                        <div
                          key={message.id}
                          className={`flex ${isFromClient ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[95%] sm:max-w-[80%] md:max-w-[70%] rounded-2xl p-3 sm:p-4 shadow-md ${
                              isFromClient
                                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                                : 'bg-white text-gray-900 border border-gray-200'
                            }`}
                          >
                            {message.message && (
                              <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap mb-2">{message.message}</p>
                            )}
                            
                            {renderAttachment(message, isFromClient)}

                            <div className={`flex items-center gap-2 mt-2 text-xs ${
                              isFromClient ? 'text-white/70' : 'text-gray-500'
                            }`}>
                              <span>{formatToIST(message.created_date)}</span>
                              {isFromClient && (
                                message.read ? (
                                  <CheckCheck className="w-4 h-4 text-blue-300" />
                                ) : (
                                  <Check className="w-4 h-4 text-white/70" />
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
            <div className="p-4 border-t-2 border-orange-500 bg-white flex-shrink-0">
              {attachedFile && (
                <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
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

              <div className="flex items-end gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="*/*"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-[60px] w-[60px] flex-shrink-0 border-2 border-orange-300 hover:bg-orange-50"
                  disabled={uploading || sendMessageMutation.isPending}
                >
                  <Paperclip className="w-5 h-5 text-orange-600" />
                </Button>
                <div className="flex-1">
                  <Textarea
                    ref={textareaRef}
                    placeholder={`Type your message to ${clientProfile?.assigned_coach ? 
                      clientProfile.assigned_coach.split('@')[0] : 
                      'your coach'}...`}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="resize-none min-h-[60px] text-sm border-2 border-orange-300 focus:border-orange-500"
                    rows={2}
                    disabled={uploading}
                    autoFocus
                  />
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={sendMessageMutation.isPending || uploading}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 h-[60px] px-6 font-semibold shadow-lg"
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
                <Paperclip className="w-3 h-3 inline" /> Attach files up to 1 GB • 
                <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs font-mono ml-1">Enter</kbd> to send
              </p>
            </div>
            </div>
            </TabsContent>

            <TabsContent value="groups" className="flex-1 mt-0 overflow-y-auto">
              {clientGroups.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Users className="w-20 h-20 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-2xl font-semibold text-gray-900 mb-2">No group messages</h3>
                    <p className="text-gray-600">Your coach hasn't added you to any groups yet</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 md:p-6 space-y-6">
                  {clientGroups.map(group => {
                    const groupMsgs = groupMessages.filter(m => m.group_id === group.id).sort((a, b) =>
                      new Date(a.created_date) - new Date(b.created_date)
                    );

                    const handleSendGroupMessage = async () => {
                      const message = groupMessages[group.id] || "";
                      if (!message.trim()) return;

                      const msgData = {
                        group_id: group.id,
                        sender_type: 'client',
                        message: message.trim(),
                        read: false,
                      };

                      await sendMessageMutation.mutateAsync(msgData);
                      setGroupMessages({ ...groupMessages, [group.id]: "" });
                      queryClient.invalidateQueries(['myGroupMessages']);
                    };

                    return (
                      <Card key={group.id} className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-3 bg-blue-50">
                          <CardTitle className="text-base md:text-lg flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-500" />
                            {group.name}
                          </CardTitle>
                          {group.description && (
                            <p className="text-xs md:text-sm text-gray-600 mt-1">{group.description}</p>
                          )}
                        </CardHeader>
                        <CardContent className="p-3 md:p-4">
                          <div className="space-y-3 max-h-64 overflow-y-auto mb-4 p-2">
                            {groupMsgs.length === 0 ? (
                              <p className="text-sm text-gray-500 text-center py-4">No messages yet</p>
                            ) : (
                              groupMsgs.map(msg => {
                                const isFromClient = msg.sender_type === 'client';
                                return (
                                  <div
                                    key={msg.id}
                                    className={`flex ${isFromClient ? 'justify-end' : 'justify-start'}`}
                                  >
                                    <div
                                      className={`max-w-[85%] rounded-2xl p-2 md:p-3 ${
                                        isFromClient
                                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                                          : 'bg-gray-100 text-gray-900'
                                      }`}
                                    >
                                      <p className="text-xs md:text-sm">{msg.message}</p>
                                      <p className={`text-xs mt-1 ${isFromClient ? 'text-white/70' : 'text-gray-500'}`}>
                                        {formatToIST(msg.created_date)}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          <div className="flex gap-2 border-t pt-3">
                            <Textarea
                              placeholder="Type your message to the group..."
                              value={groupMessages[group.id] || ""}
                              onChange={(e) => setGroupMessages({ ...groupMessages, [group.id]: e.target.value })}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendGroupMessage();
                                }
                              }}
                              className="resize-none min-h-[50px] text-sm"
                              rows={2}
                            />
                            <Button
                              onClick={handleSendGroupMessage}
                              disabled={!(groupMessages[group.id] || "").trim() || sendMessageMutation.isPending}
                              className="bg-blue-500 hover:bg-blue-600 px-4"
                            >
                              {sendMessageMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}