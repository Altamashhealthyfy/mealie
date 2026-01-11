import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, MessageCircle, X, Send, Loader2, Search, ArrowLeft, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

export default function GroupMessaging({ userEmail }) {
  const queryClient = useQueryClient();
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

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
    queryFn: () => base44.entities.Message.filter({ group_id: selectedGroup?.id }),
    enabled: !!selectedGroup?.id,
    initialData: [],
  });

  const createGroupMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientGroup.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientGroups', userEmail] });
      setGroupName('');
      setShowNewGroup(false);
      toast.success('Group created!');
    },
    onError: (error) => {
      console.error('Failed to create group:', error);
      toast.error('Failed to create group');
    }
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
    onError: (error) => {
      console.error('Failed to add members:', error);
      toast.error('Failed to add members');
    }
  });

  const sendGroupMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.Message.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupMessages', selectedGroup?.id] });
      setMessageText('');
      toast.success('Message sent!');
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId) => base44.entities.ClientGroup.delete(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientGroups', userEmail] });
      setSelectedGroup(null);
      toast.success('Group deleted!');
    },
    onError: (error) => {
      console.error('Failed to delete group:', error);
      toast.error('Failed to delete group');
    }
  });

  const handleCreateGroup = () => {
    if (groupName.trim()) {
      createGroupMutation.mutate({
        name: groupName,
        client_ids: [],
        member_count: 0,
      });
    }
  };

  const handleAddMembers = () => {
    if (selectedMemberIds.length > 0) {
      addMembersMutation.mutate();
    }
  };

  const handleSendGroupMessage = () => {
    if (!messageText.trim() || !selectedGroup) return;

    sendGroupMessageMutation.mutate({
      group_id: selectedGroup.id,
      message: messageText.trim(),
      sender_type: 'dietitian',
      read: false,
    });
  };

  const filteredClients = clients.filter(client => {
    const alreadyAdded = selectedGroup?.client_ids?.includes(client.id);
    const matchesSearch = client.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return !alreadyAdded && matchesSearch;
  });

  if (selectedGroup) {
    const groupMembers = clients.filter(c => selectedGroup.client_ids?.includes(c.id));
    
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
                  onClick={handleAddMembers}
                  disabled={selectedMemberIds.length === 0}
                  className="w-full"
                >
                  Add {selectedMemberIds.length > 0 ? `${selectedMemberIds.length} Member(s)` : 'Members'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Messages Area */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {groupMessages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                </div>
              ) : (
                groupMessages.map((msg) => (
                  <div key={msg.id} className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">{msg.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {msg.sender_type === 'dietitian' ? '📧 You' : '👤 Client'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Send Message */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Textarea
              placeholder="Type group message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          <Button
            onClick={handleSendGroupMessage}
            disabled={!messageText.trim() || sendGroupMessageMutation.isPending}
            className="w-full bg-blue-500 hover:bg-blue-600 h-11"
          >
            {sendGroupMessageMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send to {groupMembers.length} Member(s)
              </>
            )}
          </Button>
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
                placeholder="Group name (e.g., PCOS Support, Weight Loss Journey)"
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
            <p className="text-sm text-gray-400 mt-1">Create your first group to start messaging clients in bulk</p>
          </Card>
        ) : (
          groups.map((group) => (
            <Card
              key={group.id}
              className="hover:shadow-lg transition"
            >
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
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition flex-shrink-0"
                    disabled={deleteGroupMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start text-blue-500"
                  onClick={() => setSelectedGroup(group)}
                >
                  View Group →
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}