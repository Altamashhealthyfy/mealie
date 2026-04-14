import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BarChart3, CheckCircle, Users } from "lucide-react";
import { toast } from "sonner";

export default function PollDisplay({ message, currentUserId }) {
  const queryClient = useQueryClient();
  const pollData = message.poll_data;

  const voteMutation = useMutation({
    mutationFn: async (optionIndex) => {
      const updatedOptions = [...pollData.options];
      const option = updatedOptions[optionIndex];
      
      const existingVoteIndex = option.votes?.findIndex(v => v.user_id === currentUserId);
      
      if (existingVoteIndex !== undefined && existingVoteIndex >= 0) {
        // Remove vote
        option.votes = option.votes.filter(v => v.user_id !== currentUserId);
      } else {
        // Add vote
        if (!pollData.allow_multiple) {
          // Remove votes from other options first
          updatedOptions.forEach(opt => {
            opt.votes = opt.votes?.filter(v => v.user_id !== currentUserId) || [];
          });
        }
        
        option.votes = option.votes || [];
        option.votes.push({
          user_id: currentUserId,
          user_name: message.sender_name,
          voted_at: new Date().toISOString()
        });
      }

      await base44.entities.Message.update(message.id, {
        poll_data: { ...pollData, options: updatedOptions }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allMessages']);
      queryClient.invalidateQueries(['groupMessages']);
      toast.success('Vote recorded!');
    },
    onError: () => toast.error('Failed to vote')
  });

  if (!pollData) return null;

  const totalVotes = pollData.options.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0);
  const userVotes = pollData.options
    .map((opt, idx) => ({ idx, voted: opt.votes?.some(v => v.user_id === currentUserId) }))
    .filter(o => o.voted)
    .map(o => o.idx);

  const hasVoted = userVotes.length > 0;

  return (
    <Card className="mt-3 border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-4">
          <BarChart3 className="w-6 h-6 text-pink-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-1">{pollData.question}</h4>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Users className="w-3 h-3" />
              <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
              {pollData.allow_multiple && <Badge variant="outline" className="text-xs">Multiple choice</Badge>}
              {pollData.is_anonymous && <Badge variant="outline" className="text-xs">Anonymous</Badge>}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {pollData.options.map((option, index) => {
            const voteCount = option.votes?.length || 0;
            const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
            const isVoted = option.votes?.some(v => v.user_id === currentUserId);

            return (
              <div key={index}>
                <button
                  onClick={() => voteMutation.mutate(index)}
                  disabled={voteMutation.isPending}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    isVoted 
                      ? 'border-pink-500 bg-pink-100' 
                      : 'border-gray-200 bg-white hover:border-pink-300 hover:bg-pink-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      {isVoted && <CheckCircle className="w-4 h-4 text-pink-600" />}
                      <span className={`text-sm ${isVoted ? 'font-semibold text-pink-900' : 'text-gray-700'}`}>
                        {option.text}
                      </span>
                    </div>
                    <Badge className={isVoted ? 'bg-pink-600' : 'bg-gray-600'}>
                      {percentage}%
                    </Badge>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-600">{voteCount} {voteCount === 1 ? 'vote' : 'votes'}</span>
                    {!pollData.is_anonymous && voteCount > 0 && hasVoted && (
                      <span className="text-xs text-gray-500">
                        {option.votes.map(v => v.user_name?.split(' ')[0]).join(', ')}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}