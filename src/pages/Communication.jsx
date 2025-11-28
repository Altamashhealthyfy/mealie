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
  ArrowDown,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Video,
  File,
  Download
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";

export default function Communication() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedClient, setSelectedClient] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const formatToIST = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const formatDateTimeIST = (dateString) => {
    const date = new Date(dateString);
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

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients } = useQuery({
    queryKey: ['clients', user?.email, user?.user_type],
    queryFn: async () => {
      if (user?.user_type === 'super_admin') {
        return await base44.entities.Client.list('-created_date', 100);
      }
      
      // Fetch only clients created by or assigned to this coach
      const [createdClients, assignedClients] = await Promise.all([
        base44.entities.Client.filter({ created_by: user?.email }, '-created_date', 50),
        base44.entities.Client.filter({ assigned_coach: user?.email }, '-created_date', 50)
      ]);
      
      // Merge and deduplicate
      const clientMap = new Map();
      [...createdClients, ...assignedClients].forEach(c => clientMap.set(c.id, c));
      return Array.from(clientMap.values());
    },
    enabled: !!user,
    initialData: [],
    staleTime: 30000,
  });

  const { data: allMessages } = useQuery({
    queryKey: ['allMessages'],
    queryFn: () => base44.entities.Message.list('-created_date', 500),
    initialData: [],
    refetchInterval: 10000,
    staleTime: 5000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      const result = await base44.entities.Message.create(data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allMessages']);
      setMessageText("");
      setAttachedFile(null);
      setTimeout(() => scrollToBottom("smooth"), 100);
      setTimeout(() => textareaRef.current?.focus(), 150);
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
      toast({
        title: "Failed to send message",
        description: "Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Message.update(id, { read: true }),
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

  const renderAttachment = (message, isFromDietitian) => {
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
      </a>
    );
  };

  const handleSendMessage = async () => {
    if (!selectedClient) {
      toast({
        title: "No client selected",
        description: "Please select a client first.",
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
      client_id: selectedClient.id,
      sender_type: 'dietitian',
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
                                    {lastMessage.attachment_url ? '📎 ' + (lastMessage.attachment_name || 'Attachment') : lastMessage.message}
                                  </p>
                                )}
                                {lastMessage && (
                                  <p className={`text-xs mt-1 ${
                                    isSelected ? 'text-white/60' : 'text-gray-500'
                                  }`}>
                                    {formatDateTimeIST(lastMessage.created_date)}
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

                  {/* Messages */}
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
                                  {message.message && (
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap mb-2">{message.message}</p>
                                  )}
                                  
                                  {renderAttachment(message, isFromDietitian)}

                                  <div className={`flex items-center gap-2 mt-2 text-xs ${
                                    isFromDietitian ? 'text-white/70' : 'text-gray-500'
                                  }`}>
                                    <span>{formatToIST(message.created_date)}</span>
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
                          placeholder="Type your message..."
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