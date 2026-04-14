import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  CheckCheck,
  Check,
  Loader2,
  ArrowDown,
  Paperclip,
  X,
  Image as ImageIcon,
  Video,
  File as FileIcon,
  Download,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";


export default function RealtimeChat({ recipientId, recipientName, isCoach = false, onClose }) {
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);


  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false,
  });

  // Fetch messages in real-time
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['realtimeMessages', recipientId],
    queryFn: async () => {
      const allMessages = await base44.entities.Message.filter({ client_id: recipientId });
      return allMessages
        .filter(m => m.content_type !== 'video_signal')
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    enabled: !!recipientId && !!user,
    refetchInterval: 1000, // Real-time polling every second
  });

  // Real-time subscription
  useEffect(() => {
    if (!recipientId || !user) return;
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if ((event.type === 'create' || event.type === 'update') && recipientId) {
        queryClient.invalidateQueries(['realtimeMessages', recipientId]);
      }
    });
    return () => unsubscribe();
  }, [recipientId, user, queryClient]);

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      const result = await base44.entities.Message.create(messageData);
      // Send push notification
      if (isCoach) {
        base44.functions.invoke('sendPushNotification', {
          user_id: recipientId,
          title: `New message from ${user?.full_name}`,
          body: messageData.message?.slice(0, 100),
          data: { link: '/messages' },
        }).catch(() => {});
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['realtimeMessages']);
      setMessageText("");
      setAttachedFile(null);
      setTimeout(() => scrollToBottom("smooth"), 100);
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
    }
  });

  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = (e) => {
    const element = e.target;
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  useEffect(() => {
    scrollToBottom("auto");
  }, [messages.length]);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1073741824) {
      alert("File size must be less than 1 GB");
      return;
    }
    setAttachedFile(file);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() && !attachedFile) return;

    let messageData = {
      client_id: isCoach ? recipientId : user?.id,
      sender_type: isCoach ? 'dietitian' : 'client',
      sender_id: user?.email,
      sender_name: user?.full_name,
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
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    sendMessageMutation.mutate(messageData);
  };

  const addEmoji = (emoji) => {
    setMessageText(messageText + emoji.native);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (type?.startsWith('video/')) return <Video className="w-4 h-4" />;
    return <FileIcon className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <Card className="h-96">
        <CardContent className="h-full flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-96">
      <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-red-50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{recipientName}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden relative bg-gray-50">
        <ScrollArea className="h-full" onScrollCapture={handleScroll}>
          <div className="p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => {
                const isFromCurrentUser = message.sender_id === user?.email;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs rounded-2xl p-3 shadow-sm ${
                        isFromCurrentUser
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      {message.message && (
                        <p className="text-sm mb-2 break-words">{message.message}</p>
                      )}
                      {message.attachment_url && (
                        <div className="mt-2">
                          {message.attachment_type?.startsWith('image/') ? (
                            <img
                              src={message.attachment_url}
                              alt="attachment"
                              className="rounded max-w-full max-h-48"
                            />
                          ) : (
                            <a
                              href={message.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs font-medium"
                            >
                              {getFileIcon(message.attachment_type)}
                              {message.attachment_name}
                            </a>
                          )}
                        </div>
                      )}
                      <div className={`text-xs mt-2 flex items-center gap-1 ${
                        isFromCurrentUser ? 'text-white/70' : 'text-gray-500'
                      }`}>
                        <span>{new Date(message.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isFromCurrentUser && (
                          message.read ? (
                            <CheckCheck className="w-3 h-3" />
                          ) : (
                            <Check className="w-3 h-3" />
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
            className="absolute bottom-4 right-4 rounded-full w-10 h-10 bg-orange-500 hover:bg-orange-600"
            size="icon"
          >
            <ArrowDown className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Message Input */}
      <div className="p-3 border-t bg-white flex-shrink-0">
        {attachedFile && (
          <div className="mb-2 p-2 bg-blue-50 rounded border border-blue-200 text-sm flex items-center justify-between">
            <span>{attachedFile.name}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAttachedFile(null)}
              className="h-5 w-5 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        <div className="flex gap-2 items-end">
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="h-10 w-10 flex-shrink-0"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
          />



          <Textarea
            ref={textareaRef}
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="resize-none min-h-10 text-sm flex-1"
            rows={1}
            disabled={uploading}
          />

          <Button
            onClick={handleSendMessage}
            disabled={sendMessageMutation.isPending || uploading}
            className="bg-orange-500 hover:bg-orange-600 h-10 px-3 flex-shrink-0"
            size="sm"
          >
            {sendMessageMutation.isPending || uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}