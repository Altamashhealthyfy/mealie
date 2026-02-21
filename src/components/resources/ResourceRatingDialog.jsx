import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';

export default function ResourceRatingDialog({ resource, client, isOpen, onClose, onRatingSubmitted }) {
  const [rating, setRating] = useState(5);
  const [usefulness, setUsefulness] = useState('very_useful');
  const [difficulty, setDifficulty] = useState('just_right');
  const [relevance, setRelevance] = useState('very_relevant');
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [improvements, setImprovements] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const ratingMutation = useMutation({
    mutationFn: async () => {
      const rating_data = {
        resource_id: resource.id,
        client_id: client.id,
        client_email: client.email,
        rating,
        usefulness,
        difficulty_match: difficulty,
        relevance,
        would_recommend: wouldRecommend,
        feedback,
        improvement_notes: improvements
      };
      
      await base44.entities.ResourceRating.create(rating_data);
      return rating_data;
    },
    onSuccess: (data) => {
      setSubmitted(true);
      setTimeout(() => {
        onRatingSubmitted?.();
        onClose?.();
      }, 2000);
    },
    onError: (error) => {
      toast.error('Failed to save rating');
    }
  });

  if (!isOpen) return null;

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
          <p className="text-gray-600 mb-6">Your feedback helps us provide better resources.</p>
          <Button onClick={onClose} className="w-full bg-green-600 hover:bg-green-700">
            Close
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl p-6 my-8">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Rate This Resource</h2>
            <p className="text-sm text-gray-600 mt-1">{resource.title}</p>
          </div>

          {/* Star Rating */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Overall Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-all transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Selections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Usefulness */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">How Useful Was It?</label>
              <Select value={usefulness} onValueChange={setUsefulness}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_useful">Not Useful</SelectItem>
                  <SelectItem value="somewhat_useful">Somewhat Useful</SelectItem>
                  <SelectItem value="very_useful">Very Useful</SelectItem>
                  <SelectItem value="extremely_useful">Extremely Useful</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Difficulty Level</label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="too_easy">Too Easy</SelectItem>
                  <SelectItem value="just_right">Just Right</SelectItem>
                  <SelectItem value="too_hard">Too Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Relevance */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Relevance to Your Goals</label>
              <Select value={relevance} onValueChange={setRelevance}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_relevant">Not Relevant</SelectItem>
                  <SelectItem value="somewhat_relevant">Somewhat Relevant</SelectItem>
                  <SelectItem value="very_relevant">Very Relevant</SelectItem>
                  <SelectItem value="perfect_match">Perfect Match</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recommendation */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Would You Recommend?</label>
              <Select value={wouldRecommend ? 'yes' : 'no'} onValueChange={(v) => setWouldRecommend(v === 'yes')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes, Definitely</SelectItem>
                  <SelectItem value="no">No, Not Really</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Feedback */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Your Feedback</label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What did you like about this resource?"
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Improvements */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Suggestions for Improvement</label>
            <Textarea
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              placeholder="How could this resource be improved?"
              className="resize-none"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => ratingMutation.mutate()}
              disabled={ratingMutation.isPending}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-600"
            >
              {ratingMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Rating'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={ratingMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}