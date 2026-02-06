import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Search, Loader2, CheckCircle, Calendar, Heart, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CoachMPESSTracker() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [coachNotes, setCoachNotes] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: assessments, isLoading } = useQuery({
    queryKey: ['mpessTracking', monthFilter, user?.email],
    queryFn: async () => {
      const allTracking = await base44.entities.MPESSTracker.list();
      
      // Get coach's assigned clients
      const coachClients = await base44.entities.Client.filter({
        assigned_to: user?.email
      });
      const coachClientEmails = new Set(coachClients.map(c => c.email));
      
      // Also get clients assigned via assigned_coach array
      const allClients = await base44.entities.Client.list();
      const moreClients = allClients.filter(c => 
        c.assigned_coach?.includes(user?.email)
      );
      moreClients.forEach(c => coachClientEmails.add(c.email));
      
      // Filter by month and coach's clients only
      return allTracking.filter(item => {
        const itemMonth = item.submission_date?.slice(0, 7);
        return itemMonth === monthFilter && coachClientEmails.has(item.client_id);
      }).sort((a, b) => new Date(b.submission_date) - new Date(a.submission_date));
    },
    enabled: !!user?.email,
  });

  const { data: clients } = useQuery({
    queryKey: ['clientList', user?.email],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list();
      return allClients.filter(c => 
        c.assigned_coach?.includes(user?.email) || c.assigned_to === user?.email
      );
    },
    enabled: !!user,
  });

  const reviewMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.MPESSTracker.update(data.id, {
        coach_reviewed: true,
        coach_notes: data.notes,
        coach_review_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mpessTracking'] });
      setSelectedAssessment(null);
      setCoachNotes("");
    },
  });

  const getClientName = (clientId) => {
    return clients?.find(c => c.email === clientId)?.full_name || clientId;
  };

  const filteredAssessments = assessments?.filter(a =>
    searchTerm === "" || 
    getClientName(a.client_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.client_id.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const unreviewed = filteredAssessments.filter(a => !a.coach_reviewed);
  const reviewed = filteredAssessments.filter(a => a.coach_reviewed);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Heart className="w-8 h-8 text-pink-500" />
            Client MPESS Assessment Tracker
          </h1>
          <p className="text-gray-600">Review monthly MPESS assessments from your clients</p>
        </div>

        {/* Filters */}
        <Card className="border-none shadow-lg mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Month</label>
                <Input
                  type="month"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Search Client</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-gray-600 text-sm">Total Submissions</p>
                <p className="text-3xl font-bold text-orange-600">{filteredAssessments.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-gray-600 text-sm">Pending Review</p>
                <p className="text-3xl font-bold text-red-600">{unreviewed.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-gray-600 text-sm">Reviewed</p>
                <p className="text-3xl font-bold text-green-600">{reviewed.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="pending">Pending Review ({unreviewed.length})</TabsTrigger>
            <TabsTrigger value="reviewed">Reviewed ({reviewed.length})</TabsTrigger>
          </TabsList>

          {/* Pending Reviews */}
          <TabsContent value="pending" className="space-y-4">
            {unreviewed.length === 0 ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  All assessments have been reviewed!
                </AlertDescription>
              </Alert>
            ) : (
              unreviewed.map(assessment => (
                <Card key={assessment.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {getClientName(assessment.client_id)}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">{assessment.client_id}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(assessment.submission_date), 'MMM dd, yyyy')}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge className="bg-red-100 text-red-800">Pending</Badge>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              onClick={() => {
                                setSelectedAssessment(assessment);
                                setCoachNotes(assessment.coach_notes || "");
                              }}
                              className="bg-orange-600 hover:bg-orange-700"
                            >
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Review MPESS Assessment - {getClientName(assessment.client_id)}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6">
                              {/* Assessment Summary */}
                              {assessment.submission_data && (
                                <div className="space-y-4">
                                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                    <p className="font-semibold text-blue-900 mb-2">Assessment Date</p>
                                    <p className="text-blue-800">
                                      {format(new Date(assessment.submission_date), 'MMMM dd, yyyy')}
                                    </p>
                                  </div>

                                  {assessment.submission_data.mpess_root_cause && (
                                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                      <p className="font-semibold text-purple-900 mb-2">Root Cause</p>
                                      <p className="text-purple-800">{assessment.submission_data.mpess_root_cause}</p>
                                    </div>
                                  )}

                                  {assessment.submission_data.mpess_spiritual && (
                                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                      <p className="font-semibold text-green-900 mb-2">Spiritual Connection</p>
                                      <p className="text-green-800">{assessment.submission_data.mpess_spiritual}</p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Coach Notes */}
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Your Feedback</label>
                                <Textarea
                                  value={coachNotes}
                                  onChange={(e) => setCoachNotes(e.target.value)}
                                  placeholder="Add your observations and recommendations..."
                                  className="min-h-32"
                                />
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-3">
                                <Button
                                  onClick={() => {
                                    if (selectedAssessment?.id) {
                                      reviewMutation.mutate({
                                        id: selectedAssessment.id,
                                        notes: coachNotes
                                      });
                                    }
                                  }}
                                  disabled={reviewMutation.isPending}
                                  className="flex-1 bg-green-600 hover:bg-green-700"
                                >
                                  {reviewMutation.isPending ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Saving...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Mark as Reviewed
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Reviewed */}
          <TabsContent value="reviewed" className="space-y-4">
            {reviewed.length === 0 ? (
              <Alert>
                <AlertDescription>No reviewed assessments yet.</AlertDescription>
              </Alert>
            ) : (
              reviewed.map(assessment => (
                <Card key={assessment.id} className="border-none shadow-lg opacity-75">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {getClientName(assessment.client_id)}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">{assessment.client_id}</p>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Calendar className="w-4 h-4" />
                            Submitted: {format(new Date(assessment.submission_date), 'MMM dd, yyyy')}
                          </div>
                          {assessment.coach_review_date && (
                            <div className="flex items-center gap-2 text-sm text-green-700">
                              <CheckCircle className="w-4 h-4" />
                              Reviewed: {format(new Date(assessment.coach_review_date), 'MMM dd, yyyy')}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Reviewed</Badge>
                    </div>
                    {assessment.coach_notes && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-700">{assessment.coach_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}