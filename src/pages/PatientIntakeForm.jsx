import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  User, Scale, Heart, Target, CheckCircle, ArrowRight, ArrowLeft,
  Sparkles, Loader2, Activity, Utensils, Clock, Brain, Leaf,
  AlertTriangle, Send, ChefHat
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// ─── Step Config ────────────────────────────────────────────────
const STEPS = [
  { number: 1, title: "Basic Info",       icon: User },
  { number: 2, title: "Body Metrics",     icon: Scale },
  { number: 3, title: "Health History",   icon: Heart },
  { number: 4, title: "Diet & Food",      icon: Utensils },
  { number: 5, title: "Lifestyle",        icon: Activity },
  { number: 6, title: "Goals",            icon: Target },
  { number: 7, title: "Review & Submit",  icon: CheckCircle },
];

const HEALTH_CONDITIONS = [
  "Diabetes", "Thyroid", "Liver", "Kidney", "Heart", "Hormonal", "Hypertension",
  "PCOS", "Fatty Liver", "High Cholesterol", "Arthritis", "Others", "None"
];

const GOALS = [
  { value: "weight_loss",     label: "⚖️ Weight Loss" },
  { value: "maintenance",     label: "🔄 Maintenance" },
  { value: "energy",          label: "⚡ More Energy" },
  { value: "symptom_relief",  label: "💊 Symptom Relief" },
  { value: "disease_reversal",label: "🏥 Disease Reversal" },
  { value: "muscle_gain",     label: "💪 Muscle Gain" },
  { value: "health_improvement", label: "🌟 Health Improvement" },
];

const MPESS_OPTIONS = [
  { key: "mind",     label: "🧠 Mind", desc: "Meditation, journaling, stress relief" },
  { key: "physical", label: "🏃 Physical", desc: "Yoga, walks, strength training" },
  { key: "emotional",label: "💚 Emotional", desc: "Gratitude, emotional healing" },
  { key: "social",   label: "👥 Social", desc: "Healthy relationships, support groups" },
  { key: "spiritual",label: "✨ Spiritual", desc: "Affirmations, spiritual practices" },
];

