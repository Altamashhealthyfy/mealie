import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Heart, Zap, Activity, AlertTriangle, Loader2, ChefHat } from "lucide-react";
import { toast } from "sonner";

const SYMPTOM_OPTIONS = [
  {
    value: "improving",
    label: "Improving 😊",
    desc: "I feel better than last check-in",
    color: "border-green-500 bg-green-50 text-green-800",
    selected: "bg-green-500 text-white border-green-600",
    dot: "bg-green-500"
  },
  {
    value: "same",
    label: "About the Same 😐",
    desc: "No significant change",
    color: "border-blue-400 bg-blue-50 text-blue-800",
    selected: "bg-blue-500 text-white border-blue-600",
    dot: "bg-blue-500"
  },
  {
    value: "worsening",
    label: "Worsening 😟",
    desc: "Symptoms have gotten worse",
    color: "border-orange-500 bg-orange-50 text-orange-800",
    selected: "bg-orange-500 text-white border-orange-600",
    dot: "bg-orange-500"
  },
  {
    value: "much_worse",
    label: "Much Worse 😰",
    desc: "Significant worsening, need help",
    color: "border-red-500 bg-red-50 text-red-800",
    selected: "bg-red-600 text-white border-red-700",
    dot: "bg-red-600"
  },
];

const DIGESTIVE_OPTIONS = ["Good", "Bloating", "Constipation", "Loose stools", "Nausea", "Acidity", "Other"];

