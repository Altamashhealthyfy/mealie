import { useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useTypingIndicator(clientId, groupId, userEmail, userName, userType) {
  const queryClient = useQueryClient();
  const typingTimeoutRef = useRef(null);
  const currentIndicatorRef = useRef(null);

  const setTypingMutation = useMutation({
    mutationFn: async (isTyping) => {
      const filter = { user_email: userEmail };
      if (clientId) filter.client_id = clientId;
      if (groupId) filter.group_id = groupId;

      const existing = await base44.entities.TypingIndicator.filter(filter);

      if (existing.length > 0) {
        currentIndicatorRef.current = existing[0].id;
        await base44.entities.TypingIndicator.update(existing[0].id, {
          is_typing: isTyping,
        });
      } else {
        const data = {
          user_email: userEmail,
          user_name: userName,
          user_type: userType,
          is_typing: isTyping,
        };
        if (clientId) data.client_id = clientId;
        if (groupId) data.group_id = groupId;

        const result = await base44.entities.TypingIndicator.create(data);
        currentIndicatorRef.current = result.id;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['typingIndicators']);
    },
  });

  const handleTyping = () => {
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing to true
    setTypingMutation.mutate(true);

    // Set timeout to clear typing indicator after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setTypingMutation.mutate(false);
    }, 3000);
  };

  const stopTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTypingMutation.mutate(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Set typing to false when component unmounts
      if (currentIndicatorRef.current) {
        base44.entities.TypingIndicator.update(currentIndicatorRef.current, {
          is_typing: false,
        }).catch(() => {});
      }
    };
  }, []);

  return { handleTyping, stopTyping };
}