import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, MessageCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function GroupMessaging({ userEmail }) {
  const queryClient = useQueryClient();
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);

  const { data: groups = [] } = useQuery({
    queryKey: ['clientGroups', userEmail],
    queryFn: () => base44.entities.ClientGroup.filter({ created_by: userEmail }),
  });

  const createGroupMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientGroup.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientGroups']);
      setGroupName('');
      setShowNewGroup(false);
    },
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
              <DialogTitle>Create Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Group name (e.g., PCOS Support, Weight Loss Journey)"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
              <Button
                onClick={handleCreateGroup}
                disabled={!groupName.trim()}
                className="w-full"
              >
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {groups.length === 0 ? (
          <p className="text-gray-500 col-span-2">No groups created yet</p>
        ) : (
          groups.map((group) => (
            <Card
              key={group.id}
              className="cursor-pointer hover:shadow-lg transition"
              onClick={() => setSelectedGroup(group)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold">{group.name}</h4>
                    <p className="text-sm text-gray-600">
                      {group.member_count} members
                    </p>
                  </div>
                  <MessageCircle className="w-4 h-4 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}