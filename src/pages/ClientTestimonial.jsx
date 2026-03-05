import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Star, Upload, Image, CheckCircle2, Loader2, Heart } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ClientTestimonial() {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [testimonialText, setTestimonialText] = useState("");
  const [transformationHighlight, setTransformationHighlight] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: clientProfile } = useQuery({
    queryKey: ["clientProfile", user?.email],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ email: user?.email });
      return clients[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: existingFeedback } = useQuery({
    queryKey: ["myTestimonials", clientProfile?.id],
    queryFn: () => base44.entities.ClientFeedback.filter({ client_id: clientProfile?.id }),
    enabled: !!clientProfile?.id,
    initialData: [],
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      let imageUrl = null;
      if (imageFile) {
        setUploadingImage(true);
        const result = await base44.integrations.Core.UploadFile({ file: imageFile });
        imageUrl = result.file_url;
        setUploadingImage(false);
      }

      return base44.entities.ClientFeedback.create({
        client_id: clientProfile.id,
        client_name: clientProfile.full_name,
        client_email: clientProfile.email,
        coach_email: Array.isArray(clientProfile.assigned_coach)
          ? clientProfile.assigned_coach[0]
          : clientProfile.assigned_coach || clientProfile.assigned_to,
        overall_rating: rating,
        testimonial_text: testimonialText,
        transformation_highlight: transformationHighlight,
        would_recommend: wouldRecommend,
        image_url: imageUrl,
        status: "pending",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myTestimonials"] });
      setSubmitted(true);
      toast.success("🎉 Thank you for your testimonial!");
    },
    onError: () => {
      setUploadingImage(false);
      toast.error("Failed to submit. Please try again.");
    },
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const canSubmit = rating > 0 && testimonialText.trim().length >= 20;

  if (!clientProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert><AlertDescription>Loading your profile...</AlertDescription></Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            💬 Share Your Story
          </h1>
          <p className="text-gray-600">Your transformation inspires others. Tell us about your journey!</p>
        </div>

        {/* Past Testimonials */}
        {existingFeedback.length > 0 && (
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Your Previous Testimonials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {existingFeedback.map((fb) => (
                <div key={fb.id} className="p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-4 h-4 ${s <= fb.overall_rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`} />
                      ))}
                    </div>
                    <Badge className={
                      fb.status === "approved" ? "bg-green-100 text-green-700" :
                      fb.status === "rejected" ? "bg-red-100 text-red-700" :
                      "bg-yellow-100 text-yellow-700"
                    }>
                      {fb.status === "approved" ? "✅ Approved" : fb.status === "rejected" ? "❌ Not approved" : "⏳ Under review"}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{fb.testimonial_text}</p>
                  <p className="text-xs text-gray-400 mt-1">{fb.created_date ? format(new Date(fb.created_date), "MMM d, yyyy") : ""}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Submission Form */}
        {submitted ? (
          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-10 text-center">
              <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You! 🎉</h2>
              <p className="text-gray-600 mb-4">Your testimonial has been submitted and will be reviewed by your coach.</p>
              <Button onClick={() => { setSubmitted(false); setRating(0); setTestimonialText(""); setTransformationHighlight(""); setImageFile(null); setImagePreview(null); }} variant="outline">
                Submit Another
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" />
                Leave a Testimonial
              </CardTitle>
              <CardDescription>Share your experience and transformation with your coach</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Star Rating */}
              <div>
                <p className="font-semibold text-gray-900 mb-3">Overall Rating *</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setRating(s)}
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-10 h-10 transition-all ${
                          s <= (hoverRating || rating) ? "text-yellow-500 fill-yellow-500 scale-110" : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    {rating === 5 ? "Excellent!" : rating === 4 ? "Great!" : rating === 3 ? "Good" : rating === 2 ? "Fair" : "Poor"}
                  </p>
                )}
              </div>

              {/* Testimonial Text */}
              <div>
                <p className="font-semibold text-gray-900 mb-2">Your Testimonial * <span className="text-xs text-gray-400">(min. 20 characters)</span></p>
                <Textarea
                  placeholder="Share your experience... How has this program helped you? What results did you achieve? How did your coach support you?"
                  value={testimonialText}
                  onChange={(e) => setTestimonialText(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">{testimonialText.length} characters</p>
              </div>

              {/* Transformation Highlight */}
              <div>
                <p className="font-semibold text-gray-900 mb-2">Key Result / Transformation <span className="text-xs text-gray-400">(optional)</span></p>
                <Input
                  placeholder="e.g. Lost 12 kg in 3 months, Reversed diabetes, Improved energy levels..."
                  value={transformationHighlight}
                  onChange={(e) => setTransformationHighlight(e.target.value)}
                />
              </div>

              {/* Photo Upload */}
              <div>
                <p className="font-semibold text-gray-900 mb-2">Add a Photo <span className="text-xs text-gray-400">(optional — before/after or progress photo)</span></p>
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-full max-h-64 object-cover rounded-lg border" />
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2 bg-white"
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <Image className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Click to upload a photo</p>
                    <p className="text-xs text-gray-400">PNG, JPG up to 10MB</p>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                )}
              </div>

              {/* Would Recommend */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold text-gray-900 flex-1">Would you recommend us to others?</p>
                <div className="flex gap-3">
                  <Button
                    size="sm"
                    variant={wouldRecommend ? "default" : "outline"}
                    onClick={() => setWouldRecommend(true)}
                    className={wouldRecommend ? "bg-green-500 hover:bg-green-600" : ""}
                  >
                    👍 Yes
                  </Button>
                  <Button
                    size="sm"
                    variant={!wouldRecommend ? "default" : "outline"}
                    onClick={() => setWouldRecommend(false)}
                    className={!wouldRecommend ? "bg-gray-500 hover:bg-gray-600" : ""}
                  >
                    👎 No
                  </Button>
                </div>
              </div>

              {/* Submit */}
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={!canSubmit || submitMutation.isPending || uploadingImage}
                className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white py-6 text-lg font-semibold"
              >
                {submitMutation.isPending || uploadingImage ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {uploadingImage ? "Uploading photo..." : "Submitting..."}
                  </>
                ) : (
                  "Submit Testimonial 🎉"
                )}
              </Button>

              {!canSubmit && rating > 0 && testimonialText.length < 20 && (
                <p className="text-xs text-center text-gray-400">Please write at least 20 characters for your testimonial</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}