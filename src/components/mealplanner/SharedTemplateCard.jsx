import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Star, MessageCircle, Copy, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function SharedTemplateCard({ template, selectedClient, onClone, user }) {
  const queryClient = useQueryClient();
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [ratingText, setRatingText] = useState("");
  const [commentText, setCommentText] = useState("");

  const { data: ratings } = useQuery({
    queryKey: ['templateRatings', template.id],
    queryFn: () => base44.entities.TemplateRating.filter({ template_id: template.id }),
    initialData: [],
  });

  const { data: comments } = useQuery({
    queryKey: ['templateComments', template.id],
    queryFn: () => base44.entities.TemplateComment.filter({ template_id: template.id }, '-created_date'),
    initialData: [],
  });

  const createRatingMutation = useMutation({
    mutationFn: (ratingData) => base44.entities.TemplateRating.create(ratingData),
    onSuccess: () => {
      queryClient.invalidateQueries(['templateRatings', template.id]);
      setShowRatingDialog(false);
      setUserRating(0);
      setRatingText("");
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: (commentData) => base44.entities.TemplateComment.create(commentData),
    onSuccess: () => {
      queryClient.invalidateQueries(['templateComments', template.id]);
      setShowCommentDialog(false);
      setCommentText("");
    },
  });

  const avgRating = ratings.length > 0 
    ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
    : 0;

  const handleSubmitRating = () => {
    if (userRating === 0) {
      alert("Please select a rating");
      return;
    }
    createRatingMutation.mutate({
      template_id: template.id,
      template_name: template.name,
      coach_email: user?.email,
      coach_name: user?.full_name,
      rating: userRating,
      review: ratingText
    });
  };

  const handleSubmitComment = () => {
    if (!commentText.trim()) {
      alert("Please enter a comment");
      return;
    }
    createCommentMutation.mutate({
      template_id: template.id,
      template_name: template.name,
      coach_email: user?.email,
      coach_name: user?.full_name,
      comment: commentText
    });
  };

  return (
    <>
      <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50 hover:shadow-xl transition-all">
        <CardHeader className="p-4 lg:p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-sm lg:text-lg truncate">{template.name}</CardTitle>
                <Badge className="bg-purple-500 text-white text-xs flex-shrink-0">Public</Badge>
              </div>
              <p className="text-xs lg:text-sm text-gray-600 line-clamp-2">{template.description}</p>
              <p className="text-xs text-gray-500 mt-1">By: {template.created_by}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 lg:p-6 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-orange-100 text-orange-700 capitalize text-xs">
              {template.food_preference}
            </Badge>
            <Badge className="bg-blue-100 text-blue-700 text-xs">
              {template.target_calories} kcal
            </Badge>
            <Badge className="bg-green-100 text-green-700 text-xs">
              {template.duration}d
            </Badge>
          </div>

          <div className="flex items-center justify-between bg-white p-2 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${star <= Math.round(avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
              </div>
              <span className="text-sm font-semibold">{avgRating}</span>
              <span className="text-xs text-gray-600">({ratings.length})</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <MessageCircle className="w-3 h-3" />
              {comments.length}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={() => setShowDetailsDialog(true)}
              variant="outline"
              className="w-full text-xs h-9"
            >
              View Details & Reviews
            </Button>
            <Button
              onClick={() => onClone(template)}
              disabled={!selectedClient}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 text-xs h-9"
            >
              <Copy className="w-3 h-3 mr-1" />
              Use Template
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{template.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <p><strong>Created by:</strong> {template.created_by}</p>
              <p><strong>Duration:</strong> {template.duration} days</p>
              <p><strong>Target Calories:</strong> {template.target_calories} kcal</p>
              <p><strong>Food Preference:</strong> {template.food_preference}</p>
              <p><strong>Description:</strong> {template.description}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Ratings & Reviews ({ratings.length})
                </h3>
                <Button
                  onClick={() => setShowRatingDialog(true)}
                  size="sm"
                  className="bg-yellow-500 hover:bg-yellow-600 text-xs"
                >
                  Rate This
                </Button>
              </div>

              {ratings.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {ratings.map((rating) => (
                    <div key={rating.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold">{rating.coach_name}</p>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3 h-3 ${star <= rating.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                      </div>
                      {rating.review && <p className="text-xs text-gray-700">{rating.review}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No ratings yet. Be the first to rate!</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Comments ({comments.length})
                </h3>
                <Button
                  onClick={() => setShowCommentDialog(true)}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  Add Comment
                </Button>
              </div>

              {comments.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {comments.map((comment) => (
                    <div key={comment.id} className="p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-sm font-semibold">{comment.coach_name}</p>
                      <p className="text-xs text-gray-700 mt-1">{comment.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No comments yet. Share your feedback!</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rate This Template</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold mb-3">Your Rating</p>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setUserRating(star)}
                    className="transition-transform hover:scale-125"
                  >
                    <Star
                      className={`w-8 h-8 ${star <= userRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold">Review (Optional)</label>
              <Textarea
                placeholder="Share your thoughts about this template..."
                value={ratingText}
                onChange={(e) => setRatingText(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowRatingDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleSubmitRating}
                disabled={createRatingMutation.isPending || userRating === 0}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600"
              >
                {createRatingMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Submit Rating"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              placeholder="Share your experience with this template..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={4}
              className="text-xs"
            />

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowCommentDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleSubmitComment}
                disabled={createCommentMutation.isPending}
                className="flex-1"
              >
                {createCommentMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Post Comment"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}