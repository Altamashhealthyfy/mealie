import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

export default function TypingIndicator({ clientId, groupId, currentUserEmail }) {
  const { data: typingUsers = [] } = useQuery({
    queryKey: ['typingIndicators', clientId, groupId],
    queryFn: async () => {
      const filter = {};
      if (clientId) filter.client_id = clientId;
      if (groupId) filter.group_id = groupId;
      
      const indicators = await base44.entities.TypingIndicator.filter(filter);
      
      // Filter out old indicators (older than 5 seconds)
      const now = new Date();
      const recent = indicators.filter(ind => {
        const updatedAt = new Date(ind.updated_date);
        return (now - updatedAt) < 5000 && ind.is_typing && ind.user_email !== currentUserEmail;
      });
      
      return recent;
    },
    enabled: !!(clientId || groupId),
    refetchInterval: 2000,
    initialData: [],
  });

  if (typingUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600">
      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
      <span>
        {typingUsers.length === 1 
          ? `${typingUsers[0].user_name || 'Someone'} is typing...`
          : `${typingUsers.length} people are typing...`
        }
      </span>
    </div>
  );
}