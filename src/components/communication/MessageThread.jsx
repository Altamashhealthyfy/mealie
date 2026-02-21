import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, X, Send, Reply, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function MessageThread({ message, onReply, onClose, formatTime, currentUserEmail }) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!message?.parent_message_id && !message?.id) return null;

  const parentMessage = message?.parent_message_id ? 
    message : 
    message; // Message could be either parent or child

  const replies = message?.replies || [];

  const handleSendReply = async () => {
    if (!replyText.trim()) {
      toast.error('Please enter a reply');
      return;
    }

    setIsLoading(true);
    try {
      await onReply({
        parentMessageId: message.id,
        replyText: replyText.trim(),
      });
      setReplyText('');
      setIsReplying(false);
      toast.success('Reply sent!');
    } catch (error) {
      console.error('Reply error:', error);
      toast.error('Failed to send reply');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={!!message} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Message Thread
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Parent Message */}
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      {message?.sender_type === 'dietitian' ? '🏥 Coach' : '👤 Client'}
                    </Badge>
                    <span className="text-xs text-gray-600">
                      {formatTime(message?.created_date)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-800">
                    {message?.message}
                  </p>
                  {message?.thread_count > 0 && (
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      <Badge className="bg-blue-500">
                        {message.thread_count} {message.thread_count === 1 ? 'reply' : 'replies'}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Replies */}
          {replies && replies.length > 0 && (
            <div className="space-y-2 ml-4 pl-4 border-l-2 border-gray-200">
              <p className="text-xs font-semibold text-gray-600 uppercase">Replies</p>
              {replies.map((reply) => (
                <Card key={reply.id} className="border-gray-200">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <Badge 
                            variant="outline" 
                            className={reply.sender_type === 'dietitian' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}
                          >
                            {reply.sender_type === 'dietitian' ? '🏥 Coach' : '👤 Client'}
                          </Badge>
                          <span className="text-xs text-gray-600">
                            {formatTime(reply.created_date)}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-gray-700">
                          {reply.message}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Reply Input */}
          <div className="border-t pt-4">
            {!isReplying ? (
              <Button
                onClick={() => setIsReplying(true)}
                variant="outline"
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <Reply className="w-4 h-4 mr-2" />
                Add Reply
              </Button>
            ) : (
              <div className="space-y-3">
                <Textarea
                  placeholder="Write your reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  className="resize-none"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsReplying(false);
                      setReplyText('');
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendReply}
                    disabled={isLoading || !replyText.trim()}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Reply
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}