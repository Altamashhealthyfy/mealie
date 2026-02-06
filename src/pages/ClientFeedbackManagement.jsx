import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  AlertTriangle,
  MessageSquare,
  Star,
  TrendingUp,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  Search,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ClientFeedbackManagement() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [viewingFeedback, setViewingFeedback] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [markingAsReviewed, setMarkingAsReviewed] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: allFeedback } = useQuery({
    queryKey: ["allFeedback"],
    queryFn: async () => base44.entities.ClientFeedback.list("-created_date", 1000),
    initialData: [],
  });

  const { data: allCoaches } = useQuery({
    queryKey: ["allCoaches"],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter((u) => u.user_type === "student_coach");
    },
    initialData: [],
  });

  const markReviewedMutation = useMutation({
    mutationFn: (feedbackId) =>
      base44.entities.ClientFeedback.update(feedbackId, {
        status: "reviewed",
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allFeedback"] });
      setViewingFeedback(null);
      setAdminNotes("");
      toast.success("✅ Feedback marked as reviewed");
    },
    onError: (error) => {
      toast.error(`Error: ${error?.message || "Failed to update"}`);
    },
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    const completed = allFeedback.filter((f) => f.status === "completed").length;
    const pending = allFeedback.filter((f) => f.status === "pending").length;
    const avgRating = completed > 0
      ? (allFeedback.reduce((sum, f) => sum + (f.overall_rating || 0), 0) / completed).toFixed(1)
      : 0;

    const coachEffectiveness = completed > 0
      ? (allFeedback.reduce((sum, f) => sum + (f.coach_effectiveness || 0), 0) / completed).toFixed(1)
      : 0;

    const platformUsability = completed > 0
      ? (allFeedback.reduce((sum, f) => sum + (f.platform_usability || 0), 0) / completed).toFixed(1)
      : 0;

    const recommendationRate = completed > 0
      ? Math.round((allFeedback.filter((f) => f.would_recommend).length / completed) * 100)
      : 0;

    return { completed, pending, avgRating, coachEffectiveness, platformUsability, recommendationRate };
  }, [allFeedback]);

  // Category ratings
  const categoryRatings = useMemo(() => {
    const categories = {
      "Coach Effectiveness": [],
      "Program Quality": [],
      "Support Quality": [],
      "Communication": [],
      "Platform Usability": [],
      "Progress Satisfaction": [],
    };

    allFeedback.forEach((f) => {
      if (f.coach_effectiveness) categories["Coach Effectiveness"].push(f.coach_effectiveness);
      if (f.program_quality) categories["Program Quality"].push(f.program_quality);
      if (f.support_quality) categories["Support Quality"].push(f.support_quality);
      if (f.communication_quality) categories["Communication"].push(f.communication_quality);
      if (f.platform_usability) categories["Platform Usability"].push(f.platform_usability);
      if (f.progress_satisfaction) categories["Progress Satisfaction"].push(f.progress_satisfaction);
    });

    return Object.entries(categories)
      .filter(([_, ratings]) => ratings.length > 0)
      .map(([name, ratings]) => ({
        name,
        rating: (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1),
      }));
  }, [allFeedback]);

  // Sentiment distribution
  const sentimentDistribution = useMemo(() => {
    const sentiments = {};
    allFeedback.forEach((f) => {
      if (f.sentiment) {
        sentiments[f.sentiment] = (sentiments[f.sentiment] || 0) + 1;
      }
    });
    return Object.entries(sentiments).map(([sentiment, count]) => ({
      name: sentiment.replace("_", " "),
      value: count,
    }));
  }, [allFeedback]);

  // Coach feedback summary
  const coachSummary = useMemo(() => {
    const summary = {};
    allFeedback.forEach((f) => {
      if (!summary[f.coach_email]) {
        const coach = allCoaches.find((c) => c.email === f.coach_email);
        summary[f.coach_email] = {
          coachName: coach?.full_name || f.coach_name,
          totalFeedback: 0,
          avgRating: 0,
          ratings: [],
          followUpNeeded: 0,
        };
      }
      summary[f.coach_email].totalFeedback++;
      if (f.overall_rating) {
        summary[f.coach_email].ratings.push(f.overall_rating);
      }
      if (f.follow_up_required) {
        summary[f.coach_email].followUpNeeded++;
      }
    });

    return Object.entries(summary)
      .map(([email, data]) => ({
        coachEmail: email,
        coachName: data.coachName,
        totalFeedback: data.totalFeedback,
        avgRating:
          data.ratings.length > 0
            ? (data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length).toFixed(1)
            : 0,
        followUpNeeded: data.followUpNeeded,
      }))
      .sort((a, b) => b.totalFeedback - a.totalFeedback)
      .slice(0, 8);
  }, [allFeedback, allCoaches]);

  const filteredFeedback = useMemo(() => {
    let filtered = allFeedback.filter((f) => {
      const matchesSearch =
        f.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.coach_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || f.status === statusFilter;
      const matchesSentiment = sentimentFilter === "all" || f.sentiment === sentimentFilter;

      return matchesSearch && matchesStatus && matchesSentiment;
    });

    return filtered.sort((a, b) => {
      const dateA = a.created_date ? new Date(a.created_date).getTime() : 0;
      const dateB = b.created_date ? new Date(b.created_date).getTime() : 0;
      return dateB - dateA;
    });
  }, [allFeedback, searchQuery, statusFilter, sentimentFilter]);

  const COLORS = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];

  if (!user || user.user_type !== "super_admin") {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>Only super admins can access feedback management.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              💬 Client Feedback & Surveys
            </h1>
            <p className="text-gray-600">Track satisfaction, coach performance & platform feedback</p>
          </div>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Total Responses</p>
              <p className="text-3xl font-bold text-blue-600">{metrics.completed}</p>
              <p className="text-xs text-gray-500 mt-2">{metrics.pending} pending</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-6">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Avg Satisfaction</p>
              <p className="text-3xl font-bold text-yellow-600">{metrics.avgRating} ⭐</p>
              <p className="text-xs text-gray-500 mt-2">Overall rating</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Coach Effectiveness</p>
              <p className="text-3xl font-bold text-purple-600">{metrics.coachEffectiveness} ⭐</p>
              <p className="text-xs text-gray-500 mt-2">Average rating</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Would Recommend</p>
              <p className="text-3xl font-bold text-green-600">{metrics.recommendationRate}%</p>
              <p className="text-xs text-gray-500 mt-2">Of clients</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-pink-500">
            <CardContent className="p-6">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Platform Usability</p>
              <p className="text-3xl font-bold text-pink-600">{metrics.platformUsability} ⭐</p>
              <p className="text-xs text-gray-500 mt-2">Ease of use</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Ratings Radar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Category Ratings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={categoryRatings}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" />
                  <PolarRadiusAxis />
                  <Radar name="Rating" dataKey="rating" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Sentiment Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Sentiment Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sentimentDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sentimentDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Coach Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Coach Feedback Summary
            </CardTitle>
            <CardDescription>Based on client feedback responses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Coach</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Feedback Count</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Avg Rating</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Follow-ups</th>
                  </tr>
                </thead>
                <tbody>
                  {coachSummary.map((coach, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{coach.coachName}</td>
                      <td className="py-3 px-4 text-center text-gray-600">{coach.totalFeedback}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={coach.avgRating >= 4 ? "bg-green-100 text-green-700" : coach.avgRating >= 3 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}>
                          {coach.avgRating} ⭐
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {coach.followUpNeeded > 0 ? (
                          <Badge className="bg-orange-100 text-orange-700">{coach.followUpNeeded}</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-700">-</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Feedback List */}
        <Card>
          <CardHeader>
            <CardTitle>All Feedback</CardTitle>
            <CardDescription>Review and manage client feedback responses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by client or coach..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sentiment</SelectItem>
                  <SelectItem value="very_positive">Very Positive</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                  <SelectItem value="very_negative">Very Negative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Feedback List */}
            <div className="space-y-3">
              {filteredFeedback.map((feedback) => (
                <div key={feedback.id} className="p-4 border rounded-lg hover:bg-gray-50 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{feedback.client_name}</p>
                      <p className="text-sm text-gray-600">{feedback.coach_name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={
                        feedback.sentiment === "very_positive" ? "bg-green-100 text-green-700" :
                        feedback.sentiment === "positive" ? "bg-emerald-100 text-emerald-700" :
                        feedback.sentiment === "neutral" ? "bg-blue-100 text-blue-700" :
                        feedback.sentiment === "negative" ? "bg-orange-100 text-orange-700" :
                        "bg-red-100 text-red-700"
                      }>
                        {feedback.overall_rating} ⭐
                      </Badge>
                      <Badge className={
                        feedback.status === "reviewed" ? "bg-green-100 text-green-700" :
                        feedback.status === "completed" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-700"
                      }>
                        {feedback.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingFeedback(feedback)}
                        className="gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-1">{feedback.what_went_well}</p>
                  <p className="text-xs text-gray-500 mt-2">{feedback.created_date ? format(new Date(feedback.created_date), "MMM d, yyyy") : "N/A"}</p>
                </div>
              ))}
            </div>

            {filteredFeedback.length === 0 && (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p className="text-gray-600">No feedback found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feedback Detail Dialog */}
        <Dialog open={!!viewingFeedback} onOpenChange={() => setViewingFeedback(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewingFeedback?.client_name}'s Feedback</DialogTitle>
              <DialogDescription>
                Coach: {viewingFeedback?.coach_name} • {viewingFeedback?.created_date ? format(new Date(viewingFeedback.created_date), "MMM d, yyyy") : "N/A"}
              </DialogDescription>
            </DialogHeader>

            {viewingFeedback && (
              <div className="space-y-6 mt-4">
                {/* Ratings */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 rounded">
                    <p className="text-xs text-gray-600 mb-1">Overall Satisfaction</p>
                    <p className="text-2xl font-bold text-blue-600">{viewingFeedback.overall_rating} ⭐</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded">
                    <p className="text-xs text-gray-600 mb-1">Coach Effectiveness</p>
                    <p className="text-2xl font-bold text-purple-600">{viewingFeedback.coach_effectiveness} ⭐</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded">
                    <p className="text-xs text-gray-600 mb-1">Program Quality</p>
                    <p className="text-2xl font-bold text-green-600">{viewingFeedback.program_quality} ⭐</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded">
                    <p className="text-xs text-gray-600 mb-1">Support Quality</p>
                    <p className="text-2xl font-bold text-orange-600">{viewingFeedback.support_quality} ⭐</p>
                  </div>
                </div>

                {/* Comments */}
                <div className="space-y-3">
                  {viewingFeedback.what_went_well && (
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">✅ What Went Well</p>
                      <p className="text-gray-700 text-sm">{viewingFeedback.what_went_well}</p>
                    </div>
                  )}
                  {viewingFeedback.what_to_improve && (
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">📝 Areas to Improve</p>
                      <p className="text-gray-700 text-sm">{viewingFeedback.what_to_improve}</p>
                    </div>
                  )}
                </div>

                {/* Follow-up */}
                {viewingFeedback.follow_up_required && (
                  <Alert className="border-orange-200 bg-orange-50">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <AlertTitle className="text-orange-900">Follow-up Required</AlertTitle>
                    <AlertDescription className="text-orange-800">This feedback requires admin action</AlertDescription>
                  </Alert>
                )}

                {/* Admin Review Section */}
                {viewingFeedback.status !== "reviewed" && (
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
                    <p className="font-semibold text-gray-900">Admin Review</p>
                    <Textarea
                      placeholder="Add notes and actions taken..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="min-h-24"
                    />
                    <Button
                      onClick={() => markReviewedMutation.mutate(viewingFeedback.id)}
                      disabled={markingAsReviewed || markReviewedMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {markReviewedMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Marking as reviewed...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Mark as Reviewed
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {viewingFeedback.status === "reviewed" && viewingFeedback.admin_notes && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="font-semibold text-green-900 mb-2">Admin Notes</p>
                    <p className="text-green-800 text-sm">{viewingFeedback.admin_notes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}