// ─── Main Component ─────────────────────────────────────────────
export default function PatientIntakeForm() {
  const urlParams = new URLSearchParams(window.location.search);
  const clientEmail = urlParams.get("email") || "";
  const coachRef    = urlParams.get("ref")   || "";
  const prefillName = urlParams.get("name")  || "";

  const [step, setStep]           = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors]       = useState({});

  const [form, setForm] = useState({
    // Step 1 — Basic
    full_name: prefillName,
    email: clientEmail,
    phone: "",
    age: "",
    gender: "",
    // Step 2 — Body
    height: "",
    weight: "",
    target_weight: "",
    // Step 3 — Health
    health_conditions: [],
    stage_severity: "",
    current_medications: "",
    allergies: "",
    // Step 4 — Diet
    diet_type: "",
    non_veg_frequency_per_10_days: "",
    egg_frequency_per_10_days: "",
    likes: "",
    dislikes: "",
    no_go_foods: "",
    // Step 5 — Lifestyle
    activity_level: "",
    wake_up: "",
    breakfast_time: "",
    lunch_time: "",
    dinner_time: "",
    sleep_time: "",
    oil_used: "",
    millet_availability: false,
    // Step 6 — Goals
    goals: [],
    symptom_goals: "",
    mpess_preferences: { mind: true, physical: true, emotional: true, social: true, spiritual: true },
  });

  // Auto-compute BMI
  const bmi = form.height && form.weight
    ? parseFloat((parseFloat(form.weight) / ((parseFloat(form.height) / 100) ** 2)).toFixed(1))
    : null;

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const toggleCondition = (c) => {
    setForm(prev => {
      let next = prev.health_conditions.includes(c)
        ? prev.health_conditions.filter(x => x !== c)
        : [...prev.health_conditions, c];
      if (c === "None" && !prev.health_conditions.includes("None")) next = ["None"];
      if (c !== "None") next = next.filter(x => x !== "None");
      return { ...prev, health_conditions: next };
    });
  };

  const toggleGoal = (g) => {
    setForm(prev => ({
      ...prev,
      goals: prev.goals.includes(g) ? prev.goals.filter(x => x !== g) : [...prev.goals, g]
    }));
  };

  // ── Fetch existing client to pre-fill ────────────────────────
  const { data: existingClient } = useQuery({
    queryKey: ["patientClient", clientEmail],
    queryFn: async () => {
      if (!clientEmail) return null;
      const res = await base44.entities.Client.filter({ email: clientEmail });
      return res[0] || null;
    },
    enabled: !!clientEmail,
  });

  const { data: existingIntake } = useQuery({
    queryKey: ["patientIntake", existingClient?.id],
    queryFn: async () => {
      const res = await base44.entities.ClinicalIntake.filter(
        { client_id: existingClient.id },
        "-updated_date",
        1
      );
      return res[0] || null;
    },
    enabled: !!existingClient?.id,
  });

  // Pre-fill from existing data
  useEffect(() => {
    if (!existingClient && !existingIntake) return;
    const dietMap = {
      veg: "Veg", non_veg: "Non-Veg", vegan: "Vegan",
      jain: "Jain", eggetarian: "Eggetarian", mixed: "Non-Veg"
    };
    if (existingIntake) {
      const i = existingIntake;
      setForm(prev => ({
        ...prev,
        full_name: existingClient?.full_name || prev.full_name,
        phone: existingClient?.phone || prev.phone,
        age: i.basic_info?.age?.toString() || existingClient?.age?.toString() || prev.age,
        gender: i.basic_info?.gender || existingClient?.gender || prev.gender,
        height: i.basic_info?.height?.toString() || existingClient?.height?.toString() || prev.height,
        weight: i.basic_info?.weight?.toString() || existingClient?.weight?.toString() || prev.weight,
        target_weight: existingClient?.target_weight?.toString() || prev.target_weight,
        health_conditions: i.health_conditions?.length ? i.health_conditions : prev.health_conditions,
        stage_severity: i.stage_severity || prev.stage_severity,
        current_medications: i.current_medications?.map(m => `${m.name} ${m.dosage} ${m.frequency}`).join(", ") || prev.current_medications,
        diet_type: i.diet_type || dietMap[existingClient?.food_preference] || prev.diet_type,
        non_veg_frequency_per_10_days: i.non_veg_frequency_per_10_days?.toString() || prev.non_veg_frequency_per_10_days,
        egg_frequency_per_10_days: i.egg_frequency_per_10_days?.toString() || prev.egg_frequency_per_10_days,
        likes: i.likes_dislikes_allergies?.likes?.join(", ") || prev.likes,
        dislikes: i.likes_dislikes_allergies?.dislikes?.join(", ") || prev.dislikes,
        allergies: i.likes_dislikes_allergies?.allergies?.join(", ") || prev.allergies,
        no_go_foods: i.likes_dislikes_allergies?.no_go_foods?.join(", ") || prev.no_go_foods,
        activity_level: i.basic_info?.activity_level || existingClient?.activity_level || prev.activity_level,
        wake_up: i.daily_routine?.wake_up || prev.wake_up,
        breakfast_time: i.daily_routine?.breakfast_time || prev.breakfast_time,
        lunch_time: i.daily_routine?.lunch_time || prev.lunch_time,
        dinner_time: i.daily_routine?.dinner_time || prev.dinner_time,
        sleep_time: i.daily_routine?.sleep_time || prev.sleep_time,
        oil_used: i.cooking_style?.oil_used || prev.oil_used,
        millet_availability: i.cooking_style?.millet_availability || prev.millet_availability,
        goals: Array.isArray(i.goal) ? i.goal : (i.goal ? [i.goal] : prev.goals),
        symptom_goals: i.symptom_goals?.join("\n") || prev.symptom_goals,
        mpess_preferences: i.mpess_preferences || prev.mpess_preferences,
      }));
    } else if (existingClient) {
      setForm(prev => ({
        ...prev,
        full_name: existingClient.full_name || prev.full_name,
        phone: existingClient.phone || prev.phone,
        age: existingClient.age?.toString() || prev.age,
        gender: existingClient.gender || prev.gender,
        height: existingClient.height?.toString() || prev.height,
        weight: existingClient.weight?.toString() || prev.weight,
        target_weight: existingClient.target_weight?.toString() || prev.target_weight,
        diet_type: dietMap[existingClient.food_preference] || prev.diet_type,
        activity_level: existingClient.activity_level || prev.activity_level,
        goals: existingClient.goal ? [existingClient.goal] : prev.goals,
      }));
    }
  }, [existingClient?.id, existingIntake?.id]);

  // ── Submit mutation ──────────────────────────────────────────
  const submitMutation = useMutation({
    mutationFn: async () => {
      const splitList = (s) => (s || "").split(",").map(x => x.trim()).filter(Boolean);
      const ageNum    = parseFloat(form.age) || 0;
      const heightNum = parseFloat(form.height) || 0;
      const weightNum = parseFloat(form.weight) || 0;
      const bmiNum    = heightNum && weightNum
        ? parseFloat((weightNum / ((heightNum / 100) ** 2)).toFixed(1)) : 0;

      // 1 — Find or locate client record
      let clientRecord = existingClient;
      if (!clientRecord) {
        const found = await base44.entities.Client.filter({ email: form.email });
        clientRecord = found[0] || null;
      }

      // 2 — BMR / TDEE / macro targets
      let bmr = 0;
      if (form.gender === "male") {
        bmr = 10 * weightNum + 6.25 * heightNum - 5 * ageNum + 5;
      } else {
        bmr = 10 * weightNum + 6.25 * heightNum - 5 * ageNum - 161;
      }
      const activityMult = {
        sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55,
        very_active: 1.725, extremely_active: 1.9
      }[form.activity_level] || 1.2;
      const tdee  = Math.round(bmr * activityMult);
      let targetCal = tdee;
      if (form.goals.includes("weight_loss"))   targetCal = Math.round(tdee * 0.85);
      if (form.goals.includes("muscle_gain"))   targetCal = Math.round(tdee * 1.15);

      // 3 — Map diet_type → food_preference enum for Client entity
      const fpMap = {
        "Veg": "veg", "Non-Veg": "non_veg", "Vegan": "veg",
        "Jain": "jain", "Eggetarian": "eggetarian"
      };
      const foodPref = fpMap[form.diet_type] || "mixed";
      const primaryGoal = form.goals[0] || "health_improvement";

      // 4 — Client data patch
      const clientPatch = {
        full_name: form.full_name,
        phone: form.phone,
        age: ageNum,
        gender: form.gender,
        height: heightNum,
        weight: weightNum,
        target_weight: parseFloat(form.target_weight) || 0,
        activity_level: form.activity_level,
        food_preference: foodPref,
        goal: primaryGoal,
        bmr: Math.round(bmr),
        tdee,
        target_calories: targetCal,
        target_protein: Math.round((targetCal * 0.30) / 4),
        target_carbs:   Math.round((targetCal * 0.40) / 4),
        target_fats:    Math.round((targetCal * 0.30) / 9),
      };
      if (coachRef) clientPatch.assigned_coach = [coachRef];

      if (clientRecord) {
        await base44.entities.Client.update(clientRecord.id, clientPatch);
      } else {
        clientRecord = await base44.entities.Client.create({
          ...clientPatch,
          email: form.email,
          status: "active",
          join_date: format(new Date(), "yyyy-MM-dd"),
          onboarding_completed: true,
        });
      }

      // 5 — ClinicalIntake upsert
      const intakeData = {
        client_id: clientRecord.id,
        coach_id: coachRef || clientRecord.assigned_to || clientRecord.created_by || "",
        intake_date: format(new Date(), "yyyy-MM-dd"),
        is_latest: true,
        basic_info: {
          age: ageNum, gender: form.gender, height: heightNum,
          weight: weightNum, bmi: bmiNum, activity_level: form.activity_level
        },
        health_conditions: form.health_conditions,
        stage_severity: form.stage_severity,
        current_medications: form.current_medications
          ? [{ name: form.current_medications, dosage: "", frequency: "" }]
          : [],
        diet_type: form.diet_type,
        non_veg_frequency_per_10_days: parseFloat(form.non_veg_frequency_per_10_days) || 0,
        egg_frequency_per_10_days: parseFloat(form.egg_frequency_per_10_days) || 0,
        likes_dislikes_allergies: {
          likes:      splitList(form.likes),
          dislikes:   splitList(form.dislikes),
          allergies:  splitList(form.allergies),
          no_go_foods:splitList(form.no_go_foods),
        },
        daily_routine: {
          wake_up:        form.wake_up,
          breakfast_time: form.breakfast_time,
          lunch_time:     form.lunch_time,
          dinner_time:    form.dinner_time,
          sleep_time:     form.sleep_time,
        },
        cooking_style: {
          oil_used:             form.oil_used,
          millet_availability:  form.millet_availability,
        },
        goal: form.goals,
        symptom_goals: form.symptom_goals.split("\n").map(s => s.trim()).filter(Boolean),
        mpess_preferences: form.mpess_preferences,
        completed: true,
      };

      if (existingIntake?.id) {
        await base44.entities.ClinicalIntake.update(existingIntake.id, intakeData);
      } else {
        await base44.entities.ClinicalIntake.create(intakeData);
      }

      // 6 — Notify coach
      const notifyEmail = coachRef || clientRecord.assigned_to || clientRecord.created_by || "";
      if (notifyEmail) {
        await base44.entities.Notification.create({
          user_email: notifyEmail,
          title: "🩺 Client Intake Submitted",
          message: `${form.full_name} has completed their clinical intake form. Review it to generate their meal plan.`,
          type: "clinical_intake",
          read: false,
          client_id: clientRecord.id,
        }).catch(() => {});
      }

      return clientRecord;
    },
    onSuccess: () => {
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (err) => {
      toast.error("Something went wrong. Please try again.");
      console.error(err);
    },
  });

  // ── Validation per step ──────────────────────────────────────
  const validate = () => {
    const e = {};
    if (step === 1) {
      if (!form.full_name.trim()) e.full_name = "Full name is required";
      if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = "Valid email is required";
      if (!form.age || isNaN(form.age)) e.age = "Age is required";
      if (!form.gender) e.gender = "Gender is required";
    }
    if (step === 2) {
      if (!form.height || isNaN(form.height)) e.height = "Height is required";
      if (!form.weight || isNaN(form.weight)) e.weight = "Weight is required";
    }
    if (step === 3) {
      if (!form.health_conditions.length) e.health_conditions = "Please select at least one option";
    }
    if (step === 4) {
      if (!form.diet_type) e.diet_type = "Please select your diet type";
    }
    if (step === 5) {
      if (!form.activity_level) e.activity_level = "Please select your activity level";
    }
    if (step === 6) {
      if (!form.goals.length) e.goals = "Please select at least one goal";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    setStep(s => Math.min(s + 1, STEPS.length));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setStep(s => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Submitted state ──────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full shadow-2xl border-none text-center">
          <CardContent className="p-10 space-y-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Intake Submitted! 🎉</h2>
              <p className="text-gray-600">
                Thank you, <strong>{form.full_name}</strong>! Your health intake has been saved and your coach will be notified to prepare your personalized meal plan.
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left space-y-2">
              <p className="text-sm font-semibold text-green-800">✅ What happens next:</p>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Your profile has been updated with your health history</li>
                <li>• Your dietitian will review your intake within 24-48 hours</li>
                <li>• A personalized meal plan will be created for you</li>
                <li>• You'll receive it in your client portal</li>
              </ul>
            </div>
            <p className="text-xs text-gray-400">You may close this window now.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;
  const currentStepConfig = STEPS[step - 1];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-3 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">

        {/* Header */}
        <div className="text-center pt-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ChefHat className="w-7 h-7 text-indigo-600" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Clinical Health Intake</h1>
          </div>
          <p className="text-gray-500 text-sm">Help us understand your health so we can create your personalized meal plan</p>
        </div>

        {/* Progress stepper */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-500 overflow-x-auto gap-1">
            {STEPS.map(s => (
              <div key={s.number} className="flex flex-col items-center gap-1 flex-1 min-w-[40px]">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${
                  step > s.number ? "bg-indigo-600 text-white" :
                  step === s.number ? "bg-indigo-100 border-2 border-indigo-600 text-indigo-700" :
                  "bg-gray-100 text-gray-400"
                }`}>
                  {step > s.number ? <CheckCircle className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                </div>
                <span className={`text-center leading-tight ${step === s.number ? "text-indigo-700 font-semibold" : "text-gray-400"}`} style={{ fontSize: "10px" }}>
                  {s.title}
                </span>
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Existing intake notice */}
        {existingIntake && (
          <Alert className="bg-indigo-50 border-indigo-300">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <AlertDescription className="text-sm text-indigo-800">
              We found your previous intake and pre-filled your answers. Please review and update anything that has changed.
            </AlertDescription>
          </Alert>
        )}

        {/* Step Card */}
        <Card className="shadow-xl border-none">
          <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2 text-lg">
              <currentStepConfig.icon className="w-5 h-5" />
              Step {step} of {STEPS.length}: {currentStepConfig.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 md:p-7 space-y-5">

            {/* ── Step 1: Basic Info ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input placeholder="Your full name" value={form.full_name} onChange={e => set("full_name", e.target.value)} className={errors.full_name ? "border-red-400" : ""} />
                  {errors.full_name && <p className="text-xs text-red-500">{errors.full_name}</p>}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input type="email" placeholder="you@example.com" value={form.email} onChange={e => set("email", e.target.value)} className={errors.email ? "border-red-400" : ""} />
                    {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={e => set("phone", e.target.value)} />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Age *</Label>
                    <Input type="number" min="1" max="120" placeholder="35" value={form.age} onChange={e => set("age", e.target.value)} className={errors.age ? "border-red-400" : ""} />
                    {errors.age && <p className="text-xs text-red-500">{errors.age}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Gender *</Label>
                    <Select value={form.gender} onValueChange={v => set("gender", v)}>
                      <SelectTrigger className={errors.gender ? "border-red-400" : ""}>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.gender && <p className="text-xs text-red-500">{errors.gender}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Body Metrics ── */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Height (cm) *</Label>
                    <Input type="number" placeholder="165" value={form.height} onChange={e => set("height", e.target.value)} className={errors.height ? "border-red-400" : ""} />
                    {errors.height && <p className="text-xs text-red-500">{errors.height}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Current Weight (kg) *</Label>
                    <Input type="number" placeholder="70" value={form.weight} onChange={e => set("weight", e.target.value)} className={errors.weight ? "border-red-400" : ""} />
                    {errors.weight && <p className="text-xs text-red-500">{errors.weight}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Target Weight (kg)</Label>
                  <Input type="number" placeholder="60" value={form.target_weight} onChange={e => set("target_weight", e.target.value)} />
                </div>
                {bmi && (
                  <Alert className={`${bmi < 18.5 ? "bg-blue-50 border-blue-300" : bmi < 25 ? "bg-green-50 border-green-300" : bmi < 30 ? "bg-yellow-50 border-yellow-300" : "bg-red-50 border-red-300"}`}>
                    <AlertDescription className="flex items-center gap-2 text-sm font-medium">
                      <Scale className="w-4 h-4" />
                      Your BMI: <strong>{bmi}</strong>
                      <span className="text-gray-500 font-normal">
                        — {bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese"}
                      </span>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* ── Step 3: Health History ── */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="space-y-3">
                  <Label className="font-semibold">Health Conditions * <span className="font-normal text-gray-500">(select all that apply)</span></Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {HEALTH_CONDITIONS.map(c => {
                      const sel = form.health_conditions.includes(c);
                      return (
                        <button key={c} type="button" onClick={() => toggleCondition(c)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                            sel ? "border-indigo-500 bg-indigo-50 text-indigo-800" : "border-gray-200 hover:border-indigo-300 bg-white"}`}>
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${sel ? "border-indigo-500 bg-indigo-500" : "border-gray-300"}`}>
                            {sel && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                          {c}
                        </button>
                      );
                    })}
                  </div>
                  {errors.health_conditions && <p className="text-xs text-red-500">{errors.health_conditions}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Stage / Severity (if known)</Label>
                  <Input placeholder="e.g. Stage 3 CKD, Prediabetes, Hypothyroid mild" value={form.stage_severity} onChange={e => set("stage_severity", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Current Medications</Label>
                  <Textarea placeholder="List medications you're taking, e.g. Metformin 500mg twice daily, Thyronorm 50mcg..." rows={3} value={form.current_medications} onChange={e => set("current_medications", e.target.value)} />
                </div>
              </div>
            )}

            {/* ── Step 4: Diet & Food ── */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label>Diet Type *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {[
                      { v: "Veg",        l: "🥦 Vegetarian" },
                      { v: "Non-Veg",    l: "🍗 Non-Vegetarian" },
                      { v: "Eggetarian", l: "🥚 Eggetarian" },
                      { v: "Vegan",      l: "🌱 Vegan" },
                      { v: "Jain",       l: "🙏 Jain" },
                    ].map(({ v, l }) => (
                      <button key={v} type="button" onClick={() => set("diet_type", v)}
                        className={`px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                          form.diet_type === v ? "border-indigo-500 bg-indigo-50 text-indigo-800" : "border-gray-200 hover:border-indigo-300 bg-white"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                  {errors.diet_type && <p className="text-xs text-red-500">{errors.diet_type}</p>}
                </div>

                {(form.diet_type === "Non-Veg" || form.diet_type === "Eggetarian") && (
                  <div className="grid md:grid-cols-2 gap-4 p-4 bg-orange-50 rounded-xl border border-orange-200">
                    {form.diet_type === "Non-Veg" && (
                      <div className="space-y-2">
                        <Label>🍗 Non-Veg times in 10 days</Label>
                        <Select value={form.non_veg_frequency_per_10_days?.toString()} onValueChange={v => set("non_veg_frequency_per_10_days", v)}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {[1,2,3,4,5,6,7,8,9,10].map(n => <SelectItem key={n} value={n.toString()}>{n} time{n > 1 ? "s" : ""}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>🥚 Egg times in 10 days</Label>
                      <Select value={form.egg_frequency_per_10_days?.toString()} onValueChange={v => set("egg_frequency_per_10_days", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {[1,2,3,4,5,6,7,8,9,10].map(n => <SelectItem key={n} value={n.toString()}>{n} time{n > 1 ? "s" : ""}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Foods You Like</Label>
                  <Textarea placeholder="Comma-separated: idli, dosa, dal khichdi, paneer..." rows={2} value={form.likes} onChange={e => set("likes", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Foods You Dislike</Label>
                  <Textarea placeholder="Comma-separated: bitter gourd, cabbage..." rows={2} value={form.dislikes} onChange={e => set("dislikes", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Allergies</Label>
                  <Textarea placeholder="Comma-separated: peanuts, dairy, gluten..." rows={2} value={form.allergies} onChange={e => set("allergies", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>No-Go Foods (Religious / Personal)</Label>
                  <Textarea placeholder="Comma-separated: onion, garlic, beef..." rows={2} value={form.no_go_foods} onChange={e => set("no_go_foods", e.target.value)} />
                </div>
              </div>
            )}

            {/* ── Step 5: Lifestyle ── */}
            {step === 5 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label>Activity Level *</Label>
                  <Select value={form.activity_level} onValueChange={v => set("activity_level", v)}>
                    <SelectTrigger className={errors.activity_level ? "border-red-400" : ""}><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedentary">😴 Sedentary (desk job, little movement)</SelectItem>
                      <SelectItem value="lightly_active">🚶 Lightly Active (walks, light exercise 1-3x/week)</SelectItem>
                      <SelectItem value="moderately_active">🏃 Moderately Active (exercise 3-5x/week)</SelectItem>
                      <SelectItem value="very_active">💪 Very Active (intense exercise 6-7x/week)</SelectItem>
                      <SelectItem value="extremely_active">🔥 Extremely Active (athlete / physical job)</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.activity_level && <p className="text-xs text-red-500">{errors.activity_level}</p>}
                </div>

                <div className="space-y-3">
                  <Label className="font-semibold">⏰ Daily Meal Timings <span className="font-normal text-gray-500">(helps plan your meal schedule)</span></Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { field: "wake_up",        label: "Wake Up" },
                      { field: "breakfast_time", label: "Breakfast" },
                      { field: "lunch_time",     label: "Lunch" },
                      { field: "dinner_time",    label: "Dinner" },
                      { field: "sleep_time",     label: "Sleep" },
                    ].map(({ field, label }) => (
                      <div key={field} className="space-y-1">
                        <Label className="text-xs">{label}</Label>
                        <Input type="time" value={form[field]} onChange={e => set(field, e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>🫒 Cooking Oil Used at Home</Label>
                  <Input placeholder="e.g. Mustard oil, Coconut oil, Olive oil..." value={form.oil_used} onChange={e => set("oil_used", e.target.value)} />
                </div>
                <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                  <Checkbox checked={form.millet_availability} onCheckedChange={v => set("millet_availability", v)} />
                  <Label className="cursor-pointer">Millets / ancient grains available at home (ragi, jowar, bajra...)</Label>
                </div>
              </div>
            )}

            {/* ── Step 6: Goals ── */}
            {step === 6 && (
              <div className="space-y-5">
                <div className="space-y-3">
                  <Label className="font-semibold">Your Health Goals * <span className="font-normal text-gray-500">(select all that apply)</span></Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {GOALS.map(({ value, label }) => {
                      const sel = form.goals.includes(value);
                      return (
                        <button key={value} type="button" onClick={() => toggleGoal(value)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                            sel ? "border-indigo-500 bg-indigo-50 text-indigo-800" : "border-gray-200 hover:border-indigo-300 bg-white"}`}>
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${sel ? "border-indigo-500 bg-indigo-500" : "border-gray-300"}`}>
                            {sel && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {errors.goals && <p className="text-xs text-red-500">{errors.goals}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Symptoms You Want Relief From</Label>
                  <Textarea placeholder={"One per line:\nReduce fatigue\nControl blood sugar spikes\nImprove digestion"} rows={4} value={form.symptom_goals} onChange={e => set("symptom_goals", e.target.value)} />
                </div>

                <div className="space-y-3">
                  <Label className="font-semibold">🌿 Holistic Wellness Preferences</Label>
                  <p className="text-xs text-gray-500">Would you like these integrated into your plan?</p>
                  <div className="space-y-2">
                    {MPESS_OPTIONS.map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-100">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-sm">{label}</span>
                          <span className="text-xs text-gray-500">{desc}</span>
                        </div>
                        <Checkbox
                          checked={form.mpess_preferences[key]}
                          onCheckedChange={v => setForm(prev => ({ ...prev, mpess_preferences: { ...prev.mpess_preferences, [key]: v } }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 7: Review ── */}
            {step === 7 && (
              <div className="space-y-4">
                <Alert className="bg-green-50 border-green-300">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-sm text-green-800">
                    Please review your information before submitting. Your coach will use this to create your personalized meal plan.
                  </AlertDescription>
                </Alert>

                {[
                  {
                    icon: User, label: "Personal Info",
                    rows: [
                      `Name: ${form.full_name}`,
                      `Email: ${form.email}${form.phone ? " · Phone: " + form.phone : ""}`,
                      `Age: ${form.age} · Gender: ${form.gender}`,
                    ]
                  },
                  {
                    icon: Scale, label: "Body Metrics",
                    rows: [
                      `Height: ${form.height} cm · Weight: ${form.weight} kg${bmi ? " · BMI: " + bmi : ""}`,
                      form.target_weight ? `Target Weight: ${form.target_weight} kg` : null,
                    ].filter(Boolean)
                  },
                  {
                    icon: Heart, label: "Health History",
                    rows: [
                      `Conditions: ${form.health_conditions.join(", ") || "None"}`,
                      form.stage_severity ? `Severity: ${form.stage_severity}` : null,
                      form.current_medications ? `Medications: ${form.current_medications}` : null,
                    ].filter(Boolean)
                  },
                  {
                    icon: Utensils, label: "Diet Preferences",
                    rows: [
                      `Diet: ${form.diet_type}`,
                      form.likes ? `Likes: ${form.likes}` : null,
                      form.dislikes ? `Dislikes: ${form.dislikes}` : null,
                      form.allergies ? `Allergies: ${form.allergies}` : null,
                    ].filter(Boolean)
                  },
                  {
                    icon: Activity, label: "Lifestyle",
                    rows: [
                      `Activity: ${form.activity_level?.replace(/_/g, " ")}`,
                      form.wake_up ? `Wake: ${form.wake_up} · Breakfast: ${form.breakfast_time} · Lunch: ${form.lunch_time}` : null,
                    ].filter(Boolean)
                  },
                  {
                    icon: Target, label: "Goals",
                    rows: [
                      `Goals: ${form.goals.map(g => g.replace(/_/g, " ")).join(", ") || "—"}`,
                      form.symptom_goals ? `Symptoms: ${form.symptom_goals.split("\n").slice(0, 2).join(", ")}...` : null,
                    ].filter(Boolean)
                  },
                ].map(({ icon: Icon, label, rows }) => (
                  <div key={label} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-2 text-sm">
                      <Icon className="w-4 h-4 text-indigo-500" /> {label}
                    </h4>
                    {rows.map((r, i) => <p key={i} className="text-xs text-gray-600">{r}</p>)}
                  </div>
                ))}
              </div>
            )}

          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between gap-3 pb-8">
          <Button variant="outline" onClick={handleBack} disabled={step === 1} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          {step < STEPS.length ? (
            <Button onClick={handleNext} className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-8"
            >
              {submitMutation.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                : <><Send className="w-4 h-4" /> Submit Intake</>
              }
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}