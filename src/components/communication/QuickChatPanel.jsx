import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Send, FileUp, Phone, Loader2, MessageSquare, Clock, User,
  X, CheckCircle2, Clock as ClockIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function QuickChatPanel({ clientId, clientName, coachEmail, onVideoCall, isClient = false }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['quickChatMessages', clientId],
    queryFn: () => base44.entities.Message.filter({ client_id: clientId }, '-created_date', 50),
    enabled: !!clientId,
    refetchInterval: 2000, // Poll every 2 seconds for real-time feel
  });

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Message.create({
        client_id: clientId,
        sender_type: isClient ? 'client' : 'dietitian',
        sender_id: isClient ? undefined : coachEmail,
        message: data.message,
        content_type: data.file_url ? 'file' : 'text',
        attachment_url: data.file_url,
        attachment_name: data.file_name,
        read: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['quickChatMessages', clientId]);
      setMessage('');
      setSelectedFile(null);
      setSending(false);
    },
  });

  // Handle file upload
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setSelectedFile({ name: file.name, url: file_url });
      setUploading(false);
    } catch (err) {
      alert('Failed to upload file: ' + err.message);
      setUploading(false);
    }
  };

  // Send message
  const handleSend = async () => {
    if (!message.trim() && !selectedFile) return;
    setSending(true);
    await sendMutation.mutateAsync({
      message: message || '📎 Shared file',
      file_url: selectedFile?.url,
      file_name: selectedFile?.name,
    });
  };

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!clientId) return;
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.data?.client_id === clientId) {
        queryClient.invalidateQueries(['quickChatMessages', clientId]);
      }
    });
    return unsubscribe;
  }, [clientId, queryClient]);

  const recentMessages = messages.slice().reverse().slice(0, 20).reverse();

  return (
    <Card className="border-none shadow-lg bg-white h-full flex flex-col">
      <CardHeader className="border-b flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-base">{clientName}</CardTitle>
            <p className="text-xs text-gray-500">Direct chat</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onVideoCall?.()}
            className="gap-2"
            title="Start video call"
          >
            <Phone className="w-4 h-4" />
            <span className="hidden sm:inline">Call</span>
          </Button>
        </div>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            </div>
          ) : recentMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No messages yet. Start chatting!</p>
            </div>
          ) : (
            recentMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${
                  msg.sender_type === (isClient ? 'client' : 'dietitian') ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.sender_type === (isClient ? 'client' : 'dietitian')
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  {msg.content_type === 'file' && msg.attachment_url ? (
                    <div className="space-y-2">
                      <p className="text-xs opacity-90">{msg.message}</p>
                      <a
                        href={msg.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1 text-xs font-semibold ${
                          msg.sender_type === (isClient ? 'client' : 'dietitian')
                            ? 'text-blue-100 hover:text-white'
                            : 'text-blue-600 hover:text-blue-700'
                        }`}
                      >
                        <FileUp className="w-3 h-3" />
                        {msg.attachment_name || 'Download'}
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm break-words">{msg.message}</p>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs opacity-70">
                      {format(new Date(msg.created_date), 'HH:mm')}
                    </span>
                    {msg.sender_type === (isClient ? 'client' : 'dietitian') && msg.read && (
                      <CheckCircle2 className="w-3 h-3" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </CardContent>

      {/* File Selected Indicator */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t px-4 py-2 bg-blue-50 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <FileUp className="w-4 h-4" />
              <span className="truncate">{selectedFile.name}</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedFile(null)}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="border-t p-4 bg-white space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={sending || uploading}
            className="flex-1"
          />
          <label>
            <input
              type="file"
              onChange={handleFileSelect}
              disabled={uploading || sending}
              className="hidden"
            />
            <Button
              asChild
              size="sm"
              variant="outline"
              disabled={uploading || sending}
              className="cursor-pointer"
            >
              <span>
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileUp className="w-4 h-4" />
                )}
              </span>
            </Button>
          </label>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={sending || (!message.trim() && !selectedFile)}
            className="bg-blue-500 hover:bg-blue-600"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500">Files up to 50MB • Press Enter to send</p>
      </div>
    </Card>
  );
}