export default function SymptomCheckIn() {
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get("clientId");
  const clientEmail = urlParams.get("email");

  const [symptomStatus, setSymptomStatus] = useState("");
  const [energyLevel, setEnergyLevel] = useState(null);
  const [digestiveHealth, setDigestiveHealth] = useState("");
  const [notes, setNotes] = useState("");
  const [worseningDetails, setWorseningDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isWorsening = symptomStatus === "worsening" || symptomStatus === "much_worse";

  // Fetch client name for greeting
  const { data: client } = useQuery({
    queryKey: ["checkInClient", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const res = await base44.entities.Client.filter({ id: clientId });
      return res[0] || null;
    },
    enabled: !!clientId,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!symptomStatus) throw new Error("Please select your symptom status");
      const res = await base44.functions.invoke("processSymptomResponse", {
        clientId,
        symptomStatus,
        energyLevel,
        digestiveHealth,
        notes,
        worseningDetails: isWorsening ? worseningDetails : "",
      });
      return res.data;
    },
    onSuccess: () => {
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (err) => {
      toast.error(err.message || "Something went wrong. Please try again.");
    },
  });

  if (!clientId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
        <Alert className="max-w-md border-red-300 bg-red-50">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Invalid check-in link. Please use the link sent to your email or notification.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (submitted) {
    const isAlerted = symptomStatus === "worsening" || symptomStatus === "much_worse";
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
        <Card className="max-w-md w-full shadow-2xl border-none text-center">
          <CardContent className="p-10 space-y-5">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-lg ${isAlerted ? "bg-gradient-to-r from-orange-500 to-red-500" : "bg-gradient-to-r from-green-500 to-emerald-500"}`}>
              {isAlerted ? <AlertTriangle className="w-10 h-10 text-white" /> : <CheckCircle className="w-10 h-10 text-white" />}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {isAlerted ? "Your Coach Has Been Alerted 🔔" : "Check-in Received! ✅"}
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                {isAlerted
                  ? "We've notified your coach about your worsening symptoms. They will reach out to you soon. You're not alone — help is on the way."
                  : "Thank you for checking in! Your coach has been informed and will review your progress. Keep following your meal plan and wellness practices."}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-left text-sm space-y-2">
              <p className="font-semibold text-gray-700">Your response summary:</p>
              <p className="text-gray-600">Symptom status: <strong className="capitalize">{symptomStatus.replace("_", " ")}</strong></p>
              {energyLevel && <p className="text-gray-600">Energy level: <strong>{energyLevel}/5</strong></p>}
              {digestiveHealth && <p className="text-gray-600">Digestive: <strong>{digestiveHealth}</strong></p>}
            </div>
            <div className="flex gap-3 justify-center flex-wrap">
              <a href="/ProgressTracking">
                <Button variant="outline" size="sm" className="text-green-700 border-green-300 hover:bg-green-50">
                  View My Progress →
                </Button>
              </a>
            </div>
            <p className="text-xs text-gray-400">Your coach will review your response shortly.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4">
      <div className="max-w-2xl mx-auto space-y-5 py-6">

        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ChefHat className="w-7 h-7 text-emerald-600" />
            <span className="text-xl font-bold text-gray-800">Health Check-in</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Hi {client?.full_name?.split(" ")[0] || "there"} 👋
          </h1>
          <p className="text-gray-500 text-sm">How are your symptoms today? This takes about 30 seconds.</p>
        </div>

        {/* Main form */}
        <Card className="shadow-xl border-none">
          <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Heart className="w-5 h-5" /> 3-Day Symptom Check-in
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">

            {/* 1. Symptom Status */}
            <div className="space-y-3">
              <Label className="font-semibold text-gray-800">How are your symptoms compared to 3 days ago? *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SYMPTOM_OPTIONS.map(opt => {
                  const sel = symptomStatus === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSymptomStatus(opt.value)}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${sel ? opt.selected : "border-gray-200 bg-white hover:border-gray-400"}`}
                    >
                      <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${sel ? "bg-white" : opt.dot}`} />
                      <div>
                        <p className="font-semibold text-sm">{opt.label}</p>
                        <p className={`text-xs mt-0.5 ${sel ? "opacity-80" : "text-gray-500"}`}>{opt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Worsening details — shown conditionally */}
            {isWorsening && (
              <div className="space-y-2 p-4 bg-red-50 border border-red-200 rounded-xl">
                <Label className="font-semibold text-red-800">⚠️ Please describe what's worsening</Label>
                <p className="text-xs text-red-600">Your coach will be notified immediately.</p>
                <Textarea
                  placeholder="e.g. Stomach pain after meals, more fatigue, blood sugar spikes..."
                  value={worseningDetails}
                  onChange={e => setWorseningDetails(e.target.value)}
                  rows={3}
                  className="border-red-200 bg-white"
                />
              </div>
            )}

            {/* 2. Energy Level */}
            <div className="space-y-3">
              <Label className="font-semibold text-gray-800 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" /> Energy Level today
              </Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setEnergyLevel(n)}
                    className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                      energyLevel === n
                        ? "bg-yellow-500 text-white border-yellow-600"
                        : "border-gray-200 bg-white text-gray-600 hover:border-yellow-400"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-400 px-1">
                <span>Very tired</span>
                <span>Full of energy</span>
              </div>
            </div>

            {/* 3. Digestive Health */}
            <div className="space-y-3">
              <Label className="font-semibold text-gray-800 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" /> Digestive health today
              </Label>
              <div className="flex flex-wrap gap-2">
                {DIGESTIVE_OPTIONS.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDigestiveHealth(d === digestiveHealth ? "" : d)}
                    className={`px-3 py-2 rounded-full border-2 text-sm font-medium transition-all ${
                      digestiveHealth === d
                        ? "bg-blue-500 text-white border-blue-600"
                        : "border-gray-200 bg-white text-gray-700 hover:border-blue-400"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Additional Notes */}
            <div className="space-y-2">
              <Label className="font-semibold text-gray-800">Any other notes for your coach? (optional)</Label>
              <Textarea
                placeholder="e.g. Followed the meal plan well, struggled with dinner on Day 2, feeling bloated after dal..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Submit */}
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={!symptomStatus || submitMutation.isPending}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              {submitMutation.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...</>
                : <><CheckCircle className="w-4 h-4 mr-2" /> Submit Check-in</>
              }
            </Button>

            <p className="text-center text-xs text-gray-400">
              Your response is private and shared only with your coach.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}