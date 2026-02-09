import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, CheckCircle, Clock, Star, TrendingUp, Scale, Ruler, Heart, Image as ImageIcon, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ClientProgressReview() {
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [feedbackData, setFeedbackData] = useState({
    feedback_text: '',
    rating: 5,
    suggestions: [],
    celebration_notes: ''
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['myClients', user?.email],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list();
      return allClients.filter(c => {
        const assignedCoaches = Array.isArray(c.assigned_coach) 
          ? c.assigned_coach 
          : c.assigned_coach 
            ? [c.assigned_coach] 
            : [];
        return assignedCoaches.includes(user?.email);
      });
    },
    enabled: !!user,
  });

  const { data: progressLogs = [] } = useQuery({
    queryKey: ['clientProgressLogs', selectedClient?.id],
    queryFn: async () => {
      const logs = await base44.entities.ProgressLog.filter({ client_id: selectedClient?.id });
      return logs.sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    enabled: !!selectedClient?.id,
  });

  const provideFeedbackMutation = useMutation({
    mutationFn: async ({ logId, feedback }) => {
      return await base44.entities.ProgressLog.update(logId, {
        coach_feedback: {
          ...feedback,
          reviewed_by: user?.email,
          reviewed_at: new Date().toISOString()
        },
        reviewed: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clientProgressLogs']);
      setShowFeedbackDialog(false);
      setSelectedLog(null);
      setFeedbackData({ feedback_text: '', rating: 5, suggestions: [], celebration_notes: '' });
      toast.success('Feedback provided successfully!');
    },
  });

  const handleProvideFeedback = (log) => {
    setSelectedLog(log);
    if (log.coach_feedback) {
      setFeedbackData({
        feedback_text: log.coach_feedback.feedback_text || '',
        rating: log.coach_feedback.rating || 5,
        suggestions: log.coach_feedback.suggestions || [],
        celebration_notes: log.coach_feedback.celebration_notes || ''
      });
    } else {
      setFeedbackData({ feedback_text: '', rating: 5, suggestions: [], celebration_notes: '' });
    }
    setShowFeedbackDialog(true);
  };

  const handleSubmitFeedback = () => {
    if (!feedbackData.feedback_text.trim()) {
      toast.error('Please provide feedback text');
      return;
    }
    provideFeedbackMutation.mutate({
      logId: selectedLog.id,
      feedback: feedbackData
    });
  };

  const addSuggestion = () => {
    const suggestion = prompt('Enter suggestion:');
    if (suggestion) {
      setFeedbackData({
        ...feedbackData,
        suggestions: [...(feedbackData.suggestions || []), suggestion]
      });
    }
  };

  const removeSuggestion = (index) => {
    setFeedbackData({
      ...feedbackData,
      suggestions: feedbackData.suggestions.filter((_, i) => i !== index)
    });
  };

  const filteredClients = clients.filter(client =>
    client.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLogs = progressLogs.filter(log => {
    if (filterStatus === 'reviewed') return log.reviewed === true;
    if (filterStatus === 'pending') return log.reviewed !== true;
    return true;
  });

  const pendingReviewCount = progressLogs.filter(log => !log.reviewed).length;
  const reviewedCount = progressLogs.filter(log => log.reviewed).length;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Client Progress Review</h1>
          <p className="text-gray-600">Review client progress logs and provide personalized feedback</p>
        </div>

        {!selectedClient ? (
          <div>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search clients by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map(client => (
                <Card key={client.id} className="hover:shadow-lg transition-shadow cursor-pointer border-none"
                  onClick={() => setSelectedClient(client)}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{client.full_name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-gray-600">{client.email}</p>
                    {client.weight && (
                      <Badge variant="outline" className="text-xs">
                        <Scale className="w-3 h-3 mr-1" />
                        {client.weight} kg
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredClients.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-gray-600">No clients found</p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Button variant="outline" onClick={() => setSelectedClient(null)}>
                  ← Back to Clients
                </Button>
                <h2 className="text-2xl font-bold text-gray-900 mt-4">{selectedClient.full_name}</h2>
              </div>
              <div className="flex gap-3">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Logs</SelectItem>
                    <SelectItem value="pending">Pending Review</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-none">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Logs</p>
                      <p className="text-3xl font-bold text-orange-600">{progressLogs.length}</p>
                    </div>
                    <TrendingUp className="w-10 h-10 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-none">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Pending Review</p>
                      <p className="text-3xl font-bold text-yellow-600">{pendingReviewCount}</p>
                    </div>
                    <Clock className="w-10 h-10 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-none">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Reviewed</p>
                      <p className="text-3xl font-bold text-green-600">{reviewedCount}</p>
                    </div>
                    <CheckCircle className="w-10 h-10 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {filteredLogs.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-gray-600">No progress logs found</p>
                  </CardContent>
                </Card>
              ) : (
                filteredLogs.map(log => (
                  <Card key={log.id} className={`border-2 ${log.reviewed ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold">{format(new Date(log.date), 'MMMM d, yyyy')}</h3>
                            {log.reviewed ? (
                              <Badge className="bg-green-600">✓ Reviewed</Badge>
                            ) : (
                              <Badge className="bg-yellow-600">⏳ Pending Review</Badge>
                            )}
                          </div>
                          <div className="flex gap-4 text-sm text-gray-600">
                            {log.weight && <span className="flex items-center gap-1"><Scale className="w-4 h-4" />{log.weight} kg</span>}
                            {log.meal_adherence && <span>🍽️ {log.meal_adherence}% adherence</span>}
                            {log.wellness_metrics?.mood && <span className="capitalize">😊 {log.wellness_metrics.mood}</span>}
                          </div>
                        </div>
                        <Button 
                          onClick={() => handleProvideFeedback(log)}
                          className={log.reviewed ? 'bg-blue-600' : 'bg-orange-600'}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          {log.reviewed ? 'Edit Feedback' : 'Provide Feedback'}
                        </Button>
                      </div>

                      {log.wellness_metrics && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          {log.wellness_metrics.energy_level && (
                            <div className="text-sm">⚡ Energy: {log.wellness_metrics.energy_level}/10</div>
                          )}
                          {log.wellness_metrics.sleep_quality && (
                            <div className="text-sm">😴 Sleep: {log.wellness_metrics.sleep_quality}/10</div>
                          )}
                          {log.wellness_metrics.stress_level && (
                            <div className="text-sm">😰 Stress: {log.wellness_metrics.stress_level}/10</div>
                          )}
                          {log.wellness_metrics.water_intake && (
                            <div className="text-sm">💧 Water: {log.wellness_metrics.water_intake}L</div>
                          )}
                        </div>
                      )}

                      {log.measurements && Object.keys(log.measurements).length > 0 && (
                        <div className="mb-4 p-3 bg-white rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Ruler className="w-4 h-4 text-orange-600" />
                            <span className="font-semibold text-sm">Measurements</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            {Object.entries(log.measurements).map(([key, value]) => (
                              value && <div key={key}>{key.replace(/_/g, ' ')}: {value}cm</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {log.photos && (Object.keys(log.photos).length > 0) && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <ImageIcon className="w-4 h-4 text-purple-600" />
                            <span className="font-semibold text-sm">Progress Photos</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {Object.entries(log.photos).map(([type, url]) => (
                              url && (
                                <div key={type}>
                                  <img src={url} alt={type} className="w-full h-32 object-cover rounded-lg" />
                                  <p className="text-xs text-center mt-1 capitalize">{type}</p>
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      )}

                      {log.notes && (
                        <div className="p-3 bg-blue-50 rounded-lg mb-4">
                          <p className="text-sm font-semibold mb-1">Client Notes:</p>
                          <p className="text-sm text-gray-700">{log.notes}</p>
                        </div>
                      )}

                      {log.coach_feedback && (
                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Heart className="w-5 h-5 text-green-600" />
                              <span className="font-semibold">Coach Feedback</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-4 h-4 ${i < log.coach_feedback.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{log.coach_feedback.feedback_text}</p>
                          {log.coach_feedback.celebration_notes && (
                            <div className="p-2 bg-yellow-100 rounded mb-2">
                              <p className="text-sm">🎉 <strong>Celebration:</strong> {log.coach_feedback.celebration_notes}</p>
                            </div>
                          )}
                          {log.coach_feedback.suggestions?.length > 0 && (
                            <div>
                              <p className="text-sm font-semibold mb-1">Suggestions:</p>
                              <ul className="list-disc list-inside text-sm space-y-1">
                                {log.coach_feedback.suggestions.map((suggestion, idx) => (
                                  <li key={idx}>{suggestion}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Reviewed by {log.coach_feedback.reviewed_by} on {format(new Date(log.coach_feedback.reviewed_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Provide Feedback</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Overall Rating</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      onClick={() => setFeedbackData({ ...feedbackData, rating })}
                      className="transition-transform hover:scale-110"
                    >
                      <Star className={`w-8 h-8 ${rating <= feedbackData.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Feedback *</Label>
                <Textarea
                  value={feedbackData.feedback_text}
                  onChange={(e) => setFeedbackData({ ...feedbackData, feedback_text: e.target.value })}
                  placeholder="Provide detailed feedback on their progress, effort, and areas for improvement..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Celebration Notes</Label>
                <Textarea
                  value={feedbackData.celebration_notes}
                  onChange={(e) => setFeedbackData({ ...feedbackData, celebration_notes: e.target.value })}
                  placeholder="Acknowledge their achievements and progress (e.g., 'Great job on hitting your water intake goal!')"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Suggestions</Label>
                <div className="space-y-2">
                  {feedbackData.suggestions?.map((suggestion, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input value={suggestion} readOnly className="flex-1" />
                      <Button variant="destructive" size="sm" onClick={() => removeSuggestion(idx)}>×</Button>
                    </div>
                  ))}
                  <Button variant="outline" onClick={addSuggestion} className="w-full">
                    + Add Suggestion
                  </Button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowFeedbackDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitFeedback}
                  disabled={provideFeedbackMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
                >
                  {provideFeedbackMutation.isPending ? 'Saving...' : 'Submit Feedback'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}