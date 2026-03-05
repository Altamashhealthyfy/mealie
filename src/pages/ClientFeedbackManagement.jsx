import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Star, MessageSquare, Search, Loader2, CheckCircle2, XCircle, Eye, ThumbsUp, Image as ImageIcon
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ClientFeedbackManagement() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewingFeedback, setViewingFeedback] = useState(null);
  const [coachReply, setCoachReply] = useState("");

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: allFeedback, isLoading } = useQuery({
    queryKey: ["allTestimonials"],
    queryFn: () => base44.entities.ClientFeedback.list("-created_date", 500),
    initialData: [],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientFeedback.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allTestimonials"] });
      setViewingFeedback(null);
      setCoachReply("");
      toast.success("Updated successfully");
    },
  });

  const handleApprove = (fb) => {
    updateMutation.mutate({
      id: fb.id,
      data: {
        status: "approved",
        coach_reply: coachReply,
        reviewed_by: user?.email,
        reviewed_at: new Date().toISOString(),
      },
    });
  };

  const handleReject = (fb) => {
    updateMutation.mutate({
      id: fb.id,
      data: {
        status: "rejected",
        reviewed_by: user?.email,
        reviewed_at: new Date().toISOString(),
      },
    });
  };

  const toggleFeatured = (fb) => {
    updateMutation.mutate({
      id: fb.id,
      data: { is_featured: !fb.is_featured },
    });
    toast.success(fb.is_featured ? "Removed from featured" : "Marked as featured ⭐");
  };

  const filteredFeedback = allFeedback.filter((fb) => {
    const matchSearch =
      fb.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fb.testimonial_text?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === "all" || fb.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: allFeedback.length,
    pending: allFeedback.filter((f) => f.status === "pending").length,
    approved: allFeedback.filter((f) => f.status === "approved").length,
    featured: allFeedback.filter((f) => f.is_featured).length,
    avgRating: allFeedback.length
      ? (allFeedback.reduce((s, f) => s + (f.overall_rating || 0), 0) / allFeedback.length).toFixed(1)
      : 0,
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">💬 Client Testimonials</h1>
          <p className="text-gray-600">Review, approve, and feature client success stories</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: "Total", value: stats.total, color: "blue" },
            { label: "Pending", value: stats.pending, color: "yellow" },
            { label: "Approved", value: stats.approved, color: "green" },
            { label: "Featured", value: stats.featured, color: "purple" },
            { label: "Avg Rating", value: `${stats.avgRating} ⭐`, color: "orange" },
          ].map((s) => (
            <Card key={s.label} className={`border-l-4 border-l-${s.color}-500`}>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase">{s.label}</p>
                <p className={`text-2xl font-bold text-${s.color}-600 mt-1`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by client name or testimonial..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["all", "pending", "approved", "rejected"].map((s) => (
              <Button
                key={s}
                size="sm"
                variant={statusFilter === s ? "default" : "outline"}
                onClick={() => setStatusFilter(s)}
                className={statusFilter === s ? "bg-rose-500 hover:bg-rose-600" : ""}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Testimonial Cards */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
        ) : filteredFeedback.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No testimonials found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFeedback.map((fb) => (
              <Card key={fb.id} className={`border-none shadow-md hover:shadow-lg transition-all ${fb.is_featured ? "ring-2 ring-yellow-400" : ""}`}>
                <CardContent className="p-5 space-y-3">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-gray-900">{fb.client_name || "Client"}</p>
                      <div className="flex mt-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-3.5 h-3.5 ${s <= fb.overall_rating ? "text-yellow-500 fill-yellow-500" : "text-gray-200"}`} />
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <Badge className={
                        fb.status === "approved" ? "bg-green-100 text-green-700" :
                        fb.status === "rejected" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      }>
                        {fb.status}
                      </Badge>
                      {fb.is_featured && <Badge className="bg-yellow-400 text-yellow-900">⭐ Featured</Badge>}
                    </div>
                  </div>

                  {/* Image */}
                  {fb.image_url && (
                    <img src={fb.image_url} alt="Client photo" className="w-full h-40 object-cover rounded-lg" />
                  )}

                  {/* Transformation */}
                  {fb.transformation_highlight && (
                    <div className="bg-green-50 border border-green-200 rounded px-3 py-2">
                      <p className="text-xs font-bold text-green-700">🏆 {fb.transformation_highlight}</p>
                    </div>
                  )}

                  {/* Testimonial */}
                  <p className="text-sm text-gray-700 line-clamp-3 italic">"{fb.testimonial_text}"</p>

                  {fb.would_recommend && (
                    <p className="text-xs text-green-600 font-semibold">👍 Would recommend</p>
                  )}

                  <p className="text-xs text-gray-400">
                    {fb.created_date ? format(new Date(fb.created_date), "MMM d, yyyy") : ""}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => { setViewingFeedback(fb); setCoachReply(fb.coach_reply || ""); }}>
                      <Eye className="w-3.5 h-3.5" /> View
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`gap-1 ${fb.is_featured ? "text-yellow-600" : "text-gray-500"}`}
                      onClick={() => toggleFeatured(fb)}
                    >
                      <Star className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Detail Dialog */}
        <Dialog open={!!viewingFeedback} onOpenChange={() => setViewingFeedback(null)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewingFeedback?.client_name}'s Testimonial</DialogTitle>
            </DialogHeader>

            {viewingFeedback && (
              <div className="space-y-5 mt-2">
                {/* Rating */}
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`w-6 h-6 ${s <= viewingFeedback.overall_rating ? "text-yellow-500 fill-yellow-500" : "text-gray-200"}`} />
                  ))}
                </div>

                {/* Photo */}
                {viewingFeedback.image_url && (
                  <img src={viewingFeedback.image_url} alt="Client photo" className="w-full rounded-lg object-cover max-h-72" />
                )}

                {/* Transformation */}
                {viewingFeedback.transformation_highlight && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm font-bold text-green-800">🏆 Key Result: {viewingFeedback.transformation_highlight}</p>
                  </div>
                )}

                {/* Testimonial */}
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <p className="text-gray-800 leading-relaxed italic">"{viewingFeedback.testimonial_text}"</p>
                </div>

                {viewingFeedback.would_recommend && (
                  <p className="text-sm text-green-600 font-semibold">👍 Would recommend to others</p>
                )}

                {/* Coach Reply */}
                <div>
                  <p className="font-semibold text-gray-900 mb-2">Your Reply (optional)</p>
                  <Textarea
                    placeholder="Write a response to this testimonial..."
                    value={coachReply}
                    onChange={(e) => setCoachReply(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Action Buttons */}
                {viewingFeedback.status !== "approved" && (
                  <Button
                    className="w-full bg-green-500 hover:bg-green-600 gap-2"
                    onClick={() => handleApprove(viewingFeedback)}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Approve Testimonial
                  </Button>
                )}

                {viewingFeedback.status !== "rejected" && (
                  <Button
                    variant="outline"
                    className="w-full border-red-300 text-red-600 hover:bg-red-50 gap-2"
                    onClick={() => handleReject(viewingFeedback)}
                    disabled={updateMutation.isPending}
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => toggleFeatured(viewingFeedback)}
                >
                  <Star className="w-4 h-4" />
                  {viewingFeedback.is_featured ? "Remove from Featured" : "Mark as Featured ⭐"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}