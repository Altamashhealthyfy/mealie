import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  Circle,
  Star,
  MessageCircle,
  Calendar,
  Loader2,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

export default function ClientResourceTracker() {
  const queryClient = useQueryClient();
  const [selectedResource, setSelectedResource] = useState(null);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);

  const [progressForm, setProgressForm] = useState({
    notes: "",
    rating: 5,
    completed_date: new Date().toISOString().split("T")[0],
  });

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: clientProfile } = useQuery({
    queryKey: ["myClientProfile", user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const clients = await base44.entities.Client.filter({
        email: user.email,
      });
      return clients[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["myAssignments", clientProfile?.id],
    queryFn: async () => {
      if (!clientProfile?.id) return [];
      return base44.entities.ResourceAssignment.filter({
        client_id: clientProfile.id,
      });
    },
    enabled: !!clientProfile?.id,
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["myResourceProgress", clientProfile?.id],
    queryFn: async () => {
      if (!clientProfile?.id) return [];
      return base44.entities.ResourceProgress.filter({
        client_id: clientProfile.id,
      });
    },
    enabled: !!clientProfile?.id,
  });

  const { data: resources = [] } = useQuery({
    queryKey: ["allPublishedResources"],
    queryFn: async () => {
      return base44.entities.Resource.filter({
        is_published: true,
      });
    },
  });

  const logProgressMutation = useMutation({
    mutationFn: async (data) => {
      const existingProgress = progress.find(
        (p) => p.resource_id === selectedResource.id && p.progress_type === "completed"
      );

      if (existingProgress) {
        return base44.entities.ResourceProgress.update(existingProgress.id, {
          ...data,
          completed_count: (existingProgress.completed_count || 1) + 1,
        });
      } else {
        return base44.entities.ResourceProgress.create({
          client_id: clientProfile.id,
          resource_id: selectedResource.id,
          resource_title: selectedResource.title,
          resource_category: selectedResource.category,
          progress_type: "completed",
          ...data,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["myResourceProgress", clientProfile?.id],
      });
      // Update assignment status
      const assignment = assignments.find(
        (a) => a.resource_id === selectedResource.id
      );
      if (assignment) {
        base44.entities.ResourceAssignment.update(assignment.id, {
          assignment_status: "completed",
          completed_at: new Date().toISOString(),
        });
      }
      setProgressForm({
        notes: "",
        rating: 5,
        completed_date: new Date().toISOString().split("T")[0],
      });
      setShowProgressDialog(false);
      toast.success("Progress logged!");
    },
  });

  const updateAssignmentStatusMutation = useMutation({
    mutationFn: (assignmentId) =>
      base44.entities.ResourceAssignment.update(assignmentId, {
        assignment_status: "viewed",
        viewed_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["myAssignments", clientProfile?.id],
      });
    },
  });

  const getAssignmentForResource = (resourceId) => {
    return assignments.find((a) => a.resource_id === resourceId);
  };

  const getProgressForResource = (resourceId) => {
    return progress.filter((p) => p.resource_id === resourceId);
  };

  const getCompletionCount = (resourceId) => {
    const progressList = getProgressForResource(resourceId);
    return progressList.reduce((sum, p) => sum + (p.completed_count || 1), 0);
  };

  const getTotalRating = (resourceId) => {
    const progressList = getProgressForResource(resourceId);
    if (progressList.length === 0) return 0;
    const sum = progressList.reduce((sum, p) => sum + (p.rating || 0), 0);
    return (sum / progressList.length).toFixed(1);
  };

  const assignedResources = resources.filter((r) =>
    assignments.some((a) => a.resource_id === r.id)
  );

  const completedResources = resources.filter((r) =>
    progress.some((p) => p.resource_id === r.id && p.progress_type === "completed")
  );

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            My Resources
          </h1>
          <p className="text-gray-600">
            Track resources assigned to you and log your progress
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Assigned to You</p>
              <p className="text-3xl font-bold text-blue-600">
                {assignedResources.length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Completed</p>
              <p className="text-3xl font-bold text-green-600">
                {completedResources.length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Total Completions</p>
              <p className="text-3xl font-bold text-purple-600">
                {progress.reduce((sum, p) => sum + (p.completed_count || 0), 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="assigned" className="space-y-6">
          <TabsList className="bg-white border-b w-full rounded-none">
            <TabsTrigger value="assigned">
              Assigned {assignedResources.length > 0 && `(${assignedResources.length})`}
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed {completedResources.length > 0 && `(${completedResources.length})`}
            </TabsTrigger>
            <TabsTrigger value="progress">Progress Tracker</TabsTrigger>
          </TabsList>

          <TabsContent value="assigned" className="space-y-4">
            {assignedResources.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <AlertCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-xl font-semibold text-gray-900 mb-2">
                  No resources assigned yet
                </p>
                <p className="text-gray-600">
                  Your coach will assign resources to help you on your journey
                </p>
              </Card>
            ) : (
              assignedResources.map((resource) => {
                const assignment = getAssignmentForResource(resource.id);
                const isViewed =
                  assignment?.assignment_status === "viewed" ||
                  assignment?.assignment_status === "completed";
                return (
                  <Card key={resource.id} className="overflow-hidden hover:shadow-lg transition">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-1">
                            {resource.title}
                          </CardTitle>
                          {assignment?.notes && (
                            <p className="text-sm text-gray-600 italic">
                              Coach notes: {assignment.notes}
                            </p>
                          )}
                        </div>
                        {isViewed ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Viewed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600">
                            <Circle className="w-4 h-4 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {resource.description && (
                        <p className="text-sm text-gray-600">
                          {resource.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{resource.category}</Badge>
                        {resource.difficulty_level && (
                          <Badge variant="outline">
                            {resource.difficulty_level}
                          </Badge>
                        )}
                        {resource.duration_minutes && (
                          <Badge variant="outline">
                            ⏱️ {resource.duration_minutes} min
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-3 pt-2">
                        <a
                          href={resource.content_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1"
                        >
                          <Button
                            className="w-full"
                            onClick={() => {
                              if (!isViewed) {
                                updateAssignmentStatusMutation.mutate(
                                  assignment.id
                                );
                              }
                            }}
                          >
                            View Resource
                          </Button>
                        </a>
                        <Dialog
                          open={
                            showProgressDialog &&
                            selectedResource?.id === resource.id
                          }
                          onOpenChange={(open) => {
                            if (!open) {
                              setSelectedResource(null);
                              setProgressForm({
                                notes: "",
                                rating: 5,
                                completed_date: new Date()
                                  .toISOString()
                                  .split("T")[0],
                              });
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              onClick={() => setSelectedResource(resource)}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Log Complete
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                Log Progress: {resource.title}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium mb-2">
                                  Date Completed
                                </label>
                                <input
                                  type="date"
                                  value={progressForm.completed_date}
                                  onChange={(e) =>
                                    setProgressForm({
                                      ...progressForm,
                                      completed_date: e.target.value,
                                    })
                                  }
                                  className="w-full px-3 py-2 border rounded-lg"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-2">
                                  Rating
                                </label>
                                <div className="flex gap-2">
                                  {[1, 2, 3, 4, 5].map((rating) => (
                                    <button
                                      key={rating}
                                      onClick={() =>
                                        setProgressForm({
                                          ...progressForm,
                                          rating,
                                        })
                                      }
                                      className={`text-3xl transition ${
                                        rating <= progressForm.rating
                                          ? "opacity-100"
                                          : "opacity-30"
                                      }`}
                                    >
                                      ⭐
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-2">
                                  Notes
                                </label>
                                <Textarea
                                  placeholder="How was this resource? Any feedback?"
                                  value={progressForm.notes}
                                  onChange={(e) =>
                                    setProgressForm({
                                      ...progressForm,
                                      notes: e.target.value,
                                    })
                                  }
                                  rows={3}
                                />
                              </div>

                              <Button
                                onClick={() => {
                                  logProgressMutation.mutate(progressForm);
                                }}
                                disabled={logProgressMutation.isPending}
                                className="w-full"
                              >
                                {logProgressMutation.isPending ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Logging...
                                  </>
                                ) : (
                                  "Log Progress"
                                )}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedResources.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <CheckCircle2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-xl font-semibold text-gray-900 mb-2">
                  No completed resources yet
                </p>
                <p className="text-gray-600">
                  Start logging resources you've completed to track your progress
                </p>
              </Card>
            ) : (
              completedResources.map((resource) => {
                const completionCount = getCompletionCount(resource.id);
                const rating = getTotalRating(resource.id);
                return (
                  <Card key={resource.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {resource.title}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            {rating > 0 && (
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium">
                                  {rating}
                                </span>
                              </div>
                            )}
                            <span className="text-xs text-gray-500">
                              Completed {completionCount}x
                            </span>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Completed
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            {progress.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <TrendingUp className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-xl font-semibold text-gray-900 mb-2">
                  No progress logged yet
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {progress
                  .sort(
                    (a, b) =>
                      new Date(b.created_date) - new Date(a.created_date)
                  )
                  .map((entry) => (
                    <Card key={entry.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {entry.resource_title}
                          </h4>
                          <div className="flex items-center gap-3 mt-2 text-sm">
                            <span className="text-gray-600 flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {entry.completed_date || entry.created_date?.split("T")[0]}
                            </span>
                            {entry.rating && (
                              <span className="text-gray-600 flex items-center gap-1">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                {entry.rating}
                              </span>
                            )}
                            {entry.completed_count > 1 && (
                              <Badge variant="outline">
                                Done {entry.completed_count}x
                              </Badge>
                            )}
                          </div>
                          {entry.notes && (
                            <p className="text-sm text-gray-600 mt-2 italic">
                              {entry.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}