import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, MessageCircle, X, Send, Loader2, Search, ArrowLeft, Trash2, Pin, PinOff, Paperclip, FileText, Image as ImageIcon, Video, File, Download, Settings, MessageSquare, Smile, MoreVertical } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';

export default function GroupMessaging({ userEmail }) {
  const queryClient = useQueryClient();
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [attachedFile, setAttachedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showThreads, setShowThreads] = useState({});
  const [groupSettings, setGroupSettings] = useState({
    only_admins_can_pin: true,
    only_admins_can_send: false,
    allow_file_sharing: true,
    allow_threads: true
  });
  const fileInputRef = useRef(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['clientGroups', userEmail],
    queryFn: () => base44.entities.ClientGroup.filter({ created_by: userEmail }),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['allClients', userEmail],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list('-created_date', 200);
      return allClients;
    },
    initialData: [],
  });

  const { data: groupMessages = [] } = useQuery({
    queryKey: ['groupMessages', selectedGroup?.id],
    queryFn: async () => {
      const msgs = await base44.entities.Message.filter({ group_id: selectedGroup?.id });
      return msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    enabled: !!selectedGroup?.id,
    initialData: [],
    refetchInterval: 5000,
  });

  const createGroupMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientGroup.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientGroups', userEmail] });
      setGroupName('');
      setShowNewGroup(false);
      toast.success('Group created!');
    },
    onError: () => toast.error('Failed to create group')
  });

  const addMembersMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGroup || selectedMemberIds.length === 0) throw new Error('Invalid data');
      const newClientIds = [...(selectedGroup.client_ids || []), ...selectedMemberIds];
      await base44.entities.ClientGroup.update(selectedGroup.id, {
        client_ids: newClientIds,
        member_count: newClientIds.length,
      });
      return { ...selectedGroup, client_ids: newClientIds, member_count: newClientIds.length };
    },
    onSuccess: (updatedGroup) => {
      queryClient.invalidateQueries({ queryKey: ['clientGroups', userEmail] });
      setSelectedGroup(updatedGroup);
      setShowAddMembers(false);
      setSelectedMemberIds([]);
      toast.success('Members added!');
    },
    onError: () => toast.error('Failed to add members')
  });

  const sendGroupMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.Message.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupMessages', selectedGroup?.id] });
      setMessageText('');
      setAttachedFile(null);
      setReplyingTo(null);
      toast.success('Message sent!');
    },
    onError: () => toast.error('Failed to send message')
  });

  const updateMessageMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Message.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupMessages', selectedGroup?.id] });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId) => base44.entities.ClientGroup.delete(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientGroups', userEmail] });
      setSelectedGroup(null);
      toast.success('Group deleted!');
    },
    onError: () => toast.error('Failed to delete group')
  });

  const updateGroupSettingsMutation = useMutation({
    mutationFn: (settings) => base44.entities.ClientGroup.update(selectedGroup.id, { settings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientGroups', userEmail] });
      toast.success('Settings updated!');
      setShowSettings(false);
    },
    onError: () => toast.error('Failed to update settings')
  });

  const handleCreateGroup = () => {
    if (groupName.trim()) {
      createGroupMutation.mutate({
        name: groupName,
        client_ids: [],
        admin_ids: [userEmail],
        member_count: 0,
        settings: groupSettings,
      });
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1073741824) {
      toast.error('File size must be less than 1 GB');
      return;
    }

    setAttachedFile(file);
  };

  const removeAttachment = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (type?.startsWith('video/')) return <Video className="w-4 h-4" />;
    if (type?.includes('pdf')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(1) + ' GB';
  };

  const handleSendGroupMessage = async () => {
    if (!messageText.trim() && !attachedFile) return;

    let messageData = {
      group_id: selectedGroup.id,
      message: messageText.trim() || '(File attachment)',
      sender_type: 'dietitian',
      sender_id: user?.id,
      sender_name: user?.full_name,
      read: false,
    };

    if (replyingTo) {
      messageData.parent_message_id = replyingTo.id;
    }

    if (attachedFile) {
      setUploading(true);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: attachedFile });
        messageData.attachment_url = file_url;
        messageData.attachment_name = attachedFile.name;
        messageData.attachment_type = attachedFile.type;
        messageData.attachment_size = attachedFile.size;
      } catch (error) {
        toast.error('File upload failed');
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    // Handle mentions
    const mentionPattern = /@(\w+)/g;
    const mentions = [...messageText.matchAll(mentionPattern)].map(m => m[1]);
    if (mentions.length > 0) {
      messageData.mentions = mentions;
    }

    await sendGroupMessageMutation.mutateAsync(messageData);

    // Update thread count
    if (replyingTo) {
      updateMessageMutation.mutate({
        id: replyingTo.id,
        data: { thread_count: (replyingTo.thread_count || 0) + 1 }
      });
    }
  };

  const handlePinMessage = (message) => {
    const isAdmin = selectedGroup.admin_ids?.includes(userEmail);
    const canPin = !selectedGroup.settings?.only_admins_can_pin || isAdmin;

    if (!canPin) {
      toast.error('Only admins can pin messages');
      return;
    }

    updateMessageMutation.mutate({
      id: message.id,
      data: {
        is_pinned: !message.is_pinned,
        pinned_by: !message.is_pinned ? userEmail : null,
        pinned_at: !message.is_pinned ? new Date().toISOString() : null
      }
    });
  };

  const handleReaction = (message, emoji) => {
    const reactions = message.reactions || [];
    const existingReaction = reactions.find(r => r.user_id === user?.id && r.emoji === emoji);

    let newReactions;
    if (existingReaction) {
      newReactions = reactions.filter(r => !(r.user_id === user?.id && r.emoji === emoji));
    } else {
      newReactions = [...reactions, { emoji, user_id: user?.id, user_name: user?.full_name }];
    }

    updateMessageMutation.mutate({
      id: message.id,
      data: { reactions: newReactions }
    });
  };

  const filteredClients = clients.filter(client => {
    const alreadyAdded = selectedGroup?.client_ids?.includes(client.id);
    const matchesSearch = client.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return !alreadyAdded && matchesSearch;
  });

  const pinnedMessages = groupMessages.filter(m => m.is_pinned && !m.parent_message_id);
  const mainMessages = groupMessages.filter(m => !m.parent_message_id);
  const getThreadReplies = (messageId) => groupMessages.filter(m => m.parent_message_id === messageId);

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

  const renderAttachment = (message) => {
    if (!message.attachment_url) return null;

    const isImage = message.attachment_type?.startsWith('image/');
    const isVideo = message.attachment_type?.startsWith('video/');

    if (isImage) {
      return (
        <div className="relative group mt-2">
          <a href={message.attachment_url} target="_blank" rel="noopener noreferrer">
            <img
              src={message.attachment_url}
              alt={message.attachment_name}
              className="max-w-full rounded-lg cursor-pointer hover:opacity-90 max-h-48"
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
        <div className="relative group mt-2">
          <video controls className="max-w-full rounded-lg max-h-48">
            <source src={message.attachment_url} type={message.attachment_type} />
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
        className="flex items-center gap-2 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 mt-2 w-full text-left"
      >
        {getFileIcon(message.attachment_type)}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{message.attachment_name}</p>
          {message.attachment_size && (
            <p className="text-xs text-gray-500">{formatFileSize(message.attachment_size)}</p>
          )}
        </div>
        <Download className="w-4 h-4" />
      </button>
    );
  };

  const renderMessage = (msg, isThread = false) => {
    const threadReplies = getThreadReplies(msg.id);
    const showThread = showThreads[msg.id];
    const reactionGroups = {};
    (msg.reactions || []).forEach(r => {
      if (!reactionGroups[r.emoji]) reactionGroups[r.emoji] = [];
      reactionGroups[r.emoji].push(r);
    });

    return (
      <div key={msg.id} className={`${isThread ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}>
        <div className="bg-white p-3 rounded-lg border hover:shadow-sm transition group">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{msg.sender_name || 'User'}</span>
                <span className="text-xs text-gray-500">
                  {new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {msg.is_pinned && (
                  <Badge variant="secondary" className="text-xs">
                    <Pin className="w-3 h-3 mr-1" />
                    Pinned
                  </Badge>
                )}
              </div>
              {replyingTo?.id === msg.id && (
                <Badge variant="outline" className="text-xs mb-2">Replying to this message</Badge>
              )}
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{msg.message}</p>
              {renderAttachment(msg)}
              
              {/* Reactions */}
              {Object.keys(reactionGroups).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {Object.entries(reactionGroups).map(([emoji, users]) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(msg, emoji)}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs flex items-center gap-1"
                    >
                      {emoji} {users.length}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Message Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setReplyingTo(msg)}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Reply
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePinMessage(msg)}>
                  {msg.is_pinned ? <PinOff className="w-4 h-4 mr-2" /> : <Pin className="w-4 h-4 mr-2" />}
                  {msg.is_pinned ? 'Unpin' : 'Pin'}
                </DropdownMenuItem>
                <Popover>
                  <PopoverTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Smile className="w-4 h-4 mr-2" />
                      React
                    </DropdownMenuItem>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2">
                    <div className="flex gap-2">
                      {['👍', '❤️', '😊', '🎉', '🔥', '👏'].map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(msg, emoji)}
                          className="text-2xl hover:scale-125 transition"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Thread indicator */}
          {!isThread && threadReplies.length > 0 && (
            <button
              onClick={() => setShowThreads({ ...showThreads, [msg.id]: !showThread })}
              className="text-xs text-blue-500 hover:text-blue-600 mt-2 flex items-center gap-1"
            >
              <MessageSquare className="w-3 h-3" />
              {threadReplies.length} {threadReplies.length === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>

        {/* Thread replies */}
        {!isThread && showThread && threadReplies.length > 0 && (
          <div className="mt-2 space-y-2">
            {threadReplies.map(reply => renderMessage(reply, true))}
          </div>
        )}
      </div>
    );
  };

  if (selectedGroup) {
    const groupMembers = clients.filter(c => selectedGroup.client_ids?.includes(c.id));
    const isAdmin = selectedGroup.admin_ids?.includes(userEmail);
    
    return (
      <div className="space-y-4 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <button
            onClick={() => setSelectedGroup(null)}
            className="flex items-center gap-2 text-blue-500 hover:text-blue-600"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Groups
          </button>
          <h3 className="text-lg font-semibold">{selectedGroup.name}</h3>
          <div className="flex gap-2">
            {isAdmin && (
              <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Group Settings</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Only admins can pin messages</label>
                      <Switch
                        checked={groupSettings.only_admins_can_pin}
                        onCheckedChange={(v) => setGroupSettings({ ...groupSettings, only_admins_can_pin: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Only admins can send messages</label>
                      <Switch
                        checked={groupSettings.only_admins_can_send}
                        onCheckedChange={(v) => setGroupSettings({ ...groupSettings, only_admins_can_send: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Allow file sharing</label>
                      <Switch
                        checked={groupSettings.allow_file_sharing}
                        onCheckedChange={(v) => setGroupSettings({ ...groupSettings, allow_file_sharing: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Allow threaded replies</label>
                      <Switch
                        checked={groupSettings.allow_threads}
                        onCheckedChange={(v) => setGroupSettings({ ...groupSettings, allow_threads: v })}
                      />
                    </div>
                    <Button
                      onClick={() => updateGroupSettingsMutation.mutate(groupSettings)}
                      className="w-full"
                    >
                      Save Settings
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <Dialog open={showAddMembers} onOpenChange={setShowAddMembers}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Members
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Members to {selectedGroup.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search clients..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <ScrollArea className="h-64 border rounded-lg p-4">
                    <div className="space-y-2">
                      {filteredClients.length === 0 ? (
                        <p className="text-sm text-gray-500">No clients to add</p>
                      ) : (
                        filteredClients.map((client) => (
                          <label key={client.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                            <Checkbox
                              checked={selectedMemberIds.includes(client.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedMemberIds([...selectedMemberIds, client.id]);
                                } else {
                                  setSelectedMemberIds(selectedMemberIds.filter(id => id !== client.id));
                                }
                              }}
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{client.full_name}</p>
                              <p className="text-xs text-gray-500">{client.email}</p>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                  <Button
                    onClick={() => addMembersMutation.mutate()}
                    disabled={selectedMemberIds.length === 0}
                    className="w-full"
                  >
                    Add {selectedMemberIds.length > 0 ? `${selectedMemberIds.length} Member(s)` : 'Members'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Members List */}
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-3">Members ({groupMembers.length})</p>
            <div className="flex flex-wrap gap-2">
              {groupMembers.length === 0 ? (
                <p className="text-sm text-gray-500">No members yet</p>
              ) : (
                groupMembers.map((member) => (
                  <Badge key={member.id} variant="secondary">
                    {member.full_name}
                    {selectedGroup.admin_ids?.includes(member.created_by) && ' (Admin)'}
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pinned Messages */}
        {pinnedMessages.length > 0 && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-3">
              <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Pin className="w-4 h-4" />
                Pinned Messages
              </p>
              <div className="space-y-2">
                {pinnedMessages.map(msg => (
                  <div key={msg.id} className="text-sm bg-white p-2 rounded">
                    <span className="font-medium">{msg.sender_name}:</span> {msg.message}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Messages Area */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {mainMessages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                </div>
              ) : (
                mainMessages.map(msg => renderMessage(msg))
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Send Message */}
        <div className="space-y-2">
          {replyingTo && (
            <div className="bg-blue-50 p-2 rounded flex items-center justify-between">
              <p className="text-sm">
                Replying to <span className="font-medium">{replyingTo.sender_name}</span>
              </p>
              <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {attachedFile && (
            <div className="bg-blue-50 p-2 rounded flex items-center gap-2">
              {getFileIcon(attachedFile.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{attachedFile.name}</p>
                <p className="text-xs text-gray-600">{formatFileSize(attachedFile.size)}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={removeAttachment}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept="*/*"
            />
            {selectedGroup.settings?.allow_file_sharing !== false && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Paperclip className="w-4 h-4" />
              </Button>
            )}
            <Textarea
              placeholder="Type message (use @ to mention)..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="min-h-[60px]"
              disabled={selectedGroup.settings?.only_admins_can_send && !isAdmin}
            />
            <Button
              onClick={handleSendGroupMessage}
              disabled={(!messageText.trim() && !attachedFile) || uploading}
              className="bg-blue-500 hover:bg-blue-600 px-6"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-500" />
          Client Groups
        </h3>
        <Dialog open={showNewGroup} onOpenChange={setShowNewGroup}>
          <DialogTrigger asChild>
            <Button className="bg-blue-500 hover:bg-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              New Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                autoFocus
              />
              <Button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || createGroupMutation.isPending}
                className="w-full"
              >
                {createGroupMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.length === 0 ? (
          <Card className="col-span-2 p-8 text-center">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No groups created yet</p>
          </Card>
        ) : (
          groups.map((group) => (
            <Card key={group.id} className="hover:shadow-lg transition">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 cursor-pointer" onClick={() => setSelectedGroup(group)}>
                    <h4 className="font-semibold text-gray-900">{group.name}</h4>
                    <Badge variant="outline" className="mt-2">
                      {group.member_count || 0} members
                    </Badge>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete group "${group.name}"?`)) {
                        deleteGroupMutation.mutate(group.id);
                      }
                    }}
                    className="text-red-500 hover:text-red-700 p-2 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-blue-500"
                  onClick={() => setSelectedGroup(group)}
                >
                  Open Group →
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}