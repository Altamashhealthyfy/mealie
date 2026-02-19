import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  AlertCircle, CheckCircle2, Clock, Star, Download, MessageSquare,
  Loader2, FileText, Play, BookOpen, Eye, Zap
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const typeIcons = {
  pdf: FileText,
  article: FileText,
  video: Play,
  guide: BookOpen,
  infographic: BookOpen,
  workbook: FileText,
  worksheet: FileText,
  other: FileText
};

const statusConfig = {
  assigned: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Assigned' },
  viewed: { icon: Eye, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Viewed' },
  in_progress: { icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50', label: 'In Progress' },
  completed: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', label: 'Completed' },
  overdue: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Overdue' }
};

export default function ClientResourceTracker() {
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [ratingValue, setRatingValue] = useState(0);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['clientProfile', user?.email],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ email: user?.email });
      return clients[0] || null;
    },
    enabled: !!user?.email && user?.user_type === 'client',
  });

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['myResourceAssignments', clientProfile?.id],
    queryFn: async () => {
      const res = await base44.entities.ResourceAssignment.filter(
        { client_id: clientProfile?.id },
        '-assigned_date',
        100
      );
      return res;
    },
    enabled: !!clientProfile?.id,
  });

  const { data: resources = {} } = useQuery({
    queryKey: ['assignedResourcesDetail', assignments],
    queryFn: async () => {
      const resourceMap = {};
      for (const assignment of assignments) {
        const res = await base44.entities.Resource.filter({ id: assignment.resource_id });
        if (res[0]) resourceMap[assignment.resource_id] = res[0];
      }
      return resourceMap;
    },
    enabled: assignments.length > 0,
  });

  const { data: progress = {} } = useQuery({
    queryKey: ['resourceProgress', selectedAssignment?.id],
    queryFn: async () => {
      const res = await base44.entities.ResourceProgress.filter(
        { assignment_id: selectedAssignment?.id },
        '-session_date',
        100
      );
      return { sessions: res };
    },
    enabled: !!selectedAssignment?.id,
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: async (updates) => {
      return base44.entities.ResourceAssignment.update(selectedAssignment.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myResourceAssignments'] });
      toast.success('Progress saved');
    },
  });

  const handleMarkAsViewed = async () => {
    await updateAssignmentMutation.mutateAsync({ status: 'viewed', first_viewed_at: new Date().toISOString() });
  };

  const handleMarkAsCompleted = async () => {
    await updateAssignmentMutation.mutateAsync({ status: 'completed', completed_at: new Date().toISOString() });
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText && ratingValue === 0) {
      toast.error('Please provide feedback or a rating');
      return;
    }

    setSubmittingFeedback(true);
    try {
      await updateAssignmentMutation.mutateAsync({
        client_notes: feedbackText,
        client_rating: ratingValue,
        status: 'completed'
      });
      setFeedbackText('');
      setRatingValue(0);
      setSelectedAssignment(null);
      toast.success('Feedback submitted');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleDownload = (fileUrl) => {
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = true;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // Group assignments by status
  const assignmentsByStatus = {
    assigned: assignments.filter(a => a.status === 'assigned'),
    in_progress: assignments.filter(a => a.status === 'in_progress'),
    completed: assignments.filter(a => a.status === 'completed')
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📚 My Learning Resources</h1>
          <p className="text-gray-600 mt-1">Track and complete educational materials assigned by your coach</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Assigned</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{assignmentsByStatus.assigned.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-600">{assignmentsByStatus.in_progress.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{assignmentsByStatus.completed.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {assignments.length === 0 ? '0%' : Math.round((assignmentsByStatus.completed.length / assignments.length) * 100)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Assigned Resources */}
        {assignmentsByStatus.assigned.length > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-base">🔔 Waiting to Start ({assignmentsByStatus.assigned.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {assignmentsByStatus.assigned.map(assignment => {
                  const resource = resources[assignment.resource_id];
                  const Icon = typeIcons[resource?.type] || FileText;
                  return (
                    <button
                      key={assignment.id}
                      onClick={() => setSelectedAssignment(assignment)}
                      className="w-full text-left p-3 bg-white border border-blue-200 rounded-lg hover:border-blue-400 hover:shadow transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{resource?.title}</p>
                          <p className="text-xs text-gray-500">
                            Assigned {new Date(assignment.assigned_date).toLocaleDateString()}
                            {assignment.due_date && ` • Due ${new Date(assignment.due_date).toLocaleDateString()}`}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-white">Start</Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* In Progress */}
        {assignmentsByStatus.in_progress.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-base">⚡ In Progress ({assignmentsByStatus.in_progress.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {assignmentsByStatus.in_progress.map(assignment => {
                  const resource = resources[assignment.resource_id];
                  const Icon = typeIcons[resource?.type] || FileText;
                  return (
                    <div
                      key={assignment.id}
                      onClick={() => setSelectedAssignment(assignment)}
                      className="cursor-pointer p-3 bg-white border border-amber-200 rounded-lg hover:border-amber-400 hover:shadow transition-all"
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <Icon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{resource?.title}</p>
                          <p className="text-xs text-gray-500">
                            {assignment.time_spent_minutes || 0} min spent • {assignment.completion_percentage || 0}% complete
                          </p>
                        </div>
                      </div>
                      <Progress value={assignment.completion_percentage || 0} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completed */}
        {assignmentsByStatus.completed.length > 0 && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-base">✅ Completed ({assignmentsByStatus.completed.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {assignmentsByStatus.completed.map(assignment => {
                  const resource = resources[assignment.resource_id];
                  const Icon = typeIcons[resource?.type] || FileText;
                  return (
                    <div
                      key={assignment.id}
                      onClick={() => setSelectedAssignment(assignment)}
                      className="p-3 bg-white border border-green-200 rounded-lg hover:shadow transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{resource?.title}</p>
                          <p className="text-xs text-gray-500">
                            Completed {new Date(assignment.completed_at).toLocaleDateString()}
                            {assignment.client_rating && ` • Rated ${assignment.client_rating}/5`}
                          </p>
                        </div>
                        {assignment.coach_feedback && (
                          <Badge className="bg-green-600">Feedback</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {assignments.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">No resources assigned yet</p>
            <p className="text-gray-400 text-sm">Your coach will assign learning materials here</p>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      {selectedAssignment && (
        <Dialog open={!!selectedAssignment} onOpenChange={() => setSelectedAssignment(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {resources[selectedAssignment.resource_id] && (
              <>
                <DialogHeader>
                  <DialogTitle>{resources[selectedAssignment.resource_id]?.title}</DialogTitle>
                  <DialogDescription>{resources[selectedAssignment.resource_id]?.description}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Status & Actions */}
                  <div className="flex items-center justify-between">
                    <Badge className="bg-orange-600">{statusConfig[selectedAssignment.status]?.label}</Badge>
                    <div className="flex gap-2">
                      {selectedAssignment.status !== 'completed' && (
                        <Button
                          size="sm"
                          onClick={handleMarkAsCompleted}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Mark Completed
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(resources[selectedAssignment.resource_id]?.file_url)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>

                  {/* Progress Info */}
                  {selectedAssignment.completion_percentage > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Progress</p>
                      <Progress value={selectedAssignment.completion_percentage} className="h-2" />
                      <p className="text-xs text-gray-500 mt-1">{selectedAssignment.completion_percentage}% complete</p>
                    </div>
                  )}

                  {/* Feedback Section */}
                  {selectedAssignment.status === 'completed' && selectedAssignment.coach_feedback && (
                    <Card className="bg-green-50 border-green-200">
                      <CardHeader>
                        <CardTitle className="text-sm">Coach Feedback</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-700">{selectedAssignment.coach_feedback}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Submit Feedback */}
                  {selectedAssignment.status === 'completed' && !selectedAssignment.client_notes && (
                    <div className="space-y-3 border-t pt-4">
                      <p className="text-sm font-medium text-gray-700">Share Your Feedback</p>
                      <Textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="What did you learn? How was this resource?"
                        rows={3}
                      />
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-700">Rate This Resource:</p>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(rating => (
                            <button
                              key={rating}
                              onClick={() => setRatingValue(rating)}
                              className="focus:outline-none transition-transform"
                            >
                              <Star
                                className="w-5 h-5"
                                fill={rating <= ratingValue ? '#fbbf24' : 'none'}
                                color={rating <= ratingValue ? '#fbbf24' : '#d1d5db'}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <Button
                        onClick={handleSubmitFeedback}
                        disabled={submittingFeedback}
                        className="bg-orange-600 hover:bg-orange-700 w-full"
                      >
                        {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}